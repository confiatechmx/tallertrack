'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useTenant } from '@/context/TenantContext';
import { X, Car, Check, Loader2 } from 'lucide-react';

interface ModalAltaVehiculoProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (vehicleId: string) => void;
  clienteId: string;
  clienteNombre: string;
}

export default function ModalAltaVehiculo({
  isOpen,
  onClose,
  onSuccess,
  clienteId,
  clienteNombre
}: ModalAltaVehiculoProps) {
  const { empresa } = useTenant();
  const [loading, setLoading] = useState(false);

  // Form states
  const [placas, setPlacas] = useState('');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [anio, setAnio] = useState<number>(new Date().getFullYear());
  const [kilometraje, setKilometraje] = useState<number>(50000);
  const [vin, setVin] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!clienteId) {
        alert('Error: No hay un cliente válido seleccionado.');
        setLoading(false);
        return;
      }

      const supabase = createClient();
      const cleanPlacas = placas.toUpperCase().trim();
      const vehiclePayload: Record<string, any> = {
        cliente_id: clienteId,
        marca: marca.trim(),
        modelo: modelo.trim(),
        anio: anio,
        placas: cleanPlacas && cleanPlacas !== 'MOSTRADOR' ? cleanPlacas : null,
        vin: vin.trim() || null,
        kilometraje_actual: kilometraje,
        presion_delantera_psi: 32,
        presion_trasera_psi: 32,
        medida_oem: '205/55 R16',
      };
      if (empresa?.id) {
        vehiclePayload.empresa_id = empresa.id;
      }

      // Create vehicle linked to the selected client
      const { data: vehicle, error: vErr } = await supabase
        .from('vehiculos')
        .insert(vehiclePayload)
        .select()
        .single();

      if (vErr) throw vErr;

      // Trigger success and pass the new vehicle ID back
      onSuccess(vehicle.id);
      onClose();
    } catch (err: any) {
      console.error('Error in ModalAltaVehiculo:', err);
      alert(`Error al registrar el vehículo: ${err.message || 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card rounded-lg shadow-sm border border-slate-200 w-full max-w-md p-6 relative animate-in fade-in zoom-in-95 duration-200 flex flex-col gap-6">
        {/* Header */}
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-700 cursor-pointer transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col gap-1 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2">
            <Car className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-slate-900">
              Registrar Auto Adicional
            </h3>
          </div>
          <p className="text-sm font-normal text-slate-500">
            Asociando nuevo vehículo a: <strong className="text-slate-700 font-medium">{clienteNombre}</strong>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">
                  Placas (MX) *
                </label>
                <input
                  type="text"
                  required
                  value={placas}
                  onChange={(e) => setPlacas(e.target.value)}
                  placeholder="VJS-456-A"
                  className="w-full bg-white border border-slate-300 rounded-md shadow-sm px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent tabular-nums uppercase"
                />
              </div>

              <div className="col-span-2">
                <label className="text-sm font-medium text-slate-700 block mb-1.5">
                  Marca *
                </label>
                <input
                  type="text"
                  required
                  value={marca}
                  onChange={(e) => setMarca(e.target.value)}
                  placeholder="Ej. Nissan"
                  className="w-full bg-white border border-slate-300 rounded-md shadow-sm px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="text-sm font-medium text-slate-700 block mb-1.5">
                  Modelo *
                </label>
                <input
                  type="text"
                  required
                  value={modelo}
                  onChange={(e) => setModelo(e.target.value)}
                  placeholder="Ej. Versa"
                  className="w-full bg-white border border-slate-300 rounded-md shadow-sm px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">
                  Año *
                </label>
                <input
                  type="number"
                  required
                  value={anio}
                  onChange={(e) => setAnio(parseInt(e.target.value) || new Date().getFullYear())}
                  className="w-full bg-white border border-slate-300 rounded-md shadow-sm px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent tabular-nums"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">
                  Kilometraje *
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  value={kilometraje}
                  onChange={(e) => setKilometraje(parseInt(e.target.value) || 0)}
                  className="w-full bg-white border border-slate-300 rounded-md shadow-sm px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent tabular-nums"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">
                  VIN (Opcional)
                </label>
                <input
                  type="text"
                  value={vin}
                  onChange={(e) => setVin(e.target.value)}
                  placeholder="Número de serie"
                  className="w-full bg-white border border-slate-300 rounded-md shadow-sm px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent tabular-nums uppercase"
                />
              </div>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 rounded-md transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-primary hover:bg-primary/90 text-white rounded-md shadow-sm transition-colors px-4 py-2 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>Guardar y Asignar</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
