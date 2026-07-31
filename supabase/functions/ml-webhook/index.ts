// supabase/functions/ml-webhook/index.ts
// ML Webhook Handler - Receives events from MercadoLibre with HMAC-SHA256 verification

import { serve } from 'std/http/server.ts';
import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-ml-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

async function verifySignature(payload: string, signature: string | null): Promise<boolean> {
  const secret = Deno.env.get('ML_WEBHOOK_SECRET');
  if (!secret || !signature) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const expected = base64urlencode(new Uint8Array(sig));

  // Timing-safe comparison
  if (expected.length !== signature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return mismatch === 0;
}

function base64urlencode(buffer: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < buffer.length; i++) binary += String.fromCharCode(buffer[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(JSON.stringify({ error: 'Server misconfigured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const signature = req.headers.get('x-ml-signature');
    const body = await req.text();

    if (!await verifySignature(body, signature)) {
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const event = JSON.parse(body);
    const eventId = event.id || event.resource_id || `event-${Date.now()}`;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Idempotency: insert FIRST to claim the event. UNIQUE constraint on event_id will reject duplicates.
    try {
      await supabase.from('ml_webhook_log').insert({
        event_id: eventId,
        event_type: event.type || event.topic,
        resource_id: event.resource_id,
        payload: { topic: event.topic || event.type, resource: event.resource },
        processed: false,
      });
    } catch (e: unknown) {
      const err = e as { code?: string };
      if (err.code === '23505' || (e instanceof Error && e.message?.includes('duplicate'))) {
        // Already processed — acknowledge to stop retries
        return new Response(JSON.stringify({ received: true, duplicate: true }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      throw e;
    }

    const result = await processWebhookEvent(event, supabase);

    await supabase.from('ml_webhook_log').update({
      processed: true,
      processed_at: new Date().toISOString(),
    }).eq('event_id', eventId);

    return new Response(JSON.stringify({ received: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('ML Webhook error:', error instanceof Error ? error.message : String(error));
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function processWebhookEvent(event: any, supabase: any): Promise<{ userId: string | null }> {
  const topic = event.topic || event.type;
  const resourceId = event.resource_id || event.resource;

  switch (topic) {
    case 'items':
    case 'items/updates':
      return await handleItemUpdate(resourceId, supabase);
    case 'orders':
    case 'orders/created':
    case 'orders/updated':
      return { userId: null };
    case 'questions':
    case 'questions/created':
      return { userId: null };
    default:
      return { userId: null };
  }
}

async function handleItemUpdate(itemId: string, supabase: any): Promise<{ userId: string | null }> {
  if (!itemId) return { userId: null };

  const { data: property } = await supabase
    .from('propiedades')
    .select('id, user_id')
    .eq('ml_item_id', itemId)
    .maybeSingle();

  if (!property) return { userId: null };

  let token: string;
  try {
    token = await getValidToken(property.user_id, supabase);
  } catch (e) {
    console.error('Token error for property', property.id, e instanceof Error ? e.message : e);
    return { userId: property.user_id };
  }

  const itemResponse = await fetch(`https://api.mercadolibre.com/items/${itemId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (!itemResponse.ok) {
    console.error('ML item fetch failed', itemResponse.status);
    return { userId: property.user_id };
  }

  const item = await itemResponse.json();

  // Map ML `buying_mode` (not `listing_type_id`) to operacion
  const operacion = item.buying_mode === 'rental' ? 'alquiler' : 'venta';

  await supabase.from('propiedades').update({
    precio: item.price,
    moneda: item.currency_id,
    operacion,
    estado: item.status,
    ml_status: item.status,
    ml_last_sync: new Date().toISOString(),
  }).eq('id', property.id);

  await supabase.from('ml_sync_log').insert({
    propiedad_id: property.id,
    accion: 'update',
    ml_item_id: itemId,
    estado: item.status,
    detalle: { price: item.price, status: item.status, source: 'webhook' }
  });

  return { userId: property.user_id };
}

async function getValidToken(userId: string, supabase: any): Promise<string> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('ml_access_token, ml_refresh_token, ml_token_expires_at')
    .eq('id', userId)
    .maybeSingle();

  if (!profile?.ml_access_token) throw new Error('No ML token found');

  const expiresAt = new Date(profile.ml_token_expires_at).getTime();
  const now = Date.now();

  if (expiresAt - now < 5 * 60 * 1000) {
    return await refreshToken(userId, profile.ml_refresh_token, supabase);
  }
  return profile.ml_access_token;
}

async function refreshToken(userId: string, refreshToken: string, supabase: any): Promise<string> {
  const response = await fetch('https://api.mercadolibre.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: Deno.env.get('ML_APP_ID') ?? '',
      client_secret: Deno.env.get('ML_SECRET') ?? '',
      refresh_token: refreshToken,
    })
  });

  if (!response.ok) throw new Error('Token refresh failed');

  const tokens = await response.json();
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  await supabase.from('profiles').update({
    ml_access_token: tokens.access_token,
    ml_refresh_token: tokens.refresh_token,
    ml_token_expires_at: expiresAt,
  }).eq('id', userId);

  return tokens.access_token;
}
