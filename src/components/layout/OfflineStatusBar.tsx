"use client";

import React, { useState } from "react";
import { useOfflineSync } from "@/context/OfflineSyncContext";
import { Wifi, WifiOff, RefreshCw, Smartphone, CheckCircle2, AlertCircle } from "lucide-react";

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

  const [showConfig, setShowConfig] = useState(false);

  // Si está online y no hay mutaciones pendientes ni fallidas, no mostrar ruido visual en el header
  if (isOnline && pendingCount === 0 && failedCount === 0) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={`w-full px-4 py-2 border-b transition-colors flex flex-wrap items-center justify-between gap-3 text-sm z-40 ${
        !isOnline
          ? "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200"
          : isSyncing
          ? "bg-blue-500/10 border-blue-500/30 text-blue-900 dark:text-blue-200"
          : failedCount > 0
          ? "bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-200"
          : "bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200"
      }`}
    >
      {/* Indicador Izquierdo */}
      <div className="flex items-center gap-2 font-medium">
        {!isOnline ? (
          <>
            <WifiOff className="w-5 h-5 text-amber-600 dark:text-amber-400 animate-pulse shrink-0" />
            <span>
              <strong>Modo Contingencia (Sin Internet):</strong> Operando localmente en terminal{" "}
              <span className="font-mono bg-amber-500/20 px-1.5 py-0.5 rounded text-amber-950 dark:text-amber-100 font-bold">
                {terminalId} - {terminalName}
              </span>
            </span>
          </>
        ) : isSyncing ? (
          <>
            <RefreshCw className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin shrink-0" />
            <span>Sincronizando cambios pendientes con la nube...</span>
          </>
        ) : failedCount > 0 ? (
          <>
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>
              {failedCount} cambio(s) con error al subir.{" "}
              <span className="font-normal">Revisa la conexión o intenta de nuevo.</span>
            </span>
          </>
        ) : (
          <>
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>
              Conexión restablecida • {pendingCount} cambio(s) listos para sincronizar.
            </span>
          </>
        )}
      </div>

      {/* Controles y Botones (Dirty Hands UX: min 48px touch friendly) */}
      <div className="flex items-center gap-2">
        {pendingCount > 0 && (
          <span className="bg-amber-600 text-white dark:bg-amber-500 dark:text-zinc-950 text-xs font-bold px-2 py-1 rounded-full">
            {pendingCount} pendiente{pendingCount > 1 ? "s" : ""}
          </span>
        )}

        {/* Botón Selector de Terminal */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowConfig(!showConfig)}
            className="h-10 px-3 flex items-center gap-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold shadow-xs"
            title="Cambiar Terminal de Trabajo"
          >
            <Smartphone className="w-3.5 h-3.5 text-zinc-500" />
            <span>Terminal {terminalId}</span>
          </button>

          {showConfig && (
            <div className="absolute right-0 mt-2 w-64 p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl z-50 text-left">
              <p className="text-xs font-bold text-zinc-500 uppercase px-2 py-1">Estación de Trabajo</p>
              {presetTerminales.map((term) => (
                <button
                  key={term.id}
                  type="button"
                  onClick={() => {
                    cambiarTerminal(term.id);
                    setShowConfig(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex flex-col ${
                    terminalId === term.id
                      ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold"
                      : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  <span className="flex items-center justify-between">
                    <span>{term.nombre}</span>
                    <span className="font-mono text-[10px] bg-zinc-200 dark:bg-zinc-800 px-1 rounded">{term.id}</span>
                  </span>
                  <span className="text-[10px] text-zinc-400 font-normal mt-0.5">{term.descripcion}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Botón de Sincronizar Ahora (Touch target 48px friendly) */}
        {isOnline && (pendingCount > 0 || failedCount > 0) && (
          <button
            type="button"
            onClick={() => syncNow()}
            disabled={isSyncing}
            className="h-10 px-4 min-w-[48px] flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-sm disabled:opacity-50 transition-all cursor-pointer active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            <span>{isSyncing ? "Subiendo..." : "Subir Cambios"}</span>
          </button>
        )}
      </div>
    </div>
  );
}
