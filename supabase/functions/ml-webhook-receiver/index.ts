import { serve } from "std/http/server.ts"
import { createClient } from "@supabase/supabase-js"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-ml-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
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

async function verifySignature(payload: string, signature: string | null): Promise<boolean> {
  const secret = Deno.env.get('ML_WEBHOOK_SECRET')
  if (!secret || !signature) return false

  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  const expected = base64urlencode(new Uint8Array(sig))

  if (expected.length !== signature.length) return false
  let mismatch = 0
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i)
  }
  return mismatch === 0
}

function base64urlencode(buffer: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < buffer.length; i++) binary += String.fromCharCode(buffer[i])
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
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
    .maybeSingle()

  if (!creds) throw new Error('No ML credentials found')

  const now = new Date()
  const expiresAt = new Date(creds.expires_at)
  const buffer = 5 * 60 * 1000

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
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

const ML_OPERATION_MAP: Record<string, string> = {
  'rental': 'alquiler',
  'sale': 'venta',
}

const ML_PROPERTY_TYPE_MAP: Record<string, string> = {
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

function mapMLItemToProperty(item: MLItem): Record<string, any> {
  const attrMap: Record<string, any> = {}
  item.attributes.forEach(a => {
    attrMap[a.id] = a.value_name || a.value_id || a.value_struct || ''
  })

  return {
    ml_item_id: item.id,
    ml_status: item.status,
    ml_permalink: item.permalink,
    ml_last_sync: new Date().toISOString(),
    titulo: item.title,
    precio: item.price,
    moneda: item.currency_id,
    operacion: ML_OPERATION_MAP[item.buying_mode] || 'venta',
    tipo: ML_PROPERTY_TYPE_MAP[attrMap['PROPERTY_TYPE']] || 'piso',
    habitaciones: parseInt(attrMap['ROOMS'] || '0', 10),
    banos: parseInt(attrMap['FULL_BATHROOMS'] || '0', 10),
    m2: parseValueStruct(attrMap['COVERED_AREA']),
    descripcion: '',
  }
}

async function handleItemChange(supabase: any, accessToken: string, itemId: string): Promise<void> {
  const item = await fetchMLItem(accessToken, itemId)
  if (!item) return

  const propData = mapMLItemToProperty(item)

  const { data: existing } = await supabase
    .from('propiedades')
    .select('id')
    .eq('ml_item_id', itemId)
    .maybeSingle()

  let propiedadId: number | null = null

  if (existing) {
    await supabase.from('propiedades').update(propData).eq('id', existing.id)
    propiedadId = existing.id
  } else {
    const { data: newProp } = await supabase
      .from('propiedades')
      .insert(propData)
      .select('id')
      .maybeSingle()
    propiedadId = newProp?.id ?? null
  }

  // Log sync using VALID `accion` value (matches CHECK constraint)
  await supabase.from('ml_sync_log').insert({
    propiedad_id: propiedadId,
    ml_item_id: itemId,
    accion: 'update',
    estado: item.status,
    detalle: { title: item.title, status: item.status, source: 'webhook' }
  })
}

async function handleQuestion(supabase: any, _accessToken: string, questionId: string): Promise<void> {
  await supabase.from('ml_sync_log').insert({
    accion: 'create',
    detalle: { type: 'question', question_id: questionId, source: 'webhook' }
  })
}

async function handleOrder(supabase: any, _accessToken: string, orderId: string): Promise<void> {
  await supabase.from('ml_sync_log').insert({
    accion: 'update',
    detalle: { type: 'order', order_id: orderId, source: 'webhook' }
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
    const signature = req.headers.get('x-ml-signature')
    const body = await req.text()

    if (!await verifySignature(body, signature)) {
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const payload: MLWebhookPayload = JSON.parse(body)

    const accessToken = await getValidAccessToken(supabase)

    const resourceParts = payload.resource?.split('/')
    const resourceId = resourceParts?.[resourceParts.length - 1]

    switch (payload.topic) {
      case 'items':
        if (resourceId) await handleItemChange(supabase, accessToken, resourceId)
        break
      case 'questions':
        if (resourceId) await handleQuestion(supabase, accessToken, resourceId)
        break
      case 'orders':
        if (resourceId) await handleOrder(supabase, accessToken, resourceId)
        break
    }

    // Acknowledge within 500ms per ML requirement
    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('Webhook error:', err instanceof Error ? err.message : String(err))
    return new Response(
      JSON.stringify({ received: false, error: 'Internal error' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
