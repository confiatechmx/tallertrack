"use client";

import React, { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import * as XLSX from "xlsx";
import {
  X,
  Printer,
  FileText,
  Receipt,
  MessageCircle,
  FileSpreadsheet,
  Building2,
  Calendar,
  User,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Check,
  Download,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import TenantBrandLogo from "@/components/brand/TenantBrandLogo";

interface TicketCierreModalProps {
  isOpen: boolean;
  onClose: () => void;
  cierreData: any;
  empresa?: any;
  sucursal?: any;
  empresaNombre?: string;
  sucursalNombre?: string;
  cajeroNombre?: string;
}

type FormatoImpresion = "CARTA" | "TICKET";

export function TicketCierreModal({
  isOpen,
  onClose,
  cierreData,
  empresa,
  sucursal,
  empresaNombre = "Cova",
  sucursalNombre = "Cova",
  cajeroNombre = "Cajero en Turno",
}: TicketCierreModalProps) {
  const [formato, setFormato] = useState<FormatoImpresion>("CARTA");
  const [mounted, setMounted] = useState(false);
  const printableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Atajo de teclado: Enter para imprimir rápidamente
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement;
        if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;
        e.preventDefault();
        window.print();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  if (!isOpen || !cierreData) return null;

  const now = new Date();
  const fechaStr = now.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const horaStr = now.toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const f1Declarado = Number(cierreData.declaradoF1 || 0);
  const f2Declarado = Number(cierreData.declaradoF2 || 0);
  const difF1 = Number(cierreData.diferenciaF1 || 0);
  const difF2 = Number(cierreData.diferenciaF2 || 0);
  const remesa = Number(cierreData.remesa || 0);
  const fondoSig = Number(cierreData.fondoSiguiente || 0);
  const teorico = cierreData.resumenTeorico;
  const primaryColor = empresa?.color_primario || "#1C3EFF";

  const handlePrint = () => {
    window.print();
  };

  // Exportar Excel (.xlsx) Nativo y Profesional
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    const wsData: any[][] = [
      [`${(empresa?.nombre_comercial || empresaNombre || "COVA").toUpperCase()} - ACTA OFICIAL DE CORTE DE CAJA (CORTE Z)`],
      [
        `Sucursal: ${sucursal?.nombre || sucursalNombre || "Cova Culiacán"}`,
        `Fecha de Emisión: ${fechaStr} ${horaStr}`,
        `Responsable: ${cajeroNombre}`,
        `Turno: #${cierreData.turno_id ? String(cierreData.turno_id).substring(0, 8).toUpperCase() : "Z-ACTIVO"}`
      ],
      [],
      ["1. ARQUEO FÍSICO DE FONDOS EN EFECTIVO"],
      ["Fondo / Concepto", "Saldo Apertura ($)", "Cobros POS / Entradas ($)", "Salidas / Gastos ($)", "Traspasos Fondos ($)", "Teórico Sistema ($)", "Físico Contado ($)", "Variación / Descuadre ($)", "Estado"],
      [
        "Fondo 1: Operativo (Mostrador)",
        Number(teorico?.fondo1?.apertura || 0),
        Number(teorico?.fondo1?.entradasEfectivoPOS || 0),
        Number(teorico?.fondo1?.salidasGastos || 0),
        Number((teorico?.fondo1?.traspasosRecibidos || 0) - (teorico?.fondo1?.traspasosEnviados || 0)),
        Number(cierreData.teoricoF1 || 0),
        f1Declarado,
        difF1,
        Math.abs(difF1) <= 10 ? "Cuadrado" : (difF1 > 0 ? "Sobrante" : "Faltante")
      ],
      [
        "Fondo 2: Reserva (Caja Fuerte)",
        Number(teorico?.fondo2?.apertura || 0),
        0,
        0,
        -Number(teorico?.fondo2?.traspasosEnviados || 0),
        Number(cierreData.teoricoF2 || 0),
        f2Declarado,
        difF2,
        Math.abs(difF2) <= 10 ? "Cuadrado" : (difF2 > 0 ? "Sobrante" : "Faltante")
      ],
      [],
      ["2. DESTINO DEL EFECTIVO"],
      ["Concepto", "Monto ($)"],
      ["Remesa Retirada a Caja Fuerte / Depósito", remesa],
      ["Fondo Base para Siguiente Turno (Gaveta)", fondoSig],
      [],
      ["3. CONCILIACIÓN DE TRANSFERENCIAS SPEI (ESPEJO BANCARIO)"],
      ["Cuenta Bancaria", "Banco", "No. Transacciones", "Monto Total ($)"]
    ];

    if (teorico?.bancosSPEI && teorico.bancosSPEI.length > 0) {
      teorico.bancosSPEI.forEach((b: any) => {
        wsData.push([b.alias, b.banco, Number(b.conteo || 0), Number(b.total || 0)]);
      });
    } else {
      wsData.push(["Sin transferencias SPEI registradas", "-", 0, 0]);
    }

    wsData.push([]);
    wsData.push(["4. TERMINALES Y OTROS MÉTODOS DE PAGO"]);
    wsData.push(["Método", "No. Transacciones", "Monto Total ($)"]);
    wsData.push(["Terminales TPV (Tarjetas)", Number(teorico?.tarjetasTPV?.conteo || 0), Number(teorico?.tarjetasTPV?.total || 0)]);
    if (teorico?.bnpl && teorico.bnpl.total > 0) {
      wsData.push(["Crédito BNPL (Kueski / Atrato)", Number(teorico.bnpl.conteo || 0), Number(teorico.bnpl.total || 0)]);
    }

    wsData.push([]);
    wsData.push(["TOTAL GENERAL VENTAS Y COBROS DEL TURNO", "", "", Number(teorico?.totalVentasTurno || 0)]);

    if (cierreData.justificacion_descuadre) {
      wsData.push([]);
      wsData.push(["JUSTIFICACIÓN DE DESCUADRE REGISTRADA:", cierreData.justificacion_descuadre]);
    }

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws["!cols"] = [
      { wch: 34 },
      { wch: 22 },
      { wch: 24 },
      { wch: 20 },
      { wch: 22 },
      { wch: 20 },
      { wch: 20 },
      { wch: 24 },
      { wch: 16 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Corte Z Arqueo");
    const filename = `Corte_Z_${(empresa?.nombre_comercial || empresaNombre).replace(/\s+/g, "_")}_${now.toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  const handleWhatsAppShare = () => {
    let msg = `*CORTE DE CAJA Z - ${empresaNombre.toUpperCase()}*\n`;
    msg += `📍 Sucursal: ${sucursalNombre}\n`;
    msg += `📅 Fecha: ${fechaStr} ${horaStr}\n`;
    msg += `👤 Cajero: ${cajeroNombre}\n\n`;

    msg += `*RESUMEN DE EFECTIVO*\n`;
    msg += `• Fondo 1 (Mostrador): $${f1Declarado.toLocaleString("es-MX", { minimumFractionDigits: 2 })}\n`;
    if (Math.abs(difF1) > 0) {
      msg += `  ↳ Variación: ${difF1 > 0 ? "+" : ""}$${difF1.toFixed(2)} (${difF1 >= 0 ? "Sobrante" : "Faltante"})\n`;
    }
    msg += `• Fondo 2 (Reserva): $${f2Declarado.toLocaleString("es-MX", { minimumFractionDigits: 2 })}\n`;
    msg += `• Remesa a Caja Fuerte: $${remesa.toLocaleString("es-MX", { minimumFractionDigits: 2 })}\n`;
    msg += `• Fondo para Mañana: $${fondoSig.toLocaleString("es-MX", { minimumFractionDigits: 2 })}\n\n`;

    if (teorico?.bancosSPEI && teorico.bancosSPEI.length > 0) {
      msg += `*TRANSFERENCIAS SPEI:*\n`;
      teorico.bancosSPEI.forEach((b: any) => {
        msg += `• ${b.alias} (${b.banco}): $${b.total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}\n`;
      });
      msg += `\n`;
    }

    if (teorico?.tarjetasTPV && teorico.tarjetasTPV.total > 0) {
      msg += `*PAGOS CON TARJETA / TPV:*\n`;
      msg += `• Total Terminales: $${teorico.tarjetasTPV.total.toLocaleString("es-MX", { minimumFractionDigits: 2 })} (${teorico.tarjetasTPV.conteo})\n\n`;
    }

    if (teorico?.bnpl && teorico.bnpl.total > 0) {
      msg += `*CRÉDITO BNPL:*\n`;
      msg += `• Kueski/Atrato: $${teorico.bnpl.total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}\n\n`;
    }

    msg += `*TOTAL VENTAS TURNO:* $${(teorico?.totalVentasTurno || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN`;

    const encoded = encodeURIComponent(msg);
    window.open(`https://wa.me/?text=${encoded}`, "_blank");
  };

  // ─── 1. DISEÑO EN HOJA TAMAÑO CARTA (LETTER 8.5" x 11") ──────────────────────
  const renderDocumentoCarta = (
    <div
      id="printable-corte-document"
      ref={printableRef}
      className="bg-white text-slate-900 border border-slate-200/90 rounded-xl p-6 sm:p-8 max-w-4xl w-full mx-auto text-xs leading-normal font-sans shadow-md print:shadow-none print:border-0 print:rounded-none print:py-[10mm] print:px-[12mm] print:m-0 print:max-w-none transition-all"
    >
      {/* 1. Encabezado Corporativo Homologado */}
      <div
        className="flex items-start justify-between border-b-2 pb-4 mb-4"
        style={{ borderColor: primaryColor }}
      >
        <div className="flex items-center gap-3.5">
          <TenantBrandLogo
            empresa={empresa || { nombre_comercial: empresaNombre }}
            size="lg"
            variant="light"
            className="shrink-0"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black uppercase tracking-tight text-slate-900">
                {empresa?.nombre_comercial || empresaNombre}
              </h1>
              {empresa?.eslogan && (
                <span className="hidden sm:inline-block text-[10px] font-medium text-slate-500 border-l border-slate-300 pl-2">
                  {empresa.eslogan}
                </span>
              )}
            </div>
            <p className="text-slate-600 font-medium text-xs mt-0.5">
              {sucursal?.nombre || sucursalNombre} • Centro de Servicio y Alineación
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[9.5px] text-slate-500 mt-1">
              <span>RFC: <strong className="text-slate-700 font-mono">{empresa?.rfc || "COV2201019A1"}</strong></span>
              <span>•</span>
              <span>Turno: <strong className="text-slate-700 font-mono">#{cierreData.turno_id ? String(cierreData.turno_id).substring(0, 8).toUpperCase() : "Z-ACTIVO"}</strong></span>
              {(sucursal?.direccion || empresa?.direccion) && (
                <>
                  <span>•</span>
                  <span>{sucursal?.direccion || empresa?.direccion}</span>
                </>
              )}
              {(sucursal?.telefono || empresa?.telefono) && (
                <>
                  <span>•</span>
                  <span className="font-semibold text-slate-700 font-mono">Tel: {sucursal?.telefono || empresa?.telefono}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end shrink-0 text-right">
          <span className="inline-block px-3 py-1 bg-slate-900 text-white text-[10px] font-bold rounded-lg tracking-wider uppercase mb-1">
            Acta Oficial de Corte Z
          </span>
          <p className="text-xs font-bold text-slate-900">
            Fecha: {fechaStr}
          </p>
          <p className="text-[10px] text-slate-500 font-mono">
            Hora de Cierre: {horaStr}
          </p>
          <p className="text-[10px] text-slate-600 mt-0.5">
            Responsable: <strong className="text-slate-900">{cajeroNombre}</strong>
          </p>
        </div>
      </div>

      {/* 2. Arqueo Comparativo Dual de Efectivo */}
      <div className="mb-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2.5 flex items-center gap-1.5">
          <ShieldCheck size={15} className="text-emerald-600" />
          1. Arqueo Físico de Fondos en Efectivo
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Fondo 1: Mostrador Operativo */}
          <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/60 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <span className="font-bold text-xs text-slate-900">
                  Fondo 1: Operativo (Mostrador)
                </span>
                <span
                  className={`text-[9.5px] font-semibold px-2 py-0.5 rounded-full border ${
                    Math.abs(difF1) <= 10
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : difF1 > 0
                      ? "bg-blue-50 text-blue-800 border-blue-200"
                      : "bg-rose-50 text-rose-800 border-rose-200"
                  }`}
                >
                  {Math.abs(difF1) <= 10
                    ? "✓ Cuadrado"
                    : difF1 > 0
                    ? `+ Sobrante $${difF1.toFixed(2)}`
                    : `- Faltante $${Math.abs(difF1).toFixed(2)}`}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2.5 text-[11px]">
                <div>
                  <span className="text-slate-500 block text-[10px]">Saldo Apertura:</span>
                  <span className="font-bold tabular-nums font-mono text-slate-800">
                    ${Number(teorico?.fondo1?.apertura || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">(+) Cobros POS:</span>
                  <span className="font-bold text-emerald-700 tabular-nums font-mono">
                    +${Number(teorico?.fondo1?.entradasEfectivoPOS || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">(-) Vales y Gastos:</span>
                  <span className="font-bold text-rose-700 tabular-nums font-mono">
                    -${Number(teorico?.fondo1?.salidasGastos || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">(±) Traspasos Fondos:</span>
                  <span className="font-bold text-indigo-700 tabular-nums font-mono">
                    +${Number((teorico?.fondo1?.traspasosRecibidos || 0) - (teorico?.fondo1?.traspasosEnviados || 0)).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-200 flex justify-between items-center text-xs">
              <div>
                <span className="text-slate-500 block text-[10px]">Teórico en Sistema:</span>
                <span className="font-bold tabular-nums font-mono text-slate-800">
                  ${Number(cierreData.teoricoF1 || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 block text-[10px]">Físico Contado:</span>
                <span className="font-black text-slate-900 text-sm tabular-nums font-mono">
                  ${f1Declarado.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Fondo 2: Reserva Taller */}
          <div className="border border-purple-200/80 rounded-xl p-3.5 bg-purple-50/20 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center border-b border-purple-200/80 pb-2">
                <span className="font-bold text-xs text-purple-950">
                  Fondo 2: Reserva (Caja Fuerte)
                </span>
                <span
                  className={`text-[9.5px] font-semibold px-2 py-0.5 rounded-full border ${
                    Math.abs(difF2) <= 10
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : "bg-rose-50 text-rose-800 border-rose-200"
                  }`}
                >
                  {Math.abs(difF2) <= 10 ? "✓ Cuadrado" : `Dif: $${difF2.toFixed(2)}`}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2.5 text-[11px]">
                <div>
                  <span className="text-slate-500 block text-[10px]">Saldo Apertura:</span>
                  <span className="font-bold tabular-nums font-mono text-slate-800">
                    ${Number(teorico?.fondo2?.apertura || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Traspasos Enviados:</span>
                  <span className="font-bold text-purple-800 tabular-nums font-mono">
                    -${Number(teorico?.fondo2?.traspasosEnviados || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-purple-200/80 flex justify-between items-center text-xs">
              <div>
                <span className="text-slate-500 block text-[10px]">Teórico Reserva:</span>
                <span className="font-bold tabular-nums font-mono text-slate-800">
                  ${Number(cierreData.teoricoF2 || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 block text-[10px]">Físico Contado:</span>
                <span className="font-black text-purple-950 text-sm tabular-nums font-mono">
                  ${f2Declarado.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Conciliación Espejo Bancaria (3 Cuentas SPEI) */}
      <div className="mb-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2 flex items-center gap-1.5">
          <Building2 size={15} className="text-blue-600" />
          2. Conciliación de Transferencias SPEI (Espejo Bancario)
        </h2>
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-left border-collapse table-fixed">
            <thead className="bg-slate-50 border-b border-slate-200 text-[9.5px] uppercase font-bold text-slate-500">
              <tr>
                <th className="py-2.5 px-3.5 w-5/12">Cuenta Bancaria</th>
                <th className="py-2.5 px-3.5 w-3/12">Banco</th>
                <th className="py-2.5 px-3.5 text-center w-2/12">Transacciones</th>
                <th className="py-2.5 px-3.5 text-right w-2/12">Monto Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {teorico?.bancosSPEI && teorico.bancosSPEI.length > 0 ? (
                teorico.bancosSPEI.map((b: any) => (
                  <tr key={b.cuentaId} className="hover:bg-slate-50/50">
                    <td className="py-2 px-3.5 font-bold text-slate-900">{b.alias}</td>
                    <td className="py-2 px-3.5 text-slate-600">{b.banco}</td>
                    <td className="py-2 px-3.5 text-center font-bold text-slate-700 tabular-nums">{b.conteo}</td>
                    <td className="py-2 px-3.5 text-right font-bold tabular-nums font-mono text-slate-900">
                      ${b.total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-3 px-3.5 text-center text-slate-400">
                    Sin transferencias SPEI en este turno
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Resumen de Terminales TPV y BNPL */}
      <div className="mb-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2">
          3. Terminales TPV y Financiamiento
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="border border-slate-200 p-3 rounded-xl bg-slate-50/60">
            <span className="text-[10px] text-slate-500 block uppercase font-bold">
              Terminales TPV
            </span>
            <span className="font-bold text-slate-900 text-sm tabular-nums font-mono">
              ${Number(teorico?.tarjetasTPV?.total || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              {teorico?.tarjetasTPV?.conteo || 0} vouchers
            </span>
          </div>

          <div className="border border-slate-200 p-3 rounded-xl bg-slate-50/60">
            <span className="text-[10px] text-slate-500 block uppercase font-bold">
              Crédito BNPL
            </span>
            <span className="font-bold text-purple-950 text-sm tabular-nums font-mono">
              ${Number(teorico?.bnpl?.total || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              {teorico?.bnpl?.conteo || 0} créditos
            </span>
          </div>

          <div className="border border-emerald-200 p-3 rounded-xl bg-emerald-50/40">
            <span className="text-[10px] text-emerald-800 block uppercase font-bold">
              Remesa a Guardar
            </span>
            <span className="font-bold text-emerald-700 text-sm tabular-nums font-mono">
              ${remesa.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-emerald-600 block mt-0.5">
              Sobre / Caja Fuerte
            </span>
          </div>

          <div className="border border-slate-200 p-3 rounded-xl bg-slate-50/60">
            <span className="text-[10px] text-slate-500 block uppercase font-bold">
              Fondo Sig. Turno
            </span>
            <span className="font-bold text-slate-900 text-sm tabular-nums font-mono">
              ${fondoSig.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Gaveta mostrador
            </span>
          </div>
        </div>
      </div>

      {/* Gran Total */}
      <div className="p-3.5 bg-slate-900 text-white rounded-xl flex items-center justify-between mb-4">
        <span className="font-bold text-xs uppercase tracking-wider text-slate-300">
          Total General de Cobros Facturados en el Turno:
        </span>
        <span className="text-base font-black text-emerald-400 tabular-nums font-mono">
          ${Number(teorico?.totalVentasTurno || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN
        </span>
      </div>

      {/* Justificación de Descuadre si existe */}
      {cierreData.justificacion_descuadre && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs mb-4">
          <strong>Justificación de Descuadre Registrada:</strong> {cierreData.justificacion_descuadre}
        </div>
      )}

      {/* Firmas de Entrega / Recepción Legal */}
      <div className="pt-6 grid grid-cols-2 gap-12 text-center text-xs text-slate-600 border-t border-slate-200">
        <div>
          <div className="border-t border-slate-400 pt-1.5 font-bold text-slate-900">
            {cajeroNombre}
          </div>
          <span className="text-[10px] text-slate-400 block">Cajero(a) Entrega Turno</span>
        </div>
        <div>
          <div className="border-t border-slate-400 pt-1.5 font-bold text-slate-900">
            Administrador / Supervisor
          </div>
          <span className="text-[10px] text-slate-400 block">Recepción y Validación de Fondos</span>
        </div>
      </div>
    </div>
  );

  // ─── 2. DISEÑO EN TICKET TÉRMICO 80MM ────────────────────────────────────────
  const renderTicketTermico = (
    <div
      id="pos-thermal-ticket"
      className="bg-white border border-slate-200/90 rounded-xl p-5 font-mono text-xs text-slate-800 shadow-md flex flex-col gap-3 max-w-[340px] w-full mx-auto print:shadow-none print:border-0 print:rounded-none"
    >
      {/* Header */}
      <div className="text-center pb-3 border-b border-dashed border-slate-300">
        <h2 className="font-bold text-sm uppercase tracking-wider text-slate-900">
          {empresaNombre}
        </h2>
        <p className="text-[10px] text-slate-500">{sucursalNombre}</p>
        <p className="text-[10px] text-slate-400 mt-1">
          {fechaStr} • {horaStr}
        </p>
        <div className="inline-block mt-2 px-2.5 py-0.5 bg-slate-900 text-white text-[10px] font-bold rounded">
          TICKET CORTE Z (80MM)
        </div>
      </div>

      {/* Shift Staff */}
      <div className="py-2 border-b border-dashed border-slate-300 text-[10px]">
        <div className="flex justify-between">
          <span>RESPONSABLE:</span>
          <span className="font-bold">{cajeroNombre}</span>
        </div>
        <div className="flex justify-between mt-1">
          <span>TURNO ID:</span>
          <span className="font-bold">
            {cierreData.turno_id ? String(cierreData.turno_id).substring(0, 8) : "ACTUAL"}
          </span>
        </div>
      </div>

      {/* Efectivo Fondos */}
      <div className="py-2.5 border-b border-dashed border-slate-300">
        <span className="font-bold text-[10px] text-slate-900 block mb-1">
          ARQUEO DE EFECTIVO
        </span>
        <div className="flex justify-between text-[11px]">
          <span>Fondo 1 (Mostrador):</span>
          <span className="font-bold tabular-nums font-mono">${f1Declarado.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-[10px] text-slate-500">
          <span>↳ Teórico: ${Number(cierreData.teoricoF1 || 0).toFixed(2)}</span>
          <span className={difF1 < 0 ? "text-rose-600 font-bold" : "text-emerald-600 font-bold"}>
            Dif: {difF1 > 0 ? "+" : ""}${difF1.toFixed(2)}
          </span>
        </div>

        <div className="flex justify-between text-[11px] mt-2">
          <span>Fondo 2 (Reserva):</span>
          <span className="font-bold tabular-nums font-mono">${f2Declarado.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-[10px] text-slate-500">
          <span>↳ Teórico: ${Number(cierreData.teoricoF2 || 0).toFixed(2)}</span>
          <span className={difF2 < 0 ? "text-rose-600 font-bold" : "text-emerald-600 font-bold"}>
            Dif: {difF2 > 0 ? "+" : ""}${difF2.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Remesa & Destino */}
      <div className="py-2 border-b border-dashed border-slate-300 text-[10px]">
        <span className="font-bold text-slate-900 block mb-1">DESTINO DEL EFECTIVO</span>
        <div className="flex justify-between">
          <span>Remesa a Caja Fuerte:</span>
          <span className="font-bold tabular-nums font-mono">${remesa.toFixed(2)}</span>
        </div>
        <div className="flex justify-between mt-1">
          <span>Fondo Sig. Turno:</span>
          <span className="font-bold tabular-nums font-mono">${fondoSig.toFixed(2)}</span>
        </div>
      </div>

      {/* SPEI */}
      {teorico?.bancosSPEI && teorico.bancosSPEI.length > 0 && (
        <div className="py-2 border-b border-dashed border-slate-300 text-[10px]">
          <span className="font-bold text-slate-900 block mb-1">SPEI POR CUENTA</span>
          {teorico.bancosSPEI.map((b: any) => (
            <div key={b.cuentaId} className="flex justify-between py-0.5">
              <span className="truncate max-w-[190px]">{b.alias}:</span>
              <span className="font-bold tabular-nums font-mono">${b.total.toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tarjetas */}
      <div className="py-2 border-b border-dashed border-slate-300 text-[10px]">
        <div className="flex justify-between">
          <span>Terminales TPV ({teorico?.tarjetasTPV?.conteo || 0}):</span>
          <span className="font-bold tabular-nums font-mono">
            ${Number(teorico?.tarjetasTPV?.total || 0).toFixed(2)}
          </span>
        </div>
        {teorico?.bnpl && teorico.bnpl.total > 0 && (
          <div className="flex justify-between mt-1">
            <span>BNPL Kueski/Atrato:</span>
            <span className="font-bold tabular-nums font-mono">
              ${Number(teorico.bnpl.total).toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {/* Total */}
      <div className="pt-2 pb-3 text-center">
        <span className="text-[10px] text-slate-500 font-bold">TOTAL VENTAS TURNO</span>
        <p className="text-sm font-bold text-slate-900 mt-0.5 font-mono">
          ${Number(teorico?.totalVentasTurno || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN
        </p>
      </div>

      {/* Firmas */}
      <div className="pt-4 grid grid-cols-2 gap-4 text-center text-[8px] text-slate-400">
        <div className="border-t border-slate-400 pt-1">Firma Cajero</div>
        <div className="border-t border-slate-400 pt-1">Firma Supervisor</div>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Corte Z Definitivo • Acta de Cierre y Arqueo"
      size={formato === "CARTA" ? "xl" : "md"}
      zIndex="z-[60]"
    >
      <div className="flex flex-col min-h-full">
        {/* ─── 1. BARRA FIJA SUPERIOR DE ACCIONES (Sticky Toolbar) ─── */}
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-slate-200/90 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2.5 no-print">
          {/* Segmented Control para Formato */}
          <div className="inline-flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200/80 text-xs font-medium">
            <button
              type="button"
              onClick={() => setFormato("CARTA")}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1.5 text-xs ${
                formato === "CARTA"
                  ? "bg-white text-slate-900 shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <FileText size={13} className={formato === "CARTA" ? "text-blue-600" : "text-slate-400"} />
              <span>Hoja Carta (Auditoría)</span>
            </button>
            <button
              type="button"
              onClick={() => setFormato("TICKET")}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1.5 text-xs ${
                formato === "TICKET"
                  ? "bg-white text-slate-900 shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Receipt size={13} className={formato === "TICKET" ? "text-blue-600" : "text-slate-400"} />
              <span>Ticket 80mm</span>
            </button>
          </div>

          {/* Botones de Acción */}
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100/70 text-emerald-800 text-xs font-semibold transition-colors cursor-pointer"
              title="Descargar libro de Excel nativo (.xlsx)"
            >
              <FileSpreadsheet size={14} className="text-emerald-700" />
              <span>Excel (.xlsx)</span>
            </button>

            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors cursor-pointer"
              title="Compartir resumen por WhatsApp"
            >
              <MessageCircle size={14} className="text-emerald-600" />
              <span>WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              style={{ backgroundColor: primaryColor }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-white font-semibold text-xs shadow-xs hover:opacity-95 cursor-pointer transition-opacity"
            >
              <Printer size={14} />
              <span>{formato === "CARTA" ? "Imprimir / Guardar PDF" : "Imprimir Ticket"}</span>
              <kbd className="hidden sm:inline-block font-mono text-[10px] bg-white/20 text-white px-1.5 py-0.2 rounded">
                ↵ Enter
              </kbd>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 font-medium text-xs transition-colors cursor-pointer"
            >
              Listo
            </button>
          </div>
        </div>

        {/* ─── 2. LIENZO DE PREVISUALIZACIÓN ("Paper Studio") ─── */}
        <div className="p-4 sm:p-6 no-print bg-slate-50/50">
          <div className="bg-slate-100/75 border border-slate-200/80 rounded-2xl p-4 sm:p-6 flex justify-center overflow-x-auto">
            {formato === "CARTA" ? renderDocumentoCarta : renderTicketTermico}
          </div>
        </div>
      </div>

      {/* Print Portal outside .no-print Modal Container */}
      {mounted &&
        typeof document !== "undefined" &&
        createPortal(
          <div data-print-portal="true" className="hidden print:block fixed inset-0 bg-white z-[9999] p-0 m-0">
            {formato === "CARTA" ? (
              <div className="p-0 m-0">
                {renderDocumentoCarta}
                <style jsx global>{`
                  @page {
                    size: letter portrait;
                    margin: 0;
                  }
                  @media print {
                    @page {
                      margin: 0;
                    }
                    html, body {
                      background-color: #ffffff !important;
                      color: #0f172a !important;
                      -webkit-print-color-adjust: exact !important;
                      print-color-adjust: exact !important;
                      margin: 0 !important;
                      padding: 0 !important;
                    }
                    .no-print, header, nav, footer, .modal-backdrop {
                      display: none !important;
                    }
                  }
                `}</style>
              </div>
            ) : (
              <div className="p-0 m-0">
                {renderTicketTermico}
                <style jsx global>{`
                  @page {
                    size: 80mm auto;
                    margin: 3mm;
                  }
                  @media print {
                    html, body {
                      background-color: #ffffff !important;
                      color: #0f172a !important;
                      -webkit-print-color-adjust: exact !important;
                      print-color-adjust: exact !important;
                    }
                    .no-print, header, nav, footer, .modal-backdrop {
                      display: none !important;
                    }
                  }
                `}</style>
              </div>
            )}
          </div>,
          document.body
        )}
    </Modal>
  );
}
