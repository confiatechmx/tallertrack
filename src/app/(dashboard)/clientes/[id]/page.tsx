'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { 
  ArrowLeft, 
  User, 
  Phone, 
  Mail, 
  Building2, 
  Car, 
  Wrench, 
  AlertTriangle, 
  FileText, 
  Plus, 
  Edit3, 
  MessageCircle, 
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  ChevronRight,
  Disc,
  Gauge
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Modal } from '@/components/ui/Modal';
import { ClientForm, ClientFormData } from '@/components/clientes/ClientForm';
import { VehicleForm } from '@/components/clientes/VehicleForm';
import { toast } from 'sonner';

interface Vehicle {
  id: string;
  marca: string;
  modelo: string;
  placas: string | null;
  anio: number;
  vin: string | null;
  color?: string | null;
  kilometraje_actual: number;
  medida_oem?: string | null;
  presion_delantera_psi?: number | null;
  presion_trasera_psi?: number | null;
}

interface DeferredItem {
  id: string;
  vehiculo_id: string;
  cliente_id: string;
  concepto: string;
  severidad: string | null;
  costo_estimado: number | null;
  resuelto: boolean | null;
  created_at: string;
  notas: string | null;
}

interface ServiceOrder {
  id: string;
  fecha_ingreso: string;
  estado: string;
  estatus_pago: string;
  diagnostico_tecnico: string | null;
  total?: number;
  vehiculo_id: string;
  cotizaciones?: {
    total: number;
  } | null;
  vehiculo?: {
    marca: string;
    modelo: string;
    placas: string | null;
  } | null;
}

interface QuoteItem {
  id: string;
  fecha: string;
  total: number;
  estatus: string;
  vehiculo_id: string;
}

interface ClientDetail {
  id: string;
  nombre: string;
  telefono: string;
  correo: string;
  empresa: string | null;
  rfc: string | null;
  fuente_adquisicion: string | null;
  notas_internas: string | null;
  fecha_registro: string;
  tags: string[];
}

function cleanWhatsAppPhone(phone: string): string {
  const digits = (phone || '').replace(/\D/g, '');
  if (!digits) return '';
  return digits.startsWith('52') ? digits : `52${digits}`;
}

export default function ClienteDetallePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const clientId = params?.id as string;
  const initialVehicleId = searchParams.get('vehiculoId');

  const [client, setClient] = useState<ClientDetail | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [deferredItems, setDeferredItems] = useState<DeferredItem[]>([]);
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [quotes, setQuotes] = useState<QuoteItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Active tab: 'GARAGE' | 'ORDERS' | 'DEFERRED' | 'QUOTES'
  const [activeTab, setActiveTab] = useState<'GARAGE' | 'ORDERS' | 'DEFERRED' | 'QUOTES'>('GARAGE');

  // Modals state
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  const fetchClientData = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    const supabase = createClient();

    try {
      // 1. Fetch Client Profile
      const { data: cData, error: cErr } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', clientId)
        .single();

      if (cErr) throw cErr;

      setClient({
        id: cData.id,
        nombre: cData.nombre,
        telefono: cData.telefono || '',
        correo: cData.correo || '',
        empresa: cData.empresa || null,
        rfc: cData.rfc || null,
        fuente_adquisicion: cData.fuente_adquisicion || null,
        notas_internas: cData.notas_internas || null,
        fecha_registro: cData.fecha_registro,
        tags: Array.isArray(cData.tags) ? cData.tags : [],
      });

      // 2. Fetch Vehicles
      const { data: vData, error: vErr } = await supabase
        .from('vehiculos')
        .select('*')
        .eq('cliente_id', clientId)
        .order('marca', { ascending: true });

      if (vErr) throw vErr;
      const vehList: Vehicle[] = vData || [];
      setVehicles(vehList);

      const vehIds = vehList.map((v) => v.id);

      // 3. Fetch Deferred Items
      const { data: dData } = await supabase
        .from('trabajos_diferidos')
        .select('*')
        .or(`cliente_id.eq.${clientId}${vehIds.length > 0 ? `,vehiculo_id.in.(${vehIds.join(',')})` : ''}`)
        .order('created_at', { ascending: false });

      setDeferredItems((dData as DeferredItem[]) || []);

      // 4. Fetch Quotes
      const { data: qData } = await supabase
        .from('cotizaciones')
        .select('id, fecha, total, estatus, vehiculo_id')
        .eq('cliente_id', clientId)
        .order('fecha', { ascending: false });

      setQuotes((qData as QuoteItem[]) || []);

      // 5. Fetch Service Orders
      if (vehIds.length > 0) {
        const { data: oData } = await supabase
          .from('ordenes_servicio')
          .select(`
            id,
            fecha_ingreso,
            estado,
            estatus_pago,
            diagnostico_tecnico,
            vehiculo_id,
            cotizaciones (
              total
            ),
            vehiculo:vehiculos (
              marca,
              modelo,
              placas
            )
          `)
          .in('vehiculo_id', vehIds)
          .order('fecha_ingreso', { ascending: false });

        const mappedOrders: ServiceOrder[] = (oData || []).map((o: any) => ({
          id: o.id,
          fecha_ingreso: o.fecha_ingreso,
          estado: o.estado,
          estatus_pago: o.estatus_pago,
          diagnostico_tecnico: o.diagnostico_tecnico,
          total: o.cotizaciones?.total || 0,
          vehiculo_id: o.vehiculo_id,
          vehiculo: o.vehiculo,
        }));
        setOrders(mappedOrders);
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.error('Error al cargar expediente 360 del cliente:', err);
      toast.error('No se pudo cargar el expediente del cliente');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchClientData();
  }, [fetchClientData]);

  // If a specific vehicleId query was passed, pre-select or highlight
  useEffect(() => {
    if (initialVehicleId && vehicles.length > 0) {
      const match = vehicles.find((v) => v.id === initialVehicleId);
      if (match) {
        setActiveTab('GARAGE');
      }
    }
  }, [initialVehicleId, vehicles]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-slate-400">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm font-medium">Cargando expediente 360...</p>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-center p-6">
        <AlertTriangle className="w-12 h-12 text-amber-500 mb-3" />
        <h2 className="text-lg font-bold text-slate-800">Cliente no encontrado</h2>
        <p className="text-sm text-slate-500 mt-1 mb-4">El expediente solicitado no existe o fue eliminado.</p>
        <button
          onClick={() => router.push('/clientes')}
          className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors"
        >
          Volver a Directorio de Clientes
        </button>
      </div>
    );
  }

  const waPhone = cleanWhatsAppPhone(client.telefono);
  const pendingDeferred = deferredItems.filter((d) => !d.resuelto);
  const totalDeferredValue = pendingDeferred.reduce((sum, d) => sum + Number(d.costo_estimado || 0), 0);

  // Initial avatar letter
  const initial = client.nombre ? client.nombre.charAt(0).toUpperCase() : 'C';

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-12">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/clientes')}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            title="Volver al Directorio"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Expediente 360</span>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                ID: {client.id.slice(0, 8)}
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">{client.nombre}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsClientModalOpen(true)}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Editar Datos
          </button>

          <button
            onClick={() => {
              const firstVeh = vehicles[0];
              const url = firstVeh
                ? `/tablero?nuevaOrden=1&clienteId=${client.id}&vehiculoId=${firstVeh.id}`
                : `/tablero?nuevaOrden=1&clienteId=${client.id}`;
              router.push(url);
            }}
            className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            + Nueva Orden de Servicio
          </button>
        </div>
      </div>

      {/* Main 360 Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Fixed Identity & Summary Card (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-6">
            
            {/* Identity Header */}
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-bold text-xl shadow-sm shrink-0">
                {initial}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-bold text-slate-900 truncate">{client.nombre}</h2>
                {client.empresa && (
                  <p className="text-xs font-semibold text-blue-700 flex items-center gap-1 mt-0.5">
                    <Building2 className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{client.empresa}</span>
                  </p>
                )}
                {client.rfc && (
                  <span className="inline-block font-mono text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded mt-1.5 border border-slate-200">
                    RFC: {client.rfc}
                  </span>
                )}
              </div>
            </div>

            {/* Quick Contact CTAs */}
            <div className="space-y-2">
              {waPhone ? (
                <a
                  href={`https://wa.me/${waPhone}?text=${encodeURIComponent(
                    `Hola ${client.nombre}, te contactamos de Cova Centro Automotriz respecto a tu vehículo.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                >
                  <MessageCircle className="w-4 h-4" />
                  Enviar WhatsApp Directo
                </a>
              ) : (
                <button
                  disabled
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-100 text-slate-400 rounded-xl text-xs font-semibold cursor-not-allowed"
                >
                  <MessageCircle className="w-4 h-4" />
                  Sin teléfono para WhatsApp
                </button>
              )}

              {client.telefono && (
                <a
                  href={`tel:${client.telefono}`}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  Llamar: {client.telefono}
                </a>
              )}
            </div>

            {/* Contact Details List */}
            <div className="space-y-3 pt-4 border-t border-slate-100 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span className="flex items-center gap-2 text-slate-400">
                  <Mail className="w-3.5 h-3.5" /> Correo:
                </span>
                <span className="font-medium text-slate-800 truncate max-w-[180px]">
                  {client.correo || 'No registrado'}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-600">
                <span className="flex items-center gap-2 text-slate-400">
                  <Calendar className="w-3.5 h-3.5" /> Cliente desde:
                </span>
                <span className="font-medium text-slate-800">
                  {client.fecha_registro
                    ? new Date(client.fecha_registro).toLocaleDateString('es-MX', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })
                    : 'Reciente'}
                </span>
              </div>

              {client.fuente_adquisicion && (
                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-slate-400">Fuente:</span>
                  <span className="font-medium text-slate-800">{client.fuente_adquisicion}</span>
                </div>
              )}
            </div>

            {/* Tags */}
            {client.tags.length > 0 && (
              <div className="pt-4 border-t border-slate-100">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Etiquetas CRM</p>
                <div className="flex flex-wrap gap-1.5">
                  {client.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="bg-blue-50 text-blue-700 border border-blue-200/60 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Metrics Snapshot */}
            <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-100">
              <div className="bg-slate-50 p-3 rounded-xl text-center border border-slate-100">
                <span className="block text-lg font-bold text-slate-900">{vehicles.length}</span>
                <span className="text-[10px] font-medium text-slate-500">Autos</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl text-center border border-slate-100">
                <span className="block text-lg font-bold text-slate-900">{orders.length}</span>
                <span className="text-[10px] font-medium text-slate-500">Servicios</span>
              </div>
              <div className="bg-amber-50 p-3 rounded-xl text-center border border-amber-100">
                <span className="block text-lg font-bold text-amber-700">{pendingDeferred.length}</span>
                <span className="text-[10px] font-semibold text-amber-700">Diferidos</span>
              </div>
            </div>

            {/* Internal Notes */}
            {client.notas_internas && (
              <div className="pt-4 border-t border-slate-100">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Notas Internas</p>
                <p className="text-xs text-slate-600 bg-amber-50/60 p-3 rounded-xl border border-amber-200/50 italic">
                  "{client.notas_internas}"
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Tabbed Expediente (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Navigation Pills */}
          <div className="flex items-center gap-1.5 bg-slate-200/70 p-1 rounded-2xl overflow-x-auto dense-scrollbar">
            <button
              onClick={() => setActiveTab('GARAGE')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'GARAGE'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Car className="w-4 h-4" />
              Garaje de Vehículos ({vehicles.length})
            </button>

            <button
              onClick={() => setActiveTab('ORDERS')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'ORDERS'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Wrench className="w-4 h-4" />
              Historial de Servicios ({orders.length})
            </button>

            <button
              onClick={() => setActiveTab('DEFERRED')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'DEFERRED'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Trabajos Diferidos ({pendingDeferred.length})
            </button>

            <button
              onClick={() => setActiveTab('QUOTES')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'QUOTES'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-4 h-4" />
              Cotizaciones ({quotes.length})
            </button>
          </div>

          {/* TAB 1: GARAJE DE VEHÍCULOS */}
          {activeTab === 'GARAGE' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Vehículos Registrados</h3>
                  <p className="text-xs text-slate-500">Unidades de la familia o flotilla asociadas a este cliente.</p>
                </div>
                <button
                  onClick={() => {
                    setSelectedVehicle(null);
                    setIsVehicleModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-200 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  + Registrar Auto
                </button>
              </div>

              {vehicles.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center">
                  <Car className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-slate-700">Sin vehículos registrados</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto mb-4">
                    Registra el primer automóvil para poder generar órdenes de trabajo y checklist DVI.
                  </p>
                  <button
                    onClick={() => {
                      setSelectedVehicle(null);
                      setIsVehicleModalOpen(true);
                    }}
                    className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors"
                  >
                    + Registrar Primer Vehículo
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {vehicles.map((v) => {
                    const vehDeferred = pendingDeferred.filter((d) => d.vehiculo_id === v.id);

                    return (
                      <div
                        key={v.id}
                        className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors"
                      >
                        <div>
                          {/* Card Header */}
                          <div className="flex justify-between items-start gap-2 mb-3">
                            <div>
                              <h4 className="text-sm font-bold text-slate-900">
                                {v.marca} {v.modelo}
                              </h4>
                              <p className="text-xs text-slate-500 font-medium">
                                Año {v.anio} {v.color ? `• ${v.color}` : ''}
                              </p>
                            </div>
                            <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                              {v.placas || 'SIN PLACAS'}
                            </span>
                          </div>

                          {/* Technical Badges */}
                          <div className="grid grid-cols-2 gap-2 my-3 text-xs">
                            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                              <span className="text-[10px] text-slate-400 font-medium block">Kilometraje</span>
                              <span className="font-bold text-slate-800">
                                {v.kilometraje_actual ? `${v.kilometraje_actual.toLocaleString()} km` : 'Sin registro'}
                              </span>
                            </div>

                            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                              <span className="text-[10px] text-slate-400 font-medium block">Medida Llanta OEM</span>
                              <span className="font-mono font-bold text-slate-800 truncate block">
                                {v.medida_oem || 'No especificada'}
                              </span>
                            </div>
                          </div>

                          {/* Tire Pressure & VIN */}
                          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                            <span className="flex items-center gap-1">
                              <Gauge className="w-3.5 h-3.5 text-slate-400" />
                              PSI: {v.presion_delantera_psi || 33}D / {v.presion_trasera_psi || 33}T
                            </span>
                            {v.vin && <span className="font-mono text-[10px] text-slate-400">VIN: {v.vin.slice(-6)}</span>}
                          </div>

                          {/* Deferred warning */}
                          {vehDeferred.length > 0 && (
                            <div className="mt-3 p-2 bg-amber-50 rounded-xl border border-amber-200/70 flex items-center justify-between text-xs text-amber-800 font-medium">
                              <span className="flex items-center gap-1.5">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                {vehDeferred.length} diferido{vehDeferred.length > 1 ? 's' : ''} pendiente{vehDeferred.length > 1 ? 's' : ''}
                              </span>
                              <button
                                onClick={() => setActiveTab('DEFERRED')}
                                className="text-[11px] font-bold text-amber-900 underline"
                              >
                                Ver
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Card Actions */}
                        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100">
                          <button
                            onClick={() => {
                              setSelectedVehicle(v);
                              setIsVehicleModalOpen(true);
                            }}
                            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
                            title="Editar ficha técnica"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => {
                              router.push(`/tablero?nuevaOrden=1&clienteId=${client.id}&vehiculoId=${v.id}`);
                            }}
                            className="flex-1 py-2 px-3 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors text-center shadow-xs"
                          >
                            + Iniciar Orden de Servicio
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: HISTORIAL DE SERVICIOS */}
          {activeTab === 'ORDERS' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Historial Clínico de Servicios</h3>
                <p className="text-xs text-slate-500">Órdenes de servicio previas y en curso en el taller.</p>
              </div>

              {orders.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center">
                  <Wrench className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-slate-700">Sin historial de órdenes</p>
                  <p className="text-xs text-slate-500 mt-1">Este cliente aún no tiene órdenes de servicio registradas.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.map((order) => {
                    const dateFormatted = new Date(order.fecha_ingreso).toLocaleDateString('es-MX', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    });

                    let statusBadge = 'bg-slate-100 text-slate-700 border-slate-200';
                    if (order.estado === 'Listo para Entrega') {
                      statusBadge = 'bg-emerald-50 text-emerald-800 border-emerald-200';
                    } else if (order.estado === 'En Proceso') {
                      statusBadge = 'bg-blue-50 text-blue-800 border-blue-200';
                    }

                    return (
                      <div
                        key={order.id}
                        className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-300 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-bold text-slate-900">
                              #{order.id.slice(0, 8).toUpperCase()}
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="text-xs text-slate-500">{dateFormatted}</span>
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusBadge}`}>
                              {order.estado}
                            </span>
                          </div>

                          <p className="text-xs font-semibold text-slate-800">
                            {order.vehiculo?.marca} {order.vehiculo?.modelo}{' '}
                            {order.vehiculo?.placas && (
                              <span className="font-mono text-slate-500 font-normal">[{order.vehiculo.placas}]</span>
                            )}
                          </p>

                          {order.diagnostico_tecnico && (
                            <p className="text-xs text-slate-500 italic line-clamp-1">
                              "{order.diagnostico_tecnico}"
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100">
                          {order.total ? (
                            <div className="text-right">
                              <span className="block text-sm font-bold text-slate-900">
                                ${order.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium">Total de Orden</span>
                            </div>
                          ) : null}

                          <button
                            onClick={() => router.push(`/tablero?ordenId=${order.id}`)}
                            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
                            title="Ver en Tablero"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: TRABAJOS DIFERIDOS */}
          {activeTab === 'DEFERRED' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Trabajos Diferidos & Recomendaciones</h3>
                  <p className="text-xs text-slate-500">Hallazgos de inspección DVI pendientes de autorizar.</p>
                </div>
                {totalDeferredValue > 0 && (
                  <span className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-xl">
                    Estimado: ${totalDeferredValue.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </span>
                )}
              </div>

              {deferredItems.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-slate-700">Sin trabajos diferidos pendientes</p>
                  <p className="text-xs text-slate-500 mt-1">Todos los servicios recomendados han sido atendidos.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {deferredItems.map((item) => {
                    const isRed = item.severidad === 'rojo';

                    return (
                      <div
                        key={item.id}
                        className={`bg-white rounded-2xl border p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          item.resuelto
                            ? 'border-slate-200 opacity-60'
                            : isRed
                            ? 'border-red-200 bg-red-50/20'
                            : 'border-amber-200 bg-amber-50/20'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                item.resuelto
                                  ? 'bg-slate-100 text-slate-600 border-slate-200'
                                  : isRed
                                  ? 'bg-red-100 text-red-800 border-red-200'
                                  : 'bg-amber-100 text-amber-800 border-amber-200'
                              }`}
                            >
                              {item.resuelto ? 'Resuelto' : isRed ? '🔴 Crítico' : '🟡 Preventivo'}
                            </span>
                            <span className="text-xs text-slate-400">
                              {new Date(item.created_at).toLocaleDateString('es-MX')}
                            </span>
                          </div>

                          <h4 className="text-sm font-bold text-slate-900">{item.concepto}</h4>
                          {item.notas && <p className="text-xs text-slate-500 italic">"{item.notas}"</p>}
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100">
                          {item.costo_estimado ? (
                            <div className="text-right">
                              <span className="block text-sm font-bold text-slate-900">
                                ${Number(item.costo_estimado).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium">Presupuesto</span>
                            </div>
                          ) : null}

                          {!item.resuelto && (
                            <button
                              onClick={() => {
                                router.push(`/tablero?nuevaOrden=1&clienteId=${client.id}&vehiculoId=${item.vehiculo_id}`);
                              }}
                              className="px-3 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors"
                            >
                              + Cotizar en Orden
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: COTIZACIONES */}
          {activeTab === 'QUOTES' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Cotizaciones Formales</h3>
                <p className="text-xs text-slate-500">Presupuestos generados previamente para este cliente.</p>
              </div>

              {quotes.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center">
                  <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-slate-700">Sin cotizaciones registradas</p>
                  <p className="text-xs text-slate-500 mt-1">No hay presupuestos archivados para este cliente.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {quotes.map((quote) => {
                    const dateFormatted = new Date(quote.fecha).toLocaleDateString('es-MX', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    });

                    let statusBadge = 'bg-slate-100 text-slate-700 border-slate-200';
                    if (quote.estatus === 'Aprobada' || quote.estatus === 'Aceptada') {
                      statusBadge = 'bg-emerald-50 text-emerald-800 border-emerald-200';
                    } else if (quote.estatus === 'Pendiente') {
                      statusBadge = 'bg-amber-50 text-amber-800 border-amber-200';
                    }

                    return (
                      <div
                        key={quote.id}
                        className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-mono text-xs font-bold text-slate-700">
                              #{quote.id.slice(0, 8).toUpperCase()}
                            </span>
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusBadge}`}>
                              {quote.estatus}
                            </span>
                          </div>
                          <span className="text-xs text-slate-400 block mb-3">{dateFormatted}</span>
                          <span className="text-lg font-bold text-slate-900 block">
                            ${quote.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal for Edit Client */}
      <Modal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        title="Editar Datos del Cliente"
        description="Actualiza el teléfono, correo, razón social o etiquetas."
      >
        <ClientForm
          initialData={{
            id: client.id,
            nombre: client.nombre,
            telefono: client.telefono,
            correo: client.correo,
            empresa: client.empresa,
            rfc: client.rfc,
            fuente_adquisicion: client.fuente_adquisicion,
            notas_internas: client.notas_internas,
            tags: client.tags,
          }}
          onSuccess={() => {
            setIsClientModalOpen(false);
            fetchClientData();
          }}
          onCancel={() => setIsClientModalOpen(false)}
        />
      </Modal>

      {/* Modal for Add / Edit Vehicle */}
      <Modal
        isOpen={isVehicleModalOpen}
        onClose={() => {
          setIsVehicleModalOpen(false);
          setSelectedVehicle(null);
        }}
        title={selectedVehicle ? 'Editar Ficha Técnica de Vehículo' : 'Registrar Nuevo Vehículo'}
        description="Medida OEM de llantas, presión PSI y datos del automóvil."
      >
        <VehicleForm
          clientId={client.id}
          initialData={selectedVehicle}
          onSuccess={() => {
            setIsVehicleModalOpen(false);
            setSelectedVehicle(null);
            fetchClientData();
          }}
          onCancel={() => {
            setIsVehicleModalOpen(false);
            setSelectedVehicle(null);
          }}
        />
      </Modal>
    </div>
  );
}
