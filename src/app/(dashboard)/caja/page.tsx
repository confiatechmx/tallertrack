"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTenant } from "@/context/TenantContext";
import { ConcurrencyService } from "@/services/concurrencyService";
import Link from "next/link";
import QRCode from "qrcode";
import { ReceiptModal } from "@/components/caja/ReceiptModal";
import { SplitPaymentManager } from "@/components/caja/SplitPaymentManager";
import { TenantMetodosPagoService, TenantMetodoPago } from "@/services/tenantMetodosPagoService";
import { MultiPaymentService, PaymentSplitItem } from "@/services/multiPaymentService";
import { TurnoStatusBar } from "@/components/caja/TurnoStatusBar";
import { AbrirTurnoModal } from "@/components/caja/AbrirTurnoModal";
import { TraspasoFondosModal } from "@/components/caja/TraspasoFondosModal";
import { CorteCiegoModal } from "@/components/caja/CorteCiegoModal";
import { TicketCierreModal } from "@/components/caja/TicketCierreModal";
import { CorteDiarioAuditoriaModal } from "@/components/caja/CorteDiarioAuditoriaModal";
import { ProveedorEvidenceModal } from "@/components/proveedores/ProveedorEvidenceModal";
import { TicketEvidenceLightbox } from "@/components/proveedores/TicketEvidenceLightbox";
import { ProveedorService, Proveedor } from "@/services/proveedorService";
import {
  CajaTurnoService,
  CajaTurno,
  CajaFondo,
  CuentaBancaria,
} from "@/services/cajaTurnoService";

import { simularCuotasBNPL, CuotaSimulation } from "@/app/actions/payments";
import {
  Loader2,
  Landmark,
  Banknote,
  CreditCard,
  ArrowRight,
  Plus,
  XCircle,
  CheckCircle2,
  Wallet,
  Wrench,
  Clock,
  Receipt,
  Building2,
  AlertCircle,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  QrCode,
  Smartphone,
  Copy,
  Check,
  Printer,
  FileSpreadsheet,
  Download,
  MessageCircle,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  Coins,
  Split,
  FileText,
} from "lucide-react";

type TabType = "POS" | "Cobranza" | "CajaChica" | "Comisiones";

const QUICK_CASH_AMOUNTS = [100, 200, 500, 1000];

export default function CajaPage() {
  const supabase = createClient();
  const { empresa, sucursalActiva, sucursales, perfil } = useTenant();

  const [activeTab, setActiveTab] = useState<TabType>("POS");
  const [loading, setLoading] = useState(true);

  // Data States
  const [ordenes, setOrdenes] = useState<any[]>([]);
  const [pagos, setPagos] = useState<any[]>([]);
  const [movimientosCaja, setMovimientosCaja] = useState<any[]>([]);
  const [mecanicos, setMecanicos] = useState<any[]>([]);
  const [configPagos, setConfigPagos] = useState<any[]>([]);

  // POS State
  // Turno & Fondos State
  const [turnoActivo, setTurnoActivo] = useState<CajaTurno | null>(null);
  const [fondos, setFondos] = useState<CajaFondo[]>([]);
  const [cuentasBancarias, setCuentasBancarias] = useState<CuentaBancaria[]>([]);
  const [historialTurnos, setHistorialTurnos] = useState<CajaTurno[]>([]);
  const [selectedCuentaBancariaId, setSelectedCuentaBancariaId] = useState<string>("");

  // Modales de Turno y Corte
  const [isAbrirTurnoOpen, setIsAbrirTurnoOpen] = useState(false);
  const [isTraspasoOpen, setIsTraspasoOpen] = useState(false);
  const [isCorteOpen, setIsCorteOpen] = useState(false);
  const [ticketCierreOpen, setTicketCierreOpen] = useState(false);
  const [cierreTicketData, setCierreTicketData] = useState<any | null>(null);
  const [auditoriaModalOpen, setAuditoriaModalOpen] = useState(false);
  const [auditoriaTurnoId, setAuditoriaTurnoId] = useState<string | null>(null);
  const [proveedorEvidenceOpen, setProveedorEvidenceOpen] = useState(false);

  const [posSelectedOrderId, setPosSelectedOrderId] = useState<string | null>(null);
  const [posSearchQuery, setPosSearchQuery] = useState("");
  const [posStatusFilter, setPosStatusFilter] = useState<"ALL" | "READY" | "PARTIAL">("ALL");
  const [tenantMetodos, setTenantMetodos] = useState<TenantMetodoPago[]>([]);
  const [selectedTenantMetodoId, setSelectedTenantMetodoId] = useState<string>("");
  const [aplicarDescuentoEfectivo, setAplicarDescuentoEfectivo] = useState(true);

  // Active Payment Form in POS
  const [selectedMethod, setSelectedMethod] = useState<
    "Efectivo" | "TPV" | "SPEI" | "KueskiPay" | "Atrato" | "Stripe" | "Split"
  >("Efectivo");
  const [splitPayments, setSplitPayments] = useState<PaymentSplitItem[]>([
    { id: "caja-split-1", metodo: "Efectivo", monto: 0, montoRecibido: 0, cambio: 0 }
  ]);
  const [receiptPayments, setReceiptPayments] = useState<any[] | undefined>(undefined);

  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [cashGiven, setCashGiven] = useState<string>("");
  const [tpvType, setTpvType] = useState<string>("Terminal Point Smart (Mercado Pago)");
  const [tpvReference, setTpvReference] = useState<string>("");
  const [speiRastreo, setSpeiRastreo] = useState<string>("");
  const [copiedClabe, setCopiedClabe] = useState(false);
  const [showOtherMethods, setShowOtherMethods] = useState(false);

  // BNPL & Online Links
  const [bnplProvider, setBnplProvider] = useState<"KueskiPay" | "Atrato">("KueskiPay");
  const [bnplCuotas, setBnplCuotas] = useState<CuotaSimulation[]>([]);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [generatingQr, setGeneratingQr] = useState(false);
  const [bnplReference, setBnplReference] = useState<string>("");

  // Saving Payment State
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Thermal Receipt Modal State
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [receiptOrder, setReceiptOrder] = useState<any | null>(null);
  const [receiptPayment, setReceiptPayment] = useState<any | null>(null);
  const [receiptCashGiven, setReceiptCashGiven] = useState<number | undefined>(undefined);
  const [receiptChangeDue, setReceiptChangeDue] = useState<number | undefined>(undefined);

  // Modal: Cancelar Pago (Audited Soft-Delete)
  const [cancelPago, setCancelPago] = useState<any | null>(null);
  const [motivoCancelacion, setMotivoCancelacion] = useState("");
  const [savingCancel, setSavingCancel] = useState(false);

  // Supplier & Warranty states in Caja
  const [proveedoresList, setProveedoresList] = useState<Proveedor[]>([]);
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

  // Modal: Registrar Movimiento de Caja Chica
  const [isCajaModalOpen, setIsCajaModalOpen] = useState(false);
  const [movForm, setMovForm] = useState<{
    tipo: string;
    concepto: string;
    monto: string;
    metodo: string;
    responsable: string;
    cajaFondoId: string;
    proveedorId?: string;
    folioTicket?: string;
    mesesGarantia?: number;
    comprobanteFile?: File | null;
  }>({
    tipo: "Gasto / Insumos",
    concepto: "",
    monto: "",
    metodo: "Efectivo",
    responsable: "Alejandro Villarreal",
    cajaFondoId: "",
    proveedorId: "",
    folioTicket: "",
    mesesGarantia: 12,
    comprobanteFile: null,
  });
  const [savingMov, setSavingMov] = useState(false);

  // Selected mechanic filter in Tab 4
  const [selectedMecanicoId, setSelectedMecanicoId] = useState<string>("ALL");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (
        tabParam === "POS" ||
        tabParam === "Cobranza" ||
        tabParam === "CajaChica" ||
        tabParam === "Comisiones"
      ) {
        setActiveTab(tabParam as TabType);
      }
      const orderParam = params.get("ordenId");
      if (orderParam) {
        setPosSelectedOrderId(orderParam);
      }
    }
  }, []);

  const isInitialLoad = useRef(true);
  const loadData = useCallback(async () => {
    if (isInitialLoad.current) {
      setLoading(true);
    }
    try {
      let ordQuery = supabase
        .from("ordenes_servicio")
        .select(`
          id,
          folio,
          sucursal_id,
          estado,
          sub_estado,
          estatus_pago,
          mecanico_id,
          fecha_ingreso,
          bahia_rampa,
          problema_reportado,
          vehiculos ( id, marca, modelo, anio, placas, kilometraje_actual, clientes ( id, nombre, telefono, correo, rfc ) ),
          orden_servicio_servicios (
            id,
            precio_cobrado,
            horas_labor,
            mecanico_id,
            comision_porcentaje,
            estatus_aprobacion,
            servicios_taller ( nombre, categoria )
          ),
          orden_servicio_refacciones (
            id,
            nombre,
            cantidad,
            precio_unitario,
            subtotal,
            estatus_aprobacion
          ),
          cotizaciones (
            detalles_cotizacion ( subtotal, estatus_aprobacion, llanta:inventario_llantas(marca, modelo_llanta, ancho, perfil, rin) )
          ),
          pagos_orden (
            id,
            monto_total,
            estatus,
            deleted_at,
            proveedor_pago,
            metodo_detalle,
            referencia,
            fecha_pago
          )
        `)
        .order("fecha_ingreso", { ascending: false });

      let pagosQuery = supabase
        .from("pagos_orden")
        .select(`
          id,
          orden_servicio_id,
          sucursal_id,
          monto_total,
          proveedor_pago,
          metodo_detalle,
          referencia,
          estatus,
          comision_pasarela,
          fecha_pago,
          deleted_at,
          motivo_cancelacion,
          ordenes_servicio (
            id,
            folio,
            vehiculos ( marca, modelo, placas, clientes ( nombre ) )
          )
        `)
        .order("fecha_pago", { ascending: false });

      let movQuery = supabase
        .from("caja_movimientos")
        .select(`
          *,
          compras_proveedores (
            id,
            folio_ticket_nota,
            meses_garantia,
            fecha_compra,
            fecha_vencimiento_garantia,
            estatus_garantia,
            evidencia_url,
            evidencia_tipo,
            monto_costo,
            proveedores (
              nombre_comercial
            )
          )
        `)
        .order("created_at", { ascending: false });

      if (sucursalActiva) {
        ordQuery = ordQuery.eq("sucursal_id", sucursalActiva.id);
        pagosQuery = pagosQuery.eq("sucursal_id", sucursalActiva.id);
        movQuery = movQuery.eq("sucursal_id", sucursalActiva.id);
      }

      const targetSucId =
        sucursalActiva?.id ||
        sucursales[0]?.id ||
        "b0000000-0000-0000-0000-000000000001";

      const [ordRes, pagRes, movRes, empRes, cfgRes, shiftRes, fondosRes, bankRes, histRes, metodosRes] = await Promise.all([
        ordQuery,
        pagosQuery,
        movQuery,
        supabase
          .from("empleados")
          .select("*")
          .eq("rol", "MecÃ¡nico")
          .order("nombre"),
        supabase.from("configuracion_pagos").select("*"),
        CajaTurnoService.obtenerTurnoActivo(targetSucId),
        CajaTurnoService.obtenerFondos(targetSucId, empresa?.id),
        CajaTurnoService.obtenerCuentasBancarias(empresa?.id || "a0000000-0000-0000-0000-000000000001", targetSucId),
        CajaTurnoService.obtenerHistorialTurnos(targetSucId),
        TenantMetodosPagoService.obtenerMetodos(empresa?.id, targetSucId),
      ]);

      setTurnoActivo(shiftRes);
      setFondos(fondosRes);
      setCuentasBancarias(bankRes);
      setHistorialTurnos(histRes);
      const metodosList = metodosRes.data || [];
      setTenantMetodos(metodosList);
      if (metodosList.length > 0 && !selectedTenantMetodoId) {
        const firstTpv = metodosList.find((m) => ["TARJETA_CREDITO", "MSI", "DEBITO", "TPV"].includes(m.tipo?.toUpperCase() || ""));
        if (firstTpv) setSelectedTenantMetodoId(firstTpv.id);
      }
      if (bankRes.length > 0 && !selectedCuentaBancariaId) {
        setSelectedCuentaBancariaId(bankRes[0].id);
      }

      if (ordRes.data) {
        const enriched = ordRes.data.map((order: any) => {
          const srvTotal = (order.orden_servicio_servicios || [])
            .filter((s: any) => s.estatus_aprobacion !== "Diferido")
            .reduce(
              (acc: number, curr: any) => acc + Number(curr.precio_cobrado || 0),
              0
            );
          const refTotal = (order.orden_servicio_refacciones || [])
            .filter((r: any) => r.estatus_aprobacion !== "Diferido")
            .reduce(
              (acc: number, curr: any) =>
                acc +
                Number(
                  curr.subtotal ??
                    Number(curr.cantidad || 1) * Number(curr.precio_unitario || 0)
                ),
              0
            );
          const cotList = Array.isArray(order.cotizaciones)
            ? order.cotizaciones
            : order.cotizaciones
            ? [order.cotizaciones]
            : [];
          const llantasTotal = cotList
            .flatMap((c: any) => c.detalles_cotizacion || [])
            .filter((l: any) => l.estatus_aprobacion !== "Diferido")
            .reduce((acc: number, curr: any) => acc + Number(curr.subtotal || 0), 0);

          const granTotal = srvTotal + refTotal + llantasTotal;

          const pagado = (order.pagos_orden || [])
            .filter((p: any) => (p.estatus === "Aprobado" || p.estatus === "COMPLETADO") && !p.deleted_at)
            .reduce((acc: number, curr: any) => acc + Number(curr.monto_total || 0), 0);

          const saldo = Math.max(0, granTotal - pagado);

          return {
            ...order,
            srvTotal,
            refTotal,
            llantasTotal,
            granTotal,
            pagado,
            saldo,
          };
        });
        setOrdenes(enriched);

        // Pre-select first pending order if none selected
        setPosSelectedOrderId((prev) => {
          if (prev && enriched.some((o: any) => o.id === prev)) return prev;
          const firstPending = enriched.find((o: any) => o.saldo > 0.01);
          if (firstPending) {
            setPaymentAmount(firstPending.saldo.toFixed(2));
            return firstPending.id;
          }
          return null;
        });
      }

      if (pagRes.data) setPagos(pagRes.data);
      if (movRes.data) setMovimientosCaja(movRes.data);
      if (empRes.data) setMecanicos(empRes.data);
      if (cfgRes.data) setConfigPagos(cfgRes.data);

      if (empresa?.id) {
        const provRes = await ProveedorService.obtenerProveedores(empresa.id);
        if (provRes.data) setProveedoresList(provRes.data);
      }
    } catch (err) {
      console.error("Error loading Caja data:", err);
    } finally {
      setLoading(false);
      isInitialLoad.current = false;
    }
  }, [sucursalActiva?.id, empresa?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // SincronizaciÃ³n en tiempo real multi-computadora para la misma sucursal (ej. COVA Mostrador 1 y 2)
  useEffect(() => {
    const targetSucId =
      sucursalActiva?.id ||
      sucursales[0]?.id ||
      "b0000000-0000-0000-0000-000000000001";

    const channel = supabase
      .channel(`caja-sync-${targetSucId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "caja_turnos",
          filter: `sucursal_id=eq.${targetSucId}`,
        },
        () => {
          loadData();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "caja_fondos",
          filter: `sucursal_id=eq.${targetSucId}`,
        },
        () => {
          loadData();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pagos_orden",
          filter: `sucursal_id=eq.${targetSucId}`,
        },
        () => {
          loadData();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "caja_movimientos",
          filter: `sucursal_id=eq.${targetSucId}`,
        },
        () => {
          loadData();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "caja_traspasos_fondos",
        },
        () => {
          loadData();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ordenes_servicio",
          filter: `sucursal_id=eq.${targetSucId}`,
        },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sucursalActiva?.id, sucursales, loadData, supabase]);

  // Active Selected Order in POS
  const activeOrder = useMemo(() => {
    return ordenes.find((o) => o.id === posSelectedOrderId) || null;
  }, [ordenes, posSelectedOrderId]);

  // CÃ¡lculos de Descuento en Efectivo (Cova Tires: 3%)
  const pctDescEfectivo = Number(empresa?.descuento_efectivo_porcentaje || 0);
  const tieneDescuentoEfectivoConfigurado = Boolean(empresa?.descuento_efectivo_habilitado && pctDescEfectivo > 0);
  const ahorroEfectivo = (tieneDescuentoEfectivoConfigurado && aplicarDescuentoEfectivo && activeOrder && selectedMethod === "Efectivo")
    ? Math.round(((activeOrder.saldo * pctDescEfectivo) / 100) * 100) / 100
    : 0;
  const saldoFinalEfectivo = activeOrder
    ? Math.max(0, Number((activeOrder.saldo - ahorroEfectivo).toFixed(2)))
    : 0;

  // Actualizar monto a cobrar por defecto cuando cambia la orden, mÃ©todo o toggle de descuento
  useEffect(() => {
    if (activeOrder) {
      if (selectedMethod === "Efectivo" && tieneDescuentoEfectivoConfigurado && aplicarDescuentoEfectivo) {
        setPaymentAmount(saldoFinalEfectivo > 0 ? saldoFinalEfectivo.toFixed(2) : "0.00");
      } else {
        setPaymentAmount(activeOrder.saldo > 0 ? activeOrder.saldo.toFixed(2) : "0.00");
      }
      setCashGiven("");
      setTpvReference("");
      setSpeiRastreo("");
      setQrCodeUrl(null);
    }
  }, [activeOrder, selectedMethod, aplicarDescuentoEfectivo, saldoFinalEfectivo, tieneDescuentoEfectivoConfigurado]);

  // Load BNPL Simulation whenever method or provider changes
  useEffect(() => {
    if (selectedMethod === "KueskiPay" || selectedMethod === "Atrato") {
      const targetProvider = selectedMethod === "KueskiPay" ? "KueskiPay" : "Atrato";
      setBnplProvider(targetProvider);
      const amountNum = parseFloat(paymentAmount) || activeOrder?.saldo || 0;
      simularCuotasBNPL(amountNum, targetProvider).then((sims) => {
        setBnplCuotas(sims);
      });
    }
  }, [selectedMethod, paymentAmount, activeOrder]);

  // Filtered Orders for POS list
  const filteredPosOrders = useMemo(() => {
    return ordenes.filter((o) => {
      // Must have balance due for POS unless searching
      if (o.saldo <= 0.01 && !posSearchQuery.trim()) return false;

      if (posStatusFilter === "READY" && o.estado !== "Listo para Entrega") return false;
      if (posStatusFilter === "PARTIAL" && (o.pagado <= 0.01 || o.saldo <= 0.01)) return false;

      if (!posSearchQuery.trim()) return true;
      const q = posSearchQuery.toLowerCase().trim();
      const folioStr = `#${1000 + Number(o.folio || 1)}`.toLowerCase();
      const rawFolio = String(1000 + Number(o.folio || 1));
      const directFolio = String(o.folio || "");
      const vehStr = `${o.vehiculos?.marca || ""} ${o.vehiculos?.modelo || ""} ${o.vehiculos?.placas || ""}`.toLowerCase();
      const cliStr = `${o.vehiculos?.clientes?.nombre || ""}`.toLowerCase();
      return (
        folioStr.includes(q) ||
        rawFolio.includes(q) ||
        directFolio.includes(q) ||
        vehStr.includes(q) ||
        cliStr.includes(q)
      );
    });
  }, [ordenes, posSearchQuery, posStatusFilter]);

  // Cash Calculation
  const amountToPay = parseFloat(paymentAmount) || 0;
  const cashGivenNum = parseFloat(cashGiven) || 0;
  const changeDue = Math.max(0, cashGivenNum - amountToPay);
  const cashShortage = Math.max(0, amountToPay - cashGivenNum);

  // Financial KPIs for Tab 2
  const pagosActivos = pagos.filter((p) => (p.estatus === "Aprobado" || p.estatus === "COMPLETADO") && !p.deleted_at);

  const cobrosEfectivo = pagosActivos
    .filter((p) => p.proveedor_pago === "Efectivo")
    .reduce((acc, p) => acc + Number(p.monto_total || 0), 0);

  const cobrosTransferencia = pagosActivos
    .filter((p) => p.proveedor_pago === "Transferencia")
    .reduce((acc, p) => acc + Number(p.monto_total || 0), 0);

  const cobrosTPV = pagosActivos
    .filter((p) => p.proveedor_pago === "Mercado Pago" || p.proveedor_pago === "Stripe")
    .reduce((acc, p) => acc + Number(p.monto_total || 0), 0);

  const cobrosBNPL = pagosActivos
    .filter((p) => p.proveedor_pago === "KueskiPay" || p.proveedor_pago === "Atrato")
    .reduce((acc, p) => acc + Number(p.monto_total || 0), 0);

  const comisionesPasarelaTotal = pagosActivos.reduce(
    (acc, p) => acc + Number(p.comision_pasarela || 0),
    0
  );

  const totalBrutoCobrado = cobrosEfectivo + cobrosTransferencia + cobrosTPV + cobrosBNPL;
  const totalNetoCobrado = totalBrutoCobrado - comisionesPasarelaTotal;

  const entradasCajaEfectivo = movimientosCaja
    .filter(
      (m) =>
        ["Fondo Inicial", "Ingreso Extra", "ReposiciÃ³n de Fondo", "Traspaso Entrada"].includes(m.tipo) &&
        m.metodo === "Efectivo"
    )
    .reduce((acc, m) => acc + Number(m.monto || 0), 0);

  const salidasCajaEfectivo = movimientosCaja
    .filter(
      (m) =>
        ["Gasto / Insumos", "Pago Proveedor", "Retiro Administrativo", "Retiro de Efectivo", "Traspaso Salida"].includes(m.tipo) &&
        m.metodo === "Efectivo"
    )
    .reduce((acc, m) => acc + Number(m.monto || 0), 0);

  const efectivoEnGaveta = entradasCajaEfectivo + cobrosEfectivo - salidasCajaEfectivo;

  const cuentasPorCobrar = ordenes.filter((o) => o.saldo > 0.01);
  const totalPorCobrar = cuentasPorCobrar.reduce((acc, o) => acc + o.saldo, 0);

  // Generate QR for BNPL or Online Link
  const handleGenerateQR = async (provider: "KueskiPay" | "Atrato" | "Stripe" | "Mercado Pago") => {
    if (!activeOrder) return;
    setGeneratingQr(true);
    try {
      const amount = parseFloat(paymentAmount) || activeOrder.saldo;
      const ref = `${provider.toLowerCase().replace(/\s+/g, "")}_${Date.now()}`;
      setBnplReference(ref);

      let checkoutUrl = "";
      if (provider === "KueskiPay") {
        checkoutUrl = `https://pay.kueskipay.com/checkout/${ref}?order=${activeOrder.id}&amount=${amount}`;
      } else if (provider === "Atrato") {
        checkoutUrl = `https://checkout.atratopago.com/solicitud/${ref}?order=${activeOrder.id}&amount=${amount}`;
      } else if (provider === "Stripe") {
        checkoutUrl = `https://checkout.stripe.com/pay/${ref}#order=${activeOrder.id}&amount=${amount}`;
      } else {
        checkoutUrl = `https://www.mercadopago.com.mx/checkout/v1/redirect?pref_id=${ref}&amount=${amount}`;
      }

      const qr = await QRCode.toDataURL(checkoutUrl, {
        width: 320,
        margin: 2,
        color: { dark: "#0f172a", light: "#ffffff" },
      });
      setQrCodeUrl(qr);
    } catch (err) {
      console.error("Error generating QR:", err);
    } finally {
      setGeneratingQr(false);
    }
  };

  // Confirm and Execute POS Payment
  const handleExecutePayment = async () => {
    if (!activeOrder) return;
    const amountNum = parseFloat(paymentAmount);
    if (isNaN(amountNum) || amountNum <= 0) return;

    setIsProcessingPayment(true);
    try {
      if (selectedMethod === "Split") {
        const totalCubierto = splitPayments.reduce((acc, p) => acc + Number(p.monto || 0), 0);
        if (totalCubierto < amountNum - 0.05) {
          alert(`El total asignado en mÃ©todos (${totalCubierto.toFixed(2)}) no cubre el monto a cobrar (${amountNum.toFixed(2)})`);
          setIsProcessingPayment(false);
          return;
        }

        const targetSucursalId =
          activeOrder.sucursal_id ||
          sucursalActiva?.id ||
          sucursales[0]?.id ||
          "b0000000-0000-0000-0000-000000000001";

        const res = await MultiPaymentService.registrarPagosOrdenMulti({
          ordenId: activeOrder.id,
          sucursalId: targetSucursalId,
          pagos: splitPayments,
        });

        if (!res.success) {
          alert(res.message || "Error al registrar pagos divididos");
          setIsProcessingPayment(false);
          return;
        }

        const totalCashChange = splitPayments
          .filter((p) => p.metodo === "Efectivo")
          .reduce((acc, p) => acc + Number(p.cambio || 0), 0);
        const totalCashGiven = splitPayments
          .filter((p) => p.metodo === "Efectivo")
          .reduce((acc, p) => acc + Number(p.montoRecibido || p.monto || 0), 0);

        const nuevoPagado = (activeOrder.pagado || 0) + totalCubierto;

        setReceiptOrder({
          ...activeOrder,
          pagado: nuevoPagado,
          saldo: Math.max(0, activeOrder.granTotal - nuevoPagado),
        });
        setReceiptPayments([...splitPayments]);
        setReceiptPayment(null);
        setReceiptCashGiven(totalCashGiven > 0 ? totalCashGiven : undefined);
        setReceiptChangeDue(totalCashChange > 0 ? totalCashChange : undefined);
        setReceiptModalOpen(true);

        await loadData();
        return;
      }
      let dbProvider: "Efectivo" | "Transferencia" | "Mercado Pago" | "Stripe" | "KueskiPay" | "Atrato" = "Efectivo";
      let detalle = "Efectivo en Ventanilla";
      let ref = `AUT-${Math.floor(100000 + Math.random() * 900000)}`;

      let finalAhorro = 0;
      let metodoPagoConfigObj = tenantMetodos.find((m) => m.id === selectedTenantMetodoId);

      if (selectedMethod === "Efectivo") {
        dbProvider = "Efectivo";
        finalAhorro = ahorroEfectivo;
        detalle = finalAhorro > 0
          ? `Efectivo en Mostrador (Descuento PromociÃ³n ${pctDescEfectivo}%: -${finalAhorro.toFixed(2)} â€¢ EntregÃ³: ${cashGivenNum.toLocaleString("es-MX")} â€¢ Cambio: ${changeDue.toLocaleString("es-MX")})`
          : `Efectivo en Mostrador (EntregÃ³: ${cashGivenNum.toLocaleString("es-MX")} â€¢ Cambio: ${changeDue.toLocaleString("es-MX")})`;
      } else if (selectedMethod === "TPV") {
        if (!metodoPagoConfigObj) {
          metodoPagoConfigObj = tenantMetodos.find((m) => ["TARJETA_CREDITO", "MSI", "DEBITO", "TPV"].includes(m.tipo?.toUpperCase() || ""));
        }
        dbProvider = (metodoPagoConfigObj?.proveedor as any) || "Mercado Pago";
        detalle = metodoPagoConfigObj ? metodoPagoConfigObj.nombre : tpvType;
        ref = tpvReference.trim() || `TPV-${Math.floor(100000 + Math.random() * 900000)}`;
      } else if (selectedMethod === "SPEI") {
        dbProvider = "Transferencia";
        const ctaSel = cuentasBancarias.find((c) => c.id === selectedCuentaBancariaId);
        detalle = ctaSel
          ? `Transferencia SPEI (${ctaSel.banco} â€¢ ${ctaSel.alias})`
          : "Transferencia Bancaria SPEI";
        ref = speiRastreo.trim() || `SPEI-${Date.now().toString().slice(-8)}`;
      } else if (selectedMethod === "KueskiPay") {
        dbProvider = "KueskiPay";
        detalle = "Kueski Pay (Compre Ahora, Pague DespuÃ©s)";
        ref = bnplReference || `KUESKI-${Date.now().toString().slice(-8)}`;
      } else if (selectedMethod === "Atrato") {
        dbProvider = "Atrato";
        detalle = "Atrato Pago (Financiamiento Automotriz)";
        ref = bnplReference || `ATRATO-${Date.now().toString().slice(-8)}`;
      } else if (selectedMethod === "Stripe") {
        dbProvider = "Stripe";
        detalle = "Stripe Checkout (Tarjeta / MSI)";
        ref = bnplReference || `STRIPE-${Date.now().toString().slice(-8)}`;
      }

      // CÃ¡lculo de comisiÃ³n con TenantMetodosPagoService
      let comisionMonto = 0;
      if (metodoPagoConfigObj) {
        const comCalc = TenantMetodosPagoService.calcularComision(amountNum, metodoPagoConfigObj);
        comisionMonto = comCalc.comisionMonto;
      } else {
        const cfg = configPagos.find((c) => c.proveedor === dbProvider);
        const pctComision = Number(cfg?.comision_porcentaje || 0);
        comisionMonto = Number(((amountNum * pctComision) / 100).toFixed(2));
      }

      const targetSucursalId =
        activeOrder.sucursal_id ||
        sucursalActiva?.id ||
        sucursales[0]?.id ||
        "b0000000-0000-0000-0000-000000000001";

      const f1Operativo = fondos.find((f) => f.tipo === "OPERATIVO") || fondos[0];
      const { data: newPago, error: pagoErr } = await supabase
        .from("pagos_orden")
        .insert({
          orden_servicio_id: activeOrder.id,
          sucursal_id: targetSucursalId,
          monto_total: amountNum,
          proveedor_pago: dbProvider,
          metodo_detalle: detalle,
          referencia: ref,
          estatus: "Aprobado",
          comision_pasarela: comisionMonto,
          comision_monto: comisionMonto,
          monto_neto: Number(Math.max(0, amountNum - comisionMonto).toFixed(2)),
          plazo_msi: metodoPagoConfigObj?.plazo_msi || null,
          tenant_metodo_pago_id: metodoPagoConfigObj?.id || null,
          descuento_aplicado: finalAhorro > 0 ? finalAhorro : null,
          fecha_pago: new Date().toISOString(),
          cuenta_bancaria_id: selectedMethod === "SPEI" ? selectedCuentaBancariaId || null : null,
          caja_turno_id: turnoActivo?.id || null,
          caja_fondo_id: selectedMethod === "Efectivo" ? f1Operativo?.id || null : null,
        })
        .select()
        .single();

      if (pagoErr) throw pagoErr;

      const nuevoPagado = activeOrder.pagado + amountNum;
      const nuevoEstatus =
        (nuevoPagado + finalAhorro) >= activeOrder.granTotal - 0.5 ? "Pagado" : "Parcial";

      const ordUpdate: any = { estatus_pago: nuevoEstatus };
      if (finalAhorro > 0) {
        ordUpdate.descuento_efectivo_porcentaje = pctDescEfectivo;
        ordUpdate.descuento_efectivo_monto = finalAhorro;
      }

      await supabase
        .from("ordenes_servicio")
        .update(ordUpdate)
        .eq("id", activeOrder.id);

      // Open Thermal Receipt Modal
      setReceiptOrder({
        ...activeOrder,
        pagado: nuevoPagado,
        saldo: Math.max(0, activeOrder.granTotal - nuevoPagado),
      });
      setReceiptPayment(newPago);
      setReceiptPayments(undefined);
      setReceiptCashGiven(selectedMethod === "Efectivo" ? cashGivenNum : undefined);
      setReceiptChangeDue(selectedMethod === "Efectivo" ? changeDue : undefined);
      setReceiptModalOpen(true);

      await loadData();
    } catch (err) {
      console.error("Error ejecutando cobro:", err);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Handler: Cancelar Pago (Soft Delete)
  const handleConfirmarCancelacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelPago || !motivoCancelacion.trim()) return;
    setSavingCancel(true);

    try {
      await supabase
        .from("pagos_orden")
        .update({
          deleted_at: new Date().toISOString(),
          motivo_cancelacion: motivoCancelacion.trim(),
        })
        .eq("id", cancelPago.id);

      const ordId = cancelPago.orden_servicio_id;
      const targetOrder = ordenes.find((o) => o.id === ordId);
      if (targetOrder) {
        const remainingPaid = Math.max(
          0,
          targetOrder.pagado - Number(cancelPago.monto_total || 0)
        );
        const nextStatus =
          remainingPaid <= 0.01
            ? "Pendiente"
            : remainingPaid >= targetOrder.granTotal - 0.5
            ? "Pagado"
            : "Parcial";

        await supabase
          .from("ordenes_servicio")
          .update({ estatus_pago: nextStatus })
          .eq("id", ordId);
      }

      setCancelPago(null);
      setMotivoCancelacion("");
      await loadData();
    } catch (err) {
      console.error("Error cancelando pago:", err);
    } finally {
      setSavingCancel(false);
    }
  };

  // Handler: Registrar Movimiento Caja Chica
  const handleSaveMovimiento = async (e: React.FormEvent) => {
    e.preventDefault();
    const montoNum = parseFloat(movForm.monto);
    if (!movForm.concepto.trim() || isNaN(montoNum) || montoNum <= 0) return;

    setSavingMov(true);
    try {
      const targetSucursalId =
        sucursalActiva?.id ||
        sucursales[0]?.id ||
        "b0000000-0000-0000-0000-000000000001";

      const targetFondoId = movForm.cajaFondoId || (fondos.find(f => f.tipo === "OPERATIVO") || fondos[0])?.id;
      const cajaRes = await ConcurrencyService.registrarMovimientoCaja({
        tipo: movForm.tipo,
        concepto: movForm.concepto.trim(),
        monto: montoNum,
        metodo: movForm.metodo,
        responsable: movForm.responsable.trim() || perfil?.nombre || "Administrador",
        sucursalId: targetSucursalId,
        cajaTurnoId: turnoActivo?.id || undefined,
        cajaFondoId: targetFondoId || undefined,
      });

      if (!cajaRes.success) {
        alert(cajaRes.message || "Error al registrar movimiento en caja");
        return;
      }

      // Si es Pago a Proveedor y tiene datos de compra/evidencia, registrar en compras_proveedores
      if (
        movForm.tipo === "Pago Proveedor" &&
        (movForm.comprobanteFile || movForm.folioTicket || movForm.proveedorId) &&
        empresa?.id
      ) {
        try {
          const targetProvId = movForm.proveedorId || proveedoresList[0]?.id;
          let evidenciaUrl: string | null = null;
          let storagePath: string | null = null;
          let evidenciaTipo: "IMAGE" | "PDF" | "OTHER" | null = null;

          if (movForm.comprobanteFile && targetProvId) {
            const uploadRes = await ProveedorService.subirEvidenciaCompra(
              movForm.comprobanteFile,
              empresa.id,
              targetProvId
            );
            evidenciaUrl = uploadRes.publicUrl;
            storagePath = uploadRes.storagePath;
            evidenciaTipo = movForm.comprobanteFile.type.includes("pdf") ? "PDF" : "IMAGE";
          }

          const today = new Date();
          const fechaVencGarantia = new Date(today);
          fechaVencGarantia.setMonth(today.getMonth() + (movForm.mesesGarantia || 1));

          if (targetProvId) {
            await supabase.from("compras_proveedores").insert({
              empresa_id: empresa.id,
              sucursal_id: targetSucursalId,
              proveedor_id: targetProvId,
              caja_movimiento_id: cajaRes.id || null,
              caja_turno_id: turnoActivo?.id || null,
              caja_fondo_id: targetFondoId || null,
              folio_ticket_nota:
                movForm.folioTicket?.trim() || `TICK-CAJA-${Date.now().toString().slice(-5)}`,
              descripcion: movForm.concepto.trim(),
              monto_costo: montoNum,
              fuente_pago: "CAJA_CHICA",
              estatus_pago: "PAGADO",
              monto_pagado: montoNum,
              monto_saldo_pendiente: 0,
              fecha_compra: today.toISOString().split("T")[0],
              meses_garantia: movForm.mesesGarantia || 1,
              fecha_vencimiento_garantia: fechaVencGarantia.toISOString().split("T")[0],
              estatus_garantia: "VIGENTE",
              evidencia_url: evidenciaUrl,
              evidencia_storage_path: storagePath,
              evidencia_tipo: evidenciaTipo,
            });
          }
        } catch (provErr) {
          console.error("Error al registrar compra y garantÃ­a desde caja:", provErr);
        }
      }

      setIsCajaModalOpen(false);
      setMovForm({
        tipo: "Gasto / Insumos",
        concepto: "",
        monto: "",
        metodo: "Efectivo",
        responsable: perfil?.nombre || "Administrador",
        cajaFondoId: (fondos.find(f => f.tipo === "OPERATIVO") || fondos[0])?.id || "",
        proveedorId: "",
        folioTicket: "",
        mesesGarantia: 12,
        comprobanteFile: null,
      });
      await loadData();
    } catch (err) {
      console.error("Error guardando movimiento de caja:", err);
    } finally {
      setSavingMov(false);
    }
  };

  // Tab 4: Comisiones de TÃ©cnicos
  const desgloseServiciosMecanicos: any[] = [];
  ordenes.forEach((o) => {
    (o.orden_servicio_servicios || []).forEach((s: any) => {
      const mecId = s.mecanico_id || o.mecanico_id;
      const mecObj = mecanicos.find((m) => m.id === mecId);
      if (mecObj) {
        const precioMO = Number(s.precio_cobrado || 0);
        const horas = Number(s.horas_labor || 1);
        const pct = Number(mecObj.comision_porcentaje || 25);
        const comision = precioMO * (pct / 100);

        desgloseServiciosMecanicos.push({
          id: s.id,
          ordenId: o.id,
          folio: o.folio,
          estadoOrden: o.estado,
          estatusPago: o.estatus_pago,
          vehiculo: `${o.vehiculos?.marca || ""} ${o.vehiculos?.modelo || ""} (${
            o.vehiculos?.placas || ""
          })`,
          servicioNombre:
            s.servicios_taller?.nombre || "Servicio de Mano de Obra",
          categoria: s.servicios_taller?.categoria || "General",
          mecanicoId: mecObj.id,
          mecanicoNombre: mecObj.nombre,
          mecanicoColor: mecObj.color_avatar || "#2563EB",
          horas,
          precioMO,
          pct,
          comision,
          fecha: o.fecha_ingreso,
        });
      }
    });
  });

  const resumenMecanicos = mecanicos.map((m) => {
    const items = desgloseServiciosMecanicos.filter((d) => d.mecanicoId === m.id);
    const totalHoras = items.reduce((acc, i) => acc + i.horas, 0);
    const totalMO = items.reduce((acc, i) => acc + i.precioMO, 0);
    const totalComision = items.reduce((acc, i) => acc + i.comision, 0);
    return {
      ...m,
      serviciosCount: items.length,
      totalHoras,
      totalMO,
      totalComision,
    };
  });

  const filteredDesgloseMecanicos =
    selectedMecanicoId === "ALL"
      ? desgloseServiciosMecanicos
      : desgloseServiciosMecanicos.filter(
          (d) => d.mecanicoId === selectedMecanicoId
        );

  const copyClabeToClipboard = () => {
    navigator.clipboard.writeText("012180015482910248");
    setCopiedClabe(true);
    setTimeout(() => setCopiedClabe(false), 2000);
  };

  const handleExportHistorialCSV = () => {
    if (historialTurnos.length === 0) return;
    const lines: string[] = [];
    lines.push('HISTORIAL DE CORTES DE CAJA Y TURNOS (AUDITORIA CIERRE Z)');
    lines.push(`Empresa;${empresa?.nombre_comercial || 'Cova Tires'}`);
    lines.push(`Sucursal;${sucursalActiva?.nombre || 'Matriz'}`);
    lines.push(`Fecha de Descarga;${new Date().toLocaleString('es-MX')}`);
    lines.push('');
    lines.push('Turno ID;Fecha Apertura;Fecha Cierre;Fondo 1 Apertura;Fondo 1 Declarado;Fondo 1 Teorico;Variacion F1;Fondo 2 Apertura;Fondo 2 Declarado;Fondo 2 Teorico;Variacion F2;Remesa Retirada;Fondo Siguiente;Estado;Justificacion');

    historialTurnos.forEach((t) => {
      lines.push([
        t.id,
        new Date(t.fecha_apertura).toLocaleString('es-MX'),
        t.fecha_cierre ? new Date(t.fecha_cierre).toLocaleString('es-MX') : 'Abierto',
        Number(t.monto_apertura_fondo1 || 0).toFixed(2),
        Number(t.monto_cierre_declarado_f1 || 0).toFixed(2),
        Number(t.monto_cierre_teorico_f1 || 0).toFixed(2),
        Number(t.diferencia_f1 || 0).toFixed(2),
        Number(t.monto_apertura_fondo2 || 0).toFixed(2),
        Number(t.monto_cierre_declarado_f2 || 0).toFixed(2),
        Number(t.monto_cierre_teorico_f2 || 0).toFixed(2),
        Number(t.diferencia_f2 || 0).toFixed(2),
        Number(t.monto_remesa_retirada || 0).toFixed(2),
        Number(t.monto_fondo_siguiente_f1 || 0).toFixed(2),
        t.estado,
        (t.justificacion_descuadre || '').replace(/;/g, ' '),
      ].join(';'));
    });

    const csvContent = '\uFEFF' + lines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Historial_Cortes_Z_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
  

  return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 pb-12">
      {/* 1. Header Unificado y NavegaciÃ³n Moderna */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
        <header className="px-5 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center shrink-0">
              <Receipt size={22} strokeWidth={2.2} />
            </div>
            <div>
              <div>
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                  Terminal de Caja
                </h1>
              </div>
            </div>
          </div>

          {/* Switcher de PestaÃ±as Tipo Pill */}
          <nav className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl self-start md:self-auto overflow-x-auto max-w-full">
            <button
              onClick={() => setActiveTab("POS")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                activeTab === "POS"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Smartphone size={13} />
              Terminal POS
            </button>
            <button
              onClick={() => setActiveTab("Cobranza")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                activeTab === "Cobranza"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Landmark size={13} />
              Corte & AuditorÃ­a
            </button>
            <button
              onClick={() => setActiveTab("CajaChica")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                activeTab === "CajaChica"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Wallet size={13} />
              Caja Chica
            </button>
            <button
              onClick={() => setActiveTab("Comisiones")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                activeTab === "Comisiones"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Wrench size={13} />
              Comisiones
            </button>
          </nav>
        </header>

        {/* Franja Compacta de Turno & Arqueo Ciego */}
        <div className="p-2.5 bg-slate-50/50">
          <TurnoStatusBar
            turnoActivo={turnoActivo}
            fondos={fondos}
            loading={loading}
            onAbrirTurno={() => setIsAbrirTurnoOpen(true)}
            onHacerCorte={() => setIsCorteOpen(true)}
            onTraspaso={() => setIsTraspasoOpen(true)}
          />
        </div>
      </div>

      <main className="flex-1 w-full">
        {/* ========================================================= */}
        {/* TAB 1: TERMINAL DE COBRO RÃPIDO (SPLIT VIEW POS)          */}
        {/* ========================================================= */}
        {activeTab === "POS" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Columna Izquierda (5 cols): Ã“rdenes por Cobrar */}
            <div className="lg:col-span-5 flex flex-col gap-3">
              <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-xs flex flex-col gap-2.5">
                {/* Buscador RÃ¡pido */}
                <div className="relative">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    value={posSearchQuery}
                    onChange={(e) => setPosSearchQuery(e.target.value)}
                    placeholder="Buscar por auto, placa o cliente..."
                    className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-primary bg-slate-50/70"
                  />
                </div>

                {/* Filtros Simplificados */}
                <div className="flex items-center gap-1.5 text-xs">
                  <button
                    onClick={() => setPosStatusFilter("ALL")}
                    className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                      posStatusFilter === "ALL"
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    Todas ({cuentasPorCobrar.length})
                  </button>
                  <button
                    onClick={() => setPosStatusFilter("READY")}
                    className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                      posStatusFilter === "READY"
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    Listas ({ordenes.filter((o) => o.estado === "Listo para Entrega" && o.saldo > 0).length})
                  </button>
                  <button
                    onClick={() => setPosStatusFilter("PARTIAL")}
                    className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                      posStatusFilter === "PARTIAL"
                        ? "bg-amber-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    Parciales ({ordenes.filter((o) => o.pagado > 0.01 && o.saldo > 0.01).length})
                  </button>
                </div>
              </div>

              {/* Lista Escaneable de Ã“rdenes */}
              <div className="flex flex-col gap-2 max-h-[calc(100vh-270px)] overflow-y-auto pr-1">
                {filteredPosOrders.map((ord) => {
                  const isSelected = ord.id === posSelectedOrderId;
                  const isReady = ord.estado === "Listo para Entrega";
                  const veh = ord.vehiculos || {};
                  const cli = veh.clientes || {};
                  const folio = `#${1000 + Number(ord.folio || 1)}`;

                  return (
                    <div
                      key={ord.id}
                      onClick={() => setPosSelectedOrderId(ord.id)}
                      className={`cursor-pointer rounded-xl p-3 border transition-all flex flex-col gap-1.5 ${
                        isSelected
                          ? "bg-primary/5 border-primary ring-2 ring-primary/20 shadow-sm border-l-4 border-l-primary"
                          : "bg-white border-slate-200 hover:border-slate-300 shadow-xs"
                      }`}
                    >
                      {/* Nivel 1: Folio + Estatus + Saldo Destacado */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-slate-900 text-xs">
                            {folio}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                              isReady
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {ord.estado}
                          </span>
                        </div>
                        <span className="text-sm font-extrabold text-rose-600 tabular-nums">
                          ${ord.saldo.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      {/* Nivel 2: VehÃ­culo + Placa */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-800 truncate">
                          {veh.marca} {veh.modelo}
                        </span>
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold shrink-0">
                          {veh.placas || "Sin placas"}
                        </span>
                      </div>

                      {/* Nivel 3: Cliente */}
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span className="truncate">{cli.nombre || "Venta General"}</span>
                        <span className="shrink-0 text-[10px]">
                          Total: ${ord.granTotal.toLocaleString("es-MX", { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {filteredPosOrders.length === 0 && (
                  <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-400 text-xs">
                    No hay Ã³rdenes con saldo pendiente.
                  </div>
                )}
              </div>
            </div>

            {/* Columna Derecha (7 cols): Terminal de Cobro Guiada */}
            <div className="lg:col-span-7 flex flex-col gap-4">
              {activeOrder ? (
                <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden flex flex-col">
                  {/* Encabezado Conciso de la Orden Activa */}
                  <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-sm text-white">
                        #{1000 + Number(activeOrder.folio || 1)}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/15 text-white font-medium">
                        {activeOrder.vehiculos?.marca} {activeOrder.vehiculos?.modelo}
                      </span>
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-slate-200">
                        {activeOrder.vehiculos?.placas || "Sin placas"}
                      </span>
                      <span className="text-xs text-slate-300">
                        â€¢ {activeOrder.vehiculos?.clientes?.nombre}
                      </span>
                    </div>

                    <Link
                      href={`/tablero?ordenId=${activeOrder.id}`}
                      className="text-xs px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold transition-colors inline-flex items-center gap-1 shrink-0"
                    >
                      Ver Orden <ExternalLink size={12} />
                    </Link>
                  </div>

                  {/* Saldo y Monto a Cobrar Destacado */}
                  <div className="p-5 border-b border-slate-100 bg-gradient-to-b from-slate-50/70 to-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                        Total por Cobrar
                      </span>
                      <div className="text-3xl font-black text-slate-900 tabular-nums mt-0.5">
                        ${amountToPay.toLocaleString("es-MX", { minimumFractionDigits: 2 })}{" "}
                        <span className="text-sm font-semibold text-slate-400">MXN</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Total de la orden: ${Number(activeOrder.granTotal || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })} â€¢ Anticipos: ${Number(activeOrder.pagado || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                      </p>
                    </div>

                    {/* Input y BotÃ³n de Ajuste de Monto */}
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">
                          $
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                          className="w-32 pl-7 pr-3 py-2 text-sm font-bold text-slate-900 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-primary text-right"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setPaymentAmount(activeOrder.saldo.toFixed(2))}
                        className="px-2.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                      >
                        Total
                      </button>
                    </div>
                  </div>

                  {/* Selector Guiado de MÃ©todos de Pago */}
                  <div className="p-5 flex flex-col gap-3">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                      Â¿CÃ³mo paga el cliente?
                    </label>

                    {/* 3 MÃ©todos Directos */}
                    <div className="grid grid-cols-3 gap-2.5">
                      {/* 1. Efectivo */}
                      <button
                        type="button"
                        onClick={() => setSelectedMethod("Efectivo")}
                        className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                          selectedMethod === "Efectivo"
                            ? "border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-600/20"
                            : "border-slate-200 hover:border-slate-300 bg-white"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <Banknote size={18} className="text-emerald-600" />
                          <span className="text-[9px] font-bold uppercase text-emerald-700 bg-emerald-100 px-1 py-0.2 rounded">
                            Sin comisiÃ³n
                          </span>
                        </div>
                        <span className="font-bold text-xs text-slate-900 mt-1">Efectivo</span>
                        <span className="text-[10px] text-slate-500">Gaveta</span>
                      </button>

                      {/* 2. Tarjeta TPV */}
                      <button
                        type="button"
                        onClick={() => setSelectedMethod("TPV")}
                        className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                          selectedMethod === "TPV"
                            ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                            : "border-slate-200 hover:border-slate-300 bg-white"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <CreditCard size={18} className="text-primary" />
                          <span className="text-[9px] font-bold uppercase text-slate-500 bg-slate-100 px-1 py-0.2 rounded">
                            Point
                          </span>
                        </div>
                        <span className="font-bold text-xs text-slate-900 mt-1">Tarjeta</span>
                        <span className="text-[10px] text-slate-500">Terminal TPV</span>
                      </button>

                      {/* 3. Transferencia SPEI */}
                      <button
                        type="button"
                        onClick={() => setSelectedMethod("SPEI")}
                        className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                          selectedMethod === "SPEI"
                            ? "border-blue-600 bg-blue-50/50 ring-2 ring-blue-600/20"
                            : "border-slate-200 hover:border-slate-300 bg-white"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <Landmark size={18} className="text-blue-600" />
                          <span className="text-[9px] font-bold uppercase text-blue-700 bg-blue-100 px-1 py-0.2 rounded">
                            Directo
                          </span>
                        </div>
                        <span className="font-bold text-xs text-slate-900 mt-1">SPEI</span>
                        <span className="text-[10px] text-slate-500">Transferencia</span>
                      </button>
                    </div>

                    {/* RevelaciÃ³n Progresiva: Otros MÃ©todos */}
                    {(() => {
                      const isOtherActive = ["KueskiPay", "Atrato", "Stripe", "Split"].includes(selectedMethod);
                      const isExpanded = showOtherMethods || isOtherActive;

                      return (
                        <div className="flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => setShowOtherMethods(!isExpanded)}
                            className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center justify-between px-3 py-2 rounded-xl border border-dashed border-slate-200 hover:border-slate-300 bg-slate-50/50 transition-all cursor-pointer"
                          >
                            <span className="flex items-center gap-1.5">
                              <Split size={13} className="text-slate-400" />
                              <span>MÃ¡s opciones: Pago Dividido o Financiamiento (Kueski / Atrato / Stripe)</span>
                            </span>
                            <ChevronDown
                              size={14}
                              className={`transform transition-transform ${isExpanded ? "rotate-180" : ""}`}
                            />
                          </button>

                          {isExpanded && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 animate-in fade-in duration-200">
                              {/* Multi-MÃ©todo Split */}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedMethod("Split");
                                  const amt = parseFloat(paymentAmount) || activeOrder.saldo;
                                  setSplitPayments([
                                    {
                                      id: `caja-split-${Date.now()}`,
                                      metodo: "Efectivo",
                                      monto: Number(amt.toFixed(2)),
                                      montoRecibido: Number(amt.toFixed(2)),
                                      cambio: 0,
                                    }
                                  ]);
                                }}
                                className={`p-2.5 rounded-xl border text-left flex flex-col gap-0.5 transition-all cursor-pointer ${
                                  selectedMethod === "Split"
                                    ? "border-amber-600 bg-amber-50/50 ring-2 ring-amber-600/20"
                                    : "border-slate-200 hover:border-slate-300 bg-white"
                                }`}
                              >
                                <span className="font-bold text-xs text-slate-900">Multi-MÃ©todo</span>
                                <span className="text-[10px] text-slate-500">Dividir pago</span>
                              </button>

                              {/* Kueski Pay */}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedMethod("KueskiPay");
                                  handleGenerateQR("KueskiPay");
                                }}
                                className={`p-2.5 rounded-xl border text-left flex flex-col gap-0.5 transition-all cursor-pointer ${
                                  selectedMethod === "KueskiPay"
                                    ? "border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600/20"
                                    : "border-slate-200 hover:border-slate-300 bg-white"
                                }`}
                              >
                                <span className="font-bold text-xs text-slate-900">Kueski Pay</span>
                                <span className="text-[10px] text-slate-500">BNPL Quincenas</span>
                              </button>

                              {/* Atrato Pago */}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedMethod("Atrato");
                                  handleGenerateQR("Atrato");
                                }}
                                className={`p-2.5 rounded-xl border text-left flex flex-col gap-0.5 transition-all cursor-pointer ${
                                  selectedMethod === "Atrato"
                                    ? "border-purple-600 bg-purple-50/50 ring-2 ring-purple-600/20"
                                    : "border-slate-200 hover:border-slate-300 bg-white"
                                }`}
                              >
                                <span className="font-bold text-xs text-slate-900">Atrato Pago</span>
                                <span className="text-[10px] text-slate-500">CrÃ©dito Llantas</span>
                              </button>

                              {/* Stripe */}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedMethod("Stripe");
                                  handleGenerateQR("Stripe");
                                }}
                                className={`p-2.5 rounded-xl border text-left flex flex-col gap-0.5 transition-all cursor-pointer ${
                                  selectedMethod === "Stripe"
                                    ? "border-sky-600 bg-sky-50/50 ring-2 ring-sky-600/20"
                                    : "border-slate-200 hover:border-slate-300 bg-white"
                                }`}
                              >
                                <span className="font-bold text-xs text-slate-900">Stripe Link</span>
                                <span className="text-[10px] text-slate-500">Pago en lÃ­nea</span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* DETALLES DEL MÃ‰TODO SELECCIONADO */}
                    <div className="bg-slate-50/70 border border-slate-200/90 rounded-2xl p-4 mt-1">
                      {/* 0. MULTI-METODO SPLIT PAYMENT */}
                      {selectedMethod === "Split" && (
                        <div className="flex flex-col gap-3">
                          <SplitPaymentManager
                            total={amountToPay}
                            payments={splitPayments}
                            onChange={setSplitPayments}
                            disabled={isProcessingPayment}
                            cuentasBancarias={cuentasBancarias}
                          />
                        </div>
                      )}

                      {/* 1. EFECTIVO EN VENTANILLA */}
                      {selectedMethod === "Efectivo" && (
                        <div className="flex flex-col gap-3">
                          {/* Banner de Descuento en Efectivo (Promo Cova) */}
                          {tieneDescuentoEfectivoConfigurado && activeOrder && (
                            <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between gap-2 shadow-2xs">
                              <div className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-emerald-700 shrink-0" />
                                <span className="text-xs font-bold text-emerald-950">
                                  Precio Promocional en Efectivo (-{pctDescEfectivo}%): ahorra ${ahorroEfectivo.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN
                                </span>
                              </div>
                              <label className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 cursor-pointer bg-white/90 px-2 py-0.5 rounded-lg border border-emerald-300 shrink-0">
                                <input
                                  type="checkbox"
                                  checked={aplicarDescuentoEfectivo}
                                  onChange={(e) => setAplicarDescuentoEfectivo(e.target.checked)}
                                  className="w-3.5 h-3.5 text-emerald-600 rounded"
                                />
                                Aplicar
                              </label>
                            </div>
                          )}

                          {/* Billetes rÃ¡pidos */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[11px] text-slate-400 font-semibold mr-1">Billetes:</span>
                            {QUICK_CASH_AMOUNTS.map((amt) => (
                              <button
                                key={amt}
                                type="button"
                                onClick={() => setCashGiven(String(amt))}
                                className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs font-bold hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
                              >
                                +${amt}
                              </button>
                            ))}
                            <button
                              type="button"
                              onClick={() => setCashGiven(String(amountToPay))}
                              className="px-2.5 py-1 rounded-lg border border-emerald-300 bg-emerald-50 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer"
                            >
                              Pago Exacto
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                            <div>
                              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                                Efectivo Recibido del Cliente:
                              </label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                                  $
                                </span>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={cashGiven}
                                  onChange={(e) => setCashGiven(e.target.value)}
                                  placeholder="0.00"
                                  className="w-full pl-7 pr-3 py-2 text-base font-bold border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-emerald-600"
                                />
                              </div>
                            </div>

                            {/* Indicador de Cambio */}
                            <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between">
                              <div>
                                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                                  Cambio a Devolver
                                </span>
                                <span
                                  className={`text-xl font-black tabular-nums ${
                                    cashShortage > 0.01 ? "text-amber-600" : "text-emerald-600"
                                  }`}
                                >
                                  ${changeDue.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                              {cashShortage > 0.01 && (
                                <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                                  Faltan ${cashShortage.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 2. TPV BANCARIA */}
                      {selectedMethod === "TPV" && (
                        <div className="flex flex-col gap-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                                Terminal TPV Utilizada:
                              </label>
                              {tenantMetodos && tenantMetodos.length > 0 ? (
                                <select
                                  value={selectedTenantMetodoId}
                                  onChange={(e) => setSelectedTenantMetodoId(e.target.value)}
                                  className="w-full p-2 text-xs border border-slate-300 rounded-lg bg-white"
                                >
                                  {tenantMetodos
                                    .filter((m) => ["TARJETA_CREDITO", "MSI", "DEBITO", "TPV"].includes(m.tipo?.toUpperCase() || ""))
                                    .map((m) => (
                                      <option key={m.id} value={m.id}>
                                        {m.nombre} ({Number(m.comision_porcentaje)}%{Number(m.comision_fija || 0) > 0 ? ` + ${m.comision_fija}` : ""})
                                      </option>
                                    ))}
                                </select>
                              ) : (
                                <select
                                  value={tpvType}
                                  onChange={(e) => setTpvType(e.target.value)}
                                  className="w-full p-2 text-xs border border-slate-300 rounded-lg bg-white"
                                >
                                  <option value="BanBajÃ­o Tarjeta (TPV)">BanBajÃ­o Tarjeta (TPV 2.0%)</option>
                                  <option value="Mercado Pago Tarjeta (1 ExhibiciÃ³n)">Mercado Pago Tarjeta (1 ExhibiciÃ³n 3.5%)</option>
                                  <option value="Terminal Point Smart (Mercado Pago)">Terminal Point Smart</option>
                                </select>
                              )}
                            </div>

                            <div>
                              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                                Folio de AutorizaciÃ³n / Voucher:
                              </label>
                              <input
                                type="text"
                                value={tpvReference}
                                onChange={(e) => setTpvReference(e.target.value)}
                                placeholder="Ej: AUT-894120 o Ãºltimos 4 dÃ­gitos"
                                className="w-full p-2 text-xs border border-slate-300 rounded-lg bg-white font-mono"
                              />
                            </div>
                          </div>
                          <div className="text-[10px] text-slate-500 bg-slate-100/70 p-2 rounded-lg flex items-center justify-between">
                            <span className="flex items-center gap-1 text-slate-600">
                              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                              ComisiÃ³n bancaria absorbida en back-office (no afecta al cliente)
                            </span>
                            <span className="font-mono text-slate-700 font-semibold">
                              TPV Conectada
                            </span>
                          </div>
                        </div>
                      )}

                      {/* 3. SPEI BANCARIO MULTI-CUENTA */}
                      {selectedMethod === "SPEI" && (
                        <div className="flex flex-col gap-3">
                          {cuentasBancarias && cuentasBancarias.length > 0 ? (
                            <div className="flex flex-col gap-2">
                              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                                Cuenta Receptora:
                              </label>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                {cuentasBancarias.map((cta) => {
                                  const isSel = selectedCuentaBancariaId === cta.id;
                                  return (
                                    <div
                                      key={cta.id}
                                      onClick={() => setSelectedCuentaBancariaId(cta.id)}
                                      className={`cursor-pointer p-2.5 rounded-xl border text-left transition-all bg-white ${
                                        isSel
                                          ? "border-blue-600 bg-blue-50/40 ring-2 ring-blue-600/20"
                                          : "border-slate-200 hover:border-slate-300"
                                      }`}
                                    >
                                      <div className="flex justify-between items-center">
                                        <span className="font-bold text-xs text-slate-900 block truncate">
                                          {cta.alias}
                                        </span>
                                        <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1 rounded">
                                          {cta.banco}
                                        </span>
                                      </div>
                                      <span className="font-mono text-[10px] text-slate-500 block mt-1 truncate">
                                        {cta.clabe || cta.numero_cuenta || "Sin CLABE"}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Banner de la cuenta activa con Copiar CLABE */}
                              {(() => {
                                const activeCta =
                                  cuentasBancarias.find((c) => c.id === selectedCuentaBancariaId) ||
                                  cuentasBancarias[0];
                                return (
                                  <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-1">
                                    <div className="text-xs">
                                      <p className="font-bold text-blue-950">
                                        {activeCta.alias} ({activeCta.banco})
                                      </p>
                                      <p className="text-blue-900 text-[11px]">
                                        Titular: <strong>{activeCta.titular || "Cova Tires"}</strong>
                                      </p>
                                      <p className="font-mono text-xs font-bold text-blue-950 mt-0.5">
                                        CLABE: {activeCta.clabe || "012580001394829102"}
                                      </p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (activeCta.clabe) {
                                          navigator.clipboard.writeText(activeCta.clabe);
                                          setCopiedClabe(true);
                                          setTimeout(() => setCopiedClabe(false), 2000);
                                        }
                                      }}
                                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs inline-flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                                    >
                                      {copiedClabe ? <Check size={14} /> : <Copy size={14} />}
                                      {copiedClabe ? "Â¡Copiada!" : "Copiar CLABE"}
                                    </button>
                                  </div>
                                );
                              })()}
                            </div>
                          ) : (
                            <div className="p-3 bg-blue-50 rounded-xl text-xs text-blue-900">
                              No hay cuentas bancarias configuradas.
                            </div>
                          )}

                          <div>
                            <label className="text-[11px] font-bold text-slate-600 block mb-1">
                              Clave de Rastreo SPEI / Comprobante:
                            </label>
                            <input
                              type="text"
                              value={speiRastreo}
                              onChange={(e) => setSpeiRastreo(e.target.value)}
                              placeholder="Ej: BNET0100234891 o Folio Banxico"
                              className="w-full p-2 text-xs border border-slate-300 rounded-lg bg-white font-mono"
                            />
                          </div>
                        </div>
                      )}

                      {/* 4 & 5. BNPL (KUESKI / ATRATO) & 6. STRIPE */}
                      {(selectedMethod === "KueskiPay" ||
                        selectedMethod === "Atrato" ||
                        selectedMethod === "Stripe") && (
                        <div className="flex flex-col gap-3">
                          {bnplCuotas.length > 0 && selectedMethod !== "Stripe" && (
                            <div>
                              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                                Planes de Financiamiento Disponibles:
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                {bnplCuotas.map((c, idx) => (
                                  <div
                                    key={idx}
                                    className="bg-white border border-slate-200 rounded-lg p-2.5 text-center flex flex-col justify-between"
                                  >
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                                      {c.plazo}
                                    </span>
                                    <span className="text-base font-bold text-slate-900 mt-1 tabular-nums">
                                      ${c.monto_cuota.toLocaleString("es-MX")}
                                      <span className="text-[10px] font-normal text-slate-500">
                                        /{selectedMethod === "KueskiPay" ? "quincena" : "mes"}
                                      </span>
                                    </span>
                                    <p className="text-[9px] text-slate-500 mt-1">{c.leyenda}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Generador de QR */}
                          <div className="flex flex-col sm:flex-row items-center gap-4 bg-white border border-slate-200 rounded-xl p-3.5">
                            {qrCodeUrl ? (
                              <div className="shrink-0 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                                <img src={qrCodeUrl} alt="QR Code" className="w-28 h-28 object-contain" />
                              </div>
                            ) : (
                              <div className="w-28 h-28 bg-slate-100 rounded-lg flex items-center justify-center shrink-0 text-slate-400">
                                {generatingQr ? (
                                  <Loader2 size={24} className="animate-spin" />
                                ) : (
                                  <QrCode size={36} />
                                )}
                              </div>
                            )}

                            <div className="flex flex-col gap-1.5 text-xs flex-1">
                              <h4 className="font-bold text-slate-900">
                                {selectedMethod === "KueskiPay"
                                  ? "Kueski Pay: Compra Ahora, Paga DespuÃ©s"
                                  : selectedMethod === "Atrato"
                                  ? "Atrato Pago: CrÃ©dito en Mostrador"
                                  : "Stripe Checkout: Enlace Directo"}
                              </h4>
                              <p className="text-[11px] text-slate-500">
                                El cliente escanea el cÃ³digo QR con su celular o recÃ­belo por WhatsApp.
                              </p>

                              <div className="flex items-center gap-2 mt-1">
                                {!qrCodeUrl ? (
                                  <button
                                    type="button"
                                    onClick={() => handleGenerateQR(selectedMethod as any)}
                                    className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                                  >
                                    <QrCode size={13} /> Generar CÃ³digo QR
                                  </button>
                                ) : (
                                  activeOrder.vehiculos?.clientes?.telefono && (
                                    <a
                                      href={`https://wa.me/52${activeOrder.vehiculos.clientes.telefono.replace(/\D/g, "")}?text=${encodeURIComponent(
                                        `Hola ${activeOrder.vehiculos.clientes.nombre}, aquÃ­ tienes tu link de financiamiento para la Orden #${1000 + Number(activeOrder.folio || 1)} por $${amountToPay.toLocaleString("es-MX")}: ${
                                          selectedMethod === "KueskiPay"
                                            ? "https://pay.kueskipay.com"
                                            : selectedMethod === "Atrato"
                                            ? "https://checkout.atratopago.com"
                                            : "https://checkout.stripe.com"
                                        }`
                                      )}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center gap-1.5"
                                    >
                                      <MessageCircle size={13} /> Enviar QR por WhatsApp
                                    </a>
                                  )
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* BOTÃ“N PRIMARIO ÃšNICO DE ACCIÃ“N */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handleExecutePayment}
                        disabled={isProcessingPayment || (selectedMethod === "Efectivo" && cashShortage > 0.01)}
                        className="w-full py-4 px-6 rounded-xl bg-slate-900 hover:bg-emerald-600 text-white font-extrabold text-sm tracking-wide shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                      >
                        {isProcessingPayment ? (
                          <>
                            <Loader2 size={18} className="animate-spin" /> Registrando Cobro...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={18} />
                            COBRAR ${amountToPay.toLocaleString("es-MX", { minimumFractionDigits: 2 })} E IMPRIMIR TICKET â†’
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3 shadow-xs">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                    <Receipt size={32} />
                  </div>
                  <p className="font-bold text-sm text-slate-800">Ninguna orden seleccionada en la Terminal</p>
                  <p className="text-xs text-slate-500 max-w-sm">
                    Selecciona una orden de la lista izquierda para ingresar cobros en mostrador, calcular cambio o emitir tickets.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "Cobranza" && (
          <div className="flex flex-col gap-6">
            {/* 5 Financial KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Efectivo en Gaveta
                  </span>
                  <Banknote size={18} className="text-emerald-600" />
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-bold text-slate-900 tabular-nums">
                    $
                    {efectivoEnGaveta.toLocaleString("es-MX", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Fondo: ${entradasCajaEfectivo.toLocaleString("es-MX")} â€¢ Gastos: -$
                    {salidasCajaEfectivo.toLocaleString("es-MX")}
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Transferencias SPEI
                  </span>
                  <Landmark size={18} className="text-blue-600" />
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-bold text-slate-900 tabular-nums">
                    $
                    {cobrosTransferencia.toLocaleString("es-MX", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Sin comisiÃ³n bancaria (0%)
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Terminal TPV / Tarjetas
                  </span>
                  <CreditCard size={18} className="text-indigo-600" />
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-bold text-slate-900 tabular-nums">
                    $
                    {cobrosTPV.toLocaleString("es-MX", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                  <p className="text-[11px] text-slate-500 mt-1">
                    ComisiÃ³n: -${comisionesPasarelaTotal.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 border border-purple-200 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">
                    BNPL (Kueski / Atrato)
                  </span>
                  <Coins size={18} className="text-purple-600" />
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-bold text-purple-600 tabular-nums">
                    $
                    {cobrosBNPL.toLocaleString("es-MX", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Financiamiento en quincenas/meses
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 border border-rose-200 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">
                    Cuentas por Cobrar
                  </span>
                  <AlertCircle size={18} className="text-rose-600" />
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-bold text-rose-600 tabular-nums">
                    $
                    {totalPorCobrar.toLocaleString("es-MX", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                  <p className="text-[11px] text-slate-500 mt-1">
                    En {cuentasPorCobrar.length} Ã³rdenes abiertas
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              {/* Cuentas por Cobrar Table */}
              <div className="xl:col-span-7 bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                  <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Cuentas por Cobrar ({cuentasPorCobrar.length})
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-4">Orden / VehÃ­culo</th>
                        <th className="py-3 px-4">Estado</th>
                        <th className="py-3 px-4 text-right">Saldo Pendiente</th>
                        <th className="py-3 px-4 text-right">AcciÃ³n</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {cuentasPorCobrar.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-900 block">
                              #{1000 + Number(c.folio || 1)} â€¢ {c.vehiculos?.marca} {c.vehiculos?.modelo}
                            </span>
                            <span className="text-xs text-slate-500">
                              {c.vehiculos?.placas} â€¢ {c.vehiculos?.clientes?.nombre}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                              {c.estado}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-rose-600 tabular-nums">
                            ${c.saldo.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => {
                                setPosSelectedOrderId(c.id);
                                setActiveTab("POS");
                              }}
                              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-emerald-600 text-white text-xs font-bold transition-colors"
                            >
                              Cargar en POS
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Historial de Pagos con AuditorÃ­a */}
              <div className="xl:col-span-5 bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                  <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Historial de Pagos Registrados ({pagos.length})
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="py-2.5 px-3">Orden / MÃ©todo</th>
                        <th className="py-2.5 px-3 text-right">Monto</th>
                        <th className="py-2.5 px-3 text-right">AuditorÃ­a</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pagos.map((p) => {
                        const isCancelled = Boolean(p.deleted_at);
                        const ord = p.ordenes_servicio;
                        return (
                          <tr key={p.id} className={isCancelled ? "opacity-50 bg-rose-50/20" : ""}>
                            <td className="py-2.5 px-3">
                              <span className="font-bold text-slate-900 block">
                                #{1000 + Number(ord?.folio || 1)} â€¢ {ord?.vehiculos?.marca}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                {p.metodo_detalle || p.proveedor_pago}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold tabular-nums">
                              ${Number(p.monto_total).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              {!isCancelled ? (
                                <button
                                  onClick={() => {
                                    setCancelPago(p);
                                    setMotivoCancelacion("");
                                  }}
                                  className="text-[11px] font-bold text-rose-600 hover:underline"
                                >
                                  Cancelar
                                </button>
                              ) : (
                                <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">
                                  Anulado
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Historial de Turnos y Cortes de Caja (Cierre Z) */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden flex flex-col">
              <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Receipt size={16} className="text-emerald-600" />
                    Historial de Turnos y Cortes de Caja (Cierre Z) ({historialTurnos.length})
                  </h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    AuditorÃ­a inmutable de cierres, arqueos de gaveta, remesas y desviaciones
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {turnoActivo && (
                    <button
                      onClick={() => {
                        setAuditoriaTurnoId(turnoActivo.id);
                        setAuditoriaModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                    >
                      <FileSpreadsheet size={14} />
                      <span>AuditorÃ­a Turno Activo (Excel / PDF)</span>
                    </button>
                  )}
                  <button
                    onClick={() => setProveedorEvidenceOpen(true)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                  >
                    <Plus size={14} className="text-primary" />
                    <span>Evidencia Proveedor</span>
                  </button>
                  {historialTurnos.length > 0 && (
                    <button
                      onClick={handleExportHistorialCSV}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0 shadow-xs cursor-pointer"
                    >
                      <FileSpreadsheet size={14} className="text-emerald-600" />
                      <span>Exportar CSV</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Fecha Apertura / Cierre</th>
                      <th className="py-3 px-4">Fondo 1 (Operativo)</th>
                      <th className="py-3 px-4">Fondo 2 (Reserva)</th>
                      <th className="py-3 px-4 text-center">VariaciÃ³n</th>
                      <th className="py-3 px-4 text-right">Remesa Retirada</th>
                      <th className="py-3 px-4 text-center">Estado</th>
                      <th className="py-3 px-4 text-right">AcciÃ³n</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {historialTurnos.length > 0 ? (
                      historialTurnos.map((t) => {
                        const f1Dec = Number(t.monto_cierre_declarado_f1 ?? t.monto_apertura_fondo1);
                        const dif1 = Number(t.diferencia_f1 || 0);
                        const isCuadrado = Math.abs(dif1) <= 10;
                        const fApertura = new Date(t.fecha_apertura).toLocaleDateString("es-MX", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        });
                        const fCierre = t.fecha_cierre
                          ? new Date(t.fecha_cierre).toLocaleTimeString("es-MX", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : null;

                        return (
                          <tr key={t.id} className="hover:bg-slate-50/50">
                            <td className="py-3 px-4">
                              <span className="font-bold text-slate-900 block">{fApertura}</span>
                              <span className="text-[10px] text-slate-400">
                                {fCierre ? `Cierre: ${fCierre}` : "Turno Abierto"}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-bold tabular-nums block">
                                ${f1Dec.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                Inicial: ${Number(t.monto_apertura_fondo1).toFixed(2)}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-bold tabular-nums block">
                                ${Number(t.monto_cierre_declarado_f2 ?? t.monto_apertura_fondo2).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                Inicial: ${Number(t.monto_apertura_fondo2).toFixed(2)}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span
                                className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  isCuadrado
                                    ? "bg-emerald-100 text-emerald-800"
                                    : dif1 > 0
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-rose-100 text-rose-800"
                                }`}
                              >
                                {isCuadrado
                                  ? "âœ“ Cuadrado"
                                  : dif1 > 0
                                  ? `+${dif1.toFixed(2)}`
                                  : `-${Math.abs(dif1).toFixed(2)}`}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-bold tabular-nums text-slate-900">
                              ${Number(t.monto_remesa_retirada || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                  t.estado === "ABIERTO"
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-slate-100 text-slate-700"
                                }`}
                              >
                                {t.estado}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {t.estado === "CERRADO" && (
                                  <button
                                    onClick={() => {
                                      setCierreTicketData({
                                        turno_id: t.id,
                                        declaradoF1: t.monto_cierre_declarado_f1,
                                        declaradoF2: t.monto_cierre_declarado_f2,
                                        teoricoF1: t.monto_cierre_teorico_f1,
                                        teoricoF2: t.monto_cierre_teorico_f2,
                                        diferenciaF1: t.diferencia_f1,
                                        diferenciaF2: t.diferencia_f2,
                                        remesa: t.monto_remesa_retirada,
                                        fondoSiguiente: t.monto_fondo_siguiente_f1,
                                        resumenTeorico: t.snapshot_resumen,
                                      });
                                      setTicketCierreOpen(true);
                                    }}
                                    className="text-[11px] font-bold text-primary hover:underline inline-flex items-center gap-1"
                                  >
                                    <Printer size={12} />
                                    <span>Imprimir Corte Z (Carta)</span>
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    setAuditoriaTurnoId(t.id);
                                    setAuditoriaModalOpen(true);
                                  }}
                                  className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline inline-flex items-center gap-1 cursor-pointer"
                                  title="AuditorÃ­a y Reporte Excel"
                                >
                                  <FileSpreadsheet size={12} />
                                  <span>Auditar / Excel</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-xs text-slate-400">
                          No hay turnos cerrados en el historial de esta sucursal.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: CAJA CHICA (ENTRADAS / SALIDAS)                    */}
        {/* ========================================================= */}
        {activeTab === "CajaChica" && (
          <div className="flex flex-col gap-6">
            <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Movimientos de Caja Chica y Fondo de Gaveta ({movimientosCaja.length})
                  </h2>
                </div>
                <button
                  onClick={() => setIsCajaModalOpen(true)}
                  className="bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"
                >
                  <Plus size={14} /> Nuevo Movimiento
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Tipo</th>
                      <th className="py-3 px-4">Concepto</th>
                      <th className="py-3 px-4">MÃ©todo</th>
                      <th className="py-3 px-4">Responsable</th>
                      <th className="py-3 px-4 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {movimientosCaja.map((m) => {
                      const isInflow = ["Fondo Inicial", "Ingreso Extra", "ReposiciÃ³n de Fondo", "Traspaso Entrada"].includes(m.tipo);
                      const fObj = fondos.find((f) => f.id === m.caja_fondo_id);
                      return (
                        <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-2.5 px-4 font-bold">
                            <span className={isInflow ? "text-emerald-700 font-semibold" : "text-rose-700 font-semibold"}>
                              {m.tipo}
                            </span>
                            {fObj && (
                              <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded font-mono font-medium ${
                                fObj.tipo === "OPERATIVO" ? "bg-slate-100 text-slate-700" : "bg-purple-50 text-purple-700"
                              }`}>
                                {fObj.tipo === "OPERATIVO" ? "F1 Mostrador" : "F2 Reserva"}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-slate-800 font-medium">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span>{m.concepto}</span>
                              {m.compras_proveedores?.[0]?.evidencia_url && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const cp = m.compras_proveedores[0];
                                    setSelectedTicketEvidence({
                                      evidenciaUrl: cp.evidencia_url,
                                      folio: cp.folio_ticket_nota,
                                      proveedorNombre: cp.proveedores?.nombre_comercial || "Proveedor",
                                      descripcion: m.concepto,
                                      monto: Number(cp.monto_costo || m.monto),
                                      fechaCompra: cp.fecha_compra,
                                      fechaVencimientoGarantia: cp.fecha_vencimiento_garantia,
                                      estatusGarantia: cp.estatus_garantia,
                                    });
                                  }}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 cursor-pointer transition-colors"
                                  title="Ver comprobante de compra / garantÃ­a (Foto / PDF)"
                                >
                                  <FileText size={10} className="text-emerald-600" />
                                  Ticket #{m.compras_proveedores[0].folio_ticket_nota}
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-4 text-slate-500">{m.metodo}</td>
                          <td className="py-2.5 px-4 text-slate-500">{m.responsable}</td>
                          <td className="py-2.5 px-4 text-right font-bold tabular-nums">
                            <span className={isInflow ? "text-emerald-700" : "text-rose-700"}>
                              {isInflow ? "+" : "-"}${Number(m.monto).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: COMISIONES DE TÃ‰CNICOS (NÃ“MINA OPERATIVA)          */}
        {/* ========================================================= */}
        {activeTab === "Comisiones" && (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {resumenMecanicos.map((m) => {
                const isSelected = selectedMecanicoId === m.id;
                return (
                  <div
                    key={m.id}
                    onClick={() => setSelectedMecanicoId(isSelected ? "ALL" : m.id)}
                    className={`cursor-pointer rounded-xl p-4 border transition-all bg-white shadow-xs ${
                      isSelected ? "border-primary ring-2 ring-primary/20" : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-slate-900 text-sm">{m.nombre}</h3>
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        {Number(m.comision_porcentaje || 25)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs mt-3 pt-3 border-t border-slate-100">
                      <span className="text-slate-500">{m.totalHoras.toFixed(1)} hrs facturadas</span>
                      <span className="font-bold text-emerald-600 text-sm">
                        ${m.totalComision.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-200">
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Desglose de Mano de Obra y Comisiones ({filteredDesgloseMecanicos.length})
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-2.5 px-4">TÃ©cnico</th>
                      <th className="py-2.5 px-4">Orden</th>
                      <th className="py-2.5 px-4">Servicio</th>
                      <th className="py-2.5 px-4 text-center">Horas</th>
                      <th className="py-2.5 px-4 text-right">ComisiÃ³n</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredDesgloseMecanicos.map((item) => (
                      <tr key={item.id}>
                        <td className="py-2.5 px-4 font-bold text-slate-900">{item.mecanicoNombre}</td>
                        <td className="py-2.5 px-4 font-mono font-bold text-primary">#{1000 + Number(item.folio || 1)}</td>
                        <td className="py-2.5 px-4 text-slate-700">{item.servicioNombre}</td>
                        <td className="py-2.5 px-4 text-center font-bold text-slate-500">{item.horas}h</td>
                        <td className="py-2.5 px-4 text-right font-bold text-emerald-600 tabular-nums">
                          ${item.comision.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* RECEIPT MODAL */}
      <ReceiptModal
        isOpen={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
        order={receiptOrder}
        payment={receiptPayment}
        payments={receiptPayments}
        empresa={empresa}
        sucursal={sucursalActiva || sucursales[0]}
        cashGiven={receiptCashGiven}
        changeDue={receiptChangeDue}
      />

      {/* CANCEL PAYMENT MODAL */}
      {cancelPago && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl flex flex-col gap-4">
            <h3 className="text-base font-bold text-slate-900">Cancelar Pago Registrado</h3>
            <p className="text-xs text-slate-500">
              Esta acciÃ³n anularÃ¡ el pago de ${Number(cancelPago.monto_total).toLocaleString("es-MX")} y revertirÃ¡ el estatus de la orden. Ingresa el motivo para el registro de auditorÃ­a.
            </p>
            <textarea
              value={motivoCancelacion}
              onChange={(e) => setMotivoCancelacion(e.target.value)}
              placeholder="Ej: Error de digitaciÃ³n, pago duplicado en terminal, cheque devuelto..."
              className="w-full border border-slate-200 rounded-lg p-2.5 text-xs h-24 focus:outline-none focus:border-rose-600"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCancelPago(null)}
                className="px-4 py-2 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={handleConfirmarCancelacion}
                disabled={savingCancel || !motivoCancelacion.trim()}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50"
              >
                {savingCancel ? "Anulando..." : "Confirmar AnulaciÃ³n"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CAJA CHICA MODAL */}
      {isCajaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl flex flex-col gap-4">
            <h3 className="text-base font-bold text-slate-900">Registrar Movimiento de Caja Chica</h3>
            <div className="flex flex-col gap-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Tipo de Movimiento:</label>
                <select
                  value={movForm.tipo}
                  onChange={(e) => setMovForm({ ...movForm, tipo: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg bg-white font-medium"
                >
                  <optgroup label="Salidas / Egresos de Efectivo">
                    <option value="Gasto / Insumos">Gasto / Insumos de Taller (Salida)</option>
                    <option value="Pago Proveedor">Pago a Repartidor / Proveedor (Salida)</option>
                    <option value="Retiro Administrativo">Retiro Administrativo / DepÃ³sito Bancario (Salida)</option>
                  </optgroup>
                  <optgroup label="Entradas / Inyecciones de Efectivo">
                    <option value="ReposiciÃ³n de Fondo">ReposiciÃ³n de Fondo (Entrada Externa / Admin)</option>
                    <option value="Fondo Inicial">Fondo Inicial de Caja (Entrada)</option>
                    <option value="Ingreso Extra">Ingreso Extra (Entrada)</option>
                  </optgroup>
                </select>
              </div>

              {fondos.length > 0 && (
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Fondo / Gaveta Afectada:</label>
                  <select
                    value={movForm.cajaFondoId || (fondos.find(f => f.tipo === "OPERATIVO") || fondos[0])?.id || ""}
                    onChange={(e) => setMovForm({ ...movForm, cajaFondoId: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg bg-white font-medium"
                  >
                    {fondos.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.nombre} ({f.tipo === "OPERATIVO" ? "F1 Mostrador" : "F2 Reserva"}) - Saldo: ${Number(f.saldo_actual).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="font-bold text-slate-700 block mb-1">Concepto:</label>
                <input
                  type="text"
                  value={movForm.concepto}
                  onChange={(e) => setMovForm({ ...movForm, concepto: e.target.value })}
                  placeholder="Ej: Compra de carbuclean, pago a mototaxi refacciones..."
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Monto ($ MXN):</label>
                <input
                  type="number"
                  step="0.01"
                  value={movForm.monto}
                  onChange={(e) => setMovForm({ ...movForm, monto: e.target.value })}
                  placeholder="0.00"
                  className="w-full p-2 border border-slate-200 rounded-lg font-bold"
                />
              </div>

              {movForm.tipo === "Pago Proveedor" && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block">
                    Respaldo de GarantÃ­a y Proveedor
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-semibold text-slate-600 block mb-0.5">Proveedor</label>
                      <select
                        value={movForm.proveedorId || ""}
                        onChange={(e) => setMovForm({ ...movForm, proveedorId: e.target.value })}
                        className="w-full p-1.5 text-xs border border-slate-300 rounded bg-white"
                      >
                        <option value="">Selecciona proveedor...</option>
                        {proveedoresList.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nombre_comercial}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-slate-600 block mb-0.5">Folio Ticket / Nota</label>
                      <input
                        type="text"
                        placeholder="Ej. #49201"
                        value={movForm.folioTicket || ""}
                        onChange={(e) => setMovForm({ ...movForm, folioTicket: e.target.value })}
                        className="w-full p-1.5 text-xs border border-slate-300 rounded bg-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-semibold text-slate-600 block mb-0.5">Plazo de GarantÃ­a</label>
                      <select
                        value={movForm.mesesGarantia || 1}
                        onChange={(e) => setMovForm({ ...movForm, mesesGarantia: parseInt(e.target.value) || 1 })}
                        className="w-full p-1.5 text-xs border border-slate-300 rounded bg-white"
                      >
                        <option value={1}>1 mes (30 dÃ­as)</option>
                        <option value={3}>3 meses</option>
                        <option value={6}>6 meses</option>
                        <option value={12}>12 meses (1 aÃ±o)</option>
                        <option value={24}>24 meses (2 aÃ±os)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-slate-600 block mb-0.5">
                        Comprobante (Foto / PDF)
                      </label>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(e) => {
                          const f = e.target.files?.[0] || null;
                          setMovForm({ ...movForm, comprobanteFile: f });
                        }}
                        className="w-full text-[10px] text-slate-600 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-slate-200 file:text-slate-700 hover:file:bg-slate-300 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={() => setIsCajaModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveMovimiento}
                disabled={savingMov || !movForm.concepto.trim() || !movForm.monto}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white disabled:opacity-50"
              >
                {savingMov ? "Guardando..." : "Guardar Movimiento"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Visor Lightbox de Ticket / Factura PDF */}
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
      {/* Modal: Apertura de Turno */}
      <AbrirTurnoModal
        isOpen={isAbrirTurnoOpen}
        onClose={() => setIsAbrirTurnoOpen(false)}
        onSuccess={loadData}
        empresaId={empresa?.id || "a0000000-0000-0000-0000-000000000001"}
        sucursalId={sucursalActiva?.id || sucursales[0]?.id || "b0000000-0000-0000-0000-000000000001"}
        usuarioId={perfil?.id || ""}
        fondos={fondos}
      />

      {/* Modal: Traspaso de Fondos */}
      {turnoActivo && (
        <TraspasoFondosModal
          isOpen={isTraspasoOpen}
          onClose={() => setIsTraspasoOpen(false)}
          onSuccess={loadData}
          turnoActivo={turnoActivo}
          fondos={fondos}
          usuarioId={perfil?.id || ""}
        />
      )}

      {/* Modal: Corte Ciego de Turno (Cierre Z) */}
      {turnoActivo && (
        <CorteCiegoModal
          isOpen={isCorteOpen}
          onClose={() => setIsCorteOpen(false)}
          onSuccess={(cierreResult) => {
            setCierreTicketData(cierreResult);
            setTicketCierreOpen(true);
            loadData();
          }}
          turnoActivo={turnoActivo}
          fondos={fondos}
          cuentasBancarias={cuentasBancarias}
          usuarioId={perfil?.id || ""}
        />
      )}

      {/* Modal: Ticket TÃ©rmico de Cierre Z */}
      <TicketCierreModal
        isOpen={ticketCierreOpen}
        onClose={() => setTicketCierreOpen(false)}
        cierreData={cierreTicketData}
        empresa={empresa}
        sucursal={sucursalActiva}
        empresaNombre={empresa?.nombre_comercial || "Cova"}
        sucursalNombre={sucursalActiva?.nombre || "Cova"}
        cajeroNombre={perfil?.nombre || "Cajero en Turno"}
      />

      {/* Modal: AuditorÃ­a y Corte Diario (Excel 3 Hojas, PDF, Comisiones y Bancos) */}
      <CorteDiarioAuditoriaModal
        isOpen={auditoriaModalOpen}
        onClose={() => setAuditoriaModalOpen(false)}
        turnoId={auditoriaTurnoId || turnoActivo?.id || ""}
        nombreTaller={empresa?.nombre_comercial || "Cova"}
        onTurnoAuditado={() => {
          loadData();
        }}
      />

      {/* Modal: Registro de RefacciÃ³n / Compra y Evidencia de Proveedor */}
      <ProveedorEvidenceModal
        isOpen={proveedorEvidenceOpen}
        onClose={() => setProveedorEvidenceOpen(false)}
        empresaId={empresa?.id || "b2ad09db-0a34-4876-9ca3-d584c40bd294"}
        sucursalId={sucursalActiva?.id || "b2ad09db-0a34-4876-9ca3-d584c40bd295"}
        cajaTurnoId={turnoActivo?.id}
        onCompraRegistrada={() => {
          loadData();
        }}
      />
    </div>
  );
}
