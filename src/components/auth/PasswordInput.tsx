"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function PasswordInput() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative">
      <input
        id="password"
        name="password"
        type={showPassword ? "text" : "password"}
        placeholder="••••••••"
        autoComplete="current-password"
        required
        className="border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 rounded-xl bg-white text-xs p-3 pr-10 w-full transition-all text-slate-900 outline-none"
      />
      <button
        type="button"
        onClick={() => setShowPassword((prev) => !prev)}
        tabIndex={-1}
        aria-label={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
        title={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer rounded-lg"
      >
        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}
