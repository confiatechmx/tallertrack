import { supabase } from "@/lib/supabase";
import { Database } from "@/types/database.types";

export type TenantMetodoPago = Database["public"]["Tables"]["tenant_metodos_pago"]["Row"];
export type TenantMetodoPagoInsert = Database["public"]["Tables"]["tenant_metodos_pago"]["Insert"];
export type TenantMetodoPagoUpdate = Database["public"]["Tables"]["tenant_metodos_pago"]["Update"];

export interface ComisionCalculada {
  montoBruto: number;
  comisionPorcentaje: number;
  comisionFija: number;
  comisionMonto: number;
  montoNeto: number;
}

export const TenantMetodosPagoService = {
  /**
   * Obtiene todos los métodos de pago configurados para la empresa/sucursal
   */
  async obtenerMetodos(empresaId?: string, sucursalId?: string): Promise<{ data: TenantMetodoPago[]; error: string | null }> {
    try {
      let query = supabase
        .from("tenant_metodos_pago")
        .select(`
          *,
          cuenta_bancaria:cuentas_bancarias (
            id,
            banco,
            alias,
            clabe,
            numero_cuenta,
            es_fiscal
          ),
          caja_fondo:caja_fondos (
            id,
            nombre,
            tipo
          )
        `)
        .eq("activo", true)
        .order("orden", { ascending: true });

      if (empresaId) query = query.eq("empresa_id", empresaId);
      if (sucursalId) {
        query = query.or(`sucursal_id.is.null,sucursal_id.eq.${sucursalId}`);
      }

      const { data, error } = await query;
      if (error) throw error;

      return { data: (data as any[]) || [], error: null };
    } catch (err: any) {
      console.error("Error al obtener métodos de pago:", err);
      return { data: [], error: err.message || "Error al consultar métodos de pago" };
    }
  },

  /**
   * Da de alta un nuevo método o terminal de pago en la infraestructura
   */
  async crearMetodo(metodo: TenantMetodoPagoInsert): Promise<{ data: TenantMetodoPago | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from("tenant_metodos_pago")
        .insert(metodo)
        .select()
        .single();

      if (error) throw error;
      return { data: data as TenantMetodoPago, error: null };
    } catch (err: any) {
      console.error("Error al crear método de pago:", err);
      return { data: null, error: err.message || "Error al crear método de pago" };
    }
  },

  /**
   * Actualiza la tasa de comisión, plazo MSI o cuenta bancaria vinculada
   */
  async actualizarMetodo(
    id: string,
    updates: TenantMetodoPagoUpdate
  ): Promise<{ data: TenantMetodoPago | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from("tenant_metodos_pago")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return { data: data as TenantMetodoPago, error: null };
    } catch (err: any) {
      console.error("Error al actualizar método de pago:", err);
      return { data: null, error: err.message || "Error al actualizar método de pago" };
    }
  },

  /**
   * Calcula el desglose financiero exacto de la comisión bancaria y el monto neto a recibir
   * según las reglas acordadas (la comisión la absorbe el negocio restándola de la ganancia neta).
   */
  calcularComision(montoBruto: number, metodo?: Partial<TenantMetodoPago>): ComisionCalculada {
    if (!metodo || montoBruto <= 0) {
      return {
        montoBruto,
        comisionPorcentaje: 0,
        comisionFija: 0,
        comisionMonto: 0,
        montoNeto: montoBruto,
      };
    }

    const pct = Number(metodo.comision_porcentaje || 0);
    const fija = Number(metodo.comision_fija || 0);

    // En México las comisiones de pasarela tienen IVA (16%)
    // Si la tasa no tiene IVA incluido: comision * 1.16
    const basePctMonto = (montoBruto * pct) / 100;
    const factorIva = metodo.comision_iva_incluido ? 1.0 : 1.16;
    const comisionTotal = Number(((basePctMonto + fija) * factorIva).toFixed(2));
    const montoNeto = Number(Math.max(0, montoBruto - comisionTotal).toFixed(2));

    return {
      montoBruto,
      comisionPorcentaje: pct,
      comisionFija: fija,
      comisionMonto: comisionTotal,
      montoNeto,
    };
  },
};
