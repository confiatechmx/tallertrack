import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { parseTenantFromHost } from "./tenantRouting";

export interface ResolvedTenantServer {
  id: string;
  empresa_id: string;
  domain: string;
  is_primary: boolean;
  verified: boolean;
  custom_theme: {
    app_title?: string | null;
    primary_color?: string | null;
    sidebar_color?: string | null;
    logo_url?: string | null;
    favicon_url?: string | null;
  };
  empresa: {
    id: string;
    nombre_comercial: string;
    subdominio?: string | null;
    rfc?: string | null;
    logo_url?: string | null;
    logo_url_dark?: string | null;
    isotipo_url?: string | null;
    color_primario?: string | null;
    color_sidebar?: string | null;
    eslogan?: string | null;
    sitio_web?: string | null;
  };
}

/**
 * Resuelve la información del tenant desde un Server Component o Server Action
 * considerando host, searchParams y encabezados propagados por el middleware.
 */
export async function resolveTenantServer(
  hostOverride?: string,
  searchParams?: Record<string, string | string[] | undefined> | URLSearchParams
): Promise<ResolvedTenantServer | null> {
  let host = hostOverride;
  if (!host) {
    try {
      const headersList = await headers();
      host = headersList.get("host") || "";
    } catch {
      host = "";
    }
  }

  const hostInfo = parseTenantFromHost(host, searchParams);
  if (!hostInfo.isTenantHost) {
    return null;
  }

  const supabase = await createClient();

  // 1. Buscar primero en tenant_domains por dominio completo
  const { data: domainData } = await supabase
    .from("tenant_domains")
    .select(`
      id,
      empresa_id,
      domain,
      is_primary,
      verified,
      custom_theme,
      empresa:empresas (
        id,
        nombre_comercial,
        subdominio,
        rfc,
        logo_url,
        logo_url_dark,
        isotipo_url,
        color_primario,
        color_sidebar,
        eslogan,
        sitio_web
      )
    `)
    .eq("domain", hostInfo.fullDomain)
    .eq("verified", true)
    .maybeSingle();

  if (domainData && domainData.empresa) {
    return {
      id: domainData.id,
      empresa_id: domainData.empresa_id,
      domain: domainData.domain,
      is_primary: !!domainData.is_primary,
      verified: !!domainData.verified,
      custom_theme: (domainData.custom_theme as any) || {},
      empresa: domainData.empresa as any,
    };
  }

  // 2. Si no está en tenant_domains pero tiene subdominio, buscar directamente en empresas
  if (hostInfo.subdomain) {
    const { data: empData } = await supabase
      .from("empresas")
      .select(`
        id,
        nombre_comercial,
        subdominio,
        rfc,
        logo_url,
        logo_url_dark,
        isotipo_url,
        color_primario,
        color_sidebar,
        eslogan,
        sitio_web
      `)
      .eq("subdominio", hostInfo.subdomain)
      .maybeSingle();

    if (empData) {
      return {
        id: empData.id,
        empresa_id: empData.id,
        domain: hostInfo.fullDomain,
        is_primary: true,
        verified: true,
        custom_theme: {
          app_title: empData.nombre_comercial,
          primary_color: empData.color_primario,
          sidebar_color: empData.color_sidebar,
          logo_url: empData.logo_url,
        },
        empresa: empData as any,
      };
    }
  }

  return null;
}

/**
 * Determina a qué URL redirigir al usuario tras un inicio de sesión exitoso.
 * Si el usuario pertenece a un tenant con subdominio (ej. cova.tallertrack.com),
 * se asegura de enviarlo a su subdominio respectivo.
 */
export async function getTenantRedirectAfterLogin(
  userId: string,
  currentHost: string,
  searchParams?: Record<string, string | string[] | undefined>
): Promise<string> {
  const supabase = await createClient();

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("empresa_id")
    .eq("id", userId)
    .maybeSingle();

  if (!perfil?.empresa_id) {
    return "/tablero";
  }

  // Obtener dominio principal del tenant
  const { data: domainRec } = await supabase
    .from("tenant_domains")
    .select("domain")
    .eq("empresa_id", perfil.empresa_id)
    .eq("verified", true)
    .order("is_primary", { ascending: false })
    .limit(1)
    .maybeSingle();

  let targetDomain = domainRec?.domain;

  if (!targetDomain) {
    const { data: empRec } = await supabase
      .from("empresas")
      .select("subdominio")
      .eq("id", perfil.empresa_id)
      .maybeSingle();

    if (empRec?.subdominio) {
      targetDomain = `${empRec.subdominio}.tallertrack.com`;
    }
  }

  if (!targetDomain) {
    return "/tablero";
  }

  const cleanHost = (currentHost || "").toLowerCase().split(":")[0].trim();
  const targetClean = targetDomain.toLowerCase().trim();
  const targetSub = targetClean.includes(".tallertrack.com")
    ? targetClean.replace(".tallertrack.com", "")
    : targetClean.split(".")[0];

  // Si el host actual ya es exactamente el dominio destino:
  if (cleanHost === targetClean) {
    return "/tablero";
  }

  // Si estamos en entorno de desarrollo (localhost / 127.0.0.1):
  if (cleanHost.includes("localhost") || cleanHost === "127.0.0.1") {
    // Si ya estamos en cova.localhost
    if (cleanHost.startsWith(`${targetSub}.localhost`)) {
      return "/tablero";
    }
    // Si ya viene con el query param test_domain correspondiente
    if (searchParams && typeof searchParams.test_domain === "string" && searchParams.test_domain.toLowerCase() === targetClean) {
      return `/tablero?test_domain=${encodeURIComponent(targetClean)}`;
    }
    // En desarrollo, redirigir a /tablero?test_domain=cova.tallertrack.com para preservar sesión de cookies
    return `/tablero?test_domain=${encodeURIComponent(targetClean)}`;
  }

  // En producción (tallertrack.com, app.tallertrack.com o subdominio distinto):
  // Redirigir hacia el subdominio dedicado del tenant
  return `https://${targetClean}/tablero`;
}
