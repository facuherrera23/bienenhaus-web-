# Bienenhaus Propiedades - Landing Page

Landing page profesional para inmobiliaria en Córdoba, Argentina. Stack moderno: Vite + Vanilla JS + Supabase + Cloudinary.

## 🚀 Deploy en 24h (Vercel + Dominio propio)

### 1. Preparar repositorio
```bash
cd bienenhaus
git init
git add .
git commit -m "Initial commit: Bienenhaus landing page"
```

### 2. Subir a GitHub
```bash
# Crear repo en github.com/bienenhaus/bienenhaus-web
git remote add origin https://github.com/bienenhaus/bienenhaus-web.git
git branch -M main
git push -u origin main
```

### 3. Configurar Supabase (5 min)
1. Crear proyecto en [supabase.com](https://supabase.com)
2. SQL Editor → Ejecutar `supabase/schema.sql` (ver abajo)
3. Settings > API > Copiar **URL** y **anon key**
4. Authentication > Providers > Deshabilitar email confirmations (para leads públicos)

### 4. Configurar Cloudinary (3 min)
1. Cuenta en [cloudinary.com](https://cloudinary.com)
2. Settings > Upload > **Create upload preset**:
   - Nombre: `inmoconecta_propiedades` → **Unsigned** → Folder: `inmoconecta/propiedades`
   - Nombre: `inmoconecta_agentes` → **Unsigned** → Folder: `inmoconecta/agentes`
3. Copiar **Cloud Name**

### 5. Deploy en Vercel (2 min)
```bash
npm i -g vercel
vercel login
vercel --prod
```
- Vercel detecta Vite automáticamente
- **Environment Variables** (Settings > Environment Variables):
  ```
  VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
  VITE_SUPABASE_ANON_KEY=tu-clave-anonima
  VITE_CLOUDINARY_CLOUD_NAME=tu-cloud-name
  VITE_WHATSAPP_NUMBER=5493511234567
  ```
- Redeploy: `vercel --prod`

### 6. Dominio personalizado (5 min)
En Vercel: Settings > Domains > Add `bienenhaus.com.ar` + `www.bienenhaus.com.ar`
En tu proveedor DNS (GoDaddy/Namecheap/Cloudflare):
```
Tipo  Nombre  Valor
A     @       76.76.21.21
CNAME www     cname.vercel-dns.com
```
SSL automático en 1-2 min.

---

## 📋 Schema Supabase (Ejecutar en SQL Editor)

```sql
-- Tabla propiedades
CREATE TABLE propiedades (
  id BIGSERIAL PRIMARY KEY,
  titulo TEXT NOT NULL,
  precio NUMERIC NOT NULL,
  moneda TEXT DEFAULT 'ARS',
  operacion TEXT CHECK (operacion IN ('venta','alquiler')) NOT NULL,
  ubicacion TEXT NOT NULL,
  tipo TEXT CHECK (tipo IN ('piso','chalet','atico','local','terreno')) NOT NULL,
  habitaciones INT DEFAULT 0,
  banos INT DEFAULT 0,
  m2 INT DEFAULT 0,
  antiguedad TEXT CHECK (antiguedad IN ('nuevo','reformado','viejo')) DEFAULT 'reformado',
  destacado BOOLEAN DEFAULT FALSE,
  caracteristicas TEXT[],
  descripcion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla imágenes (1:N propiedades)
CREATE TABLE imagenes (
  id BIGSERIAL PRIMARY KEY,
  propiedad_id BIGINT REFERENCES propiedades(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  cloudinary_public_id TEXT NOT NULL,
  orden INT DEFAULT 0,
  es_principal BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla agentes
CREATE TABLE agentes (
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
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla leads (contactos)
CREATE TABLE leads (
  id BIGSERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  email TEXT NOT NULL,
  telefono TEXT NOT NULL,
  motivo TEXT NOT NULL,
  tipo_propiedad TEXT,
  mensaje TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para filtros
CREATE INDEX idx_prop_operacion ON propiedades(operacion);
CREATE INDEX idx_prop_tipo ON propiedades(tipo);
CREATE INDEX idx_prop_precio ON propiedades(precio);
CREATE INDEX idx_prop_destacado ON propiedades(destacado DESC);
CREATE INDEX idx_agentes_activo ON agentes(activo) WHERE activo = true;

-- RLS (Row Level Security)
ALTER TABLE propiedades ENABLE ROW LEVEL SECURITY;
ALTER TABLE imagenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE agentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Políticas públicas de lectura
CREATE POLICY "Public read propiedades" ON propiedades FOR SELECT USING (true);
CREATE POLICY "Public read imagenes" ON imagenes FOR SELECT USING (true);
CREATE POLICY "Public read agentes activos" ON agentes FOR SELECT USING (activo = true);

-- Leads: solo INSERT público
CREATE POLICY "Public insert leads" ON leads FOR INSERT WITH CHECK (true);

-- Service role (backend/admin) tiene acceso total
-- Se configura automáticamente con service_role key
```

---

## 🛠 Desarrollo Local

```bash
# Instalar dependencias
npm install

# Copiar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus claves REALES

# Desarrollo
npm run dev
# Abre http://localhost:3000

# Build producción
npm run build
# Preview build
npm run preview
```

---

## 📁 Estructura del Proyecto

```
bienenhaus/
├── index.html              # HTML limpio (sin JS/CSS inline)
├── vite.config.js          # Config Vite + terser minify
├── package.json
├── .env.example            # Template variables
├── .gitignore
├── public/
│   ├── favicon.svg
│   └── og-image.jpg        # Imagen Open Graph (1200x630)
├── src/
│   ├── main.js             # Entry point
│   ├── styles.css          # Todo el CSS (design system)
│   ├── config.js           # Variables de entorno tipadas
│   ├── supabase.js         # Cliente Supabase
│   ├── cloudinary.js       # Upload helper
│   ├── properties.js       # CRUD propiedades + render
│   ├── agents.js           # CRUD agentes + render
│   ├── ui.js               # Modales, filtros, scroll, WhatsApp, cookies
│   └── admin.js            # Panel admin (solo si se importa)
└── supabase/
    └── schema.sql          # Schema BD completo
```

---

## ✨ Funcionalidades

- **Catálogo dinámico**: Filtros server-side (Supabase), paginación, favoritos (localStorage)
- **Modal detalle**: Galería, WhatsApp deep-link, email, video 360° placeholder
- **Equipo dinámico**: Carga desde Supabase con avatares Cloudinary
- **Formulario leads**: Validación UX, guardado en Supabase, toast success
- **WhatsApp flotante**: Modal con formulario + deep-link directo
- **Panel Admin** (Ctrl+Shift+A): CRUD propiedades + agentes + subida imágenes
- **SEO completo**: Meta tags, Open Graph, Schema.org, sitemap-ready
- **Accesibilidad**: Skip link, focus-visible, aria-labels, semantic HTML
- **Responsive**: Mobile-first, breakpoints 1024/768/480
- **Performance**: Lazy-loading imágenes, code-splitting, minificación

---

## 🔐 Seguridad en Producción

1. **RLS activado** en todas las tablas (ver schema.sql)
2. **Claves solo en Vercel Env Vars** (nunca en repo)
3. **Cloudinary unsigned upload** solo para presets específicos con folder restrictivo
4. **Panel admin** solo accesible via atajo teclado (no en menú público)
5. **CSP headers** (configurar en Vercel > Settings > Headers si se desea)

---

## 📝 Checklist Pre-Deploy

- [ ] `.env.local` con claves reales (no commitear)
- [ ] `public/og-image.jpg` (1200x630, <200KB)
- [ ] Schema Supabase ejecutado y RLS verificado
- [ ] Cloudinary presets unsigned creados
- [ ] `npm run build` sin errores
- [ ] Vercel env vars configuradas
- [ ] DNS propagado + SSL activo
- [ ] Test: formulario contacto → lead en Supabase
- [ ] Test: admin panel (Ctrl+Shift+A) → CRUD funciona
- [ ] Test: WhatsApp deep-link abre app/web
- [ ] Lighthouse > 90 en Performance/SEO/Accessibility

---

## 📞 Soporte

- **WhatsApp**: +54 9 351 123-4567
- **Email**: bienenhaus.propiedades@gmail.com
- **Web**: https://bienenhaus.com.ar

---

**Stack**: Vite 5 + Vanilla JS (ES Modules) + Supabase + Cloudinary + Vercel
**Licencia**: Privada - Bienenhaus Propiedades CPI 1834