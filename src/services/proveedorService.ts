import { supabase } from "@/lib/supabase";
import { Database } from "@/types/database.types";

export type Proveedor = Database["public"]["Tables"]["proveedores"]["Row"];
export type ProveedorInsert = Database["public"]["Tables"]["proveedores"]["Insert"];
export type ProveedorUpdate = Database["public"]["Tables"]["proveedores"]["Update"];

export type CompraProveedor = Database["public"]["Tables"]["compras_proveedores"]["Row"];
export type CompraProveedorInsert = Database["public"]["Tables"]["compras_proveedores"]["Insert"];

export type ProveedorAbono = Database["public"]["Tables"]["proveedores_abonos"]["Row"];
export type ProveedorAbonoInsert = Database["public"]["Tables"]["proveedores_abonos"]["Insert"];

export interface CompraConProveedor extends CompraProveedor {
  proveedor?: {
    id: string;
    nombre_comercial: string;
    telefono: string | null;
    whatsapp: string | null;
    dias_credito: number;
  };
}

export interface ResumenCxP {
  totalDeudaAcumulada: number;
  proveedoresConDeuda: number;
  comprasVencidas: number;
  comprasPorVencer: number;
}

export const ProveedorService = {
  /**
   * Obtiene la lista de proveedores activos para la empresa
   */
  async obtenerProveedores(empresaId?: string): Promise<{ data: Proveedor[]; error: string | null }> {
    try {
      let query = supabase
        .from("proveedores")
        .select("*")
        .eq("activo", true)
        .order("nombre_comercial", { ascending: true });

      if (empresaId) {
        query = query.eq("empresa_id", empresaId);
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
};
