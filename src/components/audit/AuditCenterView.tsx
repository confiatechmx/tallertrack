"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  RefreshCw,
  Download,
  Search,
  Filter,
  Calendar,
  Layers,
  ArrowUpDown,
  Eye,
  FileText,
  Clock,
  User,
  CheckCircle2,
  DollarSign,
  Package,
  Wrench,
} from "lucide-react";
import { auditLogService, AuditLogRecord, AuditLogFilters } from "@/services/auditLogService";
import { AuditSeverityBadge } from "./AuditSeverityBadge";
import { AuditChangesDiff } from "./AuditChangesDiff";
import { AuditDetailDrawer } from "./AuditDetailDrawer";
import { toast } from "sonner";

export const AuditCenterView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const pageSize = 50;

  // Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [entityFilter, setEntityFilter] = useState("ALL");
  const [severityFilter, setSeverityFilter] = useState<"ALL" | "INFO" | "WARNING" | "CRITICAL">("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [selectedLog, setSelectedLog] = useState<AuditLogRecord | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const filters: AuditLogFilters = {
        entityType: entityFilter !== "ALL" ? entityFilter : undefined,
        severity: severityFilter,
        search: searchTerm,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      };

      const result = await auditLogService.getLogs(filters, pageSize, page);
      setLogs(result.logs);
      setTotalCount(result.count);
    } catch (err) {
      console.error("Error al cargar registros en AuditCenterView:", err);
      toast.error("Error al cargar la bitácora de auditoría.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, entityFilter, severityFilter, dateFrom, dateTo]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    fetchLogs();
  };

  const handleExportCsv = () => {
    if (logs.length === 0) {
      toast.error("No hay eventos disponibles para exportar.");
      return;
    }
    auditLogService.exportToCsv(logs, `auditoria_tallertrack_${new Date().toISOString().split("T")[0]}.csv`);
    toast.success("Archivo CSV generado y descargado correctamente.");
  };

  // Metrics computation
  const metrics = useMemo(() => {
    const total = totalCount;
    const critical = logs.filter((l) => l.severity === "CRITICAL").length;
    const warnings = logs.filter((l) => l.severity === "WARNING").length;
    const operational = logs.filter((l) => l.severity === "INFO").length;
    return { total, critical, warnings, operational };
  }, [logs, totalCount]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200/80 text-blue-600 flex items-center justify-center font-bold shadow-2xs shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Bitácora de Auditoría Forense y Operativa
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 font-mono">
                ISO 27001
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Trazabilidad inmutable de cambios operativos, financieros e identidades en tiempo real.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            type="button"
            onClick={fetchLogs}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <RefreshCw size={13} className={loading ? "animate-spin text-blue-600" : ""} />
            Refrescar
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={logs.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <Download size={13} />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Total Eventos
          </span>
          <div className="text-2xl font-black text-slate-900 font-mono tabular-nums">
            {metrics.total.toLocaleString("es-MX")}
          </div>
          <span className="text-[10px] text-slate-500">Registrados en la bitácora</span>
        </div>

        <div className="p-4 rounded-xl border border-red-200/80 bg-red-50/40 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-red-600">
              Eventos Críticos
            </span>
            <ShieldAlert size={14} className="text-red-600" />
          </div>
          <div className="text-2xl font-black text-red-700 font-mono tabular-nums">
            {metrics.critical}
          </div>
          <span className="text-[10px] text-red-600/80">Cancelaciones y descuadres</span>
        </div>

        <div className="p-4 rounded-xl border border-amber-200/80 bg-amber-50/40 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
              Alertas / Modificaciones
            </span>
            <AlertTriangle size={14} className="text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-800 font-mono tabular-nums">
            {metrics.warnings}
          </div>
          <span className="text-[10px] text-amber-700/80">Descuentos y ajustes de stock</span>
        </div>

        <div className="p-4 rounded-xl border border-emerald-200/80 bg-emerald-50/40 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
              Operaciones Regulares
            </span>
            <CheckCircle2 size={14} className="text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-800 font-mono tabular-nums">
            {metrics.operational}
          </div>
          <span className="text-[10px] text-emerald-700/80">Flujo habitual de taller</span>
        </div>
      </div>

      {/* Filter Matrix Card */}
      <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Search bar */}
          <div className="md:col-span-2 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por usuario, orden, vehículo o acción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-slate-50/60 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Module dropdown */}
          <div>
            <select
              value={entityFilter}
              onChange={(e) => {
                setEntityFilter(e.target.value);
                setPage(0);
              }}
              className="w-full py-2 px-3 rounded-lg border border-slate-200 bg-slate-50/60 text-xs text-slate-800 font-semibold focus:outline-hidden focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="ALL">Todos los Módulos</option>
              <option value="ordenes_servicio">Órdenes de Trabajo</option>
              <option value="cotizaciones">Cotizaciones y Ventas</option>
              <option value="caja_turnos">Turnos de Caja</option>
              <option value="caja_movimientos">Movimientos de Caja</option>
              <option value="inventario_llantas_base">Inventario de Llantas</option>
              <option value="perfiles">Usuarios y Roles</option>
              <option value="vehiculos">Expediente de Vehículos</option>
            </select>
          </div>

          {/* Severity dropdown */}
          <div>
            <select
              value={severityFilter}
              onChange={(e) => {
                setSeverityFilter(e.target.value as any);
                setPage(0);
              }}
              className="w-full py-2 px-3 rounded-lg border border-slate-200 bg-slate-50/60 text-xs text-slate-800 font-semibold focus:outline-hidden focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="ALL">Todas las Severidades</option>
              <option value="INFO">🟢 Solo Operativos</option>
              <option value="WARNING">🟡 Solo Alertas</option>
              <option value="CRITICAL">🔴 Solo Críticos</option>
            </select>
          </div>

          {/* Search Trigger button */}
          <div>
            <button
              type="submit"
              className="w-full py-2 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-2xs"
            >
              Aplicar Filtros
            </button>
          </div>
        </form>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between">
          <div className="text-xs font-bold text-slate-700">
            Registro Cronológico de Auditoría
          </div>
          <div className="text-[11px] text-slate-500">
            Mostrando {logs.length} de {totalCount} eventos
          </div>
        </div>

        {loading ? (
          <div className="p-16 text-center space-y-2 text-slate-500 text-xs">
            <RefreshCw size={24} className="animate-spin mx-auto text-blue-600 mb-2" />
            <p>Cargando bitácora inmutable...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-16 text-center space-y-2 text-slate-500">
            <FileText size={36} className="mx-auto text-slate-300" />
            <p className="text-sm font-bold text-slate-700">No se encontraron eventos</p>
            <p className="text-xs text-slate-400">
              Prueba modificando los filtros de búsqueda o el rango de fechas.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  <th className="py-3 px-4">Fecha & Hora</th>
                  <th className="py-3 px-4">Severidad</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Entidad Afectada</th>
                  <th className="py-3 px-4">Resumen de la Acción</th>
                  <th className="py-3 px-4 text-right">Forense</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {logs.map((log) => {
                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* Fecha & Hora */}
                      <td className="py-3 px-4 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                        <div>
                          {new Date(log.created_at).toLocaleTimeString("es-MX", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(log.created_at).toLocaleDateString("es-MX", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                      </td>

                      {/* Severidad */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <AuditSeverityBadge severity={log.severity} />
                      </td>

                      {/* Actor */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-900">
                          {log.actor_nombre}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {log.actor_rol}
                        </div>
                      </td>

                      {/* Entidad */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-800">
                          {log.entity_label || log.entity_type}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          {log.entity_type}
                        </div>
                      </td>

                      {/* Resumen & Diffs */}
                      <td className="py-3 px-4 max-w-md">
                        <p className="font-semibold text-slate-800 leading-snug">
                          {log.summary}
                        </p>
                        {log.motivo && (
                          <p className="text-[11px] text-amber-800 mt-0.5">
                            <span className="font-bold">Motivo:</span> {log.motivo}
                          </p>
                        )}
                        {log.changes && Object.keys(log.changes).length > 0 && (
                          <div className="mt-1">
                            <AuditChangesDiff changes={log.changes} />
                          </div>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedLog(log)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                        >
                          <Eye size={12} className="text-blue-600" />
                          <span>Inspeccionar</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination controls */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/60 flex items-center justify-between text-xs text-slate-600">
          <span>
            Página {page + 1} de {Math.max(1, Math.ceil(totalCount / pageSize))}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || loading}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 text-xs font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={(page + 1) * pageSize >= totalCount || loading}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 text-xs font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>

      {/* Deep Forensics Drawer */}
      <AuditDetailDrawer
        log={selectedLog}
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
      />
    </div>
  );
};
