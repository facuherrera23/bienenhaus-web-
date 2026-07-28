# Seguridad - Guía de Rotación de Keys

## Service Role Key

La service role key está expuesta en el historial de git y en `supabase/schema.sql`.

### Pasos para rotar:

1. Ir a [Supabase Dashboard](https://supabase.com/dashboard/project/rnldqiwwzhjnurkguihu/settings/api)
2. Sección **Settings → API**
3. En **service_role key**, hacer clic en "Roll"
4. Copiar la nueva key
5. Actualizar en:
   - `supabase/schema.sql` (línea del cron job)
   - Supabase Dashboard → SQL Editor → re-ejecutar el cron job con la nueva key
6. Hacer push del cambio

### ⚠️ Importante

- La service role key **nunca** debe exponerse en el frontend
- Solo se usa en server-side (Edge Functions, cron jobs)
- El frontend usa la **anon key** (que es pública por diseño)

## Anon Key

La anon key es pública y segura para uso client-side. No necesita rotación a menos que se comprometa el RLS (Row Level Security).

### Verificar RLS

1. Ir a Supabase Dashboard → Authentication → Policies
2. Verificar que todas las tablas tengan RLS habilitado
3. Verificar que las políticas sean correctas

## Credenciales de Cloudinary

Las credenciales de Cloudinary son de uso público (upload preset). No requieren rotación.

## Credenciales de MercadoLibre

Las credenciales de ML (client_id, client_secret) se almacenan en la tabla `configuracion` de Supabase. Si se comprometen:

1. Ir a MercadoLibre → Developers → Tu app
2. Regenerar client_secret
3. Actualizar en la tabla `configuracion` vía admin panel
