"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import TallerTrackLogo from "./TallerTrackLogo";

export interface TenantBrandLogoProps {
  empresa?: {
    logo_url?: string | null;
    logo_url_dark?: string | null;
    isotipo_url?: string | null;
    nombre_comercial?: string | null;
    color_primario?: string | null;
  } | null;
  logoUrl?: string | null;
  logoUrlDark?: string | null;
  isotipoUrl?: string | null;
  tenantName?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  layout?: "symbol-only" | "horizontal" | "stacked";
  variant?: "light" | "dark" | "monochrome";
  showText?: boolean;
  className?: string;
  imgClassName?: string;
  alt?: string;
  href?: string;
}

const CONTAINER_SIZES: Record<string, string> = {
  xs: "w-6 h-6",
  sm: "w-7 h-7",
  md: "w-8 h-8",
  lg: "w-11 h-11",
  xl: "w-14 h-14",
  "2xl": "w-16 h-16",
};

const TEXT_SIZES: Record<string, string> = {
  xs: "text-xs",
  sm: "text-sm",
  md: "text-base font-bold",
  lg: "text-lg font-extrabold",
  xl: "text-xl font-black",
  "2xl": "text-2xl font-black",
};

/**
 * TenantBrandLogo:
 * Sistema inteligente de colocación de marca multi-activo:
 * 1. Para fondos oscuros (Sidebar, cabecera oscura del portal): prioriza `logo_url_dark`.
 * 2. Para espacios compactos / símbolo (conmutador de talleres, avatar 24-28px): prioriza `isotipo_url`.
 * 3. Para documentos impresos, tickets y fondos claros: prioriza `logo_url`.
 * 4. Si el tenant solo cargó un logo genérico, lo reutiliza con contenedor de contraste.
 * 5. Si el tenant no tiene logo o falla al cargar, conmuta automáticamente a TallerTrackLogo.
 */
export default function TenantBrandLogo({
  empresa,
  logoUrl,
  logoUrlDark,
  isotipoUrl,
  tenantName,
  size = "md",
  layout = "symbol-only",
  variant = "light",
  showText = false,
  className = "",
  imgClassName = "",
  alt,
  href,
}: TenantBrandLogoProps) {
  const [imageError, setImageError] = useState(false);

  // Selector inteligente de imagen según el contexto visual
  const candidateIsotipo = isotipoUrl ?? empresa?.isotipo_url;
  const candidateDark = logoUrlDark ?? empresa?.logo_url_dark;
  const candidateLight = logoUrl ?? empresa?.logo_url;

  let resolvedLogoUrl: string | undefined;

  const isSmallCompact = (size === "xs" || size === "sm") && layout === "symbol-only";
  const isDark = variant === "dark";

  if (isSmallCompact && candidateIsotipo) {
    resolvedLogoUrl = candidateIsotipo;
  } else if (isDark && candidateDark) {
    resolvedLogoUrl = candidateDark;
  } else if (!isDark && candidateLight) {
    resolvedLogoUrl = candidateLight;
  } else {
    // Fallback en cascada a cualquier activo disponible del tenant
    resolvedLogoUrl = candidateLight || candidateDark || candidateIsotipo || undefined;
  }

  resolvedLogoUrl = resolvedLogoUrl?.trim();
  const resolvedName = tenantName || empresa?.nombre_comercial || "TallerTrack";
  const effectiveSize = size === "2xl" ? "xl" : size;

  // Reset error if target URL changes
  useEffect(() => {
    setImageError(false);
  }, [resolvedLogoUrl]);

  // Si no hay logo del tenant o falló la imagen remota, fallback garantizado a TallerTrack
  if (!resolvedLogoUrl || imageError) {
    return (
      <TallerTrackLogo
        size={effectiveSize}
        variant={variant}
        layout={layout}
        showText={showText}
        href={href}
        className={className}
      />
    );
  }

  const containerDimension = CONTAINER_SIZES[size] || CONTAINER_SIZES.md;

  // Si usamos el logo oscuro sobre fondo oscuro o isotipo, podemos dejarlo transparente
  // Si usamos logo claro sobre fondo oscuro, le aplicamos contenedor de contraste
  const needsContrastBg = !isDark || (!candidateDark && resolvedLogoUrl === candidateLight);

  const logoImage = (
    <div
      className={`${containerDimension} rounded-lg ${
        needsContrastBg ? "bg-white p-0.5 border border-slate-200 shadow-xs" : "bg-transparent p-0"
      } shrink-0 flex items-center justify-center overflow-hidden ${imgClassName}`}
    >
      <img
        src={resolvedLogoUrl}
        alt={alt || resolvedName}
        onError={() => setImageError(true)}
        className="w-full h-full object-contain"
        loading="lazy"
      />
    </div>
  );

  let content: React.ReactNode = logoImage;

  if (showText && layout !== "symbol-only") {
    const isStacked = layout === "stacked";
    content = (
      <div
        className={`flex ${
          isStacked ? "flex-col items-center gap-1.5 text-center" : "items-center gap-2.5 text-left"
        }`}
      >
        {logoImage}
        <div className="flex flex-col min-w-0">
          <span
            className={`truncate font-heading ${TEXT_SIZES[size]} ${
              isDark ? "text-white" : "text-slate-900"
            }`}
          >
            {resolvedName}
          </span>
        </div>
      </div>
    );
  }

  if (href) {
    return (
      <Link href={href} className={`inline-flex items-center ${className}`}>
        {content}
      </Link>
    );
  }

  return <div className={`inline-flex items-center ${className}`}>{content}</div>;
}
