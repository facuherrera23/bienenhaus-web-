import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-ml-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const ML_API = "https://api.mercadolibre.com"

interface MLWebhookPayload {
  user_id: number
  resource: string
  topic: string
  application_id: number
  attempts: number
  sent: string
  received: string
}

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
  attributes: Array<{ id: string; value_name?: string; value_id?: string; value_struct?: { number: number; unit: string } }>
  status: string
  date_created: string
  last_updated: string
  category_id: string
}

async function getValidAccessToken(supabase: any): Promise<string> {
  const { data: creds } = await supabase
    .from('ml_credenciales')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single()

  if (!creds) throw new Error('No ML credentials found')

  const now = new Date()
  const expiresAt = new Date(creds.expires_at)
  const buffer = 5 * 60 * 1000 // 5 min buffer

  if (expiresAt.getTime() - now.getTime() < buffer) {
    throw new Error('Token expired, needs refresh')
  }

  return creds.access_token
}

async function fetchMLItem(accessToken: string, itemId: string): Promise<MLItem | null> {
  try {
    const res = await fetch(`${ML_API}/items/${itemId}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })

    if (!res.ok) {
      console.warn(`Failed to fetch ML item ${itemId}: ${res.status}`)
      return null
    }

    return await res.json()
  } catch (err) {
    console.error(`Error fetching ML item ${itemId}:`, err)
    return null
  }
}

function mapMLItemToProperty(item: MLItem): Partial<any> {
  const attrMap: Record<string, any> = {}
  item.attributes.forEach(a => {
    attrMap[a.id] = a.value_name || a.value_id || a.value_struct || ''
  })

  const ML_OPERATION_MAP: Record<string, string> = {
    'rental': 'alquiler',
    'sale': 'venta',
  }

  const ML_PROPERTY_TYPE_REVERSE: Record<string, string> = {
    'Apartment': 'piso',
    'House': 'chalet',
    'Penthouse': 'atico',
    'Commercial': 'local',
    'Lot': 'terreno',
  }

  function parseValueStruct(val: any): number {
    if (!val) return 0
    if (typeof val === 'number') return val
    if (val.number) return val.number
    if (typeof val === 'string') {
      const num = parseInt(val.replace(/[^0-9]/g, ''), 10)
      return isNaN(num) ? 0 : num
    }
    return 0
  }

  return {
    ml_item_id: item.id,
    ml_status: item.status,
    ml_permalink: item.permalink,
    ml_last_sync: new Date().toISOString(),
    titulo: item.title,
    precio: item.price,
    moneda: item.currency_id,
    operacion: ML_OPERATION_MAP[item.buying_mode] || 'venta',
    tipo: ML_PROPERTY_TYPE_REVERSE[attrMap['PROPERTY_TYPE']] || 'piso',
    habitaciones: parseInt(attrMap['ROOMS'] || '0', 10),
    banos: parseInt(attrMap['FULL_BATHROOMS'] || '0', 10),
    m2: parseValueStruct(attrMap['COVERED_AREA']),
    descripcion: '',
    imagenes: item.pictures?.map((p, i) => ({ url: p.source, orden: i, es_principal: i === 0 })) || [],
  }
}

async function handleItemChange(supabase: any, accessToken: string, itemId: string): Promise<void> {
  const item = await fetchMLItem(accessToken, itemId)
  if (!item) return

  const propData = mapMLItemToProperty(item)

  // Check if property exists locally
  const { data: existing } = await supabase
    .from('propiedades')
    .select('id')
    .eq('ml_item_id', itemId)
    .single()

  if (existing) {
    // Update local property
    await supabase
      .from('propiedades')
      .update(propData)
      .eq('id', existing.id)
  } else {
    // New property from ML (shouldn't happen often, but handle it)
    const { data: newProp } = await supabase
      .from('propiedades')
      .insert(propData)
      .select('id')
      .single()
  }

  // Log sync
  await supabase.from('ml_sync_log').insert({
    propiedad_id: existing?.id || null,
    ml_item_id: itemId,
    accion: 'webhook_sync',
    detalle: { title: item.title, status: item.status, source: 'webhook' }
  })

  console.log(`Synced ML item ${itemId} via webhook`)
}

async function handleQuestion(supabase: any, accessToken: string, questionId: string): Promise<void> {
  // Could fetch question details and notify admin
  console.log(`New question received: ${questionId}`)
  
  await supabase.from('ml_sync_log').insert({
    ml_item_id: questionId,
    accion: 'question_received',
    detalle: { question_id: questionId, source: 'webhook' }
  })
}

async function handleOrder(supabase: any, accessToken: string, orderId: string): Promise<void> {
  console.log(`Order update received: ${orderId}`)
  
  await supabase.from('ml_sync_log').insert({
    ml_item_id: orderId,
    accion: 'order_update',
    detalle: { order_id: orderId, source: 'webhook' }
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  try {
    // Verify webhook signature (optional but recommended)
    const signature = req.headers.get('x-ml-signature')
    const body = await req.text()
    
    // TODO: Validate HMAC signature with ML_CLIENT_SECRET
    // const expectedSig = crypto.subtle.sign(...)
    
    const payload: MLWebhookPayload = JSON.parse(body)
    console.log(`Webhook received: ${payload.topic} - ${payload.resource}`)

    const accessToken = await getValidAccessToken(supabase)

    switch (payload.topic) {
      case 'items':
        // resource format: /items/MLA123456
        const itemId = payload.resource.split('/').pop()
        if (itemId) await handleItemChange(supabase, accessToken, itemId)
        break

      case 'questions':
        // resource format: /questions/123456
        const questionId = payload.resource.split('/').pop()
        if (questionId) await handleQuestion(supabase, accessToken, questionId)
        break

      case 'orders':
        // resource format: /orders/123456
        const orderId = payload.resource.split('/').pop()
        if (orderId) await handleOrder(supabase, accessToken, orderId)
        break

      default:
        console.log(`Unhandled topic: ${payload.topic}`)
    }

    // Acknowledge receipt (ML expects 2xx within 500ms)
    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('Webhook error:', err)
    // Still return 200 to prevent ML from retrying excessively
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})