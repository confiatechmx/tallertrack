-- Migration: Descuento por pago en efectivo y diferenciación de documentos
-- Fecha: 2026-10-31

ALTER TABLE public.empresas 
ADD COLUMN IF NOT EXISTS descuento_efectivo_habilitado BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS descuento_efectivo_porcentaje NUMERIC(5,2) DEFAULT 0.00;

ALTER TABLE public.ordenes_servicio 
ADD COLUMN IF NOT EXISTS descuento_efectivo_porcentaje NUMERIC(5,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS descuento_efectivo_monto NUMERIC(10,2) DEFAULT 0.00;

ALTER TABLE public.pagos_orden 
ADD COLUMN IF NOT EXISTS descuento_aplicado NUMERIC(10,2) DEFAULT 0.00;

-- Configurar Cova Tires con 3% de descuento en efectivo habilitado
UPDATE public.empresas 
SET descuento_efectivo_habilitado = true,
    descuento_efectivo_porcentaje = 3.00
WHERE id = 'b2ad09db-0a34-4876-9ca3-d584c40bd294';
