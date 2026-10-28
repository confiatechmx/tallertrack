"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Wrench,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Clock,
  Car,
  Smartphone,
  MessageSquare,
  DollarSign,
  Layers,
  Gauge,
  FileText,
  ChevronRight,
  Menu,
  X,
  ExternalLink,
  BarChart3,
  Play,
  Check,
  Truck,
  Camera,
  AlertTriangle,
  CreditCard,
  Receipt,
  Search,
  Building2,
  SlidersHorizontal,
  CircleDot,
  CheckCircle,
} from "lucide-react";
import TallerTrackLogo from "@/components/brand/TallerTrackLogo";

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"kanban" | "dvi" | "pos">("kanban");

  return (
    <div className="min-h-screen bg-white text-[#1D2030] font-sans antialiased selection:bg-[#1C3EFF]/10 selection:text-[#1C3EFF]">
      {/* 1. Industrial Announcement Bar */}
      <div className="bg-[#0B132B] text-white py-2 px-4 text-xs font-medium border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="bg-[#1C3EFF] text-white text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded">
              Nuevo
            </span>
            <span className="text-slate-300 hidden sm:inline">
              Inspecciones Digitales DVI con aprobación de presupuestos con 1 clic en WhatsApp.
            </span>
            <span className="text-slate-300 sm:hidden">
              Inspecciones DVI por WhatsApp en vivo.
            </span>
          </div>
          <Link
            href="/login"
            className="inline-flex items-center gap-1 text-slate-300 hover:text-white font-medium transition-colors text-[11px]"
          >
            Ver demostración en vivo <ArrowRight size={12} className="text-[#1C3EFF]" />
          </Link>
        </div>
      </div>

      {/* 2. Main Sticky Navigation Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#E2E8F0] transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[72px] flex items-center justify-between">
          {/* Brand Logo */}
          <Link href="/" className="hover:opacity-95 transition-opacity">
            <TallerTrackLogo size="lg" />
          </Link>

          {/* Desktop Nav Items (Shopmonkey Information Architecture) */}
          <nav className="hidden lg:flex items-center gap-7 text-[13.5px] font-medium text-[#475569]">
            <a href="#operacion" className="hover:text-[#1C3EFF] transition-colors">
              Operación
            </a>
            <a href="#dvi" className="hover:text-[#1C3EFF] transition-colors">
              Inspección DVI
            </a>
            <a href="#pos" className="hover:text-[#1C3EFF] transition-colors">
              Punto de Venta
            </a>
            <a href="#especialidades" className="hover:text-[#1C3EFF] transition-colors">
              Llanteras
            </a>
            <a href="#caracteristicas" className="hover:text-[#1C3EFF] transition-colors">
              Características
            </a>
          </nav>

          {/* Action CTAs */}
          <div className="hidden sm:flex items-center gap-3">
            <Link
              href="/login"
              className="text-[13px] font-semibold text-[#1D2030] hover:text-[#1C3EFF] px-3.5 py-2 rounded-md hover:bg-[#F8FAFC] transition-colors"
            >
              Iniciar Sesión
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 text-[13px] font-bold bg-[#1C3EFF] hover:bg-[#1532D4] text-white px-5 py-2.5 rounded-md shadow-xs transition-all"
            >
              Solicitar Demostración
              <ArrowRight size={14} />
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-[#1D2030] hover:bg-slate-100 rounded-md"
            aria-label="Abrir menú"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-b border-[#E2E8F0] px-4 pt-3 pb-6 space-y-3">
            <a
              href="#operacion"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-semibold text-[#1D2030] py-2"
            >
              Operación
            </a>
            <a
              href="#dvi"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-semibold text-[#1D2030] py-2"
            >
              Inspección DVI
            </a>
            <a
              href="#pos"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-semibold text-[#1D2030] py-2"
            >
              Punto de Venta
            </a>
            <a
              href="#especialidades"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-semibold text-[#1D2030] py-2"
            >
              Llanteras
            </a>
            <a
              href="#caracteristicas"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-semibold text-[#1D2030] py-2"
            >
              Características
            </a>
            <div className="pt-3 border-t border-[#E2E8F0] flex flex-col gap-2">
              <Link
                href="/login"
                className="w-full text-center py-2.5 text-sm font-bold text-[#1D2030] border border-[#CBD5E1] rounded-md"
              >
                Iniciar Sesión
              </Link>
              <Link
                href="/login"
                className="w-full text-center py-2.5 text-sm font-bold bg-[#1C3EFF] text-white rounded-md shadow-xs"
              >
                Solicitar Demostración
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* 3. Hero Section (Shopmonkey Editorial Pattern) */}
      <section className="relative pt-6 pb-12 lg:pt-8 lg:pb-16 overflow-hidden bg-white border-b border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-8 items-center">
            {/* Left Content */}
            <div className="lg:col-span-6 space-y-4">
              {/* Eyebrow Kicker */}
              <div className="inline-flex items-center gap-2">
                <span className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#1C3EFF]">
                  SOFTWARE DE GESTIÓN PARA TALLERES Y LLANTERAS
                </span>
              </div>

              {/* Display Headline */}
              <h1 className="text-3xl sm:text-4xl lg:text-[46px] font-extrabold tracking-tight text-[#1D2030] leading-[1.14]">
                El software todo en uno para hacer crecer tu taller.
              </h1>

              {/* Subtitle */}
              <p className="text-sm sm:text-base text-[#475569] leading-relaxed max-w-xl font-normal">
                Combina la maestría técnica de tu equipo con la máxima eficiencia operativa y rentabilidad comercial. Diseñado para el ritmo real del taller y la llantera.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-1">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 bg-[#1C3EFF] hover:bg-[#1532D4] text-white text-sm font-semibold px-6 py-3 rounded-md shadow-xs transition-all text-center"
                >
                  Solicitar Demostración
                  <ArrowRight size={15} />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 bg-white hover:bg-[#F8FAFC] text-[#1D2030] border border-[#CBD5E1] text-sm font-semibold px-5 py-3 rounded-md transition-colors text-center"
                >
                  <Play size={14} className="text-[#1C3EFF] fill-[#1C3EFF]" />
                  Ver Demostración en Vivo
                </Link>
              </div>

              {/* Direct Micro-Quote Proof (Always fits comfortably above fold!) */}
              <div className="pt-4 border-t border-[#E2E8F0] flex items-start gap-3">
                <div className="w-8 h-8 rounded-md bg-[#1D2030] text-white font-bold flex items-center justify-center text-xs shrink-0 font-mono">
                  RC
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs text-[#475569] italic leading-relaxed">
                    “Nos ahorra más de 2 horas diarias en recepción y los clientes aprueban presupuestos al instante por WhatsApp al ver las fotos de la inspección.”
                  </p>
                  <p className="text-xs font-bold text-[#1D2030]">
                    Ing. Roberto Cavazos{" "}
                    <span className="font-normal text-[#64748B]">
                      — Director General, Cova Tires & Service (Monterrey, N.L.)
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column: Realistic Product Window (Software Chrome) */}
            <div className="lg:col-span-6 relative">
              {/* Floating Value Pill (Top Right) */}
              <div className="absolute -top-3 -right-2 hidden sm:flex items-center gap-2 bg-white px-3 py-1.5 rounded-md shadow-md border border-slate-200 text-xs font-bold text-slate-800 z-10">
                <CheckCircle2 size={15} className="text-emerald-500" />
                <span>+38% Ticket Promedio con Fotos DVI</span>
              </div>

              <div className="rounded-lg bg-[#0F172A] p-2.5 sm:p-3 shadow-2xl border border-slate-800">
                {/* Desktop Window Title Bar */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800 mb-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                    <span className="ml-3 text-[11px] font-mono text-slate-400">
                      cova.tallertrack.app / tablero
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded">
                      Bahías Activas: 4/5
                    </span>
                  </div>
                </div>

                {/* Module Switcher Tabs */}
                <div className="flex gap-1 px-1 mb-2.5 bg-slate-900 p-1 rounded-md border border-slate-800">
                  <button
                    onClick={() => setActiveTab("kanban")}
                    className={`flex-1 text-[11px] font-bold py-1.5 px-2 rounded transition-all text-center ${
                      activeTab === "kanban"
                        ? "bg-[#1C3EFF] text-white shadow-xs"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Workflow en Bahías
                  </button>
                  <button
                    onClick={() => setActiveTab("dvi")}
                    className={`flex-1 text-[11px] font-bold py-1.5 px-2 rounded transition-all text-center ${
                      activeTab === "dvi"
                        ? "bg-[#1C3EFF] text-white shadow-xs"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Inspección DVI
                  </button>
                  <button
                    onClick={() => setActiveTab("pos")}
                    className={`flex-1 text-[11px] font-bold py-1.5 px-2 rounded transition-all text-center ${
                      activeTab === "pos"
                        ? "bg-[#1C3EFF] text-white shadow-xs"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Punto de Venta & Caja
                  </button>
                </div>

                {/* View 1: Workflow Kanban Mockup (High-Density Multi-Column) */}
                {activeTab === "kanban" && (
                  <div className="bg-[#1E293B] rounded-md p-2.5 space-y-2.5 font-sans">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {/* Col 1: Recepción & DVI */}
                      <div className="bg-[#0B132B] border border-slate-700/80 rounded-md p-2 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                              Recepción & DVI
                            </span>
                            <span className="font-mono text-[9px] bg-slate-800 text-slate-400 px-1 py-0.2 rounded">1</span>
                          </div>
                          <div className="mt-1.5 space-y-0.5">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-white text-[11px]">Nissan Versa 2022</span>
                              <span className="font-mono text-[9px] text-slate-400">[RXZ-412]</span>
                            </div>
                            <div className="text-[10px] text-slate-400 line-clamp-1">
                              Checklist 18 pts • DVI en patio
                            </div>
                          </div>
                        </div>
                        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[9px] text-slate-400">
                          <span>Asesor: David M.</span>
                          <span className="text-amber-400 font-bold bg-amber-500/10 px-1 py-0.2 rounded">DVI 80%</span>
                        </div>
                      </div>

                      {/* Col 2: En Bahía / Elevador */}
                      <div className="bg-[#0B132B] border border-[#1C3EFF]/50 rounded-md p-2 flex flex-col justify-between shadow-xs">
                        <div>
                          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                              En Bahía 1 (4T)
                            </span>
                            <span className="font-mono text-[9px] bg-blue-500/20 text-blue-300 px-1 py-0.2 rounded font-bold">2</span>
                          </div>
                          <div className="mt-1.5 space-y-0.5">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-white text-[11px]">Mazda CX-5 2021</span>
                              <span className="font-mono text-[9px] text-slate-400">[NLS-482]</span>
                            </div>
                            <div className="text-[10px] text-slate-300 line-clamp-1">
                              Afinación + Balatas Akebono
                            </div>
                          </div>
                        </div>
                        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[9px]">
                          <span className="text-slate-400">Téc: Manuel Vega</span>
                          <span className="font-mono font-bold text-emerald-400">$4,850 MXN</span>
                        </div>
                      </div>

                      {/* Col 3: Listo para Entrega */}
                      <div className="bg-[#0B132B] border border-slate-700/80 rounded-md p-2 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Listo p/ Salida
                            </span>
                            <span className="font-mono text-[9px] bg-emerald-500/20 text-emerald-300 px-1 py-0.2 rounded font-bold">1</span>
                          </div>
                          <div className="mt-1.5 space-y-0.5">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-white text-[11px]">Ford Lobo 2022</span>
                              <span className="font-mono text-[9px] text-slate-400">[PYK-819]</span>
                            </div>
                            <div className="text-[10px] text-slate-400 line-clamp-1">
                              4x Michelin + Alineación
                            </div>
                          </div>
                        </div>
                        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[9px]">
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle2 size={10} /> Pagado POS
                          </span>
                          <span className="font-mono font-bold text-emerald-400">$22,400</span>
                        </div>
                      </div>
                    </div>

                    {/* Operational Strip */}
                    <div className="p-2 rounded bg-[#0B132B] border border-slate-700/60 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-slate-300 font-medium text-[11px]">
                          Presupuesto OT-1044 aprobado por cliente vía WhatsApp en 3 min
                        </span>
                      </div>
                      <Link
                        href="/login"
                        className="text-[11px] font-bold text-[#93C5FD] hover:text-white flex items-center gap-1"
                      >
                        Abrir tablero <ChevronRight size={12} />
                      </Link>
                    </div>
                  </div>
                )}

                {/* View 2: Inspección DVI Mockup */}
                {activeTab === "dvi" && (
                  <div className="bg-[#1E293B] rounded-md p-3 space-y-2.5 font-sans">
                    <div className="flex items-center justify-between pb-1 border-b border-slate-700/60">
                      <div>
                        <span className="font-bold text-white text-xs">
                          Inspección Digital Vehicular (DVI)
                        </span>
                        <span className="font-mono text-[10px] text-slate-400 ml-2">
                          Toyota Hilux 2023 [TME-119-B]
                        </span>
                      </div>
                      <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded font-mono">
                        Semáforo Oficial
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {/* Red Urgency */}
                      <div className="p-2 rounded bg-rose-500/10 border border-rose-500/30 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                          <span className="text-white text-[11px] font-medium">
                            Balatas Delanteras (Espesor: 1.8 mm — Límite de seguridad 3.0 mm)
                          </span>
                        </div>
                        <span className="text-[9px] font-bold uppercase text-rose-300 bg-rose-500/20 px-1.5 py-0.5 rounded">
                          Crítico
                        </span>
                      </div>

                      {/* Yellow Warning */}
                      <div className="p-2 rounded bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                          <span className="text-white text-[11px] font-medium">
                            Profundidad Llanta Tras. Der. (3.2 mm — Desgaste irregular interior)
                          </span>
                        </div>
                        <span className="text-[9px] font-bold uppercase text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded">
                          Atención
                        </span>
                      </div>

                      {/* Green Good */}
                      <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                          <span className="text-white text-[11px] font-medium">
                            Suspensión Delantera, Bieletas y Terminales sin juego axial
                          </span>
                        </div>
                        <span className="text-[9px] font-bold uppercase text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded">
                          Correcto
                        </span>
                      </div>
                    </div>

                    <div className="p-2 rounded bg-[#0B132B] border border-slate-700/60 flex items-center justify-between">
                      <span className="text-[10px] text-slate-300">
                        Foto con medición enviada al WhatsApp del cliente con botón de aprobación directa.
                      </span>
                      <span className="text-[10px] font-mono font-bold text-emerald-400 shrink-0">
                        Aprobado 100%
                      </span>
                    </div>
                  </div>
                )}

                {/* View 3: POS & Refacciones Mockup */}
                {activeTab === "pos" && (
                  <div className="bg-[#1E293B] rounded-md p-3 space-y-2.5 font-sans">
                    <div className="flex items-center justify-between pb-1 border-b border-slate-700/60">
                      <div>
                        <span className="font-bold text-white text-xs">
                          Caja Chica & Refacciones (Buyout Matrix)
                        </span>
                        <span className="font-mono text-[10px] text-slate-400 ml-2">Turno #12</span>
                      </div>
                      <span className="text-[9px] bg-blue-500/20 text-[#93C5FD] font-bold px-2 py-0.5 rounded font-mono">
                        Arqueo Ciego
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-[#0B132B] p-2 rounded border border-slate-700/70">
                        <div className="text-[10px] text-slate-400">Refacción Mostrador AutoZone</div>
                        <div className="text-sm font-mono font-bold text-white mt-0.5">
                          $1,850.00 MXN
                        </div>
                        <div className="text-[10px] text-emerald-400 mt-0.5">
                          Margen Taller +35% ($2,497.50 al cliente)
                        </div>
                      </div>
                      <div className="bg-[#0B132B] p-2 rounded border border-slate-700/70">
                        <div className="text-[10px] text-slate-400">Cobro Dividido (Split)</div>
                        <div className="text-sm font-mono font-bold text-white mt-0.5">
                          $4,850.00 MXN
                        </div>
                        <div className="text-[10px] text-slate-300 mt-0.5">
                          $3,500 Terminal + $1,350 Efectivo
                        </div>
                      </div>
                    </div>

                    <div className="p-2 rounded bg-[#0B132B] border border-slate-700/60 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <CheckCircle size={14} className="text-emerald-400" />
                        <span className="text-[11px] text-slate-300">
                          Corte de Caja Cuadrado: Cero faltantes al cierre del turno matutino.
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Industrial Trust & Metrics Bar (Shopmonkey Clean Metrics) */}
      <section className="py-10 bg-[#F4F7FB] border-b border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="border-l-2 border-[#1C3EFF] pl-4">
              <div className="text-3xl lg:text-4xl font-extrabold text-[#1D2030] tracking-tight">
                +38%
              </div>
              <div className="text-xs font-semibold text-[#64748B] mt-1 uppercase tracking-wider">
                En ticket promedio vía fotos DVI
              </div>
            </div>
            <div className="border-l-2 border-slate-300 pl-4">
              <div className="text-3xl lg:text-4xl font-extrabold text-[#1D2030] tracking-tight">
                2.5x
              </div>
              <div className="text-xs font-semibold text-[#64748B] mt-1 uppercase tracking-wider">
                Más rapidez en apertura de orden en patio
              </div>
            </div>
            <div className="border-l-2 border-slate-300 pl-4">
              <div className="text-3xl lg:text-4xl font-extrabold text-[#1D2030] tracking-tight">
                0%
              </div>
              <div className="text-xs font-semibold text-[#64748B] mt-1 uppercase tracking-wider">
                Fugas de dinero en caja y refacciones
              </div>
            </div>
            <div className="border-l-2 border-[#1C3EFF] pl-4">
              <div className="text-3xl lg:text-4xl font-extrabold text-[#1D2030] tracking-tight">
                99.8%
              </div>
              <div className="text-xs font-semibold text-[#64748B] mt-1 uppercase tracking-wider">
                Disponibilidad operativa en la nube
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Editorial Switchback 1: GESTIÓN OPERATIVA DEL TALLER */}
      <section id="operacion" className="py-20 lg:py-28 bg-white border-b border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
            {/* Copy Side */}
            <div className="lg:col-span-6 space-y-6">
              <div className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#1C3EFF]">
                GESTIÓN OPERATIVA DEL TALLER
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1D2030] tracking-tight leading-tight">
                Control total de cada bahía, mecánico y orden de trabajo.
              </h2>
              <p className="text-base text-[#475569] leading-relaxed">
                Elimina los cuadernos de recepción con grasa y los pizarrones desactualizados. Visualiza la carga real de trabajo en tiempo real, asigna mecánicos a elevadores específicos y detecta cuellos de botella antes de que afecten tus tiempos de entrega.
              </p>

              <div className="space-y-4 pt-2">
                <div className="flex items-start gap-3.5">
                  <div className="w-5 h-5 rounded bg-[#1C3EFF]/10 text-[#1C3EFF] flex items-center justify-center shrink-0 mt-0.5">
                    <Check size={13} strokeWidth={3} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#1D2030]">
                      Asignación visual de bahías y elevadores
                    </h4>
                    <p className="text-xs text-[#64748B] mt-0.5 leading-relaxed">
                      Flujo Kanban intuitivo para mover órdenes entre diagnóstico, espera de refacciones, trabajo en rampa y lavado.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="w-5 h-5 rounded bg-[#1C3EFF]/10 text-[#1C3EFF] flex items-center justify-center shrink-0 mt-0.5">
                    <Check size={13} strokeWidth={3} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#1D2030]">
                      Control de horas hombre y destajo
                    </h4>
                    <p className="text-xs text-[#64748B] mt-0.5 leading-relaxed">
                      Rastrea el tiempo real invertido por técnico contra el tiempo tabulado de catálogo y liquida comisiones con precisión matemática.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="w-5 h-5 rounded bg-[#1C3EFF]/10 text-[#1C3EFF] flex items-center justify-center shrink-0 mt-0.5">
                    <Check size={13} strokeWidth={3} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#1D2030]">
                      Dirty Hands UX para móvil y tableta
                    </h4>
                    <p className="text-xs text-[#64748B] mt-0.5 leading-relaxed">
                      Diseñado específicamente para técnicos con manos grasosas en el foso o rampa, con botones táctiles de 48px y texto de alta visibilidad.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Visual Board Side */}
            <div className="lg:col-span-6">
              <div className="rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] p-5 shadow-sm space-y-3.5">
                <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal size={16} className="text-[#1C3EFF]" />
                    <span className="text-xs font-bold text-[#1D2030]">
                      Capacidad Operativa de Taller
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-[#64748B]">
                    Turno: 08:00 - 18:00 hrs
                  </span>
                </div>

                {/* Bay Row 1 */}
                <div className="bg-white p-3.5 rounded-md border border-[#E2E8F0] space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-[#1D2030] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Bahía 1 (Elevador 4T) — Mazda CX-5 2021
                    </span>
                    <span className="bg-blue-50 text-[#1C3EFF] border border-blue-200 px-2 py-0.5 rounded text-[10px] font-bold font-mono">
                      75% Completado
                    </span>
                  </div>
                  <div className="text-xs text-[#64748B] flex justify-between">
                    <span>Téc. Manuel Vega • Balatas Akebono & Rectificado</span>
                    <span className="font-mono text-slate-800">1h 15m / 1h 45m</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded overflow-hidden">
                    <div className="bg-[#1C3EFF] h-2 w-[75%]" />
                  </div>
                </div>

                {/* Bay Row 2 */}
                <div className="bg-white p-3.5 rounded-md border border-[#E2E8F0] space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-[#1D2030] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      Bahía 2 (Alineación Láser) — Nissan Versa 2020
                    </span>
                    <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded text-[10px] font-bold font-mono">
                      Esperando Refacción
                    </span>
                  </div>
                  <div className="text-xs text-[#64748B] flex justify-between">
                    <span>AutoZone Buyout: Sensor de Oxígeno Banco 1</span>
                    <span className="font-mono text-amber-600">En ruta (15 min)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded overflow-hidden">
                    <div className="bg-amber-500 h-2 w-[40%]" />
                  </div>
                </div>

                {/* Bay Row 3 */}
                <div className="bg-white p-3.5 rounded-md border border-[#E2E8F0] space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-[#1D2030] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Bahía 3 (Rampa de Tijera) — Toyota Hilux 2023
                    </span>
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-bold font-mono">
                      Inspección Final
                    </span>
                  </div>
                  <div className="text-xs text-[#64748B] flex justify-between">
                    <span>Torque de birlos a 110 lb-ft verificado con torquímetro</span>
                    <span className="font-mono text-emerald-600">Completado</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded overflow-hidden">
                    <div className="bg-emerald-500 h-2 w-[100%]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Editorial Switchback 2: INSPECCIÓN DIGITAL DVI Y WHATSAPP */}
      <section id="dvi" className="py-20 lg:py-28 bg-[#F4F7FB] border-b border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
            {/* Visual Phone/Tablet Mockup (Left Side) */}
            <div className="lg:col-span-6 order-2 lg:order-1">
              <div className="rounded-lg border border-[#CBD5E1] bg-white p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
                  <div className="flex items-center gap-2">
                    <MessageSquare size={16} className="text-[#10B981]" />
                    <span className="text-xs font-bold text-[#1D2030]">
                      Notificación Automática por WhatsApp al Cliente
                    </span>
                  </div>
                  <span className="text-[10px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-bold">
                    Entregado
                  </span>
                </div>

                {/* WhatsApp Chat Preview */}
                <div className="bg-[#EFEAE2] p-4 rounded-md space-y-3">
                  <div className="bg-white p-3 rounded-md shadow-2xs space-y-2 max-w-[90%]">
                    <div className="text-[11px] font-bold text-[#1D2030]">
                      TallerTrack • Servicio Automotriz Valle Oriente
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      Hola Sr. Luis Cavazos, su <strong>Mazda CX-5 [NLS-482-B]</strong> ha sido inspeccionado por el Téc. Manuel Vega.
                    </p>
                    <div className="bg-rose-50 border border-rose-200 p-2 rounded text-[11px] text-rose-800">
                      <strong>Hallazgo de Seguridad:</strong> Balatas delanteras en 1.8 mm (Desgaste severo con riesgo de dañar discos de freno).
                    </div>
                    <p className="text-xs text-slate-600">
                      Revise la evidencia fotográfica y autorice el presupuesto en línea con 1 clic:
                    </p>
                    <div className="bg-[#F8FAFC] border border-[#CBD5E1] p-2 rounded font-mono text-[11px] text-[#1C3EFF] font-bold flex items-center justify-between">
                      <span>tallertrack.com/aprobacion/ot-1042</span>
                      <ExternalLink size={12} />
                    </div>
                  </div>

                  <div className="bg-[#DCF8C6] p-3 rounded-md shadow-2xs space-y-1.5 ml-auto max-w-[85%]">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[#1D2030]">
                        Cliente Autorizó Presupuesto
                      </span>
                      <CheckCircle2 size={13} className="text-emerald-600" />
                    </div>
                    <p className="text-xs text-slate-800">
                      Autorizo cambio de balatas y rectificado de discos ($4,850.00 MXN).
                    </p>
                    <div className="text-[10px] text-slate-500 text-right font-mono">
                      11:42 AM • Confirmación Digital
                    </div>
                  </div>
                </div>

                {/* Status Bar */}
                <div className="p-3 bg-[#F8FAFC] rounded-md border border-[#E2E8F0] flex items-center justify-between text-xs">
                  <span className="text-[#64748B]">Tiempo promedio de aprobación:</span>
                  <span className="font-bold text-emerald-600 font-mono">4 minutos y 18 segundos</span>
                </div>
              </div>
            </div>

            {/* Copy Side (Right Side) */}
            <div className="lg:col-span-6 order-1 lg:order-2 space-y-6">
              <div className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#1C3EFF]">
                INSPECCIÓN DIGITAL VEHICULAR (DVI)
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1D2030] tracking-tight leading-tight">
                Multiplica la aprobación de presupuestos con evidencia fotográfica directa en WhatsApp.
              </h2>
              <p className="text-base text-[#475569] leading-relaxed">
                Los clientes desconfían de lo que no pueden ver. Cuando reciben en su teléfono fotos nítidas con calibrador milimétrico y semáforo de gravedad, entienden la necesidad del servicio y autorizan de inmediato sin discusiones.
              </p>

              <div className="space-y-4 pt-2">
                <div className="flex items-start gap-3.5">
                  <div className="w-5 h-5 rounded bg-[#1C3EFF]/10 text-[#1C3EFF] flex items-center justify-center shrink-0 mt-0.5">
                    <Check size={13} strokeWidth={3} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#1D2030]">
                      Semáforo universal Verde / Amarillo / Rojo
                    </h4>
                    <p className="text-xs text-[#64748B] mt-0.5 leading-relaxed">
                      Comunica urgencia técnica sin jerga incomprensible. El cliente sabe exactamente qué es crítico para su seguridad y qué puede diferir.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="w-5 h-5 rounded bg-[#1C3EFF]/10 text-[#1C3EFF] flex items-center justify-center shrink-0 mt-0.5">
                    <Check size={13} strokeWidth={3} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#1D2030]">
                      Medición milimétrica de desgaste
                    </h4>
                    <p className="text-xs text-[#64748B] mt-0.5 leading-relaxed">
                      Captura el espesor exacto de balatas (mm) y dibujo de neumáticos contra los límites de fabricante para sustentar cada recomendación.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="w-5 h-5 rounded bg-[#1C3EFF]/10 text-[#1C3EFF] flex items-center justify-center shrink-0 mt-0.5">
                    <Check size={13} strokeWidth={3} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#1D2030]">
                      Aprobación interactiva sin aplicaciones
                    </h4>
                    <p className="text-xs text-[#64748B] mt-0.5 leading-relaxed">
                      El cliente no necesita crear contraseñas ni descargar apps pesadas. Abre el enlace directo de su WhatsApp y firma digitalmente.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Editorial Switchback 3: PUNTO DE VENTA Y CAJA CHICA */}
      <section id="pos" className="py-20 lg:py-28 bg-white border-b border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
            {/* Copy Side */}
            <div className="lg:col-span-6 space-y-6">
              <div className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#1C3EFF]">
                PUNTO DE VENTA Y CAJA CHICA
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1D2030] tracking-tight leading-tight">
                Cobros en segundos, terminales bancarias y corte ciego sin faltantes.
              </h2>
              <p className="text-base text-[#475569] leading-relaxed">
                Hasta un 12% del margen de un taller se disipa en compras descontroladas de refacciones sobre mostrador y dinero suelto sin registrar. TallerTrack centraliza compras de emergencia, aplica recargos comerciales automáticos y cuadra cada turno.
              </p>

              <div className="space-y-4 pt-2">
                <div className="flex items-start gap-3.5">
                  <div className="w-5 h-5 rounded bg-[#1C3EFF]/10 text-[#1C3EFF] flex items-center justify-center shrink-0 mt-0.5">
                    <Check size={13} strokeWidth={3} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#1D2030]">
                      Arqueo ciego de caja chica
                    </h4>
                    <p className="text-xs text-[#64748B] mt-0.5 leading-relaxed">
                      Los cajeros cuentan el dinero físico sin conocer el saldo del sistema. Garantiza cero manipulaciones de efectivo al cierre de turno.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="w-5 h-5 rounded bg-[#1C3EFF]/10 text-[#1C3EFF] flex items-center justify-center shrink-0 mt-0.5">
                    <Check size={13} strokeWidth={3} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#1D2030]">
                      Matriz de margen sobre refacciones (Buyouts)
                    </h4>
                    <p className="text-xs text-[#64748B] mt-0.5 leading-relaxed">
                      Aplica automáticamente tu recargo comercial (+30%, +40%) sobre refacciones adquiridas en AutoZone o proveedores locales.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="w-5 h-5 rounded bg-[#1C3EFF]/10 text-[#1C3EFF] flex items-center justify-center shrink-0 mt-0.5">
                    <Check size={13} strokeWidth={3} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#1D2030]">
                      Pagos divididos y terminales bancarias
                    </h4>
                    <p className="text-xs text-[#64748B] mt-0.5 leading-relaxed">
                      Acepta cobros combinando efectivo, tarjeta de débito/crédito, transferencias SPEI y anticipos con recibo formal foliado.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Visual POS Drawer Side */}
            <div className="lg:col-span-6">
              <div className="rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] p-5 shadow-sm space-y-3.5">
                <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
                  <div className="flex items-center gap-2">
                    <CreditCard size={16} className="text-[#1C3EFF]" />
                    <span className="text-xs font-bold text-[#1D2030]">
                      Cobro de Orden OT-1043 — Terminal Punto de Venta
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-600">
                    Total: $22,400.00 MXN
                  </span>
                </div>

                {/* Split Breakdown */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-white p-3 rounded-md border border-[#E2E8F0]">
                    <div className="text-[10px] text-[#64748B]">Terminal Bancaria (BBVA)</div>
                    <div className="text-base font-mono font-bold text-[#1D2030] mt-0.5">
                      $18,400.00
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">Autorización: #481902</div>
                  </div>
                  <div className="bg-white p-3 rounded-md border border-[#E2E8F0]">
                    <div className="text-[10px] text-[#64748B]">Efectivo Recibido en Caja</div>
                    <div className="text-base font-mono font-bold text-[#1D2030] mt-0.5">
                      $4,000.00
                    </div>
                    <div className="text-[10px] text-emerald-600 mt-1 font-bold">Saldo Pendiente: $0.00</div>
                  </div>
                </div>

                {/* Shift Reconciliation Summary */}
                <div className="bg-white p-3.5 rounded-md border border-[#E2E8F0] text-xs space-y-2">
                  <div className="flex justify-between text-[#64748B]">
                    <span>Fondo Inicial de Caja Chica:</span>
                    <span className="font-mono font-medium text-[#1D2030]">$1,500.00 MXN</span>
                  </div>
                  <div className="flex justify-between text-[#64748B]">
                    <span>Compra Urgente Mostrador (Abrazaderas):</span>
                    <span className="font-mono font-medium text-rose-600">-$180.00 MXN</span>
                  </div>
                  <div className="flex justify-between text-[#64748B]">
                    <span>Total Ventas Cobradas en Turno:</span>
                    <span className="font-mono font-medium text-emerald-600">+$38,620.00 MXN</span>
                  </div>
                  <div className="flex justify-between font-bold text-[#1D2030] pt-2 border-t border-[#E2E8F0]">
                    <span>Diferencia en Arqueo Ciego:</span>
                    <span className="font-mono text-emerald-600 font-bold">$0.00 (Cuadrado al Centavo)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Industry Segmentation: "Construido para tu especialidad" */}
      <section id="especialidades" className="py-20 lg:py-28 bg-[#F4F7FB] border-b border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center space-y-3 mb-14">
            <div className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#1C3EFF]">
              ESPECIALIDADES DE LA INDUSTRIA
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1D2030] tracking-tight">
              Construido para el modelo exacto de tu negocio.
            </h2>
            <p className="text-sm sm:text-base text-[#475569] leading-relaxed">
              Ya sea que operes una sola rampa de frenos o una red de centros llanteros con control centralizado.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1 */}
            <div className="bg-white rounded-lg p-6 border border-[#E2E8F0] shadow-xs space-y-4 hover:border-[#1C3EFF] transition-colors">
              <div className="w-10 h-10 rounded-md bg-[#1C3EFF]/10 text-[#1C3EFF] flex items-center justify-center">
                <Wrench size={20} />
              </div>
              <h3 className="text-lg font-bold text-[#1D2030]">Talleres Mecánicos</h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Control de afinaciones, motores, transmisiones y diagnósticos por escáner. Seguimiento de bahías y liquidación de destajo por técnico.
              </p>
              <ul className="text-xs text-[#475569] space-y-2 pt-2 border-t border-[#E2E8F0]">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={13} className="text-[#10B981]" /> Presupuestos formales
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={13} className="text-[#10B981]" /> Historial clínico de vehículo
                </li>
              </ul>
            </div>

            {/* Card 2 */}
            <div className="bg-white rounded-lg p-6 border border-[#1C3EFF] shadow-xs space-y-4 relative">
              <div className="absolute top-0 right-0 bg-[#1C3EFF] text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-bl-md">
                Especialidad
              </div>
              <div className="w-10 h-10 rounded-md bg-[#1C3EFF] text-white flex items-center justify-center">
                <Gauge size={20} />
              </div>
              <h3 className="text-lg font-bold text-[#1D2030]">Llanteras & Suspensión</h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Catálogo por medida de llanta (ancho, perfil, rin), rotación rápida de autos, paquetes de alineación 3D, balanceo y amortiguadores.
              </p>
              <ul className="text-xs text-[#475569] space-y-2 pt-2 border-t border-[#E2E8F0]">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={13} className="text-[#10B981]" /> Medición de dibujo en mm
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={13} className="text-[#10B981]" /> Rotación rápida en rampa
                </li>
              </ul>
            </div>

            {/* Card 3 */}
            <div className="bg-white rounded-lg p-6 border border-[#E2E8F0] shadow-xs space-y-4 hover:border-[#1C3EFF] transition-colors">
              <div className="w-10 h-10 rounded-md bg-[#1C3EFF]/10 text-[#1C3EFF] flex items-center justify-center">
                <ShieldCheck size={20} />
              </div>
              <h3 className="text-lg font-bold text-[#1D2030]">Frenos & Afinación</h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Servicios rápidos de alto volumen. Registro de rectificado de discos, purgado con máquina presurizada y paquetes de mantenimiento por kilometraje.
              </p>
              <ul className="text-xs text-[#475569] space-y-2 pt-2 border-t border-[#E2E8F0]">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={13} className="text-[#10B981]" /> Calibración de balatas
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={13} className="text-[#10B981]" /> Tiempos estandarizados
                </li>
              </ul>
            </div>

            {/* Card 4 */}
            <div className="bg-white rounded-lg p-6 border border-[#E2E8F0] shadow-xs space-y-4 hover:border-[#1C3EFF] transition-colors">
              <div className="w-10 h-10 rounded-md bg-[#1C3EFF]/10 text-[#1C3EFF] flex items-center justify-center">
                <Building2 size={20} />
              </div>
              <h3 className="text-lg font-bold text-[#1D2030]">Flotillas & Multi-Taller</h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Control Plane HQ centralizado. Facturación consolidada a crédito para flotillas, comparativa de sucursales y permisos de usuario blindados.
              </p>
              <ul className="text-xs text-[#475569] space-y-2 pt-2 border-t border-[#E2E8F0]">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={13} className="text-[#10B981]" /> Límites de crédito flotilla
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={13} className="text-[#10B981]" /> Dominios CNAME propios
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 9. Deep Feature Grid ("Construido para el ritmo diario de la industria automotriz") */}
      <section id="caracteristicas" className="py-20 lg:py-28 bg-white border-b border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center space-y-3 mb-16">
            <div className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#1C3EFF]">
              PLATAFORMA INDUSTRIAL INTEGRAL
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1D2030] tracking-tight">
              Construido para el ritmo diario de la industria automotriz.
            </h2>
            <p className="text-sm sm:text-base text-[#475569] leading-relaxed">
              Herramientas de ingeniería automotriz diseñadas para operar con rapidez en recepción, foso, mostrador y dirección general.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="space-y-3 p-6 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC]">
              <div className="w-9 h-9 rounded-md bg-[#1C3EFF]/10 text-[#1C3EFF] flex items-center justify-center">
                <FileText size={18} />
              </div>
              <h3 className="text-base font-bold text-[#1D2030]">
                Portal del Cliente sin Contraseñas (/orden/[id])
              </h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Cada vehículo recibe un enlace seguro único donde el cliente visualiza el estatus de su auto en rampa, fotos de inspección y desglose presupuestal.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="space-y-3 p-6 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC]">
              <div className="w-9 h-9 rounded-md bg-[#1C3EFF]/10 text-[#1C3EFF] flex items-center justify-center">
                <DollarSign size={18} />
              </div>
              <h3 className="text-base font-bold text-[#1D2030]">
                Compras de Refacciones Buyout & Matrix Pricing
              </h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Registra compras de emergencia en mostrador externo y aplica automáticamente la matriz de recargo comercial del taller para proteger el margen bruto.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="space-y-3 p-6 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC]">
              <div className="w-9 h-9 rounded-md bg-[#1C3EFF]/10 text-[#1C3EFF] flex items-center justify-center">
                <MessageSquare size={18} />
              </div>
              <h3 className="text-base font-bold text-[#1D2030]">
                WhatsApp API Automatizado sin Intervención Manual
              </h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Dispara mensajes automáticos al ingresar a patio, al completar la inspección digital y al quedar el vehículo listo para cobro y entrega.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="space-y-3 p-6 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC]">
              <div className="w-9 h-9 rounded-md bg-[#1C3EFF]/10 text-[#1C3EFF] flex items-center justify-center">
                <BarChart3 size={18} />
              </div>
              <h3 className="text-base font-bold text-[#1D2030]">
                Métricas Financieras y Productividad por Rampa
              </h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Conoce el ticket promedio diario, la relación entre mano de obra y refacciones, y el desempeño individual de cada mecánico del equipo.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="space-y-3 p-6 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC]">
              <div className="w-9 h-9 rounded-md bg-[#1C3EFF]/10 text-[#1C3EFF] flex items-center justify-center">
                <Smartphone size={18} />
              </div>
              <h3 className="text-base font-bold text-[#1D2030]">
                App PWA de Taller: Sin Descargas en Tiendas
              </h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Tus mecánicos abren la app directamente desde el navegador de su teléfono Android o iOS. Funciona de inmediato en patio y en foso.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="space-y-3 p-6 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC]">
              <div className="w-9 h-9 rounded-md bg-[#1C3EFF]/10 text-[#1C3EFF] flex items-center justify-center">
                <Receipt size={18} />
              </div>
              <h3 className="text-base font-bold text-[#1D2030]">
                Facturación Fiscal SAT CFDI 4.0 Integrada
              </h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Emisión de comprobantes fiscales digitales directamente desde la orden de trabajo con timbrado oficial y validación del catálogo de productos y servicios.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 10. Customer Testimonials / Industrial Proof */}
      <section className="py-20 lg:py-28 bg-[#F4F7FB] border-b border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center space-y-3 mb-14">
            <div className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#1C3EFF]">
              CASOS DE ÉXITO EN MÉXICO
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1D2030] tracking-tight">
              Los mejores talleres ya operan con TallerTrack.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Review 1 */}
            <div className="bg-white p-7 rounded-lg border border-[#E2E8F0] shadow-xs space-y-4">
              <p className="text-xs text-[#475569] leading-relaxed italic">
                “Antes de TallerTrack batallábamos para que los clientes aprobaran el cambio de balatas o amortiguadores. Hoy con la foto DVI y el semáforo en WhatsApp, la aprobación subió un 38% en el primer mes.”
              </p>
              <div className="pt-3 border-t border-[#E2E8F0] flex items-center gap-3">
                <div className="w-9 h-9 rounded-md bg-[#1D2030] text-white text-xs font-bold flex items-center justify-center font-mono">
                  RC
                </div>
                <div>
                  <div className="text-xs font-bold text-[#1D2030]">Ing. Roberto Cavazos</div>
                  <div className="text-[11px] text-[#64748B]">Director General, Cova Tires (Monterrey)</div>
                </div>
              </div>
            </div>

            {/* Review 2 */}
            <div className="bg-white p-7 rounded-lg border border-[#E2E8F0] shadow-xs space-y-4">
              <p className="text-xs text-[#475569] leading-relaxed italic">
                “El corte ciego de caja chica y el control de buyouts de refacciones solucionaron el dolor de cabeza de fin de mes. Cuadramos al centavo diariamente y los mecánicos ven sus comisiones en tiempo real.”
              </p>
              <div className="pt-3 border-t border-[#E2E8F0] flex items-center gap-3">
                <div className="w-9 h-9 rounded-md bg-[#1C3EFF] text-white text-xs font-bold flex items-center justify-center font-mono">
                  AM
                </div>
                <div>
                  <div className="text-xs font-bold text-[#1D2030]">Lic. Alejandro Morales</div>
                  <div className="text-[11px] text-[#64748B]">Propietario, Taller El Águila (Guadalajara)</div>
                </div>
              </div>
            </div>

            {/* Review 3 */}
            <div className="bg-white p-7 rounded-lg border border-[#E2E8F0] shadow-xs space-y-4">
              <p className="text-xs text-[#475569] leading-relaxed italic">
                “La recepción de vehículos en patio pasó de 12 minutos con papel y lápiz a menos de 3 minutos desde el celular. La imagen profesional que damos al cliente es de nivel agencia automotriz.”
              </p>
              <div className="pt-3 border-t border-[#E2E8F0] flex items-center gap-3">
                <div className="w-9 h-9 rounded-md bg-slate-800 text-white text-xs font-bold flex items-center justify-center font-mono">
                  MT
                </div>
                <div>
                  <div className="text-xs font-bold text-[#1D2030]">Mariana Treviño</div>
                  <div className="text-[11px] text-[#64748B]">Gerente de Operaciones, Ruta 57 (Querétaro)</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 11. Final Closing CTA Banner (Deep Industrial Navy Contrast) */}
      <section className="py-20 bg-[#0B132B] text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-7">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-white/10 text-[#93C5FD] border border-white/15 text-[11px] font-bold uppercase tracking-wider">
            DEMOSTRACIÓN INTERACTIVA EN VIVO
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
            Lleva la operación y rentabilidad de tu taller al estándar de la industria.
          </h2>

          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Sin instalaciones complejas ni contratos forzosos. Comienza a operar en menos de 24 horas con acompañamiento técnico en español.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#1C3EFF] hover:bg-[#1532D4] text-white text-sm font-bold px-7 py-3.5 rounded-md shadow-xs transition-all"
            >
              Solicitar Demostración Guiada
              <ArrowRight size={15} />
            </Link>
            <a
              href="https://wa.me/528123456789?text=Hola%20TallerTrack,%20quisiera%20agendar%20una%20demostraci%C3%B3n%20para%20mi%20taller"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold px-6 py-3.5 rounded-md border border-slate-700 transition-colors"
            >
              <MessageSquare size={15} className="text-[#10B981]" />
              Hablar con un Especialista por WhatsApp
            </a>
          </div>

          <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <Check size={13} className="text-[#1C3EFF]" /> Implementación en menos de 24 hrs
            </span>
            <span className="flex items-center gap-1.5">
              <Check size={13} className="text-[#1C3EFF]" /> Datos blindados con seguridad bancaria RLS
            </span>
            <span className="flex items-center gap-1.5">
              <Check size={13} className="text-[#1C3EFF]" /> Soporte local por WhatsApp y llamada
            </span>
          </div>
        </div>
      </section>

      {/* 12. Corporate Institutional Footer (Shopmonkey Clean 4-Column Layout) */}
      <footer className="bg-[#070D1E] text-slate-400 py-16 border-t border-slate-800 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-12 border-b border-slate-800/80">
            {/* Col 1: Brand & Headquarters */}
            <div className="space-y-4">
              <TallerTrackLogo variant="dark" size="md" />
              <p className="text-xs text-slate-400 leading-relaxed max-w-xs">
                El sistema operativo en la nube para talleres mecánicos, centros llanteros y especialistas automotrices en México y Latinoamérica.
              </p>
              <div className="text-[11px] text-slate-500 font-mono">
                Monterrey, N.L. • San Pedro Garza García
              </div>
            </div>

            {/* Col 2: Módulos del Sistema */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Características de Taller
              </h4>
              <ul className="space-y-2 text-slate-400">
                <li>
                  <a href="#operacion" className="hover:text-white transition-colors">
                    Tablero Kanban de Bahías & Elevadores
                  </a>
                </li>
                <li>
                  <a href="#dvi" className="hover:text-white transition-colors">
                    Inspección Digital Vehicular (DVI)
                  </a>
                </li>
                <li>
                  <a href="#pos" className="hover:text-white transition-colors">
                    Punto de Venta & Caja Chica
                  </a>
                </li>
                <li>
                  <a href="#pos" className="hover:text-white transition-colors">
                    Catálogo de Refacciones & Buyouts
                  </a>
                </li>
              </ul>
            </div>

            {/* Col 3: Segmentos & Especialidades */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Especialidades
              </h4>
              <ul className="space-y-2 text-slate-400">
                <li>
                  <a href="#especialidades" className="hover:text-white transition-colors">
                    Talleres Mecánicos Generales
                  </a>
                </li>
                <li>
                  <a href="#especialidades" className="hover:text-white transition-colors">
                    Centros Llanteros & Suspensión
                  </a>
                </li>
                <li>
                  <a href="#especialidades" className="hover:text-white transition-colors">
                    Especialistas en Frenos & Afinación
                  </a>
                </li>
                <li>
                  <a href="#especialidades" className="hover:text-white transition-colors">
                    Redes Multi-Taller & Flotillas HQ
                  </a>
                </li>
              </ul>
            </div>

            {/* Col 4: Acceso & Enlaces Rápidos */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Plataforma
              </h4>
              <ul className="space-y-2 text-slate-400">
                <li>
                  <Link href="/login" className="hover:text-white transition-colors font-semibold text-[#93C5FD]">
                    Iniciar Sesión (App)
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="hover:text-white transition-colors">
                    Demostración Guiada
                  </Link>
                </li>
                <li>
                  <a
                    href="https://wa.me/528123456789"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors"
                  >
                    Atención a Clientes por WhatsApp
                  </a>
                </li>
                <li>
                  <Link href="/hq" className="hover:text-white transition-colors text-slate-500">
                    Control Plane HQ
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-slate-500 gap-4 text-[11px]">
            <div>
              © 2026 TallerTrack Inc. Todos los derechos reservados.
            </div>
            <div className="flex items-center gap-6">
              <span>Aviso de Privacidad</span>
              <span>Términos de Servicio</span>
              <span>Seguridad RLS y SAT CFDI 4.0</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
