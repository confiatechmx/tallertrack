"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  FileSpreadsheet,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Building2,
  CreditCard,
  Banknote,
  ShieldCheck,
  TrendingUp,
  Receipt,
  FileText,
  Loader2,
  ExternalLink,
  ChevronRight,
  Layers,
  Percent,
} from "lucide-react";
import {
  CajaTurnoService,
  ResumenCorteDiarioAuditoria,
} from "@/services/cajaTurnoService";
import { ReportesExportService } from "@/services/reportesExportService";

interface CorteDiarioAuditoriaModalProps {
  isOpen: boolean;
  onClose: () => void;
  turnoId: string;
  nombreTaller?: string;
  onTurnoAuditado?: () => void;
}

export function CorteDiarioAuditoriaModal({
  isOpen,
  onClose,
  turnoId,
  nombreTaller = "Cova Tires",
  onTurnoAuditado,
}: CorteDiarioAuditoriaModalProps) {
  const [loading, setLoading] = useState(true);
  const [resumen, setResumen] = useState<ResumenCorteDiarioAuditoria | null>(null);
  const [activeTab, setActiveTab] = useState<"resumen" | "bancos" | "tarjetas" | "proveedores" | "kpis">("resumen");
  const [auditing, setAuditing] = useState(false);
  const [auditSuccess, setAuditSuccess] = useState(false);

  useEffect(() => {
    if (isOpen && turnoId) {
      cargarResumen();
    }
  }, [isOpen, turnoId]);

  const cargarResumen = async () => {
    setLoading(true);
    const data = await CajaTurnoService.obtenerResumenCorteDiarioAuditoria(turnoId);
    setResumen(data);
    setLoading(false);
  };

  const handleExportExcel = () => {
    if (!resumen) return;
    ReportesExportService.exportarCorteExcel(resumen, [], nombreTaller);
  };

  const handlePrintPDF = () => {
    window.print();
  };

  const handleAuditarTurno = async () => {
    if (!resumen) return;
    setAuditing(true);
    const res = await CajaTurnoService.auditarTurnoCaja(turnoId);
    setAuditing(false);
    if (res.success) {
      setAuditSuccess(true);
      if (onTurnoAuditado) onTurnoAuditado();
      setTimeout(() => {
        setAuditSuccess(false);
        onClose();
      }, 1500);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Superior */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-800 text-base">
                  Corte Diario y Auditoría de Caja - {nombreTaller}
                </h3>
                {resumen?.estado === "AUDITADO" ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    AUDITADO
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                    PENDIENTE DE AUDITORÍA
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Conciliación espejo bancaria, comisiones MSI, balance fiscal y registro del día
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Descargar libro Excel de 3 pestañas"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Exportar Excel
            </button>
            <button
              onClick={handlePrintPDF}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Imprimir formato carta o guardar como PDF"
            >
              <Printer className="w-4 h-4" />
              PDF / Imprimir
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Barra de Pestañas de Auditoría */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-200 bg-white">
          {[
            { id: "resumen", label: "Balance General y Fiscal", icon: TrendingUp },
            { id: "bancos", label: "Cuentas SPEI (Bancos)", icon: Building2 },
            { id: "tarjetas", label: "Tarjetas y Comisiones MSI", icon: CreditCard },
            { id: "proveedores", label: "Proveedores y Evidencias", icon: Receipt },
            { id: "kpis", label: "Registro del Día (KPIs)", icon: Layers },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  active
                    ? "border-primary text-primary bg-primary/5 rounded-t-md"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Contenido */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-xs font-medium">Consolidando snapshot de corte diario...</p>
            </div>
          ) : !resumen ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              No se pudo cargar el resumen del turno seleccionado.
            </div>
          ) : (
            <>
              {/* PESTAÑA 1: RESUMEN GENERAL & FISCAL */}
              {activeTab === "resumen" && (
                <div className="space-y-5">
                  {/* Tarjetas KPI Superiores */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase">
                        Ventas Brutas
                      </span>
                      <p className="text-lg font-bold text-slate-900 mt-1">
                        ${(resumen.fiscal?.ventas_brutas || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                      </p>
                      <span className="text-[10px] text-slate-400">Total cobrado al cliente</span>
                    </div>

                    <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3">
                      <span className="text-[11px] font-semibold text-amber-700 uppercase flex items-center gap-1">
                        <Percent className="w-3 h-3" /> Comisiones Retenidas
                      </span>
                      <p className="text-lg font-bold text-amber-900 mt-1">
                        -${(resumen.fiscal?.comisiones_retenidas || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                      </p>
                      <span className="text-[10px] text-amber-700/80">Absorbidas por taller</span>
                    </div>

                    <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-3">
                      <span className="text-[11px] font-semibold text-blue-700 uppercase">
                        Costos Refacciones
                      </span>
                      <p className="text-lg font-bold text-blue-900 mt-1">
                        -${(resumen.fiscal?.costos_refacciones || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                      </p>
                      <span className="text-[10px] text-blue-700/80">Compras a proveedores</span>
                    </div>

                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                      <span className="text-[11px] font-semibold text-emerald-700 uppercase">
                        Ganancia Neta Total
                      </span>
                      <p className="text-lg font-bold text-emerald-900 mt-1">
                        ${(resumen.fiscal?.ganancia_neta_total || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                      </p>
                      <span className="text-[10px] text-emerald-600 font-medium">Utilidad real del día</span>
                    </div>
                  </div>

                  {/* Desglose Fiscal vs Operativo */}
                  <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-5 shadow-sm">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2 mb-3">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      Separación Contable y Fiscal (Machote de Administradora)
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-white/10 rounded-xl p-3.5 border border-white/10">
                        <span className="text-[11px] text-emerald-300 font-semibold block">
                          Ganancias en Cuentas Fiscales (CFDI / SAT)
                        </span>
                        <p className="text-xl font-black text-white mt-1">
                          ${(resumen.fiscal?.ganancia_fiscal || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-[11px] text-slate-300 mt-1">
                          Transferencias y cobros entrados a cuentas fiscales (ej. BBVA / BanBajío)
                        </p>
                      </div>

                      <div className="bg-white/10 rounded-xl p-3.5 border border-white/10">
                        <span className="text-[11px] text-sky-300 font-semibold block">
                          Ganancia Neta Después de Fiscal (Operativa)
                        </span>
                        <p className="text-xl font-black text-white mt-1">
                          ${(resumen.fiscal?.ganancia_despues_de_fiscal || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-[11px] text-slate-300 mt-1">
                          Flujo remanente de cuentas operativas y efectivo de mostrador
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Arqueo de Efectivo: Entrego vs Debe */}
                  <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                      <Banknote className="w-4 h-4 text-emerald-600" />
                      Control de Efectivo de Mostrador (Arqueo Ciego)
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <span className="text-slate-400 block">Saldo Teórico:</span>
                        <span className="font-bold text-slate-800 text-sm">
                          ${(resumen.efectivo?.saldo_teorico || 0).toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Efectivo Declarado:</span>
                        <span className="font-bold text-slate-800 text-sm">
                          ${(resumen.efectivo?.cierre_declarado ?? 0).toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Diferencia (Entrego vs Debe):</span>
                        <span
                          className={`font-black text-sm ${
                            (resumen.efectivo?.diferencia || 0) < -10
                              ? "text-red-600"
                              : (resumen.efectivo?.diferencia || 0) > 10
                              ? "text-blue-600"
                              : "text-emerald-600"
                          }`}
                        >
                          ${(resumen.efectivo?.diferencia || 0).toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Remesa Retirada:</span>
                        <span className="font-bold text-slate-800 text-sm">
                          ${(resumen.efectivo?.remesa_retirada || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {resumen.efectivo?.justificacion_descuadre && (
                      <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                        <span className="font-bold">Justificación de Descuadre: </span>
                        {resumen.efectivo.justificacion_descuadre}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* PESTAÑA 2: BANCOS SPEI */}
              {activeTab === "bancos" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800">
                      Conciliación Espejo de Cuentas SPEI (Cotejo 1:1 contra Banco)
                    </h4>
                    <span className="text-xs text-slate-500">
                      Total Cuentas: {resumen.bancos?.length || 0}
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                    {resumen.bancos?.map((b) => (
                      <div key={b.cuenta_id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs ${
                            b.es_fiscal ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"
                          }`}>
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-800 text-xs">{b.alias}</span>
                              {b.es_fiscal ? (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  FISCAL
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-600">
                                  OPERATIVA
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400">Banco: {b.banco}</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="font-extrabold text-slate-900 text-sm">
                            ${(b.total || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                          </p>
                          <span className="text-[11px] text-slate-400">
                            {b.conteo} {b.conteo === 1 ? "transferencia" : "transferencias"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* PESTAÑA 3: TARJETAS Y MSI */}
              {activeTab === "tarjetas" && (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-blue-900">
                        Resumen de Terminales BanBajío y Mercado Pago
                      </span>
                      <p className="text-[11px] text-blue-700 mt-0.5">
                        El cliente pagó precio de lista. Las comisiones fueron absorbidas por el taller.
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-blue-600 uppercase font-bold block">Neto a Recibir</span>
                      <span className="text-base font-black text-blue-950">
                        ${(resumen.tarjetas?.total_neto || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                        <tr>
                          <th className="px-4 py-2.5">Método / Terminal</th>
                          <th className="px-4 py-2.5">Esquema</th>
                          <th className="px-4 py-2.5 text-right">Monto Bruto ($)</th>
                          <th className="px-4 py-2.5 text-right">Comisión Retenida ($)</th>
                          <th className="px-4 py-2.5 text-right">Neto Taller ($)</th>
                          <th className="px-4 py-2.5 text-center">Conteo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {resumen.tarjetas?.desglose?.map((t, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-semibold text-slate-800">{t.metodo}</td>
                            <td className="px-4 py-3">
                              {t.plazo_msi ? (
                                <span className="px-2 py-0.5 bg-purple-50 text-purple-700 font-bold rounded-full text-[10px] border border-purple-200">
                                  {t.plazo_msi} MSI
                                </span>
                              ) : (
                                <span className="text-slate-500">1 Exhibición</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-slate-900">
                              ${(t.bruto || 0).toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-amber-600">
                              -${(t.comision || 0).toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-emerald-600">
                              ${(t.neto || 0).toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-center text-slate-500">{t.conteo}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* PESTAÑA 4: PROVEEDORES Y EVIDENCIAS */}
              {activeTab === "proveedores" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                      <span className="text-[11px] font-semibold text-slate-500">Pagado de Caja Chica</span>
                      <p className="text-base font-bold text-slate-900 mt-1">
                        ${(resumen.proveedores?.total_pagado_caja_chica || 0).toFixed(2)}
                      </p>
                      <span className="text-[10px] text-slate-400">Restado de efectivo de mostrador</span>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                      <span className="text-[11px] font-semibold text-amber-800">Comprado a Crédito Hoy</span>
                      <p className="text-base font-bold text-amber-950 mt-1">
                        ${(resumen.proveedores?.total_credito_nuevo || 0).toFixed(2)}
                      </p>
                      <span className="text-[10px] text-amber-700">Pasivos generados en el día</span>
                    </div>

                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                      <span className="text-[11px] font-semibold text-emerald-800">Abonos a Deudas Emitidos</span>
                      <p className="text-base font-bold text-emerald-950 mt-1">
                        ${(resumen.proveedores?.total_abonos_credito || 0).toFixed(2)}
                      </p>
                      <span className="text-[10px] text-emerald-700">Liquidaciones a crédito</span>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                      <h5 className="font-bold text-xs text-slate-800">
                        Compras de Refacciones y Garantías del Turno ({resumen.proveedores?.compras?.length || 0})
                      </h5>
                    </div>

                    {resumen.proveedores?.compras?.length === 0 ? (
                      <div className="p-6 text-center text-slate-400 text-xs">
                        Sin compras a proveedores registradas en este turno.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {resumen.proveedores?.compras?.map((c) => (
                          <div key={c.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50 text-xs">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900">{c.proveedor}</span>
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-mono">
                                  Folio: {c.folio}
                                </span>
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  {c.estatus_garantia}
                                </span>
                              </div>
                              <p className="text-slate-600 text-[11px] mt-0.5">{c.descripcion}</p>
                              <span className="text-[10px] text-slate-400">
                                Fuente: {c.fuente_pago} | Estatus: {c.estatus_pago}
                              </span>
                            </div>

                            <div className="flex items-center gap-3">
                              <span className="font-bold text-slate-900">
                                ${(c.costo || 0).toFixed(2)}
                              </span>
                              {c.evidencia_url && (
                                <a
                                  href={c.evidencia_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  Ver Ticket
                                  <ExternalLink className="w-3 h-3 text-slate-400" />
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* PESTAÑA 5: REGISTRO DEL DÍA (KPIS) */}
              {activeTab === "kpis" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">
                        Registro del Día: Volumen Operativo de Patio (Machote de Cova)
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Conteo automático de unidades y servicios completados durante la jornada
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {resumen.registro_del_dia?.map((k, i) => (
                      <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
                        <span className="text-xs font-bold text-slate-700 uppercase block">
                          {k.categoria}
                        </span>
                        <p className="text-2xl font-black text-primary mt-1">
                          {k.cantidad}
                        </p>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">
                          {k.unidad}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer con Acción de Auditoría */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Apertura: {resumen?.fecha_apertura ? new Date(resumen.fecha_apertura).toLocaleString("es-MX") : "-"}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
            >
              Cerrar
            </button>

            {resumen?.estado !== "AUDITADO" && (
              <button
                disabled={auditing || auditSuccess}
                onClick={handleAuditarTurno}
                className="px-5 py-2 text-xs font-bold text-white bg-primary hover:bg-primary/90 rounded-lg shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {auditing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Auditando...
                  </>
                ) : auditSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                    ¡Turno Auditado con Éxito!
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    Aprobar y Marcar como Auditado
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
