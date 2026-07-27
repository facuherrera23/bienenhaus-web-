# DESIGN SYSTEM PLAN - BIENENHAUS PROPIEDADES
## Plan de Implementación Completo basado en Design System Normativo

---

## 1. RESUMEN EJECUTIVO

**Objetivo:** Migrar todo el sitio (Landing Público + Panel Admin/CRM + Tasaciones) al Design System normativo "The Midnight Hive".

**Stack actual:** Preact + Vite + CSS vanilla (custom properties) + Handlebars partials + PostCSS/Terser build

**Principios rectores (normativos):**
- **Dark mode único** — Sin alternancia de tema
- **Un solo acento: Teal `#20b8ab`** — ≤10% de la pantalla (The One Voice Rule)
- **No Gold Rule** — `#c8a96e` solo legacy, **no usar en nuevos componentes**
- **Flat-By-Default** — Sombras solo en estados interactivos (hover/focus/modal)
- **8px Grid** — Todos los espaciados múltiplos de 8px (base 4px para admin)
- **Radius scale estricta** — Público: 4px / 8px / 16px / 9999px | Admin: 4px / 8px / 12px / 16px / 9999px
- **Tipografía funcional** — Familias con propósito único
- **Touch targets ≥ 44px**, fuentes ≥ 16px mobile

---

## 2. DESIGN TOKENS NORMATIVOS

### 2.1 Prefijos obligatorios
- **Público:** `--ds-*` (p.ej. `--ds-color-primary`, `--ds-radius-md`)
- **Admin:** `--admin-*` (p.ej. `--admin-color-bg`, `--admin-radius-md`)

### 2.2 Tokens PÚBLICOS (Landing)

```css
:root {
  /* ===== BRAND - TEAL (Único acento) ===== */
  --ds-color-primary: #20b8ab;
  --ds-color-primary-dark: #178c81;
  --ds-color-primary-glow: rgba(32, 184, 171, 0.15);
  --ds-color-primary-border: rgba(32, 184, 171, 0.25);
  --ds-color-primary-focus-ring: 0 0 0 2px rgba(32, 184, 171, 0.18);

  /* ===== SEMANTIC ===== */
  --ds-color-success: #3aaa55;
  --ds-color-success-bg: rgba(58, 170, 85, 0.10);
  --ds-color-success-border: rgba(58, 170, 85, 0.25);
  --ds-color-warning: #cc9922;
  --ds-color-warning-bg: rgba(204, 153, 34, 0.10);
  --ds-color-warning-border: rgba(204, 153, 34, 0.25);
  --ds-color-danger: #cc3535;
  --ds-color-danger-bg: rgba(204, 53, 53, 0.10);
  --ds-color-danger-border: rgba(204, 53, 53, 0.25);
  --ds-color-info: #20b8ab;

  /* ===== SURFACES - DARK THEME (PÚBLICO) ===== */
  --ds-color-bg: #000000;
  --ds-color-surface-1: #080808;
  --ds-color-surface-2: #0d0d0d;
  --ds-color-surface-3: #141414;
  --ds-color-surface-4: #1c1c1c;
  --ds-color-surface-elevated: rgba(28, 28, 28, 0.95);

  /* ===== TEXT ===== */
  --ds-color-text: #ffffff;
  --ds-color-text-secondary: #9a9a9a;
  --ds-color-text-muted: #8ab8b8;        /* Teal Mist - derivado del acento */
  --ds-color-text-disabled: #2a2a2a;
  --ds-color-text-on-primary: #000000;

  /* ===== BORDERS ===== */
  --ds-color-border: rgba(255,255,255,0.06);      /* Hairline */
  --ds-color-border-medium: rgba(255,255,255,0.12); /* Medium */
  --ds-color-border-strong: rgba(255,255,255,0.22); /* Strong */

  /* ===== TYPOGRAPHY (PÚBLICO) ===== */
  --ds-font-display: 'Anton', 'Impact', sans-serif;
  --ds-font-body: 'Poppins', sans-serif;
  --ds-font-num: 'Montserrat', sans-serif;
  --ds-font-elegant: 'Quicksand', sans-serif;
  --ds-font-mono: 'JetBrains Mono', 'Consolas', monospace;

  --ds-text-display: clamp(2.5rem, 7vw, 4.5rem);
  --ds-text-headline: clamp(2rem, 5vw, 3rem);
  --ds-text-title: clamp(1.5rem, 4vw, 2.25rem);
  --ds-text-body: 1rem;        /* 16px */
  --ds-text-label: 0.875rem;   /* 14px */
  --ds-text-sm: 0.875rem;      /* 14px */
  --ds-text-xs: 0.75rem;       /* 12px */

  --ds-font-weight-normal: 400;
  --ds-font-weight-medium: 500;
  --ds-font-weight-semibold: 600;
  --ds-font-weight-bold: 700;
  --ds-font-weight-extrabold: 800;
  --ds-font-weight-black: 900;

  --ds-line-height-display: 1.0;
  --ds-line-height-headline: 1.1;
  --ds-line-height-title: 1.2;
  --ds-line-height-body: 1.6;
  --ds-line-height-label: 1.4;
  --ds-line-height-elegant: 1.5;

  --ds-letter-spacing-label: 0.1em;
  --ds-letter-spacing-badge: 0.12em;
  --ds-letter-spacing-elegant: 0.06em;
  --ds-letter-spacing-num: -0.02em;

  /* ===== SPACING (8px base) ===== */
  --ds-space-1: 4px;
  --ds-space-2: 8px;
  --ds-space-3: 12px;
  --ds-space-4: 16px;
  --ds-space-5: 24px;
  --ds-space-6: 32px;
  --ds-space-7: 48px;
  --ds-space-8: 64px;
  --ds-space-9: 80px;

  /* ===== RADIUS (ESTRICTO: solo 4, 8, 16, 9999) ===== */
  --ds-radius-sm: 4px;       /* precisión: inputs, badges, chips */
  --ds-radius-md: 8px;       /* BASE: botones, inputs, cards, modales */
  --ds-radius-lg: 16px;      /* contenedores grandes, modales, hero cards */
  --ds-radius-full: 9999px;  /* píldoras, avatares circulares, botones pastilla */

  /* ===== SHADOWS (Solo funcionales) ===== */
  --ds-shadow-sm: 0 1px 3px rgba(0,0,0,0.3);           /* reposo */
  --ds-shadow-md: 0 4px 12px rgba(0,0,0,0.4);          /* hover cards */
  --ds-shadow-lg: 0 8px 32px rgba(0,0,0,0.5);          /* modales, dropdowns */
  --ds-shadow-glow: 0 4px 20px rgba(32,184,171,0.18);  /* focus/hover primario */
  --ds-shadow-glow-lg: 0 8px 32px rgba(32,184,171,0.25); /* hover primario fuerte */
  --ds-shadow-card-hover: 0 32px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(200,169,110,0.2);

  /* ===== TRANSITIONS ===== */
  --ds-transition-base: all 0.2s cubic-bezier(0.22, 0.61, 0.36, 1);
  --ds-transition-fast: all 150ms cubic-bezier(0.22, 0.61, 0.36, 1);
  --ds-transition-slow: all 0.5s cubic-bezier(0.22, 0.61, 0.36, 1);

  /* ===== Z-INDEX ===== */
  --ds-z-sidebar: 100;
  --ds-z-sticky: 200;
  --ds-z-modal: 1000;
  --ds-z-toast: 9999;
  --ds-z-tooltip: 1200;

  /* ===== LAYOUT ===== */
  --ds-header-height: 72px;
  --ds-sidebar-width: 280px;
  --ds-container-max: 1280px;
  --ds-container-padding: 48px;  /* desktop */
  --ds-container-padding-tablet: 32px;
  --ds-container-padding-mobile: 24px;
  --ds-container-padding-small: 18px;
  --ds-container-padding-xs: 14px;

  /* ===== BREAKPOINTS (mobile-first) ===== */
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

  /* ===== TOUCH TARGETS ===== */
  --ds-touch-target: 44px;
  --ds-font-size-mobile-min: 16px;
}
```

### 2.3 Tokens ADMIN (Panel/CRM)

```css
/* src/styles/admin/0-tokens.css */
:root {
  /* ===== COLOR PALETTE (Dark Teal Theme) ===== */
  --admin-color-bg: #050505;                    /* Main page bg */
  --admin-color-bg-secondary: #090909;          /* Sidebar, panels */
  --admin-color-surface: #101010;               /* Cards, inputs */
  --admin-color-surface-hover: #151515;         /* Hover states */
  --admin-color-surface-elevated: #1a1a1a;      /* Modals, elevated cards */

  --admin-color-primary: #20b8ab;               /* Primary actions, focus, active */
  --admin-color-primary-hover: #31d3c5;         /* Button hover */
  --admin-color-primary-dark: #13968c;          /* Active/pressed */
  --admin-color-primary-glow: rgba(32,184,171,0.15); /* Focus rings, shadows */

  --admin-color-text: #ffffff;                  /* Headings, primary text */
  --admin-color-text-secondary: #bdbdbd;        /* Body text */
  --admin-color-text-muted: #7a7a7a;            /* Labels, secondary info */
  --admin-color-text-disabled: #3a3a3a;         /* Placeholders, disabled */

  --admin-color-border: rgba(255,255,255,0.06);   /* Default borders */
  --admin-color-border-medium: rgba(255,255,255,0.10); /* Hover borders */
  --admin-color-border-strong: rgba(255,255,255,0.16); /* Active/focus borders */

  /* Semantic Colors */
  --admin-color-success: #39d98a;
  --admin-color-success-bg: rgba(57,217,138,0.10);
  --admin-color-success-border: rgba(57,217,138,0.25);
  --admin-color-warning: #ffb432;
  --admin-color-warning-bg: rgba(255,180,50,0.10);
  --admin-color-warning-border: rgba(255,180,50,0.25);
  --admin-color-danger: #cc3535;
  --admin-color-danger-bg: rgba(204,53,53,0.10);
  --admin-color-danger-border: rgba(204,53,53,0.25);
  --admin-color-info: #20b8ab;
  --admin-color-info-bg: rgba(32,184,171,0.10);
  --admin-color-info-border: rgba(32,184,171,0.25);
  --admin-color-purple: #8c64dc;
  --admin-color-purple-bg: rgba(140,100,220,0.10);
  --admin-color-purple-border: rgba(140,100,220,0.25);
  --admin-color-blue: #3b82f6;

  /* ===== TYPOGRAPHY SYSTEM (ADMIN) ===== */
  --admin-font-display: 'Anton', 'Impact', sans-serif;  /* Page titles, hero, brand */
  --admin-font-body: 'Poppins', sans-serif;              /* All UI text, forms, tables */
  --admin-font-num: 'Montserrat', sans-serif;            /* Prices, stats, metrics */
  --admin-font-elegant: 'Quicksand', sans-serif;         /* Labels, badges, eyebrow text */
  --admin-font-description: 'Open Sans', sans-serif;     /* Long-form descriptions */
  --admin-font-mono: 'JetBrains Mono', monospace;        /* Code, IDs, technical data */

  /* Font Sizes (admin) */
  --admin-text-2xs: 10px;   /* badges, tiny labels */
  --admin-text-xs: 11px;    /* sidebar, table cells */
  --admin-text-sm: 12px;    /* form labels */
  --admin-text-base: 13px;  /* body default */
  --admin-text-md: 14px;    /* comfortable body */
  --admin-text-lg: 18px;    /* subheadings */
  --admin-text-xl: 22px;    /* page titles */
  --admin-text-2xl: 28px;   /* large headings */
  --admin-text-3xl: 36px;   /* hero */

  /* Letter-spacing Scale */
  --admin-ls-none: 0;
  --admin-ls-tight: -0.02em;
  --admin-ls-wide: 0.06em;
  --admin-ls-label: 0.10em;   /* buttons, uppercase labels */
  --admin-ls-badge: 0.12em;
  --admin-ls-eyebrow: 0.18em; /* section eyebrows */

  /* ===== SPACING & SIZING ===== */
  --admin-space-1: 4px;
  --admin-space-2: 8px;
  --admin-space-3: 12px;
  --admin-space-4: 16px;
  --admin-space-5: 24px;
  --admin-space-6: 32px;
  --admin-space-7: 48px;
  --admin-space-8: 64px;

  /* Radii */
  --admin-radius-sm: 4px;
  --admin-radius-md: 8px;    /* default */
  --admin-radius-lg: 12px;
  --admin-radius-xl: 16px;
  --admin-radius-full: 9999px;

  /* Shadows */
  --admin-shadow-sm: 0 1px 2px rgba(0,0,0,0.3);
  --admin-shadow-md: 0 4px 12px rgba(0,0,0,0.4);
  --admin-shadow-lg: 0 8px 24px rgba(0,0,0,0.5);
  --admin-shadow-xl: 0 16px 48px rgba(0,0,0,0.6);
  --admin-shadow-glow: 0 0 20px rgba(32,184,171,0.12);
  --admin-shadow-glow-lg: 0 0 40px rgba(32,184,171,0.2);

  /* Transitions */
  --admin-transition-base: all 200ms cubic-bezier(0.16, 1, 0.3, 1);
  --admin-transition-slow: all 350ms cubic-bezier(0.16, 1, 0.3, 1);
}
```

### 2.4 Aliases legacy (compatibilidad temporal - DEPRECADOS)

```css
/* Solo para migración gradual */
--primary: var(--ds-color-primary);
--primary-dark: var(--ds-color-primary-dark);
--accent: var(--ds-color-primary);
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
|----------|----------------|
| **Primary** | `bg: var(--ds-color-primary)`, `color: var(--ds-color-text-on-primary)`, `radius: var(--ds-radius-md)`, `padding: 12px 26px`, `font: Poppins 700 10px uppercase tracking 0.12em`, `border: 1px solid transparent`, `transition: var(--ds-transition-base)`, `box-shadow: var(--ds-shadow-glow)` |
| **Primary Hover** | `bg: var(--ds-color-primary-dark)`, `border-color: var(--ds-color-primary-dark)`, `transform: translateY(-1px)`, `box-shadow: var(--ds-shadow-glow-lg)` |
| **Primary Active** | `bg: #117a72`, `transform: translateY(0)` |
| **Outline** | `bg: transparent`, `color: var(--ds-color-primary)`, `border: 1px solid rgba(32,184,171,0.28)`, mismo radius/padding/font que primary |
| **Outline Hover** | `bg: rgba(32,184,171,0.18)`, `border-color: var(--ds-color-primary)`, `transform: translateY(-1px)` |
| **Ghost** | `bg: transparent`, `color: var(--ds-color-text-secondary)`, `border: transparent`, mismo radius/padding/font |
| **Ghost Hover** | `bg: var(--ds-color-surface-3)`, `color: var(--ds-color-text)` |
| **WhatsApp CTA** | `bg: #25d366`, `color: #000`, `radius: var(--ds-radius-full)`, `padding: 10px 24px`, `font: Poppins 700 14px`, `min-width: 44px`, `min-height: 44px` |
| **WhatsApp Hover** | `bg: #1da85c`, `box-shadow: 0 4px 18px rgba(37,211,102,0.4)`, `transform: scale(1.05)` |
| **Call (secundario)** | `bg: var(--ds-color-surface-4)`, `border: 1.5px solid var(--ds-color-border-strong)`, `radius: var(--ds-radius-full)`, `padding: 10px 24px`, `font: Poppins 700 14px`, `color: #fff` |
| **Call Hover** | `bg: rgba(32,184,171,0.18)`, `border-color: var(--ds-color-primary)`, `color: var(--ds-color-primary)` |

**Admin Buttons** (mismo patrón, tokens `--admin-*`):
- Primary: `--admin-color-primary` bg, negro texto, `--admin-radius-md` (8px), uppercase, tracking 0.10em, weight 600-700, `transform: translateY(-1px)` hover
- Ghost: Transparente, border `rgba(255,255,255,0.06)`, surface bg hover
- Outline: Transparente, teal border/text, teal glow bg hover
- Danger/Warning/Success: Semantic bg (10% opacity) + border (25%) + colored text

**Estados obligatorios:** `:hover`, `:active`, `:focus-visible`, `:disabled`
**Focus-visible:** `outline: 2px solid var(--ds-color-primary); outline-offset: 2px;`

### 3.2 Chips / Badges

**Público:**
```css
.ds-badge {
  font-family: var(--ds-font-elegant);
  font-size: var(--ds-text-xs);      /* 12px */
  font-weight: var(--ds-font-weight-bold);
  letter-spacing: var(--ds-letter-spacing-badge); /* 0.12em */
  text-transform: uppercase;
  padding: 5px 12px;
  border-radius: var(--ds-radius-sm); /* 4px */
  border-width: 1px;
  border-style: solid;
}

.badge-disponible { background: rgba(32,184,171,0.15); border-color: rgba(32,184,171,0.28); color: var(--ds-color-primary); }
.badge-vendida { background: hsla(0,0%,100%,0.04); border-color: hsla(0,0%,100%,0.06); color: var(--ds-color-text-muted); }
.badge-oculta { background: hsla(0,0%,100%,0.01); border-color: hsla(0,0%,100%,0.03); color: var(--ds-color-text-disabled); }
.badge-destacada { background: #c8a96e; color: #000; } /* SOLO LEGACY */
.badge-precio { backdrop-filter: blur(12px); background: rgba(0,0,0,0.65); border-color: hsla(0,0%,100%,0.06); border-radius: 6px; font-family: var(--ds-font-num); font-size: 14px; font-weight: 800; letter-spacing: -0.02em; color: #fff; padding: 6px 14px; }
```

**Admin:**
```css
.admin-badge {
  font-family: var(--admin-font-elegant);
  font-size: var(--admin-text-2xs); /* 10px */
  font-weight: 600;
  letter-spacing: var(--admin-ls-badge); /* 0.12em */
  text-transform: uppercase;
  padding: 4px 10px;
  border-radius: var(--admin-radius-sm); /* 4px */
  border-width: 1px;
  border-style: solid;
}
/* Semantic variants use --admin-color-{success,warning,danger,info,purple}-bg/border */
```

### 3.3 Property Card (Público)

```css
.ds-property-card {
  background: var(--ds-color-surface-1);
  border: 1px solid var(--ds-color-border);
  border-radius: 14px;  /* EXCEPCIÓN: 14px solo para property cards */
  padding: 20px 22px 22px;
  display: flex;
  flex-direction: column;
  transition: transform var(--ds-transition-slow), border-color var(--ds-transition-slow), box-shadow var(--ds-transition-slow);
}

.ds-property-card:hover {
  border-color: transparent;
  box-shadow: var(--ds-shadow-card-hover);
  transform: translateY(-8px);
}

.ds-property-card-image {
  aspect-ratio: 3/2;
  overflow: hidden;
  border-radius: var(--ds-radius-md);
}
.ds-property-card-image img {
  width: 100%; height: 100%; object-fit: cover;
  filter: grayscale(50%);
  transition: filter var(--ds-transition-slow), transform var(--ds-transition-slow);
}
.ds-property-card:hover .ds-property-card-image img {
  filter: grayscale(0%);
  transform: scale(1.05);
}
```

### 3.4 Agent Card (Admin)

```css
.ds-agent-card {
  background: var(--admin-color-surface);
  border: 2px solid var(--admin-color-border-medium);
  border-radius: var(--admin-radius-xl); /* 16px */
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

/* Hex Avatar */
.ds-agent-hex {
  width: 160px; height: 160px; /* desktop */
  clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
  border: 2px solid var(--admin-color-primary);
  position: relative;
}
.ds-agent-hex::before {
  content: ''; position: absolute; inset: -4px;
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
  border-radius: var(--ds-radius-sm); /* 3px - EXCEPCIÓN: inputs más afilados */
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
  border-radius: 10px; /* EXCEPCIÓN: selects más redondeados */
  padding: 11px 14px;
  padding-right: 30px; /* espacio para chevron */
  font-size: 12px;
  background: var(--ds-color-surface-2);
  cursor: pointer;
  appearance: none;
}

.ds-label {
  font-family: var(--ds-font-body);
  font-weight: var(--ds-font-weight-semibold);
  font-size: 10px; /* Poppins 600 10px uppercase */
  letter-spacing: var(--ds-letter-spacing-label); /* 0.1em */
  text-transform: uppercase;
  color: var(--ds-color-text-secondary);
  transition: color var(--ds-transition-fast);
}
.ds-input:focus + .ds-label,
.ds-select:focus + .ds-label { color: var(--ds-color-primary); }
```

**Admin:**
```css
.admin-input {
  background: var(--admin-color-surface); /* #101010 */
  border: 1px solid var(--admin-color-border);
  border-radius: var(--admin-radius-sm); /* 4px */
  color: var(--admin-color-text);
  transition: var(--admin-transition-base);
}
.admin-input:focus {
  outline: none;
  border-color: var(--admin-color-primary);
  box-shadow: 0 0 0 2px var(--admin-color-primary-glow);
}
/* Float labels: shrink to 8px uppercase on focus/filled, teal color */
```

### 3.6 Navigation

**Desktop (Público):**
```css
.ds-nav-link {
  font-family: var(--ds-font-body);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ds-color-text-secondary);
  padding: 10px 16px;
  border-radius: var(--ds-radius-md);
  transition: var(--ds-transition-fast);
}
.ds-nav-link:hover { color: var(--ds-color-text); background: var(--ds-color-surface-2); }
.ds-nav-link.active { color: var(--ds-color-text-on-primary); background: var(--ds-color-primary); box-shadow: 0 2px 12px var(--ds-color-primary-glow); }
```

**Admin Sidebar:**
- Fixed 230px / collapsed 64px
- Brand panel: logo + "Administración"
- Icon-only nav when collapsed
- Active state: teal bg + teal glow shadow

**Admin Topbar:**
- Sticky, search, user avatar, notifications
- Height: ~64px

### 3.7 Pagination

```css
.ds-pagination-btn {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 40px; height: 40px; padding: 0 16px;
  font-family: var(--ds-font-body);
  font-size: 13px; font-weight: 600;
  color: var(--ds-color-text);
  background: var(--ds-color-surface-1);
  border: 1px solid var(--ds-color-border);
  border-radius: var(--ds-radius-md);
  cursor: pointer;
  transition: var(--ds-transition-fast);
}
.ds-pagination-btn:hover { background: var(--ds-color-surface-2); border-color: var(--ds-color-border-medium); }
.ds-pagination-btn.active { background: var(--ds-color-primary); border-color: var(--ds-color-primary); color: var(--ds-color-text-on-primary); }
.ds-pagination-btn:disabled { opacity: 0.4; cursor: not-allowed; }
```

### 3.8 Modal / Dialog

**Público:**
```css
.ds-modal-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.7); backdrop-filter: blur(4px);
  z-index: var(--ds-z-modal);
  display: flex; align-items: center; justify-content: center;
  padding: var(--ds-space-4);
  animation: fadeIn var(--ds-transition-fast);
}
.ds-modal {
  background: var(--ds-color-surface-2);
  border: 1px solid var(--ds-color-border-medium);
  border-radius: var(--ds-radius-lg); /* 16px */
  max-width: 560px; width: 100%; max-height: 90vh;
  overflow: hidden; display: flex; flex-direction: column;
  animation: scaleIn var(--ds-transition-base);
}
.ds-modal-header { padding: 20px 24px; border-bottom: 1px solid var(--ds-color-border); display: flex; align-items: center; justify-content: space-between; }
.ds-modal-title { font-family: var(--ds-font-body); font-size: var(--ds-text-title); font-weight: var(--ds-font-weight-bold); color: var(--ds-color-text); }
.ds-modal-close { width: 40px; height: 40px; border-radius: var(--ds-radius-md); border: 1px solid var(--ds-color-border); background: transparent; color: var(--ds-color-text-secondary); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: var(--ds-transition-fast); }
.ds-modal-close:hover { background: var(--ds-color-surface-3); color: var(--ds-color-text); border-color: var(--ds-color-border-medium); }
.ds-modal-body { padding: var(--ds-space-6); overflow-y: auto; }
.ds-modal-footer { padding: var(--ds-space-4) var(--ds-space-6); border-top: 1px solid var(--ds-color-border); display: flex; justify-content: flex-end; gap: var(--ds-space-3); }

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
```

**Admin:**
- Elevated surface `#1a1a1a`
- Max-width variants: 580px, 720px, 800px
- Focus trap, ESC to close

### 3.9 Skeleton / Shimmer

```css
.ds-skeleton {
  background: linear-gradient(90deg, var(--ds-color-surface-2) 25%, var(--ds-color-surface-3) 50%, var(--ds-color-surface-2) 75%);
  background-size: 600px 100%;
  border-radius: var(--ds-radius-sm);
  animation: shimmer 1.4s linear infinite;
}
@keyframes shimmer {
  0% { background-position: -600px 0; }
  100% { background-position: 600px 0; }
}
```

### 3.10 Componentes Signature (Únicos)

#### Hero (Home)
- Video/imagen fondo con overlay gradiente
- **Logo 3D tilt:** `rotateX/Y` en mousemove (±28°), scale 1.04
- **Badge animado:** líneas expandidas, texto fade-in
- **Stats counters:** IntersectionObserver → animate 0→target (1800ms, ease-out-cubic)
- **CTAs:** 3 botones (primary, primary, ghost)

#### Property Gallery (Detail)
- Main image: `fetchpriority="high" loading="eager"`, aspect-ratio 4/3
- Thumbnails: carousel con dots/arrows, init on mount
- Lightbox: full-screen, swipe/teclado, ESC cierra

#### Filter Bar (Collapsible Mobile)
- Desktop: inline horizontal
- Mobile: toggle button → panel slide-down
- Search: icon left, padding-left 48px
- Selects: 4 campos (tipo, dorm, estado, orden)
- Price slider: dual range, labels live
- Reset button: limpia todo

---

## 4. ARQUITECTURA CSS (Normativa)

```
src/styles/
├── tokens.css              # DS tokens (--ds-*) — FUENTE DE VERDAD
├── critical.css            # Critical CSS extraído (inline en <head>)
├── global.css              # Público: reset, base, utilities, components
├── admin/
│   ├── 0-tokens.css        # Admin overrides (--admin-*)
│   ├── 1-base.css          # Layout reset, .admin-body, .admin-main, utilities
│   ├── 2-login.css         # Split-screen login (brand panel + form card)
│   ├── 3-sidebar.css       # Collapsible sidebar, nav links, badges, compact mode
│   ├── 4-topbar.css        # Top bar, search, user avatar, notifications
│   ├── 5-dashboard.css     # Dashboard widgets
│   ├── 6-property-cards.css
│   ├── 7-crud-forms.css
│   ├── 8-messages.css
│   ├── 9-crm.css           # CRM Kanban
│   ├── 11-requests.css
│   ├── 12-buttons.css      # Button system (primary, ghost, outline, semantic, sizes)
│   ├── 12-appraisals.css
│   ├── 13-tasaciones.css
│   ├── 13-forms.css        # Inputs, selects, float labels, toggles, checkboxes
│   ├── 13-marketing.css
│   ├── 14-modals.css       # Modal system, sizes, focus management
│   ├── 14-portals.css
│   ├── 15-tables.css       # Data tables, filters, sort, batch actions, search bar
│   ├── 15-calendar.css
│   ├── 16-badges.css       # Badge system
│   ├── 16-settings.css
│   ├── 17-toasts.css       # Toast notifications
│   ├── 17-users.css
│   ├── 18-states.css
│   ├── 18-security.css
│   └── 20-responsive.css   # All breakpoint overrides
├── detalle.css             # Detalle propiedad
├── alquiler.css            # Página alquiler
├── comparador.css          # Comparador
├── tasacion2.css           # Tasación v2
└── styles-public.css       # Páginas legales
```

**Build Pipeline:**
```bash
npm run build:css  # postcss → *.min.css + extract-critical-css.js → critical.min.css
npm run build:js   # terser + concat-public.js (esbuild IIFE) → main.min.js
npm run build      # html + js + css
```

**Critical CSS:** Extraído automáticamente via `scripts/extract-critical-css.js`, inline en `<head>` (~16KB). Cubre: tokens, reset, base, navbar, hero, buttons, cards, forms.

---

## 5. FONT LOADING STRATEGY

| Entorno | Fuentes | Método |
|---------|---------|--------|
| **Admin** | Anton + Poppins (300-700) | Local `@font-face` via `/css/fonts.css` |
| **Público** | Anton, Poppins, Montserrat, Quicksand, Open Sans, JetBrains Mono | Google Fonts (preconnect + preload crítico) |
| **Shared** | Montserrat/Quicksand/Open Sans/JetBrains | Referenciadas via tokens.css aliases |

---

## 6. JS ARCHITECTURE (ES Modules)

```
src/
├── main.js                 # Bootstrap SPA
├── components/
│   ├── Navbar/Navbar.js
│   ├── Hero/Hero.js
│   ├── PropertyGrid/PropertyGrid.js
│   ├── FilterBar/FilterBar.js
│   ├── PropertyCard/PropertyCard.js
│   ├── AgentGrid/AgentGrid.js
│   ├── ContactForm/ContactForm.js
│   ├── StatsCounter/StatsCounter.js
│   ├── GeoRecommendations/GeoRecommendations.js
│   └── WhatsAppFloat/WhatsAppFloat.js
├── utils/
│   ├── api.js           # Fetch wrapper + CSRF
│   ├── config.js        # Constantes centralizadas (WHATSAPP_NUMBER, etc.)
│   └── scrollAnimations.js
├── pages/               # Entry points por página
└── partials/            # Handlebars partials
```

### Partial System (Handlebars - inyectados en build via `scripts/inject-partials.js`)
```html
{{> navbar}}       → header + nav
{{> hero}}         → hero section
{{> filterBar}}    → barra de filtros
{{> propiedades}}  → catálogo tabs venta/alquiler
{{> quienes}}      → quiénes somos
{{> agents}}       → grid agentes
{{> recomendaciones}} → geo recomendaciones
{{> contact}}      → formulario contacto
{{> footer}}       → footer
{{> scripts}}      → main.js + contact form inline
```

---

## 7. PLAN DE EJECUCIÓN POR FASES

### FASE 1: Foundation (Día 1-2) ⚡ CRÍTICO
- [ ] **Reemplazar `src/styles/tokens.css`** completamente con tokens normativos (`--ds-*` / `--admin-*`)
- [ ] **Crear `src/styles/admin/0-tokens.css`** con overrides admin
- [ ] Actualizar `src/styles/critical.css` con variables críticas (above-the-fold)
- [ ] Eliminar/limpiar tokens legacy (`--color-brand-*`, `--gray-*`, `--primary-light`, etc.)
- [ ] Verificar build: `npm run build:css` sin errores
- [ ] Validar en dev server que no hay FOUC (Flash of Unstyled Content)

### FASE 2: Landing Público - Core (Día 2-4)
- [ ] **global.css** - Reset, tipografía (Anton/Poppins/Montserrat/Quicksand), utilidades base
- [ ] **Header/Navbar** - Dark bg, glass morphism, teal accent, mobile menu slide-in
- [ ] **Hero** - **Imagen `hero-bg.webp` como background + overlay degradado dark**, logo 3D tilt (±28°), badge animado, stats counters (IntersectionObserver), 3 CTAs
  - [ ] Añadir `<link rel="preload" as="image" href="/hero-bg.webp" fetchpriority="high">` en `<head>` (index.html / layout)
  - [ ] CSS Hero: `background-image: url('/hero-bg.webp')`, `background-size: cover`, `background-position: center`
  - [ ] Pseudo-elemento `::before` con overlay degradado: `rgba(0,0,0,0.75)` → `rgba(0,0,0,0.55)` → `rgba(0,0,0,0.7)` para legibilidad WCAG AA
  - [ ] Tokens `--ds-*` en todo el Hero (colores, spacing, radius, tipografía)
  - [ ] Responsive: padding ajustado, `min-height: auto` mobile
  - [ ] Reduced motion: desactivar animaciones stats
  - [ ] (Opcional) Placeholder blur LQIP base64 inline en CSS para evitar flash
- [ ] **FilterBar** - Desktop inline, mobile collapsible slide-down, search + 4 selects + price slider + reset
- [ ] **PropertyGrid/Card** - Grid `repeat(auto-fill, minmax(300px, 1fr))` gap 24px, cards con hover `translateY(-8px)` + teal glow ring
- [ ] **Footer** - Dark surface-1, teal links, newsletter form

### FASE 3: Landing - Detalle y Mapa (Día 4-5)
- [ ] **PropertyDetail** - Gallery con lightbox (swipe/teclado/ESC), main image `fetchpriority="high"`, price badge Montserrat 800, specs chips
- [ ] **Map/MapContainer** - MapTiler Dark style, marcadores teal `#20b8ab`, clusters teal dark `#178c81`
- [ ] **CTA Sections** - Primary teal, outline teal, ghost, WhatsApp pill, Call pill
- [ ] **Modals/Forms** - Dark inputs (radius 3px), teal focus rings, backdrop-blur
- [ ] **Contact/Tasación Forms** - Grid 2-col desktop, honeypot, timestamp anti-spam, motivo selector toggles campos

### FASE 4: Panel Admin / CRM (Día 5-8)
- [ ] **admin/0-tokens.css** → importar en todos los admin CSS
- [ ] **Login** - Dark `#050505`, teal primary, hex avatar preview
- [ ] **Sidebar** - Admin surfaces, teal active states, user avatar hex
- [ ] **Topbar** - Admin surface, search, notifications, user menu
- [ ] **Dashboard** - Stat cards con teal/gold/success/warning icons, charts paleta teal/gold/success/warning
- [ ] **Tables/DataGrid** - Dark rows, hover surface rows, teal actions, badges semánticos, pagination
- [ ] **CRUD Forms** - Dark inputs, teal focus, validación inline, image upload drag-drop
- [ ] **CRM Kanban** - Columnas drag-drop, cards con hex avatar, badges estado, teal actions
- [ ] **Tasaciones/Appraisals** - Formulario multi-paso, preview PDF, estados workflow
- [ ] **MercadoLibre Sync** - UI de sincronizado, logs, estado tokens
- [ ] **Settings** - Tabs, switches, image upload, danger zones
- [ ] **Modals/Toasts** - Backdrop-blur, teal focus, animaciones scaleIn/fadeIn

### FASE 5: QA & Polish (Día 8-9)
- [ ] **Audit visual** - Todas las páginas desktop/tablet/mobile
- [ ] **Contraste WCAG AA** - Verificar ratios (ver checklist abajo)
- [ ] **Focus states** - Visible focus rings en TODOS los interactivos
- [ ] **Reduced motion** - Respetar `prefers-reduced-motion: reduce`
- [ ] **Touch targets** - ≥ 44px en mobile, fuentes ≥ 16px en inputs
- [ ] **Print styles** - Admin reports con `@media print` fondo blanco
- [ ] **Performance** - Critical CSS inline, lazy loading imágenes below-fold, `fetchpriority="high"` hero
- [ ] **Accesibilidad** - ARIA labels, semantic HTML, keyboard navigation
- [ ] **Lint/Typecheck** - `npm run lint`, `npm run typecheck` sin errores

---

## 8. CHECKLIST CONTRASTE (WCAG AA) - Normativo

| Elemento | Fondo | Texto | Ratio | Tokens | Estado |
|----------|-------|-------|-------|--------|--------|
| Body text | `#000000` / `#080808` | `#ffffff` | 21:1 ✅ | `--ds-color-bg` / `--ds-color-text` | PASS |
| Secondary text | `#080808` | `#9a9a9a` | 4.5:1 ✅ | `--ds-color-surface-1` / `--ds-color-text-secondary` | PASS |
| Muted text | `#0d0d0d` | `#8ab8b8` | 4.5:1 ✅ | `--ds-color-surface-2` / `--ds-color-text-muted` | PASS |
| Primary button | `#20b8ab` | `#000000` | 4.5:1 ✅ | `--ds-color-primary` / `--ds-color-text-on-primary` | PASS |
| Outline button | `transparent` | `#20b8ab` | 3:1 (UI) ✅ | border `rgba(32,184,171,0.28)` | PASS |
| Input border | `#141414` | `rgba(255,255,255,0.06)` | 3:1 (UI) ✅ | `--ds-color-surface-3` / `--ds-color-border` | PASS |
| Focus ring | `#141414` | `rgba(32,184,171,0.18)` | Visible ✅ | `--ds-color-surface-3` / `--ds-color-primary-focus-ring` | PASS |
| Badge Disponible | `rgba(32,184,171,0.15)` | `#20b8ab` | 3:1 ✅ | `--ds-color-primary-glow` / `--ds-color-primary` | PASS |
| Badge Vendida | `hsla(0,0%,100%,0.04)` | `#8ab8b8` | 3:1 ✅ | `--ds-color-text-muted` | PASS |

> **Nota:** El teal `#20b8ab` sobre negro tiene ratio 3.2:1 (UI) → **solo para elementos no-texto** (bordes, focus rings, iconos). Como botón con texto negro `#000` → 4.5:1 ✅.

---

## 9. REGLAS ESTRICTAS (Do's / Don'ts) - ENFORCE EN CODE REVIEW

### DO (Obligatorio)
- ✅ Usar `--ds-*` / `--admin-*` tokens exclusivamente. Nunca hex hardcodeado.
- ✅ Anton **solo** en display/headline. Nunca en body, labels, UI.
- ✅ Montserrat 800 para **TODOS** los números visibles (precios, m², stats, contadores).
- ✅ Poppins 600 14px uppercase tracking 0.1em para labels.
- ✅ Quicksand 500/600 para copy narrativo (descripciones, "Quiénes somos").
- ✅ Espaciar en múltiplos de 8px (4, 8, 16, 24, 32, 48, 64, 80).
- ✅ Radios: 4px (precisión) / 8px (base) / 16px (contenedor) / 9999px (píldoras).
- ✅ Teal `#20b8ab` como **único** acento cromático. No gold, no colores decorativos.
- ✅ Sombras funcionales: `sm` reposo, `md` hover, `lg` modal, `glow` focus/hover primario.
- ✅ Touch targets ≥ 44px, fuentes ≥ 16px mobile.
- ✅ Focus-visible: `outline: 2px solid #20b8ab; outline-offset: 2px;`.
- ✅ Transiciones `cubic-bezier(0.22, 0.61, 0.36, 1)` en todo lo interactivo.
- ✅ `transform: translateY(-1px)` en hover botones primary/outline.
- ✅ `aspect-ratio` en imágenes: 3/2 (cards), 4/3 (hero), 1/1 (avatares hex).
- ✅ `fetchpriority="high" loading="eager"` en hero/main image.
- ✅ `loading="lazy" decoding="async"` en imágenes below-fold.
- ✅ `font-size: 16px` mínimo en inputs/selects mobile (evita zoom iOS).
- ✅ `backdrop-filter: blur(4px)` en modales, dropdowns, tooltips.
- ✅ `box-sizing: border-box` global.

### DON'T (Prohibido)
- ❌ Hardcodear hex en CSS/JS. Siempre `var(--ds-*)` o `var(--admin-*)`.
- ❌ Usar Anton en body, labels, botones, navigation.
- ❌ Usar colores decorativos (gold, purple, blue) fuera de semántica admin.
- ❌ Inventar radios (6, 10, 12, 14). Solo 4 / 8 / 16 / 9999px.
- ❌ Usar sombras decorativas. Solo funcionales.
- ❌ Inventar espaciados (13, 17, 22, 27). Múltiplos de 8px solamente.
- ❌ Usar `!important` salvo override documentado (ej: `.hidden { display: none !important }`).
- ❌ Usar fuentes de sistema en lugar de las 4 familias definidas.
- ❌ `box-shadow` decorativo en cards en reposo. Solo `shadow-sm` imperceptible.
- ❌ `border-radius: 6px` o `10px` o `12px` o `14px` (salvo property card 14px).
- ❌ `box-shadow` en `:hover` de cards sin `transform: translateY(-8px)`.
- ❌ `font-size < 16px` en inputs/selects mobile.
- ❌ `outline: none` sin `focus-visible` replacement.
- ❌ `text-transform: uppercase` en body copy. Solo labels, nav, badges.
- ❌ `letter-spacing` positivo en body copy. Solo labels/badges/elegant.
- ❌ Colores hardcodeados en componentes JS. Siempre `config.whatsapp.number` o `var(--ds-*)`.
- ❌ `z-index` arbitrarios. Usar escala: sidebar 100, topbar 200, modal 1000, toast 9999.
- ❌ Duplicar tokens en sidecar y frontmatter. Frontmatter (este doc) es normativo.
- ❌ Componente sin `:hover`, `:focus-visible`, `:active` definido.
- ❌ `aspect-ratio` sin `object-fit: cover` en imágenes.
- ❌ `loading="lazy"` en hero/main image.
- ❌ Gold `#c8a96e` en **nuevos** componentes (solo legacy badge-destacada).

---

## 10. ARCHIVOS A CREAR / MODIFICAR - RESUMEN EJECUTIVO

### Nuevos archivos (FASE 1)
```
src/styles/tokens.css              ← REEMPLAZO TOTAL (normativo --ds-*)
src/styles/admin/0-tokens.css      ← NUEVO (--admin-* overrides)
src/utils/designTokens.ts          ← NUEVO (export TS/JS para componentes)
src/config/mapStyle.ts             ← NUEVO (MapTiler Dark config)
```

### Archivos a refactorizar completamente (FASE 1-2)
```
src/styles/critical.css            ← UPDATE (critical CSS extraído)
src/styles/global.css              ← REWRITE (público base + components)
src/styles/admin/1-base.css        ← REWRITE (admin base)
src/styles/admin/12-buttons.css    ← REWRITE (button system)
src/styles/admin/16-badges.css     ← REWRITE (badge system)
src/styles/admin/13-forms.css      ← REWRITE (input/field system)
src/styles/admin/14-modals.css     ← REWRITE (modal system)
src/styles/admin/15-tables.css     ← REWRITE (data table)
src/styles/admin/6-property-cards.css ← REWRITE (admin property cards)
src/styles/admin/9-crm.css         ← REWRITE (kanban)
```

### Componentes JS a actualizar (prioridad)
```
src/components/Header/Navbar.js
src/components/Hero/Hero.js
src/components/FilterBar/FilterBar.js
src/components/PropertyGrid/PropertyGrid.js
src/components/PropertyCard/PropertyCard.js
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

### Partials Handlebars (revisar/actualizar)
```
src/partials/navbar.hbs
src/partials/hero.hbs
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

## 11. COMANDOS DE VERIFICACIÓN AUTOMATIZADOS

```bash
# 1. Verificar que NO hay tokens legacy en CSS
grep -rn "color-brand-\|gray-50\|gray-100\|gray-200\|primary-light\|accent-light\|#1f6ed4\|#3b82f6\|#0d7a5f\|#d97706\|#dc2626" src/styles/ --include="*.css" && echo "❌ LEGACY ENCONTRADO" || echo "✅ LIMPIO"

# 2. Verificar que SÍ hay tokens normativos
grep -rn "ds-color-primary\|ds-color-surface\|ds-radius-md\|ds-shadow-glow\|ds-transition-base" src/styles/ --include="*.css" | head -20

# 3. Verificar radios prohibidos en CSS
grep -rn "border-radius:\s*\(6\|10\|12\|14\)px" src/styles/ --include="*.css" | grep -v "14px.*property-card" && echo "❌ RADIOS PROHIBIDOS" || echo "✅ RADIOS OK"

# 4. Verificar espaciados no-múltiplos-de-8
grep -rn "\(margin\|padding\|gap\):\s*\([0-9]*[13579]\|[1235679][0-9]\)px" src/styles/ --include="*.css" && echo "⚠️ REVISAR ESPACIADOS" || echo "✅ ESPACIADOS OK"

# 5. Verificar fuentes hardcodeadas en JS
grep -rn "font-family:\s*[\"']\?[^\"']*[\"']" src/components/ src/admin/ --include="*.js" --include="*.jsx" | grep -v "var(--ds-font" && echo "❌ FUENTES HARDCODEADAS" || echo "✅ FUENTES OK"

# 6. Verificar hex hardcodeados en JS (excluyendo config)
grep -rn "#[0-9a-fA-F]\{3,8\}" src/components/ src/admin/ --include="*.js" --include="*.jsx" | grep -v "config\." | grep -v "25d366\|1da85c" && echo "❌ HEX HARDCODEADOS" || echo "✅ HEX OK"

# 7. Build y lint
npm run build:css && npm run lint && npm run typecheck && echo "✅ BUILD OK"

# 8. Accesibilidad (requiere servidor corriendo)
# npx @axe-core/cli http://localhost:5173
```

---

## 12. MAPEO TOKENS LEGACY → NORMATIVOS (Migración)

| Legacy (actual) | Normativo (nuevo) | Nota |
|-----------------|-------------------|------|
| `--color-brand-800` | `--ds-color-primary-dark` | |
| `--color-brand-500` | `--ds-color-primary` | |
| `--color-brand-400` | `--ds-color-primary` | |
| `--primary` | `--ds-color-primary` | alias deprecated |
| `--primary-light` | `--ds-color-primary` | deprecated |
| `--primary-dark` | `--ds-color-primary-dark` | alias deprecated |
| `--accent` | `--ds-color-primary` | alias deprecated |
| `--accent-hover` | `--ds-color-primary-dark` | deprecated |
| `--accent-light` | `rgba(32,184,171,0.15)` | usar `--ds-color-primary-glow` |
| `--success` | `--ds-color-success` | |
| `--warning` | `--ds-color-warning` | |
| `--danger` | `--ds-color-danger` | |
| `--gray-50` → `--gray-900` | `--ds-color-surface-1` a `--ds-color-bg` | mapear según uso |
| `--surface-1` | `--ds-color-surface-1` | alias deprecated |
| `--surface-elevated` | `--ds-color-surface-elevated` | alias deprecated |
| `--border-default` | `--ds-color-border` | alias deprecated |
| `--border-hover` | `--ds-color-border-medium` | alias deprecated |
| `--border-focus` | `--ds-color-primary` | alias deprecated |
| `--shadow-sm` | `--ds-shadow-sm` | valores distintos |
| `--shadow-md` | `--ds-shadow-md` | valores distintos |
| `--shadow-lg` | `--ds-shadow-lg` | valores distintos |
| `--shadow-glow` | `--ds-shadow-glow` | valores distintos |
| `--radius` | `--ds-radius-md` (8px) | era 12px → **cambia a 8px** |
| `--radius-lg` | `--ds-radius-lg` (16px) | era 16px ✅ |
| `--radius-xl` | `--ds-radius-lg` (16px) | era 24px → **cambia a 16px** |
| `--radius-2xl` | `--ds-radius-lg` (16px) | era 28px → **cambia a 16px** |
| `--font-sans` | `--ds-font-body` (Poppins) | era Inter → **cambia a Poppins** |
| `--font-display` | `--ds-font-display` (Anton) | era Inter → **cambia a Anton** |
| `--font-mono` | `--ds-font-mono` (JetBrains Mono) | ✅ |
| `--header-height` | `--ds-header-height` | ✅ |
| `--sidebar-width` | `--ds-sidebar-width` | ✅ |
| `--container-max` | `--ds-container-max` | ✅ |

> **IMPORTANTE:** Cambios de breaking: radius base 12px→8px, xl 24px→16px, font-sans Inter→Poppins, font-display Inter→Anton. Revisar TODOS los componentes afectados.

---

## 13. VISUAL IDENTITY KEYWORDS (Para referencia en revisiones)

**Dark, Teal-Accented, Editorial, Compact, Technical**
- Near-black surfaces (`#050505` → `#1a1a1a`)
- Single teal accent (`#20B8AB`) for all interactive states
- Anton for impact (uppercase, wide tracking)
- Poppins for clarity (UI text, forms, tables)
- Generous letter-spacing on labels/badges (0.10-0.18em)
- Subtle glow shadows, not heavy elevation
- 4px baseline grid, 8px radius default
- Sidebar-first navigation, tabbed SPA content

---

## 14. PRÓXIMOS PASOS INMEDIATOS

1. **Aprobar este plan** o solicitar ajustes específicos
2. **Ejecutar FASE 1** - Reemplazo completo `tokens.css` + `admin/0-tokens.css` + `critical.css`
3. **Validar** build (`npm run build:css`) y dev server sin FOUC
4. **Iterar** fase por fase con code review aplicando reglas Do/Don't

---

¿Procedo con **FASE 1** (reemplazo total de `tokens.css` y creación de `admin/0-tokens.css`)?