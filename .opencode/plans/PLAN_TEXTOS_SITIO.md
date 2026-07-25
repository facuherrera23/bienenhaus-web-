# PLAN COMPLETO: "Textos del Sitio" 100% Funcional

## 📋 Resumen del Estado Actual

| Componente | Estado | Observaciones |
|------------|--------|---------------|
| **BD (contenido_sitio)** | ✅ Completa | 27 claves definidas en schema.sql con datos por defecto |
| **content.js (renderers)** | ✅ Completa | 27 renderers para todas las secciones |
| **admin-app.ts (load/save)** | ⚠️ Parcial | loadContent() OK, populateContentEditor() incompleto, saveAllContent() incompleto |
| **admin.html (UI)** | ⚠️ Parcial | 8 pestañas (Hero, About, Servicios, Por Qué, Equipo, Oficinas, Footer, SEO) - **Faltan FAQ y Contacto** |

---

## 🎯 Objetivo: 100% Funcional

Que **TODOS** los textos del index.html sean editables desde "Textos del Sitio" y se guarden/carguen correctamente en Supabase.

---

## 📦 Plan de Acción Detallado

### FASE 1: Admin HTML - Agregar pestañas faltantes (admin.html)

#### 1.1 Agregar pestaña **FAQ** en settings-tabs (línea ~1294)
```html
<button class="settings-tab" data-tab="faq" role="tab">FAQ</button>
```

#### 1.2 Agregar panel FAQ (panel-faq)
```html
<div class="settings-panel" id="panel-faq" role="tabpanel">
  <div class="form-group full">
    <label>Título FAQ</label>
    <input type="text" id="faqTitle" placeholder="Preguntas frecuentes">
  </div>
  <div class="form-group full">
    <label>Subtítulo FAQ</label>
    <input type="text" id="faqSubtitle" placeholder="Resolvemos las dudas más comunes">
  </div>
  <div class="form-group full">
    <label>FAQs (formato: pregunta|respuesta, uno por línea)</label>
    <textarea id="faqGrid" rows="12" placeholder="¿Cómo tasar mi propiedad?|Solicita tasación gratuita&#10;¿Cuánto tarda una venta?|Promedio 1-3 meses"></textarea>
  </div>
</div>
```

#### 1.3 Agregar pestaña **Contacto** en settings-tabs
```html
<button class="settings-tab" data-tab="contacto" role="tab">Contacto</button>
```

#### 1.4 Agregar panel Contacto (panel-contacto)
```html
<div class="settings-panel" id="panel-contacto" role="tabpanel">
  <div class="form-group full">
    <label>Título Contacto</label>
    <input type="text" id="contactoTitle" placeholder="Contacta con nosotros">
  </div>
  <div class="form-group full">
    <label>Subtítulo Contacto</label>
    <input type="text" id="contactoSubtitle" placeholder="¿Quieres vender, alquilar, comprar o tasar tu propiedad? Cuéntanos tu caso.">
  </div>
</div>
```

#### 1.5 Agregar campo footerContact faltante en panel-footer (línea ~1408)
```html
<div class="form-group full">
  <label>Info de Contacto Footer</label>
  <textarea id="footerContact" rows="3" placeholder="Dirección&#10;Teléfono&#10;Email"></textarea>
</div>
```

---

### FASE 2: Admin App TS - Completar populateContentEditor() (admin-app.ts línea ~277)

Agregar al final de la función:
```javascript
// FAQ
document.getElementById('faqTitle').value = contentCache.faq_titulo || '';
document.getElementById('faqSubtitle').value = contentCache.faq_subtitulo || '';
document.getElementById('faqGrid').value = (contentCache.faq_grid || []).map(f => `${f.pregunta}|${f.respuesta}`).join('\n');

// Contacto
document.getElementById('contactoTitle').value = contentCache.contacto_titulo || '';
document.getElementById('contactoSubtitle').value = contentCache.contacto_subtitulo || '';

// Footer Contacto
document.getElementById('footerContact').value = contentCache.footer_contacto || '';
```

---

### FASE 3: Admin App TS - Completar saveAllContent() (admin-app.ts línea ~764)

En objeto `content`, agregar:
```javascript
// FAQ
faq_titulo: document.getElementById('faqTitle').value,
faq_subtitulo: document.getElementById('faqSubtitle').value,
faq_grid: parsePipeArray(document.getElementById('faqGrid').value, ['pregunta', 'respuesta']),

// Contacto
contacto_titulo: document.getElementById('contactoTitle').value,
contacto_subtitulo: document.getElementById('contactoSubtitle').value,

// Footer Contacto
footer_contacto: document.getElementById('footerContact').value,
```

---

### FASE 4: Verificar y Corregir Campos Existentes

#### 4.1 Footer - Mapeo de IDs (populateContentEditor vs saveAllContent vs HTML real)

| BD Key | populateContentEditor | saveAllContent | HTML ID Real | Estado |
|--------|----------------------|----------------|--------------|--------|
| footer_marca | footerBrand | footerBrand | footerBrand | ✅ OK |
| footer_descripcion | footerDescription | footerDescription | footerDescription | ✅ OK |
| footer_contacto | footerContact ❌ | footerContact ❌ | **NO EXISTE** | **Crear en FASE 1.5** |
| footer_links | footerLinks | footerLinks | footerLinks | ✅ OK |
| footer_servicios | footerServices | footerServices | footerServices | ✅ OK |
| footer_copyright | footerCopyright | footerCopyright | footerCopyright | ✅ OK |

**Problema**: `footerContact` no existe en admin.html → Se soluciona en FASE 1.5

#### 4.2 SEO - Verificar campos (líneas 805-811)
- `seo_og_image` → `seoOgImage` ✅
- `seo_twitter_card` → `seoTwitterCard` ✅  
- `seo_schema` → `seoSchema` ✅

#### 4.3 Formatos de arrays (ya correctos)
- Hero badges: `.join('\n')` / `.split('\n').filter()` ✅
- Stats/Razones/Valores/Servicios: pipe-separated con parsePipeArray ✅

---

### FASE 5: Verificar loadContent() y contentCache (admin-app.ts línea ~255)

```javascript
// loadContent() YA está OK - carga todo de contenido_sitio a contentCache
// populateContentEditor() se llama al final ✅
```

---

### FASE 6: Verificar index.html tiene todos los IDs necesarios

| Clave BD | Renderer content.js | ID en index.html | Estado |
|----------|---------------------|------------------|--------|
| hero_badge | renderHeroBadge | heroBadgeTop | ✅ |
| hero_titulo | renderHeroTitulo | heroTitulo | ✅ |
| hero_subtitulo | renderHeroSubtitulo | heroSubtitulo | ✅ |
| hero_badges | renderHeroBadges | heroBadges | ✅ |
| hero_cta_primario | renderHeroCtaPrimario | heroCtaPrimario | ✅ |
| hero_cta_secundario | renderHeroCtaSecundario | heroCtaSecundario | ✅ |
| hero_stats | renderHeroStats | heroStats | ✅ |
| about_titulo | renderAboutTitulo | aboutTitulo | ✅ |
| about_descripcion | renderAboutDescripcion | aboutDescripcion | ✅ |
| about_valores | renderAboutValores | aboutValores | ✅ |
| servicios_titulo | renderServiciosTitulo | serviciosTitulo | ✅ |
| servicios_subtitulo | renderServiciosSubtitulo | serviciosSubtitulo | ✅ |
| servicios_lista | renderServiciosLista | serviciosLista | ✅ |
| por_que_titulo | renderPorQueTitulo | porQueTitulo | ✅ |
| por_que_subtitulo | renderPorQueSubtitulo | porQueSubtitulo | ✅ |
| por_que_razones | renderPorQueRazones | porQueRazones | ✅ |
| equipo_titulo | renderEquipoTitulo | equipoTitulo | ✅ |
| equipo_subtitulo | renderEquipoSubtitulo | equipoSubtitulo | ✅ |
| oficinas_titulo | renderOficinasTitulo | oficinasTitulo | ✅ |
| oficinas_subtitulo | renderOficinasSubtitulo | oficinasSubtitulo | ✅ |
| footer_marca | renderFooterMarca | footerBrand | ✅ |
| footer_descripcion | renderFooterDescripcion | footerDescripcion | ✅ |
| footer_contacto | renderFooterContacto | footerContacto | ⚠️ Falta campo admin |
| footer_links | renderFooterLinks | footerLinks | ✅ |
| footer_servicios | renderFooterServicios | footerServicios | ✅ |
| footer_copyright | renderFooterCopyright | footerCopyright | ✅ |
| faq_titulo | renderFaqTitulo | faqTitulo | ✅ |
| faq_subtitulo | renderFaqSubtitulo | faqSubtitulo | ✅ |
| faq_grid | renderFaqGrid | faqGrid | ✅ |
| contacto_titulo | renderContactoTitulo | contactoTitulo | ✅ |
| contacto_subtitulo | renderContactoSubtitulo | contactoSubtitulo | ✅ |
| seo_* | renderSeo* | meta tags | ✅ |

---

### FASE 7: Testing y Validación

#### 7.1 Checklist Manual
- [ ] Login admin → "Textos del Sitio" → Ver **10 pestañas** (Hero, About, Servicios, Por Qué, Equipo, Oficinas, Footer, SEO, FAQ, Contacto)
- [ ] Editar cada campo → "Guardar Todo" → Toast "Contenido guardado correctamente"
- [ ] Recargar admin → Verificar datos persisten
- [ ] Abrir index.html (público) → Verificar cambios reflejados
- [ ] Verificar FAQ se renderiza en #faqGrid
- [ ] Verificar Contacto se renderiza en #contactoTitulo/#contactoSubtitulo
- [ ] Verificar Footer contacto se renderiza en #footerContacto

#### 7.2 Edge Cases
- [ ] Campos vacíos (no romper guardado)
- [ ] HTML en campos (hero_titulo, about_descripcion, footer_marca)
- [ ] Arrays pipe-separados con/sin pipes
- [ ] Caracteres especiales (tildes, emojis, comillas)
- [ ] SEO schema JSON válido/inválido

---

## 📁 Archivos a Modificar

| Archivo | Cambios | Prioridad |
|---------|---------|-----------|
| `admin.html` | +2 pestañas, +2 paneles, +1 campo footerContact | **Crítica** |
| `src/admin-app.ts` | populateContentEditor() + FAQ + Contacto + footerContact | **Crítica** |
| `src/admin-app.ts` | saveAllContent() + FAQ + Contacto + footerContact | **Crítica** |

---

## ⏱️ Estimación de Esfuerzo

| Fase | Tiempo estimado |
|------|-----------------|
| FASE 1: Admin HTML (UI) | 30 min |
| FASE 2: populateContentEditor | 15 min |
| FASE 3: saveAllContent | 15 min |
| FASE 4: Correcciones campos existentes | 15 min |
| FASE 5: Campo footerContact | 5 min |
| FASE 6-7: Verificación y testing | 20 min |
| **TOTAL** | **~1.5 - 2 horas** |

---

## ✅ Criterios de Éxito (Definition of Done)

1. **UI Completa**: 10 pestañas visibles en "Textos del Sitio"
2. **Carga Inicial**: Al entrar, todos los campos muestran valores actuales de BD
3. **Guardado**: "Guardar Todo" persiste **TODOS los 27 campos** en Supabase
4. **Persistencia**: Recargar admin → datos se mantienen
5. **Frontend Sync**: index.html refleja cambios tras recargar (cargarContenidoSitio())
6. **Sin Errores**: Console limpio, toasts de éxito/error funcionan
7. **FAQ & Contacto**: Secciones renderizan correctamente en landing

---

## ⚠️ Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| RLS bloquea upsert en contenido_sitio | Media | Alto | Verificar policy "Public read contenido" + service_role en admin |
| parsePipeArray falla con formato incorrecto | Media | Medio | Validar input, try/catch, toast error amigable |
| IDs desalineados HTML ↔ TS | Baja | Alto | Verificación cruzada en FASE 4-6 |
| Schema JSON inválido en SEO | Baja | Medio | Validar JSON.parse en save, mostrar error |

---

## 🚀 Orden de Ejecución Recomendado

1. **admin.html** → Agregar FAQ tab + panel, Contacto tab + panel, footerContact field
2. **admin-app.ts** → populateContentEditor() agregar FAQ + Contacto + footerContact
3. **admin-app.ts** → saveAllContent() agregar FAQ + Contacto + footerContact
4. **Build & Test** → `npm run build` → servir → testing manual completo
5. **Fix bugs** → Iterar hasta 100% funcional