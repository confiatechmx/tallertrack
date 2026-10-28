import { supabase } from "@/lib/supabase";
import { Database } from "@/types/database.types";

export type AuditLogRow = Database["public"]["Tables"]["audit_logs"]["Row"];

export interface AuditLogRecord {
  id: string;
  empresa_id: string;
  sucursal_id: string | null;
  actor_id: string | null;
  actor_nombre: string;
  actor_rol: string;
  ip_address: string | null;
  user_agent: string | null;
  entity_type: string;
  entity_id: string;
  entity_label: string | null;
  action: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  summary: string;
  motivo: string | null;
  changes: Record<string, { old: any; new: any }> | null;
  snapshot: any | null;
  created_at: string;
}

export interface AuditLogFilters {
  entityType?: string;
  entityId?: string;
  actorId?: string;
  severity?: "ALL" | "INFO" | "WARNING" | "CRITICAL";
  action?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  sucursalId?: string;
}

export const auditLogService = {
  /**
   * Obtiene la bitácora de auditoría con soporte para filtros multidimensionales y paginación.
   */
  async getLogs(filters: AuditLogFilters = {}, limit: number = 50, page: number = 0): Promise<{ logs: AuditLogRecord[]; count: number }> {
    try {
      let query = supabase
        .from("audit_logs")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      if (filters.entityType && filters.entityType !== "ALL") {
        query = query.eq("entity_type", filters.entityType);
      }

      if (filters.entityId) {
        query = query.eq("entity_id", filters.entityId);
      }

      if (filters.actorId) {
        query = query.eq("actor_id", filters.actorId);
      }

      if (filters.severity && filters.severity !== "ALL") {
        query = query.eq("severity", filters.severity);
      }

      if (filters.action && filters.action !== "ALL") {
        query = query.eq("action", filters.action);
      }

      if (filters.sucursalId && filters.sucursalId !== "ALL") {
        query = query.eq("sucursal_id", filters.sucursalId);
      }

      if (filters.dateFrom) {
        query = query.gte("created_at", `${filters.dateFrom}T00:00:00Z`);
      }

      if (filters.dateTo) {
        query = query.lte("created_at", `${filters.dateTo}T23:59:59Z`);
      }

      if (filters.search && filters.search.trim() !== "") {
        const term = filters.search.trim();
        query = query.or(`summary.ilike.%${term}%,actor_nombre.ilike.%${term}%,entity_label.ilike.%${term}%,action.ilike.%${term}%`);
      }

      const from = page * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, count, error } = await query;
      if (error) {
        console.error("Error al consultar audit_logs:", error);
        return { logs: [], count: 0 };
      }

      const formatted: AuditLogRecord[] = (data || []).map((row) => ({
        id: row.id,
        empresa_id: row.empresa_id,
        sucursal_id: row.sucursal_id,
        actor_id: row.actor_id,
        actor_nombre: row.actor_nombre || "Sistema",
        actor_rol: row.actor_rol || "Sistema",
        ip_address: row.ip_address,
        user_agent: row.user_agent,
        entity_type: row.entity_type,
        entity_id: row.entity_id,
        entity_label: row.entity_label,
        action: row.action,
        severity: (row.severity as "INFO" | "WARNING" | "CRITICAL") || "INFO",
        summary: row.summary,
        motivo: row.motivo,
        changes: (row.changes as any) || {},
        snapshot: row.snapshot,
        created_at: row.created_at,
      }));

      return { logs: formatted, count: count || 0 };
    } catch (err) {
      console.error("Fallo inesperado consultando audit_logs:", err);
      return { logs: [], count: 0 };
    }
  },

  /**
   * Obtiene la línea de tiempo inmutable de una entidad específica (ej. Orden #1042 o Turno #15).
   */
  async getEntityTimeline(entityType: string, entityId: string): Promise<AuditLogRecord[]> {
    try {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error(`Error al consultar timeline de ${entityType}/${entityId}:`, error);
        return [];
      }

      return (data || []).map((row) => ({
        id: row.id,
        empresa_id: row.empresa_id,
        sucursal_id: row.sucursal_id,
        actor_id: row.actor_id,
        actor_nombre: row.actor_nombre || "Sistema",
        actor_rol: row.actor_rol || "Sistema",
        ip_address: row.ip_address,
        user_agent: row.user_agent,
        entity_type: row.entity_type,
        entity_id: row.entity_id,
        entity_label: row.entity_label,
        action: row.action,
        severity: (row.severity as "INFO" | "WARNING" | "CRITICAL") || "INFO",
        summary: row.summary,
        motivo: row.motivo,
        changes: (row.changes as any) || {},
        snapshot: row.snapshot,
        created_at: row.created_at,
      }));
    } catch (err) {
      console.error("Fallo inesperado en getEntityTimeline:", err);
      return [];
    }
  },

  /**
   * Registra un evento de negocio explícito mediante la función RPC segura.
   */
  async logCustomEvent(params: {
    entityType: string;
    entityId: string;
    action: string;
    summary: string;
    severity?: "INFO" | "WARNING" | "CRITICAL";
    motivo?: string;
    details?: Record<string, any>;
  }): Promise<string | null> {
    try {
      const { data, error } = await (supabase.rpc as any)("log_custom_audit", {
        p_entity_type: params.entityType,
        p_entity_id: params.entityId,
        p_action: params.action,
        p_summary: params.summary,
        p_severity: params.severity || "INFO",
        p_motivo: params.motivo || null,
        p_details: params.details || {},
      });

      if (error) {
        console.error("Error ejecutando log_custom_audit RPC:", error);
        return null;
      }
      return data;
    } catch (err) {
      console.error("Fallo inesperado registrando custom audit log:", err);
      return null;
    }
  },

  /**
   * Exporta un set de logs a formato CSV con codificación UTF-8 con BOM para visualización en Excel.
   */
  exportToCsv(logs: AuditLogRecord[], filename: string = "bitacora_auditoria_tallertrack.csv"): void {
    if (!logs || logs.length === 0) return;

    const headers = [
      "Fecha y Hora (UTC)",
      "Severidad",
      "Actor",
      "Rol",
      "Módulo / Entidad",
      "Etiqueta",
      "Acción",
      "Resumen Narrativo",
      "Motivo Declarado",
      "IP Origen",
    ];

    const escapeCsv = (str: string | null | undefined) => {
      if (str == null) return '""';
      const clean = String(str).replace(/"/g, '""');
      return `"${clean}"`;
    };

    const rows = logs.map((log) => [
      escapeCsv(new Date(log.created_at).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "medium" })),
      escapeCsv(log.severity),
      escapeCsv(log.actor_nombre),
      escapeCsv(log.actor_rol),
      escapeCsv(log.entity_type),
      escapeCsv(log.entity_label || ""),
      escapeCsv(log.action),
      escapeCsv(log.summary),
      escapeCsv(log.motivo || "N/A"),
      escapeCsv(log.ip_address || "N/A"),
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
};
