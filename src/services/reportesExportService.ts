import ExcelJS from "exceljs";
import * as XLSX from "xlsx";
import {
  TurnoDetalleCompleto,
  TurnoVentaOrden,
  TurnoGastoMovimiento,
  ResumenCorteDiarioAuditoria,
} from "@/services/cajaTurnoService";

export interface VentaItemReporte {
  noVenta: number | string;
  cliente: string;
  vehiculo: string;
  telefono: string;
  factura: boolean | string;
  metodosPago: string;
  items: Array<{
    descripcion: string;
    cantidad: number;
    precioUnitario: number;
    importe: number;
    proveedor?: string;
    folioTicket?: string;
    fuentePago?: string;
    costoUnitario?: number;
    costoTotal?: number;
    mesesGarantia?: number;
    evidenciaUrl?: string;
  }>;
  totalVenta: number;
  totalCostos: number;
  comisionBancaria: number;
  gananciaNeta: number;
}

export interface ExportarCorteParams {
  empresaNombre?: string;
  sucursalNombre?: string;
  cajeroNombre?: string;
  fechaTurno?: string;
  turnoId?: string;
  cierreData?: any;
  detalleTurno: TurnoDetalleCompleto;
}

export const ReportesExportService = {
  /**
   * Genera el libro Excel con diseño editorial premium y descarga el archivo .xlsx
   */
  async exportarCorteExcelElegante({
    empresaNombre = "COVA",
    sucursalNombre = "Cova Culiacán",
    cajeroNombre = "Cajero en Turno",
    fechaTurno = new Date().toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }),
    turnoId = "Z-ACTIVO",
    cierreData,
    detalleTurno,
  }: ExportarCorteParams) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "TallerTrack";
    workbook.lastModifiedBy = cajeroNombre;
    workbook.created = new Date();
    workbook.modified = new Date();

    const f1Declarado = Number(cierreData?.declaradoF1 || 0);
    const f2Declarado = Number(cierreData?.declaradoF2 || 0);
    const difF1 = Number(cierreData?.diferenciaF1 || 0);
    const difF2 = Number(cierreData?.diferenciaF2 || 0);
    const remesa = Number(cierreData?.remesa || 0);
    const fondoSig = Number(cierreData?.fondoSiguiente || 0);
    const teorico = cierreData?.resumenTeorico;

    // Teórico F1 y F2 con cálculo de contingencia si no fueron pasados pre-calculados
    const f1Apertura = Number(teorico?.fondo1?.apertura || 0);
    const f1Entradas = Number(teorico?.fondo1?.entradasEfectivoPOS || 0);
    const f1Salidas = Number(teorico?.fondo1?.salidasGastos || 0);
    const f1TraspasosNetos = Number((teorico?.fondo1?.traspasosRecibidos || 0) - (teorico?.fondo1?.traspasosEnviados || 0));
    const teoricoF1Calculado = f1Apertura + f1Entradas - f1Salidas + f1TraspasosNetos;
    const teoricoF1 = Number(cierreData?.teoricoF1 != null ? cierreData.teoricoF1 : teoricoF1Calculado);

    const f2Apertura = Number(teorico?.fondo2?.apertura ?? cierreData?.fondo2_apertura ?? f2Declarado ?? 0);
    const f2TraspasosNetos = -Number(teorico?.fondo2?.traspasosEnviados || 0);
    const teoricoF2Calculado = f2Apertura + f2TraspasosNetos;
    const teoricoF2 = Number(cierreData?.teoricoF2 != null ? cierreData.teoricoF2 : (teoricoF2Calculado || f2Declarado));

    const softBorder: Partial<ExcelJS.Borders> = {
      top: { style: "thin", color: { argb: "FFE2E8F0" } },
      bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
      left: { style: "thin", color: { argb: "FFE2E8F0" } },
      right: { style: "thin", color: { argb: "FFE2E8F0" } },
    };

    const headerBorder: Partial<ExcelJS.Borders> = {
      top: { style: "thin", color: { argb: "FF334155" } },
      bottom: { style: "medium", color: { argb: "FF0F172A" } },
      left: { style: "thin", color: { argb: "FF334155" } },
      right: { style: "thin", color: { argb: "FF334155" } },
    };

    // =========================================================================
    // HOJA 1: VENTAS Y SERVICIOS (Color Azul)
    // =========================================================================
    const wsVentas = workbook.addWorksheet("Ventas y Servicios", {
      views: [{ state: "frozen", ySplit: 5 }],
      properties: { tabColor: { argb: "FF1E40AF" } },
    });

    // Fila 1: Título Principal
    wsVentas.mergeCells("A1:R1");
    const titleCell1 = wsVentas.getCell("A1");
    titleCell1.value = `${empresaNombre.toUpperCase()} - REPORTE DE VENTAS Y SERVICIOS`;
    titleCell1.font = { name: "Segoe UI", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
    titleCell1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
    titleCell1.alignment = { vertical: "middle", horizontal: "center" };
    wsVentas.getRow(1).height = 34;

    // Fila 2: Metadatos
    wsVentas.mergeCells("A2:R2");
    const metaCell1 = wsVentas.getCell("A2");
    metaCell1.value = `Sucursal: ${sucursalNombre}   |   Fecha: ${fechaTurno}   |   Turno: #${String(turnoId).substring(0, 8).toUpperCase()}   |   Responsable: ${cajeroNombre}`;
    metaCell1.font = { name: "Segoe UI", size: 10, color: { argb: "FFCBD5E1" } };
    metaCell1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
    metaCell1.alignment = { vertical: "middle", horizontal: "center" };
    wsVentas.getRow(2).height = 20;

    // Fila 3: Tarjetas Resumen KPIs
    wsVentas.mergeCells("A3:D3");
    wsVentas.getCell("A3").value = `Total Ventas: $${detalleTurno.totales.totalVentas.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;
    wsVentas.getCell("A3").font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF1E3A8A" } };
    wsVentas.getCell("A3").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFF6FF" } };
    wsVentas.getCell("A3").alignment = { vertical: "middle", horizontal: "center" };

    wsVentas.mergeCells("E3:H3");
    wsVentas.getCell("E3").value = `Costo Refacciones: $${detalleTurno.totales.totalCostos.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;
    wsVentas.getCell("E3").font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF9A3412" } };
    wsVentas.getCell("E3").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF7ED" } };
    wsVentas.getCell("E3").alignment = { vertical: "middle", horizontal: "center" };

    wsVentas.mergeCells("I3:M3");
    wsVentas.getCell("I3").value = `Utilidad Bruta Estimada: $${detalleTurno.totales.utilidadEstimada.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;
    wsVentas.getCell("I3").font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF166534" } };
    wsVentas.getCell("I3").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0FDF4" } };
    wsVentas.getCell("I3").alignment = { vertical: "middle", horizontal: "center" };

    wsVentas.mergeCells("N3:R3");
    wsVentas.getCell("N3").value = `Margen Promedio: ${detalleTurno.totales.margenEstimadoPorcentaje.toFixed(1)}% (${detalleTurno.totales.cantidadOrdenes} órdenes / ${detalleTurno.totales.cantidadPartidas} partidas)`;
    wsVentas.getCell("N3").font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF475569" } };
    wsVentas.getCell("N3").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
    wsVentas.getCell("N3").alignment = { vertical: "middle", horizontal: "center" };
    wsVentas.getRow(3).height = 24;

    // Fila 4: Espacio
    wsVentas.getRow(4).height = 8;

    // Fila 5: Encabezados de Columna
    const columnasVentas = [
      "No. Orden",
      "Fecha / Hora",
      "Cliente",
      "Teléfono",
      "Vehículo",
      "Placas",
      "Tipo",
      "Concepto / Refacción",
      "Cant.",
      "Costo Unit. ($)",
      "Costo Total ($)",
      "P. Unitario ($)",
      "Importe ($)",
      "Utilidad ($)",
      "Margen (%)",
      "Método de Cobro",
      "Proveedor",
      "Folio Ticket / Garantía",
    ];

    const headerRowVentas = wsVentas.getRow(5);
    headerRowVentas.values = columnasVentas;
    headerRowVentas.height = 28;
    headerRowVentas.eachCell((cell) => {
      cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: false };
      cell.border = headerBorder;
    });

    let currentVentasRow = 6;
    if (detalleTurno.ventas.length === 0) {
      wsVentas.mergeCells(`A6:R6`);
      const emptyCell = wsVentas.getCell("A6");
      emptyCell.value = "Sin órdenes de servicio cobradas en este turno.";
      emptyCell.font = { name: "Segoe UI", size: 10, italic: true, color: { argb: "FF64748B" } };
      emptyCell.alignment = { vertical: "middle", horizontal: "center" };
      wsVentas.getRow(6).height = 24;
      currentVentasRow = 7;
    } else {
      detalleTurno.ventas.forEach((v, vIdx) => {
        const isAlternateOrder = vIdx % 2 === 1;
        const rowBg = isAlternateOrder ? "FFF8FAFC" : "FFFFFFFF";

        v.partidas.forEach((item, pIdx) => {
          const isFirstItem = pIdx === 0;
          const r = wsVentas.getRow(currentVentasRow);

          r.values = [
            isFirstItem ? v.folioStr : "",
            isFirstItem
              ? new Date(v.fechaPago).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })
              : "",
            isFirstItem ? v.clienteNombre : "",
            isFirstItem ? v.clienteTelefono : "",
            isFirstItem ? v.vehiculoDesc : "",
            isFirstItem ? v.placas : "",
            item.tipo,
            item.descripcion,
            item.cantidad,
            item.costoUnitario,
            item.costoTotal,
            item.precioUnitario,
            item.importe,
            item.margenMonto,
            item.margenPorcentaje / 100,
            isFirstItem ? v.metodoPago : "",
            item.proveedor || "-",
            item.folioTicketProv
              ? `Nota #${item.folioTicketProv}${item.mesesGarantia ? ` (${item.mesesGarantia}m)` : ""}`
              : "-",
          ];

          r.height = 22;
          r.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            cell.font = { name: "Segoe UI", size: 9.5, color: { argb: "FF1E293B" } };
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
            cell.border = softBorder;

            // Formatos por columna
            if ([1, 2, 6, 7, 9].includes(colNumber)) {
              cell.alignment = { vertical: "middle", horizontal: "center" };
            } else if ([10, 11, 12, 13, 14].includes(colNumber)) {
              cell.numFmt = '"$"#,##0.00';
              cell.alignment = { vertical: "middle", horizontal: "right" };
            } else if (colNumber === 15) {
              cell.numFmt = "0.0%";
              cell.alignment = { vertical: "middle", horizontal: "right" };
            } else {
              cell.alignment = { vertical: "middle", horizontal: "left" };
            }

            // Resaltar No. Orden y Placas
            if (isFirstItem && colNumber === 1) {
              cell.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FF1E40AF" } };
            }
            if (isFirstItem && colNumber === 6) {
              cell.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FF0F172A" } };
            }
          });

          currentVentasRow++;
        });
      });

      // Fila de Totales
      const totalRowVentas = wsVentas.getRow(currentVentasRow);
      totalRowVentas.values = [
        "TOTALES DEL TURNO",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        detalleTurno.totales.cantidadPartidas,
        "",
        detalleTurno.totales.totalCostos,
        "",
        detalleTurno.totales.totalVentas,
        detalleTurno.totales.utilidadEstimada,
        detalleTurno.totales.margenEstimadoPorcentaje / 100,
        "",
        "",
        "",
      ];
      totalRowVentas.height = 26;
      totalRowVentas.eachCell((cell, colNumber) => {
        cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF0F172A" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
        cell.border = {
          top: { style: "thin", color: { argb: "FF0F172A" } },
          bottom: { style: "double", color: { argb: "FF0F172A" } },
          left: { style: "thin", color: { argb: "FFE2E8F0" } },
          right: { style: "thin", color: { argb: "FFE2E8F0" } },
        };

        if ([11, 13, 14].includes(colNumber)) {
          cell.numFmt = '"$"#,##0.00';
          cell.alignment = { vertical: "middle", horizontal: "right" };
        } else if (colNumber === 15) {
          cell.numFmt = "0.0%";
          cell.alignment = { vertical: "middle", horizontal: "right" };
        } else if (colNumber === 9) {
          cell.alignment = { vertical: "middle", horizontal: "center" };
        } else if (colNumber === 1) {
          cell.alignment = { vertical: "middle", horizontal: "left" };
        }
      });
      wsVentas.mergeCells(`A${currentVentasRow}:H${currentVentasRow}`);
    }

    // Anchos de columna automáticos generosos
    wsVentas.columns = [
      { width: 13 }, // No. Orden
      { width: 14 }, // Fecha / Hora
      { width: 26 }, // Cliente
      { width: 16 }, // Teléfono
      { width: 28 }, // Vehículo
      { width: 14 }, // Placas
      { width: 13 }, // Tipo
      { width: 34 }, // Concepto
      { width: 9 },  // Cant
      { width: 15 }, // Costo Unit
      { width: 16 }, // Costo Total
      { width: 15 }, // P. Unit
      { width: 16 }, // Importe
      { width: 16 }, // Utilidad
      { width: 14 }, // Margen %
      { width: 18 }, // Método Cobro
      { width: 22 }, // Proveedor
      { width: 24 }, // Folio Ticket / Garantía
    ];

    // =========================================================================
    // HOJA 2: BALANCE DE CAJA (Color Verde)
    // =========================================================================
    const wsCaja = workbook.addWorksheet("Balance de Caja", {
      properties: { tabColor: { argb: "FF065F46" } },
    });

    // Fila 1: Título Principal
    wsCaja.mergeCells("A1:I1");
    const titleCell2 = wsCaja.getCell("A1");
    titleCell2.value = `${empresaNombre.toUpperCase()} - BALANCE DE EFECTIVO Y BANCOS (CORTE Z)`;
    titleCell2.font = { name: "Segoe UI", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
    titleCell2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF064E3B" } };
    titleCell2.alignment = { vertical: "middle", horizontal: "center" };
    wsCaja.getRow(1).height = 34;

    // Fila 2: Metadatos
    wsCaja.mergeCells("A2:I2");
    const metaCell2 = wsCaja.getCell("A2");
    metaCell2.value = `Sucursal: ${sucursalNombre}   |   Fecha de Cierre: ${fechaTurno}   |   Turno: #${String(turnoId).substring(0, 8).toUpperCase()}   |   Responsable: ${cajeroNombre}`;
    metaCell2.font = { name: "Segoe UI", size: 10, color: { argb: "FFD1FAE5" } };
    metaCell2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF065F46" } };
    metaCell2.alignment = { vertical: "middle", horizontal: "center" };
    wsCaja.getRow(2).height = 20;

    // Fila 4: Sección 1 - Arqueo de Fondos
    wsCaja.mergeCells("A4:I4");
    const sec1Title = wsCaja.getCell("A4");
    sec1Title.value = "1. RESUMEN DE EFECTIVO EN CAJA";
    sec1Title.font = { name: "Segoe UI", size: 11, bold: true, color: { argb: "FF065F46" } };
    sec1Title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFECFDF5" } };
    sec1Title.alignment = { vertical: "middle", horizontal: "left" };
    wsCaja.getRow(4).height = 24;

    const headersArqueo = [
      "Fondo / Concepto",
      "Saldo Apertura ($)",
      "Cobros en Efectivo ($)",
      "Salidas / Gastos ($)",
      "Traspasos Fondos ($)",
      "Teórico Sistema ($)",
      "Físico Contado ($)",
      "Diferencia ($)",
      "Estatus",
    ];
    const r5 = wsCaja.getRow(5);
    r5.values = headersArqueo;
    r5.height = 26;
    r5.eachCell((cell) => {
      cell.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF065F46" } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = headerBorder;
    });

    // Fila Fondo 1
    const r6 = wsCaja.getRow(6);
    r6.values = [
      "Fondo 1: Operativo (Mostrador)",
      f1Apertura,
      f1Entradas,
      f1Salidas,
      f1TraspasosNetos,
      teoricoF1,
      f1Declarado,
      difF1,
      Math.abs(difF1) <= 10 ? "Cuadrado" : difF1 > 0 ? "Sobrante" : "Faltante",
    ];
    r6.height = 22;
    r6.eachCell((cell, col) => {
      cell.font = { name: "Segoe UI", size: 9.5, color: { argb: "FF1E293B" } };
      cell.border = softBorder;
      if (col === 1) cell.alignment = { vertical: "middle", horizontal: "left" };
      else if (col === 9) {
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.font = {
          name: "Segoe UI",
          size: 9.5,
          bold: true,
          color: { argb: Math.abs(difF1) <= 10 ? "FF166534" : "FFDC2626" },
        };
      } else {
        cell.numFmt = '"$"#,##0.00';
        cell.alignment = { vertical: "middle", horizontal: "right" };
      }
    });

    // Fila Fondo 2
    const r7 = wsCaja.getRow(7);
    r7.values = [
      "Fondo 2: Reserva (Caja Fuerte)",
      f2Apertura,
      0,
      0,
      f2TraspasosNetos,
      teoricoF2,
      f2Declarado,
      difF2,
      Math.abs(difF2) <= 10 ? "Cuadrado" : difF2 > 0 ? "Sobrante" : "Faltante",
    ];
    r7.height = 22;
    r7.eachCell((cell, col) => {
      cell.font = { name: "Segoe UI", size: 9.5, color: { argb: "FF1E293B" } };
      cell.border = softBorder;
      if (col === 1) cell.alignment = { vertical: "middle", horizontal: "left" };
      else if (col === 9) {
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.font = {
          name: "Segoe UI",
          size: 9.5,
          bold: true,
          color: { argb: Math.abs(difF2) <= 10 ? "FF166534" : "FFDC2626" },
        };
      } else {
        cell.numFmt = '"$"#,##0.00';
        cell.alignment = { vertical: "middle", horizontal: "right" };
      }
    });

    // Sección 2: Destino del Efectivo
    wsCaja.mergeCells("A9:D9");
    const sec2Title = wsCaja.getCell("A9");
    sec2Title.value = "2. DESTINO DEL EFECTIVO";
    sec2Title.font = { name: "Segoe UI", size: 11, bold: true, color: { argb: "FF065F46" } };
    sec2Title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFECFDF5" } };
    wsCaja.getRow(9).height = 24;

    wsCaja.getRow(10).values = ["Concepto", "Monto ($)"];
    wsCaja.getRow(10).height = 22;
    wsCaja.getRow(10).getCell(1).font = { name: "Segoe UI", size: 9.5, bold: true };
    wsCaja.getRow(10).getCell(2).font = { name: "Segoe UI", size: 9.5, bold: true };

    const r11 = wsCaja.getRow(11);
    r11.values = ["Remesa Retirada a Caja Fuerte / Depósito", remesa];
    r11.getCell(2).numFmt = '"$"#,##0.00';
    r11.getCell(2).alignment = { horizontal: "right" };
    r11.getCell(1).border = softBorder;
    r11.getCell(2).border = softBorder;

    const r12 = wsCaja.getRow(12);
    r12.values = ["Fondo Base para Siguiente Turno (Gaveta Mostrador)", fondoSig];
    r12.getCell(2).numFmt = '"$"#,##0.00';
    r12.getCell(2).alignment = { horizontal: "right" };
    r12.getCell(1).border = softBorder;
    r12.getCell(2).border = softBorder;

    // Sección 3: Bancos SPEI
    wsCaja.mergeCells("A14:D14");
    const sec3Title = wsCaja.getCell("A14");
    sec3Title.value = "3. CONCILIACIÓN DE TRANSFERENCIAS BANCARIAS (SPEI)";
    sec3Title.font = { name: "Segoe UI", size: 11, bold: true, color: { argb: "FF065F46" } };
    sec3Title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFECFDF5" } };
    wsCaja.getRow(14).height = 24;

    const r15 = wsCaja.getRow(15);
    r15.values = ["Cuenta Bancaria", "Banco", "No. Transacciones", "Monto Total ($)"];
    r15.height = 22;
    r15.eachCell((c) => (c.font = { name: "Segoe UI", size: 9.5, bold: true }));

    let cRow = 16;
    if (teorico?.bancosSPEI && teorico.bancosSPEI.length > 0) {
      teorico.bancosSPEI.forEach((b: any) => {
        const row = wsCaja.getRow(cRow);
        row.values = [b.alias, b.banco, Number(b.conteo || 0), Number(b.total || 0)];
        row.getCell(4).numFmt = '"$"#,##0.00';
        row.getCell(3).alignment = { horizontal: "center" };
        row.eachCell((cell) => (cell.border = softBorder));
        cRow++;
      });
    } else {
      const row = wsCaja.getRow(cRow);
      row.values = ["Sin transferencias SPEI en este turno", "-", 0, 0];
      row.getCell(4).numFmt = '"$"#,##0.00';
      row.eachCell((cell) => (cell.border = softBorder));
      cRow++;
    }

    // Sección 4: Terminales y Tarjetas
    cRow++;
    wsCaja.mergeCells(`A${cRow}:D${cRow}`);
    const sec4Title = wsCaja.getCell(`A${cRow}`);
    sec4Title.value = "4. TERMINALES Y OTROS MÉTODOS DE PAGO";
    sec4Title.font = { name: "Segoe UI", size: 11, bold: true, color: { argb: "FF065F46" } };
    sec4Title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFECFDF5" } };
    wsCaja.getRow(cRow).height = 24;

    cRow++;
    const rTpvHeader = wsCaja.getRow(cRow);
    rTpvHeader.values = ["Método", "No. Transacciones", "", "Monto Total ($)"];
    rTpvHeader.eachCell((c) => (c.font = { name: "Segoe UI", size: 9.5, bold: true }));

    cRow++;
    const rTpv = wsCaja.getRow(cRow);
    rTpv.values = [
      "Terminales TPV (Tarjetas)",
      Number(teorico?.tarjetasTPV?.conteo || 0),
      "",
      Number(teorico?.tarjetasTPV?.total || 0),
    ];
    rTpv.getCell(4).numFmt = '"$"#,##0.00';
    rTpv.eachCell((cell) => (cell.border = softBorder));

    if (teorico?.bnpl && teorico.bnpl.total > 0) {
      cRow++;
      const rBnpl = wsCaja.getRow(cRow);
      rBnpl.values = [
        "Crédito BNPL (Kueski / Atrato)",
        Number(teorico.bnpl.conteo || 0),
        "",
        Number(teorico.bnpl.total || 0),
      ];
      rBnpl.getCell(4).numFmt = '"$"#,##0.00';
      rBnpl.eachCell((cell) => (cell.border = softBorder));
    }

    // Total General Cobrado
    cRow += 2;
    wsCaja.mergeCells(`A${cRow}:C${cRow}`);
    const rTotGen = wsCaja.getRow(cRow);
    rTotGen.getCell(1).value = "TOTAL GENERAL DE COBROS FACTURADOS EN EL TURNO:";
    rTotGen.getCell(1).font = { name: "Segoe UI", size: 11, bold: true, color: { argb: "FF0F172A" } };
    const totalCobrosCalculado =
      Number(teorico?.totalVentasTurno || 0) ||
      Number(detalleTurno?.totales?.totalVentas || 0) ||
      (
        Number(teorico?.fondo1?.entradasEfectivoPOS || 0) +
        (teorico?.bancosSPEI || []).reduce((acc: number, b: any) => acc + Number(b.total || 0), 0) +
        Number(teorico?.tarjetasTPV?.total || 0) +
        Number(teorico?.bnpl?.total || 0)
      );
    rTotGen.getCell(4).value = totalCobrosCalculado;
    rTotGen.getCell(4).numFmt = '"$"#,##0.00';
    rTotGen.getCell(4).font = { name: "Segoe UI", size: 12, bold: true, color: { argb: "FF064E3B" } };
    rTotGen.height = 26;

    if (cierreData?.justificacion_descuadre) {
      cRow += 2;
      wsCaja.mergeCells(`A${cRow}:G${cRow}`);
      const justCell = wsCaja.getCell(`A${cRow}`);
      justCell.value = `JUSTIFICACIÓN DE DESCUADRE REGISTRADA: ${cierreData.justificacion_descuadre}`;
      justCell.font = { name: "Segoe UI", size: 9.5, italic: true, color: { argb: "FFDC2626" } };
    }

    // Cuadro de Firmas
    cRow += 3;
    wsCaja.getCell(`B${cRow}`).value = "____________________________________";
    wsCaja.getCell(`E${cRow}`).value = "____________________________________";
    wsCaja.getCell(`B${cRow}`).alignment = { horizontal: "center" };
    wsCaja.getCell(`E${cRow}`).alignment = { horizontal: "center" };

    cRow++;
    wsCaja.getCell(`B${cRow}`).value = `Cajero(a) Entrega Turno\n${cajeroNombre}`;
    wsCaja.getCell(`E${cRow}`).value = "Administrador / Supervisor\nRecepción y Validación de Fondos";
    wsCaja.getCell(`B${cRow}`).font = { name: "Segoe UI", size: 9.5, bold: true };
    wsCaja.getCell(`E${cRow}`).font = { name: "Segoe UI", size: 9.5, bold: true };
    wsCaja.getCell(`B${cRow}`).alignment = { horizontal: "center", wrapText: true };
    wsCaja.getCell(`E${cRow}`).alignment = { horizontal: "center", wrapText: true };
    wsCaja.getRow(cRow).height = 30;

    wsCaja.columns = [
      { width: 32 }, // A
      { width: 22 }, // B
      { width: 24 }, // C
      { width: 20 }, // D
      { width: 22 }, // E
      { width: 20 }, // F
      { width: 20 }, // G
      { width: 22 }, // H
      { width: 16 }, // I
    ];

    // =========================================================================
    // HOJA 3: GASTOS Y CAJA CHICA (Color Ámbar)
    // =========================================================================
    const wsGastos = workbook.addWorksheet("Gastos y Caja Chica", {
      properties: { tabColor: { argb: "FF92400E" } },
    });

    wsGastos.mergeCells("A1:H1");
    const titleCell3 = wsGastos.getCell("A1");
    titleCell3.value = `${empresaNombre.toUpperCase()} - GASTOS DE CAJA CHICA Y COMPRAS A PROVEEDORES`;
    titleCell3.font = { name: "Segoe UI", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
    titleCell3.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF78350F" } };
    titleCell3.alignment = { vertical: "middle", horizontal: "center" };
    wsGastos.getRow(1).height = 34;

    wsGastos.mergeCells("A2:H2");
    const metaCell3 = wsGastos.getCell("A2");
    metaCell3.value = `Sucursal: ${sucursalNombre}   |   Fecha: ${fechaTurno}   |   Total Salidas: $${detalleTurno.totales.totalGastos.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;
    metaCell3.font = { name: "Segoe UI", size: 10, color: { argb: "FFFEF3C7" } };
    metaCell3.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF92400E" } };
    metaCell3.alignment = { vertical: "middle", horizontal: "center" };
    wsGastos.getRow(2).height = 20;

    const columnasGastos = [
      "Fecha",
      "Hora",
      "Categoría",
      "Concepto / Descripción",
      "Monto ($)",
      "Fondo de Salida",
      "Proveedor",
      "Folio Ticket / Evidencia",
    ];

    const r3Gastos = wsGastos.getRow(4);
    r3Gastos.values = columnasGastos;
    r3Gastos.height = 26;
    r3Gastos.eachCell((cell) => {
      cell.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF92400E" } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = headerBorder;
    });

    let gRow = 5;
    if (detalleTurno.gastos.length === 0) {
      wsGastos.mergeCells("A5:H5");
      const emptyG = wsGastos.getCell("A5");
      emptyG.value = "Sin movimientos de gastos ni salidas de caja chica en este turno.";
      emptyG.font = { name: "Segoe UI", size: 10, italic: true, color: { argb: "FF64748B" } };
      emptyG.alignment = { vertical: "middle", horizontal: "center" };
      wsGastos.getRow(5).height = 24;
      gRow = 6;
    } else {
      detalleTurno.gastos.forEach((g, gIdx) => {
        const rowBg = gIdx % 2 === 1 ? "FFF8FAFC" : "FFFFFFFF";
        const r = wsGastos.getRow(gRow);
        r.values = [
          g.fecha,
          g.hora,
          g.categoria,
          g.concepto,
          g.monto,
          g.fondoNombre,
          g.proveedor || "-",
          g.folioTicket ? `#${g.folioTicket}` : "-",
        ];
        r.height = 22;
        r.eachCell((cell, col) => {
          cell.font = { name: "Segoe UI", size: 9.5, color: { argb: "FF1E293B" } };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
          cell.border = softBorder;
          if ([1, 2, 3, 6, 8].includes(col)) cell.alignment = { vertical: "middle", horizontal: "center" };
          else if (col === 5) {
            cell.numFmt = '"$"#,##0.00';
            cell.alignment = { vertical: "middle", horizontal: "right" };
          } else {
            cell.alignment = { vertical: "middle", horizontal: "left" };
          }
        });
        gRow++;
      });

      // Total Gastos
      const rTotG = wsGastos.getRow(gRow);
      rTotG.values = ["TOTAL SALIDAS DE CAJA CHICA", "", "", "", detalleTurno.totales.totalGastos, "", "", ""];
      rTotG.height = 26;
      rTotG.eachCell((cell, col) => {
        cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF0F172A" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
        cell.border = {
          top: { style: "thin", color: { argb: "FF0F172A" } },
          bottom: { style: "double", color: { argb: "FF0F172A" } },
        };
        if (col === 5) {
          cell.numFmt = '"$"#,##0.00';
          cell.alignment = { vertical: "middle", horizontal: "right" };
        }
      });
      wsGastos.mergeCells(`A${gRow}:D${gRow}`);
    }

    wsGastos.columns = [
      { width: 14 }, // Fecha
      { width: 12 }, // Hora
      { width: 22 }, // Categoría
      { width: 36 }, // Concepto
      { width: 16 }, // Monto
      { width: 20 }, // Fondo
      { width: 24 }, // Proveedor
      { width: 22 }, // Folio
    ];

    // Descarga nativa en el navegador (si está en browser)
    const buffer = await workbook.xlsx.writeBuffer();
    if (typeof window !== "undefined" && typeof document !== "undefined") {
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const safeName = (empresaNombre || "Reporte").replace(/[\s/\\?%*:|"<>]/g, "_");
      const filename = `Corte_Z_${safeName}_${new Date().toISOString().slice(0, 10)}.xlsx`;

      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    return buffer;
  },

  /**
   * Método de compatibilidad para llamadas históricas o auditoría
   */
  exportarCorteExcel(
    resumen: ResumenCorteDiarioAuditoria,
    _ventas: VentaItemReporte[] = [],
    nombreTaller = "Cova"
  ) {
    const totalVentasCalc = Number(
      resumen.fiscal?.ventas_brutas ??
      (resumen as any)?.kpis?.ventas_brutas ??
      0
    );
    const totalCostosCalc = Number(
      resumen.fiscal?.costos_refacciones ??
      (resumen as any)?.kpis?.costos_refacciones_compras ??
      resumen.proveedores?.total_pagado_caja_chica ??
      0
    );
    const utilidadCalc = Number(
      resumen.fiscal?.ganancia_neta_total ??
      (resumen as any)?.kpis?.ganancia_bruta_taller ??
      (totalVentasCalc - totalCostosCalc)
    );

    // Convierte el resumen a la firma elegante
    const detalleTurno: TurnoDetalleCompleto = {
      ventas: [],
      gastos: [],
      totales: {
        totalVentas: totalVentasCalc,
        totalCostos: totalCostosCalc,
        utilidadEstimada: utilidadCalc,
        margenEstimadoPorcentaje: 0,
        totalGastos: Number(resumen.efectivo?.salidas_gastos || 0),
        cantidadOrdenes: 0,
        cantidadPartidas: 0,
      },
    };

    return this.exportarCorteExcelElegante({
      empresaNombre: nombreTaller,
      turnoId: resumen.turno_id,
      cierreData: {
        declaradoF1: resumen.efectivo?.cierre_declarado || 0,
        declaradoF2: 0,
        diferenciaF1: resumen.efectivo?.diferencia || 0,
        diferenciaF2: 0,
        remesa: resumen.efectivo?.remesa_retirada || 0,
        fondoSiguiente: resumen.efectivo?.fondo_siguiente || 0,
        resumenTeorico: {
          fondo1: {
            apertura: resumen.efectivo?.apertura_declarada || 0,
            entradasEfectivoPOS: resumen.efectivo?.entradas_ventas || 0,
            salidasGastos: resumen.efectivo?.salidas_gastos || 0,
            traspasosRecibidos: 0,
            traspasosEnviados: 0,
          },
          fondo2: { apertura: 0, traspasosEnviados: 0 },
          bancosSPEI: (resumen.bancos || []).map((b) => ({
            alias: b.alias,
            banco: b.banco,
            conteo: b.conteo,
            total: b.total,
          })),
          tarjetasTPV: {
            conteo: resumen.tarjetas?.conteo || 0,
            total: resumen.tarjetas?.total_bruto || 0,
          },
          totalVentasTurno: resumen.fiscal?.ventas_brutas || 0,
        },
      },
      detalleTurno,
    });
  },

  /**
   * Genera el libro Excel básico en formato SheetJS (para tests y compatibilidad interna)
   */
  generarLibroExcel(
    resumen: ResumenCorteDiarioAuditoria,
    ventas: VentaItemReporte[] = [],
    nombreTaller = "Cova Tires"
  ): XLSX.WorkBook {
    const workbook = XLSX.utils.book_new();
    const fechaAperturaStr = new Date(resumen.fecha_apertura).toLocaleDateString("es-MX", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    // 1. Detalle de Ventas
    const ventasRows: any[] = [
      [`${nombreTaller.toUpperCase()} - REPORTE DETALLADO DE VENTAS`],
      [`Fecha: ${fechaAperturaStr}`],
      [],
      ["No. Venta", "Cliente", "Vehículo", "Teléfono", "¿Factura?", "Métodos de Pago", "Descripción / Partida", "Cantidad", "P. Unitario ($)", "Importe ($)", "Proveedor", "Folio Ticket/Nota", "Fuente Pago Costo", "Costo Unitario ($)", "Costo Total ($)", "Comisión Tarjeta ($)", "Ganancia Neta ($)", "Garantía (Meses)", "Evidencia Comprobante"]
    ];

    if (ventas.length === 0) {
      ventasRows.push(["Sin ventas registradas en este turno."]);
    } else {
      ventas.forEach((v) => {
        ventasRows.push([v.noVenta, v.cliente, v.vehiculo, v.telefono, v.factura ? "SÍ" : "NO", v.metodosPago, "Servicio General", 1, v.totalVenta, v.totalVenta, "-", "-", "-", v.totalCostos, v.totalCostos, v.comisionBancaria, v.gananciaNeta, "-", "-"]);
      });
    }
    const wsVentas = XLSX.utils.aoa_to_sheet(ventasRows);
    XLSX.utils.book_append_sheet(workbook, wsVentas, "Detalle de Ventas");

    // 2. Corte y Conciliación
    const corteRows: any[] = [
      [`${nombreTaller.toUpperCase()} - CORTE DIARIO Y CONCILIACIÓN DE CAJA`],
      [`Fecha: ${fechaAperturaStr}`],
      [],
      ["--- 1. RESUMEN DE EFECTIVO (MOSTRADOR) ---", ""],
      ["Concepto", "Monto ($)"],
      ["Apertura Fondo 1", resumen.efectivo?.apertura_declarada || 0],
      ["Ingresos por Ventas", resumen.efectivo?.entradas_ventas || 0],
      ["Salidas / Gastos", resumen.efectivo?.salidas_gastos || 0],
      ["Saldo Teórico en Sistema", resumen.efectivo?.saldo_teorico || 0],
      ["Efectivo Declarado", resumen.efectivo?.cierre_declarado ?? "-"],
      ["Diferencia", resumen.efectivo?.diferencia ?? 0],
      ["Remesa Retirada", resumen.efectivo?.remesa_retirada || 0],
      ["Fondo Siguiente Turno", resumen.efectivo?.fondo_siguiente || 0],
    ];
    const wsCorte = XLSX.utils.aoa_to_sheet(corteRows);
    XLSX.utils.book_append_sheet(workbook, wsCorte, "Corte y Conciliación");

    // 3. Proveedores y CxP
    const provRows: any[] = [
      [`${nombreTaller.toUpperCase()} - HISTORIAL DE PROVEEDORES`],
      [`Fecha: ${fechaAperturaStr}`],
      [],
      ["Proveedor", "Folio Ticket/Nota", "Descripción", "Costo ($)", "Fuente de Pago", "Estatus Pago", "Estatus Garantía", "Evidencia Comprobante"]
    ];
    if (resumen.proveedores?.compras && resumen.proveedores.compras.length > 0) {
      resumen.proveedores.compras.forEach((c) => {
        provRows.push([c.proveedor, c.folio, c.descripcion, c.costo, c.fuente_pago, c.estatus_pago, c.estatus_garantia, c.evidencia_url || "-"]);
      });
    } else {
      provRows.push(["Sin compras a proveedores en este turno."]);
    }
    const wsProv = XLSX.utils.aoa_to_sheet(provRows);
    XLSX.utils.book_append_sheet(workbook, wsProv, "Proveedores y CxP");

    return workbook;
  },
};
