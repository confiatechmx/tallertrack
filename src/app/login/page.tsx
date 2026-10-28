import Link from "next/link";
import { headers } from "next/headers";
import { login, loginDemo } from "./actions";
import {
  ArrowLeft,
  CheckCircle2,
  Play,
  Wrench,
  ShieldCheck,
  Building2,
  Lock,
} from "lucide-react";
import TallerTrackLogo from "@/components/brand/TallerTrackLogo";
import TenantBrandLogo from "@/components/brand/TenantBrandLogo";
import { resolveTenantServer } from "@/lib/tenantServer";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; test_domain?: string; subdomain?: string }>;
}) {
  const resolvedParams = await searchParams;
  const headersList = await headers();
  const host = headersList.get("host") || "";
  const tenant = await resolveTenantServer(host, resolvedParams);

  const primaryColor = tenant?.empresa?.color_primario || "#2563EB";
  const brandName = tenant?.empresa?.nombre_comercial || "TallerTrack";

  return (
    <div className="min-h-screen w-full bg-[#0F172A] flex flex-col lg:flex-row">
      {/* Left Column: High-End Brand & Operations Showcase */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 lg:p-16 border-r border-slate-800 bg-gradient-to-b from-slate-900 via-[#0B132B] to-[#0A0F1D] text-white relative overflow-hidden">
        {/* Subtle background ambient grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

        <div className="relative z-10 flex items-center justify-between">
          {tenant ? (
            <div className="flex items-center gap-3">
              <TenantBrandLogo
                empresa={tenant.empresa}
                size="lg"
                variant="dark"
                layout="horizontal"
                showText={true}
              />
            </div>
          ) : (
            <TallerTrackLogo variant="dark" size="lg" />
          )}

          {tenant ? (
            <a
              href="https://tallertrack.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 px-3 py-1.5 rounded-lg"
            >
              TallerTrack Platform
            </a>
          ) : (
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 px-3 py-1.5 rounded-lg"
            >
              <ArrowLeft size={14} /> Volver al sitio web
            </Link>
          )}
        </div>

        <div className="relative z-10 max-w-lg space-y-8 my-auto py-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            {tenant ? `Portal Dedicado • ${brandName}` : "Control Integral de Taller y Llantera"}
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight font-heading">
            {tenant
              ? `Centro de mando operativo de ${brandName}.`
              : "El sistema operativo para talleres mecánicos y llanteras de alto rendimiento."}
          </h1>

          <p className="text-sm text-slate-300 leading-relaxed font-normal">
            {tenant
              ? tenant.empresa?.eslogan ||
                "Control integral de órdenes de servicio, recepción vehicular con evidencia fotográfica (DVI), inventario de neumáticos y cortes de caja."
              : "Controla tus bahías en tiempo real, envía inspecciones digitales (DVI) por WhatsApp con aprobación en 1 clic, calcula márgenes de refacciones y liquida comisiones de mecánicos con total transparencia."}
          </p>

          {/* Operational Metrics */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-800/80">
            <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/40">
              <div
                className="text-2xl font-extrabold font-heading"
                style={{ color: primaryColor }}
              >
                100%
              </div>
              <div className="text-xs text-slate-400 mt-1 font-medium">Digital sin papel</div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/40">
              <div className="text-2xl font-extrabold text-emerald-400 font-heading">En Vivo</div>
              <div className="text-xs text-slate-400 mt-1 font-medium">Estatus de bahías</div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/40">
              <div className="text-2xl font-extrabold text-indigo-400 font-heading">WhatsApp</div>
              <div className="text-xs text-slate-400 mt-1 font-medium">Aprobación en 1 clic</div>
            </div>
          </div>

          {/* Checklist bullets */}
          <div className="space-y-2.5 pt-2">
            {[
              "Tablero Kanban dinámico con tiempos de rampa y estatus por bahía",
              "Checklist de recepción digital (DVI) y Portal del Cliente (/orden/[id])",
              "Corte de Caja Chica blindado y comisiones transparentes por técnico",
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-2.5 text-xs text-slate-300">
                <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-xs text-slate-500 border-t border-slate-800/80 pt-6">
          <span className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-500" />
            {tenant ? `Aislamiento Multi-Tenant • ${tenant.domain}` : "Aislamiento de Datos Multi-Tenant (RLS)"}
          </span>
          <span>Monterrey, N.L. • México</span>
        </div>
      </div>

      {/* Right Column: Clean Login & Instant Access */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 bg-[#F8FAFC]">
        {/* Mobile Header */}
        <div className="w-full max-w-md lg:hidden flex items-center justify-between mb-8">
          {tenant ? (
            <TenantBrandLogo
              empresa={tenant.empresa}
              size="md"
              variant="light"
              layout="horizontal"
              showText={true}
            />
          ) : (
            <TallerTrackLogo variant="light" size="md" />
          )}

          {!tenant && (
            <Link
              href="/"
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1"
            >
              <ArrowLeft size={14} /> Inicio
            </Link>
          )}
        </div>

        <div className="w-full max-w-md space-y-6">
          {/* Header */}
          <div className="space-y-1.5">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 font-heading">
              Iniciar Sesión
            </h2>
            <p className="text-xs text-slate-500">
              {tenant
                ? `Ingresa con tus credenciales asignadas para ${brandName}.`
                : "Ingresa al centro de mando operativo de tu taller o llantera."}
            </p>
          </div>

          {/* 1-Click Instant Demo Card (ONLY shown on generic TallerTrack platform, NOT on tenant subdomains) */}
          {!tenant && (
            <>
              <div className="bg-white border-2 border-blue-600/90 rounded-2xl p-5 shadow-sm space-y-3 relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-blue-600 text-white text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-bl-lg">
                  Recomendado
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-blue-700 uppercase tracking-wider mb-1">
                    <Wrench size={13} /> Entorno Demo Interactivo
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Explora el sistema con datos precargados: órdenes activas, inventario de llantas, inspecciones DVI y corte de caja.
                  </p>
                </div>

                <form action={loginDemo}>
                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl px-4 py-2.5 text-xs transition-colors shadow-sm cursor-pointer"
                  >
                    <Play size={14} className="fill-current" />
                    Acceder a Demo en Vivo (1 Clic)
                  </button>
                </form>
              </div>

              <div className="relative flex items-center py-1">
                <div className="flex-grow border-t border-slate-200" />
                <span className="shrink-0 px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  o con tus credenciales
                </span>
                <div className="flex-grow border-t border-slate-200" />
              </div>
            </>
          )}

          {/* Credentials Form */}
          <form className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200/90 space-y-4">
            {resolvedParams?.test_domain && (
              <input
                type="hidden"
                name="test_domain"
                value={resolvedParams.test_domain}
              />
            )}

            <div>
              <label
                className="block text-xs font-semibold text-slate-700 mb-1.5"
                htmlFor="email"
              >
                Correo Electrónico
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder={tenant ? `usuario@${tenant.empresa?.subdominio || 'taller'}.com` : "tu-correo@taller.com"}
                autoComplete="email"
                required
                className="border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 rounded-xl bg-white text-xs p-3 w-full transition-all text-slate-900 outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  className="block text-xs font-semibold text-slate-700"
                  htmlFor="password"
                >
                  Contraseña
                </label>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                required
                className="border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 rounded-xl bg-white text-xs p-3 w-full transition-all text-slate-900 outline-none"
              />
            </div>

            <button
              formAction={login}
              style={tenant ? { backgroundColor: primaryColor } : undefined}
              className={`w-full ${
                tenant ? "hover:opacity-95" : "bg-slate-900 hover:bg-slate-800"
              } text-white rounded-xl px-4 py-2.5 text-xs font-semibold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2`}
            >
              <Lock size={13} />
              {tenant ? `Ingresar a ${brandName}` : "Iniciar Sesión"}
            </button>

            {resolvedParams?.message && (
              <p className="p-3 bg-red-50 text-red-700 text-center text-xs font-medium rounded-xl border border-red-200">
                {resolvedParams.message}
              </p>
            )}
          </form>

          {/* Footer note */}
          <div className="text-center text-xs text-slate-400">
            {tenant ? (
              <span>
                Acceso restringido a personal de{" "}
                <strong className="text-slate-600">{brandName}</strong>. En caso de dudas, contacta a tu administrador.
              </span>
            ) : (
              <span>
                ¿Necesitas ayuda para implementar TallerTrack en tu taller?{" "}
                <a
                  href="https://wa.me/528123456789?text=Hola%20TallerTrack,%20me%20gustar%C3%ADa%20informaci%C3%B3n"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline font-semibold"
                >
                  Contactar a soporte por WhatsApp
                </a>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
