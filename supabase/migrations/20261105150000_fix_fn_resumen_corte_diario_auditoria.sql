-- Migración para corregir métricas y fechas en fn_resumen_corte_diario_auditoria
CREATE OR REPLACE FUNCTION public.fn_resumen_corte_diario_auditoria(p_turno_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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

    -- B. Resumen SPEI Cuentas Bancarias
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
            ON (po.cuenta_bancaria_id = cb.id OR (po.cuenta_bancaria_id IS NULL AND cb.id = (SELECT id FROM public.cuentas_bancarias WHERE empresa_id = v_turno.empresa_id AND activo = true ORDER BY es_fiscal DESC, created_at ASC LIMIT 1)))
           AND po.caja_turno_id = p_turno_id 
           AND po.estatus IN ('Aprobado', 'COMPLETADO')
           AND po.deleted_at IS NULL
           AND po.proveedor_pago IN ('Transferencia', 'SPEI')
        WHERE cb.empresa_id = v_turno.empresa_id 
          AND (cb.sucursal_id IS NULL OR cb.sucursal_id = v_turno.sucursal_id)
          AND cb.activo = true
        GROUP BY cb.id, cb.banco, cb.alias, cb.es_fiscal
    ) b;

    -- C. Resumen Tarjetas TPV y Comisiones
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
        'compras', COALESCE(
            (SELECT jsonb_agg(
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

    -- E. Resumen Fiscal vs Operativo
    SELECT jsonb_build_object(
        'ventas_brutas', v_total_ventas_brutas,
        'comisiones_retenidas', v_total_comisiones,
        'costos_refacciones', v_total_costos,
        'ganancia_neta_total', v_ganancia_neta,
        'ganancia_fiscal', COALESCE((
            SELECT SUM(monto_total) FROM public.pagos_orden po
            LEFT JOIN public.cuentas_bancarias cb ON cb.id = po.cuenta_bancaria_id
            WHERE po.caja_turno_id = p_turno_id AND (cb.es_fiscal = true OR (po.cuenta_bancaria_id IS NULL AND po.proveedor_pago IN ('Transferencia', 'SPEI')))
              AND po.estatus IN ('Aprobado', 'COMPLETADO') AND po.deleted_at IS NULL
        ), 0),
        'ganancia_despues_de_fiscal', COALESCE((
            SELECT SUM(monto_total) FROM public.pagos_orden po
            LEFT JOIN public.cuentas_bancarias cb ON cb.id = po.cuenta_bancaria_id
            WHERE po.caja_turno_id = p_turno_id 
              AND (cb.es_fiscal IS FALSE OR po.proveedor_pago = 'Efectivo')
              AND po.estatus IN ('Aprobado', 'COMPLETADO') AND po.deleted_at IS NULL
        ), 0),
        'total_fiscal_facturado', COALESCE((
            SELECT SUM(monto_total) FROM public.pagos_orden po
            LEFT JOIN public.cuentas_bancarias cb ON cb.id = po.cuenta_bancaria_id
            WHERE po.caja_turno_id = p_turno_id AND (cb.es_fiscal = true OR (po.cuenta_bancaria_id IS NULL AND po.proveedor_pago IN ('Transferencia', 'SPEI')))
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

    RETURN jsonb_build_object(
        'success', true,
        'turno_id', p_turno_id,
        'estado', v_turno.estado,
        'fecha_apertura', v_turno.fecha_apertura,
        'fecha_cierre', v_turno.fecha_cierre,
        'efectivo', v_efectivo,
        'bancos', v_bancos,
        'tarjetas', v_tarjetas,
        'proveedores', v_proveedores,
        'fiscal', v_fiscal,
        'kpis', v_kpis
    );
END;
$function$;
