"use client";

import React from "react";
import {
  Plus,
  Trash2,
  Banknote,
  CreditCard,
  Landmark,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Coins,
  Split,
  Percent,
} from "lucide-react";
import { MetodoPagoTipo, PaymentSplitItem } from "@/services/multiPaymentService";

interface SplitPaymentManagerProps {
  total: number;
  payments: PaymentSplitItem[];
  onChange: (payments: PaymentSplitItem[]) => void;
  disabled?: boolean;
  cuentasBancarias?: Array<{ id: string; banco: string; alias: string; es_fiscal?: boolean }>;
}

const METODO_OPTIONS: Array<{
  value: MetodoPagoTipo;
  label: string;
  icon: any;
  color: string;
}> = [
  { value: "Efectivo", label: "Efectivo", icon: Banknote, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  { value: "Tarjeta", label: "BanBajío Tarjeta (TPV)", icon: CreditCard, color: "text-blue-600 bg-blue-50 border-blue-200" },
  { value: "Mercado Pago", label: "Mercado Pago (1 Exhibición)", icon: CreditCard, color: "text-sky-600 bg-sky-50 border-sky-200" },
  { value: "MSI", label: "Mercado Pago (Meses Sin Intereses)", icon: CreditCard, color: "text-purple-600 bg-purple-50 border-purple-200" },
  { value: "Transferencia", label: "SPEI (Transferencia)", icon: Landmark, color: "text-indigo-600 bg-indigo-50 border-indigo-200" },
  { value: "KueskiPay", label: "KueskiPay (BNPL)", icon: Smartphone, color: "text-amber-600 bg-amber-50 border-amber-200" },
  { value: "Atrato", label: "Atrato Pago", icon: Smartphone, color: "text-indigo-600 bg-indigo-50 border-indigo-200" },
];

export function SplitPaymentManager({
  total,
  payments,
  onChange,
  disabled = false,
  cuentasBancarias = [],
}: SplitPaymentManagerProps) {
  // Sum of assigned amounts
  const totalCubierto = payments.reduce((acc, p) => acc + Number(p.monto || 0), 0);
  const restante = Math.max(0, total - totalCubierto);
  const sobrepago = Math.max(0, totalCubierto - total);
  const estaCompleto = Math.abs(totalCubierto - total) < 0.05;

  // Total cash change
  const cambioTotalEfectivo = payments
    .filter((p) => p.metodo === "Efectivo")
    .reduce((acc, p) => acc + Number(p.cambio || 0), 0);

  const calcularComisionMonto = (metodo: MetodoPagoTipo, monto: number, plazo?: number | null) => {
    let pct = 0;
    if (metodo === "Tarjeta") pct = 2.0; // BanBajío Tarjeta TPV base
    else if (metodo === "Mercado Pago") pct = 3.5; // MP 1 exhibición base
    else if (metodo === "MSI") {
      if (plazo === 3) pct = 7.5;
      else if (plazo === 6) pct = 11.5;
      else if (plazo === 9) pct = 15.5;
      else if (plazo === 12) pct = 19.5;
      else pct = 7.5;
    }
    const comision = Number(((monto * pct) / 100).toFixed(2));
    const neto = Number(Math.max(0, monto - comision).toFixed(2));
    return { pct, comision, neto };
  };

  const handleAddPayment = (metodo: MetodoPagoTipo = "Efectivo") => {
    const nextAmount = restante > 0 ? restante : 0;
    const { comision, neto } = calcularComisionMonto(metodo, nextAmount, 3);

    const newItem: PaymentSplitItem = {
      id: `p-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      metodo,
      monto: Number(nextAmount.toFixed(2)),
      montoRecibido: metodo === "Efectivo" ? Number(nextAmount.toFixed(2)) : undefined,
      cambio: 0,
      referencia: "",
      detalle: metodo === "Transferencia" && cuentasBancarias[0] ? cuentasBancarias[0].alias : "",
      cuentaBancariaId: metodo === "Transferencia" && cuentasBancarias[0] ? cuentasBancarias[0].id : undefined,
      plazoMsi: metodo === "MSI" ? 3 : undefined,
      comisionMonto: comision,
      montoNeto: neto,
      esFiscal: metodo === "Tarjeta" || (metodo === "Transferencia" && cuentasBancarias[0]?.es_fiscal),
    };
    onChange([...payments, newItem]);
  };

  const handleRemovePayment = (id: string) => {
    if (payments.length <= 1) return;
    onChange(payments.filter((p) => p.id !== id));
  };

  const handleUpdatePayment = (id: string, updates: Partial<PaymentSplitItem>) => {
    onChange(
      payments.map((p) => {
        if (p.id !== id) return p;
        const updated = { ...p, ...updates };

        // Recalculate cash change if applicable
        if (updated.metodo === "Efectivo") {
          const recibido = Number(updated.montoRecibido || 0);
          const monto = Number(updated.monto || 0);
          updated.cambio = recibido > monto ? Number((recibido - monto).toFixed(2)) : 0;
        }

        // Recalculate commission if card or MSI
        if (["Tarjeta", "Mercado Pago", "MSI"].includes(updated.metodo)) {
          const { comision, neto } = calcularComisionMonto(
            updated.metodo,
            Number(updated.monto || 0),
            updated.plazoMsi
          );
          updated.comisionMonto = comision;
          updated.montoNeto = neto;
        } else {
          updated.comisionMonto = 0;
          updated.montoNeto = Number(updated.monto || 0);
        }

        return updated;
      })
    );
  };

  const handleSplitEqually = (divisions: number) => {
    if (divisions < 2) return;
    const part = Number((total / divisions).toFixed(2));
    const newPayments: PaymentSplitItem[] = [];

    for (let i = 0; i < divisions; i++) {
      const isLast = i === divisions - 1;
      const amount = isLast
        ? Number((total - part * (divisions - 1)).toFixed(2))
        : part;

      const metodo: MetodoPagoTipo = i === 0 ? "Efectivo" : "Tarjeta";
      const { comision, neto } = calcularComisionMonto(metodo, amount, 3);

      newPayments.push({
        id: `split-${i}-${Date.now()}`,
        metodo,
        monto: amount,
        montoRecibido: metodo === "Efectivo" ? amount : undefined,
        cambio: 0,
        referencia: "",
        detalle: "",
        comisionMonto: comision,
        montoNeto: neto,
      });
    }
    onChange(newPayments);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Quick split actions toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-semibold text-slate-700 flex items-center gap-1.5">
          <Split className="w-3.5 h-3.5 text-slate-500" />
          Métodos de Pago ({payments.length})
        </span>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={disabled}
            onClick={() => handleSplitEqually(2)}
            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded border border-slate-300 transition-colors cursor-pointer"
          >
            Dividir en 2
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => handleSplitEqually(3)}
            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded border border-slate-300 transition-colors cursor-pointer"
          >
            Dividir en 3
          </button>
        </div>
      </div>

      {/* Payment Splits List */}
      <div className="flex flex-col gap-2.5 max-h-80 overflow-y-auto pr-1">
        {payments.map((p, index) => {
          const isCash = p.metodo === "Efectivo";
          const isCard = p.metodo === "Tarjeta" || p.metodo === "Mercado Pago" || p.metodo === "MSI";
          const isMSI = p.metodo === "MSI";
          const isTransfer = p.metodo === "Transferencia";
          const isBNPL = p.metodo === "KueskiPay" || p.metodo === "Atrato";

          return (
            <div
              key={p.id}
              className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex flex-col gap-2 transition-all shadow-xs"
            >
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-400 font-mono w-4">
                  #{index + 1}
                </span>

                {/* Method selector */}
                <select
                  disabled={disabled}
                  value={p.metodo}
                  onChange={(e) => {
                    const newMetodo = e.target.value as MetodoPagoTipo;
                    const { comision, neto } = calcularComisionMonto(newMetodo, p.monto, 3);
                    handleUpdatePayment(p.id, {
                      metodo: newMetodo,
                      montoRecibido: newMetodo === "Efectivo" ? p.monto : undefined,
                      cambio: 0,
                      plazoMsi: newMetodo === "MSI" ? 3 : undefined,
                      comisionMonto: comision,
                      montoNeto: neto,
                    });
                  }}
                  className="flex-1 h-9 bg-white border border-slate-300 rounded-md px-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
                >
                  {METODO_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                {/* Amount input */}
                <div className="relative w-36">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    $
                  </span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    disabled={disabled}
                    value={p.monto === 0 ? "" : p.monto}
                    placeholder="0.00"
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      handleUpdatePayment(p.id, {
                        monto: val,
                        montoRecibido: isCash ? (p.montoRecibido && p.montoRecibido >= val ? p.montoRecibido : val) : undefined,
                      });
                    }}
                    className="w-full h-9 pl-6 pr-2 bg-white border border-slate-300 rounded-md text-xs font-bold text-slate-900 text-right focus:outline-none focus:ring-1 focus:ring-primary shadow-xs tabular-nums"
                  />
                </div>

                {/* Delete line button */}
                {payments.length > 1 && (
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => handleRemovePayment(p.id)}
                    className="text-slate-400 hover:text-rose-600 p-1.5 transition-colors cursor-pointer rounded hover:bg-rose-50"
                    title="Eliminar este método de pago"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Sub-selector for MSI (3, 6, 9, 12 meses) */}
              {isMSI && (
                <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-slate-200/60 text-xs bg-purple-50/50 p-2 rounded-md">
                  <div>
                    <span className="text-[10px] text-purple-900 font-bold block">
                      Plazo Meses Sin Intereses (Mercado Pago)
                    </span>
                    <select
                      disabled={disabled}
                      value={p.plazoMsi || 3}
                      onChange={(e) => {
                        const msi = parseInt(e.target.value);
                        handleUpdatePayment(p.id, { plazoMsi: msi });
                      }}
                      className="w-full h-8 mt-0.5 px-2 bg-white border border-purple-200 rounded text-xs font-semibold text-purple-900"
                    >
                      <option value={3}>3 Mensualidades (Comisión 7.5%)</option>
                      <option value={6}>6 Mensualidades (Comisión 11.5%)</option>
                      <option value={9}>9 Mensualidades (Comisión 15.5%)</option>
                      <option value={12}>12 Mensualidades (Comisión 19.5%)</option>
                    </select>
                  </div>
                  <div className="flex flex-col justify-center text-right">
                    <span className="text-[10px] text-purple-700">Comisión taller: -${(p.comisionMonto || 0).toFixed(2)}</span>
                    <span className="text-xs font-bold text-purple-950">Neto: ${(p.montoNeto || p.monto).toFixed(2)}</span>
                  </div>
                </div>
              )}

              {/* Tarjeta 1 exhibición / BanBajío resumen de comisión */}
              {(p.metodo === "Tarjeta" || p.metodo === "Mercado Pago") && (
                <div className="flex items-center justify-between text-[11px] px-2 py-1 bg-blue-50/50 rounded border border-blue-100 text-blue-800">
                  <span className="flex items-center gap-1">
                    <Percent className="w-3 h-3 text-blue-600" />
                    Comisión {p.metodo === "Tarjeta" ? "BanBajío (2.0%)" : "Mercado Pago (3.5%)"} absorbida:
                  </span>
                  <span className="font-bold">
                    -${(p.comisionMonto || 0).toFixed(2)} | Neto: ${(p.montoNeto || p.monto).toFixed(2)}
                  </span>
                </div>
              )}

              {/* Conditional Extra Fields for Cash, Card, or SPEI */}
              {isCash && (
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 font-medium block">
                      Efectivo Entregado
                    </span>
                    <div className="relative mt-0.5">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        $
                      </span>
                      <input
                        type="number"
                        min={p.monto}
                        step="0.01"
                        disabled={disabled}
                        value={p.montoRecibido ?? p.monto}
                        onChange={(e) =>
                          handleUpdatePayment(p.id, {
                            montoRecibido: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full h-8 pl-5 pr-2 bg-white border border-slate-200 rounded text-xs text-slate-800 text-right font-medium tabular-nums shadow-xs"
                      />
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-medium block">
                      Cambio a Devolver
                    </span>
                    <div className="h-8 mt-0.5 px-2 bg-slate-100 rounded border border-slate-200 flex items-center justify-end font-bold text-xs text-slate-900 tabular-nums">
                      ${Number(p.cambio || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              )}

              {(isCard || isTransfer || isBNPL) && (
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 font-medium block">
                      {isCard ? "Terminal / Cuenta" : isTransfer ? "Cuenta Receptora SPEI" : "Plataforma"}
                    </span>
                    {isTransfer && cuentasBancarias && cuentasBancarias.length > 0 ? (
                      <select
                        disabled={disabled}
                        value={p.cuentaBancariaId || cuentasBancarias[0]?.id || ""}
                        onChange={(e) => {
                          const selectedId = e.target.value;
                          const cta = cuentasBancarias.find((c) => c.id === selectedId);
                          handleUpdatePayment(p.id, {
                            cuentaBancariaId: selectedId,
                            detalle: cta ? cta.alias : "Transferencia SPEI",
                            esFiscal: cta?.es_fiscal || false,
                          });
                        }}
                        className="w-full h-8 mt-0.5 px-2 bg-white border border-slate-200 rounded text-xs font-medium text-slate-800 shadow-xs focus:outline-hidden"
                      >
                        {cuentasBancarias.map((cta) => (
                          <option key={cta.id} value={cta.id}>
                            {cta.alias} {cta.es_fiscal ? "[Fiscal]" : "[Operativa]"}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        disabled={disabled}
                        placeholder={isCard ? "Ej. BanBajío TPV o MP Point" : isTransfer ? "Ej. BBVA Fiscal" : "Kueski"}
                        value={p.detalle || ""}
                        onChange={(e) => handleUpdatePayment(p.id, { detalle: e.target.value })}
                        className="w-full h-8 mt-0.5 px-2 bg-white border border-slate-200 rounded text-xs text-slate-800 shadow-xs"
                      />
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-medium block">
                      Ref. / Autorización / Voucher
                    </span>
                    <input
                      type="text"
                      disabled={disabled}
                      placeholder="Ej. AUTH-84920"
                      value={p.referencia || ""}
                      onChange={(e) => handleUpdatePayment(p.id, { referencia: e.target.value })}
                      className="w-full h-8 mt-0.5 px-2 bg-white border border-slate-200 rounded text-xs text-slate-800 shadow-xs font-mono"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Button to add another split payment line */}
      <button
        type="button"
        disabled={disabled || restante <= 0}
        onClick={() => handleAddPayment("Efectivo")}
        className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg border border-slate-300 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Plus className="w-3.5 h-3.5" />
        Agregar otro método de pago {restante > 0 ? `(Faltan $${restante.toFixed(2)})` : ""}
      </button>

      {/* Financial Status Summary */}
      <div className="bg-slate-100/80 rounded-lg p-2.5 flex flex-col gap-1 border border-slate-200 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-slate-500 font-medium">Total de la Venta:</span>
          <span className="font-bold text-slate-900">${total.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-500 font-medium">Monto Cubierto:</span>
          <span className={`font-bold ${estaCompleto ? "text-emerald-600" : "text-slate-900"}`}>
            ${totalCubierto.toFixed(2)}
          </span>
        </div>

        {restante > 0 && (
          <div className="flex items-center justify-between text-amber-700 font-semibold pt-1 border-t border-slate-200">
            <span className="flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> Saldo Pendiente:
            </span>
            <span>${restante.toFixed(2)}</span>
          </div>
        )}

        {sobrepago > 0 && (
          <div className="flex items-center justify-between text-blue-700 font-semibold pt-1 border-t border-slate-200">
            <span>Monto Excedente:</span>
            <span>+${sobrepago.toFixed(2)}</span>
          </div>
        )}

        {cambioTotalEfectivo > 0 && (
          <div className="flex items-center justify-between text-emerald-700 font-bold pt-1 border-t border-slate-200">
            <span className="flex items-center gap-1">
              <Coins className="w-3.5 h-3.5" /> Total Cambio a Entregar:
            </span>
            <span>${cambioTotalEfectivo.toFixed(2)}</span>
          </div>
        )}

        {estaCompleto && (
          <div className="flex items-center justify-center gap-1 text-emerald-700 font-bold pt-1 border-t border-slate-200">
            <CheckCircle2 className="w-4 h-4" /> Cobro 100% Cubierto
          </div>
        )}
      </div>
    </div>
  );
}
