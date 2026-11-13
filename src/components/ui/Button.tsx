import React from "react";
import { Loader2 } from "lucide-react";

export type ButtonVariant =
  | "default"
  | "secondary"
  | "outline"
  | "ghost"
  | "destructive"
  | "success";

export type ButtonSize = "xs" | "sm" | "default" | "lg" | "touch" | "icon";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  default:
    "bg-blue-600 hover:bg-blue-700 text-white shadow-xs border border-blue-700/50 active:bg-blue-800",
  secondary:
    "bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border border-zinc-200/80 active:bg-zinc-300",
  outline:
    "bg-white hover:bg-zinc-50 text-zinc-800 border border-zinc-300 shadow-2xs active:bg-zinc-100",
  ghost:
    "bg-transparent hover:bg-zinc-100 text-zinc-700 active:bg-zinc-200 border border-transparent",
  destructive:
    "bg-rose-600 hover:bg-rose-700 text-white shadow-xs border border-rose-700 active:bg-rose-800",
  success:
    "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs border border-emerald-700 active:bg-emerald-800",
};

const sizeStyles: Record<ButtonSize, string> = {
  xs: "h-7 px-2 text-[11px] rounded-lg gap-1",
  sm: "h-8.5 px-3 text-xs rounded-lg gap-1.5",
  default: "h-10 px-4 text-sm rounded-xl gap-2",
  lg: "h-11 px-5 text-sm font-semibold rounded-xl gap-2",
  touch: "h-12 min-h-[48px] px-5 text-sm font-bold rounded-xl gap-2.5", // Dirty Hands UX (>=48px)
  icon: "h-9 w-9 p-0 rounded-lg justify-center",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "default",
      size = "default",
      loading = false,
      disabled = false,
      leftIcon,
      rightIcon,
      children,
      className = "",
      type = "button",
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        className={`inline-flex items-center justify-center font-medium select-none cursor-pointer active:scale-[0.98] transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30 focus-visible:border-blue-600 disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0 mr-1.5" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        {children}
        {!loading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = "Button";
