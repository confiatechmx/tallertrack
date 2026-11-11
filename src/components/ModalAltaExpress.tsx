'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useTenant } from '@/context/TenantContext';
import { X, UserPlus, Check, Loader2 } from 'lucide-react';

interface ModalAltaExpressProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (clientId: string, vehicleId: string) => void;
}

export default function ModalAltaExpress({ isOpen, onClose, onSuccess }: ModalAltaExpressProps) {
  const { empresa } = useTenant();
  const [loading, setLoading] = useState(false);

  // Form states
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [correo, setCorreo] = useState('');

  const [placas, setPlacas] = useState('');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [anio, setAnio] = useState<number | string>(new Date().getFullYear());
  const [kilometraje, setKilometraje] = useState<number | string>(50000);

  if (!isOpen) return null;

  // Phone number sanitation matching Culiacan/Mexico requirements
  const sanitizePhone = (phoneStr: string) => {
    const numbersOnly = phoneStr.replace(/[^\d]/g, '');
    
    // If it's a standard 10-digit mobile number, prepend Mexican country code +52
    if (numbersOnly.length === 10) {
      return `+52${numbersOnly}`;
    }
    // If it already contains country code (12 digits starting with 52)
    if (numbersOnly.startsWith('52') && numbersOnly.length === 12) {
      return `+${numbersOnly}`;
    }
    // For other cases, return with leading +
    return numbersOnly ? `+${numbersOnly}` : '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const cleanPhone = sanitizePhone(telefono);
      if (!cleanPhone) {
        alert('Por favor introduce un teléfono válido.');
        setLoading(false);
        return;
      }

      const supabase = createClient();

      const clientPayload: Record<string, any> = {
        nombre: nombre.trim(),
        telefono: cleanPhone,
        correo: correo.trim() || null,
      };
      if (empresa?.id) {
        clientPayload.empresa_id = empresa.id;
      }

      // 1. Create client in Supabase
      const { data: client, error: cErr } = await supabase
        .from('clientes')
        .insert(clientPayload)
        .select()
        .single();

      if (cErr) throw cErr;

      const cleanPlacas = placas.toUpperCase().trim();
      const vehiclePayload: Record<string, any> = {
        cliente_id: client.id,
        marca: marca.trim(),
        modelo: modelo.trim(),
        anio: Number(anio) || new Date().getFullYear(),
        placas: cleanPlacas && cleanPlacas !== 'MOSTRADOR' ? cleanPlacas : null,
        kilometraje_actual: Number(kilometraje) || 0,
        presion_delantera_psi: 32,
        presion_trasera_psi: 32,
        medida_oem: '205/55 R16',
      };
      if (empresa?.id) {
        vehiclePayload.empresa_id = empresa.id;
      }

      // 2. Create vehicle linked to client
      const { data: vehicle, error: vErr } = await supabase
        .from('vehiculos')
        .insert(vehiclePayload)
        .select()
        .single();

      if (vErr) throw vErr;

      // 3. Trigger success and pass IDs back
      onSuccess(client.id, vehicle.id);
      onClose();
    } catch (err: any) {
      console.error('Error in ModalAltaExpress:', err);
      alert(`Error al registrar cliente y vehículo: ${err.message || 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-charcoal/30 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-hairline rounded-lg w-full max-w-lg p-5 shadow-lg relative animate-in fade-in zoom-in-95 duration-200 flex flex-col gap-4 font-sans text-xs text-charcoal">
        {/* Header */}
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 text-neutral-400 hover:text-charcoal cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 border-b-hairline pb-3">
          <UserPlus className="w-4 h-4 text-cova-blue" />
          <h3 className="text-xs font-bold text-charcoal uppercase tracking-wider font-mono">
            Alta Express: Cliente y Vehículo
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Seccion Cliente */}
          <div className="flex flex-col gap-3">
            <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest font-mono">
              Datos del Cliente
            </span>
            
            <div className="relative">
              <label className="absolute left-2.5 top-1.5 text-[8px] font-semibold text-charcoal-light/60 uppercase tracking-wider">
                Nombre Completo *
              </label>
              <input
                type="text"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. Juan Francisco Pérez"
                className="w-full bg-white border border-hairline rounded pt-4 pb-1.5 px-2.5 text-xs text-charcoal focus:outline-none focus:border-neutral-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <label className="absolute left-2.5 top-1.5 text-[8px] font-semibold text-charcoal-light/60 uppercase tracking-wider">
                  Teléfono (WhatsApp) *
                </label>
                <input
                  type="text"
                  required
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="Ej. 6671234567"
                  className="w-full bg-white border border-hairline rounded pt-4 pb-1.5 px-2.5 text-xs text-charcoal focus:outline-none focus:border-neutral-400 font-mono"
                />
              </div>

              <div className="relative">
                <label className="absolute left-2.5 top-1.5 text-[8px] font-semibold text-charcoal-light/60 uppercase tracking-wider">
                  Correo Electrónico (Opcional)
                </label>
                <input
                  type="email"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  placeholder="juan@email.com"
                  className="w-full bg-white border border-hairline rounded pt-4 pb-1.5 px-2.5 text-xs text-charcoal focus:outline-none focus:border-neutral-400"
                />
              </div>
            </div>
          </div>

          {/* Seccion Vehiculo */}
          <div className="flex flex-col gap-3 pt-2 border-t border-dashed border-neutral-100">
            <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest font-mono">
              Datos del Vehículo
            </span>

            <div className="grid grid-cols-3 gap-2.5">
              <div className="relative">
                <label className="absolute left-2.5 top-1.5 text-[8px] font-semibold text-charcoal-light/60 uppercase tracking-wider">
                  Placas (MX) *
                </label>
                <input
                  type="text"
                  required
                  value={placas}
                  onChange={(e) => setPlacas(e.target.value)}
                  placeholder="Ej. VJS-456-A"
                  className="w-full bg-white border border-hairline rounded pt-4 pb-1.5 px-2.5 text-xs text-charcoal focus:outline-none focus:border-neutral-400 font-mono uppercase"
                />
              </div>

              <div className="relative col-span-2">
                <label className="absolute left-2.5 top-1.5 text-[8px] font-semibold text-charcoal-light/60 uppercase tracking-wider">
                  Marca *
                </label>
                <input
                  type="text"
                  required
                  value={marca}
                  onChange={(e) => setMarca(e.target.value)}
                  placeholder="Ej. Toyota"
                  className="w-full bg-white border border-hairline rounded pt-4 pb-1.5 px-2.5 text-xs text-charcoal focus:outline-none focus:border-neutral-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div className="relative col-span-2">
                <label className="absolute left-2.5 top-1.5 text-[8px] font-semibold text-charcoal-light/60 uppercase tracking-wider">
                  Modelo *
                </label>
                <input
                  type="text"
                  required
                  value={modelo}
                  onChange={(e) => setModelo(e.target.value)}
                  placeholder="Ej. Hilux"
                  className="w-full bg-white border border-hairline rounded pt-4 pb-1.5 px-2.5 text-xs text-charcoal focus:outline-none focus:border-neutral-400"
                />
              </div>

              <div className="relative">
                <label className="absolute left-2.5 top-1.5 text-[8px] font-semibold text-charcoal-light/60 uppercase tracking-wider">
                  Año *
                </label>
                <input
                  type="number"
                  required
                  value={anio}
                  onChange={(e) => setAnio(e.target.value === "" ? "" : parseInt(e.target.value) || "")}
                  onBlur={() => {
                    if (!anio || Number(anio) < 1900) setAnio(new Date().getFullYear());
                  }}
                  className="w-full bg-white border border-hairline rounded pt-4 pb-1.5 px-2.5 text-xs text-charcoal focus:outline-none focus:border-neutral-400 font-mono"
                />
              </div>
            </div>

            <div className="relative">
              <label className="absolute left-2.5 top-1.5 text-[8px] font-semibold text-charcoal-light/60 uppercase tracking-wider">
                Kilometraje de Ingreso *
              </label>
              <input
                type="number"
                required
                min={0}
                value={kilometraje}
                onChange={(e) => setKilometraje(e.target.value === "" ? "" : parseInt(e.target.value) || 0)}
                className="w-full bg-white border border-hairline rounded pt-4 pb-1.5 px-2.5 text-xs text-charcoal focus:outline-none focus:border-neutral-400 font-mono"
              />
            </div>
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-2 pt-3 border-t border-hairline mt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 text-xs font-semibold text-charcoal hover:bg-neutral-50 border border-hairline rounded cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 text-xs font-semibold text-ceramic bg-cova-blue border border-cova-blue hover:shadow-md rounded cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5 text-white" />
              )}
              <span>Guardar y Asignar</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
