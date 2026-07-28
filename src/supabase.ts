// ================================================================
// CLIENTE SUPABASE
// ================================================================
import { createClient } from '@supabase/supabase-js';
import { CONFIG } from './config.ts';

export const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

// Helper para manejar errores consistente
export function handleSupabaseError(error, context = '') {
  console.error(`[Supabase Error] ${context}:`, error);
  throw error;
}