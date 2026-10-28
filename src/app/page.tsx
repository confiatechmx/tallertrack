"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Wrench,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Clock,
  Sparkles,
  Car,
  Smartphone,
  MessageSquare,
  DollarSign,
  Layers,
  Gauge,
  FileText,
  ChevronRight,
  Star,
  Users,
  Menu,
  X,
  ExternalLink,
  BarChart3,
  Sliders,
  Calendar,
  Play,
  Check,
  Truck,
  ArrowUpRight,
} from "lucide-react";
import TallerTrackLogo from "@/components/brand/TallerTrackLogo";

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"kanban" | "dvi" | "caja">("kanban");

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans antialiased selection:bg-blue-100 selection:text-blue-900">
      {/* 1. Top Announcement Bar */}
      <div className="bg-[#0F172A] text-white py-2 px-4 text-xs font-medium border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="bg-blue-600 text-white text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full">
              Nuevo
            </span>
            <span className="text-slate-300">
              Inspecciones Digitales (DVI) con aprobación directa en WhatsApp
            </span>
          </div>
          <Link
            href="/login"
            className="hidden sm:inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
          >
            Ver demo en vivo <ArrowRight size={13} />
          </Link>
        </div>
      </div>

      {/* 2. Main Navigation Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Brand Logo */}
          <Link href="/" className="hover:opacity-95 transition-opacity">
            <TallerTrackLogo size="lg" subtitle="Shop OS" />
          </Link>

          {/* Desktop Nav Items */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
            <a href="#modulos" className="hover:text-blue-600 transition-colors">
              Módulos
            </a>
            <a href="#llanteras" className="hover:text-blue-600 transition-colors">
              Llanteras & Talleres
            </a>
            <a href="#dvi" className="hover:text-blue-600 transition-colors">
              Inspección DVI
            </a>
            <a href="#beneficios" className="hover:text-blue-600 transition-colors">
              Beneficios
            </a>
          </nav>

          {/* Action Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/login"
              className="text-xs font-bold text-slate-700 hover:text-slate-900 px-4 py-2.5 rounded-xl hover:bg-slate-100 transition-colors"
            >
              Iniciar Sesión
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl shadow-xs transition-all hover:shadow-sm"
            >
              Probar Demo Gratis
              <ArrowRight size={14} />
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-700 hover:bg-slate-100 rounded-lg"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-slate-200 px-4 pt-3 pb-6 space-y-3">
            <a
              href="#modulos"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-semibold text-slate-800 py-2"
            >
              Módulos
            </a>
            <a
              href="#llanteras"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-semibold text-slate-800 py-2"
            >
              Llanteras & Talleres
            </a>
            <a
              href="#dvi"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-semibold text-slate-800 py-2"
            >
              Inspección DVI
            </a>
            <a
              href="#beneficios"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-semibold text-slate-800 py-2"
            >
              Beneficios
            </a>
            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
              <Link
                href="/login"
                className="w-full text-center py-2.5 text-sm font-bold text-slate-700 border border-slate-300 rounded-xl"
              >
                Iniciar Sesión
              </Link>
              <Link
                href="/login"
                className="w-full text-center py-2.5 text-sm font-bold bg-blue-600 text-white rounded-xl shadow-xs"
              >
                Probar Demo Gratis
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* 3. Hero Section (Shopmonkey Pattern: Bold Eyebrow, Clear Value Prop, Customer Proof, Live Interactive Mockup) */}
      <section className="relative pt-12 pb-20 lg:pt-20 lg:pb-32 overflow-hidden bg-gradient-to-b from-slate-50/60 via-white to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Content */}
            <div className="lg:col-span-6 space-y-6 lg:pr-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                <span className="w-2 h-2 rounded-full bg-blue-600" />
                SISTEMA OPERATIVO PARA TALLERES Y LLANTERAS
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-extrabold tracking-tight text-slate-900 leading-[1.15] font-heading">
                El software todo en uno para talleres mecánicos y llanteras.
              </h1>

              <p className="text-lg text-slate-600 leading-relaxed font-normal">
                Combina la maestría de tus mecánicos con eficiencia de rampa, órdenes de servicio en tiempo real, inspecciones con fotos por WhatsApp y cero fugas en caja chica.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2.5 bg-blue-600 hover:bg-blue-700 text-white text-base font-bold px-7 py-4 rounded-xl shadow-md transition-all hover:shadow-lg cursor-pointer text-center"
                >
                  <Play size={18} className="fill-current" />
                  Ver Demo Interactiva en Vivo
                </Link>
                <a
                  href="#modulos"
                  className="inline-flex items-center justify-center gap-2 text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 text-base font-semibold px-6 py-4 rounded-xl transition-colors text-center"
                >
                  Explorar Módulos
                </a>
              </div>

              {/* Real Customer Quote inside Hero (Shopmonkey formula) */}
              <div className="pt-6 border-t border-slate-200/90 flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-xs shrink-0 ring-2 ring-blue-600/30">
                  CR
                </div>
                <div>
                  <p className="text-xs text-slate-600 italic leading-relaxed">
                    “Antes perdíamos horas en llamadas y libretas de papel. Con TallerTrack el cliente ve la foto de la balata gastada en WhatsApp y autoriza el presupuesto en minutos.”
                  </p>
                  <p className="text-xs font-bold text-slate-900 mt-1">
                    Ing. Carlos Ramírez{" "}
                    <span className="font-normal text-slate-500">
                      • Director de Operaciones, Cova & Ruta Automotriz
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column: High-Fidelity UI Product Showcase */}
            <div className="lg:col-span-6">
              <div className="relative mx-auto rounded-2xl bg-[#0F172A] p-2.5 sm:p-3 shadow-2xl border border-slate-800">
                {/* Window Chrome Header */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800/80 mb-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-rose-500/80" />
                    <span className="w-3 h-3 rounded-full bg-amber-500/80" />
                    <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                    <span className="ml-3 text-[11px] font-mono text-slate-400">
                      app.tallertrack.com/tablero
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded">
                      4 Rampas Activas
                    </span>
                  </div>
                </div>

                {/* Interactive Mode Tabs */}
                <div className="flex gap-1.5 px-2 mb-3">
                  <button
                    onClick={() => setActiveTab("kanban")}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                      activeTab === "kanban"
                        ? "bg-blue-600 text-white shadow-xs"
                        : "text-slate-400 hover:text-white bg-slate-800/50"
                    }`}
                  >
                    Kanban de Bahías
                  </button>
                  <button
                    onClick={() => setActiveTab("dvi")}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                      activeTab === "dvi"
                        ? "bg-blue-600 text-white shadow-xs"
                        : "text-slate-400 hover:text-white bg-slate-800/50"
                    }`}
                  >
                    Inspección DVI
                  </button>
                  <button
                    onClick={() => setActiveTab("caja")}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                      activeTab === "caja"
                        ? "bg-blue-600 text-white shadow-xs"
                        : "text-slate-400 hover:text-white bg-slate-800/50"
                    }`}
                  >
                    Caja & Refacciones
                  </button>
                </div>

                {/* Tab 1: Live Kanban Mockup */}
                {activeTab === "kanban" && (
                  <div className="bg-[#1E293B] rounded-xl p-3 space-y-2.5 font-sans">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {/* Card 1 */}
                      <div className="bg-[#0F172A] border border-slate-700/80 rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] text-blue-400 font-bold">
                            OT-1042 • Rampa 1
                          </span>
                          <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-bold">
                            En Diagnóstico
                          </span>
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">Nissan Versa 2021</div>
                          <div className="text-[11px] text-slate-400">Placas: NLE-4421</div>
                        </div>
                        <div className="text-[10px] text-slate-300 bg-slate-800/80 p-1.5 rounded border border-slate-700/50">
                          Servicio: Frenos, Rectificado y Balatas
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800">
                          <span className="flex items-center gap-1">
                            <Clock size={11} className="text-amber-400" /> Entrega: 4:30 PM
                          </span>
                          <span className="font-bold text-emerald-400">$2,450 MXN</span>
                        </div>
                      </div>

                      {/* Card 2 */}
                      <div className="bg-[#0F172A] border border-blue-500/40 rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] text-blue-400 font-bold">
                            OT-1045 • Rampa 3
                          </span>
                          <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded font-bold">
                            En Proceso
                          </span>
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">Ford Ranger 2020</div>
                          <div className="text-[11px] text-slate-400">Cliente: Transportes Silva</div>
                        </div>
                        <div className="text-[10px] text-slate-300 bg-slate-800/80 p-1.5 rounded border border-slate-700/50">
                          4 Llantas 265/70R16 + Alineación
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800">
                          <span className="flex items-center gap-1">
                            <Wrench size={11} className="text-blue-400" /> Téc: Daniel H.
                          </span>
                          <span className="font-bold text-emerald-400">$14,800 MXN</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-700/60 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span className="text-slate-300 font-medium text-[11px]">
                          Cotización formal enviada por WhatsApp (aprobada en 4 min)
                        </span>
                      </div>
                      <Link
                        href="/login"
                        className="text-[11px] font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1"
                      >
                        Abrir tablero <ArrowRight size={11} />
                      </Link>
                    </div>
                  </div>
                )}

                {/* Tab 2: DVI Mockup */}
                {activeTab === "dvi" && (
                  <div className="bg-[#1E293B] rounded-xl p-4 text-xs space-y-3 font-sans">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-sm">
                        Expediente Clínico Vehicular • DVI
                      </span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-bold">
                        Semáforo Activo
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                          <span className="text-white font-medium">
                            Balatas Delanteras (Espesor: 1.5mm - Urgente)
                          </span>
                        </div>
                        <span className="text-[10px] text-rose-300 font-bold uppercase">Rojo</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                          <span className="text-white font-medium">
                            Líquido de Frenos (Humedad moderada)
                          </span>
                        </div>
                        <span className="text-[10px] text-amber-300 font-bold uppercase">Amarillo</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                          <span className="text-white font-medium">
                            Suspensión Delantera & Terminales
                          </span>
                        </div>
                        <span className="text-[10px] text-emerald-300 font-bold uppercase">Verde</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 3: POS Mockup */}
                {activeTab === "caja" && (
                  <div className="bg-[#1E293B] rounded-xl p-4 text-xs space-y-3 font-sans">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-sm">
                        Caja Chica & Compra de Refacciones (Buyout)
                      </span>
                      <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded font-bold">
                        AutoZone Conectado
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-slate-300">
                      <div className="bg-[#0F172A] p-2.5 rounded-lg border border-slate-700/60">
                        <div className="text-[10px] text-slate-400">Costo Proveedor</div>
                        <div className="text-base font-bold text-white mt-0.5">$1,200.00 MXN</div>
                      </div>
                      <div className="bg-[#0F172A] p-2.5 rounded-lg border border-slate-700/60">
                        <div className="text-[10px] text-slate-400">Margen Taller (35%)</div>
                        <div className="text-base font-bold text-emerald-400 mt-0.5">$1,620.00 MXN</div>
                      </div>
                    </div>
                    <div className="p-2 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-400">
                      Corte de Turno: Arqueo en ceros • Diferencia $0.00 • 12 transacciones
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Trust / Metrics Bar */}
      <section className="py-12 border-y border-slate-200/90 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl lg:text-4xl font-extrabold text-blue-600 font-heading">
                35%
              </div>
              <div className="text-xs font-semibold text-slate-600 mt-1 uppercase tracking-wider">
                Más margen en partes y buyouts
              </div>
            </div>
            <div>
              <div className="text-3xl lg:text-4xl font-extrabold text-slate-900 font-heading">
                2.4x
              </div>
              <div className="text-xs font-semibold text-slate-600 mt-1 uppercase tracking-wider">
                Rapidez de aprobación en WhatsApp
              </div>
            </div>
            <div>
              <div className="text-3xl lg:text-4xl font-extrabold text-slate-900 font-heading">
                100%
              </div>
              <div className="text-xs font-semibold text-slate-600 mt-1 uppercase tracking-wider">
                Cero papel y órdenes extraviadas
              </div>
            </div>
            <div>
              <div className="text-3xl lg:text-4xl font-extrabold text-blue-600 font-heading">
                &lt; 3 min
              </div>
              <div className="text-xs font-semibold text-slate-600 mt-1 uppercase tracking-wider">
                Recepción Express de Vehículo en Patio
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Switchback 1: Flujo Operativo y Bahías (Shop Management) */}
      <section id="modulos" className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 space-y-6">
              <div className="text-xs font-bold uppercase tracking-widest text-blue-600">
                FLUJO OPERATIVO Y RAMPAS
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight font-heading leading-tight">
                Organiza el caos del taller. Visualiza cada rampa en tiempo real.
              </h2>
              <p className="text-base text-slate-600 leading-relaxed">
                Despídete de las pizarras de plumón y carpetas con grasa. El Kanban de TallerTrack te permite mover autos entre estados con drag & drop, asignar mecánicos y saber exactamente cuánto tiempo lleva cada vehículo en rampa.
              </p>

              <div className="space-y-3.5 pt-2">
                {[
                  {
                    title: "Asignación de Bahía y Mecánico",
                    desc: "Sabe quién está trabajando en qué rampa y calcula comisiones por mano de obra automáticamente.",
                  },
                  {
                    title: "Alertas de Tiempos Muertos",
                    desc: "Identifica cuellos de botella cuando un auto espera refacciones o autorización del cliente.",
                  },
                  {
                    title: "Dirty Hands UX (Móvil PWA)",
                    desc: "Interfaz pensada para que los técnicos operen desde su celular en el foso con botones gigantes.",
                  },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Check size={13} strokeWidth={3} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{item.title}</h4>
                      <p className="text-xs text-slate-600 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <span className="text-xs font-bold text-slate-800">
                    Tablero de Producción en Vivo
                  </span>
                  <span className="text-xs text-slate-500 font-mono">Turno Matutino</span>
                </div>
                <div className="space-y-3">
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-900">Chevrolet Cheyenne 2021</span>
                      <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold">
                        En Rampa
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">
                      Mecánico: Roberto Morales • Tiempo: 1h 20m / 2h est.
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-blue-600 h-2 w-[65%]" />
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-900">Honda CR-V 2019</span>
                      <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-[10px] font-bold">
                        Esperando Refacciones
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">
                      AutoZone Buyout: 2 Baleros Mazas en camino
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Switchback 2: Inspección Digital DVI y WhatsApp */}
      <section id="dvi" className="py-20 lg:py-28 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 order-2 lg:order-1">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <MessageSquare size={16} className="text-emerald-500" />
                  <span className="text-xs font-bold text-slate-900">
                    Notificación Automática por WhatsApp
                  </span>
                </div>
                <div className="bg-emerald-50 border border-emerald-200/80 rounded-xl p-3.5 text-xs text-slate-800 space-y-2">
                  <p className="font-semibold text-emerald-900">
                    Hola Luis, tu vehículo Toyota Hilux está en revisión en TallerTrack.
                  </p>
                  <p className="text-slate-700">
                    Encontramos 1 reparación prioritaria (Balatas gastadas). Puedes ver las fotos de la inspección y autorizar el presupuesto en línea aquí:
                  </p>
                  <div className="bg-white p-2 rounded-lg border border-emerald-200 font-mono text-[11px] text-blue-600 font-bold">
                    https://tallertrack.com/orden/ord_9941a
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
                  <span>Aprobado por el cliente en 1 Clic</span>
                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                    <CheckCircle2 size={14} /> Autorizado
                  </span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 order-1 lg:order-2 space-y-6">
              <div className="text-xs font-bold uppercase tracking-widest text-emerald-600">
                INSPECCIÓN DIGITAL & WHATSAPP
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight font-heading leading-tight">
                Transparencia total que duplica las aprobaciones de presupuesto.
              </h2>
              <p className="text-base text-slate-600 leading-relaxed">
                Cuando el cliente ve la foto de la fuga o del amortiguador dañado con semáforo de gravedad en su teléfono, autoriza la reparación sin titubeos. Cero discusiones de *"ustedes le rompieron eso"*.
              </p>

              <div className="space-y-3.5 pt-2">
                {[
                  {
                    title: "Checklist de Recepción Digital con Fotos",
                    desc: "Registra daños previos, nivel de gasolina, kilometraje y rayones al recibir el auto en patio.",
                  },
                  {
                    title: "Portal Público del Cliente (/orden/[id])",
                    desc: "Una experiencia digna de agencia automotriz con desglose claro de mano de obra y refacciones.",
                  },
                  {
                    title: "Trabajos Diferidos (Próxima Visita)",
                    desc: "Guarda las reparaciones no urgentes y programa recordatorios automáticos de mantenimiento.",
                  },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Check size={13} strokeWidth={3} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{item.title}</h4>
                      <p className="text-xs text-slate-600 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Switchback 3: Caja Chica y Refacciones (Shop POS) */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 space-y-6">
              <div className="text-xs font-bold uppercase tracking-widest text-indigo-600">
                PUNTO DE VENTA Y CAJA CHICA
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight font-heading leading-tight">
                Cero fugas de dinero en caja y control estricto de refacciones.
              </h2>
              <p className="text-base text-slate-600 leading-relaxed">
                Controla cada peso que entra y sale de tu taller. Gestiona compras de refacciones sobre pedido (buyouts en AutoZone o refaccionarias locales), apertura y cierre de turnos con arqueo y pagos multi-método.
              </p>

              <div className="space-y-3.5 pt-2">
                {[
                  {
                    title: "Control de Turnos de Caja Chica",
                    desc: "Apertura con fondo fijo, registro de salidas por gastos menores y arqueo ciego al final del día.",
                  },
                  {
                    title: "Calculadora de Margen de Refacciones",
                    desc: "Aplica tu recargo comercial exacto sobre las piezas externas para garantizar rentabilidad en cada orden.",
                  },
                  {
                    title: "Cobros Divididos (Split Payments)",
                    desc: "Acepta parte en efectivo, parte con tarjeta y anticipos registrados con recibo formal.",
                  },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Check size={13} strokeWidth={3} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{item.title}</h4>
                      <p className="text-xs text-slate-600 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <span className="text-xs font-bold text-slate-800">
                    Cierre y Arqueo de Turno
                  </span>
                  <span className="text-xs text-emerald-600 font-bold">Cuadrado $0.00</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <div className="text-slate-500 text-[10px]">Efectivo Esperado</div>
                    <div className="text-lg font-bold text-slate-900 mt-0.5">$6,450.00</div>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <div className="text-slate-500 text-[10px]">Terminal / Tarjetas</div>
                    <div className="text-lg font-bold text-slate-900 mt-0.5">$18,220.00</div>
                  </div>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs space-y-1.5">
                  <div className="flex justify-between text-slate-600">
                    <span>Fondo Inicial:</span>
                    <span className="font-medium">$1,000.00</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Gastos Menores (Tornillería):</span>
                    <span className="font-medium text-rose-600">-$250.00</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900 pt-1.5 border-t border-slate-100">
                    <span>Total Depositado en Banco:</span>
                    <span>$24,420.00</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. "Pick Your Lane" (Adapted from Shopmonkey Shop Types) */}
      <section id="llanteras" className="py-20 lg:py-28 bg-[#0F172A] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
            <div className="text-xs font-bold uppercase tracking-widest text-blue-400">
              ADAPTADO A TU NEGOCIO
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-heading">
              Hecho para cada tipo de taller y centro de servicio.
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Ya sea que operes una sola rampa o una red multi-sucursal con flotillas.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card 1 */}
            <div className="p-8 rounded-2xl bg-slate-800/60 border border-slate-700/80 hover:border-blue-500/50 transition-colors space-y-4">
              <div className="w-12 h-12 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
                <Wrench size={22} />
              </div>
              <h3 className="text-xl font-bold font-heading">Talleres Mecánicos</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Control de afinaciones, diagnósticos de motor, frenos, transmisiones y suspensiones. Seguimiento de órdenes con Kanban y liquidación de destajo a mecánicos.
              </p>
              <ul className="text-xs text-slate-300 space-y-2 pt-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-400" /> Presupuestos detallados
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-400" /> Historial clínico de vehículo
                </li>
              </ul>
            </div>

            {/* Card 2 */}
            <div className="p-8 rounded-2xl bg-slate-800/60 border border-blue-500/50 relative shadow-lg space-y-4">
              <div className="absolute top-0 right-0 bg-blue-600 text-white text-[9px] font-bold uppercase tracking-wider px-3 py-1 rounded-bl-xl">
                Muy Popular
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                <Gauge size={22} />
              </div>
              <h3 className="text-xl font-bold font-heading">Llanteras & Servicios</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Diseñado para llanteras que hacen alineación, balanceo, montaje y suspensión. Catálogo de medidas de llanta y venta cruzada con amortiguadores.
              </p>
              <ul className="text-xs text-slate-300 space-y-2 pt-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-400" /> Inspección de suspensión DVI
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-400" /> Rotación rápida en rampa
                </li>
              </ul>
            </div>

            {/* Card 3 */}
            <div className="p-8 rounded-2xl bg-slate-800/60 border border-slate-700/80 hover:border-blue-500/50 transition-colors space-y-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
                <Layers size={22} />
              </div>
              <h3 className="text-xl font-bold font-heading">Cadenas & Multi-Sucursal</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Administración centralizada desde el Control Plane HQ. Comparativa de facturación entre sucursales, auditoría de usuarios y dominios propios.
              </p>
              <ul className="text-xs text-slate-300 space-y-2 pt-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-400" /> Aislamiento de datos (RLS)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-400" /> Marca Blanca & Dominios CNAME
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 9. Final CTA Conversion Panel (Shopmonkey conversion panel style) */}
      <section className="py-20 bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/10 text-white border border-white/20">
            DEMO GRATUITA SIN COMPROMISO
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight font-heading leading-tight max-w-3xl mx-auto">
            Lleva la operación de tu taller al siguiente nivel hoy mismo.
          </h2>

          <p className="text-base sm:text-lg text-blue-100 max-w-2xl mx-auto leading-relaxed">
            Sin instalaciones complicadas. Funciona desde tu navegador o en el celular de tus mecánicos como una App PWA instantánea.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white text-blue-900 hover:bg-slate-100 text-base font-extrabold px-8 py-4 rounded-xl shadow-lg transition-all hover:scale-[1.02] cursor-pointer"
            >
              <Play size={18} className="fill-current text-blue-600" />
              Entrar a la Demo Interactiva
            </Link>
            <a
              href="https://wa.me/528123456789?text=Hola%20TallerTrack,%20quisiera%20agendar%20una%20demostraci%C3%B3n"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-blue-900/60 hover:bg-blue-900 text-white text-base font-semibold px-7 py-4 rounded-xl border border-white/20 transition-colors"
            >
              Hablar con un Asesor por WhatsApp
              <ExternalLink size={15} />
            </a>
          </div>
        </div>
      </section>

      {/* 10. Institutional Footer */}
      <footer className="bg-[#0B1120] text-slate-400 py-16 border-t border-slate-800 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-12 border-b border-slate-800/80">
            {/* Col 1 */}
            <div className="space-y-4 md:col-span-1">
              <TallerTrackLogo variant="dark" size="md" subtitle="Shop OS" />
              <p className="text-xs text-slate-500 leading-relaxed">
                Sistema operativo B2B para talleres automotrices, llanteras y centros de servicio en México y Latinoamérica.
              </p>
              <div className="text-[11px] text-slate-500">
                Monterrey, N.L. • México
              </div>
            </div>

            {/* Col 2 */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Módulos de Taller
              </h4>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#modulos" className="hover:text-white transition-colors">Tablero Kanban de Bahías</a></li>
                <li><a href="#dvi" className="hover:text-white transition-colors">Inspección Digital (DVI)</a></li>
                <li><a href="#modulos" className="hover:text-white transition-colors">Calculadora de Refacciones</a></li>
                <li><a href="#modulos" className="hover:text-white transition-colors">Caja Chica y Pagos Split</a></li>
              </ul>
            </div>

            {/* Col 3 */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Segmentos
              </h4>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#llanteras" className="hover:text-white transition-colors">Talleres Mecánicos</a></li>
                <li><a href="#llanteras" className="hover:text-white transition-colors">Centros Llanteros</a></li>
                <li><a href="#llanteras" className="hover:text-white transition-colors">Frenos y Suspensión</a></li>
                <li><a href="#llanteras" className="hover:text-white transition-colors">Redes Multi-Sucursal</a></li>
              </ul>
            </div>

            {/* Col 4 */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Acceso & Soporte
              </h4>
              <ul className="space-y-2 text-slate-400">
                <li><Link href="/login" className="hover:text-white transition-colors font-semibold text-blue-400">Iniciar Sesión (App)</Link></li>
                <li><Link href="/login" className="hover:text-white transition-colors">Entorno Demo Precargado</Link></li>
                <li><a href="https://wa.me/528123456789" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Soporte Técnico WhatsApp</a></li>
                <li><Link href="/hq" className="hover:text-white transition-colors text-slate-600">Control Plane HQ</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-slate-500 gap-4">
            <div>
              © 2026 TallerTrack Inc. Todos los derechos reservados.
            </div>
            <div className="flex items-center gap-6">
              <span>Aviso de Privacidad</span>
              <span>Términos de Servicio</span>
              <span>Seguridad RLS</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
