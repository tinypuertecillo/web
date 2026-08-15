-- ============================================================================
-- SCRIPT PARA CONFIGURAR WEBHOOK DE SINCRONIZACIÓN EN ECOMOVING
-- Ejecutar en: Editor SQL de la Base de Datos de Ecomoving
-- ============================================================================

-- 1. Habilitar la extensión de HTTP en Supabase (si no está habilitada)
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- 2. Crear la función del webhook para mandar las notificaciones
CREATE OR REPLACE FUNCTION public.sync_contacts_to_tiny_puertecillo()
RETURNS TRIGGER AS $$
DECLARE
    payload JSONB;
    result RECORD;
    tiny_webhook_url TEXT := 'https://REEMPLAZAR_CON_TU_URL_DE_VERCEL_O_NGROK/api/sync-contacts';
    sync_secret TEXT := 'sync_secret_token_2026';
BEGIN
    -- Construir el payload del evento
    payload := jsonb_build_object(
        'type', TG_OP,
        'table', TG_TABLE_NAME,
        'schema', TG_TABLE_SCHEMA,
        'record', CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE row_to_json(NEW)::jsonb END,
        'old_record', CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE row_to_json(OLD)::jsonb END
    );

    -- Enviar el evento por HTTP POST de forma asíncrona
    PERFORM
        extensions.http_post(
            tiny_webhook_url,
            payload::text,
            'application/json',
            -- Headers
            jsonb_build_object(
                'x-sync-secret', sync_secret
            )::text
        );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Crear el Trigger en la tabla 'contactos'
DROP TRIGGER IF EXISTS trigger_sync_contacts_to_tiny ON contactos;
CREATE TRIGGER trigger_sync_contacts_to_tiny
AFTER INSERT OR UPDATE OR DELETE ON contactos
FOR EACH ROW
EXECUTE FUNCTION public.sync_contacts_to_tiny_puertecillo();
