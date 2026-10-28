const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'app', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Update Section padding and container
const oldHeroLeft = `      {/* 3. Hero Section (Shopmonkey Editorial Pattern) */}
      <section className="relative pt-12 pb-20 lg:pt-16 lg:pb-28 overflow-hidden bg-white border-b border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-10 items-center">
            {/* Left Content */}
            <div className="lg:col-span-6 space-y-6">
              {/* Eyebrow Kicker */}
              <div className="inline-flex items-center gap-2">
                <span className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#1C3EFF]">
                  SOFTWARE DE GESTIÓN PARA TALLERES Y LLANTERAS
                </span>
              </div>

              {/* Display Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-[52px] font-extrabold tracking-tight text-[#1D2030] leading-[1.12]">
                El software todo en uno para hacer crecer tu taller mecánico.
              </h1>

              {/* Subtitle */}
              <p className="text-base sm:text-lg text-[#475569] leading-relaxed max-w-xl font-normal">
                Combina la maestría técnica de tu equipo con la máxima eficiencia operativa y rentabilidad comercial. Diseñado para el ritmo real del taller.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-1">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 bg-[#1C3EFF] hover:bg-[#1532D4] text-white text-sm font-bold px-6 py-3.5 rounded-md shadow-xs transition-all text-center"
                >
                  Solicitar Demostración
                  <ArrowRight size={15} />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 bg-white hover:bg-[#F8FAFC] text-[#1D2030] border border-[#CBD5E1] text-sm font-semibold px-5 py-3.5 rounded-md transition-colors text-center"
                >
                  <Play size={14} className="text-[#1C3EFF] fill-[#1C3EFF]" />
                  Ver Demostración en Vivo
                </Link>
              </div>

              {/* Direct Micro-Quote Proof (Shopmonkey Blueprint) */}
              <div className="pt-6 border-t border-[#E2E8F0] flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-md bg-[#1D2030] text-white font-bold flex items-center justify-center text-xs shrink-0 font-mono">
                  RC
                </div>
                <div className="space-y-1">
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
            </div>`;

const newHeroLeft = `      {/* 3. Hero Section (Shopmonkey Editorial Pattern) */}
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
            </div>`;

// Normalize CRLF to LF for reliable matching
const normalize = str => str.replace(/\r\n/g, '\n');
content = normalize(content);

if (content.includes(normalize(oldHeroLeft))) {
  content = content.replace(normalize(oldHeroLeft), normalize(newHeroLeft));
  console.log('Successfully updated Hero Left Content!');
} else {
  console.warn('Could not match oldHeroLeft directly, checking partial replacement...');
}

// 2. Update Right Column Product Mockup (Rich Multi-Column Kanban + Floating Badge)
const oldRightCol = `            {/* Right Column: Realistic Product Window (Software Chrome) */}
            <div className="lg:col-span-6">
              <div className="rounded-lg bg-[#0F172A] p-2.5 sm:p-3 shadow-xl border border-slate-800">
                {/* Desktop Window Title Bar */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800 mb-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                    <span className="ml-3 text-[11px] font-mono text-slate-400">
                      tallertrack.app/valle-oriente/tablero
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded">
                      4 Bahías Ocupadas
                    </span>
                  </div>
                </div>`;

const newRightCol = `            {/* Right Column: Realistic Product Window (Software Chrome) */}
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
                </div>`;

if (content.includes(normalize(oldRightCol))) {
  content = content.replace(normalize(oldRightCol), normalize(newRightCol));
  console.log('Successfully updated Right Column Header & Floating Badge!');
}

// 3. Update Kanban Tab inside product window to 3 dense columns
const oldKanbanContent = `                {/* View 1: Workflow Kanban Mockup */}
                {activeTab === "kanban" && (
                  <div className="bg-[#1E293B] rounded-md p-3 space-y-3 font-sans">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {/* Card 1: Mazda CX-5 */}
                      <div className="bg-[#0B132B] border border-slate-700/80 rounded-md p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] text-[#93C5FD] font-bold">
                            OT-1042 • Bahía 1 (Elevador 4T)
                          </span>
                          <span className="text-[9px] bg-amber-500/20 text-amber-300 font-bold px-1.5 py-0.5 rounded">
                            En Proceso
                          </span>
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white flex items-center justify-between">
                            <span>Mazda CX-5 2021</span>
                            <span className="font-mono text-[10px] text-slate-400">[NLS-482-B]</span>
                          </div>
                          <div className="text-[11px] text-slate-300 mt-0.5">
                            Afinación Mayor + Balatas Akebono + Rectificado
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-800">
                          <span className="flex items-center gap-1 font-medium">
                            <Clock size={11} className="text-amber-400" /> Téc: Manuel Vega
                          </span>
                          <span className="font-mono font-bold text-emerald-400">$4,850 MXN</span>
                        </div>
                      </div>

                      {/* Card 2: Ford Lobo F-150 */}
                      <div className="bg-[#0B132B] border border-[#1C3EFF]/40 rounded-md p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] text-[#93C5FD] font-bold">
                            OT-1043 • Bahía 2 (Alineadora 3D)
                          </span>
                          <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.5 rounded">
                            Listo para Entrega
                          </span>
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white flex items-center justify-between">
                            <span>Ford Lobo F-150 2022</span>
                            <span className="font-mono text-[10px] text-slate-400">[PYK-819-C]</span>
                          </div>
                          <div className="text-[11px] text-slate-300 mt-0.5">
                            4x Michelin 265/70R17 + Balanceo + Alineación Láser
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-800">
                          <span className="flex items-center gap-1 font-medium">
                            <Wrench size={11} className="text-[#93C5FD]" /> Téc: Héctor Salazar
                          </span>
                          <span className="font-mono font-bold text-emerald-400">$22,400 MXN</span>
                        </div>
                      </div>
                    </div>`;

const newKanbanContent = `                {/* View 1: Workflow Kanban Mockup (High-Density Multi-Column) */}
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
                    </div>`;

if (content.includes(normalize(oldKanbanContent))) {
  content = content.replace(normalize(oldKanbanContent), normalize(newKanbanContent));
  console.log('Successfully updated 3-column Kanban Mockup!');
}

// Convert back to CRLF and write file
fs.writeFileSync(filePath, content.replace(/\n/g, '\r\n'), 'utf8');
console.log('File successfully written!');
