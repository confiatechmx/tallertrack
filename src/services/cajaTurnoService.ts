import { supabase } from "@/lib/supabase";

export interface CajaFondo {
  id: string;
  empresa_id: string;
  sucursal_id: string | null;
  nombre: string;
  tipo: "OPERATIVO" | "RESERVA";
  saldo_actual: number;
  saldo_minimo_alerta: number | null;
  activo: boolean;
}

export interface CuentaBancaria {
  id: string;
  empresa_id: string;
  sucursal_id: string | null;
  banco: string;
  alias: string;
  titular: string | null;
  clabe: string | null;
  numero_cuenta: string | null;
  activo: boolean;
  es_fiscal?: boolean;
  tipo_cuenta?: string | null;
}

export interface DenominacionesConteo {
  b1000: number;
  b500: number;
  b200: number;
  b100: number;
  b50: number;
  b20: number;
  m20: number;
  m10: number;
  m5: number;
  m2: number;
  m1: number;
  centavos: number;
}

export interface CajaTurno {
  id: string;
  empresa_id: string;
  sucursal_id: string | null;
  usuario_apertura_id: string | null;
  usuario_cierre_id: string | null;
  fecha_apertura: string;
  fecha_cierre: string | null;
  estado: "ABIERTO" | "CERRADO" | "AUDITADO";
  monto_apertura_fondo1: number;
  monto_apertura_fondo2: number;
  monto_cierre_declarado_f1: number | null;
  monto_cierre_declarado_f2: number | null;
  monto_cierre_teorico_f1: number | null;
  monto_cierre_teorico_f2: number | null;
  diferencia_f1: number | null;
  diferencia_f2: number | null;
  justificacion_descuadre: string | null;
  monto_remesa_retirada: number;
  monto_fondo_siguiente_f1: number;
  snapshot_resumen: any;
  created_at: string;
}

export interface ResumenTurnoTeorico {
  fondo1: {
    nombre: string;
    apertura: number;
    entradasEfectivoPOS: number;
    salidasGastos: number;
    traspasosRecibidos: number;
    traspasosEnviados: number;
    saldoTeoricoCalculado: number;
  };
  fondo2: {
    nombre: string;
    apertura: number;
    traspasosRecibidos: number;
    traspasosEnviados: number;
    saldoTeoricoCalculado: number;
  };
  bancosSPEI: Array<{
    cuentaId: string;
    banco: string;
    alias: string;
    total: number;
    conteo: number;
  }>;
  tarjetasTPV: {
    total: number;
    conteo: number;
    totalComisiones?: number;
    totalNeto?: number;
    desglose?: Array<{
      metodo: string;
      proveedor: string;
      plazo_msi: number | null;
      modalidad: string;
      bruto: number;
      comision: number;
      neto: number;
      conteo: number;
    }>;
  };
  bnpl: {
    total: number;
    conteo: number;
  };
  totalVentasTurno: number;
  cantidadTransacciones: number;
}

export interface ResumenCorteDiarioAuditoria {
  success: boolean;
  turno_id: string;
  estado: "ABIERTO" | "CERRADO" | "AUDITADO";
  fecha_apertura: string;
  fecha_cierre: string | null;
  efectivo: {
    apertura_declarada: number;
    entradas_ventas: number;
    salidas_gastos: number;
    saldo_teorico: number;
    cierre_declarado: number | null;
    diferencia: number | null;
    remesa_retirada: number;
    fondo_siguiente: number;
    justificacion_descuadre: string | null;
  };
  bancos: Array<{
    cuenta_id: string;
    banco: string;
    alias: string;
    es_fiscal: boolean;
    total: number;
    conteo: number;
  }>;
  tarjetas: {
    total_bruto: number;
    total_comisiones: number;
    total_neto: number;
    conteo: number;
    desglose: Array<{
      metodo: string;
      plazo_msi: number | null;
      bruto: number;
      comision: number;
      neto: number;
      conteo: number;
    }>;
  };
  proveedores: {
    total_pagado_caja_chica: number;
    total_credito_nuevo: number;
    total_abonos_credito: number;
    compras: Array<{
      id: string;
      proveedor: string;
      folio: string;
      descripcion: string;
      costo: number;
      fuente_pago: string;
      estatus_pago: string;
      evidencia_url: string | null;
      estatus_garantia: string;
    }>;
  };
  fiscal: {
    ventas_brutas: number;
    comisiones_retenidas: number;
    ventas_netas: number;
    costos_refacciones: number;
    ganancia_neta_total: number;
    ganancia_fiscal: number;
    ganancia_despues_de_fiscal: number;
  };
  registro_del_dia: Array<{
    categoria: string;
    unidad: string;
    cantidad: number;
  }>;
}

export interface TurnoVentaPartida {
  tipo: "Servicio" | "Refacción" | "Neumático";
  descripcion: string;
  cantidad: number;
  costoUnitario: number;
  costoTotal: number;
  precioUnitario: number;
  importe: number;
  margenMonto: number;
  margenPorcentaje: number;
  proveedor?: string;
  folioTicketProv?: string;
  mesesGarantia?: number;
  evidenciaUrl?: string;
  fuentePago?: string;
  estatusPago?: string;
  cajaMonto?: number;
  fondoMonto?: number;
  pendienteMonto?: number;
}

export interface TurnoVentaPagoDesglose {
  id: string;
  monto: number;
  metodo: string;
  metodoDetalle?: string;
  referencia?: string;
  bancoNombre?: string;
  cuentaAlias?: string;
  terminalNombre?: string;
  plazoMsi?: number | null;
  comisionMonto?: number;
}

export interface TurnoVentaOrden {
  ordenId: string;
  folio: number;
  folioStr: string;
  clienteNombre: string;
  clienteTelefono: string;
  vehiculoDesc: string;
  placas: string;
  fechaPago: string;
  metodoPago: string;
  referencia: string;
  pagosDesglose?: TurnoVentaPagoDesglose[];
  partidas: TurnoVentaPartida[];
  totalVenta: number;
  totalCostos: number;
  utilidadBruta: number;
  margenPorcentaje: number;
}

export interface TurnoGastoMovimiento {
  id: string;
  fecha: string;
  hora: string;
  tipo: string;
  categoria: string;
  concepto: string;
  monto: number;
  fondoNombre: string;
  proveedor?: string;
  folioTicket?: string;
  comprobanteUrl?: string;
}

export interface TurnoDetalleCompleto {
  ventas: TurnoVentaOrden[];
  gastos: TurnoGastoMovimiento[];
  totales: {
    totalVentas: number;
    totalCostos: number;
    utilidadEstimada: number;
    margenEstimadoPorcentaje: number;
    totalGastos: number;
    cantidadOrdenes: number;
    cantidadPartidas: number;
  };
}

export const DENOMINACIONES_BASE: DenominacionesConteo = {
  b1000: 0,
  b500: 0,
  b200: 0,
  b100: 0,
  b50: 0,
  b20: 0,
  m20: 0,
  m10: 0,
  m5: 0,
  m2: 0,
  m1: 0,
  centavos: 0,
};

export function calcularTotalDenominaciones(d: DenominacionesConteo): number {
  return (
    (d.b1000 || 0) * 1000 +
    (d.b500 || 0) * 500 +
    (d.b200 || 0) * 200 +
    (d.b100 || 0) * 100 +
    (d.b50 || 0) * 50 +
    (d.b20 || 0) * 20 +
    (d.m20 || 0) * 20 +
    (d.m10 || 0) * 10 +
    (d.m5 || 0) * 5 +
    (d.m2 || 0) * 2 +
    (d.m1 || 0) * 1 +
    Number(d.centavos || 0)
  );
}

export const CajaTurnoService = {
  /**
   * Obtiene el turno actualmente ABIERTO para una sucursal
   */
  async obtenerTurnoActivo(sucursalId?: string | null, empresaId?: string | null): Promise<CajaTurno | null> {
    try {
      let query = supabase
        .from("caja_turnos")
        .select("*")
        .eq("estado", "ABIERTO")
        .order("fecha_apertura", { ascending: false });

      if (sucursalId) {
        query = query.eq("sucursal_id", sucursalId);
      } else if (empresaId) {
        query = query.eq("empresa_id", empresaId);
      }

      const { data, error } = await query.limit(1).maybeSingle();
      if (!error && data) {
        return data as CajaTurno;
      }

      // Fallback de resiliencia: si no se encontró con sucursalId pero viene empresaId,
      // buscar cualquier turno abierto en la empresa para evitar falsos "Caja Cerrada"
      if (empresaId) {
        const { data: fallbackData } = await supabase
          .from("caja_turnos")
          .select("*")
          .eq("empresa_id", empresaId)
          .eq("estado", "ABIERTO")
          .order("fecha_apertura", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (fallbackData) {
          return fallbackData as CajaTurno;
        }
      }

      return null;
    } catch (err) {
      console.error("Excepción al consultar turno activo:", err);
      return null;
    }
  },

  /**
   * Obtiene los fondos (Fondo 1 Operativo y Fondo 2 Reserva) de la sucursal
   */
  async obtenerFondos(sucursalId: string, empresaId?: string): Promise<CajaFondo[]> {
    try {
      let query = supabase
        .from("caja_fondos")
        .select("*")
        .eq("activo", true);

      if (sucursalId) {
        query = query.eq("sucursal_id", sucursalId);
      } else if (empresaId) {
        query = query.eq("empresa_id", empresaId);
      }

      const { data, error } = await query.order("tipo", { ascending: true });
      if (error) {
        console.error("Error al obtener fondos:", error);
        return [];
      }

      return (data as CajaFondo[]) || [];
    } catch (err) {
      console.error("Excepción al consultar fondos:", err);
      return [];
    }
  },

  /**
   * Obtiene las cuentas bancarias para cobros SPEI (activas)
   */
  async obtenerCuentasBancarias(empresaId: string, sucursalId?: string): Promise<CuentaBancaria[]> {
    try {
      let query = supabase
        .from("cuentas_bancarias")
        .select("*")
        .eq("activo", true);

      if (empresaId) {
        query = query.eq("empresa_id", empresaId);
      }
      if (sucursalId) {
        query = query.or(`sucursal_id.eq.${sucursalId},sucursal_id.is.null`);
      }

      const { data, error } = await query.order("es_fiscal", { ascending: false }).order("alias", { ascending: true });
      if (error) {
        console.error("Error al obtener cuentas bancarias:", error);
        return [];
      }

      return (data as CuentaBancaria[]) || [];
    } catch (err) {
      console.error("Excepción al consultar cuentas bancarias:", err);
      return [];
    }
  },

  /**
   * Obtiene todas las cuentas bancarias (incluyendo inactivas para el catálogo de configuración)
   */
  async obtenerTodasLasCuentasBancarias(empresaId: string, sucursalId?: string): Promise<CuentaBancaria[]> {
    try {
      let query = supabase
        .from("cuentas_bancarias")
        .select("*");

      if (empresaId) {
        query = query.eq("empresa_id", empresaId);
      }
      if (sucursalId) {
        query = query.or(`sucursal_id.eq.${sucursalId},sucursal_id.is.null`);
      }

      const { data, error } = await query.order("es_fiscal", { ascending: false }).order("alias", { ascending: true });
      if (error) {
        console.error("Error al obtener todas las cuentas bancarias:", error);
        return [];
      }

      return (data as CuentaBancaria[]) || [];
    } catch (err) {
      console.error("Excepción al consultar todas las cuentas bancarias:", err);
      return [];
    }
  },

  /**
   * Crea una nueva cuenta bancaria en el catálogo autogestionable
   */
  async crearCuentaBancaria(cuenta: Omit<CuentaBancaria, "id"> & { id?: string }): Promise<{ data: CuentaBancaria | null; error: any }> {
    try {
      const payload: any = {
        empresa_id: cuenta.empresa_id,
        sucursal_id: cuenta.sucursal_id || null,
        banco: cuenta.banco.trim(),
        alias: cuenta.alias.trim(),
        titular: cuenta.titular ? cuenta.titular.trim() : null,
        clabe: cuenta.clabe && cuenta.clabe.trim() ? cuenta.clabe.trim() : null,
        numero_cuenta: cuenta.numero_cuenta && cuenta.numero_cuenta.trim() ? cuenta.numero_cuenta.trim() : null,
        es_fiscal: Boolean(cuenta.es_fiscal),
        tipo_cuenta: cuenta.es_fiscal ? "FISCAL" : (cuenta.tipo_cuenta || "OPERATIVA"),
        activo: cuenta.activo !== false,
      };

      const { data, error } = await supabase
        .from("cuentas_bancarias")
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return { data: data as CuentaBancaria, error: null };
    } catch (err: any) {
      console.error("Error al crear cuenta bancaria:", err);
      return { data: null, error: err.message || "Error al registrar cuenta bancaria" };
    }
  },

  /**
   * Actualiza una cuenta bancaria existente (ej. agregar CLABE o cambiar estatus)
   */
  async actualizarCuentaBancaria(id: string, updates: Partial<CuentaBancaria>): Promise<{ data: CuentaBancaria | null; error: any }> {
    try {
      const payload: any = { ...updates };
      if (payload.banco) payload.banco = payload.banco.trim();
      if (payload.alias) payload.alias = payload.alias.trim();
      if ("clabe" in payload) {
        payload.clabe = payload.clabe && payload.clabe.trim() ? payload.clabe.trim() : null;
      }
      if ("numero_cuenta" in payload) {
        payload.numero_cuenta = payload.numero_cuenta && payload.numero_cuenta.trim() ? payload.numero_cuenta.trim() : null;
      }
      if ("es_fiscal" in payload) {
        payload.es_fiscal = Boolean(payload.es_fiscal);
        payload.tipo_cuenta = payload.es_fiscal ? "FISCAL" : "OPERATIVA";
      }

      const { data, error } = await supabase
        .from("cuentas_bancarias")
        .update(payload)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return { data: data as CuentaBancaria, error: null };
    } catch (err: any) {
      console.error("Error al actualizar cuenta bancaria:", err);
      return { data: null, error: err.message || "Error al actualizar cuenta bancaria" };
    }
  },

  /**
   * Elimina una cuenta bancaria (con fallback a desactivación si tiene transacciones vinculadas)
   */
  async eliminarCuentaBancaria(id: string): Promise<{ success: boolean; error: any }> {
    try {
      const { error } = await supabase
        .from("cuentas_bancarias")
        .delete()
        .eq("id", id);

      if (error) {
        // En caso de llave foránea referenciada en pagos_orden, desactivamos la cuenta de forma segura
        const { error: softErr } = await supabase
          .from("cuentas_bancarias")
          .update({ activo: false })
          .eq("id", id);
        if (softErr) throw softErr;
      }
      return { success: true, error: null };
    } catch (err: any) {
      console.error("Error al eliminar cuenta bancaria:", err);
      return { success: false, error: err.message || "Error al eliminar cuenta bancaria" };
    }
  },

  /**
   * Abre un nuevo turno de caja chica llamando a fn_abrir_turno_caja
   */
  async abrirTurno(params: {
    empresaId: string;
    sucursalId: string;
    usuarioId: string;
    montoFondo1: number;
    montoFondo2: number;
  }): Promise<{ success: boolean; turno_id?: string; error?: string }> {
    try {
      const { data, error } = await (supabase.rpc as any)("fn_abrir_turno_caja", {
        p_empresa_id: params.empresaId,
        p_sucursal_id: params.sucursalId,
        p_usuario_id: params.usuarioId || (await supabase.auth.getUser()).data.user?.id || null,
        p_monto_fondo1: params.montoFondo1,
        p_monto_fondo2: params.montoFondo2,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: data?.success ?? true,
        turno_id: data?.turno_id,
      };
    } catch (err: any) {
      return { success: false, error: err.message || "Error al abrir turno" };
    }
  },

  /**
   * Realiza un traspaso entre fondos (ej. Rescate de Fondo 2 Reserva a Fondo 1 Mostrador)
   */
  async traspasoEntreFondos(params: {
    turnoId: string;
    fondoOrigenId: string;
    fondoDestinoId: string;
    monto: number;
    concepto: string;
    usuarioId: string;
  }): Promise<{ success: boolean; traspaso_id?: string; error?: string }> {
    try {
      const { data, error } = await (supabase.rpc as any)("fn_traspaso_entre_fondos", {
        p_turno_id: params.turnoId,
        p_fondo_origen_id: params.fondoOrigenId,
        p_fondo_destino_id: params.fondoDestinoId,
        p_monto: params.monto,
        p_concepto: params.concepto,
        p_usuario_id: params.usuarioId || (await supabase.auth.getUser()).data.user?.id || null,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: data?.success ?? true,
        traspaso_id: data?.traspaso_id,
      };
    } catch (err: any) {
      return { success: false, error: err.message || "Error al realizar traspaso" };
    }
  },

  /**
   * Calcula en tiempo real el desglose teórico de un turno activo
   */
  async calcularResumenTeorico(turno: CajaTurno, fondos: CajaFondo[], cuentas: CuentaBancaria[]): Promise<ResumenTurnoTeorico> {
    const f1 = fondos.find((f) => f.tipo === "OPERATIVO") || fondos[0];
    const f2 = fondos.find((f) => f.tipo === "RESERVA") || fondos[1];

    const f1Id = f1?.id;
    const f2Id = f2?.id;

    // 1. Pagos de ordenes durante el turno
    let pagosQ = supabase
      .from("pagos_orden")
      .select("*")
      .eq("sucursal_id", turno.sucursal_id)
      .in("estatus", ["Aprobado", "COMPLETADO"])
      .is("deleted_at", null);
    if (turno.fecha_apertura) {
      if (turno.fecha_cierre) {
        pagosQ = pagosQ.or(
          `caja_turno_id.eq.${turno.id},and(fecha_pago.gte.${turno.fecha_apertura},fecha_pago.lte.${turno.fecha_cierre})`
        );
      } else {
        pagosQ = pagosQ.or(
          `caja_turno_id.eq.${turno.id},fecha_pago.gte.${turno.fecha_apertura}`
        );
      }
    } else {
      pagosQ = pagosQ.eq("caja_turno_id", turno.id);
    }
    const { data: pagosData } = await pagosQ;

    const pagos = pagosData || [];

    // 2. Movimientos de caja chica (Gastos / Insumos / etc.)
    let movsQ = supabase
      .from("caja_movimientos")
      .select("*")
      .eq("sucursal_id", turno.sucursal_id);
    if (turno.fecha_apertura) {
      if (turno.fecha_cierre) {
        movsQ = movsQ.or(
          `caja_turno_id.eq.${turno.id},and(created_at.gte.${turno.fecha_apertura},created_at.lte.${turno.fecha_cierre})`
        );
      } else {
        movsQ = movsQ.or(
          `caja_turno_id.eq.${turno.id},created_at.gte.${turno.fecha_apertura}`
        );
      }
    } else {
      movsQ = movsQ.eq("caja_turno_id", turno.id);
    }
    const { data: movsData } = await movsQ;

    const movimientos = movsData || [];

    // 3. Traspasos entre fondos
    const { data: traspasosData } = await supabase
      .from("caja_traspasos_fondos")
      .select("*")
      .eq("turno_id", turno.id);

    const traspasos = traspasosData || [];

    // Desglose de Efectivo Fondo 1
    const entradasEfectivoPOS = pagos
      .filter((p) => p.proveedor_pago === "Efectivo" && (!p.caja_fondo_id || p.caja_fondo_id === f1Id))
      .reduce((sum, p) => sum + Number(p.monto_total || 0), 0);

    const entradasExtrasF1 = movimientos
      .filter(
        (m) =>
          ["Ingreso Extra", "Reposición de Fondo", "INGRESO"].includes(m.tipo) &&
          (!m.caja_fondo_id || m.caja_fondo_id === f1Id)
      )
      .reduce((sum, m) => sum + Number(m.monto || 0), 0);

    const salidasGastosF1 = movimientos
      .filter(
        (m) =>
          ["Gasto / Insumos", "Pago Proveedor", "Retiro de Efectivo", "Retiro Administrativo", "EGRESO"].includes(m.tipo) &&
          (!m.caja_fondo_id || m.caja_fondo_id === f1Id)
      )
      .reduce((sum, m) => sum + Number(m.monto || 0), 0);

    const traspasosRecibidosF1 = traspasos
      .filter((t) => t.fondo_destino_id === f1Id)
      .reduce((sum, t) => sum + Number(t.monto || 0), 0);

    const traspasosEnviadosF1 = traspasos
      .filter((t) => t.fondo_origen_id === f1Id)
      .reduce((sum, t) => sum + Number(t.monto || 0), 0);

    const saldoTeoricoF1 =
      Number(turno.monto_apertura_fondo1 || 0) +
      entradasEfectivoPOS +
      entradasExtrasF1 -
      salidasGastosF1 +
      traspasosRecibidosF1 -
      traspasosEnviadosF1;

    // Desglose de Fondo 2 (Reserva)
    const entradasExtrasF2 = movimientos
      .filter(
        (m) =>
          ["Ingreso Extra", "Reposición de Fondo", "INGRESO"].includes(m.tipo) &&
          m.caja_fondo_id === f2Id
      )
      .reduce((sum, m) => sum + Number(m.monto || 0), 0);

    const salidasGastosF2 = movimientos
      .filter(
        (m) =>
          ["Retiro de Efectivo", "Retiro Administrativo", "EGRESO"].includes(m.tipo) &&
          m.caja_fondo_id === f2Id
      )
      .reduce((sum, m) => sum + Number(m.monto || 0), 0);

    const traspasosRecibidosF2 = traspasos
      .filter((t) => t.fondo_destino_id === f2Id)
      .reduce((sum, t) => sum + Number(t.monto || 0), 0);

    const traspasosEnviadosF2 = traspasos
      .filter((t) => t.fondo_origen_id === f2Id)
      .reduce((sum, t) => sum + Number(t.monto || 0), 0);

    const saldoTeoricoF2 =
      Number(turno.monto_apertura_fondo2 || 0) +
      entradasExtrasF2 -
      salidasGastosF2 +
      traspasosRecibidosF2 -
      traspasosEnviadosF2;

    // Desglose SPEI por cuenta bancaria
    const bancosSPEI = cuentas.map((cta) => {
      const pagosCta = pagos.filter(
        (p) =>
          ["Transferencia", "SPEI"].includes(p.proveedor_pago) &&
          (p.cuenta_bancaria_id === cta.id || (!p.cuenta_bancaria_id && cuentas[0]?.id === cta.id))
      );
      return {
        cuentaId: cta.id,
        banco: cta.banco,
        alias: cta.alias,
        total: pagosCta.reduce((acc, p) => acc + Number(p.monto_total || 0), 0),
        conteo: pagosCta.length,
      };
    });

    // Tarjetas TPV y Pasarelas con desglose
    const pagosTPV = pagos.filter((p) =>
      ["Tarjeta", "Terminal", "TPV", "Mercado Pago", "Stripe"].includes(p.proveedor_pago)
    );

    const desgloseMap = new Map<string, {
      metodo: string;
      proveedor: string;
      plazo_msi: number | null;
      modalidad: string;
      bruto: number;
      comision: number;
      neto: number;
      conteo: number;
    }>();

    pagosTPV.forEach((p) => {
      const prov = p.proveedor_pago || "Terminal";
      const msi = p.plazo_msi ? Number(p.plazo_msi) : null;
      const modalidad = msi && msi > 0 ? `${msi} MSI` : "Contado / 1 Pago";
      const key = `${prov}_${msi || 0}_${p.tenant_metodo_pago_id || ""}_${p.metodo_detalle || ""}`;
      const nombreMetodo = p.metodo_detalle || (msi ? `${prov} (${msi} Meses Sin Intereses)` : `${prov} Tarjeta`);

      const current = desgloseMap.get(key) || {
        metodo: nombreMetodo,
        proveedor: prov,
        plazo_msi: msi,
        modalidad,
        bruto: 0,
        comision: 0,
        neto: 0,
        conteo: 0,
      };

      const monto = Number(p.monto_total || 0);
      const comision = Number(p.comision_monto || p.comision_pasarela || 0);
      current.bruto += monto;
      current.comision += comision;
      current.neto += (monto - comision);
      current.conteo += 1;
      desgloseMap.set(key, current);
    });

    const desgloseTPV = Array.from(desgloseMap.values());
    const totalTPVBruto = pagosTPV.reduce((acc, p) => acc + Number(p.monto_total || 0), 0);
    const totalTPVComisiones = desgloseTPV.reduce((acc, d) => acc + d.comision, 0);
    const totalTPVNeto = totalTPVBruto - totalTPVComisiones;

    const tarjetasTPV = {
      total: totalTPVBruto,
      conteo: pagosTPV.length,
      totalComisiones: totalTPVComisiones,
      totalNeto: totalTPVNeto,
      desglose: desgloseTPV,
    };

    // BNPL
    const pagosBNPL = pagos.filter((p) => ["KueskiPay", "Atrato"].includes(p.proveedor_pago));
    const bnpl = {
      total: pagosBNPL.reduce((acc, p) => acc + Number(p.monto_total || 0), 0),
      conteo: pagosBNPL.length,
    };

    const totalVentasTurno = pagos.reduce((acc, p) => acc + Number(p.monto_total || 0), 0);

    return {
      fondo1: {
        nombre: f1?.nombre || "Fondo 1: Operativo Mostrador",
        apertura: Number(turno.monto_apertura_fondo1 || 0),
        entradasEfectivoPOS,
        salidasGastos: salidasGastosF1,
        traspasosRecibidos: traspasosRecibidosF1,
        traspasosEnviados: traspasosEnviadosF1,
        saldoTeoricoCalculado: saldoTeoricoF1,
      },
      fondo2: {
        nombre: f2?.nombre || "Fondo 2: Reserva Taller",
        apertura: Number(turno.monto_apertura_fondo2 || 0),
        traspasosRecibidos: traspasosRecibidosF2,
        traspasosEnviados: traspasosEnviadosF2,
        saldoTeoricoCalculado: saldoTeoricoF2,
      },
      bancosSPEI,
      tarjetasTPV,
      bnpl,
      totalVentasTurno,
      cantidadTransacciones: pagos.length,
    };
  },

  /**
   * Calcula el resumen teórico de un turno a partir de su ID (útil para turnos cerrados en Historial)
   */
  async calcularResumenTeoricoTurno(turnoId: string): Promise<ResumenTurnoTeorico | null> {
    try {
      const { data: turno } = await supabase
        .from("caja_turnos")
        .select("*")
        .eq("id", turnoId)
        .maybeSingle();
      if (!turno) return null;

      const [fondos, cuentas] = await Promise.all([
        this.obtenerFondos(turno.sucursal_id, turno.empresa_id),
        this.obtenerCuentasBancarias(turno.empresa_id),
      ]);
      return await this.calcularResumenTeorico(turno as CajaTurno, fondos, cuentas);
    } catch (err) {
      console.error("Error al calcular resumen teórico por turnoId:", err);
      return null;
    }
  },

  /**
   * Cierra el turno de caja de forma atómica con conteo ciego
   */
  async cerrarTurno(params: {
    turnoId: string;
    usuarioCierreId: string;
    declaradoF1: number;
    declaradoF2: number;
    denominacionesF1?: DenominacionesConteo;
    denominacionesF2?: DenominacionesConteo;
    justificacion?: string;
    montoRemesa: number;
    montoFondoSiguiente: number;
  }): Promise<{
    success: boolean;
    diferenciaF1?: number;
    diferenciaF2?: number;
    teoricoF1?: number;
    teoricoF2?: number;
    error?: string;
  }> {
    try {
      const { data, error } = await (supabase.rpc as any)("fn_cerrar_turno_caja", {
        p_turno_id: params.turnoId,
        p_usuario_cierre_id: params.usuarioCierreId || (await supabase.auth.getUser()).data.user?.id || null,
        p_declarado_f1: params.declaradoF1,
        p_declarado_f2: params.declaradoF2,
        p_denominaciones_f1: params.denominacionesF1 || null,
        p_denominaciones_f2: params.denominacionesF2 || null,
        p_justificacion: params.justificacion || "",
        p_monto_remesa: params.montoRemesa,
        p_monto_fondo_siguiente: params.montoFondoSiguiente,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: data?.success ?? true,
        diferenciaF1: data?.diferencia_f1,
        diferenciaF2: data?.diferencia_f2,
        teoricoF1: data?.teorico_f1,
        teoricoF2: data?.teorico_f2,
      };
    } catch (err: any) {
      return { success: false, error: err.message || "Error al cerrar turno" };
    }
  },

  /**
   * Obtiene el historial de turnos cerrados para auditoría
   */
  async obtenerHistorialTurnos(
    sucursalId?: string | null,
    limite = 25,
    empresaId?: string | null
  ): Promise<CajaTurno[]> {
    try {
      let query = supabase
        .from("caja_turnos")
        .select("*")
        .order("fecha_apertura", { ascending: false })
        .limit(limite);

      if (sucursalId && empresaId) {
        query = query.or(`sucursal_id.eq.${sucursalId},empresa_id.eq.${empresaId}`);
      } else if (empresaId) {
        query = query.eq("empresa_id", empresaId);
      } else if (sucursalId) {
        query = query.eq("sucursal_id", sucursalId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error al obtener historial de turnos:", error);
        return [];
      }

      return (data as CajaTurno[]) || [];
    } catch (err) {
      console.error("Excepción al consultar historial:", err);
      return [];
    }
  },

  /**
   * Obtiene el snapshot consolidado para el corte diario y auditoría de la administradora
   */
  async obtenerResumenCorteDiarioAuditoria(turnoId: string): Promise<ResumenCorteDiarioAuditoria | null> {
    try {
      const { data, error } = await (supabase.rpc as any)("fn_resumen_corte_diario_auditoria", {
        p_turno_id: turnoId,
      });

      if (error) {
        console.error("Error al obtener resumen de auditoría:", error);
        return null;
      }

      return data as ResumenCorteDiarioAuditoria;
    } catch (err) {
      console.error("Excepción al llamar fn_resumen_corte_diario_auditoria:", err);
      return null;
    }
  },

  /**
   * Promueve un turno a estado AUDITADO por parte de la administradora/supervisor
   */
  async auditarTurnoCaja(turnoId: string, auditorId?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const cleanAuditorId = auditorId || (await supabase.auth.getUser()).data.user?.id || null;
      const { error } = await supabase
        .from("caja_turnos")
        .update({
          estado: "AUDITADO",
          usuario_cierre_id: cleanAuditorId,
        })
        .eq("id", turnoId);

      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      console.error("Error al auditar turno:", err);
      return { success: false, error: err.message || "Error al auditar turno" };
    }
  },

  /**
   * Actualiza el saldo base o configuración de un fondo de caja
   */
  async actualizarFondo(
    fondoId: string,
    updates: Partial<Pick<CajaFondo, "saldo_actual" | "saldo_minimo_alerta" | "nombre">>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from("caja_fondos")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", fondoId);

      if (error) {
        console.error("Error al actualizar fondo:", error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: any) {
      console.error("Excepción al actualizar fondo:", err);
      return { success: false, error: err.message || "Error al actualizar fondo" };
    }
  },

  /**
   * Obtiene el desglose completo de un turno:
   * - Ventas y Servicios (Órdenes, autos, clientes, partidas con costo y margen)
   * - Gastos de Caja Chica (Salidas a proveedores e insumos con folio y evidencia)
   * - Totales consolidados de la jornada
   */
  async obtenerDetalleTurnoCompleto(turnoId: string): Promise<TurnoDetalleCompleto> {
    try {
      // 1. Obtener el turno
      const { data: turno, error: turnoErr } = await supabase
        .from("caja_turnos")
        .select("*")
        .eq("id", turnoId)
        .maybeSingle();

      if (turnoErr || !turno) {
        return {
          ventas: [],
          gastos: [],
          totales: { totalVentas: 0, totalCostos: 0, utilidadEstimada: 0, margenEstimadoPorcentaje: 0, totalGastos: 0, cantidadOrdenes: 0, cantidadPartidas: 0 },
        };
      }

      // 2. Obtener los pagos del turno
      let pagosQuery = supabase
        .from("pagos_orden")
        .select(`
          id,
          orden_servicio_id,
          monto_total,
          proveedor_pago,
          metodo_detalle,
          referencia,
          comision_monto,
          fecha_pago,
          estatus,
          deleted_at,
          caja_turno_id,
          cuenta_bancaria_id,
          plazo_msi,
          tenant_metodo_pago_id,
          cuentas_bancarias:cuenta_bancaria_id ( id, banco, numero_cuenta, alias ),
          tenant_metodos_pago:tenant_metodo_pago_id ( id, nombre, proveedor, plazo_msi )
        `)
        .in("estatus", ["Aprobado", "COMPLETADO"])
        .is("deleted_at", null);

      if (turno.sucursal_id) {
        pagosQuery = pagosQuery.eq("sucursal_id", turno.sucursal_id);
      }

      // Filtro seguro: por turno_id o por ventana de tiempo de apertura
      if (turno.fecha_apertura) {
        if (turno.fecha_cierre) {
          pagosQuery = pagosQuery.or(
            `caja_turno_id.eq.${turnoId},and(fecha_pago.gte.${turno.fecha_apertura},fecha_pago.lte.${turno.fecha_cierre})`
          );
        } else {
          pagosQuery = pagosQuery.or(
            `caja_turno_id.eq.${turnoId},fecha_pago.gte.${turno.fecha_apertura}`
          );
        }
      } else {
        pagosQuery = pagosQuery.eq("caja_turno_id", turnoId);
      }

      const { data: pagosData, error: pagosErr } = await pagosQuery;
      if (pagosErr) console.warn("Aviso al obtener pagos del turno:", pagosErr);

      const pagos = pagosData || [];
      const ordenIds = Array.from(
        new Set(pagos.map((p: any) => p.orden_servicio_id).filter(Boolean))
      ) as string[];

      // 3. Obtener las órdenes con vehículos, clientes, servicios y refacciones
      const ordenesMap = new Map<string, any>();
      if (ordenIds.length > 0) {
        const { data: ordenesData, error: ordErr } = await supabase
          .from("ordenes_servicio")
          .select(`
            id,
            folio,
            fecha_ingreso,
            estatus_pago,
            vehiculo:vehiculos (
              id,
              marca,
              modelo,
              anio,
              placas,
              color,
              vin,
              cliente:clientes (
                id,
                nombre,
                telefono,
                correo
              )
            ),
            orden_servicio_servicios (
              id,
              notas,
              cantidad,
              precio_cobrado,
              estatus_aprobacion
            ),
            orden_servicio_refacciones (
              id,
              nombre,
              numero_parte,
              proveedor,
              proveedor_id,
              compra_proveedor_id,
              fuente_pago,
              cantidad,
              costo_unitario,
              precio_unitario,
              subtotal,
              margen_porcentaje,
              estatus_aprobacion,
              garantia_especifica,
              folio_ticket_nota,
              evidencia_url,
              proveedores:proveedor_id (
                id,
                nombre_comercial
              ),
              compras_proveedores (
                id,
                folio_ticket_nota,
                meses_garantia,
                evidencia_url,
                fuente_pago,
                estatus_pago,
                proveedores:proveedor_id (
                  id,
                  nombre_comercial
                )
              )
            )
          `)
          .in("id", ordenIds);

        if (ordErr) console.warn("Aviso al obtener órdenes del turno:", ordErr);
        (ordenesData || []).forEach((o: any) => ordenesMap.set(o.id, o));
      }

      // 4. Mapear pagos a órdenes y desglosar partidas
      const ventas: TurnoVentaOrden[] = [];
      let totalVentasSum = 0;
      let totalCostosSum = 0;
      let totalPartidasCount = 0;

      const pagosPorOrden = new Map<string, any[]>();
      pagos.forEach((p: any) => {
        if (!p.orden_servicio_id) return;
        const current = pagosPorOrden.get(p.orden_servicio_id) || [];
        current.push(p);
        pagosPorOrden.set(p.orden_servicio_id, current);
      });

      pagosPorOrden.forEach((pagosList, ordenId) => {
        const ord = ordenesMap.get(ordenId);
        const totalCobradoEnTurno = pagosList.reduce(
          (acc, p) => acc + Number(p.monto_total || 0),
          0
        );

        // Desglose individual de cada pago
        const pagosDesglose: TurnoVentaPagoDesglose[] = pagosList.map((p) => {
          const cta = p.cuentas_bancarias;
          const tenantMetodo = p.tenant_metodos_pago;
          const bancoNombre = cta?.banco || (p.proveedor_pago === "Transferencia" ? "SPEI" : undefined);
          const aliasMatch = p.metodo_detalle?.match(/SPEI\s*\(([^)]+)\)/i);
          const cuentaAlias = cta?.alias || (aliasMatch ? aliasMatch[1] : cta?.numero_cuenta);
          const terminalNombre = tenantMetodo?.nombre || (p.plazo_msi ? `${p.proveedor_pago} (${p.plazo_msi} MSI)` : p.proveedor_pago);

          return {
            id: p.id,
            monto: Number(p.monto_total || 0),
            metodo: p.proveedor_pago || "Efectivo",
            metodoDetalle: p.metodo_detalle,
            referencia: p.referencia,
            bancoNombre,
            cuentaAlias,
            terminalNombre,
            plazoMsi: p.plazo_msi ? Number(p.plazo_msi) : null,
            comisionMonto: Number(p.comision_monto || 0),
          };
        });

        // Metodo legible para resumen
        let metodoPagoResumen = "Efectivo";
        if (pagosList.length > 1) {
          metodoPagoResumen = `Multimétodo (${pagosList.map((p) => p.proveedor_pago).join(" + ")})`;
        } else if (pagosList.length === 1) {
          const p = pagosList[0];
          if (p.proveedor_pago === "Transferencia" || p.proveedor_pago === "SPEI") {
            const alias = pagosDesglose[0]?.cuentaAlias;
            metodoPagoResumen = alias ? `Transferencia (${alias})` : "Transferencia SPEI";
          } else if (["Tarjeta", "Terminal", "TPV", "Mercado Pago", "Stripe"].includes(p.proveedor_pago)) {
            metodoPagoResumen = pagosDesglose[0]?.terminalNombre || `${p.proveedor_pago} Tarjeta`;
          } else {
            metodoPagoResumen = p.proveedor_pago || "Efectivo";
          }
        }

        const referencias = pagosList.map((p) => p.referencia).filter(Boolean).join(", ");
        const primerPagoFecha = pagosList[0]?.fecha_pago || turno.fecha_apertura;

        const partidas: TurnoVentaPartida[] = [];
        let ordenCostos = 0;

        // Servicios / Mano de obra
        const activeSrvs = (ord?.orden_servicio_servicios || []).filter(
          (s: any) => s.estatus_aprobacion !== "Diferido"
        );
        activeSrvs.forEach((s: any) => {
          const cant = Number(s.cantidad || 1);
          const importe = Number(s.precio_cobrado || s.subtotal || 0);
          partidas.push({
            tipo: "Servicio",
            descripcion: s.notas || s.descripcion || "Servicio de Mano de Obra",
            cantidad: cant,
            costoUnitario: 0,
            costoTotal: 0,
            precioUnitario: cant > 0 ? importe / cant : importe,
            importe,
            margenMonto: importe,
            margenPorcentaje: 100,
          });
        });

        // Refacciones
        const activeParts = (ord?.orden_servicio_refacciones || []).filter(
          (r: any) => r.estatus_aprobacion !== "Diferido"
        );
        activeParts.forEach((r: any) => {
          const qty = Number(r.cantidad || 1);
          const costoUnit = Number(r.costo_unitario || 0);
          const costoTot = costoUnit * qty;
          const precioUnit = Number(r.precio_unitario || 0);
          const importe = Number(r.subtotal || precioUnit * qty);
          const margenMonto = importe - costoTot;
          const margenPct =
            costoTot > 0 ? (margenMonto / costoTot) * 100 : importe > 0 ? 100 : 0;

          ordenCostos += costoTot;

          const provNombre =
            r.proveedores?.nombre_comercial ||
            r.compras_proveedores?.proveedores?.nombre_comercial ||
            r.proveedor ||
            undefined;

          const fuente =
            r.compras_proveedores?.fuente_pago ||
            r.fuente_pago ||
            (provNombre?.includes("Inventario") ? "CREDITO_PENDIENTE" : "CAJA_CHICA");

          let cajaM = 0;
          let fondoM = 0;
          let pendienteM = 0;
          if (fuente === "CAJA_CHICA") cajaM = costoTot;
          else if (fuente === "FONDO_RESERVA" || fuente === "TRANSFERENCIA") fondoM = costoTot;
          else if (fuente === "CREDITO_PENDIENTE") pendienteM = costoTot;

          partidas.push({
            tipo: "Refacción",
            descripcion: `${r.nombre || "Refacción"}${r.numero_parte ? ` (${r.numero_parte})` : ""}`,
            cantidad: qty,
            costoUnitario: costoUnit,
            costoTotal: costoTot,
            precioUnitario: precioUnit,
            importe,
            margenMonto,
            margenPorcentaje: Math.round(margenPct * 10) / 10,
            proveedor: provNombre,
            folioTicketProv: r.folio_ticket_nota || r.compras_proveedores?.folio_ticket_nota || undefined,
            mesesGarantia: r.compras_proveedores?.meses_garantia || (r.garantia_especifica ? parseInt(r.garantia_especifica) : undefined),
            evidenciaUrl: r.evidencia_url || r.compras_proveedores?.evidencia_url || undefined,
            fuentePago: fuente,
            estatusPago: r.compras_proveedores?.estatus_pago || (fuente === "CAJA_CHICA" ? "PAGADO" : "PENDIENTE"),
            cajaMonto: cajaM,
            fondoMonto: fondoM,
            pendienteMonto: pendienteM,
          });
        });

        // Llantas / Neumáticos si hubiera en cotizaciones
        const activeTires = (ord?.cotizaciones?.detalles_cotizacion || []).filter(
          (t: any) => t.estatus_aprobacion !== "Diferido"
        );
        activeTires.forEach((t: any) => {
          const qty = Number(t.cantidad || 1);
          const importe = Number(t.subtotal || t.precio_unitario * qty || 0);
          partidas.push({
            tipo: "Neumático",
            descripcion: t.descripcion || "Neumático",
            cantidad: qty,
            costoUnitario: 0,
            costoTotal: 0,
            precioUnitario: Number(t.precio_unitario || importe),
            importe,
            margenMonto: importe,
            margenPorcentaje: 100,
          });
        });

        if (partidas.length === 0) {
          partidas.push({
            tipo: "Servicio",
            descripcion: "Servicio General de Taller",
            cantidad: 1,
            costoUnitario: 0,
            costoTotal: 0,
            precioUnitario: totalCobradoEnTurno,
            importe: totalCobradoEnTurno,
            margenMonto: totalCobradoEnTurno,
            margenPorcentaje: 100,
          });
        }

        const utilidadBruta = totalCobradoEnTurno - ordenCostos;
        const margenPorcentaje =
          totalCobradoEnTurno > 0
            ? Math.round((utilidadBruta / totalCobradoEnTurno) * 1000) / 10
            : 0;

        totalVentasSum += totalCobradoEnTurno;
        totalCostosSum += ordenCostos;
        totalPartidasCount += partidas.length;

        const v = ord?.vehiculo;
        const c = v?.cliente || ord?.cliente;
        const vehiculoDesc = v
          ? `${v.marca || ""} ${v.modelo || ""} ${v.anio || ""}`.trim()
          : "Mostrador / Público";

        ventas.push({
          ordenId,
          folio: ord?.folio || 0,
          folioStr: ord?.folio
            ? `#${Number(ord.folio) >= 1000 ? Number(ord.folio) : 1000 + Number(ord.folio)}`
            : `#${ordenId.substring(0, 6)}`,
          clienteNombre: c?.nombre || c?.nombre_completo || "Público General",
          clienteTelefono: c?.telefono || "-",
          vehiculoDesc,
          placas: v?.placas || "SIN PLACAS",
          fechaPago: primerPagoFecha,
          metodoPago: metodoPagoResumen,
          referencia: referencias,
          pagosDesglose,
          partidas,
          totalVenta: totalCobradoEnTurno,
          totalCostos: ordenCostos,
          utilidadBruta,
          margenPorcentaje,
        });
      });

      // Ordenar las ventas de forma ascendente estricta por folio (1001, 1002, ..., 1016)
      ventas.sort((a, b) => (a.folio || 0) - (b.folio || 0));

      // 5. Gastos y compras a proveedor del turno
      let movsQuery = supabase
        .from("caja_movimientos")
        .select(`
          id,
          tipo,
          concepto,
          monto,
          categoria,
          comprobante_url,
          folio_ticket,
          created_at,
          caja_fondos ( nombre )
        `)
        .order("created_at", { ascending: true });

      if (turno.sucursal_id) {
        movsQuery = movsQuery.eq("sucursal_id", turno.sucursal_id);
      }

      if (turno.fecha_apertura) {
        if (turno.fecha_cierre) {
          movsQuery = movsQuery.or(
            `caja_turno_id.eq.${turnoId},and(created_at.gte.${turno.fecha_apertura},created_at.lte.${turno.fecha_cierre})`
          );
        } else {
          movsQuery = movsQuery.or(
            `caja_turno_id.eq.${turnoId},created_at.gte.${turno.fecha_apertura}`
          );
        }
      } else {
        movsQuery = movsQuery.eq("caja_turno_id", turnoId);
      }

      const { data: movsData } = await movsQuery;
      const gastos: TurnoGastoMovimiento[] = (movsData || [])
        .filter((m: any) =>
          [
            "Gasto / Insumos",
            "Pago Proveedor",
            "Retiro de Efectivo",
            "Retiro Administrativo",
            "EGRESO",
          ].includes(m.tipo)
        )
        .map((m: any) => {
          const d = new Date(m.created_at);
          return {
            id: m.id,
            fecha: d.toLocaleDateString("es-MX", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            }),
            hora: d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }),
            tipo: m.tipo,
            categoria: m.categoria || "Gasto Operativo",
            concepto: m.concepto || "Salida de Caja Chica",
            monto: Number(m.monto || 0),
            fondoNombre: m.caja_fondos?.nombre || "Mostrador",
            proveedor: m.proveedores?.nombre_comercial || undefined,
            folioTicket: m.folio_ticket || undefined,
            comprobanteUrl: m.comprobante_url || undefined,
          };
        });

      const totalGastosSum = gastos.reduce((acc, g) => acc + g.monto, 0);
      const utilidadEstimada = totalVentasSum - totalCostosSum;
      const margenEstimadoPorcentaje =
        totalVentasSum > 0 ? Math.round((utilidadEstimada / totalVentasSum) * 1000) / 10 : 0;

      return {
        ventas,
        gastos,
        totales: {
          totalVentas: totalVentasSum,
          totalCostos: totalCostosSum,
          utilidadEstimada,
          margenEstimadoPorcentaje,
          totalGastos: totalGastosSum,
          cantidadOrdenes: ventas.length,
          cantidadPartidas: totalPartidasCount,
        },
      };
    } catch (err) {
      console.error("Excepción en obtenerDetalleTurnoCompleto:", err);
      return {
        ventas: [],
        gastos: [],
        totales: {
          totalVentas: 0,
          totalCostos: 0,
          utilidadEstimada: 0,
          margenEstimadoPorcentaje: 0,
          totalGastos: 0,
          cantidadOrdenes: 0,
          cantidadPartidas: 0,
        },
      };
    }
  },
};
