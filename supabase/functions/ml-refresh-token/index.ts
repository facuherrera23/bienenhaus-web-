import { serve } from "std/http/server.ts"
import { createClient } from "@supabase/supabase-js"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
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

// Acquire a per-user advisory lock using the pg_try_advisory_xact_lock(bigint) variant.
// The text variant doesn't exist in Postgres, so we hash ml_user_id to a stable bigint.
async function tryAdvisoryLock(supabase: any, mlUserId: number): Promise<boolean> {
  // 64-bit FNV-1a hash
  let hash = 0xcbf29ce484222325n
  const prime = 0x100000001b3n
  const mask = 0xffffffffffffffffn
  const bytes = new TextEncoder().encode(`ml_refresh_${mlUserId}`)
  for (const b of bytes) {
    hash = ((hash ^ BigInt(b)) * prime) & mask
  }
  const bigintKey = Number(hash & 0x7fffffffn) // safe-int range
  const { data, error } = await supabase.rpc('pg_try_advisory_xact_lock', { key: bigintKey })
  if (error) return false
  return data === true
}

async function requireServiceRole(req: Request): Promise<boolean> {
  const auth = req.headers.get('authorization') ?? ''
  const token = auth.replace(/^Bearer\s+/i, '')
  if (!token) return false
  // Service role key starts with 'eyJ' (JWT) and the decoded payload's `role` === 'service_role'
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload?.role === 'service_role'
  } catch {
    return false
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Allow GET from pg_cron (no body), POST only from service_role
  const userId = req.method === 'POST'
    ? ((await req.json()).user_id as number | undefined)
    : null

  if (req.method === 'POST' && !await requireServiceRole(req)) {
    return new Response(
      JSON.stringify({ error: 'Service role key required for manual refresh' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

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
      JSON.stringify({ error: 'Failed to fetch credentials' }),
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
      // Per-user advisory lock so cron + manual + concurrent cron jobs don't double-refresh
      const locked = await tryAdvisoryLock(supabase, cred.ml_user_id)
      if (!locked) {
        results.push({ user_id: cred.ml_user_id, status: 'skipped', reason: 'lock held' })
        continue
      }

      // Re-fetch inside lock to ensure we have the latest refresh_token
      const { data: freshCred } = await supabase
        .from('ml_credenciales')
        .select('*')
        .eq('ml_user_id', cred.ml_user_id)
        .maybeSingle()

      if (!freshCred) {
        results.push({ user_id: cred.ml_user_id, status: 'error', reason: 'credential not found' })
        continue
      }

      // Check if still needs refresh (another process might have done it)
      if (new Date(freshCred.expires_at) > new Date(Date.now() + 30 * 60 * 1000)) {
        results.push({ user_id: cred.ml_user_id, status: 'skipped', reason: 'already fresh' })
        continue
      }

      const clientId = Deno.env.get('ML_CLIENT_ID') ?? Deno.env.get('ML_APP_ID')
      const clientSecret = Deno.env.get('ML_CLIENT_SECRET') ?? Deno.env.get('ML_SECRET')

      if (!clientId || !clientSecret) {
        throw new Error('ML_CLIENT_ID / ML_CLIENT_SECRET not configured')
      }

      const tokenRes = await fetch(ML_TOKEN_URL, {
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
          // Token revoked or expired - mark as invalid to break the retry loop
          await supabase
            .from('ml_credenciales')
            .update({
              access_token: '',
              refresh_token: '',
              expires_at: new Date(0).toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('ml_user_id', cred.ml_user_id)

          await supabase
            .from('profiles')
            .update({ ml_connected: false })
            .eq('ml_user_id', cred.ml_user_id.toString())

          results.push({ user_id: cred.ml_user_id, status: 'revoked', reason: 'invalid_grant' })
          continue
        }
        throw new Error(`Token refresh failed: ${err.error || tokenRes.status}`)
      }

      const tokens = await tokenRes.json()
      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000)

      // ML rotates refresh_token on each use - store the new one.
      // onConflict relies on UNIQUE (ml_user_id) constraint; if missing, the upsert will INSERT.
      const { error: upsertError } = await supabase
        .from('ml_credenciales')
        .upsert({
          ml_user_id: tokens.user_id,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: expiresAt.toISOString(),
          scope: tokens.scope,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'ml_user_id' })

      if (upsertError) throw upsertError

      results.push({
        user_id: tokens.user_id,
        status: 'refreshed',
        expires_at: expiresAt.toISOString()
      })
    } catch (err) {
      console.error(`Refresh error for user ${cred.ml_user_id}:`, err instanceof Error ? err.message : err)
      results.push({
        user_id: cred.ml_user_id,
        status: 'error',
        error: err instanceof Error ? err.message : 'unknown'
      })
    }
  }

  return new Response(
    JSON.stringify({ results }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})
