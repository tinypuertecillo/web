-- ============================================================================
-- CERRAR EL ACCESO PÚBLICO A LA BASE (preparado 2026-10-25, NO ejecutado)
-- Ejecutar en: Editor SQL de Supabase de Tiny Puertecillo, DESPUÉS de publicar
-- el sitio con la página /marketing ya movida a /api/admin/marketing.
--
-- Qué hace: quita las políticas "Permitir todo" (que dejaban leer, cambiar y
-- borrar contactos con la llave pública) y deja TODAS las tablas de `public`
-- sin acceso para la llave pública. El servidor usa la llave de servicio, que
-- no depende de estas políticas, así que el sitio y tiny-puertecillo-app
-- siguen funcionando.
-- ============================================================================

-- 1. Quitar las políticas abiertas
DROP POLICY IF EXISTS "Permitir todo para contactos" ON public.contactos;
DROP POLICY IF EXISTS "Permitir todo para marketing" ON public.marketing;
DROP POLICY IF EXISTS "Permitir todo para trazabilidad" ON public.trazabilidad_correos;

-- 2. RLS activo y sin permisos para la llave pública en todas las tablas
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t.tablename);
  END LOOP;
END $$;

-- 3. Revisar el resultado: no debe quedar ninguna política abierta
-- SELECT tablename, policyname, roles, cmd, qual FROM pg_policies WHERE schemaname = 'public';

-- Para deshacer (solo si algo falla): volver a crear las políticas del archivo
-- supabase_marketing_setup.sql y ejecutar GRANT ALL ON public.<tabla> TO anon, authenticated;
