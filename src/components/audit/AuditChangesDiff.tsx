import React from "react";
import { ArrowRight } from "lucide-react";

interface AuditChangesDiffProps {
  changes: Record<string, { old: any; new: any }> | null;
  className?: string;
}

const FIELD_LABELS: Record<string, string> = {
  estado: "Estado de Orden",
  bahia_rampa: "Bahía / Rampa Asignada",
  fecha_promesa: "Fecha Promesa Entrega",
  asesor_id: "Asesor Asignado",
  kilometraje_ingreso: "Odómetro (km)",
  total: "Importe Total",
  estatus: "Estatus Cotización",
  stock_actual: "Stock Disponible",
  precio_venta: "Precio de Venta",
  costo_adquisicion: "Costo Adquisición",
  rol: "Rol de Seguridad IAM",
  placas: "Placas del Vehículo",
  vin: "Número de Serie (VIN)",
  diferencia_efectivo: "Diferencia en Caja",
  monto: "Monto de Movimiento",
  monto_apertura: "Fondo de Apertura",
};

export const AuditChangesDiff: React.FC<AuditChangesDiffProps> = ({ changes, className = "" }) => {
  if (!changes || Object.keys(changes).length === 0) {
    return (
      <span className="text-[11px] text-slate-400 italic">
        Sin modificaciones de campos clave registradas.
      </span>
    );
  }

  const formatValue = (val: any) => {
    if (val === null || val === undefined) return <span className="text-slate-400 italic">vacío</span>;
    if (typeof val === "boolean") return val ? "Sí" : "No";
    if (typeof val === "object") return JSON.stringify(val);
    return String(val);
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      {Object.entries(changes).map(([field, diff]) => {
        const friendlyName = FIELD_LABELS[field] || field.replace(/_/g, " ");

        return (
          <div
            key={field}
            className="flex items-center flex-wrap gap-2 text-xs py-1 px-2 rounded-md bg-slate-50 border border-slate-200/70"
          >
            <span className="font-semibold text-slate-700 capitalize text-[11px]">
              {friendlyName}:
            </span>
            <span className="line-through text-red-600/80 bg-red-50 px-1.5 py-0.5 rounded font-mono text-[11px]">
              {formatValue(diff.old)}
            </span>
            <ArrowRight size={11} className="text-slate-400 shrink-0" />
            <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-mono text-[11px]">
              {formatValue(diff.new)}
            </span>
          </div>
        );
      })}
    </div>
  );
};
