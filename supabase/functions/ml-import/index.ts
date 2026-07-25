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
  attributes: Array<{ id: string; value_name: string; value_id?: string }>
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
  const attrs = [
    { id: 'ROOMS', value_name: String(prop.habitaciones || 0) },
    { id: 'FULL_BATHROOMS', value_name: String(prop.banos || 0) },
    { id: 'COVERED_AREA', value_struct: { number: prop.m2 || 0, unit: 'm²' } },
  ]

  if (prop.antiguedad) attrs.push({ id: 'ITEM_CONDITION', value_name: prop.antiguedad === 'nuevo' ? 'new' : 'used' })
  if (prop.caracteristicas?.length) {
    prop.caracteristicas.forEach(c => {
      attrs.push({ id: 'MAINTENANCE_FEE', value_name: c }) // fallback
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

function mapMLItemToProperty(item: MLItem): Partial<Property> {
  const attrMap: Record<string, string> = {}
  item.attributes.forEach(a => {
    attrMap[a.id] = a.value_name || a.value_id || ''
  })

  return {
    ml_item_id: item.id,
    ml_status: item.status,
    ml_permalink: item.permalink,
    ml_last_sync: new Date().toISOString(),
    titulo: item.title,
    precio: item.price,
    moneda: item.currency_id,
    operacion: item.buying_mode === 'rental' ? 'alquiler' : 'venta',
    tipo: attrMap['PROPERTY_TYPE'] || 'piso',
    habitaciones: parseInt(attrMap['ROOMS'] || '0'),
    banos: parseInt(attrMap['FULL_BATHROOMS'] || '0'),
    m2: parseInt(attrMap['COVERED_AREA']?.replace(/[^0-9]/g, '') || '0'),
    descripcion: '', // would need separate call
    imagenes: item.pictures?.map((p, i) => ({ url: p.source, orden: i, es_principal: i === 0 })) || [],
  }
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
    const accessToken = await getValidAccessToken(supabase)

    // 1. Get user's ML items
    const { data: creds } = await supabase
      .from('ml_credenciales')
      .select('ml_user_id')
      .single()

    if (!creds) throw new Error('No ML credentials')

    const userId = creds.ml_user_id
    let allItems: MLItem[] = []
    let offset = 0
    const limit = 50

    // Paginate through all items
    while (true) {
      const searchRes = await fetch(
        `${ML_API}/users/${userId}/items/search?status=active,paused,closed&limit=${limit}&offset=${offset}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )

      if (!searchRes.ok) {
        const err = await searchRes.json()
        throw new Error(`Search failed: ${err.error} - ${err.error_description}`)
      }

      const data = await searchRes.json()
      const ids = data.results

      if (!ids || ids.length === 0) break

      // Multi-get items (max 20 per call)
      const chunks = []
      for (let i = 0; i < ids.length; i += 20) {
        chunks.push(ids.slice(i, i + 20))
      }

      for (const chunk of chunks) {
        const itemsRes = await fetch(
          `${ML_API}/items?ids=${chunk.join(',')}&attributes=id,site_id,title,price,currency_id,available_quantity,sold_quantity,buying_mode,listing_type_id,condition,permalink,thumbnail,pictures,attributes,status,date_created,last_updated,category_id`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        )

        if (!itemsRes.ok) {
          const err = await itemsRes.json()
          throw new Error(`Items fetch failed: ${err.error}`)
        }

        const items = await itemsRes.json()
        const validItems = items.filter((i: any) => i.code === 200).map((i: any) => i.body)
        allItems.push(...validItems)
      }

      if (ids.length < limit) break
      offset += limit
    }

    console.log(`Importing ${allItems.length} items from ML`)

    let imported = 0
    let updated = 0
    let errors = 0

    for (const item of allItems) {
      try {
        const propData = mapMLItemToProperty(item)
        
        const { data: existing } = await supabase
          .from('propiedades')
          .select('id')
          .eq('ml_item_id', item.id)
          .single()

        if (existing) {
          await supabase
            .from('propiedades')
            .update(propData)
            .eq('id', existing.id)
          updated++
        } else {
          const { data: newProp } = await supabase
            .from('propiedades')
            .insert(propData)
            .select('id')
            .single()
          
          if (newProp) imported++
        }

        // Log sync
        await supabase.from('ml_sync_log').insert({
          propiedad_id: existing?.id || null,
          ml_item_id: item.id,
          accion: 'import',
          detalle: { title: item.title, status: item.status }
        })
      } catch (err) {
        errors++
        await supabase.from('ml_sync_log').insert({
          ml_item_id: item.id,
          accion: 'import',
          detalle: { error: err.message }
        })
      }
    }

    return new Response(
      JSON.stringify({ imported, updated, errors, total: allItems.length }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('ML Import error:', err)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})