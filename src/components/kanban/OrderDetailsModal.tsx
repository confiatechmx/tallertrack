"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/context/TenantContext";
import { ConcurrencyService } from "@/services/concurrencyService";
import { generatePaymentLink } from "@/app/actions/payments";
import { calcularCuotasBNPL } from "@/lib/bnpl";
import { ReceiptModal } from "@/components/caja/ReceiptModal";
import { OrderPrintSheet } from "./OrderPrintSheet";
import { AuditTimeline } from "@/components/audit/AuditTimeline";
import { TicketEvidenceLightbox } from "@/components/proveedores/TicketEvidenceLightbox";
import { ProveedorEvidenceModal } from "@/components/proveedores/ProveedorEvidenceModal";
import { ProveedorService, type Proveedor } from "@/services/proveedorService";
import { toast } from "sonner";
import {
  Loader2,
  User,
  Car,
  Clock,
  Wrench,
  Plus,
  Trash2,
  CheckCircle2,
  Package,
  Banknote,
  CreditCard,
  Landmark,
  Building2,
  Smartphone,
  ExternalLink,
  MessageCircle,
  AlertTriangle,
  AlertCircle,
  FileText,
  ClipboardCheck,
  Printer,
  Receipt,
  ArrowRight,
  Calculator,
  TrendingUp,
  History,
  Check,
  Save,
  Sparkles,
  Camera,
  ShieldCheck,
  CircleDot,
  Zap,
  Copy,
  CheckCheck,
  Layers,
  Gift,
  Pencil,
  Tag,
  FolderTree,
  Percent,
  Unlock,
  Coins,
  Split,
} from "lucide-react";

import {
  CajaTurnoService,
  type CajaTurno,
  type CajaFondo,
} from "@/services/cajaTurnoService";
import { AbrirTurnoModal } from "@/components/caja/AbrirTurnoModal";
import { SplitPaymentManager } from "@/components/caja/SplitPaymentManager";
import { MultiPaymentService, type PaymentSplitItem } from "@/services/multiPaymentService";

import {
  TOP_TIRE_BRANDS,
  PROVEEDORES_LLANTAS,
  POPULAR_RIMS,
  POPULAR_TIRE_SIZES,
  parseMedidaExpress,
  inferOemTireSize,
} from "@/lib/tires/tireSpeedHelpers";

import {
  groupItemsByOperation,
  buildFourTiresPromoBundle,
  DEFAULT_OPERATION_PACKAGES,
  OperationGroup,
} from "@/lib/services/serviceOperationsEngine";

interface OrderDetailsModalProps {
  orderId: string;
  onClose: () => void;
  onUpdate: () => void;
}

type WorkspaceTab = "cotizacion" | "dvi" | "pagos" | "impresion" | "auditoria";

const PROVEEDORES_REFACCIONES = [
  "AutoZone Comercial",
  "Rolcar",
  "EuroPartes Culiacán",
  "Orma Autopartes",
  "Agencia OEM",
  "Brembo México",
];

const BAHIAS_TALLER = [
  "Rampa 1 (Alineación)",
  "Rampa 2 (Frenos / Susp.)",
  "Rampa 3 (Mecánica Gral.)",
  "Rampa 4 (Servicio Rápido)",
  "Bahía Diagnóstico",
  "Patio Entrega",
];

const CHECKLIST_ITEMS = [
  { key: "llanta_refaccion", label: "Llanta de refacción" },
  { key: "gato_herramienta", label: "Gato y herramienta" },
  { key: "tarjeta_circulacion", label: "Tarjeta de circulación" },
  { key: "objetos_valor", label: "Sin objetos de valor" },
  { key: "birlo_seguridad", label: "Birlo de seguridad" },
];

const DEFAULT_DVI_TEMPLATE = [
  {
    categoria: "Frenos",
    punto_inspeccion: "Balatas y Discos Delanteros / Traseros",
    severidad: "verde",
    observaciones: "Espesor dentro de rango operativo (>6mm).",
    recomendacion: "Limpieza y ajuste en próximo servicio.",
    costo_estimado: 0,
  },
  {
    categoria: "Suspensión y Dirección",
    punto_inspeccion: "Amortiguadores, Horquillas y Terminales",
    severidad: "verde",
    observaciones: "Sin fugas hidráulicas ni juego en rótulas.",
    recomendacion: "Verificar alineación cada 10,000 km.",
    costo_estimado: 0,
  },
  {
    categoria: "Neumáticos",
    punto_inspeccion: "Profundidad de Dibujo y Presión PSI",
    severidad: "amarillo",
    observaciones: "Desgaste ligero en hombros delanteros (4/32\").",
    recomendacion: "Rotación, balanceo y alineación por computadora.",
    costo_estimado: 930,
  },
  {
    categoria: "Motor y Fluidos",
    punto_inspeccion: "Aceite de Motor, Anticongelante y Líquido de Frenos",
    severidad: "verde",
    observaciones: "Niveles completos y viscosidad adecuada.",
    recomendacion: "Cambio programado en 5,000 km.",
    costo_estimado: 0,
  },
  {
    categoria: "Sistema Eléctrico",
    punto_inspeccion: "Batería (CCA), Alternador y Luces Exteriores",
    severidad: "verde",
    observaciones: "Voltaje de carga 14.1V estable.",
    recomendacion: "Sin acción requerida.",
    costo_estimado: 0,
  },
  {
    categoria: "Seguridad y Chasis",
    punto_inspeccion: "Bandas, Mangueras, Escape y Limpiaparabrisas",
    severidad: "verde",
    observaciones: "Sin grietas ni fugas visibles en línea inferior.",
    recomendacion: "Revisión visual completada.",
    costo_estimado: 0,
  },
];

export function OrderDetailsModal({ orderId, onClose, onUpdate }: OrderDetailsModalProps) {
  const { empresa, sucursalActiva, perfil } = useTenant();
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("cotizacion");
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<any>(null);
  const [mechanics, setMechanics] = useState<any[]>([]);
  const [availableServices, setAvailableServices] = useState<any[]>([]);
  const [availableTires, setAvailableTires] = useState<any[]>([]);
  const [deferredWorks, setDeferredWorks] = useState<any[]>([]);
  const [activePaymentProviders, setActivePaymentProviders] = useState<any[]>([]);

  // Labor state
  const [isAddingService, setIsAddingService] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [serviceMechanicId, setServiceMechanicId] = useState("");
  const [servicePrice, setServicePrice] = useState<string>("");
  const [serviceHours, setServiceHours] = useState<string>("1.0");
  const [serviceCommission, setServiceCommission] = useState<string>("15");
  const [serviceNotes, setServiceNotes] = useState<string>("");
  const [servicePackage, setServicePackage] = useState<string>("Llantas y Ruedas");
  const [serviceIsCortesia, setServiceIsCortesia] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editingServicePrice, setEditingServicePrice] = useState<string>("");
  const [quoteViewMode, setQuoteViewMode] = useState<"operaciones" | "clasico">("operaciones");
  const [addingServiceLoading, setAddingServiceLoading] = useState(false);

  // Buyout Refacciones state (Margin Calculator & Garantías Integradas)
  const [isAddingPart, setIsAddingPart] = useState(false);
  const [partNombre, setPartNombre] = useState("");
  const [partNumero, setPartNumero] = useState("");
  const [proveedoresCatalogo, setProveedoresCatalogo] = useState<Proveedor[]>([]);
  const [selectedProveedorId, setSelectedProveedorId] = useState<string>("");
  const [partProveedor, setPartProveedor] = useState(PROVEEDORES_REFACCIONES[0]);
  const [partCantidad, setPartCantidad] = useState<number>(1);
  const [partCostoUnitario, setPartCostoUnitario] = useState<string>("");
  const [partMargen, setPartMargen] = useState<string>(
    String(empresa?.margen_refacciones_default ?? 35)
  );
  const [partPrecioVentaManual, setPartPrecioVentaManual] = useState<string>("");
  const [partPackage, setPartPackage] = useState<string>("Suspensión y Dirección");
  const [addingPartLoading, setAddingPartLoading] = useState(false);

  // Garantía y Evidencias integradas en el alta de refacciones
  const [showGarantiaSection, setShowGarantiaSection] = useState(false);
  const [partFolioTicket, setPartFolioTicket] = useState("");
  const [partMesesGarantia, setPartMesesGarantia] = useState<number>(12);
  const [partFileEvidencia, setPartFileEvidencia] = useState<File | null>(null);
  const [partRegistrarCajaChica, setPartRegistrarCajaChica] = useState(false);
  const [partFuentePago, setPartFuentePago] = useState<"CAJA_CHICA" | "TRANSFERENCIA" | "CREDITO_PENDIENTE">("CAJA_CHICA");

  // Carga de catálogo de proveedores reales
  useEffect(() => {
    const fetchProveedores = async () => {
      const targetEmpresaId = empresa?.id || order?.empresa_id;
      if (!targetEmpresaId) return;
      const { data } = await ProveedorService.obtenerProveedores(targetEmpresaId);
      if (data && data.length > 0) {
        setProveedoresCatalogo(data);
        if (!selectedProveedorId) {
          setSelectedProveedorId(data[0].id);
          setPartProveedor(data[0].nombre_comercial);
          if (data[0].meses_garantia_default) {
            setPartMesesGarantia(data[0].meses_garantia_default);
          }
        }
      }
    };
    fetchProveedores();
  }, [empresa?.id, order?.empresa_id]);

  // Supplier Evidence & Warranty modal states
  const [selectedTicketEvidence, setSelectedTicketEvidence] = useState<{
    evidenciaUrl: string | null;
    folio: string;
    proveedorNombre?: string;
    descripcion?: string;
    monto?: number;
    fechaCompra?: string;
    fechaVencimientoGarantia?: string;
    estatusGarantia?: string;
  } | null>(null);
  const [attachingPartForEvidence, setAttachingPartForEvidence] = useState<any | null>(null);
  const [isRegistrarTicketModalOpen, setIsRegistrarTicketModalOpen] = useState(false);

  // Tires state
  const [isAddingTire, setIsAddingTire] = useState(false);
  const [tireTab, setTireTab] = useState<"jit" | "catalogo">("jit");
  const [selectedTireId, setSelectedTireId] = useState("");
  const [selectedTireQty, setSelectedTireQty] = useState(4);
  const [addingTireLoading, setAddingTireLoading] = useState(false);

  // Just-In-Time Tire Quoter fields
  const [jitMedidaExpress, setJitMedidaExpress] = useState("");
  const [jitAncho, setJitAncho] = useState<number>(205);
  const [jitPerfil, setJitPerfil] = useState<number>(55);
  const [jitRin, setJitRin] = useState<number>(16);
  const [jitMarca, setJitMarca] = useState("Michelin");
  const [jitModelo, setJitModelo] = useState("Primacy 4");
  const [jitProveedor, setJitProveedor] = useState(PROVEEDORES_LLANTAS[0]);
  const [jitCantidad, setJitCantidad] = useState<number>(4);
  const [jitCostoUnitario, setJitCostoUnitario] = useState<string>("");
  const [jitMargen, setJitMargen] = useState<string>("25");
  const [jitPrecioVentaUnitario, setJitPrecioVentaUnitario] = useState<string>("");
  const [jitIndiceCarga, setJitIndiceCarga] = useState("91V");
  const [jitTipoTerreno, setJitTipoTerreno] = useState("HT");
  const [copiedWhatsAppTireQuote, setCopiedWhatsAppTireQuote] = useState(false);

  // DVI & Reception state
  const [dviItems, setDviItems] = useState<any[]>([]);
  const [isAddingDvi, setIsAddingDvi] = useState(false);
  const [newDviCategoria, setNewDviCategoria] = useState("Frenos");
  const [newDviPunto, setNewDviPunto] = useState("");
  const [newDviSeveridad, setNewDviSeveridad] = useState<"verde" | "amarillo" | "rojo">("amarillo");
  const [newDviObs, setNewDviObs] = useState("");
  const [newDviRec, setNewDviRec] = useState("");
  const [newDviCosto, setNewDviCosto] = useState("");
  const [newDviFoto, setNewDviFoto] = useState("");
  const [savingDviLoading, setSavingDviLoading] = useState(false);

  // Reception fields state
  const [recProblema, setRecProblema] = useState("");
  const [recDiagnostico, setRecDiagnostico] = useState("");
  const [recBahia, setRecBahia] = useState("");
  const [recKilometraje, setRecKilometraje] = useState<string>("");
  const [recGasolina, setRecGasolina] = useState("1/2");
  const [recChecklist, setRecChecklist] = useState<Record<string, boolean>>({
    llanta_refaccion: true,
    gato_herramienta: true,
    tarjeta_circulacion: true,
    objetos_valor: false,
    birlo_seguridad: true,
  });
  const [savingReception, setSavingReception] = useState(false);
  const [receptionSavedToast, setReceptionSavedToast] = useState(false);

  // Payments & Official POS state
  const [isAddingPayment, setIsAddingPayment] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedReceiptPayment, setSelectedReceiptPayment] = useState<any>(null);
  const [receiptPaymentsList, setReceiptPaymentsList] = useState<any[]>([]);
  const [receiptCashGiven, setReceiptCashGiven] = useState<number | undefined>();
  const [receiptChangeDue, setReceiptChangeDue] = useState<number | undefined>();
  const [turnoActivo, setTurnoActivo] = useState<CajaTurno | null>(null);
  const [fondos, setFondos] = useState<CajaFondo[]>([]);
  const [isAbrirTurnoOpen, setIsAbrirTurnoOpen] = useState(false);
  const [posPaymentMethod, setPosPaymentMethod] = useState<"Efectivo" | "TPV" | "SPEI" | "SPLIT" | "BNPL">("Efectivo");
  const [cashGiven, setCashGiven] = useState<string>("");
  const [tpvType, setTpvType] = useState("BanBajío TPV (Débito/Crédito)");
  const [tpvAuth, setTpvAuth] = useState("");
  const [speiRastreo, setSpeiRastreo] = useState("");
  const [bnplProvider, setBnplProvider] = useState<"KueskiPay" | "Atrato" | "Stripe">("KueskiPay");
  const [bnplReference, setBnplReference] = useState("");
  const [splitPayments, setSplitPayments] = useState<PaymentSplitItem[]>([]);
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [paymentProvider, setPaymentProvider] = useState("Efectivo");
  const [paymentMetodoDetalle, setPaymentMetodoDetalle] = useState("Efectivo en Caja");
  const [paymentReferencia, setPaymentReferencia] = useState("");
  const [paymentMode, setPaymentMode] = useState<"directo" | "link">("directo");
  const [addingPaymentLoading, setAddingPaymentLoading] = useState(false);
  const [paymentStatusMessage, setPaymentStatusMessage] = useState("");
  const [applyCashDiscount, setApplyCashDiscount] = useState(true);
  const [cuentasBancarias, setCuentasBancarias] = useState<any[]>([]);
  const [selectedCuentaBancariaId, setSelectedCuentaBancariaId] = useState<string>("");

  useEffect(() => {
    if (empresa?.margen_refacciones_default) {
      setPartMargen(String(empresa.margen_refacciones_default));
    }
  }, [empresa?.margen_refacciones_default]);

  const loadWorkspaceData = async () => {
    if (!orderId) return;
    setLoading(true);

    const [
      { data: orderData, error: orderError },
      { data: mechData },
      { data: srvData },
      { data: tiresData },
      { data: providersData },
      { data: dviData },
      { data: cuentasBancariasData },
    ] = await Promise.all([
      supabase
        .from("ordenes_servicio")
        .select(
          `
          *,
          vehiculos (
            id, marca, modelo, anio, color, placas, vin, medida_oem, kilometraje_actual,
            clientes ( id, nombre, telefono, correo, rfc, empresa )
          ),
          orden_servicio_servicios (
            id, servicio_id, mecanico_id, cantidad, horas_labor, precio_cobrado, comision_porcentaje, estatus_aprobacion, notas, paquete_operacion, es_cortesia, garantia_especifica,
            servicios_taller ( id, nombre, codigo_sku, categoria, horas_estimadas, precio, garantia_meses, condicion_promo )
          ),
          orden_servicio_refacciones (
            id, nombre, numero_parte, proveedor, cantidad, costo_unitario, margen_porcentaje, precio_unitario, subtotal, estatus_aprobacion, paquete_operacion, es_cortesia, garantia_especifica, compra_proveedor_id,
            compras_proveedores (
              id, folio_ticket_nota, meses_garantia, fecha_compra, fecha_vencimiento_garantia, estatus_garantia, evidencia_url, evidencia_tipo, descripcion, monto_costo,
              proveedores ( nombre_comercial )
            )
          ),
          cotizaciones (
            id, total,
            detalles_cotizacion (
              id, cantidad, precio_unitario, subtotal, estatus_aprobacion, paquete_operacion, es_cortesia, garantia_especifica,
              inventario_llantas ( id, marca, modelo_llanta, rin, ancho, perfil, stock_actual, costo_adquisicion )
            )
          ),
          pagos_orden (
            id, monto_total, proveedor_pago, metodo_detalle, referencia, estatus, external_transaction_id, comision_pasarela, fecha_pago, deleted_at, descuento_aplicado, cuenta_bancaria_id,
            cuenta_bancaria:cuentas_bancarias ( id, banco, alias, clabe, es_fiscal )
          )
        `
        )
        .eq("id", orderId)
        .single(),
      supabase.from("empleados").select("*").eq("activo", true).order("nombre"),
      supabase.from("servicios_taller").select("*").eq("activo", true).order("nombre"),
      supabase.from("inventario_llantas").select("*").order("marca"),
      supabase.from("configuracion_pagos").select("*").eq("activo", true),
      supabase
        .from("inspecciones_dvi")
        .select("*")
        .eq("orden_servicio_id", orderId)
        .order("created_at", { ascending: true }),
      supabase
        .from("cuentas_bancarias")
        .select("*")
        .eq("activo", true)
        .order("es_fiscal", { ascending: false })
        .order("alias", { ascending: true }),
    ]);

    if (!orderError && orderData) {
      const activePagos = (orderData.pagos_orden || []).filter((p: any) => !p.deleted_at);
      const enrichedOrder = {
        ...orderData,
        orden_servicio_servicios: orderData.orden_servicio_servicios || [],
        orden_servicio_refacciones: orderData.orden_servicio_refacciones || [],
        pagos_orden: activePagos,
        inspecciones_dvi: dviData || [],
      };
      setOrder(enrichedOrder);
      setDviItems(dviData || []);

      const validCuentas = (cuentasBancariasData as any[]) || [];
      const targetEmpresaId = orderData.empresa_id || empresa?.id;
      const filteredCuentas = validCuentas.filter(
        (cb) => !cb.empresa_id || cb.empresa_id === targetEmpresaId
      );
      setCuentasBancarias(filteredCuentas);
      if (filteredCuentas.length > 0) {
        setSelectedCuentaBancariaId((prev) => prev || filteredCuentas[0].id);
      }

      // Init reception fields
      setRecProblema(orderData.problema_reportado || orderData.notas_recepcion || "");
      setRecDiagnostico(orderData.diagnostico_tecnico || "");
      setRecBahia(orderData.bahia_rampa || "");
      setRecKilometraje(String(orderData.kilometraje_ingreso || ""));
      setRecGasolina(orderData.nivel_gasolina || "1/2");
      if (orderData.checklist_recepcion && typeof orderData.checklist_recepcion === "object") {
        setRecChecklist(orderData.checklist_recepcion as Record<string, boolean>);
      }
      setServiceMechanicId(orderData.mecanico_id || "");

      // Load unresolved deferred works for this vehicle
      if (orderData.vehiculo_id) {
        const { data: difData } = await supabase
          .from("trabajos_diferidos")
          .select("*")
          .eq("vehiculo_id", orderData.vehiculo_id)
          .eq("resuelto", false)
          .order("created_at", { ascending: false });
        if (difData) {
          setDeferredWorks(difData);
          setOrder((prev: any) => ({ ...prev, trabajos_diferidos: difData }));
        }
      }
    }

    if (mechData) setMechanics(mechData);
    if (srvData) setAvailableServices(srvData);
    if (tiresData) setAvailableTires(tiresData);
    if (providersData) setActivePaymentProviders(providersData);

    // Cargar turno activo y fondos de caja oficiales
    const isCova = (empresa?.subdominio === "cova") || (empresa?.nombre_comercial || "").toLowerCase().includes("cova") || (typeof window !== "undefined" && window.location.hostname.includes("cova"));
    const targetSucId = (orderData && orderData.sucursal_id) || sucursalActiva?.id || (isCova ? "b2ad09db-0a34-4876-9ca3-d584c40bd295" : "b0000000-0000-0000-0000-000000000001");
    const targetEmpId = (orderData && orderData.empresa_id) || empresa?.id || (isCova ? "b2ad09db-0a34-4876-9ca3-d584c40bd294" : "a0000000-0000-0000-0000-000000000001");

    try {
      const [shiftRes, fondosRes] = await Promise.all([
        CajaTurnoService.obtenerTurnoActivo(targetSucId, targetEmpId),
        CajaTurnoService.obtenerFondos(targetSucId, targetEmpId),
      ]);
      setTurnoActivo(shiftRes);
      setFondos(fondosRes);
    } catch (e) {
      console.warn("Error cargando turno/fondos en workspace:", e);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadWorkspaceData();
  }, [orderId]);

  // Financial & Profitability calculations
  const servicesList = order?.orden_servicio_servicios || [];
  const partsList = order?.orden_servicio_refacciones || [];
  const tiresList = order?.cotizaciones?.detalles_cotizacion || [];
  const pagosList = order?.pagos_orden || [];

  const activeServices = servicesList.filter((s: any) => s.estatus_aprobacion !== "Diferido");
  const activeParts = partsList.filter((r: any) => r.estatus_aprobacion !== "Diferido");
  const activeTires = tiresList.filter((t: any) => t.estatus_aprobacion !== "Diferido");

  const operationGroups = useMemo(() => {
    return groupItemsByOperation(activeTires, activeServices, activeParts);
  }, [activeTires, activeServices, activeParts]);

  const subtotalServicios = activeServices.reduce(
    (acc: number, s: any) => acc + Number(s.precio_cobrado || 0) * Number(s.cantidad || 1),
    0
  );
  const subtotalRefacciones = activeParts.reduce(
    (acc: number, r: any) => acc + Number(r.subtotal || 0),
    0
  );
  const costoRefacciones = activeParts.reduce(
    (acc: number, r: any) => acc + Number(r.costo_unitario || 0) * Number(r.cantidad || 1),
    0
  );
  const subtotalLlantas = activeTires.reduce(
    (acc: number, t: any) => acc + Number(t.subtotal || 0),
    0
  );
  const costoLlantas = activeTires.reduce(
    (acc: number, t: any) =>
      acc +
      Number(t.inventario_llantas?.costo_adquisicion || Number(t.precio_unitario || 0) * 0.72) *
        Number(t.cantidad || 1),
    0
  );

  const comisionTecnicoTotal = activeServices.reduce((acc: number, s: any) => {
    const lineTotal = Number(s.precio_cobrado || 0) * Number(s.cantidad || 1);
    const pct = Number(s.comision_porcentaje ?? 15);
    return acc + lineTotal * (pct / 100);
  }, 0);

  const granTotal = subtotalServicios + subtotalRefacciones + subtotalLlantas;
  const costoTotalDirecto = costoRefacciones + costoLlantas + comisionTecnicoTotal;
  const utilidadBruta = granTotal - costoTotalDirecto;
  const margenBrutoPct = granTotal > 0 ? (utilidadBruta / granTotal) * 100 : 0;

  const totalPagado = pagosList
    .filter((p: any) => (p.estatus === "Aprobado" || p.estatus === "COMPLETADO") && !p.deleted_at)
    .reduce((acc: number, p: any) => acc + Number(p.monto_total || 0), 0);
  const totalDescuentosEnPagos = pagosList
    .filter((p: any) => (p.estatus === "Aprobado" || p.estatus === "COMPLETADO") && !p.deleted_at)
    .reduce((acc: number, p: any) => acc + Number(p.descuento_aplicado || 0), 0);
  const totalDescuentoOrden = Math.max(Number(order?.descuento_efectivo_monto || 0), totalDescuentosEnPagos);
  const saldoPendiente = Math.max(0, granTotal - totalPagado - totalDescuentoOrden);

  // POS Cash Discount & Tender calculations
  const hasCashDiscount = Boolean(
    empresa?.descuento_efectivo_habilitado && Number(empresa?.descuento_efectivo_porcentaje || 0) > 0
  );
  const cashDiscountPct = hasCashDiscount ? Number(empresa?.descuento_efectivo_porcentaje) : 0;
  const cashAhorro = (hasCashDiscount && applyCashDiscount && saldoPendiente > 0)
    ? Math.round((saldoPendiente * (cashDiscountPct / 100)) * 100) / 100
    : 0;
  const cashTotalPorCobrar = Math.max(0, Number((saldoPendiente - cashAhorro).toFixed(2)));

  const cashGivenVal = cashGiven === "" ? 0 : parseFloat(cashGiven) || 0;
  const cashChangeVal = Math.max(0, cashGivenVal - cashTotalPorCobrar);
  const cashFaltanteVal = Math.max(0, cashTotalPorCobrar - cashGivenVal);

  useEffect(() => {
    if (posPaymentMethod === "SPLIT" && splitPayments.length === 0 && saldoPendiente > 0) {
      const mitad = Math.round((saldoPendiente / 2) * 100) / 100;
      const f1 = fondos.find((f) => f.tipo === "OPERATIVO") || fondos[0];
      setSplitPayments([
        {
          id: "sp-1",
          metodo: "Efectivo",
          monto: mitad,
          montoRecibido: mitad,
          cambio: 0,
          cajaFondoId: f1?.id,
          detalle: "Efectivo en Mostrador",
        },
        {
          id: "sp-2",
          metodo: "Tarjeta",
          monto: Number((saldoPendiente - mitad).toFixed(2)),
          detalle: "BanBajío Tarjeta (TPV)",
        },
      ]);
    }
  }, [posPaymentMethod, saldoPendiente, fondos]);

  // Live Buyout Margin Calculator values (Bidireccional)
  const numericCosto = parseFloat(partCostoUnitario) || 0;
  const numericMargen = parseFloat(partMargen) || 0;
  const numericCant = Math.max(1, Number(partCantidad) || 1);
  const calcPrecioUnitario = partPrecioVentaManual !== ""
    ? (parseFloat(partPrecioVentaManual) || 0)
    : Math.round(numericCosto * (1 + numericMargen / 100) * 100) / 100;
  const calcSubtotal = Math.round(calcPrecioUnitario * numericCant * 100) / 100;
  const calcUtilidad = Math.round((calcSubtotal - numericCosto * numericCant) * 100) / 100;

  const handleCostoPartChange = (val: string) => {
    setPartCostoUnitario(val);
    const c = parseFloat(val) || 0;
    if (c > 0 && numericMargen > 0) {
      const p = Math.round(c * (1 + numericMargen / 100) * 100) / 100;
      setPartPrecioVentaManual(String(p));
    }
  };

  const handleMargenPartChange = (val: string) => {
    setPartMargen(val);
    const m = parseFloat(val) || 0;
    if (numericCosto > 0) {
      const p = Math.round(numericCosto * (1 + m / 100) * 100) / 100;
      setPartPrecioVentaManual(String(p));
    }
  };

  const handlePrecioVentaPartChange = (val: string) => {
    setPartPrecioVentaManual(val);
    const p = parseFloat(val) || 0;
    if (numericCosto > 0 && p > 0) {
      const m = Math.round(((p - numericCosto) / numericCosto) * 100 * 10) / 10;
      setPartMargen(String(m));
    }
  };

  const handleSelectProveedor = (provIdOrName: string) => {
    const found = proveedoresCatalogo.find((p) => p.id === provIdOrName || p.nombre_comercial === provIdOrName);
    if (found) {
      setSelectedProveedorId(found.id);
      setPartProveedor(found.nombre_comercial);
      if (found.meses_garantia_default) {
        setPartMesesGarantia(found.meses_garantia_default);
      }
    } else {
      setSelectedProveedorId("");
      setPartProveedor(provIdOrName);
    }
  };

  // Live Just-in-Time Tire Calculator & Express Parser
  const parseMedidaExpress = (input: string) => {
    setJitMedidaExpress(input);
    const cleaned = input.trim().replace(/\s+/g, "");

    // 1. Detectar marcas en el texto copiado (ej. "205/55R16 Michelin" o "225 65 17 Linglong")
    const brandCandidates = [
      "Michelin", "Bridgestone", "Continental", "Goodyear", "Pirelli", "Hankook",
      "Tornel", "Firestone", "Yokohama", "Kumho", "Nexen", "Goodride", "Linglong",
      "BFGoodrich", "Toyo", "Cooper", "Falken", "General", "Dunlop", "Maxxis",
      "Royal Black", "Haida", "Waterfall", "Westlake"
    ];
    for (const b of brandCandidates) {
      if (new RegExp(`\\b${b}\\b`, "i").test(input)) {
        setJitMarca(b);
        break;
      }
    }

    // 2. Medidas milimétricas estándar (ej. 205/55R16, 225-65-17, 265 70 17)
    const match = cleaned.match(/(\d{3})[\/\-]??(\d{2})[rR\/\-]??(\d{2})/i);
    if (match) {
      const a = parseInt(match[1]);
      const p = parseInt(match[2]);
      const r = parseInt(match[3]);
      if (a >= 135 && a <= 335) setJitAncho(a);
      if (p >= 25 && p <= 85) setJitPerfil(p);
      if (r >= 12 && r <= 24) setJitRin(r);
      return;
    }

    // 3. Medidas de flotación en pulgadas (ej. 33x12.50R15, 35x12.50R17, 31x10.50R15)
    const matchFlot = cleaned.match(/(\d{2})x(\d{2}(?:\.\d{1,2})?)[rR](\d{2})/i);
    if (matchFlot) {
      const diam = parseInt(matchFlot[1]);
      const anchoFlot = Math.round(parseFloat(matchFlot[2]));
      const r = parseInt(matchFlot[3]);
      setJitAncho(diam);
      setJitPerfil(anchoFlot);
      setJitRin(r);
      return;
    }
  };

  const numericJitCosto = parseFloat(jitCostoUnitario) || 0;
  const numericJitMargen = parseFloat(jitMargen) || 0;
  const numericJitCant = Math.max(1, Number(jitCantidad) || 1);

  const handleJitCostoChange = (val: string) => {
    setJitCostoUnitario(val);
    const c = parseFloat(val) || 0;
    const m = parseFloat(jitMargen) || 0;
    if (c > 0) {
      const p = Math.round(c * (1 + m / 100) * 100) / 100;
      setJitPrecioVentaUnitario(String(p));
    }
  };

  const handleJitMargenChange = (val: string) => {
    setJitMargen(val);
    const m = parseFloat(val) || 0;
    const c = parseFloat(jitCostoUnitario) || 0;
    if (c > 0) {
      const p = Math.round(c * (1 + m / 100) * 100) / 100;
      setJitPrecioVentaUnitario(String(p));
    }
  };

  const handleJitPrecioVentaChange = (val: string) => {
    setJitPrecioVentaUnitario(val);
    const p = parseFloat(val) || 0;
    const c = parseFloat(jitCostoUnitario) || 0;
    if (c > 0 && p > 0) {
      const m = Math.round(((p - c) / c) * 1000) / 10;
      setJitMargen(String(m));
    }
  };

  const calcJitPrecioUnitario = parseFloat(jitPrecioVentaUnitario) || Math.round(numericJitCosto * (1 + numericJitMargen / 100) * 100) / 100;
  const calcJitSubtotal = Math.round(calcJitPrecioUnitario * numericJitCant * 100) / 100;
  const calcJitUtilidad = Math.round((calcJitSubtotal - numericJitCosto * numericJitCant) * 100) / 100;

  // Accelerator 1: Vehicle OEM Tire Size Inference
  const veh = order?.vehiculos;
  const suggestedOemSize = veh?.medida_oem || inferOemTireSize(veh?.marca, veh?.modelo);

  // Accelerator 2: Live Typeahead Size Suggestions
  const allDistinctSizes = useMemo(() => {
    const sizes = new Set<string>();
    POPULAR_TIRE_SIZES.forEach((s) => sizes.add(s));
    availableTires.forEach((t) => {
      if (t.ancho && t.perfil && t.rin) {
        sizes.add(`${t.ancho}/${t.perfil}R${t.rin}`);
      }
    });
    return Array.from(sizes);
  }, [availableTires]);

  const matchingSizes = useMemo(() => {
    const q = jitMedidaExpress.trim().replace(/[\s\/\-R]/gi, "").toLowerCase();
    if (!q || q.length < 2) return [];
    return allDistinctSizes
      .filter((s) => {
        const cleanS = s.replace(/[\s\/\-R]/gi, "").toLowerCase();
        return cleanS.includes(q) && cleanS !== q;
      })
      .slice(0, 5);
  }, [jitMedidaExpress, allDistinctSizes]);

  // Accelerator 3: 3-Tier Presets (Económica / Calidad / Premium)
  const tierPresets = useMemo(() => {
    const exactTires = availableTires.filter(
      (t) =>
        Number(t.ancho) === Number(jitAncho) &&
        Number(t.perfil) === Number(jitPerfil) &&
        Number(t.rin) === Number(jitRin)
    );

    const ecoBrands = ["tornel", "goodride", "linglong", "westlake", "haida", "waterfall", "royal black", "blackhawk", "triangle", "sunfull"];
    const midBrands = ["continental", "firestone", "hankook", "kumho", "nexen", "yokohama", "toyo", "dunlop", "general"];
    const premBrands = ["michelin", "bridgestone", "pirelli", "goodyear", "bfgoodrich"];

    const foundEco = exactTires.find((t) =>
      ecoBrands.some((b) => (t.marca || "").toLowerCase().includes(b))
    );
    const foundMid = exactTires.find((t) =>
      midBrands.some((b) => (t.marca || "").toLowerCase().includes(b))
    );
    const foundPrem = exactTires.find((t) =>
      premBrands.some((b) => (t.marca || "").toLowerCase().includes(b))
    );

    const baseCost = Math.round(900 + Math.max(0, jitRin - 13) * 320);

    const ecoPreset = foundEco
      ? {
          marca: foundEco.marca,
          modelo: foundEco.modelo_llanta,
          costo: Number(foundEco.costo_adquisicion || 0),
          precio: Number(foundEco.precio_venta || 0),
          margen:
            Number(foundEco.costo_adquisicion) > 0
              ? Math.round(
                  ((Number(foundEco.precio_venta) - Number(foundEco.costo_adquisicion)) /
                    Number(foundEco.costo_adquisicion)) *
                    100
                )
              : 25,
          tipo_terreno: foundEco.tipo_terreno || "HT",
          badge: "Económica",
          source: "Catálogo",
        }
      : {
          marca: "Tornel",
          modelo: "Turbo / Real",
          costo: Math.round(baseCost * 0.85),
          precio: Math.round(baseCost * 0.85 * 1.25),
          margen: 25,
          tipo_terreno: "HT",
          badge: "Económica",
          source: "Estimado JIT",
        };

    const midPreset = foundMid
      ? {
          marca: foundMid.marca,
          modelo: foundMid.modelo_llanta,
          costo: Number(foundMid.costo_adquisicion || 0),
          precio: Number(foundMid.precio_venta || 0),
          margen:
            Number(foundMid.costo_adquisicion) > 0
              ? Math.round(
                  ((Number(foundMid.precio_venta) - Number(foundMid.costo_adquisicion)) /
                    Number(foundMid.costo_adquisicion)) *
                    100
                )
              : 25,
          tipo_terreno: foundMid.tipo_terreno || "HT",
          badge: "Calidad",
          source: "Catálogo",
        }
      : {
          marca: "Continental",
          modelo: "ProContact TX",
          costo: Math.round(baseCost * 1.25),
          precio: Math.round(baseCost * 1.25 * 1.25),
          margen: 25,
          tipo_terreno: "HT",
          badge: "Calidad",
          source: "Estimado JIT",
        };

    const premPreset = foundPrem
      ? {
          marca: foundPrem.marca,
          modelo: foundPrem.modelo_llanta,
          costo: Number(foundPrem.costo_adquisicion || 0),
          precio: Number(foundPrem.precio_venta || 0),
          margen:
            Number(foundPrem.costo_adquisicion) > 0
              ? Math.round(
                  ((Number(foundPrem.precio_venta) - Number(foundPrem.costo_adquisicion)) /
                    Number(foundPrem.costo_adquisicion)) *
                    100
                )
              : 25,
          tipo_terreno: foundPrem.tipo_terreno || "HT",
          badge: "Premium",
          source: "Catálogo",
        }
      : {
          marca: "Michelin",
          modelo: "Primacy 4",
          costo: Math.round(baseCost * 1.7),
          precio: Math.round(baseCost * 1.7 * 1.25),
          margen: 25,
          tipo_terreno: "HT",
          badge: "Premium",
          source: "Estimado JIT",
        };

    return { eco: ecoPreset, mid: midPreset, prem: premPreset };
  }, [availableTires, jitAncho, jitPerfil, jitRin]);

  const handleApplyTierPreset = (preset: any) => {
    setJitMarca(preset.marca);
    setJitModelo(preset.modelo);
    setJitCostoUnitario(String(preset.costo));
    setJitMargen(String(preset.margen));
    setJitPrecioVentaUnitario(String(preset.precio));
    if (preset.tipo_terreno) setJitTipoTerreno(preset.tipo_terreno);
  };

  // Accelerator 4: WhatsApp Tire Quote Generator
  const buildWhatsAppTireQuoteText = () => {
    const clienteNombre = order?.vehiculos?.clientes?.nombre || "Cliente";
    const vehiculoDesc = `${order?.vehiculos?.marca || "Vehículo"} ${order?.vehiculos?.modelo || ""}`.trim();
    const placas = order?.vehiculos?.placas ? ` (${order?.vehiculos?.placas})` : "";
    const tallerNombre = empresa?.nombre_comercial || "Cova Tires - Taller y Llantas";
    const folioDisplay = `#${1000 + Number(order?.folio || 1)}`;

    let lines: string[] = [];
    lines.push(`🛞 *Cotización de Neumáticos | ${tallerNombre}*`);
    lines.push(`¡Hola *${clienteNombre}*! Te compartimos la cotización preparada para tu *${vehiculoDesc}${placas}*:\n`);

    if (activeTires.length > 0) {
      activeTires.forEach((item: any, idx: number) => {
        const llanta = item.inventario_llantas;
        const cant = Number(item.cantidad || 1);
        const pUnit = Number(item.precio_unitario || 0);
        const sub = Number(item.subtotal || pUnit * cant);
        const medida = llanta ? `${llanta.ancho}/${llanta.perfil} R${llanta.rin}` : `${jitAncho}/${jitPerfil} R${jitRin}`;
        const marcaMod = llanta ? `${llanta.marca} ${llanta.modelo_llanta}` : "Neumático";

        lines.push(`*Opción ${idx + 1}:* ${marcaMod}`);
        lines.push(`• Medida: *${medida}*`);
        lines.push(`• Cantidad: ${cant} neumático(s)`);
        lines.push(`• Precio unitario: $${pUnit.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN`);
        lines.push(`• Subtotal: *$${sub.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN*\n`);
      });
    } else {
      lines.push(`*Opción Cotizada:* ${jitMarca} ${jitModelo}`);
      lines.push(`• Medida: *${jitAncho}/${jitPerfil} R${jitRin}*`);
      lines.push(`• Cantidad: ${numericJitCant} neumático(s)`);
      lines.push(`• Precio unitario: $${calcJitPrecioUnitario.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN`);
      lines.push(`• Total estimado: *$${calcJitSubtotal.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN*\n`);
    }

    lines.push(`✅ *Servicio incluye:*`);
    lines.push(`• Montaje profesional y válvulas nuevas`);
    lines.push(`• Balanceo computarizado de alta precisión`);
    lines.push(`• Garantía por escrito contra defecto de fábrica`);
    lines.push(`\n📍 *Cova Tires* | Folio de Orden: *${folioDisplay}*`);
    lines.push(`¿Deseas que te las reservemos de inmediato? Quedamos a tus órdenes.`);

    return lines.join("\n");
  };

  const handleCopyWhatsAppTireQuote = async () => {
    const text = buildWhatsAppTireQuoteText();
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        setCopiedWhatsAppTireQuote(true);
        setTimeout(() => setCopiedWhatsAppTireQuote(false), 2500);
      } else {
        alert("Cotización:\n\n" + text);
      }
    } catch (err) {
      console.error("Clipboard copy failed:", err);
    }
  };

  const handleSendWhatsAppTireQuoteDirect = () => {
    const rawPhone = order?.vehiculos?.clientes?.telefono || "";
    const cleanPhone = rawPhone.replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      alert("El cliente no tiene un teléfono celular válido registrado para WhatsApp.");
      return;
    }
    const text = buildWhatsAppTireQuoteText();
    window.open(`https://wa.me/52${cleanPhone.slice(-10)}?text=${encodeURIComponent(text)}`, "_blank");
  };

  // Handlers for Order Header
  const handleUpdateStatus = async (newStatus: string) => {
    const res = await ConcurrencyService.actualizarOrdenConcurrente({
      ordenId: orderId,
      expectedVersion: order?.version ?? 1,
      payload: { estado: newStatus },
    });
    if (!res.success) {
      if (res.conflict) {
        alert(res.message || "Conflicto de concurrencia al actualizar estado");
        await loadWorkspaceData();
      }
      return;
    }
    setOrder((prev: any) => ({ ...prev, estado: newStatus, version: res.nuevo_version ?? ((prev.version || 1) + 1) }));
    onUpdate();
  };

  const handleUpdateSubStatus = async (newSubStatus: string) => {
    const { error } = await supabase
      .from("ordenes_servicio")
      .update({ sub_estado: newSubStatus })
      .eq("id", orderId);
    if (!error) {
      setOrder((prev: any) => ({ ...prev, sub_estado: newSubStatus }));
      onUpdate();
    }
  };

  const handleUpdateMechanic = async (mechanicId: string) => {
    const val = mechanicId === "" ? null : mechanicId;
    const { error } = await supabase
      .from("ordenes_servicio")
      .update({ mecanico_id: val })
      .eq("id", orderId);
    if (!error) {
      setOrder((prev: any) => ({ ...prev, mecanico_id: val }));
      setServiceMechanicId(val || "");
      onUpdate();
    }
  };

  // Handler: Add Deferred Work to Current Order
  const handleAddDeferredToOrder = async (dif: any) => {
    // Check if there is a matching service in servicios_taller
    const matchedService = availableServices.find(
      (s) =>
        s.nombre.toLowerCase().includes(dif.concepto.toLowerCase()) ||
        dif.concepto.toLowerCase().includes(s.nombre.toLowerCase())
    );

    if (matchedService) {
      const mech = mechanics.find((m) => m.id === (order.mecanico_id || serviceMechanicId));
      const { data: newSrv } = await supabase
        .from("orden_servicio_servicios")
        .insert({
          orden_servicio_id: orderId,
          servicio_id: matchedService.id,
          mecanico_id: order.mecanico_id || null,
          cantidad: 1,
          horas_labor: matchedService.horas_estimadas || 1.0,
          precio_cobrado: dif.costo_estimado || matchedService.precio,
          comision_porcentaje: mech?.comision_porcentaje ?? 15,
          estatus_aprobacion: "Aprobado",
          notas: `Recuperado de trabajo diferido: ${dif.concepto}`,
        })
        .select(
          "id, servicio_id, mecanico_id, cantidad, horas_labor, precio_cobrado, comision_porcentaje, estatus_aprobacion, notas, servicios_taller(id, nombre, codigo_sku, categoria, horas_estimadas, precio)"
        )
        .single();

      if (newSrv) {
        setOrder((prev: any) => ({
          ...prev,
          orden_servicio_servicios: [...(prev.orden_servicio_servicios || []), newSrv],
        }));
      }
    } else {
      // Insert as Buyout / Part in orden_servicio_refacciones
      const precioVenta = Number(dif.costo_estimado || 1200);
      const margenDefault = Number(empresa?.margen_refacciones_default ?? 35);
      const costoEst = Math.round((precioVenta / (1 + margenDefault / 100)) * 100) / 100;

      const { data: newPart } = await supabase
        .from("orden_servicio_refacciones")
        .insert({
          orden_servicio_id: orderId,
          nombre: dif.concepto,
          numero_parte: "DIF-REC",
          proveedor: "AutoZone Comercial",
          cantidad: 1,
          costo_unitario: costoEst,
          margen_porcentaje: margenDefault,
          precio_unitario: precioVenta,
          subtotal: precioVenta,
          estatus_aprobacion: "Aprobado",
        })
        .select("*")
        .single();

      if (newPart) {
        setOrder((prev: any) => ({
          ...prev,
          orden_servicio_refacciones: [...(prev.orden_servicio_refacciones || []), newPart],
        }));
      }
    }

    await supabase.from("trabajos_diferidos").update({ resuelto: true }).eq("id", dif.id);
    setDeferredWorks((prev) => prev.filter((item) => item.id !== dif.id));
    onUpdate();
  };

  // Handlers for Labor (Mano de Obra)
  const handleSelectCatalogService = (srvId: string) => {
    setSelectedServiceId(srvId);
    const srv = availableServices.find((s) => s.id === srvId);
    if (srv) {
      setServicePrice(String(srv.precio || 0));
      setServiceHours(String(srv.horas_estimadas || 1.0));
    }
    const mech = mechanics.find((m) => m.id === (serviceMechanicId || order?.mecanico_id));
    if (mech?.comision_porcentaje) {
      setServiceCommission(String(mech.comision_porcentaje));
    }
  };

  const handleAddService = async () => {
    if (!selectedServiceId) return;
    const service = availableServices.find((s) => s.id === selectedServiceId);
    if (!service) return;
    setAddingServiceLoading(true);

    const finalPrice = serviceIsCortesia ? 0.0 : (parseFloat(servicePrice) || Number(service.precio || 0));

    const payload = {
      orden_servicio_id: orderId,
      servicio_id: service.id,
      mecanico_id: serviceMechanicId || order.mecanico_id || null,
      cantidad: 1,
      horas_labor: parseFloat(serviceHours) || Number(service.horas_estimadas || 1),
      precio_cobrado: finalPrice,
      comision_porcentaje: parseFloat(serviceCommission) || 15,
      estatus_aprobacion: "Aprobado",
      notas: serviceNotes.trim() || null,
      paquete_operacion: servicePackage || (service.categoria?.includes("Llantas") ? "Llantas y Ruedas" : "Mantenimiento y Servicios Generales"),
      es_cortesia: serviceIsCortesia,
    };

    const { data, error } = await supabase
      .from("orden_servicio_servicios")
      .insert(payload)
      .select(
        "id, servicio_id, mecanico_id, cantidad, horas_labor, precio_cobrado, comision_porcentaje, estatus_aprobacion, notas, paquete_operacion, es_cortesia, garantia_especifica, servicios_taller(id, nombre, codigo_sku, categoria, horas_estimadas, precio, garantia_meses, condicion_promo)"
      )
      .single();

    if (!error && data) {
      setOrder((prev: any) => ({
        ...prev,
        orden_servicio_servicios: [...(prev.orden_servicio_servicios || []), data],
      }));
      setIsAddingService(false);
      setSelectedServiceId("");
      setServiceNotes("");
      setServiceIsCortesia(false);
      onUpdate();
    }
    setAddingServiceLoading(false);
  };

  const handleInlineUpdateServicePrice = async (serviceId: string, newPrice: number, isCortesia?: boolean) => {
    const updates: any = { precio_cobrado: Math.max(0, newPrice) };
    if (isCortesia !== undefined) updates.es_cortesia = isCortesia;
    else if (newPrice === 0) updates.es_cortesia = true;

    const { error } = await supabase
      .from("orden_servicio_servicios")
      .update(updates)
      .eq("id", serviceId);

    if (!error) {
      setOrder((prev: any) => ({
        ...prev,
        orden_servicio_servicios: (prev.orden_servicio_servicios || []).map((s: any) =>
          s.id === serviceId ? { ...s, ...updates } : s
        ),
      }));
      setEditingServiceId(null);
      onUpdate();
    }
  };

  const handleToggleCortesia = async (row: any) => {
    const isCurrentlyCortesia = row.es_cortesia || Number(row.precio_cobrado) === 0;
    const targetPrice = isCurrentlyCortesia ? Number(row.servicios_taller?.precio || 150) : 0;
    const targetCortesia = !isCurrentlyCortesia;
    await handleInlineUpdateServicePrice(row.id, targetPrice, targetCortesia);
  };

  const handleApplyFourTiresPromo = async () => {
    const firstTire = activeTires[0]?.inventario_llantas;
    const rin = Number(firstTire?.rin) || jitRin || 16;
    const bundle = buildFourTiresPromoBundle(rin, 4, availableServices);

    setAddingServiceLoading(true);
    try {
      const addedServices: any[] = [];
      for (const item of bundle) {
        if (!item.servicio_id) continue;
        const payload = {
          orden_servicio_id: orderId,
          servicio_id: item.servicio_id,
          mecanico_id: order.mecanico_id || null,
          cantidad: item.cantidad,
          horas_labor: 0.25,
          precio_cobrado: item.precio_cobrado,
          comision_porcentaje: 15,
          estatus_aprobacion: "Aprobado",
          notas: item.notas,
          paquete_operacion: item.paquete_operacion,
          es_cortesia: item.es_cortesia,
          garantia_especifica: "Garantía Cova Tires de Montaje y Balanceo (6 meses / 10,000 km)",
        };

        const { data, error } = await supabase
          .from("orden_servicio_servicios")
          .insert(payload)
          .select(
            "id, servicio_id, mecanico_id, cantidad, horas_labor, precio_cobrado, comision_porcentaje, estatus_aprobacion, notas, paquete_operacion, es_cortesia, garantia_especifica, servicios_taller(id, nombre, codigo_sku, categoria, horas_estimadas, precio, garantia_meses, condicion_promo)"
          )
          .single();

        if (!error && data) {
          addedServices.push(data);
        }
      }

      if (addedServices.length > 0) {
        setOrder((prev: any) => ({
          ...prev,
          orden_servicio_servicios: [...(prev.orden_servicio_servicios || []), ...addedServices],
        }));
        onUpdate();
      }
    } catch (err: any) {
      console.error("Error applying 4-tire promo bundle:", err);
    } finally {
      setAddingServiceLoading(false);
    }
  };

  const handleToggleServiceApproval = async (row: any) => {
    const nextStatus = row.estatus_aprobacion === "Aprobado" ? "Pendiente" : "Aprobado";
    const { error } = await supabase
      .from("orden_servicio_servicios")
      .update({ estatus_aprobacion: nextStatus })
      .eq("id", row.id);
    if (!error) {
      setOrder((prev: any) => ({
        ...prev,
        orden_servicio_servicios: (prev.orden_servicio_servicios || []).map((s: any) =>
          s.id === row.id ? { ...s, estatus_aprobacion: nextStatus } : s
        ),
      }));
      onUpdate();
    }
  };

  const handleDeferService = async (row: any) => {
    const { error } = await supabase
      .from("orden_servicio_servicios")
      .update({ estatus_aprobacion: "Diferido" })
      .eq("id", row.id);

    if (!error) {
      // Also create a record in trabajos_diferidos
      const v = order.vehiculos;
      const c = v?.clientes;
      if (v?.id && c?.id) {
        const { data: newDif } = await supabase
          .from("trabajos_diferidos")
          .insert({
            vehiculo_id: v.id,
            cliente_id: c.id,
            orden_origen_id: orderId,
            concepto: row.servicios_taller?.nombre || "Servicio Diferido",
            categoria: row.servicios_taller?.categoria || "Mecánica General",
            severidad: "amarillo",
            costo_estimado: Number(row.precio_cobrado || 0),
            notas: row.notas || "Diferido desde orden de servicio",
            resuelto: false,
          })
          .select("*")
          .single();
        if (newDif) {
          setDeferredWorks((prev) => [newDif, ...prev]);
        }
      }

      setOrder((prev: any) => ({
        ...prev,
        orden_servicio_servicios: (prev.orden_servicio_servicios || []).map((s: any) =>
          s.id === row.id ? { ...s, estatus_aprobacion: "Diferido" } : s
        ),
      }));
      onUpdate();
    }
  };

  const handleRemoveService = async (relationId: string) => {
    const { error } = await supabase
      .from("orden_servicio_servicios")
      .delete()
      .eq("id", relationId);
    if (!error) {
      setOrder((prev: any) => ({
        ...prev,
        orden_servicio_servicios: (prev.orden_servicio_servicios || []).filter(
          (s: any) => s.id !== relationId
        ),
      }));
      onUpdate();
    }
  };

  // Handlers for Buyout Parts (Refacciones Sobre Pedido & Garantías)
  const handleAddPart = async () => {
    if (!partNombre.trim() || numericCosto <= 0) return;
    setAddingPartLoading(true);

    try {
      let evidenciaUrl: string | null = null;
      let storagePath: string | null = null;
      let evidenciaTipo: "IMAGE" | "PDF" | "OTHER" | null = null;
      let compraProveedorId: string | null = null;

      const targetEmpresaId = order?.empresa_id || empresa?.id;
      const targetSucursalId = order?.sucursal_id || sucursalActiva?.id;

      // 1. Subida de archivo si se adjuntó evidencia
      if (partFileEvidencia && targetEmpresaId) {
        const uploadRes = await ProveedorService.subirEvidenciaCompra(
          partFileEvidencia,
          targetEmpresaId,
          selectedProveedorId || "refacciones_directas"
        );
        evidenciaUrl = uploadRes.publicUrl;
        storagePath = uploadRes.storagePath;
        evidenciaTipo = partFileEvidencia.type.includes("pdf") ? "PDF" : "IMAGE";
      }

      // 2. Registro de compra a proveedor si se capturaron datos de garantía/factura o egreso de caja
      const tieneDatosCompra = Boolean(
        partFolioTicket.trim() ||
        showGarantiaSection ||
        partFileEvidencia ||
        partRegistrarCajaChica
      );

      if (tieneDatosCompra && targetEmpresaId) {
        const today = new Date();
        const fechaVencGarantia = new Date(today);
        fechaVencGarantia.setMonth(today.getMonth() + (partMesesGarantia || 12));

        const totalCompraCosto = Math.round(numericCosto * numericCant * 100) / 100;

        const { data: compraData, error: compraError } = await supabase
          .from("compras_proveedores")
          .insert({
            empresa_id: targetEmpresaId,
            sucursal_id: targetSucursalId || null,
            proveedor_id: selectedProveedorId || null,
            orden_servicio_id: orderId,
            folio_ticket_nota: partFolioTicket.trim() || `TICK-${Date.now().toString().slice(-6)}`,
            descripcion: `Refacción: ${partNombre.trim()}${partNumero ? ` (SKU: ${partNumero})` : ""} - Orden #${order?.folio || orderId.slice(0, 4)}`,
            monto_costo: totalCompraCosto,
            fuente_pago: partRegistrarCajaChica ? "CAJA_CHICA" : partFuentePago,
            estatus_pago: partFuentePago === "CREDITO_PENDIENTE" ? "PENDIENTE" : "PAGADO",
            monto_pagado: partFuentePago === "CREDITO_PENDIENTE" ? 0 : totalCompraCosto,
            monto_saldo_pendiente: partFuentePago === "CREDITO_PENDIENTE" ? totalCompraCosto : 0,
            fecha_compra: today.toISOString().split("T")[0],
            evidencia_url: evidenciaUrl,
            evidencia_storage_path: storagePath,
            evidencia_tipo: evidenciaTipo,
            meses_garantia: partMesesGarantia || 12,
            fecha_vencimiento_garantia: fechaVencGarantia.toISOString().split("T")[0],
            estatus_garantia: "VIGENTE",
          })
          .select("*, proveedores(nombre_comercial)")
          .single();

        if (!compraError && compraData) {
          compraProveedorId = compraData.id;

          // 3. Registrar egreso en caja física si se solicitó
          if (partRegistrarCajaChica && targetSucursalId) {
            const fondoOperativo = fondos.find((f) => f.tipo === "OPERATIVO") || fondos[0];
            await supabase.from("caja_movimientos").insert({
              empresa_id: targetEmpresaId,
              sucursal_id: targetSucursalId,
              caja_turno_id: turnoActivo?.id || null,
              caja_fondo_id: fondoOperativo?.id || null,
              tipo: "EGRESO",
              categoria: "PAGO_PROVEEDOR",
              concepto: `Pago refacción: ${partNombre.trim()} (Nota #${partFolioTicket.trim() || compraData.folio_ticket_nota})`,
              monto: totalCompraCosto,
              metodo_pago: "Efectivo",
              folio_ticket: partFolioTicket.trim() || compraData.folio_ticket_nota,
              comprobante_url: evidenciaUrl,
              orden_servicio_id: orderId,
              usuario_id: perfil?.id || null,
            });
          }
        }
      }

      // 4. Insertar la refacción en orden_servicio_refacciones
      const payload: any = {
        orden_servicio_id: orderId,
        empresa_id: targetEmpresaId,
        nombre: partNombre.trim(),
        numero_parte: partNumero.trim() || null,
        proveedor: partProveedor,
        proveedor_id: selectedProveedorId || null,
        cantidad: numericCant,
        costo_unitario: numericCosto,
        margen_porcentaje: numericMargen,
        precio_unitario: calcPrecioUnitario,
        subtotal: calcSubtotal,
        estatus_aprobacion: "Aprobado",
        paquete_operacion: partPackage || "Suspensión y Dirección",
        compra_proveedor_id: compraProveedorId,
        folio_ticket_nota: partFolioTicket.trim() || null,
        garantia_especifica: partMesesGarantia ? `${partMesesGarantia} meses` : null,
        evidencia_url: evidenciaUrl,
      };

      const { data, error } = await supabase
        .from("orden_servicio_refacciones")
        .insert(payload)
        .select("*, compras_proveedores(*, proveedores(nombre_comercial))")
        .single();

      if (!error && data) {
        setOrder((prev: any) => ({
          ...prev,
          orden_servicio_refacciones: [...(prev.orden_servicio_refacciones || []), data],
        }));
        setIsAddingPart(false);
        setPartNombre("");
        setPartNumero("");
        setPartCantidad(1);
        setPartCostoUnitario("");
        setPartPrecioVentaManual("");
        setPartFolioTicket("");
        setPartFileEvidencia(null);
        setPartRegistrarCajaChica(false);
        setShowGarantiaSection(false);
        toast.success("Refacción agregada con éxito");
        onUpdate();
      } else if (error) {
        toast.error("Error al guardar la refacción: " + error.message);
      }
    } catch (err: any) {
      console.error("Error al procesar refacción:", err);
      toast.error("Ocurrió un error al agregar la refacción");
    } finally {
      setAddingPartLoading(false);
    }
  };

  const handleDeferPart = async (part: any) => {
    const { error } = await supabase
      .from("orden_servicio_refacciones")
      .update({ estatus_aprobacion: "Diferido" })
      .eq("id", part.id);

    if (!error) {
      const v = order.vehiculos;
      const c = v?.clientes;
      if (v?.id && c?.id) {
        const { data: newDif } = await supabase
          .from("trabajos_diferidos")
          .insert({
            vehiculo_id: v.id,
            cliente_id: c.id,
            orden_origen_id: orderId,
            concepto: `${part.nombre} (${part.numero_parte || part.proveedor || "Refacción"})`,
            categoria: "Refacciones",
            severidad: "amarillo",
            costo_estimado: Number(part.subtotal || 0),
            notas: `Proveedor: ${part.proveedor || "Externo"}`,
            resuelto: false,
          })
          .select("*")
          .single();
        if (newDif) setDeferredWorks((prev) => [newDif, ...prev]);
      }

      setOrder((prev: any) => ({
        ...prev,
        orden_servicio_refacciones: (prev.orden_servicio_refacciones || []).map((r: any) =>
          r.id === part.id ? { ...r, estatus_aprobacion: "Diferido" } : r
        ),
      }));
      onUpdate();
    }
  };

  const handleRemovePart = async (partId: string) => {
    const { error } = await supabase
      .from("orden_servicio_refacciones")
      .delete()
      .eq("id", partId);
    if (!error) {
      setOrder((prev: any) => ({
        ...prev,
        orden_servicio_refacciones: (prev.orden_servicio_refacciones || []).filter(
          (r: any) => r.id !== partId
        ),
      }));
      onUpdate();
    }
  };

  // Handlers for Stock & Just-in-Time Tires
  const handleAddTire = async () => {
    if (!selectedTireId || selectedTireQty < 1) return;
    const tire = availableTires.find((t) => t.id === selectedTireId);
    if (!tire) return;
    setAddingTireLoading(true);

    try {
      const targetEmpresaId = order.empresa_id || empresa?.id;
      const targetSucursalId = order.sucursal_id || sucursalActiva?.id;

      let currentCotizacionId = order.cotizacion_id;
      if (!currentCotizacionId) {
        const { data: newCotizacion, error: cotError } = await supabase
          .from("cotizaciones")
          .insert({
            cliente_id: order.vehiculos?.clientes?.id || order.cliente_id,
            vehiculo_id: order.vehiculos?.id || order.vehiculo_id,
            estatus: "Aprobada",
            total: Number(tire.precio_venta || 0) * selectedTireQty,
            empresa_id: targetEmpresaId,
            sucursal_id: targetSucursalId || null,
          })
          .select("id")
          .single();
        if (!cotError && newCotizacion) {
          currentCotizacionId = newCotizacion.id;
          await supabase
            .from("ordenes_servicio")
            .update({ cotizacion_id: currentCotizacionId })
            .eq("id", orderId);
        }
      }

      if (currentCotizacionId) {
        const subtotalItem = Number(tire.precio_venta || 0) * selectedTireQty;
        const { data: newDetail, error: detailError } = await supabase
          .from("detalles_cotizacion")
          .insert({
            cotizacion_id: currentCotizacionId,
            llanta_id: tire.id,
            cantidad: selectedTireQty,
            precio_unitario: Number(tire.precio_venta || 0),
            subtotal: subtotalItem,
            estatus_aprobacion: "Aprobado",
            empresa_id: targetEmpresaId,
          })
          .select(
            "id, cantidad, precio_unitario, subtotal, estatus_aprobacion, inventario_llantas(id, marca, modelo_llanta, rin, ancho, perfil, stock_actual, costo_adquisicion)"
          )
          .single();

        if (!detailError && newDetail) {
          if (Number(tire.stock_actual) > 0) {
            await supabase
              .from("inventario_llantas_base")
              .update({ stock_actual: Math.max(0, Number(tire.stock_actual) - selectedTireQty) })
              .eq("id", tire.id);
          }

          const updatedCotizaciones = order.cotizaciones || { detalles_cotizacion: [] };
          setOrder((prev: any) => ({
            ...prev,
            cotizacion_id: currentCotizacionId,
            cotizaciones: {
              ...updatedCotizaciones,
              detalles_cotizacion: [...(updatedCotizaciones.detalles_cotizacion || []), newDetail],
            },
          }));
          setAvailableTires((prev) =>
            prev.map((t) =>
              t.id === tire.id ? { ...t, stock_actual: Math.max(0, Number(t.stock_actual) - selectedTireQty) } : t
            )
          );
          setIsAddingTire(false);
          setSelectedTireId("");
          setSelectedTireQty(4);
          onUpdate();
        }
      }
    } catch (err: any) {
      alert(err?.message || "Error al agregar neumático");
    } finally {
      setAddingTireLoading(false);
    }
  };

  const handleAddJustInTimeTire = async () => {
    const finalPrice = parseFloat(jitPrecioVentaUnitario) || Math.round(numericJitCosto * (1 + numericJitMargen / 100) * 100) / 100;
    if (finalPrice <= 0 || jitCantidad < 1) {
      alert("Por favor captura un costo o precio de venta válido y cantidad.");
      return;
    }
    setAddingTireLoading(true);

    try {
      const targetEmpresaId = order.empresa_id || empresa?.id;
      const targetSucursalId = order.sucursal_id || sucursalActiva?.id;

      // 1. Buscar si ya existe la medida y marca en catálogo base
      let targetTireId: string | null = null;
      let targetTireData: any = null;

      const { data: existingTires } = await supabase
        .from("inventario_llantas_base")
        .select("id, marca, modelo_llanta, rin, ancho, perfil, stock_actual, costo_adquisicion, precio_venta")
        .eq("empresa_id", targetEmpresaId)
        .eq("ancho", jitAncho)
        .eq("perfil", jitPerfil)
        .eq("rin", jitRin)
        .ilike("marca", jitMarca.trim())
        .limit(1);

      if (existingTires && existingTires.length > 0) {
        targetTireId = existingTires[0].id;
        targetTireData = existingTires[0];
        // Actualizar costo y precio pactado al vuelo
        await supabase
          .from("inventario_llantas_base")
          .update({
            costo_adquisicion: numericJitCosto || existingTires[0].costo_adquisicion,
            precio_venta: finalPrice,
          })
          .eq("id", targetTireId);
      } else {
        const { data: createdTire, error: createErr } = await supabase
          .from("inventario_llantas_base")
          .insert({
            empresa_id: targetEmpresaId,
            sucursal_id: targetSucursalId || null,
            marca: jitMarca.trim().toUpperCase(),
            modelo_llanta: jitModelo.trim() || "Sobre Pedido",
            ancho: jitAncho,
            perfil: jitPerfil,
            rin: jitRin,
            indice_carga_velocidad: jitIndiceCarga.trim() || "N/A",
            tipo_terreno: jitTipoTerreno || "HT",
            costo_adquisicion: numericJitCosto,
            precio_venta: finalPrice,
            stock_actual: 0,
            stock_minimo: 0,
          })
          .select("id, marca, modelo_llanta, rin, ancho, perfil, stock_actual, costo_adquisicion")
          .single();

        if (createErr || !createdTire) {
          throw new Error(createErr?.message || "No se pudo registrar el neumático en catálogo.");
        }
        targetTireId = createdTire.id;
        targetTireData = createdTire;
      }

      // 2. Garantizar cotización
      let currentCotizacionId = order.cotizacion_id;
      if (!currentCotizacionId) {
        const { data: newCotizacion, error: cotError } = await supabase
          .from("cotizaciones")
          .insert({
            cliente_id: order.vehiculos?.clientes?.id || order.cliente_id,
            vehiculo_id: order.vehiculos?.id || order.vehiculo_id,
            estatus: "Aprobada",
            total: finalPrice * jitCantidad,
            empresa_id: targetEmpresaId,
            sucursal_id: targetSucursalId || null,
          })
          .select("id")
          .single();

        if (cotError || !newCotizacion) {
          throw new Error(cotError?.message || "Error al crear la cotización.");
        }
        currentCotizacionId = newCotizacion.id;
        await supabase
          .from("ordenes_servicio")
          .update({ cotizacion_id: currentCotizacionId })
          .eq("id", orderId);
      }

      // 3. Insertar detalle
      const subtotalItem = Math.round(finalPrice * jitCantidad * 100) / 100;
      const { data: newDetail, error: detailError } = await supabase
        .from("detalles_cotizacion")
        .insert({
          cotizacion_id: currentCotizacionId,
          llanta_id: targetTireId,
          cantidad: jitCantidad,
          precio_unitario: finalPrice,
          subtotal: subtotalItem,
          estatus_aprobacion: "Aprobado",
          empresa_id: targetEmpresaId,
        })
        .select(
          "id, cantidad, precio_unitario, subtotal, estatus_aprobacion, inventario_llantas(id, marca, modelo_llanta, rin, ancho, perfil, stock_actual, costo_adquisicion)"
        )
        .single();

      if (detailError || !newDetail) {
        throw new Error(detailError?.message || "Error al asociar neumático a la cotización.");
      }

      // 4. Actualizar estado reactivo
      const updatedCotizaciones = order.cotizaciones || { detalles_cotizacion: [] };
      setOrder((prev: any) => ({
        ...prev,
        cotizacion_id: currentCotizacionId,
        cotizaciones: {
          ...updatedCotizaciones,
          detalles_cotizacion: [...(updatedCotizaciones.detalles_cotizacion || []), newDetail],
        },
      }));

      setAvailableTires((prev) => {
        if (prev.some((t) => t.id === targetTireId)) {
          return prev.map((t) =>
            t.id === targetTireId ? { ...t, precio_venta: finalPrice, costo_adquisicion: numericJitCosto } : t
          );
        }
        return [
          {
            ...targetTireData,
            precio_venta: finalPrice,
            costo_adquisicion: numericJitCosto,
            stock_actual: 0,
          },
          ...prev,
        ];
      });

      setIsAddingTire(false);
      setJitCostoUnitario("");
      setJitPrecioVentaUnitario("");
      setJitMedidaExpress("");
      onUpdate();
    } catch (err: any) {
      alert(err?.message || "Error al cotizar neumático sobre pedido");
    } finally {
      setAddingTireLoading(false);
    }
  };

  const handleRemoveTire = async (detail: any) => {
    const { error } = await supabase.from("detalles_cotizacion").delete().eq("id", detail.id);
    if (!error) {
      const tire = detail.inventario_llantas;
      if (tire?.id) {
        await ConcurrencyService.ajustarStock({
          llantaId: tire.id,
          delta: Number(detail.cantidad || 1),
          permitirNegativo: true,
        });
      }
      const updatedDetalles = (order.cotizaciones?.detalles_cotizacion || []).filter(
        (d: any) => d.id !== detail.id
      );
      setOrder((prev: any) => ({
        ...prev,
        cotizaciones: { ...prev.cotizaciones, detalles_cotizacion: updatedDetalles },
      }));
      onUpdate();
    }
  };

  // Handlers for Persistent DVI & Reception
  const handleLoadDviTemplate = async () => {
    setSavingDviLoading(true);
    const rows = DEFAULT_DVI_TEMPLATE.map((item) => ({
      ...item,
      orden_servicio_id: orderId,
      estatus_cliente: "Pendiente",
    }));
    const { data, error } = await supabase.from("inspecciones_dvi").insert(rows).select("*");
    if (!error && data) {
      setDviItems(data);
      setOrder((prev: any) => ({ ...prev, inspecciones_dvi: data }));
      onUpdate();
    }
    setSavingDviLoading(false);
  };

  const handleAddDviPoint = async () => {
    if (!newDviPunto.trim()) return;
    setSavingDviLoading(true);
    const { data, error } = await supabase
      .from("inspecciones_dvi")
      .insert({
        orden_servicio_id: orderId,
        categoria: newDviCategoria,
        punto_inspeccion: newDviPunto.trim(),
        severidad: newDviSeveridad,
        observaciones: newDviObs.trim() || null,
        recomendacion: newDviRec.trim() || null,
        costo_estimado: parseFloat(newDviCosto) || 0,
        foto_url: newDviFoto.trim() || null,
        estatus_cliente: "Pendiente",
      })
      .select("*")
      .single();

    if (!error && data) {
      const next = [...dviItems, data];
      setDviItems(next);
      setOrder((prev: any) => ({ ...prev, inspecciones_dvi: next }));
      setIsAddingDvi(false);
      setNewDviPunto("");
      setNewDviObs("");
      setNewDviRec("");
      setNewDviCosto("");
      setNewDviFoto("");
      onUpdate();
    }
    setSavingDviLoading(false);
  };

  const handleUpdateDviItem = async (id: string, updates: Record<string, any>) => {
    const { error } = await supabase.from("inspecciones_dvi").update(updates).eq("id", id);
    if (!error) {
      const next = dviItems.map((item) => (item.id === id ? { ...item, ...updates } : item));
      setDviItems(next);
      setOrder((prev: any) => ({ ...prev, inspecciones_dvi: next }));
      onUpdate();
    }
  };

  const handleRemoveDviItem = async (id: string) => {
    const { error } = await supabase.from("inspecciones_dvi").delete().eq("id", id);
    if (!error) {
      const next = dviItems.filter((item) => item.id !== id);
      setDviItems(next);
      setOrder((prev: any) => ({ ...prev, inspecciones_dvi: next }));
      onUpdate();
    }
  };

  const handleSendDviToDeferred = async (item: any) => {
    const v = order.vehiculos;
    const c = v?.clientes;
    if (!v?.id || !c?.id) return;

    const { data: newDif, error } = await supabase
      .from("trabajos_diferidos")
      .insert({
        vehiculo_id: v.id,
        cliente_id: c.id,
        orden_origen_id: orderId,
        concepto: `${item.punto_inspeccion} - ${item.recomendacion || item.observaciones || "Hallazgo DVI"}`,
        categoria: item.categoria || "DVI",
        severidad: item.severidad === "rojo" ? "rojo" : "amarillo",
        costo_estimado: Number(item.costo_estimado || 1200),
        notas: item.observaciones || "Detectado en Inspección Digital Multipunto",
        resuelto: false,
      })
      .select("*")
      .single();

    if (!error && newDif) {
      setDeferredWorks((prev) => [newDif, ...prev]);
      await handleUpdateDviItem(item.id, { estatus_cliente: "Diferido" });
    }
  };

  const handleSaveReception = async () => {
    setSavingReception(true);
    const km = parseInt(recKilometraje) || order.kilometraje_ingreso || 0;
    const updates = {
      problema_reportado: recProblema.trim() || null,
      notas_recepcion: recProblema.trim() || null,
      diagnostico_tecnico: recDiagnostico.trim() || null,
      bahia_rampa: recBahia || null,
      kilometraje_ingreso: km,
      nivel_gasolina: recGasolina,
      checklist_recepcion: recChecklist,
    };

    const { error } = await supabase.from("ordenes_servicio").update(updates).eq("id", orderId);
    if (!error) {
      setOrder((prev: any) => ({ ...prev, ...updates }));
      setReceptionSavedToast(true);
      setTimeout(() => setReceptionSavedToast(false), 2500);
      onUpdate();
    }
    setSavingReception(false);
  };

  // Handlers for Payments & Official POS Cobro
  const handleConfirmCobro = async () => {
    if (!turnoActivo) {
      setIsAbrirTurnoOpen(true);
      return;
    }
    if (saldoPendiente <= 0) return;

    setAddingPaymentLoading(true);
    try {
      const targetSucursalId =
        order?.sucursal_id ||
        sucursalActiva?.id ||
        "b0000000-0000-0000-0000-000000000001";
      const targetEmpresaId =
        order?.empresa_id ||
        empresa?.id ||
        "a0000000-0000-0000-0000-000000000001";

      const f1Operativo = fondos.find((f) => f.tipo === "OPERATIVO") || fondos[0];

      if (posPaymentMethod === "SPLIT") {
        if (splitPayments.length === 0) {
          toast.error("Agrega al menos un método de pago en el desglose.");
          setAddingPaymentLoading(false);
          return;
        }
        const totalCubierto = splitPayments.reduce((acc, p) => acc + Number(p.monto || 0), 0);
        if (totalCubierto < saldoPendiente - 0.05) {
          toast.error(`El monto cubierto ($${totalCubierto.toFixed(2)}) no cubre el saldo de $${saldoPendiente.toFixed(2)}.`);
          setAddingPaymentLoading(false);
          return;
        }

        const res = await MultiPaymentService.registrarPagosOrdenMulti({
          ordenId: order.id,
          sucursalId: targetSucursalId,
          pagos: splitPayments,
        });

        if (!res.success) {
          toast.error(res.message || "Error al registrar cobros divididos");
          setAddingPaymentLoading(false);
          return;
        }

        const totalCashChange = splitPayments
          .filter((p) => p.metodo === "Efectivo")
          .reduce((acc, p) => acc + Number(p.cambio || 0), 0);
        const totalCashGiven = splitPayments
          .filter((p) => p.metodo === "Efectivo")
          .reduce((acc, p) => acc + Number(p.montoRecibido || p.monto || 0), 0);

        setReceiptCashGiven(totalCashGiven > 0 ? totalCashGiven : undefined);
        setReceiptChangeDue(totalCashChange > 0 ? totalCashChange : undefined);
      } else {
        // Single payment
        let dbProvider = "Efectivo";
        let detalle = "Efectivo en Mostrador";
        let ref = `AUT-${Math.floor(100000 + Math.random() * 900000)}`;
        let amountNum = saldoPendiente;
        let finalAhorro = 0;

        if (posPaymentMethod === "Efectivo") {
          dbProvider = "Efectivo";
          if (hasCashDiscount && applyCashDiscount) {
            finalAhorro = cashAhorro;
            amountNum = cashTotalPorCobrar;
          }
          const cashGivenNum = cashGivenVal > 0 ? cashGivenVal : amountNum;
          const changeDueNum = Math.max(0, cashGivenNum - amountNum);
          setReceiptCashGiven(cashGivenNum);
          setReceiptChangeDue(changeDueNum);

          detalle = finalAhorro > 0
            ? `Efectivo en Mostrador (Descuento Promoción ${cashDiscountPct}%: -$${finalAhorro.toFixed(2)} • Entregó: $${cashGivenNum.toLocaleString("es-MX")} • Cambio: $${changeDueNum.toLocaleString("es-MX")})`
            : `Efectivo en Mostrador (Entregó: $${cashGivenNum.toLocaleString("es-MX")} • Cambio: $${changeDueNum.toLocaleString("es-MX")})`;
        } else if (posPaymentMethod === "TPV") {
          dbProvider = tpvType.includes("BanBajío") ? "BanBajío" : "Mercado Pago";
          detalle = tpvType;
          ref = tpvAuth.trim() || `TPV-${Math.floor(100000 + Math.random() * 900000)}`;
          setReceiptCashGiven(undefined);
          setReceiptChangeDue(undefined);
        } else if (posPaymentMethod === "SPEI") {
          dbProvider = "Transferencia";
          const cta = cuentasBancarias.find((c) => c.id === selectedCuentaBancariaId) || cuentasBancarias[0];
          detalle = cta ? `Transferencia SPEI (${cta.banco} • ${cta.alias})` : "Transferencia Bancaria SPEI";
          ref = speiRastreo.trim() || `SPEI-${Date.now().toString().slice(-8)}`;
          setReceiptCashGiven(undefined);
          setReceiptChangeDue(undefined);
        } else if (posPaymentMethod === "BNPL") {
          if (paymentMode === "link") {
            setPaymentStatusMessage(`Generando link de pago con ${bnplProvider}...`);
            const mappedProvider = (bnplProvider as any) === "Mercado Pago" ? "MercadoPago" : (bnplProvider as any);
            const linkRes = await generatePaymentLink(orderId, saldoPendiente, mappedProvider);
            if (linkRes.success && linkRes.payment_url) {
              window.open(linkRes.payment_url, "_blank");
            }
            await loadWorkspaceData();
            setPaymentStatusMessage("");
            setAddingPaymentLoading(false);
            onUpdate();
            return;
          }
          dbProvider = bnplProvider;
          detalle = `${bnplProvider} (Financiamiento Automotriz)`;
          ref = bnplReference.trim() || `BNPL-${Date.now().toString().slice(-8)}`;
          setReceiptCashGiven(undefined);
          setReceiptChangeDue(undefined);
        }

        const { data: newPago, error: pagoErr } = await supabase
          .from("pagos_orden")
          .insert({
            orden_servicio_id: order.id,
            empresa_id: targetEmpresaId,
            sucursal_id: targetSucursalId,
            monto_total: amountNum,
            proveedor_pago: dbProvider,
            metodo_detalle: detalle,
            referencia: ref,
            estatus: "Aprobado",
            descuento_aplicado: finalAhorro > 0 ? finalAhorro : null,
            fecha_pago: new Date().toISOString(),
            cuenta_bancaria_id: posPaymentMethod === "SPEI" ? (selectedCuentaBancariaId || null) : null,
            caja_turno_id: turnoActivo?.id || null,
            caja_fondo_id: posPaymentMethod === "Efectivo" ? (f1Operativo?.id || null) : null,
          })
          .select()
          .single();

        if (pagoErr) throw pagoErr;

        setSelectedReceiptPayment(newPago);

        const nuevoPagado = totalPagado + amountNum;
        const nuevoEstatus = (nuevoPagado + finalAhorro >= granTotal - 0.5) ? "Pagado" : "Parcial";
        const ordUpdate: any = { estatus_pago: nuevoEstatus };
        if (finalAhorro > 0) {
          ordUpdate.descuento_efectivo_porcentaje = cashDiscountPct;
          ordUpdate.descuento_efectivo_monto = finalAhorro;
        }

        await supabase
          .from("ordenes_servicio")
          .update(ordUpdate)
          .eq("id", order.id);
      }

      // Audio Chime
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.22);
      } catch {}

      toast.success("Cobro registrado exitosamente en caja");
      setShowReceiptModal(true);
      await loadWorkspaceData();
      onUpdate();
    } catch (err: any) {
      console.error("Error al cobrar:", err);
      toast.error(err.message || "Error al procesar el cobro");
    } finally {
      setAddingPaymentLoading(false);
    }
  };

  const handleRemovePayment = async (pagoId: string) => {
    const { error } = await supabase
      .from("pagos_orden")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", pagoId);
    if (!error) {
      const newPagos = (order.pagos_orden || []).filter((p: any) => p.id !== pagoId);
      const newTotalPagado = newPagos
        .filter((p: any) => (p.estatus === "Aprobado" || p.estatus === "COMPLETADO") && !p.deleted_at)
        .reduce((acc: number, curr: any) => acc + Number(curr.monto_total), 0);
      const newTotalDescuentos = newPagos
        .filter((p: any) => (p.estatus === "Aprobado" || p.estatus === "COMPLETADO") && !p.deleted_at)
        .reduce((acc: number, curr: any) => acc + Number(curr.descuento_aplicado || 0), 0);

      const totalCovered = newTotalPagado + newTotalDescuentos;
      let newEstatus = "Pendiente";
      if (totalCovered > 0 && totalCovered < granTotal) newEstatus = "Parcial";
      if (totalCovered >= granTotal - 0.05 && granTotal > 0) newEstatus = "Pagado";

      await supabase
        .from("ordenes_servicio")
        .update({
          estatus_pago: newEstatus,
          descuento_efectivo_monto: newTotalDescuentos,
        })
        .eq("id", orderId);
      setOrder((prev: any) => ({
        ...prev,
        pagos_orden: newPagos,
        estatus_pago: newEstatus,
        descuento_efectivo_monto: newTotalDescuentos,
      }));
      onUpdate();
    }
  };

  if (loading || !order) {
    return (
      <div className="p-16 flex flex-col items-center justify-center text-slate-500 gap-3">
        <Loader2 size={26} className="animate-spin text-blue-600" />
        <p className="text-xs font-medium">Cargando estación de trabajo de la orden...</p>
      </div>
    );
  }

  const v = order.vehiculos || {};
  const c = v.clientes || {};
  const folioStr = `#${1000 + Number(order.folio || 1)}`;
  const assignedMechanic = mechanics.find((m) => m.id === order.mecanico_id);

  const handleSendWhatsApp = () => {
    const cleanPhone = (c.telefono || "8112345678").replace(/\D/g, "");
    const portalUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/orden/${orderId}`;
    const msg = `Hola *${c.nombre || "Cliente"}*, te saludamos de *${
      empresa?.nombre_comercial || "Torque & Ruta"
    }*. 🚗\n\nTu unidad *${v.marca} ${v.modelo}* (${v.placas || "S/P"}) con Orden *${folioStr}* tiene lista su Inspección Digital Multipunto (DVI) y cotización por *$${granTotal.toLocaleString(
      "es-MX",
      { minimumFractionDigits: 2 }
    )} MXN*.\n\nPuedes revisar las fotos, el diagnóstico técnico y autorizar en 1 clic desde tu celular aquí:\n👉 ${portalUrl}`;

    window.open(
      `https://wa.me/52${cleanPhone.slice(-10)}?text=${encodeURIComponent(msg)}`,
      "_blank"
    );
  };

  const isExpressOrder = Boolean(
    order?.checklist_recepcion?.tipo_recepcion === "express" ||
    order?.checklist_recepcion?.dvi_omitido === true
  );

  const dviRedCount = dviItems.filter((i) => i.severidad === "rojo").length;
  const dviYellowCount = dviItems.filter((i) => i.severidad === "amarillo").length;
  const dviGreenCount = dviItems.filter((i) => i.severidad === "verde").length;

  const renderServiceForm = () => (
    <div className="p-4 bg-blue-50/50 border-b border-slate-200 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
          <Wrench size={14} className="text-blue-600" />
          Agregar Mano de Obra / Servicio de Taller
        </span>
        <span className="text-[10px] font-semibold text-blue-800 bg-blue-100 px-2 py-0.5 rounded">
          Catálogo Oficial de Servicios
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
        <div className="sm:col-span-4">
          <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
            Servicio del Catálogo
          </label>
          <select
            value={selectedServiceId}
            onChange={(e) => handleSelectCatalogService(e.target.value)}
            className="w-full h-8 text-xs bg-white border border-slate-300 rounded-md px-2 text-slate-900"
          >
            <option value="">Seleccionar servicio...</option>
            {availableServices.map((s) => (
              <option key={s.id} value={s.id}>
                {s.codigo_sku ? `[${s.codigo_sku}] ` : ""}
                {s.nombre} — ${Number(s.precio).toLocaleString("es-MX")}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-3">
          <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
            Paquete / Operación
          </label>
          <select
            value={servicePackage}
            onChange={(e) => setServicePackage(e.target.value)}
            className="w-full h-8 text-xs bg-white border border-slate-300 rounded-md px-2 text-slate-900 font-medium"
          >
            {DEFAULT_OPERATION_PACKAGES.map((pkg) => (
              <option key={pkg} value={pkg}>
                {pkg}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
            Técnico
          </label>
          <select
            value={serviceMechanicId}
            onChange={(e) => setServiceMechanicId(e.target.value)}
            className="w-full h-8 text-xs bg-white border border-slate-300 rounded-md px-2 text-slate-900"
          >
            <option value="">Técnico de la orden</option>
            {mechanics
              .filter((m) => m.rol === "Mecánico")
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre} ({m.comision_porcentaje || 15}%)
                </option>
              ))}
          </select>
        </div>

        <div className="sm:col-span-1">
          <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
            Horas
          </label>
          <input
            type="number"
            step="0.1"
            value={serviceHours}
            onChange={(e) => setServiceHours(e.target.value)}
            className="w-full h-8 text-xs bg-white border border-slate-300 rounded-md px-2 text-slate-900 tabular-nums"
          />
        </div>

        <div className="sm:col-span-2">
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] font-bold uppercase text-slate-500">
              Precio ($)
            </label>
            <button
              type="button"
              onClick={() => {
                const next = !serviceIsCortesia;
                setServiceIsCortesia(next);
                if (next) setServicePrice("0");
                else {
                  const s = availableServices.find((x) => x.id === selectedServiceId);
                  setServicePrice(String(s?.precio || 150));
                }
              }}
              className={`text-[9px] font-bold px-1.5 py-0.2 rounded cursor-pointer ${
                serviceIsCortesia
                  ? "bg-emerald-600 text-white"
                  : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300"
              }`}
            >
              🎁 Cortesía
            </button>
          </div>
          <input
            type="number"
            step="10"
            value={servicePrice}
            onChange={(e) => {
              setServicePrice(e.target.value);
              if (parseFloat(e.target.value) === 0) setServiceIsCortesia(true);
              else setServiceIsCortesia(false);
            }}
            className={`w-full h-8 text-xs bg-white border rounded-md px-2 font-bold tabular-nums ${
              serviceIsCortesia
                ? "border-emerald-400 text-emerald-700 bg-emerald-50/50"
                : "border-slate-300 text-slate-900"
            }`}
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
        <input
          type="text"
          placeholder="Notas técnicas de la partida (opcional)..."
          value={serviceNotes}
          onChange={(e) => setServiceNotes(e.target.value)}
          className="w-full sm:flex-1 h-8 text-xs bg-white border border-slate-300 rounded-md px-2.5 text-slate-800"
        />
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsAddingService(false)}
            className="px-3 h-8 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!selectedServiceId || addingServiceLoading}
            onClick={handleAddService}
            className="px-4 h-8 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold disabled:opacity-50 cursor-pointer"
          >
            {addingServiceLoading ? "Guardando..." : "Guardar Mano de Obra"}
          </button>
        </div>
      </div>
    </div>
  );

  const renderPartForm = () => (
    <div className="p-4 bg-indigo-50/40 border-b border-indigo-200/80 space-y-3.5 animate-in fade-in duration-200">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
          <Calculator size={15} className="text-indigo-600" />
          Calculadora de Margen y Alta de Refacción
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded-md">
            Margen Taller: {empresa?.margen_refacciones_default ?? 35}%
          </span>
          <button
            type="button"
            onClick={() => setShowGarantiaSection(!showGarantiaSection)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
              showGarantiaSection
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-50"
            }`}
          >
            <ShieldCheck size={13} />
            <span>{showGarantiaSection ? "Ocultar Garantía" : "+ Garantía y Factura"}</span>
          </button>
        </div>
      </div>

      {/* Grid Principal sin campos cortados */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        {/* Fila 1 */}
        <div className="sm:col-span-5">
          <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
            Concepto / Refacción *
          </label>
          <input
            type="text"
            placeholder="Ej. Juego Balatas Cerámicas Delanteras"
            value={partNombre}
            onChange={(e) => setPartNombre(e.target.value)}
            className="w-full h-8 text-xs bg-white border border-slate-300 rounded-md px-2.5 text-slate-900 font-medium focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
          />
        </div>

        <div className="sm:col-span-3">
          <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
            No. Parte (SKU)
          </label>
          <input
            type="text"
            placeholder="Ej. D1521-8840"
            value={partNumero}
            onChange={(e) => setPartNumero(e.target.value)}
            className="w-full h-8 text-xs bg-white border border-slate-300 rounded-md px-2.5 text-slate-900 font-mono"
          />
        </div>

        <div className="sm:col-span-4">
          <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
            Paquete / Operación
          </label>
          <select
            value={partPackage}
            onChange={(e) => setPartPackage(e.target.value)}
            className="w-full h-8 text-xs bg-white border border-slate-300 rounded-md px-2 text-slate-900 font-medium"
          >
            {DEFAULT_OPERATION_PACKAGES.map((pkg) => (
              <option key={pkg} value={pkg}>
                {pkg}
              </option>
            ))}
          </select>
        </div>

        {/* Fila 2: Proveedor, Cantidad, Costo Proveedor y Precio Venta */}
        <div className="sm:col-span-5">
          <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
            Proveedor (Catálogo)
          </label>
          <select
            value={selectedProveedorId || partProveedor}
            onChange={(e) => handleSelectProveedor(e.target.value)}
            className="w-full h-8 text-xs bg-white border border-slate-300 rounded-md px-2 text-slate-900 font-medium"
          >
            {proveedoresCatalogo.length > 0 ? (
              <>
                <optgroup label="Proveedores Registrados del Taller">
                  {proveedoresCatalogo.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre_comercial} {p.categoria ? `(${p.categoria})` : ""}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Opciones Rápidas">
                  {PROVEEDORES_REFACCIONES.map((prov) => (
                    <option key={prov} value={prov}>
                      {prov}
                    </option>
                  ))}
                </optgroup>
              </>
            ) : (
              PROVEEDORES_REFACCIONES.map((prov) => (
                <option key={prov} value={prov}>
                  {prov}
                </option>
              ))
            )}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
            Cant.
          </label>
          <input
            type="number"
            min="1"
            value={partCantidad}
            onChange={(e) => setPartCantidad(parseInt(e.target.value) || 1)}
            className="w-full h-8 text-xs bg-white border border-slate-300 rounded-md px-2 text-center font-bold tabular-nums"
          />
        </div>

        <div className="sm:col-span-2 sm:min-w-[110px]">
          <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
            Costo Prov. ($) *
          </label>
          <input
            type="number"
            step="10"
            placeholder="0.00"
            value={partCostoUnitario}
            onChange={(e) => handleCostoPartChange(e.target.value)}
            className="w-full h-8 text-xs bg-white border border-slate-300 rounded-md px-2.5 text-slate-900 font-bold tabular-nums font-mono"
          />
        </div>

        <div className="sm:col-span-3 sm:min-w-[120px]">
          <label className="block text-[10px] font-bold uppercase text-indigo-700 mb-1">
            P. Venta ($) [Directo]
          </label>
          <input
            type="number"
            step="10"
            placeholder="0.00"
            value={partPrecioVentaManual !== "" ? partPrecioVentaManual : (calcPrecioUnitario > 0 ? calcPrecioUnitario : "")}
            onChange={(e) => handlePrecioVentaPartChange(e.target.value)}
            className="w-full h-8 text-xs bg-indigo-50/60 border border-indigo-300 rounded-md px-2.5 text-indigo-950 font-black tabular-nums font-mono"
          />
        </div>
      </div>

      {/* Sección Desplegable de Garantía y Compra de Proveedor */}
      {showGarantiaSection && (
        <div className="bg-white border border-indigo-200 rounded-xl p-3.5 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-indigo-600" />
              Datos de Garantía y Trazabilidad de Compra
            </span>
            <span className="text-[10px] text-slate-500">
              Vincula la nota/factura del proveedor con la pieza instalada
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                Folio Ticket / Nota / Factura
              </label>
              <input
                type="text"
                placeholder="Ej. FAC-7712 o Nota #4512"
                value={partFolioTicket}
                onChange={(e) => setPartFolioTicket(e.target.value)}
                className="w-full h-8 text-xs bg-slate-50 border border-slate-300 rounded-md px-2.5 text-slate-900 font-mono font-medium"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                Garantía con Proveedor
              </label>
              <select
                value={partMesesGarantia}
                onChange={(e) => setPartMesesGarantia(Number(e.target.value))}
                className="w-full h-8 text-xs bg-slate-50 border border-slate-300 rounded-md px-2 text-slate-900 font-medium"
              >
                <option value={1}>30 días (1 mes)</option>
                <option value={3}>90 días (3 meses)</option>
                <option value={6}>180 días (6 meses)</option>
                <option value={12}>12 meses (1 año) - Recomendado</option>
                <option value={24}>24 meses (2 años)</option>
                <option value={0}>Sin garantía directa</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                Subir Evidencia (Foto / PDF)
              </label>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    setPartFileEvidencia(f);
                  }}
                  className="w-full h-8 text-[11px] text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[10px] file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Integración con Caja Chica */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 bg-slate-50/70 p-2.5 rounded-lg">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={partRegistrarCajaChica}
                onChange={(e) => setPartRegistrarCajaChica(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
              />
              <span className="text-xs text-slate-700 font-medium">
                Registrar egreso automático en <strong>Caja Chica</strong> por <strong className="font-mono text-slate-900">${(numericCosto * numericCant).toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN</strong> (Fondo de Gaveta)
              </span>
            </label>
            {!partRegistrarCajaChica && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-[10px] uppercase font-bold text-slate-500">Forma de Pago:</span>
                <select
                  value={partFuentePago}
                  onChange={(e) => setPartFuentePago(e.target.value as any)}
                  className="h-7 text-xs bg-white border border-slate-300 rounded px-2 text-slate-800"
                >
                  <option value="CAJA_CHICA">Efectivo mostrador</option>
                  <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                  <option value="CREDITO_PENDIENTE">Crédito Proveedor (CxP)</option>
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Live Calculation Bar con Atajos Rápidos */}
      <div className="bg-white border border-indigo-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex flex-wrap items-center gap-3 sm:gap-5">
          <div className="flex items-center gap-1.5">
            <label className="text-[10px] font-bold uppercase text-slate-500">
              Markup:
            </label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                step="1"
                value={partMargen}
                onChange={(e) => handleMargenPartChange(e.target.value)}
                className="w-14 h-7 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-300 rounded px-1.5 text-center tabular-nums"
              />
              <span className="text-xs font-bold text-slate-400">%</span>
            </div>
            {/* Presets rápidos */}
            <div className="hidden lg:flex items-center gap-1 ml-1">
              {[25, 35, 45, 50].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => handleMargenPartChange(String(pct))}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                    Number(partMargen) === pct
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          <div className="text-xs border-l border-slate-200 pl-3">
            <span className="text-slate-500">P. Venta Unit: </span>
            <strong className="text-slate-900 font-mono tabular-nums font-bold">
              ${calcPrecioUnitario.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
            </strong>
          </div>

          <div className="text-xs border-l border-slate-200 pl-3">
            <span className="text-slate-500">Subtotal: </span>
            <strong className="text-indigo-700 font-mono tabular-nums font-black text-sm">
              ${calcSubtotal.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
            </strong>
          </div>

          <div className="text-xs border-l border-slate-200 pl-3">
            <span className="text-slate-500">Utilidad Pieza: </span>
            <strong className="text-emerald-700 font-mono tabular-nums font-bold">
              +${calcUtilidad.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
            </strong>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsAddingPart(false)}
            className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 cursor-pointer font-medium"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!partNombre.trim() || numericCosto <= 0 || addingPartLoading}
            onClick={handleAddPart}
            className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shadow-xs"
          >
            {addingPartLoading ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <Plus size={14} />
                <span>Agregar Refacción</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col bg-slate-50 text-slate-900">
      {/* Top Action Header Bar (Shopmonkey Style) */}
      <div className="bg-white px-5 py-3.5 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3">
          <div className="px-2.5 py-1.5 rounded-md bg-slate-900 text-white font-mono text-sm font-black tracking-tight tabular-nums shrink-0">
            {folioStr}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/clientes/${c.id}?vehiculoId=${v.id}`}
                onClick={onClose}
                className="text-base font-bold text-slate-900 hover:text-blue-600 transition-colors flex items-center gap-1.5"
              >
                {v.marca} {v.modelo} {v.anio ? `(${v.anio})` : ""}
                <ExternalLink size={13} className="text-slate-400" />
              </Link>
              <span className="font-mono text-xs font-bold uppercase bg-slate-100 text-slate-700 border border-slate-300 px-2 py-0.5 rounded">
                {v.placas || "SIN PLACA"}
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                  order.estatus_pago === "Pagado"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : order.estatus_pago === "Parcial"
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-red-50 text-red-700 border-red-200"
                }`}
              >
                Pago: {order.estatus_pago || "Pendiente"}
              </span>
              {order.aprobado_cliente_nombre && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  <ShieldCheck size={11} /> Autorizado por {order.aprobado_cliente_nombre}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1">
              <Link
                href={`/clientes/${c.id}?vehiculoId=${v.id}`}
                onClick={onClose}
                className="inline-flex items-center gap-1 font-medium text-slate-700 hover:text-blue-600 hover:underline"
              >
                <User size={12} className="text-slate-400" />
                {c.nombre}
              </Link>
              {c.telefono && <span className="tabular-nums">• Tel: {c.telefono}</span>}
              <span className="tabular-nums">
                • {Number(order.kilometraje_ingreso || 0).toLocaleString("es-MX")} km
              </span>
              {order.bahia_rampa && (
                <span className="text-slate-700 font-medium">• {order.bahia_rampa}</span>
              )}
            </div>
          </div>
        </div>

        {/* Right Controls: Portal Link, WhatsApp, Status Selectors */}
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`/orden/${orderId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors shadow-xs"
          >
            <ExternalLink size={13} className="text-blue-600" />
            Portal Cliente
          </a>

          <button
            type="button"
            onClick={handleSendWhatsApp}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-xs cursor-pointer"
          >
            <MessageCircle size={13} />
            Enviar por WhatsApp
          </button>

          <select
            value={order.mecanico_id || ""}
            onChange={(e) => handleUpdateMechanic(e.target.value)}
            className="h-8 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-md px-2.5 text-slate-800 focus:outline-none focus:border-blue-600"
            title="Técnico Asignado"
          >
            <option value="">Sin Técnico</option>
            {mechanics
              .filter((m) => m.rol === "Mecánico" || m.puesto?.toLowerCase().includes("técnico"))
              .map((m) => (
                <option key={m.id} value={m.id}>
                  🔧 {m.nombre}
                </option>
              ))}
          </select>

          <select
            value={order.estado}
            onChange={(e) => handleUpdateStatus(e.target.value)}
            className="h-8 text-xs font-bold bg-slate-900 text-white border border-slate-900 rounded-md px-2.5 focus:outline-none cursor-pointer"
          >
            <option value="Citas del Día">1. Citas del Día</option>
            <option value="En Inspección">2. En Inspección</option>
            <option value="En Rampa">3. En Rampa</option>
            <option value="Listo para Entrega">4. Listo para Entrega</option>
          </select>

          <select
            value={order.sub_estado || "Activa"}
            onChange={(e) => handleUpdateSubStatus(e.target.value)}
            className="h-8 text-xs font-semibold bg-white border border-slate-300 rounded-md px-2.5 text-slate-700 focus:outline-none focus:border-blue-600"
          >
            <option value="Activa">Sub: Activa</option>
            <option value="Esperando Aprobación Cliente">Sub: Esperando Aprobación</option>
            <option value="En Reparación">Sub: En Reparación</option>
            <option value="Por Cobrar en Caja">Sub: Por Cobrar en Caja</option>
            <option value="Entregado">Sub: Entregado</option>
          </select>
        </div>
      </div>

      {/* Guided Lifecycle Stepper Navigation */}
      <div className="bg-slate-50/90 px-5 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
          {/* Step 1: Recepción & DVI */}
          <button
            type="button"
            onClick={() => setActiveTab("dvi")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "dvi"
                ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                : "text-slate-500 hover:text-slate-900 hover:bg-white/60"
            }`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
              activeTab === "dvi" ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-600"
            }`}>
              1
            </span>
            <span>{isExpressOrder ? "Recepción Express" : "Recepción & DVI"}</span>
            {isExpressOrder ? (
              <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                Sin DVI
              </span>
            ) : dviRedCount > 0 ? (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-red-100 text-red-700 font-bold">
                {dviRedCount} alertas
              </span>
            ) : dviYellowCount + dviGreenCount > 0 ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            ) : null}
          </button>

          <span className="text-slate-300 font-bold text-xs hidden sm:inline">➔</span>

          {/* Step 2: Partidas & Cotización */}
          <button
            type="button"
            onClick={() => setActiveTab("cotizacion")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "cotizacion"
                ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                : "text-slate-500 hover:text-slate-900 hover:bg-white/60"
            }`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
              activeTab === "cotizacion" ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-600"
            }`}>
              2
            </span>
            <span>Cotización</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-700 tabular-nums font-semibold">
              {activeServices.length + activeParts.length + activeTires.length}
            </span>
          </button>

          <span className="text-slate-300 font-bold text-xs hidden sm:inline">➔</span>

          {/* Step 3: Cobro & Caja */}
          <button
            type="button"
            onClick={() => setActiveTab("pagos")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "pagos"
                ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                : "text-slate-500 hover:text-slate-900 hover:bg-white/60"
            }`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
              activeTab === "pagos" ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-600"
            }`}>
              3
            </span>
            <span>Cobro & Caja</span>
            {order.estatus_pago === "Pagado" ? (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-700 font-bold">
                ✓ Pagado
              </span>
            ) : (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-800 font-bold tabular-nums">
                ${saldoPendiente.toLocaleString("es-MX", { maximumFractionDigits: 0 })}
              </span>
            )}
          </button>

          <span className="text-slate-300 font-bold text-xs hidden sm:inline">➔</span>

          {/* Step 4: Hoja de Impresión */}
          <button
            type="button"
            onClick={() => setActiveTab("impresion")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "impresion"
                ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                : "text-slate-500 hover:text-slate-900 hover:bg-white/60"
            }`}
          >
            <Printer size={13} />
            <span>Imprimir</span>
          </button>
        </div>

        {/* Acceso Secundario: Bitácora Forense */}
        <button
          type="button"
          onClick={() => setActiveTab("auditoria")}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "auditoria"
              ? "bg-white text-slate-900 shadow-xs border border-slate-200"
              : "text-slate-400 hover:text-slate-700 hover:bg-white/60"
          }`}
          title="Ver bitácora de cambios y auditoría forense"
        >
          <ShieldCheck size={13} />
          <span>Bitácora</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="p-5">
        {/* TAB 1: PARTIDAS Y COTIZACIÓN */}
        {activeTab === "cotizacion" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left 8 Cols: Deferred Banner + Labor + Buyouts + Tires */}
            <div className="lg:col-span-8 space-y-5">
              {/* Alert Banner for Unresolved Deferred Works */}
              {deferredWorks.length > 0 && (
                <div className="bg-amber-50/90 border border-amber-300 rounded-lg p-3.5 shadow-2xs">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                      <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wide">
                        Trabajos Diferidos Pendientes en este Vehículo ({deferredWorks.length})
                      </h4>
                    </div>
                    <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                      Oportunidad de Venta / Upsell
                    </span>
                  </div>
                  <div className="divide-y divide-amber-200/70">
                    {deferredWorks.map((dif) => (
                      <div
                        key={dif.id}
                        className="py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                      >
                        <div>
                          <span
                            className={`inline-block w-2 h-2 rounded-full mr-1.5 ${
                              dif.severidad === "rojo" ? "bg-red-600" : "bg-amber-500"
                            }`}
                          />
                          <strong className="text-slate-900">{dif.concepto}</strong>
                          {dif.categoria && (
                            <span className="text-slate-500 ml-1.5">({dif.categoria})</span>
                          )}
                          {dif.notas && (
                            <p className="text-[11px] text-slate-600 ml-3.5">{dif.notas}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {dif.costo_estimado && (
                            <span className="font-mono font-bold text-slate-900 tabular-nums">
                              Est: ${Number(dif.costo_estimado).toLocaleString("es-MX")}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleAddDeferredToOrder(dif)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold transition-colors cursor-pointer"
                          >
                            <Plus size={12} /> Agregar a esta Orden
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* QUOTE TOOLBAR & QUICK PROMOS */}
              <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-md">
                  <button
                    type="button"
                    onClick={() => setQuoteViewMode("operaciones")}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                      quoteViewMode === "operaciones"
                        ? "bg-white text-blue-700 shadow-2xs border border-slate-200"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Layers size={13} />
                    Vista por Paquetes / Operaciones
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuoteViewMode("clasico")}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                      quoteViewMode === "clasico"
                        ? "bg-white text-blue-700 shadow-2xs border border-slate-200"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <FolderTree size={13} />
                    Vista Clásica por Categorías
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleApplyFourTiresPromo}
                    disabled={addingServiceLoading}
                    title="Añade automáticamente Montaje y Válvulas a $0.00 como cortesía al vender 4 llantas"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs transition-all cursor-pointer"
                  >
                    <Sparkles size={13} />
                    ⚡ Paquete 4 Llantas (Montaje + Válvulas GRATIS)
                  </button>
                </div>
              </div>

              {quoteViewMode === "operaciones" ? (
                <div className="space-y-4">
                  {/* Action Bar in Operaciones mode */}
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-blue-50/50 border border-blue-200 rounded-lg px-3 py-2">
                    <span className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                      <Layers size={14} className="text-blue-600" />
                      Desglose Segmentado por Operación ({operationGroups.length} paquetes)
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setServicePackage("Llantas y Ruedas");
                          setIsAddingService(true);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold cursor-pointer"
                      >
                        <Wrench size={12} className="text-blue-600" /> + Mano de Obra
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPartPackage("Suspensión y Dirección");
                          setIsAddingPart(true);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold cursor-pointer"
                      >
                        <Package size={12} className="text-indigo-600" /> + Refacción
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setQuoteViewMode("clasico");
                          setTireTab("jit");
                          setIsAddingTire(true);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold cursor-pointer"
                      >
                        <CircleDot size={12} className="text-blue-600" /> + Neumático JIT
                      </button>
                    </div>
                  </div>

                  {/* Add drawers if active */}
                  {isAddingService && renderServiceForm()}
                  {isAddingPart && renderPartForm()}

                  {/* Operation Cards */}
                  {operationGroups.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-xs text-slate-400">
                      No hay operaciones o partidas cargadas en esta orden. Usa los botones superiores para agregar neumáticos, refacciones o mano de obra.
                    </div>
                  ) : (
                    operationGroups.map((group, gIdx) => {
                      const isLlantasCat = group.categoria === "Llantas";
                      return (
                        <div
                          key={group.id}
                          className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden"
                        >
                          {/* Operation Header */}
                          <div className="px-4 py-3 bg-slate-50/90 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-mono font-bold text-[10px] flex items-center justify-center">
                                {gIdx + 1}
                              </span>
                              <div>
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                                  {group.nombre}
                                  <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 border border-blue-200">
                                    {group.categoria}
                                  </span>
                                </h3>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-bold text-slate-900 tabular-nums">
                                Subtotal: ${group.subtotal.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN
                              </span>
                            </div>
                          </div>

                          {/* Warranty Policy Banner for this Operation */}
                          <div
                            className={`px-4 py-2 border-b text-xs flex items-center gap-2 ${
                              group.hasMontajeEnTaller || group.categoria !== "Llantas"
                                ? "bg-emerald-50/70 border-emerald-100 text-emerald-900"
                                : "bg-amber-50 border-amber-200 text-amber-900"
                            }`}
                          >
                            {group.hasMontajeEnTaller || group.categoria !== "Llantas" ? (
                              <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
                            ) : (
                              <AlertTriangle size={14} className="text-amber-600 shrink-0" />
                            )}
                            <span className="font-semibold">{group.garantiaTexto}</span>
                          </div>

                          {/* Items Table */}
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="border-b border-slate-200 bg-slate-50/50 text-[10px] uppercase font-bold text-slate-500">
                                  <th className="py-2 px-3 w-28">Tipo</th>
                                  <th className="py-2 px-3">Concepto / Partida</th>
                                  <th className="py-2 px-3 text-center w-14">Cant.</th>
                                  <th className="py-2 px-3 text-right w-28">P. Unitario</th>
                                  <th className="py-2 px-3 text-right w-28">Importe</th>
                                  <th className="py-2 px-3 text-right w-28">Acciones</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 text-xs">
                                {/* Tires in this operation */}
                                {group.tires.map((t: any) => {
                                  const tire = t.inventario_llantas || t.llanta;
                                  const medida = tire ? `${tire.ancho}/${tire.perfil} R${tire.rin}` : "";
                                  const name = tire ? `${tire.marca} ${tire.modelo_llanta}` : (t.nombre || "Neumático");
                                  const qty = Number(t.cantidad || 1);
                                  const unit = Number(t.precio_unitario || 0);
                                  const sub = t.subtotal != null ? Number(t.subtotal) : unit * qty;
                                  return (
                                    <tr key={`g-tire-${t.id}`} className="hover:bg-slate-50/70">
                                      <td className="py-2 px-3 font-semibold text-blue-700 text-[11px]">
                                        🛞 Neumático
                                      </td>
                                      <td className="py-2 px-3">
                                        <div className="font-semibold text-slate-900">{name}</div>
                                        <div className="text-[11px] font-mono font-bold text-slate-600">{medida}</div>
                                      </td>
                                      <td className="py-2 px-3 text-center tabular-nums font-bold">{qty}</td>
                                      <td className="py-2 px-3 text-right tabular-nums text-slate-700">
                                        ${unit.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                                      </td>
                                      <td className="py-2 px-3 text-right font-bold text-slate-900 tabular-nums">
                                        ${sub.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                                      </td>
                                      <td className="py-2 px-3 text-right">
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveTire(t)}
                                          className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                                          title="Eliminar neumático"
                                        >
                                          <Trash2 size={13} />
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}

                                {/* Parts in this operation */}
                                {group.parts.map((r: any) => {
                                  const qty = Number(r.cantidad || 1);
                                  const unit = Number(r.precio_unitario || 0);
                                  const sub = r.subtotal != null ? Number(r.subtotal) : unit * qty;
                                  const isDeferred = r.estatus_aprobacion === "Diferido";
                                  return (
                                    <tr key={`g-part-${r.id}`} className={isDeferred ? "bg-slate-50 opacity-60" : "hover:bg-slate-50/70"}>
                                      <td className="py-2 px-3 font-semibold text-indigo-700 text-[11px]">
                                        🔩 Refacción
                                      </td>
                                      <td className="py-2 px-3">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span className="font-semibold text-slate-900">{r.nombre}</span>
                                          {r.compras_proveedores?.evidencia_url ? (
                                            <button
                                              type="button"
                                              onClick={() =>
                                                setSelectedTicketEvidence({
                                                  evidenciaUrl: r.compras_proveedores.evidencia_url,
                                                  folio: r.compras_proveedores.folio_ticket_nota,
                                                  proveedorNombre:
                                                    r.compras_proveedores.proveedores?.nombre_comercial ||
                                                    r.proveedor ||
                                                    "Proveedor",
                                                  descripcion: r.nombre,
                                                  monto: Number(r.compras_proveedores.monto_costo || 0),
                                                  fechaCompra: r.compras_proveedores.fecha_compra,
                                                  fechaVencimientoGarantia:
                                                    r.compras_proveedores.fecha_vencimiento_garantia,
                                                  estatusGarantia: r.compras_proveedores.estatus_garantia,
                                                })
                                              }
                                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 cursor-pointer transition-colors"
                                              title="Ver comprobante de garantía (Foto / PDF)"
                                            >
                                              <FileText size={10} className="text-emerald-600" />
                                              Ticket #{r.compras_proveedores.folio_ticket_nota}
                                            </button>
                                          ) : (
                                            <button
                                              type="button"
                                              onClick={() => setAttachingPartForEvidence(r)}
                                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 cursor-pointer transition-colors"
                                              title="Adjuntar comprobante o póliza de garantía"
                                            >
                                              + Garantía
                                            </button>
                                          )}
                                        </div>
                                        {(r.numero_parte || r.proveedor) && (
                                          <div className="text-[11px] text-slate-500 font-mono">
                                            {r.numero_parte ? `P/N: ${r.numero_parte}` : ""} {r.proveedor ? `• Prov: ${r.proveedor}` : ""}
                                          </div>
                                        )}
                                      </td>
                                      <td className="py-2 px-3 text-center tabular-nums font-bold">{qty}</td>
                                      <td className="py-2 px-3 text-right tabular-nums text-slate-700">
                                        ${unit.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                                      </td>
                                      <td className="py-2 px-3 text-right font-bold text-slate-900 tabular-nums">
                                        ${sub.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                                      </td>
                                      <td className="py-2 px-3 text-right">
                                        <div className="inline-flex items-center gap-1">
                                          {!isDeferred && (
                                            <button
                                              type="button"
                                              onClick={() => handleDeferPart(r)}
                                              title="Diferir para próxima visita"
                                              className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 cursor-pointer"
                                            >
                                              Diferir
                                            </button>
                                          )}
                                          <button
                                            type="button"
                                            onClick={() => handleRemovePart(r.id)}
                                            className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                                            title="Eliminar refacción"
                                          >
                                            <Trash2 size={13} />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}

                                {/* Services in this operation */}
                                {group.services.map((s: any) => {
                                  const qty = Number(s.cantidad || 1);
                                  const unit = Number(s.precio_cobrado || 0);
                                  const sub = unit * qty;
                                  const srvName = s.servicios_taller?.nombre || s.nombre || "Servicio";
                                  const isCortesia = s.es_cortesia || unit === 0;
                                  const isDeferred = s.estatus_aprobacion === "Diferido";
                                  const isEditing = editingServiceId === s.id;

                                  return (
                                    <tr key={`g-srv-${s.id}`} className={isDeferred ? "bg-slate-50 opacity-60" : "hover:bg-slate-50/70"}>
                                      <td className="py-2 px-3 font-semibold text-emerald-700 text-[11px]">
                                        🔧 Mano Obra
                                      </td>
                                      <td className="py-2 px-3">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span className="font-semibold text-slate-900">{srvName}</span>
                                          {isCortesia && (
                                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-0.5">
                                              <Gift size={10} /> GRATIS
                                            </span>
                                          )}
                                        </div>
                                        {s.notas && <div className="text-[11px] text-slate-500">{s.notas}</div>}
                                      </td>
                                      <td className="py-2 px-3 text-center tabular-nums font-bold">{qty}</td>
                                      <td className="py-2 px-3 text-right tabular-nums">
                                        {isEditing ? (
                                          <div className="inline-flex items-center gap-1 justify-end">
                                            <input
                                              type="number"
                                              value={editingServicePrice}
                                              onChange={(e) => setEditingServicePrice(e.target.value)}
                                              className="w-20 h-7 text-xs border border-blue-400 rounded px-1 text-right font-bold"
                                              autoFocus
                                              onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                  handleInlineUpdateServicePrice(s.id, parseFloat(editingServicePrice) || 0);
                                                } else if (e.key === "Escape") {
                                                  setEditingServiceId(null);
                                                }
                                              }}
                                            />
                                            <button
                                              type="button"
                                              onClick={() => handleInlineUpdateServicePrice(s.id, parseFloat(editingServicePrice) || 0)}
                                              className="p-1 text-emerald-600 hover:text-emerald-800 cursor-pointer"
                                              title="Guardar precio"
                                            >
                                              <Check size={13} />
                                            </button>
                                          </div>
                                        ) : (
                                          <div className="inline-flex items-center gap-1 justify-end">
                                            <span className={isCortesia ? "text-emerald-700 font-bold" : "text-slate-800"}>
                                              {isCortesia ? "$0.00" : `$${unit.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`}
                                            </span>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setEditingServiceId(s.id);
                                                setEditingServicePrice(String(unit));
                                              }}
                                              className="p-0.5 text-slate-400 hover:text-blue-600 cursor-pointer"
                                              title="Editar precio al vuelo"
                                            >
                                              <Pencil size={11} />
                                            </button>
                                          </div>
                                        )}
                                      </td>
                                      <td className="py-2 px-3 text-right font-bold tabular-nums">
                                        {isCortesia ? (
                                          <span className="text-emerald-700 font-black">$0.00</span>
                                        ) : (
                                          <span className="text-slate-900">${sub.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
                                        )}
                                      </td>
                                      <td className="py-2 px-3 text-right">
                                        <div className="inline-flex items-center gap-1">
                                          <button
                                            type="button"
                                            onClick={() => handleToggleCortesia(s)}
                                            title={isCortesia ? "Restaurar precio normal de catálogo" : "Hacer gratis / cortesía ($0.00)"}
                                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold border cursor-pointer ${
                                              isCortesia
                                                ? "bg-emerald-600 text-white border-emerald-700"
                                                : "bg-white hover:bg-emerald-50 text-emerald-700 border-emerald-300"
                                            }`}
                                          >
                                            <Gift size={11} />
                                          </button>
                                          {!isDeferred && (
                                            <button
                                              type="button"
                                              onClick={() => handleDeferService(s)}
                                              title="Diferir mano de obra"
                                              className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 cursor-pointer"
                                            >
                                              Diferir
                                            </button>
                                          )}
                                          <button
                                            type="button"
                                            onClick={() => handleRemoveService(s.id)}
                                            className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                                            title="Eliminar mano de obra"
                                          >
                                            <Trash2 size={13} />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>

                          {/* Operation Card Footer with Quick Add to this package */}
                          <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                              <span>Agregar a este paquete:</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setServicePackage(group.nombre);
                                  setIsAddingService(true);
                                }}
                                className="px-2 py-0.5 rounded bg-white hover:bg-slate-100 border border-slate-300 text-[11px] font-semibold text-slate-700 cursor-pointer"
                              >
                                + Mano de Obra
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setPartPackage(group.nombre);
                                  setIsAddingPart(true);
                                }}
                                className="px-2 py-0.5 rounded bg-white hover:bg-slate-100 border border-slate-300 text-[11px] font-semibold text-slate-700 cursor-pointer"
                              >
                                + Refacción
                              </button>
                              {isLlantasCat && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setQuoteViewMode("clasico");
                                    setTireTab("jit");
                                    setIsAddingTire(true);
                                  }}
                                  className="px-2 py-0.5 rounded bg-white hover:bg-slate-100 border border-slate-300 text-[11px] font-semibold text-slate-700 cursor-pointer"
                                >
                                  + Neumático JIT
                                </button>
                              )}
                            </div>

                            <div className="text-xs font-mono font-bold text-slate-900">
                              Subtotal {group.nombre}: ${group.subtotal.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              ) : (
                <div className="space-y-5">
                  {/* 1. MANO DE OBRA (SERVICIOS DE TALLER) */}
                  <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Wrench size={15} className="text-blue-600" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                          Mano de Obra y Servicios ({servicesList.length})
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsAddingService(!isAddingService)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <Plus size={13} /> Agregar Mano de Obra
                      </button>
                    </div>

                {isAddingService && renderServiceForm()}

                {servicesList.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    No hay mano de obra cargada en esta orden.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/60 text-[10px] uppercase font-bold text-slate-500">
                          <th className="py-2 px-3">Servicio / Mano de Obra</th>
                          <th className="py-2 px-3">Técnico</th>
                          <th className="py-2 px-3 text-center">Hrs</th>
                          <th className="py-2 px-3 text-right">Comisión Téc.</th>
                          <th className="py-2 px-3 text-center">Estatus</th>
                          <th className="py-2 px-3 text-right">Importe</th>
                          <th className="py-2 px-3 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {servicesList.map((row: any) => {
                          const mech = mechanics.find(
                            (m) => m.id === (row.mecanico_id || order.mecanico_id)
                          );
                          const pct = Number(row.comision_porcentaje ?? 15);
                          const importe = Number(row.precio_cobrado || 0) * Number(row.cantidad || 1);
                          const comisionMonto = importe * (pct / 100);
                          const isDeferred = row.estatus_aprobacion === "Diferido";
                          const isCortesia = row.es_cortesia || Number(row.precio_cobrado) === 0;
                          const isEditing = editingServiceId === row.id;

                          return (
                            <tr
                              key={row.id}
                              className={isDeferred ? "bg-slate-50 opacity-60" : "hover:bg-slate-50/80"}
                            >
                              <td className="py-2.5 px-3">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-semibold text-slate-900">
                                    {row.servicios_taller?.nombre || "Servicio"}
                                  </span>
                                  {row.paquete_operacion && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                      {row.paquete_operacion}
                                    </span>
                                  )}
                                  {isCortesia && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-0.5">
                                      <Gift size={10} /> GRATIS
                                    </span>
                                  )}
                                </div>
                                {row.notas && (
                                  <div className="text-[11px] text-slate-500">{row.notas}</div>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-[11px] text-slate-600">
                                {mech?.nombre || "Por asignar"}
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono tabular-nums text-[11px]">
                                {Number(row.horas_labor || 1).toFixed(1)}h
                              </td>
                              <td className="py-2.5 px-3 text-right tabular-nums text-[11px] text-slate-600">
                                ${comisionMonto.toLocaleString("es-MX", { minimumFractionDigits: 2 })}{" "}
                                <span className="text-[10px] text-slate-400">({pct}%)</span>
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleToggleServiceApproval(row)}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase cursor-pointer ${
                                    row.estatus_aprobacion === "Diferido"
                                      ? "bg-slate-200 text-slate-600"
                                      : row.estatus_aprobacion === "Pendiente"
                                      ? "bg-amber-100 text-amber-800"
                                      : "bg-emerald-100 text-emerald-800"
                                  }`}
                                >
                                  {row.estatus_aprobacion || "Aprobado"}
                                </button>
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold tabular-nums">
                                {isEditing ? (
                                  <div className="inline-flex items-center gap-1 justify-end">
                                    <input
                                      type="number"
                                      value={editingServicePrice}
                                      onChange={(e) => setEditingServicePrice(e.target.value)}
                                      className="w-20 h-7 text-xs border border-blue-400 rounded px-1 text-right font-bold"
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          handleInlineUpdateServicePrice(row.id, parseFloat(editingServicePrice) || 0);
                                        } else if (e.key === "Escape") {
                                          setEditingServiceId(null);
                                        }
                                      }}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleInlineUpdateServicePrice(row.id, parseFloat(editingServicePrice) || 0)}
                                      className="p-1 text-emerald-600 hover:text-emerald-800 cursor-pointer"
                                      title="Guardar precio"
                                    >
                                      <Check size={13} />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="inline-flex items-center gap-1 justify-end">
                                    <span className={isCortesia ? "text-emerald-700 font-bold" : "text-slate-900"}>
                                      {isCortesia ? "$0.00" : `$${importe.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingServiceId(row.id);
                                        setEditingServicePrice(String(row.precio_cobrado || 0));
                                      }}
                                      className="p-0.5 text-slate-400 hover:text-blue-600 cursor-pointer"
                                      title="Editar precio al vuelo"
                                    >
                                      <Pencil size={11} />
                                    </button>
                                  </div>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleCortesia(row)}
                                    title={isCortesia ? "Restaurar precio normal" : "Hacer cortesía ($0.00)"}
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold border cursor-pointer ${
                                      isCortesia
                                        ? "bg-emerald-600 text-white border-emerald-700"
                                        : "bg-white hover:bg-emerald-50 text-emerald-700 border-emerald-300"
                                    }`}
                                  >
                                    <Gift size={11} />
                                  </button>
                                  {!isDeferred && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeferService(row)}
                                      title="Enviar a Trabajos Diferidos para próxima visita"
                                      className="px-2 py-1 rounded text-[10px] font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 cursor-pointer"
                                    >
                                      Diferir
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveService(row.id)}
                                    className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                                    title="Eliminar mano de obra"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* 2. REFACCIONES SOBRE PEDIDO / BUYOUTS (CON CALCULADORA DE MARGEN) */}
              <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Package size={15} className="text-indigo-600" />
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                        Refacciones Sobre Pedido / Buyouts ({partsList.length})
                      </h3>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {partsList.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setAttachingPartForEvidence(null);
                          setIsRegistrarTicketModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
                        title="Subir 1 ticket que ampare varias refacciones con su foto y garantía"
                      >
                        <FileText size={13} /> + Registrar Ticket de Compra
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsAddingPart(!isAddingPart)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <Calculator size={13} /> + Cotizar Refacción Externa
                    </button>
                  </div>
                </div>

                {/* Resumen de Tickets de Compra Vinculados en esta Orden */}
                {(() => {
                  const ticketsMap = new Map<string, {
                    folio: string;
                    proveedor: string;
                    garantia: string;
                    evidenciaUrl: string | null;
                    piezasCount: number;
                    totalCosto: number;
                    compraData: any;
                  }>();

                  partsList.forEach((p: any) => {
                    const folio = p.compras_proveedores?.folio_ticket_nota || p.folio_ticket_nota;
                    if (folio) {
                      const key = p.compra_proveedor_id || folio;
                      const existing = ticketsMap.get(key) || {
                        folio,
                        proveedor: p.compras_proveedores?.proveedores?.nombre_comercial || p.proveedor || "Proveedor",
                        garantia: p.garantia_especifica || (p.compras_proveedores?.meses_garantia ? `${p.compras_proveedores.meses_garantia} meses` : "Garantía"),
                        evidenciaUrl: p.compras_proveedores?.evidencia_url || p.evidencia_url || null,
                        piezasCount: 0,
                        totalCosto: 0,
                        compraData: p.compras_proveedores,
                      };
                      existing.piezasCount += 1;
                      existing.totalCosto += Number(p.costo_unitario || 0) * Number(p.cantidad || 1);
                      ticketsMap.set(key, existing);
                    }
                  });

                  const tickets = Array.from(ticketsMap.values());
                  if (tickets.length === 0) return null;

                  return (
                    <div className="px-4 py-2 bg-slate-50/70 border-b border-slate-200/80 flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                        <ShieldCheck size={12} className="text-emerald-600" /> Tickets de Compra ({tickets.length}):
                      </span>
                      {tickets.map((t, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            if (t.evidenciaUrl) {
                              setSelectedTicketEvidence({
                                evidenciaUrl: t.evidenciaUrl,
                                folio: t.folio,
                                proveedorNombre: t.proveedor,
                                descripcion: `${t.piezasCount} piezas amparadas`,
                                monto: t.totalCosto,
                                fechaCompra: t.compraData?.fecha_compra || new Date().toISOString().split("T")[0],
                                fechaVencimientoGarantia: t.compraData?.fecha_vencimiento_garantia,
                                estatusGarantia: t.compraData?.estatus_garantia || "VIGENTE",
                              });
                            }
                          }}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border transition-all ${
                            t.evidenciaUrl
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100 cursor-pointer"
                              : "bg-slate-100 text-slate-700 border-slate-200"
                          }`}
                          title="Ver ticket de compra y póliza de garantía"
                        >
                          <FileText size={11} className={t.evidenciaUrl ? "text-emerald-600" : "text-slate-400"} />
                          <span>{t.proveedor} • #{t.folio}</span>
                          <span className="text-[10px] text-emerald-700 font-mono">(${t.totalCosto.toFixed(2)})</span>
                          <span className="px-1 py-0.2 rounded text-[9px] bg-white/70 text-slate-600 font-bold">
                            {t.piezasCount} {t.piezasCount === 1 ? "pieza" : "piezas"}
                          </span>
                        </button>
                      ))}
                    </div>
                  );
                })()}

                {isAddingPart && renderPartForm()}

                {partsList.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    No hay refacciones externas (buyouts) en esta orden.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/60 text-[10px] uppercase font-bold text-slate-500">
                          <th className="py-2 px-3">Refacción / No. Parte</th>
                          <th className="py-2 px-3">Proveedor</th>
                          <th className="py-2 px-3 text-center">Cant</th>
                          <th className="py-2 px-3 text-right">Costo U.</th>
                          <th className="py-2 px-3 text-center">Margen</th>
                          <th className="py-2 px-3 text-right">P. Venta</th>
                          <th className="py-2 px-3 text-right">Subtotal</th>
                          <th className="py-2 px-3 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {partsList.map((part: any) => {
                          const isDeferred = part.estatus_aprobacion === "Diferido";
                          const utilRow =
                            Number(part.subtotal || 0) -
                            Number(part.costo_unitario || 0) * Number(part.cantidad || 1);
                          return (
                            <tr
                              key={part.id}
                              className={isDeferred ? "bg-slate-50 opacity-60" : "hover:bg-slate-50/80"}
                            >
                              <td className="py-2.5 px-3">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-semibold text-slate-900">{part.nombre}</span>
                                  {part.paquete_operacion && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                      {part.paquete_operacion}
                                    </span>
                                  )}
                                  {part.compras_proveedores?.evidencia_url || part.evidencia_url ? (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setSelectedTicketEvidence({
                                          evidenciaUrl: part.compras_proveedores?.evidencia_url || part.evidencia_url,
                                          folio: part.compras_proveedores?.folio_ticket_nota || part.folio_ticket_nota || "S/F",
                                          proveedorNombre:
                                            part.compras_proveedores?.proveedores?.nombre_comercial ||
                                            part.proveedor ||
                                            "Proveedor",
                                          descripcion: part.nombre,
                                          monto: Number(part.compras_proveedores?.monto_costo || (Number(part.costo_unitario || 0) * Number(part.cantidad || 1))),
                                          fechaCompra: part.compras_proveedores?.fecha_compra || new Date().toISOString().split("T")[0],
                                          fechaVencimientoGarantia:
                                            part.compras_proveedores?.fecha_vencimiento_garantia,
                                          estatusGarantia: part.compras_proveedores?.estatus_garantia || "VIGENTE",
                                        })
                                      }
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 cursor-pointer transition-colors"
                                      title="Ver comprobante de garantía (Foto / PDF)"
                                    >
                                      <ShieldCheck size={11} className="text-emerald-600" />
                                      <span>
                                        {part.garantia_especifica || (part.compras_proveedores?.meses_garantia ? `${part.compras_proveedores.meses_garantia} meses` : "Garantía")} • Ticket #{part.compras_proveedores?.folio_ticket_nota || part.folio_ticket_nota || "Nota"}
                                      </span>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setAttachingPartForEvidence(part)}
                                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 cursor-pointer transition-colors"
                                      title="Adjuntar ticket o comprobante de garantía"
                                    >
                                      <ShieldCheck size={10} className="text-slate-400" />
                                      <span>+ Garantía</span>
                                    </button>
                                  )}
                                </div>
                                {part.numero_parte && (
                                  <span className="font-mono text-[10px] text-slate-500">
                                    P/N: {part.numero_parte}
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold">
                                  {part.proveedor || "Proveedor"}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-center tabular-nums font-medium">
                                {part.cantidad}
                              </td>
                              <td className="py-2.5 px-3 text-right tabular-nums text-slate-500">
                                ${Number(part.costo_unitario).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-mono text-[10px] font-bold tabular-nums">
                                  +{Number(part.margen_porcentaje).toFixed(0)}% ($
                                  {utilRow.toLocaleString("es-MX", { maximumFractionDigits: 0 })})
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right tabular-nums">
                                ${Number(part.precio_unitario).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold text-slate-900 tabular-nums">
                                ${Number(part.subtotal).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <div className="inline-flex items-center gap-1">
                                  {!isDeferred && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeferPart(part)}
                                      className="px-2 py-1 rounded text-[10px] font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 cursor-pointer"
                                    >
                                      Diferir
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleRemovePart(part.id)}
                                    className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* 3. NEUMÁTICOS: JUST-IN-TIME (SOBRE PEDIDO) & CATÁLOGO */}
              <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CircleDot size={15} className="text-blue-600" />
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                        Neumáticos ({tiresList.length})
                      </h3>
                      <span className="text-[10px] text-slate-500 font-medium">
                        Cotización al Vuelo (Sobre Pedido / JIT) & Inventario
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyWhatsAppTireQuote}
                      title="Copiar cotización de neumáticos con formato para WhatsApp"
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-colors cursor-pointer border ${
                        copiedWhatsAppTireQuote
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                          : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border-emerald-300"
                      }`}
                    >
                      {copiedWhatsAppTireQuote ? (
                        <>
                          <CheckCheck size={14} className="text-white" /> ¡Copiado WhatsApp!
                        </>
                      ) : (
                        <>
                          <Copy size={13} /> Cotización WhatsApp
                        </>
                      )}
                    </button>
                    {order?.vehiculos?.clientes?.telefono && (
                      <button
                        type="button"
                        onClick={handleSendWhatsAppTireQuoteDirect}
                        title="Enviar cotización directo al WhatsApp del cliente"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                      >
                        <MessageCircle size={13} /> Enviar WA
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsAddingTire(!isAddingTire)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                    >
                      <Plus size={13} strokeWidth={2.5} /> Cotizar Neumáticos
                    </button>
                  </div>
                </div>

                {isAddingTire && (
                  <div className="p-4 bg-slate-50/80 border-b border-slate-200 space-y-3.5">
                    {/* Quoter Subtabs */}
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setTireTab("jit")}
                          className={`px-3 py-1 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                            tireTab === "jit"
                              ? "bg-blue-600 text-white shadow-2xs"
                              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                          }`}
                        >
                          ⚡ Sobre Pedido / JIT al Vuelo (Cova Express)
                        </button>
                        <button
                          type="button"
                          onClick={() => setTireTab("catalogo")}
                          className={`px-3 py-1 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                            tireTab === "catalogo"
                              ? "bg-blue-600 text-white shadow-2xs"
                              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                          }`}
                        >
                          📦 Catálogo Base ({availableTires.length})
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsAddingTire(false)}
                        className="text-xs text-slate-400 hover:text-slate-600"
                      >
                        Cerrar
                      </button>
                    </div>

                    {/* TAB A: Just-in-Time Express Quoter */}
                    {tireTab === "jit" ? (
                      <div className="space-y-3">
                        {/* Accelerator 1: Vehicle OEM Suggested Size */}
                        {suggestedOemSize && (
                          <div className="flex flex-wrap items-center justify-between gap-2 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300/80 rounded-lg px-3 py-2 text-xs shadow-2xs">
                            <div className="flex items-center gap-2 text-amber-950 font-medium">
                              <Car size={15} className="text-amber-600 shrink-0" />
                              <span>
                                Medida OEM sugerida para <strong className="font-bold text-slate-900">{order?.vehiculos?.marca} {order?.vehiculos?.modelo} {order?.vehiculos?.anio ? `'${String(order?.vehiculos?.anio).slice(-2)}` : ""}</strong>:
                                <span className="ml-1.5 px-2 py-0.5 rounded font-mono font-black text-amber-900 bg-amber-200/80 border border-amber-300">
                                  {suggestedOemSize}
                                </span>
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => parseMedidaExpress(suggestedOemSize)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold rounded-md transition-colors cursor-pointer shadow-2xs shrink-0"
                            >
                              <Zap size={12} className="fill-current" /> 1-Clic: Aplicar {suggestedOemSize}
                            </button>
                          </div>
                        )}

                        {/* Row 1: Medida Express Parser & Fine Tuning */}
                        <div>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1">
                              <Sparkles size={12} className="text-amber-500" />
                              Medida de Llanta (Escribe o Selecciona)
                            </label>
                            <span className="text-[10px] text-slate-500">
                              Detecta automáticamente: ej. <code className="bg-slate-200 px-1 py-0.5 rounded font-mono text-slate-800">205/55R16</code> o <code className="bg-slate-200 px-1 py-0.5 rounded font-mono text-slate-800">225 65 17</code>
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                            <div className="sm:col-span-5">
                              <input
                                type="text"
                                placeholder="Escribe medida express (ej. 205/55R16)..."
                                value={jitMedidaExpress}
                                onChange={(e) => parseMedidaExpress(e.target.value)}
                                className="w-full h-8 px-2.5 text-xs bg-white border border-blue-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-md font-semibold text-slate-900 shadow-2xs"
                              />

                              {/* Accelerator 2: Live Typeahead Size Suggestions */}
                              {matchingSizes.length > 0 && (
                                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                  <span className="text-[10px] text-blue-700 font-bold flex items-center gap-0.5">
                                    <Sparkles size={10} /> Sugerencias:
                                  </span>
                                  {matchingSizes.map((sz) => (
                                    <button
                                      key={sz}
                                      type="button"
                                      onClick={() => parseMedidaExpress(sz)}
                                      className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-900 hover:bg-blue-200 border border-blue-300 transition-colors cursor-pointer"
                                    >
                                      ⚡ {sz}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="sm:col-span-7 flex items-center gap-1.5">
                              <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-md px-2 h-8 text-xs">
                                <span className="text-slate-400 text-[10px] uppercase font-bold">Ancho:</span>
                                <input
                                  type="number"
                                  min="135"
                                  max="335"
                                  step="5"
                                  value={jitAncho}
                                  onChange={(e) => setJitAncho(parseInt(e.target.value) || 205)}
                                  className="w-12 text-center font-bold text-slate-900 border-none outline-none p-0 text-xs"
                                />
                              </div>
                              <span className="text-slate-400 font-bold">/</span>
                              <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-md px-2 h-8 text-xs">
                                <span className="text-slate-400 text-[10px] uppercase font-bold">Perfil:</span>
                                <input
                                  type="number"
                                  min="25"
                                  max="85"
                                  step="5"
                                  value={jitPerfil}
                                  onChange={(e) => setJitPerfil(parseInt(e.target.value) || 55)}
                                  className="w-10 text-center font-bold text-slate-900 border-none outline-none p-0 text-xs"
                                />
                              </div>
                              <div className="flex items-center gap-1 bg-blue-50 border border-blue-300 rounded-md px-2 h-8 text-xs">
                                <span className="text-blue-700 text-[10px] uppercase font-bold">Rin: R</span>
                                <input
                                  type="number"
                                  min="12"
                                  max="24"
                                  value={jitRin}
                                  onChange={(e) => setJitRin(parseInt(e.target.value) || 16)}
                                  className="w-8 text-center font-bold text-blue-900 bg-transparent border-none outline-none p-0 text-xs"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Quick Rim Chips */}
                          <div className="flex items-center gap-1.5 mt-2 overflow-x-auto">
                            <span className="text-[10px] text-slate-400 font-medium">Rines Rápidos:</span>
                            {POPULAR_RIMS.map((r) => (
                              <button
                                key={r}
                                type="button"
                                onClick={() => setJitRin(r)}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                                  jitRin === r
                                    ? "bg-blue-600 text-white"
                                    : "bg-white text-slate-600 hover:bg-slate-200 border border-slate-200"
                                }`}
                              >
                                R{r}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Accelerator 3: 3-Tier 1-Click Quick Presets (Económica / Calidad / Premium) */}
                        <div className="bg-slate-100/90 border border-slate-200 rounded-lg p-2.5 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                              <Layers size={13} className="text-blue-600" />
                              Llenado Rápido por Gama para <strong className="font-mono text-blue-950 font-black">{jitAncho}/{jitPerfil} R{jitRin}</strong>:
                            </span>
                            <span className="text-[10px] text-slate-500 font-medium hidden sm:inline">
                              1 clic para autorrellenar marca, modelo y precio
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {/* Tier 1: Económica */}
                            <button
                              type="button"
                              onClick={() => handleApplyTierPreset(tierPresets.eco)}
                              className="flex flex-col text-left p-2 rounded-md bg-white hover:bg-emerald-50/60 border border-slate-200 hover:border-emerald-400 transition-all cursor-pointer group shadow-2xs"
                            >
                              <div className="flex items-center justify-between w-full mb-1">
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">
                                  🟢 Económica
                                </span>
                                <span className="text-[9px] text-slate-400 font-mono">
                                  {tierPresets.eco.source}
                                </span>
                              </div>
                              <div className="text-xs font-bold text-slate-900 group-hover:text-emerald-800 truncate">
                                {tierPresets.eco.marca} <span className="font-normal text-slate-600">{tierPresets.eco.modelo}</span>
                              </div>
                              <div className="flex items-center justify-between text-[11px] mt-1 pt-1 border-t border-slate-100 font-mono">
                                <span className="text-slate-500 text-[10px]">Costo: ${tierPresets.eco.costo.toLocaleString("es-MX")}</span>
                                <span className="font-black text-emerald-700 font-bold">${tierPresets.eco.precio.toLocaleString("es-MX")}</span>
                              </div>
                            </button>

                            {/* Tier 2: Calidad / Intermedia */}
                            <button
                              type="button"
                              onClick={() => handleApplyTierPreset(tierPresets.mid)}
                              className="flex flex-col text-left p-2 rounded-md bg-white hover:bg-blue-50/60 border border-slate-200 hover:border-blue-400 transition-all cursor-pointer group shadow-2xs"
                            >
                              <div className="flex items-center justify-between w-full mb-1">
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-800">
                                  🔵 Calidad / Valor
                                </span>
                                <span className="text-[9px] text-slate-400 font-mono">
                                  {tierPresets.mid.source}
                                </span>
                              </div>
                              <div className="text-xs font-bold text-slate-900 group-hover:text-blue-800 truncate">
                                {tierPresets.mid.marca} <span className="font-normal text-slate-600">{tierPresets.mid.modelo}</span>
                              </div>
                              <div className="flex items-center justify-between text-[11px] mt-1 pt-1 border-t border-slate-100 font-mono">
                                <span className="text-slate-500 text-[10px]">Costo: ${tierPresets.mid.costo.toLocaleString("es-MX")}</span>
                                <span className="font-black text-blue-800 font-bold">${tierPresets.mid.precio.toLocaleString("es-MX")}</span>
                              </div>
                            </button>

                            {/* Tier 3: Premium */}
                            <button
                              type="button"
                              onClick={() => handleApplyTierPreset(tierPresets.prem)}
                              className="flex flex-col text-left p-2 rounded-md bg-white hover:bg-amber-50/60 border border-slate-200 hover:border-amber-400 transition-all cursor-pointer group shadow-2xs"
                            >
                              <div className="flex items-center justify-between w-full mb-1">
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-900">
                                  ⭐ Premium
                                </span>
                                <span className="text-[9px] text-slate-400 font-mono">
                                  {tierPresets.prem.source}
                                </span>
                              </div>
                              <div className="text-xs font-bold text-slate-900 group-hover:text-amber-900 truncate">
                                {tierPresets.prem.marca} <span className="font-normal text-slate-600">{tierPresets.prem.modelo}</span>
                              </div>
                              <div className="flex items-center justify-between text-[11px] mt-1 pt-1 border-t border-slate-100 font-mono">
                                <span className="text-slate-500 text-[10px]">Costo: ${tierPresets.prem.costo.toLocaleString("es-MX")}</span>
                                <span className="font-black text-amber-900 font-bold">${tierPresets.prem.precio.toLocaleString("es-MX")}</span>
                              </div>
                            </button>
                          </div>
                        </div>

                        {/* Row 2: Brand, Model, Supplier */}
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-1 border-t border-slate-200">
                          <div className="sm:col-span-5 space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                              Marca del Neumático
                            </label>
                            <input
                              type="text"
                              value={jitMarca}
                              onChange={(e) => setJitMarca(e.target.value)}
                              placeholder="Ej. Michelin, Bridgestone, Tornel..."
                              className="w-full h-8 px-2 text-xs bg-white border border-slate-300 rounded-md font-semibold text-slate-900"
                            />
                            {/* Brand Chips */}
                            <div className="flex flex-wrap gap-1">
                              {TOP_TIRE_BRANDS.slice(0, 8).map((b) => (
                                <button
                                  key={b}
                                  type="button"
                                  onClick={() => setJitMarca(b)}
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-colors cursor-pointer ${
                                    jitMarca.toLowerCase() === b.toLowerCase()
                                      ? "bg-slate-900 text-white"
                                      : "bg-white text-slate-600 hover:bg-slate-200 border border-slate-200"
                                  }`}
                                >
                                  {b}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="sm:col-span-4 space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                              Modelo / Diseño de Piso
                            </label>
                            <input
                              type="text"
                              value={jitModelo}
                              onChange={(e) => setJitModelo(e.target.value)}
                              placeholder="Ej. Primacy 4, Turanza, Sobre Pedido..."
                              className="w-full h-8 px-2 text-xs bg-white border border-slate-300 rounded-md font-semibold text-slate-900"
                            />
                            <div className="flex items-center gap-2 text-[10px] text-slate-500">
                              <span>Terreno:</span>
                              <select
                                value={jitTipoTerreno}
                                onChange={(e) => setJitTipoTerreno(e.target.value)}
                                className="h-6 text-[10px] bg-white border border-slate-300 rounded px-1"
                              >
                                <option value="HT">HT (Carretera/Urbano)</option>
                                <option value="AT">AT (Todo Terreno)</option>
                                <option value="MT">MT (Fango/Off-Road)</option>
                                <option value="All Season">All Season</option>
                              </select>
                            </div>
                          </div>

                          <div className="sm:col-span-3 space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                              Distribuidor / Mayorista
                            </label>
                            <select
                              value={jitProveedor}
                              onChange={(e) => setJitProveedor(e.target.value)}
                              className="w-full h-8 px-2 text-xs bg-white border border-slate-300 rounded-md font-semibold text-slate-900"
                            >
                              {PROVEEDORES_LLANTAS.map((prov) => (
                                <option key={prov} value={prov}>
                                  {prov}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Row 3: Live Margin & Price Calculator */}
                        <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-3 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                              <Calculator size={13} className="text-blue-700" />
                              Calculadora de Margen & Costo Distribuidor
                            </span>
                            <span className="text-[10px] font-mono font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded">
                              Utilidad Unitaria: ${(calcJitPrecioUnitario - numericJitCosto).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                            <div>
                              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                                Costo Distribuidor U. ($)
                              </label>
                              <div className="relative">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">$</span>
                                <input
                                  type="number"
                                  step="any"
                                  placeholder="0.00"
                                  value={jitCostoUnitario}
                                  onChange={(e) => handleJitCostoChange(e.target.value)}
                                  className="w-full h-8 pl-6 pr-2 text-xs bg-white border border-slate-300 rounded-md font-bold text-slate-900 tabular-nums focus:border-blue-600 focus:outline-none"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                                Margen Deseado (%)
                              </label>
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  step="1"
                                  value={jitMargen}
                                  onChange={(e) => handleJitMargenChange(e.target.value)}
                                  className="w-16 h-8 text-center text-xs bg-white border border-slate-300 rounded-md font-bold text-slate-900 tabular-nums focus:border-blue-600 focus:outline-none"
                                />
                                <div className="flex gap-1 overflow-x-auto">
                                  {["20", "25", "30", "35"].map((pct) => (
                                    <button
                                      key={pct}
                                      type="button"
                                      onClick={() => handleJitMargenChange(pct)}
                                      className={`px-1.5 h-8 text-[10px] font-bold rounded cursor-pointer ${
                                        jitMargen === pct
                                          ? "bg-blue-600 text-white"
                                          : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                                      }`}
                                    >
                                      +{pct}%
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                                Precio Venta U. ($)
                              </label>
                              <div className="relative">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">$</span>
                                <input
                                  type="number"
                                  step="any"
                                  placeholder="0.00"
                                  value={jitPrecioVentaUnitario}
                                  onChange={(e) => handleJitPrecioVentaChange(e.target.value)}
                                  className="w-full h-8 pl-6 pr-2 text-xs bg-white border border-emerald-400 rounded-md font-black text-slate-900 tabular-nums focus:border-emerald-600 focus:outline-none"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                                Cantidad
                              </label>
                              <div className="flex items-center gap-1">
                                {[1, 2, 4].map((q) => (
                                  <button
                                    key={q}
                                    type="button"
                                    onClick={() => setJitCantidad(q)}
                                    className={`flex-1 h-8 text-xs font-bold rounded cursor-pointer transition-colors ${
                                      jitCantidad === q
                                        ? "bg-slate-900 text-white"
                                        : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-100"
                                    }`}
                                  >
                                    x{q}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Live Profitability Summary Bar */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-blue-200 text-xs">
                            <div className="flex items-center gap-3">
                              <span className="text-slate-600">
                                Total Venta: <strong className="font-mono text-slate-900 font-bold">${calcJitSubtotal.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</strong>
                              </span>
                              <span className="text-slate-400">|</span>
                              <span className="text-slate-600">
                                Costo: <strong className="font-mono text-slate-700">${(numericJitCosto * numericJitCant).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</strong>
                              </span>
                              <span className="text-slate-400">|</span>
                              <span className="text-emerald-700 font-bold">
                                Ganancia: <strong className="font-mono font-black">+${calcJitUtilidad.toLocaleString("es-MX", { minimumFractionDigits: 2 })} ({numericJitMargen.toFixed(0)}%)</strong>
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                disabled={addingTireLoading || calcJitPrecioUnitario <= 0}
                                onClick={handleAddJustInTimeTire}
                                className="px-4 h-8 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-md disabled:opacity-50 cursor-pointer transition-colors shadow-2xs"
                              >
                                {addingTireLoading ? "Guardando..." : `+ Agregar ${jitCantidad} Neumáticos a Cotización`}
                              </button>
                              <button
                                type="button"
                                onClick={() => setIsAddingTire(false)}
                                className="px-3 h-8 text-xs text-slate-500 hover:text-slate-700"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* TAB B: Catalog Selection */
                      <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                        <select
                          value={selectedTireId}
                          onChange={(e) => setSelectedTireId(e.target.value)}
                          className="flex-1 h-8 text-xs bg-white border border-slate-300 rounded-md px-2 text-slate-900"
                        >
                          <option value="">Seleccionar medida y modelo del catálogo...</option>
                          {availableTires.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.marca} {t.modelo_llanta} ({t.ancho}/{t.perfil} R{t.rin}) • {Number(t.stock_actual) > 0 ? `Stock: ${t.stock_actual}` : "Sobre Pedido / JIT"} • ${Number(t.precio_venta).toLocaleString("es-MX")}
                            </option>
                          ))}
                        </select>
                        <div className="flex items-center gap-1">
                          {[1, 2, 4].map((q) => (
                            <button
                              key={q}
                              type="button"
                              onClick={() => setSelectedTireQty(q)}
                              className={`w-9 h-8 text-xs font-bold rounded cursor-pointer ${
                                selectedTireQty === q
                                  ? "bg-slate-900 text-white"
                                  : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-100"
                              }`}
                            >
                              x{q}
                            </button>
                          ))}
                        </div>
                        <button
                          type="button"
                          disabled={!selectedTireId || addingTireLoading}
                          onClick={handleAddTire}
                          className="px-4 h-8 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold disabled:opacity-50 cursor-pointer"
                        >
                          {addingTireLoading ? "..." : "Agregar del Catálogo"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsAddingTire(false)}
                          className="px-2 h-8 text-xs text-slate-500"
                        >
                          Cancelar
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {tiresList.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    No se han cotizado neumáticos en esta orden de servicio.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/60 text-[10px] uppercase font-bold text-slate-500">
                          <th className="py-2 px-3">Marca / Modelo / Medida</th>
                          <th className="py-2 px-3">Modalidad</th>
                          <th className="py-2 px-3 text-center">Cant</th>
                          <th className="py-2 px-3 text-right">Costo U.</th>
                          <th className="py-2 px-3 text-center">Margen</th>
                          <th className="py-2 px-3 text-right">P. Unitario</th>
                          <th className="py-2 px-3 text-right">Subtotal</th>
                          <th className="py-2 px-3 text-right"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {tiresList.map((row: any) => {
                          const t = row.inventario_llantas;
                          const costoU = Number(t?.costo_adquisicion || Number(row.precio_unitario || 0) * 0.72);
                          const pVenta = Number(row.precio_unitario || 0);
                          const margenPct = costoU > 0 ? ((pVenta - costoU) / costoU) * 100 : 0;
                          const utilRow = (pVenta - costoU) * Number(row.cantidad || 1);
                          const isJit = Number(t?.stock_actual || 0) <= 0;

                          return (
                            <tr key={row.id} className="hover:bg-slate-50/80">
                              <td className="py-2.5 px-3">
                                <div className="font-semibold text-slate-900">
                                  {t?.marca} {t?.modelo_llanta}
                                </div>
                                <span className="font-mono text-xs text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                                  {t?.ancho}/{t?.perfil} R{t?.rin}
                                </span>
                              </td>
                              <td className="py-2.5 px-3">
                                {isJit ? (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                    Sobre Pedido (JIT)
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                    Stock Taller ({t?.stock_actual})
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-center tabular-nums font-bold">
                                {row.cantidad}
                              </td>
                              <td className="py-2.5 px-3 text-right tabular-nums text-slate-500">
                                ${costoU.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-mono text-[10px] font-bold tabular-nums">
                                  +{margenPct.toFixed(0)}% (+${utilRow.toLocaleString("es-MX", { maximumFractionDigits: 0 })})
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right tabular-nums">
                                ${pVenta.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold text-slate-900 tabular-nums">
                                ${Number(row.subtotal).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveTire(row)}
                                  className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                                  title="Eliminar neumático"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

            {/* Right 4 Cols: Resumen Financiero y Rentabilidad */}
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs space-y-4 sticky top-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={16} className="text-emerald-600" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                      Rentabilidad y Resumen Financiero
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    IVA {empresa?.tasa_iva ?? 16}%
                  </span>
                </div>

                {/* Revenue Breakdown */}
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Mano de Obra ({activeServices.length}):</span>
                    <span className="font-semibold text-slate-900 tabular-nums">
                      ${subtotalServicios.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Refacciones Sobre Pedido ({activeParts.length}):</span>
                    <span className="font-semibold text-slate-900 tabular-nums">
                      ${subtotalRefacciones.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Neumáticos de Stock ({activeTires.length}):</span>
                    <span className="font-semibold text-slate-900 tabular-nums">
                      ${subtotalLlantas.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Internal Shop Costs & Gross Margin Box */}
                <div className="bg-slate-50 border border-slate-200 rounded-md p-3 space-y-1.5 text-[11px]">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Costos Internos de la Orden
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Costo Adquisición Refacciones:</span>
                    <span className="tabular-nums font-mono">
                      -${costoRefacciones.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Costo Adquisición Neumáticos:</span>
                    <span className="tabular-nums font-mono">
                      -${costoLlantas.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Comisión Técnico Asignado:</span>
                    <span className="tabular-nums font-mono">
                      -${comisionTecnicoTotal.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="border-t border-slate-200 pt-2 mt-1 flex justify-between items-center">
                    <span className="font-bold text-slate-800">Utilidad Bruta Estimada:</span>
                    <div className="text-right">
                      <span className="font-black text-emerald-700 text-xs tabular-nums">
                        ${utilidadBruta.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                      </span>
                      <span className="ml-1.5 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono text-[10px] font-bold tabular-nums">
                        {margenBrutoPct.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Grand Total & Balance */}
                <div className="border-t border-slate-200 pt-3 space-y-2">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs font-bold uppercase text-slate-500">Gran Total</span>
                    <span className="text-xl font-black text-slate-900 tabular-nums">
                      ${granTotal.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-medium">Total Pagado / Abonado:</span>
                    <span className="font-bold text-emerald-600 tabular-nums">
                      ${totalPagado.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2.5 rounded-md bg-amber-50 border border-amber-200">
                    <span className="text-xs font-bold uppercase text-amber-900">
                      Saldo por Cobrar
                    </span>
                    <span className="text-base font-black text-amber-700 tabular-nums">
                      ${saldoPendiente.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {empresa?.descuento_efectivo_habilitado && Number(empresa?.descuento_efectivo_porcentaje || 0) > 0 && (
                    <div className="p-2.5 rounded-md bg-emerald-50 border border-emerald-300 text-xs">
                      <div className="flex items-center justify-between text-emerald-900 font-bold">
                        <span className="flex items-center gap-1">
                          <Sparkles size={13} className="text-emerald-600" />
                          Precio Preferencial en Efectivo:
                        </span>
                        <span className="px-1.5 py-0.2 rounded bg-emerald-200/80 text-emerald-800 text-[10px] font-black">
                          -{empresa.descuento_efectivo_porcentaje}%
                        </span>
                      </div>
                      <div className="text-base font-black text-emerald-800 tabular-nums mt-0.5">
                        ${(Math.round((granTotal * (1 - Number(empresa.descuento_efectivo_porcentaje) / 100)) * 100) / 100).toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN
                      </div>
                      <div className="text-[10px] text-emerald-700 mt-0.5">
                        Ahorro directo de ${(Math.round((granTotal * (Number(empresa.descuento_efectivo_porcentaje) / 100)) * 100) / 100).toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN al liquidar en efectivo.
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="pt-1 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab("pagos")}
                    className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-emerald-600 text-white text-xs font-black flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
                  >
                    <Banknote size={15} /> Proceder al Cobro en Caja →
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("impresion")}
                    className="w-full py-2.5 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Printer size={14} /> Ver Hoja de Recepción Imprimible
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: INSPECCIÓN DIGITAL (DVI) Y RECEPCIÓN */}
        {activeTab === "dvi" && (
          <div className="space-y-4">
            {isExpressOrder && dviItems.length === 0 && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                      Express
                    </span>
                    <span className="text-xs font-bold text-slate-800">Atención Directa en Rampa</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Esta orden ingresó para servicio rápido sin inspección de patio inicial. Si detectas un hallazgo al desmontar la unidad, puedes registrarlo a continuación.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddingDvi(true)}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer shrink-0 transition-colors"
                >
                  + Registrar Hallazgo en Rampa
                </button>
              </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left 7 Cols: Persistent DVI CRUD */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                      Inspección Digital Multipunto (DVI Persistente)
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Los cambios se reflejan en tiempo real en el Portal del Cliente (`/orden/{orderId.slice(0, 8)}`).
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {dviItems.length === 0 && (
                      <button
                        type="button"
                        disabled={savingDviLoading}
                        onClick={handleLoadDviTemplate}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                      >
                        <Sparkles size={13} /> Cargar Plantilla Multipunto 6 Puntos
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsAddingDvi(!isAddingDvi)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer"
                    >
                      <Plus size={13} /> + Agregar Punto
                    </button>
                  </div>
                </div>

                {isAddingDvi && (
                  <div className="p-4 bg-blue-50/40 border-b border-slate-200 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                          Categoría
                        </label>
                        <select
                          value={newDviCategoria}
                          onChange={(e) => setNewDviCategoria(e.target.value)}
                          className="w-full h-8 text-xs bg-white border border-slate-300 rounded px-2"
                        >
                          <option value="Frenos">Sistema de Frenos</option>
                          <option value="Suspensión y Dirección">Suspensión y Dirección</option>
                          <option value="Neumáticos">Neumáticos y Alineación</option>
                          <option value="Motor y Fluidos">Motor y Fluidos</option>
                          <option value="Sistema Eléctrico">Sistema Eléctrico</option>
                          <option value="Seguridad y Chasis">Seguridad y Chasis</option>
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                          Punto de Inspección
                        </label>
                        <input
                          type="text"
                          placeholder="Ej. Balatas Delanteras y Discos Ventilados"
                          value={newDviPunto}
                          onChange={(e) => setNewDviPunto(e.target.value)}
                          className="w-full h-8 text-xs bg-white border border-slate-300 rounded px-2.5"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                          Severidad Semáforo
                        </label>
                        <select
                          value={newDviSeveridad}
                          onChange={(e) => setNewDviSeveridad(e.target.value as any)}
                          className="w-full h-8 text-xs bg-white border border-slate-300 rounded px-2 font-bold"
                        >
                          <option value="verde">🟢 Verde — En Buen Estado</option>
                          <option value="amarillo">🟡 Amarillo — Precaución / Pronto</option>
                          <option value="rojo">🔴 Rojo — Reparación Urgente</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                          Costo Estimado Reparación ($)
                        </label>
                        <input
                          type="number"
                          placeholder="0.00"
                          value={newDviCosto}
                          onChange={(e) => setNewDviCosto(e.target.value)}
                          className="w-full h-8 text-xs bg-white border border-slate-300 rounded px-2.5 tabular-nums"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                          URL Evidencia Fotográfica
                        </label>
                        <input
                          type="text"
                          placeholder="https://images.unsplash.com/..."
                          value={newDviFoto}
                          onChange={(e) => setNewDviFoto(e.target.value)}
                          className="w-full h-8 text-xs bg-white border border-slate-300 rounded px-2.5"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <input
                        type="text"
                        placeholder="Hallazgo u observación técnica..."
                        value={newDviObs}
                        onChange={(e) => setNewDviObs(e.target.value)}
                        className="w-full h-8 text-xs bg-white border border-slate-300 rounded px-2.5"
                      />
                      <input
                        type="text"
                        placeholder="Acción o recomendación al cliente..."
                        value={newDviRec}
                        onChange={(e) => setNewDviRec(e.target.value)}
                        className="w-full h-8 text-xs bg-white border border-slate-300 rounded px-2.5"
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsAddingDvi(false)}
                        className="px-3 h-7 text-xs text-slate-600"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        disabled={!newDviPunto.trim() || savingDviLoading}
                        onClick={handleAddDviPoint}
                        className="px-4 h-7 rounded bg-blue-600 text-white text-xs font-bold cursor-pointer"
                      >
                        Guardar Punto DVI
                      </button>
                    </div>
                  </div>
                )}

                {dviItems.length === 0 ? (
                  <div className="p-8 text-center space-y-3">
                    <p className="text-xs text-slate-500">
                      Esta orden aún no tiene puntos de inspección registrados.
                    </p>
                    <button
                      type="button"
                      onClick={handleLoadDviTemplate}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-slate-900 text-white text-xs font-bold cursor-pointer"
                    >
                      <Sparkles size={14} /> Inicializar Check-list Multipunto Estándar (6 Puntos)
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200">
                    {dviItems.map((item) => (
                      <div key={item.id} className="p-4 space-y-2.5 hover:bg-slate-50/50">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                              {item.categoria}
                            </span>
                            <h4 className="text-xs font-bold text-slate-900">
                              {item.punto_inspeccion}
                            </h4>
                          </div>

                          {/* Traffic-Light Buttons */}
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleUpdateDviItem(item.id, { severidad: "verde" })}
                              className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-colors cursor-pointer ${
                                item.severidad === "verde"
                                  ? "bg-emerald-600 text-white shadow-2xs"
                                  : "bg-slate-100 text-slate-500 hover:bg-emerald-50 hover:text-emerald-700"
                              }`}
                            >
                              Bien
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateDviItem(item.id, { severidad: "amarillo" })
                              }
                              className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-colors cursor-pointer ${
                                item.severidad === "amarillo"
                                  ? "bg-amber-500 text-white shadow-2xs"
                                  : "bg-slate-100 text-slate-500 hover:bg-amber-50 hover:text-amber-700"
                              }`}
                            >
                              Precaución
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateDviItem(item.id, { severidad: "rojo" })}
                              className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-colors cursor-pointer ${
                                item.severidad === "rojo"
                                  ? "bg-red-600 text-white shadow-2xs"
                                  : "bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-700"
                              }`}
                            >
                              Urgente
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveDviItem(item.id)}
                              className="p-1 text-slate-400 hover:text-red-600 ml-1 cursor-pointer"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                          <input
                            type="text"
                            defaultValue={item.observaciones || ""}
                            onBlur={(e) =>
                              handleUpdateDviItem(item.id, { observaciones: e.target.value })
                            }
                            placeholder="Observaciones del técnico..."
                            className="sm:col-span-5 h-7 text-[11px] bg-white border border-slate-200 rounded px-2 text-slate-700"
                          />
                          <input
                            type="text"
                            defaultValue={item.recomendacion || ""}
                            onBlur={(e) =>
                              handleUpdateDviItem(item.id, { recomendacion: e.target.value })
                            }
                            placeholder="Recomendación para el cliente..."
                            className="sm:col-span-5 h-7 text-[11px] bg-white border border-slate-200 rounded px-2 text-slate-700"
                          />
                          <input
                            type="number"
                            defaultValue={item.costo_estimado || ""}
                            onBlur={(e) =>
                              handleUpdateDviItem(item.id, {
                                costo_estimado: parseFloat(e.target.value) || 0,
                              })
                            }
                            placeholder="$ Est."
                            className="sm:col-span-2 h-7 text-[11px] bg-white border border-slate-200 rounded px-2 text-right font-mono tabular-nums"
                          />
                        </div>

                        {(item.severidad === "amarillo" || item.severidad === "rojo") && (
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                            <div className="flex items-center gap-2">
                              {item.foto_url ? (
                                <a
                                  href={item.foto_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 hover:underline"
                                >
                                  <Camera size={12} /> Ver Foto Evidencia Adjunta
                                </a>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateDviItem(item.id, {
                                      foto_url:
                                        "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=800&q=80",
                                    })
                                  }
                                  className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 hover:text-blue-600 cursor-pointer"
                                >
                                  <Camera size={12} /> + Adjuntar Foto Evidencia
                                </button>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => handleSendDviToDeferred(item)}
                              disabled={item.estatus_cliente === "Diferido"}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 disabled:opacity-50 cursor-pointer"
                            >
                              <History size={11} />
                              {item.estatus_cliente === "Diferido"
                                ? "Enviado a Trabajos Diferidos ✓"
                                : "Enviar a Trabajos Diferidos"}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right 5 Cols: Reception Checklist & Technical Diagnosis */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Datos de Recepción y Diagnóstico
                  </h3>
                  {receptionSavedToast && (
                    <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                      <Check size={13} /> Guardado
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Kilometraje (km)
                    </label>
                    <input
                      type="number"
                      value={recKilometraje}
                      onChange={(e) => setRecKilometraje(e.target.value)}
                      className="w-full h-8 text-xs bg-white border border-slate-300 rounded px-2 font-bold tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Nivel Gasolina
                    </label>
                    <select
                      value={recGasolina}
                      onChange={(e) => setRecGasolina(e.target.value)}
                      className="w-full h-8 text-xs bg-white border border-slate-300 rounded px-2 font-semibold"
                    >
                      <option value="Vacío">Vacío</option>
                      <option value="1/4">1/4</option>
                      <option value="1/2">1/2</option>
                      <option value="3/4">3/4</option>
                      <option value="Lleno">Lleno</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Bahía / Rampa
                    </label>
                    <select
                      value={recBahia}
                      onChange={(e) => setRecBahia(e.target.value)}
                      className="w-full h-8 text-xs bg-white border border-slate-300 rounded px-2"
                    >
                      <option value="">Sin asignar</option>
                      {BAHIAS_TALLER.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">
                    Inventario de Recepción (Check-in)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-3 rounded-md border border-slate-200">
                    {CHECKLIST_ITEMS.map((item) => (
                      <label
                        key={item.key}
                        className="flex items-center gap-2 text-xs font-medium text-slate-800 cursor-pointer select-none"
                      >
                        <input
                          type="checkbox"
                          checked={!!recChecklist[item.key]}
                          onChange={(e) =>
                            setRecChecklist((prev) => ({
                              ...prev,
                              [item.key]: e.target.checked,
                            }))
                          }
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        {item.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    Falla o Solicitud Reportada por el Cliente
                  </label>
                  <textarea
                    rows={3}
                    value={recProblema}
                    onChange={(e) => setRecProblema(e.target.value)}
                    placeholder="Describe el síntoma reportado al ingreso..."
                    className="w-full text-xs bg-white border border-slate-300 rounded-md p-2.5 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    Diagnóstico Técnico del Especialista
                  </label>
                  <textarea
                    rows={3}
                    value={recDiagnostico}
                    onChange={(e) => setRecDiagnostico(e.target.value)}
                    placeholder="Conclusión técnica tras revisión en rampa..."
                    className="w-full text-xs bg-white border border-slate-300 rounded-md p-2.5 text-slate-900"
                  />
                </div>

                <button
                  type="button"
                  disabled={savingReception}
                  onClick={handleSaveReception}
                  className="w-full py-2.5 px-4 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Save size={14} />
                  {savingReception ? "Guardando..." : "Guardar Recepción y Diagnóstico"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

        {/* TAB 3: PAGOS Y COBRANZA */}
        {activeTab === "pagos" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Historial de Pagos y Abonos de la Orden ({pagosList.length})
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingPayment(true);
                      if (saldoPendiente > 0) setPaymentAmount(String(saldoPendiente));
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                  >
                    <Plus size={13} /> Registrar Cobro
                  </button>
                </div>

                {pagosList.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    No se han registrado pagos para esta orden todavía.
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/60 text-[10px] uppercase font-bold text-slate-500">
                        <th className="py-2.5 px-3">Fecha</th>
                        <th className="py-2.5 px-3">Método / Proveedor</th>
                        <th className="py-2.5 px-3">Referencia</th>
                        <th className="py-2.5 px-3 text-center">Estatus</th>
                        <th className="py-2.5 px-3 text-right">Monto</th>
                        <th className="py-2.5 px-3 text-right"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {pagosList.map((p: any) => (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 tabular-nums text-slate-600">
                            {new Date(p.fecha_pago).toLocaleString("es-MX", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              {p.proveedor_pago}
                              {p.cuenta_bancaria?.es_fiscal && (
                                <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold border border-emerald-200">
                                  SAT
                                </span>
                              )}
                            </div>
                            {p.metodo_detalle && (
                              <div className="text-[10px] text-slate-500">{p.metodo_detalle}</div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                            {p.referencia || p.external_transaction_id || "CAJA-MOSTRADOR"}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                (p.estatus === "Aprobado" || p.estatus === "COMPLETADO")
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {p.estatus}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="font-bold text-slate-900 tabular-nums">
                              ${Number(p.monto_total).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                            </div>
                            {Number(p.descuento_aplicado || 0) > 0 && (
                              <div className="text-[10px] text-emerald-700 font-bold tabular-nums">
                                Desc. Efectivo: -${Number(p.descuento_aplicado).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                title="Imprimir ticket"
                                onClick={() => {
                                  setSelectedReceiptPayment(p);
                                  setShowReceiptModal(true);
                                }}
                                className="p-1 text-slate-500 hover:text-blue-600 cursor-pointer"
                              >
                                <Receipt size={14} />
                              </button>
                              <button
                                type="button"
                                title="Eliminar pago"
                                onClick={() => handleRemovePayment(p.id)}
                                className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Right 5 Cols: Terminal Oficial de Cobro POS */}
            <div className="lg:col-span-5">
              {saldoPendiente <= 0 ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <CheckCircle2 size={28} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-emerald-950">Orden 100% Liquidada</h4>
                    <p className="text-xs text-emerald-700 mt-0.5">
                      No hay saldo pendiente por cobrar en esta orden.
                    </p>
                  </div>
                  {order.pagos_orden && order.pagos_orden.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const lastP = order.pagos_orden[order.pagos_orden.length - 1];
                        setSelectedReceiptPayment(lastP || null);
                        setReceiptPaymentsList(order.pagos_orden);
                        setShowReceiptModal(true);
                      }}
                      className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                    >
                      <Receipt size={14} /> Imprimir Recibo Oficial
                    </button>
                  )}
                </div>
              ) : !turnoActivo ? (
                <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-6 text-center flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-700">
                    <Unlock size={24} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-amber-950">Caja de Mostrador Cerrada</h4>
                    <p className="text-xs text-amber-800 mt-1 max-w-sm">
                      Para recepcionar dinero en efectivo o terminales y registrar este ingreso en el Corte Z, es necesario iniciar el turno de caja.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAbrirTurnoOpen(true)}
                    className="mt-2 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                  >
                    <Unlock size={14} /> Abrir Turno de Caja
                  </button>
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col gap-4">
                  {/* Header con estatus del turno */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                        Terminal de Cobro POS
                      </h3>
                      <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Turno Abierto • Gaveta Lista
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-slate-500">
                      Folio #{1000 + Number(order.folio || 1)}
                    </span>
                  </div>

                  {/* Banner Total por Cobrar */}
                  <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-500 block">Total por Cobrar</span>
                      <div className="text-2xl font-black text-slate-900 tabular-nums">
                        ${(posPaymentMethod === "Efectivo" ? cashTotalPorCobrar : saldoPendiente).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                        <span className="text-xs font-semibold text-slate-500 ml-1.5">MXN</span>
                      </div>
                    </div>
                    {hasCashDiscount && posPaymentMethod === "Efectivo" && cashAhorro > 0 && (
                      <div className="text-right">
                        <span className="text-[10px] font-bold uppercase text-emerald-700 block">Precio Promoción (-{cashDiscountPct}%)</span>
                        <span className="text-xs font-black text-emerald-700 tabular-nums">Ahorro: -${cashAhorro.toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                  {/* Selector Guiado de Métodos de Pago */}
                  <div className="flex flex-col gap-2.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      ¿Cómo paga el cliente?
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {/* Efectivo */}
                      <button
                        type="button"
                        onClick={() => setPosPaymentMethod("Efectivo")}
                        className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                          posPaymentMethod === "Efectivo"
                            ? "border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-600/20"
                            : "border-slate-200 hover:border-slate-300 bg-white"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <Banknote size={16} className="text-emerald-600" />
                          <span className="text-[8.5px] font-bold uppercase text-emerald-700 bg-emerald-100 px-1 py-0.2 rounded">
                            Directo
                          </span>
                        </div>
                        <span className="text-xs font-bold text-slate-800">Efectivo</span>
                        <span className="text-[10px] text-slate-400">Gaveta</span>
                      </button>

                      {/* Tarjeta TPV */}
                      <button
                        type="button"
                        onClick={() => setPosPaymentMethod("TPV")}
                        className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                          posPaymentMethod === "TPV"
                            ? "border-blue-600 bg-blue-50/60 ring-2 ring-blue-600/20"
                            : "border-slate-200 hover:border-slate-300 bg-white"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <CreditCard size={16} className="text-blue-600" />
                          <span className="text-[8.5px] font-bold uppercase text-blue-700 bg-blue-100 px-1 py-0.2 rounded">
                            TPV
                          </span>
                        </div>
                        <span className="text-xs font-bold text-slate-800">Tarjeta</span>
                        <span className="text-[10px] text-slate-400">Terminal</span>
                      </button>

                      {/* Transferencia SPEI */}
                      <button
                        type="button"
                        onClick={() => setPosPaymentMethod("SPEI")}
                        className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                          posPaymentMethod === "SPEI"
                            ? "border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-600/20"
                            : "border-slate-200 hover:border-slate-300 bg-white"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <Landmark size={16} className="text-indigo-600" />
                          <span className="text-[8.5px] font-bold uppercase text-indigo-700 bg-indigo-100 px-1 py-0.2 rounded">
                            Bancos
                          </span>
                        </div>
                        <span className="text-xs font-bold text-slate-800">SPEI</span>
                        <span className="text-[10px] text-slate-400">Transferencia</span>
                      </button>
                    </div>

                    {/* Fila secundaria: Multi-Método o BNPL */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setPosPaymentMethod("SPLIT")}
                        className={`flex-1 py-1.5 px-2.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          posPaymentMethod === "SPLIT"
                            ? "border-amber-600 bg-amber-50 text-amber-900 ring-2 ring-amber-600/20"
                            : "border-slate-200 hover:border-slate-300 text-slate-600 bg-slate-50/70"
                        }`}
                      >
                        <Split size={13} />
                        Pago Dividido (Multi-Método)
                      </button>
                      <button
                        type="button"
                        onClick={() => setPosPaymentMethod("BNPL")}
                        className={`flex-1 py-1.5 px-2.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          posPaymentMethod === "BNPL"
                            ? "border-sky-600 bg-sky-50 text-sky-900 ring-2 ring-sky-600/20"
                            : "border-slate-200 hover:border-slate-300 text-slate-600 bg-slate-50/70"
                        }`}
                      >
                        <Smartphone size={13} />
                        Kueski / Atrato
                      </button>
                    </div>
                  </div>

                  {/* FORMULARIO DINÁMICO POR MÉTODO */}
                  {/* 1. EFECTIVO */}
                  {posPaymentMethod === "Efectivo" && (
                    <div className="flex flex-col gap-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80">
                      {hasCashDiscount && (
                        <label className="flex items-center justify-between p-2 rounded-lg bg-emerald-50 border border-emerald-200 cursor-pointer select-none">
                          <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                            <Percent size={13} className="text-emerald-600" />
                            Precio Promocional en Efectivo (-{cashDiscountPct}%)
                          </span>
                          <input
                            type="checkbox"
                            checked={applyCashDiscount}
                            onChange={(e) => setApplyCashDiscount(e.target.checked)}
                            className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                          />
                        </label>
                      )}

                      {/* Billetes rápidos */}
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1.5">Billetes sugeridos</span>
                        <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
                          {["100", "200", "500", "1000"].map((b) => (
                            <button
                              key={b}
                              type="button"
                              onClick={() => setCashGiven((prev) => String((parseFloat(prev) || 0) + Number(b)))}
                              className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-emerald-500 hover:text-emerald-700 text-slate-700 shadow-2xs transition-all cursor-pointer"
                            >
                              +${b}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => setCashGiven(String(cashTotalPorCobrar))}
                            className="px-2.5 py-1 rounded-lg bg-emerald-100/70 border border-emerald-300 text-emerald-800 hover:bg-emerald-200 shadow-2xs transition-all cursor-pointer ml-auto"
                          >
                            Pago Exacto
                          </button>
                        </div>
                      </div>

                      {/* Input de Efectivo Recibido y Cambio */}
                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                            Efectivo Recibido:
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={cashGiven}
                            onChange={(e) => setCashGiven(e.target.value)}
                            placeholder={String(cashTotalPorCobrar)}
                            className="w-full h-10 text-base font-black bg-white border border-slate-300 rounded-xl px-3 text-slate-900 tabular-nums focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                        <div className="bg-white border border-slate-200 rounded-xl p-2.5 flex flex-col justify-center">
                          <span className="text-[10px] font-bold uppercase text-slate-500 block">
                            Cambio a Devolver
                          </span>
                          {cashGivenVal > 0 && cashFaltanteVal > 0 ? (
                            <span className="text-sm font-black text-amber-600 tabular-nums">
                              Faltan ${cashFaltanteVal.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-xl font-black text-slate-900 tabular-nums">
                              ${cashChangeVal.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 2. TARJETA TPV */}
                  {posPaymentMethod === "TPV" && (
                    <div className="flex flex-col gap-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                          Terminal / Dispositivo TPV
                        </label>
                        <select
                          value={tpvType}
                          onChange={(e) => setTpvType(e.target.value)}
                          className="w-full h-9 text-xs font-bold bg-white border border-slate-300 rounded-xl px-2.5 text-slate-900"
                        >
                          <option value="BanBajío TPV (Débito/Crédito)">BanBajío TPV (Débito / Crédito)</option>
                          <option value="Mercado Pago Point Smart">Mercado Pago (Point Smart)</option>
                          <option value="Clip Total TPV">Clip Total</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                          Folio / No. Autorización Voucher
                        </label>
                        <input
                          type="text"
                          value={tpvAuth}
                          onChange={(e) => setTpvAuth(e.target.value)}
                          placeholder="Ej. AUTH-98241"
                          className="w-full h-9 text-xs font-mono bg-white border border-slate-300 rounded-xl px-3 text-slate-900"
                        />
                      </div>
                    </div>
                  )}

                  {/* 3. SPEI */}
                  {posPaymentMethod === "SPEI" && (
                    <div className="flex flex-col gap-3 bg-blue-50/50 p-3.5 rounded-xl border border-blue-200/80">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-blue-900 mb-1">
                          Cuenta Receptora SPEI
                        </label>
                        <select
                          value={selectedCuentaBancariaId}
                          onChange={(e) => setSelectedCuentaBancariaId(e.target.value)}
                          className="w-full h-9 text-xs font-bold bg-white border border-blue-300 rounded-xl px-2.5 text-slate-900"
                        >
                          {cuentasBancarias.map((cb) => (
                            <option key={cb.id} value={cb.id}>
                              {cb.alias} ({cb.banco}) {cb.es_fiscal ? "• [Fiscal SAT]" : "• [Operativa]"}
                            </option>
                          ))}
                        </select>
                      </div>

                      {(() => {
                        const cb = cuentasBancarias.find((c) => c.id === selectedCuentaBancariaId) || cuentasBancarias[0];
                        if (!cb) return null;
                        return (
                          <div className="bg-white p-2.5 rounded-xl border border-blue-100 flex items-center justify-between text-xs">
                            <span className="font-mono font-bold text-slate-800">
                              CLABE: {cb.clabe || "Sin asignar"}
                            </span>
                            {cb.clabe && (
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(cb.clabe);
                                  toast.success("CLABE copiada al portapapeles");
                                }}
                                className="text-blue-600 hover:underline font-bold text-[11px] cursor-pointer"
                              >
                                Copiar
                              </button>
                            )}
                          </div>
                        );
                      })()}

                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                          Clave de Rastreo SPEI / Referencia
                        </label>
                        <input
                          type="text"
                          value={speiRastreo}
                          onChange={(e) => setSpeiRastreo(e.target.value)}
                          placeholder="Ej. SPEI-89421"
                          className="w-full h-9 text-xs font-mono bg-white border border-slate-300 rounded-xl px-3 text-slate-900"
                        />
                      </div>
                    </div>
                  )}

                  {/* 4. SPLIT PAYMENT */}
                  {posPaymentMethod === "SPLIT" && (
                    <div className="p-1">
                      <SplitPaymentManager
                        total={saldoPendiente}
                        payments={splitPayments}
                        onChange={setSplitPayments}
                        cuentasBancarias={cuentasBancarias}
                      />
                    </div>
                  )}

                  {/* 5. BNPL */}
                  {posPaymentMethod === "BNPL" && (
                    <div className="flex flex-col gap-3 bg-sky-50/50 p-3.5 rounded-xl border border-sky-200">
                      <div className="grid grid-cols-3 gap-2">
                        {(["KueskiPay", "Atrato", "Stripe"] as const).map((prov) => (
                          <button
                            key={prov}
                            type="button"
                            onClick={() => setBnplProvider(prov)}
                            className={`p-2 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                              bnplProvider === prov
                                ? "border-sky-600 bg-sky-100 text-sky-900"
                                : "border-slate-200 bg-white text-slate-700"
                            }`}
                          >
                            {prov}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-200 text-xs">
                        <button
                          type="button"
                          onClick={() => setPaymentMode("directo")}
                          className={`flex-1 py-1.5 rounded-md font-bold text-[11px] cursor-pointer ${
                            paymentMode === "directo" ? "bg-slate-900 text-white" : "text-slate-600"
                          }`}
                        >
                          Aprobado en Terminal
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentMode("link")}
                          className={`flex-1 py-1.5 rounded-md font-bold text-[11px] cursor-pointer ${
                            paymentMode === "link" ? "bg-blue-600 text-white" : "text-slate-600"
                          }`}
                        >
                          Generar Link Digital
                        </button>
                      </div>

                      {paymentStatusMessage && (
                        <div className="text-xs text-blue-700 bg-blue-50 p-2.5 rounded border border-blue-200">
                          {paymentStatusMessage}
                        </div>
                      )}
                    </div>
                  )}

                  {/* BOTÓN PRINCIPAL DE COBRO */}
                  <button
                    type="button"
                    disabled={
                      addingPaymentLoading ||
                      (posPaymentMethod === "Efectivo" && cashGivenVal > 0 && cashGivenVal < cashTotalPorCobrar) ||
                      (posPaymentMethod === "SPLIT" && splitPayments.reduce((acc, p) => acc + Number(p.monto || 0), 0) < saldoPendiente - 0.05)
                    }
                    onClick={handleConfirmCobro}
                    className="w-full py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-emerald-600 text-white text-xs font-black flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-50 cursor-pointer"
                  >
                    <CheckCircle2 size={16} />
                    {addingPaymentLoading
                      ? "Procesando Cobro..."
                      : posPaymentMethod === "Efectivo"
                      ? `COBRAR $${cashTotalPorCobrar.toLocaleString("es-MX", { minimumFractionDigits: 2 })} E IMPRIMIR RECIBO →`
                      : posPaymentMethod === "SPLIT"
                      ? `COBRAR $${saldoPendiente.toLocaleString("es-MX", { minimumFractionDigits: 2 })} (PAGO DIVIDIDO) →`
                      : `COBRAR $${saldoPendiente.toLocaleString("es-MX", { minimumFractionDigits: 2 })} E IMPRIMIR RECIBO →`}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal de Apertura de Turno de Caja */}
        <AbrirTurnoModal
          isOpen={isAbrirTurnoOpen}
          onClose={() => setIsAbrirTurnoOpen(false)}
          onSuccess={async () => {
            setIsAbrirTurnoOpen(false);
            toast.success("Turno de caja abierto correctamente");
            const isCova = (empresa?.subdominio === "cova") || (empresa?.nombre_comercial || "").toLowerCase().includes("cova") || (typeof window !== "undefined" && window.location.hostname.includes("cova"));
            const targetSucId = order?.sucursal_id || sucursalActiva?.id || (isCova ? "b2ad09db-0a34-4876-9ca3-d584c40bd295" : "b0000000-0000-0000-0000-000000000001");
            const targetEmpId = order?.empresa_id || empresa?.id || (isCova ? "b2ad09db-0a34-4876-9ca3-d584c40bd294" : "a0000000-0000-0000-0000-000000000001");
            const shiftRes = await CajaTurnoService.obtenerTurnoActivo(targetSucId, targetEmpId);
            setTurnoActivo(shiftRes);
          }}
          empresaId={order?.empresa_id || empresa?.id || "a0000000-0000-0000-0000-000000000001"}
          sucursalId={order?.sucursal_id || sucursalActiva?.id || "b0000000-0000-0000-0000-000000000001"}
          usuarioId={perfil?.id || "u0000000-0000-0000-0000-000000000001"}
          fondos={fondos}
        />

        <ReceiptModal
          isOpen={showReceiptModal}
          onClose={() => setShowReceiptModal(false)}
          order={order}
          payment={selectedReceiptPayment}
          payments={receiptPaymentsList.length > 0 ? receiptPaymentsList : (order?.pagos_orden || [])}
          empresa={empresa}
          sucursal={sucursalActiva}
          cashGiven={receiptCashGiven}
          changeDue={receiptChangeDue}
        />

        {/* Modal de Comprobante / Póliza de Garantía en Pantalla Completa */}
        {selectedTicketEvidence && (
          <TicketEvidenceLightbox
            isOpen={!!selectedTicketEvidence}
            onClose={() => setSelectedTicketEvidence(null)}
            evidenciaUrl={selectedTicketEvidence.evidenciaUrl}
            folio={selectedTicketEvidence.folio}
            proveedorNombre={selectedTicketEvidence.proveedorNombre}
            descripcion={selectedTicketEvidence.descripcion}
            monto={selectedTicketEvidence.monto}
            fechaCompra={selectedTicketEvidence.fechaCompra}
            fechaVencimientoGarantia={selectedTicketEvidence.fechaVencimientoGarantia}
            estatusGarantia={selectedTicketEvidence.estatusGarantia}
          />
        )}

        {/* Modal para Vincular Comprobante de Compra y Garantía a las Refacciones (Multirrefacción / Lote) */}
        {(attachingPartForEvidence || isRegistrarTicketModalOpen) && (
          <ProveedorEvidenceModal
            isOpen={!!attachingPartForEvidence || isRegistrarTicketModalOpen}
            onClose={() => {
              setAttachingPartForEvidence(null);
              setIsRegistrarTicketModalOpen(false);
            }}
            empresaId={empresa?.id || ""}
            sucursalId={sucursalActiva?.id}
            ordenServicioId={orderId}
            refaccionesDisponibles={partsList}
            preselectedRefaccionId={attachingPartForEvidence?.id}
            defaultDescripcion={
              attachingPartForEvidence
                ? `${attachingPartForEvidence.nombre}${
                    attachingPartForEvidence.numero_parte ? ` (P/N: ${attachingPartForEvidence.numero_parte})` : ""
                  }`
                : `Compra de refacciones - Orden #${order?.numero_orden || ""}`
            }
            defaultMonto={
              attachingPartForEvidence
                ? Number(attachingPartForEvidence.costo_unitario || 0) *
                  Number(attachingPartForEvidence.cantidad || 1)
                : 0
            }
            onCompraRegistrada={async (compra, refaccionIds) => {
              const idsToUpdate = refaccionIds && refaccionIds.length > 0
                ? refaccionIds
                : attachingPartForEvidence?.id
                ? [attachingPartForEvidence.id]
                : [];

              if (idsToUpdate.length > 0) {
                setOrder((prev: any) => ({
                  ...prev,
                  orden_servicio_refacciones: (prev.orden_servicio_refacciones || []).map((p: any) =>
                    idsToUpdate.includes(p.id)
                      ? {
                          ...p,
                          compra_proveedor_id: compra.id,
                          proveedor_id: compra.proveedor_id || p.proveedor_id,
                          folio_ticket_nota: compra.folio_ticket_nota,
                          evidencia_url: compra.evidencia_url || p.evidencia_url,
                          garantia_especifica: `${compra.meses_garantia || 1} meses - Nota #${compra.folio_ticket_nota}`,
                          compras_proveedores: compra,
                        }
                      : p
                  ),
                }));
              }
              setAttachingPartForEvidence(null);
              setIsRegistrarTicketModalOpen(false);
              toast.success(`Ticket #${compra.folio_ticket_nota} vinculado a ${idsToUpdate.length} refacciones`);
              onUpdate();
            }}
          />
        )}

        {/* TAB 4: HOJA DE RECEPCIÓN / IMPRESIÓN */}
        {activeTab === "impresion" && (
          <OrderPrintSheet order={order} mechanicName={assignedMechanic?.nombre} />
        )}

        {/* TAB 5: BITÁCORA FORENSE */}
        {activeTab === "auditoria" && (
          <div className="p-2 sm:p-4">
            <AuditTimeline
              entityType="ordenes_servicio"
              entityId={order.id}
              title={`Historial Forense de la Orden #${folioStr}`}
              subtitle="Trazabilidad inmutable de cualquier cambio de estatus, bahía, cotización o pago realizado por el equipo."
            />
          </div>
        )}
      </div>
    </div>
  );
}
