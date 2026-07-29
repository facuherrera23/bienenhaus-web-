// ================================================================
// MAINTENANCE MODE CHECK - Runs before app initialization
// Fail-open: if check fails, site loads normally
// ================================================================

const SUPABASE_URL = 'https://rnldqiwwzhjnurkguihu.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJubGRxaXd3emhqbnVya2d1aWh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5NDA4MzMsImV4cCI6MjEwMDUxNjgzM30.tzqe0Z1vS9R5GiCTxIe3m6uY4kkggF3kewPrRUY8BwE';

export async function checkMaintenanceMode(): Promise<void> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/contenido_sitio?clave=eq.maintenance_mode&select=valor`, {
      headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` },
      signal: AbortSignal.timeout(2500)
    });
    
    const data = await res.json();
    if (data?.[0]?.valor?.enabled === true) {
      location.replace('/maintenance.html');
    }
  } catch {
    // Fail-open: if check fails, site loads normally
  }
}