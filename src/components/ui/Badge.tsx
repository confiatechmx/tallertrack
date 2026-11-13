import React from "react";

export type BadgeVariant =
  | "default"
  | "secondary"
  | "success"
  | "warning"
  | "destructive"
  | "info"
  | "neutral"
  | "outline";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: "sm" | "md";
  dot?: boolean;
  dotPulse?: boolean;
  children: React.ReactNode;
}

const variantStyles: Record<BadgeVariant, { container: string; dot: string }> = {
  default: {
    container: "bg-blue-50 text-blue-800 border-blue-200/80",
    dot: "bg-blue-600",
  },
  secondary: {
    container: "bg-zinc-100 text-zinc-700 border-zinc-200/80",
    dot: "bg-zinc-500",
  },
  success: {
    container: "bg-emerald-50 text-emerald-800 border-emerald-200/70",
    dot: "bg-emerald-600",
  },
  warning: {
    container: "bg-amber-50 text-amber-900 border-amber-200/70",
    dot: "bg-amber-500",
  },
  destructive: {
    container: "bg-rose-50 text-rose-800 border-rose-200/70",
    dot: "bg-rose-600",
  },
  info: {
    container: "bg-sky-50 text-sky-800 border-sky-200/70",
    dot: "bg-sky-600",
  },
  neutral: {
    container: "bg-zinc-100 text-zinc-600 border-zinc-200/60",
    dot: "bg-zinc-400",
  },
  outline: {
    container: "bg-white text-zinc-700 border-zinc-300",
    dot: "bg-zinc-400",
  },
};

const sizeStyles = {
  sm: "text-[10px] py-0.5 px-2 gap-1 rounded-md font-semibold tracking-tight",
  md: "text-xs py-1 px-2.5 gap-1.5 rounded-lg font-semibold tracking-tight",
};

export function Badge({
  variant = "default",
  size = "sm",
  dot = false,
  dotPulse = false,
  className = "",
  children,
  ...props
}: BadgeProps) {
  const styles = variantStyles[variant] || variantStyles.default;

  return (
    <span
      className={`inline-flex items-center border font-sans select-none shrink-0 transition-colors ${styles.container} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${styles.dot} ${
            dotPulse ? "animate-pulse" : ""
          }`}
        />
      )}
      {children}
    </span>
  );
}
