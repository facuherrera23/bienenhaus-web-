// supabase/functions/ml-oauth-init/index.ts
// ML OAuth Initialization - Generates auth URL with PKCE

import { serve } from 'std/http/server.ts';
import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if already connected
    const { data: profile } = await supabase
      .from('profiles')
      .select('ml_connected, ml_user_id')
      .eq('id', user.id)
      .single();

    if (profile?.ml_connected) {
      return new Response(JSON.stringify({ 
        error: 'Ya conectado a MercadoLibre',
        connected: true 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get ML credentials
    const mlAppId = Deno.env.get('ML_APP_ID');
    const mlRedirectUri = Deno.env.get('ML_REDIRECT_URI');
    
    if (!mlAppId || !mlRedirectUri) {
      console.error('ML credentials not configured');
      return new Response(JSON.stringify({ error: 'Configuración de MercadoLibre incompleta' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Generate PKCE
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    const state = generateState();

    // Store PKCE in database for callback verification
    const { error: pkceError } = await supabase
      .from('ml_oauth_pkce')
      .upsert({
        user_id: user.id,
        code_verifier: codeVerifier,
        code_challenge: codeChallenge,
        state: state,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 min
      });

    if (pkceError) {
      console.error('PKCE storage error:', pkceError);
      return new Response(JSON.stringify({ error: 'Error guardando PKCE' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Build ML auth URL
    const authUrl = new URL('https://auth.mercadolibre.com/authorization');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', mlAppId);
    authUrl.searchParams.set('redirect_uri', mlRedirectUri);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');
    authUrl.searchParams.set('state', state);

    return new Response(JSON.stringify({ 
      authUrl: authUrl.toString(),
      state 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('ML OAuth init error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// PKCE Helpers
function generateCodeVerifier() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64urlencode(array);
}

async function generateCodeChallenge(verifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64urlencode(new Uint8Array(digest));
}

function generateState() {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return base64urlencode(array);
}

function base64urlencode(buffer) {
  return btoa(String.fromCharCode(...buffer))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}