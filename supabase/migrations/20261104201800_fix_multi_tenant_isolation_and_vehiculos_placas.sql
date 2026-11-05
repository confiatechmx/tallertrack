-- ==============================================================================
-- MIGRACIÓN: Aislamiento Estricto Multi-Tenant en RLS y Normalización de Placas
-- ==============================================================================

-- 1. Actualizar políticas RLS de aislamiento SaaS para permitir lectura/escritura
--    del tenant propio (user_empresa_id()) o de SuperAdmin en modo soporte/impersonación
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'caja_movimientos',
    'clientes',
    'compras_proveedores',
    'configuracion_pagos',
    'conversaciones_omnicanal',
    'cotizaciones',
    'detalles_cotizacion',
    'empleados',
    'inspecciones_dvi',
    'inventario_llantas_base',
    'mensajes_omnicanal',
    'orden_servicio_refacciones',
    'orden_servicio_servicios',
    'ordenes_servicio',
    'pagos_orden',
    'plantillas_notificacion',
    'proveedores',
    'proveedores_abonos',
    'reglas_automatizacion',
    'servicios_taller',
    'sucursales',
    'tenant_kpi_categorias',
    'tenant_metodos_pago',
    'trabajos_diferidos',
    'vehiculos'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format(
      'ALTER POLICY %I ON public.%I USING ((empresa_id = public.user_empresa_id()) OR public.is_superadmin()) WITH CHECK ((empresa_id = public.user_empresa_id()) OR public.is_superadmin())',
      'Aislamiento SaaS ' || t,
      t
    );
  END LOOP;
END $$;

-- 2. Normalizar placas genéricas o vacías a NULL para evitar colisiones de unicidad
--    en ventas de mostrador (Público General) y altas express sin placas
UPDATE public.vehiculos
SET placas = NULL
WHERE placas IS NOT NULL
  AND (
    btrim(placas) = ''
    OR upper(btrim(placas)) IN ('MOSTRADOR', 'SIN PLACAS', 'S/P', 'N/A', 'PENDIENTE')
  );

CREATE OR REPLACE FUNCTION public.fn_normalize_vehiculo_placas()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.placas IS NOT NULL THEN
    NEW.placas := upper(btrim(NEW.placas));
    IF NEW.placas = '' OR NEW.placas IN ('MOSTRADOR', 'SIN PLACAS', 'S/P', 'N/A', 'PENDIENTE') THEN
      NEW.placas := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_normalize_vehiculo_placas
BEFORE INSERT OR UPDATE ON public.vehiculos
FOR EACH ROW
EXECUTE FUNCTION public.fn_normalize_vehiculo_placas();
