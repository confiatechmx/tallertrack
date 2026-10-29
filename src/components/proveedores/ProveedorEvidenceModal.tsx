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
} from "lucide-react";
import { ProveedorService, Proveedor, CompraProveedorInsert } from "@/services/proveedorService";

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
  onCompraRegistrada?: (compra: any) => void;
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
  onCompraRegistrada,
}: ProveedorEvidenceModalProps) {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loadingProveedores, setLoadingProveedores] = useState(false);

  // Form states
  const [proveedorId, setProveedorId] = useState<string>("");
  const [folioTicket, setFolioTicket] = useState<string>("");
  const [descripcion, setDescripcion] = useState<string>(defaultDescripcion);
  const [montoCosto, setMontoCosto] = useState<number>(defaultMonto);
  const [fuentePago, setFuentePago] = useState<"CAJA_CHICA" | "FONDO_RESERVA" | "TRANSFERENCIA" | "CREDITO_PENDIENTE">("CAJA_CHICA");
  const [mesesGarantia, setMesesGarantia] = useState<number>(1);
  const [notasGarantia, setNotasGarantia] = useState<string>("");

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && empresaId) {
      cargarProveedores();
      if (defaultDescripcion) setDescripcion(defaultDescripcion);
      if (defaultMonto) setMontoCosto(defaultMonto);
    }
  }, [isOpen, empresaId, defaultDescripcion, defaultMonto]);

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

  const handleSubmit = async (e: React.FormEvent) => {
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
        descripcion: descripcion.trim() || "Compra de refacciones",
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
      if (res.error) throw new Error(res.error);

      if (onCompraRegistrada) {
        onCompraRegistrada(res.data);
      }

      onClose();
    } catch (err: any) {
      console.error("Error al registrar evidencia:", err);
      setErrorMsg(err.message || "No se pudo registrar la compra y evidencia.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">
                Registro de Compra y Evidencia de Proveedor
              </h3>
              <p className="text-xs text-slate-500">
                Trazabilidad digital para garantías y egresos de caja
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
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
                  proveedores.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre_comercial} {p.dias_credito > 0 ? `(${p.dias_credito}d crédito)` : "(Contado)"}
                    </option>
                  ))
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

          {/* Descripción y Costo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Descripción de la Refacción o Pieza
              </label>
              <input
                type="text"
                placeholder="ej. 2 Llantas 205/55R16 o Par de Balatas Delanteras"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Costo Total ($ MXN) *
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

          {/* Adjuntar Evidencia (Foto o PDF) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
              <span>Evidencia Digital (Ticket, Nota o Factura)</span>
              <span className="text-[11px] font-normal text-slate-500">Foto o PDF</span>
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
                      Toma una foto o selecciona archivo
                    </span>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      JPG, PNG, WebP o PDF hasta 10MB
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Botones */}
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
                  Guardando y Subiendo...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Registrar Compra y Evidencia
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
