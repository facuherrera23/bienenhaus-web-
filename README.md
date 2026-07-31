# Bienenhaus Propiedades

Landing page + panel de administración para agencia inmobiliaria en Córdoba, Argentina.

**Tech stack:** Preact + TypeScript + Vite + Supabase + Cloudinary + PWA + Edge Functions

---

## Requisitos

- Node.js 20+
- npm 10+
- Cuenta en [Supabase](https://supabase.com) con proyecto activo
- Cuenta en [Cloudinary](https://cloudinary.com) para upload de imágenes
- (Opcional) Cuenta en [Upstash](https://upstash.com) para rate limiting server-side

## Setup local

```bash
# Instalar dependencias
npm install

# Crear archivo de entorno
cp .env.example .env.local
```

Editar `.env.local` con tus credenciales:

```env
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key-aqui
VITE_CLOUDINARY_CLOUD_NAME=tu-cloud-name
# Opcional - para rate limiting server-side
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

```bash
# Iniciar servidor de desarrollo
npm run dev
```

Abrir `http://localhost:5173` (sitio público) o `http://localhost:5173/admin.html` (panel admin).

## Scripts disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo con hot reload (puerto 5173) |
| `npm run build` | Build de producción en `dist/` |
| `npm run preview` | Preview del build de producción |
| `npm run lint` | Verificar lint (ESLint) |
| `npm run lint:fix` | Auto-fix lint |
| `npm run typecheck` | Verificar tipos TypeScript |
| `npm run test` | Tests unitarios (vitest) |
| `npm run test:watch` | Tests en modo watch |
| `npm run test:e2e` | Tests end-to-end (Playwright) |
| `npm run test:e2e:ui` | Tests e2e con UI |

## Estructura del proyecto

```
bienenhaus/
├── index.html              # Sitio público (SPA)
├── admin.html              # Panel de administración
├── src/
│   ├── main.ts             # Entry point sitio público
│   ├── supabase.ts         # Cliente Supabase singleton
│   ├── content.ts          # Carga contenido dinámico
│   ├── router.ts           # Router SPA
│   ├── sw.ts               # Service Worker PWA
│   ├── config.ts           # Configuración centralizada
│   ├── components/         # Componentes Preact
│   │   ├── Hero3D/         # Hero con Three.js
│   │   ├── PropertyGrid/   # Grid propiedades + skeletons
│   │   ├── SearchBar/      # Autocomplete + filtros
│   │   └── Layout/         # Header, Footer, Nav
│   ├── styles/             # CSS (critical, admin, global)
│   ├── utils/              # Utilidades (sanitize, SEO, analytics, format)
│   ├── types/              # Definiciones TypeScript
│   └── admin/              # Panel de administración
│       ├── main.ts         # Entry point admin
│       ├── shared/         # Utils, modales, utils compartidas
│       └── features/       # Módulos funcionales
│           ├── properties/  # CRUD propiedades + Cloudinary
│           ├── agents/      # CRUD agentes
│           ├── content/     # Editor de contenido CMS
│           ├── settings/    # Configuración sitio
│           └── mercadoLibre/ # Integración ML
├── public/                 # Assets estáticos
├── supabase/
│   ├── schema.sql          # Schema base de datos
│   └── functions/          # Edge Functions (Deno)
│       ├── rate-limit/     # Rate limiting server-side (Upstash)
│       └── cloudinary-delete/ # Borrado imágenes Cloudinary
├── e2e/                    # Tests Playwright
└── .github/workflows/
    └── deploy.yml          # CI/CD → Vercel
```

## Deploy

Deploy automático en **Vercel** al hacer push a `main`.

### Dominio personalizado
1. En Vercel: Settings → Domains → `bienenhaus.com.ar`
2. DNS: CNAME `bienenhaus.com.ar` → `cname.vercel-dns.com`
3. Enforce HTTPS

### Variables de entorno (producción)
Las credenciales `VITE_SUPABASE_*` y `VITE_CLOUDINARY_*` son públicas por diseño (client-side). **Nunca** exponer la service role key en el frontend.

---

## Admin

- **URL**: `https://bienenhaus.com.ar/admin.html`
- **Login**: `admin@bienenhaus.com.ar` / `demo123456` (cambiar en producción)
- **Funcionalidades**:
  - CRUD Propiedades (bulk actions, imágenes Cloudinary, ML sync)
  - CRUD Agentes (avatar, especialidad, orden)
  - Editor de Contenido CMS (Hero, About, Services, FAQ, Footer, SEO)
  - Configuración (site settings, ML OAuth, maintenance mode)
  - MercadoLibre (OAuth, import, sync, logs)

---

## Tests

```bash
# Unit tests
npm run test

# E2E tests (Playwright)
npm run test:e2e
npm run test:e2e:ui
```

**Suite actual**: 25 tests (23 pass, 2 pre-existing admin failures no relacionados)

---

## CI/CD

`.github/workflows/deploy.yml`:
1. Install → Typecheck → Lint → Unit tests
2. Build production
3. Deploy to Vercel (preview/production)

---

## Variables de entorno (resumen)

| Variable | Descripción | Requerida |
|----------|-------------|-----------|
| `VITE_SUPABASE_URL` | URL proyecto Supabase | ✅ |
| `VITE_SUPABASE_ANON_KEY` | Anon key pública | ✅ |
| `VITE_CLOUDINARY_CLOUD_NAME` | Cloud name Cloudinary | ✅ |
| `UPSTASH_REDIS_REST_URL` | URL Redis Upstash (rate limit) | Opcional |
| `UPSTASH_REDIS_REST_TOKEN` | Token Redis Upstash | Opcional |

---

## Licencia

Propietario: **Bienenhaus Propiedades** - Córdoba, Argentina