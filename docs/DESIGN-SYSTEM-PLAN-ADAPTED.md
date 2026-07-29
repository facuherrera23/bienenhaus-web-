# DESIGN SYSTEM PLAN - ADAPTED TO REAL STACK
## Preact + Vite + CSS Module Imports + Supabase

---

## Stack Real
- **Framework:** Preact 10 + TypeScript
- **Bundler:** Vite 8 (CSS bundled as modules, no separate build:css pipeline)
- **CSS Architecture:** `tokens.css` → `global.css` → Component CSS files (each imported by their `.ts` file)
- **Entry Points:** `src/main.ts` (landing) → imports `critical.css` + `global.css`; `src/admin/main.ts` (admin) → imports `admin.css`
- **Admin:** Single `src/styles/admin.css` (not 20 files)
- **No Handlebars, No PostCSS pipeline**

---

## CSS File Map (21 files, ~7226 lines)

### Global (imported by main.ts)
```
src/styles/tokens.css       → Token definitions (:root)     [291 lines]
src/styles/critical.css     → Critical CSS (inlined)         [205 lines]
src/styles/global.css       → Full landing styles            [717 lines]
src/styles/admin.css        → Admin panel styles             [365 lines]
```

### Component CSS (each imported by their .ts file)
```
src/components/Hero/Hero.css
src/components/Layout/Header.css
src/components/Layout/Footer.css
src/components/SearchBar/SearchBar.css
src/components/SearchBar/Autocomplete.css
src/components/PropertyGrid/PropertyGrid.css
src/components/PropertyDetail/PropertyDetail.css  ← DUPLICATES 3 files below
src/components/PropertyDetail/PropertyGallery.css
src/components/PropertyDetail/PropertyActions.css
src/components/PropertyDetail/PropertyAgent.css
src/components/PropertyDetail/PropertyInfo.css
src/components/PropertyDetail/MLSyncUI.css
src/components/Map/Map.css
src/components/Map/PropertyMap.css  ← BROKEN DUPLICATE of Map.css
src/components/SmartResults/SmartResults.css
src/components/ConversionUX/ConversionUX.css
src/components/MLAuth/MLAuth.css
```

### Known Issues
1. `PropertyDetail.css` (1042 lines) duplicates gallery/actions/agent from separate files
2. `PropertyMap.css` (1330 lines) duplicates Map.css 3x + has invalid CSS (`.` instead of `;`)
3. `global.css` duplicates Header/Footer/Hero styles from component CSS files
4. Admin currently loads fonts: Inter only → needs Anton + Poppins + Montserrat + Quicksand + JetBrains Mono

---

## Design Tokens Naming (New → Old → Usage)

### Public (--ds-*) replacing old --color-* / --gray-* / --surface-*
| New Token | Old Token | Value |
|-----------|-----------|-------|
| `--ds-color-primary` | `--color-accent` / `--color-brand-500` | `#20b8ab` (teal) |
| `--ds-color-primary-dark` | `--color-primary-dark` | `#178c81` |
| `--ds-color-primary-glow` | (new) | `rgba(32,184,171,0.15)` |
| `--ds-color-primary-border` | (new) | `rgba(32,184,171,0.25)` |
| `--ds-color-primary-focus-ring` | (new) | `0 0 0 2px rgba(32,184,171,0.18)` |
| `--ds-color-bg` | `--gray-50` / `--color-gray-50` | `#000000` |
| `--ds-color-surface-1` | `--surface-1` | `#080808` |
| `--ds-color-surface-2` | `--surface-2` | `#0d0d0d` |
| `--ds-color-surface-3` | `--surface-3` | `#141414` |
| `--ds-color-surface-4` | (new) | `#1c1c1c` |
| `--ds-color-text` | `--gray-900` / body color | `#ffffff` |
| `--ds-color-text-secondary` | `--gray-500` | `#9a9a9a` |
| `--ds-color-text-muted` | (new, teal mist) | `#8ab8b8` |
| `--ds-color-text-on-primary` | (new) | `#000000` |
| `--ds-color-border` | `--border-default` | `rgba(255,255,255,0.06)` |
| `--ds-color-border-medium` | `--border-hover` | `rgba(255,255,255,0.12)` |
| `--ds-color-border-strong` | (new) | `rgba(255,255,255,0.22)` |

### Admin (--admin-*) replacing --primary, --accent, --gray-*, --surface-*
| New Token | Old Token | Value |
|-----------|-----------|-------|
| `--admin-color-bg` | `--gray-50` | `#050505` |
| `--admin-color-surface` | `white` / `--gray-50` | `#101010` |
| `--admin-color-primary` | `--accent` | `#20b8ab` |
| `--admin-color-text` | `--gray-900` | `#ffffff` |
| `--admin-color-border` | `--gray-200` | `rgba(255,255,255,0.06)` |

### Breaking Changes
- `--radius` base: 12px → 8px (affects ALL components using `var(--radius)`)
- `--radius-xl`: 24px → 16px
- `--radius-2xl`: 32px → 16px
- `--font-sans`: Inter → Poppins
- `--font-display`: Inter → Anton
- All color backgrounds: light → dark

---

## Execution Phases

### FASE 1: Foundation (tokens + dark foundation)
**Files to modify:**
1. `src/styles/tokens.css` — Full rewrite with `--ds-*` tokens
2. `src/styles/critical.css` — Dark theme critical CSS
3. `src/styles/global.css` — Dark theme landing styles (replace light bg/colors)
4. `src/styles/admin.css` — Dark theme admin styles
5. `index.html` — Load Anton + Poppins + Montserrat + Quicksand fonts
6. `admin.html` — Load same fonts, remove Inter
7. `src/components/Hero/Hero.css` — Dark hero
8. `src/components/Layout/Header.css` — Dark glass header
9. `src/components/Layout/Footer.css` — Dark footer
10. `src/components/SearchBar/SearchBar.css` — Dark search
11. `src/components/PropertyGrid/PropertyGrid.css` — Dark cards
12. `src/components/PropertyDetail/*.css` (6 files) — Dark detail
13. `src/components/Map/Map.css` — Dark map markers
14. `src/components/Map/PropertyMap.css` — DELETE (broken duplicate)
15. `src/components/SmartResults/SmartResults.css` — Dark
16. `src/components/ConversionUX/ConversionUX.css` — Dark
17. `src/components/SearchBar/Autocomplete.css` — Dark
18. `src/components/MLAuth/MLAuth.css` — Dark

### FASE 2: Landing Core (Header glass, Hero image, PropertyGrid)
**Focus:** Hero with hero-bg.webp, header glass morphism, property cards, filter bar

### FASE 3: Detail + Map
**Focus:** Gallery, lightbox, MapTiler dark, modals, forms

### FASE 4: Admin Complete
**Focus:** Dark #050505 theme, sidebar, topbar, dashboard, tables, forms, kanban, modals

### FASE 5: QA + Polish
**Focus:** WCAG AA, responsive, reduced motion, performance

---

## Verification Commands
```bash
# Build
npm run build

# Tests
npm run test

# Lint
npm run lint

# Typecheck
npm run typecheck
```
