import { CONFIG } from '../config.ts';

export async function checkMaintenanceMode(): Promise<void> {
  if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON_KEY) return;
  try {
    const res = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/contenido_sitio?clave=eq.maintenance_mode&select=valor`, {
      headers: { apikey: CONFIG.SUPABASE_ANON_KEY, Authorization: `Bearer ${CONFIG.SUPABASE_ANON_KEY}` },
      signal: AbortSignal.timeout(2500)
    });
    const data = await res.json();
    if (data?.[0]?.valor?.enabled === true) {
      location.replace('/maintenance.html');
    }
  } catch {
    // NOP: fail-open
  }
}