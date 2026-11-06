"use client";

import React, { useState, useEffect } from "react";
import {
  Wrench,
  Plus,
  Pencil,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  Layers,
  ArrowUpDown,
  Car,
} from "lucide-react";
import { toast } from "sonner";
import {
  TenantEstacionesService,
  TenantEstacionTrabajo,
  DEFAULT_COVA_ESTACIONES,
} from "@/services/tenantEstacionesService";

interface TenantEstacionesConfigProps {
  empresaId: string;
  sucursalId?: string;
}

const TIPOS_ESTACION = [
  { value: "FOSA", label: "Fosa de Inspección / Diagnóstico", badge: "bg-blue-100 text-blue-900 border-blue-200" },
  { value: "RAMPA", label: "Rampa Hidráulica / Frenera", badge: "bg-emerald-100 text-emerald-900 border-emerald-200" },
  { value: "PORTERIA", label: "Portería / Llantera", badge: "bg-amber-100 text-amber-900 border-amber-200" },
  { value: "COMODIN", label: "Comodín / Área Auxiliar", badge: "bg-purple-100 text-purple-900 border-purple-200" },
  { value: "BAHIA", label: "Bahía de Servicio General", badge: "bg-slate-100 text-slate-800 border-slate-200" },
  { value: "OTRO", label: "Otro Tipo de Estación", badge: "bg-zinc-100 text-zinc-800 border-zinc-200" },
];

export function TenantEstacionesConfig({ empresaId, sucursalId }: TenantEstacionesConfigProps) {
  const [estaciones, setEstaciones] = useState<TenantEstacionTrabajo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEstacion, setEditingEstacion] = useState<TenantEstacionTrabajo | null>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formNombre, setFormNombre] = useState("");
  const [formCodigo, setFormCodigo] = useState("");
  const [formTipo, setFormTipo] = useState<"FOSA" | "RAMPA" | "PORTERIA" | "COMODIN" | "BAHIA" | "OTRO">("RAMPA");
  const [formDescripcion, setFormDescripcion] = useState("");
  const [formOrden, setFormOrden] = useState(1);
  const [formActivo, setFormActivo] = useState(true);

  useEffect(() => {
    if (empresaId) {
      cargarEstaciones();
    }
  }, [empresaId, sucursalId]);

  const cargarEstaciones = async () => {
    setLoading(true);
    const res = await TenantEstacionesService.obtenerTodasLasEstaciones(empresaId, sucursalId);
    if (!res.error && res.data) {
      setEstaciones(res.data);
    }
    setLoading(false);
  };

  const handleOpenCrear = () => {
    setEditingEstacion(null);
    setFormNombre("");
    setFormCodigo("");
    setFormTipo("RAMPA");
    setFormDescripcion("");
    setFormOrden(estaciones.length + 1);
    setFormActivo(true);
    setIsModalOpen(true);
  };

  const handleOpenEditar = (est: TenantEstacionTrabajo) => {
    setEditingEstacion(est);
    setFormNombre(est.nombre);
    setFormCodigo(est.codigo || "");
    setFormTipo((est.tipo as any) || "RAMPA");
    setFormDescripcion(est.descripcion || "");
    setFormOrden(est.orden || 1);
    setFormActivo(est.activo);
    setIsModalOpen(true);
  };

  const handleToggleActivo = async (id: string, currentVal: boolean) => {
    const newVal = !currentVal;
    setEstaciones((prev) =>
      prev.map((e) => (e.id === id ? { ...e, activo: newVal } : e))
    );
    try {
      const res = await TenantEstacionesService.actualizarEstacion(id, { activo: newVal });
      if (res.error) throw new Error(res.error);
      toast.success(newVal ? "Estación activada en piso." : "Estación desactivada.");
    } catch (err: any) {
      toast.error(err.message || "Error al cambiar estatus de la estación");
      cargarEstaciones();
    }
  };

  const handleSaveEstacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNombre.trim()) {
      toast.error("El nombre de la estación es obligatorio");
      return;
    }

    setSaving(true);
    try {
      if (editingEstacion) {
        const res = await TenantEstacionesService.actualizarEstacion(editingEstacion.id, {
          nombre: formNombre.trim(),
          codigo: formCodigo.trim() || null,
          tipo: formTipo,
          descripcion: formDescripcion.trim() || null,
          orden: Number(formOrden) || 1,
          activo: formActivo,
        });
        if (res.error) throw new Error(res.error);
        toast.success("Estación actualizada correctamente");
      } else {
        const res = await TenantEstacionesService.crearEstacion({
          empresa_id: empresaId,
          sucursal_id: sucursalId || null,
          nombre: formNombre.trim(),
          codigo: formCodigo.trim() || null,
          tipo: formTipo,
          descripcion: formDescripcion.trim() || null,
          orden: Number(formOrden) || 1,
          activo: formActivo,
        });
        if (res.error) throw new Error(res.error);
        toast.success("Nueva estación dada de alta exitosamente");
      }
      setIsModalOpen(false);
      cargarEstaciones();
    } catch (err: any) {
      toast.error(err.message || "Error al guardar estación");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-12 flex justify-center text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Encabezado del Módulo Autogestionable */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="p-5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600" />
              Estaciones de Trabajo y Rampas en Piso ({estaciones.length})
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Configura las fosas, rampas freneras, porterías y comodines de tu taller. Las estaciones activas aparecerán en el alta de recepción y en el tablero de piso Kanban.
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenCrear}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer transition-colors shrink-0"
          >
            <Plus size={15} />
            Nueva Estación
          </button>
        </div>

        {estaciones.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-xs">
            No tienes estaciones registradas. Haz clic en "Nueva Estación" para registrar las rampas o fosas de tu taller.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {estaciones.map((est) => {
              const tipoObj = TIPOS_ESTACION.find((t) => t.value === est.tipo) || TIPOS_ESTACION[1];
              return (
                <div
                  key={est.id}
                  className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors ${
                    !est.activo ? "opacity-60 bg-slate-50/30" : ""
                  }`}
                >
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0 border border-slate-200">
                      #{est.orden}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-black text-slate-900 text-xs tracking-tight">
                          {est.nombre}
                        </span>
                        {est.codigo && (
                          <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                            {est.codigo}
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.2 rounded-full text-[10px] font-bold border ${tipoObj.badge}`}
                        >
                          {tipoObj.label.split(" / ")[0]}
                        </span>
                        {!est.activo && (
                          <span className="px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-amber-100 text-amber-800">
                            Inactiva
                          </span>
                        )}
                      </div>

                      {est.descripcion && (
                        <p className="text-[11px] text-slate-500 truncate max-w-xl">
                          {est.descripcion}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    <label className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={est.activo}
                        onChange={() => handleToggleActivo(est.id, est.activo)}
                        className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                      />
                      <span className="text-[11px]">En servicio</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => handleOpenEditar(est)}
                      className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                      title="Editar estación"
                    >
                      <Pencil size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Crear / Editar Estación */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <Wrench size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    {editingEstacion ? "Editar Estación de Trabajo" : "Nueva Estación de Trabajo"}
                  </h3>
                  <p className="text-[10px] text-slate-500">
                    Bahía, rampa, fosa o portería para atención en taller
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEstacion} className="p-5 space-y-3.5 text-xs">
              {/* Nombre */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                  Nombre de la Estación *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Fosa de diagnóstico, Rampa frenera 1, Portería"
                  value={formNombre}
                  onChange={(e) => setFormNombre(e.target.value)}
                  className="w-full h-9 bg-white border border-slate-300 rounded-lg px-2.5 text-xs font-bold text-slate-900 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Tipo y Código */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                    Tipo de Estación *
                  </label>
                  <select
                    value={formTipo}
                    onChange={(e) => setFormTipo(e.target.value as any)}
                    className="w-full h-9 bg-white border border-slate-300 rounded-lg px-2 text-xs font-bold text-slate-900 focus:ring-1 focus:ring-emerald-500"
                  >
                    {TIPOS_ESTACION.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                    Código Interno
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. FOSA-1, RAMPA-1"
                    value={formCodigo}
                    onChange={(e) => setFormCodigo(e.target.value.toUpperCase())}
                    className="w-full h-9 bg-white border border-slate-300 rounded-lg px-2.5 text-xs font-mono font-bold text-slate-900 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Orden de Visualización */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                    Número de Orden
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={formOrden}
                    onChange={(e) => setFormOrden(parseInt(e.target.value) || 1)}
                    className="w-full h-9 bg-white border border-slate-300 rounded-lg px-2.5 text-xs font-bold text-slate-900 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2 h-9 p-2 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formActivo}
                      onChange={(e) => setFormActivo(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-800">Estación Activa</span>
                  </label>
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                  Descripción u Observaciones
                </label>
                <textarea
                  rows={2}
                  placeholder="Capacidad de carga, equipamiento especial, etc."
                  value={formDescripcion}
                  onChange={(e) => setFormDescripcion(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 resize-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Botones de acción */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-2 text-slate-600 hover:text-slate-800 text-xs font-bold rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-lg shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {saving && <Loader2 size={13} className="animate-spin" />}
                  {editingEstacion ? "Guardar Cambios" : "Crear Estación"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
