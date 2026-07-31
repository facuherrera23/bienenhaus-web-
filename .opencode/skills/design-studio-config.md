# Real Estate Design Studio — Skill Configuration

## Skills Installed & Active

| Skill | Versión | Propósito | Prioridad |
|-------|---------|-----------|-----------|
| **design** | ui-ux-pro-max | Diseño unificado: logo, CIP, slides, banners, icons, social photos | Core |
| **brand** | ui-ux-pro-max | Identidad de marca, voz, guías de estilo, consistencia | Core |
| **design-system** | ui-ux-pro-max | Token architecture 3-capas, component specs, slide system | Core |
| **ui-styling** | ui-ux-pro-max | shadcn/ui + Tailwind CSS + Canvas design system | Core |
| **emil-design-eng** | .agents/skills | Animación premium, microinteracciones, motion design | Premium |
| **frontend-design** | .agents/skills | Dirección de diseño distintiva, tipografía, layout, riesgo estético | Premium |
| **banner-design** | ui-ux-pro-max | Banners sociales, ads, web, print (22 estilos) | Soporte |
| **slides** | ui-ux-pro-max | Presentaciones HTML con Chart.js + copywriting | Soporte |
| **vercel-react-best-practices** | .agents/skills | Optimización React/Preact, performance | Performance |

## Routing Tree

```
diseño_ inmobiliario_premium
├── brand (identidad)
│   ├── voice-framework.md
│   ├── visual-identity.md
│   ├── messaging-framework.md
│   ├── color-palette-management.md
│   └── typography-specifications.md
├── design-system (token system)
│   ├── token-architecture.md (primitivo → semántico → componente)
│   ├── component-specs.md
│   ├── states-and-variants.md
│   └── tailwind-integration.md
├── design (ejecución visual)
│   ├── logo (55 estilos, Gemini AI)
│   ├── CIP (50+ deliverables)
│   ├── slides (Chart.js, copywriting)
│   ├── banner (22 estilos, 10+ plataformas)
│   ├── icon (15 estilos SVG)
│   └── social-photos (multi-plataforma)
├── ui-styling (implementación)
│   ├── shadcn-components.md
│   ├── shadcn-theming.md
│   ├── shadcn-accessibility.md
│   ├── tailwind-utilities.md
│   ├── tailwind-responsive.md
│   ├── tailwind-customization.md
│   └── canvas-design-system.md
├── emil-design-eng (animación premium)
│   ├── animation-decision-framework
│   ├── easing curves custom
│   ├── spring animations
│   ├── clip-path techniques
│   └── gesture/drag interactions
├── frontend-design (dirección creativa)
│   ├── design principles
│   ├── token system brainstorming
│   ├── self-critique workflow
│   └── copywriting for design
└── vercel-react-best-practices (performance)
    ├── bundle optimization
    ├── data fetching patterns
    └── component architecture
```

## Activation Rules

| Cuando el prompt contenga... | Activar skill(es) |
|------------------------------|-------------------|
| "logotipo", "marca", "identidad corporativa", "branding" | brand + design (logo + CIP) |
| "sistema de diseño", "design tokens", "componentes" | design-system + ui-styling |
| "animación", "microinteracción", "transición", "motion" | emil-design-eng |
| "UI", "interfaz", "componente React/Preact" | ui-styling + vercel-react-best-practices |
| "landing page", "hero", "layout" | frontend-design + emil-design-eng |
| "banner", "social media", "publicidad" | banner-design + brand |
| "presentación", "pitch deck", "slides" | slides + design-system + brand |
| "paleta de colores", "tipografía" | brand (color/typography) + design-system |
| "dashboard", "admin panel" | ui-styling + vercel-react-best-practices |
| "accesibilidad", "a11y" | ui-styling (shadcn-accessibility) + emil-design-eng |
| "inmobiliaria", "propiedades", "real estate" | TODOS (flujo completo) |
| "foto social", "instagram", "linkedin post" | design (social-photos) + brand |

## Premium Real Estate Design Flow

Cuando se solicite diseño para plataforma inmobiliaria premium, seguir este flujo:

```
1. brand → Definir identidad (voz, colores, tipografía, logo)
2. design-system → Crear tokens (3 capas) desde la identidad
3. frontend-design → Brainstorm diseño distintivo (no template)
4. emil-design-eng → Plan de animación (sutil, propósito-driven)
5. design → Generar assets (logo, CIP, banners)
6. ui-styling → Implementar con shadcn/ui + Tailwind
7. vercel-react-best-practices → Optimizar bundle y data fetching
```

## Conflict Prevention Rules

1. **Tokens first**: Siempre definir tokens antes de implementar UI. brand → design-system → ui-styling
2. **Motion con propósito**: emil-design-eng se activa DESPUÉS de tener la estructura visual (no antes)
3. **Brand consistency**: brand siempre tiene la última palabra sobre colores/tipografía. design-system mapea, no redefine.
4. **Frontend-design es dirección**: sus decisiones de layout/estética sobreescriben defaults de ui-styling
5. **Performance check**: vercel-react-best-practices se consulta al final, después de implementar UI
6. **Animación gradual**: microinteracciones van PRIMERO (emil-design-eng), animaciones decorativas van ÚLTIMAS