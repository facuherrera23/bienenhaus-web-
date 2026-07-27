import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface GeocodeRequest {
  batch_size?: number;
  offset?: number;
  force?: boolean;
}

interface Property {
  id: number;
  ubicacion: string;
  latitud?: number | null;
  longitud?: number | null;
}

interface NominatimResponse {
  lat: string;
  lon: string;
  display_name: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: GeocodeRequest = await req.json().catch(() => ({}));
    const batchSize = Math.min(body.batch_size || 50, 100);
    const offset = body.offset || 0;
    const force = body.force || false;

    let query = supabase
      .from('propiedades')
      .select('id, ubicacion, latitud, longitud')
      .range(offset, offset + batchSize - 1);

    if (!force) {
      query = query.or('latitud.is.null,longitud.is.null');
    }

    const { data: properties, error: fetchError } = await query;

    if (fetchError) {
      throw fetchError;
    }

    if (!properties || properties.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No properties to geocode', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let processed = 0;
    let errors = 0;
    const results = [];

    for (const prop of properties as Property[]) {
      try {
        const coords = await geocodeAddress(prop.ubicacion);
        
        if (coords) {
          const { error: updateError } = await supabase
            .from('propiedades')
            .update({
              latitud: coords.lat,
              longitud: coords.lng,
              updated_at: new Date().toISOString(),
            })
            .eq('id', prop.id);

          if (updateError) {
            console.error(`Error updating property ${prop.id}:`, updateError);
            errors++;
          } else {
            processed++;
            results.push({ id: prop.id, lat: coords.lat, lng: coords.lng });
          }
        } else {
          errors++;
          results.push({ id: prop.id, error: 'Geocoding failed' });
        }

        // Rate limiting: 1 request per second for Nominatim
        await new Promise(resolve => setTimeout(resolve, 1100));
      } catch (err) {
        console.error(`Error geocoding property ${prop.id}:`, err);
        errors++;
        results.push({ id: prop.id, error: err.message });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed,
        errors,
        total: properties.length,
        results,
        nextOffset: offset + batchSize,
        hasMore: properties.length === batchSize,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Geocode batch error:', err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const encoded = encodeURIComponent(address);
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encoded}&limit=1&countrycodes=ar&addressdetails=1`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Bienenhaus/1.0 (contact@bienenhaus.com.ar)',
      },
    });

    if (!response.ok) {
      throw new Error(`Nominatim error: ${response.status}`);
    }

    const data: NominatimResponse[] = await response.json();

    if (data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
      };
    }

    return null;
  } catch (err) {
    console.error('Geocode error:', err);
    return null;
  }
}