import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { 
  mapPropertyToMLItem, 
  mapMLItemToProperty,
  getCategoryId,
  fetchCategoryAttributes,
  validateRequiredAttributes,
  buildMLAttributes,
  Property,
  MLItem,
  MLAttribute,
  CategoryAttribute
} from "../shared/ml-mapper.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const ML_API = "https://api.mercadolibre.com"

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
    throw new Error('Token expired, needs refresh')
  }

  return creds.access_token
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

    const { categoryId, attributes } = await getCategoryId(accessToken, prop.operacion, prop.tipo)

    // Fetch category attributes and validate required ones
    const catAttrs = await fetchCategoryAttributes(accessToken, categoryId)
    const providedAttrs = buildMLAttributes(prop)
    const validation = validateRequiredAttributes(providedAttrs, catAttrs)
    
    if (!validation.valid) {
      throw new Error(`Atributos requeridos faltantes para la categoría ${categoryId}: ${validation.missing.join(', ')}`)
    }
    
    if (validation.warnings.length > 0) {
      console.warn('Validation warnings:', validation.warnings)
    }

    let mlItemId = prop.ml_item_id
    let result: any

    if (action === 'publish' || action === 'create') {
      // Create new item
      const mlItem = mapPropertyToMLItem(prop, categoryId, attributes)
      
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
      const { categoryId: catId, attributes } = await getCategoryId(accessToken, prop.operacion, prop.tipo)
      const catAttrs = await fetchCategoryAttributes(accessToken, catId)
      const providedAttrs = buildMLAttributes(prop)
      const validation = validateRequiredAttributes(providedAttrs, catAttrs)
      
      if (!validation.valid) {
        throw new Error(`Atributos requeridos faltantes para la categoría ${catId}: ${validation.missing.join(', ')}`)
      }
      
      if (validation.warnings.length > 0) {
        console.warn('Validation warnings:', validation.warnings)
      }
      
      const mlItem = mapPropertyToMLItem(prop, catId, attributes)
      
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