-- ==============================================================================
-- MIGRATION: 20261106160000_metodos_pago_ajuste_porcentaje_autogestionable.sql
-- DESCRIPTION: Porcentaje de precio / ajuste autogestionable por tenant para sus
--              diferentes métodos de pago (efectivo, transferencias, terminales TPV y MSI)
-- ==============================================================================

-- 1. Columna de ajuste porcentual en catálogo de métodos de pago
ALTER TABLE public.tenant_metodos_pago 
ADD COLUMN IF NOT EXISTS ajuste_porcentaje NUMERIC(6,4) NOT NULL DEFAULT 0.0000;

-- 2. Columna de porcentaje por defecto de tarjeta a nivel tenant (empresa)
ALTER TABLE public.empresas 
ADD COLUMN IF NOT EXISTS tarjeta_ajuste_porcentaje NUMERIC(6,4) NOT NULL DEFAULT 4.3000;

-- 3. Inicializar métodos de tarjeta existentes con 4.30% y MSI según plazo
UPDATE public.tenant_metodos_pago 
SET ajuste_porcentaje = 4.3000 
WHERE tipo IN ('TARJETA_CREDITO', 'TARJETA_DEBITO') AND ajuste_porcentaje = 0.0000;

UPDATE public.tenant_metodos_pago 
SET ajuste_porcentaje = 7.5000 
WHERE plazo_msi = 3 AND ajuste_porcentaje = 0.0000;

UPDATE public.tenant_metodos_pago 
SET ajuste_porcentaje = 11.5000 
WHERE plazo_msi = 6 AND ajuste_porcentaje = 0.0000;

UPDATE public.tenant_metodos_pago 
SET ajuste_porcentaje = 15.5000 
WHERE plazo_msi = 9 AND ajuste_porcentaje = 0.0000;

UPDATE public.tenant_metodos_pago 
SET ajuste_porcentaje = 19.5000 
WHERE plazo_msi = 12 AND ajuste_porcentaje = 0.0000;

UPDATE public.empresas 
SET tarjeta_ajuste_porcentaje = 4.3000 
WHERE tarjeta_ajuste_porcentaje IS NULL;
