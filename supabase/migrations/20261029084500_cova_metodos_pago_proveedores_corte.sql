-- ==============================================================================
-- MIGRATION: 20261029084500_cova_metodos_pago_proveedores_corte.sql
-- DESCRIPTION: Métodos de pago autogestionables por tenant con MSI y comisiones,
--              módulo maestro de proveedores con bodega de evidencias y garantías,
--              cuentas por pagar (CxP), y snapshot extendido de auditoría de corte diario.
-- ==============================================================================

-- 1. AMPLIAR TABLA cuentas_bancarias
ALTER TABLE public.cuentas_bancarias ADD COLUMN IF NOT EXISTS es_fiscal BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.cuentas_bancarias ADD COLUMN IF NOT EXISTS tipo_cuenta TEXT DEFAULT 'OPERATIVA';

-- 2. TABLA: tenant_metodos_pago (Infraestructura autogestionable de métodos y terminales)
CREATE TABLE IF NOT EXISTS public.tenant_metodos_pago (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    sucursal_id UUID REFERENCES public.sucursales(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('EFECTIVO', 'TRANSFERENCIA', 'TARJETA_DEBITO', 'TARJETA_CREDITO', 'MSI', 'BNPL', 'OTRO')),
    proveedor TEXT NOT NULL, -- 'Efectivo', 'Mercado Pago', 'BanBajío', 'BBVA', 'Inbursa', 'Stripe', etc.
    plazo_msi INT DEFAULT NULL, -- 3, 6, 9, 12 o NULL
    comision_porcentaje NUMERIC(6,4) NOT NULL DEFAULT 0.0000, -- ej. 3.5% = 3.5000
    comision_fija NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    comision_iva_incluido BOOLEAN NOT NULL DEFAULT true,
    cuenta_bancaria_id UUID REFERENCES public.cuentas_bancarias(id) ON DELETE SET NULL,
    caja_fondo_id UUID REFERENCES public.caja_fondos(id) ON DELETE SET NULL,
    es_fiscal BOOLEAN NOT NULL DEFAULT false,
    activo BOOLEAN NOT NULL DEFAULT true,
    icono TEXT,
    color TEXT,
    orden INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_tenant_metodos_pago_empresa ON public.tenant_metodos_pago(empresa_id, activo);

-- 3. TABLA: proveedores (Directorio maestro de proveedores con crédito y garantías)
CREATE TABLE IF NOT EXISTS public.proveedores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    sucursal_id UUID REFERENCES public.sucursales(id) ON DELETE CASCADE,
    nombre_comercial TEXT NOT NULL,
    razon_social TEXT,
    rfc TEXT,
    contacto_nombre TEXT,
    telefono TEXT,
    whatsapp TEXT,
    email TEXT,
    dias_credito INT NOT NULL DEFAULT 0, -- 0 = Contado, 7, 15, 30 días
    limite_credito NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    saldo_deudor_actual NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    meses_garantia_default INT NOT NULL DEFAULT 1,
    condiciones_garantia TEXT,
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_proveedores_empresa ON public.proveedores(empresa_id, activo);

-- 4. TABLA: compras_proveedores (Compras directas, buyouts y refacciones con evidencias fotográficas/PDF)
CREATE TABLE IF NOT EXISTS public.compras_proveedores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    sucursal_id UUID REFERENCES public.sucursales(id) ON DELETE CASCADE,
    proveedor_id UUID NOT NULL REFERENCES public.proveedores(id) ON DELETE RESTRICT,
    orden_servicio_id UUID REFERENCES public.ordenes_servicio(id) ON DELETE SET NULL,
    cotizacion_id UUID REFERENCES public.cotizaciones(id) ON DELETE SET NULL,
    folio_ticket_nota TEXT NOT NULL,
    descripcion TEXT NOT NULL,
    monto_costo NUMERIC(12,2) NOT NULL CHECK (monto_costo >= 0),
    fuente_pago TEXT NOT NULL CHECK (fuente_pago IN ('CAJA_CHICA', 'FONDO_RESERVA', 'TRANSFERENCIA', 'CREDITO_PENDIENTE')),
    cuenta_bancaria_id UUID REFERENCES public.cuentas_bancarias(id) ON DELETE SET NULL,
    caja_turno_id UUID REFERENCES public.caja_turnos(id) ON DELETE SET NULL,
    caja_fondo_id UUID REFERENCES public.caja_fondos(id) ON DELETE SET NULL,
    caja_movimiento_id UUID REFERENCES public.caja_movimientos(id) ON DELETE SET NULL,
    estatus_pago TEXT NOT NULL DEFAULT 'PAGADO' CHECK (estatus_pago IN ('PAGADO', 'PENDIENTE', 'PARCIAL', 'VENCIDO', 'CANCELADO')),
    monto_pagado NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    monto_saldo_pendiente NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    fecha_compra DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_limite_pago DATE,
    evidencia_url TEXT,
    evidencia_storage_path TEXT,
    evidencia_tipo TEXT CHECK (evidencia_tipo IN ('IMAGE', 'PDF', 'OTHER')),
    meses_garantia INT NOT NULL DEFAULT 1,
    fecha_vencimiento_garantia DATE,
    estatus_garantia TEXT NOT NULL DEFAULT 'VIGENTE' CHECK (estatus_garantia IN ('VIGENTE', 'EXPIRADA', 'EN_RECLAMACION', 'APLICADA', 'RECHAZADA')),
    notas_garantia TEXT,
    usuario_id UUID REFERENCES public.perfiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_compras_proveedores_proveedor ON public.compras_proveedores(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_compras_proveedores_turno ON public.compras_proveedores(caja_turno_id);
CREATE INDEX IF NOT EXISTS idx_compras_proveedores_orden ON public.compras_proveedores(orden_servicio_id);

-- 5. TABLA: proveedores_abonos (Cuentas por Pagar - Pagos / Liquidaciones de crédito)
CREATE TABLE IF NOT EXISTS public.proveedores_abonos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    sucursal_id UUID REFERENCES public.sucursales(id) ON DELETE CASCADE,
    proveedor_id UUID NOT NULL REFERENCES public.proveedores(id) ON DELETE CASCADE,
    compra_id UUID REFERENCES public.compras_proveedores(id) ON DELETE SET NULL,
    monto NUMERIC(12,2) NOT NULL CHECK (monto > 0),
    metodo_pago TEXT NOT NULL CHECK (metodo_pago IN ('EFECTIVO_CAJA', 'FONDO_RESERVA', 'TRANSFERENCIA', 'OTRO')),
    caja_turno_id UUID REFERENCES public.caja_turnos(id) ON DELETE SET NULL,
    caja_fondo_id UUID REFERENCES public.caja_fondos(id) ON DELETE SET NULL,
    caja_movimiento_id UUID REFERENCES public.caja_movimientos(id) ON DELETE SET NULL,
    cuenta_bancaria_id UUID REFERENCES public.cuentas_bancarias(id) ON DELETE SET NULL,
    referencia TEXT,
    comprobante_url TEXT,
    usuario_id UUID REFERENCES public.perfiles(id) ON DELETE SET NULL,
    fecha_abono TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_proveedores_abonos_proveedor ON public.proveedores_abonos(proveedor_id);

-- 6. TABLA: tenant_kpi_categorias (Registro del Día: Métricas operativas de taller configurables)
CREATE TABLE IF NOT EXISTS public.tenant_kpi_categorias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    unidad TEXT NOT NULL DEFAULT 'PZ', -- 'PZ', 'PAR', 'SERV'
    keywords TEXT[] NOT NULL DEFAULT '{}',
    orden INT NOT NULL DEFAULT 0,
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_tenant_kpi_categorias_empresa ON public.tenant_kpi_categorias(empresa_id, activo);

-- 7. AMPLIAR TABLA pagos_orden PARA COMISIONES Y MSI
ALTER TABLE public.pagos_orden ADD COLUMN IF NOT EXISTS comision_monto NUMERIC(12,2) NOT NULL DEFAULT 0.00;
ALTER TABLE public.pagos_orden ADD COLUMN IF NOT EXISTS monto_neto NUMERIC(12,2);
ALTER TABLE public.pagos_orden ADD COLUMN IF NOT EXISTS plazo_msi INT DEFAULT NULL;
ALTER TABLE public.pagos_orden ADD COLUMN IF NOT EXISTS tenant_metodo_pago_id UUID REFERENCES public.tenant_metodos_pago(id) ON DELETE SET NULL;

-- 8. AMPLIAR TABLA orden_servicio_refacciones
ALTER TABLE public.orden_servicio_refacciones ADD COLUMN IF NOT EXISTS compra_proveedor_id UUID REFERENCES public.compras_proveedores(id) ON DELETE SET NULL;
ALTER TABLE public.orden_servicio_refacciones ADD COLUMN IF NOT EXISTS proveedor_id UUID REFERENCES public.proveedores(id) ON DELETE SET NULL;
ALTER TABLE public.orden_servicio_refacciones ADD COLUMN IF NOT EXISTS folio_ticket_nota TEXT;
ALTER TABLE public.orden_servicio_refacciones ADD COLUMN IF NOT EXISTS fuente_pago TEXT DEFAULT 'CAJA_CHICA';
ALTER TABLE public.orden_servicio_refacciones ADD COLUMN IF NOT EXISTS evidencia_url TEXT;

-- 9. TRIGGERS AUTOMÁTICOS PARA COMPRAS A PROVEEDOR Y CAJA CHICA

CREATE OR REPLACE FUNCTION public.fn_trg_compra_proveedor_proc()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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

    -- Si se pagó con CAJA_CHICA, generar egreso automático en caja_movimientos
    IF NEW.fuente_pago = 'CAJA_CHICA' AND NEW.monto_costo > 0 THEN
        NEW.caja_fondo_id := COALESCE(NEW.caja_fondo_id, v_fondo_operativo_id);
        NEW.estatus_pago := 'PAGADO';
        NEW.monto_pagado := NEW.monto_costo;
        NEW.monto_saldo_pendiente := 0.00;

        INSERT INTO public.caja_movimientos (
            empresa_id,
            sucursal_id,
            caja_turno_id,
            caja_fondo_id,
            tipo,
            categoria,
            concepto,
            monto,
            usuario_id
        ) VALUES (
            NEW.empresa_id,
            NEW.sucursal_id,
            v_turno_id,
            NEW.caja_fondo_id,
            'EGRESO',
            'COMPRA_REFACCIONES',
            'Compra Proveedor: ' || COALESCE(v_proveedor_nombre, 'Externo') || ' | Folio: ' || NEW.folio_ticket_nota || ' | ' || NEW.descripcion,
            NEW.monto_costo,
            NEW.usuario_id
        ) RETURNING id INTO v_mov_id;

        NEW.caja_movimiento_id := v_mov_id;

    ELSIF NEW.fuente_pago = 'FONDO_RESERVA' AND NEW.monto_costo > 0 THEN
        NEW.caja_fondo_id := COALESCE(NEW.caja_fondo_id, v_fondo_reserva_id);
        NEW.estatus_pago := 'PAGADO';
        NEW.monto_pagado := NEW.monto_costo;
        NEW.monto_saldo_pendiente := 0.00;

        INSERT INTO public.caja_movimientos (
            empresa_id,
            sucursal_id,
            caja_turno_id,
            caja_fondo_id,
            tipo,
            categoria,
            concepto,
            monto,
            usuario_id
        ) VALUES (
            NEW.empresa_id,
            NEW.sucursal_id,
            v_turno_id,
            NEW.caja_fondo_id,
            'EGRESO',
            'COMPRA_REFACCIONES_RESERVA',
            'Compra Proveedor (Fondo Reserva): ' || COALESCE(v_proveedor_nombre, 'Externo') || ' | Folio: ' || NEW.folio_ticket_nota,
            NEW.monto_costo,
            NEW.usuario_id
        ) RETURNING id INTO v_mov_id;

        NEW.caja_movimiento_id := v_mov_id;

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
$$;

DROP TRIGGER IF EXISTS trg_compra_proveedor_before_insert ON public.compras_proveedores;
CREATE TRIGGER trg_compra_proveedor_before_insert
    BEFORE INSERT ON public.compras_proveedores
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_trg_compra_proveedor_proc();

-- Trigger para Abonos a Proveedores
CREATE OR REPLACE FUNCTION public.fn_trg_abono_proveedor_proc()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_mov_id UUID;
    v_proveedor_nombre TEXT;
    v_fondo_operativo_id UUID;
BEGIN
    SELECT nombre_comercial INTO v_proveedor_nombre
    FROM public.proveedores
    WHERE id = NEW.proveedor_id;

    -- Si el abono se hace en efectivo de caja chica
    IF NEW.metodo_pago = 'EFECTIVO_CAJA' THEN
        SELECT id INTO v_fondo_operativo_id
        FROM public.caja_fondos
        WHERE sucursal_id = NEW.sucursal_id AND tipo = 'OPERATIVO'
        LIMIT 1;

        NEW.caja_fondo_id := COALESCE(NEW.caja_fondo_id, v_fondo_operativo_id);

        INSERT INTO public.caja_movimientos (
            empresa_id,
            sucursal_id,
            caja_turno_id,
            caja_fondo_id,
            tipo,
            categoria,
            concepto,
            monto,
            usuario_id
        ) VALUES (
            NEW.empresa_id,
            NEW.sucursal_id,
            NEW.caja_turno_id,
            NEW.caja_fondo_id,
            'EGRESO',
            'PAGO_PROVEEDOR_CREDITO',
            'Abono a Proveedor: ' || COALESCE(v_proveedor_nombre, 'Externo') || ' | Ref: ' || COALESCE(NEW.referencia, 'S/R'),
            NEW.monto,
            NEW.usuario_id
        ) RETURNING id INTO v_mov_id;

        NEW.caja_movimiento_id := v_mov_id;
    END IF;

    -- Reducir saldo deudor del proveedor
    UPDATE public.proveedores
    SET saldo_deudor_actual = GREATEST(0, saldo_deudor_actual - NEW.monto),
        updated_at = timezone('utc'::text, now())
    WHERE id = NEW.proveedor_id;

    -- Si está ligado a una compra específica, actualizar su saldo
    IF NEW.compra_id IS NOT NULL THEN
        UPDATE public.compras_proveedores
        SET monto_pagado = monto_pagado + NEW.monto,
            monto_saldo_pendiente = GREATEST(0, monto_saldo_pendiente - NEW.monto),
            estatus_pago = CASE 
                WHEN GREATEST(0, monto_saldo_pendiente - NEW.monto) = 0 THEN 'PAGADO' 
                ELSE 'PARCIAL' 
            END,
            updated_at = timezone('utc'::text, now())
        WHERE id = NEW.compra_id;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_abono_proveedor_before_insert ON public.proveedores_abonos;
CREATE TRIGGER trg_abono_proveedor_before_insert
    BEFORE INSERT ON public.proveedores_abonos
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_trg_abono_proveedor_proc();

-- 10. RPC: SNAPSHOT CONSOLIDADO DE CORTE DIARIO PARA AUDITORÍA DE ADMINISTRADORA
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
        ), 0),
        'salidas_gastos', COALESCE((
            SELECT SUM(monto) FROM public.caja_movimientos 
            WHERE caja_turno_id = p_turno_id 
              AND tipo = 'EGRESO'
        ), 0),
        'saldo_teorico', COALESCE(v_turno.monto_cierre_teorico_f1, 0),
        'cierre_declarado', v_turno.monto_cierre_declarado_f1,
        'diferencia', v_turno.diferencia_f1,
        'remesa_retirada', v_turno.monto_remesa_retirada,
        'fondo_siguiente', v_turno.monto_fondo_siguiente_f1,
        'justificacion_descuadre', v_turno.justificacion_descuadre
    ) INTO v_efectivo;

    -- B. Resumen SPEI Cuentas Bancarias
    SELECT jsonb_agg(
        jsonb_build_object(
            'cuenta_id', cb.id,
            'banco', cb.banco,
            'alias', cb.alias,
            'es_fiscal', cb.es_fiscal,
            'total', COALESCE(SUM(po.monto_total), 0),
            'conteo', COUNT(po.id)
        )
    ) INTO v_bancos
    FROM public.cuentas_bancarias cb
    LEFT JOIN public.pagos_orden po 
        ON po.cuenta_bancaria_id = cb.id 
       AND po.caja_turno_id = p_turno_id 
       AND po.estatus IN ('Aprobado', 'COMPLETADO')
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
               AND proveedor_pago IN ('Tarjeta', 'Terminal', 'Mercado Pago')
               AND estatus IN ('Aprobado', 'COMPLETADO')
             GROUP BY metodo_detalle, plazo_msi),
             '[]'::jsonb
        )
    ) INTO v_tarjetas
    FROM public.pagos_orden
    WHERE caja_turno_id = p_turno_id
      AND proveedor_pago IN ('Tarjeta', 'Terminal', 'Mercado Pago')
      AND estatus IN ('Aprobado', 'COMPLETADO');

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
      AND po.estatus IN ('Aprobado', 'COMPLETADO');

    -- Total de costos del turno (compras directas de refacciones)
    SELECT COALESCE(SUM(monto_costo), 0)
    INTO v_total_costos
    FROM public.compras_proveedores
    WHERE caja_turno_id = p_turno_id;

    v_ganancia_neta := v_total_ventas_netas - v_total_costos;

    -- Ganancia en Cuentas Fiscales (pagos que cayeron a cuentas bancarias fiscales o ventas marcadas como fiscales)
    SELECT COALESCE(SUM(COALESCE(po.monto_neto, po.monto_total - po.comision_monto)), 0)
    INTO v_ganancia_fiscal
    FROM public.pagos_orden po
    LEFT JOIN public.cuentas_bancarias cb ON cb.id = po.cuenta_bancaria_id
    WHERE po.caja_turno_id = p_turno_id
      AND po.estatus IN ('Aprobado', 'COMPLETADO')
      AND (cb.es_fiscal = true);

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
                JOIN public.ordenes_servicio os ON os.id = osr.orden_servicio_id
                JOIN public.pagos_orden po ON po.orden_servicio_id = os.id
                WHERE po.caja_turno_id = p_turno_id
                  AND (
                    osr.nombre ILIKE ANY(cat.keywords)
                    OR osr.numero_parte ILIKE ANY(cat.keywords)
                  )
            ), 0)
        )
        ORDER BY cat.orden ASC
    ), '[]'::jsonb) INTO v_kpis
    FROM public.tenant_kpi_categorias cat
    WHERE cat.empresa_id = v_turno.empresa_id AND cat.activo = true;

    RETURN jsonb_build_object(
        'success', true,
        'turno_id', p_turno_id,
        'estado', v_turno.estado,
        'fecha_apertura', v_turno.fecha_apertura,
        'fecha_cierre', v_turno.fecha_cierre,
        'efectivo', v_efectivo,
        'bancos', COALESCE(v_bancos, '[]'::jsonb),
        'tarjetas', v_tarjetas,
        'proveedores', v_proveedores,
        'fiscal', v_fiscal,
        'registro_del_dia', v_kpis
    );
END;
$$;

-- 11. POLÍTICAS RLS EN NUEVAS TABLAS
ALTER TABLE public.tenant_metodos_pago ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Aislamiento SaaS tenant_metodos_pago" ON public.tenant_metodos_pago;
CREATE POLICY "Aislamiento SaaS tenant_metodos_pago" ON public.tenant_metodos_pago
    FOR ALL TO authenticated
    USING (empresa_id = public.user_empresa_id())
    WITH CHECK (empresa_id = public.user_empresa_id());

ALTER TABLE public.proveedores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Aislamiento SaaS proveedores" ON public.proveedores;
CREATE POLICY "Aislamiento SaaS proveedores" ON public.proveedores
    FOR ALL TO authenticated
    USING (empresa_id = public.user_empresa_id())
    WITH CHECK (empresa_id = public.user_empresa_id());

ALTER TABLE public.compras_proveedores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Aislamiento SaaS compras_proveedores" ON public.compras_proveedores;
CREATE POLICY "Aislamiento SaaS compras_proveedores" ON public.compras_proveedores
    FOR ALL TO authenticated
    USING (empresa_id = public.user_empresa_id())
    WITH CHECK (empresa_id = public.user_empresa_id());

ALTER TABLE public.proveedores_abonos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Aislamiento SaaS proveedores_abonos" ON public.proveedores_abonos;
CREATE POLICY "Aislamiento SaaS proveedores_abonos" ON public.proveedores_abonos
    FOR ALL TO authenticated
    USING (empresa_id = public.user_empresa_id())
    WITH CHECK (empresa_id = public.user_empresa_id());

ALTER TABLE public.tenant_kpi_categorias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Aislamiento SaaS tenant_kpi_categorias" ON public.tenant_kpi_categorias;
CREATE POLICY "Aislamiento SaaS tenant_kpi_categorias" ON public.tenant_kpi_categorias
    FOR ALL TO authenticated
    USING (empresa_id = public.user_empresa_id())
    WITH CHECK (empresa_id = public.user_empresa_id());

-- 12. STORAGE BUCKET PARA EVIDENCIAS DE PROVEEDORES
INSERT INTO storage.buckets (id, name, public) 
VALUES ('proveedores-evidencias', 'proveedores-evidencias', true) 
ON CONFLICT (id) DO NOTHING;

-- 13. SEED DATA OFICIAL PARA COVA TIRES
DO $$
DECLARE
    v_cova_empresa_id UUID := 'b2ad09db-0a34-4876-9ca3-d584c40bd294';
    v_cova_sucursal_id UUID := 'b2ad09db-0a34-4876-9ca3-d584c40bd295';
    v_bbva_id UUID := 'c1000000-0000-0000-0000-000000000001';
    v_banbajio_id UUID := 'c1000000-0000-0000-0000-000000000004';
    v_inbursa_id UUID := 'c1000000-0000-0000-0000-000000000005';
    v_mp_cuenta_id UUID := 'c1000000-0000-0000-0000-000000000006';
    v_fondo_operativo_id UUID := 'c0000000-0000-0000-0000-000000000001';
BEGIN
    -- Asegurar cuentas bancarias oficiales de Cova Tires
    -- 1. BBVA Fiscal
    UPDATE public.cuentas_bancarias 
    SET es_fiscal = true, tipo_cuenta = 'FISCAL' 
    WHERE id = v_bbva_id;

    -- 2. BanBajío (Fiscal)
    INSERT INTO public.cuentas_bancarias (id, empresa_id, sucursal_id, banco, alias, titular, clabe, numero_cuenta, es_fiscal, tipo_cuenta)
    VALUES (v_banbajio_id, v_cova_empresa_id, v_cova_sucursal_id, 'BanBajío', 'BanBajío Fiscal', 'Cova Tires S.A. de C.V.', '030580900011223344', '9000112233', true, 'FISCAL')
    ON CONFLICT (id) DO UPDATE SET es_fiscal = true;

    -- 3. Inbursa (Operativa)
    INSERT INTO public.cuentas_bancarias (id, empresa_id, sucursal_id, banco, alias, titular, clabe, numero_cuenta, es_fiscal, tipo_cuenta)
    VALUES (v_inbursa_id, v_cova_empresa_id, v_cova_sucursal_id, 'Inbursa', 'Inbursa Operativa', 'Cova Tires Servicios', '036580004488992211', '0044889922', false, 'OPERATIVA')
    ON CONFLICT (id) DO NOTHING;

    -- 4. Mercado Pago Cuenta Wallet (Operativa)
    INSERT INTO public.cuentas_bancarias (id, empresa_id, sucursal_id, banco, alias, titular, clabe, numero_cuenta, es_fiscal, tipo_cuenta)
    VALUES (v_mp_cuenta_id, v_cova_empresa_id, v_cova_sucursal_id, 'Mercado Pago', 'Mercado Pago Wallet', 'Cova Tires MP', '722580102938475610', '1029384756', false, 'OPERATIVA')
    ON CONFLICT (id) DO NOTHING;

    -- Sembrar Métodos de Pago de Cova Tires
    INSERT INTO public.tenant_metodos_pago 
        (empresa_id, sucursal_id, nombre, tipo, proveedor, plazo_msi, comision_porcentaje, comision_fija, cuenta_bancaria_id, caja_fondo_id, es_fiscal, orden)
    VALUES
        (v_cova_empresa_id, v_cova_sucursal_id, 'Efectivo', 'EFECTIVO', 'Efectivo', NULL, 0.0000, 0.00, NULL, v_fondo_operativo_id, false, 1),
        (v_cova_empresa_id, v_cova_sucursal_id, 'Transferencia BBVA (Fiscal)', 'TRANSFERENCIA', 'BBVA', NULL, 0.0000, 0.00, v_bbva_id, NULL, true, 2),
        (v_cova_empresa_id, v_cova_sucursal_id, 'Transferencia BanBajío (Fiscal)', 'TRANSFERENCIA', 'BanBajío', NULL, 0.0000, 0.00, v_banbajio_id, NULL, true, 3),
        (v_cova_empresa_id, v_cova_sucursal_id, 'Transferencia Inbursa', 'TRANSFERENCIA', 'Inbursa', NULL, 0.0000, 0.00, v_inbursa_id, NULL, false, 4),
        (v_cova_empresa_id, v_cova_sucursal_id, 'Transferencia Mercado Pago', 'TRANSFERENCIA', 'Mercado Pago', NULL, 0.0000, 0.00, v_mp_cuenta_id, NULL, false, 5),
        (v_cova_empresa_id, v_cova_sucursal_id, 'BanBajío Tarjeta (TPV)', 'TARJETA_CREDITO', 'BanBajío', NULL, 2.0000, 0.00, v_banbajio_id, NULL, true, 6),
        (v_cova_empresa_id, v_cova_sucursal_id, 'Mercado Pago Tarjeta (1 Exhibición)', 'TARJETA_CREDITO', 'Mercado Pago', NULL, 3.5000, 0.00, v_mp_cuenta_id, NULL, false, 7),
        (v_cova_empresa_id, v_cova_sucursal_id, 'Mercado Pago 3 Meses Sin Intereses', 'MSI', 'Mercado Pago', 3, 7.5000, 0.00, v_mp_cuenta_id, NULL, false, 8),
        (v_cova_empresa_id, v_cova_sucursal_id, 'Mercado Pago 6 Meses Sin Intereses', 'MSI', 'Mercado Pago', 6, 11.5000, 0.00, v_mp_cuenta_id, NULL, false, 9),
        (v_cova_empresa_id, v_cova_sucursal_id, 'Mercado Pago 9 Meses Sin Intereses', 'MSI', 'Mercado Pago', 9, 15.5000, 0.00, v_mp_cuenta_id, NULL, false, 10),
        (v_cova_empresa_id, v_cova_sucursal_id, 'Mercado Pago 12 Meses Sin Intereses', 'MSI', 'Mercado Pago', 12, 19.5000, 0.00, v_mp_cuenta_id, NULL, false, 11)
    ON CONFLICT DO NOTHING;

    -- Sembrar Proveedores Clave de Cova Tires
    INSERT INTO public.proveedores 
        (empresa_id, sucursal_id, nombre_comercial, razon_social, rfc, contacto_nombre, telefono, whatsapp, dias_credito, limite_credito, meses_garantia_default)
    VALUES
        (v_cova_empresa_id, v_cova_sucursal_id, 'AutoZone Comercial', 'AutoZone de México S. de R.L. de C.V.', 'AME980101XYZ', 'Mostrador Comercial', '+528181234567', '+528181234567', 30, 50000.00, 3),
        (v_cova_empresa_id, v_cova_sucursal_id, 'Llantas del Pacífico (Mayorista)', 'Distribuidora Llantera del Norte S.A.', 'DLN050212ABC', 'Lic. Fernando Ortiz', '+528189876543', '+528189876543', 15, 100000.00, 12),
        (v_cova_empresa_id, v_cova_sucursal_id, 'Refaccionaria California', 'California Refacciones S.A.', 'CRE081119KK2', 'Atención Talleres', '+528183456789', '+528183456789', 7, 25000.00, 1),
        (v_cova_empresa_id, v_cova_sucursal_id, 'Taller El Güero (Maquilas y Torno)', 'José Guadalupe López', 'GULJ750404M99', 'El Güero', '+528187654321', '+528187654321', 0, 0.00, 1)
    ON CONFLICT DO NOTHING;

    -- Sembrar Categorías para el Registro del Día (Machote de Cova)
    INSERT INTO public.tenant_kpi_categorias (empresa_id, nombre, unidad, keywords, orden)
    VALUES
        (v_cova_empresa_id, '#LLANTA NUEVA', 'PZ', ARRAY['%nueva%', '%llanta nueva%', '%neumatico nuevo%', '%r13%', '%r14%', '%r15%', '%r16%', '%r17%', '%r18%', '%r19%', '%r20%'], 1),
        (v_cova_empresa_id, '#LLANTA USADA', 'PZ', ARRAY['%usada%', '%gallito%', '%seminueva%', '%media vida%'], 2),
        (v_cova_empresa_id, '#AMORT', 'PZ', ARRAY['%amortiguador%', '%amortiguadores%', '%strut%', '%suspension%'], 3),
        (v_cova_empresa_id, '#DESPONCHES', 'PZ', ARRAY['%desponche%', '%parche%', '%vulcanizado%', '%camara%'], 4),
        (v_cova_empresa_id, '#ALINEACIONES', 'PZ', ARRAY['%alineacion%', '%alineación%', '%balanceo%'], 5),
        (v_cova_empresa_id, '#BALATAS', 'PARES', ARRAY['%balata%', '%balatas%', '%frenos%', '%disco%', '%pastillas%'], 6)
    ON CONFLICT DO NOTHING;

END $$;
