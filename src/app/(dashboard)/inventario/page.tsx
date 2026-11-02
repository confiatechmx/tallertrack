"use client";

import { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  Plus,
  Minus,
  MessageCircle,
  Sparkles,
  AlertTriangle,
  Edit3,
  Check,
  MapPin,
  Disc,
  Package,
  Layers,
  Wrench,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Send
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useTenant } from "@/context/TenantContext";
import { ConcurrencyService } from "@/services/concurrencyService";
import { Modal } from "@/components/ui/Modal";
import { TireForm, TireRecord } from "@/components/inventario/TireForm";
import { toast } from "sonner";

interface TireUI extends TireRecord {
  sku: string;
  dimensions: string;
}

const MOUNTING_ALIGNMENT_PACK_PRICE = 1340;

function cleanWhatsAppPhone(phone: string): string {
  const digits = (phone || "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.startsWith("52") ? digits : `52${digits}`;
}

function SkeletonRow() {
  return (
    <tr className="border-b border-slate-100 last:border-0 animate-pulse">
      <td className="px-5 py-3.5">
        <div className="h-5 bg-slate-200 rounded-lg w-28" />
      </td>
      <td className="px-5 py-3.5">
        <div className="h-4 bg-slate-200 rounded w-44 mb-1" />
        <div className="h-3 bg-slate-100 rounded w-24" />
      </td>
      <td className="px-5 py-3.5">
        <div className="h-6 bg-slate-200 rounded-lg w-24" />
      </td>
      <td className="px-5 py-3.5">
        <div className="h-5 bg-slate-200 rounded w-16" />
      </td>
      <td className="px-5 py-3.5 text-right">
        <div className="h-5 bg-slate-200 rounded w-20 ml-auto" />
      </td>
      <td className="px-5 py-3.5 text-center">
        <div className="h-7 bg-slate-200 rounded-lg w-24 mx-auto" />
      </td>
      <td className="px-5 py-3.5 text-right">
        <div className="h-7 bg-slate-200 rounded-lg w-20 ml-auto" />
      </td>
    </tr>
  );
}

function InventarioContent() {
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") || "";
  const { empresa, sucursalActiva } = useTenant();
  const router = useRouter();

  const [inventory, setInventory] = useState<TireUI[]>([]);
  const [loading, setLoading] = useState(true);

  // Active top view: 'SELECTOR_3TIER' | 'CATALOG'
  const [activeView, setActiveView] = useState<'SELECTOR_3TIER' | 'CATALOG'>('SELECTOR_3TIER');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState(initialQ);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [selectedRim, setSelectedRim] = useState<number | null>(null);
  const [onlyLowStock, setOnlyLowStock] = useState(false);

  // Quick Visual Size Selector (3-Tier) state
  const [filterWidth, setFilterWidth] = useState<string>('205');
  const [filterAspect, setFilterAspect] = useState<string>('55');
  const [filterRim, setFilterRim] = useState<string>('16');
  const [quoteQuantity, setQuoteQuantity] = useState<number>(4);
  const [includeMountAlign, setIncludeMountAlign] = useState<boolean>(true);
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');

  // Tire Form Modal
  const [isTireModalOpen, setIsTireModalOpen] = useState(false);
  const [editingTire, setEditingTire] = useState<TireUI | null>(null);

  useEffect(() => {
    if (initialQ) {
      setSearchQuery(initialQ);
      setActiveView('CATALOG');
    }
  }, [initialQ]);

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    let query = supabase
      .from("inventario_llantas")
      .select("*")
      .order("marca", { ascending: true });

    if (sucursalActiva?.id) {
      query = query.eq("sucursal_id", sucursalActiva.id);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching inventory:", error);
    } else if (data) {
      const formatted: TireUI[] = data.map((d: any) => ({
        id: d.id,
        sku: `${(d.marca || "LLN").substring(0, 3).toUpperCase()}-${(
          d.modelo_llanta || "MOD"
        )
          .substring(0, 3)
          .toUpperCase()
          .replace(/\s/g, "")}-${d.ancho}${d.perfil}R${d.rin}`,
        marca: d.marca,
        modelo_llanta: d.modelo_llanta,
        ancho: Number(d.ancho),
        perfil: Number(d.perfil),
        rin: Number(d.rin),
        indice_carga_velocidad: d.indice_carga_velocidad || "91V",
        tipo_terreno: d.tipo_terreno || "HT",
        dimensions: `${d.ancho}/${d.perfil} R${d.rin}`,
        stock_actual: Number(d.stock_actual ?? 0),
        stock_minimo: Number(d.stock_minimo ?? 4),
        precio_venta: Number(d.precio_venta ?? 0),
        costo_adquisicion: Number(
          d.costo_adquisicion ?? Number(d.precio_venta ?? 0) * 0.68
        ),
        ubicacion_rack: d.ubicacion_rack || "RACK-A1",
        dot_anio: d.dot_anio || "4024",
        sucursal_id: d.sucursal_id || null,
      }));
      setInventory(formatted);

      // Pre-select popular dimensions if available
      if (formatted.length > 0) {
        const has205 = formatted.some((t) => t.ancho === 205 && t.perfil === 55 && t.rin === 16);
        if (!has205) {
          setFilterWidth(String(formatted[0].ancho));
          setFilterAspect(String(formatted[0].perfil));
          setFilterRim(String(formatted[0].rin));
        }
      }
    }
    setLoading(false);
  }, [sucursalActiva?.id]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const handleAdjustStock = async (item: TireUI, delta: number) => {
    if (item.stock_actual + delta < 0) return;

    // Optimistic UI mutation
    const targetStock = item.stock_actual + delta;
    setInventory((prev) =>
      prev.map((t) => (t.id === item.id ? { ...t, stock_actual: targetStock } : t))
    );

    // Atomic locked adjustment on backend
    const res = await ConcurrencyService.ajustarStock({
      llantaId: item.id,
      delta,
      permitirNegativo: false,
    });

    if (!res.success) {
      toast.error(res.message || "Conflicto de stock al actualizar inventario");
      await fetchInventory();
      return;
    }

    if (typeof res.nuevo_stock === 'number') {
      setInventory((prev) =>
        prev.map((t) => (t.id === item.id ? { ...t, stock_actual: res.nuevo_stock! } : t))
      );
    }
  };

  const uniqueWidths = useMemo(() => Array.from(new Set(inventory.map((i) => i.ancho))).sort((a, b) => a - b), [inventory]);
  const uniqueAspects = useMemo(() => Array.from(new Set(inventory.map((i) => i.perfil))).sort((a, b) => a - b), [inventory]);
  const uniqueRims = useMemo(() => Array.from(new Set(inventory.map((i) => i.rin))).sort((a, b) => a - b), [inventory]);
  const uniqueBrands = useMemo(() => Array.from(new Set(inventory.map((i) => i.marca))).sort(), [inventory]);

  // Compute 3 Options for selected size
  const matchingSizeTires = useMemo(() => {
    return inventory
      .filter((t) => {
        const matchW = filterWidth ? t.ancho === Number(filterWidth) : true;
        const matchA = filterAspect ? t.perfil === Number(filterAspect) : true;
        const matchR = filterRim ? t.rin === Number(filterRim) : true;
        return matchW && matchA && matchR;
      })
      .sort((a, b) => a.precio_venta - b.precio_venta);
  }, [inventory, filterWidth, filterAspect, filterRim]);

  // Pick 3 tiers: Budget, Mid/Recommended, Premium
  const tierBudget = matchingSizeTires[0] || null;
  const tierMid = matchingSizeTires.length > 2 ? matchingSizeTires[Math.floor(matchingSizeTires.length / 2)] : (matchingSizeTires[1] || null);
  const tierPremium = matchingSizeTires.length > 1 ? matchingSizeTires[matchingSizeTires.length - 1] : null;

  // Filter for General Catalog
  const filteredCatalog = inventory.filter((item) => {
    if (onlyLowStock && item.stock_actual > item.stock_minimo) return false;
    if (selectedBrand && item.marca !== selectedBrand) return false;
    if (selectedRim && item.rin !== selectedRim) return false;

    if (!searchQuery.trim()) return true;
    const qNorm = searchQuery.toLowerCase().replace(/\s+/g, "");
    const dimNorm = item.dimensions.toLowerCase().replace(/\s+/g, "");
    const matchSearch =
      item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.modelo_llanta.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.marca.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.dimensions.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dimNorm.includes(qNorm) ||
      (item.ubicacion_rack || "").toLowerCase().includes(searchQuery.toLowerCase());

    return matchSearch;
  });

  const totalUnits = inventory.reduce((acc, i) => acc + i.stock_actual, 0);
  const lowStockCount = inventory.filter((i) => i.stock_actual <= i.stock_minimo).length;
  const inventoryCostValue = inventory.reduce(
    (acc, i) => acc + i.stock_actual * Number(i.costo_adquisicion || 0),
    0
  );

  // Send Single Tire or 3-Tier Quote via WhatsApp
  const handleSendWhatsAppQuote = (singleTire?: TireUI) => {
    const shopName = empresa?.nombre_comercial || "Cova Centro Automotriz";
    const phone = cleanWhatsAppPhone(customerPhone);
    const clientGreeting = customerName ? `Hola *${customerName}*` : 'Hola estimado cliente';

    if (singleTire) {
      const tiresSub = singleTire.precio_venta * quoteQuantity;
      const pack = includeMountAlign ? MOUNTING_ALIGNMENT_PACK_PRICE : 0;
      const grandTotal = tiresSub + pack;

      const lines = [
        `${clientGreeting}, te compartimos la cotización de neumáticos solicitada en *${shopName}*:`,
        '',
        `• *Llanta:* ${singleTire.marca} ${singleTire.modelo_llanta} (${singleTire.dimensions} ${singleTire.indice_carga_velocidad})`,
        `• *Cantidad:* ${quoteQuantity} pieza(s)`,
        `• *Precio unitario:* $${singleTire.precio_venta.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN`,
        `• *Subtotal llantas:* $${tiresSub.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN`,
      ];

      if (includeMountAlign) {
        lines.push(`• *Paquete Llave en Mano:* Montaje, válvulas nuevas, balanceo y alineación 3D (+$$${MOUNTING_ALIGNMENT_PACK_PRICE.toLocaleString('es-MX')} MXN)`);
      }

      lines.push('');
      lines.push(`👉 *Total: $${grandTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN*`);
      lines.push(`• *Existencia disponible:* ${singleTire.stock_actual} pzas (Ubicación: ${singleTire.ubicacion_rack})`);
      lines.push('');
      lines.push('¿Deseas apartar tus llantas y agendar cita de instalación para hoy?');

      const url = `https://wa.me/${phone}?text=${encodeURIComponent(lines.join('\n'))}`;
      window.open(url, '_blank');
      return;
    }

    // 3-Tier WhatsApp message
    const lines = [
      `${clientGreeting}, te compartimos la comparativa de 3 gamas para medida *${filterWidth}/${filterAspect} R${filterRim}* (${quoteQuantity} piezas) en *${shopName}*:`,
      '',
    ];

    const tiers = [
      { label: 'OPCIÓN 1 · GAMA ECONÓMICA / VALOR', tire: tierBudget },
      { label: 'OPCIÓN 2 · GAMA INTERMEDIA (RECOMENDADA ⭐)', tire: tierMid },
      { label: 'OPCIÓN 3 · GAMA PREMIUM OEM', tire: tierPremium },
    ].filter((t) => Boolean(t.tire));

    tiers.forEach((t) => {
      const tire = t.tire!;
      const tiresSub = tire.precio_venta * quoteQuantity;
      const pack = includeMountAlign ? MOUNTING_ALIGNMENT_PACK_PRICE : 0;
      const grandTotal = tiresSub + pack;

      lines.push(`*${t.label}*`);
      lines.push(`• *${tire.marca} ${tire.modelo_llanta}* (${tire.dimensions} ${tire.indice_carga_velocidad})`);
      lines.push(`• Unitario: $${tire.precio_venta.toLocaleString('es-MX', { minimumFractionDigits: 2 })} x ${quoteQuantity} = $${tiresSub.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`);
      if (includeMountAlign) {
        lines.push(`• Incluye Montaje, Válvulas, Balanceo y Alineación (+$$${MOUNTING_ALIGNMENT_PACK_PRICE.toLocaleString('es-MX')})`);
      }
      lines.push(`👉 *Total llave en mano: $${grandTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN* (Stock: ${tire.stock_actual} pzas)`);
      lines.push('');
    });

    lines.push('¿Con cuál de las 3 opciones te gustaría que apartemos tus llantas?');

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(lines.join('\n'))}`;
    window.open(url, '_blank');
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Top Header & Metrics */}
      <div className="bg-white p-4 lg:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row justify-between sm:items-center gap-3 shrink-0">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Catálogo de Neumáticos & Stock
            </h1>
            <span className="bg-slate-100 text-slate-700 border border-slate-200/80 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold">
              {inventory.length} SKUs · {totalUnits} pzas en stock
            </span>
            <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full text-xs font-mono font-bold hidden sm:inline">
              Valor Inventario: ${inventoryCostValue.toLocaleString("es-MX", { maximumFractionDigits: 0 })}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Buscador visual por medida en 3 niveles (Económica / Calidad / Premium) y control atómico de existencias.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {lowStockCount > 0 && (
            <button
              onClick={() => {
                setActiveView('CATALOG');
                setOnlyLowStock(!onlyLowStock);
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                onlyLowStock
                  ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                  : "bg-amber-50 text-amber-900 border-amber-200/80 hover:bg-amber-100"
              }`}
              title="Filtrar llantas con stock bajo"
            >
              <AlertTriangle size={13} className="shrink-0" />
              <span>Stock Bajo ({lowStockCount})</span>
            </button>
          )}

          <button
            onClick={() => {
              setEditingTire(null);
              setIsTireModalOpen(true);
            }}
            className="flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <Plus size={14} strokeWidth={2.5} />
            + Agregar Llanta
          </button>
        </div>
      </div>

      {/* Top View Mode Navigation Pills */}
      <div className="flex items-center gap-2 bg-slate-200/70 p-1 rounded-2xl w-fit">
        <button
          onClick={() => setActiveView('SELECTOR_3TIER')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeView === 'SELECTOR_3TIER'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-500" />
          Buscador Visual por Medida (3 Opciones)
        </button>

        <button
          onClick={() => setActiveView('CATALOG')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeView === 'CATALOG'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers className="w-4 h-4 text-blue-600" />
          Catálogo & Control de Stock ({inventory.length})
        </button>
      </div>

      {/* VIEW 1: SELECTOR VISUAL 3-TIER */}
      {activeView === 'SELECTOR_3TIER' && (
        <div className="space-y-4">
          
          {/* Quick 3-Dropdown Size Matrix Panel */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Selecciona la Medida del Neumático</h2>
                <p className="text-xs text-slate-500">
                  El sistema agrupa automáticamente las mejores opciones en 3 niveles de precio con stock real.
                </p>
              </div>

              {/* Quantity Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cantidad:</span>
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                  {[
                    { qty: 1, label: '1 pza' },
                    { qty: 2, label: '2 pzas (Par)' },
                    { qty: 4, label: '4 pzas (Juego)' },
                  ].map((q) => (
                    <button
                      key={q.qty}
                      onClick={() => setQuoteQuantity(q.qty)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        quoteQuantity === q.qty
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* The 3 Big Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  1. Ancho (mm)
                </label>
                <select
                  value={filterWidth}
                  onChange={(e) => setFilterWidth(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:border-slate-400 shadow-2xs"
                >
                  {uniqueWidths.map((w) => (
                    <option key={w} value={w}>
                      {w} mm
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  2. Perfil (%)
                </label>
                <select
                  value={filterAspect}
                  onChange={(e) => setFilterAspect(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:border-slate-400 shadow-2xs"
                >
                  {uniqueAspects.map((a) => (
                    <option key={a} value={a}>
                      Perfil {a}
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  3. Diámetro Rin (Pulgadas)
                </label>
                <select
                  value={filterRim}
                  onChange={(e) => setFilterRim(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:border-slate-400 shadow-2xs"
                >
                  {uniqueRims.map((r) => (
                    <option key={r} value={r}>
                      Rin {r}"
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Mounting Package & Customer WhatsApp Info Ribbon */}
            <div className="pt-3 border-t border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeMountAlign}
                  onChange={(e) => setIncludeMountAlign(e.target.checked)}
                  className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 h-4 w-4"
                />
                <span className="text-xs font-semibold text-slate-700">
                  Incluir Paquete Completo (Montaje, Válvulas, Balanceo y Alineación 3D +$$${MOUNTING_ALIGNMENT_PACK_PRICE.toLocaleString('es-MX')})
                </span>
              </label>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="WhatsApp del Cliente (opcional)..."
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white w-48 font-mono"
                />
                <button
                  onClick={() => handleSendWhatsAppQuote()}
                  disabled={matchingSizeTires.length === 0}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50"
                  title="Enviar comparativa completa de las 3 opciones por WhatsApp"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  Enviar 3 Opciones
                </button>
              </div>
            </div>
          </div>

          {/* 3 COMPARISON CARDS (BUDGET / MID / PREMIUM) */}
          {matchingSizeTires.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center">
              <Disc className="w-12 h-12 text-slate-300 mx-auto mb-3 animate-spin-slow" />
              <h3 className="text-sm font-bold text-slate-800">
                No hay stock para la medida {filterWidth}/{filterAspect} R{filterRim}
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto mb-4">
                Prueba seleccionando otra medida de rin o agrega neumáticos de esta medida a tu inventario.
              </p>
              <button
                onClick={() => {
                  setEditingTire(null);
                  setIsTireModalOpen(true);
                }}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors"
              >
                + Dar de Alta Llanta {filterWidth}/{filterAspect} R{filterRim}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* TIER 1: ECONÓMICA */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 flex flex-col justify-between hover:border-slate-300 transition-all">
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                      🥉 Opción Económica / Valor
                    </span>
                    {tierBudget && (
                      <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded-lg ${
                        tierBudget.stock_actual > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                      }`}>
                        {tierBudget.stock_actual} en stock
                      </span>
                    )}
                  </div>

                  {tierBudget ? (
                    <>
                      <h3 className="text-base font-bold text-slate-900 tracking-tight">
                        {tierBudget.marca} {tierBudget.modelo_llanta}
                      </h3>
                      <p className="text-xs font-mono font-medium text-blue-700 mt-0.5">
                        {tierBudget.dimensions} {tierBudget.indice_carga_velocidad} • {tierBudget.tipo_terreno}
                      </p>

                      <div className="bg-slate-50 rounded-xl p-3 my-4 space-y-1.5 border border-slate-100">
                        <div className="flex justify-between text-xs text-slate-600">
                          <span>Unitario:</span>
                          <span className="font-bold text-slate-900">
                            $$${tierBudget.precio_venta.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs text-slate-600">
                          <span>{quoteQuantity} llantas:</span>
                          <span className="font-bold text-slate-900">
                            $$${(tierBudget.precio_venta * quoteQuantity).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        {includeMountAlign && (
                          <div className="flex justify-between text-xs text-slate-500 pt-1 border-t border-slate-200">
                            <span>Instalación & Alineación:</span>
                            <span className="font-medium text-slate-700">+$$${MOUNTING_ALIGNMENT_PACK_PRICE.toLocaleString('es-MX')}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-200">
                          <span>Total Llave en Mano:</span>
                          <span className="text-emerald-700">
                            $$${((tierBudget.precio_venta * quoteQuantity) + (includeMountAlign ? MOUNTING_ALIGNMENT_PACK_PRICE : 0)).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-400 flex items-center justify-between">
                        <span>Rack: {tierBudget.ubicacion_rack || 'RACK-A1'}</span>
                        <span>DOT: {tierBudget.dot_anio || 'Reciente'}</span>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No disponible en esta medida</p>
                  )}
                </div>

                {tierBudget && (
                  <div className="space-y-2 mt-5 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => handleSendWhatsAppQuote(tierBudget)}
                      className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200 transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      Enviar esta Opción por WhatsApp
                    </button>
                    <button
                      onClick={() => router.push(`/tablero?nuevaOrden=1&llantaId=${tierBudget.id}`)}
                      className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      + Agregar a Orden de Servicio
                    </button>
                  </div>
                )}
              </div>

              {/* TIER 2: RECOMENDADA / EQUILIBRIO */}
              <div className="bg-blue-50/20 rounded-2xl border-2 border-blue-500 shadow-sm p-5 flex flex-col justify-between relative">
                <div className="absolute -top-3 right-5 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-xs">
                  Opción Recomendada ⭐
                </div>

                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-full">
                      🥈 Opción Calidad / Equilibrio
                    </span>
                    {tierMid && (
                      <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded-lg ${
                        tierMid.stock_actual > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                      }`}>
                        {tierMid.stock_actual} en stock
                      </span>
                    )}
                  </div>

                  {tierMid ? (
                    <>
                      <h3 className="text-base font-bold text-slate-900 tracking-tight">
                        {tierMid.marca} {tierMid.modelo_llanta}
                      </h3>
                      <p className="text-xs font-mono font-medium text-blue-700 mt-0.5">
                        {tierMid.dimensions} {tierMid.indice_carga_velocidad} • {tierMid.tipo_terreno}
                      </p>

                      <div className="bg-white rounded-xl p-3 my-4 space-y-1.5 border border-blue-200/80 shadow-2xs">
                        <div className="flex justify-between text-xs text-slate-600">
                          <span>Unitario:</span>
                          <span className="font-bold text-slate-900">
                            $$${tierMid.precio_venta.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs text-slate-600">
                          <span>{quoteQuantity} llantas:</span>
                          <span className="font-bold text-slate-900">
                            $$${(tierMid.precio_venta * quoteQuantity).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        {includeMountAlign && (
                          <div className="flex justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
                            <span>Instalación & Alineación:</span>
                            <span className="font-medium text-slate-700">+$$${MOUNTING_ALIGNMENT_PACK_PRICE.toLocaleString('es-MX')}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-200">
                          <span>Total Llave en Mano:</span>
                          <span className="text-blue-700">
                            $$${((tierMid.precio_venta * quoteQuantity) + (includeMountAlign ? MOUNTING_ALIGNMENT_PACK_PRICE : 0)).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-400 flex items-center justify-between">
                        <span>Rack: {tierMid.ubicacion_rack || 'RACK-A1'}</span>
                        <span>DOT: {tierMid.dot_anio || 'Reciente'}</span>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No disponible en esta medida</p>
                  )}
                </div>

                {tierMid && (
                  <div className="space-y-2 mt-5 pt-3 border-t border-blue-200/60">
                    <button
                      onClick={() => handleSendWhatsAppQuote(tierMid)}
                      className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-xs"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      Enviar esta Opción por WhatsApp
                    </button>
                    <button
                      onClick={() => router.push(`/tablero?nuevaOrden=1&llantaId=${tierMid.id}`)}
                      className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      + Agregar a Orden de Servicio
                    </button>
                  </div>
                )}
              </div>

              {/* TIER 3: PREMIUM OEM */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 flex flex-col justify-between hover:border-slate-300 transition-all">
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-full">
                      🥇 Opción Premium OEM
                    </span>
                    {tierPremium && (
                      <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded-lg ${
                        tierPremium.stock_actual > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                      }`}>
                        {tierPremium.stock_actual} en stock
                      </span>
                    )}
                  </div>

                  {tierPremium ? (
                    <>
                      <h3 className="text-base font-bold text-slate-900 tracking-tight">
                        {tierPremium.marca} {tierPremium.modelo_llanta}
                      </h3>
                      <p className="text-xs font-mono font-medium text-blue-700 mt-0.5">
                        {tierPremium.dimensions} {tierPremium.indice_carga_velocidad} • {tierPremium.tipo_terreno}
                      </p>

                      <div className="bg-slate-50 rounded-xl p-3 my-4 space-y-1.5 border border-slate-100">
                        <div className="flex justify-between text-xs text-slate-600">
                          <span>Unitario:</span>
                          <span className="font-bold text-slate-900">
                            $$${tierPremium.precio_venta.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs text-slate-600">
                          <span>{quoteQuantity} llantas:</span>
                          <span className="font-bold text-slate-900">
                            $$${(tierPremium.precio_venta * quoteQuantity).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        {includeMountAlign && (
                          <div className="flex justify-between text-xs text-slate-500 pt-1 border-t border-slate-200">
                            <span>Instalación & Alineación:</span>
                            <span className="font-medium text-slate-700">+$$${MOUNTING_ALIGNMENT_PACK_PRICE.toLocaleString('es-MX')}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-200">
                          <span>Total Llave en Mano:</span>
                          <span className="text-slate-900">
                            $$${((tierPremium.precio_venta * quoteQuantity) + (includeMountAlign ? MOUNTING_ALIGNMENT_PACK_PRICE : 0)).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-400 flex items-center justify-between">
                        <span>Rack: {tierPremium.ubicacion_rack || 'RACK-A1'}</span>
                        <span>DOT: {tierPremium.dot_anio || 'Reciente'}</span>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No disponible en esta medida</p>
                  )}
                </div>

                {tierPremium && (
                  <div className="space-y-2 mt-5 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => handleSendWhatsAppQuote(tierPremium)}
                      className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200 transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      Enviar esta Opción por WhatsApp
                    </button>
                    <button
                      onClick={() => router.push(`/tablero?nuevaOrden=1&llantaId=${tierPremium.id}`)}
                      className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      + Agregar a Orden de Servicio
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: GENERAL CATALOG & STOCK */}
      {activeView === 'CATALOG' && (
        <div className="space-y-3 flex-1 flex flex-col">
          {/* Filter Toolbar */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 shrink-0">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Search size={14} className="text-slate-400" />
                </div>
                <input
                  type="text"
                  placeholder="Buscar por medida (ej. 205/55 R16), marca, modelo o SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-9 pr-7 py-2 border border-slate-200 rounded-xl bg-slate-50/70 text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white text-xs transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute inset-y-0 right-2.5 flex items-center text-slate-400 hover:text-slate-700 text-xs font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Rim Pills */}
              <div className="flex items-center gap-1 overflow-x-auto dense-scrollbar">
                <span className="text-[11px] font-bold text-slate-400 uppercase mr-1">Rin:</span>
                <button
                  onClick={() => setSelectedRim(null)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-colors ${
                    selectedRim === null
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Todos
                </button>
                {uniqueRims.map((rin) => (
                  <button
                    key={rin}
                    onClick={() => setSelectedRim(selectedRim === rin ? null : rin)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-colors ${
                      selectedRim === rin
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    R{rin}
                  </button>
                ))}
              </div>
            </div>

            {/* Brand Filters */}
            <div className="flex items-center gap-1 overflow-x-auto dense-scrollbar">
              <span className="text-[11px] font-bold text-slate-400 uppercase mr-1">Marca:</span>
              {uniqueBrands.map((brand) => (
                <button
                  key={brand}
                  onClick={() => setSelectedBrand(selectedBrand === brand ? null : brand)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                    selectedBrand === brand
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {brand}
                </button>
              ))}
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex-1 flex flex-col">
            <div className="overflow-x-auto flex-1 dense-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-50/95 backdrop-blur-xs z-10 border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3 text-[11px] tracking-wider text-slate-500 font-bold uppercase">
                      SKU / Rack
                    </th>
                    <th className="px-5 py-3 text-[11px] tracking-wider text-slate-500 font-bold uppercase">
                      Marca y Modelo
                    </th>
                    <th className="px-5 py-3 text-[11px] tracking-wider text-slate-500 font-bold uppercase">
                      Medida / Índice
                    </th>
                    <th className="px-5 py-3 text-[11px] tracking-wider text-slate-500 font-bold uppercase">
                      Terreno / DOT
                    </th>
                    <th className="px-5 py-3 text-[11px] tracking-wider text-slate-500 font-bold uppercase text-right">
                      Precio Público
                    </th>
                    <th className="px-5 py-3 text-[11px] tracking-wider text-slate-500 font-bold uppercase text-center">
                      Stock Actual
                    </th>
                    <th className="px-5 py-3 text-[11px] tracking-wider text-slate-500 font-bold uppercase text-right">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <>
                      <SkeletonRow />
                      <SkeletonRow />
                      <SkeletonRow />
                      <SkeletonRow />
                      <SkeletonRow />
                    </>
                  ) : filteredCatalog.length > 0 ? (
                    filteredCatalog.map((item) => {
                      const precio = Number(item.precio_venta || 0);
                      const isLow = item.stock_actual <= item.stock_minimo;
                      const isZero = item.stock_actual === 0;

                      return (
                        <tr
                          key={item.id}
                          className="border-b border-slate-100 last:border-0 hover:bg-slate-50/80 transition-colors group"
                        >
                          {/* SKU + Rack */}
                          <td className="px-5 py-3.5 align-middle">
                            <div className="flex flex-col gap-1">
                              <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200 w-fit">
                                {item.sku}
                              </span>
                              <span className="text-[10px] font-mono text-slate-500 inline-flex items-center gap-1">
                                <MapPin size={10} className="text-slate-400" />
                                {item.ubicacion_rack || "RACK-A1"}
                              </span>
                            </div>
                          </td>

                          {/* Marca y Modelo */}
                          <td className="px-5 py-3.5 align-middle">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900 text-sm tracking-tight">
                                {item.marca} {item.modelo_llanta}
                              </span>
                              <span className="text-xs text-slate-500">
                                Juego de 4: $$${(precio * 4).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          </td>

                          {/* Medida */}
                          <td className="px-5 py-3.5 align-middle">
                            <span className="font-mono text-xs font-bold text-blue-800 bg-blue-50 border border-blue-200/80 px-2.5 py-1 rounded-xl">
                              {item.dimensions} {item.indice_carga_velocidad}
                            </span>
                          </td>

                          {/* Terreno / DOT */}
                          <td className="px-5 py-3.5 align-middle">
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md w-fit">
                                {item.tipo_terreno}
                              </span>
                              {item.dot_anio && (
                                <span className="text-[10px] font-mono text-slate-400">
                                  DOT: {item.dot_anio}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Precio Público */}
                          <td className="px-5 py-3.5 align-middle text-right">
                            <span className="font-mono text-sm font-black text-slate-900">
                              $$${precio.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                            </span>
                          </td>

                          {/* Stock con ajuste rápido + / - */}
                          <td className="px-5 py-3.5 align-middle text-center">
                            <div className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl p-1">
                              <button
                                type="button"
                                onClick={() => handleAdjustStock(item, -1)}
                                disabled={item.stock_actual <= 0}
                                className="p-1 rounded-lg hover:bg-slate-200 text-slate-600 disabled:opacity-30 cursor-pointer"
                                title="Descontar 1 unidad"
                              >
                                <Minus size={11} />
                              </button>
                              <span
                                className={`font-mono text-xs font-bold px-2.5 py-0.5 rounded-lg min-w-[32px] ${
                                  isZero
                                    ? "bg-red-100 text-red-700"
                                    : isLow
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-emerald-100 text-emerald-800"
                                }`}
                              >
                                {item.stock_actual}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleAdjustStock(item, 1)}
                                className="p-1 rounded-lg hover:bg-slate-200 text-slate-600 cursor-pointer"
                                title="Sumar 1 unidad"
                              >
                                <Plus size={11} />
                              </button>
                            </div>
                          </td>

                          {/* Acciones */}
                          <td className="px-5 py-3.5 align-middle text-right">
                            <div className="inline-flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setFilterWidth(String(item.ancho));
                                  setFilterAspect(String(item.perfil));
                                  setFilterRim(String(item.rin));
                                  setActiveView('SELECTOR_3TIER');
                                }}
                                className="px-2.5 py-1 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-colors cursor-pointer"
                                title="Ver comparativa de 3 niveles para esta medida"
                              >
                                3 Opciones
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingTire(item);
                                  setIsTireModalOpen(true);
                                }}
                                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                                title="Editar neumático"
                              >
                                <Edit3 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-slate-500 text-xs">
                        <div className="flex flex-col items-center gap-2">
                          <Package size={28} className="text-slate-300" />
                          <span>No se encontraron neumáticos con los filtros seleccionados.</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Agregar / Editar Llanta */}
      <Modal
        isOpen={isTireModalOpen}
        onClose={() => {
          setIsTireModalOpen(false);
          setEditingTire(null);
        }}
        title={editingTire ? "Editar Neumático en Catálogo" : "Registrar Nueva Llanta"}
        description="Especificaciones técnicas, ubicación en rack, DOT, costo y precio público."
      >
        <TireForm
          initialData={editingTire}
          onSuccess={() => {
            setIsTireModalOpen(false);
            setEditingTire(null);
            fetchInventory();
          }}
          onCancel={() => {
            setIsTireModalOpen(false);
            setEditingTire(null);
          }}
        />
      </Modal>
    </div>
  );
}

export default function InventarioPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      }
    >
      <InventarioContent />
    </Suspense>
  );
}
