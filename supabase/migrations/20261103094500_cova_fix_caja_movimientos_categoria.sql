-- ==============================================================================
-- MIGRATION: 20261103094500_cova_fix_caja_movimientos_categoria.sql
-- DESCRIPTION: Añadir columnas faltantes a caja_movimientos (categoria, usuario_id,
--              folio_ticket, comprobante_url) requeridas por triggers de compras_proveedores.
-- ==============================================================================

-- 1. Agregar columnas faltantes a caja_movimientos
ALTER TABLE public.caja_movimientos ADD COLUMN IF NOT EXISTS categoria TEXT DEFAULT 'OPERATIVO';
ALTER TABLE public.caja_movimientos ADD COLUMN IF NOT EXISTS usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.caja_movimientos ADD COLUMN IF NOT EXISTS folio_ticket TEXT;
ALTER TABLE public.caja_movimientos ADD COLUMN IF NOT EXISTS comprobante_url TEXT;

-- 2. Actualizar fn_trg_compra_proveedor_proc para ser robusto y evitar duplicados si caja_movimiento_id ya viene definido
CREATE OR REPLACE FUNCTION public.fn_trg_compra_proveedor_proc()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_turno_id UUID;
    v_fondo_operativo_id UUID;
    v_fondo_reserva_id UUID;
    v_mov_id UUID;
    v_proveedor_nombre TEXT;
    v_dias_credito INT := 0;
    v_meses_garantia INT := 1;
BEGIN
    -- Obtener datos del proveedor
    SELECT nombre_comercial, dias_credito, meses_garantia_default
    INTO v_proveedor_nombre, v_dias_credito, v_meses_garantia
    FROM public.proveedores
    WHERE id = NEW.proveedor_id;

    -- Si no se proporcionaron fechas, calcularlas
    IF NEW.fecha_limite_pago IS NULL AND v_dias_credito > 0 THEN
        NEW.fecha_limite_pago := NEW.fecha_compra + v_dias_credito;
    ELSIF NEW.fecha_limite_pago IS NULL THEN
        NEW.fecha_limite_pago := NEW.fecha_compra;
    END IF;

    IF NEW.fecha_vencimiento_garantia IS NULL THEN
        NEW.fecha_vencimiento_garantia := NEW.fecha_compra + (COALESCE(NEW.meses_garantia, v_meses_garantia) || ' months')::interval;
    END IF;

    -- Buscar turno abierto de la sucursal si no viene explícito
    IF NEW.caja_turno_id IS NULL AND NEW.sucursal_id IS NOT NULL THEN
        SELECT id INTO v_turno_id
        FROM public.caja_turnos
        WHERE sucursal_id = NEW.sucursal_id AND estado = 'ABIERTO'
        LIMIT 1;
        NEW.caja_turno_id := v_turno_id;
    ELSE
        v_turno_id := NEW.caja_turno_id;
    END IF;

    -- Obtener fondos de la sucursal
    SELECT id INTO v_fondo_operativo_id
    FROM public.caja_fondos
    WHERE sucursal_id = NEW.sucursal_id AND tipo = 'OPERATIVO'
    LIMIT 1;

    SELECT id INTO v_fondo_reserva_id
    FROM public.caja_fondos
    WHERE sucursal_id = NEW.sucursal_id AND tipo = 'RESERVA'
    LIMIT 1;

    -- Si se pagó con CAJA_CHICA y no tiene ya un movimiento de caja vinculado
    IF NEW.fuente_pago = 'CAJA_CHICA' AND NEW.monto_costo > 0 THEN
        NEW.caja_fondo_id := COALESCE(NEW.caja_fondo_id, v_fondo_operativo_id);
        NEW.estatus_pago := 'PAGADO';
        NEW.monto_pagado := NEW.monto_costo;
        NEW.monto_saldo_pendiente := 0.00;

        IF NEW.caja_movimiento_id IS NULL THEN
            INSERT INTO public.caja_movimientos (
                empresa_id,
                sucursal_id,
                caja_turno_id,
                caja_fondo_id,
                tipo,
                categoria,
                concepto,
                monto,
                metodo,
                folio_ticket,
                comprobante_url,
                usuario_id
            ) VALUES (
                NEW.empresa_id,
                NEW.sucursal_id,
                v_turno_id,
                NEW.caja_fondo_id,
                'EGRESO',
                'COMPRA_REFACCIONES',
                'Compra Proveedor: ' || COALESCE(v_proveedor_nombre, 'Externo') || ' | Folio: ' || COALESCE(NEW.folio_ticket_nota, 'S/F') || ' | ' || COALESCE(NEW.descripcion, 'Refacción'),
                NEW.monto_costo,
                'Efectivo',
                NEW.folio_ticket_nota,
                NEW.evidencia_url,
                NEW.usuario_id
            ) RETURNING id INTO v_mov_id;

            NEW.caja_movimiento_id := v_mov_id;
        END IF;

    ELSIF NEW.fuente_pago = 'FONDO_RESERVA' AND NEW.monto_costo > 0 THEN
        NEW.caja_fondo_id := COALESCE(NEW.caja_fondo_id, v_fondo_reserva_id);
        NEW.estatus_pago := 'PAGADO';
        NEW.monto_pagado := NEW.monto_costo;
        NEW.monto_saldo_pendiente := 0.00;

        IF NEW.caja_movimiento_id IS NULL THEN
            INSERT INTO public.caja_movimientos (
                empresa_id,
                sucursal_id,
                caja_turno_id,
                caja_fondo_id,
                tipo,
                categoria,
                concepto,
                monto,
                metodo,
                folio_ticket,
                comprobante_url,
                usuario_id
            ) VALUES (
                NEW.empresa_id,
                NEW.sucursal_id,
                v_turno_id,
                NEW.caja_fondo_id,
                'EGRESO',
                'COMPRA_REFACCIONES_RESERVA',
                'Compra Proveedor (Fondo Reserva): ' || COALESCE(v_proveedor_nombre, 'Externo') || ' | Folio: ' || COALESCE(NEW.folio_ticket_nota, 'S/F'),
                NEW.monto_costo,
                'Efectivo',
                NEW.folio_ticket_nota,
                NEW.evidencia_url,
                NEW.usuario_id
            ) RETURNING id INTO v_mov_id;

            NEW.caja_movimiento_id := v_mov_id;
        END IF;

    ELSIF NEW.fuente_pago = 'CREDITO_PENDIENTE' THEN
        NEW.estatus_pago := 'PENDIENTE';
        NEW.monto_pagado := 0.00;
        NEW.monto_saldo_pendiente := NEW.monto_costo;

        -- Incrementar saldo deudor del proveedor
        UPDATE public.proveedores
        SET saldo_deudor_actual = saldo_deudor_actual + NEW.monto_costo,
            updated_at = timezone('utc'::text, now())
        WHERE id = NEW.proveedor_id;
    ELSE
        -- Transferencia u otro
        NEW.estatus_pago := 'PAGADO';
        NEW.monto_pagado := NEW.monto_costo;
        NEW.monto_saldo_pendiente := 0.00;
    END IF;

    RETURN NEW;
END;
$function$;
