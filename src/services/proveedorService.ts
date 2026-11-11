import { supabase } from "@/lib/supabase";
import { Database } from "@/types/database.types";

export type Proveedor = Database["public"]["Tables"]["proveedores"]["Row"];
export type ProveedorInsert = Database["public"]["Tables"]["proveedores"]["Insert"];
export type ProveedorUpdate = Database["public"]["Tables"]["proveedores"]["Update"];

export type CompraProveedor = Database["public"]["Tables"]["compras_proveedores"]["Row"];
export type CompraProveedorInsert = Database["public"]["Tables"]["compras_proveedores"]["Insert"];

export type ProveedorAbono = Database["public"]["Tables"]["proveedores_abonos"]["Row"];
export type ProveedorAbonoInsert = Database["public"]["Tables"]["proveedores_abonos"]["Insert"];

export interface AbonoMultiTicketItem {
  compra_id: string;
  monto: number;
  folio_ticket_nota?: string;
}

export interface RegistrarAbonoMultiplesTicketsParams {
  empresa_id: string;
  sucursal_id?: string | null;
  caja_turno_id?: string | null;
  caja_fondo_id?: string | null;
  proveedor_id: string;
  metodo_pago: "EFECTIVO_CAJA" | "TRANSFERENCIA" | "FONDO_RESERVA" | "OTRO";
  referencia?: string | null;
  items: AbonoMultiTicketItem[];
  monto_general_adicional?: number;
}

export interface CompraConProveedor extends CompraProveedor {
  proveedor?: {
    id: string;
    nombre_comercial: string;
    telefono: string | null;
    whatsapp: string | null;
    dias_credito: number;
  };
}

export interface DetalleTicketCompra extends CompraProveedor {
  proveedor?: {
    id: string;
    nombre_comercial: string;
    razon_social?: string | null;
    rfc?: string | null;
    categoria?: string | null;
    telefono?: string | null;
    whatsapp?: string | null;
    email?: string | null;
    contacto_nombre?: string | null;
    dias_credito?: number | null;
    saldo_deudor_actual?: number | null;
    limite_credito?: number | null;
  };
  orden?: {
    id: string;
    folio: number;
    estado?: string;
    estatus_pago?: string;
    fecha_ingreso?: string;
    vehiculo?: {
      id?: string;
      marca?: string;
      modelo?: string;
      anio?: number | null;
      placas?: string | null;
      cliente?: {
        id?: string;
        nombre?: string;
        telefono?: string | null;
      };
    };
  } | null;
  refacciones?: Array<{
    id: string;
    nombre: string;
    numero_parte: string | null;
    cantidad: number;
    costo_unitario: number;
    precio_unitario: number;
    subtotal: number;
    garantia_especifica: string | null;
    paquete_operacion?: string | null;
  }>;
  abonos?: Array<{
    id: string;
    monto: number;
    metodo_pago: string;
    referencia: string | null;
    fecha_abono: string;
    comprobante_url: string | null;
  }>;
}

export interface ResumenCxP {
  totalDeudaAcumulada: number;
  proveedoresConDeuda: number;
  comprasVencidas: number;
  comprasPorVencer: number;
}

export const ProveedorService = {
  /**
   * Obtiene la lista de proveedores activos para la empresa, opcionalmente filtrados por categoría
   */
  async obtenerProveedores(
    empresaId?: string,
    categoria?: string
  ): Promise<{ data: Proveedor[]; error: string | null }> {
    try {
      let query = supabase
        .from("proveedores")
        .select("*")
        .eq("activo", true)
        .order("nombre_comercial", { ascending: true });

      if (empresaId) {
        query = query.eq("empresa_id", empresaId);
      }

      if (categoria && categoria !== "TODAS") {
        query = query.eq("categoria", categoria);
      }

      const { data, error } = await query;
      if (error) throw error;
      return { data: (data as Proveedor[]) || [], error: null };
    } catch (err: any) {
      console.error("Error al obtener proveedores:", err);
      return { data: [], error: err.message || "Error al consultar catálogo de proveedores" };
    }
  },

  /**
   * Crea un nuevo proveedor
   */
  async crearProveedor(proveedor: ProveedorInsert): Promise<{ data: Proveedor | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from("proveedores")
        .insert(proveedor)
        .select()
        .single();

      if (error) throw error;
      return { data: data as Proveedor, error: null };
    } catch (err: any) {
      console.error("Error al crear proveedor:", err);
      return { data: null, error: err.message || "Error al dar de alta al proveedor" };
    }
  },

  /**
   * Actualiza los datos de un proveedor
   */
  async actualizarProveedor(id: string, updates: ProveedorUpdate): Promise<{ data: Proveedor | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from("proveedores")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return { data: data as Proveedor, error: null };
    } catch (err: any) {
      console.error("Error al actualizar proveedor:", err);
      return { data: null, error: err.message || "Error al actualizar proveedor" };
    }
  },

  /**
   * Sube una evidencia (foto de ticket / nota o PDF) al bucket 'proveedores-evidencias'
   */
  async subirEvidenciaCompra(
    file: File,
    empresaId: string,
    proveedorId: string
  ): Promise<{ publicUrl: string | null; storagePath: string | null; error: string | null }> {
    try {
      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const timestamp = Date.now();
      const storagePath = `${empresaId}/${proveedorId}/${timestamp}-${sanitizedName}`;

      const { error: uploadError } = await supabase.storage
        .from("proveedores-evidencias")
        .upload(storagePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        // Fallback a bucket 'evidencias-taller' si proveedores-evidencias no está provisionado
        const { error: fallbackError } = await supabase.storage
          .from("evidencias-taller")
          .upload(`proveedores/${storagePath}`, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (fallbackError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("evidencias-taller")
          .getPublicUrl(`proveedores/${storagePath}`);

        return {
          publicUrl: urlData.publicUrl,
          storagePath: `proveedores/${storagePath}`,
          error: null,
        };
      }

      const { data: urlData } = supabase.storage
        .from("proveedores-evidencias")
        .getPublicUrl(storagePath);

      return {
        publicUrl: urlData.publicUrl,
        storagePath,
        error: null,
      };
    } catch (err: any) {
      console.error("Error al subir evidencia de compra a proveedor:", err);
      return { publicUrl: null, storagePath: null, error: err.message || "Error al subir evidencia" };
    }
  },

  /**
   * Registra una compra de refacciones a proveedor (con evidencia, cálculo de garantía y fuente de pago)
   */
  async registrarCompraProveedor(
    compra: CompraProveedorInsert
  ): Promise<{ data: CompraProveedor | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from("compras_proveedores")
        .insert(compra)
        .select()
        .single();

      if (error) throw error;
      return { data: data as CompraProveedor, error: null };
    } catch (err: any) {
      console.error("Error al registrar compra a proveedor:", err);
      return { data: null, error: err.message || "Error al registrar compra de refacciones" };
    }
  },

  /**
   * Obtiene el historial de compras a proveedores con filtros de garantía y deudas
   */
  async obtenerCompras(params?: {
    empresaId?: string;
    proveedorId?: string;
    soloDeudas?: boolean;
    soloGarantiasVigentes?: boolean;
    cajaTurnoId?: string;
  }): Promise<{ data: CompraConProveedor[]; error: string | null }> {
    try {
      let query = supabase
        .from("compras_proveedores")
        .select(`
          *,
          proveedor:proveedores (
            id,
            nombre_comercial,
            telefono,
            whatsapp,
            dias_credito
          )
        `)
        .order("created_at", { ascending: false });

      if (params?.empresaId) query = query.eq("empresa_id", params.empresaId);
      if (params?.proveedorId) query = query.eq("proveedor_id", params.proveedorId);
      if (params?.cajaTurnoId) query = query.eq("caja_turno_id", params.cajaTurnoId);
      if (params?.soloDeudas) query = query.gt("monto_saldo_pendiente", 0);
      if (params?.soloGarantiasVigentes) query = query.eq("estatus_garantia", "VIGENTE");

      const { data, error } = await query;
      if (error) throw error;

      return { data: (data as any[]) || [], error: null };
    } catch (err: any) {
      console.error("Error al consultar compras a proveedores:", err);
      return { data: [], error: err.message || "Error al consultar compras" };
    }
  },

  /**
   * Registra un abono / liquidación a un proveedor
   */
  async registrarAbono(
    abono: ProveedorAbonoInsert
  ): Promise<{ data: ProveedorAbono | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from("proveedores_abonos")
        .insert(abono)
        .select()
        .single();

      if (error) throw error;
      return { data: data as ProveedorAbono, error: null };
    } catch (err: any) {
      console.error("Error al registrar abono a proveedor:", err);
      return { data: null, error: err.message || "Error al procesar abono" };
    }
  },

  /**
   * Registra el pago / abono a múltiples tickets en una sola operación,
   * amortizando individualmente cada factura y/o aplicando excedentes a la cuenta corriente
   */
  async registrarAbonoMultiplesTickets(
    params: RegistrarAbonoMultiplesTicketsParams
  ): Promise<{ success: boolean; abonosCreados: ProveedorAbono[]; error: string | null }> {
    try {
      const {
        empresa_id,
        sucursal_id,
        caja_turno_id,
        caja_fondo_id,
        proveedor_id,
        metodo_pago,
        referencia,
        items,
        monto_general_adicional,
      } = params;

      const abonosCreados: ProveedorAbono[] = [];
      const totalTickets = items.filter((it) => it.monto > 0).length;

      // 1. Registrar abono por cada ticket seleccionado
      for (const item of items) {
        if (item.monto <= 0) continue;

        let refFinal = referencia?.trim() || "";
        if (totalTickets > 1 && item.folio_ticket_nota) {
          const tag = `(Ticket #${item.folio_ticket_nota})`;
          refFinal = refFinal ? `${refFinal} ${tag}` : tag;
        }

        const payload: ProveedorAbonoInsert = {
          empresa_id,
          sucursal_id: sucursal_id || null,
          caja_turno_id: caja_turno_id || null,
          caja_fondo_id: caja_fondo_id || null,
          proveedor_id,
          compra_id: item.compra_id,
          monto: Number(item.monto.toFixed(2)),
          metodo_pago,
          referencia: refFinal.trim() || null,
        };

        const { data, error } = await supabase
          .from("proveedores_abonos")
          .insert(payload)
          .select()
          .single();

        if (error) throw error;
        if (data) abonosCreados.push(data as ProveedorAbono);
      }

      // 2. Si hay excedente o abono general sin ticket asignado
      if (monto_general_adicional && monto_general_adicional > 0) {
        const payloadGeneral: ProveedorAbonoInsert = {
          empresa_id,
          sucursal_id: sucursal_id || null,
          caja_turno_id: caja_turno_id || null,
          caja_fondo_id: caja_fondo_id || null,
          proveedor_id,
          compra_id: null,
          monto: Number(monto_general_adicional.toFixed(2)),
          metodo_pago,
          referencia: referencia ? `${referencia} (Abono general)` : "Abono general a cuenta corriente",
        };

        const { data, error } = await supabase
          .from("proveedores_abonos")
          .insert(payloadGeneral)
          .select()
          .single();

        if (error) throw error;
        if (data) abonosCreados.push(data as ProveedorAbono);
      }

      return { success: true, abonosCreados, error: null };
    } catch (err: any) {
      console.error("Error al registrar abonos múltiples a proveedor:", err);
      return { success: false, abonosCreados: [], error: err.message || "Error al procesar el pago" };
    }
  },

  /**
   * Obtiene la lista de abonos realizados a proveedores
   */
  async obtenerAbonos(params?: {
    empresaId?: string;
    proveedorId?: string;
  }): Promise<{ data: any[]; error: string | null }> {
    try {
      let query = supabase
        .from("proveedores_abonos")
        .select(`
          *,
          proveedor:proveedores (
            id,
            nombre_comercial
          ),
          compra:compras_proveedores (
            id,
            folio_ticket_nota,
            descripcion
          )
        `)
        .order("fecha_abono", { ascending: false });

      if (params?.empresaId) query = query.eq("empresa_id", params.empresaId);
      if (params?.proveedorId) query = query.eq("proveedor_id", params.proveedorId);

      const { data, error } = await query;
      if (error) throw error;
      return { data: data || [], error: null };
    } catch (err: any) {
      console.error("Error al obtener abonos de proveedores:", err);
      return { data: [], error: err.message || "Error al consultar abonos" };
    }
  },

  /**
   * Actualiza el estatus de garantía de una compra
   */
  async actualizarEstatusGarantia(
    compraId: string,
    estatusGarantia: "VIGENTE" | "EXPIRADA" | "EN_RECLAMACION" | "APLICADA" | "RECHAZADA",
    notasGarantia?: string
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const updates: any = {
        estatus_garantia: estatusGarantia,
        updated_at: new Date().toISOString(),
      };
      if (notasGarantia !== undefined) {
        updates.notas_garantia = notasGarantia;
      }

      const { error } = await supabase
        .from("compras_proveedores")
        .update(updates)
        .eq("id", compraId);

      if (error) throw error;
      return { success: true, error: null };
    } catch (err: any) {
      console.error("Error al actualizar garantía:", err);
      return { success: false, error: err.message || "Error al actualizar estatus de garantía" };
    }
  },

  /**
   * Obtiene las compras / tickets de proveedor registrados para una orden de trabajo específica
   */
  async obtenerComprasPorOrden(
    ordenServicioId: string
  ): Promise<{ data: any[]; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from("compras_proveedores")
        .select(`
          *,
          proveedores (
            id,
            nombre_comercial,
            telefono,
            whatsapp,
            dias_credito
          )
        `)
        .eq("orden_servicio_id", ordenServicioId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (err: any) {
      console.error("Error al obtener compras de la orden:", err);
      return { data: [], error: err.message || "Error al consultar compras de la orden" };
    }
  },

  /**
   * Vincula en bloque múltiples refacciones a un ticket de compra de proveedor
   */
  async vincularRefaccionesATicket(
    compra: {
      id: string;
      proveedor_id?: string;
      folio_ticket_nota: string;
      fuente_pago?: string;
      evidencia_url?: string | null;
      meses_garantia?: number;
    },
    refaccionIds: string[]
  ): Promise<{ success: boolean; error: string | null }> {
    if (!compra?.id || !refaccionIds || refaccionIds.length === 0) {
      return { success: true, error: null };
    }
    try {
      const updatePayload: Record<string, any> = {
        compra_proveedor_id: compra.id,
        folio_ticket_nota: compra.folio_ticket_nota,
        garantia_especifica: `${compra.meses_garantia || 1} meses - Nota #${compra.folio_ticket_nota}`,
      };
      if (compra.proveedor_id) updatePayload.proveedor_id = compra.proveedor_id;
      if (compra.fuente_pago) updatePayload.fuente_pago = compra.fuente_pago;
      if (compra.evidencia_url) updatePayload.evidencia_url = compra.evidencia_url;

      const { error } = await supabase
        .from("orden_servicio_refacciones")
        .update(updatePayload)
        .in("id", refaccionIds);

      if (error) throw error;
      return { success: true, error: null };
    } catch (err: any) {
      console.error("Error al vincular refacciones a ticket:", err);
      return { success: false, error: err.message || "Error al vincular refacciones" };
    }
  },

  /**
   * Obtiene el resumen de cuentas por pagar (CxP)
   */
  async obtenerResumenCxP(empresaId: string): Promise<ResumenCxP> {
    try {
      const { data, error } = await supabase
        .from("proveedores")
        .select("saldo_deudor_actual")
        .eq("empresa_id", empresaId)
        .gt("saldo_deudor_actual", 0);

      if (error) throw error;

      const totalDeuda = (data || []).reduce((acc, p) => acc + Number(p.saldo_deudor_actual || 0), 0);
      const proveedoresConDeuda = (data || []).length;

      // Consultar compras vencidas
      const today = new Date().toISOString().split("T")[0];
      const { data: vencidas } = await supabase
        .from("compras_proveedores")
        .select("id")
        .eq("empresa_id", empresaId)
        .gt("monto_saldo_pendiente", 0)
        .lt("fecha_limite_pago", today);

      return {
        totalDeudaAcumulada: Number(totalDeuda.toFixed(2)),
        proveedoresConDeuda,
        comprasVencidas: vencidas?.length || 0,
        comprasPorVencer: proveedoresConDeuda,
      };
    } catch (err) {
      console.error("Error al obtener resumen de CxP:", err);
      return {
        totalDeudaAcumulada: 0,
        proveedoresConDeuda: 0,
        comprasVencidas: 0,
        comprasPorVencer: 0,
      };
    }
  },

  /**
   * Obtiene el detalle integral de un ticket de compra a proveedor,
   * incluyendo proveedor, orden de servicio vinculada, refacciones y abonos aplicados
   */
  async obtenerDetalleCompra(
    compraId: string
  ): Promise<{ data: DetalleTicketCompra | null; error: string | null }> {
    try {
      const { data: compra, error } = await supabase
        .from("compras_proveedores")
        .select(`
          *,
          proveedor:proveedores (
            id,
            nombre_comercial,
            razon_social,
            rfc,
            categoria,
            telefono,
            whatsapp,
            email,
            contacto_nombre,
            dias_credito,
            saldo_deudor_actual,
            limite_credito
          )
        `)
        .eq("id", compraId)
        .single();

      if (error) throw error;
      if (!compra) return { data: null, error: "Ticket no encontrado" };

      // Consultar orden y vehículo si está asociada
      let ordenDetalle: any = null;
      if (compra.orden_servicio_id) {
        const { data: ordData } = await supabase
          .from("ordenes_servicio")
          .select(`
            id,
            folio,
            estado,
            estatus_pago,
            fecha_ingreso,
            vehiculos (
              id,
              marca,
              modelo,
              anio,
              placas,
              clientes (
                id,
                nombre,
                telefono
              )
            )
          `)
          .eq("id", compra.orden_servicio_id)
          .maybeSingle();

        if (ordData) {
          const veh = (ordData as any).vehiculos;
          ordenDetalle = {
            id: ordData.id,
            folio: ordData.folio,
            estado: ordData.estado,
            estatus_pago: ordData.estatus_pago,
            fecha_ingreso: ordData.fecha_ingreso,
            vehiculo: veh
              ? {
                  id: veh.id,
                  marca: veh.marca,
                  modelo: veh.modelo,
                  anio: veh.anio,
                  placas: veh.placas,
                  cliente: veh.clientes
                    ? {
                        id: veh.clientes.id,
                        nombre: veh.clientes.nombre,
                        telefono: veh.clientes.telefono,
                      }
                    : undefined,
                }
              : undefined,
          };
        }
      }

      // Consultar refacciones vinculadas a esta compra
      let { data: refaccionesData } = await supabase
        .from("orden_servicio_refacciones")
        .select("id, nombre, numero_parte, cantidad, costo_unitario, precio_unitario, subtotal, garantia_especifica, paquete_operacion")
        .eq("compra_proveedor_id", compraId);

      // Fallback si no tienen compra_proveedor_id pero pertenecen a la orden y folio
      if ((!refaccionesData || refaccionesData.length === 0) && compra.orden_servicio_id && compra.folio_ticket_nota) {
        const { data: fallbackRefacciones } = await supabase
          .from("orden_servicio_refacciones")
          .select("id, nombre, numero_parte, cantidad, costo_unitario, precio_unitario, subtotal, garantia_especifica, paquete_operacion")
          .eq("orden_servicio_id", compra.orden_servicio_id)
          .eq("folio_ticket_nota", compra.folio_ticket_nota);

        if (fallbackRefacciones && fallbackRefacciones.length > 0) {
          refaccionesData = fallbackRefacciones;
        }
      }

      // Consultar abonos aplicados a esta compra
      const { data: abonosData } = await supabase
        .from("proveedores_abonos")
        .select("id, monto, metodo_pago, referencia, fecha_abono, comprobante_url")
        .eq("compra_id", compraId)
        .order("fecha_abono", { ascending: false });

      const resultado: DetalleTicketCompra = {
        ...(compra as any),
        orden: ordenDetalle,
        refacciones: refaccionesData || [],
        abonos: abonosData || [],
      };

      return { data: resultado, error: null };
    } catch (err: any) {
      console.error("Error al obtener detalle de compra a proveedor:", err);
      return { data: null, error: err.message || "Error al obtener detalle del ticket" };
    }
  },

  /**
   * Adjunta o reemplaza la evidencia (foto/PDF) de un ticket existente
   */
  async adjuntarEvidenciaCompra(
    compraId: string,
    file: File,
    empresaId: string,
    proveedorId: string
  ): Promise<{ publicUrl: string | null; error: string | null }> {
    try {
      const uploadRes = await this.subirEvidenciaCompra(file, empresaId, proveedorId);
      if (uploadRes.error || !uploadRes.publicUrl) {
        throw new Error(uploadRes.error || "No se pudo subir el comprobante digital");
      }

      const { error: updateError } = await supabase
        .from("compras_proveedores")
        .update({
          evidencia_url: uploadRes.publicUrl,
          evidencia_storage_path: uploadRes.storagePath,
          evidencia_tipo: file.type.includes("pdf") ? "PDF" : "FOTO",
          updated_at: new Date().toISOString(),
        })
        .eq("id", compraId);

      if (updateError) throw updateError;

      return { publicUrl: uploadRes.publicUrl, error: null };
    } catch (err: any) {
      console.error("Error al adjuntar evidencia a ticket:", err);
      return { publicUrl: null, error: err.message || "Error al adjuntar evidencia" };
    }
  },
};
