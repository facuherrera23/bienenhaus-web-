import { serve } from "std/http/server.ts"
import { createClient } from "@supabase/supabase-js"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const ML_API = "https://api.mercadolibre.com"

interface RegisterWebhookPayload {
  action: 'register' | 'unregister'
  topics?: string[]
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
    const { action, topics = ['items', 'questions', 'orders'] } = await req.json()

    // Get credentials
    const { data: creds } = await supabase
      .from('ml_credenciales')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()

    if (!creds) {
      throw new Error('No ML credentials found')
    }

    const now = new Date()
    const expiresAt = new Date(creds.expires_at)
    const buffer = 5 * 60 * 1000

    if (expiresAt.getTime() - now.getTime() < buffer) {
      throw new Error('Token expired, needs refresh')
    }

    const accessToken = creds.access_token
    const userId = creds.ml_user_id

    const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/ml-webhook-receiver`

    if (action === 'register') {
      const results = []

      for (const topic of topics) {
        try {
          // Check if webhook already exists
          const checkRes = await fetch(`${ML_API}/applications/${Deno.env.get('ML_CLIENT_ID')}/notifications?user_id=${userId}&topic=${topic}`, {
            headers: { Authorization: `Bearer ${accessToken}` }
          })

          if (checkRes.ok) {
            const existing = await checkRes.json()
            const alreadyRegistered = existing.some((w: any) => w.callback_url === webhookUrl)
            
            if (alreadyRegistered) {
              results.push({ topic, status: 'already_registered', url: webhookUrl })
              continue
            }
          }

          // Register webhook
          const registerRes = await fetch(`${ML_API}/applications/${Deno.env.get('ML_CLIENT_ID')}/notifications`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              user_id: userId,
              topic,
              callback_url: webhookUrl,
            }),
          })

          const data = await registerRes.json()
          
          if (!registerRes.ok) {
            results.push({ topic, status: 'error', error: data.message || data.error })
          } else {
            results.push({ topic, status: 'registered', url: webhookUrl, id: data.id })
          }
        } catch (err) {
          results.push({ topic, status: 'error', error: err.message })
        }
      }

      return new Response(
        JSON.stringify({ success: true, results }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else if (action === 'unregister') {
      const results = []

      for (const topic of topics) {
        try {
          // Get existing webhooks
          const checkRes = await fetch(`${ML_API}/applications/${Deno.env.get('ML_CLIENT_ID')}/notifications?user_id=${userId}&topic=${topic}`, {
            headers: { Authorization: `Bearer ${accessToken}` }
          })

          if (checkRes.ok) {
            const existing = await checkRes.json()
            const ourWebhooks = existing.filter((w: any) => w.callback_url === webhookUrl)

            for (const webhook of ourWebhooks) {
              const deleteRes = await fetch(`${ML_API}/applications/${Deno.env.get('ML_CLIENT_ID')}/notifications/${webhook.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${accessToken}` }
              })

              if (deleteRes.ok) {
                results.push({ topic, status: 'unregistered', id: webhook.id })
              } else {
                const err = await deleteRes.json()
                results.push({ topic, status: 'error', error: err.message })
              }
            }
          }
        } catch (err) {
          results.push({ topic, status: 'error', error: err.message })
        }
      }

      return new Response(
        JSON.stringify({ success: true, results }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      throw new Error('Invalid action. Use "register" or "unregister"')
    }
  } catch (err) {
    console.error('Webhook registration error:', err)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})