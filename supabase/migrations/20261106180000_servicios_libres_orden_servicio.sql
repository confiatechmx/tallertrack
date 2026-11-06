-- ==============================================================================
-- MIGRATION: 20261106180000_servicios_libres_orden_servicio.sql
-- DESCRIPTION: Permite agregar servicios y mano de obra libremente en órdenes de servicio,
--              haciendo nullable servicio_id y agregando concepto_personalizado.
-- ==============================================================================

ALTER TABLE public.orden_servicio_servicios ALTER COLUMN servicio_id DROP NOT NULL;
ALTER TABLE public.orden_servicio_servicios ADD COLUMN IF NOT EXISTS concepto_personalizado TEXT;

UPDATE public.orden_servicio_servicios 
SET concepto_personalizado = s.nombre 
FROM public.servicios_taller s 
WHERE orden_servicio_servicios.servicio_id = s.id 
  AND (orden_servicio_servicios.concepto_personalizado IS NULL OR orden_servicio_servicios.concepto_personalizado = '');
