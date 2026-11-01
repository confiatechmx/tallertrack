"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  KeyRound,
  Shield,
  Plus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Pencil,
  RotateCcw,
  UserCheck,
  UserX,
  X,
  Mail,
  Lock,
  Phone,
  Briefcase,
  Building2,
  Percent,
} from "lucide-react";
import { toast } from "sonner";
import {
  TenantUsuariosService,
  TenantUsuario,
  CrearUsuarioParams,
} from "@/services/tenantUsuariosService";
import { supabase } from "@/lib/supabase";

interface TenantUsuariosConfigSectionProps {
  empresaId: string;
  sucursalId?: string;
  sucursales: Array<{ id: string; nombre: string; codigo: string }>;
}

export function TenantUsuariosConfigSection({
  empresaId,
  sucursalId,
  sucursales,
}: TenantUsuariosConfigSectionProps) {
  const [subTab, setSubTab] = useState<"accesos" | "empleados">("accesos");
  const [usuarios, setUsuarios] = useState<TenantUsuario[]>([]);
  const [empleados, setEmpleados] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State: Crear Usuario de Acceso
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createNombre, setCreateNombre] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createRol, setCreateRol] = useState<"Administrador" | "Cajero" | "Vendedor" | "Mecánico">("Cajero");
  const [createSucursalId, setCreateSucursalId] = useState<string>(sucursalId || sucursales[0]?.id || "");
  const [createTelefono, setCreateTelefono] = useState("");
  const [createPuesto, setCreatePuesto] = useState("");
  const [submittingUser, setSubmittingUser] = useState(false);

  // Modal State: Reset Password
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [selectedUserForReset, setSelectedUserForReset] = useState<TenantUsuario | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [submittingReset, setSubmittingReset] = useState(false);

  // Modal State: Empleado Operativo / Técnico
  const [isEmpleadoModalOpen, setIsEmpleadoModalOpen] = useState(false);
  const [editingEmpleadoId, setEditingEmpleadoId] = useState<string | null>(null);
  const [empNombre, setEmpNombre] = useState("");
  const [empRol, setEmpRol] = useState("Mecánico");
  const [empPuesto, setEmpPuesto] = useState("Técnico Mecánico");
  const [empEspecialidad, setEmpEspecialidad] = useState("");
  const [empTelefono, setEmpTelefono] = useState("");
  const [empSucursalId, setEmpSucursalId] = useState(sucursalId || sucursales[0]?.id || "");
  const [empComision, setEmpComision] = useState("25");
  const [empTarifaHora, setEmpTarifaHora] = useState("450");
  const [submittingEmp, setSubmittingEmp] = useState(false);

  useEffect(() => {
    if (empresaId) {
      cargarDatos();
    }
  }, [empresaId, sucursalId]);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [resUsuarios, resEmpleados] = await Promise.all([
        TenantUsuariosService.obtenerUsuariosTenant(empresaId),
        supabase
          .from("empleados")
          .select("*, sucursales(nombre, codigo)")
          .eq("empresa_id", empresaId)
          .order("nombre", { ascending: true }),
      ]);

      setUsuarios(resUsuarios.data);
      setEmpleados(resEmpleados.data || []);
    } catch (err) {
      console.error("Error cargando personal y usuarios:", err);
      toast.error("Error al cargar la lista de personal.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCrearUsuario = () => {
    setCreateNombre("");
    setCreateEmail("");
    setCreatePassword(generarPasswordSugerida());
    setCreateRol("Cajero");
    setCreateSucursalId(sucursalId || sucursales[0]?.id || "");
    setCreateTelefono("");
    setCreatePuesto("Cajero de Mostrador");
    setIsCreateModalOpen(true);
  };

  const generarPasswordSugerida = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#";
    let pass = "";
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  };

  const handleSaveNuevoUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingUser(true);
    try {
      const res = await TenantUsuariosService.crearUsuarioTenant({
        empresaId,
        sucursalId: createSucursalId || null,
        nombre: createNombre.trim(),
        email: createEmail.trim(),
        password: createPassword,
        rol: createRol,
        puesto: createPuesto.trim() || undefined,
        telefono: createTelefono.trim() || undefined,
      });

      if (!res.success) {
        toast.error(res.message || "No se pudo crear el usuario.");
        return;
      }

      toast.success(`Usuario ${createNombre} creado con acceso de login exitosamente.`);
      setIsCreateModalOpen(false);
      await cargarDatos();
    } catch (err: any) {
      toast.error(err.message || "Error al crear usuario.");
    } finally {
      setSubmittingUser(false);
    }
  };

  const handleToggleUsuarioEstatus = async (usuario: TenantUsuario) => {
    const nuevoEstado = !usuario.activo;
    try {
      const res = await TenantUsuariosService.actualizarEstatusUsuario(usuario.id, nuevoEstado);
      if (!res.success) {
        toast.error(res.message || "No se pudo actualizar el estatus.");
        return;
      }
      toast.success(nuevoEstado ? "Acceso de usuario activado." : "Acceso de usuario suspendido.");
      setUsuarios((prev) =>
        prev.map((u) => (u.id === usuario.id ? { ...u, activo: nuevoEstado } : u))
      );
    } catch (err) {
      toast.error("Error al actualizar estatus de login.");
    }
  };

  const handleOpenResetPassword = (usuario: TenantUsuario) => {
    setSelectedUserForReset(usuario);
    setNewPassword(generarPasswordSugerida());
    setIsResetModalOpen(true);
  };

  const handleSaveResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForReset) return;
    setSubmittingReset(true);
    try {
      const res = await TenantUsuariosService.resetPasswordUsuario(
        selectedUserForReset.id,
        newPassword
      );
      if (!res.success) {
        toast.error(res.message || "No se pudo resetear la contraseña.");
        return;
      }
      toast.success(`Contraseña de ${selectedUserForReset.nombre} actualizada exitosamente.`);
      setIsResetModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Error al resetear contraseña.");
    } finally {
      setSubmittingReset(false);
    }
  };

  // Empleados Handlers
  const handleOpenCrearEmpleado = () => {
    setEditingEmpleadoId(null);
    setEmpNombre("");
    setEmpRol("Mecánico");
    setEmpPuesto("Técnico Mecánico");
    setEmpEspecialidad("");
    setEmpTelefono("");
    setEmpSucursalId(sucursalId || sucursales[0]?.id || "");
    setEmpComision("25");
    setEmpTarifaHora("450");
    setIsEmpleadoModalOpen(true);
  };

  const handleOpenEditarEmpleado = (emp: any) => {
    setEditingEmpleadoId(emp.id);
    setEmpNombre(emp.nombre || "");
    setEmpRol(emp.rol || "Mecánico");
    setEmpPuesto(emp.puesto || emp.rol || "");
    setEmpEspecialidad(emp.especialidad || "");
    setEmpTelefono(emp.telefono || "");
    setEmpSucursalId(emp.sucursal_id || sucursales[0]?.id || "");
    setEmpComision(String(emp.comision_porcentaje ?? 25));
    setEmpTarifaHora(String(emp.tarifa_hora ?? 450));
    setIsEmpleadoModalOpen(true);
  };

  const handleSaveEmpleado = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingEmp(true);
    try {
      const payload = {
        empresa_id: empresaId,
        sucursal_id: empSucursalId || null,
        nombre: empNombre.trim(),
        rol: empRol,
        puesto: empPuesto.trim(),
        especialidad: empEspecialidad.trim() || null,
        telefono: empTelefono.trim() || null,
        comision_porcentaje: parseFloat(empComision) || 0,
        tarifa_hora: parseFloat(empTarifaHora) || 0,
        activo: true,
      };

      if (editingEmpleadoId) {
        const { error } = await supabase
          .from("empleados")
          .update(payload)
          .eq("id", editingEmpleadoId);
        if (error) throw error;
        toast.success("Empleado actualizado exitosamente.");
      } else {
        const { error } = await supabase.from("empleados").insert(payload);
        if (error) throw error;
        toast.success("Nuevo integrante registrado exitosamente.");
      }

      setIsEmpleadoModalOpen(false);
      await cargarDatos();
    } catch (err: any) {
      toast.error(err.message || "Error al guardar empleado.");
    } finally {
      setSubmittingEmp(false);
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
      {/* ─── NAVEGACIÓN ENTRE SUB-PESTAÑAS ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSubTab("accesos")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              subTab === "accesos"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-slate-100 hover:bg-slate-200 text-slate-600"
            }`}
          >
            <KeyRound size={15} />
            Cuentas con Acceso a Login ({usuarios.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab("empleados")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              subTab === "empleados"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-slate-100 hover:bg-slate-200 text-slate-600"
            }`}
          >
            <Users size={15} />
            Técnicos de Taller y Comisiones ({empleados.length})
          </button>
        </div>

        {subTab === "accesos" ? (
          <button
            type="button"
            onClick={handleOpenCrearUsuario}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer transition-colors shrink-0"
          >
            <Plus size={15} />
            Crear Usuario con Login
          </button>
        ) : (
          <button
            type="button"
            onClick={handleOpenCrearEmpleado}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer transition-colors shrink-0"
          >
            <Plus size={15} />
            Nuevo Integrante de Taller
          </button>
        )}
      </div>

      {/* ─── VISTA 1: CUENTAS DE ACCESO A LOGIN (BLINDADO) ─── */}
      {subTab === "accesos" && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          <div className="p-5 bg-slate-50 border-b border-slate-200">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-600" />
              Gestión Autogestionable de Cuentas de Acceso (Tenant)
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Usuarios que pueden iniciar sesión en el punto de venta y administración de este taller. Las cuentas SuperAdmin están protegidas y excluidas de esta vista.
            </p>
          </div>

          {usuarios.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-xs">
              No tienes usuarios registrados para acceso de login. Haz clic en "Crear Usuario con Login" para invitar o crear credenciales para tus cajeros o administradores.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-5">Usuario / Correo</th>
                    <th className="py-3 px-5">Rol en el Taller</th>
                    <th className="py-3 px-5">Último Inicio de Sesión</th>
                    <th className="py-3 px-5 text-center">Estatus de Acceso</th>
                    <th className="py-3 px-5 text-right">Seguridad y Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {usuarios.map((u) => {
                    const isCajero = u.rol === "Cajero";
                    const isAdmin = u.rol === "Administrador";
                    return (
                      <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
                              {u.nombre
                                .split(" ")
                                .map((n) => n[0])
                                .slice(0, 2)
                                .join("")}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{u.nombre}</p>
                              <p className="text-[11px] text-slate-500 flex items-center gap-1">
                                <Mail size={12} className="text-slate-400" />
                                {u.email}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-5">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              isAdmin
                                ? "bg-purple-100 text-purple-800 border border-purple-200"
                                : isCajero
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                : "bg-slate-100 text-slate-700 border border-slate-200"
                            }`}
                          >
                            {u.rol}
                          </span>
                        </td>

                        <td className="py-3.5 px-5 text-slate-600">
                          {u.last_sign_in_at ? (
                            <span>{new Date(u.last_sign_in_at).toLocaleDateString("es-MX", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}</span>
                          ) : (
                            <span className="text-slate-400 italic">Sin inicio registrado</span>
                          )}
                        </td>

                        <td className="py-3.5 px-5 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleUsuarioEstatus(u)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase transition-colors cursor-pointer ${
                              u.activo
                                ? "bg-emerald-100 hover:bg-emerald-200 text-emerald-800"
                                : "bg-rose-100 hover:bg-rose-200 text-rose-800"
                            }`}
                          >
                            {u.activo ? (
                              <>
                                <UserCheck size={12} />
                                Activo
                              </>
                            ) : (
                              <>
                                <UserX size={12} />
                                Suspendido
                              </>
                            )}
                          </button>
                        </td>

                        <td className="py-3.5 px-5 text-right">
                          <button
                            type="button"
                            onClick={() => handleOpenResetPassword(u)}
                            title="Resetear Contraseña"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                          >
                            <RotateCcw size={13} />
                            Reset Clave
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── VISTA 2: PERSONAL TÉCNICO Y COMISIONES DE TALLER ─── */}
      {subTab === "empleados" && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          <div className="p-5 bg-slate-50 border-b border-slate-200">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              Técnicos, Mecánicos y Nómina de Mano de Obra
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Catálogo de mecánicos y alineadores asignables a las órdenes de trabajo para cálculo automático de comisiones y destajo.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-5">Integrante / Especialidad</th>
                  <th className="py-3 px-5">Puesto</th>
                  <th className="py-3 px-5">Sucursal</th>
                  <th className="py-3 px-5 text-center">% Comisión MO</th>
                  <th className="py-3 px-5 text-right">Tarifa Hora</th>
                  <th className="py-3 px-5 text-center">Estatus</th>
                  <th className="py-3 px-5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {empleados.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-xl text-white font-bold text-xs flex items-center justify-center shrink-0"
                          style={{ backgroundColor: emp.color_avatar || "#2563EB" }}
                        >
                          {emp.nombre
                            .split(" ")
                            .map((n: string) => n[0])
                            .slice(0, 2)
                            .join("")}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{emp.nombre}</p>
                          <p className="text-[11px] text-slate-500">
                            {emp.especialidad || emp.telefono || "General"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-5">
                      <span className="font-bold text-slate-800 block">{emp.puesto || emp.rol}</span>
                      <span className="text-[10px] text-slate-400">Rol: {emp.rol}</span>
                    </td>
                    <td className="py-3.5 px-5 text-slate-700 font-bold">
                      {emp.sucursales ? `${emp.sucursales.codigo} • ${emp.sucursales.nombre}` : "Todas"}
                    </td>
                    <td className="py-3.5 px-5 text-center">
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {Number(emp.comision_porcentaje || 0)}%
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-right font-bold text-slate-800 tabular-nums">
                      ${Number(emp.tarifa_hora || 0).toLocaleString("es-MX")}/hr
                    </td>
                    <td className="py-3.5 px-5 text-center">
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                          emp.activo ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {emp.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <button
                        type="button"
                        onClick={() => handleOpenEditarEmpleado(emp)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition-colors"
                      >
                        <Pencil size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── MODAL: CREAR USUARIO CON ACCESO A LOGIN ─── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-blue-400">
                  <KeyRound size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-bold">Crear Usuario con Acceso de Login</h3>
                  <p className="text-[11px] text-slate-300">
                    Credenciales exclusivas para este taller (SuperAdmin protegido)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveNuevoUsuario} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={createNombre}
                  onChange={(e) => setCreateNombre(e.target.value)}
                  placeholder="Ej. Roberto Sánchez (Cajero)"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Correo Electrónico (Login) *</label>
                  <input
                    type="email"
                    required
                    value={createEmail}
                    onChange={(e) => setCreateEmail(e.target.value)}
                    placeholder="cajero@covatalleres.com"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Rol en el Sistema *</label>
                  <select
                    value={createRol}
                    onChange={(e) => setCreateRol(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  >
                    <option value="Cajero">Cajero (Punto de Venta y Cobro)</option>
                    <option value="Administrador">Administrador (Control Total del Taller)</option>
                    <option value="Vendedor">Asesor de Servicio / Ventas</option>
                    <option value="Mecánico">Mecánico de Taller</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700">Contraseña Provisional *</label>
                  <button
                    type="button"
                    onClick={() => setCreatePassword(generarPasswordSugerida())}
                    className="text-[10px] text-blue-600 hover:underline font-bold"
                  >
                    Generar aleatoria segura
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    required
                    minLength={6}
                    value={createPassword}
                    onChange={(e) => setCreatePassword(e.target.value)}
                    className="w-full px-3 py-2 font-mono text-xs font-bold bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  El usuario podrá cambiar su contraseña al iniciar sesión. Mínimo 6 caracteres.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Título de Puesto (Opcional)</label>
                  <input
                    type="text"
                    value={createPuesto}
                    onChange={(e) => setCreatePuesto(e.target.value)}
                    placeholder="Ej. Cajero Turno Matutino"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Teléfono Móvil (Opcional)</label>
                  <input
                    type="text"
                    value={createTelefono}
                    onChange={(e) => setCreateTelefono(e.target.value)}
                    placeholder="+52 81 1234 5678"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingUser}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
                >
                  {submittingUser && <Loader2 size={13} className="animate-spin" />}
                  Crear Usuario con Acceso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: RESET PASSWORD ─── */}
      {isResetModalOpen && selectedUserForReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RotateCcw size={16} className="text-amber-400" />
                <h3 className="text-xs font-bold">Resetear Contraseña</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveResetPassword} className="p-5 space-y-4 text-xs">
              <p className="text-slate-600">
                Ingresa una nueva contraseña para <strong>{selectedUserForReset.nombre}</strong> ({selectedUserForReset.email}):
              </p>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700">Nueva Contraseña *</label>
                  <button
                    type="button"
                    onClick={() => setNewPassword(generarPasswordSugerida())}
                    className="text-[10px] text-blue-600 hover:underline font-bold"
                  >
                    Generar segura
                  </button>
                </div>
                <input
                  type="text"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 font-mono text-xs font-bold bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingReset}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
                >
                  {submittingReset && <Loader2 size={13} className="animate-spin" />}
                  Actualizar Contraseña
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: CREAR / EDITAR EMPLEADO OPERATIVO ─── */}
      {isEmpleadoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-blue-400" />
                <h3 className="text-xs font-bold">
                  {editingEmpleadoId ? "Editar Integrante de Taller" : "Nuevo Integrante de Taller"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEmpleadoModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveEmpleado} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={empNombre}
                  onChange={(e) => setEmpNombre(e.target.value)}
                  placeholder="Ej. Carlos Mendoza (Alineador)"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Rol Operativo *</label>
                  <select
                    value={empRol}
                    onChange={(e) => setEmpRol(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white font-bold"
                  >
                    <option value="Mecánico">Mecánico / Técnico</option>
                    <option value="Vendedor">Asesor de Ventas</option>
                    <option value="Administrador">Jefe de Taller / Gerente</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Título del Puesto</label>
                  <input
                    type="text"
                    value={empPuesto}
                    onChange={(e) => setEmpPuesto(e.target.value)}
                    placeholder="Ej. Técnico Especialista Master"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Especialidad Técnica</label>
                  <input
                    type="text"
                    value={empEspecialidad}
                    onChange={(e) => setEmpEspecialidad(e.target.value)}
                    placeholder="Ej. Frenos, Suspensión y DVI"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={empTelefono}
                    onChange={(e) => setEmpTelefono(e.target.value)}
                    placeholder="+52 81 1234 5678"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">% Comisión Mano de Obra</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="100"
                    value={empComision}
                    onChange={(e) => setEmpComision(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tarifa por Hora ($ MXN)</label>
                  <input
                    type="number"
                    step="10"
                    min="0"
                    value={empTarifaHora}
                    onChange={(e) => setEmpTarifaHora(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEmpleadoModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingEmp}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
                >
                  {submittingEmp && <Loader2 size={13} className="animate-spin" />}
                  Guardar Integrante
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
