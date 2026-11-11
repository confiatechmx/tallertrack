"use client";

import React, { useState, useEffect } from "react";
import {
  Building2,
  Plus,
  DollarSign,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  Search,
  Filter,
  FileText,
  ExternalLink,
  Eye,
  AlertCircle,
  CheckCircle2,
  Clock,
  Phone,
  MessageSquare,
  Loader2,
  RefreshCw,
  X,
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";
import { useTenant } from "@/context/TenantContext";
import {
  ProveedorService,
  Proveedor,
  ProveedorInsert,
  CompraConProveedor,
  DetalleTicketCompra,
  ResumenCxP,
} from "@/services/proveedorService";
import { ProveedorEvidenceModal } from "@/components/proveedores/ProveedorEvidenceModal";
import { RegistrarAbonoModal } from "@/components/proveedores/RegistrarAbonoModal";
import { TicketEvidenceLightbox } from "@/components/proveedores/TicketEvidenceLightbox";
import { DetalleTicketProveedorModal } from "@/components/proveedores/DetalleTicketProveedorModal";

export default function ProveedoresPage() {
  const { empresa } = useTenant();
  const empresaId = empresa?.id || "";

  // Data states
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [compras, setCompras] = useState<CompraConProveedor[]>([]);
  const [abonos, setAbonos] = useState<any[]>([]);
  const [resumenCxP, setResumenCxP] = useState<ResumenCxP>({
    totalDeudaAcumulada: 0,
    proveedoresConDeuda: 0,
    comprasVencidas: 0,
    comprasPorVencer: 0,
  });
  const [loading, setLoading] = useState(true);

  // Active Tab: "directorio" | "transacciones" | "garantias"
  const [activeTab, setActiveTab] = useState<"directorio" | "transacciones" | "garantias">("directorio");

  // Filters
  const [selectedProveedorId, setSelectedProveedorId] = useState<string>("TODOS");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>("TODAS");
  const [filtroGarantia, setFiltroGarantia] = useState<string>("TODAS");
  const [filtroEstatusPago, setFiltroEstatusPago] = useState<string>("TODOS");

  // Modals state
  const [isCompraModalOpen, setIsCompraModalOpen] = useState(false);
  const [isAbonoModalOpen, setIsAbonoModalOpen] = useState(false);
  const [isNewProveedorModalOpen, setIsNewProveedorModalOpen] = useState(false);
  const [abonoDefaultProveedorId, setAbonoDefaultProveedorId] = useState<string | undefined>();
  const [abonoDefaultCompraId, setAbonoDefaultCompraId] = useState<string | undefined>();
  const [abonoDefaultCompraIds, setAbonoDefaultCompraIds] = useState<string[] | undefined>();
  const [abonoDefaultMonto, setAbonoDefaultMonto] = useState<number | undefined>();
  const [selectedTicketIdsInTable, setSelectedTicketIdsInTable] = useState<string[]>([]);

  // Ticket Detalle Modal State
  const [ticketDetalleModal, setTicketDetalleModal] = useState<{
    isOpen: boolean;
    compraId: string | null;
    compra: CompraConProveedor | null;
  }>({
    isOpen: false,
    compraId: null,
    compra: null,
  });

  // Lightbox State
  const [lightboxData, setLightboxData] = useState<{
    isOpen: boolean;
    evidenciaUrl: string | null;
    folio: string;
    proveedorNombre?: string;
    descripcion?: string;
    monto?: number;
    fechaCompra?: string;
    fechaVencimientoGarantia?: string;
    estatusGarantia?: string;
  }>({
    isOpen: false,
    evidenciaUrl: null,
    folio: "",
  });

  // New Proveedor Form
  const [newProvData, setNewProvData] = useState<ProveedorInsert>({
    empresa_id: empresaId,
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
  const [guardandoProveedor, setGuardandoProveedor] = useState(false);
  const [provErrorMsg, setProvErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (empresaId) {
      cargarDatosCompletos();
    }
  }, [empresaId]);

  const cargarDatosCompletos = async () => {
    setLoading(true);
    try {
      const [provRes, comprasRes, abonosRes, cxpRes] = await Promise.all([
        ProveedorService.obtenerProveedores(empresaId),
        ProveedorService.obtenerCompras({ empresaId }),
        ProveedorService.obtenerAbonos({ empresaId }),
        ProveedorService.obtenerResumenCxP(empresaId),
      ]);

      setProveedores(provRes.data || []);
      setCompras(comprasRes.data || []);
      setAbonos(abonosRes.data || []);
      setResumenCxP(cxpRes);
    } catch (err) {
      console.error("Error al cargar datos de proveedores:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCrearProveedor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProvData.nombre_comercial.trim()) {
      setProvErrorMsg("El nombre comercial es obligatorio");
      return;
    }
    setGuardandoProveedor(true);
    setProvErrorMsg(null);

    const res = await ProveedorService.crearProveedor({
      ...newProvData,
      empresa_id: empresaId,
    });

    if (res.error) {
      setProvErrorMsg(res.error);
      setGuardandoProveedor(false);
    } else {
      setGuardandoProveedor(false);
      setIsNewProveedorModalOpen(false);
      cargarDatosCompletos();
    }
  };

  const handleCambiarEstatusGarantia = async (
    compraId: string,
    nuevoEstatus: "VIGENTE" | "EXPIRADA" | "EN_RECLAMACION" | "APLICADA" | "RECHAZADA"
  ) => {
    const res = await ProveedorService.actualizarEstatusGarantia(compraId, nuevoEstatus);
    if (res.success) {
      setCompras((prev) =>
        prev.map((c) => (c.id === compraId ? { ...c, estatus_garantia: nuevoEstatus } : c))
      );
    }
  };

  const handleOpenLightbox = (compra: CompraConProveedor) => {
    setLightboxData({
      isOpen: true,
      evidenciaUrl: compra.evidencia_url,
      folio: compra.folio_ticket_nota,
      proveedorNombre: compra.proveedor?.nombre_comercial,
      descripcion: compra.descripcion,
      monto: compra.monto_costo,
      fechaCompra: compra.fecha_compra,
      fechaVencimientoGarantia: compra.fecha_vencimiento_garantia || undefined,
      estatusGarantia: compra.estatus_garantia,
    });
  };

  const handleOpenTicketDetalle = (compra: CompraConProveedor) => {
    setTicketDetalleModal({
      isOpen: true,
      compraId: compra.id,
      compra,
    });
  };

  const handleAbonarTicket = (compra: DetalleTicketCompra) => {
    setAbonoDefaultProveedorId(compra.proveedor_id);
    setAbonoDefaultCompraId(compra.id);
    setAbonoDefaultCompraIds([compra.id]);
    setAbonoDefaultMonto(compra.monto_saldo_pendiente);
    setIsAbonoModalOpen(true);
  };

  // Filtrado de Compras
  const comprasFiltradas = compras.filter((c) => {
    if (selectedProveedorId !== "TODOS" && c.proveedor_id !== selectedProveedorId) return false;
    if (filtroEstatusPago !== "TODOS" && c.estatus_pago !== filtroEstatusPago) return false;
    if (filtroGarantia !== "TODAS" && c.estatus_garantia !== filtroGarantia) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchFolio = c.folio_ticket_nota.toLowerCase().includes(q);
      const matchDesc = c.descripcion.toLowerCase().includes(q);
      const matchProv = c.proveedor?.nombre_comercial.toLowerCase().includes(q) || false;
      if (!matchFolio && !matchDesc && !matchProv) return false;
    }
    return true;
  });

  // Garantías Activas
  const garantiasList = compras.filter((c) => {
    if (selectedProveedorId !== "TODOS" && c.proveedor_id !== selectedProveedorId) return false;
    if (filtroGarantia !== "TODAS" && c.estatus_garantia !== filtroGarantia) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchFolio = c.folio_ticket_nota.toLowerCase().includes(q);
      const matchDesc = c.descripcion.toLowerCase().includes(q);
      const matchProv = c.proveedor?.nombre_comercial.toLowerCase().includes(q) || false;
      if (!matchFolio && !matchDesc && !matchProv) return false;
    }
    return true;
  });

  const totalGarantiasVigentes = compras.filter((c) => c.estatus_garantia === "VIGENTE").length;

  return (
    <div className="min-h-screen bg-slate-50/70 p-4 md:p-8 space-y-6">
      {/* Encabezado y Acciones Rápidas */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-primary/10 text-primary rounded-xl">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
              Proveedores, Cuentas por Pagar & Garantías
            </h1>
          </div>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Bodega de tickets digitales, seguimiento de garantías con proveedores y control de estados de cuenta a crédito.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => {
              setAbonoDefaultProveedorId(undefined);
              setIsAbonoModalOpen(true);
            }}
            className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300/80 rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <DollarSign className="w-4 h-4 text-emerald-600" />
            Registrar Abono
          </button>

          <button
            onClick={() => setIsCompraModalOpen(true)}
            className="px-3.5 py-2 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-300/80 rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 text-sky-600" />
            Nueva Compra / Refacción
          </button>

          <button
            onClick={() => {
              setProvErrorMsg(null);
              setIsNewProveedorModalOpen(true);
            }}
            className="px-3.5 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Building2 className="w-4 h-4" />
            Nuevo Proveedor
          </button>
        </div>
      </div>

      {/* KPI Cards / Métricas de Finanzas y Garantías */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Deuda Total Acumulada */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Deuda Total CxP</span>
            <DollarSign className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            ${resumenCxP.totalDeudaAcumulada.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {resumenCxP.proveedoresConDeuda} proveedor{resumenCxP.proveedoresConDeuda === 1 ? "" : "es"} con saldo deudor
          </p>
        </div>

        {/* Facturas Vencidas */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Facturas Vencidas</span>
            <Clock className="w-4 h-4 text-red-500" />
          </div>
          <div className={`text-2xl font-black mt-2 ${resumenCxP.comprasVencidas > 0 ? "text-red-600" : "text-slate-900"}`}>
            {resumenCxP.comprasVencidas}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Requieren liquidación urgente</p>
        </div>

        {/* Garantías Vigentes */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Garantías Vigentes</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-2">
            {totalGarantiasVigentes}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Piezas cubiertas con ticket</p>
        </div>

        {/* Total Proveedores Registrados */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Directorio</span>
            <Building2 className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {proveedores.length}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Socios y mayoristas activos</p>
        </div>
      </div>

      {/* Navegación por Pestañas */}
      <div className="flex items-center justify-between border-b border-slate-200">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("directorio")}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-colors cursor-pointer flex items-center gap-2 border-b-2 ${
              activeTab === "directorio"
                ? "bg-white text-primary border-primary shadow-xs"
                : "text-slate-500 hover:text-slate-800 border-transparent"
            }`}
          >
            <Building2 className="w-4 h-4" />
            Directorio & Estados de Cuenta ({proveedores.length})
          </button>

          <button
            onClick={() => setActiveTab("transacciones")}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-colors cursor-pointer flex items-center gap-2 border-b-2 ${
              activeTab === "transacciones"
                ? "bg-white text-primary border-primary shadow-xs"
                : "text-slate-500 hover:text-slate-800 border-transparent"
            }`}
          >
            <CreditCard className="w-4 h-4" />
            Historial de Compras & Abonos ({compras.length})
          </button>

          <button
            onClick={() => setActiveTab("garantias")}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-colors cursor-pointer flex items-center gap-2 border-b-2 ${
              activeTab === "garantias"
                ? "bg-white text-emerald-700 border-emerald-600 shadow-xs"
                : "text-slate-500 hover:text-slate-800 border-transparent"
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Bodega de Garantías & Tickets ({compras.length})
          </button>
        </div>

        <button
          onClick={cargarDatosCompletos}
          disabled={loading}
          className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          title="Actualizar datos"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* ========================================================================= */}
      {/* PESTAÑA 1: DIRECTORIO & ESTADOS DE CUENTA */}
      {/* ========================================================================= */}
      {activeTab === "directorio" && (
        <div className="space-y-4">
          {/* Barra de Filtros por Categoría */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {[
                { id: "TODAS", label: "Todos", count: proveedores.length },
                { id: "LLANTAS", label: "🛞 Llantas", count: proveedores.filter((p) => (p.categoria || "").toUpperCase() === "LLANTAS").length },
                { id: "SUSPENSION", label: "🔩 Suspensión y Refacciones", count: proveedores.filter((p) => (p.categoria || "").toUpperCase() === "SUSPENSION").length },
                { id: "TORNO_MAQUILA", label: "⚙️ Torno y Maquilas", count: proveedores.filter((p) => (p.categoria || "").toUpperCase() === "TORNO_MAQUILA").length },
                { id: "OTROS", label: "📦 Otros", count: proveedores.filter((p) => !["LLANTAS", "SUSPENSION", "TORNO_MAQUILA"].includes((p.categoria || "").toUpperCase())).length },
              ].map((cat) => {
                const isSelected = categoriaSeleccionada === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setCategoriaSeleccionada(cat.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                      isSelected
                        ? "bg-slate-900 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
                    }`}
                  >
                    <span>{cat.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        isSelected ? "bg-slate-700 text-white" : "bg-white text-slate-500 border border-slate-200"
                      }`}
                    >
                      {cat.count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por nombre o teléfono..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8.5 pl-8 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full py-16 flex justify-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : proveedores.length === 0 ? (
            <div className="col-span-full py-16 text-center text-slate-400 text-sm bg-white rounded-2xl border border-slate-200">
              No hay proveedores registrados. Da de alta al primero usando el botón "+ Nuevo Proveedor".
            </div>
          ) : (
            proveedores
              .filter((prov) => {
                const matchCat =
                  categoriaSeleccionada === "TODAS" ||
                  (prov.categoria || "SUSPENSION").toUpperCase() === categoriaSeleccionada.toUpperCase();
                const q = searchQuery.toLowerCase().trim();
                const matchQuery =
                  !q ||
                  prov.nombre_comercial.toLowerCase().includes(q) ||
                  (prov.contacto_nombre && prov.contacto_nombre.toLowerCase().includes(q)) ||
                  (prov.telefono && prov.telefono.includes(q));
                return matchCat && matchQuery;
              })
              .map((prov) => {
                const cat = (prov.categoria || "SUSPENSION").toUpperCase();
                const isLlanta = cat === "LLANTAS";
                const isSuspension = cat === "SUSPENSION";
                const isTorno = cat === "TORNO_MAQUILA";
              const tieneDeuda = (prov.saldo_deudor_actual || 0) > 0;
              const porcentajeCreditoUsado =
                prov.limite_credito > 0
                  ? Math.min(100, Math.round(((prov.saldo_deudor_actual || 0) / prov.limite_credito) * 100))
                  : 0;

              return (
                <div
                  key={prov.id}
                  className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow"
                >
                  <div>
                    {/* Header Card */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap mb-1">
                          <span
                            className={`px-2 py-0.2 rounded-full text-[9px] font-bold border ${
                              isLlanta
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : isSuspension
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : isTorno
                                ? "bg-purple-50 text-purple-700 border-purple-200"
                                : "bg-slate-100 text-slate-700 border-slate-200"
                            }`}
                          >
                            {isLlanta ? "🛞 Llantas" : isSuspension ? "🔩 Suspensión" : isTorno ? "⚙️ Torno" : "📦 Insumos"}
                          </span>
                        </div>
                        <h3 className="font-bold text-slate-900 text-base">{prov.nombre_comercial}</h3>
                        {prov.razon_social && (
                          <p className="text-[11px] text-slate-500 line-clamp-1">{prov.razon_social}</p>
                        )}
                        {prov.rfc && <p className="text-[10px] text-slate-400 font-mono mt-0.5">RFC: {prov.rfc}</p>}
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        {prov.dias_credito > 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            {prov.dias_credito} días crédito
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                            Contado
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" /> {prov.meses_garantia_default}m garantía
                        </span>
                      </div>
                    </div>

                    {/* Finanzas & Crédito */}
                    <div className="mt-4 p-3 bg-slate-50 rounded-xl space-y-2">
                      <div className="flex justify-between items-baseline">
                        <span className="text-[11px] text-slate-500 font-medium">Saldo Deudor:</span>
                        <span
                          className={`font-black text-base ${
                            tieneDeuda ? "text-amber-700" : "text-emerald-700"
                          }`}
                        >
                          ${Number(prov.saldo_deudor_actual || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      {prov.limite_credito > 0 && (
                        <div>
                          <div className="flex justify-between text-[10px] text-slate-400">
                            <span>Límite: ${Number(prov.limite_credito).toLocaleString("es-MX")}</span>
                            <span>{porcentajeCreditoUsado}% usado</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mt-1">
                            <div
                              className={`h-full rounded-full transition-all ${
                                porcentajeCreditoUsado > 80 ? "bg-red-500" : "bg-primary"
                              }`}
                              style={{ width: `${porcentajeCreditoUsado}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Contacto */}
                    <div className="mt-3 space-y-1 text-xs text-slate-600">
                      {prov.contacto_nombre && (
                        <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
                          <span>Asesor:</span> <strong className="text-slate-800">{prov.contacto_nombre}</strong>
                        </p>
                      )}
                      {prov.telefono && (
                        <div className="flex items-center justify-between pt-1">
                          <span className="flex items-center gap-1 text-[11px] text-slate-500">
                            <Phone className="w-3.5 h-3.5 text-slate-400" /> {prov.telefono}
                          </span>
                          {prov.whatsapp && (
                            <a
                              href={`https://wa.me/${prov.whatsapp.replace(/[^0-9]/g, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded text-[10px] font-bold flex items-center gap-1 transition-colors"
                            >
                              <MessageSquare className="w-3 h-3 text-emerald-600" /> WhatsApp
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedProveedorId(prov.id);
                        setActiveTab("transacciones");
                      }}
                      className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer text-center"
                    >
                      Ver Estado de Cuenta
                    </button>
                    {tieneDeuda && (
                      <button
                        onClick={() => {
                          setAbonoDefaultProveedorId(prov.id);
                          setIsAbonoModalOpen(true);
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <DollarSign className="w-3.5 h-3.5" /> Abonar
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PESTAÑA 2: HISTORIAL DE TRANSACCIONES (COMPRAS & ABONOS) */}
      {/* ========================================================================= */}
      {activeTab === "transacciones" && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden space-y-4 p-5">
          {/* Barra de Filtros */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={selectedProveedorId}
                onChange={(e) => setSelectedProveedorId(e.target.value)}
                className="h-9 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-1 focus:ring-primary"
              >
                <option value="TODOS">Todos los Proveedores</option>
                {proveedores.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre_comercial}
                  </option>
                ))}
              </select>

              <select
                value={filtroEstatusPago}
                onChange={(e) => setFiltroEstatusPago(e.target.value)}
                className="h-9 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-1 focus:ring-primary"
              >
                <option value="TODOS">Todos los Estatus de Pago</option>
                <option value="PAGADO">Pagado</option>
                <option value="PENDIENTE">Pendiente (A Crédito)</option>
                <option value="PARCIAL">Pago Parcial</option>
              </select>
            </div>

            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por folio, nota o refacción..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Tabla de Compras */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3 w-8 text-center">
                    <input
                      type="checkbox"
                      title="Seleccionar todos los tickets con saldo"
                      checked={
                        comprasFiltradas.filter((c) => c.monto_saldo_pendiente > 0).length > 0 &&
                        comprasFiltradas
                          .filter((c) => c.monto_saldo_pendiente > 0)
                          .every((c) => selectedTicketIdsInTable.includes(c.id))
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          const idsConSaldo = comprasFiltradas
                            .filter((c) => c.monto_saldo_pendiente > 0)
                            .map((c) => c.id);
                          setSelectedTicketIdsInTable(idsConSaldo);
                        } else {
                          setSelectedTicketIdsInTable([]);
                        }
                      }}
                      className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-3">Fecha</th>
                  <th className="py-3 px-3">Folio / Ticket</th>
                  <th className="py-3 px-3">Proveedor</th>
                  <th className="py-3 px-3">Descripción / Refacción</th>
                  <th className="py-3 px-3 text-right">Costo Total</th>
                  <th className="py-3 px-3 text-right">Saldo Pendiente</th>
                  <th className="py-3 px-3">Fuente Pago</th>
                  <th className="py-3 px-3 text-center">Estatus Pago</th>
                  <th className="py-3 px-3 text-center">Ticket / Evidencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {comprasFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400">
                      No se encontraron compras con los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  comprasFiltradas.map((compra) => (
                    <tr
                      key={compra.id}
                      onClick={() => handleOpenTicketDetalle(compra)}
                      className={`hover:bg-sky-50/60 transition-colors cursor-pointer group ${
                        selectedTicketIdsInTable.includes(compra.id) ? "bg-sky-50/40" : ""
                      }`}
                      title="Haz clic para ver el detalle completo de este ticket"
                    >
                      <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        {compra.monto_saldo_pendiente > 0 ? (
                          <input
                            type="checkbox"
                            checked={selectedTicketIdsInTable.includes(compra.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedTicketIdsInTable([...selectedTicketIdsInTable, compra.id]);
                              } else {
                                setSelectedTicketIdsInTable(
                                  selectedTicketIdsInTable.filter((id) => id !== compra.id)
                                );
                              }
                            }}
                            className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer"
                          />
                        ) : (
                          <span className="text-slate-300 text-[10px]">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-900 whitespace-nowrap">
                        {compra.fecha_compra}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-sky-700 group-hover:text-sky-900 whitespace-nowrap">
                        #{compra.folio_ticket_nota}
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-800">
                        {compra.proveedor?.nombre_comercial || "Proveedor"}
                      </td>
                      <td className="py-3 px-3 text-slate-700 max-w-xs truncate" title={compra.descripcion}>
                        {compra.descripcion}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900 whitespace-nowrap">
                        ${Number(compra.monto_costo).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <span
                          className={`font-black ${
                            compra.monto_saldo_pendiente > 0 ? "text-amber-700" : "text-emerald-600"
                          }`}
                        >
                          ${Number(compra.monto_saldo_pendiente).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-[11px] text-slate-500 whitespace-nowrap">
                        {compra.fuente_pago.replace("_", " ")}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                            compra.estatus_pago === "PAGADO"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : compra.estatus_pago === "PARCIAL"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {compra.estatus_pago}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenTicketDetalle(compra);
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-sky-100 text-slate-700 hover:text-sky-900 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200/60"
                        >
                          <Eye className="w-3.5 h-3.5 text-sky-600" />
                          <span>Ver Detalle</span>
                          {compra.evidencia_url && (
                            <span
                              className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"
                              title="Comprobante digital adjunto"
                            />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* BARRA FLOTANTE DE PAGO MULTI-TICKET */}
          {selectedTicketIdsInTable.length > 0 && (
            <div className="sticky bottom-4 z-20 bg-slate-900 text-white p-3.5 sm:px-6 sm:py-4 rounded-2xl shadow-2xl border border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in slide-in-from-bottom-3 mt-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-sm text-slate-100 flex items-center gap-2">
                    <span>{selectedTicketIdsInTable.length} ticket(s) seleccionado(s)</span>
                    <span className="text-slate-500">•</span>
                    <span className="text-emerald-400 font-mono font-black text-base">
                      $
                      {compras
                        .filter((c) => selectedTicketIdsInTable.includes(c.id))
                        .reduce((acc, c) => acc + Number(c.monto_saldo_pendiente || 0), 0)
                        .toLocaleString("es-MX", { minimumFractionDigits: 2 })}{" "}
                      MXN
                    </span>
                  </p>
                  <p className="text-xs text-slate-400">
                    Abona o liquida estos tickets en una sola transferencia o salida de caja
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setSelectedTicketIdsInTable([])}
                  className="px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl font-semibold text-xs cursor-pointer transition-colors"
                >
                  Desmarcar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const ticketsSeleccionados = compras.filter((c) =>
                      selectedTicketIdsInTable.includes(c.id)
                    );
                    const provId = ticketsSeleccionados[0]?.proveedor_id;
                    setAbonoDefaultProveedorId(provId);
                    setAbonoDefaultCompraIds(selectedTicketIdsInTable);
                    setIsAbonoModalOpen(true);
                  }}
                  className="h-11 px-5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer"
                >
                  <DollarSign className="w-4 h-4" />
                  Pagar {selectedTicketIdsInTable.length} Ticket(s) Seleccionado(s)
                </button>
              </div>
            </div>
          )}

          {/* Sección de Abonos Históricos */}
          {abonos.length > 0 && (
            <div className="pt-6 border-t border-slate-200 mt-6">
              <h3 className="font-bold text-slate-900 text-sm mb-3 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                Historial de Abonos y Pagos a Proveedores ({abonos.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Fecha y Hora</th>
                      <th className="py-2.5 px-3">Proveedor</th>
                      <th className="py-2.5 px-3">Monto Abonado</th>
                      <th className="py-2.5 px-3">Método de Pago</th>
                      <th className="py-2.5 px-3">Referencia / Rastreo</th>
                      <th className="py-2.5 px-3">Ticket Aplicado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {abonos.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50/80">
                        <td className="py-2 px-3 whitespace-nowrap">
                          {new Date(a.fecha_abono).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })}
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-900">
                          {a.proveedor?.nombre_comercial || "Proveedor"}
                        </td>
                        <td className="py-2 px-3 font-black text-emerald-700">
                          ${Number(a.monto).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2 px-3 font-medium text-slate-600">
                          {a.metodo_pago.replace("_", " ")}
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-500">
                          {a.referencia || "S/R"}
                        </td>
                        <td className="py-2 px-3 text-slate-600">
                          {a.compra?.folio_ticket_nota ? `#${a.compra.folio_ticket_nota}` : "Cuenta corriente general"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* PESTAÑA 3: BODEGA DE GARANTÍAS & TICKETS ANTERIORES */}
      {/* ========================================================================= */}
      {activeTab === "garantias" && (
        <div className="space-y-4">
          {/* Barra de Filtros de Garantía */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-600">Estatus Garantía:</span>
              {["TODAS", "VIGENTE", "EN_RECLAMACION", "APLICADA", "EXPIRADA"].map((st) => (
                <button
                  key={st}
                  onClick={() => setFiltroGarantia(st)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    filtroGarantia === st
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {st.replace("_", " ")}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar ticket, refacción o proveedor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Grid de Fichas de Garantía */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {garantiasList.length === 0 ? (
              <div className="col-span-full py-16 text-center text-slate-400 text-sm bg-white rounded-2xl border border-slate-200">
                No se encontraron refacciones o tickets con los filtros de garantía seleccionados.
              </div>
            ) : (
              garantiasList.map((compra) => {
                const isVigente = compra.estatus_garantia === "VIGENTE";
                const isReclamacion = compra.estatus_garantia === "EN_RECLAMACION";
                const isAplicada = compra.estatus_garantia === "APLICADA";

                return (
                  <div
                    key={compra.id}
                    className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 flex flex-col justify-between hover:border-slate-300 transition-colors"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                          Nota #{compra.folio_ticket_nota}
                        </span>

                        <span
                          className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase flex items-center gap-1 ${
                            isVigente
                              ? "bg-emerald-100 text-emerald-800"
                              : isReclamacion
                              ? "bg-amber-100 text-amber-800"
                              : isAplicada
                              ? "bg-blue-100 text-blue-800"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          <ShieldCheck className="w-3 h-3" />
                          {compra.estatus_garantia.replace("_", " ")}
                        </span>
                      </div>

                      {/* Info de la refacción */}
                      <h4 className="font-bold text-slate-900 text-sm mt-3 line-clamp-2">
                        {compra.descripcion}
                      </h4>
                      <p className="text-xs text-slate-500 font-semibold mt-0.5">
                        Proveedor: <span className="text-slate-800">{compra.proveedor?.nombre_comercial}</span>
                      </p>

                      {/* Fechas de Cobertura */}
                      <div className="mt-4 p-3 bg-slate-50 rounded-xl space-y-1.5 text-xs text-slate-600">
                        <div className="flex justify-between">
                          <span>Fecha de compra:</span>
                          <strong className="text-slate-800">{compra.fecha_compra}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>Plazo de garantía:</span>
                          <strong className="text-slate-800">{compra.meses_garantia} mes(es)</strong>
                        </div>
                        {compra.fecha_vencimiento_garantia && (
                          <div className="flex justify-between pt-1 border-t border-slate-200">
                            <span className="font-medium text-slate-700">Vence:</span>
                            <strong className={isVigente ? "text-emerald-700" : "text-slate-500"}>
                              {compra.fecha_vencimiento_garantia}
                            </strong>
                          </div>
                        )}
                        <div className="flex justify-between pt-1">
                          <span>Costo refacción:</span>
                          <strong className="text-slate-900">
                            ${Number(compra.monto_costo).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                          </strong>
                        </div>
                      </div>
                    </div>

                    {/* Acciones y Ver Ticket */}
                    <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                      <button
                        type="button"
                        onClick={() => handleOpenTicketDetalle(compra)}
                        className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                      >
                        <Eye className="w-4 h-4 text-sky-400" />
                        Ver Detalle del Ticket
                        {compra.evidencia_url && (
                          <span
                            className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"
                            title="Tiene comprobante digital"
                          />
                        )}
                      </button>

                      {/* Selector rápido de estatus */}
                      <div className="flex items-center gap-1.5">
                        <select
                          value={compra.estatus_garantia}
                          onChange={(e) => handleCambiarEstatusGarantia(compra.id, e.target.value as any)}
                          className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700"
                        >
                          <option value="VIGENTE">Vigente</option>
                          <option value="EN_RECLAMACION">En Reclamación (Con Proveedor)</option>
                          <option value="APLICADA">Garantía Aplicada (Cambio recibido)</option>
                          <option value="RECHAZADA">Rechazada por Proveedor</option>
                          <option value="EXPIRADA">Expirada</option>
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALES DEL SISTEMA */}
      {/* ========================================================================= */}

      {/* 1. Modal Alta / Compra Refacción con Evidencia */}
      <ProveedorEvidenceModal
        isOpen={isCompraModalOpen}
        onClose={() => setIsCompraModalOpen(false)}
        empresaId={empresaId}
        onCompraRegistrada={() => {
          setIsCompraModalOpen(false);
          cargarDatosCompletos();
        }}
      />

      {/* 2. Modal Registrar Abono */}
      <RegistrarAbonoModal
        isOpen={isAbonoModalOpen}
        onClose={() => {
          setIsAbonoModalOpen(false);
          setAbonoDefaultCompraId(undefined);
          setAbonoDefaultCompraIds(undefined);
          setAbonoDefaultMonto(undefined);
        }}
        empresaId={empresaId}
        defaultProveedorId={abonoDefaultProveedorId}
        defaultCompraId={abonoDefaultCompraId}
        defaultCompraIds={abonoDefaultCompraIds}
        defaultMonto={abonoDefaultMonto}
        proveedores={proveedores}
        onAbonoRegistrado={() => {
          setIsAbonoModalOpen(false);
          setAbonoDefaultCompraId(undefined);
          setAbonoDefaultCompraIds(undefined);
          setAbonoDefaultMonto(undefined);
          setSelectedTicketIdsInTable([]);
          cargarDatosCompletos();
        }}
      />

      {/* 3. Modal Detalle Integral del Ticket / Factura */}
      <DetalleTicketProveedorModal
        isOpen={ticketDetalleModal.isOpen}
        onClose={() =>
          setTicketDetalleModal({ isOpen: false, compraId: null, compra: null })
        }
        compraId={ticketDetalleModal.compraId}
        compraInicial={ticketDetalleModal.compra}
        empresaId={empresaId}
        onAbonarClick={handleAbonarTicket}
        onTicketActualizado={() => {
          cargarDatosCompletos();
        }}
      />

      {/* 4. Modal Lightbox Evidencia */}
      <TicketEvidenceLightbox
        isOpen={lightboxData.isOpen}
        onClose={() => setLightboxData({ ...lightboxData, isOpen: false })}
        evidenciaUrl={lightboxData.evidenciaUrl}
        folio={lightboxData.folio}
        proveedorNombre={lightboxData.proveedorNombre}
        descripcion={lightboxData.descripcion}
        monto={lightboxData.monto}
        fechaCompra={lightboxData.fechaCompra}
        fechaVencimientoGarantia={lightboxData.fechaVencimientoGarantia}
        estatusGarantia={lightboxData.estatusGarantia}
      />

      {/* 4. Modal Nuevo Proveedor */}
      {isNewProveedorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
              <h3 className="font-bold text-slate-800 text-sm">Nuevo Proveedor / Mayorista</h3>
              <button
                onClick={() => setIsNewProveedorModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCrearProveedor} className="p-6 space-y-3.5 text-xs">
              {provErrorMsg && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{provErrorMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="font-semibold text-slate-700 block mb-1">Nombre Comercial *</label>
                  <input
                    type="text"
                    required
                    placeholder="ej. AYON, TERSA, AUTOZONE, OBAL ZAPATA"
                    value={newProvData.nombre_comercial}
                    onChange={(e) => setNewProvData({ ...newProvData, nombre_comercial: e.target.value })}
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-1 focus:ring-primary font-bold"
                  />
                </div>

                <div className="col-span-2">
                  <label className="font-semibold text-slate-700 block mb-1">Giro / Categoría Comercial</label>
                  <select
                    value={newProvData.categoria || "SUSPENSION"}
                    onChange={(e) => {
                      const newCat = e.target.value;
                      setNewProvData({
                        ...newProvData,
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
                    placeholder="0"
                    value={newProvData.dias_credito === 0 ? "" : newProvData.dias_credito}
                    onChange={(e) => setNewProvData({ ...newProvData, dias_credito: e.target.value === "" ? 0 : parseInt(e.target.value) || 0 })}
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-1 focus:ring-primary font-bold"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Límite de Crédito ($ MXN)</label>
                  <input
                    type="number"
                    min={0}
                    step="100"
                    placeholder="0.00"
                    value={newProvData.limite_credito === 0 ? "" : newProvData.limite_credito}
                    onChange={(e) => setNewProvData({ ...newProvData, limite_credito: e.target.value === "" ? 0 : parseFloat(e.target.value) || 0 })}
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-1 focus:ring-primary font-bold"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Garantía Estándar (Meses)</label>
                  <select
                    value={newProvData.meses_garantia_default}
                    onChange={(e) => setNewProvData({ ...newProvData, meses_garantia_default: parseInt(e.target.value) || 1 })}
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
                    value={newProvData.telefono || ""}
                    onChange={(e) => setNewProvData({ ...newProvData, telefono: e.target.value, whatsapp: e.target.value })}
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="col-span-2">
                  <label className="font-semibold text-slate-700 block mb-1">Nombre de Asesor / Contacto</label>
                  <input
                    type="text"
                    placeholder="ej. Lic. Fernando Ortiz (Ventas Taller)"
                    value={newProvData.contacto_nombre || ""}
                    onChange={(e) => setNewProvData({ ...newProvData, contacto_nombre: e.target.value })}
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewProveedorModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoProveedor}
                  className="px-5 py-2 font-bold text-white bg-primary hover:bg-primary/90 rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {guardandoProveedor && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Crear Proveedor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
