'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Wrench, 
  Plus, 
  Edit, 
  Loader2, 
  Save, 
  X
} from 'lucide-react';

export interface ServicioTaller {
  id: string;
  nombre: string;
  descripcion: string | null;
  precio: number;
  aplica_promo_llantas: boolean;
  activo: boolean;
}

export default function ServicesCRUD() {
  const [servicios, setServicios] = useState<ServicioTaller[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServicioTaller | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    precio: 0,
    aplica_promo_llantas: false,
    activo: true
  });

  const fetchServicios = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('servicios_taller')
        .select('*')
        .order('nombre', { ascending: true });
      if (error) throw error;
      setServicios(data || []);
    } catch (err) {
      console.error('Error fetching services:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServicios();
  }, []);

  const handleOpenAddModal = () => {
    setEditingService(null);
    setFormData({
      nombre: '',
      descripcion: '',
      precio: 0,
      aplica_promo_llantas: false,
      activo: true
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (srv: ServicioTaller) => {
    setEditingService(srv);
    setFormData({
      nombre: srv.nombre,
      descripcion: srv.descripcion || '',
      precio: srv.precio,
      aplica_promo_llantas: srv.aplica_promo_llantas,
      activo: srv.activo
    });
    setIsModalOpen(true);
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingService) {
        // Update
        const { error } = await supabase
          .from('servicios_taller')
          .update(formData)
          .eq('id', editingService.id);
        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabase
          .from('servicios_taller')
          .insert([formData]);
        if (error) throw error;
      }
      setIsModalOpen(false);
      await fetchServicios();
    } catch (err) {
      console.error('Error saving service:', err);
      alert('Error al guardar el servicio. Asegúrate de haber corrido 09_services_schema.sql');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (srv: ServicioTaller) => {
    try {
      const nextActive = !srv.activo;
      setServicios(prev => prev.map(s => s.id === srv.id ? { ...s, activo: nextActive } : s));
      
      const { error } = await supabase
        .from('servicios_taller')
        .update({ activo: nextActive })
        .eq('id', srv.id);
        
      if (error) throw error;
    } catch (err) {
      console.error('Error toggling active state:', err);
      setServicios(prev => prev.map(s => s.id === srv.id ? { ...s, activo: srv.activo } : s));
      alert('Error al modificar el estado del servicio.');
    }
  };

  return (
    <div className="panel-card p-5 bg-white flex flex-col shadow-sm w-full animate-in fade-in zoom-in-95 duration-200">
      <div className="pb-3 mb-4 border-b-hairline flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wrench className="w-4 h-4 text-cova-blue" />
          <span className="text-xs font-bold text-charcoal uppercase tracking-wider">
            Catálogo de Servicios de Taller
          </span>
        </div>
        
        <button
          onClick={handleOpenAddModal}
          className="text-[10px] bg-cova-blue text-ceramic font-bold hover:shadow-md px-3 py-1.5 rounded flex items-center gap-1.5 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer shadow-sm"
        >
          <Plus className="w-3.5 h-3.5 text-white" />
          <span>Nuevo Servicio</span>
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-xs text-charcoal-light animate-pulse font-medium">
          Cargando catálogo de servicios...
        </div>
      ) : (
        <div className="overflow-auto border border-hairline rounded bg-neutral-50/10">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-50/50 border-b border-hairline text-neutral-500 font-mono text-[9px] uppercase tracking-wider select-none">
                <th className="py-2.5 px-4 font-semibold">Servicio</th>
                <th className="py-2.5 px-3 font-semibold text-right">Precio Fijo</th>
                <th className="py-2.5 px-4 font-semibold text-center">Promo Llantas</th>
                <th className="py-2.5 px-4 font-semibold text-center">Activo en POS</th>
                <th className="py-2.5 px-4 font-semibold text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {servicios.map((srv) => (
                <tr key={srv.id} className="hover:bg-white transition-colors">
                  <td className="py-2.5 px-4">
                    <div className="font-semibold text-charcoal">{srv.nombre}</div>
                    {srv.descripcion && <div className="text-[10px] text-neutral-400 mt-0.5 max-w-xs truncate">{srv.descripcion}</div>}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-charcoal">
                    ${srv.precio.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded font-mono text-[9px] font-bold ${
                      srv.aplica_promo_llantas 
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                        : 'bg-neutral-100 text-neutral-400 border border-neutral-200'
                    }`}>
                      {srv.aplica_promo_llantas ? 'Sí' : 'No'}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    <div className="flex items-center justify-center">
                      <label className="relative inline-flex items-center cursor-pointer select-none">
                        <input 
                          type="checkbox" 
                          checked={srv.activo} 
                          onChange={() => handleToggleActive(srv)}
                          className="sr-only peer"
                        />
                        <div className="w-8 h-4.5 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-cova-blue"></div>
                      </label>
                    </div>
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    <button
                      onClick={() => handleOpenEditModal(srv)}
                      className="p-1 text-neutral-400 hover:text-cova-blue hover:bg-cova-blue/10 rounded transition-all cursor-pointer inline-flex items-center justify-center"
                      title="Editar Datos"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal CRUD: Service Add / Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-charcoal/30 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-hairline rounded-lg w-full max-w-md p-5 shadow-lg relative animate-in fade-in zoom-in-95 duration-200 flex flex-col gap-4">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 text-neutral-400 hover:text-charcoal"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <h3 className="text-xs font-bold text-charcoal uppercase tracking-wider font-mono">
                {editingService ? 'Modificar Servicio' : 'Registrar Nuevo Servicio'}
              </h3>
              <p className="text-[10px] text-charcoal-light mt-1">
                Ajuste los datos del servicio. Los cambios afectarán las nuevas cotizaciones.
              </p>
            </div>

            <form onSubmit={handleSaveService} className="flex flex-col gap-4">
              <div className="relative">
                <label className="absolute left-2.5 top-1.5 text-[9px] font-semibold text-charcoal-light/60 uppercase tracking-wider">
                  Nombre del Servicio
                </label>
                <input
                  type="text"
                  required
                  value={formData.nombre}
                  onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                  placeholder="Ej. Alineación y Balanceo"
                  className="w-full bg-white border border-hairline rounded pt-4 pb-1.5 px-2.5 text-xs text-charcoal focus:outline-none focus:border-cova-blue font-sans"
                />
              </div>

              <div className="relative">
                <label className="absolute left-2.5 top-1.5 text-[9px] font-semibold text-charcoal-light/60 uppercase tracking-wider">
                  Descripción (Opcional)
                </label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                  placeholder="Ej. Incluye plomos..."
                  rows={2}
                  className="w-full bg-white border border-hairline rounded pt-4 pb-1.5 px-2.5 text-xs text-charcoal focus:outline-none focus:border-cova-blue font-sans resize-none"
                />
              </div>

              <div className="relative">
                <label className="absolute left-2.5 top-1.5 text-[9px] font-semibold text-charcoal-light/60 uppercase tracking-wider">
                  Precio Base (MXN)
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.precio === 0 ? "" : formData.precio}
                  onChange={(e) => setFormData(prev => ({ ...prev, precio: e.target.value === "" ? 0 : parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-white border border-hairline rounded pt-4 pb-1.5 px-2.5 text-xs text-charcoal focus:outline-none focus:border-cova-blue font-mono font-bold"
                />
              </div>

              <div className="flex items-center gap-3 border border-hairline rounded p-3 bg-neutral-50/50">
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={formData.aplica_promo_llantas} 
                    onChange={(e) => setFormData(prev => ({ ...prev, aplica_promo_llantas: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4.5 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-cova-blue"></div>
                </label>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-charcoal">Aplica Promoción Llantas</span>
                  <span className="text-[9px] text-charcoal-light mt-0.5">Si se compran 4 llantas, el precio de este servicio se mostrará como $0.00 en el POS automáticamente.</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2 text-xs font-semibold text-charcoal hover:bg-neutral-50 border border-hairline rounded cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 text-xs font-semibold text-ceramic bg-cova-blue border border-cova-blue hover:shadow-md rounded cursor-pointer flex items-center justify-center gap-1.5 transition-all"
                >
                  {saving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5 text-white" />
                  )}
                  <span>{editingService ? 'Actualizar' : 'Guardar'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
