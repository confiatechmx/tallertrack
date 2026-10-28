-- ==============================================================================
-- MIGRATION: 20261028113500_fix_caja_turnos_usuario_apertura_fk.sql
-- DESCRIPTION: Agrega validación defensiva de usuario en fn_abrir_turno_caja,
--              fn_traspaso_entre_fondos y fn_cerrar_turno_caja para evitar
--              violaciones de foreign key (caja_turnos_usuario_apertura_id_fkey).
-- ==============================================================================

-- 1. PROCEDIMIENTO: fn_abrir_turno_caja
CREATE OR REPLACE FUNCTION fn_abrir_turno_caja(
    p_empresa_id UUID,
    p_sucursal_id UUID,
    p_usuario_id UUID,
    p_monto_fondo1 NUMERIC,
    p_monto_fondo2 NUMERIC
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_turno_existente UUID;
    v_nuevo_turno_id UUID;
    v_fondo1_id UUID;
    v_fondo2_id UUID;
    v_real_user_id UUID;
BEGIN
    -- Validar existencia de turno abierto
    SELECT id INTO v_turno_existente
    FROM caja_turnos
    WHERE sucursal_id = p_sucursal_id AND estado = 'ABIERTO'
    LIMIT 1;

    IF v_turno_existente IS NOT NULL THEN
        RAISE EXCEPTION 'Ya existe un turno abierto en esta sucursal (ID: %)', v_turno_existente;
    END IF;

    -- Resolución defensiva de usuario (evitar violación de foreign key a perfiles)
    v_real_user_id := p_usuario_id;
    IF v_real_user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.perfiles WHERE id = v_real_user_id) THEN
        IF auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid()) THEN
            v_real_user_id := auth.uid();
        ELSE
            SELECT id INTO v_real_user_id FROM public.perfiles WHERE empresa_id = p_empresa_id LIMIT 1;
        END IF;
    ELSIF v_real_user_id IS NULL AND auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid()) THEN
        v_real_user_id := auth.uid();
    END IF;

    -- Obtener o inicializar Fondo 1 (Operativo)
    SELECT id INTO v_fondo1_id
    FROM caja_fondos
    WHERE sucursal_id = p_sucursal_id AND tipo = 'OPERATIVO' AND activo = true
    LIMIT 1;

    IF v_fondo1_id IS NULL THEN
        INSERT INTO caja_fondos (empresa_id, sucursal_id, nombre, tipo, saldo_actual)
        VALUES (p_empresa_id, p_sucursal_id, 'Fondo 1: Operativo Mostrador', 'OPERATIVO', p_monto_fondo1)
        RETURNING id INTO v_fondo1_id;
    ELSE
        UPDATE caja_fondos SET saldo_actual = p_monto_fondo1, updated_at = now() WHERE id = v_fondo1_id;
    END IF;

    -- Obtener o inicializar Fondo 2 (Reserva)
    SELECT id INTO v_fondo2_id
    FROM caja_fondos
    WHERE sucursal_id = p_sucursal_id AND tipo = 'RESERVA' AND activo = true
    LIMIT 1;

    IF v_fondo2_id IS NULL THEN
        INSERT INTO caja_fondos (empresa_id, sucursal_id, nombre, tipo, saldo_actual)
        VALUES (p_empresa_id, p_sucursal_id, 'Fondo 2: Reserva Taller', 'RESERVA', p_monto_fondo2)
        RETURNING id INTO v_fondo2_id;
    ELSE
        UPDATE caja_fondos SET saldo_actual = p_monto_fondo2, updated_at = now() WHERE id = v_fondo2_id;
    END IF;

    -- Crear el nuevo turno
    INSERT INTO caja_turnos (
        empresa_id,
        sucursal_id,
        usuario_apertura_id,
        fecha_apertura,
        estado,
        monto_apertura_fondo1,
        monto_apertura_fondo2
    ) VALUES (
        p_empresa_id,
        p_sucursal_id,
        v_real_user_id,
        now(),
        'ABIERTO',
        p_monto_fondo1,
        p_monto_fondo2
    ) RETURNING id INTO v_nuevo_turno_id;

    -- Registrar movimiento de apertura en caja_movimientos para auditoría
    INSERT INTO caja_movimientos (
        empresa_id,
        sucursal_id,
        tipo,
        concepto,
        monto,
        metodo,
        caja_turno_id,
        caja_fondo_id,
        idempotency_key
    ) VALUES (
        p_empresa_id,
        p_sucursal_id,
        'Fondo Inicial',
        'Apertura de turno - Fondo 1 Operativo',
        p_monto_fondo1,
        'Efectivo',
        v_nuevo_turno_id,
        v_fondo1_id,
        'apertura-turno-' || v_nuevo_turno_id || '-f1'
    );

    RETURN jsonb_build_object(
        'success', true,
        'turno_id', v_nuevo_turno_id,
        'fondo1_id', v_fondo1_id,
        'fondo2_id', v_fondo2_id,
        'monto_f1', p_monto_fondo1,
        'monto_f2', p_monto_fondo2
    );
END;
$$;

-- 2. PROCEDIMIENTO: fn_traspaso_entre_fondos
CREATE OR REPLACE FUNCTION fn_traspaso_entre_fondos(
    p_turno_id UUID,
    p_fondo_origen_id UUID,
    p_fondo_destino_id UUID,
    p_monto NUMERIC,
    p_concepto TEXT,
    p_usuario_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_empresa_id UUID;
    v_sucursal_id UUID;
    v_saldo_origen NUMERIC;
    v_traspaso_id UUID;
    v_real_user_id UUID;
BEGIN
    IF p_monto <= 0 THEN
        RAISE EXCEPTION 'El monto del traspaso debe ser mayor a 0';
    END IF;

    IF p_fondo_origen_id = p_fondo_destino_id THEN
        RAISE EXCEPTION 'El fondo de origen y destino no pueden ser el mismo';
    END IF;

    -- Bloquear fondos con FOR UPDATE
    SELECT empresa_id, sucursal_id, saldo_actual INTO v_empresa_id, v_sucursal_id, v_saldo_origen
    FROM caja_fondos
    WHERE id = p_fondo_origen_id
    FOR UPDATE;

    IF v_saldo_origen < p_monto THEN
        RAISE EXCEPTION 'Saldo insuficiente en el fondo origen (Disponible: %, Solicitado: %)', v_saldo_origen, p_monto;
    END IF;

    -- Resolución defensiva de usuario
    v_real_user_id := p_usuario_id;
    IF v_real_user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.perfiles WHERE id = v_real_user_id) THEN
        IF auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid()) THEN
            v_real_user_id := auth.uid();
        ELSE
            SELECT id INTO v_real_user_id FROM public.perfiles WHERE empresa_id = v_empresa_id LIMIT 1;
        END IF;
    ELSIF v_real_user_id IS NULL AND auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid()) THEN
        v_real_user_id := auth.uid();
    END IF;

    -- Descontar del origen
    UPDATE caja_fondos
    SET saldo_actual = saldo_actual - p_monto, updated_at = now()
    WHERE id = p_fondo_origen_id;

    -- Abonar al destino
    UPDATE caja_fondos
    SET saldo_actual = saldo_actual + p_monto, updated_at = now()
    WHERE id = p_fondo_destino_id;

    -- Registrar en caja_traspasos_fondos
    INSERT INTO caja_traspasos_fondos (
        empresa_id,
        sucursal_id,
        turno_id,
        fondo_origen_id,
        fondo_destino_id,
        monto,
        concepto,
        usuario_id
    ) VALUES (
        v_empresa_id,
        v_sucursal_id,
        p_turno_id,
        p_fondo_origen_id,
        p_fondo_destino_id,
        p_monto,
        p_concepto,
        v_real_user_id
    ) RETURNING id INTO v_traspaso_id;

    -- Registrar movimientos espejos para auditoría en caja_movimientos
    INSERT INTO caja_movimientos (
        empresa_id,
        sucursal_id,
        tipo,
        concepto,
        monto,
        metodo,
        caja_turno_id,
        caja_fondo_id,
        idempotency_key
    ) VALUES (
        v_empresa_id,
        v_sucursal_id,
        'Traspaso Salida',
        'Traspaso enviado: ' || p_concepto,
        p_monto,
        'Efectivo',
        p_turno_id,
        p_fondo_origen_id,
        'traspaso-out-' || v_traspaso_id
    ), (
        v_empresa_id,
        v_sucursal_id,
        'Traspaso Entrada',
        'Traspaso recibido: ' || p_concepto,
        p_monto,
        'Efectivo',
        p_turno_id,
        p_fondo_destino_id,
        'traspaso-in-' || v_traspaso_id
    );

    RETURN jsonb_build_object(
        'success', true,
        'traspaso_id', v_traspaso_id,
        'monto', p_monto,
        'saldo_origen_restante', v_saldo_origen - p_monto
    );
END;
$$;

-- 3. PROCEDIMIENTO: fn_cerrar_turno_caja
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
    v_real_user_cierre_id UUID;
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

    -- Resolución defensiva de usuario
    v_real_user_cierre_id := p_usuario_cierre_id;
    IF v_real_user_cierre_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.perfiles WHERE id = v_real_user_cierre_id) THEN
        IF auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid()) THEN
            v_real_user_cierre_id := auth.uid();
        ELSE
            SELECT id INTO v_real_user_cierre_id FROM public.perfiles WHERE empresa_id = v_turno.empresa_id LIMIT 1;
        END IF;
    ELSIF v_real_user_cierre_id IS NULL AND auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid()) THEN
        v_real_user_cierre_id := auth.uid();
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
        usuario_cierre_id = v_real_user_cierre_id,
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
