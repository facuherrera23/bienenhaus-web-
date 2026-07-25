import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

const ML_AUTH_URL = "https://auth.mercadolibre.com.ar/authorization"
const ML_TOKEN_URL = "https://api.mercadolibre.com/oauth/token"

interface TokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
  scope: string
  user_id: number
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const error = url.searchParams.get('error')

  const storedState = req.headers.get('x-ml-state') || ''
  const sessionState = url.searchParams.get('state') || ''

  if (error) {
    return new Response(
      JSON.stringify({ error: `ML Auth error: ${error}` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  if (!code) {
    // Step 1: Initiate OAuth - redirect to ML
    const clientId = Deno.env.get('ML_CLIENT_ID')
    const redirectUri = Deno.env.get('ML_REDIRECT_URI')
    const state = crypto.randomUUID()

    if (!clientId || !redirectUri) {
      return new Response(
        JSON.stringify({ error: 'Missing ML_CLIENT_ID or ML_REDIRECT_URI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const authUrl = `${ML_AUTH_URL}?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`

    // Store state in a cookie for CSRF validation on callback
    const headers = new Headers(corsHeaders)
    headers.set('Set-Cookie', `ml_oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Max-Age=600; Path=/`)
    headers.set('Content-Type', 'application/json')

    return new Response(
      JSON.stringify({ authUrl, state }),
      { status: 200, headers }
    )
  }

  // Step 2: Handle callback with code
  if (storedState !== sessionState) {
    return new Response(
      JSON.stringify({ error: 'Invalid OAuth state (CSRF)' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const clientId = Deno.env.get('ML_CLIENT_ID')
  const clientSecret = Deno.env.get('ML_CLIENT_SECRET')
  const redirectUri = Deno.env.get('ML_REDIRECT_URI')

  if (!clientId || !clientSecret || !redirectUri) {
    return new Response(
      JSON.stringify({ error: 'Missing ML credentials' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch(ML_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code,
      }),
    })

    if (!tokenRes.ok) {
      const err = await tokenRes.json()
      throw new Error(`Token exchange failed: ${err.error} - ${err.error_description}`)
    }

    const tokens: TokenResponse = await tokenRes.json()
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000)

    // Store credentials in DB
    const { error: upsertError } = await supabase
      .from('ml_credenciales')
      .upsert({
        ml_user_id: tokens.user_id,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: expiresAt.toISOString(),
        scope: tokens.scope,
      }, { onConflict: 'ml_user_id' })

    if (upsertError) throw upsertError

    // Clear state cookie
    const headers = new Headers(corsHeaders)
    headers.set('Set-Cookie', 'ml_oauth_state=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/')

    return new Response(
      JSON.stringify({ 
        success: true, 
        user_id: tokens.user_id,
        expires_at: expiresAt.toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('ML OAuth callback error:', err)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})