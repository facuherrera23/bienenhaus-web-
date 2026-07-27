// supabase/functions/ml-oauth-callback/index.ts
// ML OAuth Callback - Handles ML redirect with PKCE verification

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { code, state } = await req.json();
    
    if (!code || !state) {
      return new Response(JSON.stringify({ error: 'Missing code or state' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Retrieve PKCE from database
    const { data: pkceData, error: pkceError } = await supabase
      .from('ml_oauth_pkce')
      .select('code_verifier, user_id')
      .eq('state', state)
      .single();

    if (pkceError || !pkceData) {
      console.error('PKCE not found or expired:', pkceError);
      return new Response(JSON.stringify({ error: 'Estado OAuth inválido o expirado' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { code_verifier, user_id } = pkceData;

    // Exchange code for tokens
    const mlAppId = Deno.env.get('ML_APP_ID');
    const mlSecret = Deno.env.get('ML_SECRET');
    const mlRedirectUri = Deno.env.get('ML_REDIRECT_URI');

    const tokenResponse = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: mlAppId!,
        client_secret: mlSecret!,
        code,
        code_verifier,
        redirect_uri: mlRedirectUri!
      })
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('ML Token error:', errorText);
      return new Response(JSON.stringify({ error: 'Error intercambiando código por tokens' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const tokens = await tokenResponse.json();

    // Get ML user info
    const userResponse = await fetch('https://api.mercadolibre.com/users/me', {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`
      }
    });

    if (!userResponse.ok) {
      return new Response(JSON.stringify({ error: 'Error obteniendo usuario ML' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const mlUser = await userResponse.json();

    // Store tokens and user info
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
    
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        ml_connected: true,
        ml_user_id: mlUser.id.toString(),
        ml_access_token: tokens.access_token,
        ml_refresh_token: tokens.refresh_token,
        ml_token_expires_at: expiresAt,
        ml_token_type: tokens.token_type,
        ml_scope: tokens.scope
      })
      .eq('id', user_id);

    if (updateError) {
      console.error('Profile update error:', updateError);
      return new Response(JSON.stringify({ error: 'Error guardando conexión' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Clean up PKCE
    await supabase.from('ml_oauth_pkce').delete().eq('state', state);

    return new Response(JSON.stringify({
      connected: true,
      user_id: mlUser.id.toString(),
      expires_at: expiresAt
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('ML OAuth callback error:', error);
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