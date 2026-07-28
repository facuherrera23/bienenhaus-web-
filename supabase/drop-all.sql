-- ================================================================
-- DROP ALL TABLES & OBJECTS - BIENENHAUS
-- Ejecutar ANTES de schema.sql en Supabase SQL Editor
-- ================================================================

-- Drop tables in dependency order
DROP TABLE IF EXISTS ml_oauth_pkce CASCADE;
DROP TABLE IF EXISTS ml_sync_log CASCADE;
DROP TABLE IF EXISTS ml_credenciales CASCADE;
DROP TABLE IF EXISTS contenido_sitio CASCADE;
DROP TABLE IF EXISTS leads CASCADE;
DROP TABLE IF EXISTS imagenes CASCADE;
DROP TABLE IF EXISTS propiedades CASCADE;
DROP TABLE IF EXISTS agentes CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Drop function
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Drop extensions (optional - keep if other projects use them)
-- DROP EXTENSION IF EXISTS "uuid-ossp";
-- DROP EXTENSION IF EXISTS "pg_net";

-- Verify cleanup
SELECT 'Remaining tables:' as check_type, tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('propiedades','imagenes','agentes','leads','contenido_sitio','ml_credenciales','ml_sync_log','profiles','ml_oauth_pkce')
UNION ALL
SELECT 'Remaining functions:', proname 
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
AND proname = 'update_updated_at_column'
UNION ALL
SELECT 'Remaining triggers:', trigger_name 
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
AND trigger_name LIKE 'update_%_updated_at';