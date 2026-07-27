// supabase/functions/ml-webhook/index.ts
// ML Webhook Handler - Receives events from MercadoLibre

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-ml-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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

  try {
    // Verify webhook signature
    const signature = req.headers.get('x-ml-signature');
    const body = await req.text();
    
    if (!verifySignature(body, signature)) {
      console.warn('Invalid ML webhook signature');
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const event = JSON.parse(body);
    
    // Check idempotency
    const eventId = event.id || event.resource_id || `event-${Date.now()}`;
    const idempotencyKey = `ml-webhook-${eventId}`;
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if already processed
    const { data: existing } = await supabase
      .from('ml_webhook_log')
      .select('id')
      .eq('event_id', eventId)
      .single();

    if (existing) {
      console.log('Duplicate webhook event:', eventId);
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Process event
    const result = await processWebhookEvent(event, supabase);
    
    // Log event
    await supabase.from('ml_webhook_log').insert({
      event_id: eventId,
      event_type: event.type || event.topic,
      resource_id: event.resource_id,
      user_id: result.userId,
      payload: event,
      processed: true
    });

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('ML Webhook error:', error);
    
    // Log error
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      await supabase.from('ml_webhook_log').insert({
        event_id: `error-${Date.now()}`,
        event_type: 'error',
        payload: { error: error.message, stack: error.stack },
        processed: false
      });
    } catch (e) {
      console.error('Failed to log webhook error:', e);
    }
    
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function processWebhookEvent(event, supabase) {
  const topic = event.topic || event.type;
  const resourceId = event.resource_id || event.resource;

  console.log(`Processing ML webhook: ${topic} for ${resourceId}`);

  switch (topic) {
    case 'items':
    case 'items/updates':
      return await handleItemUpdate(resourceId, supabase);
    
    case 'orders':
    case 'orders/created':
    case 'orders/updated':
      return await handleOrderEvent(resourceId, supabase);
    
    case 'questions':
    case 'questions/created':
      return await handleQuestionEvent(resourceId, supabase);
    
    default:
      console.log(`Unhandled topic: ${topic}`);
      return { userId: null };
  }
}

async function handleItemUpdate(itemId, supabase) {
  // Find local property by ml_item_id
  const { data: property } = await supabase
    .from('propiedades')
    .select('id, user_id')
    .eq('ml_item_id', itemId)
    .single();

  if (!property) {
    console.log(`Item ${itemId} not found in local DB`);
    return { userId: null };
  }

  // Get updated data from ML
  const itemResponse = await fetch(`https://api.mercadolibre.com/items/${itemId}`, {
    headers: {
      'Authorization': `Bearer ${await getValidToken(property.user_id)}`
    }
  });

  if (itemResponse.ok) {
    const item = await itemResponse.json();
    
    // Update local property
    await supabase.from('propiedades').update({
      precio: item.price,
      moneda: item.currency_id,
      operacion: item.listing_type_id === 'gold_pro' ? 'venta' : 'alquiler',
      estado: item.status,
      ml_status: item.status,
      ml_last_sync: new Date().toISOString(),
      actualizado_en: new Date().toISOString()
    }).eq('id', property.id);

    // Log sync
    await supabase.from('ml_sync_log').insert({
      propiedad_id: property.id,
      accion: 'update',
      ml_item_id: itemId,
      estado: item.status,
      detalle: { price: item.price, status: item.status }
    });
  }

  return { userId: property.user_id };
}

async function handleOrderEvent(orderId, supabase) {
  // Log order event
  console.log(`Order event: ${orderId}`);
  return { userId: null };
}

async function handleQuestionEvent(questionId, supabase) {
  // Log question event
  console.log(`Question event: ${questionId}`);
  return { userId: null };
}

async function getValidToken(userId) {
  // Get user's tokens
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('ml_access_token, ml_refresh_token, ml_token_expires_at')
    .eq('id', userId)
    .single();

  if (!profile || !profile.ml_access_token) {
    throw new Error('No ML token found');
  }

  // Check if token expired
  const expiresAt = new Date(profile.ml_token_expires_at).getTime();
  const now = Date.now();
  
  if (expiresAt - now < 5 * 60 * 1000) { // 5 min buffer
    // Refresh token
    return await refreshToken(userId, profile.ml_refresh_token);
  }

  return profile.ml_access_token;
}

async function refreshToken(userId, refreshToken) {
  const mlAppId = Deno.env.get('ML_APP_ID');
  const mlSecret = Deno.env.get('ML_SECRET');

  const response = await fetch('https://api.mercadolibre.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: Deno.env.get('ML_APP_ID')!,
      client_secret: Deno.env.get('ML_SECRET')!,
      refresh_token: refreshToken
    })
  });

  if (!response.ok) {
    throw new Error('Token refresh failed');
  }

  const tokens = await response.json();
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  // Update tokens
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  await supabase.from('profiles').update({
    ml_access_token: tokens.access_token,
    ml_refresh_token: tokens.refresh_token,
    ml_token_expires_at: expiresAt
  }).eq('id', userId);

  return tokens.access_token;
}

// Signature verification
function verifySignature(payload, signature) {
  const secret = Deno.env.get('ML_WEBHOOK_SECRET');
  if (!secret) return false;
  
  // ML uses HMAC-SHA256
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
  
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  const expected = base64urlencode(new Uint8Array(sig));
  
  return signature === expected;
}

function base64urlencode(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}