"use client";

import React, { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error boundary captured:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm text-center flex flex-col items-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mb-4">
          <AlertTriangle size={28} />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-1">
          Ocurrió un problema al cargar esta vista
        </h2>
        <p className="text-xs text-slate-500 mb-6">
          {error?.message || "Hubo un error inesperado al procesar la información. Puedes reintentar o volver al inicio."}
        </p>

        <div className="flex items-center gap-3 w-full">
          <button
            onClick={() => reset()}
            className="flex-1 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <RefreshCw size={14} />
            Reintentar
          </button>
          <Link
            href="/tablero"
            className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all"
          >
            <Home size={14} />
            Tablero
          </Link>
        </div>
      </div>
    </div>
  );
}
