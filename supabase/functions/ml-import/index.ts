import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { mapMLItemToProperty, MLItem, Property } from "../shared/ml-mapper.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const ML_API = "https://api.mercadolibre.com"

function getCredentials(supabase: any) {
  return supabase
    .from('ml_credenciales')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single()
}

async function getValidAccessToken(supabase: any): Promise<string> {
  const { data: creds } = await getCredentials(supabase)
  if (!creds) throw new Error('No ML credentials found')

  const now = new Date()
  const expiresAt = new Date(creds.expires_at)
  const buffer = 5 * 60 * 1000 // 5 min buffer

  if (expiresAt.getTime() - now.getTime() < buffer) {
    throw new Error('Token expired, needs refresh')
  }

  return creds.access_token
}

// Cloudinary upload helper
async function uploadToCloudinary(imageUrl: string, folder: string, preset: string): Promise<{ url: string; public_id: string } | null> {
  try {
    // Download image from ML
    const imgRes = await fetch(imageUrl)
    if (!imgRes.ok) {
      console.warn(`Failed to download image: ${imageUrl}`)
      return null
    }
    const blob = await imgRes.blob()
    
    // Upload to Cloudinary
    const formData = new FormData()
    formData.append('file', blob)
    formData.append('upload_preset', preset)
    formData.append('folder', folder)
    
    const cloudName = Deno.env.get('CLOUDINARY_CLOUD_NAME')
    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`
    
    const uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      body: formData
    })
    
    if (!uploadRes.ok) {
      const err = await uploadRes.json()
      console.error('Cloudinary upload failed:', err)
      return null
    }
    
    const data = await uploadRes.json()
    return { url: data.secure_url, public_id: data.public_id }
  } catch (err) {
    console.error('Error uploading to Cloudinary:', err)
    return null
  }
}

async function processPropertyImages(
  supabase: any,
  propertyId: number,
  mlPictures: Array<{ source: string }>,
  preset: string
): Promise<void> {
  const folder = `inmoconecta/propiedades/${propertyId}`
  
  for (let i = 0; i < mlPictures.length; i++) {
    const pic = mlPictures[i]
    const result = await uploadToCloudinary(pic.source, folder, preset)
    
    if (result) {
      await supabase.from('imagenes').insert({
        propiedad_id: propertyId,
        url: result.url,
        cloudinary_public_id: result.public_id,
        orden: i,
        es_principal: i === 0
      })
    }
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

  try {
    const accessToken = await getValidAccessToken(supabase)

    // 1. Get user's ML items
    const { data: creds } = await supabase
      .from('ml_credenciales')
      .select('ml_user_id')
      .single()

    if (!creds) throw new Error('No ML credentials')

    const userId = creds.ml_user_id
    let allItems: MLItem[] = []
    let offset = 0
    const limit = 50

    // Paginate through all items
    while (true) {
      const searchRes = await fetch(
        `${ML_API}/users/${userId}/items/search?status=active,paused,closed&limit=${limit}&offset=${offset}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )

      if (!searchRes.ok) {
        const err = await searchRes.json()
        throw new Error(`Search failed: ${err.error} - ${err.error_description}`)
      }

      const data = await searchRes.json()
      const ids = data.results

      if (!ids || ids.length === 0) break

      // Multi-get items (max 20 per call)
      const chunks = []
      for (let i = 0; i < ids.length; i += 20) {
        chunks.push(ids.slice(i, i + 20))
      }

      for (const chunk of chunks) {
        const itemsRes = await fetch(
          `${ML_API}/items?ids=${chunk.join(',')}&attributes=id,site_id,title,price,currency_id,available_quantity,sold_quantity,buying_mode,listing_type_id,condition,permalink,thumbnail,pictures,attributes,status,date_created,last_updated,category_id`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        )

        if (!itemsRes.ok) {
          const err = await itemsRes.json()
          throw new Error(`Items fetch failed: ${err.error}`)
        }

        const items = await itemsRes.json()
        const validItems = items.filter((i: any) => i.code === 200).map((i: any) => i.body)
        allItems.push(...validItems)
      }

      if (ids.length < limit) break
      offset += limit
    }

    console.log(`Importing ${allItems.length} items from ML`)

    let imported = 0
    let updated = 0
    let errors = 0

    for (const item of allItems) {
      try {
        const propData = mapMLItemToProperty(item)
        
        const { data: existing } = await supabase
          .from('propiedades')
          .select('id')
          .eq('ml_item_id', item.id)
          .single()

        let propertyId: number

        if (existing) {
          await supabase
            .from('propiedades')
            .update(propData)
            .eq('id', existing.id)
          propertyId = existing.id
          updated++
        } else {
          const { data: newProp } = await supabase
            .from('propiedades')
            .insert(propData)
            .select('id')
            .single()
          
          if (newProp) {
            propertyId = newProp.id
            imported++
          }
        }

        // Process and upload images to Cloudinary
        if (propertyId && item.pictures?.length) {
          const preset = Deno.env.get('CLOUDINARY_UPLOAD_PRESET_PROPS') || 'inmoconecta_propiedades'
          await processPropertyImages(supabase, propertyId, item.pictures, preset)
        }

        // Log sync
        await supabase.from('ml_sync_log').insert({
          propiedad_id: propertyId || null,
          ml_item_id: item.id,
          accion: 'import',
          detalle: { title: item.title, status: item.status }
        })
      } catch (err) {
        errors++
        await supabase.from('ml_sync_log').insert({
          ml_item_id: item.id,
          accion: 'import',
          detalle: { error: err.message }
        })
      }
    }

    return new Response(
      JSON.stringify({ imported, updated, errors, total: allItems.length }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('ML Import error:', err)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})