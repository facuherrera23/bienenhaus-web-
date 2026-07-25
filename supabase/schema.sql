-- ================================================================
-- SUPABASE SCHEMA - BIENENHAUS PROPIEDADES (COMPLETO)
-- Ejecutar en Supabase SQL Editor
-- ================================================================

-- Extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Función para updated_at (debe existir antes de los triggers)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

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
  -- MercadoLibre sync fields
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

-- ================================================================
-- TABLA: ml_credenciales (OAuth tokens para MercadoLibre)
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

-- ================================================================
-- TABLA: ml_sync_log (trazabilidad de sincronización ML)
-- ================================================================
CREATE TABLE IF NOT EXISTS ml_sync_log (
  id BIGSERIAL PRIMARY KEY,
  propiedad_id BIGINT REFERENCES propiedades(id) ON DELETE CASCADE,
  ml_item_id TEXT,
  accion TEXT CHECK (accion IN ('import','create','update','pause','error')),
  detalle JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ml_sync_propiedad ON ml_sync_log(propiedad_id);
CREATE INDEX IF NOT EXISTS idx_ml_sync_created ON ml_sync_log(created_at DESC);

-- RLS: lectura pública para debug en admin
ALTER TABLE ml_sync_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read ml_sync_log" ON ml_sync_log;
CREATE POLICY "Public read ml_sync_log" ON ml_sync_log FOR SELECT USING (true);

-- Insertar contenido por defecto
-- Ensure descripcion column exists (for existing databases)
ALTER TABLE contenido_sitio ADD COLUMN IF NOT EXISTS descripcion TEXT;

-- Insertar contenido por defecto (usando ::jsonb para escapar HTML correctamente)
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
('seo_titulo', '"Bienenhaus · Propiedades en Córdoba"'::jsonb, 'Meta title'),
('seo_descripcion', '"Encuentra tu próximo hogar con Bienenhaus Propiedades. Expertos en el mercado inmobiliario de Córdoba."'::jsonb, 'Meta description'),
('seo_keywords', '"inmobiliaria cordoba, venta pisos, alquiler viviendas, bienenhaus propiedades"'::jsonb, 'Keywords SEO'),
('seo_og_image', '"https://bienenhaus.com.ar/og-image.jpg"'::jsonb, 'Open Graph image'),
('seo_twitter_card', '"summary_large_image"'::jsonb, 'Twitter card type'),
('seo_schema', '{"@context":"https://schema.org","@type":"RealEstateAgent","name":"Bienenhaus Propiedades","description":"Agencia inmobiliaria profesional con más de 18 años de experiencia en el mercado argentino","address":{"@type":"PostalAddress","addressLocality":"Córdoba","addressCountry":"AR"},"telephone":"+54 351 123-4567","email":"bienenhaus.propiedades@gmail.com","url":"https://bienenhaus.com.ar"}'::jsonb, 'Schema.org JSON-LD')
ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor, updated_at = NOW();

-- ================================================================
-- MERCADOLIBRE INTEGRATION TABLES
-- ================================================================

-- Tabla de credenciales ML (solo accesible via service_role / Edge Functions)
CREATE TABLE IF NOT EXISTS ml_credenciales (
  id BIGSERIAL PRIMARY KEY,
  ml_user_id BIGINT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  scope TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: solo service_role puede acceder (sin políticas públicas = solo service_role)
ALTER TABLE ml_credenciales ENABLE ROW LEVEL SECURITY;

-- Tabla de log de sincronización ML
CREATE TABLE IF NOT EXISTS ml_sync_log (
  id BIGSERIAL PRIMARY KEY,
  propiedad_id BIGINT REFERENCES propiedades(id) ON DELETE CASCADE,
  ml_item_id TEXT,
  accion TEXT CHECK (accion IN ('import','create','update','pause','error')),
  detalle JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ml_sync_propiedad ON ml_sync_log(propiedad_id);
CREATE INDEX IF NOT EXISTS idx_ml_sync_created ON ml_sync_log(created_at DESC);

-- Trigger para updated_at en ml_credenciales
CREATE TRIGGER update_ml_credenciales_updated_at BEFORE UPDATE ON ml_credenciales
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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

-- ================================================================
-- TRIGGERS para updated_at
-- ================================================================
DROP TRIGGER IF EXISTS update_ml_credenciales_updated_at ON ml_credenciales;
CREATE TRIGGER update_ml_credenciales_updated_at BEFORE UPDATE ON ml_credenciales
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_propiedades_updated_at ON propiedades;
CREATE TRIGGER update_propiedades_updated_at BEFORE UPDATE ON propiedades
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_agentes_updated_at ON agentes;
CREATE TRIGGER update_agentes_updated_at BEFORE UPDATE ON agentes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_contenido_updated_at ON contenido_sitio;
CREATE TRIGGER update_contenido_updated_at BEFORE UPDATE ON contenido_sitio
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================================
-- STORAGE (Cloudinary) - Solo referencia, se maneja en cliente
-- ================================================================
-- Cloudinary folders: inmoconecta/propiedades/{id}/, inmoconecta/agentes/{id}/
-- Upload presets: inmoconecta_propiedades, inmoconecta_agentes (unsigned)