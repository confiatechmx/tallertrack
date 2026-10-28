import React, { useId } from "react";
import Link from "next/link";

export interface TallerTrackLogoProps {
  className?: string;
  variant?: "light" | "dark" | "monochrome";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  subtitle?: string;
  showTagline?: boolean;
  layout?: "horizontal" | "stacked" | "symbol-only";
  href?: string;
}

export default function TallerTrackLogo({
  className = "",
  variant = "light",
  size = "md",
  showText = true,
  subtitle,
  showTagline = false,
  layout = "horizontal",
  href,
}: TallerTrackLogoProps) {
  const uniqueId = useId().replace(/:/g, "");

  // Dimensions scale
  const iconSizes = {
    xs: "w-6 h-6",
    sm: "w-7 h-7",
    md: "w-8 h-8",
    lg: "w-10 h-10",
    xl: "w-14 h-14",
  };

  const textSizes = {
    xs: "text-sm",
    sm: "text-base",
    md: "text-lg",
    lg: "text-xl",
    xl: "text-2xl",
  };

  const taglineSizes = {
    xs: "text-[7.5px]",
    sm: "text-[8.5px]",
    md: "text-[9.5px]",
    lg: "text-[11px]",
    xl: "text-[12px]",
  };

  const isDark = variant === "dark";
  const isMono = variant === "monochrome";
  const isStacked = layout === "stacked";
  const isSymbolOnly = layout === "symbol-only";

  const symbolMark = (
    <div className={`${iconSizes[size]} relative flex items-center justify-center shrink-0`}>
      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-xs"
      >
        <defs>
          <linearGradient
            id={`badgeBg_${uniqueId}`}
            x1="0"
            y1="0"
            x2="64"
            y2="64"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor={isMono ? "#0F172A" : "#1C3EFF"} />
            <stop offset="100%" stopColor={isMono ? "#020617" : "#0722C7"} />
          </linearGradient>
          <linearGradient
            id={`whiteTrack_${uniqueId}`}
            x1="12"
            y1="12"
            x2="52"
            y2="52"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#F1F5F9" />
          </linearGradient>
          <linearGradient
            id={`cyanTrack_${uniqueId}`}
            x1="32"
            y1="20"
            x2="44"
            y2="52"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor={isMono ? "#CBD5E1" : "#38BDF8"} />
            <stop offset="100%" stopColor={isMono ? "#94A3B8" : "#0EA5E9"} />
          </linearGradient>
          <filter id={`shadow_${uniqueId}`} x="0" y="0" width="64" height="64" filterUnits="userSpaceOnUse">
            <feDropShadow dx="0" dy="1.2" stdDeviation="0.8" floodColor="#00127A" floodOpacity="0.3" />
          </filter>
        </defs>

        {/* Industrial Chamfered Badge Container */}
        <rect
          x="2"
          y="2"
          width="60"
          height="60"
          rx="14"
          fill={`url(#badgeBg_${uniqueId})`}
        />
        <rect
          x="2"
          y="2"
          width="60"
          height="60"
          rx="14"
          stroke="rgba(255,255,255,0.22)"
          strokeWidth="1.2"
        />

        <g filter={`url(#shadow_${uniqueId})`}>
          {/* Aerodynamic Precision Crossbar with 45° Speed Chamfer */}
          <path
            d="M12 15C12 13.3431 13.3431 12 15 12H46.5L52 18V21C52 22.6569 50.6569 24 49 24H15C13.3431 24 12 22.6569 12 21V15Z"
            fill={`url(#whiteTrack_${uniqueId})`}
          />

          {/* Tire Tread Sipes on Crossbar Wings (Left & Right) */}
          <line
            x1="17"
            y1="14.5"
            x2="19.5"
            y2="21.5"
            stroke={isMono ? "#0F172A" : "#1C3EFF"}
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <line
            x1="22"
            y1="14.5"
            x2="24.5"
            y2="21.5"
            stroke={isMono ? "#0F172A" : "#1C3EFF"}
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <line
            x1="42"
            y1="14.5"
            x2="39.5"
            y2="21.5"
            stroke={isMono ? "#0F172A" : "#1C3EFF"}
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <line
            x1="47"
            y1="14.5"
            x2="44.5"
            y2="21.5"
            stroke={isMono ? "#0F172A" : "#1C3EFF"}
            strokeWidth="2.2"
            strokeLinecap="round"
          />

          {/* Dual Telemetry & Chassis Rails (The Twin Track Stem) */}
          {/* Left Rail: Mechanical Power Pillar */}
          <path
            d="M22.5 24H29V48C29 49.6569 27.6569 51 26 51H25.5C23.8431 51 22.5 49.6569 22.5 48V24Z"
            fill={`url(#whiteTrack_${uniqueId})`}
          />

          {/* Right Rail: Velocity Cyan Telemetry Track */}
          <path
            d="M33.5 24H40V44.5C40 46.1569 38.6569 47.5 37 47.5H36.5C34.8431 47.5 33.5 46.1569 33.5 44.5V24Z"
            fill={`url(#cyanTrack_${uniqueId})`}
          />

          {/* The Apex Forward Chevron Notch in the Central Track Channel */}
          <path
            d="M26.5 32L31.5 37L26.5 42"
            stroke="#FFFFFF"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </svg>
    </div>
  );

  if (isSymbolOnly) {
    if (href) {
      return (
        <Link href={href} className="hover:opacity-95 transition-opacity inline-flex">
          {symbolMark}
        </Link>
      );
    }
    return symbolMark;
  }

  const content = (
    <div
      className={`inline-flex select-none ${
        isStacked ? "flex-col items-center text-center gap-2" : "items-center gap-2.5"
      } ${className}`}
    >
      {symbolMark}

      {/* Brand Typography Wordmark */}
      {showText && (
        <div className={`flex flex-col leading-none ${isStacked ? "items-center" : "items-start"}`}>
          <div className="flex items-center gap-1.5 leading-none">
            <span
              className={`font-heading font-extrabold tracking-tight ${textSizes[size]} ${
                isDark ? "text-white" : "text-[#1D2030]"
              }`}
            >
              Taller<span className={isDark ? "text-[#38BDF8]" : "text-[#1C3EFF]"}>Track</span>
            </span>
            {subtitle && !isStacked && (
              <span
                className={`text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded font-bold ${
                  isDark
                    ? "bg-white/10 text-slate-300 border border-white/15"
                    : "bg-slate-100 text-slate-700 border border-slate-200"
                }`}
              >
                {subtitle}
              </span>
            )}
          </div>

          {(showTagline || isStacked) && (
            <span
              className={`font-mono uppercase font-bold tracking-[0.18em] mt-1 ${taglineSizes[size]} ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Sistema Operativo para Talleres
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="hover:opacity-95 transition-opacity inline-flex">
        {content}
      </Link>
    );
  }

  return content;
}
