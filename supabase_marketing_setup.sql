-- ============================================================================
-- SCRIPT DE CONFIGURACIÓN DE TABLAS DE MARKETING - TINY PUERTECILLO
-- ============================================================================

-- 1. Tabla de Contactos (Leads)
CREATE TABLE IF NOT EXISTS contactos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    correo TEXT NOT NULL UNIQUE,
    celular TEXT,
    estado TEXT DEFAULT 'activo',
    etapa TEXT DEFAULT 'marketing',
    ultimo_estado_brevo TEXT,
    es_bloqueado BOOLEAN DEFAULT false,
    ultimo_envio TIMESTAMPTZ,
    proximo_envio TIMESTAMPTZ,
    etapa_envio INTEGER DEFAULT 1,
    ultimo_evento_trazabilidad TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON COLUMN contactos.ultimo_estado_brevo IS 'Último estado reportado por la API de Brevo (Ej: opened, delivered)';

-- 2. Tabla de Mensajes / Biblioteca de Marketing (Etapas 1-7)
CREATE TABLE IF NOT EXISTS marketing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asunto TEXT NOT NULL,
    cuerpo_html TEXT,
    cuerpo TEXT,
    nombre_envio INTEGER NOT NULL UNIQUE, -- Representa el número de etapa (1, 2, 3...)
    nombre_imagen TEXT,
    imagen_url TEXT,
    estado TEXT DEFAULT 'activo',
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabla de Trazabilidad Histórica (Caja Negra de Envíos)
CREATE TABLE IF NOT EXISTS trazabilidad_correos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contacto_id UUID REFERENCES contactos(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    fecha DATE NOT NULL,
    estado TEXT NOT NULL,
    mensaje_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Índices de Rendimiento
CREATE UNIQUE INDEX IF NOT EXISTS idx_trazabilidad_unique_msg ON trazabilidad_correos(mensaje_id) WHERE mensaje_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_trazabilidad_fecha ON trazabilidad_correos(fecha);
CREATE INDEX IF NOT EXISTS idx_trazabilidad_email ON trazabilidad_correos(email);
CREATE INDEX IF NOT EXISTS idx_trazabilidad_contacto ON trazabilidad_correos(contacto_id);
CREATE INDEX IF NOT EXISTS idx_contactos_proximo_envio ON contactos(proximo_envio);
CREATE INDEX IF NOT EXISTS idx_contactos_etapa_estado ON contactos(etapa, estado);

-- 5. Habilitar Seguridad RLS
ALTER TABLE contactos ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing ENABLE ROW LEVEL SECURITY;
ALTER TABLE trazabilidad_correos ENABLE ROW LEVEL SECURITY;

-- 6. Políticas RLS (Acceso Total para pruebas y administración)
DROP POLICY IF EXISTS "Permitir todo para contactos" ON contactos;
CREATE POLICY "Permitir todo para contactos" ON contactos FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo para marketing" ON marketing;
CREATE POLICY "Permitir todo para marketing" ON marketing FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo para trazabilidad" ON trazabilidad_correos;
CREATE POLICY "Permitir todo para trazabilidad" ON trazabilidad_correos FOR ALL USING (true) WITH CHECK (true);

-- 7. Carga de Datos Iniciales para Biblioteca (Etapas de muestra para iniciar secuencia)
INSERT INTO marketing (nombre_envio, asunto, cuerpo_html, cuerpo, activo)
VALUES 
(1, 'Bienvenido a Tiny Puertecillo - Descubre la costa de una forma diferente', '<div style="font-family: sans-serif; padding: 20px;"><p>Hola,</p><p>Te damos la bienvenida a Tiny Puertecillo. Diseñamos espacios sustentables junto al mar.</p></div>', 'Te damos la bienvenida a Tiny Puertecillo.', true),
(2, 'Diseño sustentable y arquitectura costera', '<div style="font-family: sans-serif; padding: 20px;"><p>Hola,</p><p>Nuestras cabañas están diseñadas con climatización pasiva y maderas nobles.</p></div>', 'Diseño sustentable y arquitectura costera.', true)
ON CONFLICT (nombre_envio) DO NOTHING;

-- Notificar recarga de esquema
NOTIFY pgrst, 'reload schema';
