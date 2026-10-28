import React from "react";
import { ShieldAlert, AlertTriangle, Info, CheckCircle2 } from "lucide-react";

interface AuditSeverityBadgeProps {
  severity: "INFO" | "WARNING" | "CRITICAL";
  className?: string;
  showIcon?: boolean;
}

export const AuditSeverityBadge: React.FC<AuditSeverityBadgeProps> = ({
  severity,
  className = "",
  showIcon = true,
}) => {
  switch (severity) {
    case "CRITICAL":
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-50 text-red-700 border border-red-200/80 shadow-2xs ${className}`}
        >
          {showIcon && <ShieldAlert size={11} className="text-red-600 shrink-0" />}
          Crítico
        </span>
      );
    case "WARNING":
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200/80 shadow-2xs ${className}`}
        >
          {showIcon && <AlertTriangle size={11} className="text-amber-600 shrink-0" />}
          Alerta
        </span>
      );
    case "INFO":
    default:
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs ${className}`}
        >
          {showIcon && <CheckCircle2 size={11} className="text-emerald-600 shrink-0" />}
          Operativo
        </span>
      );
  }
};
