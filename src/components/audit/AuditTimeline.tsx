"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Clock,
  User,
  ShieldCheck,
  RefreshCw,
  Search,
  Filter,
  ArrowRight,
  Eye,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { auditLogService, AuditLogRecord } from "@/services/auditLogService";
import { AuditSeverityBadge } from "./AuditSeverityBadge";
import { AuditChangesDiff } from "./AuditChangesDiff";
import { AuditDetailDrawer } from "./AuditDetailDrawer";

interface AuditTimelineProps {
  entityType?: string;
  entityId?: string;
  limit?: number;
  className?: string;
  title?: string;
  subtitle?: string;
}

export const AuditTimeline: React.FC<AuditTimelineProps> = ({
  entityType,
  entityId,
  limit = 50,
  className = "",
  title = "Línea de Tiempo de Auditoría Forense",
  subtitle = "Registro cronológico inmutable de cambios y operaciones.",
}) => {
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState<"ALL" | "INFO" | "WARNING" | "CRITICAL">("ALL");
  const [selectedLog, setSelectedLog] = useState<AuditLogRecord | null>(null);

  const loadLogs = async () => {
    setLoading(true);
    try {
      if (entityType && entityId) {
        const data = await auditLogService.getEntityTimeline(entityType, entityId);
        setLogs(data);
      } else {
        const { logs: data } = await auditLogService.getLogs(
          {
            entityType: entityType !== "ALL" ? entityType : undefined,
            severity: severityFilter,
            search: searchTerm,
          },
          limit
        );
        setLogs(data);
      }
    } catch (err) {
      console.error("Error cargando timeline de auditoría:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [entityType, entityId]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesSeverity =
        severityFilter === "ALL" || log.severity === severityFilter;

      const term = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !term ||
        log.summary.toLowerCase().includes(term) ||
        log.actor_nombre.toLowerCase().includes(term) ||
        (log.entity_label && log.entity_label.toLowerCase().includes(term)) ||
        (log.motivo && log.motivo.toLowerCase().includes(term));

      return matchesSeverity && matchesSearch;
    });
  }, [logs, severityFilter, searchTerm]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50/70">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-100/70 text-blue-700 flex items-center justify-center shrink-0">
            <ShieldCheck size={18} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">{title}</h4>
            <p className="text-[11px] text-slate-500">{subtitle}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadLogs}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw size={12} className={loading ? "animate-spin text-blue-600" : ""} />
          Actualizar
        </button>
      </div>

      {/* Filter and Search controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
        {/* Severity Pills */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          {(
            [
              { id: "ALL", label: "Todos", count: logs.length },
              { id: "INFO", label: "Operativos", count: logs.filter((l) => l.severity === "INFO").length },
              { id: "WARNING", label: "Alertas", count: logs.filter((l) => l.severity === "WARNING").length },
              { id: "CRITICAL", label: "Críticos", count: logs.filter((l) => l.severity === "CRITICAL").length },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              onClick={() => setSeverityFilter(item.id)}
              className={`px-2.5 py-1 rounded-md font-semibold text-[11px] transition-all cursor-pointer flex items-center gap-1.5 ${
                severityFilter === item.id
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>{item.label}</span>
              <span className="text-[10px] font-mono px-1 py-0.2 rounded-full bg-slate-200/60 text-slate-700">
                {item.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-60">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por usuario o acción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Chronological Stream */}
      {loading ? (
        <div className="p-10 text-center space-y-2 text-slate-500 text-xs">
          <RefreshCw size={20} className="animate-spin mx-auto text-blue-600 mb-2" />
          <p>Cargando registros inmutables de auditoría...</p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 text-slate-500 space-y-1.5">
          <FileText size={28} className="mx-auto text-slate-400" />
          <p className="text-xs font-semibold text-slate-700">
            No hay registros de auditoría que coincidan
          </p>
          <p className="text-[11px] text-slate-400">
            Cualquier modificación futura quedará registrada automáticamente aquí.
          </p>
        </div>
      ) : (
        <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
          {filteredLogs.map((log) => {
            const hasDiffs = log.changes && Object.keys(log.changes).length > 0;

            return (
              <div
                key={log.id}
                className="relative group p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs transition-all"
              >
                {/* Node circle on the vertical timeline */}
                <div
                  className={`absolute -left-[27px] top-4 w-3.5 h-3.5 rounded-full border-2 border-white ring-1 shadow-2xs ${
                    log.severity === "CRITICAL"
                      ? "bg-red-600 ring-red-300"
                      : log.severity === "WARNING"
                      ? "bg-amber-500 ring-amber-300"
                      : "bg-blue-600 ring-blue-300"
                  }`}
                />

                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center flex-wrap gap-2 text-xs">
                      <span className="font-bold text-slate-900">
                        {log.actor_nombre}
                      </span>
                      <span className="text-[10px] bg-slate-100 text-slate-600 font-medium px-1.5 py-0.5 rounded">
                        {log.actor_rol}
                      </span>
                      <span className="text-slate-300">•</span>
                      <AuditSeverityBadge severity={log.severity} showIcon={false} />
                      <span className="text-slate-300">•</span>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                        <Clock size={11} />
                        {new Date(log.created_at).toLocaleTimeString("es-MX", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        ({new Date(log.created_at).toLocaleDateString("es-MX", {
                          day: "2-digit",
                          month: "short",
                        })})
                      </span>
                    </div>

                    {/* Natural Language Summary */}
                    <p className="text-xs font-semibold text-slate-800 leading-snug pt-0.5">
                      {log.summary}
                    </p>

                    {/* Justification note if present */}
                    {log.motivo && (
                      <p className="text-[11px] text-amber-800 bg-amber-50 px-2 py-1 rounded border border-amber-200/60 inline-block font-medium">
                        <strong>Motivo:</strong> {log.motivo}
                      </p>
                    )}

                    {/* Inline diffs preview */}
                    {hasDiffs && (
                      <div className="pt-2">
                        <AuditChangesDiff changes={log.changes} />
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedLog(log)}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 text-xs font-semibold shrink-0 flex items-center gap-1 cursor-pointer transition-colors"
                    title="Inspeccionar datos técnicos forenses"
                  >
                    <Eye size={13} />
                    <span className="hidden sm:inline text-[11px]">Detalles</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Forensics Technical Drawer */}
      <AuditDetailDrawer
        log={selectedLog}
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
      />
    </div>
  );
};
