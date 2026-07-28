-- ================================================================
-- PG_CRON SETUP - Ejecutar en Supabase SQL Editor
-- ================================================================
-- Requisitos previos (ejecutar una sola vez):
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- CREATE EXTENSION IF NOT EXISTS pg_net;

-- ================================================================
-- JOB: Refrescar tokens de MercadoLibre cada 30 minutos
-- ================================================================
-- Project ref: rnldqiwwzhjnurkguihu (Settings > General > Reference ID)

-- ALTER DATABASE postgres SET app.settings.service_role_key = '...';  -- Opcional: configurar en Dashboard > Database > Parameters

SELECT cron.schedule(
  'ml-refresh-token',
  '*/30 * * * *',  -- cada 30 minutos
  $$
  SELECT net.http_post(
    url := 'https://rnldqiwwzhjnurkguihu.supabase.co/functions/v1/ml-refresh-token',
    headers := jsonb_build_object(
'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJubGRxaXd3emhqbnVya2d1aWh1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDk0MDgzMywiZXhwIjoyMTAwNTE2ODMzfQ.mQ5NZTj8Qeb94runL0JYPgMMvPcRSQnSezdu1rQIzOQ',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- ================================================================
-- VERIFICAR JOBS PROGRAMADOS
-- ================================================================
-- SELECT * FROM cron.job;

-- ================================================================
-- ELIMINAR JOB SI HAY QUE CAMBIARLO
-- ================================================================
-- SELECT cron.unschedule('ml-refresh-token');

-- ================================================================
-- TEST MANUAL (ejecutar para probar ahora mismo)
-- ================================================================
-- SELECT net.http_post(
--   url := 'https://rnldqiwwzhjnurkguihu.supabase.co/functions/v1/ml-refresh-token',
--   headers := jsonb_build_object(
--     'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJubGRxaXd3emhqbnVya2d1aWh1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDk0MDgzMywiZXhwIjoyMTAwNTE2ODMzfQ.mQ5NZTj8Qeb94runL0JYPgMMvPcRSQnSezdu1rQIzOQ',
--     'Content-Type', 'application/json'
--   ),
--   body := '{}'::jsonb
-- );

-- ================================================================
-- LOGS DE EJECUCIÓN (para debug)
-- ================================================================
-- SELECT * FROM cron.job_run_details 
-- WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'ml-refresh-token')
-- ORDER BY start_time DESC LIMIT 10;