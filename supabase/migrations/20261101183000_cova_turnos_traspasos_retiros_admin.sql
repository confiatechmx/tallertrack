-- ==============================================================================
-- MIGRATION: 20261101183000_cova_turnos_traspasos_retiros_admin.sql
-- DESCRIPTION: Actualización de procedimientos para retiros administrativos,
--              reposiciones de fondo y cálculo teórico integral F1/F2 (Cova).
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.fn_registrar_movimiento_caja(
  p_tipo text,
  p_concepto text,
  p_monto numeric,
  p_metodo text DEFAULT 'Efectivo'::text,
  p_responsable text DEFAULT 'Caja General'::text,
  p_sucursal_id uuid DEFAULT NULL::uuid,
  p_idempotency_key text DEFAULT NULL::text,
  p_caja_turno_id uuid DEFAULT NULL::uuid,
  p_caja_fondo_id uuid DEFAULT NULL::uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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

  -- Idempotencia
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

  -- Auto-asignar turno activo si no se especificó
  IF v_turno_id IS NULL AND p_sucursal_id IS NOT NULL THEN
    SELECT id INTO v_turno_id
    FROM public.caja_turnos
    WHERE sucursal_id = p_sucursal_id AND estado = 'ABIERTO'
    LIMIT 1;
  END IF;

  -- Auto-asignar fondo operativo si no se especificó
  IF v_fondo_id IS NULL AND p_sucursal_id IS NOT NULL THEN
    SELECT id INTO v_fondo_id
    FROM public.caja_fondos
    WHERE sucursal_id = p_sucursal_id AND tipo = 'OPERATIVO'
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

  -- Si es un gasto o retiro en efectivo y tiene fondo asignado, actualizar el saldo del fondo
  IF p_metodo = 'Efectivo' AND v_fondo_id IS NOT NULL THEN
    IF p_tipo IN ('Gasto / Insumos', 'Pago Proveedor', 'Retiro de Efectivo', 'Retiro Administrativo') THEN
      UPDATE public.caja_fondos
      SET saldo_actual = saldo_actual - p_monto, updated_at = now()
      WHERE id = v_fondo_id;
    ELSIF p_tipo IN ('Ingreso Extra', 'Fondo Inicial', 'Reposición de Fondo') THEN
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
$function$;

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

    -- Cobros en efectivo asociados al turno (pagos_orden)
    SELECT COALESCE(SUM(monto_total), 0) INTO v_entradas_pos_f1
    FROM pagos_orden
    WHERE (caja_turno_id = p_turno_id OR (caja_turno_id IS NULL AND sucursal_id = v_turno.sucursal_id AND fecha_pago >= v_turno.fecha_apertura AND fecha_pago <= now()))
      AND proveedor_pago = 'Efectivo'
      AND (caja_fondo_id = v_fondo1_id OR caja_fondo_id IS NULL)
      AND estatus IN ('Aprobado', 'COMPLETADO')
      AND deleted_at IS NULL;

    -- Salidas / Gastos / Retiros de Fondo 1
    SELECT COALESCE(SUM(monto), 0) INTO v_salidas_f1
    FROM caja_movimientos
    WHERE (caja_turno_id = p_turno_id OR (caja_turno_id IS NULL AND sucursal_id = v_turno.sucursal_id AND created_at >= v_turno.fecha_apertura AND created_at <= now()))
      AND tipo IN ('Gasto / Insumos', 'Pago Proveedor', 'Retiro de Efectivo', 'Retiro Administrativo')
      AND (caja_fondo_id = v_fondo1_id OR caja_fondo_id IS NULL);

    -- Entradas extras a Fondo 1
    SELECT COALESCE(SUM(monto), 0) INTO v_entradas_extras_f1
    FROM caja_movimientos
    WHERE (caja_turno_id = p_turno_id OR (caja_turno_id IS NULL AND sucursal_id = v_turno.sucursal_id AND created_at >= v_turno.fecha_apertura AND created_at <= now()))
      AND tipo IN ('Fondo Inicial', 'Ingreso Extra', 'Reposición de Fondo')
      AND (caja_fondo_id = v_fondo1_id OR caja_fondo_id IS NULL);

    -- Salidas / Retiros de Fondo 2
    SELECT COALESCE(SUM(monto), 0) INTO v_salidas_f2
    FROM caja_movimientos
    WHERE (caja_turno_id = p_turno_id OR (caja_turno_id IS NULL AND sucursal_id = v_turno.sucursal_id AND created_at >= v_turno.fecha_apertura AND created_at <= now()))
      AND tipo IN ('Retiro de Efectivo', 'Retiro Administrativo')
      AND caja_fondo_id = v_fondo2_id;

    -- Entradas extras a Fondo 2
    SELECT COALESCE(SUM(monto), 0) INTO v_entradas_extras_f2
    FROM caja_movimientos
    WHERE (caja_turno_id = p_turno_id OR (caja_turno_id IS NULL AND sucursal_id = v_turno.sucursal_id AND created_at >= v_turno.fecha_apertura AND created_at <= now()))
      AND tipo IN ('Ingreso Extra', 'Reposición de Fondo')
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
        'entradas_extras_f1', v_entradas_extras_f1,
        'salidas_f1', v_salidas_f1,
        'entradas_extras_f2', v_entradas_extras_f2,
        'salidas_f2', v_salidas_f2,
        'traspasos_in_f1', v_traspasos_in_f1,
        'traspasos_out_f1', v_traspasos_out_f1,
        'traspasos_in_f2', v_traspasos_in_f2,
        'traspasos_out_f2', v_traspasos_out_f2,
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
        'fondo_siguiente', p_monto_fondo_siguiente
    );
END;
$$;
