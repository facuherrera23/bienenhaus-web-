import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const BATCH_SIZE = 50;
const DELAY_MS = 1100; // Rate limiting for Nominatim

async function geocodeBatch() {
  console.log('Starting geocoding batch process...');
  
  let offset = 0;
  let totalProcessed = 0;
  let totalErrors = 0;
  let hasMore = true;

  while (hasMore) {
    console.log(`\nProcessing batch at offset ${offset}...`);
    
    const { data: properties, error } = await supabase
      .from('propiedades')
      .select('id, ubicacion, latitud, longitud')
      .or('latitud.is.null,longitud.is.null')
      .range(offset, offset + BATCH_SIZE - 1);

    if (error) {
      console.error('Error fetching properties:', error);
      break;
    }

    if (!properties || properties.length === 0) {
      console.log('No more properties to geocode');
      hasMore = false;
      break;
    }

    console.log(`Found ${properties.length} properties to process`);

    for (const prop of properties) {
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
            console.error(`Error updating property ${prop.id}:`, updateError.message);
          } else {
            console.log(`✓ ${prop.id}: ${prop.ubicacion} -> ${coords.lat}, ${coords.lng}`);
          }
        } else {
          console.log(`✗ ${prop.id}: ${prop.ubicacion} - Geocoding failed`);
        }

        totalProcessed++;
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
      } catch (err) {
        console.error(`Error processing property ${prop.id}:`, err);
        totalErrors++;
      }
    }

    if (properties.length < BATCH_SIZE) {
      hasMore = false;
    } else {
      offset += BATCH_SIZE;
    }
  }

  console.log('\n=== Geocoding Complete ===');
  console.log(`Total processed: ${totalProcessed}`);
  console.log(`Errors: ${totalErrors}`);
}

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

    const data = await response.json();

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

geocodeBatch().catch(console.error);