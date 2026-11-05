"use client";

import React from "react";
import {
  Clock,
  ArrowRightLeft,
  Lock,
  Unlock,
  Receipt,
  ShieldCheck,
} from "lucide-react";
import { CajaTurno, CajaFondo } from "@/services/cajaTurnoService";

interface TurnoStatusBarProps {
  turnoActivo: CajaTurno | null;
  fondos: CajaFondo[];
  loading?: boolean;
  onAbrirTurno: () => void;
  onHacerCorte: () => void;
  onTraspaso: () => void;
  onVerHistorial?: () => void;
}

export function TurnoStatusBar({
  turnoActivo,
  fondos,
  loading = false,
  onAbrirTurno,
  onHacerCorte,
  onTraspaso,
  onVerHistorial,
}: TurnoStatusBarProps) {
  const fondoReserva = fondos.find((f) => f.tipo === "RESERVA") || fondos[1];

  if (loading) {
    return (
      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 animate-pulse flex items-center justify-between">
        <div className="h-4 w-40 bg-slate-200 rounded"></div>
        <div className="h-7 w-28 bg-slate-200 rounded-lg"></div>
      </div>
    );
  }

  // 1. Estado: SIN TURNO ABIERTO (Alerta compacta y directa)
  if (!turnoActivo) {
    return (
      <div className="bg-amber-50/80 border border-amber-200/90 rounded-xl px-4 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-800 flex items-center justify-center shrink-0">
            <Lock size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-950">
                Caja Cerrada
              </span>
              <span className="text-[11px] text-amber-800/80 hidden sm:inline">
                • Se requiere abrir turno con arqueo para operar la ventanilla
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {onVerHistorial && (
            <button
              onClick={onVerHistorial}
              className="w-full sm:w-auto px-3.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 active:scale-95 text-slate-700 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer"
            >
              <Receipt size={14} className="text-slate-500" />
              <span>Consultar Cortes Anteriores</span>
            </button>
          )}
          <button
            onClick={onAbrirTurno}
            className="w-full sm:w-auto px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            <Unlock size={14} />
            <span>Aperturar Turno</span>
          </button>
        </div>
      </div>
    );
  }

  // 2. Estado: TURNO ABIERTO ACTIVO (Diseño tipo franja de comando moderna)
  const fechaApertura = new Date(turnoActivo.fecha_apertura);
  const horaFormateada = fechaApertura.toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="bg-white border border-slate-200/90 rounded-xl px-4 py-2.5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
      {/* Shift Info & Arqueo Ciego Shield */}
      <div className="flex flex-wrap items-center gap-2.5 sm:gap-4">
        {/* Status Pill */}
        <div className="inline-flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-bold text-slate-800">Turno en Curso</span>
          <span className="text-[11px] text-slate-500 font-medium inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md">
            <Clock size={11} className="text-slate-400" />
            <span>{horaFormateada}</span>
          </span>
        </div>

        <div className="hidden sm:block h-4 w-px bg-slate-200"></div>

        {/* Badge de Arqueo Ciego Activo: blindaje estricto sin saldos teóricos visibles al cajero */}
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50/60 border border-emerald-200/60 text-xs">
          <ShieldCheck size={13} className="text-emerald-700" />
          <span className="text-[10px] uppercase font-bold text-emerald-800">
            Arqueo Ciego Activo
          </span>
          <span className="text-[10px] text-emerald-600 hidden sm:inline">
            • Fondo en Ventanilla Protegido
          </span>
        </div>
      </div>

      {/* Action Buttons: Traspaso, Historial & Cierre Z */}
      <div className="flex items-center gap-2 w-full md:w-auto justify-end shrink-0">
        {onVerHistorial && (
          <button
            onClick={onVerHistorial}
            title="Consultar cortes y cierres anteriores"
            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
          >
            <Receipt size={13} className="text-slate-500" />
            <span className="hidden sm:inline">Cortes Anteriores</span>
          </button>
        )}

        <button
          onClick={onTraspaso}
          title="Traspasar dinero de Reserva a Gaveta o viceversa"
          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
        >
          <ArrowRightLeft size={13} />
          <span>Traspaso</span>
        </button>

        <button
          onClick={onHacerCorte}
          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
        >
          <Receipt size={13} />
          <span>Corte Z (Arqueo)</span>
        </button>
      </div>
    </div>
  );
}
