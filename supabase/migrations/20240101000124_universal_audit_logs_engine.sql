-- 20240101000124_universal_audit_logs_engine.sql
-- Motor de Auditoría Forense y Operativa Universal (Audit Logs Enterprise) para TallerTrack
-- Diseñado con principios de inmutabilidad atómica (CDC triggers), detección inteligente de diffs en JSONB,
-- traducción a lenguaje natural y protección criptográfica/anti-manipulación.

-- 1. TABLA PRINCIPAL DE AUDITORÍA FORENSE INMUTABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  sucursal_id UUID REFERENCES public.sucursales(id) ON DELETE SET NULL,

  -- Identidad del Actor
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_nombre TEXT NOT NULL DEFAULT 'Sistema',
  actor_rol TEXT NOT NULL DEFAULT 'Sistema',
  ip_address TEXT,
  user_agent TEXT,

  -- Identidad de la Entidad Afectada
  entity_type VARCHAR(60) NOT NULL,          -- 'ordenes_servicio', 'cotizaciones', 'caja_turnos', 'inventario', etc.
  entity_id UUID NOT NULL,
  entity_label TEXT,                          -- Ej: "Orden #1042", "Turno #15 (Matriz)", "Michelin 205/55R16"

  -- Acción y Severidad
  action VARCHAR(40) NOT NULL,               -- 'INSERT', 'UPDATE', 'DELETE', 'STATUS_CHANGE', 'VOID', 'DISCOUNT_OVERRIDE', 'CUSTOM'
  severity VARCHAR(20) NOT NULL DEFAULT 'INFO' CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL')),

  -- Traducción Humana y Razonamiento
  summary TEXT NOT NULL,                     -- Resumen en lenguaje natural entendible para usuarios finales
  motivo TEXT,                               -- Justificación o motivo de negocio (para cancelaciones, descuentos, etc.)
  changes JSONB DEFAULT '{}'::jsonb,         -- Detección atómica de cambios: { "campo": { "old": val1, "new": val2 } }
  snapshot JSONB,                            -- Registro completo post-evento para análisis forense

  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. ÍNDICES DE ALTO RENDIMIENTO
CREATE INDEX IF NOT EXISTS idx_audit_logs_empresa_date ON public.audit_logs (empresa_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_lookup ON public.audit_logs (empresa_id, entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs (empresa_id, actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON public.audit_logs (empresa_id, severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_sucursal ON public.audit_logs (empresa_id, sucursal_id, created_at DESC);

-- 3. SEGURIDAD Y AISLAMIENTO MULTI-TENANT (RLS)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Aislamiento SaaS lectura audit_logs" ON public.audit_logs;
CREATE POLICY "Aislamiento SaaS lectura audit_logs" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (
    empresa_id = public.user_empresa_id()
    OR public.is_superadmin()
  );

DROP POLICY IF EXISTS "Aislamiento SaaS insercion audit_logs" ON public.audit_logs;
CREATE POLICY "Aislamiento SaaS insercion audit_logs" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    empresa_id = public.user_empresa_id()
    OR public.is_superadmin()
  );

-- 4. ESCUDO DE INMUTABILIDAD FORENSE (ANTI-TAMPERING)
-- Bloquea tajantemente cualquier intento de UPDATE o DELETE en la bitácora
CREATE OR REPLACE FUNCTION public.prevent_audit_log_tampering()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RAISE EXCEPTION 'Violación de Seguridad: Los registros de auditoría forense (audit_logs) son estrictamente inmutables. No se permite actualización ni eliminación.';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_audit_log_tampering ON public.audit_logs;
CREATE TRIGGER trg_prevent_audit_log_tampering
  BEFORE UPDATE OR DELETE ON public.audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_audit_log_tampering();

-- 5. FUNCIÓN DE CÁLCULO DE DIFERENCIAS (JSONB DIFF)
CREATE OR REPLACE FUNCTION public.jsonb_diff(
  old_rec JSONB,
  new_rec JSONB,
  ignored_keys TEXT[] DEFAULT ARRAY['updated_at'::text, 'created_at'::text]
)
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  diff JSONB := '{}'::jsonb;
  key_item TEXT;
  old_val JSONB;
  new_val JSONB;
BEGIN
  IF old_rec IS NULL OR new_rec IS NULL THEN
    RETURN '{}'::jsonb;
  END IF;

  FOR key_item IN SELECT jsonb_object_keys(new_rec)
  LOOP
    IF NOT (key_item = ANY(ignored_keys)) THEN
      old_val := old_rec -> key_item;
      new_val := new_rec -> key_item;

      IF old_val IS DISTINCT FROM new_val THEN
        diff := diff || jsonb_build_object(
          key_item,
          jsonb_build_object('old', old_val, 'new', new_val)
        );
      END IF;
    END IF;
  END LOOP;

  RETURN diff;
END;
$$;

-- 6. MOTOR GENERAL DE AUDITORÍA AUTOMÁTICA EN BASE DE DATOS (TRIGGER CDC)
CREATE OR REPLACE FUNCTION public.process_audit_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
  current_empresa_id UUID;
  current_sucursal_id UUID;
  current_actor_nombre TEXT := 'Sistema';
  current_actor_rol TEXT := 'Sistema';
  entity_type_name VARCHAR(60);
  entity_primary_id UUID;
  label_text TEXT := '';
  summary_text TEXT := '';
  motivo_text TEXT := NULL;
  op_action VARCHAR(40);
  event_severity VARCHAR(20) := 'INFO';
  computed_diff JSONB := '{}'::jsonb;
  old_json JSONB := NULL;
  new_json JSONB := NULL;
  headers_json JSONB;
  client_ip TEXT := NULL;
  client_agent TEXT := NULL;
BEGIN
  -- Identificar la tabla y operación
  entity_type_name := TG_TABLE_NAME;
  op_action := TG_OP;

  IF TG_OP = 'DELETE' THEN
    old_json := to_jsonb(OLD);
    entity_primary_id := OLD.id;
  ELSIF TG_OP = 'UPDATE' THEN
    old_json := to_jsonb(OLD);
    new_json := to_jsonb(NEW);
    entity_primary_id := NEW.id;
  ELSE -- INSERT
    new_json := to_jsonb(NEW);
    entity_primary_id := NEW.id;
  END IF;

  -- 1. Intentar resolver contexto del usuario autenticado
  current_user_id := auth.uid();
  IF current_user_id IS NOT NULL THEN
    SELECT p.nombre, p.rol, p.empresa_id, p.sucursal_id
    INTO current_actor_nombre, current_actor_rol, current_empresa_id, current_sucursal_id
    FROM public.perfiles p
    WHERE p.id = current_user_id;

    IF current_actor_nombre IS NULL OR current_actor_nombre = '' THEN
      current_actor_nombre := 'Usuario (' || SUBSTRING(current_user_id::text, 1, 8) || ')';
    END IF;
  END IF;

  -- Intentar extraer contexto HTTP desde Supabase (si está disponible)
  BEGIN
    headers_json := current_setting('request.headers', true)::jsonb;
    IF headers_json IS NOT NULL THEN
      client_ip := headers_json ->> 'x-forwarded-for';
      client_agent := headers_json ->> 'user-agent';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    client_ip := NULL;
    client_agent := NULL;
  END;

  -- Obtener motivo contextual si fue inyectado en la transacción
  BEGIN
    motivo_text := NULLIF(current_setting('audit.motivo', true), '');
  EXCEPTION WHEN OTHERS THEN
    motivo_text := NULL;
  END;

  -- Determinar empresa_id de respaldo si el perfil no lo proveyó
  IF current_empresa_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN
      current_empresa_id := COALESCE(
        (old_json ->> 'empresa_id')::UUID,
        public.user_empresa_id()
      );
      current_sucursal_id := COALESCE(
        (old_json ->> 'sucursal_id')::UUID,
        current_sucursal_id
      );
    ELSE
      current_empresa_id := COALESCE(
        (new_json ->> 'empresa_id')::UUID,
        public.user_empresa_id()
      );
      current_sucursal_id := COALESCE(
        (new_json ->> 'sucursal_id')::UUID,
        current_sucursal_id
      );
    END IF;
  END IF;

  -- Si aún no hay empresa asociada (ej. script de inicialización), no podemos violar FK
  IF current_empresa_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- 2. Procesar Diff en caso de UPDATE
  IF TG_OP = 'UPDATE' THEN
    computed_diff := public.jsonb_diff(old_json, new_json);
    -- Si no hubo cambios reales (solo updated_at), salir inmediatamente sin saturar el log
    IF computed_diff = '{}'::jsonb THEN
      RETURN NEW;
    END IF;
  END IF;

  -- 3. Lógica Especializada por Dominio / Tabla
  CASE entity_type_name
    WHEN 'ordenes_servicio' THEN
      label_text := 'Orden de Servicio #' || COALESCE(
        new_json ->> 'folio',
        old_json ->> 'folio',
        SUBSTRING(entity_primary_id::text, 1, 6)
      );

      IF TG_OP = 'INSERT' THEN
        summary_text := 'Creó la orden en estado "' || COALESCE(new_json ->> 'estado', 'Citas del Día') || '"';
        event_severity := 'INFO';
      ELSIF TG_OP = 'UPDATE' THEN
        IF computed_diff ? 'estado' THEN
          op_action := 'STATUS_CHANGE';
          summary_text := 'Cambió el estado de "' || (computed_diff -> 'estado' ->> 'old') ||
                          '" a "' || (computed_diff -> 'estado' ->> 'new') || '"';
          IF (computed_diff -> 'estado' ->> 'new') = 'Cancelado' THEN
            event_severity := 'CRITICAL';
            op_action := 'VOID';
          ELSE
            event_severity := 'INFO';
          END IF;
        ELSIF computed_diff ? 'bahia_rampa' THEN
          summary_text := 'Reasignó la bahía a "' || (computed_diff -> 'bahia_rampa' ->> 'new') || '"';
          event_severity := 'INFO';
        ELSIF computed_diff ? 'fecha_promesa' THEN
          summary_text := 'Actualizó la fecha promesa de entrega del vehículo';
          event_severity := 'WARNING';
        ELSIF computed_diff ? 'checklist_recepcion' THEN
          summary_text := 'Actualizó los puntos del checklist de recepción o DVI';
          event_severity := 'INFO';
        ELSE
          summary_text := 'Actualizó información operativa de la orden';
          event_severity := 'INFO';
        END IF;
      ELSIF TG_OP = 'DELETE' THEN
        summary_text := 'Eliminó registro de la orden de servicio';
        event_severity := 'CRITICAL';
      END IF;

    WHEN 'cotizaciones' THEN
      label_text := 'Cotización #' || SUBSTRING(entity_primary_id::text, 1, 8);
      IF TG_OP = 'INSERT' THEN
        summary_text := 'Generó cotización por un monto de $' || COALESCE(new_json ->> 'total', '0.00');
        event_severity := 'INFO';
      ELSIF TG_OP = 'UPDATE' THEN
        IF computed_diff ? 'estatus' THEN
          op_action := 'STATUS_CHANGE';
          summary_text := 'Modificó estatus de cotización a "' || (computed_diff -> 'estatus' ->> 'new') || '"';
          IF (computed_diff -> 'estatus' ->> 'new') = 'Cancelada' THEN
            event_severity := 'CRITICAL';
          END IF;
        ELSIF computed_diff ? 'total' THEN
          op_action := 'DISCOUNT_OVERRIDE';
          summary_text := 'Ajustó el importe total de $' || (computed_diff -> 'total' ->> 'old') ||
                          ' a $' || (computed_diff -> 'total' ->> 'new');
          event_severity := 'WARNING';
        ELSE
          summary_text := 'Modificó las partidas o precios de la cotización';
          event_severity := 'INFO';
        END IF;
      ELSIF TG_OP = 'DELETE' THEN
        summary_text := 'Eliminó la cotización';
        event_severity := 'CRITICAL';
      END IF;

    WHEN 'caja_turnos' THEN
      label_text := 'Turno de Caja #' || SUBSTRING(entity_primary_id::text, 1, 8);
      IF TG_OP = 'INSERT' THEN
        summary_text := 'Aperturó turno de caja con fondo inicial de $' || COALESCE(new_json ->> 'monto_apertura', '0.00');
        event_severity := 'INFO';
      ELSIF TG_OP = 'UPDATE' THEN
        IF computed_diff ? 'estado' AND (computed_diff -> 'estado' ->> 'new') = 'CERRADO' THEN
          op_action := 'CASH_CLOSING';
          summary_text := 'Realizó el corte y cierre del turno de caja';
          IF COALESCE((new_json ->> 'diferencia_efectivo')::numeric, 0) != 0 THEN
            event_severity := 'CRITICAL';
            summary_text := summary_text || ' con descuadre de $' || (new_json ->> 'diferencia_efectivo');
          ELSE
            event_severity := 'INFO';
          END IF;
        ELSE
          summary_text := 'Actualizó parámetros del turno de caja';
        END IF;
      END IF;

    WHEN 'caja_movimientos' THEN
      label_text := 'Movimiento en Caja (' || COALESCE(new_json ->> 'tipo', old_json ->> 'tipo', 'EGRESO') || ')';
      IF TG_OP = 'INSERT' THEN
        summary_text := 'Registró ' || (new_json ->> 'tipo') || ' por $' || (new_json ->> 'monto') ||
                        ' (' || COALESCE(new_json ->> 'concepto', 'Sin concepto') || ')';
        IF (new_json ->> 'tipo') = 'EGRESO' AND (new_json ->> 'monto')::numeric >= 1000 THEN
          event_severity := 'WARNING';
        ELSE
          event_severity := 'INFO';
        END IF;
      END IF;

    WHEN 'inventario_llantas_base' THEN
      label_text := COALESCE(new_json ->> 'marca', old_json ->> 'marca', '') || ' ' ||
                    COALESCE(new_json ->> 'modelo_llanta', old_json ->> 'modelo_llanta', 'Neumático');
      IF TG_OP = 'INSERT' THEN
        summary_text := 'Dio de alta nuevo producto en inventario con ' || COALESCE(new_json ->> 'stock_actual', '0') || ' unidades';
        event_severity := 'INFO';
      ELSIF TG_OP = 'UPDATE' THEN
        IF computed_diff ? 'stock_actual' THEN
          op_action := 'STOCK_ADJUSTMENT';
          summary_text := 'Ajustó stock de ' || (computed_diff -> 'stock_actual' ->> 'old') ||
                          ' a ' || (computed_diff -> 'stock_actual' ->> 'new') || ' unidades';
          event_severity := 'WARNING';
        ELSIF computed_diff ? 'precio_venta' THEN
          summary_text := 'Modificó precio de venta de $' || (computed_diff -> 'precio_venta' ->> 'old') ||
                          ' a $' || (computed_diff -> 'precio_venta' ->> 'new');
          event_severity := 'WARNING';
        ELSE
          summary_text := 'Actualizó ficha técnica o ubicación del neumático';
          event_severity := 'INFO';
        END IF;
      END IF;

    WHEN 'perfiles' THEN
      label_text := 'Perfil: ' || COALESCE(new_json ->> 'nombre', old_json ->> 'nombre', 'Usuario');
      IF TG_OP = 'UPDATE' THEN
        IF computed_diff ? 'rol' THEN
          op_action := 'ROLE_ESCALATION';
          event_severity := 'CRITICAL';
          summary_text := 'Cambió rol de seguridad de "' || (computed_diff -> 'rol' ->> 'old') ||
                          '" a "' || (computed_diff -> 'rol' ->> 'new') || '"';
        ELSE
          summary_text := 'Actualizó datos de perfil de usuario';
          event_severity := 'INFO';
        END IF;
      END IF;

    WHEN 'vehiculos' THEN
      label_text := COALESCE(new_json ->> 'marca', old_json ->> 'marca', '') || ' ' ||
                    COALESCE(new_json ->> 'modelo', old_json ->> 'modelo', '') || ' (' ||
                    COALESCE(new_json ->> 'placas', old_json ->> 'placas', 'Sin Placas') || ')';
      IF TG_OP = 'INSERT' THEN
        summary_text := 'Registró vehículo en expediente clínico';
        event_severity := 'INFO';
      ELSIF TG_OP = 'UPDATE' THEN
        IF computed_diff ? 'placas' OR computed_diff ? 'vin' THEN
          summary_text := 'Modificó número de serie (VIN) o placas del vehículo';
          event_severity := 'WARNING';
        ELSE
          summary_text := 'Actualizó información del vehículo en expediente clínico';
          event_severity := 'INFO';
        END IF;
      END IF;

    ELSE
      label_text := entity_type_name || ' #' || SUBSTRING(entity_primary_id::text, 1, 8);
      IF TG_OP = 'INSERT' THEN
        summary_text := 'Creó nuevo registro en ' || entity_type_name;
        event_severity := 'INFO';
      ELSIF TG_OP = 'UPDATE' THEN
        summary_text := 'Actualizó ' || (SELECT COUNT(*) FROM jsonb_object_keys(computed_diff)) || ' campo(s) en ' || entity_type_name;
        event_severity := 'INFO';
      ELSIF TG_OP = 'DELETE' THEN
        summary_text := 'Eliminó registro en ' || entity_type_name;
        event_severity := 'CRITICAL';
      END IF;
  END CASE;

  -- 4. Inserción Inmutable en audit_logs
  INSERT INTO public.audit_logs (
    empresa_id,
    sucursal_id,
    actor_id,
    actor_nombre,
    actor_rol,
    ip_address,
    user_agent,
    entity_type,
    entity_id,
    entity_label,
    action,
    severity,
    summary,
    motivo,
    changes,
    snapshot
  ) VALUES (
    current_empresa_id,
    current_sucursal_id,
    current_user_id,
    current_actor_nombre,
    current_actor_rol,
    client_ip,
    client_agent,
    entity_type_name,
    entity_primary_id,
    label_text,
    op_action,
    event_severity,
    summary_text,
    motivo_text,
    computed_diff,
    COALESCE(new_json, old_json)
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 7. FUNCIÓN RPC PARA REGISTRO DE EVENTOS DE NEGOCIO PERSONALIZADOS
CREATE OR REPLACE FUNCTION public.log_custom_audit(
  p_entity_type TEXT,
  p_entity_id UUID,
  p_action TEXT,
  p_summary TEXT,
  p_severity TEXT DEFAULT 'INFO',
  p_motivo TEXT DEFAULT NULL,
  p_details JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
  v_user_id UUID;
  v_empresa_id UUID;
  v_sucursal_id UUID;
  v_actor_nombre TEXT := 'Sistema';
  v_actor_rol TEXT := 'Sistema';
  v_headers JSONB;
  v_ip TEXT := NULL;
  v_agent TEXT := NULL;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NOT NULL THEN
    SELECT p.nombre, p.rol, p.empresa_id, p.sucursal_id
    INTO v_actor_nombre, v_actor_rol, v_empresa_id, v_sucursal_id
    FROM public.perfiles p
    WHERE p.id = v_user_id;
  END IF;

  IF v_empresa_id IS NULL THEN
    v_empresa_id := public.user_empresa_id();
  END IF;

  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'No se puede registrar auditoría sin una empresa asociada.';
  END IF;

  BEGIN
    v_headers := current_setting('request.headers', true)::jsonb;
    IF v_headers IS NOT NULL THEN
      v_ip := v_headers ->> 'x-forwarded-for';
      v_agent := v_headers ->> 'user-agent';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_ip := NULL;
    v_agent := NULL;
  END;

  INSERT INTO public.audit_logs (
    empresa_id,
    sucursal_id,
    actor_id,
    actor_nombre,
    actor_rol,
    ip_address,
    user_agent,
    entity_type,
    entity_id,
    entity_label,
    action,
    severity,
    summary,
    motivo,
    changes,
    snapshot
  ) VALUES (
    v_empresa_id,
    v_sucursal_id,
    v_user_id,
    v_actor_nombre,
    v_actor_rol,
    v_ip,
    v_agent,
    p_entity_type,
    p_entity_id,
    p_action,
    p_severity,
    p_summary,
    p_motivo,
    p_details,
    p_details
  ) RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

-- 8. ASOCIACIÓN DE TRIGGERS A TABLAS CLAVE DEL TALLER

-- A. Órdenes de Servicio
DROP TRIGGER IF EXISTS trg_audit_ordenes_servicio ON public.ordenes_servicio;
CREATE TRIGGER trg_audit_ordenes_servicio
  AFTER INSERT OR UPDATE OR DELETE ON public.ordenes_servicio
  FOR EACH ROW
  EXECUTE FUNCTION public.process_audit_log();

-- B. Cotizaciones
DROP TRIGGER IF EXISTS trg_audit_cotizaciones ON public.cotizaciones;
CREATE TRIGGER trg_audit_cotizaciones
  AFTER INSERT OR UPDATE OR DELETE ON public.cotizaciones
  FOR EACH ROW
  EXECUTE FUNCTION public.process_audit_log();

-- C. Turnos de Caja
DROP TRIGGER IF EXISTS trg_audit_caja_turnos ON public.caja_turnos;
CREATE TRIGGER trg_audit_caja_turnos
  AFTER INSERT OR UPDATE OR DELETE ON public.caja_turnos
  FOR EACH ROW
  EXECUTE FUNCTION public.process_audit_log();

-- D. Movimientos de Efectivo
DROP TRIGGER IF EXISTS trg_audit_caja_movimientos ON public.caja_movimientos;
CREATE TRIGGER trg_audit_caja_movimientos
  AFTER INSERT OR UPDATE OR DELETE ON public.caja_movimientos
  FOR EACH ROW
  EXECUTE FUNCTION public.process_audit_log();

-- E. Inventario de Llantas y Refacciones Base
DROP TRIGGER IF EXISTS trg_audit_inventario_llantas ON public.inventario_llantas_base;
CREATE TRIGGER trg_audit_inventario_llantas
  AFTER INSERT OR UPDATE OR DELETE ON public.inventario_llantas_base
  FOR EACH ROW
  EXECUTE FUNCTION public.process_audit_log();

-- F. Perfiles y Permisos IAM
DROP TRIGGER IF EXISTS trg_audit_perfiles ON public.perfiles;
CREATE TRIGGER trg_audit_perfiles
  AFTER UPDATE OR DELETE ON public.perfiles
  FOR EACH ROW
  EXECUTE FUNCTION public.process_audit_log();

-- G. Expediente de Vehículos
DROP TRIGGER IF EXISTS trg_audit_vehiculos ON public.vehiculos;
CREATE TRIGGER trg_audit_vehiculos
  AFTER INSERT OR UPDATE OR DELETE ON public.vehiculos
  FOR EACH ROW
  EXECUTE FUNCTION public.process_audit_log();
