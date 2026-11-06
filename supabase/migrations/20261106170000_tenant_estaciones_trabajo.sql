-- ==============================================================================
-- MIGRATION: 20261106170000_tenant_estaciones_trabajo.sql
-- DESCRIPTION: Catálogo autogestionable de estaciones de trabajo, rampas, fosas y bahías
--              con seed oficial para Cova (Fosa diagnóstico, Rampa frenera 1 y 2, Portería, Comodines)
-- ==============================================================================

-- 1. TABLA: tenant_estaciones_trabajo
CREATE TABLE IF NOT EXISTS public.tenant_estaciones_trabajo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    sucursal_id UUID REFERENCES public.sucursales(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    codigo TEXT,
    tipo TEXT NOT NULL DEFAULT 'RAMPA' CHECK (tipo IN ('FOSA', 'RAMPA', 'PORTERIA', 'COMODIN', 'BAHIA', 'OTRO')),
    descripcion TEXT,
    orden INT NOT NULL DEFAULT 0,
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_tenant_estaciones_empresa 
ON public.tenant_estaciones_trabajo(empresa_id, activo, orden);

-- 2. SEGURIDAD RLS MULTI-TENANT
ALTER TABLE public.tenant_estaciones_trabajo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Aislamiento SaaS tenant_estaciones_trabajo" ON public.tenant_estaciones_trabajo;
CREATE POLICY "Aislamiento SaaS tenant_estaciones_trabajo" ON public.tenant_estaciones_trabajo
    FOR ALL TO authenticated
    USING (empresa_id = public.user_empresa_id() OR public.is_superadmin())
    WITH CHECK (empresa_id = public.user_empresa_id() OR public.is_superadmin());

DROP POLICY IF EXISTS "Lectura pública de estaciones para seguimiento" ON public.tenant_estaciones_trabajo;
CREATE POLICY "Lectura pública de estaciones para seguimiento" ON public.tenant_estaciones_trabajo
    FOR SELECT TO anon
    USING (true);

-- 3. SEED OFICIAL PARA EL TENANT DE COVA
INSERT INTO public.tenant_estaciones_trabajo (empresa_id, sucursal_id, nombre, codigo, tipo, descripcion, orden, activo)
VALUES
    ('b2ad09db-0a34-4876-9ca3-d584c40bd294', 'b2ad09db-0a34-4876-9ca3-d584c40bd295', 'Fosa de diagnóstico', 'FOSA-DIAG', 'FOSA', 'Fosa especializada de inspección rápida y diagnóstico de suspensión', 1, true),
    ('b2ad09db-0a34-4876-9ca3-d584c40bd294', 'b2ad09db-0a34-4876-9ca3-d584c40bd295', 'Rampa frenera 1', 'RAMPA-FRENOS-1', 'RAMPA', 'Rampa principal para servicio integral de frenos y balatas', 2, true),
    ('b2ad09db-0a34-4876-9ca3-d584c40bd294', 'b2ad09db-0a34-4876-9ca3-d584c40bd295', 'Rampa frenera 2', 'RAMPA-FRENOS-2', 'RAMPA', 'Rampa secundaria para rectificado y frenos pesados', 3, true),
    ('b2ad09db-0a34-4876-9ca3-d584c40bd294', 'b2ad09db-0a34-4876-9ca3-d584c40bd295', 'Portería', 'PORTERIA', 'PORTERIA', 'Estación de portería para atención y desmonte de neumáticos', 4, true),
    ('b2ad09db-0a34-4876-9ca3-d584c40bd294', 'b2ad09db-0a34-4876-9ca3-d584c40bd295', 'Comodín 1', 'COMODIN-1', 'COMODIN', 'Bahía comodín multiusos para trabajos auxiliares', 5, true),
    ('b2ad09db-0a34-4876-9ca3-d584c40bd294', 'b2ad09db-0a34-4876-9ca3-d584c40bd295', 'Comodín 2', 'COMODIN-2', 'COMODIN', 'Bahía comodín multiusos de apoyo en piso', 6, true)
ON CONFLICT DO NOTHING;
