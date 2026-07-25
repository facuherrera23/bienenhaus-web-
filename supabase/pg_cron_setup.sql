-- ================================================================
-- PG_CRON SETUP - Ejecutar en Supabase SQL Editor
-- ================================================================
-- Requisitos previos (ejecutar una sola vez):
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- CREATE EXTENSION IF NOT EXISTS pg_net;

-- ================================================================
-- JOB: Refrescar tokens de MercadoLibre cada 30 minutos
-- ================================================================
-- Reemplaza TU_PROYECTO por tu project ref de Supabase
-- (lo encuentras en Settings > General > Reference ID)

SELECT cron.schedule(
  'ml-refresh-token',
  '*/30 * * * *',  -- cada 30 minutos
  $$
  SELECT net.http_post(
    url := 'https://TU_PROYECTO.supabase.co/functions/v1/ml-refresh-token',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
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
--   url := 'https://TU_PROYECTO.supabase.co/functions/v1/ml-refresh-token',
--   headers := jsonb_build_object(
--     'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
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