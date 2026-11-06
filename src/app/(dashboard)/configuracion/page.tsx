"use client";

import { useEffect, useState, useCallback, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  useTenant,
  WHITE_LABEL_PRESETS,
  applyThemeCssVariables,
} from "@/context/TenantContext";
import {
  Loader2,
  Settings,
  Building2,
  Landmark,
  CheckCircle2,
  Users,
  Plus,
  Pencil,
  Shield,
  Palette,
  Sparkles,
  MapPin,
  Phone,
  Check,
  Globe,
  Trash2,
  ImageIcon,
  Upload,
  Receipt,
  RotateCcw,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import TenantBrandLogo from "@/components/brand/TenantBrandLogo";
import CustomDomainModal from "@/components/hq/CustomDomainModal";
import { TenantMetodosPagoConfig } from "@/components/configuracion/TenantMetodosPagoConfig";
import { TenantEstacionesConfig } from "@/components/configuracion/TenantEstacionesConfig";
import { TenantUsuariosConfigSection } from "@/components/configuracion/TenantUsuariosConfigSection";

type ConfigTab = "Marca" | "Empresa" | "Sucursales" | "Estaciones" | "Personal" | "Pagos";

const INITIAL_FORM_EMPRESA = {
  nombre_comercial: "",
  eslogan: "",
  rfc: "",
  telefono: "",
  email_contacto: "",
  sitio_web: "",
  direccion: "",
  tasa_iva: 16,
  margen_refacciones_default: 35,
  terminos_condiciones: "",
  logo_url: "",
  logo_url_dark: "",
  isotipo_url: "",
  color_primario: "#2563EB",
  color_sidebar: "#0F172A",
};

function ConfiguracionContent() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const initialTabParam = searchParams.get("tab");

  const {
    empresa: tenantEmpresa,
    sucursales,
    sucursalActiva,
    setSucursalActivaId,
    refreshTenant,
    updateBrandTheme,
  } = useTenant();

  // Determine initial tab from query param if provided
  const resolveInitialTab = (): ConfigTab => {
    if (!initialTabParam) return "Marca";
    const p = initialTabParam.toLowerCase();
    if (p.includes("sucursal")) return "Sucursales";
    if (p.includes("personal") || p.includes("usuario") || p.includes("equipo")) return "Personal";
    if (p.includes("pago") || p.includes("banco")) return "Pagos";
    if (p.includes("empresa") || p.includes("fiscal") || p.includes("reglas")) return "Empresa";
    return "Marca";
  };

  const [activeTab, setActiveTab] = useState<ConfigTab>(resolveInitialTab());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  // Form State
  const [formEmpresa, setFormEmpresa] = useState(INITIAL_FORM_EMPRESA);
  const [baselineForm, setBaselineForm] = useState(INITIAL_FORM_EMPRESA);

  // Sucursales Modal State
  const [isSucursalModalOpen, setIsSucursalModalOpen] = useState(false);
  const [editingSucursalId, setEditingSucursalId] = useState<string | null>(null);
  const [sucursalForm, setSucursalForm] = useState({
    nombre: "",
    codigo: "",
    direccion: "",
    telefono: "",
    gerente: "",
    es_matriz: false,
    activa: true,
  });
  const [savingSucursal, setSavingSucursal] = useState(false);
  const [isDomainModalOpen, setIsDomainModalOpen] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Load tenant configuration into state
  const loadConfigData = useCallback(async () => {
    setLoading(true);
    try {
      const sourceEmp = tenantEmpresa;
      if (sourceEmp) {
        const loaded = {
          nombre_comercial: sourceEmp.nombre_comercial || "",
          eslogan: sourceEmp.eslogan || "",
          rfc: sourceEmp.rfc || "",
          telefono: sourceEmp.telefono || "",
          email_contacto: sourceEmp.email_contacto || "",
          sitio_web: sourceEmp.sitio_web || "",
          direccion: sourceEmp.direccion || "",
          tasa_iva: Number(sourceEmp.tasa_iva ?? 16),
          margen_refacciones_default: Number(sourceEmp.margen_refacciones_default ?? 35),
          terminos_condiciones: sourceEmp.terminos_condiciones || "",
          logo_url: sourceEmp.logo_url || "",
          logo_url_dark: sourceEmp.logo_url_dark || "",
          isotipo_url: sourceEmp.isotipo_url || "",
          color_primario: sourceEmp.color_primario || "#2563EB",
          color_sidebar: sourceEmp.color_sidebar || "#0F172A",
        };
        setFormEmpresa(loaded);
        setBaselineForm(loaded);
      }
    } catch (error) {
      console.error("Error loading configuration:", error);
    } finally {
      setLoading(false);
    }
  }, [tenantEmpresa]);

  useEffect(() => {
    loadConfigData();
  }, [loadConfigData]);

  // Detect unsaved changes (dirty state)
  const isDirty = useMemo(() => {
    return JSON.stringify(formEmpresa) !== JSON.stringify(baselineForm);
  }, [formEmpresa, baselineForm]);

  const handleDiscardChanges = () => {
    setFormEmpresa(baselineForm);
    applyThemeCssVariables(baselineForm.color_primario, baselineForm.color_sidebar);
    toast.info("Cambios descartados.");
  };

  const handlePresetClick = (primary: string, sidebar: string) => {
    setFormEmpresa((prev) => ({
      ...prev,
      color_primario: primary,
      color_sidebar: sidebar,
    }));
    applyThemeCssVariables(primary, sidebar);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor selecciona un archivo de imagen válido (PNG, JPG, SVG, WEBP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("La imagen supera el límite de 5 MB.");
      return;
    }

    setUploadingLogo(true);
    try {
      const ext = file.name.split(".").pop();
      const filePath = `logos/${tenantEmpresa?.id || "empresa"}_${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("branding-taller")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("branding-taller")
        .getPublicUrl(filePath);

      if (urlData?.publicUrl) {
        setFormEmpresa((prev) => ({ ...prev, logo_url: urlData.publicUrl }));
        toast.success("Logotipo cargado correctamente.");
      }
    } catch (err: any) {
      console.error("Error subiendo logo:", err);
      toast.error("Error al subir imagen: " + (err.message || ""));
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSaveGlobalConfig = async () => {
    setSaving(true);
    setSaveMessage("");
    try {
      await updateBrandTheme({
        nombre_comercial: formEmpresa.nombre_comercial,
        eslogan: formEmpresa.eslogan || null,
        rfc: formEmpresa.rfc || null,
        telefono: formEmpresa.telefono || null,
        email_contacto: formEmpresa.email_contacto || null,
        sitio_web: formEmpresa.sitio_web || null,
        direccion: formEmpresa.direccion || null,
        tasa_iva: Number(formEmpresa.tasa_iva || 16),
        margen_refacciones_default: Number(formEmpresa.margen_refacciones_default || 35),
        terminos_condiciones: formEmpresa.terminos_condiciones || null,
        logo_url: formEmpresa.logo_url || null,
        logo_url_dark: formEmpresa.logo_url_dark || null,
        isotipo_url: formEmpresa.isotipo_url || null,
        color_primario: formEmpresa.color_primario,
        color_sidebar: formEmpresa.color_sidebar,
      });

      await refreshTenant();
      setBaselineForm(formEmpresa);
      setSaveMessage("Configuración guardada en vivo.");
      toast.success("Configuración actualizada con éxito.");
      setTimeout(() => setSaveMessage(""), 3500);
    } catch (err) {
      console.error("Error guardando configuración:", err);
      toast.error("Error al guardar la configuración.");
    } finally {
      setSaving(false);
    }
  };

  // Sucursales Modal Handlers
  const openSucursalModal = (suc?: any) => {
    if (suc) {
      setEditingSucursalId(suc.id);
      setSucursalForm({
        nombre: suc.nombre || "",
        codigo: suc.codigo || "",
        direccion: suc.direccion || "",
        telefono: suc.telefono || "",
        gerente: suc.gerente || "",
        es_matriz: Boolean(suc.es_matriz),
        activa: suc.activa !== false,
      });
    } else {
      setEditingSucursalId(null);
      setSucursalForm({
        nombre: "",
        codigo: `MTY-0${sucursales.length + 1}`,
        direccion: "",
        telefono: "",
        gerente: "",
        es_matriz: false,
        activa: true,
      });
    }
    setIsSucursalModalOpen(true);
  };

  const handleSaveSucursal = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSucursal(true);
    try {
      const payload = {
        empresa_id: tenantEmpresa?.id || "a0000000-0000-0000-0000-000000000001",
        nombre: sucursalForm.nombre.trim(),
        codigo: sucursalForm.codigo.trim().toUpperCase(),
        direccion: sucursalForm.direccion.trim() || null,
        telefono: sucursalForm.telefono.trim() || null,
        gerente: sucursalForm.gerente.trim() || null,
        es_matriz: sucursalForm.es_matriz,
        activa: sucursalForm.activa,
      };

      if (editingSucursalId) {
        await supabase
          .from("sucursales")
          .update(payload)
          .eq("id", editingSucursalId);
      } else {
        await supabase.from("sucursales").insert(payload);
      }

      await refreshTenant();
      setIsSucursalModalOpen(false);
      toast.success("Sucursal guardada correctamente.");
    } catch (err) {
      console.error("Error guardando sucursal:", err);
      toast.error("Error al guardar la sucursal.");
    } finally {
      setSavingSucursal(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[450px] items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  const inputClasses =
    "w-full border border-slate-200 rounded-xl p-2.5 text-xs font-medium focus:outline-none focus:border-slate-400 focus:bg-white transition-all bg-slate-50/70 text-slate-900";

  return (
    <div className="flex flex-col gap-4 pb-20 max-w-7xl mx-auto">
      {/* Top Header Card */}
      <div className="bg-white p-4 lg:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-slate-100 text-slate-800 rounded-2xl flex items-center justify-center shrink-0 border border-slate-200/60">
            <Settings size={22} strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Ajustes & Configuración del Taller
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Identidad de marca White-Label, datos comerciales, sucursales y accesos.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {saveMessage && (
            <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
              <CheckCircle2 size={14} /> {saveMessage}
            </span>
          )}

          {activeTab === "Sucursales" && (
            <button
              onClick={() => openSucursalModal()}
              className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Plus size={15} /> Nueva Sucursal
            </button>
          )}

          {(activeTab === "Marca" || activeTab === "Empresa") && isDirty && (
            <button
              onClick={handleSaveGlobalConfig}
              disabled={saving}
              className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer transition-colors"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              Guardar Cambios en Vivo
            </button>
          )}
        </div>
      </div>

      {/* Modern Segmented Navigation Pills */}
      <div className="flex items-center gap-1.5 bg-slate-200/70 p-1 rounded-2xl overflow-x-auto dense-scrollbar w-full sm:w-fit">
        <button
          onClick={() => setActiveTab("Marca")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "Marca"
              ? "bg-white text-slate-900 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Palette size={15} className="text-indigo-600" />
          1. Marca & White-Label
        </button>

        <button
          onClick={() => setActiveTab("Empresa")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "Empresa"
              ? "bg-white text-slate-900 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Building2 size={15} className="text-blue-600" />
          2. Datos Comerciales & Reglas
        </button>

        <button
          onClick={() => setActiveTab("Sucursales")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "Sucursales"
              ? "bg-white text-slate-900 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <MapPin size={15} className="text-emerald-600" />
          3. Sucursales ({sucursales.length})
        </button>

        <button
          onClick={() => setActiveTab("Estaciones")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "Estaciones"
              ? "bg-white text-slate-900 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Layers size={15} className="text-teal-600" />
          4. Estaciones de Trabajo
        </button>

        <button
          onClick={() => setActiveTab("Personal")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "Personal"
              ? "bg-white text-slate-900 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Users size={15} className="text-purple-600" />
          5. Personal & Accesos
        </button>

        <button
          onClick={() => setActiveTab("Pagos")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "Pagos"
              ? "bg-white text-slate-900 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Landmark size={15} className="text-amber-600" />
          6. Métodos de Pago & Cuentas
        </button>
      </div>

      <main className="w-full">
        {/* ========================================================= */}
        {/* TAB 1: MARCA & WHITE-LABEL                                */}
        {/* ========================================================= */}
        {activeTab === "Marca" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left Column: Color Palette & Presets (6 cols) */}
            <div className="lg:col-span-6 space-y-5">
              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Palette size={16} className="text-indigo-600" />
                    Temas en Vivo & Paleta de Color
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Elige una combinación predeterminada o ingresa los colores institucionales de tu empresa.
                  </p>
                </div>

                {/* 4 Presets */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  {WHITE_LABEL_PRESETS.map((preset) => {
                    const isSelected =
                      formEmpresa.color_primario.toLowerCase() === preset.primary.toLowerCase();
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handlePresetClick(preset.primary, preset.sidebar)}
                        className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-2 cursor-pointer ${
                          isSelected
                            ? "border-slate-900 ring-2 ring-slate-900/10 bg-slate-50/80"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="w-4 h-4 rounded-full border border-black/10"
                              style={{ backgroundColor: preset.primary }}
                            />
                            <span
                              className="w-4 h-4 rounded-full border border-black/10"
                              style={{ backgroundColor: preset.sidebar }}
                            />
                          </div>
                          {isSelected && <Check size={14} className="text-slate-900" />}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">{preset.name}</p>
                          <p className="text-[10px] text-slate-500 font-semibold">{preset.badge}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Pickers */}
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                      Color Primario (Botones)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={formEmpresa.color_primario}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormEmpresa({ ...formEmpresa, color_primario: val });
                          applyThemeCssVariables(val, formEmpresa.color_sidebar);
                        }}
                        className="w-9 h-9 rounded-xl border border-slate-200 cursor-pointer p-0.5"
                      />
                      <input
                        type="text"
                        value={formEmpresa.color_primario}
                        onChange={(e) => setFormEmpresa({ ...formEmpresa, color_primario: e.target.value })}
                        className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold uppercase bg-slate-50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                      Color Menú Lateral (Sidebar)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={formEmpresa.color_sidebar}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormEmpresa({ ...formEmpresa, color_sidebar: val });
                          applyThemeCssVariables(formEmpresa.color_primario, val);
                        }}
                        className="w-9 h-9 rounded-xl border border-slate-200 cursor-pointer p-0.5"
                      />
                      <input
                        type="text"
                        value={formEmpresa.color_sidebar}
                        onChange={(e) => setFormEmpresa({ ...formEmpresa, color_sidebar: e.target.value })}
                        className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold uppercase bg-slate-50"
                      />
                    </div>
                  </div>
                </div>

                {/* Live Mini Preview */}
                <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-xs pt-1">
                  <div
                    className="p-4 text-white flex items-center justify-between"
                    style={{ backgroundColor: formEmpresa.color_sidebar }}
                  >
                    <div className="flex items-center gap-2.5">
                      <TenantBrandLogo
                        logoUrl={formEmpresa.logo_url}
                        logoUrlDark={formEmpresa.logo_url_dark}
                        isotipoUrl={formEmpresa.isotipo_url}
                        tenantName={formEmpresa.nombre_comercial}
                        size="sm"
                        variant="dark"
                      />
                      <div>
                        <p className="text-xs font-bold leading-tight">
                          {formEmpresa.nombre_comercial || "Nombre del Taller"}
                        </p>
                        <p className="text-[10px] text-white/70">Vista previa de marca</p>
                      </div>
                    </div>
                    <span
                      className="px-3 py-1.5 rounded-xl text-[10px] font-bold text-white shadow-xs"
                      style={{ backgroundColor: formEmpresa.color_primario }}
                    >
                      Botón de Acción
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Logo & Custom Domain (6 cols) */}
            <div className="lg:col-span-6 space-y-5">
              {/* Logo Management Card */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <ImageIcon size={16} className="text-indigo-600" />
                    Logotipo Institucional
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Se mostrará en la barra lateral, tickets impresos, cotizaciones y portal del cliente.
                  </p>
                </div>

                <div className="flex items-center gap-4 p-4 bg-slate-50/70 rounded-2xl border border-slate-200/60">
                  {formEmpresa.logo_url ? (
                    <div className="relative group w-16 h-16 rounded-2xl border border-slate-200 bg-white p-1.5 flex items-center justify-center shrink-0 shadow-xs">
                      <img
                        src={formEmpresa.logo_url}
                        alt="Logo del Taller"
                        className="w-full h-full object-contain rounded-xl"
                      />
                      <button
                        type="button"
                        onClick={() => setFormEmpresa((prev) => ({ ...prev, logo_url: "" }))}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center text-[10px] shadow-xs cursor-pointer"
                        title="Eliminar logo"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-slate-300 bg-white flex items-center justify-center text-slate-400 shrink-0">
                      <ImageIcon size={24} />
                    </div>
                  )}

                  <div className="flex-1 space-y-1.5">
                    <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs cursor-pointer shadow-xs transition-colors">
                      <Upload size={14} className={uploadingLogo ? "animate-bounce text-indigo-600" : "text-slate-500"} />
                      <span>{uploadingLogo ? "Subiendo archivo..." : "Subir Logotipo"}</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        onChange={handleLogoUpload}
                        disabled={uploadingLogo}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[11px] text-slate-400">Formatos: PNG, JPG, WebP o SVG (máx. 5 MB).</p>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    O escribe la URL pública del logo:
                  </label>
                  <input
                    type="text"
                    value={formEmpresa.logo_url}
                    onChange={(e) => setFormEmpresa({ ...formEmpresa, logo_url: e.target.value })}
                    placeholder="https://ejemplo.com/logo-taller.png"
                    className={inputClasses}
                  />
                </div>
              </div>

              {/* Custom Domain & DNS Card */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe size={16} className="text-blue-600" />
                    <h3 className="text-sm font-bold text-slate-900">Dominio Personalizado & CNAME</h3>
                  </div>
                  <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold uppercase border border-blue-200/60">
                    Marca Blanca
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Apunta tu propio subdominio web (ej. <code className="text-slate-800 font-mono font-bold bg-slate-100 px-1 py-0.5 rounded">taller.midominio.com</code>) para que tus clientes y mecánicos interactúen con tu propia marca.
                </p>
                <button
                  type="button"
                  onClick={() => setIsDomainModalOpen(true)}
                  className="w-full py-2.5 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Globe size={14} className="text-slate-500" />
                  <span>Configurar Dominios y Registros DNS</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: DATOS COMERCIALES & REGLAS                         */}
        {/* ========================================================= */}
        {activeTab === "Empresa" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* General Profile (7 cols) */}
            <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Building2 size={16} className="text-blue-600" />
                  Datos Generales & Contacto
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Información visible en presupuestos, notas de servicio y tickets impresos.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    Nombre Comercial del Taller
                  </label>
                  <input
                    type="text"
                    value={formEmpresa.nombre_comercial}
                    onChange={(e) => setFormEmpresa({ ...formEmpresa, nombre_comercial: e.target.value })}
                    className={inputClasses}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    Eslogan Comercial
                  </label>
                  <input
                    type="text"
                    value={formEmpresa.eslogan}
                    onChange={(e) => setFormEmpresa({ ...formEmpresa, eslogan: e.target.value })}
                    className={inputClasses}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">RFC Fiscal</label>
                  <input
                    type="text"
                    value={formEmpresa.rfc}
                    onChange={(e) => setFormEmpresa({ ...formEmpresa, rfc: e.target.value.toUpperCase() })}
                    className={inputClasses}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Teléfono Principal</label>
                  <input
                    type="text"
                    value={formEmpresa.telefono}
                    onChange={(e) => setFormEmpresa({ ...formEmpresa, telefono: e.target.value })}
                    className={inputClasses}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Correo de Contacto</label>
                  <input
                    type="email"
                    value={formEmpresa.email_contacto}
                    onChange={(e) => setFormEmpresa({ ...formEmpresa, email_contacto: e.target.value })}
                    className={inputClasses}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Dirección Matriz</label>
                <input
                  type="text"
                  value={formEmpresa.direccion}
                  onChange={(e) => setFormEmpresa({ ...formEmpresa, direccion: e.target.value })}
                  className={inputClasses}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Sitio Web</label>
                <input
                  type="text"
                  value={formEmpresa.sitio_web}
                  onChange={(e) => setFormEmpresa({ ...formEmpresa, sitio_web: e.target.value })}
                  placeholder="https://taller.com"
                  className={inputClasses}
                />
              </div>
            </div>

            {/* Operational & Financial Rules (5 cols) */}
            <div className="lg:col-span-5 space-y-5">
              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Receipt size={16} className="text-emerald-600" />
                    Reglas Comerciales de Taller
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Parámetros automáticos para cotizaciones y cálculo de márgenes.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Tasa de IVA (%)
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={formEmpresa.tasa_iva}
                        onChange={(e) => setFormEmpresa({ ...formEmpresa, tasa_iva: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm font-bold text-right"
                      />
                      <span className="font-bold text-xs text-slate-500">%</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Margen Refacciones (%)
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={formEmpresa.margen_refacciones_default}
                        onChange={(e) => setFormEmpresa({ ...formEmpresa, margen_refacciones_default: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm font-bold text-right"
                      />
                      <span className="font-bold text-xs text-slate-500">%</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    Póliza de Garantía & Términos
                  </label>
                  <textarea
                    rows={4}
                    value={formEmpresa.terminos_condiciones}
                    onChange={(e) => setFormEmpresa({ ...formEmpresa, terminos_condiciones: e.target.value })}
                    placeholder="Especifica aquí la vigencia de garantía en mano de obra y refacciones..."
                    className={inputClasses}
                  />
                  <p className="text-[10.5px] text-slate-400 mt-1">
                    Este texto se imprime al pie de las órdenes de servicio y tickets de entrega.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: SUCURSALES (MULTI-SUCURSAL)                        */}
        {/* ========================================================= */}
        {activeTab === "Sucursales" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sucursales.map((s) => {
                const isCurrentActive = sucursalActiva?.id === s.id;
                return (
                  <div
                    key={s.id}
                    className={`bg-white rounded-2xl p-5 border shadow-xs flex flex-col justify-between gap-4 transition-all ${
                      isCurrentActive
                        ? "border-slate-900 ring-2 ring-slate-900/10"
                        : "border-slate-200/80 hover:border-slate-300"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-lg text-xs font-mono font-bold bg-slate-900 text-white">
                            {s.codigo}
                          </span>
                          {s.es_matriz && (
                            <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200/80">
                              Matriz Principal
                            </span>
                          )}
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              s.activa ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60" : "bg-rose-50 text-rose-700 border border-rose-200/60"
                            }`}
                          >
                            {s.activa ? "Operando" : "Inactiva"}
                          </span>
                        </div>

                        <button
                          onClick={() => openSucursalModal(s)}
                          className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
                          title="Editar Sucursal"
                        >
                          <Pencil size={13} />
                        </button>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 mt-1">{s.nombre}</h3>
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                        <MapPin size={13} className="text-slate-400 shrink-0" />
                        {s.direccion || "Sin dirección registrada"}
                      </p>
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                        <Phone size={13} className="text-slate-400 shrink-0" />
                        {s.telefono || "Sin teléfono"} • Gerente: <strong className="text-slate-800">{s.gerente || "No asignado"}</strong>
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      {isCurrentActive ? (
                        <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                          <CheckCircle2 size={14} /> Sucursal Activa en Sesión
                        </span>
                      ) : (
                        <button
                          onClick={() => setSucursalActivaId(s.id)}
                          className="text-xs font-bold text-blue-600 hover:text-blue-800 underline cursor-pointer"
                        >
                          Filtrar sistema por esta sucursal →
                        </button>
                      )}

                      {isCurrentActive && (
                        <button
                          onClick={() => setSucursalActivaId(null)}
                          className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                        >
                          Ver Todas
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: PERSONAL & ACCESOS                                 */}
        {/* ========================================================= */}
        {activeTab === "Personal" && (
          <TenantUsuariosConfigSection
            empresaId={tenantEmpresa?.id || "b2ad09db-0a34-4876-9ca3-d584c40bd294"}
            sucursalId={sucursalActiva?.id}
            sucursales={sucursales}
          />
        )}

        {/* ========================================================= */}
        {/* TAB 4: ESTACIONES DE TRABAJO EN PISO (FOSAS / RAMPAS)      */}
        {/* ========================================================= */}
        {activeTab === "Estaciones" && (
          <div className="max-w-4xl mx-auto space-y-6">
            <TenantEstacionesConfig
              empresaId={tenantEmpresa?.id || "b2ad09db-0a34-4876-9ca3-d584c40bd294"}
              sucursalId={sucursalActiva?.id}
            />
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 6: MÉTODOS DE PAGO & CUENTAS BANCARIAS                */}
        {/* ========================================================= */}
        {activeTab === "Pagos" && (
          <div className="max-w-4xl mx-auto space-y-6">
            <TenantMetodosPagoConfig
              empresaId={tenantEmpresa?.id || "b2ad09db-0a34-4876-9ca3-d584c40bd294"}
              sucursalId={sucursalActiva?.id}
            />
          </div>
        )}
      </main>

      {/* Floating Bottom Save Bar (Appears when unsaved changes exist) */}
      {isDirty && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700/80 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs font-semibold">Tienes cambios sin guardar en la configuración</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDiscardChanges}
              disabled={saving}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Descartar
            </button>
            <button
              type="button"
              onClick={handleSaveGlobalConfig}
              disabled={saving}
              className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
              Guardar Cambios
            </button>
          </div>
        </div>
      )}

      {/* Modal: Sucursal CRUD */}
      {isSucursalModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-900">
                {editingSucursalId ? "Editar Sucursal" : "Nueva Sucursal"}
              </h3>
              <button
                onClick={() => setIsSucursalModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveSucursal} className="p-6 flex flex-col gap-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Código</label>
                  <input
                    type="text"
                    required
                    value={sucursalForm.codigo}
                    onChange={(e) => setSucursalForm({ ...sucursalForm, codigo: e.target.value })}
                    placeholder="MTY-03"
                    className={inputClasses}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Nombre</label>
                  <input
                    type="text"
                    required
                    value={sucursalForm.nombre}
                    onChange={(e) => setSucursalForm({ ...sucursalForm, nombre: e.target.value })}
                    placeholder="Sucursal Cumbres"
                    className={inputClasses}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Dirección Completa</label>
                <input
                  type="text"
                  value={sucursalForm.direccion}
                  onChange={(e) => setSucursalForm({ ...sucursalForm, direccion: e.target.value })}
                  className={inputClasses}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={sucursalForm.telefono}
                    onChange={(e) => setSucursalForm({ ...sucursalForm, telefono: e.target.value })}
                    className={inputClasses}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Gerente</label>
                  <input
                    type="text"
                    value={sucursalForm.gerente}
                    onChange={(e) => setSucursalForm({ ...sucursalForm, gerente: e.target.value })}
                    className={inputClasses}
                  />
                </div>
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sucursalForm.es_matriz}
                    onChange={(e) => setSucursalForm({ ...sucursalForm, es_matriz: e.target.checked })}
                    className="rounded border-slate-300 text-slate-900"
                  />
                  Es Matriz Principal
                </label>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sucursalForm.activa}
                    onChange={(e) => setSucursalForm({ ...sucursalForm, activa: e.target.checked })}
                    className="rounded border-slate-300 text-slate-900"
                  />
                  Sucursal Activa
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSucursalModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingSucursal}
                  className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  {savingSucursal ? "Guardando..." : "Guardar Sucursal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Dominios Personalizados */}
      {isDomainModalOpen && tenantEmpresa && (
        <CustomDomainModal
          isOpen={isDomainModalOpen}
          onClose={() => setIsDomainModalOpen(false)}
          empresaId={tenantEmpresa.id}
          empresaNombre={tenantEmpresa.nombre_comercial}
          onSaved={refreshTenant}
        />
      )}
    </div>
  );
}

export default function ConfiguracionPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="animate-spin text-primary" size={32} />
        </div>
      }
    >
      <ConfiguracionContent />
    </Suspense>
  );
}
