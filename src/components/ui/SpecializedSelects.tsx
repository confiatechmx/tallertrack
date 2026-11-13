"use client";

import React, { useMemo } from "react";
import { CustomSelect, SelectOption, SelectVariant } from "./Select";
import { Wrench, MapPin } from "lucide-react";

// ---------------------------------------------------------------------------
// 1. Selector Especializado de Técnico
// ---------------------------------------------------------------------------
export interface MechanicItem {
  id: string;
  nombre: string;
  puesto?: string;
  rol?: string;
}

export interface TecnicoSelectProps {
  value: string;
  onChange: (id: string) => void;
  mechanics: MechanicItem[];
  variant?: SelectVariant;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
}

export function TecnicoSelect({
  value,
  onChange,
  mechanics,
  variant = "pill",
  disabled = false,
  className = "",
  triggerClassName = "",
}: TecnicoSelectProps) {
  const options: SelectOption<string>[] = useMemo(() => {
    const list: SelectOption<string>[] = [
      {
        value: "",
        label: "Sin Técnico",
        icon: <Wrench size={13} className="text-zinc-400" />,
      },
    ];

    const filtered = mechanics.filter(
      (m) => m.rol === "Mecánico" || m.puesto?.toLowerCase().includes("técnico")
    );

    filtered.forEach((m) => {
      list.push({
        value: m.id,
        label: m.nombre,
        description: m.puesto || "Técnico Mecánico",
        icon: (
          <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 text-[9px] font-bold inline-flex items-center justify-center shrink-0">
            {m.nombre.charAt(0).toUpperCase()}
          </span>
        ),
      });
    });

    return list;
  }, [mechanics]);

  return (
    <CustomSelect
      value={value || ""}
      onChange={onChange}
      options={options}
      placeholder="🔧 Asignar Técnico"
      variant={variant}
      disabled={disabled}
      className={className}
      triggerClassName={triggerClassName}
      title="Técnico asignado a esta orden"
    />
  );
}

// ---------------------------------------------------------------------------
// 2. Selector Especializado de Bahía / Rampa
// ---------------------------------------------------------------------------
export interface EstacionSelectProps {
  value: string;
  onChange: (estacion: string) => void;
  estaciones: string[];
  variant?: SelectVariant;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
}

export function EstacionSelect({
  value,
  onChange,
  estaciones,
  variant = "pill",
  disabled = false,
  className = "",
  triggerClassName = "",
}: EstacionSelectProps) {
  const options: SelectOption<string>[] = useMemo(() => {
    const list: SelectOption<string>[] = [
      {
        value: "",
        label: "Sin Estación",
        icon: <MapPin size={13} className="text-zinc-400" />,
      },
    ];

    estaciones.forEach((b) => {
      list.push({
        value: b,
        label: b,
        icon: <MapPin size={13} className="text-blue-500" />,
      });
    });

    return list;
  }, [estaciones]);

  return (
    <CustomSelect
      value={value || ""}
      onChange={onChange}
      options={options}
      placeholder="📍 Sin Estación"
      variant={variant}
      disabled={disabled}
      className={className}
      triggerClassName={triggerClassName}
      title="Estación de Trabajo / Rampa"
    />
  );
}

// ---------------------------------------------------------------------------
// 3. Selector Especializado de Fase Kanban (StatusBadgeSelect)
// ---------------------------------------------------------------------------
export interface StatusBadgeSelectProps {
  value: string;
  onChange: (status: string) => void;
  variant?: SelectVariant;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
}

const statusOptions: SelectOption<string>[] = [
  {
    value: "Citas del Día",
    label: "Citas del Día",
    dotColor: "bg-zinc-500",
  },
  {
    value: "En Inspección",
    label: "En Inspección",
    dotColor: "bg-amber-500",
  },
  {
    value: "En Rampa",
    label: "En Rampa",
    dotColor: "bg-blue-600",
  },
  {
    value: "Listo para Entrega",
    label: "Listo para Entrega",
    dotColor: "bg-emerald-500",
  },
  {
    value: "Entregado",
    label: "Entregado / Salida",
    dotColor: "bg-zinc-400",
  },
];

export function StatusBadgeSelect({
  value,
  onChange,
  variant = "pill",
  disabled = false,
  className = "",
  triggerClassName = "",
}: StatusBadgeSelectProps) {
  return (
    <CustomSelect
      value={value}
      onChange={onChange}
      options={statusOptions}
      variant={variant}
      disabled={disabled}
      className={className}
      triggerClassName={triggerClassName}
      title="Fase del vehículo en el taller"
    />
  );
}
