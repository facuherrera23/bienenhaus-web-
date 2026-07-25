import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const ML_API = "https://api.mercadolibre.com"

interface MLItem {
  id: string
  site_id: string
  title: string
  price: number
  currency_id: string
  available_quantity: number
  sold_quantity: number
  buying_mode: string
  listing_type_id: string
  condition: string
  permalink: string
  thumbnail: string
  pictures: Array<{ source: string }>
  attributes: Array<{ id: string; value_name: string; value_id?: string; value_struct?: { number: number; unit: string } }>
  status: string
  date_created: string
  last_updated: string
  category_id: string
}

interface Property {
  id: number
  titulo: string
  precio: number
  moneda: string
  operacion: string
  ubicacion: string
  tipo: string
  habitaciones: number
  banos: number
  m2: number
  antiguedad: string
  caracteristicas: string[]
  descripcion: string
  imagenes?: Array<{ url: string; orden: number; es_principal: boolean }>
  ml_item_id?: string
}

function getCredentials(supabase: any) {
  return supabase
    .from('ml_credenciales')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single()
}

async function getValidAccessToken(supabase: any): Promise<string> {
  const { data: creds } = await getCredentials(supabase)
  if (!creds) throw new Error('No ML credentials found')

  const now = new Date()
  const expiresAt = new Date(creds.expires_at)
  const buffer = 5 * 60 * 1000 // 5 min buffer

  if (expiresAt.getTime() - now.getTime() < buffer) {
    // Need refresh - will be handled by ml-refresh-token cron
    throw new Error('Token expired, needs refresh')
  }

  return creds.access_token
}

function mapPropertyToMLItem(prop: Property, categoryId: string): any {
  const attrs: any[] = [
    { id: 'ROOMS', value_name: String(prop.habitaciones || 0) },
    { id: 'FULL_BATHROOMS', value_name: String(prop.banos || 0) },
    { id: 'COVERED_AREA', value_struct: { number: prop.m2 || 0, unit: 'm²' } },
  ]

  if (prop.antiguedad) attrs.push({ id: 'ITEM_CONDITION', value_name: prop.antiguedad === 'nuevo' ? 'new' : 'used' })
  if (prop.caracteristicas?.length) {
    prop.caracteristicas.forEach(c => {
      attrs.push({ id: 'MAINTENANCE_FEE', value_name: c })
    })
  }

  const pictures = prop.imagenes?.map((img, i) => ({
    source: img.url,
    index: i,
  })) || []

  return {
    title: prop.titulo,
    category_id: categoryId,
    price: prop.precio,
    currency_id: prop.moneda,
    available_quantity: 1,
    buying_mode: prop.operacion === 'alquiler' ? 'rental' : 'sale',
    listing_type_id: 'gold_special',
    condition: prop.antiguedad === 'nuevo' ? 'new' : 'used',
    pictures,
    attributes: attrs,
    description: { plain_text: prop.descripcion },
    channels: ['marketplace'],
  }
}

async function getCategoryId(accessToken: string, operacion: string, tipo: string): Promise<string> {
  // Map to ML Argentina categories
  const categoryMap: Record<string, string> = {
    'venta_piso': 'MLA1459',
    'venta_chalet': 'MLA1459',
    'venta_atico': 'MLA1459',
    'venta_local': 'MLA1461',
    'venta_terreno': 'MLA1463',
    'alquiler_piso': 'MLA1540',
    'alquiler_chalet': 'MLA1540',
    'alquiler_atico': 'MLA1540',
    'alquiler_local': 'MLA1542',
    'alquiler_terreno': 'MLA1544',
  }

  const key = `${operacion}_${tipo}`
  return categoryMap[key] || (operacion === 'alquiler' ? 'MLA1540' : 'MLA1459')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  try {
    const { propertyId, action = 'publish' } = await req.json()
    if (!propertyId) throw new Error('propertyId required')

    const accessToken = await getValidAccessToken(supabase)

    // Get property data
    const { data: prop, error: propError } = await supabase
      .from('propiedades')
      .select('*, imagenes(*)')
      .eq('id', propertyId)
      .single()

    if (propError || !prop) throw new Error('Property not found')

    const categoryId = await getCategoryId(accessToken, prop.operacion, prop.tipo)

    let mlItemId = prop.ml_item_id
    let result: any

    if (action === 'publish' || action === 'create') {
      // Create new item
      const mlItem = mapPropertyToMLItem(prop, await getCategoryId(accessToken, prop.operacion, prop.tipo))
      
      const res = await fetch(`${ML_API}/items`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mlItem),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(`ML create failed: ${data.error} - ${data.error_description}`)

      mlItemId = data.id
      result = data
    } else if (action === 'update' && mlItemId) {
      // Update existing item
      const mlItem = mapPropertyToMLItem(prop, await getCategoryId(accessToken, prop.operacion, prop.tipo))
      
      const res = await fetch(`${ML_API}/items/${mlItemId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mlItem),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(`ML update failed: ${data.error} - ${data.error_description}`)

      result = data
    } else if (action === 'pause' && mlItemId) {
      const res = await fetch(`${ML_API}/items/${mlItemId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'paused' }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(`ML pause failed: ${data.error}`)
      result = data
    } else if (action === 'activate' && mlItemId) {
      const res = await fetch(`${ML_API}/items/${mlItemId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'active' }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(`ML activate failed: ${data.error}`)
      result = data
    } else if (action === 'close' && mlItemId) {
      const res = await fetch(`${ML_API}/items/${mlItemId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'closed' }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(`ML close failed: ${data.error}`)
      result = data
    } else {
      throw new Error('Invalid action or missing ml_item_id')
    }

    // Update property with ML data
    const updateData: any = { ml_last_sync: new Date().toISOString() }
    if (mlItemId) updateData.ml_item_id = mlItemId
    if (result?.permalink) updateData.ml_permalink = result.permalink
    if (result?.status) updateData.ml_status = result.status

    await supabase
      .from('propiedades')
      .update(updateData)
      .eq('id', propertyId)

    // Log sync
    await supabase.from('ml_sync_log').insert({
      propiedad_id: propertyId,
      ml_item_id: mlItemId,
      accion: action,
      detalle: { title: result?.title || prop.titulo, status: result?.status }
    })

    return new Response(
      JSON.stringify({ success: true, ml_item_id: mlItemId, permalink: result?.permalink }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('ML Publish error:', err)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})