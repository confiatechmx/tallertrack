"use client";

import React, { useState, useEffect } from "react";
import { X, DollarSign, Building2, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import { ProveedorService, Proveedor, ProveedorAbonoInsert, CompraConProveedor } from "@/services/proveedorService";

interface RegistrarAbonoModalProps {
  isOpen: boolean;
  onClose: () => void;
  empresaId: string;
  sucursalId?: string;
  defaultProveedorId?: string;
  proveedores: Proveedor[];
  onAbonoRegistrado?: () => void;
}

export function RegistrarAbonoModal({
  isOpen,
  onClose,
  empresaId,
  sucursalId,
  defaultProveedorId,
  proveedores,
  onAbonoRegistrado,
}: RegistrarAbonoModalProps) {
  const [proveedorId, setProveedorId] = useState<string>(defaultProveedorId || "");
  const [monto, setMonto] = useState<string>("");
  const [metodoPago, setMetodoPago] = useState<"EFECTIVO_CAJA" | "TRANSFERENCIA" | "FONDO_RESERVA" | "OTRO">("TRANSFERENCIA");
  const [referencia, setReferencia] = useState<string>("");
  const [compraId, setCompraId] = useState<string>("");
  const [comprasPendientes, setComprasPendientes] = useState<CompraConProveedor[]>([]);
  const [loadingCompras, setLoadingCompras] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (defaultProveedorId) {
      setProveedorId(defaultProveedorId);
    } else if (proveedores.length > 0 && !proveedorId) {
      setProveedorId(proveedores[0].id);
    }
  }, [defaultProveedorId, proveedores]);

  useEffect(() => {
    if (proveedorId) {
      cargarComprasPendientes(proveedorId);
    } else {
      setComprasPendientes([]);
    }
  }, [proveedorId]);

  const cargarComprasPendientes = async (pId: string) => {
    setLoadingCompras(true);
    const { data } = await ProveedorService.obtenerCompras({
      empresaId,
      proveedorId: pId,
      soloDeudas: true,
    });
    setComprasPendientes(data || []);
    setLoadingCompras(false);
  };

  const proveedorSeleccionado = proveedores.find((p) => p.id === proveedorId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const montoNum = parseFloat(monto);
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
      const payload: ProveedorAbonoInsert = {
        empresa_id: empresaId,
        sucursal_id: sucursalId || null,
        proveedor_id: proveedorId,
        compra_id: compraId || null,
        monto: montoNum,
        metodo_pago: metodoPago,
        referencia: referencia.trim() || null,
      };

      const res = await ProveedorService.registrarAbono(payload);
      if (res.error) throw new Error(res.error);

      if (onAbonoRegistrado) onAbonoRegistrado();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Error al registrar el abono");
    } finally {
      setGuardando(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
              <DollarSign className="w-4 h-4" />
            </span>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Registrar Abono a Proveedor</h3>
              <p className="text-[11px] text-slate-500">Abonar a cuenta corriente o liquidar factura</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs">
          {errorMsg && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Selector Proveedor */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Proveedor *</label>
            <select
              value={proveedorId}
              onChange={(e) => setProveedorId(e.target.value)}
              className="w-full h-9 px-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-1 focus:ring-primary font-medium"
              required
            >
              <option value="">Selecciona proveedor...</option>
              {proveedores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre_comercial} (Deuda: ${Number(p.saldo_deudor_actual || 0).toLocaleString("es-MX")})
                </option>
              ))}
            </select>
            {proveedorSeleccionado && (
              <p className="text-[11px] text-slate-500 mt-1 flex justify-between">
                <span>Saldo deudor actual:</span>
                <strong className={proveedorSeleccionado.saldo_deudor_actual > 0 ? "text-amber-700" : "text-emerald-700"}>
                  ${Number(proveedorSeleccionado.saldo_deudor_actual || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                </strong>
              </p>
            )}
          </div>

          {/* Aplicar a compra específica (opcional) */}
          {comprasPendientes.length > 0 && (
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Aplicar a Factura / Ticket Específico (Opcional)
              </label>
              <select
                value={compraId}
                onChange={(e) => {
                  setCompraId(e.target.value);
                  const found = comprasPendientes.find((c) => c.id === e.target.value);
                  if (found) {
                    setMonto(found.monto_saldo_pendiente.toString());
                  }
                }}
                className="w-full h-9 px-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-1 focus:ring-primary"
              >
                <option value="">Abono general a cuenta corriente</option>
                {comprasPendientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    Ticket #{c.folio_ticket_nota} - {c.descripcion} (Saldo: ${Number(c.monto_saldo_pendiente).toLocaleString("es-MX")})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Monto del Abono */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Monto del Abono ($ MXN) *</label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-slate-400 font-bold">$</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0.00"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                className="w-full h-9 pl-7 pr-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-1 focus:ring-primary font-bold text-slate-900"
              />
            </div>
          </div>

          {/* Método de Pago */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Método de Pago / Fuente *</label>
            <select
              value={metodoPago}
              onChange={(e) => setMetodoPago(e.target.value as any)}
              className="w-full h-9 px-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-1 focus:ring-primary"
            >
              <option value="TRANSFERENCIA">Transferencia SPEI (Bancos)</option>
              <option value="EFECTIVO_CAJA">Efectivo de Mostrador (Genera Egreso en Caja Chica)</option>
              <option value="FONDO_RESERVA">Fondo de Reserva Taller</option>
              <option value="OTRO">Otro / Cheque</option>
            </select>
            {metodoPago === "EFECTIVO_CAJA" && (
              <p className="text-[10px] text-amber-700 mt-1">
                ⚠️ Se registrará automáticamente una salida de dinero en el turno activo de caja para cuadrar el corte del día.
              </p>
            )}
          </div>

          {/* Referencia o Folio SPEI */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Referencia / Comprobante / Rastreo SPEI</label>
            <input
              type="text"
              placeholder="ej. Rastreo BBVA 984712 o Recibo #44"
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
              className="w-full h-9 px-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="px-5 py-2 font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {guardando && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Aplicar Abono
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
