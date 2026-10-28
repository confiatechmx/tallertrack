"use client";

import React, { useState } from "react";
import {
  X,
  ShieldCheck,
  Clock,
  User,
  Monitor,
  Globe,
  Copy,
  Check,
  Terminal,
  FileSpreadsheet,
  AlertOctagon,
} from "lucide-react";
import { AuditLogRecord } from "@/services/auditLogService";
import { AuditSeverityBadge } from "./AuditSeverityBadge";
import { AuditChangesDiff } from "./AuditChangesDiff";
import { toast } from "sonner";

interface AuditDetailDrawerProps {
  log: AuditLogRecord | null;
  isOpen: boolean;
  onClose: () => void;
}

export const AuditDetailDrawer: React.FC<AuditDetailDrawerProps> = ({
  log,
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<"resumen" | "json">("resumen");
  const [copied, setCopied] = useState(false);

  if (!isOpen || !log) return null;

  const handleCopyJson = () => {
    const jsonStr = JSON.stringify(log, null, 2);
    navigator.clipboard.writeText(jsonStr);
    setCopied(true);
    toast.success("Payload JSON copiado al portapapeles");
    setTimeout(() => setCopied(false), 2000);
  };

  const formattedDate = new Date(log.created_at).toLocaleString("es-MX", {
    dateStyle: "full",
    timeStyle: "medium",
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-white h-full flex flex-col shadow-2xl border-l border-slate-200 animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200/80 text-blue-600 flex items-center justify-center font-bold shadow-2xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  Inspección Forense de Auditoría
                </h3>
                <AuditSeverityBadge severity={log.severity} />
              </div>
              <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                ID: {log.id}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Inmutability Shield Banner */}
        <div className="bg-emerald-50/80 border-b border-emerald-200/70 px-5 py-2.5 flex items-center justify-between text-xs text-emerald-900">
          <div className="flex items-center gap-2">
            <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
            <span className="font-semibold text-[11px]">
              Registro Inmutable (CDC Database Trigger)
            </span>
          </div>
          <span className="text-[10px] font-mono bg-emerald-200/80 text-emerald-800 px-2 py-0.5 rounded font-bold uppercase">
            Append-Only
          </span>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-200 bg-white px-5 pt-2">
          <button
            onClick={() => setActiveTab("resumen")}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === "resumen"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <FileSpreadsheet size={13} />
            Resumen Operativo
          </button>
          <button
            onClick={() => setActiveTab("json")}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === "json"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Terminal size={13} />
            Payload Técnico JSON
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {activeTab === "resumen" ? (
            <>
              {/* Event Narrative Highlight */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1.5">
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                  Resumen de la Acción
                </div>
                <div className="text-sm font-bold text-slate-900 leading-snug">
                  {log.summary}
                </div>
                {log.motivo && (
                  <div className="mt-2 pt-2 border-t border-slate-200/70 text-xs text-amber-900 bg-amber-50/80 p-2 rounded-lg border border-amber-200/60">
                    <strong className="block text-[10px] uppercase text-amber-700 font-bold mb-0.5">
                      Motivo / Justificación Declarada:
                    </strong>
                    {log.motivo}
                  </div>
                )}
              </div>

              {/* Actor & Execution Metadata */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-medium">
                    <User size={13} className="text-blue-600" />
                    <span>Actor Responsable</span>
                  </div>
                  <p className="text-xs font-bold text-slate-900">
                    {log.actor_nombre}
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Rol: {log.actor_rol}
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-medium">
                    <Clock size={13} className="text-slate-500" />
                    <span>Fecha & Hora</span>
                  </div>
                  <p className="text-xs font-bold text-slate-900">
                    {new Date(log.created_at).toLocaleTimeString("es-MX", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {new Date(log.created_at).toLocaleDateString("es-MX", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>

              {/* Target Entity Card */}
              <div className="p-3.5 rounded-lg border border-slate-200 bg-white space-y-1.5">
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                  Entidad Afectada
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">
                    {log.entity_label || log.entity_type}
                  </span>
                  <span className="font-mono text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                    {log.entity_type}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-slate-400">
                  UUID: {log.entity_id}
                </div>
              </div>

              {/* Field Diffs */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-900">
                  Diferencias Registradas (OLD vs NEW)
                </div>
                <div className="p-3 rounded-lg border border-slate-200 bg-white">
                  <AuditChangesDiff changes={log.changes} />
                </div>
              </div>

              {/* Network and Client Fingerprint */}
              <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/40 space-y-2 text-xs">
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                  Huella de Red y Cliente
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-500 flex items-center gap-1">
                      <Globe size={11} /> IP de Origen:
                    </span>
                    <strong className="font-mono text-slate-800">
                      {log.ip_address || "127.0.0.1 (Local / Servidor)"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 flex items-center gap-1">
                      <Monitor size={11} /> Tipo de Cliente:
                    </span>
                    <span className="text-slate-800 truncate block" title={log.user_agent || "N/A"}>
                      {log.user_agent ? (log.user_agent.includes("Mobile") ? "Dispositivo Móvil" : "Navegador de Escritorio") : "Cliente Web Directo"}
                    </span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-slate-500">
                  Payload JSON inmutable ({Object.keys(log).length} propiedades)
                </span>
                <button
                  onClick={handleCopyJson}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                >
                  {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                  {copied ? "Copiado" : "Copiar JSON"}
                </button>
              </div>

              <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 text-[11px] font-mono overflow-x-auto max-h-[500px] leading-relaxed border border-slate-800 select-all">
                {JSON.stringify(log, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/60 flex items-center justify-between text-xs text-slate-500">
          <span>Estándar ISO 27001 / SOC 2 Compliance</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold cursor-pointer transition-colors"
          >
            Cerrar Ficha
          </button>
        </div>
      </div>
    </div>
  );
};
