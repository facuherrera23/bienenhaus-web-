import { serve } from "std/http/server.ts"
import { createClient } from "@supabase/supabase-js"
import {
  mapPropertyToMLItem,
  getCategoryId,
  fetchCategoryAttributes,
  validateRequiredAttributes,
  buildMLAttributes,
  Property,
  CategoryAttribute,
} from "../shared/ml-mapper.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
}

const ML_API = "https://api.mercadolibre.com"

async function getCredentials(supabase: any) {
  return await supabase
    .from('ml_credenciales')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
}

async function getValidAccessToken(supabase: any): Promise<string> {
  const { data: creds } = await getCredentials(supabase)
  if (!creds) throw new Error('No ML credentials found')

  const now = new Date()
  const expiresAt = new Date(creds.expires_at)
  const buffer = 5 * 60 * 1000

  if (expiresAt.getTime() - now.getTime() < buffer) {
    throw new Error('Token expired, needs refresh')
  }

  return creds.access_token
}

async function requireAdmin(req: Request, supabase: any): Promise<string> {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) throw new Error('Unauthorized: missing token')

  const token = authHeader.replace(/^Bearer\s+/i, '')
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) throw new Error('Unauthorized: invalid token')

  const isAdmin = (user.app_metadata as { is_admin?: boolean } | undefined)?.is_admin === true
  if (!isAdmin) throw new Error('Forbidden: admin only')

  return user.id
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
    const adminUserId = await requireAdmin(req, supabase)

    const { propertyId, action = 'publish' } = await req.json()
    if (!propertyId) throw new Error('propertyId required')
    if (typeof propertyId !== 'number' || propertyId <= 0) throw new Error('propertyId must be a positive integer')

    const accessToken = await getValidAccessToken(supabase)

    const { data: prop, error: propError } = await supabase
      .from('propiedades')
      .select('*, imagenes(*)')
      .eq('id', propertyId)
      .maybeSingle()

    if (propError || !prop) throw new Error('Property not found')

    const categoryId = getCategoryId(prop.operacion, prop.tipo)
    const catAttrs = await fetchCategoryAttributes(accessToken, categoryId)
    const providedAttrs = buildMLAttributes(prop as Property, catAttrs)
    const validation = validateRequiredAttributes(catAttrs, providedAttrs)

    if (!validation.valid) {
      throw new Error(`Atributos requeridos faltantes para la categoría ${categoryId}: ${validation.missing.join(', ')}`)
    }

    let mlItemId: string | undefined = prop.ml_item_id
    let result: any

    if (action === 'publish' || action === 'create') {
      const mlItem = mapPropertyToMLItem(prop as Property, categoryId, catAttrs as CategoryAttribute[])

      const res = await fetch(`${ML_API}/items`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mlItem),
      })

      const data = await res.json()
      if (!res.ok) {
        await supabase.from('ml_sync_log').insert({
          propiedad_id: propertyId,
          ml_item_id: null,
          accion: 'error',
          detalle: { action, error: data.error || 'unknown', source: 'admin' }
        })
        throw new Error(`ML create failed: ${data.message || data.error || res.status}`)
      }

      mlItemId = data.id
      result = data
    } else if (action === 'update' && mlItemId) {
      const mlItem = mapPropertyToMLItem(prop as Property, categoryId, catAttrs as CategoryAttribute[])

      const res = await fetch(`${ML_API}/items/${mlItemId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mlItem),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(`ML update failed: ${data.message || data.error || res.status}`)
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
      if (!res.ok) throw new Error(`ML pause failed: ${data.message || data.error || res.status}`)
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
      if (!res.ok) throw new Error(`ML activate failed: ${data.message || data.error || res.status}`)
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
      if (!res.ok) throw new Error(`ML close failed: ${data.message || data.error || res.status}`)
      result = data
    } else {
      throw new Error('Invalid action or missing ml_item_id')
    }

    const updateData: Record<string, any> = {
      ml_last_sync: new Date().toISOString(),
    }
    if (mlItemId) updateData.ml_item_id = mlItemId
    if (result?.permalink) updateData.ml_permalink = result.permalink
    if (result?.status) updateData.ml_status = result.status

    await supabase.from('propiedades').update(updateData).eq('id', propertyId)

    await supabase.from('ml_sync_log').insert({
      propiedad_id: propertyId,
      ml_item_id: mlItemId,
      accion: action === 'publish' || action === 'create' ? 'create' : action,
      estado: result?.status,
      detalle: { title: result?.title || prop.titulo, status: result?.status, user_id: adminUserId, source: 'admin' }
    })

    return new Response(
      JSON.stringify({ success: true, ml_item_id: mlItemId, permalink: result?.permalink }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('ML Publish error:', msg)
    return new Response(
      JSON.stringify({ error: msg }),
      { status: msg.includes('Unauthorized') ? 401 : msg.includes('Forbidden') ? 403 : 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
