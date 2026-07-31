// supabase/functions/ml-oauth-callback/index.ts
// ML OAuth Callback - Handles ML redirect with PKCE verification and writes tokens to BOTH profiles AND ml_credenciales

import { serve } from 'std/http/server.ts';
import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { code, state } = await req.json();

    if (!code || !state || typeof code !== 'string' || typeof state !== 'string') {
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
      .maybeSingle();

    if (pkceError || !pkceData) {
      return new Response(JSON.stringify({ error: 'Estado OAuth inválido o expirado' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { code_verifier, user_id } = pkceData;

    const mlAppId = Deno.env.get('ML_APP_ID');
    const mlSecret = Deno.env.get('ML_SECRET');
    const mlRedirectUri = Deno.env.get('ML_REDIRECT_URI');

    if (!mlAppId || !mlSecret || !mlRedirectUri) {
      return new Response(JSON.stringify({ error: 'Server misconfigured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const tokenResponse = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: mlAppId,
        client_secret: mlSecret,
        code,
        code_verifier,
        redirect_uri: mlRedirectUri,
      })
    });

    if (!tokenResponse.ok) {
      return new Response(JSON.stringify({ error: 'Error intercambiando código por tokens' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const tokens = await tokenResponse.json();

    const userResponse = await fetch('https://api.mercadolibre.com/users/me', {
      headers: { 'Authorization': `Bearer ${tokens.access_token}` }
    });

    if (!userResponse.ok) {
      return new Response(JSON.stringify({ error: 'Error obteniendo usuario ML' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const mlUser = await userResponse.json();

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
    const mlUserIdStr = mlUser.id.toString();
    const scope = tokens.scope || '';

    // Update profile (token metadata per-user)
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        ml_connected: true,
        ml_user_id: mlUserIdStr,
        ml_access_token: tokens.access_token,
        ml_refresh_token: tokens.refresh_token,
        ml_token_expires_at: expiresAt,
        ml_token_type: tokens.token_type,
        ml_scope: scope,
      })
      .eq('id', user_id);

    if (profileError) {
      console.error('Profile update error:', profileError.message);
      return new Response(JSON.stringify({ error: 'Error guardando conexión' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Also upsert into ml_credenciales (single shared row per ML user)
    // Required so ml-import / ml-publish / ml-status / ml-refresh-token can read credentials.
    const { error: credsError } = await supabase
      .from('ml_credenciales')
      .upsert({
        ml_user_id: Number(mlUser.id),
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: expiresAt,
        scope,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'ml_user_id' });

    if (credsError) {
      console.error('ml_credenciales upsert error:', credsError.message);
      // Non-fatal: profile was updated, tokens still work for per-user webhooks.
    }

    // Clean up PKCE
    await supabase.from('ml_oauth_pkce').delete().eq('state', state);

    return new Response(JSON.stringify({
      connected: true,
      user_id: mlUserIdStr,
      expires_at: expiresAt
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('ML OAuth callback error:', error instanceof Error ? error.message : String(error));
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
