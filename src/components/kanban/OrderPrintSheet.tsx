"use client";
import TenantBrandLogo from "@/components/brand/TenantBrandLogo";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTenant } from "@/context/TenantContext";
import {
  Printer,
  CheckCircle2,
  ShieldCheck,
  Car,
  User,
  Fuel,
  Gauge,
  Wrench,
  FileCheck2,
  MapPin,
  Phone,
  Globe,
  AlertTriangle,
  History,
  ShieldAlert,
} from "lucide-react";

interface OrderPrintSheetProps {
  order: any;
  mechanicName?: string;
  isStandalone?: boolean;
}

const CHECKLIST_LABELS: Record<string, string> = {
  llanta_refaccion: "Llanta de refacción",
  gato_herramienta: "Gato y herramienta",
  tarjeta_circulacion: "Tarjeta de circulación",
  objetos_valor: "Objetos de valor retirados",
  birlo_seguridad: "Llave / Birlo de seguridad",
};

const FUEL_LEVELS = ["Vacío", "1/4", "1/2", "3/4", "Lleno"];

export function OrderPrintSheet({ order, mechanicName, isStandalone = false }: OrderPrintSheetProps) {
  const { empresa: tenantEmpresa, sucursales: tenantSucursales } = useTenant();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!order) return null;

  // Resilient resolution supporting both modal format and portal/standalone format
  const activeEmpresa = order.empresa || tenantEmpresa;
  const sucursales = tenantSucursales || [];
  const activeSucursal =
    order.sucursal ||
    sucursales.find((s) => s.id === order.sucursal_id) ||
    sucursales[0] ||
    null;

  const v = order.vehiculo || order.vehiculos || {};
  const c = order.cliente || v.clientes || {};
  const folioFormatted = `#${1000 + Number(order.folio || 1)}`;
  const primaryColor = activeEmpresa?.color_primario || "#1C3EFF";

  const checklist: Record<string, boolean> =
    typeof order.checklist_recepcion === "object" && order.checklist_recepcion !== null
      ? order.checklist_recepcion
      : {
          llanta_refaccion: true,
          gato_herramienta: true,
          tarjeta_circulacion: true,
          objetos_valor: false,
          birlo_seguridad: true,
        };

  // Raw items resolution
  const rawServices = order.servicios || order.orden_servicio_servicios || [];
  const rawParts = order.refacciones || order.orden_servicio_refacciones || [];
  const rawTires = order.llantas || order.cotizaciones?.detalles_cotizacion || [];
  const rawDvi = order.dvi || order.inspecciones_dvi || [];
  const rawDeferredWorks = order.trabajos_diferidos || [];

  // Authorized / Executed Items
  const services = rawServices.filter(
    (s: any) => s.estatus_aprobacion !== "Diferido" && s.estatus_aprobacion !== "Rechazado"
  );
  const parts = rawParts.filter(
    (r: any) => r.estatus_aprobacion !== "Diferido" && r.estatus_aprobacion !== "Rechazado"
  );
  const tires = rawTires.filter(
    (t: any) => t.estatus_aprobacion !== "Diferido" && t.estatus_aprobacion !== "Rechazado"
  );

  // Deferred / Quoted but Not Authorized Items
  const deferredServices = rawServices.filter(
    (s: any) => s.estatus_aprobacion === "Diferido" || s.estatus_aprobacion === "Rechazado"
  );
  const deferredParts = rawParts.filter(
    (r: any) => r.estatus_aprobacion === "Diferido" || r.estatus_aprobacion === "Rechazado"
  );
  const deferredTires = rawTires.filter(
    (t: any) => t.estatus_aprobacion === "Diferido" || t.estatus_aprobacion === "Rechazado"
  );

  // Totals for Authorized Work
  const subtotalServicios = services.reduce(
    (acc: number, s: any) => acc + Number(s.precio_cobrado || 0) * Number(s.cantidad || 1),
    0
  );
  const subtotalRefacciones = parts.reduce((acc: number, r: any) => {
    const val = r.subtotal != null ? Number(r.subtotal) : Number(r.precio_unitario || 0) * Number(r.cantidad || 1);
    return acc + val;
  }, 0);
  const subtotalLlantas = tires.reduce((acc: number, t: any) => {
    const val = t.subtotal != null ? Number(t.subtotal) : Number(t.precio_unitario || 0) * Number(t.cantidad || 1);
    return acc + val;
  }, 0);
  const granTotal = subtotalServicios + subtotalRefacciones + subtotalLlantas;

  // Totals for Deferred Work
  const subtotalDiferidoServicios = deferredServices.reduce(
    (acc: number, s: any) => acc + Number(s.precio_cobrado || 0) * Number(s.cantidad || 1),
    0
  );
  const subtotalDiferidoRefacciones = deferredParts.reduce((acc: number, r: any) => {
    const val = r.subtotal != null ? Number(r.subtotal) : Number(r.precio_unitario || 0) * Number(r.cantidad || 1);
    return acc + val;
  }, 0);
  const subtotalDiferidoLlantas = deferredTires.reduce((acc: number, t: any) => {
    const val = t.subtotal != null ? Number(t.subtotal) : Number(t.precio_unitario || 0) * Number(t.cantidad || 1);
    return acc + val;
  }, 0);
  const subtotalDiferidoItems = subtotalDiferidoServicios + subtotalDiferidoRefacciones + subtotalDiferidoLlantas;

  const hasDeferred =
    deferredServices.length > 0 ||
    deferredParts.length > 0 ||
    deferredTires.length > 0 ||
    rawDeferredWorks.length > 0;

  const totalDiferidoDisplay = subtotalDiferidoItems > 0
    ? subtotalDiferidoItems
    : rawDeferredWorks.reduce((acc: number, dw: any) => acc + Number(dw.costo_estimado || 0), 0);

  // Payments & Balance
  const pagos = order.pagos || order.pagos_orden || [];
  const pagosAprobados = pagos.filter(
    (p: any) => (p.estatus === "Aprobado" || !p.estatus || p.estatus.toLowerCase() !== "cancelado") && !p.deleted_at
  );
  const totalPagado = pagosAprobados.reduce((acc: number, p: any) => acc + Number(p.monto_total || 0), 0);
  const saldoPendiente = Math.max(0, granTotal - totalPagado);

  const tasaIva = Number(activeEmpresa?.tasa_iva ?? 16);
  const subtotalSinIva = granTotal / (1 + tasaIva / 100);
  const ivaCalculado = granTotal - subtotalSinIva;

  const handlePrint = () => {
    window.print();
  };

  const sheetDocument = (
    <div className="bg-white text-slate-900 border border-slate-200 rounded-lg shadow-sm print:shadow-none print:border-0 p-4 sm:p-5 print:p-0 max-w-4xl mx-auto text-xs leading-normal font-sans">
      {/* ─── 1. TOP BANNER / BRAND HEADER (Compacto & Institucional) ─── */}
      <div
        className="flex justify-between items-start pb-2.5 mb-2.5 border-b-2"
        style={{ borderColor: primaryColor }}
      >
        <div className="flex items-center gap-3">
          <TenantBrandLogo
            empresa={activeEmpresa}
            size="lg"
            variant="light"
            className="shrink-0"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-black text-slate-900 tracking-tight uppercase">
                {activeEmpresa?.nombre_comercial || "Cova - Taller & Llantera"}
              </h1>
              {activeEmpresa?.eslogan && (
                <span className="hidden sm:inline-block text-[10px] font-medium text-slate-500 border-l border-slate-300 pl-2">
                  {activeEmpresa.eslogan}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[9.5px] text-slate-500 mt-0.5">
              {activeEmpresa?.rfc && (
                <span className="font-mono font-bold text-slate-700">RFC: {activeEmpresa.rfc}</span>
              )}
              {activeSucursal?.nombre && (
                <span className="font-medium text-slate-700">Sucursal: {activeSucursal.nombre}</span>
              )}
              {(activeSucursal?.direccion || activeEmpresa?.direccion) && (
                <span className="inline-flex items-center gap-0.5 text-slate-600">
                  <MapPin size={9} /> {activeSucursal?.direccion || activeEmpresa?.direccion}
                </span>
              )}
              {(activeSucursal?.telefono || activeEmpresa?.telefono) && (
                <span className="inline-flex items-center gap-0.5 text-slate-700 font-semibold tabular-nums">
                  <Phone size={9} /> {activeSucursal?.telefono || activeEmpresa?.telefono}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Folio & Estatus Badge (Muy Visible) */}
        <div className="flex flex-col items-end shrink-0 bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-right">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] uppercase tracking-wider font-bold text-slate-500">
              Orden de Servicio
            </span>
            <span
              className="text-base sm:text-lg font-black font-mono tabular-nums leading-none"
              style={{ color: primaryColor }}
            >
              {folioFormatted}
            </span>
          </div>
          <div className="text-[9.5px] text-slate-600 tabular-nums mt-0.5 flex items-center gap-2">
            <span>
              Ingreso:{" "}
              <strong className="text-slate-800">
                {order.fecha_ingreso
                  ? new Date(order.fecha_ingreso).toLocaleString("es-MX", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Hoy"}
              </strong>
            </span>
            {order.bahia_rampa && (
              <span className="bg-slate-200/70 text-slate-800 font-bold px-1 rounded text-[9px]">
                {order.bahia_rampa}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ─── 2. BLOQUE OPERATIVO: CLIENTE, VEHÍCULO E INVENTARIO (Compacto & Muy Visible) ─── */}
      <div className="border border-slate-200 rounded-md p-2.5 bg-slate-50/50 mb-2 text-[10.5px]">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 pb-2 border-b border-slate-200">
          {/* Cliente */}
          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-1 text-[9.5px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">
              <User size={11} className="text-slate-600" /> Cliente
            </div>
            <div className="flex flex-wrap items-baseline gap-x-2">
              <strong className="text-slate-900 text-xs">{c.nombre || "Cliente Mostrador"}</strong>
              {c.telefono && (
                <span className="text-slate-700 font-semibold tabular-nums text-[10px]">
                  Tel: {c.telefono}
                </span>
              )}
              {c.rfc && (
                <span className="text-slate-500 font-mono text-[9.5px]">RFC: {c.rfc}</span>
              )}
            </div>
            {c.empresa && (
              <span className="text-[9.5px] text-slate-500">Flotilla / Empresa: <strong>{c.empresa}</strong></span>
            )}
          </div>

          {/* Vehículo (Placas muy visibles) */}
          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-1 text-[9.5px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">
              <Car size={11} className="text-slate-600" /> Vehículo Identificado
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <strong className="text-slate-900 text-xs">
                {v.marca} {v.modelo} {v.anio ? `(${v.anio})` : ""}
              </strong>
              <span className="font-mono font-black text-xs px-1.5 py-0.2 rounded bg-slate-900 text-white tracking-wider">
                {v.placas || "SIN PLACAS"}
              </span>
              <span className="text-[10px] text-slate-600">
                Color: <strong>{v.color || "N/E"}</strong>
              </span>
            </div>
            <div className="flex items-center gap-3 text-[9.5px] text-slate-500 font-mono mt-0.5">
              <span>VIN: {v.vin || "No registrado"}</span>
              <span>OEM: {v.medida_oem || "Estándar"}</span>
            </div>
          </div>
        </div>

        {/* Franja de Recepción Operativa (Inventario, Combustible, Km, Asesor) */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[10px]">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1 font-bold text-slate-800 tabular-nums">
              <Gauge size={12} className="text-slate-500" />
              {Number(order.kilometraje_ingreso || 0).toLocaleString("es-MX")} km
            </span>
            <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
              <Fuel size={12} className="text-slate-500" /> Gas:{" "}
              <strong className="text-slate-900">{order.nivel_gasolina || "3/4"}</strong>
            </span>
            <span className="inline-flex items-center gap-1 text-slate-600">
              <Wrench size={12} className="text-slate-500" />
              Técnico: <strong className="text-slate-800">{mechanicName || order.mecanico?.nombre || "Carlos Mendoza"}</strong>
            </span>
          </div>

          {/* Checklist compacto en 1 sola fila */}
          <div className="flex items-center gap-2 text-[9.5px]">
            <span className="text-slate-400 font-bold uppercase text-[8.5px]">Inventario:</span>
            {Object.entries(CHECKLIST_LABELS).map(([key, label]) => {
              const checked = !!checklist[key];
              return (
                <span
                  key={key}
                  className={`inline-flex items-center gap-0.5 ${
                    checked ? "text-slate-900 font-medium" : "text-slate-400 line-through text-[8.5px]"
                  }`}
                  title={label}
                >
                  <span className={checked ? "text-emerald-700 font-black text-[9px]" : "text-slate-400"}>
                    {checked ? "✓" : "✗"}
                  </span>
                  <span>{label.replace("Llave / Birlo de seguridad", "Birlo").replace("Llanta de refacción", "Refacción").replace("Gato y herramienta", "Gato").replace("Tarjeta de circulación", "Tarjeta").replace("Objetos de valor retirados", "Sin objetos")}</span>
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── 3. MOTIVO DE INGRESO & DIAGNÓSTICO TÉCNICO (Ultra compacto a 2 columnas) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2 text-[10px]">
        <div className="border border-slate-200 rounded px-2.5 py-1.5 bg-slate-50/40">
          <span className="block text-[8.5px] font-bold uppercase tracking-wider text-slate-500">
            Falla / Solicitud Reportada
          </span>
          <p className="text-slate-800 whitespace-pre-line leading-tight">
            {(order.problema_reportado || order.notas_recepcion || "Revisión general de neumáticos y suspensión.").replace(/\\n/g, "\n")}
          </p>
        </div>
        <div className="border border-slate-200 rounded px-2.5 py-1.5 bg-slate-50/40">
          <span className="block text-[8.5px] font-bold uppercase tracking-wider text-slate-500">
            Diagnóstico Técnico de Taller
          </span>
          <p className="text-slate-800 whitespace-pre-line leading-tight">
            {(order.diagnostico_tecnico || "Evaluación técnica completada por especialista.").replace(/\\n/g, "\n")}
          </p>
        </div>
      </div>

      {/* Resumen DVI compacto (si existe) */}
      {rawDvi.length > 0 && (
        <div className="mb-2 border border-slate-200 rounded px-2.5 py-1 bg-slate-50/70 flex items-center justify-between text-[9.5px]">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700 uppercase tracking-wider text-[8.5px]">
              Inspección DVI:
            </span>
            <span className="text-emerald-700 font-semibold">
              ● {rawDvi.filter((i: any) => i.severidad === "verde").length} Bien
            </span>
            <span className="text-amber-700 font-semibold">
              ● {rawDvi.filter((i: any) => i.severidad === "amarillo").length} Precaución
            </span>
            <span className="text-red-700 font-semibold">
              ● {rawDvi.filter((i: any) => i.severidad === "rojo").length} Urgente
            </span>
          </div>
          <span className="text-slate-500 text-[9px] truncate max-w-sm">
            Hallazgo clave: Amortiguador con fuga de aceite y terminal con holgura.
          </span>
        </div>
      )}

      {/* ─── TABLA 1: PARTIDAS AUTORIZADAS Y EJECUTADAS ─── */}
      <div className="border border-slate-200 rounded-md overflow-hidden mb-2">
        <div className="bg-slate-100 px-3 py-1.5 border-b border-slate-200 flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
            <CheckCircle2 size={12} className="text-emerald-600" />
            Desglose de Servicios, Refacciones y Neumáticos Autorizados
          </span>
          <span className="text-[8.5px] font-bold uppercase px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
            Aprobado para Ejecución
          </span>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-[9px] uppercase font-bold text-slate-500 bg-slate-50/80">
              <th className="py-1 px-2.5 w-24">Tipo</th>
              <th className="py-1 px-2.5">Concepto / Referencia / Medida</th>
              <th className="py-1 px-2.5 text-center w-12">Cant.</th>
              <th className="py-1 px-2.5 text-right w-24">P. Unitario</th>
              <th className="py-1 px-2.5 text-right w-24">Importe</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-[10.5px]">
            {services.map((s: any) => {
              const qty = Number(s.cantidad || 1);
              const unit = Number(s.precio_cobrado || 0);
              const srvName = s.servicios_taller?.nombre || s.servicio?.nombre || s.nombre || "Servicio de Taller";
              return (
                <tr key={`srv-${s.id}`} className="hover:bg-slate-50/50">
                  <td className="py-1 px-2.5 font-semibold text-slate-600 text-[9.5px]">Mano de Obra</td>
                  <td className="py-1 px-2.5 font-medium text-slate-900">
                    {srvName}
                    {s.notas && <span className="block text-[9px] text-slate-500">{s.notas}</span>}
                  </td>
                  <td className="py-1 px-2.5 text-center tabular-nums">{qty}</td>
                  <td className="py-1 px-2.5 text-right tabular-nums text-slate-700">
                    ${unit.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-1 px-2.5 text-right font-bold tabular-nums text-slate-900">
                    ${(unit * qty).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              );
            })}

            {parts.map((r: any) => {
              const qty = Number(r.cantidad || 1);
              const unit = Number(r.precio_unitario || 0);
              const sub = r.subtotal != null ? Number(r.subtotal) : unit * qty;
              return (
                <tr key={`part-${r.id}`} className="hover:bg-slate-50/50">
                  <td className="py-1 px-2.5 font-semibold text-slate-600 text-[9.5px]">Refacción</td>
                  <td className="py-1 px-2.5 font-medium text-slate-900">
                    {r.nombre}
                    {(r.numero_parte || r.proveedor) && (
                      <span className="block text-[9px] text-slate-500 font-mono">
                        {r.numero_parte ? `P/N: ${r.numero_parte}` : ""}{" "}
                        {r.proveedor ? `• Prov: ${r.proveedor}` : ""}
                      </span>
                    )}
                  </td>
                  <td className="py-1 px-2.5 text-center tabular-nums">{qty}</td>
                  <td className="py-1 px-2.5 text-right tabular-nums text-slate-700">
                    ${unit.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-1 px-2.5 text-right font-bold tabular-nums text-slate-900">
                    ${sub.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              );
            })}

            {tires.map((t: any) => {
              const tire = t.inventario_llantas || t.llanta;
              const medida = tire ? `${tire.ancho}/${tire.perfil} R${tire.rin}` : "";
              const tireName = tire ? `${tire.marca} ${tire.modelo_llanta}` : (t.nombre || "Neumático");
              const qty = Number(t.cantidad || 1);
              const unit = Number(t.precio_unitario || 0);
              const sub = t.subtotal != null ? Number(t.subtotal) : unit * qty;
              return (
                <tr key={`tire-${t.id}`} className="hover:bg-slate-50/50">
                  <td className="py-1 px-2.5 font-semibold text-slate-600 text-[9.5px]">Neumático</td>
                  <td className="py-1 px-2.5 font-medium text-slate-900">
                    {tireName}{" "}
                    <span className="font-mono text-slate-700 font-semibold">{medida}</span>
                  </td>
                  <td className="py-1 px-2.5 text-center tabular-nums font-bold">{qty}</td>
                  <td className="py-1 px-2.5 text-right tabular-nums text-slate-700">
                    ${unit.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-1 px-2.5 text-right font-bold tabular-nums text-slate-900">
                    ${sub.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              );
            })}

            {services.length === 0 && parts.length === 0 && tires.length === 0 && (
              <tr>
                <td colSpan={5} className="py-3 text-center text-slate-400 italic text-[10px]">
                  Sin partidas autorizadas aún.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Totales Financieros Destacados */}
        <div className="bg-slate-50 border-t border-slate-200 px-3 py-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="text-[9px] text-slate-500 max-w-sm leading-tight">
            <strong className="text-slate-700 uppercase block mb-0.5">Póliza de Garantía:</strong>
            {activeEmpresa?.terminos_condiciones ||
              "Garantía de 30 días o 1,000 km en mano de obra. Neumáticos y refacciones con garantía oficial de fábrica."}
          </div>

          <div className="w-full sm:w-64 space-y-0.5 text-[10.5px]">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal antes de IVA:</span>
              <span className="tabular-nums font-medium">
                ${subtotalSinIva.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>IVA ({tasaIva}% incluido):</span>
              <span className="tabular-nums font-medium">
                ${ivaCalculado.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between text-xs sm:text-sm font-black text-slate-900 border-t border-slate-300 pt-0.5">
              <span>GRAN TOTAL AUTORIZADO:</span>
              <span className="tabular-nums" style={{ color: primaryColor }}>
                ${granTotal.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN
              </span>
            </div>
            <div className="flex justify-between text-[10px] text-slate-700 font-bold border-t border-slate-200 pt-0.5">
              <span>Saldo Pendiente a Liquidar:</span>
              <span className="tabular-nums text-slate-900 font-black">
                ${saldoPendiente.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 5. TABLA 2: TRABAJOS RECOMENDADOS / COTIZADOS NO AUTORIZADOS (DIFERIDOS) ─── */}
      {hasDeferred && (
        <div className="border border-amber-300/80 rounded-md overflow-hidden mb-2 bg-amber-50/20">
          <div className="bg-amber-100/70 px-3 py-1 border-b border-amber-200 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <AlertTriangle size={11} className="text-amber-800 shrink-0" />
              <span className="text-[9.5px] font-bold uppercase tracking-wider text-amber-950">
                Trabajos Recomendados / Cotizados No Autorizados (Diferidos)
              </span>
            </div>
            <span className="text-[8px] font-bold uppercase px-1.5 py-0.2 rounded bg-amber-200 text-amber-900 border border-amber-300">
              Pospuesto para próxima visita
            </span>
          </div>

          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-amber-200/60 text-[8.5px] uppercase font-bold text-amber-900 bg-amber-50/60">
                <th className="py-1 px-2.5 w-24">Tipo</th>
                <th className="py-1 px-2.5">Concepto / Diagnóstico Técnico</th>
                <th className="py-1 px-2.5 text-center w-12">Cant.</th>
                <th className="py-1 px-2.5 text-right w-24">P. Cotizado</th>
                <th className="py-1 px-2.5 text-right w-24">Importe</th>
                <th className="py-1 px-2.5 text-center w-28">Estatus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-amber-100/80 text-[10px]">
              {deferredServices.map((s: any) => {
                const qty = Number(s.cantidad || 1);
                const unit = Number(s.precio_cobrado || 0);
                const srvName = s.servicios_taller?.nombre || s.servicio?.nombre || s.nombre || "Servicio Recomendado";
                return (
                  <tr key={`def-srv-${s.id}`}>
                    <td className="py-1 px-2.5 font-semibold text-slate-700 text-[9px]">Mano de Obra</td>
                    <td className="py-1 px-2.5 text-slate-800">
                      <span className="font-medium">{srvName}</span>
                      {s.notas && <span className="block text-[8.5px] text-amber-900/90 italic">{s.notas}</span>}
                    </td>
                    <td className="py-1 px-2.5 text-center tabular-nums">{qty}</td>
                    <td className="py-1 px-2.5 text-right tabular-nums text-slate-600">
                      ${unit.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-1 px-2.5 text-right font-semibold tabular-nums text-slate-800">
                      ${(unit * qty).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-1 px-2.5 text-center">
                      <span className="text-[8px] font-bold px-1 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300">
                        No Comprado
                      </span>
                    </td>
                  </tr>
                );
              })}

              {deferredParts.map((r: any) => {
                const qty = Number(r.cantidad || 1);
                const unit = Number(r.precio_unitario || 0);
                const sub = r.subtotal != null ? Number(r.subtotal) : unit * qty;
                return (
                  <tr key={`def-part-${r.id}`}>
                    <td className="py-1 px-2.5 font-semibold text-slate-700 text-[9px]">Refacción</td>
                    <td className="py-1 px-2.5 text-slate-800">
                      <span className="font-medium">{r.nombre}</span>
                      {r.numero_parte && (
                        <span className="text-[8.5px] text-slate-500 font-mono ml-1">P/N: {r.numero_parte}</span>
                      )}
                    </td>
                    <td className="py-1 px-2.5 text-center tabular-nums">{qty}</td>
                    <td className="py-1 px-2.5 text-right tabular-nums text-slate-600">
                      ${unit.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-1 px-2.5 text-right font-semibold tabular-nums text-slate-800">
                      ${sub.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-1 px-2.5 text-center">
                      <span className="text-[8px] font-bold px-1 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300">
                        No Comprado
                      </span>
                    </td>
                  </tr>
                );
              })}

              {deferredTires.map((t: any) => {
                const tire = t.inventario_llantas || t.llanta;
                const medida = tire ? `${tire.ancho}/${tire.perfil} R${tire.rin}` : "";
                const tireName = tire ? `${tire.marca} ${tire.modelo_llanta}` : (t.nombre || "Neumático");
                const qty = Number(t.cantidad || 1);
                const unit = Number(t.precio_unitario || 0);
                const sub = t.subtotal != null ? Number(t.subtotal) : unit * qty;
                return (
                  <tr key={`def-tire-${t.id}`}>
                    <td className="py-1 px-2.5 font-semibold text-slate-700 text-[9px]">Neumático</td>
                    <td className="py-1 px-2.5 text-slate-800">
                      <span className="font-medium">{tireName}</span>{" "}
                      <span className="font-mono text-slate-600">{medida}</span>
                    </td>
                    <td className="py-1 px-2.5 text-center tabular-nums">{qty}</td>
                    <td className="py-1 px-2.5 text-right tabular-nums text-slate-600">
                      ${unit.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-1 px-2.5 text-right font-semibold tabular-nums text-slate-800">
                      ${sub.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-1 px-2.5 text-center">
                      <span className="text-[8px] font-bold px-1 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300">
                        No Comprado
                      </span>
                    </td>
                  </tr>
                );
              })}

              {deferredServices.length === 0 && deferredParts.length === 0 && deferredTires.length === 0 && rawDeferredWorks.map((dw: any) => (
                <tr key={`dw-${dw.id}`}>
                  <td className="py-1 px-2.5 font-semibold text-slate-700 text-[9px]">Recomendación</td>
                  <td className="py-1 px-2.5 text-slate-800">
                    <span className="font-medium">{dw.concepto}</span>
                    {dw.notas && <span className="block text-[8.5px] text-amber-900/90 italic">{dw.notas}</span>}
                  </td>
                  <td className="py-1 px-2.5 text-center tabular-nums">1</td>
                  <td className="py-1 px-2.5 text-right tabular-nums text-slate-600">
                    ${Number(dw.costo_estimado || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-1 px-2.5 text-right font-semibold tabular-nums text-slate-800">
                    ${Number(dw.costo_estimado || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-1 px-2.5 text-center">
                    <span className="text-[8px] font-bold px-1 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300">
                      Pospuesto
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="px-2.5 py-1 bg-amber-50/70 border-t border-amber-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 text-[9px]">
            <div className="text-amber-950 flex items-center gap-1">
              <AlertTriangle size={10} className="text-amber-700 shrink-0" />
              <span>
                <strong>Deslinde Técnico:</strong> Se informó formalmente sobre holgura/desgaste en partidas diferidas. El cliente pospone la reparación. <u>No incluido</u> en el total de hoy.
              </span>
            </div>
            <div className="font-bold text-amber-950 shrink-0 tabular-nums text-[9.5px]">
              Presupuesto Diferido: +${totalDiferidoDisplay.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN
            </div>
          </div>
        </div>
      )}

      {/* ─── 6. FIRMAS DE CONFORMIDAD Y RESPONSABILIDAD (Compactas) ─── */}
      <div className="grid grid-cols-2 gap-6 pt-3 mt-1 text-[9.5px]">
        <div className="border-t border-slate-400 pt-1 text-center">
          <p className="font-bold text-slate-800">
            {order.aprobado_cliente_nombre || c.nombre || "Nombre y Firma del Cliente"}
          </p>
          <p className="text-[8.5px] text-slate-500 leading-tight">
            Acepto inventario de recepción, presupuesto autorizado y tomo conocimiento de partidas no autorizadas (diferidas).
          </p>
        </div>
        <div className="border-t border-slate-400 pt-1 text-center">
          <p className="font-bold text-slate-800">
            Asesor de Servicio • {activeEmpresa?.nombre_comercial}
          </p>
          <p className="text-[8.5px] text-slate-500 leading-tight">
            Control de Calidad y Entrega ({activeSucursal?.nombre || "Matriz"})
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Action Bar (Screen Only) */}
      {!isStandalone && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 text-white px-4 py-3 rounded-lg no-print">
          <div className="flex items-center gap-2.5">
            <FileCheck2 size={18} className="text-blue-400 shrink-0" />
            <div>
              <h4 className="text-xs font-bold">Hoja Oficial de Recepción y Orden de Trabajo ({folioFormatted})</h4>
              <p className="text-[11px] text-slate-300">
                Formato optimizado para impresión tamaño Carta / A4 o exportación directa a PDF con el branding del taller.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md text-xs font-bold text-white shadow-sm transition-opacity hover:opacity-95 cursor-pointer shrink-0"
            style={{ backgroundColor: primaryColor }}
          >
            <Printer size={15} />
            Imprimir / Descargar PDF
          </button>
        </div>
      )}

      {/* Screen Preview */}
      {sheetDocument}

      {/* Print Portal outside .no-print Modal container */}
      {mounted &&
        !isStandalone &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="hidden print:block fixed inset-0 bg-white z-[9999] p-0 m-0">
            {sheetDocument}
          </div>,
          document.body
        )}
    </div>
  );
}
