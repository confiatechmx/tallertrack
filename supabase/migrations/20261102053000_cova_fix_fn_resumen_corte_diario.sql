-- ==============================================================================
-- Migration: 20261102053000_cova_fix_fn_resumen_corte_diario.sql
-- Fix nested aggregation in fn_resumen_corte_diario_auditoria
-- ==============================================================================

-- Actualizar fn_registrar_pagos_orden_multi para incrementar saldo_actual del fondo al cobrar en efectivo
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
  WHERE sucursal_id = v_sucursal_id AND tipo IN ('MOSTRADOR', 'OPERATIVO')
  ORDER BY tipo = 'MOSTRADOR' DESC
  LIMIT 1;

  -- 1. Insertar cada pago en pagos_orden
  FOR v_pago IN
    SELECT
      COALESCE(elem->>'proveedor_pago', elem->>'metodo') AS metodo,
      (elem->>'monto_total')::NUMERIC AS monto,
      elem->>'referencia' AS referencia,
      COALESCE(elem->>'metodo_detalle', elem->>'detalle') AS detalle,
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

    -- Incrementar saldo del fondo al recibir efectivo
    IF v_prov = 'Efectivo' AND v_caja_fondo_id IS NOT NULL THEN
      UPDATE public.caja_fondos
      SET saldo_actual = saldo_actual + v_pago.monto, updated_at = now()
      WHERE id = v_caja_fondo_id;
    END IF;

    v_pagos_count := v_pagos_count + 1;
  END LOOP;

  -- 2. Calcular total pagado activo
  SELECT COALESCE(SUM(monto_total), 0)
  INTO v_nuevo_pagado
  FROM public.pagos_orden
  WHERE orden_servicio_id = p_orden_id 
    AND estatus IN ('Aprobado', 'COMPLETADO')
    AND deleted_at IS NULL;

  -- 3. Calcular total de la orden
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

-- Actualizar fn_registrar_movimiento_caja para soportar EGRESO e INGRESO en saldo_actual
CREATE OR REPLACE FUNCTION public.fn_registrar_movimiento_caja(
  p_tipo TEXT,
  p_concepto TEXT,
  p_monto NUMERIC,
  p_metodo TEXT DEFAULT 'Efectivo',
  p_responsable TEXT DEFAULT 'Cajero',
  p_sucursal_id UUID DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL,
  p_caja_turno_id UUID DEFAULT NULL,
  p_caja_fondo_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_empresa_id UUID;
  v_mov_id UUID;
  v_existing RECORD;
  v_turno_id UUID := p_caja_turno_id;
  v_fondo_id UUID := p_caja_fondo_id;
BEGIN
  v_empresa_id := public.user_empresa_id();
  IF v_empresa_id IS NULL THEN
    SELECT empresa_id INTO v_empresa_id FROM sucursales WHERE id = p_sucursal_id LIMIT 1;
  END IF;

  IF v_empresa_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'UNAUTHORIZED',
      'message', 'Usuario no autenticado o sin empresa asignada'
    );
  END IF;

  IF p_idempotency_key IS NOT NULL THEN
    SELECT * INTO v_existing
    FROM public.caja_movimientos
    WHERE idempotency_key = p_idempotency_key
    LIMIT 1;

    IF v_existing.id IS NOT NULL THEN
      RETURN jsonb_build_object(
        'success', true,
        'idempotent', true,
        'movimiento_id', v_existing.id,
        'message', 'Movimiento previamente registrado'
      );
    END IF;
  END IF;

  IF v_turno_id IS NULL AND p_sucursal_id IS NOT NULL THEN
    SELECT id INTO v_turno_id
    FROM public.caja_turnos
    WHERE sucursal_id = p_sucursal_id AND estado = 'ABIERTO'
    LIMIT 1;
  END IF;

  IF v_fondo_id IS NULL AND p_sucursal_id IS NOT NULL THEN
    SELECT id INTO v_fondo_id
    FROM public.caja_fondos
    WHERE sucursal_id = p_sucursal_id AND tipo IN ('MOSTRADOR', 'OPERATIVO')
    ORDER BY tipo = 'MOSTRADOR' DESC
    LIMIT 1;
  END IF;

  INSERT INTO public.caja_movimientos (
    empresa_id,
    sucursal_id,
    tipo,
    concepto,
    monto,
    metodo,
    responsable,
    idempotency_key,
    caja_turno_id,
    caja_fondo_id
  ) VALUES (
    v_empresa_id,
    p_sucursal_id,
    p_tipo,
    p_concepto,
    p_monto,
    p_metodo,
    p_responsable,
    p_idempotency_key,
    v_turno_id,
    v_fondo_id
  ) RETURNING id INTO v_mov_id;

  IF p_metodo = 'Efectivo' AND v_fondo_id IS NOT NULL THEN
    IF p_tipo IN ('EGRESO', 'Gasto / Insumos', 'Pago Proveedor', 'Retiro de Efectivo', 'Retiro Administrativo') THEN
      UPDATE public.caja_fondos
      SET saldo_actual = saldo_actual - p_monto, updated_at = now()
      WHERE id = v_fondo_id;
    ELSIF p_tipo IN ('INGRESO', 'Ingreso Extra', 'Fondo Inicial', 'Reposición de Fondo') THEN
      UPDATE public.caja_fondos
      SET saldo_actual = saldo_actual + p_monto, updated_at = now()
      WHERE id = v_fondo_id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'movimiento_id', v_mov_id,
    'turno_id', v_turno_id,
    'fondo_id', v_fondo_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_resumen_corte_diario_auditoria(p_turno_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_turno RECORD;
    v_efectivo JSONB;
    v_bancos JSONB;
    v_tarjetas JSONB;
    v_proveedores JSONB;
    v_fiscal JSONB;
    v_kpis JSONB;
    v_total_ventas_brutas NUMERIC := 0;
    v_total_comisiones NUMERIC := 0;
    v_total_ventas_netas NUMERIC := 0;
    v_total_costos NUMERIC := 0;
    v_ganancia_neta NUMERIC := 0;
    v_ganancia_fiscal NUMERIC := 0;
    v_ganancia_desp_fiscal NUMERIC := 0;
BEGIN
    SELECT * INTO v_turno FROM public.caja_turnos WHERE id = p_turno_id;
    IF v_turno.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'TURNO_NOT_FOUND');
    END IF;

    -- A. Resumen Efectivo Mostrador (Fondo 1)
    SELECT jsonb_build_object(
        'apertura_declarada', v_turno.monto_apertura_fondo1,
        'entradas_ventas', COALESCE((
            SELECT SUM(monto_total) FROM public.pagos_orden 
            WHERE caja_turno_id = p_turno_id 
              AND proveedor_pago = 'Efectivo' 
              AND estatus IN ('Aprobado', 'COMPLETADO')
              AND deleted_at IS NULL
        ), 0),
        'salidas_gastos', COALESCE((
            SELECT SUM(monto) FROM public.caja_movimientos 
            WHERE caja_turno_id = p_turno_id 
              AND tipo IN ('EGRESO', 'Gasto / Insumos', 'Pago Proveedor', 'Retiro de Efectivo', 'Retiro Administrativo')
              AND (caja_fondo_id = (SELECT id FROM public.caja_fondos WHERE sucursal_id = v_turno.sucursal_id AND tipo = 'MOSTRADOR' LIMIT 1) OR caja_fondo_id IS NULL)
        ), 0),
        'saldo_teorico', COALESCE(v_turno.monto_cierre_teorico_f1, 0),
        'cierre_declarado', v_turno.monto_cierre_declarado_f1,
        'diferencia', v_turno.diferencia_f1,
        'remesa_retirada', v_turno.monto_remesa_retirada,
        'fondo_siguiente', v_turno.monto_fondo_siguiente_f1,
        'justificacion_descuadre', v_turno.justificacion_descuadre
    ) INTO v_efectivo;

    -- B. Resumen SPEI Cuentas Bancarias (Subquery evita error 42803)
    SELECT COALESCE(jsonb_agg(row_to_json(b)::jsonb), '[]'::jsonb) INTO v_bancos
    FROM (
        SELECT 
            cb.id as cuenta_id,
            cb.banco,
            cb.alias,
            cb.es_fiscal,
            COALESCE(SUM(po.monto_total), 0) as total,
            COUNT(po.id) as conteo
        FROM public.cuentas_bancarias cb
        LEFT JOIN public.pagos_orden po 
            ON po.cuenta_bancaria_id = cb.id 
           AND po.caja_turno_id = p_turno_id 
           AND po.estatus IN ('Aprobado', 'COMPLETADO')
           AND po.deleted_at IS NULL
        WHERE cb.empresa_id = v_turno.empresa_id 
          AND (cb.sucursal_id IS NULL OR cb.sucursal_id = v_turno.sucursal_id)
          AND cb.activo = true
        GROUP BY cb.id, cb.banco, cb.alias, cb.es_fiscal
    ) b;

    -- C. Resumen Tarjetas TPV y Comisiones (BanBajío y Mercado Pago)
    SELECT jsonb_build_object(
        'total_bruto', COALESCE(SUM(monto_total), 0),
        'total_comisiones', COALESCE(SUM(comision_monto), 0),
        'total_neto', COALESCE(SUM(COALESCE(monto_neto, monto_total - comision_monto)), 0),
        'conteo', COUNT(*),
        'desglose', COALESCE(
            (SELECT jsonb_agg(
                jsonb_build_object(
                    'metodo', metodo_detalle,
                    'plazo_msi', plazo_msi,
                    'bruto', bruto,
                    'comision', comision,
                    'neto', neto,
                    'conteo', conteo
                )
             ) FROM (
                 SELECT 
                     metodo_detalle,
                     plazo_msi,
                     SUM(monto_total) as bruto,
                     SUM(comision_monto) as comision,
                     SUM(COALESCE(monto_neto, monto_total - comision_monto)) as neto,
                     COUNT(*) as conteo
                 FROM public.pagos_orden
                 WHERE caja_turno_id = p_turno_id
                   AND proveedor_pago IN ('Tarjeta', 'Terminal', 'TPV', 'Mercado Pago', 'Stripe')
                   AND estatus IN ('Aprobado', 'COMPLETADO')
                   AND deleted_at IS NULL
                 GROUP BY metodo_detalle, plazo_msi
             ) desg
            ),
            '[]'::jsonb
        )
    ) INTO v_tarjetas
    FROM public.pagos_orden
    WHERE caja_turno_id = p_turno_id
      AND proveedor_pago IN ('Tarjeta', 'Terminal', 'TPV', 'Mercado Pago', 'Stripe')
      AND estatus IN ('Aprobado', 'COMPLETADO')
      AND deleted_at IS NULL;

    -- D. Resumen Proveedores del Turno
    SELECT jsonb_build_object(
        'total_pagado_caja_chica', COALESCE((
            SELECT SUM(monto_costo) FROM public.compras_proveedores
            WHERE caja_turno_id = p_turno_id AND fuente_pago = 'CAJA_CHICA'
        ), 0),
        'total_credito_nuevo', COALESCE((
            SELECT SUM(monto_costo) FROM public.compras_proveedores
            WHERE caja_turno_id = p_turno_id AND fuente_pago = 'CREDITO_PENDIENTE'
        ), 0),
        'total_abonos_credito', COALESCE((
            SELECT SUM(monto) FROM public.proveedores_abonos
            WHERE caja_turno_id = p_turno_id
        ), 0),
        'compras', COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', cp.id,
                    'proveedor', p.nombre_comercial,
                    'folio', cp.folio_ticket_nota,
                    'descripcion', cp.descripcion,
                    'costo', cp.monto_costo,
                    'fuente_pago', cp.fuente_pago,
                    'estatus_pago', cp.estatus_pago,
                    'evidencia_url', cp.evidencia_url,
                    'estatus_garantia', cp.estatus_garantia
                )
            )
            FROM public.compras_proveedores cp
            JOIN public.proveedores p ON p.id = cp.proveedor_id
            WHERE cp.caja_turno_id = p_turno_id
        ), '[]'::jsonb)
    ) INTO v_proveedores;

    -- E. Resumen Fiscal vs Operativo
    SELECT jsonb_build_object(
        'total_fiscal_facturado', COALESCE((
            SELECT SUM(monto_total) FROM public.pagos_orden po
            JOIN public.cuentas_bancarias cb ON cb.id = po.cuenta_bancaria_id
            WHERE po.caja_turno_id = p_turno_id AND cb.es_fiscal = true
              AND po.estatus IN ('Aprobado', 'COMPLETADO') AND po.deleted_at IS NULL
        ), 0),
        'total_no_fiscal_operativo', COALESCE((
            SELECT SUM(monto_total) FROM public.pagos_orden po
            LEFT JOIN public.cuentas_bancarias cb ON cb.id = po.cuenta_bancaria_id
            WHERE po.caja_turno_id = p_turno_id 
              AND (cb.es_fiscal IS FALSE OR po.proveedor_pago = 'Efectivo')
              AND po.estatus IN ('Aprobado', 'COMPLETADO') AND po.deleted_at IS NULL
        ), 0)
    ) INTO v_fiscal;

    -- F. KPIs de Rentabilidad del Turno
    SELECT 
        COALESCE(SUM(monto_total), 0),
        COALESCE(SUM(comision_monto), 0),
        COALESCE(SUM(COALESCE(monto_neto, monto_total - comision_monto)), 0)
    INTO v_total_ventas_brutas, v_total_comisiones, v_total_ventas_netas
    FROM public.pagos_orden
    WHERE caja_turno_id = p_turno_id AND estatus IN ('Aprobado', 'COMPLETADO') AND deleted_at IS NULL;

    SELECT COALESCE(SUM(monto_costo), 0) INTO v_total_costos
    FROM public.compras_proveedores
    WHERE caja_turno_id = p_turno_id;

    v_ganancia_neta := v_total_ventas_netas - v_total_costos;

    v_kpis := jsonb_build_object(
        'ventas_brutas', v_total_ventas_brutas,
        'comisiones_pasarelas', v_total_comisiones,
        'ventas_netas', v_total_ventas_netas,
        'costos_refacciones_compras', v_total_costos,
        'ganancia_bruta_taller', v_ganancia_neta,
        'margen_promedio_pct', CASE WHEN v_total_ventas_netas > 0 THEN ROUND((v_ganancia_neta / v_total_ventas_netas) * 100, 2) ELSE 0 END
    );

    RETURN jsonb_build_object(
        'success', true,
        'turno_id', p_turno_id,
        'efectivo', v_efectivo,
        'bancos', v_bancos,
        'tarjetas', v_tarjetas,
        'proveedores', v_proveedores,
        'fiscal', v_fiscal,
        'kpis', v_kpis
    );
END;
$$;
