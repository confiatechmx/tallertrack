"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  Search,
  Tag,
  CircleDot,
  Wrench,
  Cog,
  Package,
} from "lucide-react";
import { ProveedorService, Proveedor, ProveedorInsert } from "@/services/proveedorService";

interface ProveedoresConfigSectionProps {
  empresaId: string;
  sucursalId?: string;
}

export const CATEGORIAS_CONFIG = [
  { id: "TODAS", label: "Todos", icon: Building2 },
  { id: "LLANTAS", label: "Llantas y Neumáticos", icon: CircleDot, badgeClass: "bg-blue-50 text-blue-700 border-blue-200" },
  { id: "SUSPENSION", label: "Suspensión y Refacciones", icon: Wrench, badgeClass: "bg-amber-50 text-amber-700 border-amber-200" },
  { id: "TORNO_MAQUILA", label: "Torno y Maquilas", icon: Cog, badgeClass: "bg-purple-50 text-purple-700 border-purple-200" },
  { id: "OTROS", label: "Otros Insumos", icon: Package, badgeClass: "bg-slate-100 text-slate-700 border-slate-200" },
];

export function ProveedoresConfigSection({ empresaId, sucursalId }: ProveedoresConfigSectionProps) {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>("TODAS");
  const [searchQuery, setSearchQuery] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<ProveedorInsert>({
    empresa_id: empresaId,
    sucursal_id: sucursalId || null,
    nombre_comercial: "",
    categoria: "SUSPENSION",
    razon_social: "",
    rfc: "",
    contacto_nombre: "",
    telefono: "",
    whatsapp: "",
    email: "",
    dias_credito: 0,
    limite_credito: 0,
    meses_garantia_default: 3,
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
    const defaultCat = categoriaSeleccionada !== "TODAS" ? categoriaSeleccionada : "SUSPENSION";
    setFormData({
      empresa_id: empresaId,
      sucursal_id: sucursalId || null,
      nombre_comercial: "",
      categoria: defaultCat,
      razon_social: "",
      rfc: "",
      contacto_nombre: "",
      telefono: "",
      whatsapp: "",
      email: "",
      dias_credito: 0,
      limite_credito: 0,
      meses_garantia_default: defaultCat === "LLANTAS" ? 12 : 3,
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
      categoria: p.categoria || "SUSPENSION",
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
      setErrorMsg("El nombre comercial es obligatorio.");
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    try {
      if (editingId) {
        const { error } = await ProveedorService.actualizarProveedor(editingId, {
          ...formData,
          nombre_comercial: formData.nombre_comercial.trim(),
        });
        if (error) throw new Error(error);
      } else {
        const { error } = await ProveedorService.crearProveedor({
          ...formData,
          empresa_id: empresaId,
          nombre_comercial: formData.nombre_comercial.trim(),
        });
        if (error) throw new Error(error);
      }

      setIsModalOpen(false);
      await cargarProveedores();
    } catch (err: any) {
      setErrorMsg(err.message || "Error al procesar el proveedor.");
    } finally {
      setSaving(false);
    }
  };

  // Filtrado reactivo en UI
  const proveedoresFiltrados = useMemo(() => {
    return proveedores.filter((p) => {
      const matchCat =
        categoriaSeleccionada === "TODAS" ||
        (p.categoria || "SUSPENSION").toUpperCase() === categoriaSeleccionada.toUpperCase();

      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        p.nombre_comercial.toLowerCase().includes(q) ||
        (p.contacto_nombre && p.contacto_nombre.toLowerCase().includes(q)) ||
        (p.telefono && p.telefono.includes(q));

      return matchCat && matchQuery;
    });
  }, [proveedores, categoriaSeleccionada, searchQuery]);

  // Contadores por categoría
  const conteoPorCategoria = useMemo(() => {
    const counts: Record<string, number> = {
      TODAS: proveedores.length,
      LLANTAS: 0,
      SUSPENSION: 0,
      TORNO_MAQUILA: 0,
      OTROS: 0,
    };
    proveedores.forEach((p) => {
      const cat = (p.categoria || "SUSPENSION").toUpperCase();
      if (counts[cat] !== undefined) {
        counts[cat]++;
      } else {
        counts["OTROS"]++;
      }
    });
    return counts;
  }, [proveedores]);

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
      {/* Header */}
      <div className="p-5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            Catálogo de Proveedores Categorizados y Condiciones de Crédito
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Gestión clasificada entre proveedores de neumáticos, refacciones de suspensión, tornos y otros insumos.
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

      {/* Barra de Filtros: Categorías y Búsqueda */}
      <div className="p-4 border-b border-slate-100 bg-white flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Pills de categorías */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {CATEGORIAS_CONFIG.map((cat) => {
            const count = conteoPorCategoria[cat.id] || 0;
            const isSelected = categoriaSeleccionada === cat.id;
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => setCategoriaSeleccionada(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isSelected ? "bg-slate-700 text-white" : "bg-white text-slate-500 border border-slate-200"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Búsqueda rápida */}
        <div className="relative w-full md:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nombre o teléfono..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-8.5 pl-8 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Listado de Proveedores */}
      <div className="divide-y divide-slate-100">
        {loading ? (
          <div className="py-12 flex justify-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : proveedoresFiltrados.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            {searchQuery
              ? `No se encontraron proveedores que coincidan con "${searchQuery}".`
              : "No hay proveedores registrados en esta categoría."}
          </div>
        ) : (
          proveedoresFiltrados.map((p) => {
            const cat = (p.categoria || "SUSPENSION").toUpperCase();
            const isLlanta = cat === "LLANTAS";
            const isSuspension = cat === "SUSPENSION";
            const isTorno = cat === "TORNO_MAQUILA";

            return (
              <div
                key={p.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm tracking-tight">
                      {p.nombre_comercial}
                    </span>

                    {/* Badge de Categoría */}
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${
                        isLlanta
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : isSuspension
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : isTorno
                          ? "bg-purple-50 text-purple-700 border-purple-200"
                          : "bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                    >
                      {isLlanta && <CircleDot className="w-3 h-3 text-blue-600" />}
                      {isSuspension && <Wrench className="w-3 h-3 text-amber-600" />}
                      {isTorno && <Cog className="w-3 h-3 text-purple-600" />}
                      <span>
                        {isLlanta
                          ? "Llantas"
                          : isSuspension
                          ? "Suspensión y Refacciones"
                          : isTorno
                          ? "Torno y Maquilas"
                          : "Otros Insumos"}
                      </span>
                    </span>

                    {/* Crédito */}
                    {p.dias_credito > 0 ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                        {p.dias_credito} días crédito
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                        Contado
                      </span>
                    )}

                    {/* Garantía */}
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> {p.meses_garantia_default}m garantía
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                    {p.contacto_nombre && <span>Contacto: <strong className="text-slate-700">{p.contacto_nombre}</strong></span>}
                    {p.telefono && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" /> <span className="tabular-nums font-mono">{p.telefono}</span>
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
                      className={`font-black text-sm tabular-nums ${
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
            );
          })
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
                    placeholder="ej. AYON, TERSA, AUTOZONE, OBAL ZAPATA"
                    value={formData.nombre_comercial}
                    onChange={(e) => setFormData({ ...formData, nombre_comercial: e.target.value })}
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-1 focus:ring-primary font-semibold"
                  />
                </div>

                <div className="col-span-2">
                  <label className="font-semibold text-slate-700 block mb-1">Giro / Categoría Comercial</label>
                  <select
                    value={formData.categoria || "SUSPENSION"}
                    onChange={(e) => {
                      const newCat = e.target.value;
                      setFormData({
                        ...formData,
                        categoria: newCat,
                        meses_garantia_default: newCat === "LLANTAS" ? 12 : 3,
                      });
                    }}
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-1 focus:ring-primary font-bold text-slate-800"
                  >
                    <option value="LLANTAS">🛞 Proveedor de Llantas y Neumáticos</option>
                    <option value="SUSPENSION">🔩 Suspensión, Amortiguadores y Refacciones</option>
                    <option value="TORNO_MAQUILA">⚙️ Torno, Maquilas y Rectificación</option>
                    <option value="OTROS">📦 Otros Insumos y Servicios</option>
                  </select>
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
                    <option value={3}>3 Meses (90 días - Refacciones)</option>
                    <option value={6}>6 Meses</option>
                    <option value={12}>12 Meses (1 año - Llantas)</option>
                    <option value={24}>24 Meses (2 años)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Teléfono / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="+52 667..."
                    value={formData.telefono || ""}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value, whatsapp: e.target.value })}
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="col-span-2">
                  <label className="font-semibold text-slate-700 block mb-1">Nombre de Contacto / Vendedor</label>
                  <input
                    type="text"
                    placeholder="ej. Vendedor de Mostrador / Asesor"
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
