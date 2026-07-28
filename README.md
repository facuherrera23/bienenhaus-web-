# Bienenhaus Propiedades

Landing page + panel de administración para agencia inmobiliaria en Córdoba, Argentina.

**Tech stack:** Preact + Vite + TypeScript + Supabase + Cloudinary + PWA

## Requisitos

- Node.js 20+
- npm 10+
- Cuenta en [Supabase](https://supabase.com) con proyecto activo
- Cuenta en [Cloudinary](https://cloudinary.com) para upload de imágenes

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
```

```bash
# Iniciar servidor de desarrollo
npm run dev
```

Abrir `http://localhost:3000` (sitio público) o `http://localhost:3000/admin.html` (panel admin).

## Scripts disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo con hot reload |
| `npm run build` | Build de producción en `dist/` |
| `npm run preview` | Preview del build de producción |
| `npm run lint` | Verificar lint (ESLint) |
| `npm run lint:fix` | Auto-fix lint |
| `npm run typecheck` | Verificar tipos TypeScript |
| `npm run test` | Ejecutar tests unitarios (vitest) |
| `npm run test:watch` | Tests en modo watch |

## Estructura del proyecto

```
bienenhaus/
├── index.html              # Sitio público (SPA)
├── admin.html              # Panel de administración
├── src/
│   ├── main.js             # Entry point del sitio público
│   ├── config.js           # Configuración centralizada
│   ├── supabase.js         # Cliente Supabase
│   ├── cloudinary.js       # Upload a Cloudinary
│   ├── content.js          # Carga de contenido dinámico
│   ├── components/         # Componentes Preact
│   │   ├── Hero/
│   │   ├── PropertyGrid/
│   │   ├── SearchBar/
│   │   ├── Map/
│   │   ├── Layout/
│   │   └── ConversionUX/
│   ├── utils/              # Utilidades (sanitize, SEO, analytics)
│   ├── styles/             # CSS (global, admin, critical)
│   ├── types/              # Definiciones TypeScript
│   └── admin/              # Panel de administración
│       ├── main.ts         # Entry point admin
│       ├── features/       # Módulos: properties, agents, content, settings, mercadoLibre
│       └── shared/         # Utilidades compartidas del admin
├── public/                 # Assets estáticos (favicon, robots.txt, etc.)
├── supabase/
│   └── schema.sql          # Schema de base de datos
└── .github/workflows/
    └── deploy.yml          # CI/CD → GitHub Pages
```

## Deploy

El proyecto se despliega automáticamente a **GitHub Pages** al hacer push a `main`.

### Dominio personalizado

1. En GitHub: Settings → Pages → Custom domain → `bienenhaus.com.ar`
2. Agregar registro DNS en tu proveedor:
   ```
   CNAME  bienenhaus.com.ar  →  facuherrera23.github.io
   ```
3. Marcar "Enforce HTTPS"

### Variables de entorno (producción)

Las credenciales de Supabase y Cloudinary están embebidas en el código fuente (son públicas por diseño para uso client-side). **Nunca** exponer la service role key en el frontend.

## Admin

- URL: `https://bienenhaus.com.ar/admin.html`
- Login: `admin@bienenhaus.com.ar` / `demo123456`
- Funcionalidades: CRUD propiedades, CRUD agentes, editor de contenido, integración MercadoLibre

## Seguridad

- XSS sanitization en `src/utils/sanitize.js`
- Content Security Policy (CSP) headers en HTML
- Admin protegido con auth de Supabase
- Service role key solo en server-side (Supabase Edge Functions / cron jobs)

## License

Propietario: Bienenhaus Propiedades
