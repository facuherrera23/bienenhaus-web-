-- ================================================================
-- SUPABASE SCHEMA - BIENENHAUS PROPIEDADES (COMPLETO)
-- Ejecutar UNA SOLA VEZ en Supabase SQL Editor
-- ================================================================

-- Extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_net"; -- Para pg_cron con http requests

-- Limpieza preventiva: elimina triggers existentes (por si se ejecuta varias veces)
-- Se hace dentro de un DO block porque DROP TRIGGER requiere que la tabla exista
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ml_credenciales') THEN
    DROP TRIGGER IF EXISTS update_ml_credenciales_updated_at ON ml_credenciales;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'propiedades') THEN
    DROP TRIGGER IF EXISTS update_propiedades_updated_at ON propiedades;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agentes') THEN
    DROP TRIGGER IF EXISTS update_agentes_updated_at ON agentes;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contenido_sitio') THEN
    DROP TRIGGER IF EXISTS update_contenido_sitio_updated_at ON contenido_sitio;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
  END IF;
END $$;

-- Función para updated_at (debe existir antes de los triggers)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- ================================================================
-- TABLA: profiles (extensión de auth.users para datos ML)
-- Supabase Auth crea auth.users automáticamente
-- Esta tabla extiende con campos de MercadoLibre
-- ================================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  -- MercadoLibre fields
  ml_connected BOOLEAN DEFAULT FALSE,
  ml_user_id TEXT,
  ml_access_token TEXT,
  ml_refresh_token TEXT,
  ml_token_expires_at TIMESTAMPTZ,
  ml_token_type TEXT,
  ml_scope TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_ml_user_id ON profiles(ml_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_ml_connected ON profiles(ml_connected) WHERE ml_connected = true;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS para profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS "Service role full access profiles" ON profiles;
CREATE POLICY "Service role full access profiles" ON profiles FOR ALL USING (auth.role() = 'service_role');

-- ================================================================
-- TABLA: ml_oauth_pkce (para flujo OAuth con PKCE)
-- ================================================================
CREATE TABLE IF NOT EXISTS ml_oauth_pkce (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_verifier TEXT NOT NULL,
  code_challenge TEXT NOT NULL,
  state TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ml_oauth_pkce_state ON ml_oauth_pkce(state);
CREATE INDEX IF NOT EXISTS idx_ml_oauth_pkce_user_id ON ml_oauth_pkce(user_id);
CREATE INDEX IF NOT EXISTS idx_ml_oauth_pkce_expires ON ml_oauth_pkce(expires_at);

-- RLS - solo service_role puede acceder
ALTER TABLE ml_oauth_pkce ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access ml_oauth_pkce" ON ml_oauth_pkce;
CREATE POLICY "Service role full access ml_oauth_pkce" ON ml_oauth_pkce FOR ALL USING (auth.role() = 'service_role');

-- Limpieza automática de PKCE expirados (ejecutar via pg_cron cada hora)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule('clean-ml-pkce', '0 * * * *', 'DELETE FROM ml_oauth_pkce WHERE expires_at < NOW();');

-- ================================================================
-- TABLA: propiedades
-- ================================================================
CREATE TABLE IF NOT EXISTS propiedades (
  id BIGSERIAL PRIMARY KEY,
  titulo TEXT NOT NULL,
  precio NUMERIC NOT NULL,
  moneda TEXT DEFAULT 'ARS' CHECK (moneda IN ('ARS','USD')),
  operacion TEXT NOT NULL CHECK (operacion IN ('venta','alquiler')),
  ubicacion TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('piso','chalet','atico','local','terreno')),
  habitaciones INT DEFAULT 0,
  banos INT DEFAULT 0,
  m2 INT DEFAULT 0,
  antiguedad TEXT DEFAULT 'reformado' CHECK (antiguedad IN ('nuevo','reformado','viejo')),
  destacado BOOLEAN DEFAULT FALSE,
  caracteristicas TEXT[],
  descripcion TEXT,
  video_url TEXT,
  cochera BOOLEAN DEFAULT FALSE,
  balcon BOOLEAN DEFAULT FALSE,
  pileta BOOLEAN DEFAULT FALSE,
  amueblado BOOLEAN DEFAULT FALSE,
  mascotas BOOLEAN DEFAULT FALSE,
  gastos_comunes NUMERIC DEFAULT 0,
  expensas NUMERIC DEFAULT 0,
  -- SEO fields
  seo_titulo TEXT,
  seo_descripcion TEXT,
  seo_keywords TEXT,
  seo_og_image TEXT,
  seo_schema JSONB,
  -- MercadoLibre sync fields
  ml_enabled BOOLEAN DEFAULT FALSE,
  ml_item_id TEXT UNIQUE,
  ml_status TEXT,
  ml_permalink TEXT,
  ml_last_sync TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para filtros
CREATE INDEX IF NOT EXISTS idx_prop_operacion ON propiedades(operacion);
CREATE INDEX IF NOT EXISTS idx_prop_tipo ON propiedades(tipo);
CREATE INDEX IF NOT EXISTS idx_prop_precio ON propiedades(precio);
CREATE INDEX IF NOT EXISTS idx_prop_destacado ON propiedades(destacado DESC);
CREATE INDEX IF NOT EXISTS idx_prop_created ON propiedades(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prop_ubicacion ON propiedades USING gin(to_tsvector('spanish', ubicacion));
CREATE INDEX IF NOT EXISTS idx_prop_titulo ON propiedades USING gin(to_tsvector('spanish', titulo));
-- Índices para MercadoLibre sync
CREATE INDEX IF NOT EXISTS idx_prop_ml_item_id ON propiedades(ml_item_id);
CREATE INDEX IF NOT EXISTS idx_prop_ml_status ON propiedades(ml_status);
CREATE INDEX IF NOT EXISTS idx_prop_ml_last_sync ON propiedades(ml_last_sync DESC);
CREATE INDEX IF NOT EXISTS idx_prop_ml_enabled ON propiedades(ml_enabled) WHERE ml_enabled = true;
-- Índices para filtros avanzados
CREATE INDEX IF NOT EXISTS idx_prop_cochera ON propiedades(cochera);
CREATE INDEX IF NOT EXISTS idx_prop_balcon ON propiedades(balcon);
CREATE INDEX IF NOT EXISTS idx_prop_pileta ON propiedades(pileta);
CREATE INDEX IF NOT EXISTS idx_prop_amueblado ON propiedades(amueblado);
CREATE INDEX IF NOT EXISTS idx_prop_mascotas ON propiedades(mascotas);

CREATE TRIGGER update_propiedades_updated_at BEFORE UPDATE ON propiedades
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================================
-- TABLA: imagenes (1:N propiedades)
-- ================================================================
CREATE TABLE IF NOT EXISTS imagenes (
  id BIGSERIAL PRIMARY KEY,
  propiedad_id BIGINT REFERENCES propiedades(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  cloudinary_public_id TEXT NOT NULL,
  orden INT DEFAULT 0,
  es_principal BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_img_propiedad ON imagenes(propiedad_id);
CREATE INDEX IF NOT EXISTS idx_img_principal ON imagenes(propiedad_id, es_principal DESC);

-- ================================================================
-- TABLA: agentes
-- ================================================================
CREATE TABLE IF NOT EXISTS agentes (
  id BIGSERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  apellido TEXT,
  especialidad TEXT NOT NULL,
  email TEXT,
  telefono TEXT,
  descripcion TEXT,
  orden INT DEFAULT 99,
  activo BOOLEAN DEFAULT TRUE,
  avatar_url TEXT,
  avatar_public_id TEXT,
  redes_sociales JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agentes_activo ON agentes(activo) WHERE activo = true;
CREATE INDEX IF NOT EXISTS idx_agentes_orden ON agentes(orden);

CREATE TRIGGER update_agentes_updated_at BEFORE UPDATE ON agentes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================================
-- TABLA: leads (contactos)
-- ================================================================
CREATE TABLE IF NOT EXISTS leads (
  id BIGSERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  email TEXT NOT NULL,
  telefono TEXT NOT NULL,
  motivo TEXT NOT NULL,
  tipo_propiedad TEXT,
  mensaje TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at DESC);

-- ================================================================
-- TABLA: contenido_sitio (CMS para textos del index)
-- ================================================================
CREATE TABLE IF NOT EXISTS contenido_sitio (
  clave TEXT PRIMARY KEY,
  valor JSONB NOT NULL,
  descripcion TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_contenido_sitio_updated_at BEFORE UPDATE ON contenido_sitio
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================================
-- TABLA: ml_credenciales (OAuth tokens para MercadoLibre)
-- Usada por Edge Functions para publicar/sincronizar
-- ================================================================
CREATE TABLE IF NOT EXISTS ml_credenciales (
  id BIGSERIAL PRIMARY KEY,
  ml_user_id BIGINT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  scope TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: solo accesible desde Edge Functions (service_role)
ALTER TABLE ml_credenciales ENABLE ROW LEVEL SECURITY;
-- Sin políticas públicas = solo service_role bypassa RLS

CREATE TRIGGER update_ml_credenciales_updated_at BEFORE UPDATE ON ml_credenciales
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================================
-- TABLA: ml_sync_log (trazabilidad de sincronización ML)
-- ================================================================
CREATE TABLE IF NOT EXISTS ml_sync_log (
  id BIGSERIAL PRIMARY KEY,
  propiedad_id BIGINT REFERENCES propiedades(id) ON DELETE CASCADE,
  ml_item_id TEXT,
  accion TEXT CHECK (accion IN ('import','create','update','pause','activate','close','error')),
  detalle JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ml_sync_propiedad ON ml_sync_log(propiedad_id);
CREATE INDEX IF NOT EXISTS idx_ml_sync_created ON ml_sync_log(created_at DESC);

-- RLS: lectura pública para debug en admin
ALTER TABLE ml_sync_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read ml_sync_log" ON ml_sync_log;
CREATE POLICY "Public read ml_sync_log" ON ml_sync_log FOR SELECT USING (true);
DROP POLICY IF EXISTS "Service role full access ml_sync_log" ON ml_sync_log;
CREATE POLICY "Service role full access ml_sync_log" ON ml_sync_log FOR ALL USING (auth.role() = 'service_role');

-- ================================================================
-- CONTENIDO POR DEFECTO (CMS)
-- ================================================================
INSERT INTO contenido_sitio (clave, valor, descripcion) VALUES
('hero_badge', '"CPI. 1834 · Córdoba · Argentina"'::jsonb, 'Badge superior del hero'),
('hero_titulo', '"Encuentra tu <span class=\"highlight\">hogar</span> o la<br>inversión que <span class=\"highlight\">buscas</span>"'::jsonb, 'Título principal del hero (HTML permitido)'),
('hero_subtitulo', '"Más de 300 propiedades en venta y alquiler. Asesoría profesional, tasación sin compromiso y video tours 360°."'::jsonb, 'Subtítulo del hero'),
('hero_badges', '["Sin comisiones ocultas", "Garantía legal", "Video tours 360°", "Respuesta en 24h"]'::jsonb, 'Array de badges del hero'),
('hero_cta_primario', '"Ver propiedades"'::jsonb, 'Texto CTA primario'),
('hero_cta_secundario', '"Solicitar asesoría"'::jsonb, 'Texto CTA secundario'),
('hero_stats', '[{"label":"Propiedades activas","valor":"350+","icono":"fa-home"},{"label":"Operaciones cerradas","valor":"1.200+","icono":"fa-handshake"},{"label":"Satisfacción clientes","valor":"98%","icono":"fa-star"},{"label":"Años de experiencia","valor":"18+","icono":"fa-calendar"}]'::jsonb, 'Stats del hero'),
('about_titulo', '"Quiénes somos"'::jsonb, 'Título sección quiénes somos'),
('about_descripcion', '"<strong>Bienenhaus Propiedades</strong> es una agencia inmobiliaria con más de 18 años de experiencia en el mercado de Córdoba y Argentina. Ofrecemos un servicio integral: venta, alquiler, tasación y asesoramiento legal. <strong>CPI. 1834</strong>"'::jsonb, 'Descripción quiénes somos (HTML)'),
('about_valores', '[{"icono":"fa-handshake","titulo":"Confianza","descripcion":"Relaciones transparentes"},{"icono":"fa-rocket","titulo":"Agilidad","descripcion":"Procesos eficientes"},{"icono":"fa-gavel","titulo":"Legalidad","descripcion":"Asesoría jurídica"},{"icono":"fa-chart-line","titulo":"Rentabilidad","descripcion":"Maximizamos tu inversión"},{"icono":"fa-user-tie","titulo":"Asesoramiento","descripcion":"Personalizado"},{"icono":"fa-shield-alt","titulo":"Seguridad","descripcion":"Operaciones garantizadas"}]'::jsonb, 'Valores (icono FontAwesome, título, descripción)'),
('servicios_titulo', '"Nuestros servicios"'::jsonb, 'Título servicios'),
('servicios_subtitulo', '"Soluciones inmobiliarias integrales para cada necesidad."'::jsonb, 'Subtítulo servicios'),
('servicios_lista', '[{"icono":"fa-home","titulo":"Venta de propiedades","descripcion":"Vende al mejor precio del mercado"},{"icono":"fa-key","titulo":"Alquiler de viviendas","descripcion":"Encuentra el inquilino ideal"},{"icono":"fa-calculator","titulo":"Tasación","descripcion":"Valoración precisa y certificada"},{"icono":"fa-hand-holding-usd","titulo":"Asesoría financiera","descripcion":"La mejor financiación"},{"icono":"fa-file-signature","titulo":"Gestión legal","descripcion":"Trámites sin complicaciones"},{"icono":"fa-camera","titulo":"Video tours 360°","descripcion":"Visitas virtuales"}]'::jsonb, 'Lista de servicios'),
('por_que_titulo', '"¿Por qué elegir Bienenhaus?"'::jsonb, 'Título por qué elegirnos'),
('por_que_subtitulo', '"Expertos en el mercado inmobiliario de Córdoba y Argentina."'::jsonb, 'Subtítulo por qué'),
('por_que_razones', '[{"emoji":"🏆","titulo":"18+ años de experiencia","descripcion":"Más de 1.200 operaciones"},{"emoji":"📋","titulo":"Asesoramiento personalizado","descripcion":"Te acompañamos en cada paso"},{"emoji":"🔒","titulo":"Transparencia total","descripcion":"Sin comisiones ocultas"},{"emoji":"📱","titulo":"Tecnología de vanguardia","descripcion":"Video tours 360°"},{"emoji":"⚡","titulo":"Respuesta en 24h","descripcion":"Rapidez y eficiencia"},{"emoji":"🏛️","titulo":"Garantía legal","descripcion":"Asesoría jurídica integral"}]'::jsonb, 'Razones por qué elegirnos'),
('team_titulo', '"Nuestro equipo"'::jsonb, 'Título equipo'),
('team_subtitulo', '"Agentes especializados con amplia experiencia en el mercado de Córdoba."'::jsonb, 'Subtítulo equipo'),
('offices_titulo', '"Nuestras oficinas"'::jsonb, 'Título oficinas'),
('offices_subtitulo', '"Estamos presentes en las principales ciudades de Argentina, con base en Córdoba."'::jsonb, 'Subtítulo oficinas'),
('footer_marca', '"Comprometidos con tu hogar desde 2008. <strong>CPI. 1834</strong> · Córdoba, Argentina."'::jsonb, 'Descripción footer'),
('footer_links', '[{"texto":"Propiedades","url":"#catalogo"},{"texto":"Quiénes somos","url":"#quienes-somos"},{"texto":"Servicios","url":"#servicios"},{"texto":"Equipo","url":"#equipo"},{"texto":"Oficinas","url":"#oficinas"},{"texto":"Contacto","url":"#contacto"}]'::jsonb, 'Enlaces rápidos footer'),
('footer_servicios', '[{"texto":"Venta de propiedades","url":"#"},{"texto":"Alquiler de viviendas","url":"#"},{"texto":"Tasación profesional","url":"#"},{"texto":"Asesoría financiera","url":"#"},{"texto":"Gestión legal","url":"#"}]'::jsonb, 'Servicios footer'),
('footer_copyright', '"© 2026 Bienenhaus Propiedades · CPI. 1834 · Córdoba · Argentina"'::jsonb, 'Copyright footer'),
('footer_descripcion', '"Comprometidos con tu hogar desde 2008. <strong>CPI. 1834</strong> · Córdoba, Argentina."'::jsonb, 'Descripción footer'),
('footer_contacto', '"Córdoba, Argentina<br>+54 351 123-4567<br>bienenhaus.propiedades@gmail.com"'::jsonb, 'Contacto footer'),
('faq_titulo', '"Preguntas frecuentes"'::jsonb, 'Título FAQ'),
('faq_subtitulo', '"Resolvemos las dudas más comunes."'::jsonb, 'Subtítulo FAQ'),
('faq_grid', '[{"pregunta":"¿Cómo tasar mi propiedad?","respuesta":"Solicita una tasación gratuita a través de nuestro formulario de contacto."},{"pregunta":"¿Cuánto tarda el proceso de venta?","respuesta":"En promedio 1-3 meses. El 85% se vende en menos de 60 días."},{"pregunta":"¿Qué comisiones cobran?","respuesta":"Trabajamos con un porcentaje fijo y transparente. Consulta nuestras condiciones."},{"pregunta":"¿Ofrecen alquiler temporal?","respuesta":"Sí, ofrecemos alquiler temporal y de larga duración."},{"pregunta":"¿Cómo son los video tours 360°?","respuesta":"Visitas virtuales profesionales desde cualquier dispositivo."},{"pregunta":"¿Qué garantías ofrecen?","respuesta":"Garantía legal, asesoramiento y seguimiento personalizado."}]'::jsonb, 'FAQ grid'),
('contacto_titulo', '"Contacta con nosotros"'::jsonb, 'Título contacto'),
('contacto_subtitulo', '"¿Quieres vender, alquilar, comprar o tasar tu propiedad? Cuéntanos tu caso."'::jsonb, 'Subtítulo contacto'),
('seo_titulo', '"Bienenhaus · Propiedades en Córdoba"'::jsonb, 'Meta title'),
('seo_descripcion', '"Encuentra tu próximo hogar con Bienenhaus Propiedades. Expertos en el mercado inmobiliario de Córdoba."'::jsonb, 'Meta description'),
('seo_keywords', '"inmobiliaria cordoba, venta pisos, alquiler viviendas, bienenhaus propiedades"'::jsonb, 'Keywords SEO'),
('seo_og_image', '"https://bienenhaus.com.ar/og-image.jpg"'::jsonb, 'Open Graph image'),
('seo_twitter_card', '"summary_large_image"'::jsonb, 'Twitter card type'),
('seo_schema', '{"@context":"https://schema.org","@type":"RealEstateAgent","name":"Bienenhaus Propiedades","description":"Agencia inmobiliaria profesional con más de 18 años de experiencia en el mercado argentino","address":{"@type":"PostalAddress","addressLocality":"Córdoba","addressCountry":"AR"},"telephone":"+54 351 123-4567","email":"bienenhaus.propiedades@gmail.com","url":"https://bienenhaus.com.ar"}'::jsonb, 'Schema.org JSON-LD')
ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor, updated_at = NOW();

-- ================================================================
-- RLS (Row Level Security)
-- ================================================================
ALTER TABLE propiedades ENABLE ROW LEVEL SECURITY;
ALTER TABLE imagenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE agentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE contenido_sitio ENABLE ROW LEVEL SECURITY;

-- Políticas públicas de LECTURA
DROP POLICY IF EXISTS "Public read propiedades" ON propiedades;
CREATE POLICY "Public read propiedades" ON propiedades FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read imagenes" ON imagenes;
CREATE POLICY "Public read imagenes" ON imagenes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read agentes activos" ON agentes;
CREATE POLICY "Public read agentes activos" ON agentes FOR SELECT USING (activo = true);

DROP POLICY IF EXISTS "Public read contenido" ON contenido_sitio;
CREATE POLICY "Public read contenido" ON contenido_sitio FOR SELECT USING (true);

-- Leads: solo INSERT público (formulario contacto)
DROP POLICY IF EXISTS "Public insert leads" ON leads;
CREATE POLICY "Public insert leads" ON leads FOR INSERT WITH CHECK (true);

-- Service role tiene acceso total (para admin panel)
-- No necesita políticas explícitas, usa service_role key

-- Políticas de ESCRITURA para admin (authenticated + is_admin)
DROP POLICY IF EXISTS "Admin insert propiedades" ON propiedades;
CREATE POLICY "Admin insert propiedades" ON propiedades FOR INSERT
  WITH CHECK (auth.role() = 'service_role' OR (auth.role() = 'authenticated' AND auth.jwt()->'app_metadata'->>'is_admin' = 'true'));

DROP POLICY IF EXISTS "Admin update propiedades" ON propiedades;
CREATE POLICY "Admin update propiedades" ON propiedades FOR UPDATE
  USING (auth.role() = 'service_role' OR (auth.role() = 'authenticated' AND auth.jwt()->'app_metadata'->>'is_admin' = 'true'));

DROP POLICY IF EXISTS "Admin delete propiedades" ON propiedades;
CREATE POLICY "Admin delete propiedades" ON propiedades FOR DELETE
  USING (auth.role() = 'service_role' OR (auth.role() = 'authenticated' AND auth.jwt()->'app_metadata'->>'is_admin' = 'true'));

DROP POLICY IF EXISTS "Admin insert imagenes" ON imagenes;
CREATE POLICY "Admin insert imagenes" ON imagenes FOR INSERT
  WITH CHECK (auth.role() = 'service_role' OR (auth.role() = 'authenticated' AND auth.jwt()->'app_metadata'->>'is_admin' = 'true'));

DROP POLICY IF EXISTS "Admin delete imagenes" ON imagenes;
CREATE POLICY "Admin delete imagenes" ON imagenes FOR DELETE
  USING (auth.role() = 'service_role' OR (auth.role() = 'authenticated' AND auth.jwt()->'app_metadata'->>'is_admin' = 'true'));

DROP POLICY IF EXISTS "Admin all agentes" ON agentes;
CREATE POLICY "Admin all agentes" ON agentes FOR ALL
  USING (auth.role() = 'service_role' OR (auth.role() = 'authenticated' AND auth.jwt()->'app_metadata'->>'is_admin' = 'true'))
  WITH CHECK (auth.role() = 'service_role' OR (auth.role() = 'authenticated' AND auth.jwt()->'app_metadata'->>'is_admin' = 'true'));

DROP POLICY IF EXISTS "Admin all contenido_sitio" ON contenido_sitio;
CREATE POLICY "Admin all contenido_sitio" ON contenido_sitio FOR ALL
  USING (auth.role() = 'service_role' OR (auth.role() = 'authenticated' AND auth.jwt()->'app_metadata'->>'is_admin' = 'true'))
  WITH CHECK (auth.role() = 'service_role' OR (auth.role() = 'authenticated' AND auth.jwt()->'app_metadata'->>'is_admin' = 'true'));

DROP POLICY IF EXISTS "Admin read leads" ON leads;
CREATE POLICY "Admin read leads" ON leads FOR SELECT
  USING (auth.role() = 'service_role' OR (auth.role() = 'authenticated' AND auth.jwt()->'app_metadata'->>'is_admin' = 'true'));

DROP POLICY IF EXISTS "Admin delete leads" ON leads;
CREATE POLICY "Admin delete leads" ON leads FOR DELETE
  USING (auth.role() = 'service_role' OR (auth.role() = 'authenticated' AND auth.jwt()->'app_metadata'->>'is_admin' = 'true'));

-- ================================================================
-- MIGRACIÓN: Columnas faltantes en propiedades
-- ================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'propiedades' AND column_name = 'user_id') THEN
    ALTER TABLE propiedades ADD COLUMN user_id UUID REFERENCES auth.users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'propiedades' AND column_name = 'latitud') THEN
    ALTER TABLE propiedades ADD COLUMN latitud DOUBLE PRECISION;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'propiedades' AND column_name = 'longitud') THEN
    ALTER TABLE propiedades ADD COLUMN longitud DOUBLE PRECISION;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'propiedades' AND column_name = 'estado') THEN
    ALTER TABLE propiedades ADD COLUMN estado TEXT DEFAULT 'draft' CHECK (estado IN ('draft','published','archived'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'propiedades' AND column_name = 'ml_price') THEN
    ALTER TABLE propiedades ADD COLUMN ml_price NUMERIC;
  END IF;
END $$;

-- ================================================================
-- TABLA: ml_webhook_log (idempotencia para webhooks ML)
-- ================================================================
CREATE TABLE IF NOT EXISTS ml_webhook_log (
  id BIGSERIAL PRIMARY KEY,
  ml_event_id TEXT NOT NULL UNIQUE,
  ml_resource TEXT NOT NULL,
  ml_topic TEXT,
  accion TEXT,
  received_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
  error TEXT,
  payload JSONB
);

CREATE INDEX IF NOT EXISTS idx_ml_webhook_ml_event_id ON ml_webhook_log(ml_event_id);
CREATE INDEX IF NOT EXISTS idx_ml_webhook_status ON ml_webhook_log(status);
CREATE INDEX IF NOT EXISTS idx_ml_webhook_received ON ml_webhook_log(received_at DESC);

ALTER TABLE ml_webhook_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access ml_webhook_log" ON ml_webhook_log;
CREATE POLICY "Service role full access ml_webhook_log" ON ml_webhook_log FOR ALL USING (auth.role() = 'service_role');

-- ================================================================
-- FUNCIÓN: pg_try_advisory_xact_lock (bigint wrapper para Edge Functions)
-- ================================================================
CREATE OR REPLACE FUNCTION pg_try_advisory_xact_lock_bigint(key BIGINT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT pg_try_advisory_xact_lock(key);
$$;

-- ================================================================
-- STORAGE / CLOUDINARY - Solo referencia (se maneja en cliente)
-- ================================================================
-- Cloudinary folders: inmoconecta/propiedades/{id}/, inmoconecta/agentes/{id}/
-- Upload presets (unsigned): inmoconecta_propiedades, inmoconecta_agentes

-- ================================================================
-- PG_CRON - Tareas programadas (configurar en Supabase Dashboard)
-- ================================================================
-- 1. Settings > Database > Extensions > Enable pg_cron
-- 2. Settings > Database > Extensions > Enable pg_net
-- 3. Configura los parámetros en Supabase Dashboard > Database > Parameters:
--    - app.settings.supabase_url = https://tu-proyecto.supabase.co
--    - app.settings.service_role_key = tu-service-role-key
-- 4. Settings > Database > Cron Jobs > Add job:
--    Name: ml-refresh-token
--    Schedule: */30 * * * *
--    Command:

-- IMPORTANTE: El token de abajo es un EJEMPLO. Usa current_setting() para
-- evitar commitear service_role keys en el repositorio.

SELECT cron.schedule(
  'ml-refresh-token',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/ml-refresh-token',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Para configurar manualmente en Supabase Dashboard:
-- 1. Settings > Database > Parameters:
--    - app.settings.supabase_url = https://tu-proyecto.supabase.co
--    - app.settings.service_role_key = tu-service-role-key
-- 2. Settings > Edge Functions > ml-refresh-token > Copy URL
-- 3. Settings > Database > Cron Jobs > Add job:
--    Name: ml-refresh-token
--    Schedule: */30 * * * *
--    Command:

-- ================================================================
-- EDGE FUNCTIONS REQUERIDAS (desplegar por separado en Supabase)
-- ================================================================
-- 1. ml-oauth-init          - Inicia flujo OAuth con PKCE
-- 2. ml-oauth-callback      - Recibe callback de ML, intercambia código por tokens
-- 3. ml-publish             - Publica/actualiza/pausa propiedades en ML
-- 4. ml-import              - Importa propiedades desde ML
-- 5. ml-refresh-token       - Refresca access_token automáticamente (cron)
-- 6. ml-status              - Verifica estado de conexión ML
-- 7. ml-webhook             - Recibe notificaciones de ML (opcional)
-- 8. geocode-batch          - Geocodificación masiva (opcional)

-- ================================================================
-- FUNCIONALIDAD AUTO-PUBLISH MERCADOLIBRE
-- ================================================================
-- Implementada en frontend (src/admin/features/properties/index.ts):
-- - Al CREAR propiedad: si ml_enabled=true y ml_status='publish' → llama ml-publish
-- - Bulk actions: botón "Publicar" en barra bulk llama ml-publish para cada selección
--
-- Flujo:
-- 1. Usuario marca "Publicar en MercadoLibre" + estado "Publicar" en modal propiedad
-- 2. Al guardar, se inserta en BD y luego se invoca supabase.functions.invoke('ml-publish')
-- 3. Edge Function ml-publish usa credenciales de ml_credenciales para publicar en ML API
-- 4. Resultado se guarda en ml_sync_log y actualiza ml_item_id, ml_status, ml_last_sync

-- ================================================================
-- VERIFICACIÓN POST-EJECUCIÓN
-- ================================================================
-- Verificar tablas:
-- SELECT * FROM propiedades LIMIT 1;
-- SELECT * FROM imagenes LIMIT 1;
-- SELECT * FROM agentes LIMIT 1;
-- SELECT * FROM leads LIMIT 1;
-- SELECT * FROM contenido_sitio LIMIT 5;
-- SELECT * FROM ml_credenciales LIMIT 1;
-- SELECT * FROM ml_sync_log LIMIT 1;
-- SELECT * FROM profiles LIMIT 1;
-- SELECT * FROM ml_oauth_pkce LIMIT 1;
--
-- Verificar triggers:
-- SELECT * FROM information_schema.triggers WHERE trigger_name LIKE 'update_%_updated_at';
--
-- Verificar RLS:
-- SELECT * FROM pg_policies WHERE tablename IN ('propiedades','imagenes','agentes','leads','contenido_sitio','ml_sync_log','profiles','ml_oauth_pkce');