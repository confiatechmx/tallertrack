"use client";

import React, { useState, useEffect } from "react";
import {
  Building2,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Phone,
  MessageSquare,
  ShieldCheck,
  Calendar,
  DollarSign,
  Loader2,
  X,
} from "lucide-react";
import { ProveedorService, Proveedor, ProveedorInsert } from "@/services/proveedorService";

interface ProveedoresConfigSectionProps {
  empresaId: string;
  sucursalId?: string;
}

export function ProveedoresConfigSection({ empresaId, sucursalId }: ProveedoresConfigSectionProps) {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<ProveedorInsert>({
    empresa_id: empresaId,
    sucursal_id: sucursalId || null,
    nombre_comercial: "",
    razon_social: "",
    rfc: "",
    contacto_nombre: "",
    telefono: "",
    whatsapp: "",
    email: "",
    dias_credito: 0,
    limite_credito: 0,
    meses_garantia_default: 1,
    condiciones_garantia: "",
    activo: true,
  });

  useEffect(() => {
    if (empresaId) cargarProveedores();
  }, [empresaId]);

  const cargarProveedores = async () => {
    setLoading(true);
    const { data } = await ProveedorService.obtenerProveedores(empresaId);
    setProveedores(data);
    setLoading(false);
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({
      empresa_id: empresaId,
      sucursal_id: sucursalId || null,
      nombre_comercial: "",
      razon_social: "",
      rfc: "",
      contacto_nombre: "",
      telefono: "",
      whatsapp: "",
      email: "",
      dias_credito: 0,
      limite_credito: 0,
      meses_garantia_default: 1,
      condiciones_garantia: "",
      activo: true,
    });
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: Proveedor) => {
    setEditingId(p.id);
    setFormData({
      empresa_id: p.empresa_id,
      sucursal_id: p.sucursal_id,
      nombre_comercial: p.nombre_comercial,
      razon_social: p.razon_social || "",
      rfc: p.rfc || "",
      contacto_nombre: p.contacto_nombre || "",
      telefono: p.telefono || "",
      whatsapp: p.whatsapp || "",
      email: p.email || "",
      dias_credito: p.dias_credito,
      limite_credito: p.limite_credito,
      meses_garantia_default: p.meses_garantia_default,
      condiciones_garantia: p.condiciones_garantia || "",
      activo: p.activo,
    });
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre_comercial.trim()) {
      setErrorMsg("El nombre comercial del proveedor es obligatorio.");
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    try {
      if (editingId) {
        const res = await ProveedorService.actualizarProveedor(editingId, formData);
        if (res.error) throw new Error(res.error);
      } else {
        const res = await ProveedorService.crearProveedor(formData);
        if (res.error) throw new Error(res.error);
      }
      setIsModalOpen(false);
      cargarProveedores();
    } catch (err: any) {
      setErrorMsg(err.message || "Error al guardar proveedor");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
      {/* Header */}
      <div className="p-5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            Catálogo Maestro de Proveedores y Condiciones de Crédito
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Configura días de crédito, plazos de garantía estándar y límite crediticio por proveedor
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="px-3.5 py-1.5 bg-primary hover:bg-primary/90 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          Nuevo Proveedor
        </button>
      </div>

      {/* List */}
      <div className="divide-y divide-slate-100">
        {loading ? (
          <div className="py-12 flex justify-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : proveedores.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            No hay proveedores dados de alta en este tenant.
          </div>
        ) : (
          proveedores.map((p) => (
            <div
              key={p.id}
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm">{p.nombre_comercial}</span>
                  {p.dias_credito > 0 ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                      {p.dias_credito} días de crédito
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                      Contado
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> {p.meses_garantia_default}m garantía
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  {p.contacto_nombre && <span>Contacto: {p.contacto_nombre}</span>}
                  {p.telefono && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" /> {p.telefono}
                    </span>
                  )}
                  {p.limite_credito > 0 && (
                    <span className="text-slate-600 font-medium">
                      Límite: ${Number(p.limite_credito).toLocaleString("es-MX")}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                    Saldo Deudor
                  </span>
                  <span
                    className={`font-black text-sm ${
                      p.saldo_deudor_actual > 0 ? "text-amber-700" : "text-emerald-600"
                    }`}
                  >
                    ${Number(p.saldo_deudor_actual || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <button
                  onClick={() => handleOpenEdit(p)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Editar proveedor"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Alta / Edición */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
              <h3 className="font-bold text-slate-800 text-sm">
                {editingId ? "Editar Proveedor" : "Nuevo Proveedor"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-3.5 text-xs">
              {errorMsg && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="font-semibold text-slate-700 block mb-1">Nombre Comercial *</label>
                  <input
                    type="text"
                    required
                    placeholder="ej. AutoZone Comercial o Llantas del Pacífico"
                    value={formData.nombre_comercial}
                    onChange={(e) => setFormData({ ...formData, nombre_comercial: e.target.value })}
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Días de Crédito (0 = Contado)</label>
                  <input
                    type="number"
                    min={0}
                    value={formData.dias_credito}
                    onChange={(e) => setFormData({ ...formData, dias_credito: parseInt(e.target.value) || 0 })}
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-1 focus:ring-primary font-bold"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Límite de Crédito ($ MXN)</label>
                  <input
                    type="number"
                    min={0}
                    step="100"
                    value={formData.limite_credito || ""}
                    placeholder="0.00"
                    onChange={(e) => setFormData({ ...formData, limite_credito: parseFloat(e.target.value) || 0 })}
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-1 focus:ring-primary font-bold"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Garantía Estándar (Meses)</label>
                  <select
                    value={formData.meses_garantia_default}
                    onChange={(e) => setFormData({ ...formData, meses_garantia_default: parseInt(e.target.value) || 1 })}
                    className="w-full h-9 px-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-1 focus:ring-primary"
                  >
                    <option value={1}>1 Mes (30 días)</option>
                    <option value={3}>3 Meses (90 días)</option>
                    <option value={6}>6 Meses</option>
                    <option value={12}>12 Meses (1 año)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Teléfono / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="+52 81..."
                    value={formData.telefono || ""}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value, whatsapp: e.target.value })}
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="col-span-2">
                  <label className="font-semibold text-slate-700 block mb-1">Nombre de Contacto / Asesor</label>
                  <input
                    type="text"
                    placeholder="ej. Lic. Fernando Ortiz (Ventas Taller)"
                    value={formData.contacto_nombre || ""}
                    onChange={(e) => setFormData({ ...formData, contacto_nombre: e.target.value })}
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 font-bold text-white bg-primary hover:bg-primary/90 rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Guardar Proveedor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
