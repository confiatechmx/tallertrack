"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { saasHqService, ImpersonationSession } from "@/services/saasHqService";
import { tenantDomainService, TenantDomainInfo } from "@/services/tenantDomainService";
import { parseTenantFromHost } from "@/lib/tenantRouting";

export interface EmpresaConfig {
  id: string;
  nombre_comercial: string;
  rfc: string | null;
  direccion: string | null;
  tasa_iva: number;
  logo_url: string | null;
  logo_url_dark?: string | null;
  isotipo_url?: string | null;
  color_primario: string;
  color_sidebar: string;
  eslogan: string | null;
  telefono: string | null;
  email_contacto: string | null;
  sitio_web: string | null;
  subdominio?: string | null;
  margen_refacciones_default: number;
  terminos_condiciones: string | null;
  descuento_efectivo_habilitado?: boolean;
  descuento_efectivo_porcentaje?: number;
  plan_suscripcion?: "STARTER" | "PRO" | "ENTERPRISE" | "BASICO";
  ambiente?: "PRODUCTION" | "SANDBOX" | "DEMO";
  activo?: boolean;
  custom_metadata?: any;
}

export interface Sucursal {
  id: string;
  empresa_id: string;
  nombre: string;
  codigo: string;
  direccion: string | null;
  telefono: string | null;
  gerente: string | null;
  es_matriz: boolean;
  activa: boolean;
}

export interface UserPerfil {
  id: string;
  empresa_id: string;
  sucursal_id: string | null;
  nombre: string;
  rol: string;
  email?: string;
}

export const WHITE_LABEL_PRESETS = [
  {
    id: "shopmonkey",
    name: "Shopmonkey Blue",
    primary: "#2563EB",
    sidebar: "#0F172A",
    badge: "Estándar SaaS",
  },
  {
    id: "pirelli",
    name: "Motorsport Red",
    primary: "#DC2626",
    sidebar: "#111827",
    badge: "Llantera / Performance",
  },
  {
    id: "emerald",
    name: "Castrol Emerald",
    primary: "#059669",
    sidebar: "#091E1A",
    badge: "Servicio Mecánico",
  },
  {
    id: "gulf",
    name: "Industrial Orange",
    primary: "#EA580C",
    sidebar: "#18181B",
    badge: "Flotillas / Diesel",
  },
];

interface TenantContextValue {
  empresa: EmpresaConfig | null;
  sucursales: Sucursal[];
  sucursalActiva: Sucursal | null;
  setSucursalActivaId: (id: string | null) => void;
  perfil: UserPerfil | null;
  loadingTenant: boolean;
  refreshTenant: () => Promise<void>;
  updateBrandTheme: (updates: Partial<EmpresaConfig>) => Promise<void>;
  customDomainInfo: TenantDomainInfo | null;
  impersonation: ImpersonationSession | null;
  isSuperAdmin: boolean;
  switchEmpresa: (empresaId: string) => Promise<void>;
}

export const DEFAULT_EMPRESA: EmpresaConfig = {
  id: "b2ad09db-0a34-4876-9ca3-d584c40bd294",
  nombre_comercial: "Cova",
  rfc: "COV2105148A1",
  direccion: "Río Aguanaval 1595, Col. Pascual Orozco, C.P. 80170, Culiacán Rosales, Sin.",
  tasa_iva: 16,
  logo_url: "/branding/cova/cova-logo-light-trimmed.png",
  logo_url_dark: "/branding/cova/cova-logo-dark-trimmed.png",
  isotipo_url: "/branding/cova/cova-isotipo.png",
  color_primario: "#1C3EFF",
  color_sidebar: "#0F172A",
  eslogan: "Especialistas en Frenos, Suspensión, Mecánica y Llantas Multimarca",
  telefono: "+526674125459",
  email_contacto: "servicio@cova.mx",
  sitio_web: "cova.tallertrack.com",
  subdominio: "cova",
  margen_refacciones_default: 35,
  descuento_efectivo_habilitado: true,
  descuento_efectivo_porcentaje: 3.0,
  terminos_condiciones:
    "Garantía de 30 días o 1,000 km en mano de obra. Refacciones y neumáticos sujetos a garantía del fabricante.",
  plan_suscripcion: "ENTERPRISE",
  ambiente: "PRODUCTION",
  activo: true,
  custom_metadata: {},
};

const CURRENT_EMPRESA_CACHE_KEY = "tallertrack_cached_empresa";

function getInitialEmpresa(): EmpresaConfig {
  if (typeof window !== "undefined") {
    try {
      const host = window.location.hostname.toLowerCase();
      const hostInfo = parseTenantFromHost(host);
      const isCovaDomain = hostInfo.subdomain === "cova" || host.includes("cova");
      const raw = localStorage.getItem(CURRENT_EMPRESA_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (isCovaDomain) {
          if (parsed.subdominio === "cova" || (parsed.nombre_comercial || "").toLowerCase().includes("cova")) {
            return {
              ...DEFAULT_EMPRESA,
              ...parsed,
              id: "b2ad09db-0a34-4876-9ca3-d584c40bd294",
              logo_url_dark: parsed.logo_url_dark || "/branding/cova/cova-logo-dark-trimmed.png",
              logo_url: parsed.logo_url || "/branding/cova/cova-logo-light-trimmed.png",
              isotipo_url: parsed.isotipo_url || "/branding/cova/cova-isotipo.png",
            };
          }
        } else if (hostInfo.subdomain && (parsed.subdominio === hostInfo.subdomain || (parsed.nombre_comercial || "").toLowerCase().includes(hostInfo.subdomain))) {
          return parsed;
        } else if (!hostInfo.subdomain && parsed.id) {
          return parsed;
        }
      }
      if (isCovaDomain) {
        return DEFAULT_EMPRESA;
      }
      if (hostInfo.isTenantHost && hostInfo.subdomain) {
        return {
          ...DEFAULT_EMPRESA,
          subdominio: hostInfo.subdomain,
          nombre_comercial: hostInfo.subdomain.toUpperCase(),
        };
      }
    } catch {
      // ignore
    }
  }
  return DEFAULT_EMPRESA;
}

const TenantContext = createContext<TenantContextValue>({
  empresa: DEFAULT_EMPRESA,
  sucursales: [],
  sucursalActiva: null,
  setSucursalActivaId: () => {},
  perfil: null,
  loadingTenant: true,
  refreshTenant: async () => {},
  updateBrandTheme: async () => {},
  customDomainInfo: null,
  impersonation: null,
  isSuperAdmin: false,
  switchEmpresa: async () => {},
});

export function applyThemeCssVariables(primaryColor: string, sidebarColor: string) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty("--color-primary", primaryColor || "#2563EB");
  root.style.setProperty("--color-ring", primaryColor || "#2563EB");
  root.style.setProperty("--color-swamp", sidebarColor || "#0F172A");
}

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [empresa, setEmpresa] = useState<EmpresaConfig | null>(() => getInitialEmpresa());
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [sucursalActivaId, setSucursalActivaIdState] = useState<string | null>(null);
  const [perfil, setPerfil] = useState<UserPerfil | null>(null);
  const [loadingTenant, setLoadingTenant] = useState(true);
  const [customDomainInfo, setCustomDomainInfo] = useState<TenantDomainInfo | null>(null);
  const [impersonation, setImpersonation] = useState<ImpersonationSession | null>(() =>
    saasHqService.getImpersonationStatus()
  );

  const isSuperAdmin = perfil?.rol === "SuperAdmin" || perfil?.rol === "SUPERADMIN";

  const loadTenant = useCallback(async () => {
    setLoadingTenant(true);
    try {
      const supabase = createClient();
      const currentImpersonation = saasHqService.getImpersonationStatus();
      setImpersonation(currentImpersonation);

      const [domainInfo, { data: authData }] = await Promise.all([
        tenantDomainService.resolverTenantPorDominio().catch(() => null),
        supabase.auth.getUser().catch(() => ({ data: { user: null } })),
      ]);

      if (domainInfo) {
        setCustomDomainInfo(domainInfo);
      }

      const user = authData?.user;
      let targetEmpresaId: string | null = null;
      let userProfile: UserPerfil | null = null;

      if (user) {
        const { data: perfData } = await supabase
          .from("perfiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (perfData) {
          userProfile = {
            id: user.id,
            empresa_id: perfData.empresa_id,
            sucursal_id: perfData.sucursal_id,
            nombre: perfData.nombre || user.email || "Usuario",
            rol: perfData.rol || "Administrador",
            email: user.email,
          };
          setPerfil(userProfile);
        }
      } else {
        setPerfil(null);
      }

      const isSuper =
        userProfile?.rol === "SuperAdmin" || userProfile?.rol === "SUPERADMIN";

      if (userProfile) {
        // Validación Zero-Trust en cliente: si el usuario NO es SuperAdmin y está en un subdominio
        // que pertenece a otro taller, cerrar la sesión cruzada de inmediato y redirigir a /login
        if (
          !isSuper &&
          domainInfo?.empresa_id &&
          userProfile.empresa_id &&
          userProfile.empresa_id !== domainInfo.empresa_id
        ) {
          await supabase.auth.signOut();
          setPerfil(null);
          if (typeof window !== "undefined") {
            try {
              localStorage.removeItem(CURRENT_EMPRESA_CACHE_KEY);
            } catch {
              // ignore
            }
            if (!window.location.pathname.startsWith("/login")) {
              window.location.href = "/login";
              return;
            }
          }
        }

        // El tenant activo para un usuario normal SIEMPRE es el de su propio perfil autenticado.
        // Solo un SuperAdmin puede usar impersonación o cambiar de tenant por dominio.
        if (isSuper) {
          targetEmpresaId =
            currentImpersonation?.targetEmpresaId ||
            domainInfo?.empresa_id ||
            userProfile.empresa_id;
        } else {
          targetEmpresaId = userProfile.empresa_id;
        }
      } else {
        // Usuario no autenticado (ej. /login o vista pública de orden)
        targetEmpresaId =
          currentImpersonation?.targetEmpresaId ||
          domainInfo?.empresa_id ||
          null;
      }

      // Consultar empresa y sucursales
      let queryEmpresa = supabase.from("empresas").select("*");
      if (targetEmpresaId) {
        queryEmpresa = queryEmpresa.eq("id", targetEmpresaId);
      }
      const { data: empData } = await queryEmpresa.limit(1).maybeSingle();

      let querySucursales = supabase.from("sucursales").select("*").order("es_matriz", { ascending: false });
      if (empData?.id) {
        querySucursales = querySucursales.eq("empresa_id", empData.id);
      }
      const { data: sucData } = await querySucursales;

      if (empData) {
        const isCovaEmp =
          empData.id === "b2ad09db-0a34-4876-9ca3-d584c40bd294" ||
          empData.subdominio === "cova";
        const merged: EmpresaConfig = {
          ...DEFAULT_EMPRESA,
          ...empData,
          logo_url_dark: empData.logo_url_dark || (isCovaEmp ? "/branding/cova/cova-logo-dark-trimmed.png" : null),
          logo_url: empData.logo_url || (isCovaEmp ? "/branding/cova/cova-logo-light-trimmed.png" : null),
          isotipo_url: empData.isotipo_url || (isCovaEmp ? "/branding/cova/cova-isotipo.png" : null),
          color_primario: empData.color_primario || (isCovaEmp ? "#1C3EFF" : "#2563EB"),
          color_sidebar: empData.color_sidebar || "#0F172A",
          margen_refacciones_default: Number(empData.margen_refacciones_default ?? 35),
          tasa_iva: Number(empData.tasa_iva ?? 16),
          plan_suscripcion: empData.plan_suscripcion || "STARTER",
          ambiente: empData.ambiente || "PRODUCTION",
          activo: empData.activo !== false,
          custom_metadata: empData.custom_metadata || {},
        };
        setEmpresa(merged);
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(CURRENT_EMPRESA_CACHE_KEY, JSON.stringify(merged));
          } catch {
            // ignore
          }
        }
        applyThemeCssVariables(merged.color_primario, merged.color_sidebar);
      }

      const covaDefaultSucursal: Sucursal = {
        id: "b2ad09db-0a34-4876-9ca3-d584c40bd295",
        empresa_id: "b2ad09db-0a34-4876-9ca3-d584c40bd294",
        nombre: "Cova",
        codigo: "COVA",
        direccion: "Río Aguanaval 1595, Col. Pascual Orozco, C.P. 80170, Culiacán Rosales, Sin.",
        telefono: "+526674125459",
        gerente: "Larissa Orozco",
        es_matriz: true,
        activa: true,
      };

      const finalSucList =
        sucData && sucData.length > 0
          ? (sucData as Sucursal[])
          : targetEmpresaId === "b2ad09db-0a34-4876-9ca3-d584c40bd294"
            ? [covaDefaultSucursal]
            : [];

      setSucursales(finalSucList);
      const savedBranch = typeof window !== "undefined" ? (localStorage.getItem("tallertrack_sucursal_id") || localStorage.getItem("autolisto_sucursal_id")) : null;
      if (savedBranch && savedBranch !== "ALL" && finalSucList.some((s: any) => s.id === savedBranch)) {
        setSucursalActivaIdState(savedBranch);
      } else if (savedBranch === "ALL") {
        setSucursalActivaIdState(null);
      } else if (finalSucList.length === 1) {
        setSucursalActivaIdState(finalSucList[0].id);
      } else {
        setSucursalActivaIdState(null);
      }
    } catch (err) {
      console.error("Error loading tenant:", err);
    } finally {
      setLoadingTenant(false);
    }
  }, []);

  useEffect(() => {
    loadTenant();

    const handleEmpresaChanged = () => {
      loadTenant();
    };

    if (typeof window !== "undefined") {
      window.addEventListener("tallertrack:empresa_changed", handleEmpresaChanged);
      window.addEventListener("autolisto:empresa_changed", handleEmpresaChanged);
      return () => {
        window.removeEventListener("tallertrack:empresa_changed", handleEmpresaChanged);
        window.removeEventListener("autolisto:empresa_changed", handleEmpresaChanged);
      };
    }
  }, [loadTenant]);

  const setSucursalActivaId = (id: string | null) => {
    setSucursalActivaIdState(id);
    if (typeof window !== "undefined") {
      localStorage.setItem("tallertrack_sucursal_id", id || "ALL");
    }
  };

  const updateBrandTheme = async (updates: Partial<EmpresaConfig>) => {
    if (!empresa) return;
    const next = { ...empresa, ...updates };
    setEmpresa(next);
    applyThemeCssVariables(next.color_primario, next.color_sidebar);

    const supabase = createClient();
    await supabase
      .from("empresas")
      .update({
        nombre_comercial: next.nombre_comercial,
        rfc: next.rfc,
        direccion: next.direccion,
        tasa_iva: next.tasa_iva,
        logo_url: next.logo_url,
        logo_url_dark: next.logo_url_dark,
        isotipo_url: next.isotipo_url,
        color_primario: next.color_primario,
        color_sidebar: next.color_sidebar,
        eslogan: next.eslogan,
        telefono: next.telefono,
        email_contacto: next.email_contacto,
        sitio_web: next.sitio_web,
        margen_refacciones_default: next.margen_refacciones_default,
        terminos_condiciones: next.terminos_condiciones,
      })
      .eq("id", empresa.id);
  };

  const switchEmpresa = async (targetEmpresaId: string) => {
    const supabase = createClient();
    const { data } = await supabase.from("empresas").select("*").eq("id", targetEmpresaId).maybeSingle();
    if (data) {
      const merged: EmpresaConfig = {
        ...DEFAULT_EMPRESA,
        ...data,
        color_primario: data.color_primario || "#2563EB",
        color_sidebar: data.color_sidebar || "#0F172A",
        margen_refacciones_default: Number(data.margen_refacciones_default ?? 35),
        tasa_iva: Number(data.tasa_iva ?? 16),
        plan_suscripcion: data.plan_suscripcion || "STARTER",
        ambiente: data.ambiente || "PRODUCTION",
        activo: data.activo !== false,
        custom_metadata: data.custom_metadata || {},
      };
      setEmpresa(merged);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(CURRENT_EMPRESA_CACHE_KEY, JSON.stringify(merged));
        } catch {
          // ignore
        }
      }
      applyThemeCssVariables(merged.color_primario, merged.color_sidebar);

      // Cargar sucursales de esta empresa
      const { data: sucData } = await supabase
        .from("sucursales")
        .select("*")
        .eq("empresa_id", targetEmpresaId)
        .order("es_matriz", { ascending: false });

      if (sucData) {
        setSucursales(sucData as Sucursal[]);
        setSucursalActivaIdState(null);
      }
    }
  };

  const sucursalActiva = sucursales.find((s) => s.id === sucursalActivaId) || null;

  return (
    <TenantContext.Provider
      value={{
        empresa,
        sucursales,
        sucursalActiva,
        setSucursalActivaId,
        perfil,
        loadingTenant,
        refreshTenant: loadTenant,
        updateBrandTheme,
        customDomainInfo,
        impersonation,
        isSuperAdmin,
        switchEmpresa,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  return useContext(TenantContext);
}
