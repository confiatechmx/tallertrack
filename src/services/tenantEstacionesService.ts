import { supabase } from "@/lib/supabase";
import { Database } from "@/types/database.types";

export type TenantEstacionTrabajo = Database["public"]["Tables"]["tenant_estaciones_trabajo"]["Row"];
export type TenantEstacionTrabajoInsert = Database["public"]["Tables"]["tenant_estaciones_trabajo"]["Insert"];
export type TenantEstacionTrabajoUpdate = Database["public"]["Tables"]["tenant_estaciones_trabajo"]["Update"];

export const DEFAULT_COVA_ESTACIONES: { nombre: string; tipo: "FOSA" | "RAMPA" | "PORTERIA" | "COMODIN" | "BAHIA"; codigo: string }[] = [
  { nombre: "Fosa de diagnóstico", tipo: "FOSA", codigo: "FOSA-DIAG" },
  { nombre: "Rampa frenera 1", tipo: "RAMPA", codigo: "RAMPA-FRENOS-1" },
  { nombre: "Rampa frenera 2", tipo: "RAMPA", codigo: "RAMPA-FRENOS-2" },
  { nombre: "Portería", tipo: "PORTERIA", codigo: "PORTERIA" },
  { nombre: "Comodín 1", tipo: "COMODIN", codigo: "COMODIN-1" },
  { nombre: "Comodín 2", tipo: "COMODIN", codigo: "COMODIN-2" },
];

export const TenantEstacionesService = {
  /**
   * Obtiene todas las estaciones de trabajo activas de la empresa/sucursal
   */
  async obtenerEstaciones(
    empresaId?: string,
    sucursalId?: string
  ): Promise<{ data: TenantEstacionTrabajo[]; error: string | null }> {
    try {
      let query = supabase
        .from("tenant_estaciones_trabajo")
        .select("*")
        .eq("activo", true);

      if (empresaId) query = query.eq("empresa_id", empresaId);
      if (sucursalId) {
        query = query.or(`sucursal_id.is.null,sucursal_id.eq.${sucursalId}`);
      }

      query = query.order("orden", { ascending: true });

      const { data, error } = await query;
      if (error) throw error;

      return { data: (data as TenantEstacionTrabajo[]) || [], error: null };
    } catch (err: any) {
      console.error("Error al obtener estaciones de trabajo:", err);
      return { data: [], error: err.message || "Error al consultar estaciones" };
    }
  },

  /**
   * Obtiene todas las estaciones (activas e inactivas) para el panel de configuración
   */
  async obtenerTodasLasEstaciones(
    empresaId: string,
    sucursalId?: string
  ): Promise<{ data: TenantEstacionTrabajo[]; error: string | null }> {
    try {
      let query = supabase
        .from("tenant_estaciones_trabajo")
        .select("*")
        .eq("empresa_id", empresaId);

      if (sucursalId) {
        query = query.or(`sucursal_id.is.null,sucursal_id.eq.${sucursalId}`);
      }

      query = query.order("orden", { ascending: true });

      const { data, error } = await query;
      if (error) throw error;

      return { data: (data as TenantEstacionTrabajo[]) || [], error: null };
    } catch (err: any) {
      console.error("Error al obtener todas las estaciones:", err);
      return { data: [], error: err.message || "Error al consultar catálogo de estaciones" };
    }
  },

  /**
   * Da de alta una nueva estación de trabajo en el taller
   */
  async crearEstacion(
    estacion: TenantEstacionTrabajoInsert
  ): Promise<{ data: TenantEstacionTrabajo | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from("tenant_estaciones_trabajo")
        .insert(estacion)
        .select()
        .single();

      if (error) throw error;
      return { data: data as TenantEstacionTrabajo, error: null };
    } catch (err: any) {
      console.error("Error al crear estación de trabajo:", err);
      return { data: null, error: err.message || "Error al crear estación de trabajo" };
    }
  },

  /**
   * Actualiza los datos de una estación de trabajo (nombre, tipo, código, activo, orden)
   */
  async actualizarEstacion(
    id: string,
    updates: TenantEstacionTrabajoUpdate
  ): Promise<{ data: TenantEstacionTrabajo | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from("tenant_estaciones_trabajo")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return { data: data as TenantEstacionTrabajo, error: null };
    } catch (err: any) {
      console.error("Error al actualizar estación:", err);
      return { data: null, error: err.message || "Error al actualizar estación" };
    }
  },

  /**
   * Elimina o desactiva lógicamente una estación
   */
  async desactivarEstacion(id: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await supabase
        .from("tenant_estaciones_trabajo")
        .update({ activo: false, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
      return { success: true, error: null };
    } catch (err: any) {
      console.error("Error al desactivar estación:", err);
      return { success: false, error: err.message || "Error al desactivar estación" };
    }
  },
};
