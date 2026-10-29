"use client";

import React, { useState, useEffect } from "react";
import {
  CreditCard,
  Building2,
  Percent,
  Plus,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Smartphone,
  Banknote,
  Landmark,
} from "lucide-react";
import {
  TenantMetodosPagoService,
  TenantMetodoPago,
} from "@/services/tenantMetodosPagoService";
import { CajaTurnoService, CuentaBancaria } from "@/services/cajaTurnoService";
import { supabase } from "@/lib/supabase";

interface TenantMetodosPagoConfigProps {
  empresaId: string;
  sucursalId?: string;
}

export function TenantMetodosPagoConfig({ empresaId, sucursalId }: TenantMetodosPagoConfigProps) {
  const [metodos, setMetodos] = useState<TenantMetodoPago[]>([]);
  const [cuentas, setCuentas] = useState<CuentaBancaria[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    if (empresaId) {
      cargarConfiguracion();
    }
  }, [empresaId, sucursalId]);

  const cargarConfiguracion = async () => {
    setLoading(true);
    const [metodosRes, cuentasData] = await Promise.all([
      TenantMetodosPagoService.obtenerMetodos(empresaId, sucursalId),
      CajaTurnoService.obtenerCuentasBancarias(empresaId, sucursalId),
    ]);

    setMetodos(metodosRes.data);
    setCuentas(cuentasData);
    setLoading(false);
  };

  const handleToggleCuentaFiscal = async (cuentaId: string, currentVal: boolean) => {
    const newVal = !currentVal;
    setCuentas((prev) =>
      prev.map((c) => (c.id === cuentaId ? { ...c, es_fiscal: newVal } : c))
    );
    try {
      await supabase
        .from("cuentas_bancarias")
        .update({ es_fiscal: newVal, tipo_cuenta: newVal ? "FISCAL" : "OPERATIVA" })
        .eq("id", cuentaId);
    } catch (err) {
      console.error("Error al actualizar cuenta bancaria:", err);
    }
  };

  const handleUpdateMetodoComision = async (id: string, nuevaComision: number) => {
    setSavingId(id);
    setMetodos((prev) =>
      prev.map((m) => (m.id === id ? { ...m, comision_porcentaje: nuevaComision } : m))
    );
    try {
      await TenantMetodosPagoService.actualizarMetodo(id, {
        comision_porcentaje: nuevaComision,
      });
    } catch (err) {
      console.error("Error al guardar comisión:", err);
    } finally {
      setSavingId(null);
    }
  };

  const handleToggleMetodoActivo = async (id: string, currentVal: boolean) => {
    const newVal = !currentVal;
    setMetodos((prev) =>
      prev.map((m) => (m.id === id ? { ...m, activo: newVal } : m))
    );
    try {
      await TenantMetodosPagoService.actualizarMetodo(id, { activo: newVal });
    } catch (err) {
      console.error("Error al activar/desactivar método:", err);
    }
  };

  if (loading) {
    return (
      <div className="py-12 flex justify-center text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* SECCIÓN 1: CUENTAS BANCARIAS SPEI */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="p-5 bg-slate-50 border-b border-slate-200">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            Cuentas Bancarias SPEI y Clasificación Fiscal
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Indica qué cuentas receptoras son FISCALES (para declaración SAT y emisión de CFDI) vs OPERATIVAS.
          </p>
        </div>

        <div className="divide-y divide-slate-100">
          {cuentas.map((c) => (
            <div key={c.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs ${
                    c.es_fiscal ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"
                  }`}
                >
                  <Landmark className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-xs">{c.alias}</span>
                    <span className="text-[11px] text-slate-500">({c.banco})</span>
                  </div>
                  <span className="text-[11px] text-slate-400 block font-mono">
                    CLABE: {c.clabe || "Sin CLABE"} | Titular: {c.titular || "Cova Tires"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={Boolean(c.es_fiscal)}
                    onChange={() => handleToggleCuentaFiscal(c.id, Boolean(c.es_fiscal))}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span className={c.es_fiscal ? "text-emerald-700 font-bold" : "text-slate-500"}>
                    {c.es_fiscal ? "Cuenta Fiscal (SAT)" : "Cuenta Operativa"}
                  </span>
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECCIÓN 2: TERMINALES Y COMISIONES MSI */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="p-5 bg-slate-50 border-b border-slate-200">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" />
            Terminales de Tarjeta y Meses Sin Intereses (MSI)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Configura el porcentaje de comisión que la pasarela retiene por cada plazo (absorbido por el taller para calcular la utilidad neta).
          </p>
        </div>

        <div className="divide-y divide-slate-100">
          {metodos.map((m) => {
            const isCardOrMSI = ["TARJETA_CREDITO", "TARJETA_DEBITO", "MSI"].includes(m.tipo);
            return (
              <div
                key={m.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={m.activo}
                    onChange={() => handleToggleMetodoActivo(m.id, m.activo)}
                    className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold ${m.activo ? "text-slate-900" : "text-slate-400 line-through"}`}>
                        {m.nombre}
                      </span>
                      {m.plazo_msi && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200">
                          {m.plazo_msi} MSI
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400">Proveedor: {m.proveedor}</span>
                  </div>
                </div>

                {isCardOrMSI && (
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 font-medium">Comisión Deducida:</span>
                    <div className="flex items-center w-28 relative">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        disabled={!m.activo}
                        value={m.comision_porcentaje}
                        onChange={(e) =>
                          handleUpdateMetodoComision(m.id, parseFloat(e.target.value) || 0)
                        }
                        className="w-full h-8 px-2 pr-7 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-300 rounded text-right focus:ring-1 focus:ring-primary"
                      />
                      <span className="absolute right-2 text-xs font-bold text-slate-400">%</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
