import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const ML_TOKEN_URL = "https://api.mercadolibre.com/oauth/token"

interface StoredCredentials {
  id: number
  ml_user_id: number
  access_token: string
  refresh_token: string
  expires_at: string
  scope: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Allow both manual trigger (POST) and scheduled cron (GET)
  const userId = req.method === 'POST' ? (await req.json()).user_id : null

  let query = supabase.from('ml_credenciales').select('*')
  
  if (userId) {
    query = query.eq('ml_user_id', userId)
  }

  // Only refresh tokens that expire within 30 minutes
  const soon = new Date(Date.now() + 30 * 60 * 1000).toISOString()
  query = query.lt('expires_at', soon)

  const { data: creds, error } = await query

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  if (!creds || creds.length === 0) {
    return new Response(
      JSON.stringify({ message: 'No tokens need refresh' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const results = []

  for (const cred of creds as StoredCredentials[]) {
    try {
      // Use advisory lock to prevent concurrent refresh of same user
      const lockKey = `ml_refresh_${cred.ml_user_id}`
      const { data: lockResult } = await supabase.rpc('pg_try_advisory_xact_lock', { key', lockKey })
      
      if (!lockResult) {
        results.push({ user_id: cred.ml_user_id, status: 'skipped', reason: 'lock held' })
        continue
      }

      // Re-fetch to ensure we have latest refresh_token (another process might have refreshed)
      const { data: freshCred } = await supabase
        .from('ml_credenciales')
        .select('*')
        .eq('ml_user_id', cred.ml_user_id)
        .single()

      if (!freshCred) {
        results.push({ user_id: cred.ml_user_id, status: 'error', reason: 'credential not found' })
        continue
      }

      // Check if still needs refresh (another process might have done it)
      if (new Date(freshCred.expires_at) > new Date(Date.now() + 30 * 60 * 1000)) {
        results.push({ user_id: cred.ml_user_id, status: 'skipped', reason: 'already fresh' })
        continue
      }

      // Refresh token
      const clientId = Deno.env.get('ML_CLIENT_ID')!
      const clientSecret = Deno.env.get('ML_CLIENT_SECRET')!

      const tokenRes = await fetch('https://api.mercadolibre.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: freshCred.refresh_token,
        }),
      })

      if (!tokenRes.ok) {
        const err = await tokenRes.json()
        if (err.error === 'invalid_grant') {
          // Token revoked or expired - mark as invalid
          await supabase
            .from('ml_credenciales')
            .update({ access_token: '', refresh_token: '', expires_at: new Date(0).toISOString() })
            .eq('ml_user_id', cred.ml_user_id)
          
          results.push({ user_id: cred.ml_user_id, status: 'revoked', reason: 'invalid_grant' })
          continue
        }
        throw new Error(`Token refresh failed: ${err.error} - ${err.error_description}`)
      }

      const tokens = await tokenRes.json()
      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000)

      // ML rotates refresh_token on each use - must store the new one
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

      results.push({ 
        user_id: tokens.user_id, 
        status: 'refreshed', 
        expires_at: expiresAt.toISOString()
      })
    } catch (err) {
      console.error(`Refresh error for user ${cred.ml_user_id}:`, err)
      results.push({ 
        user_id: cred.ml_user_id, 
        status: 'error', 
        error: err.message 
      })
    }
  }

  return new Response(
    JSON.stringify({ results }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})