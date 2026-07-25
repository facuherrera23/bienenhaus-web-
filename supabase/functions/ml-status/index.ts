import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  try {
    const { data: creds, error } = await supabase
      .from('ml_credenciales')
      .select('ml_user_id, expires_at')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !creds) {
      return new Response(
        JSON.stringify({ connected: false }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const now = new Date()
    const expiresAt = new Date(creds.expires_at)
    const isExpired = expiresAt < now
    const expiresSoon = expiresAt < new Date(Date.now() + 5 * 60 * 1000) // 5 min

    return new Response(
      JSON.stringify({
        connected: !isExpired,
        user_id: creds.ml_user_id,
        expires_at: creds.expires_at,
        expired: isExpired,
        expires_soon: expiresSoon
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('ML Status error:', err)
    return new Response(
      JSON.stringify({ connected: false, error: err.message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})