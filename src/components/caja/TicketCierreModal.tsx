"use client";

import React, { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Printer,
  FileText,
  Receipt,
  MessageCircle,
  FileSpreadsheet,
  Building2,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Car,
  Layers,
  Loader2,
  Wrench,
  PackageCheck,
  TrendingUp,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import TenantBrandLogo from "@/components/brand/TenantBrandLogo";
import {
  CajaTurnoService,
  TurnoDetalleCompleto,
} from "@/services/cajaTurnoService";
import { ReportesExportService } from "@/services/reportesExportService";

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
type VistaCorte = "VENTAS" | "BALANCE";

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
  const [vista, setVista] = useState<VistaCorte>("VENTAS");
  const [mounted, setMounted] = useState(false);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [resumenCalculado, setResumenCalculado] = useState<any>(null);
  const [detalleTurno, setDetalleTurno] = useState<TurnoDetalleCompleto>({
    ventas: [],
    gastos: [],
    totales: {
      totalVentas: 0,
      totalCostos: 0,
      utilidadEstimada: 0,
      margenEstimadoPorcentaje: 0,
      totalGastos: 0,
      cantidadOrdenes: 0,
      cantidadPartidas: 0,
    },
  });

  const printableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Cargar detalle completo de ventas y gastos cuando se abre el modal
  useEffect(() => {
    const targetTurnoId = cierreData?.turno_id || cierreData?.turnoId;
    if (isOpen && targetTurnoId) {
      setLoadingDetalle(true);
      if (cierreData?.resumenTeorico) {
        setResumenCalculado(cierreData.resumenTeorico);
      }
      CajaTurnoService.calcularResumenTeoricoTurno(targetTurnoId).then((resT) => {
        if (resT) setResumenCalculado(resT);
      });
      CajaTurnoService.obtenerDetalleTurnoCompleto(targetTurnoId)
        .then((data) => {
          setDetalleTurno(data);
        })
        .finally(() => {
          setLoadingDetalle(false);
        });
    }
  }, [isOpen, cierreData?.turno_id, cierreData?.turnoId]);

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
  const teorico = cierreData.resumenTeorico?.fondo1 ? cierreData.resumenTeorico : (resumenCalculado || cierreData.resumenTeorico);
  const primaryColor = empresa?.color_primario || "#1C3EFF";

  // Teóricos F1 y F2 robustos ante snapshots de historial o cierres recientes
  const f1Apertura = Number(teorico?.fondo1?.apertura || 0);
  const f1Entradas = Number(teorico?.fondo1?.entradasEfectivoPOS || 0);
  const f1Salidas = Number(teorico?.fondo1?.salidasGastos || 0);
  const f1TraspasosNetos = Number((teorico?.fondo1?.traspasosRecibidos || 0) - (teorico?.fondo1?.traspasosEnviados || 0));
  const teoricoF1Calculado = f1Apertura + f1Entradas - f1Salidas + f1TraspasosNetos;
  const teoricoF1 = Number(cierreData.teoricoF1 != null ? cierreData.teoricoF1 : teoricoF1Calculado);

  const f2Apertura = Number(teorico?.fondo2?.apertura ?? cierreData.fondo2_apertura ?? f2Declarado ?? 0);
  const f2TraspasosNetos = -Number(teorico?.fondo2?.traspasosEnviados || 0);
  const teoricoF2Calculado = f2Apertura + f2TraspasosNetos;
  const teoricoF2 = Number(cierreData.teoricoF2 != null ? cierreData.teoricoF2 : (teoricoF2Calculado || f2Declarado));

  const [exportingExcel, setExportingExcel] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  // Exportar Excel Nativo con Diseño Editorial (exceljs)
  const handleExportExcel = async () => {
    try {
      setExportingExcel(true);
      const targetTurnoId = cierreData.turno_id || cierreData.turnoId;
      let finalDetalle = detalleTurno;
      if (!finalDetalle && targetTurnoId) {
        finalDetalle = await CajaTurnoService.obtenerDetalleTurnoCompleto(targetTurnoId);
        setDetalleTurno(finalDetalle);
      }

      await ReportesExportService.exportarCorteExcelElegante({
        empresaNombre: empresa?.nombre_comercial || empresaNombre,
        sucursalNombre: sucursal?.nombre || sucursalNombre,
        cajeroNombre,
        fechaTurno: fechaStr,
        turnoId: targetTurnoId,
        cierreData: { ...cierreData, teoricoF1, teoricoF2, resumenTeorico: teorico },
        detalleTurno: finalDetalle,
      });
    } catch (err) {
      console.error("Error al exportar reporte Excel:", err);
    } finally {
      setExportingExcel(false);
    }
  };

  const handleWhatsAppShare = () => {
    let msg = `*CIERRE DE CAJA - ${(empresa?.nombre_comercial || empresaNombre).toUpperCase()}*\n`;
    msg += `📍 Sucursal: ${sucursal?.nombre || sucursalNombre}\n`;
    msg += `📅 Fecha: ${fechaStr} ${horaStr}\n`;
    msg += `👤 Responsable: ${cajeroNombre}\n\n`;

    msg += `*RESUMEN DE EFECTIVO*\n`;
    msg += `• Mostrador (Fondo 1): $${f1Declarado.toLocaleString("es-MX", { minimumFractionDigits: 2 })}\n`;
    if (Math.abs(difF1) > 0) {
      msg += `  ↳ Variación: ${difF1 > 0 ? "+" : ""}$${difF1.toFixed(2)} (${difF1 >= 0 ? "Sobrante" : "Faltante"})\n`;
    }
    msg += `• Reserva (Fondo 2): $${f2Declarado.toLocaleString("es-MX", { minimumFractionDigits: 2 })}\n`;
    msg += `• Remesa Retirada a Caja Fuerte: $${remesa.toLocaleString("es-MX", { minimumFractionDigits: 2 })}\n`;
    msg += `• Fondo para Mañana: $${fondoSig.toLocaleString("es-MX", { minimumFractionDigits: 2 })}\n\n`;

    if (teorico?.bancosSPEI && teorico.bancosSPEI.length > 0) {
      msg += `*TRANSFERENCIAS BANCARIAS:*\n`;
      teorico.bancosSPEI.forEach((b: any) => {
        msg += `• ${b.alias} (${b.banco}): $${Number(b.total || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}\n`;
      });
      msg += `\n`;
    }

    if (teorico?.tarjetasTPV && teorico.tarjetasTPV.total > 0) {
      msg += `*TERMINALES TPV (TARJETAS):*\n`;
      msg += `• Total Tarjetas: $${Number(teorico.tarjetasTPV.total).toLocaleString("es-MX", { minimumFractionDigits: 2 })} (${teorico.tarjetasTPV.conteo})\n\n`;
    }

    const totalCobrado = Number(teorico?.totalVentasTurno || detalleTurno.totales.totalVentas || 0);
    msg += `*TOTAL COBROS DEL TURNO:* $${totalCobrado.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN`;

    const encoded = encodeURIComponent(msg);
    window.open(`https://wa.me/?text=${encoded}`, "_blank");
  };

  // ─── BLOQUE 1: VENTAS Y SERVICIOS DEL TURNO ──────────────────────────────────
  const renderSeccionVentas = (
    <div className="space-y-4">
      {/* Tarjetas Resumen */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
        <div className="border border-blue-200 bg-blue-50/50 rounded-xl p-3">
          <span className="text-[10px] text-blue-700 font-bold uppercase tracking-wider block">
            Ventas Cobradas
          </span>
          <span className="text-sm sm:text-base font-black text-blue-950 font-mono tabular-nums block mt-0.5">
            ${detalleTurno.totales.totalVentas.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-blue-600 font-medium">
            {detalleTurno.totales.cantidadOrdenes} órdenes cobradas
          </span>
        </div>

        <div className="border border-amber-200 bg-amber-50/50 rounded-xl p-3">
          <span className="text-[10px] text-amber-800 font-bold uppercase tracking-wider block">
            Costo Refacciones
          </span>
          <span className="text-sm sm:text-base font-black text-amber-950 font-mono tabular-nums block mt-0.5">
            ${detalleTurno.totales.totalCostos.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-amber-700 font-medium">
            Compras a proveedores
          </span>
        </div>

        <div className="border border-emerald-200 bg-emerald-50/50 rounded-xl p-3">
          <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider block">
            Utilidad Bruta Est.
          </span>
          <span className="text-sm sm:text-base font-black text-emerald-950 font-mono tabular-nums block mt-0.5">
            +${detalleTurno.totales.utilidadEstimada.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-emerald-700 font-medium">
            Margen promedio {detalleTurno.totales.margenEstimadoPorcentaje.toFixed(1)}%
          </span>
        </div>

        <div className="border border-slate-200 bg-slate-50/70 rounded-xl p-3">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
            Gastos Caja Chica
          </span>
          <span className="text-sm sm:text-base font-black text-slate-800 font-mono tabular-nums block mt-0.5">
            ${detalleTurno.totales.totalGastos.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-slate-500 font-medium">
            Salidas operativas
          </span>
        </div>
      </div>

      {/* Tabla Detallada por Orden y Partidas */}
      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between">
          <span className="font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
            <Car size={14} className="text-blue-400" />
            Desglose de Servicios y Refacciones por Vehículo
          </span>
          <span className="text-[11px] text-slate-300">
            {detalleTurno.totales.cantidadPartidas} partidas amparadas
          </span>
        </div>

        {loadingDetalle ? (
          <div className="p-8 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span className="text-xs font-medium">Consultando ventas y partidas del turno...</span>
          </div>
        ) : detalleTurno.ventas.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            Sin órdenes cobradas registradas durante este turno.
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {detalleTurno.ventas.map((v) => (
              <div key={v.ordenId} className="p-3.5 hover:bg-slate-50/50 transition-colors">
                {/* Cabecera de la Orden */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-900 font-black font-mono text-xs">
                      {v.folioStr}
                    </span>
                    <span className="font-bold text-slate-900 text-xs">{v.vehiculoDesc}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-200 text-slate-800">
                      {v.placas}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-slate-500 text-[11px]">
                      Cliente: <strong className="text-slate-700">{v.clienteNombre}</strong>
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${v.metodoPago.startsWith("Multimétodo") ? "bg-purple-50 text-purple-800 border-purple-200" : v.metodoPago.startsWith("Transferencia") ? "bg-blue-50 text-blue-800 border-blue-200" : v.metodoPago.includes("MSI") || v.metodoPago.includes("Tarjeta") || v.metodoPago.includes("Mercado Pago") ? "bg-indigo-50 text-indigo-800 border-indigo-200" : "bg-emerald-50 text-emerald-800 border-emerald-200"}`}>
                      {v.metodoPago}
                    </span>
                    <span className="font-mono font-black text-slate-900 tabular-nums">
                      ${v.totalVenta.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Desglose de pagos si es Multimétodo */}
                {v.pagosDesglose && v.pagosDesglose.length > 1 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1.5 pb-2 text-[11px] border-b border-slate-100">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                      Desglose de Pago:
                    </span>
                    {v.pagosDesglose.map((pd, pIdx) => (
                      <span
                        key={pIdx}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono bg-slate-100 text-slate-800 border border-slate-200"
                      >
                        <span className="font-semibold text-slate-600">
                          {pd.metodo}
                          {pd.cuentaAlias ? ` (${pd.cuentaAlias})` : pd.plazoMsi ? ` (${pd.plazoMsi} MSI)` : ""}:
                        </span>
                        <span className="font-bold text-slate-950">
                          ${pd.monto.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                        </span>
                        {pd.referencia && (
                          <span className="text-slate-400 font-sans text-[9px] ml-0.5">
                            • Ref: {pd.referencia}
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                )}

                {/* Referencia si es 1 solo pago con cuenta bancaria o voucher */}
                {v.pagosDesglose && v.pagosDesglose.length === 1 && v.pagosDesglose[0].referencia && (
                  <div className="text-[10px] text-slate-400 pt-1 pb-1.5 border-b border-slate-100">
                    <span>Referencia: <strong className="font-mono text-slate-600">{v.pagosDesglose[0].referencia}</strong></span>
                    {v.pagosDesglose[0].bancoNombre && (
                      <span className="ml-2">• Banco: <strong className="text-slate-600">{v.pagosDesglose[0].bancoNombre}</strong></span>
                    )}
                  </div>
                )}

                {/* Partidas de la Orden */}
                <div className="pt-2 overflow-x-auto">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead className="text-[9.5px] uppercase font-bold text-slate-400">
                      <tr>
                        <th className="py-1 px-2 w-2/12">Tipo</th>
                        <th className="py-1 px-2 w-4/12">Concepto</th>
                        <th className="py-1 px-2 text-center w-1/12">Cant.</th>
                        <th className="py-1 px-2 text-right w-2/12">P. Unitario</th>
                        <th className="py-1 px-2 text-right w-2/12">Importe</th>
                        <th className="py-1 px-2 text-right w-1/12">Margen</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {v.partidas.map((item, pIdx) => (
                        <tr key={pIdx} className="text-slate-700">
                          <td className="py-1 px-2">
                            <span
                              className={`inline-flex items-center gap-1 text-[9.5px] font-semibold px-1.5 py-0.5 rounded ${
                                item.tipo === "Refacción"
                                  ? "bg-amber-50 text-amber-800 border border-amber-200"
                                  : "bg-blue-50 text-blue-800 border border-blue-200"
                              }`}
                            >
                              {item.tipo === "Refacción" ? (
                                <PackageCheck size={10} />
                              ) : (
                                <Wrench size={10} />
                              )}
                              {item.tipo}
                            </span>
                          </td>
                          <td className="py-1 px-2 font-medium">
                            <span>{item.descripcion}</span>
                            {item.proveedor && (
                              <span className="block text-[9.5px] text-slate-400">
                                Proveedor: {item.proveedor}
                                {item.folioTicketProv ? ` • Nota #${item.folioTicketProv}` : ""}
                                {item.mesesGarantia ? ` • Garantía: ${item.mesesGarantia}m` : ""}
                              </span>
                            )}
                          </td>
                          <td className="py-1 px-2 text-center font-mono">{item.cantidad}</td>
                          <td className="py-1 px-2 text-right font-mono text-slate-600 tabular-nums">
                            ${item.precioUnitario.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-1 px-2 text-right font-mono font-bold text-slate-900 tabular-nums">
                            ${item.importe.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-1 px-2 text-right font-mono text-[10px] font-semibold text-emerald-700 tabular-nums">
                            {item.margenPorcentaje.toFixed(0)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // ─── BLOQUE 2: BALANCE DE EFECTIVO Y BANCOS ──────────────────────────────────
  const renderSeccionBalance = (
    <div className="space-y-4">
      {/* 1. Arqueo Comparativo Dual de Efectivo */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2.5 flex items-center gap-1.5">
          <ShieldCheck size={15} className="text-emerald-600" />
          1. Resumen de Efectivo en Caja
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Fondo 1: Mostrador Operativo */}
          <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/60 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <span className="font-bold text-xs text-slate-900">
                  Mostrador (Fondo 1)
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
                  <span className="text-slate-500 block text-[10px]">(+) Cobros Efectivo:</span>
                  <span className="font-bold text-emerald-700 tabular-nums font-mono">
                    +${Number(teorico?.fondo1?.entradasEfectivoPOS || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">(-) Gastos Mostrador:</span>
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
                  ${teoricoF1.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
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
                  Caja Fuerte (Fondo 2)
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
                    ${f2Apertura.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
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
                  ${teoricoF2.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
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

      {/* 2. Conciliación de Transferencias SPEI */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2 flex items-center gap-1.5">
          <Building2 size={15} className="text-blue-600" />
          2. Transferencias Bancarias (SPEI)
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
                    <td className="py-2 px-3.5 text-center font-bold text-slate-700 tabular-nums">
                      {b.conteo}
                    </td>
                    <td className="py-2 px-3.5 text-right font-bold tabular-nums font-mono text-slate-900">
                      ${Number(b.total || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-3 px-3.5 text-center text-slate-400">
                    Sin transferencias registradas en este turno
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Terminales TPV y Destino del Efectivo */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2">
          3. Terminales de Tarjeta (TPVs) y Destino del Efectivo
        </h2>
        {/* Tabla Desglosada de Terminales TPV */}
        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs mb-3">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-[9.5px] uppercase font-bold text-slate-500">
              <tr>
                <th className="py-2.5 px-3.5 w-4/12">Terminal / Pasarela</th>
                <th className="py-2.5 px-3.5 w-2/12">Modalidad</th>
                <th className="py-2.5 px-3.5 text-center w-2/12">Transacciones</th>
                <th className="py-2.5 px-3.5 text-right w-2/12">Comisión Absorbida</th>
                <th className="py-2.5 px-3.5 text-right w-2/12">Monto Bruto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {teorico?.tarjetasTPV?.desglose && teorico.tarjetasTPV.desglose.length > 0 ? (
                teorico.tarjetasTPV.desglose.map((t: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-2 px-3.5">
                      <span className="font-bold text-slate-900 block">{t.metodo}</span>
                      <span className="text-[10px] text-slate-400 block">{t.proveedor}</span>
                    </td>
                    <td className="py-2 px-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        t.plazo_msi ? "bg-purple-100 text-purple-900" : "bg-slate-100 text-slate-700"
                      }`}>
                        {t.modalidad}
                      </span>
                    </td>
                    <td className="py-2 px-3.5 text-center font-bold text-slate-700 tabular-nums">
                      {t.conteo} {t.conteo === 1 ? "voucher" : "vouchers"}
                    </td>
                    <td className="py-2 px-3.5 text-right font-medium text-rose-600 tabular-nums font-mono text-[11px]">
                      {t.comision > 0 ? `-$${Number(t.comision).toLocaleString("es-MX", { minimumFractionDigits: 2 })}` : "$0.00"}
                    </td>
                    <td className="py-2 px-3.5 text-right font-bold tabular-nums font-mono text-slate-900">
                      ${Number(t.bruto || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              ) : Number(teorico?.tarjetasTPV?.total || 0) > 0 ? (
                <tr className="hover:bg-slate-50/50">
                  <td className="py-2 px-3.5 font-bold text-slate-900">Terminales de Cobro</td>
                  <td className="py-2 px-3.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                      Vouchers TPV
                    </span>
                  </td>
                  <td className="py-2 px-3.5 text-center font-bold text-slate-700 tabular-nums">
                    {teorico?.tarjetasTPV?.conteo || 0} vouchers
                  </td>
                  <td className="py-2 px-3.5 text-right font-medium text-slate-400 tabular-nums font-mono text-[11px]">
                    $0.00
                  </td>
                  <td className="py-2 px-3.5 text-right font-bold tabular-nums font-mono text-slate-900">
                    ${Number(teorico?.tarjetasTPV?.total || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ) : (
                <tr>
                  <td colSpan={5} className="py-3 px-3.5 text-center text-slate-400">
                    Sin cobros con tarjeta o terminal registrados en este turno
                  </td>
                </tr>
              )}
            </tbody>
            {Number(teorico?.tarjetasTPV?.totalComisiones || 0) > 0 && (
              <tfoot className="bg-slate-50/80 border-t border-slate-200 text-xs">
                <tr>
                  <td colSpan={3} className="py-2 px-3.5 font-bold text-slate-600 text-right">
                    Comisiones Totales Absorbidas:
                  </td>
                  <td className="py-2 px-3.5 text-right font-bold text-rose-600 font-mono">
                    -${Number(teorico?.tarjetasTPV?.totalComisiones || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2 px-3.5 text-right font-bold text-slate-900 font-mono text-xs">
                    Neto: ${Number(teorico?.tarjetasTPV?.totalNeto || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="border border-slate-200 p-3 rounded-xl bg-slate-50/60">
            <span className="text-[10px] text-slate-500 block uppercase font-bold">
              Total Tarjetas (Bruto)
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
              Remesa a Retirar
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
              Fondo Turno Siguiente
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
      <div className="p-3.5 bg-slate-900 text-white rounded-xl flex items-center justify-between">
        <span className="font-bold text-xs uppercase tracking-wider text-slate-300">
          Total General de Cobros Facturados en el Turno:
        </span>
        <span className="text-base font-black text-emerald-400 tabular-nums font-mono">
          ${Number(teorico?.totalVentasTurno || detalleTurno.totales.totalVentas || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN
        </span>
      </div>

      {/* Justificación de Descuadre si existe */}
      {cierreData.justificacion_descuadre && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs">
          <strong>Justificación de Descuadre Registrada:</strong> {cierreData.justificacion_descuadre}
        </div>
      )}

      {/* Firmas de Entrega / Recepción */}
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

  // ─── 1. DISEÑO EN HOJA TAMAÑO CARTA (LETTER) ─────────────────────────────────
  const renderDocumentoCarta = (
    <div
      id="printable-corte-document"
      ref={printableRef}
      className="bg-white text-slate-900 border border-slate-200/90 rounded-xl p-6 sm:p-8 max-w-4xl w-full mx-auto text-xs leading-normal font-sans shadow-md print:shadow-none print:border-0 print:rounded-none print:py-[10mm] print:px-[12mm] print:m-0 print:max-w-none transition-all"
    >
      {/* Encabezado Corporativo */}
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
              <span>
                RFC: <strong className="text-slate-700 font-mono">{empresa?.rfc || "COV2201019A1"}</strong>
              </span>
              <span>•</span>
              <span>
                Turno: <strong className="text-slate-700 font-mono">#{cierreData.turno_id ? String(cierreData.turno_id).substring(0, 8).toUpperCase() : "Z-ACTIVO"}</strong>
              </span>
              {(sucursal?.direccion || empresa?.direccion) && (
                <>
                  <span>•</span>
                  <span>{sucursal?.direccion || empresa?.direccion}</span>
                </>
              )}
              {(sucursal?.telefono || empresa?.telefono) && (
                <>
                  <span>•</span>
                  <span className="font-semibold text-slate-700 font-mono">
                    Tel: {sucursal?.telefono || empresa?.telefono}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end shrink-0 text-right">
          <span className="inline-block px-3 py-1 bg-slate-900 text-white text-[10px] font-bold rounded-lg tracking-wider uppercase mb-1">
            Cierre de Caja (Corte Z)
          </span>
          <p className="text-xs font-bold text-slate-900">Fecha: {fechaStr}</p>
          <p className="text-[10px] text-slate-500 font-mono">Hora: {horaStr}</p>
          <p className="text-[10px] text-slate-600 mt-0.5">
            Responsable: <strong className="text-slate-900">{cajeroNombre}</strong>
          </p>
        </div>
      </div>

      {/* En pantalla: Vista Condicional según Pestaña */}
      <div className="print:hidden">
        {vista === "VENTAS" ? renderSeccionVentas : renderSeccionBalance}
      </div>

      {/* En impresión física: Ambas secciones en secuencia limpia */}
      <div className="hidden print:block space-y-6">
        <div>{renderSeccionVentas}</div>
        <div className="page-break-before pt-6" style={{ pageBreakBefore: "always" }}>
          <div
            className="border-b-2 pb-3 mb-4 flex justify-between items-center"
            style={{ borderColor: primaryColor }}
          >
            <span className="font-black text-sm uppercase text-slate-900">
              {empresa?.nombre_comercial || empresaNombre} • Balance de Efectivo y Bancos
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              Turno: #{cierreData.turno_id ? String(cierreData.turno_id).substring(0, 8).toUpperCase() : "Z-ACTIVO"}
            </span>
          </div>
          {renderSeccionBalance}
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
      <div className="text-center pb-3 border-b border-dashed border-slate-300">
        <h2 className="font-bold text-sm uppercase tracking-wider text-slate-900">
          {empresa?.nombre_comercial || empresaNombre}
        </h2>
        <p className="text-[10px] text-slate-500">{sucursal?.nombre || sucursalNombre}</p>
        <p className="text-[10px] text-slate-400 mt-1">
          {fechaStr} • {horaStr}
        </p>
        <div className="inline-block mt-2 px-2.5 py-0.5 bg-slate-900 text-white text-[10px] font-bold rounded">
          TICKET DE CIERRE (80MM)
        </div>
      </div>

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

      <div className="py-2.5 border-b border-dashed border-slate-300">
        <span className="font-bold text-[10px] text-slate-900 block mb-1">
          RESUMEN DE EFECTIVO
        </span>
        <div className="flex justify-between text-[11px]">
          <span>Mostrador (Fondo 1):</span>
          <span className="font-bold tabular-nums font-mono">${f1Declarado.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-[10px] text-slate-500">
          <span>↳ Teórico: ${Number(cierreData.teoricoF1 || 0).toFixed(2)}</span>
          <span className={difF1 < 0 ? "text-rose-600 font-bold" : "text-emerald-600 font-bold"}>
            Dif: {difF1 > 0 ? "+" : ""}${difF1.toFixed(2)}
          </span>
        </div>

        <div className="flex justify-between text-[11px] mt-2">
          <span>Caja Fuerte (Fondo 2):</span>
          <span className="font-bold tabular-nums font-mono">${f2Declarado.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-[10px] text-slate-500">
          <span>↳ Teórico: ${Number(cierreData.teoricoF2 || 0).toFixed(2)}</span>
          <span className={difF2 < 0 ? "text-rose-600 font-bold" : "text-emerald-600 font-bold"}>
            Dif: {difF2 > 0 ? "+" : ""}${difF2.toFixed(2)}
          </span>
        </div>
      </div>

      <div className="py-2 border-b border-dashed border-slate-300 text-[10px]">
        <span className="font-bold text-slate-900 block mb-1">DESTINO DEL EFECTIVO</span>
        <div className="flex justify-between">
          <span>Remesa a Caja Fuerte:</span>
          <span className="font-bold tabular-nums font-mono">${remesa.toFixed(2)}</span>
        </div>
        <div className="flex justify-between mt-1">
          <span>Fondo Turno Siguiente:</span>
          <span className="font-bold tabular-nums font-mono">${fondoSig.toFixed(2)}</span>
        </div>
      </div>

      {teorico?.bancosSPEI && teorico.bancosSPEI.length > 0 && (
        <div className="py-2 border-b border-dashed border-slate-300 text-[10px]">
          <span className="font-bold text-slate-900 block mb-1">TRANSFERENCIAS SPEI</span>
          {teorico.bancosSPEI.map((b: any) => (
            <div key={b.cuentaId} className="flex justify-between py-0.5">
              <span className="truncate max-w-[190px]">{b.alias}:</span>
              <span className="font-bold tabular-nums font-mono">${Number(b.total || 0).toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="py-2 border-b border-dashed border-slate-300 text-[10px]">
        <div className="flex justify-between">
          <span>Terminales ({teorico?.tarjetasTPV?.conteo || 0}):</span>
          {teorico?.tarjetasTPV?.desglose && teorico.tarjetasTPV.desglose.length > 0 && (
            <div className="mt-1 space-y-0.5">
              {teorico.tarjetasTPV.desglose.map((t: any, idx: number) => (
                <div key={idx} className="text-[9px] text-slate-500 flex justify-between">
                  <span>↳ {t.metodo} ({t.modalidad}):</span>
                  <span>${Number(t.bruto).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
          <span className="font-bold tabular-nums font-mono">
            ${Number(teorico?.tarjetasTPV?.total || 0).toFixed(2)}
          </span>
        </div>
      </div>

      <div className="pt-2 pb-3 text-center">
        <span className="text-[10px] text-slate-500 font-bold">TOTAL FACTURADO</span>
        <p className="text-sm font-bold text-slate-900 mt-0.5 font-mono">
          ${Number(teorico?.totalVentasTurno || detalleTurno.totales.totalVentas || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN
        </p>
      </div>

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
      title="Cierre de Caja (Corte Z)"
      size="xl"
      zIndex="z-[60]"
    >
      <div className="flex flex-col min-h-full">
        {/* ─── 1. BARRA FIJA SUPERIOR DE ACCIONES (Sticky Toolbar) ─── */}
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-slate-200/90 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2.5 no-print">
          {/* Segmented Control para Vistas en Pantalla */}
          <div className="inline-flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200/80 text-xs font-medium">
            <button
              type="button"
              onClick={() => {
                setFormato("CARTA");
                setVista("VENTAS");
              }}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1.5 text-xs ${
                formato === "CARTA" && vista === "VENTAS"
                  ? "bg-white text-blue-900 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Car size={13} className={formato === "CARTA" && vista === "VENTAS" ? "text-blue-600" : "text-slate-400"} />
              <span>Ventas y Servicios</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setFormato("CARTA");
                setVista("BALANCE");
              }}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1.5 text-xs ${
                formato === "CARTA" && vista === "BALANCE"
                  ? "bg-white text-emerald-900 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <ShieldCheck size={13} className={formato === "CARTA" && vista === "BALANCE" ? "text-emerald-600" : "text-slate-400"} />
              <span>Balance de Caja</span>
            </button>
            <button
              type="button"
              onClick={() => setFormato("TICKET")}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1.5 text-xs ${
                formato === "TICKET"
                  ? "bg-white text-slate-900 shadow-xs font-bold"
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
              disabled={exportingExcel}
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-bold transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
              title="Descargar libro de Excel formateado (.xlsx)"
            >
              {exportingExcel ? (
                <Loader2 size={14} className="text-emerald-700 animate-spin" />
              ) : (
                <FileSpreadsheet size={14} className="text-emerald-700" />
              )}
              <span>{exportingExcel ? "Generando Excel..." : "Descargar Reporte en Excel"}</span>
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
              <span>{formato === "CARTA" ? "Imprimir Comprobante de Cierre" : "Imprimir Ticket"}</span>
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
                    margin: 8mm 10mm;
                  }
                  @media print {
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
