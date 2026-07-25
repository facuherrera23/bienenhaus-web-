# Bienenhaus Propiedades - Landing Page + Admin Panel

Landing page profesional para inmobiliaria en Córdoba, Argentina con panel de administración completo. Stack: **Vite 5 + Vanilla JS (ES Modules) + Supabase + Cloudinary + GitHub Pages**.

---

## 🚀 Deploy Automático (GitHub Pages)

### 1. Clonar y configurar
```bash
git clone https://github.com/facuherrera23/bienenhaus-web-.git
cd bienenhaus
npm install
```

### 2. Variables de entorno
```bash
cp .env.example .env.local
# Editar .env.local con tus claves REALES
```

### 3. Configurar Supabase (5 min)
1. Crear proyecto en [supabase.com](https://supabase.com)
2. **SQL Editor** → Ejecutar `supabase/schema.sql` (ver abajo)
3. **Authentication > Providers** → Deshabilitar "Confirm email" (para leads públicos)
4. **Settings > API** → Copiar **Project URL** y **anon/public key**
5. **Authentication > Users** → Add user → `admin@bienenhaus.com.ar` / password seguro

### 4. Configurar Cloudinary (3 min)
1. Cuenta en [cloudinary.com](https://cloudinary.com)
2. **Settings > Upload > Create upload preset**:
   - `inmoconecta_propiedades` → **Unsigned** → Folder: `inmoconecta/propiedades`
   - `inmoconecta_agentes` → **Unsigned** → Folder: `inmoconecta/agentes`
3. Copiar **Cloud Name**

### 5. Deploy a GitHub Pages
```bash
# Build local para test
npm run build
npm run preview

# Push a main → GitHub Actions hace deploy automático
git add .
git commit -m "feat: initial deploy"
git push origin main
```

**GitHub Actions** (`.github/workflows/deploy.yml`) compila con Vite y sube a `gh-pages`.

### 6. Variables en GitHub (Settings > Secrets > Actions)
```
VITE_SUPABASE_URL          = https://TU_PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY     = eyJhbGciOiJIUzI1NiIs...
VITE_CLOUDINARY_CLOUD_NAME = tu-cloud-name
VITE_WHATSAPP_NUMBER       = 5493511234567
VITE_ADMIN_EMAIL           = admin@bienenhaus.com.ar
```

### 7. Dominio personalizado (opcional)
En repo Settings > Pages > Custom domain: `bienenhaus.com.ar`
DNS:
```
Tipo  Nombre  Valor
A     @       185.199.108.153
A     @       185.199.109.153
A     @       185.199.110.153
A     @       185.199.111.153
CNAME www     facuherrera23.github.io
```

---

## 📋 Schema Supabase (Ejecutar en SQL Editor)

```sql
-- 1. PROPIEDADES
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

-- 2. IMÁGENES (1:N propiedades)
CREATE TABLE imagenes (
  id BIGSERIAL PRIMARY KEY,
  propiedad_id BIGINT REFERENCES propiedades(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  cloudinary_public_id TEXT NOT NULL,
  orden INT DEFAULT 0,
  es_principal BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. AGENTES
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

-- 4. LEADS (contactos públicos)
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

-- 5. CONTENIDO DEL SITIO (Admin panel - Textos del Sitio)
CREATE TABLE contenido_sitio (
  clave TEXT PRIMARY KEY,
  valor JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. ÍNDICES
CREATE INDEX idx_prop_operacion ON propiedades(operacion);
CREATE INDEX idx_prop_tipo ON propiedades(tipo);
CREATE INDEX idx_prop_precio ON propiedades(precio);
CREATE INDEX idx_prop_destacado ON propiedades(destacado DESC);
CREATE INDEX idx_agentes_activo ON agentes(activo) WHERE activo = true;

-- 7. RLS (Row Level Security)
ALTER TABLE propiedades ENABLE ROW LEVEL SECURITY;
ALTER TABLE imagenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE agentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE contenido_sitio ENABLE ROW LEVEL SECURITY;

-- Lectura pública
CREATE POLICY "Public read propiedades" ON propiedades FOR SELECT USING (true);
CREATE POLICY "Public read imagenes" ON imagenes FOR SELECT USING (true);
CREATE POLICY "Public read agentes" ON agentes FOR SELECT USING (activo = true);
CREATE POLICY "Public read contenido" ON contenido_sitio FOR SELECT USING (true);

-- Leads: solo INSERT público
CREATE POLICY "Public insert leads" ON leads FOR INSERT WITH CHECK (true);

-- Admin write (email fijo en política)
CREATE POLICY "Admin write propiedades" ON propiedades FOR ALL 
  USING (auth.uid() IN (SELECT id FROM auth.users WHERE email = 'admin@bienenhaus.com.ar'))
  WITH CHECK (auth.uid() IN (SELECT id FROM auth.users WHERE email = 'admin@bienenhaus.com.ar'));
CREATE POLICY "Admin write imagenes" ON imagenes FOR ALL 
  USING (auth.uid() IN (SELECT id FROM auth.users WHERE email = 'admin@bienenhaus.com.ar'))
  WITH CHECK (auth.uid() IN (SELECT id FROM auth.users WHERE email = 'admin@bienenhaus.com.ar'));
CREATE POLICY "Admin write agentes" ON agentes FOR ALL 
  USING (auth.uid() IN (SELECT id FROM auth.users WHERE email = 'admin@bienenhaus.com.ar'))
  WITH CHECK (auth.uid() IN (SELECT id FROM auth.users WHERE email = 'admin@bienenhaus.com.ar'));
CREATE POLICY "Admin write contenido" ON contenido_sitio FOR ALL 
  USING (auth.uid() IN (SELECT id FROM auth.users WHERE email = 'admin@bienenhaus.com.ar'))
  WITH CHECK (auth.uid() IN (SELECT id FROM auth.users WHERE email = 'admin@bienenhaus.com.ar'));
```

---

## 🛠 Desarrollo Local

```bash
# Instalar dependencias
npm install

# Copiar variables de entorno
cp .env.example .env.local
# Editar .env.local con claves REALES

# Desarrollo (http://localhost:3000)
npm run dev

# Build producción
npm run build

# Preview build
npm run preview

# Type-check (si usas TypeScript en admin)
npm run typecheck
```

---

## 📁 Estructura del Proyecto

```
bienenhaus/
├── index.html              # Landing page (HTML limpio)
├── admin.html              # Panel admin standalone
├── vite.config.ts          # Config Vite + build multi-entry
├── package.json
├── .env.example            # Template variables
├── .gitignore
├── public/
│   ├── favicon.svg
│   └── og-image.jpg        # Open Graph 1200x630
├── .github/
│   └── workflows/
│       └── deploy.yml      # CI/CD GitHub Pages
├── supabase/
│   └── schema.sql          # Schema BD completo
└── src/
    ├── main.js             # Entry point landing
    ├── admin-app.ts        # Entry point admin panel
    ├── styles.css          # Design system completo
    ├── config.js           # Variables de entorno tipadas
    ├── supabase.js         # Cliente Supabase singleton
    ├── cloudinary.js       # Upload helper (unsigned)
    ├── content.js          # Carga contenido dinámico desde BD
    ├── properties.js       # CRUD propiedades + render catálogo
    ├── agents.js           # CRUD agentes + render equipo
    ├── ui.js               # Modales, filtros, WhatsApp, cookies, scroll
    └── admin-app.ts        # Panel admin completo (TypeScript)
```

---

## ✨ Funcionalidades

### Landing Page (`index.html`)
- **Hero dinámico**: Título, subtítulo, badges, CTAs, stats → desde BD
- **Catálogo propiedades**: Filtros server-side, paginación, favoritos (localStorage)
- **Modal detalle**: Galería, WhatsApp deep-link, email, video 360° placeholder
- **Equipo dinámico**: Carga agentes desde Supabase + avatares Cloudinary
- **Secciones editables**: About, Servicios, Why, FAQ, Contacto, Footer → desde BD
- **SEO completo**: Meta tags, Open Graph, Twitter Card, Schema.org JSON-LD
- **WhatsApp flotante**: Modal con formulario + deep-link directo
- **Formulario leads**: Validación UX, guardado en Supabase, toast success
- **Accesibilidad**: Skip link, focus-visible, aria-labels, HTML semántico
- **Responsive**: Mobile-first, breakpoints 1024/768/480

### Panel Admin (`/admin.html`)
- **Login**: Supabase Auth (solo `admin@bienenhaus.com.ar`)
- **Dashboard**: Stats propiedades/agentes, actividad reciente
- **Propiedades CRUD**: Listado, crear/editar/eliminar, 15 imágenes Cloudinary, destacado, filtros
- **Agentes CRUD**: Listado, crear/editar/desactivar, avatar Cloudinary, orden, especialidad
- **Textos del Sitio** (8 pestañas): Hero, About, Servicios, Why, Equipo, Oficinas, Footer, SEO
- **Configuración**: General, Contacto, Redes Sociales, Integraciones
- **Subida imágenes**: Drag & drop, preview, orden principal, validación tipo/tamaño
- **Responsive**: Sidebar colapsable, tablas con scroll horizontal, modales adaptados

---

## 🔐 Seguridad en Producción

1. **RLS activado** en todas las tablas (ver schema.sql)
2. **Claves solo en GitHub Secrets** (nunca en repo)
3. **Cloudinary unsigned upload** solo presets específicos con folder restrictivo
4. **Admin panel** solo accesible via `/admin.html` (no en menú público)
5. **Auth**: Solo `admin@bienenhaus.com.ar` puede escribir
6. **HTTPS automático** via GitHub Pages

---

## 📝 Checklist Pre-Deploy

- [ ] `.env.local` con claves reales (no commitear)
- [ ] `public/og-image.jpg` (1200x630, <200KB)
- [ ] Schema Supabase ejecutado y RLS verificado
- [ ] Cloudinary presets unsigned creados (`inmoconecta_propiedades`, `inmoconecta_agentes`)
- [ ] Usuario admin creado en Supabase Auth (`admin@bienenhaus.com.ar`)
- [ ] `npm run build` sin errores
- [ ] GitHub Secrets configurados (5 variables)
- [ ] DNS propagado + SSL activo
- [ ] Test: formulario contacto → lead en Supabase
- [ ] Test: admin panel login → CRUD propiedades/agentes
- [ ] Test: WhatsApp deep-link abre app/web
- [ ] Test: Textos del Sitio → Guardar → ver en landing
- [ ] Lighthouse > 90 Performance/SEO/Accessibility

---

## 📞 Contacto

- **WhatsApp**: +54 9 351 123-4567
- **Email**: bienenhaus.propiedades@gmail.com
- **Web**: https://bienenhaus.com.ar
- **CPI**: 1834 · Córdoba, Argentina

---

## 📦 Stack Técnico

| Capa | Tecnología |
|------|------------|
| Build | Vite 5 + terser |
| Frontend | Vanilla JS (ES Modules) + TypeScript (admin) |
| Estilos | CSS Custom Properties (Design System) |
| Backend/Baas | Supabase (PostgreSQL + Auth + Realtime) |
| Imágenes | Cloudinary (unsigned upload presets) |
| Deploy | GitHub Pages + GitHub Actions |
| CI/CD | Ubuntu latest + Node 22 + npm ci + vite build |

---

**Licencia**: Privada - Bienenhaus Propiedades CPI 1834