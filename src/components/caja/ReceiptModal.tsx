"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Printer,
  X,
  MessageCircle,
  CheckCircle2,
  Car,
  User,
  ShieldCheck,
  Building2,
  Calendar,
  CreditCard,
  Banknote,
  Receipt,
  FileText,
  MapPin,
  Phone,
  Globe,
  Sparkles,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any;
  payment?: any;
  payments?: any[];
  empresa: any;
  sucursal?: any;
  cashGiven?: number;
  changeDue?: number;
}

type FormatoImpresion = "CARTA" | "TICKET";

export function ReceiptModal({
  isOpen,
  onClose,
  order,
  payment,
  payments,
  empresa,
  sucursal,
  cashGiven,
  changeDue,
}: ReceiptModalProps) {
  const [formato, setFormato] = useState<FormatoImpresion>("CARTA");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !order) return null;

  const veh = order.vehiculo || order.vehiculos || {};
  const cli = order.cliente || veh.clientes || {};
  const folioDisplay = `#${1000 + Number(order.folio || 1)}`;
  const ticketFolio = `REC-${order.folio ? 1000 + Number(order.folio) : order.id?.slice(0, 4).toUpperCase()}`;
  const nowStr = new Date().toLocaleString("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const servicios = (order.servicios || order.orden_servicio_servicios || []).filter(
    (s: any) => s.estatus_aprobacion !== "Diferido" && s.estatus_aprobacion !== "Rechazado"
  );
  const refacciones = (order.refacciones || order.orden_servicio_refacciones || []).filter(
    (r: any) => r.estatus_aprobacion !== "Diferido" && r.estatus_aprobacion !== "Rechazado"
  );
  const cotList = Array.isArray(order.cotizaciones)
    ? order.cotizaciones
    : order.cotizaciones
    ? [order.cotizaciones]
    : [];
  const llantas = (order.llantas || cotList.flatMap((c: any) => c.detalles_cotizacion || []))
    .filter((l: any) => l.estatus_aprobacion !== "Diferido" && l.estatus_aprobacion !== "Rechazado");

  const subtotalServicios = servicios.reduce(
    (acc: number, s: any) => acc + Number(s.precio_cobrado || 0) * Number(s.cantidad || 1),
    0
  );
  const subtotalRefacciones = refacciones.reduce(
    (acc: number, r: any) => acc + Number(r.subtotal || (r.precio_unitario || 0) * (r.cantidad || 1)),
    0
  );
  const subtotalLlantas = llantas.reduce(
    (acc: number, l: any) => acc + Number(l.subtotal || (l.precio_unitario || 0) * (l.cantidad || 1)),
    0
  );
  const computedTotal = subtotalServicios + subtotalRefacciones + subtotalLlantas;
  const total = Number(order.granTotal || computedTotal);

  const pagosList = order.pagos_orden || order.pagos || [];
  const totalPagadoHistorico = pagosList
    .filter((p: any) => p.estatus === "Aprobado" && !p.deleted_at)
    .reduce((acc: number, p: any) => acc + Number(p.monto_total || 0), 0);

  const montoCobrado = Number(
    payments && payments.length > 0
      ? payments.reduce((acc: number, p: any) => acc + Number(p.monto || p.monto_total || 0), 0)
      : payment?.monto_total || (totalPagadoHistorico > 0 ? totalPagadoHistorico : total)
  );

  const saldo = Math.max(0, total - (totalPagadoHistorico > 0 ? totalPagadoHistorico : montoCobrado));

  const tasaIva = Number(empresa?.tasa_iva ?? 16);
  const subtotalSinIva = total / (1 + tasaIva / 100);
  const iva = total - subtotalSinIva;
  const primaryColor = empresa?.color_primario || "#1C3EFF";

  // Build clean WhatsApp message
  const rawPhone = cli.telefono || "";
  const cleanPhone = rawPhone.replace(/\D/g, "");
  const waPhone = cleanPhone.startsWith("52") ? cleanPhone : `52${cleanPhone}`;
  const waMessage = encodeURIComponent(
    `🧾 *RECIBO OFICIAL DE PAGO Y COMPROBANTE DE CAJA*\n` +
      `🏢 *${empresa?.nombre_comercial || "Cova - Taller & Llantera"}*\n` +
      `🔖 Recibo: ${ticketFolio} | Orden: ${folioDisplay}\n` +
      `🚗 ${veh.marca || ""} ${veh.modelo || ""} (${veh.placas || "Sin placas"})\n` +
      `👤 Cliente: ${cli.nombre || "Venta General"}\n` +
      `--------------------------------\n` +
      `💳 Método: ${payment?.metodo_detalle || payment?.proveedor_pago || "Efectivo"}\n` +
      `💰 Monto Pagado: $${montoCobrado.toLocaleString("es-MX", { minimumFractionDigits: 2 })}\n` +
      (cashGiven ? `💵 Efectivo Recibido: $${cashGiven.toLocaleString("es-MX", { minimumFractionDigits: 2 })}\n` : "") +
      (changeDue ? `🪙 Cambio Entregado: $${changeDue.toLocaleString("es-MX", { minimumFractionDigits: 2 })}\n` : "") +
      `🏁 Saldo Pendiente: $${saldo.toLocaleString("es-MX", { minimumFractionDigits: 2 })}\n` +
      `--------------------------------\n` +
      `✅ ¡Gracias por tu preferencia! Póliza de garantía: 30 días o 1,000 km.`
  );
  const whatsappUrl = `https://wa.me/${waPhone}?text=${waMessage}`;

  const handlePrint = () => {
    window.print();
  };

  // ─── 1. DISEÑO EN HOJA TAMAÑO CARTA (LETTER 8.5" x 11") ──────────────────────
  const renderDocumentoCarta = (
    <div className="bg-white text-slate-900 border border-slate-200 rounded-lg p-6 sm:p-8 max-w-4xl mx-auto text-xs leading-relaxed font-sans print:border-0 print:p-0 print:m-0 print:shadow-none">
      {/* Top Banner / Brand Header */}
      <div
        className="flex justify-between items-start pb-4 border-b-2"
        style={{ borderColor: primaryColor }}
      >
        <div className="flex items-start gap-3.5">
          {empresa?.logo_url ? (
            <img
              src={empresa.logo_url}
              alt={empresa.nombre_comercial}
              className="w-14 h-14 object-contain rounded-md border border-slate-200 p-1 bg-white"
            />
          ) : (
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-black text-lg shrink-0 shadow-xs"
              style={{ backgroundColor: primaryColor }}
            >
              {(empresa?.nombre_comercial || "CT").slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight uppercase">
              {empresa?.nombre_comercial || "Cova - Taller & Llantera"}
            </h1>
            {empresa?.eslogan && (
              <p className="text-[11px] font-medium text-slate-600">{empresa.eslogan}</p>
            )}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-slate-500 mt-1">
              {empresa?.rfc && (
                <span className="font-mono font-semibold text-slate-700">RFC: {empresa.rfc}</span>
              )}
              {sucursal?.nombre && (
                <span className="font-semibold text-slate-700">Sucursal: {sucursal.nombre}</span>
              )}
              {(sucursal?.direccion || empresa?.direccion) && (
                <span className="inline-flex items-center gap-1">
                  <MapPin size={10} /> {sucursal?.direccion || empresa?.direccion}
                </span>
              )}
              {(sucursal?.telefono || empresa?.telefono) && (
                <span className="inline-flex items-center gap-1 tabular-nums">
                  <Phone size={10} /> {sucursal?.telefono || empresa?.telefono}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end shrink-0 bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2.5">
          <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">
            Recibo Oficial de Pago
          </span>
          <span
            className="text-xl font-black font-mono tabular-nums tracking-tight"
            style={{ color: primaryColor }}
          >
            {ticketFolio}
          </span>
          <div className="text-[10px] text-slate-500 tabular-nums mt-0.5">
            Orden de Servicio: <strong className="text-slate-800">{folioDisplay}</strong>
          </div>
          <div className="text-[10px] text-slate-500 tabular-nums mt-0.5">
            Fecha: <strong className="text-slate-700">{nowStr}</strong>
          </div>
        </div>
      </div>

      {/* Customer & Vehicle Grid */}
      <div className="grid grid-cols-2 gap-4 my-3.5">
        <div className="border border-slate-200 rounded-md p-2.5 bg-slate-50/50">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
            Datos del Cliente
          </span>
          <p className="text-xs font-bold text-slate-900">{cli.nombre || "Cliente Mostrador"}</p>
          <div className="grid grid-cols-2 gap-1 text-[10.5px] mt-1 text-slate-600">
            <div>RFC: <span className="font-mono font-semibold text-slate-800">{cli.rfc || "XAXX010101000"}</span></div>
            <div>Tel: <span className="tabular-nums font-semibold text-slate-800">{cli.telefono || "N/A"}</span></div>
            {cli.empresa && <div className="col-span-2 text-slate-700">Empresa: <strong>{cli.empresa}</strong></div>}
          </div>
        </div>

        <div className="border border-slate-200 rounded-md p-2.5 bg-slate-50/50">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
            Identificación del Vehículo
          </span>
          <p className="text-xs font-bold text-slate-900">
            {veh.marca} {veh.modelo} {veh.anio ? `(${veh.anio})` : ""}
          </p>
          <div className="grid grid-cols-2 gap-1 text-[10.5px] mt-1 text-slate-600">
            <div>
              Placas: <strong className="font-mono bg-slate-200/80 px-1 py-0.2 rounded text-slate-900">{veh.placas || "S/P"}</strong>
            </div>
            <div>Color: <strong className="text-slate-800">{veh.color || "N/E"}</strong></div>
            <div className="col-span-2 text-[10px] text-slate-500 font-mono">
              VIN: {veh.vin || "No registrado"} • KM: {Number(veh.kilometraje_actual || order.kilometraje_ingreso || 0).toLocaleString("es-MX")} km
            </div>
          </div>
        </div>
      </div>

      {/* Conceptos Amparados en la Orden */}
      <div className="border border-slate-200 rounded-md overflow-hidden mb-3.5">
        <div className="bg-slate-100 px-3 py-1.5 border-b border-slate-200 flex justify-between items-center text-[10px] font-bold uppercase text-slate-700">
          <span>Conceptos Amparados por la Orden de Servicio</span>
          <span>{folioDisplay}</span>
        </div>
        <table className="w-full text-left border-collapse text-[11px]">
          <thead>
            <tr className="border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500 bg-slate-50">
              <th className="py-1.5 px-3">Tipo</th>
              <th className="py-1.5 px-3">Descripción</th>
              <th className="py-1.5 px-3 text-center">Cant.</th>
              <th className="py-1.5 px-3 text-right">P. Unitario</th>
              <th className="py-1.5 px-3 text-right">Importe</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {servicios.map((s: any) => (
              <tr key={`srv-${s.id}`}>
                <td className="py-1.5 px-3 font-semibold text-slate-600">Mano de Obra</td>
                <td className="py-1.5 px-3 text-slate-900">
                  {s.servicios_taller?.nombre || s.servicio?.nombre || s.nombre || "Servicio Técnico"}
                </td>
                <td className="py-1.5 px-3 text-center tabular-nums">{s.cantidad || 1}</td>
                <td className="py-1.5 px-3 text-right tabular-nums">
                  ${Number(s.precio_cobrado || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                </td>
                <td className="py-1.5 px-3 text-right font-semibold tabular-nums">
                  ${(Number(s.precio_cobrado || 0) * Number(s.cantidad || 1)).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
            {refacciones.map((r: any) => (
              <tr key={`ref-${r.id}`}>
                <td className="py-1.5 px-3 font-semibold text-slate-600">Refacción</td>
                <td className="py-1.5 px-3 text-slate-900">
                  {r.nombre} {r.numero_parte ? `(P/N: ${r.numero_parte})` : ""}
                </td>
                <td className="py-1.5 px-3 text-center tabular-nums">{r.cantidad || 1}</td>
                <td className="py-1.5 px-3 text-right tabular-nums">
                  ${Number(r.precio_unitario || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                </td>
                <td className="py-1.5 px-3 text-right font-semibold tabular-nums">
                  ${Number(r.subtotal || (r.precio_unitario || 0) * (r.cantidad || 1)).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
            {llantas.map((l: any) => {
              const tire = l.inventario_llantas || l.llanta;
              const tireName = tire ? `${tire.marca} ${tire.modelo_llanta}` : (l.nombre || "Neumático");
              const medida = tire ? `${tire.ancho}/${tire.perfil} R${tire.rin}` : "";
              return (
                <tr key={`lla-${l.id}`}>
                  <td className="py-1.5 px-3 font-semibold text-slate-600">Neumático</td>
                  <td className="py-1.5 px-3 text-slate-900">
                    {tireName} <span className="font-mono text-slate-600 font-semibold">{medida}</span>
                  </td>
                  <td className="py-1.5 px-3 text-center tabular-nums">{l.cantidad || 1}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums">
                    ${Number(l.precio_unitario || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-1.5 px-3 text-right font-semibold tabular-nums">
                    ${Number(l.subtotal || (l.precio_unitario || 0) * (l.cantidad || 1)).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Recuadro Destacado del Pago / Cobro Liquidado */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        {/* Desglose Fiscal & Totales */}
        <div className="border border-slate-200 rounded-md p-3 bg-slate-50 space-y-1.5 text-[11px]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
            Resumen de Cuenta
          </span>
          <div className="flex justify-between text-slate-600">
            <span>Subtotal de la Orden (antes de IVA):</span>
            <span className="tabular-nums font-medium">
              ${subtotalSinIva.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>IVA ({tasaIva}% incluido):</span>
            <span className="tabular-nums font-medium">
              ${iva.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between font-black text-slate-900 text-xs border-t border-slate-300 pt-1">
            <span>TOTAL DE LA ORDEN:</span>
            <span className="tabular-nums">
              ${total.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN
            </span>
          </div>
          <div className="flex justify-between font-bold text-slate-700 border-t border-slate-200 pt-1">
            <span>Saldo Restante por Liquidar:</span>
            <span className={`tabular-nums ${saldo > 0 ? "text-amber-700" : "text-emerald-700"}`}>
              ${saldo.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Movimiento de Cobro Actual */}
        <div className="border-2 border-emerald-300 rounded-md p-3 bg-emerald-50/50 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-950 flex items-center gap-1">
                <CheckCircle2 size={12} className="text-emerald-600" />
                Comprobante de Cobro en Caja
              </span>
              <span className="text-[9px] font-mono font-bold uppercase bg-emerald-200/80 text-emerald-900 px-1.5 py-0.5 rounded">
                PAGO REGISTRADO
              </span>
            </div>

            <div className="bg-white border border-emerald-200 rounded p-2 mb-2">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">
                Monto Cobrado en este Movimiento:
              </span>
              <span className="text-lg font-black text-emerald-800 font-mono tabular-nums">
                ${montoCobrado.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN
              </span>
            </div>

            <div className="text-[11px] space-y-1 text-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-600">Forma de Pago:</span>
                <strong className="text-slate-900">
                  {payment?.metodo_detalle || payment?.proveedor_pago || "Efectivo en Ventanilla"}
                </strong>
              </div>
              {payment?.referencia && (
                <div className="flex justify-between font-mono text-[10px]">
                  <span className="text-slate-600">Ref. / Folio Autorización:</span>
                  <span className="text-slate-900 font-bold">{payment.referencia}</span>
                </div>
              )}
              {cashGiven != null && cashGiven > 0 && (
                <>
                  <div className="flex justify-between text-slate-600">
                    <span>Efectivo entregado por cliente:</span>
                    <span className="tabular-nums font-medium">${cashGiven.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-emerald-800 font-bold">
                    <span>Cambio devuelto:</span>
                    <span className="tabular-nums font-black">${(changeDue ?? 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="text-[9.5px] text-emerald-900 pt-1.5 mt-2 border-t border-emerald-200/80">
            {saldo <= 0 ? (
              <span className="font-bold text-emerald-800 uppercase flex items-center gap-1">
                ✓ Cuenta liquidada en su totalidad • No presenta adeudo
              </span>
            ) : (
              <span>Anticipo / Pago parcial aplicado correctamente a la orden {folioDisplay}.</span>
            )}
          </div>
        </div>
      </div>

      {/* Términos y Condiciones */}
      <div className="border border-slate-200 rounded-md p-2.5 bg-slate-50/40 text-[9.5px] text-slate-500 leading-normal mb-6">
        <strong className="text-slate-700 block uppercase mb-0.5">Póliza de Garantía y Condiciones:</strong>
        {empresa?.terminos_condiciones ||
          "Garantía de 30 días o 1,000 km en mano de obra. Refacciones y neumáticos sujetos a póliza del fabricante. En caso de requerir comprobante fiscal digital por internet (CFDI 4.0), favor de solicitarlo durante el mes corriente presentando su constancia de situación fiscal."}
      </div>

      {/* Bloque de Firmas y Sello */}
      <div className="grid grid-cols-2 gap-8 pt-4">
        <div className="border-t border-slate-400 pt-2 text-center">
          <p className="text-[11px] font-bold text-slate-800">
            {cli.nombre || "Nombre y Firma del Cliente"}
          </p>
          <p className="text-[9.5px] text-slate-500">Recibí comprobante de pago de conformidad</p>
        </div>
        <div className="border-t border-slate-400 pt-2 text-center">
          <p className="text-[11px] font-bold text-slate-800">
            Caja y Cobranza • {empresa?.nombre_comercial}
          </p>
          <p className="text-[9.5px] text-slate-500">
            Sello de Pagado ({sucursal?.nombre || "Matriz Cova"})
          </p>
        </div>
      </div>
    </div>
  );

  // ─── 2. DISEÑO EN TICKET TÉRMICO (80MM ROLL) ──────────────────────────────────
  const renderTicketTermico = (
    <div
      id="pos-thermal-ticket"
      className="bg-white border-2 border-dashed border-slate-300 rounded-xl p-5 font-mono text-xs text-slate-800 shadow-inner flex flex-col gap-3 max-w-sm mx-auto"
    >
      <div className="text-center border-b border-slate-200 pb-3">
        <h2 className="font-bold text-sm tracking-tight text-slate-900 uppercase">
          {empresa?.nombre_comercial || "Cova - Taller & Llantera"}
        </h2>
        {empresa?.eslogan && <p className="text-[10px] text-slate-500">{empresa.eslogan}</p>}
        <p className="text-[10px] text-slate-600 mt-0.5">RFC: {empresa?.rfc || "COV2201019A1"}</p>
        <p className="text-[10px] text-slate-500">
          {sucursal?.nombre ? `Sucursal: ${sucursal.nombre}` : ""} • {sucursal?.telefono || empresa?.telefono || ""}
        </p>
        <p className="text-[10px] text-slate-400 truncate max-w-xs mx-auto">
          {sucursal?.direccion || empresa?.direccion || ""}
        </p>
      </div>

      <div className="flex justify-between items-center text-[11px] border-b border-slate-200 pb-2">
        <div>
          <span className="font-bold text-slate-900">{ticketFolio}</span>
          <p className="text-[10px] text-slate-500">Orden: {folioDisplay}</p>
        </div>
        <div className="text-right text-[10px] text-slate-500">
          <p>{nowStr}</p>
          <p>Caja: Mostrador</p>
        </div>
      </div>

      <div className="bg-slate-50 rounded p-2 text-[11px] flex flex-col gap-0.5 border border-slate-100">
        <p className="font-bold text-slate-900">{cli.nombre || "Venta de Mostrador"}</p>
        <p className="text-slate-600">
          Auto: {veh.marca} {veh.modelo} {veh.anio || ""} • Placas:{" "}
          <span className="font-bold">{veh.placas || "N/A"}</span>
        </p>
      </div>

      <div className="border-b border-slate-200 pb-2">
        <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
          <span>Concepto</span>
          <span>Importe</span>
        </div>
        <div className="flex flex-col gap-1 text-[11px]">
          {servicios.map((s: any) => (
            <div key={s.id} className="flex justify-between">
              <span className="truncate pr-2">
                {s.servicios_taller?.nombre || s.servicio?.nombre || s.nombre || "Mano de Obra"}
              </span>
              <span className="font-bold shrink-0">
                ${Number(s.precio_cobrado || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
              </span>
            </div>
          ))}
          {refacciones.map((r: any) => (
            <div key={r.id} className="flex justify-between text-slate-700">
              <span className="truncate pr-2">{r.nombre} x{r.cantidad || 1}</span>
              <span className="font-bold shrink-0">
                ${Number(r.subtotal || (r.precio_unitario || 0) * (r.cantidad || 1)).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
              </span>
            </div>
          ))}
          {llantas.map((l: any) => {
            const tire = l.inventario_llantas || l.llanta;
            const tName = tire ? `${tire.marca} ${tire.ancho}/${tire.perfil}` : "Llanta";
            return (
              <div key={l.id} className="flex justify-between text-slate-700">
                <span className="truncate pr-2">{tName} x{l.cantidad || 1}</span>
                <span className="font-bold shrink-0">
                  ${Number(l.subtotal || (l.precio_unitario || 0) * (l.cantidad || 1)).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-1 text-[11px]">
        <div className="flex justify-between text-slate-600">
          <span>Subtotal (sin IVA):</span>
          <span>${subtotalSinIva.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between text-slate-600">
          <span>IVA ({tasaIva}%):</span>
          <span>${iva.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between font-bold text-sm text-slate-900 border-t border-slate-200 pt-1 mt-1">
          <span>TOTAL ORDEN:</span>
          <span>${total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
        </div>
      </div>

      <div className="bg-emerald-50/70 border border-emerald-200 rounded p-2.5 text-[11px] flex flex-col gap-1 text-emerald-950">
        <div className="flex justify-between font-bold">
          <span>Cobrado en este movimiento:</span>
          <span>${montoCobrado.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between text-[10px] text-emerald-800">
          <span>Método:</span>
          <span className="font-bold">{payment?.metodo_detalle || payment?.proveedor_pago || "Efectivo"}</span>
        </div>
        {payment?.referencia && (
          <div className="flex justify-between text-[10px] text-emerald-700 font-mono">
            <span>Ref:</span>
            <span>{payment.referencia}</span>
          </div>
        )}
        <div className="flex justify-between text-[10px] font-bold text-slate-700 pt-1 border-t border-emerald-200">
          <span>Saldo restante por liquidar:</span>
          <span className={saldo > 0 ? "text-rose-600" : "text-emerald-700"}>
            ${saldo.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      <div className="text-center text-[9px] text-slate-400 border-t border-slate-200 pt-2 flex flex-col gap-0.5">
        <p className="font-bold text-slate-600">Póliza de Garantía: 30 días o 1,000 km</p>
        <p>¡Gracias por su preferencia!</p>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Recibo Oficial de Pago / Comprobante de Cobro"
      size={formato === "CARTA" ? "xl" : "md"}
    >
      <div className="flex flex-col gap-4">
        {/* Selector de Formato de Impresión (Carta vs Ticket 80mm) */}
        <div className="flex items-center justify-between bg-slate-100 p-1.5 rounded-xl border border-slate-200 text-xs no-print">
          <span className="font-bold text-slate-700 pl-2 flex items-center gap-1.5">
            <FileText size={14} className="text-blue-600" />
            Formato de Impresión:
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setFormato("CARTA")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                formato === "CARTA"
                  ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>📄 Hoja Tamaño Carta (Recomendado)</span>
            </button>
            <button
              type="button"
              onClick={() => setFormato("TICKET")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                formato === "TICKET"
                  ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>🧾 Ticket Térmico 80mm</span>
            </button>
          </div>
        </div>

        {/* Preview en Pantalla según formato */}
        {formato === "CARTA" ? renderDocumentoCarta : renderTicketTermico}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 no-print border-t border-slate-200">
          <button
            type="button"
            onClick={handlePrint}
            style={{ backgroundColor: primaryColor }}
            className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white font-bold text-xs shadow-sm hover:opacity-95 cursor-pointer transition-opacity"
          >
            <Printer size={15} />
            {formato === "CARTA" ? "Imprimir en Hoja Tamaño Carta / PDF" : "Imprimir Ticket Térmico (80mm)"}
          </button>

          {cli.telefono && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition-colors"
            >
              <MessageCircle size={15} /> Enviar Comprobante por WhatsApp
            </a>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* Print Portal outside .no-print Modal Container */}
      {mounted &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="hidden print:block fixed inset-0 bg-white z-[9999] p-0 m-0">
            {formato === "CARTA" ? (
              <div className="p-0 m-0">
                {renderDocumentoCarta}
                <style jsx global>{`
                  @page {
                    size: letter portrait;
                    margin: 10mm;
                  }
                  @media print {
                    html, body {
                      background-color: #ffffff !important;
                      color: #0f172a !important;
                      -webkit-print-color-adjust: exact !important;
                      print-color-adjust: exact !important;
                    }
                    .no-print, header, nav, footer, .modal-backdrop {
                      display: none !important;
                    }
                  }
                `}</style>
              </div>
            ) : (
              <div className="p-0 m-0">
                {renderTicketTermico}
                <style jsx global>{`
                  @page {
                    size: 80mm auto;
                    margin: 3mm;
                  }
                  @media print {
                    html, body {
                      background-color: #ffffff !important;
                      color: #0f172a !important;
                      -webkit-print-color-adjust: exact !important;
                      print-color-adjust: exact !important;
                    }
                    .no-print, header, nav, footer, .modal-backdrop {
                      display: none !important;
                    }
                  }
                `}</style>
              </div>
            )}
          </div>,
          document.body
        )}
    </Modal>
  );
}
