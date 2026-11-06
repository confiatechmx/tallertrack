"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Upload,
  Camera,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  ShieldCheck,
  Building2,
  Hash,
  DollarSign,
  Image as ImageIcon,
  CheckSquare,
  Square,
  Wand2,
  Receipt,
  Link as LinkIcon,
  Package,
} from "lucide-react";
import { ProveedorService, Proveedor, CompraProveedorInsert } from "@/services/proveedorService";

export interface RefaccionItemParaTicket {
  id: string;
  nombre: string;
  cantidad?: number;
  costo_unitario?: number;
  numero_parte?: string;
  compra_proveedor_id?: string | null;
  folio_ticket_nota?: string | null;
  proveedor?: string | null;
}

interface ProveedorEvidenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  empresaId: string;
  sucursalId?: string;
  cajaTurnoId?: string;
  ordenServicioId?: string;
  cotizacionId?: string;
  defaultDescripcion?: string;
  defaultMonto?: number;
  refaccionesDisponibles?: RefaccionItemParaTicket[];
  preselectedRefaccionId?: string;
  onCompraRegistrada?: (compra: any, refaccionIdsSeleccionadas?: string[]) => void;
}

export function ProveedorEvidenceModal({
  isOpen,
  onClose,
  empresaId,
  sucursalId,
  cajaTurnoId,
  ordenServicioId,
  cotizacionId,
  defaultDescripcion = "",
  defaultMonto = 0,
  refaccionesDisponibles = [],
  preselectedRefaccionId,
  onCompraRegistrada,
}: ProveedorEvidenceModalProps) {
  const [activeTab, setActiveTab] = useState<"NUEVO" | "EXISTENTE">("NUEVO");
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loadingProveedores, setLoadingProveedores] = useState(false);
  const [comprasOrden, setComprasOrden] = useState<any[]>([]);
  const [loadingComprasOrden, setLoadingComprasOrden] = useState(false);
  const [selectedTicketExistenteId, setSelectedTicketExistenteId] = useState<string>("");

  // Form states para nuevo ticket
  const [proveedorId, setProveedorId] = useState<string>("");
  const [folioTicket, setFolioTicket] = useState<string>("");
  const [descripcion, setDescripcion] = useState<string>(defaultDescripcion);
  const [montoCosto, setMontoCosto] = useState<number>(defaultMonto);
  const [fuentePago, setFuentePago] = useState<"CAJA_CHICA" | "FONDO_RESERVA" | "TRANSFERENCIA" | "CREDITO_PENDIENTE">("CAJA_CHICA");
  const [mesesGarantia, setMesesGarantia] = useState<number>(1);
  const [notasGarantia, setNotasGarantia] = useState<string>("");

  // Refacciones seleccionadas para vincular a este ticket
  const [selectedRefaccionIds, setSelectedRefaccionIds] = useState<string[]>([]);

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && empresaId) {
      cargarProveedores();
      if (ordenServicioId) {
        cargarComprasOrden();
      }
      if (defaultDescripcion) setDescripcion(defaultDescripcion);
      if (defaultMonto) setMontoCosto(defaultMonto);

      // Preseleccionar refacciones
      if (preselectedRefaccionId) {
        setSelectedRefaccionIds([preselectedRefaccionId]);
      } else if (refaccionesDisponibles.length > 0) {
        // Por defecto, preseleccionar las que no tienen ticket aún
        const sinTicket = refaccionesDisponibles
          .filter((r) => !r.compra_proveedor_id)
          .map((r) => r.id);
        setSelectedRefaccionIds(sinTicket.length > 0 ? sinTicket : refaccionesDisponibles.map((r) => r.id));
      }
    }
  }, [isOpen, empresaId, ordenServicioId, defaultDescripcion, defaultMonto, preselectedRefaccionId, refaccionesDisponibles]);

  const cargarProveedores = async () => {
    setLoadingProveedores(true);
    const { data } = await ProveedorService.obtenerProveedores(empresaId);
    setProveedores(data);
    if (data.length > 0 && !proveedorId) {
      setProveedorId(data[0].id);
      setMesesGarantia(data[0].meses_garantia_default || 1);
      if (data[0].dias_credito > 0) {
        setFuentePago("CREDITO_PENDIENTE");
      }
    }
    setLoadingProveedores(false);
  };

  const cargarComprasOrden = async () => {
    if (!ordenServicioId) return;
    setLoadingComprasOrden(true);
    const { data } = await ProveedorService.obtenerComprasPorOrden(ordenServicioId);
    setComprasOrden(data);
    if (data.length > 0) {
      setSelectedTicketExistenteId(data[0].id);
    }
    setLoadingComprasOrden(false);
  };

  const handleProveedorChange = (id: string) => {
    setProveedorId(id);
    const prov = proveedores.find((p) => p.id === id);
    if (prov) {
      setMesesGarantia(prov.meses_garantia_default || 1);
      if (prov.dias_credito > 0) {
        setFuentePago("CREDITO_PENDIENTE");
      } else {
        setFuentePago("CAJA_CHICA");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  // Alternar selección de una refacción
  const toggleRefaccion = (id: string) => {
    setSelectedRefaccionIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Seleccionar todas o ninguna
  const toggleSelectAll = () => {
    if (selectedRefaccionIds.length === refaccionesDisponibles.length) {
      setSelectedRefaccionIds([]);
    } else {
      setSelectedRefaccionIds(refaccionesDisponibles.map((r) => r.id));
    }
  };

  // Sumar costos de las refacciones seleccionadas
  const autoSumarCostosSeleccionados = () => {
    const total = refaccionesDisponibles
      .filter((r) => selectedRefaccionIds.includes(r.id))
      .reduce((acc, r) => acc + Number(r.costo_unitario || 0) * Number(r.cantidad || 1), 0);
    if (total > 0) {
      setMontoCosto(Number(total.toFixed(2)));
    }
  };

  // Submit: Crear nuevo ticket y vincular
  const handleSubmitNuevoTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proveedorId) {
      setErrorMsg("Selecciona un proveedor válido.");
      return;
    }
    if (!folioTicket.trim()) {
      setErrorMsg("El folio o número de ticket/nota es obligatorio para la trazabilidad de garantías.");
      return;
    }
    if (montoCosto <= 0) {
      setErrorMsg("Ingresa un monto de costo válido mayor a cero.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      let evidenciaUrl: string | null = null;
      let storagePath: string | null = null;
      let evidenciaTipo: "IMAGE" | "PDF" | "OTHER" | null = null;

      if (selectedFile) {
        const uploadRes = await ProveedorService.subirEvidenciaCompra(
          selectedFile,
          empresaId,
          proveedorId
        );
        evidenciaUrl = uploadRes.publicUrl;
        storagePath = uploadRes.storagePath;
        evidenciaTipo = selectedFile.type.includes("pdf") ? "PDF" : "IMAGE";
      }

      const prov = proveedores.find((p) => p.id === proveedorId);
      const diasCredito = prov?.dias_credito || 0;
      const today = new Date();
      const fechaLimitePago = new Date(today);
      fechaLimitePago.setDate(today.getDate() + diasCredito);

      const fechaVencGarantia = new Date(today);
      fechaVencGarantia.setMonth(today.getMonth() + mesesGarantia);

      const compraData: CompraProveedorInsert = {
        empresa_id: empresaId,
        sucursal_id: sucursalId || null,
        proveedor_id: proveedorId,
        caja_turno_id: cajaTurnoId || null,
        orden_servicio_id: ordenServicioId || null,
        cotizacion_id: cotizacionId || null,
        folio_ticket_nota: folioTicket.trim(),
        descripcion: descripcion.trim() || `Ticket #${folioTicket.trim()} (${selectedRefaccionIds.length} refacciones)`,
        monto_costo: Number(montoCosto.toFixed(2)),
        fuente_pago: fuentePago,
        estatus_pago: fuentePago === "CREDITO_PENDIENTE" ? "PENDIENTE" : "PAGADO",
        monto_pagado: fuentePago === "CREDITO_PENDIENTE" ? 0.0 : Number(montoCosto.toFixed(2)),
        monto_saldo_pendiente: fuentePago === "CREDITO_PENDIENTE" ? Number(montoCosto.toFixed(2)) : 0.0,
        fecha_compra: today.toISOString().split("T")[0],
        fecha_limite_pago: fechaLimitePago.toISOString().split("T")[0],
        evidencia_url: evidenciaUrl,
        evidencia_storage_path: storagePath,
        evidencia_tipo: evidenciaTipo,
        meses_garantia: mesesGarantia,
        fecha_vencimiento_garantia: fechaVencGarantia.toISOString().split("T")[0],
        estatus_garantia: "VIGENTE",
        notas_garantia: notasGarantia.trim() || null,
      };

      const res = await ProveedorService.registrarCompraProveedor(compraData);
      if (res.error || !res.data) throw new Error(res.error || "Error al crear compra");

      // Vincular todas las refacciones seleccionadas
      if (selectedRefaccionIds.length > 0) {
        await ProveedorService.vincularRefaccionesATicket(res.data, selectedRefaccionIds);
      }

      if (onCompraRegistrada) {
        onCompraRegistrada(res.data, selectedRefaccionIds);
      }

      onClose();
    } catch (err: any) {
      console.error("Error al registrar evidencia:", err);
      setErrorMsg(err.message || "No se pudo registrar la compra y evidencia.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit: Vincular a ticket existente en la orden
  const handleVincularExistente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicketExistenteId) {
      setErrorMsg("Selecciona un ticket de compra existente.");
      return;
    }
    if (selectedRefaccionIds.length === 0) {
      setErrorMsg("Selecciona al menos una refacción para vincular a este ticket.");
      return;
    }

    const compra = comprasOrden.find((c) => c.id === selectedTicketExistenteId);
    if (!compra) {
      setErrorMsg("Ticket seleccionado no encontrado.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await ProveedorService.vincularRefaccionesATicket(compra, selectedRefaccionIds);

      if (onCompraRegistrada) {
        onCompraRegistrada(compra, selectedRefaccionIds);
      }

      onClose();
    } catch (err: any) {
      console.error("Error al vincular a ticket existente:", err);
      setErrorMsg(err.message || "No se pudo vincular al ticket seleccionado.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Superior */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Receipt className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">
                Comprobante de Compra y Garantía de Proveedor
              </h3>
              <p className="text-xs text-slate-500">
                1 Ticket ampara múltiples refacciones con su póliza de garantía
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pestañas de Modo (si la orden ya tiene tickets registrados) */}
        {ordenServicioId && comprasOrden.length > 0 && (
          <div className="flex border-b border-slate-200 bg-slate-100/70 p-1.5 gap-1.5 px-6">
            <button
              type="button"
              onClick={() => setActiveTab("NUEVO")}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "NUEVO"
                  ? "bg-white text-primary shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Registrar Nuevo Ticket</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("EXISTENTE")}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "EXISTENTE"
                  ? "bg-white text-primary shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <LinkIcon className="w-3.5 h-3.5" />
              <span>Vincular a Ticket de la Orden ({comprasOrden.length})</span>
            </button>
          </div>
        )}

        {/* Form Body: NUEVO TICKET */}
        {activeTab === "NUEVO" ? (
          <form onSubmit={handleSubmitNuevoTicket} className="p-6 overflow-y-auto space-y-4">
            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* SELECCIÓN DE REFACCIONES AMPARADAS (MULTIRREFACCIÓN) */}
            {refaccionesDisponibles.length > 0 && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold text-slate-800">
                      Refacciones amparadas por este ticket ({selectedRefaccionIds.length}/{refaccionesDisponibles.length})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                    >
                      {selectedRefaccionIds.length === refaccionesDisponibles.length ? "Deseleccionar todas" : "Marcar todas"}
                    </button>
                  </div>
                </div>

                <div className="max-h-40 overflow-y-auto space-y-1.5 divide-y divide-slate-200/60 pr-1">
                  {refaccionesDisponibles.map((r) => {
                    const isSelected = selectedRefaccionIds.includes(r.id);
                    const subtotal = Number(r.costo_unitario || 0) * Number(r.cantidad || 1);
                    return (
                      <div
                        key={r.id}
                        onClick={() => toggleRefaccion(r.id)}
                        className={`pt-1.5 first:pt-0 flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                          isSelected ? "bg-primary/5 border border-primary/20" : "hover:bg-slate-100/70"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-primary shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400 shrink-0" />
                          )}
                          <div className="truncate">
                            <span className="text-xs font-semibold text-slate-800 block truncate">
                              {r.nombre}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Cant: {r.cantidad || 1} {r.numero_parte ? `• P/N: ${r.numero_parte}` : ""}
                              {r.folio_ticket_nota ? ` • Ticket previo #${r.folio_ticket_nota}` : ""}
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0 ml-2">
                          <span className="text-xs font-bold font-mono text-slate-900">
                            ${subtotal.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {selectedRefaccionIds.length > 0 && (
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={autoSumarCostosSeleccionados}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded cursor-pointer transition-colors"
                      title="Suma automáticamente el costo de las piezas marcadas al total del ticket"
                    >
                      <Wand2 className="w-3 h-3 text-emerald-600" />
                      Auto-sumar costos al ticket ($)
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Proveedor y Folio */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Proveedor *
                </label>
                <select
                  required
                  value={proveedorId}
                  onChange={(e) => handleProveedorChange(e.target.value)}
                  className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-medium"
                >
                  {loadingProveedores ? (
                    <option>Cargando catálogo...</option>
                  ) : (
                    <>
                      <optgroup label="Proveedores de Llantas">
                        {proveedores
                          .filter((p) => (p.categoria || "").toUpperCase() === "LLANTAS")
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.nombre_comercial} {p.dias_credito > 0 ? `(${p.dias_credito}d crédito)` : "(Contado)"}
                            </option>
                          ))}
                      </optgroup>
                      <optgroup label="Suspensión, Amortiguadores y Refacciones">
                        {proveedores
                          .filter((p) => (p.categoria || "").toUpperCase() === "SUSPENSION")
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.nombre_comercial} {p.dias_credito > 0 ? `(${p.dias_credito}d crédito)` : "(Contado)"}
                            </option>
                          ))}
                      </optgroup>
                      {proveedores.some((p) => !["LLANTAS", "SUSPENSION"].includes((p.categoria || "").toUpperCase())) && (
                        <optgroup label="Otros Insumos y Servicios">
                          {proveedores
                            .filter((p) => !["LLANTAS", "SUSPENSION"].includes((p.categoria || "").toUpperCase()))
                            .map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.nombre_comercial} {p.dias_credito > 0 ? `(${p.dias_credito}d crédito)` : "(Contado)"}
                              </option>
                            ))}
                        </optgroup>
                      )}
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Folio Ticket / Nota / Factura *
                </label>
                <div className="relative">
                  <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="ej. T-84920"
                    value={folioTicket}
                    onChange={(e) => setFolioTicket(e.target.value)}
                    className="w-full h-10 pl-9 pr-3 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-semibold text-slate-800"
                  />
                </div>
              </div>
            </div>

            {/* Total del Ticket y Descripción */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Descripción o Concepto del Ticket
                </label>
                <input
                  type="text"
                  placeholder="ej. Balatas, Discos y Líquido de Frenos"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Monto Total Ticket ($) *
                </label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0.00"
                    value={montoCosto || ""}
                    onChange={(e) => setMontoCosto(parseFloat(e.target.value) || 0)}
                    className="w-full h-10 pl-9 pr-3 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-bold text-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* Fuente de Pago y Garantía */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Fuente de Pago del Costo *
                </label>
                <select
                  value={fuentePago}
                  onChange={(e: any) => setFuentePago(e.target.value)}
                  className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-semibold"
                >
                  <option value="CAJA_CHICA">Efectivo de Caja Chica (Genera Vale)</option>
                  <option value="FONDO_RESERVA">Fondo 2: Reserva Taller</option>
                  <option value="CREDITO_PENDIENTE">A Crédito (Pendiente / Pasivo CxP)</option>
                  <option value="TRANSFERENCIA">Transferencia SPEI del Taller</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Garantía Otorgada por Proveedor
                </label>
                <select
                  value={mesesGarantia}
                  onChange={(e) => setMesesGarantia(parseInt(e.target.value))}
                  className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-medium"
                >
                  <option value={1}>1 Mes (30 días)</option>
                  <option value={3}>3 Meses (90 días)</option>
                  <option value={6}>6 Meses</option>
                  <option value={12}>1 Año (12 meses)</option>
                  <option value={24}>2 Años</option>
                </select>
              </div>
            </div>

            {/* Adjuntar Evidencia (1 sola Foto o PDF para todo el ticket) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                <span>Foto del Ticket / Nota / Factura (1 sola evidencia)</span>
                <span className="text-[11px] font-normal text-slate-500">Amparará todas las piezas marcadas</span>
              </label>

              <div className="border-2 border-dashed border-slate-300 hover:border-primary rounded-xl p-4 text-center bg-slate-50/50 hover:bg-slate-50 transition-colors relative">
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  capture="environment"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />

                {previewUrl ? (
                  <div className="flex flex-col items-center gap-2">
                    <img
                      src={previewUrl}
                      alt="Evidencia"
                      className="max-h-36 rounded-lg shadow-xs border border-slate-200 object-contain"
                    />
                    <span className="text-xs text-primary font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Foto lista: {selectedFile?.name}
                    </span>
                  </div>
                ) : selectedFile ? (
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="w-10 h-10 text-primary" />
                    <span className="text-xs text-slate-700 font-semibold">{selectedFile.name}</span>
                    <span className="text-[11px] text-slate-400">Clic para cambiar archivo</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-slate-500">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                      <Camera className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-700">
                        Toma una foto o selecciona archivo del ticket
                      </span>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        JPG, PNG, WebP o PDF hasta 10MB
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-bold text-white bg-primary hover:bg-primary/90 rounded-lg shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Guardando Ticket...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Guardar Ticket y Vincular ({selectedRefaccionIds.length})
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* PESTAÑA: VINCULAR A TICKET EXISTENTE */
          <form onSubmit={handleVincularExistente} className="p-6 overflow-y-auto space-y-4">
            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Selecciona el Ticket Registrado en esta Orden:
              </label>
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {comprasOrden.map((c) => {
                  const isSelected = selectedTicketExistenteId === c.id;
                  return (
                    <div
                      key={c.id}
                      onClick={() => setSelectedTicketExistenteId(c.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                        isSelected
                          ? "bg-primary/5 border-primary shadow-xs ring-1 ring-primary"
                          : "bg-white border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                          isSelected ? "bg-primary text-white" : "bg-slate-100 text-slate-600"
                        }`}>
                          <Receipt className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-800">
                              Ticket #{c.folio_ticket_nota}
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                              {c.proveedores?.nombre_comercial || "Proveedor"}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400">
                            {c.descripcion} • Garantía: {c.meses_garantia} meses
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-black font-mono text-slate-900 block">
                          ${Number(c.monto_costo || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-[10px] text-slate-400">{c.fecha_compra}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Refacciones a vincular */}
            {refaccionesDisponibles.length > 0 && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-primary" />
                    Marcar refacciones que también venían en este ticket ({selectedRefaccionIds.length}/{refaccionesDisponibles.length})
                  </span>
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                  >
                    {selectedRefaccionIds.length === refaccionesDisponibles.length ? "Deseleccionar todas" : "Marcar todas"}
                  </button>
                </div>

                <div className="max-h-40 overflow-y-auto space-y-1.5 divide-y divide-slate-200/60 pr-1">
                  {refaccionesDisponibles.map((r) => {
                    const isSelected = selectedRefaccionIds.includes(r.id);
                    return (
                      <div
                        key={r.id}
                        onClick={() => toggleRefaccion(r.id)}
                        className={`pt-1.5 first:pt-0 flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                          isSelected ? "bg-primary/5 border border-primary/20" : "hover:bg-slate-100/70"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-primary shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400 shrink-0" />
                          )}
                          <span className="text-xs font-semibold text-slate-800 truncate">
                            {r.nombre} {r.numero_parte ? `(${r.numero_parte})` : ""}
                          </span>
                        </div>
                        <span className="text-xs font-mono font-bold text-slate-700">
                          x{r.cantidad || 1}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Botones de acción */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-bold text-white bg-primary hover:bg-primary/90 rounded-lg shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Vinculando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Vincular Refacciones al Ticket ({selectedRefaccionIds.length})
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
