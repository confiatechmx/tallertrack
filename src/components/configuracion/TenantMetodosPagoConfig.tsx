"use client";

import React, { useState, useEffect } from "react";
import {
  CreditCard,
  Building2,
  Plus,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Landmark,
  Pencil,
  Trash2,
  Copy,
  Check,
  X,
  Sparkles,
  ShieldCheck,
  Banknote,
  Coins,
} from "lucide-react";
import { toast } from "sonner";
import {
  TenantMetodosPagoService,
  TenantMetodoPago,
} from "@/services/tenantMetodosPagoService";
import { CajaTurnoService, CuentaBancaria, CajaFondo } from "@/services/cajaTurnoService";
import { supabase } from "@/lib/supabase";

interface TenantMetodosPagoConfigProps {
  empresaId: string;
  sucursalId?: string;
}

const BANCOS_FRECUENTES = [
  "BBVA",
  "Banorte",
  "Santander",
  "BanBajío",
  "Inbursa",
  "Banregio",
  "Citibanamex",
  "Scotiabank",
  "HSBC",
  "Afirme",
  "Banco Azteca",
  "Nu México",
  "Mercado Pago",
  "Spin by OXXO",
  "Otro",
];

export function TenantMetodosPagoConfig({ empresaId, sucursalId }: TenantMetodosPagoConfigProps) {
  const [metodos, setMetodos] = useState<TenantMetodoPago[]>([]);
  const [cuentas, setCuentas] = useState<CuentaBancaria[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [fondos, setFondos] = useState<CajaFondo[]>([]);
  const [isFondoModalOpen, setIsFondoModalOpen] = useState(false);
  const [editingFondo, setEditingFondo] = useState<CajaFondo | null>(null);
  const [fondoNombre, setFondoNombre] = useState("");
  const [fondoSaldoActual, setFondoSaldoActual] = useState("");
  const [fondoMinimoAlerta, setFondoMinimoAlerta] = useState("");
  const [savingFondo, setSavingFondo] = useState(false);


  // Modal State for Nueva / Editar Cuenta
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCuenta, setEditingCuenta] = useState<CuentaBancaria | null>(null);
  const [bancoSeleccionado, setBancoSeleccionado] = useState("BBVA");
  const [otroBanco, setOtroBanco] = useState("");
  const [formAlias, setFormAlias] = useState("");
  const [formTitular, setFormTitular] = useState("");
  const [formClabe, setFormClabe] = useState("");
  const [formNumeroCuenta, setFormNumeroCuenta] = useState("");
  const [formEsFiscal, setFormEsFiscal] = useState(false);
  const [formActivo, setFormActivo] = useState(true);
  const [savingCuenta, setSavingCuenta] = useState(false);

  // Clipboard copy state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (empresaId) {
      cargarConfiguracion();
    }
  }, [empresaId, sucursalId]);

  const cargarConfiguracion = async () => {
    setLoading(true);
    const [metodosRes, cuentasData] = await Promise.all([
      TenantMetodosPagoService.obtenerMetodos(empresaId, sucursalId),
      CajaTurnoService.obtenerTodasLasCuentasBancarias(empresaId, sucursalId),
    ]);

    setMetodos(metodosRes.data);
    setCuentas(cuentasData);
    setLoading(false);
  };

  
  const handleOpenEditarFondo = (f: CajaFondo) => {
    setEditingFondo(f);
    setFondoNombre(f.nombre);
    setFondoSaldoActual(String(f.saldo_actual));
    setFondoMinimoAlerta(f.saldo_minimo_alerta !== null ? String(f.saldo_minimo_alerta) : "");
    setIsFondoModalOpen(true);
  };

  const handleSaveFondo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFondo) return;
    setSavingFondo(true);
    try {
      const res = await CajaTurnoService.actualizarFondo(editingFondo.id, {
        nombre: fondoNombre,
        saldo_actual: parseFloat(fondoSaldoActual) || 0,
        saldo_minimo_alerta: fondoMinimoAlerta ? parseFloat(fondoMinimoAlerta) : null,
      });
      if (!res.success) {
        toast.error(res.error || "No se pudo actualizar el fondo");
        return;
      }
      toast.success("Fondo de caja actualizado exitosamente");
      setIsFondoModalOpen(false);
      cargarConfiguracion();
    } catch (err: any) {
      toast.error(err.message || "Error al actualizar fondo");
    } finally {
      setSavingFondo(false);
    }
  };

  const handleOpenCrearCuenta = () => {
    setEditingCuenta(null);
    setBancoSeleccionado("BBVA");
    setOtroBanco("");
    setFormAlias("");
    setFormTitular("Cova Tires S.A. de C.V.");
    setFormClabe("");
    setFormNumeroCuenta("");
    setFormEsFiscal(false);
    setFormActivo(true);
    setIsModalOpen(true);
  };

  const handleOpenEditarCuenta = (c: CuentaBancaria) => {
    setEditingCuenta(c);
    if (BANCOS_FRECUENTES.includes(c.banco)) {
      setBancoSeleccionado(c.banco);
      setOtroBanco("");
    } else {
      setBancoSeleccionado("Otro");
      setOtroBanco(c.banco);
    }
    setFormAlias(c.alias || "");
    setFormTitular(c.titular || "");
    setFormClabe(c.clabe || "");
    setFormNumeroCuenta(c.numero_cuenta || "");
    setFormEsFiscal(Boolean(c.es_fiscal));
    setFormActivo(c.activo !== false);
    setIsModalOpen(true);
  };

  const handleSaveCuenta = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalBanco = bancoSeleccionado === "Otro" ? otroBanco.trim() : bancoSeleccionado;
    if (!finalBanco) {
      toast.error("Por favor indica el nombre del banco.");
      return;
    }
    if (!formAlias.trim()) {
      toast.error("Por favor asigna un alias descriptivo a la cuenta (ej. BBVA Fiscal).");
      return;
    }

    setSavingCuenta(true);
    try {
      const payload = {
        empresa_id: empresaId,
        sucursal_id: sucursalId || null,
        banco: finalBanco,
        alias: formAlias.trim(),
        titular: formTitular.trim() || null,
        clabe: formClabe.trim() || null,
        numero_cuenta: formNumeroCuenta.trim() || null,
        es_fiscal: formEsFiscal,
        tipo_cuenta: formEsFiscal ? "FISCAL" : "OPERATIVA",
        activo: formActivo,
      };

      if (editingCuenta) {
        const res = await CajaTurnoService.actualizarCuentaBancaria(editingCuenta.id, payload);
        if (res.error) throw new Error(res.error);
        toast.success(`Cuenta "${payload.alias}" actualizada correctamente.`);
      } else {
        const res = await CajaTurnoService.crearCuentaBancaria(payload);
        if (res.error) throw new Error(res.error);
        toast.success(`Cuenta "${payload.alias}" registrada exitosamente.`);
      }

      setIsModalOpen(false);
      await cargarConfiguracion();
    } catch (err: any) {
      console.error("Error guardando cuenta:", err);
      toast.error(err.message || "Error al guardar la cuenta bancaria.");
    } finally {
      setSavingCuenta(false);
    }
  };

  const handleToggleCuentaFiscal = async (cuentaId: string, currentVal: boolean) => {
    const newVal = !currentVal;
    setCuentas((prev) =>
      prev.map((c) => (c.id === cuentaId ? { ...c, es_fiscal: newVal, tipo_cuenta: newVal ? "FISCAL" : "OPERATIVA" } : c))
    );
    try {
      await CajaTurnoService.actualizarCuentaBancaria(cuentaId, { es_fiscal: newVal });
      toast.success(newVal ? "Cuenta clasificada como Fiscal (SAT)." : "Cuenta clasificada como Operativa.");
    } catch (err) {
      console.error("Error al actualizar cuenta bancaria:", err);
      toast.error("Error al actualizar clasificación fiscal.");
    }
  };

  const handleToggleCuentaActivo = async (cuentaId: string, currentVal: boolean) => {
    const newVal = !currentVal;
    setCuentas((prev) =>
      prev.map((c) => (c.id === cuentaId ? { ...c, activo: newVal } : c))
    );
    try {
      await CajaTurnoService.actualizarCuentaBancaria(cuentaId, { activo: newVal });
      toast.success(newVal ? "Cuenta activada en el Punto de Venta." : "Cuenta desactivada del Punto de Venta.");
    } catch (err) {
      console.error("Error al actualizar estatus de cuenta:", err);
      toast.error("Error al actualizar estatus.");
    }
  };

  const handleDeleteCuenta = async (cuenta: CuentaBancaria) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar la cuenta bancaria "${cuenta.alias}"?`)) {
      return;
    }
    try {
      const res = await CajaTurnoService.eliminarCuentaBancaria(cuenta.id);
      if (!res.success) throw new Error(res.error);
      toast.success(`Cuenta "${cuenta.alias}" eliminada.`);
      await cargarConfiguracion();
    } catch (err: any) {
      toast.error(err.message || "No se pudo eliminar la cuenta.");
    }
  };

  const handleCopyClabe = (cuenta: CuentaBancaria) => {
    if (!cuenta.clabe) return;
    navigator.clipboard.writeText(cuenta.clabe);
    setCopiedId(cuenta.id);
    toast.success(`CLABE de ${cuenta.alias} copiada al portapapeles.`);
    setTimeout(() => setCopiedId(null), 2500);
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
      toast.success("Comisión actualizada.");
    } catch (err) {
      console.error("Error al guardar comisión:", err);
      toast.error("Error al guardar comisión.");
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
      toast.success(newVal ? "Método habilitado en caja." : "Método deshabilitado.");
    } catch (err) {
      console.error("Error al activar/desactivar método:", err);
      toast.error("Error al cambiar estatus del método.");
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
      {/* ─── SECCIÓN 1: CUENTAS BANCARIAS SPEI (AUTOGESTIONABLE) ─── */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="p-5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              Catálogo de Cuentas Bancarias SPEI ({cuentas.length})
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-xl">
              Cuentas bancarias receptoras de transferencias del taller. Las cuentas activas se desplegarán automáticamente en la Terminal de Cobro POS.
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenCrearCuenta}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer transition-colors shrink-0"
          >
            <Plus size={15} />
            Nueva Cuenta Bancaria
          </button>
        </div>

        {cuentas.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-xs">
            No tienes cuentas bancarias registradas. Haz clic en "Nueva Cuenta Bancaria" para dar de alta las cuentas receptoras del taller.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {cuentas.map((c) => {
              const hasClabe = Boolean(c.clabe && c.clabe.trim());
              return (
                <div
                  key={c.id}
                  className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors ${
                    !c.activo ? "opacity-60 bg-slate-50/40" : ""
                  }`}
                >
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs ${
                        c.es_fiscal
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : "bg-blue-50 text-blue-800 border border-blue-200"
                      }`}
                    >
                      <Landmark className="w-5 h-5" />
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-black text-slate-900 text-xs tracking-tight">
                          {c.alias}
                        </span>
                        <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.2 rounded">
                          {c.banco}
                        </span>
                        {c.es_fiscal ? (
                          <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            🏛️ Fiscal (SAT)
                          </span>
                        ) : (
                          <span className="px-2 py-0.2 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
                            💼 Operativa
                          </span>
                        )}
                        {!c.activo && (
                          <span className="px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-amber-100 text-amber-800">
                            Inactiva
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1">
                        {hasClabe ? (
                          <span className="font-mono text-slate-700 font-semibold flex items-center gap-1.5">
                            CLABE: {c.clabe}
                            <button
                              type="button"
                              onClick={() => handleCopyClabe(c)}
                              title="Copiar CLABE"
                              className="text-slate-400 hover:text-blue-600 cursor-pointer p-0.5"
                            >
                              {copiedId === c.id ? (
                                <Check size={12} className="text-emerald-600" />
                              ) : (
                                <Copy size={12} />
                              )}
                            </button>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenEditarCuenta(c)}
                            className="inline-flex items-center gap-1 text-[10.5px] font-bold text-amber-800 bg-amber-100/80 hover:bg-amber-200 border border-amber-300 px-2 py-0.5 rounded cursor-pointer transition-colors"
                          >
                            <AlertCircle size={11} className="text-amber-700" />
                            Sin CLABE asignada • Clic para ingresar clave
                          </button>
                        )}

                        {c.numero_cuenta && (
                          <span className="font-mono text-slate-500">
                            Cuenta: {c.numero_cuenta}
                          </span>
                        )}

                        {c.titular && (
                          <span className="text-slate-400 truncate max-w-xs">
                            Titular: <strong className="text-slate-600">{c.titular}</strong>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions & Toggles */}
                  <div className="flex items-center justify-end gap-2.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold select-none">
                      <input
                        type="checkbox"
                        checked={Boolean(c.es_fiscal)}
                        onChange={() => handleToggleCuentaFiscal(c.id, Boolean(c.es_fiscal))}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span className={c.es_fiscal ? "text-emerald-700 font-bold text-[11px]" : "text-slate-500 text-[11px]"}>
                        Fiscal
                      </span>
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold select-none">
                      <input
                        type="checkbox"
                        checked={c.activo}
                        onChange={() => handleToggleCuentaActivo(c.id, c.activo)}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span className={c.activo ? "text-slate-700 text-[11px]" : "text-slate-400 text-[11px]"}>
                        Activa
                      </span>
                    </label>

                    <button
                      type="button"
                      onClick={() => handleOpenEditarCuenta(c)}
                      title="Editar cuenta bancaria"
                      className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                    >
                      <Pencil size={15} />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteCuenta(c)}
                      title="Eliminar cuenta"
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── MODAL AUTOGESTIONABLE: NUEVA / EDITAR CUENTA BANCARIA ─── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Landmark size={18} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    {editingCuenta ? "Editar Cuenta Bancaria" : "Registrar Nueva Cuenta Bancaria"}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Configura los datos del banco receptor para transferencias SPEI.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCuenta} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Banco */}
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                    Institución Bancaria *
                  </label>
                  <select
                    value={bancoSeleccionado}
                    onChange={(e) => setBancoSeleccionado(e.target.value)}
                    className="w-full h-9 bg-white border border-slate-300 rounded-lg px-2.5 text-xs font-bold text-slate-900 focus:ring-1 focus:ring-blue-500"
                  >
                    {BANCOS_FRECUENTES.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Alias */}
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                    Alias de la Cuenta *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. BBVA Fiscal Facturación"
                    value={formAlias}
                    onChange={(e) => setFormAlias(e.target.value)}
                    className="w-full h-9 bg-white border border-slate-300 rounded-lg px-2.5 text-xs font-semibold text-slate-900 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Si es Otro banco */}
              {bancoSeleccionado === "Otro" && (
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                    Nombre del Banco Personalizado *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Banco Base o CIBanco"
                    value={otroBanco}
                    onChange={(e) => setOtroBanco(e.target.value)}
                    className="w-full h-9 bg-white border border-slate-300 rounded-lg px-2.5 text-xs text-slate-900"
                  />
                </div>
              )}

              {/* Titular */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                  Titular de la Cuenta / Razón Social
                </label>
                <input
                  type="text"
                  placeholder="Ej. Cova Tires S.A. de C.V."
                  value={formTitular}
                  onChange={(e) => setFormTitular(e.target.value)}
                  className="w-full h-9 bg-white border border-slate-300 rounded-lg px-2.5 text-xs text-slate-900"
                />
              </div>

              {/* CLABE & Num Cuenta */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold uppercase text-slate-600">
                      CLABE Interbancaria (18 dígitos)
                    </label>
                    <span className="text-[10px] text-amber-700 font-semibold">Opcional por ahora</span>
                  </div>
                  <input
                    type="text"
                    maxLength={18}
                    placeholder="18 dígitos (puedes ingresarla después)"
                    value={formClabe}
                    onChange={(e) => setFormClabe(e.target.value.replace(/\D/g, ""))}
                    className="w-full h-9 bg-white border border-slate-300 rounded-lg px-2.5 text-xs font-mono font-bold text-slate-900 tracking-wider placeholder:tracking-normal placeholder:font-normal placeholder:text-slate-400 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                    Número de Cuenta / Tarjeta
                  </label>
                  <input
                    type="text"
                    placeholder="Opcional"
                    value={formNumeroCuenta}
                    onChange={(e) => setFormNumeroCuenta(e.target.value)}
                    className="w-full h-9 bg-white border border-slate-300 rounded-lg px-2.5 text-xs font-mono text-slate-900"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="pt-2 border-t border-slate-200 grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formEsFiscal}
                    onChange={(e) => setFormEsFiscal(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-slate-800 block text-[11px]">Cuenta Fiscal (SAT)</span>
                    <span className="text-[10px] text-slate-500">Para emisión de CFDI y auditoría</span>
                  </div>
                </label>

                <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formActivo}
                    onChange={(e) => setFormActivo(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-slate-800 block text-[11px]">Activa en POS</span>
                    <span className="text-[10px] text-slate-500">Visible en terminal de cobro</span>
                  </div>
                </label>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingCuenta}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 cursor-pointer shadow-xs flex items-center gap-1.5 transition-colors"
                >
                  {savingCuenta ? (
                    <>
                      <Loader2 size={13} className="animate-spin" /> Guardando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} /> Guardar Cuenta Bancaria
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      
      {/* ─── SECCIÓN: FONDOS DE CAJA CHICA (CONTROL DUAL) ─── */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="p-5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Banknote className="w-4 h-4 text-emerald-600" />
              Fondos de Caja Chica y Efectivo Físico ({fondos.length})
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-xl">
              Configura los saldos base para apertura de turno y los umbrales de alerta mínima para el mostrador (Fondo 1) y la reserva en caja fuerte (Fondo 2).
            </p>
          </div>
        </div>

        {fondos.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No hay fondos registrados para esta sucursal.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
            {fondos.map((f) => {
              const isOperativo = f.tipo === "OPERATIVO";
              return (
                <div key={f.id} className="p-5 flex flex-col justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {isOperativo ? (
                          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
                            <Banknote size={16} />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs shrink-0">
                            <Coins size={16} />
                          </div>
                        )}
                        <div>
                          <h3 className="text-xs font-bold text-slate-900">{f.nombre}</h3>
                          <span className={`text-[10px] font-semibold uppercase ${isOperativo ? "text-emerald-700" : "text-purple-700"}`}>
                            {isOperativo ? "Mostrador Operativo • Caja Diaria" : "Reserva • Caja Fuerte / Resguardo"}
                          </span>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isOperativo ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-purple-50 text-purple-800 border border-purple-200"
                      }`}>
                        {f.tipo}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Saldo Base Actual
                        </span>
                        <span className="text-base font-bold text-slate-900 tabular-nums">
                          ${Number(f.saldo_actual).toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN
                        </span>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Alerta Mínimo
                        </span>
                        <span className="text-base font-bold text-amber-700 tabular-nums">
                          ${Number(f.saldo_minimo_alerta || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleOpenEditarFondo(f)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Pencil size={13} />
                      Editar Fondo
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── SECCIÓN 2: TERMINALES Y COMISIONES MSI ─── */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="p-5 bg-slate-50 border-b border-slate-200">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-blue-600" />
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
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
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
                        className="w-full h-8 px-2 pr-7 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-300 rounded text-right focus:ring-1 focus:ring-blue-500"
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
    
      {/* ─── MODAL EDITAR FONDO DE CAJA ─── */}
      {isFondoModalOpen && editingFondo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-emerald-400">
                  <Banknote size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-bold">Editar Fondo de Caja</h3>
                  <p className="text-[11px] text-slate-300">
                    Configuración de saldo base y umbral de alerta
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFondoModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveFondo} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre del Fondo
                </label>
                <input
                  type="text"
                  required
                  value={fondoNombre}
                  onChange={(e) => setFondoNombre(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Saldo Base Recomendado / Inicial ($ MXN)
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  value={fondoSaldoActual}
                  onChange={(e) => setFondoSaldoActual(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Monto predeterminado sugerido para la apertura de turno y remesa.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Saldo Mínimo para Alerta ($ MXN)
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={fondoMinimoAlerta}
                  onChange={(e) => setFondoMinimoAlerta(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Si el saldo cae por debajo de este monto, el sistema avisará necesidad de traspaso.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFondoModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingFondo}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
                >
                  {savingFondo && <Loader2 size={13} className="animate-spin" />}
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
