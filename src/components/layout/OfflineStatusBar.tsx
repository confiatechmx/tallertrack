"use client";

import React, { useState } from "react";
import { useOfflineSync } from "@/context/OfflineSyncContext";
import { WifiOff, RefreshCw, Smartphone, CheckCircle2, AlertCircle, ChevronUp, ChevronDown } from "lucide-react";

export function OfflineStatusBar() {
  const {
    isOnline,
    isSyncing,
    pendingCount,
    failedCount,
    terminalId,
    terminalName,
    presetTerminales,
    cambiarTerminal,
    syncNow,
  } = useOfflineSync();

  const [expanded, setExpanded] = useState(false);

  // Si está 100% online y no hay mutaciones pendientes ni fallidas, CERO ruido visual
  if (isOnline && pendingCount === 0 && failedCount === 0) {
    return null;
  }

  return (
    <aside
      aria-label="Estado de conectividad y sincronización"
      className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200"
    >
      {/* Selector Desplegable de Estación (si se expande) */}
      {expanded && (
        <div className="w-72 p-3 bg-zinc-950 text-white border border-zinc-800 rounded-2xl shadow-2xl text-left mb-1">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-800">
            <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Estación de Trabajo</p>
            <span className="text-[10px] font-mono text-zinc-500">ID: {terminalId}</span>
          </div>
          <div className="space-y-1">
            {presetTerminales.map((term) => (
              <button
                key={term.id}
                type="button"
                onClick={() => {
                  cambiarTerminal(term.id);
                  setExpanded(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-colors flex flex-col cursor-pointer ${
                  terminalId === term.id
                    ? "bg-blue-600 text-white font-bold"
                    : "text-zinc-300 hover:bg-zinc-800 hover:text-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{term.nombre}</span>
                  <span className={`font-mono text-[10px] px-1.5 py-0.2 rounded ${
                    terminalId === term.id ? "bg-blue-700 text-white" : "bg-zinc-800 text-zinc-400"
                  }`}>
                    {term.id}
                  </span>
                </div>
                <span className={`text-[10px] mt-0.5 ${
                  terminalId === term.id ? "text-blue-100" : "text-zinc-400"
                }`}>
                  {term.descripcion}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Pastilla Flotante de Alto Contraste (No empuja el tablero) */}
      <div className="flex items-center gap-2 bg-zinc-950 text-white border border-zinc-800/80 shadow-2xl rounded-full px-3.5 py-2">
        {/* Indicador de Estado */}
        <div className="flex items-center gap-2">
          {!isOnline ? (
            <>
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              <div className="flex items-center gap-1.5 text-xs">
                <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="font-bold text-amber-300">Modo Contingencia:</span>
                <span className="font-medium text-zinc-200">Terminal {terminalId}</span>
              </div>
            </>
          ) : isSyncing ? (
            <>
              <RefreshCw className="w-4 h-4 text-blue-400 animate-spin shrink-0" />
              <span className="text-xs font-semibold text-blue-300">Sincronizando cambios...</span>
            </>
          ) : failedCount > 0 ? (
            <>
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="text-xs font-semibold text-rose-300">{failedCount} error(es)</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-xs font-semibold text-emerald-300">Conectado</span>
            </>
          )}
        </div>

        {/* Contador de pendientes */}
        {pendingCount > 0 && (
          <span className="bg-amber-500 text-zinc-950 text-[11px] font-black px-2 py-0.5 rounded-full tabular-nums">
            {pendingCount}
          </span>
        )}

        {/* Separador */}
        <div className="w-px h-4 bg-zinc-800" />

        {/* Botón de Estación */}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-[11px] font-semibold text-zinc-300 hover:text-white px-2 py-1 rounded-lg hover:bg-zinc-900 transition-colors cursor-pointer"
          title="Cambiar Terminal"
        >
          <Smartphone className="w-3.5 h-3.5 text-zinc-400" />
          <span>{terminalId}</span>
          {expanded ? <ChevronDown className="w-3 h-3 text-zinc-500" /> : <ChevronUp className="w-3 h-3 text-zinc-500" />}
        </button>

        {/* Botón manual de sincronizar si hay red y pendientes */}
        {isOnline && (pendingCount > 0 || failedCount > 0) && (
          <button
            type="button"
            onClick={() => syncNow()}
            disabled={isSyncing}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full cursor-pointer transition-transform active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${isSyncing ? "animate-spin" : ""}`} />
            <span>Subir</span>
          </button>
        )}
      </div>
    </aside>
  );
}
