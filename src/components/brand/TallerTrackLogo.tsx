import React from "react";

interface TallerTrackLogoProps {
  className?: string;
  variant?: "light" | "dark" | "monochrome";
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  subtitle?: string;
}

export default function TallerTrackLogo({
  className = "",
  variant = "light",
  size = "md",
  showText = true,
  subtitle = "Shop OS",
}: TallerTrackLogoProps) {
  // Dimensions map
  const iconSizes = {
    sm: "w-7 h-7",
    md: "w-8 h-8",
    lg: "w-10 h-10",
    xl: "w-12 h-12",
  };

  const textSizes = {
    sm: "text-base",
    md: "text-lg",
    lg: "text-xl",
    xl: "text-2xl",
  };

  const isDark = variant === "dark";

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* Precision Icon Mark: Industrial Cobalt T + Velocity Notch */}
      <div
        className={`${iconSizes[size]} relative flex items-center justify-center rounded-lg bg-[#1C3EFF] shadow-xs text-white shrink-0`}
      >
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-[58%] h-[58%]"
        >
          {/* Top Horizontal Bar with precision bevel */}
          <rect x="4" y="6" width="24" height="4.5" rx="1.5" fill="currentColor" />
          {/* Vertical stem: precision track pillar */}
          <rect x="13.5" y="10.5" width="5" height="15.5" rx="1.5" fill="currentColor" />
          {/* Dynamic forward velocity arrow / notch */}
          <path
            d="M21 16L25 20L21 24"
            stroke="#93C5FD"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Brand Typography */}
      {showText && (
        <div className="flex flex-col leading-none">
          <div className="flex items-center gap-1.5">
            <span
              className={`font-heading font-extrabold tracking-tight ${textSizes[size]} ${
                isDark ? "text-white" : "text-[#1D2030]"
              }`}
            >
              Taller<span className="text-[#1C3EFF]">Track</span>
            </span>
            {subtitle && (
              <span
                className={`text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded font-semibold ${
                  isDark
                    ? "bg-white/10 text-slate-300 border border-white/15"
                    : "bg-slate-100 text-slate-700 border border-slate-200"
                }`}
              >
                {subtitle}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
