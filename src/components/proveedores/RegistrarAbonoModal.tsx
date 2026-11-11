"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  DollarSign,
  Building2,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Receipt,
  CheckSquare,
  Square,
  Sparkles,
  Zap,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Layers,
} from "lucide-react";
import {
  ProveedorService,
  Proveedor,
  CompraConProveedor,
  AbonoMultiTicketItem,
  RegistrarAbonoMultiplesTicketsParams,
} from "@/services/proveedorService";

interface RegistrarAbonoModalProps {
  isOpen: boolean;
  onClose: () => void;
  empresaId: string;
  sucursalId?: string;
  cajaTurnoId?: string;
  defaultProveedorId?: string;
  defaultCompraId?: string;
  defaultCompraIds?: string[];
  defaultMonto?: number;
  proveedores: Proveedor[];
  onAbonoRegistrado?: () => void;
}

type ModoPago = "SELECCION" | "LIQUIDAR_TODO" | "LIBRE";

export function RegistrarAbonoModal({
  isOpen,
  onClose,
  empresaId,
  sucursalId,
  cajaTurnoId,
  defaultProveedorId,
  defaultCompraId,
  defaultCompraIds,
  defaultMonto,
  proveedores,
  onAbonoRegistrado,
}: RegistrarAbonoModalProps) {
  const [proveedorId, setProveedorId] = useState<string>(defaultProveedorId || "");
  const [modoPago, setModoPago] = useState<ModoPago>("SELECCION");
  const [montoTotal, setMontoTotal] = useState<string>("");
  const [metodoPago, setMetodoPago] = useState<"EFECTIVO_CAJA" | "TRANSFERENCIA" | "FONDO_RESERVA" | "OTRO">("TRANSFERENCIA");
  const [referencia, setReferencia] = useState<string>("");

  // Tickets pendientes y selección
  const [comprasPendientes, setComprasPendientes] = useState<CompraConProveedor[]>([]);
  const [selectedTicketIds, setSelectedTicketIds] = useState<Set<string>>(new Set());
  const [distribuirCascada, setDistribuirCascada] = useState<boolean>(true);
  const [loadingCompras, setLoadingCompras] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Inicialización de proveedor
  useEffect(() => {
    if (defaultProveedorId) {
      setProveedorId(defaultProveedorId);
    } else if (proveedores.length > 0 && !proveedorId) {
      setProveedorId(proveedores[0].id);
    }
  }, [defaultProveedorId, proveedores]);

  // Cargar compras del proveedor seleccionado
  useEffect(() => {
    if (proveedorId) {
      cargarComprasPendientes(proveedorId);
    } else {
      setComprasPendientes([]);
      setSelectedTicketIds(new Set());
    }
  }, [proveedorId]);

  const cargarComprasPendientes = async (pId: string) => {
    setLoadingCompras(true);
    try {
      const { data } = await ProveedorService.obtenerCompras({
        empresaId,
        proveedorId: pId,
        soloDeudas: true,
      });
      const list = data || [];
      setComprasPendientes(list);

      // Si se proporcionaron tickets por defecto
      if (defaultCompraIds && defaultCompraIds.length > 0) {
        const setIds = new Set(defaultCompraIds);
        setSelectedTicketIds(setIds);
        setModoPago("SELECCION");
        const sum = list
          .filter((c) => setIds.has(c.id))
          .reduce((acc, c) => acc + Number(c.monto_saldo_pendiente || 0), 0);
        setMontoTotal(sum > 0 ? sum.toFixed(2) : defaultMonto ? defaultMonto.toString() : "");
      } else if (defaultCompraId) {
        setSelectedTicketIds(new Set([defaultCompraId]));
        setModoPago("SELECCION");
        const found = list.find((c) => c.id === defaultCompraId);
        if (found) {
          setMontoTotal(Number(found.monto_saldo_pendiente || 0).toFixed(2));
        } else if (defaultMonto) {
          setMontoTotal(defaultMonto.toString());
        }
      } else if (defaultMonto !== undefined && defaultMonto > 0) {
        setMontoTotal(defaultMonto.toString());
      }
    } finally {
      setLoadingCompras(false);
    }
  };

  const proveedorSeleccionado = proveedores.find((p) => p.id === proveedorId);
  const totalDeudaProveedor = Number(proveedorSeleccionado?.saldo_deudor_actual || 0);

  // Suma de tickets actualmente seleccionados
  const sumaSeleccionados = useMemo(() => {
    return comprasPendientes
      .filter((c) => selectedTicketIds.has(c.id))
      .reduce((acc, c) => acc + Number(c.monto_saldo_pendiente || 0), 0);
  }, [comprasPendientes, selectedTicketIds]);

  // Manejo de cambio de modo
  const handleCambiarModo = (nuevoModo: ModoPago) => {
    setModoPago(nuevoModo);
    setErrorMsg(null);

    if (nuevoModo === "LIQUIDAR_TODO") {
      // Seleccionar todos los tickets pendientes
      const allIds = new Set(comprasPendientes.map((c) => c.id));
      setSelectedTicketIds(allIds);
      // El monto total es el saldo del proveedor o la suma de las compras pendientes
      const sumTotal = comprasPendientes.reduce((acc, c) => acc + Number(c.monto_saldo_pendiente || 0), 0);
      const montoFinal = Math.max(sumTotal, totalDeudaProveedor);
      setMontoTotal(montoFinal > 0 ? montoFinal.toFixed(2) : "");
    } else if (nuevoModo === "SELECCION") {
      // Re-sincronizar monto con los seleccionados actuales
      if (sumaSeleccionados > 0) {
        setMontoTotal(sumaSeleccionados.toFixed(2));
      }
    }
  };

  // Toggle de un ticket individual
  const handleToggleTicket = (ticketId: string) => {
    const next = new Set(selectedTicketIds);
    if (next.has(ticketId)) {
      next.delete(ticketId);
    } else {
      next.add(ticketId);
    }
    setSelectedTicketIds(next);

    // Recalcular monto
    const nuevaSuma = comprasPendientes
      .filter((c) => next.has(c.id))
      .reduce((acc, c) => acc + Number(c.monto_saldo_pendiente || 0), 0);

    setMontoTotal(nuevaSuma > 0 ? nuevaSuma.toFixed(2) : "");
  };

  // Seleccionar todos los tickets
  const handleSelectAllTickets = () => {
    const allIds = new Set(comprasPendientes.map((c) => c.id));
    setSelectedTicketIds(allIds);
    const sum = comprasPendientes.reduce((acc, c) => acc + Number(c.monto_saldo_pendiente || 0), 0);
    setMontoTotal(sum.toFixed(2));
  };

  // Desmarcar todos los tickets
  const handleClearTickets = () => {
    setSelectedTicketIds(new Set());
    setMontoTotal("");
  };

  // Envío del pago
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const montoNum = parseFloat(montoTotal);
    if (!montoNum || montoNum <= 0) {
      setErrorMsg("Ingresa un monto válido mayor a $0.00");
      return;
    }
    if (!proveedorId) {
      setErrorMsg("Selecciona un proveedor");
      return;
    }

    setGuardando(true);
    setErrorMsg(null);

    try {
      let itemsAbonar: AbonoMultiTicketItem[] = [];
      let remanenteGeneral = 0;

      if (modoPago === "SELECCION" || modoPago === "LIQUIDAR_TODO") {
        const ticketsAModificar = comprasPendientes.filter((c) => selectedTicketIds.has(c.id));

        if (ticketsAModificar.length > 0) {
          // Distribuir el montoNum en cascada entre los tickets seleccionados
          let dineroDisponible = montoNum;

          for (const ticket of ticketsAModificar) {
            if (dineroDisponible <= 0) break;
            const saldoTicket = Number(ticket.monto_saldo_pendiente || 0);
            const abonoParaEsteTicket = Math.min(saldoTicket, dineroDisponible);

            itemsAbonar.push({
              compra_id: ticket.id,
              monto: Number(abonoParaEsteTicket.toFixed(2)),
              folio_ticket_nota: ticket.folio_ticket_nota,
            });

            dineroDisponible -= abonoParaEsteTicket;
          }

          // Si el usuario pagó más de lo que sumaban los tickets seleccionados
          if (dineroDisponible > 0.01) {
            remanenteGeneral = Number(dineroDisponible.toFixed(2));
          }
        } else {
          // No seleccionó ninguno: todo va a cuenta corriente general
          remanenteGeneral = montoNum;
        }
      } else {
        // MODO LIBRE
        if (distribuirCascada && comprasPendientes.length > 0) {
          // Distribuir en cascada FIFO entre las compras pendientes del proveedor
          let dineroDisponible = montoNum;
          for (const ticket of comprasPendientes) {
            if (dineroDisponible <= 0) break;
            const saldoTicket = Number(ticket.monto_saldo_pendiente || 0);
            const abonoTicket = Math.min(saldoTicket, dineroDisponible);

            itemsAbonar.push({
              compra_id: ticket.id,
              monto: Number(abonoTicket.toFixed(2)),
              folio_ticket_nota: ticket.folio_ticket_nota,
            });

            dineroDisponible -= abonoTicket;
          }
          if (dineroDisponible > 0.01) {
            remanenteGeneral = Number(dineroDisponible.toFixed(2));
          }
        } else {
          // Abono general a cuenta corriente sin vincular tickets
          remanenteGeneral = montoNum;
        }
      }

      const params: RegistrarAbonoMultiplesTicketsParams = {
        empresa_id: empresaId,
        sucursal_id: sucursalId || null,
        caja_turno_id: cajaTurnoId || null,
        proveedor_id: proveedorId,
        metodo_pago: metodoPago,
        referencia: referencia.trim() || null,
        items: itemsAbonar,
        monto_general_adicional: remanenteGeneral > 0 ? remanenteGeneral : undefined,
      };

      const res = await ProveedorService.registrarAbonoMultiplesTickets(params);
      if (res.error) throw new Error(res.error);

      if (onAbonoRegistrado) onAbonoRegistrado();
      onClose();
    } catch (err: any) {
      console.error("Error al registrar abono(s):", err);
      setErrorMsg(err.message || "Error al procesar el pago");
    } finally {
      setGuardando(false);
    }
  };

  if (!isOpen) return null;

  const montoNumParsed = parseFloat(montoTotal) || 0;
  const saldoRestanteEstimado = Math.max(0, totalDeudaProveedor - montoNumParsed);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-2xl max-h-[92vh] rounded-2xl shadow-2xl border border-slate-700/50 flex flex-col overflow-hidden">
        {/* ========================================================================= */}
        {/* HEADER DEL MODAL */}
        {/* ========================================================================= */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                Pagar / Abonar a Proveedor
              </h2>
              <p className="text-xs text-slate-400">
                Paga un ticket individual, varios en un solo pago o liquida toda la cuenta
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Cerrar modal (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ========================================================================= */}
        {/* FORMULARIO BODY CON SCROLL */}
        {/* ========================================================================= */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs bg-slate-50">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. SELECCIÓN DE PROVEEDOR Y BANNER DE DEUDA */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2.5">
            <label className="font-bold text-slate-800 block text-xs">
              Proveedor Mayorista / Centro de Insumos *
            </label>
            <select
              value={proveedorId}
              onChange={(e) => setProveedorId(e.target.value)}
              className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary font-bold text-slate-900 text-xs"
              required
            >
              <option value="">Selecciona proveedor...</option>
              {proveedores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre_comercial} — Saldo Deudor: $
                  {Number(p.saldo_deudor_actual || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                </option>
              ))}
            </select>

            {proveedorSeleccionado && (
              <div className="flex items-center justify-between p-2.5 bg-slate-100/80 rounded-lg text-xs">
                <span className="text-slate-600 font-medium">Deuda acumulada actual:</span>
                <span
                  className={`font-black text-sm ${
                    totalDeudaProveedor > 0 ? "text-amber-700" : "text-emerald-700"
                  }`}
                >
                  ${totalDeudaProveedor.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN
                </span>
              </div>
            )}
          </div>

          {/* 2. SELECTOR DE MODALIDAD (3 OPCIONES INTUITIVAS) */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-primary" />
                ¿Cómo deseas aplicar este pago?
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                {comprasPendientes.length} ticket(s) con saldo
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* Opción 1: Tickets Seleccionados */}
              <button
                type="button"
                onClick={() => handleCambiarModo("SELECCION")}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[70px] ${
                  modoPago === "SELECCION"
                    ? "bg-sky-50/80 border-sky-400 text-sky-950 shadow-xs ring-1 ring-sky-300"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-bold text-xs flex items-center gap-1">
                    <Receipt className="w-3.5 h-3.5 text-sky-600" />
                    Tickets Seleccionados
                  </span>
                  {selectedTicketIds.size > 0 && (
                    <span className="px-1.5 py-0.2 bg-sky-200 text-sky-800 font-mono text-[10px] rounded-full font-bold">
                      {selectedTicketIds.size}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Marca 1 o varios tickets específicos
                </p>
              </button>

              {/* Opción 2: Liquidar Toda la Deuda */}
              <button
                type="button"
                onClick={() => handleCambiarModo("LIQUIDAR_TODO")}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[70px] ${
                  modoPago === "LIQUIDAR_TODO"
                    ? "bg-emerald-50/80 border-emerald-400 text-emerald-950 shadow-xs ring-1 ring-emerald-300"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-bold text-xs flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-emerald-600" />
                    Liquidar Todo
                  </span>
                  <span className="px-1.5 py-0.2 bg-emerald-200 text-emerald-800 font-mono text-[10px] rounded-full font-bold">
                    100%
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Salda el total acumulado en 1 clic
                </p>
              </button>

              {/* Opción 3: Abono Libre / Cascada */}
              <button
                type="button"
                onClick={() => handleCambiarModo("LIBRE")}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[70px] ${
                  modoPago === "LIBRE"
                    ? "bg-purple-50/80 border-purple-400 text-purple-950 shadow-xs ring-1 ring-purple-300"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-bold text-xs flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 text-purple-600" />
                    Monto Libre
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Abona cualquier cantidad (o cuenta general)
                </p>
              </button>
            </div>

            {/* LISTADO DE TICKETS CUANDO EL MODO ES SELECCIÓN O LIQUIDAR TODO */}
            {(modoPago === "SELECCION" || modoPago === "LIQUIDAR_TODO") && (
              <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">
                    Facturas y Tickets con Saldo Pendiente:
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllTickets}
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold cursor-pointer"
                    >
                      Seleccionar Todos
                    </button>
                    <button
                      type="button"
                      onClick={handleClearTickets}
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-[11px] font-semibold cursor-pointer"
                    >
                      Desmarcar
                    </button>
                  </div>
                </div>

                {loadingCompras ? (
                  <div className="py-6 text-center text-slate-400 flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span>Cargando tickets pendientes...</span>
                  </div>
                ) : comprasPendientes.length === 0 ? (
                  <div className="py-4 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    No hay tickets pendientes con saldo para este proveedor.
                  </div>
                ) : (
                  <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                    {comprasPendientes.map((compra) => {
                      const isSelected = selectedTicketIds.has(compra.id);
                      const saldo = Number(compra.monto_saldo_pendiente || 0);

                      return (
                        <div
                          key={compra.id}
                          onClick={() => handleToggleTicket(compra.id)}
                          className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            isSelected
                              ? "bg-sky-50/70 border-sky-300 ring-1 ring-sky-200"
                              : "bg-white border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <button
                              type="button"
                              className={`p-1 rounded cursor-pointer ${
                                isSelected ? "text-sky-600" : "text-slate-400"
                              }`}
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-black text-slate-900 text-xs">
                                  #{compra.folio_ticket_nota}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {compra.fecha_compra}
                                </span>
                                {compra.fecha_limite_pago && (
                                  <span className="text-[10px] text-slate-500 font-medium">
                                    Vence: {compra.fecha_limite_pago}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-600 truncate mt-0.5">
                                {compra.descripcion}
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-[10px] text-slate-400 block">Saldo</span>
                            <span className="font-mono font-black text-xs text-amber-700">
                              ${saldo.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Subtotal de tickets seleccionados */}
                {selectedTicketIds.size > 0 && (
                  <div className="p-2.5 bg-sky-50 rounded-xl border border-sky-200 flex items-center justify-between text-xs">
                    <span className="font-semibold text-sky-900">
                      {selectedTicketIds.size} ticket(s) seleccionado(s):
                    </span>
                    <strong className="font-mono font-black text-sky-950 text-sm">
                      ${sumaSeleccionados.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN
                    </strong>
                  </div>
                )}
              </div>
            )}

            {/* OPCIÓN ADICIONAL EN MODO LIBRE: CASCADA FIFO */}
            {modoPago === "LIBRE" && comprasPendientes.length > 0 && (
              <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={distribuirCascada}
                    onChange={(e) => setDistribuirCascada(e.target.checked)}
                    className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                  />
                  <span className="font-bold text-purple-950 text-xs">
                    Distribuir automáticamente en cascada a los tickets más antiguos (FIFO)
                  </span>
                </label>
                <p className="text-[11px] text-purple-800 pl-6 leading-relaxed">
                  Si marcas esta casilla, el monto ingresado liquidará primero las facturas más
                  vencidas del proveedor y cualquier excedente se abonará a la cuenta corriente general.
                </p>
              </div>
            )}
          </div>

          {/* 3. MONTO TOTAL Y MÉTODO DE PAGO */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div>
              <label className="font-bold text-slate-800 block text-xs mb-1">
                Monto Total a Pagar ($ MXN) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-lg">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={montoTotal}
                  onChange={(e) => setMontoTotal(e.target.value)}
                  className="w-full h-12 pl-8 pr-4 bg-slate-50 border-2 border-slate-300 rounded-xl focus:border-emerald-500 focus:ring-0 font-mono font-black text-slate-900 text-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Método de Pago / Fuente *
                </label>
                <select
                  value={metodoPago}
                  onChange={(e) => setMetodoPago(e.target.value as any)}
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-1 focus:ring-primary font-bold text-slate-800"
                >
                  <option value="TRANSFERENCIA">🏦 Transferencia SPEI (Bancos)</option>
                  <option value="EFECTIVO_CAJA">💵 Efectivo de Mostrador (Caja Chica)</option>
                  <option value="FONDO_RESERVA">💼 Fondo de Reserva Taller</option>
                  <option value="OTRO">📄 Otro / Cheque</option>
                </select>
                {metodoPago === "EFECTIVO_CAJA" && (
                  <p className="text-[10px] text-amber-700 mt-1">
                    ⚠️ Se registrará automáticamente la salida de gaveta en el turno activo para cuadrar el corte del día.
                  </p>
                )}
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Referencia / Folio SPEI / Comprobante
                </label>
                <input
                  type="text"
                  placeholder="ej. Rastreo BBVA 89123 o Recibo #55"
                  value={referencia}
                  onChange={(e) => setReferencia(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          {/* 4. RESUMEN VISUAL DE LIQUIDACIÓN */}
          {montoNumParsed > 0 && proveedorSeleccionado && (
            <div className="bg-emerald-50/80 p-3.5 rounded-xl border border-emerald-200 text-xs space-y-1.5">
              <div className="flex justify-between items-center text-slate-700">
                <span>Deuda actual del proveedor:</span>
                <span className="font-mono font-bold">${totalDeudaProveedor.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center text-emerald-900 font-bold">
                <span>Monto a abonar en esta operación:</span>
                <span className="font-mono text-sm font-black text-emerald-700">-${montoNumParsed.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center pt-1.5 border-t border-emerald-200 text-slate-900 font-black">
                <span>Nuevo Saldo Deudor Estimado:</span>
                <span className={`font-mono text-sm ${saldoRestanteEstimado === 0 ? "text-emerald-700" : "text-amber-800"}`}>
                  ${saldoRestanteEstimado.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN
                  {saldoRestanteEstimado === 0 && " (¡Totalmente Liquidado!)"}
                </span>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ACCIONES Y BOTÓN DE CONFIRMACIÓN (DIRTY HANDS UX) */}
          {/* ========================================================================= */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={guardando}
              className="px-4 py-2.5 font-bold text-slate-600 hover:bg-slate-200 rounded-xl cursor-pointer transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando || montoNumParsed <= 0}
              className="h-12 px-6 font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-all text-xs sm:text-sm"
            >
              {guardando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Procesando pago...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    Confirmar Pago de ${montoNumParsed.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
