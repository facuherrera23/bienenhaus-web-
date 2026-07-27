# Sprint 6 Risk Mitigation Plan: Property Detail Page

## Executive Summary
**Goal:** Property Detail Page with Gallery, Map, JSON-LD, ML Sync, Contact
**Target:** 3-4 days with risk mitigation
**Strategy:** Prototype riskiest parts first, daily checkpoints, rollback plan

---

## Risk Matrix

| Risk | Probability | Impact | Severity | Mitigation |
|------|-------------|--------|----------|------------|
| **ML OAuth + Webhooks** | Alta | Crítica | 🔴 | Prototype Day 1, mock fallback |
| **Leaflet Map + Clustering** | Media | Alta | 🟠 | Prototype Day 1, fallback static map |
| **JSON-LD Validation** | Baja | Alta | 🟠 | Automated testing with Rich Results |
| **ML Webhook Reliability** | Media | Media | 🟡 | Idempotency keys, retry queue |
| **Gallery Performance** | Media | Media | 🟡 | Lazy load, WebP, lazy-srcset |
| **ML OAuth State Loss** | Media | Media | 🟡 | PKCE + sessionStorage backup |
| **SEO Meta + Canonical** | Baja | Media | 🟢 | Automated meta injection |
| **Mobile UX (Gallery/Map)** | Media | Media | 🟡 | Touch testing daily |

---

## Day-by-Day Plan with Risk Mitigation

### **DÍA 0: Setup & Risk Prototyping (2-3 horas)**
**Objective:** De-risk ML OAuth + Map antes de empezar features

#### Tareas:
1. **ML OAuth Prototype (45 min)**
   - [ ] Implementar PKCE flow completo
   - [ ] Guardar state en sessionStorage + localStorage backup
   - [ ] Test: refresh page during OAuth → no state loss
   - [ ] Mock token storage en localStorage (dev)

2. **Map Prototype (45 min)**
   - [ ] Leaflet + MarkerCluster básico
   - [ ] Custom marker venta/alquiler
   - [ ] Popup con mini-imagen + precio + link
   - [ ] Fallback: static image si Leaflet falla
   - [ ] Test: 50+ markers → performance OK

3. **JSON-LD Template (30 min)**
   - [ ] Schema.org RealEstateListing template
   - [ ] Test en Rich Results Test (Google)
   - [ ] Validar campos requeridos

4. **ML Webhook Mock (30 min)**
   - [ ] Endpoint /api/ml/webhook
   - [ ] Idempotency key header
   - [ ] Retry queue (localStorage + setTimeout)
   - [ ] Test: duplicate webhook → no duplicados

**Entregable:** Prototypes funcionando → Go/No-Go para Día 1

---

### **DÍA 1: Core Components (6-7 horas)**
**Objective:** Gallery + Property Info + JSON-LD base

#### Morning (3.5h): Gallery + Info
| Tarea | Tiempo | Riesgo | Mitigación |
|-------|--------|--------|------------|
| Gallery component (Swiper) | 1.5h | Media | Lazy load, WebP, preload 1st |
| Property info layout | 1h | Baja | Mobile-first CSS |
| Agent card + contact | 45m | Baja | Reutilizar agent card existente |
| JSON-LD injection | 30m | Media | Test Rich Results cada cambio |

#### Afternoon (3h): Map + ML Sync UI
| Tarea | Tiempo | Riesgo | Mitigación |
|-------|--------|--------|------------|
| Leaflet integration | 1.5h | Media | Reutilizar prototype Día 0 |
| Custom markers + popups | 45m | Baja | Reutilizar prototype Día 0 |
| ML Sync button + status | 45m | Alta | Mock ML status, botón disabled si no conectado |
| ML Status badge | 30m | Media | Real-time via polling (30s) |

**Checkpoint EOD:** 
- [ ] Gallery funcional con 15+ imágenes
- [ ] JSON-LD válido en Rich Results Test
- [ ] Mapa renderiza sin errores consola
- [ ] ML Sync UI mock funciona

---

### **DÍA 2: ML Integration + Webhooks (6-7 horas)**
**Objective:** OAuth real + Webhooks + Sync bidireccional

#### Morning (4h): ML OAuth Real
| Tarea | Tiempo | Riesgo | Mitigación |
|-------|--------|--------|------------|
| Edge Function: ml-oauth-callback | 1.5h | Crítica | Test exhaustivo con cuenta ML real |
| PKCE + state validation | 45m | Crítica | Unit tests para edge cases |
| Token storage seguro (HttpOnly cookie) | 45m | Crítica | No localStorage para tokens |
| Token refresh automático | 45m | Alta | Refresh 5 min antes de expiry |
| Callback cleanup (limpiar URL) | 30m | Media | history.replaceState |

#### Afternoon (3h): Webhooks + Sync
| Tarea | Tiempo | Riesgo | Mitigación |
|-------|--------|--------|------------|
| Webhook endpoint production | 1h | Crítica | Signature verification + idempotency |
| Sync property → ML (publish) | 1h | Alta | Queue + retry exponencial |
| Import ML → local | 1h | Media | Upsert por ml_item_id |

**Checkpoint EOD:**
- [ ] OAuth flow completo funciona (login → callback → tokens)
- [ ] Webhook recibe eventos ML (test con ngrok)
- [ ] Publicar propiedad → aparece en ML
- [ ] Importar de ML → crea propiedad local

---

### **DÍA 3: Polish + SEO + Testing (5-6 horas)**
**Objective:** Production-ready

#### Morning (3.5h): SEO + Performance
| Tarea | Tiempo |
|-------|--------|
| Meta tags dinámicos + Canonical | 45m |
| Open Graph + Twitter Cards | 30m |
| Sitemap.xml + robots.txt | 30m |
| Image optimization (WebP, srcset) | 45m |
| Lazy load + preload critical | 30m |
| Core Web Vitals check (Lighthouse) | 30m |

#### Afternoon (2.5h): Testing + a11y
| Tarea | Tiempo |
|-------|--------|
| a11y audit (axe + manual) | 45m |
| Cross-browser (Chrome, Firefox, Safari) | 45m |
| Mobile testing (iOS Safari + Chrome) | 30m |
| Rich Results Test (Google) | 15m |
| ML flow E2E (publish → sync → webhook) | 30m |

---

## Rollback Plan por Componente

| Componente | Trigger | Acción |
|------------|---------|--------|
| ML OAuth | Fallo login > 5% | Deshabilitar botón "Conectar ML", mostrar "Próximamente" |
| Webhooks | Error rate > 10% | Deshabilitar webhook endpoint, log local |
| Map | Leaflet error | Mostrar imagen estática + "Ver en mapa" |
| Gallery | Swiper error | Fallback a grid nativo CSS |
| JSON-LD | Validation fail | Remover JSON-LD, log error |

---

## Daily Checkpoints (15 min c/u)

| Día | Preguntas |
|-----|-----------|
| 0 | ¿Prototypes funcionan? ¿Go/No-Go? |
| 1 | ¿Gallery + Map + JSON-LD OK? ¿Blockers? |
| 2 | ¿OAuth + Webhooks fluyen? ¿E2E ML? |
| 3 | ¿Lighthouse > 90? ¿a11y pass? ¿Rich Results? |

---

## Go/No-Go Criteria por Fase

| Fase | Go Criteria | No-Go → Acción |
|------|-------------|----------------|
| Día 0 Prototypes | Todos 4 prototypes funcionan | Extender Día 0, no iniciar Día 1 |
| Día 1 Core | Gallery + Map + JSON-LD sin errores | Extender Día 1, recortar ML Sync UI |
| Día 2 ML | OAuth + Webhooks E2E funcionan | Mock ML Sync, lanzar sin ML real |
| Día 3 Polish | Lighthouse > 90, a11y pass, Rich Results | Lanzar con known issues documentados |

---

## Herramientas de Monitoreo

| Herramienta | Qué Monitorea |
|-------------|---------------|
| Sentry | Errores JS + Edge Functions |
| Lighthouse CI | Performance regression |
| Rich Results Test | JSON-LD validity |
| Sentry Cron | Webhook health check |
| Sentry Alert | ML OAuth error rate > 5% |

---

## Comandos de Emergencia

```bash
# Deshabilitar ML completamente
vercel env add ML_DISABLED true production

# Rollback deploy
vercel rollback [deployment-url]

# Deshabilitar webhook
vercel env add ML_WEBHOOK_DISABLED true production
```

---

## Checklist Final Pre-Launch

- [ ] OAuth ML funciona en staging + production
- [ ] Webhooks reciben eventos (verified con ngrok)
- [ ] JSON-LD pasa Rich Results Test
- [ ] Lighthouse Performance > 90
- [ ] a11y: axe 0 violations, manual pass
- [ ] Cross-browser: Chrome, Firefox, Safari, Edge
- [ ] Mobile: iOS Safari + Android Chrome
- [ ] ML Sync E2E: publish → webhook → local sync
- [ ] Rollback plan documentado y probado
- [ ] Monitoring alerts configurados

---

**¿Aprobado para iniciar Día 0?**