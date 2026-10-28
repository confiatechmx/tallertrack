export interface TenantHostInfo {
  isTenantHost: boolean;
  subdomain: string | null;
  fullDomain: string;
  isCustomDomain?: boolean;
}

/**
 * Analiza el hostname de la petición para determinar si corresponde a un subdominio de tenant
 * (ej. cova.tallertrack.com, cova.localhost, o parametro ?test_domain=cova.tallertrack.com)
 * o si es un dominio raíz de la plataforma (tallertrack.com, app.tallertrack.com, localhost).
 */
export function parseTenantFromHost(
  host: string,
  searchParams?: URLSearchParams | Record<string, string | string[] | undefined>
): TenantHostInfo {
  const cleanHost = (host || "").toLowerCase().split(":")[0].trim();

  // 1. Parámetros de prueba en entorno local o staging
  let testDomain: string | undefined;
  let testSub: string | undefined;

  if (searchParams instanceof URLSearchParams) {
    testDomain = searchParams.get("test_domain") || undefined;
    testSub = searchParams.get("subdomain") || undefined;
  } else if (searchParams && typeof searchParams === "object") {
    testDomain = typeof searchParams.test_domain === "string" ? searchParams.test_domain : undefined;
    testSub = typeof searchParams.subdomain === "string" ? searchParams.subdomain : undefined;
  }

  if (testDomain) {
    const cleanTest = testDomain.toLowerCase().trim();
    const sub = cleanTest.includes(".tallertrack.com")
      ? cleanTest.replace(".tallertrack.com", "")
      : cleanTest.split(".")[0];
    return { isTenantHost: true, subdomain: sub, fullDomain: cleanTest };
  }

  if (testSub) {
    const cleanSub = testSub.toLowerCase().trim();
    return { isTenantHost: true, subdomain: cleanSub, fullDomain: `${cleanSub}.tallertrack.com` };
  }

  // 2. Dominios principales de la plataforma central
  const platformHosts = [
    "tallertrack.com",
    "www.tallertrack.com",
    "app.tallertrack.com",
    "autolisto.mx",
    "www.autolisto.mx",
    "app.autolisto.mx",
    "localhost",
    "127.0.0.1",
  ];

  if (platformHosts.includes(cleanHost)) {
    return { isTenantHost: false, subdomain: null, fullDomain: cleanHost };
  }

  // 3. Subdominios de tallertrack.com (ej. cova.tallertrack.com)
  if (cleanHost.endsWith(".tallertrack.com")) {
    const sub = cleanHost.replace(".tallertrack.com", "").trim();
    if (sub && sub !== "www" && sub !== "app") {
      return { isTenantHost: true, subdomain: sub, fullDomain: cleanHost };
    }
  }

  // 4. Subdominios de localhost para pruebas de desarrollo (ej. cova.localhost)
  if (cleanHost.endsWith(".localhost")) {
    const sub = cleanHost.replace(".localhost", "").trim();
    if (sub && sub !== "www" && sub !== "app") {
      return { isTenantHost: true, subdomain: sub, fullDomain: `${sub}.tallertrack.com` };
    }
  }

  // 5. Dominios personalizados completos (ej. tallerescova.com)
  return { isTenantHost: true, subdomain: null, fullDomain: cleanHost, isCustomDomain: true };
}

/**
 * Retorna el dominio base para compartir cookies de autenticación (SSO) entre subdominios.
 * Para tallertrack.com retorna '.tallertrack.com'.
 */
export function getTenantCookieDomain(host: string): string | undefined {
  const cleanHost = (host || "").toLowerCase().split(":")[0].trim();
  if (cleanHost.includes("tallertrack.com")) {
    return ".tallertrack.com";
  }
  return undefined;
}
