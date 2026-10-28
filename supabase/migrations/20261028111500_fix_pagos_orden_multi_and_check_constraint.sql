-- ==============================================================================
-- MIGRATION: 20261028111500_fix_pagos_orden_multi_and_check_constraint.sql
-- DESCRIPTION: Corrige constraint de estatus en pagos_orden ('Aprobado' y 'COMPLETADO')
--              y refactoriza fn_registrar_pagos_orden_multi y fn_registrar_venta_multi_pago
--              para asociar caja_turno_id, caja_fondo_id, cuenta_bancaria_id,
--              calcular totales reales de orden (servicios, refacciones y cotizaciones)
--              y actualizar estatus_pago correctamente ('Pagado', 'Parcial', 'Pendiente').
-- ==============================================================================

-- 1. Ampliar el check constraint de estatus en pagos_orden para permitir 'Aprobado' y 'COMPLETADO'
ALTER TABLE public.pagos_orden DROP CONSTRAINT IF EXISTS pagos_orden_estatus_check;
ALTER TABLE public.pagos_orden ADD CONSTRAINT pagos_orden_estatus_check 
  CHECK (estatus IN ('Pendiente', 'Procesando', 'Aprobado', 'COMPLETADO', 'Rechazado', 'Reembolsado'));

-- 2. Refactorizar fn_registrar_pagos_orden_multi con nombres correctos de tablas y campos
CREATE OR REPLACE FUNCTION public.fn_registrar_pagos_orden_multi(
  p_orden_id UUID,
  p_pagos JSONB,
  p_sucursal_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_empresa_id UUID;
  v_sucursal_id UUID;
  v_cot_id UUID;
  v_pago RECORD;
  v_prov TEXT;
  v_det TEXT;
  v_ref TEXT;
  v_cuenta_bancaria_id UUID;
  v_caja_fondo_id UUID;
  v_fondo_operativo_id UUID;
  v_active_turno_id UUID;
  v_nuevo_pagado NUMERIC := 0;
  v_total_orden NUMERIC := 0;
  v_serv_total NUMERIC := 0;
  v_ref_total NUMERIC := 0;
  v_cot_total NUMERIC := 0;
  v_nuevo_estatus TEXT;
  v_pagos_count INT := 0;
BEGIN
  -- Obtener empresa y sucursal de la orden
  SELECT empresa_id, sucursal_id, cotizacion_id 
  INTO v_empresa_id, v_sucursal_id, v_cot_id
  FROM public.ordenes_servicio
  WHERE id = p_orden_id;

  IF v_empresa_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'ORDER_NOT_FOUND', 'message', 'Orden de servicio no encontrada');
  END IF;

  IF p_sucursal_id IS NOT NULL THEN
    v_sucursal_id := p_sucursal_id;
  END IF;

  IF p_pagos IS NULL OR jsonb_array_length(p_pagos) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'NO_PAYMENTS', 'message', 'Sin pagos para registrar');
  END IF;

  -- Detectar turno activo de la sucursal
  SELECT id INTO v_active_turno_id
  FROM public.caja_turnos
  WHERE sucursal_id = v_sucursal_id AND estado = 'ABIERTO'
  LIMIT 1;

  -- Detectar fondo operativo (Fondo 1) para cobros en efectivo
  SELECT id INTO v_fondo_operativo_id
  FROM public.caja_fondos
  WHERE sucursal_id = v_sucursal_id AND tipo = 'OPERATIVO'
  LIMIT 1;

  -- 1. Insertar cada pago en pagos_orden
  FOR v_pago IN
    SELECT
      elem->>'metodo' AS metodo,
      (elem->>'monto')::NUMERIC AS monto,
      elem->>'referencia' AS referencia,
      elem->>'detalle' AS detalle,
      elem->>'cuenta_bancaria_id' AS cuenta_bancaria_id,
      elem->>'caja_fondo_id' AS caja_fondo_id
    FROM jsonb_array_elements(p_pagos) AS elem
  LOOP
    v_prov := CASE
      WHEN v_pago.metodo IN ('Tarjeta', 'Terminal', 'Clip', 'Point') THEN 'Tarjeta'
      WHEN v_pago.metodo IN ('Transferencia', 'SPEI') THEN 'Transferencia'
      WHEN v_pago.metodo IN ('KueskiPay', 'Kueski') THEN 'KueskiPay'
      WHEN v_pago.metodo = 'Atrato' THEN 'Atrato'
      WHEN v_pago.metodo = 'Stripe' THEN 'Stripe'
      WHEN v_pago.metodo = 'Mercado Pago' THEN 'Mercado Pago'
      ELSE 'Efectivo'
    END;

    v_det := COALESCE(v_pago.detalle, v_pago.metodo || ' en Caja');
    v_ref := COALESCE(v_pago.referencia, 'ORD-' || UPPER(SUBSTRING(p_orden_id::text, 1, 8)));

    IF v_pago.cuenta_bancaria_id IS NOT NULL AND v_pago.cuenta_bancaria_id != '' THEN
      v_cuenta_bancaria_id := v_pago.cuenta_bancaria_id::UUID;
    ELSE
      v_cuenta_bancaria_id := NULL;
    END IF;

    IF v_pago.caja_fondo_id IS NOT NULL AND v_pago.caja_fondo_id != '' THEN
      v_caja_fondo_id := v_pago.caja_fondo_id::UUID;
    ELSIF v_prov = 'Efectivo' THEN
      v_caja_fondo_id := v_fondo_operativo_id;
    ELSE
      v_caja_fondo_id := NULL;
    END IF;

    INSERT INTO public.pagos_orden (
      orden_servicio_id,
      empresa_id,
      sucursal_id,
      monto_total,
      proveedor_pago,
      metodo_detalle,
      referencia,
      estatus,
      fecha_pago,
      caja_turno_id,
      cuenta_bancaria_id,
      caja_fondo_id
    ) VALUES (
      p_orden_id,
      v_empresa_id,
      v_sucursal_id,
      v_pago.monto,
      v_prov,
      v_det,
      v_ref,
      'Aprobado',
      timezone('utc'::text, now()),
      v_active_turno_id,
      v_cuenta_bancaria_id,
      v_caja_fondo_id
    );

    v_pagos_count := v_pagos_count + 1;
  END LOOP;

  -- 2. Calcular total pagado activo
  SELECT COALESCE(SUM(monto_total), 0)
  INTO v_nuevo_pagado
  FROM public.pagos_orden
  WHERE orden_servicio_id = p_orden_id 
    AND estatus IN ('Aprobado', 'COMPLETADO')
    AND deleted_at IS NULL;

  -- 3. Calcular total de la orden (servicios + refacciones + cotización/llantas)
  SELECT COALESCE(SUM(precio_cobrado), 0) INTO v_serv_total
  FROM public.orden_servicio_servicios
  WHERE orden_servicio_id = p_orden_id AND (estatus_aprobacion IS NULL OR estatus_aprobacion <> 'Diferido');

  SELECT COALESCE(SUM(COALESCE(subtotal, cantidad * precio_unitario)), 0) INTO v_ref_total
  FROM public.orden_servicio_refacciones
  WHERE orden_servicio_id = p_orden_id AND (estatus_aprobacion IS NULL OR estatus_aprobacion <> 'Diferido');

  IF v_cot_id IS NOT NULL THEN
    SELECT COALESCE(SUM(subtotal), 0) INTO v_cot_total
    FROM public.detalles_cotizacion
    WHERE cotizacion_id = v_cot_id AND (estatus_aprobacion IS NULL OR estatus_aprobacion <> 'Diferido');
  END IF;

  v_total_orden := v_serv_total + v_ref_total + v_cot_total;

  -- 4. Determinar estatus de pago válido para ordenes_servicio ('Pagado', 'Parcial', 'Pendiente')
  IF v_total_orden > 0 AND v_nuevo_pagado >= (v_total_orden - 0.5) THEN
    v_nuevo_estatus := 'Pagado';
  ELSIF v_nuevo_pagado > 0 THEN
    v_nuevo_estatus := 'Parcial';
  ELSE
    v_nuevo_estatus := 'Pendiente';
  END IF;

  UPDATE public.ordenes_servicio
  SET
    estatus_pago = v_nuevo_estatus,
    updated_at = timezone('utc'::text, now())
  WHERE id = p_orden_id;

  RETURN jsonb_build_object(
    'success', true,
    'orden_id', p_orden_id,
    'total_orden', v_total_orden,
    'nuevo_pagado', v_nuevo_pagado,
    'estatus_pago', v_nuevo_estatus,
    'pagos_registrados', v_pagos_count,
    'turno_id', v_active_turno_id
  );
END;
$$;

-- 3. Refactorizar fn_registrar_venta_multi_pago para asignar estatus 'Aprobado' y caja_fondo_id
CREATE OR REPLACE FUNCTION public.fn_registrar_venta_multi_pago(
  p_cliente_id UUID,
  p_vehiculo_id UUID,
  p_vendedor_id UUID,
  p_sucursal_id UUID,
  p_items JSONB,
  p_pagos JSONB,
  p_servicios_adicionales JSONB DEFAULT '[]'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_empresa_id UUID;
  v_cotizacion_id UUID;
  v_folio_consecutivo INT;
  v_folio_str TEXT;
  v_total_venta NUMERIC := 0;
  v_total_servicios NUMERIC := 0;
  v_item RECORD;
  v_serv RECORD;
  v_pago RECORD;
  v_prov TEXT;
  v_det TEXT;
  v_ref TEXT;
  v_active_turno_id UUID;
  v_fondo_operativo_id UUID;
  v_caja_fondo_id UUID;
  v_cuenta_bancaria_id UUID;
BEGIN
  SELECT empresa_id INTO v_empresa_id
  FROM public.clientes
  WHERE id = p_cliente_id;

  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Cliente % no encontrado o sin empresa_id', p_cliente_id;
  END IF;

  -- Detectar turno activo de la sucursal
  SELECT id INTO v_active_turno_id
  FROM public.caja_turnos
  WHERE sucursal_id = p_sucursal_id AND estado = 'ABIERTO'
  LIMIT 1;

  -- Detectar fondo operativo para efectivo
  SELECT id INTO v_fondo_operativo_id
  FROM public.caja_fondos
  WHERE sucursal_id = p_sucursal_id AND tipo = 'OPERATIVO'
  LIMIT 1;

  SELECT COALESCE(MAX(folio), 0) + 1 INTO v_folio_consecutivo
  FROM public.cotizaciones
  WHERE empresa_id = v_empresa_id;

  v_folio_str := 'COT-' || LPAD(v_folio_consecutivo::text, 5, '0');

  FOR v_item IN
    SELECT
      (elem->>'cantidad')::INT AS cantidad,
      (elem->>'subtotal')::NUMERIC AS subtotal
    FROM jsonb_array_elements(p_items) AS elem
  LOOP
    v_total_venta := v_total_venta + v_item.subtotal;
  END LOOP;

  IF p_servicios_adicionales IS NOT NULL AND jsonb_array_length(p_servicios_adicionales) > 0 THEN
    FOR v_serv IN
      SELECT (elem->>'precio')::NUMERIC AS precio
      FROM jsonb_array_elements(p_servicios_adicionales) AS elem
    LOOP
      v_total_servicios := v_total_servicios + v_serv.precio;
    END LOOP;
    v_total_venta := v_total_venta + v_total_servicios;
  END IF;

  INSERT INTO public.cotizaciones (
    cliente_id,
    vehiculo_id,
    vendedor_id,
    sucursal_id,
    empresa_id,
    folio,
    estatus,
    total,
    metodos_pago,
    caja_turno_id
  ) VALUES (
    p_cliente_id,
    p_vehiculo_id,
    p_vendedor_id,
    p_sucursal_id,
    v_empresa_id,
    v_folio_str,
    'Aceptada',
    v_total_venta,
    p_pagos,
    v_active_turno_id
  )
  RETURNING id INTO v_cotizacion_id;

  FOR v_item IN
    SELECT
      (elem->>'llanta_id')::UUID AS llanta_id,
      (elem->>'cantidad')::INT AS cantidad,
      (elem->>'precio_unitario')::NUMERIC AS precio_unitario,
      (elem->>'subtotal')::NUMERIC AS subtotal
    FROM jsonb_array_elements(p_items) AS elem
  LOOP
    INSERT INTO public.detalles_cotizacion (
      cotizacion_id,
      empresa_id,
      llanta_id,
      cantidad,
      precio_unitario,
      subtotal
    ) VALUES (
      v_cotizacion_id,
      v_empresa_id,
      v_item.llanta_id,
      v_item.cantidad,
      v_item.precio_unitario,
      v_item.subtotal
    );

    UPDATE public.inventario_llantas_base
    SET
      stock_actual = GREATEST(0, stock_actual - v_item.cantidad),
      updated_at = timezone('utc'::text, now())
    WHERE id = v_item.llanta_id;
  END LOOP;

  FOR v_pago IN
    SELECT
      elem->>'metodo' AS metodo,
      (elem->>'monto')::NUMERIC AS monto,
      elem->>'referencia' AS referencia,
      elem->>'detalle' AS detalle,
      elem->>'cuenta_bancaria_id' AS cuenta_bancaria_id,
      elem->>'caja_fondo_id' AS caja_fondo_id
    FROM jsonb_array_elements(p_pagos) AS elem
  LOOP
    v_prov := CASE
      WHEN v_pago.metodo IN ('Tarjeta', 'Terminal', 'Clip', 'Point') THEN 'Tarjeta'
      WHEN v_pago.metodo IN ('Transferencia', 'SPEI') THEN 'Transferencia'
      WHEN v_pago.metodo IN ('KueskiPay', 'Kueski') THEN 'KueskiPay'
      WHEN v_pago.metodo = 'Atrato' THEN 'Atrato'
      WHEN v_pago.metodo = 'Stripe' THEN 'Stripe'
      WHEN v_pago.metodo = 'Mercado Pago' THEN 'Mercado Pago'
      ELSE 'Efectivo'
    END;

    v_det := COALESCE(v_pago.detalle, v_pago.metodo || ' en Mostrador');
    v_ref := COALESCE(v_pago.referencia, 'POS-' || UPPER(SUBSTRING(v_cotizacion_id::text, 1, 8)));
    
    IF v_pago.cuenta_bancaria_id IS NOT NULL AND v_pago.cuenta_bancaria_id != '' THEN
      v_cuenta_bancaria_id := v_pago.cuenta_bancaria_id::UUID;
    ELSE
      v_cuenta_bancaria_id := NULL;
    END IF;

    IF v_pago.caja_fondo_id IS NOT NULL AND v_pago.caja_fondo_id != '' THEN
      v_caja_fondo_id := v_pago.caja_fondo_id::UUID;
    ELSIF v_prov = 'Efectivo' THEN
      v_caja_fondo_id := v_fondo_operativo_id;
    ELSE
      v_caja_fondo_id := NULL;
    END IF;

    INSERT INTO public.pagos_orden (
      cotizacion_id,
      empresa_id,
      sucursal_id,
      monto_total,
      proveedor_pago,
      metodo_detalle,
      referencia,
      estatus,
      fecha_pago,
      caja_turno_id,
      cuenta_bancaria_id,
      caja_fondo_id
    ) VALUES (
      v_cotizacion_id,
      v_empresa_id,
      p_sucursal_id,
      v_pago.monto,
      v_prov,
      v_det,
      v_ref,
      'Aprobado',
      timezone('utc'::text, now()),
      v_active_turno_id,
      v_cuenta_bancaria_id,
      v_caja_fondo_id
    );
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'cotizacion_id', v_cotizacion_id,
    'folio', v_folio_str,
    'total', v_total_venta,
    'turno_id', v_active_turno_id
  );
END;
$$;
