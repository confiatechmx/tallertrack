"use client";

import React, { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global uncaught runtime error:", error);
  }, [error]);

  return (
    <html lang="es">
      <body className="bg-slate-900 text-white min-h-screen flex items-center justify-center p-6 antialiased font-sans">
        <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-8 shadow-2xl text-center flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mb-4">
            <AlertTriangle size={28} />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">
            Ocurrió un problema temporal al cargar la aplicación
          </h1>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            Se detectó una actualización o error de conexión con el servidor. Haz clic en recargar para obtener la versión más reciente.
          </p>
          <div className="flex items-center gap-3 w-full">
            <button
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.location.reload();
                } else {
                  reset();
                }
              }}
              className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md shadow-blue-600/30 cursor-pointer"
            >
              <RefreshCw size={14} />
              Recargar Aplicación
            </button>
            <button
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.location.href = "/tablero";
                }
              }}
              className="py-3 px-4 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Ir a Tablero
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
