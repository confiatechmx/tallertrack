-- ==============================================================================
-- MIGRATION: 20240101000125_caja_turnos_multicomputer_sync.sql
-- DESCRIPTION: Ajuste de compatibilidad de estatus de pagos ('Aprobado' y 'COMPLETADO')
--              en el procedimiento atómico de cierre de turno (fn_cerrar_turno_caja)
--              para sincronización multi-computadora y multi-método.
-- ==============================================================================

CREATE OR REPLACE FUNCTION fn_cerrar_turno_caja(
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
    v_entradas_pos_f2 NUMERIC := 0;
    v_salidas_f1 NUMERIC := 0;
    v_salidas_f2 NUMERIC := 0;
    v_traspasos_in_f1 NUMERIC := 0;
    v_traspasos_out_f1 NUMERIC := 0;
    v_traspasos_in_f2 NUMERIC := 0;
    v_traspasos_out_f2 NUMERIC := 0;
    v_teorico_f1 NUMERIC := 0;
    v_teorico_f2 NUMERIC := 0;
    v_diferencia_f1 NUMERIC := 0;
    v_diferencia_f2 NUMERIC := 0;
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

    -- Calcular cobros en efectivo asociados al turno (pagos_orden de cualquier computadora en la sucursal)
    SELECT COALESCE(SUM(monto_total), 0) INTO v_entradas_pos_f1
    FROM pagos_orden
    WHERE (caja_turno_id = p_turno_id OR (caja_turno_id IS NULL AND sucursal_id = v_turno.sucursal_id AND fecha_pago >= v_turno.fecha_apertura AND fecha_pago <= now()))
      AND proveedor_pago = 'Efectivo'
      AND (caja_fondo_id = v_fondo1_id OR caja_fondo_id IS NULL)
      AND estatus IN ('Aprobado', 'COMPLETADO')
      AND deleted_at IS NULL;

    -- Salidas / Gastos en efectivo de Fondo 1
    SELECT COALESCE(SUM(monto), 0) INTO v_salidas_f1
    FROM caja_movimientos
    WHERE (caja_turno_id = p_turno_id OR (caja_turno_id IS NULL AND sucursal_id = v_turno.sucursal_id AND created_at >= v_turno.fecha_apertura AND created_at <= now()))
      AND tipo IN ('Gasto / Insumos', 'Pago Proveedor')
      AND (caja_fondo_id = v_fondo1_id OR caja_fondo_id IS NULL);

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
    v_teorico_f1 := v_turno.monto_apertura_fondo1 + v_entradas_pos_f1 - v_salidas_f1 + v_traspasos_in_f1 - v_traspasos_out_f1;
    v_teorico_f2 := v_turno.monto_apertura_fondo2 + v_traspasos_in_f2 - v_traspasos_out_f2;

    v_diferencia_f1 := p_declarado_f1 - v_teorico_f1;
    v_diferencia_f2 := p_declarado_f2 - v_teorico_f2;

    -- Construir snapshot financiero inmutable
    v_snapshot := jsonb_build_object(
        'fecha_cierre', now(),
        'teorico_f1', v_teorico_f1,
        'declarado_f1', p_declarado_f1,
        'diferencia_f1', v_diferencia_f1,
        'teorico_f2', v_teorico_f2,
        'declarado_f2', p_declarado_f2,
        'diferencia_f2', v_diferencia_f2,
        'entradas_pos_f1', v_entradas_pos_f1,
        'salidas_f1', v_salidas_f1,
        'traspasos_in_f1', v_traspasos_in_f1,
        'traspasos_out_f1', v_traspasos_out_f1,
        'remesa_retirada', p_monto_remesa,
        'fondo_siguiente_f1', p_monto_fondo_siguiente,
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

    -- Insertar desglose de denominaciones si se proveyeron
    IF p_denominaciones_f1 IS NOT NULL AND v_fondo1_id IS NOT NULL THEN
        INSERT INTO caja_arqueos_denominaciones (
            turno_id, fondo_id,
            b1000, b500, b200, b100, b50, b20,
            m20, m10, m5, m2, m1, centavos, total_calculado
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

    -- Actualizar saldos finales de los fondos
    IF v_fondo1_id IS NOT NULL THEN
        UPDATE caja_fondos SET saldo_actual = p_monto_fondo_siguiente, updated_at = now() WHERE id = v_fondo1_id;
    END IF;
    IF v_fondo2_id IS NOT NULL THEN
        UPDATE caja_fondos SET saldo_actual = p_declarado_f2, updated_at = now() WHERE id = v_fondo2_id;
    END IF;

    -- Asignar pagos y movimientos huérfanos del periodo a este turno
    UPDATE pagos_orden
    SET caja_turno_id = p_turno_id
    WHERE sucursal_id = v_turno.sucursal_id
      AND caja_turno_id IS NULL
      AND fecha_pago >= v_turno.fecha_apertura
      AND fecha_pago <= now();

    UPDATE caja_movimientos
    SET caja_turno_id = p_turno_id
    WHERE sucursal_id = v_turno.sucursal_id
      AND caja_turno_id IS NULL
      AND created_at >= v_turno.fecha_apertura
      AND created_at <= now();

    RETURN jsonb_build_object(
        'success', true,
        'turno_id', p_turno_id,
        'teorico_f1', v_teorico_f1,
        'declarado_f1', p_declarado_f1,
        'diferencia_f1', v_diferencia_f1,
        'teorico_f2', v_teorico_f2,
        'declarado_f2', p_declarado_f2,
        'diferencia_f2', v_diferencia_f2,
        'remesa_retirada', p_monto_remesa,
        'fondo_siguiente_f1', p_monto_fondo_siguiente
    );
END;
$$;
