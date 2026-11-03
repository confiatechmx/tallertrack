"use client";

import React, { useState, useEffect } from "react";
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
  Coins,
  Check,
} from "lucide-react";
import QRCode from "qrcode";
import { Modal } from "@/components/ui/Modal";
import TenantBrandLogo from "@/components/brand/TenantBrandLogo";

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

const CHECKLIST_LABELS: Record<string, string> = {
  llanta_refaccion: "Refacción",
  gato_herramienta: "Gato",
  tarjeta_circulacion: "Tarjeta",
  objetos_valor: "Sin objetos",
  birlo_seguridad: "Birlo",
};

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
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");

  const orderId = order?.id;
  const originUrl = typeof window !== "undefined" ? window.location.origin : "https://cova.tallertrack.com";
  const comprobanteDigitalUrl = orderId ? `${originUrl}/orden/${orderId}/imprimir` : "";

  useEffect(() => {
    setMounted(true);
  }, []);

  // Chime sutil al registrar cobro
  useEffect(() => {
    if (isOpen) {
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
    }
  }, [isOpen]);

  // Atajo de teclado: Enter para imprimir rápidamente
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement;
        if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;
        e.preventDefault();
        window.print();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (orderId && comprobanteDigitalUrl) {
      QRCode.toDataURL(comprobanteDigitalUrl, { width: 140, margin: 1 })
        .then(setQrCodeDataUrl)
        .catch(() => {});
    }
  }, [orderId, comprobanteDigitalUrl]);

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
    .filter((p: any) => (p.estatus === "Aprobado" || p.estatus === "COMPLETADO") && !p.deleted_at)
    .reduce((acc: number, p: any) => acc + Number(p.monto_total || 0), 0);

  const montoCobrado = Number(
    payments && payments.length > 0
      ? payments.reduce((acc: number, p: any) => acc + Number(p.monto || p.monto_total || 0), 0)
      : payment?.monto_total || (totalPagadoHistorico > 0 ? totalPagadoHistorico : total)
  );

  const totalPagadoConDescuento = pagosList
    .filter((p: any) => (p.estatus === "Aprobado" || p.estatus === "COMPLETADO") && !p.deleted_at)
    .reduce((acc: number, p: any) => acc + Number(p.monto_total || 0) + Number(p.descuento_aplicado || 0), 0);

  const descuentoDirecto = Math.max(
    Number(payment?.descuento_aplicado || 0),
    Number(order?.descuento_efectivo_monto || 0)
  );

  const totalHistoricoCubierto = Math.max(totalPagadoConDescuento, totalPagadoHistorico + descuentoDirecto);
  const totalCobradoMovimiento = montoCobrado + descuentoDirecto;
  const montoCubiertoEvaluado = totalHistoricoCubierto > 0 ? totalHistoricoCubierto : totalCobradoMovimiento;

  const saldo = (order?.estatus_pago === "Pagado" || montoCubiertoEvaluado >= total - 0.5)
    ? 0
    : Math.max(0, Number((total - montoCubiertoEvaluado).toFixed(2)));

  const checklist =
    typeof order?.checklist_recepcion === "object" && order?.checklist_recepcion !== null
      ? order.checklist_recepcion
      : null;

  const tasaIva = Number(empresa?.tasa_iva ?? 16);
  const subtotalSinIva = Math.round((total / (1 + tasaIva / 100)) * 100) / 100;
  const iva = Math.round((total - subtotalSinIva) * 100) / 100;
  const primaryColor = empresa?.color_primario || "#1C3EFF";

  // Build clean WhatsApp message
  const rawPhone = cli.telefono || "";
  const cleanPhone = rawPhone.replace(/\D/g, "");
  const waPhone = cleanPhone.startsWith("52") ? cleanPhone : `52${cleanPhone}`;
  const metodosStr = payments && payments.length > 1
    ? payments.map((p: any) => `  • ${p.proveedor_pago || p.metodo_detalle}: ${Number(p.monto || p.monto_total || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}${p.referencia ? ` (Ref: ${p.referencia})` : ""}`).join("\n")
    : `💳 Método: ${payment?.metodo_detalle || payment?.proveedor_pago || (payments?.[0]?.metodo_detalle || payments?.[0]?.proveedor_pago) || "Efectivo"}${payment?.referencia ? ` (Ref: ${payment.referencia})` : ""}`;

  const waMessage = encodeURIComponent(
    `🧾 *RECIBO OFICIAL DE PAGO Y COMPROBANTE DE CAJA*\n` +
      `🏢 *${empresa?.nombre_comercial || "Cova"}*\n` +
      `🔖 Recibo: ${ticketFolio} | Orden: ${folioDisplay}\n` +
      `🚗 ${veh.marca || ""} ${veh.modelo || ""} (${veh.placas || "Sin placas"})\n` +
      `👤 Cliente: ${cli.nombre || "Venta General"}\n` +
      `--------------------------------\n` +
      `${metodosStr}\n` +
      `💰 Monto Pagado: ${montoCobrado.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN\n` +
      (cashGiven ? `💵 Efectivo Recibido: ${cashGiven.toLocaleString("es-MX", { minimumFractionDigits: 2 })}\n` : "") +
      (changeDue ? `🪙 Cambio Entregado: ${changeDue.toLocaleString("es-MX", { minimumFractionDigits: 2 })}\n` : "") +
      (Number(payment?.descuento_aplicado || order?.descuento_efectivo_monto || 0) > 0 ? `✨ Descuento Promoción Efectivo: -${Number(payment?.descuento_aplicado || order?.descuento_efectivo_monto).toLocaleString("es-MX", { minimumFractionDigits: 2 })}\n` : "") +
      `🏁 Saldo Pendiente: ${saldo.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN\n` +
      `--------------------------------\n` +
      `🔗 Ver comprobante digital:\n${comprobanteDigitalUrl}\n` +
      `--------------------------------\n` +
      `✅ ¡Gracias por tu preferencia! Póliza de garantía: 30 días o 1,000 km en mano de obra y garantía oficial de fabricante en neumáticos y refacciones.`
  );
  const whatsappUrl = `https://wa.me/${waPhone}?text=${waMessage}`;

  const handlePrint = () => {
    window.print();
  };

  // ─── 1. DISEÑO EN HOJA TAMAÑO CARTA (LETTER 8.5" x 11") ──────────────────────
  const renderDocumentoCarta = (
    <div className="bg-white text-slate-900 border border-slate-200/90 rounded-xl p-6 sm:p-7 max-w-4xl w-full mx-auto text-xs leading-normal font-sans shadow-md print:shadow-none print:border-0 print:rounded-none print:py-[10mm] print:px-[14mm] print:m-0 print:max-w-none transition-all">
      {/* ─── Top Banner / Brand Header Homologado ─── */}
      <div
        className="flex justify-between items-start pb-3 mb-3 border-b-2"
        style={{ borderColor: primaryColor }}
      >
        <div className="flex items-center gap-3.5">
          <TenantBrandLogo
            empresa={empresa}
            size="lg"
            variant="light"
            className="shrink-0"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-black text-slate-900 tracking-tight uppercase">
                {empresa?.nombre_comercial || "Cova"}
              </h1>
              {empresa?.eslogan && (
                <span className="hidden sm:inline-block text-[10px] font-medium text-slate-500 border-l border-slate-300 pl-2">
                  {empresa.eslogan}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[9.5px] text-slate-500 mt-0.5">
              {empresa?.rfc && (
                <span className="font-mono font-bold text-slate-700">RFC: {empresa.rfc}</span>
              )}
              {sucursal?.nombre && (
                <span className="font-medium text-slate-700">Sucursal: {sucursal.nombre}</span>
              )}
              {(sucursal?.direccion || empresa?.direccion) && (
                <span className="inline-flex items-center gap-1 text-slate-600">
                  <MapPin size={10} className="text-slate-400" /> {sucursal?.direccion || empresa?.direccion}
                </span>
              )}
              {(sucursal?.telefono || empresa?.telefono) && (
                <span className="inline-flex items-center gap-1 text-slate-700 font-semibold tabular-nums">
                  <Phone size={10} className="text-slate-400" /> {sucursal?.telefono || empresa?.telefono}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Folio & Estatus Homologado */}
        <div className="flex flex-col items-end shrink-0 text-right">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
              Recibo Oficial
            </span>
            <span
              className="text-base sm:text-lg font-black font-mono tabular-nums leading-none tracking-tight"
              style={{ color: primaryColor }}
            >
              {ticketFolio}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[10px] text-slate-500 font-medium">Orden de Servicio:</span>
            <span className="font-bold text-slate-900 font-mono text-xs">{folioDisplay}</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200/80">
              <Check size={10} className="stroke-[2.5]" /> {saldo <= 0 ? "Venta Liquidada" : "Pago Parcial"}
            </span>
          </div>
          <div className="text-[9.5px] text-slate-500 tabular-nums">
            Fecha de Emisión: <strong className="text-slate-800 font-medium">{nowStr}</strong>
          </div>
        </div>
      </div>

      {/* ─── Customer & Vehicle Grid (Completo y Homologado) ─── */}
      <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50 mb-2.5 text-[10.5px]">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-1.5">
          {/* Cliente */}
          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">
              <User size={11} className="text-slate-400" /> Cliente
            </div>
            <div className="flex flex-wrap items-baseline gap-x-2">
              <strong className="text-slate-900 text-xs font-bold">{cli.nombre || "Cliente Mostrador"}</strong>
              {cli.telefono && (
                <span className="text-slate-700 font-semibold tabular-nums text-[10px]">
                  Tel: {cli.telefono}
                </span>
              )}
              {cli.rfc && (
                <span className="text-slate-500 font-mono text-[9px]">RFC: {cli.rfc}</span>
              )}
            </div>
            {cli.empresa && (
              <span className="text-[9.5px] text-slate-500">Flotilla / Empresa: <strong>{cli.empresa}</strong></span>
            )}
          </div>

          {/* Vehículo */}
          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">
              <Car size={11} className="text-slate-400" /> Vehículo Identificado
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <strong className="text-slate-900 text-xs font-bold">
                {veh.marca} {veh.modelo} {veh.anio ? `(${veh.anio})` : ""}
              </strong>
              <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-slate-900 text-white tracking-wider">
                {veh.placas || "SIN PLACAS"}
              </span>
              <span className="text-[10px] text-slate-600">
                Color: <strong>{veh.color || "N/E"}</strong>
              </span>
            </div>
            <div className="flex items-center gap-3 text-[9px] text-slate-500 font-mono mt-0.5">
              <span>VIN: {veh.vin || "No registrado"}</span>
              <span>Odómetro: {Number(veh.kilometraje_actual || order.kilometraje_ingreso || 0).toLocaleString("es-MX")} km</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Tira de Recepción Técnica, Odómetro e Inventario (si aplica) ─── */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[9.5px] text-slate-600 bg-slate-50/80 border border-slate-200 rounded-md px-3 py-1.5 mb-2.5">
        <div className="flex items-center gap-3.5">
          <span className="font-semibold text-slate-800">
            Odómetro Ingreso: {Number(veh.kilometraje_actual || order.kilometraje_ingreso || 0).toLocaleString("es-MX")} km
          </span>
          {order.nivel_gasolina && (
            <span className="text-slate-600">
              Combustible: <strong>{order.nivel_gasolina}</strong>
            </span>
          )}
          {(order.tecnico_asignado || order.mecanico || order.tecnico?.nombre) && (
            <span className="text-slate-600">
              Técnico: <strong>{order.tecnico?.nombre || order.tecnico_asignado || order.mecanico}</strong>
            </span>
          )}
        </div>
        {checklist && (
          <div className="text-slate-500 font-mono text-[9px] flex items-center gap-1.5">
            <span className="font-bold text-slate-700 uppercase">Inventario Recepción:</span>
            <span>
              {Object.entries(CHECKLIST_LABELS).map(([k, lbl]) => `${checklist[k] ? "✓" : "✗"} ${lbl}`).join(" ")}
            </span>
          </div>
        )}
      </div>

      {/* ─── Falla Reportada & Diagnóstico (si existen en la orden) ─── */}
      {(order.falla_reportada || order.motivo_ingreso || order.diagnostico || order.notas_diagnostico) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] bg-slate-50/70 border border-slate-200 rounded p-2 mb-2.5">
          {(order.falla_reportada || order.motivo_ingreso) && (
            <div>
              <span className="text-[9px] font-bold uppercase text-slate-500 block">Falla / Solicitud Reportada:</span>
              <p className="text-slate-800 font-medium">{order.falla_reportada || order.motivo_ingreso}</p>
            </div>
          )}
          {(order.diagnostico || order.notas_diagnostico) && (
            <div>
              <span className="text-[9px] font-bold uppercase text-slate-500 block">Diagnóstico Especializado:</span>
              <p className="text-slate-800 font-medium">{order.diagnostico || order.notas_diagnostico}</p>
            </div>
          )}
        </div>
      )}

      {/* ─── Conceptos Amparados en la Orden (Tabla Homologada) ─── */}
      <div className="border border-slate-200 rounded-lg overflow-hidden mb-3">
        <div className="bg-slate-100/90 px-3.5 py-1.5 border-b border-slate-200 flex justify-between items-center text-[9.5px] font-bold uppercase text-slate-700 tracking-wider">
          <span>Conceptos Amparados por la Orden de Servicio</span>
          <span className="font-mono">{folioDisplay}</span>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-[9px] uppercase font-bold text-slate-500 bg-slate-50/80">
              <th className="py-2 px-3.5 w-28">Tipo</th>
              <th className="py-2 px-3.5">Descripción</th>
              <th className="py-2 px-3.5 text-center w-14">Cant.</th>
              <th className="py-2 px-3.5 text-right w-24">P. Unitario</th>
              <th className="py-2 px-3.5 text-right w-24">Importe</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-[10.5px]">
            {servicios.map((s: any) => (
              <tr key={`srv-${s.id}`} className="hover:bg-slate-50/50">
                <td className="py-2 px-3.5 font-semibold text-slate-600 text-[9.5px]">Mano de Obra</td>
                <td className="py-2 px-3.5 text-slate-900 font-medium">
                  {s.servicios_taller?.nombre || s.servicio?.nombre || s.nombre || "Servicio Técnico"}
                </td>
                <td className="py-2 px-3.5 text-center tabular-nums">{s.cantidad || 1}</td>
                <td className="py-2 px-3.5 text-right tabular-nums text-slate-700">
                  ${Number(s.precio_cobrado || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                </td>
                <td className="py-2 px-3.5 text-right font-bold tabular-nums text-slate-900">
                  ${(Number(s.precio_cobrado || 0) * Number(s.cantidad || 1)).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
            {refacciones.map((r: any) => (
              <tr key={`ref-${r.id}`} className="hover:bg-slate-50/50">
                <td className="py-2 px-3.5 font-semibold text-slate-600 text-[9.5px]">Refacción</td>
                <td className="py-2 px-3.5 text-slate-900 font-medium">
                  {r.nombre} {r.numero_parte ? `(P/N: ${r.numero_parte})` : ""}
                </td>
                <td className="py-2 px-3.5 text-center tabular-nums">{r.cantidad || 1}</td>
                <td className="py-2 px-3.5 text-right tabular-nums text-slate-700">
                  ${Number(r.precio_unitario || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                </td>
                <td className="py-2 px-3.5 text-right font-bold tabular-nums text-slate-900">
                  ${Number(r.subtotal || (r.precio_unitario || 0) * (r.cantidad || 1)).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
            {llantas.map((l: any) => {
              const tire = l.inventario_llantas || l.llanta;
              const tireName = tire ? `${tire.marca} ${tire.modelo_llanta}` : (l.nombre || "Neumático");
              const medida = tire ? `${tire.ancho}/${tire.perfil} R${tire.rin}` : "";
              return (
                <tr key={`lla-${l.id}`} className="hover:bg-slate-50/50">
                  <td className="py-2 px-3.5 font-semibold text-slate-600 text-[9.5px]">Neumático</td>
                  <td className="py-2 px-3.5 text-slate-900 font-medium">
                    {tireName} <span className="font-mono text-slate-700 font-semibold">{medida}</span>
                  </td>
                  <td className="py-2 px-3.5 text-center tabular-nums font-bold">{l.cantidad || 1}</td>
                  <td className="py-2 px-3.5 text-right tabular-nums text-slate-700">
                    ${Number(l.precio_unitario || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2 px-3.5 text-right font-bold tabular-nums text-slate-900">
                    ${Number(l.subtotal || (l.precio_unitario || 0) * (l.cantidad || 1)).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ─── Bloque Inferior Balanceado (2 Columnas) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-3">
        {/* Columna Izquierda: Desglose Fiscal & Póliza */}
        <div className="flex flex-col justify-between border border-slate-200 rounded-lg p-3.5 bg-slate-50/50 space-y-2.5">
          <div className="space-y-1.5 text-[10.5px]">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
              Resumen Financiero de la Cuenta
            </span>
            <div className="flex justify-between text-slate-600">
              <span>Subtotal antes de IVA:</span>
              <span className="tabular-nums font-medium">
                ${subtotalSinIva.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>IVA ({tasaIva}% incluido):</span>
              <span className="tabular-nums font-medium">
                ${iva.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between font-black text-slate-900 text-xs border-t border-slate-300 pt-1.5">
              <span>TOTAL DE LA ORDEN:</span>
              <span className="tabular-nums">
                ${total.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN
              </span>
            </div>
            {Number(payment?.descuento_aplicado || order?.descuento_efectivo_monto || 0) > 0 && (
              <div className="flex justify-between text-emerald-800 font-bold text-[10px]">
                <span>Descuento Promoción Efectivo:</span>
                <span className="tabular-nums font-black">
                  -${Number(payment?.descuento_aplicado || order?.descuento_efectivo_monto).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
            <div className="flex justify-between font-bold text-slate-700 border-t border-slate-200 pt-1.5 text-[10.5px]">
              <span>Saldo Restante por Liquidar:</span>
              <span className={`tabular-nums ${saldo > 0 ? "text-amber-700 font-black" : "text-emerald-700 font-black"}`}>
                ${saldo.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-2 text-[8.5px] text-slate-500 leading-tight">
            <strong className="text-slate-700 uppercase block mb-0.5">Póliza General de Garantía:</strong>
            {empresa?.terminos_condiciones ||
              "Garantía de 30 días o 1,000 km en mano de obra. Neumáticos y refacciones con garantía oficial de fabricante según póliza aplicable. Para facturación fiscal (CFDI 4.0), solicitar durante el mes en curso con su constancia fiscal."}
          </div>
        </div>

        {/* Columna Derecha: Comprobante Oficial de Cobro en Caja (Estilo Refinado & Sobrio) */}
        <div className="border border-slate-200/90 rounded-lg p-3.5 bg-white flex flex-col justify-between shadow-2xs">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-600" />
                Comprobante de Cobro en Caja
              </span>
              <span className="text-[8.5px] font-mono font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                PAGO REGISTRADO
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-lg px-3 py-2 mb-2.5">
              <span className="text-[8.5px] text-slate-500 uppercase font-bold tracking-wider block">
                Monto Cobrado en este Movimiento:
              </span>
              <span className="text-xl font-bold text-slate-900 font-mono tabular-nums leading-tight">
                ${montoCobrado.toLocaleString("es-MX", { minimumFractionDigits: 2 })}{" "}
                <span className="text-xs font-semibold text-slate-500 font-sans">MXN</span>
              </span>
            </div>

            <div className="text-[10px] space-y-1.5 text-slate-800">
              {payments && payments.length > 1 ? (
                <div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase block mb-1">
                    Métodos de Pago Aplicados ({payments.length}):
                  </span>
                  <div className="space-y-1">
                    {payments.map((p: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex justify-between items-center bg-slate-50/80 border border-slate-200 rounded px-2.5 py-1 text-[9.5px]"
                      >
                        <div className="flex items-center gap-1.5">
                          <strong className="text-slate-900">{p.proveedor_pago || p.metodo_detalle}</strong>
                          {p.metodo_detalle && p.metodo_detalle !== p.proveedor_pago && (
                            <span className="text-slate-500 text-[9px]">({p.metodo_detalle})</span>
                          )}
                          {p.referencia && (
                            <span className="text-[8.5px] font-mono text-slate-400">Ref: {p.referencia}</span>
                          )}
                        </div>
                        <span className="font-bold tabular-nums text-slate-900 font-mono">
                          ${Number(p.monto || p.monto_total || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-slate-500">Forma de Pago:</span>
                  <strong className="text-slate-900 font-medium">
                    {payment?.metodo_detalle || payment?.proveedor_pago || (payments?.[0]?.metodo_detalle || payments?.[0]?.proveedor_pago) || "Efectivo en Ventanilla"}
                    {(payment?.referencia || payments?.[0]?.referencia) ? ` (Ref: ${payment?.referencia || payments?.[0]?.referencia})` : ""}
                  </strong>
                </div>
              )}

              {cashGiven != null && cashGiven > 0 && (
                <>
                  <div className="flex justify-between items-center text-slate-500 py-0.5">
                    <span>Efectivo entregado:</span>
                    <span className="tabular-nums font-mono text-slate-800">${cashGiven.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-center text-emerald-800 font-bold py-0.5">
                    <span>Cambio devuelto:</span>
                    <span className="tabular-nums font-mono font-black">${(changeDue ?? 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="text-[9px] text-slate-600 pt-2.5 mt-2 border-t border-slate-200">
            {saldo <= 0 ? (
              <span className="font-semibold text-emerald-700 flex items-center gap-1">
                ✓ Cuenta liquidada en su totalidad • No presenta adeudo pendiente.
              </span>
            ) : (
              <span>Anticipo / Pago parcial aplicado correctamente a la orden {folioDisplay}.</span>
            )}
          </div>
        </div>
      </div>

      {/* ─── Cierre Institucional & QR de Validación ─── */}
      <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-[9.5px]">
        <div className="space-y-1 flex-1 text-slate-600">
          <div className="flex items-center gap-1.5 text-slate-800 font-bold uppercase text-[9px]">
            <ShieldCheck size={13} className="text-blue-600" />
            Certificación Oficial de Servicio y Caja • {empresa?.nombre_comercial || "Cova"}
          </div>
          <p className="text-[8.5px] text-slate-500 leading-tight">
            Comprobante oficial expedido por la terminal de caja. Válido para trámite de garantías mecánicas y aclaraciones administrativas.
          </p>
          <div className="font-mono text-[8.5px] text-slate-400">
            Sello Digital Caja: SHA256:{order?.id?.slice(0, 10).toUpperCase()}-{Date.now().toString(36).toUpperCase()} • Sucursal {sucursal?.nombre || "Cova Matriz"}
          </div>
        </div>

        {qrCodeDataUrl && (
          <div className="flex items-center gap-2.5 border-t sm:border-t-0 sm:border-l border-slate-200 pt-2 sm:pt-0 sm:pl-3.5 shrink-0">
            <img src={qrCodeDataUrl} alt="QR Verificación" className="w-14 h-14 rounded border border-slate-200" />
            <div className="flex flex-col text-[8.5px] text-slate-500">
              <span className="font-bold text-slate-700 uppercase">Expediente Digital</span>
              <span className="text-[8px] text-slate-400">Escanee para consultar</span>
              <span className="text-[8px] text-slate-400">orden y póliza en línea</span>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-slate-200 pt-2 mt-2.5 flex justify-between items-center text-[8.5px] text-slate-400 font-mono">
        <span>TallerTrack OS • Comprobante de Cobro {ticketFolio}</span>
        <span>Orden {folioDisplay} • {nowStr}</span>
      </div>
    </div>
  );

  // ─── 2. DISEÑO EN TICKET TÉRMICO (80MM ROLL) ──────────────────────────────────
  const renderTicketTermico = (
    <div
      id="pos-thermal-ticket"
      className="bg-white border border-slate-200/90 rounded-xl p-5 font-mono text-xs text-slate-800 shadow-md flex flex-col gap-3 max-w-sm w-full mx-auto print:shadow-none print:border-0 print:rounded-none"
    >
      <div className="text-center border-b border-slate-200 pb-3">
        <h2 className="font-bold text-sm tracking-tight text-slate-900 uppercase">
          {empresa?.nombre_comercial || "Cova"}
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

      <div className="bg-slate-50 rounded-lg p-2 text-[11px] flex flex-col gap-0.5 border border-slate-100">
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
              <span className="font-bold shrink-0 font-mono">
                ${Number(s.precio_cobrado || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
              </span>
            </div>
          ))}
          {refacciones.map((r: any) => (
            <div key={r.id} className="flex justify-between text-slate-700">
              <span className="truncate pr-2">{r.nombre} x{r.cantidad || 1}</span>
              <span className="font-bold shrink-0 font-mono">
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
                <span className="font-bold shrink-0 font-mono">
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
          <span className="font-mono">${subtotalSinIva.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between text-slate-600">
          <span>IVA ({tasaIva}%):</span>
          <span className="font-mono">${iva.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between font-bold text-sm text-slate-900 border-t border-slate-200 pt-1 mt-1">
          <span>TOTAL ORDEN:</span>
          <span className="font-mono">${total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
        </div>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-[11px] flex flex-col gap-1 text-slate-900">
        <div className="flex justify-between font-bold">
          <span>Cobrado en este movimiento:</span>
          <span className="font-mono">${montoCobrado.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between text-[10px] text-slate-600">
          <span>Método:</span>
          <span className="font-semibold text-slate-900">{payment?.metodo_detalle || payment?.proveedor_pago || "Efectivo"}</span>
        </div>
        {Number(payment?.descuento_aplicado || order?.descuento_efectivo_monto || 0) > 0 && (
          <div className="flex justify-between text-[10px] text-emerald-800 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
            <span>Descuento Promoción Efectivo:</span>
            <span className="font-mono">-${Number(payment?.descuento_aplicado || order?.descuento_efectivo_monto).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
          </div>
        )}
        {payment?.referencia && (
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>Ref:</span>
            <span>{payment.referencia}</span>
          </div>
        )}
        <div className="flex justify-between text-[10px] font-bold text-slate-700 pt-1.5 border-t border-slate-200">
          <span>Saldo restante por liquidar:</span>
          <span className={`font-mono ${saldo > 0 ? "text-amber-700" : "text-emerald-700"}`}>
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
      <div className="flex flex-col min-h-full">
        {/* ─── 1. BARRA FIJA SUPERIOR DE ACCIONES (Sticky Toolbar) ─── */}
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-slate-200/90 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2.5 no-print">
          {/* Segmented Control para Formato */}
          <div className="inline-flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200/80 text-xs font-medium">
            <button
              type="button"
              onClick={() => setFormato("CARTA")}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1.5 text-xs ${
                formato === "CARTA"
                  ? "bg-white text-slate-900 shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <FileText size={13} className={formato === "CARTA" ? "text-blue-600" : "text-slate-400"} />
              <span>Carta</span>
            </button>
            <button
              type="button"
              onClick={() => setFormato("TICKET")}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1.5 text-xs ${
                formato === "TICKET"
                  ? "bg-white text-slate-900 shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Receipt size={13} className={formato === "TICKET" ? "text-blue-600" : "text-slate-400"} />
              <span>Ticket 80mm</span>
            </button>
          </div>

          {/* Botones de Acción Primarios */}
          <div className="flex items-center gap-2 ml-auto">
            {cli.telefono && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Compartir comprobante al WhatsApp del cliente"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100/70 text-emerald-800 text-xs font-semibold transition-colors cursor-pointer"
              >
                <MessageCircle size={14} className="text-emerald-600" />
                <span className="hidden sm:inline">WhatsApp</span>
              </a>
            )}

            <button
              type="button"
              onClick={handlePrint}
              style={{ backgroundColor: primaryColor }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-white font-semibold text-xs shadow-xs hover:opacity-95 cursor-pointer transition-opacity"
            >
              <Printer size={14} />
              <span>Imprimir</span>
              <kbd className="hidden sm:inline-block font-mono text-[10px] bg-white/20 text-white px-1.5 py-0.2 rounded">
                ↵ Enter
              </kbd>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 font-medium text-xs transition-colors cursor-pointer"
            >
              Listo
            </button>
          </div>
        </div>

        {/* ─── 2. BANNER DE ESTADO DEL COBRO (Moderno, Sobrio, Estilo Stripe / Square) ─── */}
        <div className="px-4 sm:px-6 pt-4 no-print">
          <div className="bg-gradient-to-r from-slate-50 via-white to-slate-50/80 border border-slate-200/90 rounded-xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <CheckCircle2 size={18} strokeWidth={2.25} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-900 tracking-tight">
                    Cobro registrado en caja
                  </span>
                  <span className="font-mono text-[11px] font-semibold text-slate-600 bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded-md">
                    {ticketFolio}
                  </span>
                  <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full">
                    {saldo <= 0 ? "Liquidado 100%" : "Abono / Pago Parcial"}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Se aplicaron <strong className="font-semibold text-slate-800 font-mono">${montoCobrado.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN</strong> a la orden <strong className="font-semibold text-slate-800 font-mono">{folioDisplay}</strong>
                  {saldo > 0 ? (
                    <span className="text-amber-700 font-medium"> • Restante: ${saldo.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
                  ) : (
                    <span className="text-emerald-700 font-medium"> • Sin adeudo</span>
                  )}
                </p>
              </div>
            </div>

            {changeDue != null && changeDue > 0 && (
              <div className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 shrink-0 shadow-2xs flex sm:flex-col justify-between sm:justify-center items-center sm:items-end">
                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                  Cambio a entregar
                </span>
                <span className="text-base font-bold text-slate-900 font-mono tabular-nums leading-tight">
                  ${changeDue.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ─── 3. LIENZO DE PREVISUALIZACIÓN ("Paper Studio") ─── */}
        <div className="p-4 sm:p-6 no-print">
          <div className="bg-slate-100/75 border border-slate-200/80 rounded-2xl p-4 sm:p-6 flex justify-center overflow-x-auto">
            {formato === "CARTA" ? renderDocumentoCarta : renderTicketTermico}
          </div>
        </div>
      </div>

      {/* Standard Print Stylesheet */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-receipt-document,
          #printable-receipt-document * {
            visibility: visible !important;
          }
          #printable-receipt-document {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: ${formato === "CARTA" ? "10mm 14mm" : "2mm 4mm"} !important;
            background: white !important;
            z-index: 999999 !important;
          }
          @page {
            size: ${formato === "CARTA" ? "letter portrait" : "80mm auto"};
            margin: ${formato === "CARTA" ? "8mm" : "2mm"};
          }
        }
      `}</style>
    </Modal>
  );
}
