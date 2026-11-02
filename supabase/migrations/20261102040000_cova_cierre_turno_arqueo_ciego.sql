-- Migration: cova_cierre_turno_arqueo_ciego
-- Mejoras al cierre de turno, arqueo ciego, inmutabilidad de snapshot y reasignación de huérfanos

CREATE OR REPLACE FUNCTION public.fn_cerrar_turno_caja(
    p_turno_id UUID,
    p_usuario_cierre_id UUID,
    p_declarado_f1 NUMERIC,
    p_declarado_f2 NUMERIC,
    p_denominaciones_f1 JSONB,
    p_denominaciones_f2 JSONB,
    p_justificacion TEXT,
    p_monto_remesa NUMERIC,
    p_monto_fondo_siguiente NUMERIC
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_turno RECORD;
    v_fondo1_id UUID;
    v_fondo2_id UUID;
    v_entradas_pos_f1 NUMERIC := 0;
    v_entradas_extras_f1 NUMERIC := 0;
    v_salidas_f1 NUMERIC := 0;
    v_entradas_extras_f2 NUMERIC := 0;
    v_salidas_f2 NUMERIC := 0;
    v_traspasos_in_f1 NUMERIC := 0;
    v_traspasos_out_f1 NUMERIC := 0;
    v_traspasos_in_f2 NUMERIC := 0;
    v_traspasos_out_f2 NUMERIC := 0;
    v_teorico_f1 NUMERIC := 0;
    v_teorico_f2 NUMERIC := 0;
    v_diferencia_f1 NUMERIC := 0;
    v_diferencia_f2 NUMERIC := 0;
    v_ventas_tpv NUMERIC := 0;
    v_ventas_spei NUMERIC := 0;
    v_ventas_bnpl NUMERIC := 0;
    v_conteo_transacciones INT := 0;
    v_snapshot JSONB;
BEGIN
    SELECT * INTO v_turno
    FROM caja_turnos
    WHERE id = p_turno_id
    FOR UPDATE;

    IF v_turno IS NULL THEN
        RAISE EXCEPTION 'El turno no existe';
    END IF;

    IF v_turno.estado != 'ABIERTO' THEN
        RAISE EXCEPTION 'El turno ya ha sido cerrado o auditado previamente';
    END IF;

    -- Obtener fondos de la sucursal
    SELECT id INTO v_fondo1_id FROM caja_fondos WHERE sucursal_id = v_turno.sucursal_id AND tipo = 'OPERATIVO' LIMIT 1;
    SELECT id INTO v_fondo2_id FROM caja_fondos WHERE sucursal_id = v_turno.sucursal_id AND tipo = 'RESERVA' LIMIT 1;

    -- 1. Reasignar cobros huérfanos que ocurrieron durante el turno a este turno
    UPDATE pagos_orden
    SET caja_turno_id = p_turno_id
    WHERE caja_turno_id IS NULL
      AND sucursal_id = v_turno.sucursal_id
      AND fecha_pago >= v_turno.fecha_apertura
      AND fecha_pago <= now()
      AND deleted_at IS NULL;

    -- 2. Reasignar movimientos de caja huérfanos que ocurrieron durante el turno a este turno
    UPDATE caja_movimientos
    SET caja_turno_id = p_turno_id
    WHERE caja_turno_id IS NULL
      AND sucursal_id = v_turno.sucursal_id
      AND created_at >= v_turno.fecha_apertura
      AND created_at <= now();

    -- 3. Cobros en efectivo asociados al turno (pagos_orden)
    SELECT COALESCE(SUM(monto_total), 0) INTO v_entradas_pos_f1
    FROM pagos_orden
    WHERE caja_turno_id = p_turno_id
      AND proveedor_pago = 'Efectivo'
      AND (caja_fondo_id = v_fondo1_id OR caja_fondo_id IS NULL)
      AND estatus IN ('Aprobado', 'COMPLETADO')
      AND deleted_at IS NULL;

    -- Cobros por otros métodos para el snapshot integral
    SELECT 
        COALESCE(SUM(CASE WHEN proveedor_pago IN ('Tarjeta', 'Terminal', 'TPV', 'Mercado Pago', 'Stripe') THEN monto_total ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN proveedor_pago IN ('Transferencia', 'SPEI') THEN monto_total ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN proveedor_pago IN ('KueskiPay', 'Atrato') THEN monto_total ELSE 0 END), 0),
        COUNT(*)
    INTO v_ventas_tpv, v_ventas_spei, v_ventas_bnpl, v_conteo_transacciones
    FROM pagos_orden
    WHERE caja_turno_id = p_turno_id
      AND estatus IN ('Aprobado', 'COMPLETADO')
      AND deleted_at IS NULL;

    -- Salidas / Gastos / Retiros de Fondo 1
    SELECT COALESCE(SUM(monto), 0) INTO v_salidas_f1
    FROM caja_movimientos
    WHERE caja_turno_id = p_turno_id
      AND tipo IN ('Gasto / Insumos', 'Pago Proveedor', 'Retiro de Efectivo', 'Retiro Administrativo', 'EGRESO')
      AND (caja_fondo_id = v_fondo1_id OR caja_fondo_id IS NULL);

    -- Entradas extras a Fondo 1
    SELECT COALESCE(SUM(monto), 0) INTO v_entradas_extras_f1
    FROM caja_movimientos
    WHERE caja_turno_id = p_turno_id
      AND tipo IN ('Fondo Inicial', 'Ingreso Extra', 'Reposición de Fondo', 'INGRESO')
      AND (caja_fondo_id = v_fondo1_id OR caja_fondo_id IS NULL);

    -- Salidas / Retiros de Fondo 2
    SELECT COALESCE(SUM(monto), 0) INTO v_salidas_f2
    FROM caja_movimientos
    WHERE caja_turno_id = p_turno_id
      AND tipo IN ('Retiro de Efectivo', 'Retiro Administrativo', 'EGRESO')
      AND caja_fondo_id = v_fondo2_id;

    -- Entradas extras a Fondo 2
    SELECT COALESCE(SUM(monto), 0) INTO v_entradas_extras_f2
    FROM caja_movimientos
    WHERE caja_turno_id = p_turno_id
      AND tipo IN ('Ingreso Extra', 'Reposición de Fondo', 'INGRESO')
      AND caja_fondo_id = v_fondo2_id;

    -- Traspasos recibidos y enviados por Fondo 1
    SELECT COALESCE(SUM(monto), 0) INTO v_traspasos_in_f1
    FROM caja_traspasos_fondos WHERE turno_id = p_turno_id AND fondo_destino_id = v_fondo1_id;

    SELECT COALESCE(SUM(monto), 0) INTO v_traspasos_out_f1
    FROM caja_traspasos_fondos WHERE turno_id = p_turno_id AND fondo_origen_id = v_fondo1_id;

    -- Traspasos recibidos y enviados por Fondo 2
    SELECT COALESCE(SUM(monto), 0) INTO v_traspasos_in_f2
    FROM caja_traspasos_fondos WHERE turno_id = p_turno_id AND fondo_destino_id = v_fondo2_id;

    SELECT COALESCE(SUM(monto), 0) INTO v_traspasos_out_f2
    FROM caja_traspasos_fondos WHERE turno_id = p_turno_id AND fondo_origen_id = v_fondo2_id;

    -- Cálculos teóricos
    v_teorico_f1 := v_turno.monto_apertura_fondo1 + v_entradas_pos_f1 + v_entradas_extras_f1 - v_salidas_f1 + v_traspasos_in_f1 - v_traspasos_out_f1;
    v_teorico_f2 := v_turno.monto_apertura_fondo2 + v_entradas_extras_f2 - v_salidas_f2 + v_traspasos_in_f2 - v_traspasos_out_f2;

    v_diferencia_f1 := p_declarado_f1 - v_teorico_f1;
    v_diferencia_f2 := p_declarado_f2 - v_teorico_f2;

    -- Construir snapshot financiero inmutable completo
    v_snapshot := jsonb_build_object(
        'fecha_cierre', now(),
        'usuario_cierre_id', p_usuario_cierre_id,
        'teorico_f1', v_teorico_f1,
        'declarado_f1', p_declarado_f1,
        'diferencia_f1', v_diferencia_f1,
        'teorico_f2', v_teorico_f2,
        'declarado_f2', p_declarado_f2,
        'diferencia_f2', v_diferencia_f2,
        'entradas_pos_f1', v_entradas_pos_f1,
        'entradas_extras_f1', v_entradas_extras_f1,
        'salidas_f1', v_salidas_f1,
        'entradas_extras_f2', v_entradas_extras_f2,
        'salidas_f2', v_salidas_f2,
        'traspasos_in_f1', v_traspasos_in_f1,
        'traspasos_out_f1', v_traspasos_out_f1,
        'traspasos_in_f2', v_traspasos_in_f2,
        'traspasos_out_f2', v_traspasos_out_f2,
        'ventas_tpv', v_ventas_tpv,
        'ventas_spei', v_ventas_spei,
        'ventas_bnpl', v_ventas_bnpl,
        'total_recaudado_turno', (v_entradas_pos_f1 + v_ventas_tpv + v_ventas_spei + v_ventas_bnpl),
        'conteo_transacciones', v_conteo_transacciones,
        'remesa_retirada', p_monto_remesa,
        'fondo_siguiente_f1', p_monto_fondo_siguiente,
        'justificacion_descuadre', p_justificacion,
        'denominaciones_f1', p_denominaciones_f1,
        'denominaciones_f2', p_denominaciones_f2
    );

    -- Actualizar caja_turnos
    UPDATE caja_turnos
    SET
        estado = 'CERRADO',
        usuario_cierre_id = p_usuario_cierre_id,
        fecha_cierre = now(),
        monto_cierre_declarado_f1 = p_declarado_f1,
        monto_cierre_declarado_f2 = p_declarado_f2,
        monto_cierre_teorico_f1 = v_teorico_f1,
        monto_cierre_teorico_f2 = v_teorico_f2,
        diferencia_f1 = v_diferencia_f1,
        diferencia_f2 = v_diferencia_f2,
        justificacion_descuadre = p_justificacion,
        monto_remesa_retirada = p_monto_remesa,
        monto_fondo_siguiente_f1 = p_monto_fondo_siguiente,
        snapshot_resumen = v_snapshot
    WHERE id = p_turno_id;

    -- Desglose de denominaciones
    IF p_denominaciones_f1 IS NOT NULL AND v_fondo1_id IS NOT NULL THEN
        INSERT INTO caja_arqueos_denominaciones (
            turno_id, fondo_id,
            b1000, b500, b200, b100, b50, b20,
            m20, m10, m5, m2, m1, centavos,
            total_calculado
        ) VALUES (
            p_turno_id, v_fondo1_id,
            COALESCE((p_denominaciones_f1->>'b1000')::int, 0),
            COALESCE((p_denominaciones_f1->>'b500')::int, 0),
            COALESCE((p_denominaciones_f1->>'b200')::int, 0),
            COALESCE((p_denominaciones_f1->>'b100')::int, 0),
            COALESCE((p_denominaciones_f1->>'b50')::int, 0),
            COALESCE((p_denominaciones_f1->>'b20')::int, 0),
            COALESCE((p_denominaciones_f1->>'m20')::int, 0),
            COALESCE((p_denominaciones_f1->>'m10')::int, 0),
            COALESCE((p_denominaciones_f1->>'m5')::int, 0),
            COALESCE((p_denominaciones_f1->>'m2')::int, 0),
            COALESCE((p_denominaciones_f1->>'m1')::int, 0),
            COALESCE((p_denominaciones_f1->>'centavos')::numeric, 0),
            p_declarado_f1
        );
    END IF;

    IF p_denominaciones_f2 IS NOT NULL AND v_fondo2_id IS NOT NULL THEN
        INSERT INTO caja_arqueos_denominaciones (
            turno_id, fondo_id,
            b1000, b500, b200, b100, b50, b20,
            m20, m10, m5, m2, m1, centavos,
            total_calculado
        ) VALUES (
            p_turno_id, v_fondo2_id,
            COALESCE((p_denominaciones_f2->>'b1000')::int, 0),
            COALESCE((p_denominaciones_f2->>'b500')::int, 0),
            COALESCE((p_denominaciones_f2->>'b200')::int, 0),
            COALESCE((p_denominaciones_f2->>'b100')::int, 0),
            COALESCE((p_denominaciones_f2->>'b50')::int, 0),
            COALESCE((p_denominaciones_f2->>'b20')::int, 0),
            COALESCE((p_denominaciones_f2->>'m20')::int, 0),
            COALESCE((p_denominaciones_f2->>'m10')::int, 0),
            COALESCE((p_denominaciones_f2->>'m5')::int, 0),
            COALESCE((p_denominaciones_f2->>'m2')::int, 0),
            COALESCE((p_denominaciones_f2->>'m1')::int, 0),
            COALESCE((p_denominaciones_f2->>'centavos')::numeric, 0),
            p_declarado_f2
        );
    END IF;

    -- Actualizar saldo_actual de caja_fondos para siguiente turno
    IF v_fondo1_id IS NOT NULL THEN
        UPDATE caja_fondos
        SET saldo_actual = p_monto_fondo_siguiente, updated_at = now()
        WHERE id = v_fondo1_id;
    END IF;

    IF v_fondo2_id IS NOT NULL THEN
        UPDATE caja_fondos
        SET saldo_actual = p_declarado_f2, updated_at = now()
        WHERE id = v_fondo2_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'turno_id', p_turno_id,
        'teorico_f1', v_teorico_f1,
        'declarado_f1', p_declarado_f1,
        'diferencia_f1', v_diferencia_f1,
        'teorico_f2', v_teorico_f2,
        'declarado_f2', p_declarado_f2,
        'diferencia_f2', v_diferencia_f2,
        'remesa', p_monto_remesa,
        'fondo_siguiente', p_monto_fondo_siguiente,
        'snapshot', v_snapshot
    );
END;
$$;

-- Actualizar fn_resumen_corte_diario_auditoria para sumar egresos y compras correctamente
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
              AND (caja_fondo_id = (SELECT id FROM public.caja_fondos WHERE sucursal_id = v_turno.sucursal_id AND tipo = 'OPERATIVO' LIMIT 1) OR caja_fondo_id IS NULL)
        ), 0),
        'saldo_teorico', COALESCE(v_turno.monto_cierre_teorico_f1, 0),
        'cierre_declarado', v_turno.monto_cierre_declarado_f1,
        'diferencia', v_turno.diferencia_f1,
        'remesa_retirada', v_turno.monto_remesa_retirada,
        'fondo_siguiente', v_turno.monto_fondo_siguiente_f1,
        'justificacion_descuadre', v_turno.justificacion_descuadre
    ) INTO v_efectivo;

    -- B. Resumen SPEI Cuentas Bancarias
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'cuenta_id', cb.id,
            'banco', cb.banco,
            'alias', cb.alias,
            'es_fiscal', cb.es_fiscal,
            'total', COALESCE(SUM(po.monto_total), 0),
            'conteo', COUNT(po.id)
        )
    ), '[]'::jsonb) INTO v_bancos
    FROM public.cuentas_bancarias cb
    LEFT JOIN public.pagos_orden po 
        ON po.cuenta_bancaria_id = cb.id 
       AND po.caja_turno_id = p_turno_id 
       AND po.estatus IN ('Aprobado', 'COMPLETADO')
       AND po.deleted_at IS NULL
    WHERE cb.empresa_id = v_turno.empresa_id 
      AND (cb.sucursal_id IS NULL OR cb.sucursal_id = v_turno.sucursal_id)
      AND cb.activo = true
    GROUP BY cb.id, cb.banco, cb.alias, cb.es_fiscal;

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
                    'bruto', SUM(monto_total),
                    'comision', SUM(comision_monto),
                    'neto', SUM(COALESCE(monto_neto, monto_total - comision_monto)),
                    'conteo', COUNT(*)
                )
             )
             FROM public.pagos_orden
             WHERE caja_turno_id = p_turno_id
               AND proveedor_pago IN ('Tarjeta', 'Terminal', 'TPV', 'Mercado Pago', 'Stripe')
               AND estatus IN ('Aprobado', 'COMPLETADO')
               AND deleted_at IS NULL
             GROUP BY metodo_detalle, plazo_msi),
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

    -- E. Totales Financieros y Separación Fiscal
    SELECT 
        COALESCE(SUM(po.monto_total), 0),
        COALESCE(SUM(po.comision_monto), 0),
        COALESCE(SUM(COALESCE(po.monto_neto, po.monto_total - po.comision_monto)), 0)
    INTO v_total_ventas_brutas, v_total_comisiones, v_total_ventas_netas
    FROM public.pagos_orden po
    WHERE po.caja_turno_id = p_turno_id
      AND po.estatus IN ('Aprobado', 'COMPLETADO')
      AND po.deleted_at IS NULL;

    -- Total de costos del turno (compras directas de refacciones)
    SELECT COALESCE(SUM(monto_costo), 0)
    INTO v_total_costos
    FROM public.compras_proveedores
    WHERE caja_turno_id = p_turno_id;

    v_ganancia_neta := v_total_ventas_netas - v_total_costos;

    -- Ganancia en Cuentas Fiscales
    SELECT COALESCE(SUM(COALESCE(po.monto_neto, po.monto_total - po.comision_monto)), 0)
    INTO v_ganancia_fiscal
    FROM public.pagos_orden po
    LEFT JOIN public.cuentas_bancarias cb ON cb.id = po.cuenta_bancaria_id
    WHERE po.caja_turno_id = p_turno_id
      AND po.estatus IN ('Aprobado', 'COMPLETADO')
      AND (cb.es_fiscal = true)
      AND po.deleted_at IS NULL;

    v_ganancia_desp_fiscal := GREATEST(0, v_ganancia_neta - v_ganancia_fiscal);

    v_fiscal := jsonb_build_object(
        'ventas_brutas', v_total_ventas_brutas,
        'comisiones_retenidas', v_total_comisiones,
        'ventas_netas', v_total_ventas_netas,
        'costos_refacciones', v_total_costos,
        'ganancia_neta_total', v_ganancia_neta,
        'ganancia_fiscal', v_ganancia_fiscal,
        'ganancia_despues_de_fiscal', v_ganancia_desp_fiscal
    );

    -- F. Registro del Día (KPIs de Taller)
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'categoria', cat.nombre,
            'unidad', cat.unidad,
            'cantidad', COALESCE((
                SELECT SUM(osr.cantidad)
                FROM public.orden_servicio_refacciones osr
                JOIN public.ordenes_servicio os ON os.id = osr.orden_id
                JOIN public.pagos_orden po ON po.orden_id = os.id
                WHERE po.caja_turno_id = p_turno_id
                  AND (
                    SELECT bool_or(osr.descripcion ILIKE '%' || kw || '%')
                    FROM unnest(cat.keywords) AS kw
                  )
            ), 0)
        ) ORDER BY cat.orden ASC
    ), '[]'::jsonb) INTO v_kpis
    FROM public.tenant_kpi_categorias cat
    WHERE cat.empresa_id = v_turno.empresa_id AND cat.activo = true;

    RETURN jsonb_build_object(
        'success', true,
        'turno_id', v_turno.id,
        'estado', v_turno.estado,
        'fecha_apertura', v_turno.fecha_apertura,
        'fecha_cierre', v_turno.fecha_cierre,
        'efectivo', v_efectivo,
        'bancos', v_bancos,
        'tarjetas', v_tarjetas,
        'proveedores', v_proveedores,
        'fiscal', v_fiscal,
        'kpis_registro_dia', v_kpis
    );
END;
$$;
