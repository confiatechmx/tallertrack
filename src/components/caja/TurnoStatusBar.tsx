"use client";

import React from "react";
import {
  Clock,
  ArrowRightLeft,
  Lock,
  Unlock,
  Receipt,
  Vault,
  Wallet,
} from "lucide-react";
import { CajaTurno, CajaFondo } from "@/services/cajaTurnoService";

interface TurnoStatusBarProps {
  turnoActivo: CajaTurno | null;
  fondos: CajaFondo[];
  loading?: boolean;
  onAbrirTurno: () => void;
  onHacerCorte: () => void;
  onTraspaso: () => void;
}

export function TurnoStatusBar({
  turnoActivo,
  fondos,
  loading = false,
  onAbrirTurno,
  onHacerCorte,
  onTraspaso,
}: TurnoStatusBarProps) {
  const fondoOperativo = fondos.find((f) => f.tipo === "OPERATIVO") || fondos[0];
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

        <button
          onClick={onAbrirTurno}
          className="w-full sm:w-auto px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
        >
          <Unlock size={14} />
          Aperturar Turno
        </button>
      </div>
    );
  }

  // 2. Estado: TURNO ABIERTO ACTIVO (Diseño tipo franja de comando moderna)
  const fechaApertura = new Date(turnoActivo.fecha_apertura);
  const horaFormateada = fechaApertura.toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const saldoFondo1 = Number(fondoOperativo?.saldo_actual || turnoActivo.monto_apertura_fondo1);
  const saldoFondo2 = Number(fondoReserva?.saldo_actual || turnoActivo.monto_apertura_fondo2);

  return (
    <div className="bg-white border border-slate-200/90 rounded-xl px-4 py-2.5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
      {/* Shift Info & Dual Funds Chips */}
      <div className="flex flex-wrap items-center gap-2.5 sm:gap-4">
        {/* Status Pill */}
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-bold text-slate-800">Turno en Curso</span>
          <span className="text-[11px] text-slate-400 font-medium hidden sm:inline flex items-center gap-1">
            <Clock size={11} /> {horaFormateada}
          </span>
        </div>

        <div className="hidden sm:block h-4 w-px bg-slate-200"></div>

        {/* Fondo 1: Mostrador */}
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/70 text-xs">
          <Wallet size={13} className="text-slate-500" />
          <span className="text-[10px] uppercase font-bold text-slate-400">Gaveta:</span>
          <span className="font-bold text-slate-900 tabular-nums">
            ${saldoFondo1.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
          </span>
        </div>

        {/* Fondo 2: Reserva */}
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50/70 border border-purple-200/60 text-xs">
          <Vault size={13} className="text-purple-600" />
          <span className="text-[10px] uppercase font-bold text-purple-600">Reserva:</span>
          <span className="font-bold text-purple-900 tabular-nums">
            ${saldoFondo2.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Action Buttons: Traspaso & Cierre Z */}
      <div className="flex items-center gap-2 w-full md:w-auto justify-end shrink-0">
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
