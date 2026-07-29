// ================================================================
// CLIENTE SUPABASE
// ================================================================
import { createClient } from '@supabase/supabase-js';
import { CONFIG } from './config.ts';
import { logError } from './utils/logger.ts';

export const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

// Helper para manejar errores consistente
export function handleSupabaseError(error, context = '') {
  logError(`[Supabase Error] ${context}`, error, 'supabase');
  throw error;
}