// ================================================================
// CLIENTE SUPABASE
// ================================================================
import { createClient } from '@supabase/supabase-js';
import { CONFIG } from './config.ts';
import { logError, logWarn } from './utils/logger.ts';

export const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Helper para manejar errores consistente
export function handleSupabaseError(error: unknown, context = ''): void {
  const err = error as { message?: string; code?: string; status?: number };
  
  // Ignorar errores de red bloqueados por ad blockers
  if (err?.message?.includes('Failed to fetch') || err?.message?.includes('ERR_BLOCKED_BY_CLIENT')) {
    logWarn('Supabase request blocked (likely ad blocker)', { context, originalError: err?.message }, 'supabase');
    return;
  }
  
  // Ignorar errores de refresh token expirado (se manejan automáticamente)
  if (err?.message?.includes('refresh_token') || err?.code === 'invalid_refresh_token' || err?.status === 400) {
    logWarn('Supabase auth token issue (will retry)', { context, code: err?.code, status: err?.status }, 'supabase');
    return;
  }
  
  logError(`[Supabase Error] ${context}`, error, 'supabase');
  throw error;
}

// Wrapper para operaciones con reintentos
export async function withSupabaseRetry<T>(
  operation: () => Promise<T>,
  context: string,
  maxRetries = 2
): Promise<T> {
  let lastError: unknown;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const err = error as { message?: string; status?: number };
      
      // No reintentar en errores de autenticación
      if (err?.status === 401 || err?.status === 403 || err?.message?.includes('JWT')) {
        throw error;
      }
      
      if (attempt < maxRetries) {
        logWarn(`Supabase retry ${attempt}/${maxRetries}`, { context, error: err?.message }, 'supabase');
        await new Promise(r => setTimeout(r, 1000 * attempt));
      }
    }
  }
  
  throw lastError;
}