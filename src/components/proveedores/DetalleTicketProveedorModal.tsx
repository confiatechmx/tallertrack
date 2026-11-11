"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  FileText,
  DollarSign,
  Building2,
  Calendar,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Download,
  Upload,
  Camera,
  Car,
  User,
  Package,
  Receipt,
  MessageCircle,
  Phone,
  RefreshCw,
  Loader2,
  FileSpreadsheet,
} from "lucide-react";
import {
  ProveedorService,
  DetalleTicketCompra,
  CompraConProveedor,
} from "@/services/proveedorService";

interface DetalleTicketProveedorModalProps {
  isOpen: boolean;
  onClose: () => void;
  compraId: string | null;
  compraInicial?: CompraConProveedor | null;
  empresaId: string;
  onAbonarClick?: (compra: DetalleTicketCompra) => void;
  onTicketActualizado?: () => void;
}

export function DetalleTicketProveedorModal({
  isOpen,
  onClose,
  compraId,
  compraInicial,
  empresaId,
  onAbonarClick,
  onTicketActualizado,
}: DetalleTicketProveedorModalProps) {
  const [detalle, setDetalle] = useState<DetalleTicketCompra | null>(
    (compraInicial as DetalleTicketCompra) || null
  );
  const [cargando, setCargando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Estados para actualizar garantía
  const [estatusGarantia, setEstatusGarantia] = useState<string>("VIGENTE");
  const [notasGarantia, setNotasGarantia] = useState<string>("");
  const [guardandoGarantia, setGuardandoGarantia] = useState(false);
  const [garantiaActualizadaMsg, setGarantiaActualizadaMsg] = useState<string | null>(null);

  // Estados para subir / cambiar evidencia
  const [subiendoEvidencia, setSubiendoEvidencia] = useState(false);
  const [subidaExitosa, setSubidaExitosa] = useState(false);

  useEffect(() => {
    if (isOpen && compraId) {
      cargarDetalleTicket(compraId);
    } else if (!isOpen) {
      setErrorMsg(null);
      setGarantiaActualizadaMsg(null);
      setSubidaExitosa(false);
    }
  }, [isOpen, compraId]);

  // Sincronizar datos si cambia compraInicial
  useEffect(() => {
    if (compraInicial && (!detalle || detalle.id !== compraInicial.id)) {
      setDetalle(compraInicial as DetalleTicketCompra);
      setEstatusGarantia(compraInicial.estatus_garantia || "VIGENTE");
      setNotasGarantia(compraInicial.notas_garantia || "");
    }
  }, [compraInicial]);

  const cargarDetalleTicket = async (id: string) => {
    setCargando(true);
    setErrorMsg(null);
    try {
      const res = await ProveedorService.obtenerDetalleCompra(id);
      if (res.error) throw new Error(res.error);
      if (res.data) {
        setDetalle(res.data);
        setEstatusGarantia(res.data.estatus_garantia || "VIGENTE");
        setNotasGarantia(res.data.notas_garantia || "");
      }
    } catch (err: any) {
      console.error("Error al cargar detalle del ticket:", err);
      setErrorMsg(err.message || "No se pudo obtener el detalle del ticket");
    } finally {
      setCargando(false);
    }
  };

  const handleActualizarGarantia = async () => {
    if (!detalle) return;
    setGuardandoGarantia(true);
    setGarantiaActualizadaMsg(null);
    try {
      const res = await ProveedorService.actualizarEstatusGarantia(
        detalle.id,
        estatusGarantia as any,
        notasGarantia
      );
      if (res.error) throw new Error(res.error);
      setGarantiaActualizadaMsg("Garantía actualizada correctamente");
      setDetalle({
        ...detalle,
        estatus_garantia: estatusGarantia,
        notas_garantia: notasGarantia,
      });
      if (onTicketActualizado) onTicketActualizado();
    } catch (err: any) {
      setErrorMsg(err.message || "Error al actualizar garantía");
    } finally {
      setGuardandoGarantia(false);
    }
  };

  const handleSubirEvidencia = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !detalle) return;

    setSubiendoEvidencia(true);
    setErrorMsg(null);
    try {
      const res = await ProveedorService.adjuntarEvidenciaCompra(
        detalle.id,
        file,
        empresaId,
        detalle.proveedor_id
      );
      if (res.error) throw new Error(res.error);
      if (res.publicUrl) {
        setDetalle({
          ...detalle,
          evidencia_url: res.publicUrl,
          evidencia_tipo: file.type.includes("pdf") ? "PDF" : "FOTO",
        });
        setSubidaExitosa(true);
        if (onTicketActualizado) onTicketActualizado();
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Error al subir comprobante");
    } finally {
      setSubiendoEvidencia(false);
    }
  };

  if (!isOpen || (!detalle && !cargando)) return null;

  const isPdf = detalle?.evidencia_url?.toLowerCase().includes(".pdf");
  const tieneDeuda = (detalle?.monto_saldo_pendiente || 0) > 0;
  const esVencida =
    tieneDeuda &&
    detalle?.fecha_limite_pago &&
    new Date(detalle.fecha_limite_pago) < new Date(new Date().toDateString());

  // Formato WhatsApp
  const telLimpio = detalle?.proveedor?.whatsapp || detalle?.proveedor?.telefono || "";
  const numWhatsapp = telLimpio.replace(/[^0-9]/g, "");
  const waUrl = numWhatsapp
    ? `https://wa.me/${numWhatsapp.startsWith("52") ? numWhatsapp : `52${numWhatsapp}`}?text=${encodeURIComponent(
        `Hola, te contacto de Taller Cova referente al ticket/nota #${detalle?.folio_ticket_nota || ""}`
      )}`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-5xl max-h-[92vh] rounded-2xl shadow-2xl border border-slate-700/50 flex flex-col overflow-hidden">
        {/* ========================================================================= */}
        {/* HEADER DEL MODAL */}
        {/* ========================================================================= */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3 min-w-0">
            <span className="p-2 bg-sky-500/20 text-sky-400 rounded-xl">
              <Receipt className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Detalle del Ticket / Factura:
                </h2>
                <span className="font-mono font-black text-sky-400 bg-sky-950/60 px-2.5 py-0.5 rounded-lg border border-sky-800 text-sm">
                  #{detalle?.folio_ticket_nota || "S/F"}
                </span>

                {/* Badge de Estatus de Pago */}
                <span
                  className={`px-2.5 py-0.5 rounded-full font-bold text-xs uppercase flex items-center gap-1 ${
                    detalle?.estatus_pago === "PAGADO"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      : detalle?.estatus_pago === "PARCIAL"
                      ? "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                      : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  }`}
                >
                  {detalle?.estatus_pago === "PAGADO" ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <Clock className="w-3.5 h-3.5" />
                  )}
                  {detalle?.estatus_pago}
                </span>

                {/* Badge de Garantía */}
                <span
                  className={`px-2.5 py-0.5 rounded-full font-bold text-xs uppercase flex items-center gap-1 ${
                    detalle?.estatus_garantia === "VIGENTE"
                      ? "bg-emerald-950/80 text-emerald-300 border border-emerald-700/60"
                      : detalle?.estatus_garantia === "EN_RECLAMACION"
                      ? "bg-amber-950/80 text-amber-300 border border-amber-700/60"
                      : "bg-slate-800 text-slate-300 border border-slate-700"
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  {detalle?.estatus_garantia || "VIGENTE"}
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate mt-0.5">
                {detalle?.proveedor?.nombre_comercial || "Proveedor Mayorista"}
                {detalle?.descripcion ? ` • ${detalle.descripcion}` : ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {cargando && <Loader2 className="w-4 h-4 text-sky-400 animate-spin mr-2" />}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Cerrar detalle (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* BODY CON SCROLL Y 2 COLUMNAS */}
        {/* ========================================================================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Banner Proveedor & Vencimiento */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-slate-100 text-slate-800 rounded-xl font-bold">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    {detalle?.proveedor?.nombre_comercial || "Proveedor"}
                  </h3>
                  {detalle?.proveedor?.categoria && (
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-bold">
                      {detalle.proveedor.categoria}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-0.5">
                  {detalle?.proveedor?.rfc && (
                    <span>
                      RFC: <strong className="text-slate-700">{detalle.proveedor.rfc}</strong>
                    </span>
                  )}
                  {detalle?.proveedor?.dias_credito !== undefined && detalle.proveedor.dias_credito !== null && (
                    <span>
                      Crédito:{" "}
                      <strong className="text-slate-700">
                        {Number(detalle.proveedor.dias_credito) > 0
                          ? `${detalle.proveedor.dias_credito} días`
                          : "Contado"}
                      </strong>
                    </span>
                  )}
                  {detalle?.proveedor?.contacto_nombre && (
                    <span>
                      Asesor: <strong className="text-slate-700">{detalle.proveedor.contacto_nombre}</strong>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Acciones de contacto */}
            <div className="flex items-center gap-2 self-end sm:self-auto">
              {waUrl && (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Contactar al proveedor por WhatsApp"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                  WhatsApp
                </a>
              )}
              {detalle?.proveedor?.telefono && (
                <a
                  href={`tel:${detalle.proveedor.telefono}`}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Phone className="w-3.5 h-3.5 text-slate-600" />
                  Llamar
                </a>
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* GRID DE CARDS FINANCIERAS (DIRTY HANDS UX) */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Costo Total Ticket
              </span>
              <p className="text-xl font-black text-slate-900 mt-1">
                ${Number(detalle?.monto_costo || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
              </p>
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Comprado el {detalle?.fecha_compra || "N/A"}
              </span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Monto Pagado
              </span>
              <p className="text-xl font-black text-emerald-700 mt-1">
                ${Number(detalle?.monto_pagado || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
              </p>
              <span className="text-[10px] text-emerald-600 mt-0.5 block font-medium">
                {detalle?.estatus_pago === "PAGADO" ? "100% Cubierto" : "Abonos aplicados"}
              </span>
            </div>

            <div
              className={`p-3.5 rounded-xl border shadow-sm ${
                tieneDeuda
                  ? esVencida
                    ? "bg-rose-50/70 border-rose-200"
                    : "bg-amber-50/70 border-amber-200"
                  : "bg-white border-slate-200"
              }`}
            >
              <span
                className={`text-[11px] font-bold uppercase tracking-wider block ${
                  tieneDeuda
                    ? esVencida
                      ? "text-rose-800"
                      : "text-amber-800"
                    : "text-slate-500"
                }`}
              >
                Saldo Pendiente
              </span>
              <p
                className={`text-xl font-black mt-1 ${
                  tieneDeuda
                    ? esVencida
                      ? "text-rose-700"
                      : "text-amber-700"
                    : "text-emerald-700"
                }`}
              >
                ${Number(detalle?.monto_saldo_pendiente || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
              </p>
              <span
                className={`text-[10px] mt-0.5 block font-bold ${
                  esVencida
                    ? "text-rose-700"
                    : tieneDeuda
                    ? "text-amber-700"
                    : "text-emerald-600"
                }`}
              >
                {esVencida
                  ? `Venció: ${detalle?.fecha_limite_pago}`
                  : tieneDeuda
                  ? `Vence: ${detalle?.fecha_limite_pago || "Sin fecha fija"}`
                  : "Liquidado sin adeudo"}
              </span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Fuente de Pago
                </span>
                <p className="text-sm font-bold text-slate-800 mt-1">
                  {detalle?.fuente_pago ? detalle.fuente_pago.replace(/_/g, " ") : "N/A"}
                </p>
              </div>

              {tieneDeuda && onAbonarClick && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onAbonarClick(detalle!);
                  }}
                  className="mt-2 w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <DollarSign className="w-4 h-4" />
                  Abonar a este Ticket
                </button>
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* LAYOUT PRINCIPAL: DETALLES IZQUIERDA + EVIDENCIA DERECHA */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* COLUMNA IZQUIERDA (7 cols en lg): Partidas, Orden de Servicio, Garantía, Abonos */}
            <div className="lg:col-span-7 space-y-4">
              {/* 1. Orden de Servicio Vinculada */}
              {detalle?.orden ? (
                <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-2.5">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                      <Car className="w-4 h-4 text-sky-600" />
                      Orden de Trabajo Vinculada
                    </span>
                    <span className="font-mono font-black text-xs text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                      OT #{detalle.orden.folio}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                        Vehículo
                      </span>
                      <p className="font-bold text-slate-800 mt-0.5">
                        {detalle.orden.vehiculo
                          ? `${detalle.orden.vehiculo.marca} ${detalle.orden.vehiculo.modelo} ${
                              detalle.orden.vehiculo.anio || ""
                            }`
                          : "Vehículo en taller"}
                      </p>
                      {detalle.orden.vehiculo?.placas && (
                        <span className="text-slate-500 font-mono text-[11px]">
                          Placas: {detalle.orden.vehiculo.placas}
                        </span>
                      )}
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                        Cliente
                      </span>
                      <p className="font-bold text-slate-800 mt-0.5">
                        {detalle.orden.vehiculo?.cliente?.nombre || "Cliente en mostrador"}
                      </p>
                      {detalle.orden.vehiculo?.cliente?.telefono && (
                        <span className="text-slate-500 text-[11px]">
                          Tel: {detalle.orden.vehiculo.cliente.telefono}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-100/80 rounded-xl p-3 border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
                  <Package className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>
                    <strong>Compra general de almacén / mostrador:</strong> Este ticket no está
                    vinculado a una orden de servicio específica.
                  </span>
                </div>
              )}

              {/* 2. Partidas / Refacciones Adquiridas */}
              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-2.5">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                    <Package className="w-4 h-4 text-emerald-600" />
                    Partidas / Refacciones del Ticket ({detalle?.refacciones?.length || 0})
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {detalle?.refacciones && detalle.refacciones.length > 0
                      ? `${detalle.refacciones.length} concepto(s)`
                      : "Partida única"}
                  </span>
                </div>

                {detalle?.refacciones && detalle.refacciones.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-600">
                      <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-[10px] border-b border-slate-200">
                        <tr>
                          <th className="py-2 px-2.5">Refacción / Pieza</th>
                          <th className="py-2 px-2.5 text-center">Cant.</th>
                          <th className="py-2 px-2.5 text-right">Costo Unit.</th>
                          <th className="py-2 px-2.5 text-right">Subtotal</th>
                          <th className="py-2 px-2.5">Garantía</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {detalle.refacciones.map((ref) => (
                          <tr key={ref.id} className="hover:bg-slate-50/70">
                            <td className="py-2 px-2.5">
                              <p className="font-bold text-slate-900">{ref.nombre}</p>
                              {ref.numero_parte && (
                                <span className="font-mono text-[10px] text-slate-500">
                                  P/N: {ref.numero_parte}
                                </span>
                              )}
                              {ref.paquete_operacion && (
                                <span className="ml-2 text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                                  {ref.paquete_operacion}
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-2.5 text-center font-bold text-slate-800">
                              {ref.cantidad}
                            </td>
                            <td className="py-2 px-2.5 text-right font-mono text-slate-700">
                              ${Number(ref.costo_unitario || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2 px-2.5 text-right font-mono font-bold text-slate-900">
                              ${Number(ref.subtotal || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2 px-2.5 text-[11px] text-slate-500">
                              {ref.garantia_especifica || `${detalle.meses_garantia || 1} meses`}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-700">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">
                      Concepto / Descripción del Ticket
                    </span>
                    <p className="font-semibold text-slate-900">{detalle?.descripcion}</p>
                    <p className="text-[10px] text-slate-500 mt-1 italic">
                      Este ticket fue registrado como partida global de mostrador.
                    </p>
                  </div>
                )}
              </div>

              {/* 3. Póliza y Gestión de Garantía del Proveedor */}
              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Póliza de Garantía del Proveedor
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {detalle?.meses_garantia || 1} meses de cobertura
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                      Estatus de Garantía
                    </label>
                    <select
                      value={estatusGarantia}
                      onChange={(e) => setEstatusGarantia(e.target.value)}
                      className="w-full h-9 px-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:ring-1 focus:ring-primary"
                    >
                      <option value="VIGENTE">🛡️ VIGENTE (En periodo de cobertura)</option>
                      <option value="EN_RECLAMACION">⚠️ EN RECLAMACIÓN (Pieza defectuosa en revisión)</option>
                      <option value="APLICADA">✅ APLICADA (Reemplazo o nota de crédito otorgada)</option>
                      <option value="EXPIRADA">⏳ EXPIRADA (Plazo de garantía concluido)</option>
                      <option value="RECHAZADA">❌ RECHAZADA (Proveedor no procedió)</option>
                    </select>
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold text-slate-600 block mb-1">
                      Fecha Vencimiento Garantía
                    </span>
                    <div className="h-9 px-3 bg-slate-100 rounded-lg border border-slate-200 flex items-center gap-2 font-mono text-xs text-slate-800">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      {detalle?.fecha_vencimiento_garantia || "Sin fecha calculada"}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Notas / Bitácora de Garantía y Reclamaciones
                  </label>
                  <textarea
                    rows={2}
                    placeholder="ej. Se entregó amortiguador con fuga al asesor de Ayon el 12 de Nov. Folio de garantía #G-882..."
                    value={notasGarantia}
                    onChange={(e) => setNotasGarantia(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  {garantiaActualizadaMsg ? (
                    <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {garantiaActualizadaMsg}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400">
                      Guarda cambios si el proveedor aceptó un reemplazo o nota de crédito.
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleActualizarGarantia}
                    disabled={guardandoGarantia}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    {guardandoGarantia && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Guardar Garantía
                  </button>
                </div>
              </div>

              {/* 4. Historial de Abonos Aplicados a este Ticket */}
              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    Historial de Abonos Aplicados a este Ticket ({detalle?.abonos?.length || 0})
                  </span>
                  {tieneDeuda && onAbonarClick && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onAbonarClick(detalle!);
                      }}
                      className="text-xs text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      + Nuevo Abono
                    </button>
                  )}
                </div>

                {detalle?.abonos && detalle.abonos.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-600">
                      <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-[10px] border-b border-slate-200">
                        <tr>
                          <th className="py-2 px-2.5">Fecha</th>
                          <th className="py-2 px-2.5 text-right">Monto</th>
                          <th className="py-2 px-2.5">Método</th>
                          <th className="py-2 px-2.5 font-mono">Referencia</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {detalle.abonos.map((abono) => (
                          <tr key={abono.id} className="hover:bg-slate-50/70">
                            <td className="py-2 px-2.5 whitespace-nowrap text-slate-700">
                              {new Date(abono.fecha_abono).toLocaleDateString("es-MX", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </td>
                            <td className="py-2 px-2.5 text-right font-black text-emerald-700">
                              ${Number(abono.monto).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2 px-2.5 text-slate-600">
                              {abono.metodo_pago.replace(/_/g, " ")}
                            </td>
                            <td className="py-2 px-2.5 font-mono text-[11px] text-slate-500">
                              {abono.referencia || "S/R"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic py-2">
                    No se han registrado abonos específicos a este ticket aún.
                  </p>
                )}
              </div>
            </div>

            {/* COLUMNA DERECHA (5 cols en lg): Evidencia / Foto del Ticket / Factura */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col h-full min-h-[380px]">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-sky-600" />
                    Comprobante / Ticket Digital
                  </span>

                  {detalle?.evidencia_url && (
                    <div className="flex items-center gap-1.5">
                      <a
                        href={detalle.evidencia_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors"
                        title="Abrir en pestaña nueva"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <a
                        href={detalle.evidencia_url}
                        download={`Ticket_${detalle.folio_ticket_nota || "nota"}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors"
                        title="Descargar archivo"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Visor de Evidencia */}
                <div className="flex-1 bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center min-h-[280px] relative p-2">
                  {detalle?.evidencia_url ? (
                    isPdf ? (
                      <iframe
                        src={detalle.evidencia_url}
                        title={`Ticket ${detalle.folio_ticket_nota}`}
                        className="w-full h-full min-h-[350px] rounded border border-slate-800 bg-white"
                      />
                    ) : (
                      <img
                        src={detalle.evidencia_url}
                        alt={`Ticket ${detalle.folio_ticket_nota}`}
                        className="max-h-[420px] max-w-full object-contain rounded shadow"
                      />
                    )
                  ) : (
                    <div className="text-center p-6 text-slate-400">
                      <Receipt className="w-12 h-12 text-slate-600 mx-auto mb-2 opacity-50" />
                      <p className="font-bold text-slate-300 text-xs">Sin ticket adjunto</p>
                      <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
                        Aún no se ha adjuntado foto ni PDF de este ticket o nota de compra.
                      </p>
                    </div>
                  )}
                </div>

                {/* Subir o reemplazar archivo */}
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <label className="w-full h-11 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer border border-slate-300/80">
                    {subiendoEvidencia ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        <span>Subiendo comprobante...</span>
                      </>
                    ) : (
                      <>
                        <Camera className="w-4 h-4 text-slate-600" />
                        <span>
                          {detalle?.evidencia_url
                            ? "Reemplazar Foto / PDF del Ticket"
                            : "Subir Foto o PDF del Ticket"}
                        </span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      disabled={subiendoEvidencia}
                      onChange={handleSubirEvidencia}
                      className="hidden"
                    />
                  </label>
                  {subidaExitosa && (
                    <p className="text-[11px] text-emerald-700 font-bold text-center mt-1.5 flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Comprobante archivado exitosamente
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* FOOTER DEL MODAL */}
        {/* ========================================================================= */}
        <div className="px-5 py-3 bg-white border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            ID de Registro: <strong className="font-mono text-slate-700">{detalle?.id}</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold cursor-pointer transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
