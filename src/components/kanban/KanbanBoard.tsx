"use client";

import React, { useState, useEffect, useMemo, useCallback, useDeferredValue } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanCard, Order, OrderPriority } from "./KanbanCard";
import {
  Search,
  Plus,
  LayoutGrid,
  List,
  Wrench,
  Banknote,
  Building2,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/context/TenantContext";
import { localDB } from "@/lib/offline/db";
import { offlineSyncService } from "@/services/offlineSyncService";
import dynamic from "next/dynamic";
import { Modal } from "../ui/Modal";
import { ErrorBoundary } from "../common/ErrorBoundary";

const OrderForm = dynamic(
  () => import("./OrderForm").then((mod) => mod.OrderForm),
  {
    loading: () => (
      <div className="p-8 flex items-center justify-center gap-2 text-slate-500">
        <Loader2 className="animate-spin text-blue-600" size={20} />
        <span className="text-xs font-medium">Cargando formulario...</span>
      </div>
    ),
    ssr: false,
  }
);

const OrderDetailsModal = dynamic(
  () => import("./OrderDetailsModal").then((mod) => mod.OrderDetailsModal),
  {
    loading: () => (
      <div className="p-12 flex flex-col items-center justify-center gap-3 text-slate-600 min-h-[400px]">
        <Loader2 className="animate-spin text-blue-600" size={32} />
        <span className="text-sm font-semibold text-slate-800">Cargando workspace de la orden...</span>
        <span className="text-xs text-slate-400">Optimizando módulos y rentabilidad en tiempo real</span>
      </div>
    ),
    ssr: false,
  }
);

const defaultColumns = [
  { id: "Citas del Día", title: "Citas del Día", color: "#64748B" },
  { id: "En Inspección", title: "En Inspección (DVI)", color: "#D97706" },
  { id: "En Rampa", title: "En Rampa (Trabajando)", color: "#2563EB" },
  { id: "Listo para Entrega", title: "Listo para Entrega", color: "#059669" },
];

function SkeletonCard() {
  return (
    <div className="panel-card p-3 flex flex-col gap-2 relative animate-pulse bg-white">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-1.5 flex-1">
          <div className="w-2 h-2 rounded-full bg-slate-200" />
          <div className="h-3.5 bg-slate-200 rounded w-16" />
        </div>
        <div className="h-4 bg-slate-200 rounded w-14" />
      </div>
      <div className="h-4 bg-slate-200 rounded w-36 mt-1" />
      <div className="flex justify-between items-end mt-2 pt-2 border-t border-slate-100">
        <div className="h-3.5 bg-slate-200 rounded w-20" />
        <div className="h-4 bg-slate-200 rounded w-16" />
      </div>
    </div>
  );
}

export function KanbanBoard() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { empresa, sucursalActiva, sucursales } = useTenant();

  const [columns] = useState(defaultColumns);
  const [orders, setOrders] = useState<Order[]>([]);
  const [mechanics, setMechanics] = useState<any[]>([]);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [initialColumn, setInitialColumn] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters & View Mode
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [selectedMechanicFilter, setSelectedMechanicFilter] = useState<string>("ALL");
  const [selectedPaymentFilter, setSelectedPaymentFilter] = useState<string>("ALL");
  const [selectedEtapaFilter, setSelectedEtapaFilter] = useState<string>("ACTIVAS");

  // Modals & Deep-link state
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [initialClientId, setInitialClientId] = useState<string | null>(null);
  const [initialVehicleId, setInitialVehicleId] = useState<string | null>(null);
  const [initialDiferidoId, setInitialDiferidoId] = useState<string | null>(null);

  // Handle URL deep-linking (?ordenId=... or ?nuevaOrden=1&clienteId=...&vehiculoId=...&diferidoId=...)
  useEffect(() => {
    const ordenIdParam = searchParams.get("ordenId");
    const nuevaOrdenParam = searchParams.get("nuevaOrden");
    const clienteIdParam = searchParams.get("clienteId");
    const vehiculoIdParam = searchParams.get("vehiculoId");
    const diferidoIdParam = searchParams.get("diferidoId");

    if (ordenIdParam) {
      setSelectedOrderId(ordenIdParam);
    }
    if (nuevaOrdenParam === "1" || nuevaOrdenParam === "true") {
      setInitialClientId(clienteIdParam);
      setInitialVehicleId(vehiculoIdParam);
      setInitialDiferidoId(diferidoIdParam);
      setIsOrderModalOpen(true);
    }
  }, [searchParams]);

  const fetchOrders = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    const [{ data, error }, { data: empData }] = await Promise.all([
      supabase
        .from("ordenes_servicio")
        .select(
          `
          id,
          folio,
          estado,
          sub_estado,
          sucursal_id,
          prioridad,
          estatus_pago,
          fecha_ingreso,
          notas_recepcion,
          problema_reportado,
          bahia_rampa,
          mecanico_id,
          aprobado_cliente_nombre,
          checklist_recepcion,
          vehiculos (
            id,
            marca,
            modelo,
            anio,
            placas,
            clientes (
              id,
              nombre,
              telefono
            )
          ),
          orden_servicio_servicios (
            precio_cobrado,
            cantidad,
            estatus_aprobacion,
            servicios_taller (
              nombre
            )
          ),
          orden_servicio_refacciones (
            nombre,
            subtotal,
            estatus_aprobacion
          ),
          cotizaciones (
            detalles_cotizacion (
              subtotal,
              estatus_aprobacion
            )
          ),
          inspecciones_dvi (
            severidad
          ),
          pagos_orden (
            monto_total,
            estatus,
            deleted_at
          )
        `
        )
        .eq("empresa_id", empresa?.id || "b2ad09db-0a34-4876-9ca3-d584c40bd294")
        .order("folio", { ascending: false })
        .limit(100),
      supabase.from("empleados").select("id, nombre, color_avatar, rol").eq("empresa_id", empresa?.id || "b2ad09db-0a34-4876-9ca3-d584c40bd294").eq("activo", true),
    ]);

    if (empData) {
      setMechanics(empData.filter((e: any) => e.rol === "Mecánico"));
    }

    if (error) {
      console.warn("Error consultando órdenes en red, recurriendo a caché local offline:", error);
      try {
        const cached = await localDB.ordenes_activas.toArray();
        if (cached && cached.length > 0) {
          const fallbackOrders: Order[] = cached.map((c) => ({
            id: c.id,
            folio: c.folio || "OFFLINE",
            columnId: c.estado,
            subEstado: "Activa",
            sucursalId: c.sucursal_id || null,
            sucursalCodigo: null,
            vehicleId: c.vehiculo_id || "",
            customerId: c.cliente_id || "",
            carModel: c.vehiculo_resumen || "Vehículo en Taller",
            carYear: null,
            plates: c.placas || "S/P",
            customerName: c.cliente_nombre || "Cliente Mostrador",
            customerPhone: c.cliente_telefono || null,
            priority: "normal",
            services: c.items_resumen ? [c.items_resumen] : ["Servicio en Taller"],
            createdAt: new Date(c.updated_at).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }),
            fechaIngresoRaw: c.updated_at,
            mechanicId: null,
            mechanicName: null,
            mechanicColor: null,
            bahiaRampa: null,
            estatusPago: c.saldo_pendiente === 0 ? "Pagado" : "Pendiente",
            totalAmount: c.total,
            paidAmount: c.pagado,
            aprobadoClienteNombre: null,
            isExpress: false,
            dviCounts: { rojo: 0, amarillo: 0, verde: 0 },
          }));
          setOrders(fallbackOrders);
          toast.info("Modo contingencia: Mostrando órdenes guardadas en esta terminal", { duration: 3500 });
        }
      } catch (cacheErr) {
        console.error("Error leyendo caché local:", cacheErr);
      }
    } else if (data) {
      const empMap = new Map((empData || []).map((e: any) => [e.id, e]));
      const sucMap = new Map((sucursales || []).map((s) => [s.id, s]));

      const formattedOrders: Order[] = data.map((d: any) => {
        const mech = d.mecanico_id ? empMap.get(d.mecanico_id) : null;
        const suc = d.sucursal_id ? sucMap.get(d.sucursal_id) : null;

        const srvs = (d.orden_servicio_servicios || []).filter(
          (s: any) => s.estatus_aprobacion !== "Diferido"
        );
        const parts = (d.orden_servicio_refacciones || []).filter(
          (r: any) => r.estatus_aprobacion !== "Diferido"
        );
        const tires = (d.cotizaciones?.detalles_cotizacion || []).filter(
          (t: any) => t.estatus_aprobacion !== "Diferido"
        );

        const totalServicios = srvs.reduce(
          (acc: number, s: any) => acc + Number(s.precio_cobrado || 0) * Number(s.cantidad || 1),
          0
        );
        const totalParts = parts.reduce((acc: number, r: any) => acc + Number(r.subtotal || 0), 0);
        const totalTires = tires.reduce((acc: number, t: any) => acc + Number(t.subtotal || 0), 0);
        const totalAmount = totalServicios + totalParts + totalTires;

        const paidAmount = (d.pagos_orden || [])
          .filter((p: any) => (p.estatus === "Aprobado" || p.estatus === "COMPLETADO") && !p.deleted_at)
          .reduce((acc: number, p: any) => acc + Number(p.monto_total || 0), 0);

        const serviceLabels: string[] = [
          ...srvs.map((s: any) => s.servicios_taller?.nombre).filter(Boolean),
          ...parts.map((r: any) => r.nombre).filter(Boolean),
        ];
        if (serviceLabels.length === 0 && (d.problema_reportado || d.notas_recepcion)) {
          serviceLabels.push(d.problema_reportado || d.notas_recepcion);
        }

        const dviList = d.inspecciones_dvi || [];
        const dviCounts = {
          rojo: dviList.filter((i: any) => i.severidad === "rojo").length,
          amarillo: dviList.filter((i: any) => i.severidad === "amarillo").length,
          verde: dviList.filter((i: any) => i.severidad === "verde").length,
        };

        return {
          id: d.id,
          folio: d.folio || 1,
          columnId: d.estado,
          subEstado: d.sub_estado,
          sucursalId: d.sucursal_id,
          sucursalCodigo: suc?.codigo || null,
          vehicleId: d.vehiculos?.id || "",
          customerId: d.vehiculos?.clientes?.id || "",
          carModel: `${d.vehiculos?.marca || ""} ${d.vehiculos?.modelo || ""}`.trim(),
          carYear: d.vehiculos?.anio || null,
          plates: d.vehiculos?.placas || "S/P",
          customerName: d.vehiculos?.clientes?.nombre || "Cliente",
          customerPhone: d.vehiculos?.clientes?.telefono || null,
          priority: (d.prioridad as OrderPriority) || "normal",
          services: serviceLabels,
          createdAt: d.fecha_ingreso
            ? new Date(d.fecha_ingreso).toLocaleTimeString("es-MX", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "",
          fechaIngresoRaw: d.fecha_ingreso,
          mechanicId: d.mecanico_id,
          mechanicName: mech?.nombre || null,
          mechanicColor: mech?.color_avatar || null,
          bahiaRampa: d.bahia_rampa || null,
          estatusPago: d.estatus_pago || "Pendiente",
          totalAmount,
          paidAmount,
          aprobadoClienteNombre: d.aprobado_cliente_nombre || null,
          isExpress: d.checklist_recepcion?.tipo_recepcion === "express" || d.checklist_recepcion?.dvi_omitido === true,
          dviCounts,
        };
      });
      setOrders(formattedOrders);
    }
    setLoading(false);
  }, [empresa?.id, sucursales]);

  useEffect(() => {
    fetchOrders(true);
  }, [fetchOrders]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const order = orders.find((o) => o.id === active.id);
    if (order) {
      setActiveOrder(order);
      setInitialColumn(order.columnId);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const isActiveTask = active.data.current?.type === "Order";
    const isOverTask = over.data.current?.type === "Order";
    const isOverColumn = over.data.current?.type === "Column";

    if (!isActiveTask) return;

    if (isActiveTask && isOverTask) {
      setOrders((orders) => {
        const activeIndex = orders.findIndex((t) => t.id === activeId);
        const overIndex = orders.findIndex((t) => t.id === overId);

        if (orders[activeIndex].columnId !== orders[overIndex].columnId) {
          const newOrders = [...orders];
          newOrders[activeIndex].columnId = orders[overIndex].columnId;
          return arrayMove(newOrders, activeIndex, overIndex);
        }
        return arrayMove(orders, activeIndex, overIndex);
      });
    }

    if (isActiveTask && isOverColumn) {
      setOrders((orders) => {
        const activeIndex = orders.findIndex((t) => t.id === activeId);
        const newOrders = [...orders];
        newOrders[activeIndex].columnId = overId as string;
        return arrayMove(newOrders, activeIndex, activeIndex);
      });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveOrder(null);
    const { active } = event;
    const order = orders.find((o) => o.id === active.id);

    if (order && initialColumn !== null && order.columnId !== initialColumn) {
      const isOffline = typeof navigator !== "undefined" && !navigator.onLine;

      if (isOffline) {
        await offlineSyncService.enqueueMutation({
          empresa_id: empresa?.id || "b2ad09db-0a34-4876-9ca3-d584c40bd294",
          sucursal_id: order.sucursalId || sucursalActiva?.id,
          mutation_type: "ACTUALIZAR_ESTADO_ORDEN",
          entity_id: order.id,
          payload: { orden_id: order.id, nuevo_estado: order.columnId },
        });
        await localDB.ordenes_activas.update(order.id, { estado: order.columnId }).catch(() => {});
        toast.info("Estado actualizado en contingencia local");
      } else {
        try {
          const { error } = await supabase
            .from("ordenes_servicio")
            .update({ estado: order.columnId })
            .eq("id", order.id);

          if (error) {
            console.warn("Fallo en red al mover orden, encolando en Outbox:", error);
            await offlineSyncService.enqueueMutation({
              empresa_id: empresa?.id || "b2ad09db-0a34-4876-9ca3-d584c40bd294",
              sucursal_id: order.sucursalId || sucursalActiva?.id,
              mutation_type: "ACTUALIZAR_ESTADO_ORDEN",
              entity_id: order.id,
              payload: { orden_id: order.id, nuevo_estado: order.columnId },
            });
          }
        } catch {
          await offlineSyncService.enqueueMutation({
            empresa_id: empresa?.id || "b2ad09db-0a34-4876-9ca3-d584c40bd294",
            sucursal_id: order.sucursalId || sucursalActiva?.id,
            mutation_type: "ACTUALIZAR_ESTADO_ORDEN",
            entity_id: order.id,
            payload: { orden_id: order.id, nuevo_estado: order.columnId },
          });
        }
      }
    }
    setInitialColumn(null);
  };

  const handleInlineStageChange = async (orderId: string, newStage: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, columnId: newStage } : o))
    );
    const isOffline = typeof navigator !== "undefined" && !navigator.onLine;

    if (isOffline) {
      await offlineSyncService.enqueueMutation({
        empresa_id: empresa?.id || "b2ad09db-0a34-4876-9ca3-d584c40bd294",
        sucursal_id: sucursalActiva?.id,
        mutation_type: "ACTUALIZAR_ESTADO_ORDEN",
        entity_id: orderId,
        payload: { orden_id: orderId, nuevo_estado: newStage },
      });
      await localDB.ordenes_activas.update(orderId, { estado: newStage }).catch(() => {});
    } else {
      const { error } = await supabase.from("ordenes_servicio").update({ estado: newStage }).eq("id", orderId);
      if (error) {
        await offlineSyncService.enqueueMutation({
          empresa_id: empresa?.id || "b2ad09db-0a34-4876-9ca3-d584c40bd294",
          sucursal_id: sucursalActiva?.id,
          mutation_type: "ACTUALIZAR_ESTADO_ORDEN",
          entity_id: orderId,
          payload: { orden_id: orderId, nuevo_estado: newStage },
        });
      }
    }

    if (newStage === "Entregado") {
      toast.success("Vehículo marcado como entregado. La orden sale del tablero.");
    }
  };

  const handleCardClick = useCallback((id: string) => {
    setSelectedOrderId(id);
  }, []);

  const handleDeliverOrder = useCallback(async (orderId: string) => {
    try {
      const isOffline = typeof navigator !== "undefined" && !navigator.onLine;

      if (isOffline) {
        await offlineSyncService.enqueueMutation({
          empresa_id: empresa?.id || "b2ad09db-0a34-4876-9ca3-d584c40bd294",
          sucursal_id: sucursalActiva?.id,
          mutation_type: "ACTUALIZAR_ESTADO_ORDEN",
          entity_id: orderId,
          payload: { orden_id: orderId, nuevo_estado: "Entregado" },
        });
        await localDB.ordenes_activas.update(orderId, { estado: "Entregado" }).catch(() => {});
      } else {
        const { error } = await supabase
          .from("ordenes_servicio")
          .update({ estado: "Entregado", sub_estado: "Entregado" })
          .eq("id", orderId);

        if (error) {
          await offlineSyncService.enqueueMutation({
            empresa_id: empresa?.id || "b2ad09db-0a34-4876-9ca3-d584c40bd294",
            sucursal_id: sucursalActiva?.id,
            mutation_type: "ACTUALIZAR_ESTADO_ORDEN",
            entity_id: orderId,
            payload: { orden_id: orderId, nuevo_estado: "Entregado" },
          });
        }
      }

      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId ? { ...o, columnId: "Entregado", subEstado: "Entregado" } : o
        )
      );
      toast.success("Vehículo entregado al cliente con éxito. Orden archivada del tablero.");
    } catch (err) {
      console.error("Error entregando vehículo:", err);
      toast.error("Error al procesar la entrega");
    }
  }, [empresa?.id, sucursalActiva?.id]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Branch filter from TenantContext
      if (sucursalActiva && order.sucursalId && order.sucursalId !== sucursalActiva.id) {
        return false;
      }
      // Mechanic filter
      if (selectedMechanicFilter !== "ALL") {
        if (selectedMechanicFilter === "UNASSIGNED" && order.mechanicId) return false;
        if (selectedMechanicFilter !== "UNASSIGNED" && order.mechanicId !== selectedMechanicFilter)
          return false;
      }
      // Payment status filter
      if (selectedPaymentFilter !== "ALL" && order.estatusPago !== selectedPaymentFilter) {
        return false;
      }
      // Lifecycle Stage filter (unless user is searching explicitly by text)
      if (!deferredSearchQuery.trim()) {
        if (selectedEtapaFilter === "ACTIVAS" && order.columnId === "Entregado") {
          return false;
        }
        if (selectedEtapaFilter === "Entregado" && order.columnId !== "Entregado") {
          return false;
        }
      }
      // Search query
      if (deferredSearchQuery.trim()) {
        const query = deferredSearchQuery.toLowerCase();
        const folioStr = `#${1000 + Number(order.folio || 1)}`.toLowerCase();
        const matchFolio = folioStr.includes(query);
        const matchName = order.customerName.toLowerCase().includes(query);
        const matchCar = order.carModel.toLowerCase().includes(query);
        const matchPlates = order.plates.toLowerCase().includes(query);
        const matchBay = (order.bahiaRampa || "").toLowerCase().includes(query);
        return matchFolio || matchName || matchCar || matchPlates || matchBay;
      }
      return true;
    });
  }, [
    orders,
    sucursalActiva,
    selectedMechanicFilter,
    selectedPaymentFilter,
    selectedEtapaFilter,
    deferredSearchQuery,
  ]);

  const ordersByColumn = useMemo(() => {
    const map: Record<string, Order[]> = {};
    columns.forEach((c) => {
      map[c.id] = [];
    });
    filteredOrders.forEach((o) => {
      if (map[o.columnId]) {
        map[o.columnId].push(o);
      }
    });
    return map;
  }, [columns, filteredOrders]);

  const totalValorEnPiso = useMemo(
    () => filteredOrders.reduce((acc, o) => acc + (o.totalAmount || 0), 0),
    [filteredOrders]
  );
  const enRampaCount = useMemo(
    () => filteredOrders.filter((o) => o.columnId === "En Rampa").length,
    [filteredOrders]
  );
  const listoEntregaCount = useMemo(
    () => filteredOrders.filter((o) => o.columnId === "Listo para Entrega").length,
    [filteredOrders]
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header & Top Operational Strip */}
      <div className="mb-3 space-y-3">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Tablero de Operaciones
              </h1>
              {sucursales && sucursales.length > 1 && (
                sucursalActiva ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold">
                    <Building2 size={11} /> {sucursalActiva.nombre} ({sucursalActiva.codigo})
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-semibold">
                    Vista Consolidada Multi-Sucursal
                  </span>
                )
              )}
            </div>
            
          </div>

          {/* KPI Pills + New Order Button */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="hidden xl:flex items-center gap-3 bg-white border border-slate-200 rounded-md px-3 py-1.5 text-xs mr-1">
              <div>
                <span className="text-slate-400 font-medium">Activas: </span>
                <strong className="text-slate-900 tabular-nums">{filteredOrders.length}</strong>
              </div>
              <span className="text-slate-200">|</span>
              <div>
                <span className="text-slate-400 font-medium">En Rampa: </span>
                <strong className="text-blue-600 tabular-nums">{enRampaCount}</strong>
              </div>
              <span className="text-slate-200">|</span>
              <div>
                <span className="text-slate-400 font-medium">Valor en Piso: </span>
                <strong className="text-slate-900 font-mono tabular-nums">
                  ${totalValorEnPiso.toLocaleString("es-MX", { maximumFractionDigits: 0 })}
                </strong>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setInitialClientId(null);
                setInitialVehicleId(null);
                setInitialDiferidoId(null);
                setIsOrderModalOpen(true);
              }}
              className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-xs font-bold transition-colors shadow-xs cursor-pointer"
            >
              <Plus size={15} strokeWidth={2.5} />
              Nueva Orden de Servicio
            </button>
          </div>
        </div>

        {/* Dense Filter Bar + View Toggle */}
        <div className="flex flex-col sm:flex-row flex-wrap sm:items-center justify-between gap-2 bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            {/* Search */}
            <div className="relative w-full sm:w-64">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                <Search size={13} className="text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Buscar auto, placa, cliente o folio..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-8 pr-3 h-8 border border-slate-300 rounded-md bg-slate-50/60 text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 text-xs transition-all"
              />
            </div>

            {/* Mechanic Filter */}
            <div className="flex items-center gap-1.5">
              <Wrench size={13} className="text-slate-400 hidden sm:block" />
              <select
                value={selectedMechanicFilter}
                onChange={(e) => setSelectedMechanicFilter(e.target.value)}
                className="h-8 text-xs font-medium bg-white border border-slate-300 rounded-md px-2.5 text-slate-700 focus:outline-none focus:border-blue-600"
              >
                <option value="ALL">Técnicos: Todos</option>
                <option value="UNASSIGNED">Sin Técnico Asignado</option>
                {mechanics.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Payment Filter */}
            <div className="flex items-center gap-1.5">
              <Banknote size={13} className="text-slate-400 hidden sm:block" />
              <select
                value={selectedPaymentFilter}
                onChange={(e) => setSelectedPaymentFilter(e.target.value)}
                className="h-8 text-xs font-medium bg-white border border-slate-300 rounded-md px-2.5 text-slate-700 focus:outline-none focus:border-blue-600"
              >
                <option value="ALL">Cobranza: Todos</option>
                <option value="Pendiente">Pago Pendiente</option>
                <option value="Parcial">Pago Parcial</option>
                <option value="Pagado">Pagado</option>
              </select>
            </div>

            {/* Lifecycle Stage Filter */}
            <div className="flex items-center gap-1.5">
              <select
                value={selectedEtapaFilter}
                onChange={(e) => setSelectedEtapaFilter(e.target.value)}
                className="h-8 text-xs font-bold bg-white border border-slate-300 rounded-md px-2.5 text-slate-700 focus:outline-none focus:border-blue-600"
              >
                <option value="ACTIVAS">En Taller (Activas)</option>
                <option value="ALL">Todas (Incluye Entregadas)</option>
                <option value="Entregado">Histórico: Entregadas</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => fetchOrders(true)}
              title="Actualizar tablero"
              className="h-8 px-2.5 rounded-md border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <RefreshCw size={13} />
            </button>
          </div>

          {/* View Mode Toggle: Kanban vs Lista Compacta */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-md border border-slate-200 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setViewMode("kanban")}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                viewMode === "kanban"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <LayoutGrid size={13} />
              Kanban
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                viewMode === "list"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <List size={13} />
              Lista Compacta
            </button>
          </div>
        </div>
      </div>

      {/* Main Content: Kanban View vs Compact List Table View */}
      {viewMode === "kanban" ? (
        <div className="flex-1 w-full pb-2">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="flex md:grid md:grid-cols-2 lg:grid-cols-4 gap-3.5 w-full h-full overflow-x-auto snap-x snap-mandatory pb-2 dense-scrollbar">
              {columns.map((col) => (
                <div
                  key={col.id}
                  className="h-full flex flex-col relative min-w-[85vw] sm:min-w-[45vw] md:min-w-0 snap-center md:snap-align-none"
                >
                  {loading && (
                    <div className="absolute top-11 left-0 right-0 bottom-0 z-20 flex flex-col gap-2.5 p-2.5 overflow-hidden bg-slate-100/80">
                      <SkeletonCard />
                      <SkeletonCard />
                      <SkeletonCard />
                    </div>
                  )}
                  <KanbanColumn
                    id={col.id}
                    title={col.title}
                    accentColor={col.color}
                    orders={ordersByColumn[col.id] || []}
                    onCardClick={handleCardClick}
                    onDeliverOrder={handleDeliverOrder}
                  />
                </div>
              ))}
            </div>

            <DragOverlay>
              {activeOrder ? <KanbanCard order={activeOrder} /> : null}
            </DragOverlay>
          </DndContext>
        </div>
      ) : (
        /* LISTA COMPACTA (SHOPMONKEY TABLE VIEW) */
        <div className="flex-1 bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden flex flex-col">
          <div className="overflow-x-auto flex-1 dense-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-2.5 px-3">Folio</th>
                  <th className="py-2.5 px-3">Vehículo / Placas</th>
                  <th className="py-2.5 px-3">Cliente</th>
                  <th className="py-2.5 px-3">Bahía / Rampa</th>
                  <th className="py-2.5 px-3">Técnico</th>
                  <th className="py-2.5 px-3">Etapa Operativa</th>
                  <th className="py-2.5 px-3 text-center">DVI</th>
                  <th className="py-2.5 px-3 text-center">Cobranza</th>
                  <th className="py-2.5 px-3 text-right">Total MXN</th>
                  <th className="py-2.5 px-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {filteredOrders.map((o) => {
                  const folioStr = `#${1000 + Number(o.folio || 1)}`;
                  const totalDvi =
                    o.dviCounts.rojo + o.dviCounts.amarillo + o.dviCounts.verde;
                  return (
                    <tr
                      key={o.id}
                      onClick={() => setSelectedOrderId(o.id)}
                      className="hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <td className="py-2.5 px-3 font-mono font-black text-slate-900 tabular-nums">
                        {folioStr}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900">
                          {o.carModel} {o.carYear ? `(${o.carYear})` : ""}
                        </div>
                        <span className="font-mono text-[10px] uppercase bg-slate-100 text-slate-700 border border-slate-300 px-1.5 py-0.2 rounded">
                          {o.plates}
                        </span>
                      </td>
                      <td className="py-2.5 px-3" onClick={(e) => e.stopPropagation()}>
                        <Link
                          href={`/clientes/${o.customerId}?vehiculoId=${o.vehicleId}`}
                          className="font-semibold text-slate-800 hover:text-blue-600 hover:underline inline-flex items-center gap-1"
                        >
                          {o.customerName}
                          <ExternalLink size={11} className="text-slate-400" />
                        </Link>
                        {o.customerPhone && (
                          <div className="text-[10px] text-slate-400 tabular-nums">
                            {o.customerPhone}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 font-medium">
                        {o.bahiaRampa || "—"}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 font-medium">
                        {o.mechanicName || (
                          <span className="text-slate-400 italic">Sin asignar</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={o.columnId}
                          onChange={(e) => handleInlineStageChange(o.id, e.target.value)}
                          className="h-7 text-[11px] font-bold bg-slate-100 border border-slate-300 rounded px-2 text-slate-800"
                        >
                          {columns.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.title}
                            </option>
                          ))}
                          <option value="Entregado">5. Entregado (Archivar)</option>
                        </select>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {totalDvi > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-[10px] font-bold tabular-nums">
                            <span className="text-red-600">●{o.dviCounts.rojo}</span>
                            <span className="text-amber-500">●{o.dviCounts.amarillo}</span>
                            <span className="text-emerald-600">●{o.dviCounts.verde}</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">Pend.</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            o.estatusPago === "Pagado"
                              ? "bg-emerald-100 text-emerald-800"
                              : o.estatusPago === "Parcial"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {o.estatusPago}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900 tabular-nums">
                        ${o.totalAmount.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {o.columnId === "Listo para Entrega" && (
                            <button
                              type="button"
                              onClick={() => handleDeliverOrder(o.id)}
                              className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer shadow-2xs transition-colors"
                              title="Marcar vehículo como entregado"
                            >
                              <CheckCircle2 size={11} /> Entregar
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedOrderId(o.id)}
                            className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold cursor-pointer transition-colors"
                          >
                            Abrir
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-xs text-slate-400">
                      No se encontraron órdenes con los filtros seleccionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal for New Order */}
      <Modal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        title="Recepción y Apertura de Orden de Servicio"
        description="Asigna cliente, unidad, sucursal, rampa y registra el check-in inicial."
        size="lg"
      >
        <OrderForm
          initialClientId={initialClientId}
          initialVehicleId={initialVehicleId}
          initialDiferidoId={initialDiferidoId}
          onSuccess={(createdOrderId) => {
            setIsOrderModalOpen(false);
            fetchOrders(false);
            if (createdOrderId) {
              setSelectedOrderId(createdOrderId);
            }
          }}
          onCancel={() => setIsOrderModalOpen(false)}
        />
      </Modal>

      {/* Modal for Full Tabbed Order Workspace (Unificado con Command Header nativo) */}
      <Modal
        isOpen={!!selectedOrderId}
        onClose={() => setSelectedOrderId(null)}
        title="Orden de Servicio"
        size="full"
        hideHeader
      >
        {selectedOrderId && (
          <ErrorBoundary fallbackTitle="Error al abrir el detalle de la orden">
            <OrderDetailsModal
              orderId={selectedOrderId}
              onClose={() => setSelectedOrderId(null)}
              onUpdate={() => fetchOrders(false)}
            />
          </ErrorBoundary>
        )}
      </Modal>
    </div>
  );
}
