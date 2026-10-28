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
    md: "w-9 h-9",
    lg: "w-11 h-11",
    xl: "w-14 h-14",
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
      {/* Icon Mark: Geometric "T" + Velocity Track */}
      <div
        className={`${iconSizes[size]} relative flex items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 shadow-sm border border-blue-500/30 text-white shrink-0`}
      >
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-[60%] h-[60%] drop-shadow"
        >
          {/* Top Horizontal Bar of the T with speed notches */}
          <path
            d="M5 8.5C5 7.67157 5.67157 7 6.5 7H25.5C26.3284 7 27 7.67157 27 8.5C27 9.32843 26.3284 10 25.5 10H6.5C5.67157 10 5 9.32843 5 8.5Z"
            fill="currentColor"
          />
          {/* Vertical stem: precision track pillar */}
          <path
            d="M13.5 11.5H18.5V23C18.5 24.1046 17.6046 25 16.5 25H15.5C14.3954 25 13.5 24.1046 13.5 23V11.5Z"
            fill="currentColor"
          />
          {/* Dynamic forward arrow/track runner mark */}
          <path
            d="M21 16.5L25.5 20.5L21 24.5"
            stroke="#93C5FD"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Brand Text */}
      {showText && (
        <div className="flex flex-col leading-none">
          <div className="flex items-center gap-1.5">
            <span
              className={`font-heading font-extrabold tracking-tight ${textSizes[size]} ${
                isDark ? "text-white" : "text-slate-900"
              }`}
            >
              Taller<span className="text-blue-600">Track</span>
            </span>
            {subtitle && (
              <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded font-semibold bg-blue-500/10 text-blue-600 border border-blue-500/20">
                {subtitle}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
