"use client";

import React from "react";
import Link from "next/link";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Wrench,
  User,
  MapPin,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

export type OrderPriority = "low" | "normal" | "high" | "urgent";

export interface Order {
  id: string;
  folio: number;
  columnId: string;
  subEstado?: string | null;
  sucursalId?: string | null;
  sucursalCodigo?: string | null;
  vehicleId: string;
  customerId: string;
  carModel: string;
  carYear?: number | null;
  plates: string;
  customerName: string;
  customerPhone?: string | null;
  priority: OrderPriority;
  services: string[];
  createdAt: string;
  fechaIngresoRaw?: string;
  mechanicId?: string | null;
  mechanicName?: string | null;
  mechanicColor?: string | null;
  bahiaRampa?: string | null;
  estatusPago: string;
  totalAmount: number;
  paidAmount: number;
  aprobadoClienteNombre?: string | null;
  isExpress?: boolean;
  dviCounts: {
    rojo: number;
    amarillo: number;
    verde: number;
  };
}

interface KanbanCardProps {
  order: Order;
  onClick?: (orderId: string) => void;
  onDeliverOrder?: (orderId: string) => void;
}

const priorityBorders: Record<OrderPriority, string> = {
  low: "border-l-slate-300",
  normal: "border-l-blue-500",
  high: "border-l-amber-500",
  urgent: "border-l-rose-500",
};

export function KanbanCard({ order, onClick, onDeliverOrder }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: order.id,
    data: {
      type: "Order",
      order,
    },
  });

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
  };

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="opacity-40 h-[115px] border-2 border-dashed border-primary bg-primary/5 rounded-xl"
      />
    );
  }

  const folioStr = `#${1000 + Number(order.folio || 1)}`;
  const borderAccent = priorityBorders[order.priority] || priorityBorders.normal;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`panel-card bg-white border border-slate-200/90 rounded-xl flex flex-col relative group hover:border-slate-300 hover:shadow-xs transition-all border-l-4 ${borderAccent}`}
    >
      <div
        className="p-3 flex flex-col gap-2 cursor-pointer"
        onClick={() => onClick && onClick(order.id)}
      >
        {/* Nivel 1: Folio + Auto + Placas + Grip */}
        <div className="flex items-start justify-between gap-1.5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-mono text-[11px] font-black text-slate-900 tabular-nums">
                {folioStr}
              </span>
              <h4 className="font-bold text-slate-900 text-xs truncate">
                {order.carModel} {order.carYear ? `(${order.carYear})` : ""}
              </h4>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {order.isExpress && (
              <span className="text-[10px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                Express
              </span>
            )}
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200/80">
              {order.plates || "S/P"}
            </span>
            <div
              {...attributes}
              {...listeners}
              className="text-slate-300 hover:text-slate-600 cursor-grab active:cursor-grabbing transition-colors p-0.5"
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical size={13} strokeWidth={2} />
            </div>
          </div>
        </div>

        {/* Nivel 2: Cliente & Servicios principales */}
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
            {order.customerId ? (
              <Link
                href={`/clientes/${order.customerId}?vehiculoId=${order.vehicleId}`}
                onClick={(e) => e.stopPropagation()}
                className="hover:text-blue-600 hover:underline truncate inline-flex items-center gap-1 font-medium text-slate-600"
                title="Abrir Expediente 360 del Cliente"
              >
                <User size={11} className="text-slate-400 shrink-0" />
                <span className="truncate">{order.customerName}</span>
              </Link>
            ) : (
              <span className="truncate text-slate-500 inline-flex items-center gap-1">
                <User size={11} className="text-slate-400 shrink-0" />
                <span className="truncate">{order.customerName}</span>
              </span>
            )}

            {order.aprobadoClienteNombre && (
              <span
                className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-1 py-0.2 rounded shrink-0 flex items-center gap-0.5"
                title={`Autorizado digitalmente por ${order.aprobadoClienteNombre}`}
              >
                <ShieldCheck size={10} /> OK
              </span>
            )}
          </div>

          {/* Resumen de Trabajo & Alerta DVI si existe */}
          <div className="flex items-center justify-between gap-1 text-[11px]">
            {order.services.length > 0 ? (
              <p className="text-slate-500 text-[11px] truncate flex-1">
                {order.services.slice(0, 2).join(", ")}
                {order.services.length > 2 && (
                  <span className="text-slate-400 font-semibold ml-1">
                    +{order.services.length - 2}
                  </span>
                )}
              </p>
            ) : (
              <p className="text-slate-400 text-[11px] italic">Diagnóstico General</p>
            )}

            {/* Solo se muestra si hay hallazgos críticos en la inspección */}
            {order.dviCounts.rojo > 0 && (
              <span
                className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200/60 px-1.5 py-0.2 rounded shrink-0 flex items-center gap-1"
                title={`Inspección DVI: ${order.dviCounts.rojo} urgentes`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                {order.dviCounts.rojo} urgentes
              </span>
            )}
          </div>
        </div>

        {/* Nivel 3: Barra Operativa & Financiera */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 min-w-0">
            {order.bahiaRampa && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold truncate max-w-[90px]">
                <MapPin size={9} className="text-slate-400 shrink-0" />
                {order.bahiaRampa.replace(/\s*\(.*?\)/, "")}
              </span>
            )}

            {order.mechanicName ? (
              <span
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-50 text-slate-600 border border-slate-200/70 truncate max-w-[85px]"
                title={`Técnico: ${order.mechanicName}`}
              >
                <Wrench size={9} className="text-blue-500 shrink-0" />
                <span className="truncate">{order.mechanicName.split(" ")[0]}</span>
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span
              className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                order.estatusPago === "Pagado"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : order.estatusPago === "Parcial"
                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {order.estatusPago === "Pagado"
                ? "Pagado"
                : order.estatusPago === "Parcial"
                ? "Parcial"
                : "Pend."}
            </span>
            <span className="text-xs font-black text-slate-900 font-mono tabular-nums">
              ${order.totalAmount.toLocaleString("es-MX", { maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>

        {/* Nivel 4: Acción Rápida de Entrega de Vehículo */}
        {order.columnId === "Listo para Entrega" && onDeliverOrder && (
          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDeliverOrder(order.id);
              }}
              className="w-full py-1.5 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
              title="Marcar como entregado y retirar del tablero activo"
            >
              <CheckCircle2 size={13} /> Marcar como Entregado
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
