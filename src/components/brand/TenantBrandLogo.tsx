"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import TallerTrackLogo, { TallerTrackLogoProps } from "./TallerTrackLogo";

export interface TenantBrandLogoProps {
  empresa?: {
    logo_url?: string | null;
    nombre_comercial?: string | null;
    color_primario?: string | null;
  } | null;
  logoUrl?: string | null;
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
 * Renderiza el logo del tenant de forma predeterminada (si existe logo_url).
 * Si el tenant no tiene logo configurado (null, vacío) o si la imagen falla al cargar,
 * se muestra automáticamente el isotipo/logotipo oficial de TallerTrack como fallback garantizado.
 */
export default function TenantBrandLogo({
  empresa,
  logoUrl,
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

  const resolvedLogoUrl = (logoUrl !== undefined ? logoUrl : empresa?.logo_url)?.trim();
  const resolvedName = tenantName || empresa?.nombre_comercial || "TallerTrack";
  const effectiveSize = size === "2xl" ? "xl" : size; // Map to TallerTrack supported sizes

  // Reset error if URL changes
  useEffect(() => {
    setImageError(false);
  }, [resolvedLogoUrl]);

  // Si no hay logo o la imagen falló al cargar, usamos el logo oficial de TallerTrack
  if (!resolvedLogoUrl || imageError) {
    const fallbackElement = (
      <TallerTrackLogo
        size={effectiveSize}
        variant={variant}
        layout={layout}
        showText={showText}
        href={href}
        className={className}
      />
    );
    return fallbackElement;
  }

  // Si el tenant tiene su propio logo válido
  const containerDimension = CONTAINER_SIZES[size] || CONTAINER_SIZES.md;
  const isDark = variant === "dark";

  const logoImage = (
    <div
      className={`${containerDimension} rounded-lg bg-white p-0.5 shrink-0 flex items-center justify-center border shadow-xs overflow-hidden ${
        isDark ? "border-white/20" : "border-slate-200"
      } ${imgClassName}`}
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
