"use client";

import React from "react";
import { X, Download, ExternalLink, ShieldCheck, Calendar, Hash, FileText } from "lucide-react";

interface TicketEvidenceLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  evidenciaUrl: string | null;
  folio: string;
  proveedorNombre?: string;
  descripcion?: string;
  monto?: number;
  fechaCompra?: string;
  fechaVencimientoGarantia?: string;
  estatusGarantia?: string;
}

export function TicketEvidenceLightbox({
  isOpen,
  onClose,
  evidenciaUrl,
  folio,
  proveedorNombre,
  descripcion,
  monto,
  fechaCompra,
  fechaVencimientoGarantia,
  estatusGarantia,
}: TicketEvidenceLightboxProps) {
  if (!isOpen || !evidenciaUrl) return null;

  const isPdf = evidenciaUrl.toLowerCase().includes(".pdf");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-4xl max-h-[92vh] rounded-2xl shadow-2xl border border-slate-700/50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="p-1.5 bg-primary/20 text-primary-light rounded-lg">
              <FileText className="w-4 h-4 text-sky-400" />
            </span>
            <div className="truncate">
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                Ticket / Nota: <span className="text-sky-400 font-mono">#{folio}</span>
              </h3>
              <p className="text-xs text-slate-400 truncate">
                {proveedorNombre || "Proveedor"} {descripcion ? `• ${descripcion}` : ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={evidenciaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Abrir en pestaña nueva"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <a
              href={evidenciaUrl}
              download={`Ticket_${folio}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Descargar archivo"
            >
              <Download className="w-4 h-4" />
            </a>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-auto bg-slate-950/50 p-4 flex items-center justify-center min-h-[350px]">
          {isPdf ? (
            <iframe
              src={evidenciaUrl}
              title={`Ticket PDF ${folio}`}
              className="w-full h-[65vh] rounded-lg border border-slate-800 bg-white"
            />
          ) : (
            <div className="relative max-h-[70vh] flex items-center justify-center">
              <img
                src={evidenciaUrl}
                alt={`Evidencia Ticket ${folio}`}
                className="max-h-[70vh] max-w-full object-contain rounded-lg shadow-lg"
              />
            </div>
          )}
        </div>

        {/* Footer Info & Warranty details */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 text-slate-600">
            {fechaCompra && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Comprado: <strong className="text-slate-800">{fechaCompra}</strong>
              </span>
            )}
            {monto !== undefined && (
              <span>
                Monto: <strong className="text-slate-900">${Number(monto).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</strong>
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {fechaVencimientoGarantia && (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Garantía hasta: <strong>{fechaVencimientoGarantia}</strong>
              </span>
            )}
            {estatusGarantia && (
              <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                estatusGarantia === "VIGENTE" ? "bg-emerald-100 text-emerald-800" :
                estatusGarantia === "EN_RECLAMACION" ? "bg-amber-100 text-amber-800" :
                estatusGarantia === "APLICADA" ? "bg-blue-100 text-blue-800" :
                "bg-slate-200 text-slate-700"
              }`}>
                {estatusGarantia}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
