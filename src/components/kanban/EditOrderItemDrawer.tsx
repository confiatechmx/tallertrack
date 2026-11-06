"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Wrench,
  Calculator,
  Disc,
  Save,
  Gift,
  ShieldCheck,
  Check,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { ConcurrencyService } from "@/services/concurrencyService";
import { DEFAULT_OPERATION_PACKAGES } from "@/lib/services/serviceOperationsEngine";
import { PROVEEDORES_REFACCIONES } from "./OrderDetailsModal";

export type OrderItemType = "servicio" | "refaccion" | "llanta";

interface EditOrderItemDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  itemType: OrderItemType | null;
  itemData: any | null;
  orderId: string;
  empresaId?: string;
  mechanics?: any[];
  proveedoresCatalogo?: any[];
  onSaveSuccess: (updatedItem: any, itemType: OrderItemType) => void;
}

export const EditOrderItemDrawer: React.FC<EditOrderItemDrawerProps> = ({
  isOpen,
  onClose,
  itemType,
  itemData,
  orderId,
  empresaId,
  mechanics = [],
  proveedoresCatalogo = [],
  onSaveSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Estados comunes
  const [nombre, setNombre] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [paquete, setPaquete] = useState("Mecánica General");

  // Estados Servicio
  const [mecanicoId, setMecanicoId] = useState("");
  const [horasLabor, setHorasLabor] = useState("1.0");
  const [precioCobrado, setPrecioCobrado] = useState("0");
  const [esCortesia, setEsCortesia] = useState(false);
  const [notas, setNotas] = useState("");

  // Estados Refacción
  const [numeroParte, setNumeroParte] = useState("");
  const [proveedor, setProveedor] = useState("");
  const [proveedorId, setProveedorId] = useState("");
  const [costoUnitario, setCostoUnitario] = useState("0");
  const [margenPorcentaje, setMargenPorcentaje] = useState("35");
  const [precioUnitarioRefaccion, setPrecioUnitarioRefaccion] = useState("0");
  const [folioTicket, setFolioTicket] = useState("");
  const [garantiaEspecifica, setGarantiaEspecifica] = useState("");

  // Inicializar estado cuando se abre con un ítem
  useEffect(() => {
    if (!itemData || !itemType) return;
    setErrorMessage(null);

    if (itemType === "servicio") {
      const srvName =
        itemData.concepto_personalizado ||
        itemData.servicios_taller?.nombre ||
        itemData.nombre ||
        "Servicio";
      setNombre(srvName);
      setCantidad(Number(itemData.cantidad || 1));
      setPaquete(itemData.paquete_operacion || "Mecánica General");
      setMecanicoId(itemData.mecanico_id || "");
      setHorasLabor(String(itemData.horas_labor ?? 1.0));
      const unitPrice = Number(itemData.precio_cobrado || 0);
      setPrecioCobrado(String(unitPrice));
      setEsCortesia(Boolean(itemData.es_cortesia || unitPrice === 0));
      setNotas(itemData.notas || "");
    } else if (itemType === "refaccion") {
      setNombre(itemData.nombre || "");
      setNumeroParte(itemData.numero_parte || "");
      setProveedor(itemData.proveedor || "");
      setProveedorId(itemData.proveedor_id || "");
      setCantidad(Number(itemData.cantidad || 1));
      const costo = Number(itemData.costo_unitario || 0);
      const margen = Number(itemData.margen_porcentaje || 35);
      const precio = Number(itemData.precio_unitario || 0);
      setCostoUnitario(String(costo));
      setMargenPorcentaje(String(margen));
      setPrecioUnitarioRefaccion(String(precio));
      setPaquete(itemData.paquete_operacion || "Frenos");
      setFolioTicket(itemData.folio_ticket_nota || "");
      setGarantiaEspecifica(itemData.garantia_especifica || "");
    } else if (itemType === "llanta") {
      const t = itemData.inventario_llantas;
      const desc = t
        ? `${t.marca || ""} ${t.modelo_llanta || ""} ${t.ancho}/${t.perfil} R${t.rin}`.trim()
        : "Neumático";
      setNombre(desc);
      setCantidad(Number(itemData.cantidad || 1));
      setPrecioCobrado(String(Number(itemData.precio_unitario || 0)));
      setPaquete(itemData.paquete_operacion || "Llantas y Ruedas");
    }
  }, [itemData, itemType]);

  if (!isOpen || !itemData || !itemType) return null;

  // Cálculos dinámicos para refacciones
  const numericCosto = Math.max(0, parseFloat(costoUnitario) || 0);
  const numericCant = Math.max(1, cantidad || 1);

  const handleCostoChange = (val: string) => {
    setCostoUnitario(val);
    const c = Math.max(0, parseFloat(val) || 0);
    const m = Math.max(0, parseFloat(margenPorcentaje) || 0);
    const nuevoPrecio = Math.round(c * (1 + m / 100));
    setPrecioUnitarioRefaccion(String(nuevoPrecio));
  };

  const handleMargenChange = (val: string) => {
    setMargenPorcentaje(val);
    const m = Math.max(0, parseFloat(val) || 0);
    const nuevoPrecio = Math.round(numericCosto * (1 + m / 100));
    setPrecioUnitarioRefaccion(String(nuevoPrecio));
  };

  const handlePrecioVentaChange = (val: string) => {
    setPrecioUnitarioRefaccion(val);
    const p = Math.max(0, parseFloat(val) || 0);
    if (numericCosto > 0) {
      const nuevoMargen = Math.round(((p - numericCosto) / numericCosto) * 100);
      setMargenPorcentaje(String(nuevoMargen));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      if (itemType === "servicio") {
        if (!nombre.trim()) {
          setErrorMessage("El concepto del servicio no puede estar vacío.");
          setLoading(false);
          return;
        }

        const numericPrecio = esCortesia ? 0 : Math.max(0, parseFloat(precioCobrado) || 0);
        const numericHoras = Math.max(0.1, parseFloat(horasLabor) || 1.0);
        const numericQty = Math.max(1, cantidad || 1);

        const updates = {
          concepto_personalizado: nombre.trim(),
          mecanico_id: mecanicoId || null,
          horas_labor: numericHoras,
          cantidad: numericQty,
          precio_cobrado: numericPrecio,
          paquete_operacion: paquete,
          notas: notas.trim() || null,
          es_cortesia: esCortesia,
        };

        const { data, error } = await supabase
          .from("orden_servicio_servicios")
          .update(updates)
          .eq("id", itemData.id)
          .select(
            "id, servicio_id, concepto_personalizado, mecanico_id, cantidad, horas_labor, precio_cobrado, comision_porcentaje, estatus_aprobacion, notas, paquete_operacion, es_cortesia, garantia_especifica, servicios_taller(id, nombre, codigo_sku, categoria, horas_estimadas, precio, garantia_meses, condicion_promo)"
          )
          .single();

        if (error) throw error;

        toast.success("Mano de obra actualizada correctamente");
        onSaveSuccess(data, "servicio");
        onClose();
      } else if (itemType === "refaccion") {
        if (!nombre.trim()) {
          setErrorMessage("El nombre de la refacción no puede estar vacío.");
          setLoading(false);
          return;
        }

        const numericUnit = Math.max(0, parseFloat(precioUnitarioRefaccion) || 0);
        const numericMargen = Math.max(0, parseFloat(margenPorcentaje) || 0);
        const numericQty = Math.max(1, cantidad || 1);
        const subtotal = Math.round(numericUnit * numericQty * 100) / 100;

        const updates = {
          nombre: nombre.trim(),
          numero_parte: numeroParte.trim() || null,
          proveedor: proveedor.trim() || null,
          proveedor_id: proveedorId || null,
          cantidad: numericQty,
          costo_unitario: numericCosto,
          margen_porcentaje: numericMargen,
          precio_unitario: numericUnit,
          subtotal: subtotal,
          paquete_operacion: paquete,
          folio_ticket_nota: folioTicket.trim() || null,
          garantia_especifica: garantiaEspecifica.trim() || null,
        };

        const { data, error } = await supabase
          .from("orden_servicio_refacciones")
          .update(updates)
          .eq("id", itemData.id)
          .select(
            "id, nombre, numero_parte, proveedor, cantidad, costo_unitario, margen_porcentaje, precio_unitario, subtotal, estatus_aprobacion, paquete_operacion, es_cortesia, garantia_especifica, compra_proveedor_id, compras_proveedores ( id, folio_ticket_nota, meses_garantia, fecha_compra, fecha_vencimiento_garantia, estatus_garantia, evidencia_url, evidencia_tipo, descripcion, monto_costo, proveedores ( nombre_comercial ) )"
          )
          .single();

        if (error) throw error;

        toast.success("Refacción actualizada correctamente");
        onSaveSuccess(data, "refaccion");
        onClose();
      } else if (itemType === "llanta") {
        const numericUnit = Math.max(0, parseFloat(precioCobrado) || 0);
        const numericQty = Math.max(1, cantidad || 1);
        const oldQty = Number(itemData.cantidad || 1);
        const subtotal = Math.round(numericUnit * numericQty * 100) / 100;

        // Ajuste concurrente de stock si la cantidad cambió
        const deltaStock = oldQty - numericQty;
        if (deltaStock !== 0 && itemData.llanta_id) {
          await ConcurrencyService.ajustarStock({
            llantaId: itemData.llanta_id,
            delta: deltaStock,
            permitirNegativo: true,
          });
        }

        const updates = {
          cantidad: numericQty,
          precio_unitario: numericUnit,
          subtotal: subtotal,
          paquete_operacion: paquete,
        };

        const { data, error } = await supabase
          .from("detalles_cotizacion")
          .update(updates)
          .eq("id", itemData.id)
          .select(
            "id, cantidad, precio_unitario, subtotal, estatus_aprobacion, paquete_operacion, es_cortesia, garantia_especifica, inventario_llantas ( id, marca, modelo_llanta, rin, ancho, perfil, stock_actual, costo_adquisicion )"
          )
          .single();

        if (error) throw error;

        toast.success("Neumático actualizado correctamente");
        onSaveSuccess(data, "llanta");
        onClose();
      }
    } catch (err: any) {
      console.error("Error al actualizar partida:", err);
      setErrorMessage(err.message || "Error al guardar cambios");
      toast.error("No se pudo actualizar la partida");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="w-full max-w-lg bg-white h-full flex flex-col shadow-2xl border-l border-slate-200 animate-in slide-in-from-right duration-200">
        {/* Header con Dirty Hands UX */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shadow-xs ${
                itemType === "servicio"
                  ? "bg-blue-100 text-blue-700 border border-blue-200"
                  : itemType === "refaccion"
                  ? "bg-indigo-100 text-indigo-700 border border-indigo-200"
                  : "bg-amber-100 text-amber-700 border border-amber-200"
              }`}
            >
              {itemType === "servicio" && <Wrench className="w-5 h-5" />}
              {itemType === "refaccion" && <Calculator className="w-5 h-5" />}
              {itemType === "llanta" && <Disc className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                {itemType === "servicio" && "Editar Mano de Obra"}
                {itemType === "refaccion" && "Editar Refacción"}
                {itemType === "llanta" && "Editar Neumático"}
              </h3>
              <p className="text-xs text-slate-500 truncate max-w-[280px]">
                Modifica datos sin tener que eliminar y volver a cargar
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Formulario según itemType */}
          {itemType === "servicio" && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Concepto / Mano de Obra *
                </label>
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full h-12 text-sm bg-white border border-slate-300 rounded-xl px-3.5 text-slate-900 font-bold focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                  placeholder="Ej. Cambio de balatas delanteras"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                    Técnico Asignado
                  </label>
                  <select
                    value={mecanicoId}
                    onChange={(e) => setMecanicoId(e.target.value)}
                    className="w-full h-12 text-xs bg-white border border-slate-300 rounded-xl px-3 text-slate-900 font-medium"
                  >
                    <option value="">Técnico general de la orden</option>
                    {mechanics
                      .filter((m) => m.rol === "Mecánico" || !m.rol)
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.nombre} ({m.comision_porcentaje || 15}%)
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                    Paquete / Operación
                  </label>
                  <select
                    value={paquete}
                    onChange={(e) => setPaquete(e.target.value)}
                    className="w-full h-12 text-xs bg-white border border-slate-300 rounded-xl px-3 text-slate-900 font-medium"
                  >
                    {DEFAULT_OPERATION_PACKAGES.map((pkg: string) => (
                      <option key={pkg} value={pkg}>
                        {pkg}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                    Cantidad
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={cantidad}
                    onChange={(e) => setCantidad(parseInt(e.target.value) || 1)}
                    className="w-full h-12 text-sm bg-white border border-slate-300 rounded-xl px-3 text-center font-bold tabular-nums"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                    Horas Labor
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={horasLabor}
                    onChange={(e) => setHorasLabor(e.target.value)}
                    className="w-full h-12 text-sm bg-white border border-slate-300 rounded-xl px-3 text-center font-bold tabular-nums"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase">
                      Precio Unit. ($)
                    </label>
                  </div>
                  <input
                    type="number"
                    step="10"
                    disabled={esCortesia}
                    value={esCortesia ? "0" : precioCobrado}
                    onChange={(e) => setPrecioCobrado(e.target.value)}
                    className={`w-full h-12 text-sm border rounded-xl px-3 text-right font-black tabular-nums font-mono ${
                      esCortesia
                        ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                        : "bg-white text-slate-900 border-slate-300"
                    }`}
                  />
                </div>
              </div>

              {/* Botón de Cortesía */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gift
                    size={16}
                    className={esCortesia ? "text-emerald-600" : "text-slate-400"}
                  />
                  <span className="text-xs font-semibold text-slate-700">
                    Mano de Obra en Cortesía / Garantía ($0.00)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !esCortesia;
                    setEsCortesia(next);
                    if (!next && precioCobrado === "0") {
                      setPrecioCobrado("150");
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    esCortesia
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-100"
                  }`}
                >
                  {esCortesia ? "✓ Es Cortesía" : "Hacer Cortesía"}
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Notas Técnicas
                </label>
                <textarea
                  rows={2}
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Detalles técnicos o condiciones observadas..."
                  className="w-full text-xs bg-white border border-slate-300 rounded-xl p-3 text-slate-800 outline-none focus:border-blue-500"
                />
              </div>
            </>
          )}

          {itemType === "refaccion" && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Concepto / Refacción *
                </label>
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full h-12 text-sm bg-white border border-slate-300 rounded-xl px-3.5 text-slate-900 font-bold focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
                  placeholder="Ej. Juego Balatas Cerámicas Delanteras"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                    No. Parte (SKU)
                  </label>
                  <input
                    type="text"
                    value={numeroParte}
                    onChange={(e) => setNumeroParte(e.target.value)}
                    className="w-full h-12 text-xs bg-white border border-slate-300 rounded-xl px-3 text-slate-900 font-mono"
                    placeholder="Ej. D1521-8840"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                    Paquete / Operación
                  </label>
                  <select
                    value={paquete}
                    onChange={(e) => setPaquete(e.target.value)}
                    className="w-full h-12 text-xs bg-white border border-slate-300 rounded-xl px-3 text-slate-900 font-medium"
                  >
                    {DEFAULT_OPERATION_PACKAGES.map((pkg: string) => (
                      <option key={pkg} value={pkg}>
                        {pkg}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                    Proveedor
                  </label>
                  <select
                    value={proveedorId || proveedor}
                    onChange={(e) => {
                      const val = e.target.value;
                      const provObj = proveedoresCatalogo.find((p) => p.id === val);
                      if (provObj) {
                        setProveedorId(provObj.id);
                        setProveedor(provObj.nombre_comercial);
                      } else {
                        setProveedorId("");
                        setProveedor(val);
                      }
                    }}
                    className="w-full h-12 text-xs bg-white border border-slate-300 rounded-xl px-3 text-slate-900 font-medium"
                  >
                    <option value="">Seleccionar o teclear proveedor...</option>
                    {proveedoresCatalogo.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre_comercial} {p.categoria ? `(${p.categoria})` : ""}
                      </option>
                    ))}
                    {PROVEEDORES_REFACCIONES.map((prov: string) => (
                      <option key={prov} value={prov}>
                        {prov}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                    Cantidad
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={cantidad}
                    onChange={(e) => setCantidad(parseInt(e.target.value) || 1)}
                    className="w-full h-12 text-sm bg-white border border-slate-300 rounded-xl px-3 text-center font-bold tabular-nums"
                  />
                </div>
              </div>

              {/* Bloque Financiero: Costo, Margen y Precio */}
              <div className="bg-indigo-50/50 border border-indigo-200/80 rounded-2xl p-4 space-y-3">
                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                      Costo Prov. ($)
                    </label>
                    <input
                      type="number"
                      step="10"
                      value={costoUnitario}
                      onChange={(e) => handleCostoChange(e.target.value)}
                      className="w-full h-11 text-xs bg-white border border-slate-300 rounded-lg px-2.5 text-slate-900 font-bold tabular-nums font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-indigo-700 mb-1">
                      Margen (%)
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="1"
                        value={margenPorcentaje}
                        onChange={(e) => handleMargenChange(e.target.value)}
                        className="w-full h-11 text-xs bg-white border border-indigo-300 rounded-lg px-2 text-center font-bold text-indigo-700 tabular-nums"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-indigo-900 mb-1">
                      P. Venta ($)
                    </label>
                    <input
                      type="number"
                      step="10"
                      value={precioUnitarioRefaccion}
                      onChange={(e) => handlePrecioVentaChange(e.target.value)}
                      className="w-full h-11 text-xs bg-indigo-100/70 border border-indigo-400 rounded-lg px-2.5 text-right font-black text-indigo-950 tabular-nums font-mono"
                    />
                  </div>
                </div>

                {/* Margen presets */}
                <div className="flex items-center justify-between text-xs pt-1 border-t border-indigo-100">
                  <span className="text-[11px] font-semibold text-slate-500">Markup rápido:</span>
                  <div className="flex items-center gap-1.5">
                    {[25, 35, 45, 50].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => handleMargenChange(String(pct))}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                          Number(margenPorcentaje) === pct
                            ? "bg-indigo-600 text-white"
                            : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 text-xs font-semibold">
                  <span className="text-slate-600">Subtotal de la partida:</span>
                  <span className="text-sm font-black text-indigo-950 font-mono">
                    ${(numericCant * (parseFloat(precioUnitarioRefaccion) || 0)).toLocaleString("es-MX", {
                      minimumFractionDigits: 2,
                    })}{" "}
                    MXN
                  </span>
                </div>
              </div>

              {/* Garantía */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                    Folio Nota / Ticket
                  </label>
                  <input
                    type="text"
                    value={folioTicket}
                    onChange={(e) => setFolioTicket(e.target.value)}
                    className="w-full h-11 text-xs bg-white border border-slate-300 rounded-xl px-3 text-slate-900 font-mono"
                    placeholder="Ej. FAC-4412"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                    Garantía
                  </label>
                  <input
                    type="text"
                    value={garantiaEspecifica}
                    onChange={(e) => setGarantiaEspecifica(e.target.value)}
                    className="w-full h-11 text-xs bg-white border border-slate-300 rounded-xl px-3 text-slate-900"
                    placeholder="Ej. 12 meses con proveedor"
                  />
                </div>
              </div>
            </>
          )}

          {itemType === "llanta" && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Neumático / Medida
                </label>
                <div className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Disc className="w-5 h-5 text-amber-600 shrink-0" />
                  <span>{nombre}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                    Cantidad
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={cantidad}
                    onChange={(e) => setCantidad(parseInt(e.target.value) || 1)}
                    className="w-full h-12 text-sm bg-white border border-slate-300 rounded-xl px-3 text-center font-bold tabular-nums"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                    Precio Venta Unit. ($)
                  </label>
                  <input
                    type="number"
                    step="10"
                    value={precioCobrado}
                    onChange={(e) => setPrecioCobrado(e.target.value)}
                    className="w-full h-12 text-sm bg-white border border-slate-300 rounded-xl px-3 text-right font-black tabular-nums font-mono text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Paquete / Operación
                </label>
                <select
                  value={paquete}
                  onChange={(e) => setPaquete(e.target.value)}
                  className="w-full h-12 text-xs bg-white border border-slate-300 rounded-xl px-3 text-slate-900 font-medium"
                >
                  {DEFAULT_OPERATION_PACKAGES.map((pkg: string) => (
                    <option key={pkg} value={pkg}>
                      {pkg}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs font-semibold">
                <span className="text-amber-900">Total Neumáticos:</span>
                <span className="text-sm font-black text-amber-950 font-mono">
                  ${(numericCant * (parseFloat(precioCobrado) || 0)).toLocaleString("es-MX", {
                    minimumFractionDigits: 2,
                  })}{" "}
                  MXN
                </span>
              </div>
            </>
          )}

          {/* Botones de acción (Dirty Hands: h-12 mínimo) */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="h-12 px-5 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`h-12 px-6 rounded-xl text-white text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer ${
                itemType === "servicio"
                  ? "bg-blue-600 hover:bg-blue-700"
                  : itemType === "refaccion"
                  ? "bg-indigo-600 hover:bg-indigo-700"
                  : "bg-amber-600 hover:bg-amber-700"
              }`}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Guardando cambios...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>Guardar Cambios</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
