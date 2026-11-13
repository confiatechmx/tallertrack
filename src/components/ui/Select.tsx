"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface SelectOption<T extends string | number = string> {
  value: T;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  dotColor?: string;
  disabled?: boolean;
}

export type SelectVariant = "compact" | "default" | "touch" | "pill";

export interface CustomSelectProps<T extends string | number = string> {
  value: T;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  placeholder?: string;
  variant?: SelectVariant;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  dropdownClassName?: string;
  title?: string;
  ariaLabel?: string;
  align?: "left" | "right";
}

const variantTriggerStyles: Record<SelectVariant, string> = {
  compact:
    "h-7 text-xs font-semibold px-2 py-0.5 rounded-md gap-1.5 bg-transparent hover:bg-zinc-200/60 text-zinc-800 border-0 focus:ring-1 focus:ring-blue-600/30",
  pill:
    "h-7 text-xs font-semibold px-2 py-0.5 rounded-lg gap-1.5 bg-transparent hover:bg-zinc-200/50 text-zinc-900 border-0 focus:ring-1 focus:ring-blue-600/30",
  default:
    "h-10 text-sm px-3 py-2 rounded-xl gap-2 bg-white text-zinc-900 border border-zinc-200 shadow-2xs hover:border-zinc-300 focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600",
  touch:
    "h-12 min-h-[48px] text-sm font-semibold px-4 py-2.5 rounded-xl gap-2.5 bg-white text-zinc-900 border border-zinc-200 shadow-xs hover:border-zinc-300 focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600",
};

export function CustomSelect<T extends string | number = string>({
  value,
  onChange,
  options,
  placeholder = "Seleccionar...",
  variant = "default",
  disabled = false,
  className = "",
  triggerClassName = "",
  dropdownClassName = "",
  title,
  ariaLabel,
  align = "left",
}: CustomSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Handle keyboard events
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;

      if (e.key === "Escape") {
        setIsOpen(false);
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          const currentIndex = options.findIndex((opt) => opt.value === value);
          const nextIndex =
            currentIndex < options.length - 1 ? currentIndex + 1 : 0;
          const nextOpt = options[nextIndex];
          if (nextOpt && !nextOpt.disabled) {
            onChange(nextOpt.value);
          }
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          const currentIndex = options.findIndex((opt) => opt.value === value);
          const prevIndex =
            currentIndex > 0 ? currentIndex - 1 : options.length - 1;
          const prevOpt = options[prevIndex];
          if (prevOpt && !prevOpt.disabled) {
            onChange(prevOpt.value);
          }
        }
      }
    },
    [disabled, isOpen, options, value, onChange]
  );

  return (
    <div
      ref={containerRef}
      className={`relative inline-block text-left ${className}`}
      onKeyDown={handleKeyDown}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        title={title}
        aria-label={ariaLabel || title}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full inline-flex items-center justify-between select-none cursor-pointer transition-all duration-150 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${variantTriggerStyles[variant]} ${triggerClassName}`}
      >
        <span className="flex items-center gap-2 truncate">
          {selectedOption ? (
            <>
              {selectedOption.dotColor && (
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${selectedOption.dotColor}`}
                />
              )}
              {selectedOption.icon && (
                <span className="shrink-0">{selectedOption.icon}</span>
              )}
              <span className="truncate">{selectedOption.label}</span>
            </>
          ) : (
            <span className="text-zinc-400 font-normal truncate">
              {placeholder}
            </span>
          )}
        </span>

        <ChevronDown
          size={14}
          className={`shrink-0 text-zinc-400 transition-transform duration-150 ml-1 ${
            isOpen ? "rotate-180 text-zinc-700" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          tabIndex={-1}
          className={`absolute ${
            align === "right" ? "right-0" : "left-0"
          } mt-1.5 w-max min-w-[180px] max-w-[320px] max-h-64 overflow-y-auto z-50 bg-white rounded-xl border border-zinc-200/90 shadow-xl py-1 text-xs focus:outline-none animate-in fade-in-0 zoom-in-95 duration-100 ${dropdownClassName}`}
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={String(option.value)}
                type="button"
                role="option"
                aria-selected={isSelected}
                disabled={option.disabled}
                onClick={() => {
                  if (!option.disabled) {
                    onChange(option.value);
                    setIsOpen(false);
                  }
                }}
                className={`w-full text-left px-3 py-2 flex items-center justify-between gap-2.5 transition-colors cursor-pointer select-none ${
                  isSelected
                    ? "bg-blue-50/80 text-blue-900 font-bold"
                    : "text-zinc-700 hover:bg-zinc-100/80 hover:text-zinc-900 font-medium"
                } ${
                  option.disabled ? "opacity-40 cursor-not-allowed" : ""
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {option.dotColor && (
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${option.dotColor}`}
                    />
                  )}
                  {option.icon && (
                    <span className="shrink-0 text-zinc-500">
                      {option.icon}
                    </span>
                  )}
                  <div className="min-w-0">
                    <div className="truncate">{option.label}</div>
                    {option.description && (
                      <div className="text-[10px] text-zinc-400 font-normal truncate">
                        {option.description}
                      </div>
                    )}
                  </div>
                </div>

                {isSelected && (
                  <Check
                    size={14}
                    className="shrink-0 text-blue-600 stroke-[2.5]"
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
