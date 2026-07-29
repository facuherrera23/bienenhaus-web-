// @ts-nocheck
// ================================================================
// SHARED SUPABASE LOADER - Module-level promise for Vercel best practices
// bundle-dynamic-imports, async-parallel, async-defer-await
// ================================================================

import { supabase as supabaseClient } from '../supabase.ts';

/**
 * Module-level promise that resolves to the supabase client.
 * This avoids duplicate dynamic imports across components (Vercel: bundle-dynamic-imports)
 * and allows starting the fetch early (Vercel: async-defer-await).
 */
export const supabasePromise = Promise.resolve(supabaseClient).then(client => {
  // Ensure the client is initialized
  return client;
});

/**
 * Get the supabase client, awaiting the promise if needed.
 * Use this instead of `const { supabase } = await import('../../supabase.ts')`
 */
export async function getSupabase() {
  return supabasePromise;
}