const fs = require('fs');
const path = require('path');

// ─── 1. UPDATE OrderPrintSheet.tsx ───────────────────────────────────────────
const orderSheetPath = path.resolve('src/components/kanban/OrderPrintSheet.tsx');
let orderSheet = fs.readFileSync(orderSheetPath, 'utf8');

const markerTotals = '{/* Totals Footer inside Table Card */}';
const markerScreen = '{/* Screen Preview */}';

const idxTotals = orderSheet.indexOf(markerTotals);
const idxScreen = orderSheet.indexOf(markerScreen);

if (idxTotals !== -1 && idxScreen !== -1) {
  const newMiddle = `{/* Totales Financieros Destacados */}
        <div className="bg-slate-50 border-t border-slate-200 px-3 py-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="text-[9px] text-slate-500 max-w-sm leading-tight">
            <strong className="text-slate-700 uppercase block mb-0.5">Póliza de Garantía:</strong>
            {activeEmpresa?.terminos_condiciones ||
              "Garantía de 30 días o 1,000 km en mano de obra. Neumáticos y refacciones con garantía oficial de fábrica."}
          </div>

          <div className="w-full sm:w-64 space-y-0.5 text-[10.5px]">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal antes de IVA:</span>
              <span className="tabular-nums font-medium">
                \${subtotalSinIva.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>IVA ({tasaIva}% incluido):</span>
              <span className="tabular-nums font-medium">
                \${ivaCalculado.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between text-xs sm:text-sm font-black text-slate-900 border-t border-slate-300 pt-0.5">
              <span>GRAN TOTAL AUTORIZADO:</span>
              <span className="tabular-nums" style={{ color: primaryColor }}>
                \${granTotal.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN
              </span>
            </div>
            <div className="flex justify-between text-[10px] text-slate-700 font-bold border-t border-slate-200 pt-0.5">
              <span>Saldo Pendiente a Liquidar:</span>
              <span className="tabular-nums text-slate-900 font-black">
                \${saldoPendiente.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 5. TABLA 2: TRABAJOS RECOMENDADOS / COTIZADOS NO AUTORIZADOS (DIFERIDOS) ─── */}
      {hasDeferred && (
        <div className="border border-amber-300/80 rounded-md overflow-hidden mb-2 bg-amber-50/20">
          <div className="bg-amber-100/70 px-3 py-1 border-b border-amber-200 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <AlertTriangle size={11} className="text-amber-800 shrink-0" />
              <span className="text-[9.5px] font-bold uppercase tracking-wider text-amber-950">
                Trabajos Recomendados / Cotizados No Autorizados (Diferidos)
              </span>
            </div>
            <span className="text-[8px] font-bold uppercase px-1.5 py-0.2 rounded bg-amber-200 text-amber-900 border border-amber-300">
              Pospuesto para próxima visita
            </span>
          </div>

          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-amber-200/60 text-[8.5px] uppercase font-bold text-amber-900 bg-amber-50/60">
                <th className="py-1 px-2.5 w-24">Tipo</th>
                <th className="py-1 px-2.5">Concepto / Diagnóstico Técnico</th>
                <th className="py-1 px-2.5 text-center w-12">Cant.</th>
                <th className="py-1 px-2.5 text-right w-24">P. Cotizado</th>
                <th className="py-1 px-2.5 text-right w-24">Importe</th>
                <th className="py-1 px-2.5 text-center w-28">Estatus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-amber-100/80 text-[10px]">
              {deferredServices.map((s: any) => {
                const qty = Number(s.cantidad || 1);
                const unit = Number(s.precio_cobrado || 0);
                const srvName = s.servicios_taller?.nombre || s.servicio?.nombre || s.nombre || "Servicio Recomendado";
                return (
                  <tr key={\`def-srv-\${s.id}\`}>
                    <td className="py-1 px-2.5 font-semibold text-slate-700 text-[9px]">Mano de Obra</td>
                    <td className="py-1 px-2.5 text-slate-800">
                      <span className="font-medium">{srvName}</span>
                      {s.notas && <span className="block text-[8.5px] text-amber-900/90 italic">{s.notas}</span>}
                    </td>
                    <td className="py-1 px-2.5 text-center tabular-nums">{qty}</td>
                    <td className="py-1 px-2.5 text-right tabular-nums text-slate-600">
                      \${unit.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-1 px-2.5 text-right font-semibold tabular-nums text-slate-800">
                      \${(unit * qty).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-1 px-2.5 text-center">
                      <span className="text-[8px] font-bold px-1 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300">
                        No Comprado
                      </span>
                    </td>
                  </tr>
                );
              })}

              {deferredParts.map((r: any) => {
                const qty = Number(r.cantidad || 1);
                const unit = Number(r.precio_unitario || 0);
                const sub = r.subtotal != null ? Number(r.subtotal) : unit * qty;
                return (
                  <tr key={\`def-part-\${r.id}\`}>
                    <td className="py-1 px-2.5 font-semibold text-slate-700 text-[9px]">Refacción</td>
                    <td className="py-1 px-2.5 text-slate-800">
                      <span className="font-medium">{r.nombre}</span>
                      {r.numero_parte && (
                        <span className="text-[8.5px] text-slate-500 font-mono ml-1">P/N: {r.numero_parte}</span>
                      )}
                    </td>
                    <td className="py-1 px-2.5 text-center tabular-nums">{qty}</td>
                    <td className="py-1 px-2.5 text-right tabular-nums text-slate-600">
                      \${unit.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-1 px-2.5 text-right font-semibold tabular-nums text-slate-800">
                      \${sub.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-1 px-2.5 text-center">
                      <span className="text-[8px] font-bold px-1 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300">
                        No Comprado
                      </span>
                    </td>
                  </tr>
                );
              })}

              {deferredTires.map((t: any) => {
                const tire = t.inventario_llantas || t.llanta;
                const medida = tire ? \`\${tire.ancho}/\${tire.perfil} R\${tire.rin}\` : "";
                const tireName = tire ? \`\${tire.marca} \${tire.modelo_llanta}\` : (t.nombre || "Neumático");
                const qty = Number(t.cantidad || 1);
                const unit = Number(t.precio_unitario || 0);
                const sub = t.subtotal != null ? Number(t.subtotal) : unit * qty;
                return (
                  <tr key={\`def-tire-\${t.id}\`}>
                    <td className="py-1 px-2.5 font-semibold text-slate-700 text-[9px]">Neumático</td>
                    <td className="py-1 px-2.5 text-slate-800">
                      <span className="font-medium">{tireName}</span>{" "}
                      <span className="font-mono text-slate-600">{medida}</span>
                    </td>
                    <td className="py-1 px-2.5 text-center tabular-nums">{qty}</td>
                    <td className="py-1 px-2.5 text-right tabular-nums text-slate-600">
                      \${unit.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-1 px-2.5 text-right font-semibold tabular-nums text-slate-800">
                      \${sub.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-1 px-2.5 text-center">
                      <span className="text-[8px] font-bold px-1 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300">
                        No Comprado
                      </span>
                    </td>
                  </tr>
                );
              })}

              {deferredServices.length === 0 && deferredParts.length === 0 && deferredTires.length === 0 && rawDeferredWorks.map((dw: any) => (
                <tr key={\`dw-\${dw.id}\`}>
                  <td className="py-1 px-2.5 font-semibold text-slate-700 text-[9px]">Recomendación</td>
                  <td className="py-1 px-2.5 text-slate-800">
                    <span className="font-medium">{dw.concepto}</span>
                    {dw.notas && <span className="block text-[8.5px] text-amber-900/90 italic">{dw.notas}</span>}
                  </td>
                  <td className="py-1 px-2.5 text-center tabular-nums">1</td>
                  <td className="py-1 px-2.5 text-right tabular-nums text-slate-600">
                    \${Number(dw.costo_estimado || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-1 px-2.5 text-right font-semibold tabular-nums text-slate-800">
                    \${Number(dw.costo_estimado || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-1 px-2.5 text-center">
                    <span className="text-[8px] font-bold px-1 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300">
                      Pospuesto
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="px-2.5 py-1 bg-amber-50/70 border-t border-amber-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 text-[9px]">
            <div className="text-amber-950 flex items-center gap-1">
              <AlertTriangle size={10} className="text-amber-700 shrink-0" />
              <span>
                <strong>Deslinde Técnico:</strong> Se informó formalmente sobre holgura/desgaste en partidas diferidas. El cliente pospone la reparación. <u>No incluido</u> en el total de hoy.
              </span>
            </div>
            <div className="font-bold text-amber-950 shrink-0 tabular-nums text-[9.5px]">
              Presupuesto Diferido: +\${totalDiferidoDisplay.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN
            </div>
          </div>
        </div>
      )}

      {/* ─── 6. FIRMAS DE CONFORMIDAD Y RESPONSABILIDAD (Compactas) ─── */}
      <div className="grid grid-cols-2 gap-6 pt-3 mt-1 text-[9.5px]">
        <div className="border-t border-slate-400 pt-1 text-center">
          <p className="font-bold text-slate-800">
            {order.aprobado_cliente_nombre || c.nombre || "Nombre y Firma del Cliente"}
          </p>
          <p className="text-[8.5px] text-slate-500 leading-tight">
            Acepto inventario de recepción, presupuesto autorizado y tomo conocimiento de partidas no autorizadas (diferidas).
          </p>
        </div>
        <div className="border-t border-slate-400 pt-1 text-center">
          <p className="font-bold text-slate-800">
            Asesor de Servicio • {activeEmpresa?.nombre_comercial}
          </p>
          <p className="text-[8.5px] text-slate-500 leading-tight">
            Control de Calidad y Entrega ({activeSucursal?.nombre || "Matriz"})
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Action Bar (Screen Only) */}
      {!isStandalone && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 text-white px-4 py-3 rounded-lg no-print">
          <div className="flex items-center gap-2.5">
            <FileCheck2 size={18} className="text-blue-400 shrink-0" />
            <div>
              <h4 className="text-xs font-bold">Hoja Oficial de Recepción y Orden de Trabajo ({folioFormatted})</h4>
              <p className="text-[11px] text-slate-300">
                Formato optimizado para impresión tamaño Carta / A4 o exportación directa a PDF con el branding del taller.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md text-xs font-bold text-white shadow-sm transition-opacity hover:opacity-95 cursor-pointer shrink-0"
            style={{ backgroundColor: primaryColor }}
          >
            <Printer size={15} />
            Imprimir / Descargar PDF
          </button>
        </div>
      )}

      `;

  const before = orderSheet.substring(0, idxTotals);
  const after = orderSheet.substring(idxScreen);
  orderSheet = before + newMiddle + after;
  fs.writeFileSync(orderSheetPath, orderSheet, 'utf8');
  console.log('Successfully updated OrderPrintSheet.tsx!');
} else {
  console.error('Could not find markers in OrderPrintSheet.tsx', { idxTotals, idxScreen });
}

// ─── 2. UPDATE ReceiptModal.tsx ──────────────────────────────────────────────
const receiptModalPath = path.resolve('src/components/caja/ReceiptModal.tsx');
let receiptModal = fs.readFileSync(receiptModalPath, 'utf8');

const markerCartaStart = '// ─── 1. DISEÑO EN HOJA TAMAÑO CARTA (LETTER 8.5" x 11") ──────────────────────';
const markerCartaEnd = '// ─── 2. DISEÑO EN TICKET TÉRMICO (80MM ROLL) ──────────────────────────────────';

const idxCStart = receiptModal.indexOf(markerCartaStart);
const idxCEnd = receiptModal.indexOf(markerCartaEnd);

if (idxCStart !== -1 && idxCEnd !== -1) {
  const newCarta = `// ─── 1. DISEÑO EN HOJA TAMAÑO CARTA (LETTER 8.5" x 11") ──────────────────────
  const renderDocumentoCarta = (
    <div className="bg-white text-slate-900 border border-slate-200 rounded-lg p-4 sm:p-5 max-w-4xl mx-auto text-xs leading-normal font-sans print:border-0 print:p-0 print:m-0 print:shadow-none">
      {/* ─── Top Banner / Brand Header (Compacto) ─── */}
      <div
        className="flex justify-between items-start pb-2.5 mb-2.5 border-b-2"
        style={{ borderColor: primaryColor }}
      >
        <div className="flex items-center gap-3">
          {empresa?.logo_url ? (
            <img
              src={empresa.logo_url}
              alt={empresa.nombre_comercial}
              className="w-11 h-11 object-contain rounded border border-slate-200 p-0.5 bg-white shrink-0"
            />
          ) : (
            <div
              className="w-10 h-10 rounded flex items-center justify-center text-white font-black text-base shrink-0 shadow-xs"
              style={{ backgroundColor: primaryColor }}
            >
              {(empresa?.nombre_comercial || "CT").slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-black text-slate-900 tracking-tight uppercase">
                {empresa?.nombre_comercial || "Cova - Taller & Llantera"}
              </h1>
              {empresa?.eslogan && (
                <span className="hidden sm:inline-block text-[10px] font-medium text-slate-500 border-l border-slate-300 pl-2">
                  {empresa.eslogan}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[9.5px] text-slate-500 mt-0.5">
              {empresa?.rfc && (
                <span className="font-mono font-bold text-slate-700">RFC: {empresa.rfc}</span>
              )}
              {sucursal?.nombre && (
                <span className="font-medium text-slate-700">Sucursal: {sucursal.nombre}</span>
              )}
              {(sucursal?.direccion || empresa?.direccion) && (
                <span className="inline-flex items-center gap-0.5 text-slate-600">
                  <MapPin size={9} /> {sucursal?.direccion || empresa?.direccion}
                </span>
              )}
              {(sucursal?.telefono || empresa?.telefono) && (
                <span className="inline-flex items-center gap-0.5 text-slate-700 font-semibold tabular-nums">
                  <Phone size={9} /> {sucursal?.telefono || empresa?.telefono}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Folio Recibo & Orden */}
        <div className="flex flex-col items-end shrink-0 bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-right">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] uppercase tracking-wider font-bold text-slate-500">
              Recibo de Pago
            </span>
            <span
              className="text-base sm:text-lg font-black font-mono tabular-nums leading-none"
              style={{ color: primaryColor }}
            >
              {ticketFolio}
            </span>
          </div>
          <div className="text-[9.5px] text-slate-600 tabular-nums mt-0.5 flex items-center gap-2">
            <span>Orden: <strong className="text-slate-900">{folioDisplay}</strong></span>
            <span>Fecha: <strong className="text-slate-800">{nowStr}</strong></span>
          </div>
        </div>
      </div>

      {/* ─── Customer & Vehicle Grid (Compacto) ─── */}
      <div className="border border-slate-200 rounded-md p-2.5 bg-slate-50/50 mb-2 text-[10.5px]">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
          {/* Cliente */}
          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-1 text-[9.5px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">
              <User size={11} className="text-slate-600" /> Cliente
            </div>
            <div className="flex flex-wrap items-baseline gap-x-2">
              <strong className="text-slate-900 text-xs">{cli.nombre || "Cliente Mostrador"}</strong>
              {cli.telefono && (
                <span className="text-slate-700 font-semibold tabular-nums text-[10px]">
                  Tel: {cli.telefono}
                </span>
              )}
              {cli.rfc && (
                <span className="text-slate-500 font-mono text-[9.5px]">RFC: {cli.rfc}</span>
              )}
            </div>
            {cli.empresa && (
              <span className="text-[9.5px] text-slate-500">Flotilla / Empresa: <strong>{cli.empresa}</strong></span>
            )}
          </div>

          {/* Vehículo */}
          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-1 text-[9.5px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">
              <Car size={11} className="text-slate-600" /> Vehículo Identificado
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <strong className="text-slate-900 text-xs">
                {veh.marca} {veh.modelo} {veh.anio ? \`(\${veh.anio})\` : ""}
              </strong>
              <span className="font-mono font-black text-xs px-1.5 py-0.2 rounded bg-slate-900 text-white tracking-wider">
                {veh.placas || "SIN PLACAS"}
              </span>
              <span className="text-[10px] text-slate-600">
                Color: <strong>{veh.color || "N/E"}</strong>
              </span>
            </div>
            <div className="flex items-center gap-3 text-[9.5px] text-slate-500 font-mono mt-0.5">
              <span>VIN: {veh.vin || "No registrado"}</span>
              <span>Odómetro: {Number(veh.kilometraje_actual || order.kilometraje_ingreso || 0).toLocaleString("es-MX")} km</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Conceptos Amparados en la Orden (Tabla Compacta) ─── */}
      <div className="border border-slate-200 rounded-md overflow-hidden mb-2">
        <div className="bg-slate-100 px-3 py-1 border-b border-slate-200 flex justify-between items-center text-[9.5px] font-bold uppercase text-slate-700">
          <span>Conceptos Amparados por la Orden de Servicio</span>
          <span>{folioDisplay}</span>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-[9px] uppercase font-bold text-slate-500 bg-slate-50/80">
              <th className="py-1 px-2.5 w-24">Tipo</th>
              <th className="py-1 px-2.5">Descripción</th>
              <th className="py-1 px-2.5 text-center w-12">Cant.</th>
              <th className="py-1 px-2.5 text-right w-24">P. Unitario</th>
              <th className="py-1 px-2.5 text-right w-24">Importe</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-[10.5px]">
            {servicios.map((s: any) => (
              <tr key={\`srv-\${s.id}\`} className="hover:bg-slate-50/50">
                <td className="py-1 px-2.5 font-semibold text-slate-600 text-[9.5px]">Mano de Obra</td>
                <td className="py-1 px-2.5 text-slate-900 font-medium">
                  {s.servicios_taller?.nombre || s.servicio?.nombre || s.nombre || "Servicio Técnico"}
                </td>
                <td className="py-1 px-2.5 text-center tabular-nums">{s.cantidad || 1}</td>
                <td className="py-1 px-2.5 text-right tabular-nums text-slate-700">
                  \${Number(s.precio_cobrado || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                </td>
                <td className="py-1 px-2.5 text-right font-bold tabular-nums text-slate-900">
                  \${(Number(s.precio_cobrado || 0) * Number(s.cantidad || 1)).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
            {refacciones.map((r: any) => (
              <tr key={\`ref-\${r.id}\`} className="hover:bg-slate-50/50">
                <td className="py-1 px-2.5 font-semibold text-slate-600 text-[9.5px]">Refacción</td>
                <td className="py-1 px-2.5 text-slate-900 font-medium">
                  {r.nombre} {r.numero_parte ? \`(P/N: \${r.numero_parte})\` : ""}
                </td>
                <td className="py-1 px-2.5 text-center tabular-nums">{r.cantidad || 1}</td>
                <td className="py-1 px-2.5 text-right tabular-nums text-slate-700">
                  \${Number(r.precio_unitario || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                </td>
                <td className="py-1 px-2.5 text-right font-bold tabular-nums text-slate-900">
                  \${Number(r.subtotal || (r.precio_unitario || 0) * (r.cantidad || 1)).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
            {llantas.map((l: any) => {
              const tire = l.inventario_llantas || l.llanta;
              const tireName = tire ? \`\${tire.marca} \${tire.modelo_llanta}\` : (l.nombre || "Neumático");
              const medida = tire ? \`\${tire.ancho}/\${tire.perfil} R\${tire.rin}\` : "";
              return (
                <tr key={\`lla-\${l.id}\`} className="hover:bg-slate-50/50">
                  <td className="py-1 px-2.5 font-semibold text-slate-600 text-[9.5px]">Neumático</td>
                  <td className="py-1 px-2.5 text-slate-900 font-medium">
                    {tireName} <span className="font-mono text-slate-700 font-semibold">{medida}</span>
                  </td>
                  <td className="py-1 px-2.5 text-center tabular-nums font-bold">{l.cantidad || 1}</td>
                  <td className="py-1 px-2.5 text-right tabular-nums text-slate-700">
                    \${Number(l.precio_unitario || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-1 px-2.5 text-right font-bold tabular-nums text-slate-900">
                    \${Number(l.subtotal || (l.precio_unitario || 0) * (l.cantidad || 1)).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ─── Recuadro Destacado del Pago / Cobro Liquidado ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-2">
        {/* Desglose Fiscal & Totales */}
        <div className="border border-slate-200 rounded-md p-2.5 bg-slate-50 space-y-0.5 text-[10.5px]">
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block mb-0.5">
            Resumen de Cuenta
          </span>
          <div className="flex justify-between text-slate-600">
            <span>Subtotal de la Orden (sin IVA):</span>
            <span className="tabular-nums font-medium">
              \${subtotalSinIva.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>IVA ({tasaIva}% incluido):</span>
            <span className="tabular-nums font-medium">
              \${iva.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between font-black text-slate-900 text-xs border-t border-slate-300 pt-0.5">
            <span>TOTAL DE LA ORDEN:</span>
            <span className="tabular-nums">
              \${total.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN
            </span>
          </div>
          <div className="flex justify-between font-bold text-slate-700 border-t border-slate-200 pt-0.5 text-[10px]">
            <span>Saldo Restante por Liquidar:</span>
            <span className={\`tabular-nums \${saldo > 0 ? "text-amber-700" : "text-emerald-700 font-black"}\`}>
              \${saldo.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Movimiento de Cobro Actual */}
        <div className="border-2 border-emerald-400 rounded-md p-2.5 bg-emerald-50/50 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9.5px] font-bold uppercase tracking-wider text-emerald-950 flex items-center gap-1">
                <CheckCircle2 size={11} className="text-emerald-600" />
                Comprobante de Cobro en Caja
              </span>
              <span className="text-[8.5px] font-mono font-bold uppercase bg-emerald-200/90 text-emerald-900 px-1.5 py-0.2 rounded">
                PAGO REGISTRADO
              </span>
            </div>

            <div className="bg-white border border-emerald-200 rounded px-2 py-1 mb-1.5">
              <span className="text-[8.5px] text-slate-500 uppercase font-bold block">
                Monto Cobrado en este Movimiento:
              </span>
              <span className="text-base sm:text-lg font-black text-emerald-800 font-mono tabular-nums leading-tight">
                \${montoCobrado.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN
              </span>
            </div>

            <div className="text-[10px] space-y-0.5 text-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-600">Forma de Pago:</span>
                <strong className="text-slate-900">
                  {payment?.metodo_detalle || payment?.proveedor_pago || "Efectivo en Ventanilla"}
                </strong>
              </div>
              {cashGiven != null && cashGiven > 0 && (
                <>
                  <div className="flex justify-between text-slate-600">
                    <span>Efectivo entregado:</span>
                    <span className="tabular-nums font-medium">\${cashGiven.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-emerald-800 font-bold">
                    <span>Cambio devuelto:</span>
                    <span className="tabular-nums font-black">\${(changeDue ?? 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="text-[9px] text-emerald-900 pt-1 mt-1 border-t border-emerald-200/80">
            {saldo <= 0 ? (
              <span className="font-bold text-emerald-800 uppercase flex items-center gap-1">
                ✓ Cuenta liquidada en su totalidad • No presenta adeudo
              </span>
            ) : (
              <span>Anticipo / Pago parcial aplicado correctamente a la orden {folioDisplay}.</span>
            )}
          </div>
        </div>
      </div>

      {/* ─── Términos y Condiciones (Compactos) ─── */}
      <div className="border border-slate-200 rounded p-2 bg-slate-50/40 text-[8.5px] text-slate-500 leading-tight mb-2">
        <strong className="text-slate-700 uppercase block mb-0.5">Póliza de Garantía y Condiciones:</strong>
        {empresa?.terminos_condiciones ||
          "Garantía de 30 días o 1,000 km en mano de obra. Refacciones y neumáticos con garantía oficial del fabricante. En caso de requerir CFDI 4.0, favor de solicitarlo durante el mes corriente presentando su constancia fiscal."}
      </div>

      {/* ─── Bloque de Firmas y Sello (Compactas) ─── */}
      <div className="grid grid-cols-2 gap-6 pt-2 text-[9.5px]">
        <div className="border-t border-slate-400 pt-1 text-center">
          <p className="font-bold text-slate-800">
            {cli.nombre || "Nombre y Firma del Cliente"}
          </p>
          <p className="text-[8.5px] text-slate-500">Recibí comprobante de pago de conformidad</p>
        </div>
        <div className="border-t border-slate-400 pt-1 text-center">
          <p className="font-bold text-slate-800">
            Caja y Cobranza • {empresa?.nombre_comercial}
          </p>
          <p className="text-[8.5px] text-slate-500">
            Sello de Pagado ({sucursal?.nombre || "Matriz Cova"})
          </p>
        </div>
      </div>
    </div>
  );

  `;

  const beforeC = receiptModal.substring(0, idxCStart);
  const afterC = receiptModal.substring(idxCEnd);
  receiptModal = beforeC + newCarta + afterC;
  fs.writeFileSync(receiptModalPath, receiptModal, 'utf8');
  console.log('Successfully updated ReceiptModal.tsx!');
} else {
  console.error('Could not find markers in ReceiptModal.tsx', { idxCStart, idxCEnd });
}
