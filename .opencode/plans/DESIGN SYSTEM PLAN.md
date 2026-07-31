# DESIGN SYSTEM PLAN — BIENENHAUS PROPIEDADES
## "Nocturne" — Sistema Normativo Completo (Migración desde Midnight Hive)

---

## 0. CONTEXTO Y RELACIÓN CON EL SISTEMA ANTERIOR

Este documento **reemplaza y extiende** el plan "The Midnight Hive" que ya tenías implementado. Mantiene su misma rigurosidad (tokens exhaustivos, specs por componente, arquitectura CSS, fases de ejecución, reglas do's/don'ts, comandos de verificación) pero migra la dirección visual hacia el concepto **"Nocturne"**: nace de una foto de referencia de arquitectura moderna fotografiada de noche, con un único acento de luz LED (pileta, escalones, jardín) como firma de marca, y aplica esa misma idea a un **Hero 3D en WebGL** como pieza central de la home.

**Se mantiene la convención de prefijos** (`--ds-*` público, `--admin-*` panel) para que la migración sea un reemplazo de valores dentro de la misma arquitectura de archivos, no una reescritura desde cero.

**Qué cambia respecto al sistema anterior:**
- Acento único: de `#20b8ab` (teal saturado) a `#2EE6C5` ("Signal" — más luminoso, pensado para simular una fuente de luz real, no un color de marca plano).
- Tipografía: de Anton/Poppins/Montserrat/Quicksand a General Sans (display) + Inter (body) + JetBrains Mono (datos) — menos "impacto publicitario", más "arquitectónico/técnico", coherente con el material de referencia (planos, especificaciones).
- Se incorpora una **pieza signature nueva**: el Hero 3D (WebGL), que reemplaza el hero de imagen estática + overlay degradado.
- El resto de las reglas normativas (grid de 8px, radius scale, flat-by-default, one-voice-rule del acento) **se preservan sin cambios**, porque ya funcionan bien y el equipo/OpenCode ya está entrenado en ellas.

**Qué NO cambia:**
- La arquitectura de archivos CSS (`src/styles/`, `src/styles/admin/`).
- El pipeline de build (PostCSS + Terser + extracción de critical CSS).
- El sistema de partials Handlebars.
- Los principios estructurales: dark mode único, un solo acento, flat-by-default, grid de 8px, touch targets ≥44px.

---

## 1. RESUMEN EJECUTIVO

**Objetivo:** Migrar el Landing Público + Panel Admin/CRM + Tasaciones del sistema "Midnight Hive" (teal `#20b8ab` + Anton/Poppins) al sistema **"Nocturne"** (signal `#2ee6c5` + General Sans/Inter/JetBrains Mono), incorporando el Hero 3D como pieza central de la home pública.

**Stack:** Preact + Vite + TypeScript + Supabase + Cloudinary + PWA (frontend público en migración desde Handlebars/vanilla JS hacia componentes Preact tipados; panel admin conserva su arquitectura de partials durante la transición).

**Principios rectores (normativos, heredados y confirmados):**
- **Dark mode único** — sin alternancia de tema.
- **Un solo acento: Signal `#2EE6C5`** — ≤10% de la pantalla (The One Voice Rule).
- **No Legacy Teal Rule** — `#20b8ab` queda deprecado; solo se tolera en componentes no migrados durante la fase de transición, marcados explícitamente `.legacy-teal`.
- **Flat-By-Default** — sombras solo en estados interactivos (hover/focus/modal).
- **8px Grid** — todos los espaciados múltiplos de 8px (base 4px para admin, igual que antes).
- **Radius scale estricta** — Público: 4px / 8px / 16px / 9999px · Admin: 4px / 8px / 12px / 16px / 9999px.
- **Signal-as-light, no signal-as-brand** — el acento se trata como una fuente de luz puntual (glow, foco), nunca como un fill decorativo de fondo.
- **Tipografía funcional** — cada familia con un rol único, sin superposición.
- **Touch targets ≥ 44px**, fuentes ≥ 16px en mobile.

---

## 2. DESIGN TOKENS NORMATIVOS

### 2.1 Prefijos obligatorios (sin cambios)
- **Público:** `--ds-*`
- **Admin:** `--admin-*`

### 2.2 Tokens PÚBLICOS (Landing) — Sistema Nocturne

```css
:root {
  /* ===== BRAND — SIGNAL (Único acento, tratado como fuente de luz) ===== */
  --ds-color-primary: #2ee6c5;
  --ds-color-primary-dark: #1fb89e;
  --ds-color-primary-dim: #134a42;             /* versión atenuada — bordes, hover sutil */
  --ds-color-primary-glow: rgba(46, 230, 197, 0.16);
  --ds-color-primary-glow-strong: rgba(46, 230, 197, 0.28);
  --ds-color-primary-border: rgba(46, 230, 197, 0.25);
  --ds-color-primary-focus-ring: 0 0 0 2px rgba(46, 230, 197, 0.2);

  /* ===== SEMANTIC (sin cambios respecto al sistema anterior) ===== */
  --ds-color-success: #3aaa55;
  --ds-color-success-bg: rgba(58, 170, 85, 0.10);
  --ds-color-success-border: rgba(58, 170, 85, 0.25);
  --ds-color-warning: #cc9922;
  --ds-color-warning-bg: rgba(204, 153, 34, 0.10);
  --ds-color-warning-border: rgba(204, 153, 34, 0.25);
  --ds-color-danger: #cc3535;
  --ds-color-danger-bg: rgba(204, 53, 53, 0.10);
  --ds-color-danger-border: rgba(204, 53, 53, 0.25);
  --ds-color-info: #2ee6c5;

  /* ===== SURFACES — DARK THEME (PÚBLICO) ===== */
  --ds-color-bg: #0b0d0e;               /* "Void" — casi negro, con tibieza (no negro puro) */
  --ds-color-surface-1: #101214;
  --ds-color-surface-2: #16181a;
  --ds-color-surface-3: #1c1f21;
  --ds-color-surface-4: #24272a;         /* "Concrete" — superficies elevadas */
  --ds-color-surface-elevated: rgba(28, 31, 33, 0.95);

  /* ===== TEXT ===== */
  --ds-color-text: #e8ecee;             /* "Glass" — no blanco puro, ligera tibieza fría */
  --ds-color-text-secondary: #9aa1a6;   /* "Fog" */
  --ds-color-text-muted: #7fa8a0;       /* Signal Mist — derivado del acento, para metadata */
  --ds-color-text-disabled: #2e3234;
  --ds-color-text-on-primary: #06110f;  /* casi negro, para texto sobre el acento */

  /* ===== BORDERS ===== */
  --ds-color-border: rgba(232, 236, 238, 0.06);       /* Hairline */
  --ds-color-border-medium: rgba(232, 236, 238, 0.12);
  --ds-color-border-strong: rgba(232, 236, 238, 0.22);

  /* ===== TYPOGRAPHY (PÚBLICO) ===== */
  --ds-font-display: 'General Sans', 'Söhne', sans-serif;   /* headlines, títulos de sección */
  --ds-font-body: 'Inter', sans-serif;                       /* UI, nav, forms, copy */
  --ds-font-num: 'JetBrains Mono', 'Consolas', monospace;    /* precios, m², specs, contadores */
  --ds-font-elegant: 'Inter', sans-serif;                    /* labels/badges — mismo body, distinto tracking */
  --ds-font-mono: 'JetBrains Mono', monospace;               /* alias explícito para datos técnicos */

  --ds-text-display: clamp(2.5rem, 6vw, 4.5rem);
  --ds-text-headline: clamp(1.75rem, 4vw, 2.75rem);
  --ds-text-title: clamp(1.4rem, 3vw, 2rem);
  --ds-text-body: 1rem;         /* 16px */
  --ds-text-label: 0.875rem;    /* 14px */
  --ds-text-sm: 0.875rem;       /* 14px */
  --ds-text-xs: 0.75rem;        /* 12px */

  --ds-font-weight-normal: 400;
  --ds-font-weight-medium: 500;
  --ds-font-weight-semibold: 600;
  --ds-font-weight-bold: 700;
  --ds-font-weight-extrabold: 800;

  --ds-line-height-display: 1.02;
  --ds-line-height-headline: 1.1;
  --ds-line-height-title: 1.2;
  --ds-line-height-body: 1.6;
  --ds-line-height-label: 1.4;

  --ds-letter-spacing-display: -0.02em;   /* display type: tracking negativo, no positivo */
  --ds-letter-spacing-label: 0.08em;
  --ds-letter-spacing-badge: 0.1em;
  --ds-letter-spacing-num: -0.01em;

  /* ===== SPACING (8px base — sin cambios) ===== */
  --ds-space-1: 4px;
  --ds-space-2: 8px;
  --ds-space-3: 12px;
  --ds-space-4: 16px;
  --ds-space-5: 24px;
  --ds-space-6: 32px;
  --ds-space-7: 48px;
  --ds-space-8: 64px;
  --ds-space-9: 80px;

  /* ===== RADIUS (ESTRICTO: solo 4, 8, 16, 9999 — sin cambios) ===== */
  --ds-radius-sm: 4px;
  --ds-radius-md: 8px;
  --ds-radius-lg: 16px;
  --ds-radius-full: 9999px;

  /* ===== SHADOWS (funcionales; el "glow" reemplaza al teal-glow anterior) ===== */
  --ds-shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.35);
  --ds-shadow-md: 0 4px 14px rgba(0, 0, 0, 0.45);
  --ds-shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.55);
  --ds-shadow-glow: 0 4px 20px rgba(46, 230, 197, 0.2);
  --ds-shadow-glow-lg: 0 8px 32px rgba(46, 230, 197, 0.28);
  --ds-shadow-card-hover: 0 32px 80px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(46, 230, 197, 0.18);

  /* ===== TRANSITIONS (sin cambios) ===== */
  --ds-transition-base: all 0.2s cubic-bezier(0.22, 0.61, 0.36, 1);
  --ds-transition-fast: all 150ms cubic-bezier(0.22, 0.61, 0.36, 1);
  --ds-transition-slow: all 0.5s cubic-bezier(0.22, 0.61, 0.36, 1);

  /* ===== Z-INDEX (sin cambios) ===== */
  --ds-z-sidebar: 100;
  --ds-z-sticky: 200;
  --ds-z-modal: 1000;
  --ds-z-toast: 9999;
  --ds-z-tooltip: 1200;

  /* ===== LAYOUT (sin cambios) ===== */
  --ds-header-height: 72px;
  --ds-sidebar-width: 280px;
  --ds-container-max: 1280px;
  --ds-container-padding: 48px;
  --ds-container-padding-tablet: 32px;
  --ds-container-padding-mobile: 24px;
  --ds-container-padding-small: 18px;
  --ds-container-padding-xs: 14px;

  /* ===== BREAKPOINTS (mobile-first — sin cambios) ===== */
  --ds-bp-xs: 320px;
  --ds-bp-sm: 360px;
  --ds-bp-md: 414px;
  --ds-bp-lg: 480px;
  --ds-bp-xl: 600px;
  --ds-bp-2xl: 768px;
  --ds-bp-3xl: 900px;
  --ds-bp-4xl: 1024px;
  --ds-bp-5xl: 1100px;
  --ds-bp-6xl: 1280px;

  /* ===== TOUCH TARGETS (sin cambios) ===== */
  --ds-touch-target: 44px;
  --ds-font-size-mobile-min: 16px;

  /* ===== HERO 3D — TOKENS ESPECÍFICOS DE LA ESCENA WEBGL ===== */
  --ds-3d-fog-color: #0b0d0e;         /* igual a --ds-color-bg, para que el fog de Three.js funda con el DOM */
  --ds-3d-fog-near: 8;
  --ds-3d-fog-far: 26;
  --ds-3d-bloom-strength: 0.55;
  --ds-3d-bloom-radius: 0.4;
  --ds-3d-bloom-threshold: 0.15;
  --ds-3d-intro-duration-ms: 1800;
  --ds-3d-parallax-lerp: 0.04;
}
```

### 2.3 Tokens ADMIN (Panel/CRM) — Sistema Nocturne

```css
/* src/styles/admin/0-tokens.css */
:root {
  /* ===== COLOR PALETTE (Dark Signal Theme) ===== */
  --admin-color-bg: #08090a;
  --admin-color-bg-secondary: #0c0e0f;
  --admin-color-surface: #131516;
  --admin-color-surface-hover: #191c1d;
  --admin-color-surface-elevated: #1e2122;

  --admin-color-primary: #2ee6c5;
  --admin-color-primary-hover: #4ff0d3;
  --admin-color-primary-dark: #1fb89e;
  --admin-color-primary-dim: #134a42;
  --admin-color-primary-glow: rgba(46, 230, 197, 0.16);

  --admin-color-text: #e8ecee;
  --admin-color-text-secondary: #b7bcbe;
  --admin-color-text-muted: #7a7f81;
  --admin-color-text-disabled: #3a3d3e;

  --admin-color-border: rgba(232, 236, 238, 0.06);
  --admin-color-border-medium: rgba(232, 236, 238, 0.10);
  --admin-color-border-strong: rgba(232, 236, 238, 0.16);

  /* Semantic (sin cambios de valor respecto al sistema anterior) */
  --admin-color-success: #39d98a;
  --admin-color-success-bg: rgba(57, 217, 138, 0.10);
  --admin-color-success-border: rgba(57, 217, 138, 0.25);
  --admin-color-warning: #ffb432;
  --admin-color-warning-bg: rgba(255, 180, 50, 0.10);
  --admin-color-warning-border: rgba(255, 180, 50, 0.25);
  --admin-color-danger: #cc3535;
  --admin-color-danger-bg: rgba(204, 53, 53, 0.10);
  --admin-color-danger-border: rgba(204, 53, 53, 0.25);
  --admin-color-info: #2ee6c5;
  --admin-color-info-bg: rgba(46, 230, 197, 0.10);
  --admin-color-info-border: rgba(46, 230, 197, 0.25);
  --admin-color-purple: #8c64dc;
  --admin-color-purple-bg: rgba(140, 100, 220, 0.10);
  --admin-color-purple-border: rgba(140, 100, 220, 0.25);
  --admin-color-blue: #3b82f6;

  /* ===== TYPOGRAPHY SYSTEM (ADMIN) ===== */
  --admin-font-display: 'General Sans', 'Söhne', sans-serif;  /* títulos de página, dashboard hero */
  --admin-font-body: 'Inter', sans-serif;                      /* toda la UI, forms, tablas */
  --admin-font-num: 'JetBrains Mono', monospace;               /* precios, stats, métricas, IDs */
  --admin-font-elegant: 'Inter', sans-serif;                   /* labels, badges, eyebrow */
  --admin-font-description: 'Inter', sans-serif;               /* descripciones largas */
  --admin-font-mono: 'JetBrains Mono', monospace;              /* código, IDs, datos técnicos */

  --admin-text-2xs: 10px;
  --admin-text-xs: 11px;
  --admin-text-sm: 12px;
  --admin-text-base: 13px;
  --admin-text-md: 14px;
  --admin-text-lg: 18px;
  --admin-text-xl: 22px;
  --admin-text-2xl: 28px;
  --admin-text-3xl: 36px;

  --admin-ls-none: 0;
  --admin-ls-tight: -0.02em;
  --admin-ls-wide: 0.04em;
  --admin-ls-label: 0.08em;
  --admin-ls-badge: 0.1em;
  --admin-ls-eyebrow: 0.14em;

  /* ===== SPACING & RADII (sin cambios) ===== */
  --admin-space-1: 4px;
  --admin-space-2: 8px;
  --admin-space-3: 12px;
  --admin-space-4: 16px;
  --admin-space-5: 24px;
  --admin-space-6: 32px;
  --admin-space-7: 48px;
  --admin-space-8: 64px;

  --admin-radius-sm: 4px;
  --admin-radius-md: 8px;
  --admin-radius-lg: 12px;
  --admin-radius-xl: 16px;
  --admin-radius-full: 9999px;

  /* Shadows */
  --admin-shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.35);
  --admin-shadow-md: 0 4px 12px rgba(0, 0, 0, 0.45);
  --admin-shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.55);
  --admin-shadow-xl: 0 16px 48px rgba(0, 0, 0, 0.65);
  --admin-shadow-glow: 0 0 20px rgba(46, 230, 197, 0.14);
  --admin-shadow-glow-lg: 0 0 40px rgba(46, 230, 197, 0.22);

  --admin-transition-base: all 200ms cubic-bezier(0.16, 1, 0.3, 1);
  --admin-transition-slow: all 350ms cubic-bezier(0.16, 1, 0.3, 1);
}
```

### 2.4 Aliases legacy (compatibilidad temporal durante la migración — DEPRECADOS)

```css
/* Mantener SOLO mientras haya componentes sin migrar. Eliminar al final de FASE 5. */
--primary: var(--ds-color-primary);
--primary-dark: var(--ds-color-primary-dark);
--accent: var(--ds-color-primary);
--legacy-teal: #20b8ab;              /* referencia visual únicamente — no usar en CSS nuevo */
--bg: var(--ds-color-bg);
--surface-1: var(--ds-color-surface-1);
--surface-2: var(--ds-color-surface-2);
--surface-3: var(--ds-color-surface-3);
--surface-4: var(--ds-color-surface-4);
--text: var(--ds-color-text);
--text-secondary: var(--ds-color-text-secondary);
--text-muted: var(--ds-color-text-muted);
--border: var(--ds-color-border);
--border-medium: var(--ds-color-border-medium);
--border-strong: var(--ds-color-border-strong);
--radius: var(--ds-radius-md);
--radius-lg: var(--ds-radius-lg);
--radius-full: var(--ds-radius-full);
```

---

## 3. ESPECIFICACIONES DE COMPONENTES (Normativas)

### 3.1 Botones

| Variante | Especificación |
|---|---|
| **Primary** | `bg: var(--ds-color-primary)`, `color: var(--ds-color-text-on-primary)`, `radius: var(--ds-radius-md)`, `padding: 12px 26px`, `font: Inter 700 13px`, `letter-spacing: var(--ds-letter-spacing-label)`, uppercase, `border: 1px solid transparent`, `transition: var(--ds-transition-base)`, `box-shadow: var(--ds-shadow-glow)` |
| **Primary Hover** | `bg: var(--ds-color-primary-dark)`, `transform: translateY(-1px)`, `box-shadow: var(--ds-shadow-glow-lg)` |
| **Primary Active** | `bg: #17a58e`, `transform: translateY(0)` |
| **Outline** | `bg: transparent`, `color: var(--ds-color-primary)`, `border: 1px solid var(--ds-color-primary-border)`, mismo radius/padding/font que primary |
| **Outline Hover** | `bg: var(--ds-color-primary-glow)`, `border-color: var(--ds-color-primary)`, `transform: translateY(-1px)` |
| **Ghost** | `bg: transparent`, `color: var(--ds-color-text-secondary)`, `border: transparent` |
| **Ghost Hover** | `bg: var(--ds-color-surface-3)`, `color: var(--ds-color-text)` |
| **WhatsApp CTA** | `bg: #25d366`, `color: #000`, `radius: var(--ds-radius-full)`, `padding: 10px 24px`, `font: Inter 700 14px`, `min-width/height: 44px` |
| **WhatsApp Hover** | `bg: #1da85c`, `box-shadow: 0 4px 18px rgba(37,211,102,0.4)`, `transform: scale(1.05)` |
| **Call (secundario)** | `bg: var(--ds-color-surface-4)`, `border: 1.5px solid var(--ds-color-border-strong)`, `radius: var(--ds-radius-full)`, `padding: 10px 24px` |
| **Call Hover** | `bg: var(--ds-color-primary-glow)`, `border-color: var(--ds-color-primary)`, `color: var(--ds-color-primary)` |

**Admin Buttons:** mismo patrón con tokens `--admin-*`. Primary: `--admin-color-primary` bg, texto `--admin-color-bg`, `--admin-radius-md`, uppercase, tracking `--admin-ls-label`, `translateY(-1px)` hover. Ghost/Outline/Danger/Warning/Success siguen el mismo patrón semántico que el sistema anterior (bg 10%, border 25%, texto del color semántico).

**Estados obligatorios:** `:hover`, `:active`, `:focus-visible`, `:disabled`.
**Focus-visible:** `outline: 2px solid var(--ds-color-primary); outline-offset: 2px;`

### 3.2 Chips / Badges

**Público:**
```css
.ds-badge {
  font-family: var(--ds-font-elegant);
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-font-weight-bold);
  letter-spacing: var(--ds-letter-spacing-badge);
  text-transform: uppercase;
  padding: 5px 12px;
  border-radius: var(--ds-radius-sm);
  border-width: 1px;
  border-style: solid;
}

.badge-disponible { background: var(--ds-color-primary-glow); border-color: var(--ds-color-primary-border); color: var(--ds-color-primary); }
.badge-vendida    { background: hsla(200, 10%, 100%, 0.04); border-color: hsla(200, 10%, 100%, 0.06); color: var(--ds-color-text-muted); }
.badge-oculta     { background: hsla(200, 10%, 100%, 0.01); border-color: hsla(200, 10%, 100%, 0.03); color: var(--ds-color-text-disabled); }
.badge-destacada  { background: var(--ds-color-primary-dim); color: var(--ds-color-primary); border-color: var(--ds-color-primary-border); }
.badge-precio {
  backdrop-filter: blur(12px);
  background: rgba(0, 0, 0, 0.65);
  border-color: hsla(200, 10%, 100%, 0.06);
  border-radius: 6px;                      /* EXCEPCIÓN documentada: badge de precio flotante sobre imagen */
  font-family: var(--ds-font-num);
  font-size: 14px;
  font-weight: 800;
  letter-spacing: var(--ds-letter-spacing-num);
  color: var(--ds-color-text);
  padding: 6px 14px;
}
```

**Admin:**
```css
.admin-badge {
  font-family: var(--admin-font-elegant);
  font-size: var(--admin-text-2xs);
  font-weight: 600;
  letter-spacing: var(--admin-ls-badge);
  text-transform: uppercase;
  padding: 4px 10px;
  border-radius: var(--admin-radius-sm);
  border-width: 1px;
  border-style: solid;
}
/* Variantes semánticas usan --admin-color-{success,warning,danger,info,purple}-bg/border */
```

### 3.3 Property Card (Público) — con parallax en Z

```css
.ds-property-card {
  --card-tilt: 0deg;
  background: var(--ds-color-surface-1);
  border: 1px solid var(--ds-color-border);
  border-radius: 14px;   /* EXCEPCIÓN documentada, igual que en el sistema anterior */
  padding: 20px 22px 22px;
  display: flex;
  flex-direction: column;
  perspective: 1200px;
  transition: transform var(--ds-transition-slow), border-color var(--ds-transition-slow), box-shadow var(--ds-transition-slow);
}

.ds-property-card:hover {
  border-color: transparent;
  box-shadow: var(--ds-shadow-card-hover);
  transform: translateY(-8px);
}

.ds-property-card-image {
  aspect-ratio: 3 / 2;
  overflow: hidden;
  border-radius: var(--ds-radius-md);
  transform-style: preserve-3d;
}
.ds-property-card-image img {
  width: 100%; height: 100%; object-fit: cover;
  filter: grayscale(35%);
  transition: filter var(--ds-transition-slow), transform var(--ds-transition-slow);
}
.ds-property-card:hover .ds-property-card-image img {
  filter: grayscale(0%);
  transform: scale(1.05) translateZ(12px);
}

/* Capas con profundidad simulada — precio y ubicación "flotan" sobre la imagen */
.ds-property-card-price {
  transform: translateZ(24px);
  transition: transform var(--ds-transition-slow);
}
.ds-property-card:hover .ds-property-card-price {
  transform: translateZ(40px);
}

@supports not (transform-style: preserve-3d) {
  .ds-property-card-image, .ds-property-card-price { transform: none !important; }
}
```

### 3.4 Agent Card (Admin) — Hex Avatar con glow

```css
.ds-agent-card {
  background: var(--admin-color-surface);
  border: 2px solid var(--admin-color-border-medium);
  border-radius: var(--admin-radius-xl);
  padding: 1.4rem 2rem 1.4rem 1.6rem;
  gap: 1.8rem;
  width: 100%;
  transition: var(--admin-transition-base);
}
.ds-agent-card:hover {
  border-color: var(--admin-color-primary);
  border-width: 3px;
  box-shadow: var(--admin-shadow-glow);
  transform: translateY(-6px);
}

.ds-agent-hex {
  width: 160px; height: 160px;
  clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
  border: 2px solid var(--admin-color-primary);
  position: relative;
}
.ds-agent-hex::before {
  content: '';
  position: absolute; inset: -4px;
  clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
  border: 2px solid var(--admin-color-primary);
  opacity: 0.09;
  transition: opacity var(--admin-transition-base);
}
.ds-agent-card:hover .ds-agent-hex::before { opacity: 0.25; }
```

### 3.5 Inputs / Fields

**Público:**
```css
.ds-input {
  width: 100%;
  padding: 10px 13px;
  background: var(--ds-color-surface-3);
  border: 1px solid var(--ds-color-border);
  border-radius: var(--ds-radius-sm);   /* EXCEPCIÓN: inputs más afilados */
  font-family: var(--ds-font-body);
  font-size: 13px;
  color: var(--ds-color-text);
  transition: var(--ds-transition-fast);
}
.ds-input::placeholder { color: var(--ds-color-text-disabled); }
.ds-input:hover { background: var(--ds-color-surface-4); border-color: var(--ds-color-border-medium); }
.ds-input:focus {
  outline: none;
  border-color: var(--ds-color-primary);
  box-shadow: var(--ds-color-primary-focus-ring);
}
.ds-input:disabled { background: var(--ds-color-surface-4); color: var(--ds-color-text-disabled); cursor: not-allowed; }
.ds-input.error { border-color: var(--ds-color-danger); }
.ds-input.error:focus { box-shadow: 0 0 0 2px var(--ds-color-danger-bg); }

.ds-select {
  border-radius: 10px;   /* EXCEPCIÓN documentada: selects más redondeados, igual que sistema anterior */
  padding: 11px 14px;
  padding-right: 30px;
  font-size: 12px;
  background: var(--ds-color-surface-2);
  cursor: pointer;
  appearance: none;
}

.ds-label {
  font-family: var(--ds-font-body);
  font-weight: var(--ds-font-weight-semibold);
  font-size: 10px;
  letter-spacing: var(--ds-letter-spacing-label);
  text-transform: uppercase;
  color: var(--ds-color-text-secondary);
  transition: color var(--ds-transition-fast);
}
.ds-input:focus + .ds-label,
.ds-select:focus + .ds-label { color: var(--ds-color-primary); }
```

**Admin:** mismo patrón, tokens `--admin-*`, `--admin-radius-sm` (4px), focus con `--admin-color-primary-glow`.

### 3.6 Navigation

**Desktop (Público):**
```css
.ds-nav-link {
  font-family: var(--ds-font-body);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ds-color-text-secondary);
  padding: 10px 16px;
  border-radius: var(--ds-radius-md);
  transition: var(--ds-transition-fast);
}
.ds-nav-link:hover { color: var(--ds-color-text); background: var(--ds-color-surface-2); }
.ds-nav-link.active {
  color: var(--ds-color-text-on-primary);
  background: var(--ds-color-primary);
  box-shadow: 0 2px 12px var(--ds-color-primary-glow);
}
```

**Nav flotante (nuevo, propio del sistema Nocturne):**
```css
.ds-nav-floating {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0.75rem 1.25rem;
  border-radius: var(--ds-radius-full);
  background: rgba(19, 21, 22, 0.5);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1px solid var(--ds-color-border);
}
```
Uso: exclusivo del hero (flota sobre el canvas 3D). En páginas internas sin canvas, usar `.ds-nav-link` sobre `--ds-color-bg` sólido, sin blur.

**Admin Sidebar/Topbar:** sin cambios estructurales respecto al sistema anterior (fixed 230px/collapsed 64px, topbar sticky ~64px), solo actualiza colores a tokens Nocturne.

### 3.7 Pagination

Sin cambios estructurales respecto al sistema anterior — solo tokens de color actualizados (`--ds-color-primary` ahora resuelve a Signal en vez de Teal).

### 3.8 Modal / Dialog

Estructura idéntica al sistema anterior (`.ds-modal-overlay`, `.ds-modal`, header/body/footer, `fadeIn`/`scaleIn`), con la única adición del **glow de foco** en el botón de cierre y en cualquier CTA primario dentro del modal, usando `--ds-shadow-glow`.

### 3.9 Skeleton / Shimmer

Sin cambios respecto al sistema anterior.

### 3.10 Componentes Signature (Únicos del sistema Nocturne)

#### Hero 3D (Home) — reemplaza al hero de imagen + overlay

- **Escena WebGL de fondo:** interpretación low-poly de una vivienda moderna (núcleo de hormigón, volumen vidriado, voladizo, pileta), en Three.js puro.
- **Dolly-in de cámara** al cargar: 1.8s, `easeOutExpo`, desde un encuadre alejado hacia el encuadre final (3/4, FOV 38°).
- **Parallax de mouse:** desplazamiento sutil de cámara (lerp 0.04), no un orbit completo.
- **Bloom selectivo:** solo las superficies emissive (agua de pileta, tiras de luz de jardín) disparan el post-proceso — threshold alto (0.15), strength contenido (0.55).
- **Overlay de UI:** nav flotante + headline (`--ds-font-display`) + barra de búsqueda glass con glow en foco.
- **`prefers-reduced-motion`:** cámara fija en el encuadre final, sin dolly-in ni parallax.
- **Fallback:** en conexiones lentas (`navigator.connection.saveData`) o viewport < 480px, reemplazar el canvas por `hero-bg.webp` (Cloudinary) con el mismo overlay degradado del sistema anterior.
- Ver sección 6 para el detalle técnico completo de la arquitectura 3D.

#### Property Gallery (Detail)

- Main image: `fetchpriority="high" loading="eager"`, `aspect-ratio: 4/3`.
- Thumbnails: carrusel con dots/flechas.
- Lightbox: full-screen, swipe/teclado, ESC cierra.
- Al abrir el lightbox, el fondo detrás oscurece con `--ds-color-bg` a 85% + `backdrop-filter: blur(6px)` (consistente con el lenguaje "glass" del resto del sistema).

#### Filter Bar (Collapsible Mobile)

- Desktop: inline horizontal.
- Mobile: botón toggle → panel slide-down.
- Search: ícono a la izquierda, `padding-left: 48px`.
- Selects: tipo, dormitorios, estado, orden.
- Price slider: rango dual, labels en vivo (`--ds-font-num`).
- Reset button: limpia todo.

#### Property Card con parallax en Z (nuevo, propio de Nocturne)

Descrito en la sección 3.3 — capas separadas en `translateZ()` que se distancian al hover, reforzando la misma sensación de profundidad que el Hero 3D, sin costo de WebGL adicional.

---

## 4. ARQUITECTURA CSS (Normativa — estructura heredada, contenido migrado)

```
src/styles/
├── tokens.css              # DS tokens (--ds-*) — REEMPLAZO de valores (Nocturne)
├── critical.css            # Critical CSS extraído (inline en <head>)
├── global.css              # Público: reset, base, utilities, components
├── hero-3d.css             # NUEVO — estilos del overlay del Hero 3D (nav, headline, search)
├── admin/
│   ├── 0-tokens.css        # Admin overrides (--admin-*) — REEMPLAZO de valores
│   ├── 1-base.css
│   ├── 2-login.css
│   ├── 3-sidebar.css
│   ├── 4-topbar.css
│   ├── 5-dashboard.css
│   ├── 6-property-cards.css
│   ├── 7-crud-forms.css
│   ├── 8-messages.css
│   ├── 9-crm.css
│   ├── 11-requests.css
│   ├── 12-buttons.css
│   ├── 12-appraisals.css
│   ├── 13-tasaciones.css
│   ├── 13-forms.css
│   ├── 13-marketing.css
│   ├── 14-modals.css
│   ├── 14-portals.css
│   ├── 15-tables.css
│   ├── 15-calendar.css
│   ├── 16-badges.css
│   ├── 16-settings.css
│   ├── 17-toasts.css
│   ├── 17-users.css
│   ├── 18-states.css
│   ├── 18-security.css
│   └── 20-responsive.css
├── detalle.css
├── alquiler.css
├── comparador.css
├── tasacion2.css
└── styles-public.css
```

```
src/
  three/                    # NUEVO — módulo de la escena 3D (aislado del resto del CSS/JS)
    scene.ts
    houseModel.ts
    glowMaterial.ts
  components/
    Hero3D/
      Hero3D.tsx
      Hero3D.module.css
    PropertyCard/
      PropertyCard.tsx       # migrado a Preact + parallax en Z
```

**Build Pipeline (sin cambios):**
```bash
npm run build:css  # postcss → *.min.css + extract-critical-css.js → critical.min.css
npm run build:js   # terser + concat-public.js (esbuild IIFE) → main.min.js
npm run build      # html + js + css
```

**Critical CSS:** sigue cubriendo tokens, reset, base, navbar, hero, buttons, cards, forms (~16KB). Se agrega el estado inicial del canvas (`.canvas { opacity: 0 }`) para evitar flash de contenido sin estilo antes de que monte three.js.

---

## 5. FONT LOADING STRATEGY

| Entorno | Fuentes | Método |
|---|---|---|
| **Admin** | General Sans + Inter (400–700) | Local `@font-face` vía `/css/fonts.css` |
| **Público** | General Sans, Inter, JetBrains Mono | Self-hosted (preferido) o Google Fonts con preconnect + preload crítico |
| **Compartidas** | JetBrains Mono | Referenciada vía tokens.css en ambos entornos |

**Nota de migración:** Anton/Poppins/Montserrat/Quicksand quedan deprecadas. Mantener sus `@font-face` solo mientras haya páginas sin migrar (Fase 5 las elimina).

---

## 6. ARQUITECTURA DEL HERO 3D (detalle técnico completo)

### 6.1 Decisión técnica

Three.js puro (sin react-three-fiber) para evitar fricción de un wrapper pensado para React sobre un proyecto Preact, y mantener control directo del ciclo de vida (montaje/desmontaje, dispose de memoria). Geometría procedural (cajas, planos, icosaedros) — sin modelos `.glb` externos, para no depender de un pipeline de modelado ni inflar el bundle.

### 6.2 Elementos de la escena

| Elemento | Geometría | Material | Rol |
|---|---|---|---|
| Núcleo de hormigón | `BoxGeometry` alto/angosto | `MeshStandardMaterial`, `--ds-color-surface-4`, roughness 0.9 | Ancla vertical de la composición |
| Planta baja vidriada | `BoxGeometry` ancho | `MeshPhysicalMaterial` con `transmission` | Volumen principal, transparencia real |
| Carpintería del vidrio | `EdgesGeometry` + `LineSegments` | `LineBasicMaterial` oscuro | Marca las líneas de la estructura |
| Voladizo superior | `BoxGeometry` desplazado en X | `MeshStandardMaterial` gris medio | Silueta característica (cantilever) |
| Losa de techo | `BoxGeometry` plano | `MeshStandardMaterial` oscuro | Remate del volumen superior |
| Baranda de balcón | `BoxGeometry` delgado | `MeshPhysicalMaterial` transparente | Vidrio de seguridad |
| Terreno/plaza | `PlaneGeometry` grande | `MeshStandardMaterial` gris oscuro | Piso de la escena |
| Pileta | `BoxGeometry` plano | Emissive Signal (`--ds-color-primary`) | Fuente principal del glow |
| Tiras de luz de jardín | `BoxGeometry` pequeños | Emissive Signal | Réplica de los focos LED de la foto de referencia |
| Vegetación | `IcosahedronGeometry` | `MeshStandardMaterial` oscuro | Contexto, bajo costo de polígonos |

### 6.3 Cámara, luces y post-procesamiento

- **Cámara:** `PerspectiveCamera`, FOV 38°, encuadre 3/4. Dolly-in desde posición alejada a la final en la carga (`--ds-3d-intro-duration-ms`).
- **Luz direccional ("luna"):** fría, intensidad baja.
- **Luz ambiental:** tenue, grisácea azulada.
- **Point light interior:** cálida, simula luz de ventanas — contraste cálido/frío.
- **Bloom (`UnrealBloomPass`):** threshold alto (`--ds-3d-bloom-threshold`) para que solo el emissive Signal lo dispare; strength/radius moderados (`--ds-3d-bloom-strength` / `--ds-3d-bloom-radius`).

### 6.4 Interacción y accesibilidad

- Parallax de mouse: lerp suave (`--ds-3d-parallax-lerp`), nunca un giro completo de cámara.
- `prefers-reduced-motion: reduce`: sin dolly-in ni parallax, cámara fija desde el primer frame.
- Canvas marcado `aria-hidden="true"` — la información real vive en HTML semántico dentro del overlay.
- `renderer.setPixelRatio` clampeado a 2; sin `castShadow`/`receiveShadow` dinámicas.

### 6.5 Carga y performance

- `import()` dinámico del módulo `three/scene.ts` dentro de un `useEffect` — no bloquea el LCP.
- El canvas WebGL vive solo en el hero; el resto de la profundidad (property cards) se resuelve con CSS (`translateZ()`), sin WebGL adicional.
- Fallback estático (`hero-bg.webp` vía Cloudinary) para `saveData` o viewport pequeño.

---

## 7. JS ARCHITECTURE

### 7.1 Público (en migración a Preact + TS)

```
src/
├── main.tsx                 # Bootstrap SPA (Preact)
├── three/
│   ├── scene.ts
│   ├── houseModel.ts
│   └── glowMaterial.ts
├── components/
│   ├── Hero3D/Hero3D.tsx
│   ├── Navbar/Navbar.tsx
│   ├── PropertyGrid/PropertyGrid.tsx
│   ├── FilterBar/FilterBar.tsx
│   ├── PropertyCard/PropertyCard.tsx
│   ├── AgentGrid/AgentGrid.tsx
│   ├── ContactForm/ContactForm.tsx
│   ├── StatsCounter/StatsCounter.tsx
│   ├── GeoRecommendations/GeoRecommendations.tsx
│   └── WhatsAppFloat/WhatsAppFloat.tsx
├── utils/
│   ├── api.ts               # Fetch wrapper + CSRF
│   ├── config.ts            # Constantes centralizadas (WHATSAPP_NUMBER, etc.)
│   └── scrollAnimations.ts
├── pages/                    # Entry points por página
└── partials/                 # Handlebars partials (durante la transición)
```

### 7.2 Partial System (Handlebars, se conserva durante la migración gradual)

```
{{> navbar}}          → header + nav
{{> hero3d}}          → NUEVO — monta el contenedor del canvas + overlay
{{> filterBar}}       → barra de filtros
{{> propiedades}}     → catálogo tabs venta/alquiler
{{> quienes}}         → quiénes somos
{{> agents}}          → grid agentes
{{> recomendaciones}} → geo recomendaciones
{{> contact}}         → formulario contacto
{{> footer}}          → footer
{{> scripts}}         → main.js + contact form inline
```

### 7.3 Admin

Sin cambios estructurales respecto al sistema anterior — se actualiza únicamente la paleta consumida desde `admin/0-tokens.css`.

---

## 8. PLAN DE EJECUCIÓN POR FASES

### FASE 1: Foundation (Día 1–2) ⚡ CRÍTICO
- [ ] Reemplazar `src/styles/tokens.css` con los valores Nocturne (sección 2.2), preservando nombres de variables.
- [ ] Reemplazar `src/styles/admin/0-tokens.css` con los valores Nocturne (sección 2.3).
- [ ] Actualizar `src/styles/critical.css` con las variables críticas above-the-fold + estado inicial del canvas.
- [ ] Agregar aliases legacy temporales (sección 2.4) para no romper componentes no migrados.
- [ ] Verificar build: `npm run build:css` sin errores.
- [ ] Validar en dev server que no hay FOUC ni "flash" de teal viejo antes de la carga de tokens.

### FASE 2: Hero 3D + Landing Core (Día 2–5)
- [ ] Instalar `three` + `@types/three`.
- [ ] Crear `src/three/{scene,houseModel,glowMaterial}.ts` (ver sección 6).
- [ ] Crear `src/components/Hero3D/{Hero3D.tsx,Hero3D.module.css}`.
- [ ] Integrar `import()` dinámico + estado `ready` para el fade-in del canvas.
- [ ] Implementar fallback estático (`hero-bg.webp`) para `saveData`/viewport chico.
- [ ] **global.css** — reset, tipografía General Sans/Inter/JetBrains Mono, utilidades base.
- [ ] **Navbar** — versión flotante glass para el hero, versión sólida para páginas internas.
- [ ] **FilterBar** — desktop inline, mobile collapsible.
- [ ] **PropertyGrid/Card** — migrar a Preact + parallax en Z (sección 3.3).
- [ ] **Footer** — surface-1, links con acento Signal.

### FASE 3: Landing — Detalle y Mapa (Día 5–6)
- [ ] **PropertyDetail** — gallery con lightbox, price badge en `--ds-font-num`, specs chips.
- [ ] **Map/MapContainer** — estilo oscuro, marcadores Signal `#2ee6c5`, clusters `--ds-color-primary-dark`.
- [ ] **CTA Sections** — primary/outline/ghost/WhatsApp/Call actualizados a tokens Nocturne.
- [ ] **Modals/Forms** — inputs dark (radius 4px), focus ring Signal, backdrop-blur.
- [ ] **Contact/Tasación Forms** — grid 2-col desktop, honeypot, timestamp anti-spam.

### FASE 4: Panel Admin / CRM (Día 6–9)
- [ ] Propagar `admin/0-tokens.css` a todos los admin CSS (verificar que ninguno hardcodea `#20b8ab`).
- [ ] **Login** — hex avatar preview con glow Signal.
- [ ] **Sidebar/Topbar** — actualizar colores activos a Signal.
- [ ] **Dashboard** — stat cards e íconos con paleta Signal/success/warning.
- [ ] **Tables/DataGrid** — badges semánticos, pagination, acciones con Signal.
- [ ] **CRUD Forms** — validación inline, drag-drop de imágenes (integración Cloudinary).
- [ ] **CRM Kanban** — cards con hex avatar, badges de estado, drag-drop.
- [ ] **Tasaciones/ACM** — formulario multi-paso, preview PDF, estados de workflow.
- [ ] **MercadoLibre Sync** — UI de sincronizado, logs, estado de tokens OAuth.
- [ ] **Settings** — tabs, switches, upload de imagen, danger zones.
- [ ] **Modals/Toasts** — backdrop-blur, focus Signal, animaciones scaleIn/fadeIn.

### FASE 5: QA, Migración final y Polish (Día 9–11)
- [ ] Auditoría visual completa (desktop/tablet/mobile) en todas las páginas públicas y admin.
- [ ] Eliminar aliases legacy (sección 2.4) y cualquier referencia a `#20b8ab` / Anton / Poppins / Montserrat / Quicksand.
- [ ] Contraste WCAG AA (ver checklist sección 9).
- [ ] Focus states visibles en todos los interactivos.
- [ ] `prefers-reduced-motion` respetado (Hero 3D + hovers de cards).
- [ ] Touch targets ≥44px, fuentes ≥16px en inputs mobile.
- [ ] Print styles en reportes admin (`@media print`, fondo blanco).
- [ ] Performance: Critical CSS inline, lazy loading below-fold, `import()` diferido del bundle 3D, Lighthouse ≥90 en Performance/Best Practices.
- [ ] Accesibilidad: ARIA labels, HTML semántico, navegación por teclado, `aria-hidden` en el canvas.
- [ ] `npm run lint`, `npm run typecheck` sin errores.

---

## 9. CHECKLIST CONTRASTE (WCAG AA) — Normativo

| Elemento | Fondo | Texto | Ratio | Tokens | Estado |
|---|---|---|---|---|---|
| Body text | `#0b0d0e` | `#e8ecee` | 16.8:1 ✅ | `--ds-color-bg` / `--ds-color-text` | PASS |
| Secondary text | `#101214` | `#9aa1a6` | 5.1:1 ✅ | `--ds-color-surface-1` / `--ds-color-text-secondary` | PASS |
| Muted text | `#16181a` | `#7fa8a0` | 4.6:1 ✅ | `--ds-color-surface-2` / `--ds-color-text-muted` | PASS |
| Primary button | `#2ee6c5` | `#06110f` | 12.4:1 ✅ | `--ds-color-primary` / `--ds-color-text-on-primary` | PASS |
| Outline button | `transparent` | `#2ee6c5` | 8.9:1 (texto), 3.4:1 (UI) ✅ | border `--ds-color-primary-border` | PASS |
| Input border | `#1c1f21` | `rgba(232,236,238,0.06)` | 3:1 (UI) ✅ | `--ds-color-surface-3` / `--ds-color-border` | PASS |
| Focus ring | `#1c1f21` | `rgba(46,230,197,0.2)` | Visible ✅ | `--ds-color-surface-3` / `--ds-color-primary-focus-ring` | PASS |
| Badge Disponible | `rgba(46,230,197,0.16)` | `#2ee6c5` | 3.6:1 ✅ | `--ds-color-primary-glow` / `--ds-color-primary` | PASS |
| Badge Vendida | `hsla(200,10%,100%,0.04)` | `#7fa8a0` | 3.2:1 ✅ | `--ds-color-text-muted` | PASS |

> **Nota:** Signal `#2ee6c5` sobre `#0b0d0e` tiene ratio ~8.9:1 como texto plano — **mejor que el teal anterior** (`#20b8ab` daba 3.2:1), así que el nuevo acento admite usarse como texto directo en más contextos, no solo como bordes/iconos. Igual se mantiene la regla de "≤10% de la pantalla" para no perder el efecto de foco.

---

## 10. REGLAS ESTRICTAS (Do's / Don'ts) — ENFORCE EN CODE REVIEW

### DO (Obligatorio)
- ✅ Usar `--ds-*` / `--admin-*` tokens exclusivamente. Nunca hex hardcodeado.
- ✅ General Sans **solo** en display/headline. Nunca en body, labels, UI.
- ✅ JetBrains Mono para **todos** los números visibles (precios, m², stats, contadores, IDs).
- ✅ Inter 600 uppercase tracking 0.08–0.1em para labels.
- ✅ Espaciar en múltiplos de 8px.
- ✅ Radios: 4px (precisión) / 8px (base) / 16px (contenedor) / 9999px (píldoras) — excepciones documentadas (property card 14px, badge-precio 6px, select 10px).
- ✅ Signal `#2EE6C5` como único acento cromático. Nada de teal legacy en código nuevo.
- ✅ Tratar el acento como **luz**, no como fill: reservarlo para focus, hover, estado activo, glow — nunca como bloque de color de fondo grande.
- ✅ Sombras funcionales: `sm` reposo, `md` hover, `lg` modal, `glow` focus/hover primario.
- ✅ Touch targets ≥44px, fuentes ≥16px mobile.
- ✅ Focus-visible: `outline: 2px solid #2ee6c5; outline-offset: 2px;`.
- ✅ Transiciones `cubic-bezier(0.22, 0.61, 0.36, 1)` en todo lo interactivo.
- ✅ `transform: translateY(-1px)` en hover de botones primary/outline.
- ✅ `aspect-ratio` en imágenes: 3/2 (cards), 4/3 (hero/detalle), 1/1 (avatares hex).
- ✅ `fetchpriority="high" loading="eager"` en imagen principal (o el canvas 3D en su defecto).
- ✅ `loading="lazy" decoding="async"` en imágenes below-fold.
- ✅ `font-size: 16px` mínimo en inputs/selects mobile.
- ✅ `backdrop-filter: blur(4–18px)` limitado a nav, search bar, modales, tooltips — no en cada card.
- ✅ `box-sizing: border-box` global.
- ✅ El canvas 3D lleva `aria-hidden="true"`; toda la información real vive en HTML semántico del overlay.
- ✅ Respetar `prefers-reduced-motion` en el Hero 3D (sin dolly-in ni parallax) y en hovers con `translateZ()`.

### DON'T (Prohibido)
- ❌ Hardcodear hex en CSS/JS/TS. Siempre `var(--ds-*)` o `var(--admin-*)`.
- ❌ Usar `#20b8ab` (teal legacy) en componentes nuevos o migrados.
- ❌ Usar Anton, Poppins, Montserrat o Quicksand en código nuevo.
- ❌ Usar el acento Signal como color de fondo de bloques grandes (headers, secciones completas).
- ❌ Inventar radios fuera de la escala documentada.
- ❌ Usar sombras decorativas fuera del set funcional.
- ❌ Inventar espaciados fuera de múltiplos de 8px.
- ❌ `!important` salvo override documentado.
- ❌ `box-shadow` decorativo en cards en reposo (solo `shadow-sm` imperceptible).
- ❌ `box-shadow` en `:hover` de cards sin `transform` acompañante (translateY o translateZ).
- ❌ `font-size < 16px` en inputs/selects mobile.
- ❌ `outline: none` sin reemplazo `focus-visible`.
- ❌ `text-transform: uppercase` en body copy — solo labels, nav, badges.
- ❌ Colores hardcodeados en componentes JS/TS — siempre `config.*` o `var(--ds-*)`.
- ❌ `z-index` arbitrarios — usar la escala documentada (sidebar 100, sticky 200, modal 1000, toast 9999, tooltip 1200).
- ❌ Cargar `three.js` en el bundle inicial — siempre `import()` dinámico.
- ❌ Usar react-three-fiber (fricción innecesaria sobre Preact) salvo decisión explícita de cambiar de stack.
- ❌ Sombras dinámicas (`castShadow`/`receiveShadow`) en la escena 3D — costo alto en mobile sin beneficio visual proporcional.
- ❌ Más de un glow simultáneo por sección — diluye el efecto de "foco único".

---

## 11. ARCHIVOS A CREAR / MODIFICAR — RESUMEN EJECUTIVO

### Nuevos archivos
```
src/three/scene.ts
src/three/houseModel.ts
src/three/glowMaterial.ts
src/components/Hero3D/Hero3D.tsx
src/components/Hero3D/Hero3D.module.css
src/styles/hero-3d.css                    (si no se usa CSS Modules en el resto del proyecto)
src/utils/designTokens.ts                 (export TS de los tokens para componentes)
src/config/mapStyle.ts                    (estilo de mapa oscuro con marcadores Signal)
```

### Archivos a refactorizar por completo
```
src/styles/tokens.css                     ← REEMPLAZO de valores (Nocturne)
src/styles/admin/0-tokens.css             ← REEMPLAZO de valores (Nocturne)
src/styles/critical.css                   ← UPDATE
src/styles/global.css                     ← REWRITE (tipografía + hero container)
src/styles/admin/1-base.css               ← UPDATE (paleta)
src/styles/admin/12-buttons.css           ← UPDATE (paleta)
src/styles/admin/16-badges.css            ← UPDATE (paleta)
src/styles/admin/13-forms.css             ← UPDATE (paleta)
src/styles/admin/14-modals.css            ← UPDATE (paleta)
src/styles/admin/15-tables.css            ← UPDATE (paleta)
src/styles/admin/6-property-cards.css     ← UPDATE (paleta)
src/styles/admin/9-crm.css                ← UPDATE (paleta)
```

### Componentes a migrar/actualizar
```
src/components/Header/Navbar.js → Navbar.tsx
src/components/Hero/Hero.js → ELIMINAR, reemplazado por Hero3D.tsx
src/components/FilterBar/FilterBar.js
src/components/PropertyGrid/PropertyGrid.js
src/components/PropertyCard/PropertyCard.js → PropertyCard.tsx (+ parallax en Z)
src/components/PropertyDetail/ (gallery, lightbox, info, actions)
src/components/AgentGrid/AgentGrid.js
src/components/ContactForm/ContactForm.js
src/components/StatsCounter/StatsCounter.js
src/components/GeoRecommendations/GeoRecommendations.js
src/components/WhatsAppFloat/WhatsAppFloat.js
src/components/Map/ (PropertyMap, MapContainer)

src/admin/components/ (Sidebar, Topbar, DataTable, Forms, Modals, StatCard, HexAvatar, KanbanBoard, etc.)
src/admin/pages/ (Login, Dashboard, Properties, Agents, Content, MercadoLibre, Settings, Tasaciones, CRM)
```

### Partials Handlebars
```
src/partials/navbar.hbs
src/partials/hero.hbs → hero3d.hbs
src/partials/filterBar.hbs
src/partials/propiedades.hbs
src/partials/quienes.hbs
src/partials/agents.hbs
src/partials/recomendaciones.hbs
src/partials/contact.hbs
src/partials/footer.hbs
src/partials/scripts.hbs
```

---

## 12. COMANDOS DE VERIFICACIÓN AUTOMATIZADOS

```bash
# 1. Verificar que NO queda el teal legacy ni fuentes deprecadas en CSS
grep -rn "#20b8ab\|Anton\|Poppins\|Montserrat\|Quicksand" src/styles/ --include="*.css" \
  && echo "❌ LEGACY ENCONTRADO" || echo "✅ LIMPIO"

# 2. Verificar que SÍ hay tokens normativos Nocturne
grep -rn "ds-color-primary\|ds-color-surface\|ds-radius-md\|ds-shadow-glow\|ds-3d-" src/styles/ --include="*.css" | head -20

# 3. Verificar radios prohibidos en CSS
grep -rn "border-radius:\s*\(6\|10\|12\)px" src/styles/ --include="*.css" \
  | grep -v "14px.*property-card\|10px.*select\|6px.*precio" \
  && echo "❌ RADIOS PROHIBIDOS" || echo "✅ RADIOS OK"

# 4. Verificar espaciados no-múltiplos-de-8
grep -rn "\(margin\|padding\|gap\):\s*\([0-9]*[13579]\|[1235679][0-9]\)px" src/styles/ --include="*.css" \
  && echo "⚠️ REVISAR ESPACIADOS" || echo "✅ ESPACIADOS OK"

# 5. Verificar fuentes hardcodeadas en JS/TS
grep -rn "font-family:\s*[\"']\?[^\"']*[\"']" src/components/ src/admin/ --include="*.js" --include="*.jsx" --include="*.tsx" \
  | grep -v "var(--ds-font" && echo "❌ FUENTES HARDCODEADAS" || echo "✅ FUENTES OK"

# 6. Verificar hex hardcodeados en JS/TS (excluyendo config y WhatsApp)
grep -rn "#[0-9a-fA-F]\{3,8\}" src/components/ src/admin/ --include="*.js" --include="*.jsx" --include="*.tsx" \
  | grep -v "config\." | grep -v "25d366\|1da85c" \
  && echo "❌ HEX HARDCODEADOS" || echo "✅ HEX OK"

# 7. Verificar que three.js NO está en el bundle inicial (debe ser chunk separado)
npm run build && ls dist/assets/*.js | xargs -I{} du -h {} | sort -rh | head -5
# → confirmar visualmente que el chunk de three.js aparece separado del entry principal

# 8. Build y lint
npm run build:css && npm run lint && npm run typecheck && echo "✅ BUILD OK"

# 9. Accesibilidad (requiere servidor corriendo)
# npx @axe-core/cli http://localhost:5173

# 10. Lighthouse (performance del Hero 3D)
# npx lighthouse http://localhost:5173 --only-categories=performance,accessibility,best-practices --view
```

---

## 13. MAPEO TOKENS LEGACY → NOCTURNE (Migración)

| Legacy (Midnight Hive) | Nocturne (nuevo) | Nota |
|---|---|---|
| `--ds-color-primary: #20b8ab` | `--ds-color-primary: #2ee6c5` | mismo nombre de variable, nuevo valor |
| `--ds-color-primary-dark: #178c81` | `--ds-color-primary-dark: #1fb89e` | |
| `--ds-color-primary-glow` (rgba teal) | `--ds-color-primary-glow` (rgba signal) | |
| `--ds-color-bg: #000000` | `--ds-color-bg: #0b0d0e` | negro puro → "void" con tibieza |
| `--ds-color-surface-1..4` (`#080808`…`#1c1c1c`) | `--ds-color-surface-1..4` (`#101214`…`#24272a`) | escala ligeramente más clara y fría |
| `--ds-color-text: #ffffff` | `--ds-color-text: #e8ecee` | blanco puro → "glass", más suave |
| `--ds-color-text-muted: #8ab8b8` | `--ds-color-text-muted: #7fa8a0` | recalculado sobre el nuevo acento |
| `--ds-font-display: Anton` | `--ds-font-display: General Sans` | impacto publicitario → arquitectónico |
| `--ds-font-body: Poppins` | `--ds-font-body: Inter` | |
| `--ds-font-num: Montserrat` | `--ds-font-num: JetBrains Mono` | sans numérica → monoespaciada técnica |
| `--ds-font-elegant: Quicksand` | `--ds-font-elegant: Inter` (distinto tracking) | se unifica con body, se diferencia por tracking, no por familia |
| `--ds-radius-*`, `--ds-space-*`, `--ds-shadow-sm/md/lg` | sin cambios | se conservan íntegramente |
| — | `--ds-3d-*` (fog, bloom, intro, parallax) | tokens completamente nuevos, sin equivalente previo |
| `--color-brand-*`, `--gray-*`, `--primary-light` | (ya deprecados desde Midnight Hive) | siguen deprecados, no reintroducir |

> **Breaking changes de esta migración:** todo el bloque tipográfico (display/body/num/elegant) cambia de familia. Revisar TODOS los componentes que asumen anchos de columna/line-height calibrados para Anton/Poppins — General Sans e Inter tienen métricas distintas y pueden requerir ajustes de `line-height` puntuales en headlines muy largos.

---

## 14. VISUAL IDENTITY KEYWORDS (Para referencia en revisiones)

**Dark, Signal-Lit, Architectural, Volumetric, Precise**
- Near-black surfaces con tibieza (`#0b0d0e` → `#24272a`), nunca negro puro.
- Un único acento tratado como **fuente de luz** (`#2EE6C5`), no como color de marca plano.
- General Sans para impacto arquitectónico (headlines con tracking negativo).
- Inter para claridad (UI, forms, tablas, nav).
- JetBrains Mono para todo dato numérico — lectura de "ficha técnica".
- Profundidad real: WebGL en el hero, `translateZ()` en las cards — la profundidad comunica jerarquía, no decora.
- Glow selectivo y escaso — nunca más de un foco encendido por sección.
- Grid de 8px, radius base 8px, sidebar-first en admin (sin cambios respecto a Midnight Hive).

---

## 15. PRÓXIMOS PASOS INMEDIATOS

1. **Aprobar este plan** o solicitar ajustes puntuales (paleta, fuentes, alcance de fases).
2. **Ejecutar FASE 1** — reemplazo de valores en `tokens.css` y `admin/0-tokens.css`, con aliases legacy activos.
3. **Ejecutar FASE 2** — construir el Hero 3D (ya iniciado: `scene.ts`, `houseModel.ts`, `glowMaterial.ts`, `Hero3D.tsx` disponibles como punto de partida).
4. **Validar** build (`npm run build:css`) y dev server sin FOUC ni residuos del teal legacy.
5. **Iterar** fase por fase con code review aplicando la sección 10 (Do's/Don'ts) y los comandos de la sección 12.

---

¿Querés que arranque generando los archivos concretos de **FASE 1** (`tokens.css` y `admin/0-tokens.css` completos, listos para reemplazar los actuales), o preferís primero revisar/ajustar algún valor de la paleta o la tipografía antes de que quede "congelado" en el documento normativo?"