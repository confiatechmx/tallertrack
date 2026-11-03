"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Kanban,
  Package2,
  Contact,
  Wrench,
  Settings,
  LayoutDashboard,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Plus,
  Target,
  MessageSquare,
  Receipt,
  ShieldCheck,
  ShieldAlert,
  Building2,
} from "lucide-react";
import { useTenant } from "@/context/TenantContext";
import TenantBrandLogo from "@/components/brand/TenantBrandLogo";

export function Sidebar() {
  const pathname = usePathname();
  const { empresa, isSuperAdmin } = useTenant();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [iconError, setIconError] = useState(false);
  const iconProps = { strokeWidth: 1.85, size: 18 };

  // 1. Operación Diaria (Workflow Central)
  const operationItems = [
    { href: "/tablero", label: "Tablero", icon: Kanban },
    { href: "/caja", label: "Caja POS", icon: Receipt },
    { href: "/clientes", label: "Clientes", icon: Contact },
    { href: "/resumen", label: "Resumen", icon: LayoutDashboard },
  ];

  // 2. Catálogos, Stock & CRM
  const catalogAndStockItems = [
    { href: "/inventario", label: "Inventario", icon: Package2 },
    { href: "/servicios", label: "Servicios", icon: Wrench },
    { href: "/proveedores", label: "Proveedores", icon: Building2 },
    { href: "/ventas", label: "Ventas & CRM", icon: Target },
    { href: "/mensajes", label: "WhatsApp", icon: MessageSquare },
  ];

  // 3. Análisis & Sistema
  const systemItems = [
    { href: "/reportes", label: "Reportes", icon: TrendingUp },
    { href: "/auditoria", label: "Bitácora", icon: ShieldAlert },
    { href: "/configuracion", label: "Configuración", icon: Settings },
    ...(isSuperAdmin ? [{ href: "/hq", label: "Control HQ", icon: ShieldCheck }] : []),
  ];

  const brandName = empresa?.nombre_comercial || "Cova";
  const isCova =
    brandName.toLowerCase().includes("cova") ||
    empresa?.subdominio === "cova" ||
    empresa?.id === "b2ad09db-0a34-4876-9ca3-d584c40bd294" ||
    (typeof window !== "undefined" && window.location.hostname.toLowerCase().includes("cova"));

  useEffect(() => {
    setLogoError(false);
    setIconError(false);
  }, [empresa?.id, empresa?.logo_url_dark, empresa?.logo_url, brandName]);

  const covaFallbackLogo = "/branding/cova/cova-logo-dark-trimmed.png";
  const covaFallbackIcon = "/branding/cova/cova-isotipo.png";

  const brandLogoUrl = !logoError
    ? (empresa?.logo_url_dark || empresa?.logo_url || (isCova ? covaFallbackLogo : "/brand/tallertrack-logo-horizontal-dark.png"))
    : (isCova ? covaFallbackLogo : "/brand/tallertrack-logo-horizontal-dark.png");
  const brandIconUrl = !iconError
    ? (empresa?.isotipo_url || (isCova ? covaFallbackIcon : "/favicon.svg"))
    : (isCova ? covaFallbackIcon : "/favicon.svg");

  return (
    <>
      {/* Desktop & Tablet Sidebar */}
      <aside
        style={{ backgroundColor: empresa?.color_sidebar || "#0F172A" }}
        className={`hidden md:flex flex-col h-screen sticky top-0 border-r border-slate-800/80 transition-all duration-200 relative z-40 select-none ${
          isCollapsed ? "w-[64px]" : "w-[230px]"
        }`}
      >
        {/* Collapse Toggle */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? "Expandir barra lateral" : "Contraer barra lateral"}
          className="absolute -right-3 top-5 bg-slate-900 border border-slate-700 text-slate-400 hover:text-white rounded-full p-1 z-50 transition-colors shadow-md cursor-pointer"
        >
          {isCollapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </button>

        {/* Brand Header: Identidad visible y limpia de la empresa (Estilo Cargatek / Hack Trucking) */}
        <div
          className={`border-b border-white/10 relative transition-all shrink-0 flex items-center justify-center ${
            isCollapsed ? "h-16 px-2" : "min-h-[72px] py-3.5 px-4"
          }`}
        >
          <Link
            href="/tablero"
            className="flex items-center justify-center w-full focus:outline-none group"
            title={brandName}
          >
            {!isCollapsed ? (
              <img
                src={brandLogoUrl}
                alt={brandName}
                onError={() => setLogoError(true)}
                className="h-12 sm:h-14 w-auto max-w-[195px] max-h-[56px] object-contain transition-transform group-hover:scale-102"
              />
            ) : (
              <img
                src={brandIconUrl}
                alt={brandName}
                onError={() => setIconError(true)}
                className="w-8 h-8 rounded-lg object-contain transition-transform group-hover:scale-105"
              />
            )}
          </Link>
        </div>

        {/* Botón de Acción Primaria Rápida (+ Nueva Orden) */}
        <div className="px-3 pt-3.5 pb-1 shrink-0">
          <Link
            href="/tablero?nuevaOrden=1"
            style={{ backgroundColor: empresa?.color_primario || "#2563EB" }}
            className={`flex items-center justify-center gap-2 text-white font-bold text-xs rounded-xl py-2.5 px-3 shadow-sm hover:opacity-95 active:scale-98 transition-all cursor-pointer ${
              isCollapsed ? "px-0" : ""
            }`}
            title="Crear Nueva Orden de Servicio"
          >
            <Plus size={15} strokeWidth={2.5} className="shrink-0" />
            {!isCollapsed && <span>Nueva Orden</span>}
          </Link>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto py-3 px-2.5 no-scrollbar flex flex-col gap-3.5">
          {/* Grupo 1: Operación */}
          <div className="flex flex-col gap-0.5">
            {!isCollapsed && (
              <p className="px-2.5 text-[10px] font-bold text-slate-400/70 uppercase tracking-wider mb-1">
                Operación
              </p>
            )}
            {operationItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={isCollapsed ? item.label : undefined}
                  className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs transition-all relative group ${
                    isActive
                      ? "bg-white/12 text-white font-bold shadow-2xs"
                      : "text-slate-300/80 hover:text-white hover:bg-white/6 font-medium"
                  }`}
                >
                  {isActive && (
                    <span
                      style={{ backgroundColor: empresa?.color_primario || "#2563EB" }}
                      className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r"
                    />
                  )}
                  <Icon
                    {...iconProps}
                    className={`shrink-0 ${isActive ? "text-white" : "text-slate-400 group-hover:text-white"}`}
                  />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}
          </div>

          {/* Grupo 2: Catálogos & Stock */}
          <div className="flex flex-col gap-0.5">
            {!isCollapsed && (
              <p className="px-2.5 text-[10px] font-bold text-slate-400/70 uppercase tracking-wider mb-1">
                Catálogos & Stock
              </p>
            )}
            {catalogAndStockItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={isCollapsed ? item.label : undefined}
                  className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs transition-all relative group ${
                    isActive
                      ? "bg-white/12 text-white font-bold shadow-2xs"
                      : "text-slate-300/80 hover:text-white hover:bg-white/6 font-medium"
                  }`}
                >
                  {isActive && (
                    <span
                      style={{ backgroundColor: empresa?.color_primario || "#2563EB" }}
                      className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r"
                    />
                  )}
                  <Icon
                    {...iconProps}
                    className={`shrink-0 ${isActive ? "text-white" : "text-slate-400 group-hover:text-white"}`}
                  />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}
          </div>

          {/* Grupo 3: Análisis & Sistema */}
          <div className="flex flex-col gap-0.5">
            {!isCollapsed && (
              <p className="px-2.5 text-[10px] font-bold text-slate-400/70 uppercase tracking-wider mb-1">
                Análisis & Ajustes
              </p>
            )}
            {systemItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              const isHq = item.href === "/hq";
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={isCollapsed ? item.label : undefined}
                  className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs transition-all relative group ${
                    isActive
                      ? isHq
                        ? "bg-blue-600/30 text-white font-bold border border-blue-500/40"
                        : "bg-white/12 text-white font-bold shadow-2xs"
                      : isHq
                      ? "text-blue-300/90 hover:text-white hover:bg-white/6 font-medium"
                      : "text-slate-300/80 hover:text-white hover:bg-white/6 font-medium"
                  }`}
                >
                  {isActive && !isHq && (
                    <span
                      style={{ backgroundColor: empresa?.color_primario || "#2563EB" }}
                      className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r"
                    />
                  )}
                  <Icon
                    {...iconProps}
                    className={`shrink-0 ${
                      isActive
                        ? "text-white"
                        : isHq
                        ? "text-blue-400 group-hover:text-white"
                        : "text-slate-400 group-hover:text-white"
                    }`}
                  />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}
          </div>
        </nav>
      </aside>

      {/* Barra Inferior Móvil para Smartphones */}
      <div
        style={{ backgroundColor: empresa?.color_sidebar || "#0F172A" }}
        className="md:hidden fixed bottom-0 left-0 w-full h-15 flex items-center justify-between px-2 z-50 border-t border-white/10 pb-[env(safe-area-inset-bottom)] shadow-xl select-none print:hidden"
      >
        <div className="flex flex-row w-full justify-around items-center">
          {[
            { href: "/tablero", label: "Tablero", icon: Kanban },
            { href: "/caja", label: "Caja POS", icon: Receipt },
            { href: "/clientes", label: "Clientes", icon: Contact },
            { href: "/resumen", label: "Resumen", icon: LayoutDashboard },
          ].map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href || pathname.startsWith(item.href + "/");

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-colors ${
                  isActive ? "text-sky-400 font-bold" : "text-slate-400 hover:text-white"
                }`}
              >
                <Icon size={19} strokeWidth={isActive ? 2.3 : 1.8} />
                <span className="text-[10px] mt-0.5">{item.label}</span>
              </Link>
            );
          })}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="flex flex-col items-center justify-center py-1 px-2 rounded-xl text-slate-400 hover:text-white cursor-pointer"
          >
            <Menu size={19} />
            <span className="text-[10px] mt-0.5">Más</span>
          </button>
        </div>
      </div>

      {/* Drawer Móvil con Menú Completo */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[100] flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="bg-white w-full rounded-t-2xl p-5 relative max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <TenantBrandLogo empresa={empresa} size="sm" variant="light" />
                <div>
                  <h2 className="text-sm font-bold text-slate-900">{brandName}</h2>
                  <p className="text-xs text-slate-500">Módulos del Sistema</p>
                </div>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 bg-slate-100 rounded-lg text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                ...operationItems,
                ...catalogAndStockItems,
                ...systemItems,
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-800 hover:border-slate-300 transition-colors"
                >
                  <item.icon size={16} className="text-slate-600 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
