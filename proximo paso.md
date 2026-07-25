# Plan de Integración MercadoLibre ↔ Bienenhaus Propiedades

**Objetivo:** Sincronización bidireccional entre el catálogo de propiedades del proyecto y la cuenta de MercadoLibre (ML).
- **Pull inicial:** traer todas las publicaciones existentes en la cuenta ML y cargarlas en Supabase.
- **Push continuo:** cuando se crea una propiedad nueva en el admin panel, se publica automáticamente en ML.
- **Sync continuo (opcional pero recomendado):** mantener precio/estado/stock alineados en ambos sentidos.

---

## 0. Decisión arquitectónica previa (léela antes de implementar)

Tu proyecto actual es **estático** (Vite + Vanilla JS + GitHub Pages, sin servidor propio). La API de ML usa **OAuth2 Authorization Code Grant**, que requiere un `client_secret` — ese secret **jamás puede vivir en el frontend** (quedaría expuesto en el bundle JS que descarga cualquier visitante).

**Solución:** usar **Supabase Edge Functions** (Deno, serverless, ya integrado a tu stack) como capa backend mínima. No rompés la arquitectura estática, solo agregás funciones para:
- Intercambiar `authorization_code` por `access_token`/`refresh_token`
- Refrescar tokens vencidos
- Hacer las llamadas a la API de ML que requieren el secret
- Recibir webhooks/notificaciones de ML

Todo lo demás (UI del admin, tablas, lectura del catálogo) sigue en el frontend + Supabase client como ya lo tenés.

> Si en cambio esto corre sobre tu versión Flask (la que mencionás en otros proyectos), el backend ya existe y se salta este punto — las Edge Functions se reemplazan por endpoints Flask. Avisame cuál de los dos es si querés que ajuste el plan.

---

## 1. Fase 0 — Preparación y credenciales

- [ ] Confirmar en [ML DevCenter](https://developers.mercadolibre.com.ar) que la app tiene los scopes correctos: `read`, `write`, `offline_access` (para refresh_token)
- [ ] Guardar `client_id`, `client_secret`, `redirect_uri` como **secrets de Supabase Edge Functions** (`supabase secrets set`), nunca en `.env` del frontend ni en el repo
- [ ] Confirmar `user_id` del vendedor en ML (`GET /users/me` con el token)
- [ ] Revisar límites de rate: ML permite ~ variable por endpoint; diseñar con reintentos y backoff desde el día 1

**Tabla nueva en Supabase — `ml_credenciales`:**
```sql
CREATE TABLE ml_credenciales (
  id BIGSERIAL PRIMARY KEY,
  ml_user_id BIGINT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  scope TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- RLS: solo accesible desde Edge Functions (service_role), nunca desde el cliente
ALTER TABLE ml_credenciales ENABLE ROW LEVEL SECURITY;
-- sin políticas públicas = solo service_role bypassa RLS
```

**Tabla nueva — `ml_sync_log`** (trazabilidad, muy útil para debug):
```sql
CREATE TABLE ml_sync_log (
  id BIGSERIAL PRIMARY KEY,
  propiedad_id BIGINT REFERENCES propiedades(id) ON DELETE CASCADE,
  ml_item_id TEXT,
  accion TEXT CHECK (accion IN ('import','create','update','pause','error')),
  detalle JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Modificar tabla `propiedades`:**
```sql
ALTER TABLE propiedades ADD COLUMN ml_item_id TEXT UNIQUE;
ALTER TABLE propiedades ADD COLUMN ml_status TEXT; -- active, paused, closed, sin_publicar
ALTER TABLE propiedades ADD COLUMN ml_permalink TEXT;
ALTER TABLE propiedades ADD COLUMN ml_last_sync TIMESTAMPTZ;
```

---

## 2. Fase 1 — OAuth flow

**Edge Function `ml-oauth-callback`:**
1. Redirigir al admin a `https://auth.mercadolibre.com.ar/authorization?response_type=code&client_id=...&redirect_uri=...&state={csrf_random}`
2. Guardar el `state` en `sessionStorage` antes de redirigir, para validarlo al volver (protección CSRF — ya tenés este patrón implementado en tu integración Flask, se puede portar la lógica 1:1)
3. ML redirige a `redirect_uri?code=...&state=...`
4. La Edge Function valida `state`, intercambia `code` por tokens en `POST https://api.mercadolibre.com/oauth/token`
5. Guarda `access_token`, `refresh_token`, `expires_at` (ML da `expires_in` en segundos, normalmente 21600 = 6hs) en `ml_credenciales`

**Edge Function `ml-refresh-token`:**
- Se invoca antes de cada llamada a la API si `expires_at < now() + 5min`
- `grant_type=refresh_token` → guarda el nuevo token (ML rota el refresh_token en cada uso, hay que persistir el nuevo siempre)
- Manejar `invalid_grant` (token revocado/expirado) → marcar credenciales como inválidas y notificar al admin para re-autenticar

⚠️ **Nota de tu propia experiencia previa (proyecto Flask):** ya resolviste ahí locks de concurrencia con `hashlib.sha256` para evitar refrescar el mismo token en paralelo, manejo de `invalid_grant`, y respeto de `Retry-After`. Esa lógica es directamente portable a la Edge Function — no hace falta reinventarla, solo traducirla de Python a TypeScript/Deno.

---

## 3. Fase 2 — Importación inicial (Pull ML → Supabase)

**Edge Function `ml-import-propiedades`** (se ejecuta una vez manualmente desde un botón en el admin):

1. `GET /users/{ml_user_id}/items/search?status=active&limit=50&offset=N` (paginado)
2. Con los IDs obtenidos, `GET /items?ids=ID1,ID2,...` (multiget, hasta 20 por llamada) para traer el detalle completo
3. Mapear cada item ML → fila `propiedades` (ver mapeo de atributos en Fase 3)
4. `INSERT ... ON CONFLICT (ml_item_id) DO UPDATE` para que sea idempotente (correr el import de nuevo no duplica)
5. Traer imágenes (`pictures`) y crear filas en `imagenes` apuntando a las URLs de ML (podés migrarlas a Cloudinary después, o dejarlas server-side de ML si preferís no duplicar almacenamiento)
6. Loggear cada resultado en `ml_sync_log`

---

## 4. Fase 3 — Mapeo de categorías y atributos (la parte más delicada)

Esto es lo que en tu integración de `wacrm` ya identificaste como el punto de fricción real de la API de ML. Resumen de las trampas conocidas, para que tu asistente las tenga en cuenta desde el diseño:

- **La categoría cambia según la operación** (venta vs alquiler no comparten árbol de categorías) → necesitás resolver la categoría vía `GET /sites/MLA/domain_discovery/search?q=...` o mantener un mapeo fijo tipo→categoría, no asumir una sola categoría por tipo de propiedad
- **Atributos de superficie usan `value_struct`**, no un número plano:
  ```json
  { "id": "COVERED_AREA", "value_struct": { "number": 120, "unit": "m²" } }
  ```
- **`pictures` va como array de objetos con `source`**, no strings sueltos:
  ```json
  "pictures": [{ "source": "https://..." }]
  ```
- **`channels: ["marketplace"]` es obligatorio** en el payload de creación, si no el item puede quedar mal categorizado o rechazado
- Antes de mandar el `POST /items`, siempre correr `GET /categories/{category_id}/attributes` para saber qué atributos son `required` — varían por categoría y no son fijos

**Recomendación:** crear un módulo `ml-mapper.ts` puro (sin llamadas de red) que traduzca `Propiedad` (tu schema) ↔ `MLItem` (schema de ML) en ambas direcciones. Esto lo aísla y lo hace testeable sin pegarle a la API real.

---

## 5. Fase 4 — Publicación automática (Push Supabase → ML)

**Trigger:** cuando se crea una propiedad nueva vía admin panel con "Publicar en ML" activado.

1. Frontend inserta en `propiedades` (como ya hace hoy)
2. Frontend llama a Edge Function `ml-publicar-propiedad` pasando el `id`
3. La función:
   - Resuelve categoría según tipo+operación (Fase 3)
   - Arma el payload con `ml-mapper.ts`
   - `POST /items` con el `access_token` vigente
   - Guarda `ml_item_id`, `ml_permalink`, `ml_status='active'` en la fila de `propiedades`
   - Loggea en `ml_sync_log`
4. Si falla (atributo faltante, categoría mal resuelta, token vencido), guardar el error en `ml_sync_log` y mostrar el estado en el admin (no debe romper la creación de la propiedad en el sitio, solo la publicación en ML)

**Actualización de propiedades existentes:** mismo flujo pero `PUT /items/{ml_item_id}` en vez de `POST`.

**Baja/pausa:** al eliminar o marcar como "no disponible" en el admin → `PUT /items/{ml_item_id}` con `status: paused`.

---

## 6. Fase 5 — Sincronización continua (opcional, fase 2 del proyecto)

ML ofrece **notificaciones (webhooks)** vía `topic: items` — te avisa cuando algo cambia en la publicación (precio, estado, preguntas).

- **Edge Function `ml-webhook-receiver`**: endpoint público que ML llama con `POST { resource, user_id, topic }`. Debe responder rápido (200 en <500ms) y procesar async.
- Registrar la `notification_url` en la configuración de la app en ML DevCenter.
- Validar que las notificaciones vienen realmente de ML (verificar `user_id` esperado, considerar rate/spoofing).

Si no querés meterte con webhooks todavía, alternativa simple: **cron job** (Supabase pg_cron o Edge Function programada) que cada X horas corre un "reconciliación" — compara `ml_status`/precio local vs remoto y actualiza diferencias.

---

## 7. Fase 6 — UI en el Admin Panel

- Sección nueva **"MercadoLibre"** en el admin:
  - Botón "Conectar cuenta ML" (dispara OAuth) / estado de conexión (conectado, token vencido, etc.)
  - Botón "Importar publicaciones existentes" (dispara Fase 2, muestra progreso y resultado)
  - En el listado de propiedades: columna de estado ML (●activo/●pausado/●error/○sin publicar) + botón "Publicar en ML" / "Ver en ML" (permalink)
  - Toggle "Publicar automáticamente en ML" al crear propiedad nueva

---

## 8. Fase 7 — Testing y consideraciones finales

- ⚠️ **ML no tiene un sandbox verdadero para todos los flujos** (ya lo comprobaste en `wacrm`) — los tests de creación de items terminan pegándole a la API de producción. Usar un **usuario de test** (`POST /users/test_user`) y publicar ahí primero, nunca contra la cuenta real hasta validar el mapeo completo.
- Testear el ciclo completo: crear propiedad → publicar → editar precio en ML manualmente → verificar que la reconciliación (si implementás Fase 5) lo detecta.
- Manejar explícitamente: token vencido, categoría no resuelta, atributo requerido faltante, rate limit (429 + `Retry-After`), imagen rechazada por tamaño/formato.
- Documentar en el README el nuevo flujo de conexión ML para vos mismo a futuro.

---

## Orden de implementación sugerido (para dárselo a OpenCode en tandas)

1. Migraciones SQL (Fase 1: tablas + columnas nuevas)
2. Edge Functions de OAuth (conectar/refrescar token) + botón "Conectar" en admin
3. `ml-mapper.ts` (mapeo puro, con tests unitarios contra ejemplos reales de la API)
4. Importación inicial (Fase 2) — probar con usuario de test primero
5. Publicación automática al crear propiedad (Fase 4)
6. UI completa en admin (Fase 6)
7. (Opcional) Webhooks / reconciliación periódica (Fase 5)

Este orden te da algo funcional y demostrable en cada paso, en vez de un big-bang al final.