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
   * Genera el libro Excel con diseño editorial premium de 2 pestañas unificadas:
   * 1. Resumen de Corte y Balance (Dashboard Ejecutivo, Arqueo Físico y CxP Proveedores)
   * 2. Detalle de Transacciones (Ventas, Partidas con Desglose Proveedor/Caja/Fondo/Pendiente + Gastos Operativos)
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

    // Garantizar orden ascendente estricto por folio (1001 -> 1016)
    if (detalleTurno?.ventas) {
      detalleTurno.ventas.sort((a, b) => (Number(a.folio) || 0) - (Number(b.folio) || 0));
    }

    // Calcular salidas operativas y salidas por compras
    const totalGastosOperativos = (detalleTurno.gastos || []).reduce(
      (acc, g) => acc + Number(g.monto || 0),
      0
    );

    // Calcular salidas de refacciones pagadas de caja chica
    let totalRefaccionesCajaChica = 0;
    let totalRefaccionesFondo = 0;
    let totalRefaccionesPendiente = 0;

    // Agrupación dinámica por proveedor
    const provTotalesMap = new Map<
      string,
      { caja: number; fondo: number; pendiente: number; total: number }
    >();

    detalleTurno.ventas.forEach((v) => {
      v.partidas.forEach((item) => {
        const costo = Number(item.costoTotal || 0);
        const prov = item.proveedor?.trim() || (item.tipo === "Refacción" ? "Sin Proveedor" : null);

        let caja = Number(item.cajaMonto || 0);
        let fondo = Number(item.fondoMonto || 0);
        let pend = Number(item.pendienteMonto || 0);

        if (caja === 0 && fondo === 0 && pend === 0 && costo > 0) {
          if (item.fuentePago === "CAJA_CHICA") caja = costo;
          else if (["FONDO_RESERVA", "TRANSFERENCIA"].includes(item.fuentePago || "")) fondo = costo;
          else pend = costo;
        }

        totalRefaccionesCajaChica += caja;
        totalRefaccionesFondo += fondo;
        totalRefaccionesPendiente += pend;

        if (prov && costo > 0) {
          const cur = provTotalesMap.get(prov) || { caja: 0, fondo: 0, pendiente: 0, total: 0 };
          cur.caja += caja;
          cur.fondo += fondo;
          cur.pendiente += pend;
          cur.total += costo;
          provTotalesMap.set(prov, cur);
        }
      });
    });

    // Teórico F1 y F2 con cálculo de contingencia
    const f1Apertura = Number(teorico?.fondo1?.apertura ?? cierreData?.fondo1_apertura ?? 1000);
    const f1Entradas = Number(
      teorico?.fondo1?.entradasEfectivoPOS ??
      detalleTurno.ventas
        .filter((v) => v.metodoPago?.toLowerCase().includes("efectivo"))
        .reduce((acc, v) => acc + (v.totalVenta || 0), 0)
    );
    const f1SalidasCalculadas = totalRefaccionesCajaChica + totalGastosOperativos;
    const f1Salidas = Number(
      teorico?.fondo1?.salidasGastos && teorico.fondo1.salidasGastos > 0
        ? teorico.fondo1.salidasGastos
        : f1SalidasCalculadas
    );
    const f1TraspasosNetos = Number((teorico?.fondo1?.traspasosRecibidos || 0) - (teorico?.fondo1?.traspasosEnviados || 0));
    const teoricoF1Calculado = f1Apertura + f1Entradas - f1Salidas + f1TraspasosNetos;
    const teoricoF1 = Number(cierreData?.teoricoF1 != null ? cierreData.teoricoF1 : teoricoF1Calculado);

    const f2Apertura = Number(teorico?.fondo2?.apertura ?? cierreData?.fondo2_apertura ?? f2Declarado ?? 0);
    const f2TraspasosNetos = -Number(teorico?.fondo2?.traspasosEnviados || 0);
    const teoricoF2Calculado = f2Apertura + f2TraspasosNetos;
    const teoricoF2 = Number(cierreData?.teoricoF2 != null ? cierreData.teoricoF2 : (teoricoF2Calculado || f2Declarado));

    const totalVentasTurno = Number(detalleTurno.totales.totalVentas || 0);
    const totalCostosMercancia = Number(detalleTurno.totales.totalCostos || 0);
    const utilidadTurno = totalVentasTurno - totalCostosMercancia - totalGastosOperativos;
    const margenTurnoPct = totalVentasTurno > 0 ? (utilidadTurno / totalVentasTurno) * 100 : 0;

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
    // HOJA 1: RESUMEN DE CORTE Y BALANCE (Dashboard Ejecutivo)
    // =========================================================================
    const wsResumen = workbook.addWorksheet("Resumen de Corte y Balance", {
      properties: { tabColor: { argb: "FF1E3A8A" } },
    });

    // Fila 1: Título Principal
    wsResumen.mergeCells("A1:G1");
    const rTitle1 = wsResumen.getCell("A1");
    rTitle1.value = `${empresaNombre.toUpperCase()} - RESUMEN EJECUTIVO Y BALANCE DE CORTE`;
    rTitle1.font = { name: "Segoe UI", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
    rTitle1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
    rTitle1.alignment = { vertical: "middle", horizontal: "center" };
    wsResumen.getRow(1).height = 34;

    // Fila 2: Metadatos
    wsResumen.mergeCells("A2:G2");
    const rMeta1 = wsResumen.getCell("A2");
    rMeta1.value = `Sucursal: ${sucursalNombre}   |   Fecha de Cierre: ${fechaTurno}   |   Turno: #${String(turnoId).substring(0, 8).toUpperCase()}   |   Responsable: ${cajeroNombre}`;
    rMeta1.font = { name: "Segoe UI", size: 10, color: { argb: "FFCBD5E1" } };
    rMeta1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
    rMeta1.alignment = { vertical: "middle", horizontal: "center" };
    wsResumen.getRow(2).height = 20;

    // Fila 3: Espacio
    wsResumen.getRow(3).height = 8;

    // Fila 4: Tarjetas KPI Ejecutivos
    wsResumen.mergeCells("A4:B4");
    wsResumen.getCell("A4").value = `Total Cobrado en Turno\n$${totalVentasTurno.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;
    wsResumen.getCell("A4").font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF1E3A8A" } };
    wsResumen.getCell("A4").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFF6FF" } };
    wsResumen.getCell("A4").alignment = { vertical: "middle", horizontal: "center", wrapText: true };

    wsResumen.mergeCells("C4:D4");
    wsResumen.getCell("C4").value = `Salidas Caja Chica (Mostrador)\n-$${f1Salidas.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;
    wsResumen.getCell("C4").font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF991B1B" } };
    wsResumen.getCell("C4").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF2F2" } };
    wsResumen.getCell("C4").alignment = { vertical: "middle", horizontal: "center", wrapText: true };

    wsResumen.mergeCells("E4:F4");
    wsResumen.getCell("E4").value = `Compras a Crédito / Pasivos\n$${totalRefaccionesPendiente.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;
    wsResumen.getCell("E4").font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF92400E" } };
    wsResumen.getCell("E4").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFBEB" } };
    wsResumen.getCell("E4").alignment = { vertical: "middle", horizontal: "center", wrapText: true };

    wsResumen.getCell("G4").value = `Ganancia Neta Turno\n$${utilidadTurno.toLocaleString("es-MX", { minimumFractionDigits: 2 })} (${margenTurnoPct.toFixed(1)}%)`;
    wsResumen.getCell("G4").font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF166534" } };
    wsResumen.getCell("G4").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0FDF4" } };
    wsResumen.getCell("G4").alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    wsResumen.getRow(4).height = 36;

    let resRow = 6;

    // =========================================================================
    // SECCIÓN 1: DESGLOSE DE COBROS POR MÉTODO
    // =========================================================================
    wsResumen.mergeCells(`A${resRow}:G${resRow}`);
    const secCobrosTitle = wsResumen.getCell(`A${resRow}`);
    secCobrosTitle.value = "1. RESUMEN DE COBROS POR MÉTODO DE PAGO";
    secCobrosTitle.font = { name: "Segoe UI", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    secCobrosTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
    secCobrosTitle.alignment = { vertical: "middle", horizontal: "left" };
    wsResumen.getRow(resRow).height = 24;
    resRow++;

    const rCobrosHeader = wsResumen.getRow(resRow);
    rCobrosHeader.values = [
      "Canal / Método",
      "Detalle / Cuenta / Terminal",
      "No. Transacciones",
      "Monto Bruto ($)",
      "Comisiones ($)",
      "Neto Acreditado ($)",
      "Participación (%)",
    ];
    rCobrosHeader.height = 24;
    rCobrosHeader.eachCell((cell) => {
      cell.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF334155" } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = headerBorder;
    });
    resRow++;

    // Efectivo
    const conteoEfectivo = detalleTurno.ventas.filter((v) =>
      v.metodoPago?.toLowerCase().includes("efectivo")
    ).length;
    const pctEfectivo = totalVentasTurno > 0 ? f1Entradas / totalVentasTurno : 0;
    const rEf = wsResumen.getRow(resRow);
    rEf.values = [
      "Efectivo Mostrador",
      "Gaveta de Cobro (Caja Chica)",
      conteoEfectivo,
      f1Entradas,
      0,
      f1Entradas,
      pctEfectivo,
    ];
    rEf.height = 22;
    rEf.eachCell((c, col) => {
      c.font = { name: "Segoe UI", size: 9.5 };
      c.border = softBorder;
      if (col === 3) c.alignment = { horizontal: "center" };
      else if ([4, 5, 6].includes(col)) {
        c.numFmt = '"$"#,##0.00';
        c.alignment = { horizontal: "right" };
      } else if (col === 7) {
        c.numFmt = "0.0%";
        c.alignment = { horizontal: "right" };
      }
    });
    resRow++;

    // Bancos SPEI
    const bancosList = teorico?.bancosSPEI || [];
    if (bancosList.length > 0) {
      bancosList.forEach((b: any) => {
        const monto = Number(b.total || 0);
        if (monto > 0) {
          const rB = wsResumen.getRow(resRow);
          const pct = totalVentasTurno > 0 ? monto / totalVentasTurno : 0;
          rB.values = [
            `Transferencia SPEI (${b.banco})`,
            b.alias || "Cuenta Operativa",
            Number(b.conteo || 0),
            monto,
            0,
            monto,
            pct,
          ];
          rB.height = 22;
          rB.eachCell((c, col) => {
            c.font = { name: "Segoe UI", size: 9.5 };
            c.border = softBorder;
            if (col === 3) c.alignment = { horizontal: "center" };
            else if ([4, 5, 6].includes(col)) {
              c.numFmt = '"$"#,##0.00';
              c.alignment = { horizontal: "right" };
            } else if (col === 7) {
              c.numFmt = "0.0%";
              c.alignment = { horizontal: "right" };
            }
          });
          resRow++;
        }
      });
    }

    // Tarjetas TPV / Mercado Pago con desglose por modalidad (1 Exhibición, 6 MSI, etc.)
    const totalTarjetas = Number(teorico?.tarjetasTPV?.total || 0);
    const conteoTarjetas = Number(teorico?.tarjetasTPV?.conteo || 0);
    const comisionesTarjetas = Number(
      teorico?.tarjetasTPV?.totalComisiones ||
      teorico?.tarjetasTPV?.comisionesRetenidas ||
      detalleTurno.ventas.reduce((acc, v) => acc + (v.comisionPasarela || 0), 0) ||
      0
    );
    const netoTarjetas = totalTarjetas - comisionesTarjetas;

    const desgloseTPV = (teorico?.tarjetasTPV?.desglose || []) as any[];
    if (desgloseTPV.length > 0) {
      desgloseTPV.forEach((d) => {
        const bruto = Number(d.bruto || 0);
        const comision = Number(d.comision || 0);
        const neto = Number(d.neto || bruto - comision);
        const pct = totalVentasTurno > 0 ? bruto / totalVentasTurno : 0;
        const rTpv = wsResumen.getRow(resRow);
        rTpv.values = [
          "Tarjetas / Terminal TPV",
          `${d.metodo || d.proveedor || "Terminal"} (${d.modalidad || "Point"})`,
          Number(d.conteo || 1),
          bruto,
          comision,
          neto,
          pct,
        ];
        rTpv.height = 22;
        rTpv.eachCell((c, col) => {
          c.font = { name: "Segoe UI", size: 9.5 };
          c.border = softBorder;
          if (col === 3) c.alignment = { horizontal: "center" };
          else if ([4, 5, 6].includes(col)) {
            c.numFmt = '"$"#,##0.00';
            c.alignment = { horizontal: "right" };
          } else if (col === 7) {
            c.numFmt = "0.0%";
            c.alignment = { horizontal: "right" };
          }
        });
        resRow++;
      });
    } else if (totalTarjetas > 0) {
      const rTpv = wsResumen.getRow(resRow);
      const pctTpv = totalVentasTurno > 0 ? totalTarjetas / totalVentasTurno : 0;
      rTpv.values = [
        "Tarjetas / Terminal TPV",
        "Terminal Mercado Pago Point",
        conteoTarjetas,
        totalTarjetas,
        comisionesTarjetas,
        netoTarjetas,
        pctTpv,
      ];
      rTpv.height = 22;
      rTpv.eachCell((c, col) => {
        c.font = { name: "Segoe UI", size: 9.5 };
        c.border = softBorder;
        if (col === 3) c.alignment = { horizontal: "center" };
        else if ([4, 5, 6].includes(col)) {
          c.numFmt = '"$"#,##0.00';
          c.alignment = { horizontal: "right" };
        } else if (col === 7) {
          c.numFmt = "0.0%";
          c.alignment = { horizontal: "right" };
        }
      });
      resRow++;
    }

    // Fila Total de Cobros
    const rTotCobros = wsResumen.getRow(resRow);
    rTotCobros.values = [
      "TOTAL COBROS DEL TURNO",
      "",
      detalleTurno.ventas.length,
      totalVentasTurno,
      comisionesTarjetas,
      totalVentasTurno - comisionesTarjetas,
      1.0,
    ];
    rTotCobros.height = 24;
    rTotCobros.eachCell((c, col) => {
      c.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF0F172A" } };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
      c.border = {
        top: { style: "thin", color: { argb: "FF0F172A" } },
        bottom: { style: "double", color: { argb: "FF0F172A" } },
      };
      if (col === 3) c.alignment = { horizontal: "center" };
      else if ([4, 5, 6].includes(col)) {
        c.numFmt = '"$"#,##0.00';
        c.alignment = { horizontal: "right" };
      } else if (col === 7) {
        c.numFmt = "0.0%";
        c.alignment = { horizontal: "right" };
      }
    });
    wsResumen.mergeCells(`A${resRow}:B${resRow}`);
    resRow += 2;

    // =========================================================================
    // SECCIÓN 2: BALANCE Y ARQUEO DE EFECTIVO EN CAJA CHICA (MOSTRADOR)
    // =========================================================================
    wsResumen.mergeCells(`A${resRow}:G${resRow}`);
    const secArqueoTitle = wsResumen.getCell(`A${resRow}`);
    secArqueoTitle.value = "2. BALANCE Y ARQUEO FÍSICO DE CAJA CHICA (MOSTRADOR)";
    secArqueoTitle.font = { name: "Segoe UI", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    secArqueoTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF065F46" } };
    secArqueoTitle.alignment = { vertical: "middle", horizontal: "left" };
    wsResumen.getRow(resRow).height = 24;
    resRow++;

    const rArqueoHeader = wsResumen.getRow(resRow);
    rArqueoHeader.values = [
      "Fondo / Concepto",
      "Saldo Apertura ($)",
      "Cobros Efectivo ($)",
      "Salidas Totales ($)",
      "Teórico Gaveta ($)",
      "Físico Contado ($)",
      "Diferencia ($) / Estatus",
    ];
    rArqueoHeader.height = 24;
    rArqueoHeader.eachCell((cell) => {
      cell.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF047857" } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = headerBorder;
    });
    resRow++;

    const rFondo1 = wsResumen.getRow(resRow);
    rFondo1.values = [
      "Fondo 1: Caja Chica Mostrador",
      f1Apertura,
      f1Entradas,
      f1Salidas,
      teoricoF1,
      f1Declarado,
      difF1 === 0 ? "$0.00 (Cuadrado)" : `$${difF1.toFixed(2)} (${difF1 > 0 ? "Sobrante" : "Faltante"})`,
    ];
    rFondo1.height = 22;
    rFondo1.eachCell((c, col) => {
      c.font = { name: "Segoe UI", size: 9.5 };
      c.border = softBorder;
      if ([2, 3, 4, 5, 6].includes(col)) {
        c.numFmt = '"$"#,##0.00';
        c.alignment = { horizontal: "right" };
      } else if (col === 7) {
        c.alignment = { horizontal: "center" };
        c.font = {
          name: "Segoe UI",
          size: 9.5,
          bold: true,
          color: { argb: Math.abs(difF1) <= 10 ? "FF166534" : "FFDC2626" },
        };
      }
    });
    resRow++;

    // Desglose de Salidas de Caja Chica
    const rSubSalidas = wsResumen.getRow(resRow);
    rSubSalidas.values = [
      "  ↳ Desglose Salidas Mostrador:",
      `Refacciones Proveedores: $${totalRefaccionesCajaChica.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`,
      `Gastos Operativos: $${totalGastosOperativos.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`,
      `Total Salidas: $${f1Salidas.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`,
      "",
      `Fondo Siguiente: $${fondoSig.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`,
      `Remesa Retirada: $${remesa.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`,
    ];
    rSubSalidas.height = 20;
    rSubSalidas.eachCell((c) => {
      c.font = { name: "Segoe UI", size: 8.5, italic: true, color: { argb: "FF475569" } };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
      c.border = softBorder;
    });
    resRow += 2;

    // =========================================================================
    // SECCIÓN 3: CONSOLIDADO DE PROVEEDORES DEL TURNO (CxP Y CAJA CHICA)
    // =========================================================================
    wsResumen.mergeCells(`A${resRow}:G${resRow}`);
    const secProvTitle = wsResumen.getCell(`A${resRow}`);
    secProvTitle.value = "3. CONSOLIDADO DE COMPRAS Y PAGOS A PROVEEDORES DEL TURNO";
    secProvTitle.font = { name: "Segoe UI", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    secProvTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF92400E" } };
    secProvTitle.alignment = { vertical: "middle", horizontal: "left" };
    wsResumen.getRow(resRow).height = 24;
    resRow++;

    const rProvHeader = wsResumen.getRow(resRow);
    rProvHeader.values = [
      "Proveedor",
      "Pagado Caja Chica ($)",
      "Pagado Fondo Reserva ($)",
      "Crédito Pendiente ($)",
      "Costo Total Mercancía ($)",
      "Estatus Financiero",
      "Tipo / Observación",
    ];
    rProvHeader.height = 24;
    rProvHeader.eachCell((cell) => {
      cell.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF78350F" } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = headerBorder;
    });
    resRow++;

    if (provTotalesMap.size === 0) {
      wsResumen.mergeCells(`A${resRow}:G${resRow}`);
      const emptyP = wsResumen.getCell(`A${resRow}`);
      emptyP.value = "Sin compras de refacciones ni llantas en este turno.";
      emptyP.font = { name: "Segoe UI", size: 9.5, italic: true, color: { argb: "FF64748B" } };
      emptyP.alignment = { horizontal: "center" };
      resRow++;
    } else {
      provTotalesMap.forEach((tot, provName) => {
        const rP = wsResumen.getRow(resRow);
        const esInventario = provName.toLowerCase().includes("inventario") || provName.toLowerCase().includes("sh");
        const statusLabel = tot.pendiente > 0
          ? (tot.caja > 0 ? "Parcialmente Pagado" : "Pendiente de Pago")
          : "Liquidado en Turno";
        const tipoLabel = esInventario ? "Inventario Cova (Consignación)" : "Compra Externa";

        rP.values = [
          provName,
          tot.caja,
          tot.fondo,
          tot.pendiente,
          tot.total,
          statusLabel,
          tipoLabel,
        ];
        rP.height = 22;
        rP.eachCell((c, col) => {
          c.font = { name: "Segoe UI", size: 9.5 };
          c.border = softBorder;
          if ([2, 3, 4, 5].includes(col)) {
            c.numFmt = '"$"#,##0.00';
            c.alignment = { horizontal: "right" };
          } else if ([6, 7].includes(col)) {
            c.alignment = { horizontal: "center" };
            if (col === 6 && tot.pendiente > 0) {
              c.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FFB45309" } };
            }
          }
        });
        resRow++;
      });

      // Total Proveedores
      const rTotProv = wsResumen.getRow(resRow);
      rTotProv.values = [
        "TOTAL COSTOS PROVEEDORES:",
        totalRefaccionesCajaChica,
        totalRefaccionesFondo,
        totalRefaccionesPendiente,
        totalCostosMercancia,
        "",
        "",
      ];
      rTotProv.height = 24;
      rTotProv.eachCell((c, col) => {
        c.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF0F172A" } };
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
        c.border = {
          top: { style: "thin", color: { argb: "FF0F172A" } },
          bottom: { style: "double", color: { argb: "FF0F172A" } },
        };
        if ([2, 3, 4, 5].includes(col)) {
          c.numFmt = '"$"#,##0.00';
          c.alignment = { horizontal: "right" };
        }
      });
      resRow += 3;
    }

    // Cuadro de Firmas
    wsResumen.getCell(`B${resRow}`).value = "____________________________________";
    wsResumen.getCell(`F${resRow}`).value = "____________________________________";
    wsResumen.getCell(`B${resRow}`).alignment = { horizontal: "center" };
    wsResumen.getCell(`F${resRow}`).alignment = { horizontal: "center" };
    resRow++;

    wsResumen.getCell(`B${resRow}`).value = `Cajero(a) Entrega Turno\n${cajeroNombre}`;
    wsResumen.getCell(`F${resRow}`).value = "Administrador / Supervisor\nRecepción y Validación de Fondos";
    wsResumen.getCell(`B${resRow}`).font = { name: "Segoe UI", size: 9.5, bold: true };
    wsResumen.getCell(`F${resRow}`).font = { name: "Segoe UI", size: 9.5, bold: true };
    wsResumen.getCell(`B${resRow}`).alignment = { horizontal: "center", wrapText: true };
    wsResumen.getCell(`F${resRow}`).alignment = { horizontal: "center", wrapText: true };
    wsResumen.getRow(resRow).height = 30;

    wsResumen.columns = [
      { width: 34 }, // A: Concepto / Proveedor
      { width: 24 }, // B: Apertura / Caja Chica
      { width: 22 }, // C: Entradas / Fondo
      { width: 22 }, // D: Salidas / Pendiente
      { width: 22 }, // E: Teórico / Costo Total
      { width: 22 }, // F: Físico / Estatus
      { width: 26 }, // G: Diferencia / Tipo
    ];

    // =========================================================================
    // HOJA 2: DETALLE UNIFICADO DE TRANSACCIONES (Ventas y Gastos Integrados)
    // =========================================================================
    const wsDetalle = workbook.addWorksheet("Detalle de Transacciones", {
      views: [{ state: "frozen", ySplit: 5 }],
      properties: { tabColor: { argb: "FF059669" } },
    });

    // Fila 1: Título Principal
    wsDetalle.mergeCells("A1:T1");
    const titleCell2 = wsDetalle.getCell("A1");
    titleCell2.value = `${empresaNombre.toUpperCase()} - DETALLE UNIFICADO DE VENTAS, PROVEEDORES Y GASTOS`;
    titleCell2.font = { name: "Segoe UI", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
    titleCell2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF064E3B" } };
    titleCell2.alignment = { vertical: "middle", horizontal: "center" };
    wsDetalle.getRow(1).height = 34;

    // Fila 2: Metadatos
    wsDetalle.mergeCells("A2:T2");
    const metaCell2 = wsDetalle.getCell("A2");
    metaCell2.value = `Sucursal: ${sucursalNombre}   |   Fecha: ${fechaTurno}   |   Turno: #${String(turnoId).substring(0, 8).toUpperCase()}   |   Total Cobrado: $${totalVentasTurno.toLocaleString("es-MX", { minimumFractionDigits: 2 })}   |   Salidas Caja Chica: $${f1Salidas.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;
    metaCell2.font = { name: "Segoe UI", size: 10, color: { argb: "FFD1FAE5" } };
    metaCell2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF065F46" } };
    metaCell2.alignment = { vertical: "middle", horizontal: "center" };
    wsDetalle.getRow(2).height = 20;

    // Fila 4: Banner Sección 1 - Ventas
    wsDetalle.mergeCells("A4:T4");
    const secVentasBanner = wsDetalle.getCell("A4");
    secVentasBanner.value = "1. DESGLOSE DE ÓRDENES DE SERVICIO Y COSTOS POR PROVEEDOR";
    secVentasBanner.font = { name: "Segoe UI", size: 10.5, bold: true, color: { argb: "FFFFFFFF" } };
    secVentasBanner.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
    secVentasBanner.alignment = { vertical: "middle", horizontal: "left" };
    wsDetalle.getRow(4).height = 24;

    // Fila 5: Encabezados de Columna (20 Columnas con AutoFiltro nativo)
    const columnasDetalle = [
      "No. Orden",
      "Hora",
      "Cliente",
      "Teléfono",
      "Vehículo",
      "Placas",
      "Tipo",
      "Concepto / Descripción",
      "Cant.",
      "P. Unitario ($)",
      "Importe ($)",
      "Método de Cobro",
      "Comisión TPV ($)",
      "Neto Pasarela ($)",
      "Proveedor",
      "Caja Chica ($)",
      "Fondo ($)",
      "Pendiente ($)",
      "Utilidad Real ($)",
      "Folio Ticket / Garantía",
    ];

    const headerRowDetalle = wsDetalle.getRow(5);
    headerRowDetalle.values = columnasDetalle;
    headerRowDetalle.height = 28;
    headerRowDetalle.eachCell((cell) => {
      cell.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: false };
      cell.border = headerBorder;
    });

    let curRow = 6;
    if (detalleTurno.ventas.length === 0) {
      wsDetalle.mergeCells(`A6:T6`);
      const emptyCell = wsDetalle.getCell("A6");
      emptyCell.value = "Sin órdenes de servicio cobradas en este turno.";
      emptyCell.font = { name: "Segoe UI", size: 10, italic: true, color: { argb: "FF64748B" } };
      emptyCell.alignment = { vertical: "middle", horizontal: "center" };
      wsDetalle.getRow(6).height = 24;
      curRow = 7;
    } else {
      detalleTurno.ventas.forEach((v, vIdx) => {
        const isAlternateOrder = vIdx % 2 === 1;
        const rowBg = isAlternateOrder ? "FFF8FAFC" : "FFFFFFFF";
        const horaStr = new Date(v.fechaPago).toLocaleTimeString("es-MX", {
          hour: "2-digit",
          minute: "2-digit",
        });

        v.partidas.forEach((item) => {
          const r = wsDetalle.getRow(curRow);

          const costo = Number(item.costoTotal || 0);
          let caja = Number(item.cajaMonto || 0);
          let fondo = Number(item.fondoMonto || 0);
          let pend = Number(item.pendienteMonto || 0);

          if (caja === 0 && fondo === 0 && pend === 0 && costo > 0) {
            if (item.fuentePago === "CAJA_CHICA") caja = costo;
            else if (["FONDO_RESERVA", "TRANSFERENCIA"].includes(item.fuentePago || "")) fondo = costo;
            else pend = costo;
          }

          const comisionItem = Number(item.comisionMonto || 0);
          const netoPasarelaItem = Number((item.importe - comisionItem).toFixed(2));
          const utilidadRealItem =
            item.utilidadReal != null
              ? Number(item.utilidadReal)
              : Number((item.importe - costo - comisionItem).toFixed(2));

          // Todas las celdas van auto-contenidas para permitir ordenamiento y autofiltros nativos en Excel
          r.values = [
            v.folioStr,
            horaStr,
            v.clienteNombre,
            v.clienteTelefono,
            v.vehiculoDesc,
            v.placas,
            item.tipo,
            item.descripcion,
            item.cantidad,
            item.precioUnitario,
            item.importe,
            v.metodoPago,
            comisionItem > 0 ? comisionItem : 0,
            netoPasarelaItem,
            item.proveedor || "-",
            caja > 0 ? caja : "",
            fondo > 0 ? fondo : "",
            pend > 0 ? pend : "",
            utilidadRealItem,
            item.folioTicketProv
              ? `Nota #${item.folioTicketProv}${item.mesesGarantia ? ` (${item.mesesGarantia}m)` : ""}`
              : "-",
          ];

          r.height = 22;
          r.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            cell.font = { name: "Segoe UI", size: 9.5, color: { argb: "FF1E293B" } };
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
            cell.border = softBorder;

            if ([1, 2, 6, 7, 9].includes(colNumber)) {
              cell.alignment = { vertical: "middle", horizontal: "center" };
            } else if ([10, 11, 13, 14, 16, 17, 18, 19].includes(colNumber)) {
              cell.numFmt = '"$"#,##0.00';
              cell.alignment = { vertical: "middle", horizontal: "right" };
            } else {
              cell.alignment = { vertical: "middle", horizontal: "left" };
            }

            // Resaltar No. Orden y Placas
            if (colNumber === 1) {
              cell.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FF1E40AF" } };
            }
            if (colNumber === 6) {
              cell.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FF0F172A" } };
            }
            // Resaltar Comisiones TPV
            if (colNumber === 13 && Number(cell.value) > 0) {
              cell.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FFDC2626" } };
            }
            // Resaltar Pendiente
            if (colNumber === 18 && cell.value) {
              cell.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FFB45309" } };
            }
          });

          curRow++;
        });
      });

      const filaFinalVentas = curRow - 1;
      // AutoFiltro nativo de Excel que cubre exclusivamente la tabla de ventas (A5 a T...)
      wsDetalle.autoFilter = `A5:T${filaFinalVentas}`;

      // Fila de Totales de Ventas
      const totalRowVentas = wsDetalle.getRow(curRow);
      const totalComisionesTurno = comisionesTarjetas;
      const totalNetoTurno = totalVentasTurno - totalComisionesTurno;
      const totalUtilidadRealTurno = utilidadTurno - totalComisionesTurno;

      totalRowVentas.values = [
        "SUBTOTAL ÓRDENES Y VENTAS",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        detalleTurno.totales.cantidadPartidas,
        "",
        totalVentasTurno,
        "",
        totalComisionesTurno,
        totalNetoTurno,
        "",
        totalRefaccionesCajaChica,
        totalRefaccionesFondo,
        totalRefaccionesPendiente,
        totalUtilidadRealTurno,
        "",
      ];
      totalRowVentas.height = 26;
      totalRowVentas.eachCell((cell, colNumber) => {
        cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF0F172A" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
        cell.border = {
          top: { style: "thin", color: { argb: "FF0F172A" } },
          bottom: { style: "double", color: { argb: "FF0F172A" } },
        };

        if ([11, 13, 14, 16, 17, 18, 19].includes(colNumber)) {
          cell.numFmt = '"$"#,##0.00';
          cell.alignment = { vertical: "middle", horizontal: "right" };
        } else if (colNumber === 9) {
          cell.alignment = { vertical: "middle", horizontal: "center" };
        } else if (colNumber === 1) {
          cell.alignment = { vertical: "middle", horizontal: "left" };
        }
      });
      wsDetalle.mergeCells(`A${curRow}:H${curRow}`);
      curRow += 2;
    }

    // =========================================================================
    // SECCIÓN 2: GASTOS OPERATIVOS Y SALIDAS DE CAJA CHICA
    // =========================================================================
    wsDetalle.mergeCells(`A${curRow}:T${curRow}`);
    const secGastosBanner = wsDetalle.getCell(`A${curRow}`);
    secGastosBanner.value = "2. GASTOS OPERATIVOS Y SALIDAS DE CAJA CHICA (NO VINCULADOS A ÓRDENES)";
    secGastosBanner.font = { name: "Segoe UI", size: 10.5, bold: true, color: { argb: "FFFFFFFF" } };
    secGastosBanner.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF92400E" } };
    secGastosBanner.alignment = { vertical: "middle", horizontal: "left" };
    wsDetalle.getRow(curRow).height = 24;
    curRow++;

    const rGHeader = wsDetalle.getRow(curRow);
    rGHeader.values = [
      "Fecha",
      "Hora",
      "Categoría",
      "Concepto / Justificación",
      "",
      "",
      "",
      "",
      "",
      "",
      "Monto Salida ($)",
      "Fondo de Salida",
      "Proveedor / Beneficiario",
      "",
      "Comprobante / Folio / Notas",
      "",
      "",
      "",
      "",
      "",
    ];
    rGHeader.height = 24;
    rGHeader.eachCell((cell, col) => {
      cell.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF78350F" } };
      cell.border = headerBorder;
      if ([1, 2, 3, 12, 15].includes(col)) cell.alignment = { vertical: "middle", horizontal: "center" };
      else if (col === 11) cell.alignment = { vertical: "middle", horizontal: "right" };
      else cell.alignment = { vertical: "middle", horizontal: "left" };
    });
    wsDetalle.mergeCells(`D${curRow}:J${curRow}`);
    wsDetalle.mergeCells(`M${curRow}:N${curRow}`);
    wsDetalle.mergeCells(`O${curRow}:T${curRow}`);
    curRow++;

    if (detalleTurno.gastos.length === 0) {
      wsDetalle.mergeCells(`A${curRow}:T${curRow}`);
      const emptyG = wsDetalle.getCell(`A${curRow}`);
      emptyG.value = "Sin movimientos de gastos menores en este turno.";
      emptyG.font = { name: "Segoe UI", size: 9.5, italic: true, color: { argb: "FF64748B" } };
      emptyG.alignment = { vertical: "middle", horizontal: "center" };
      wsDetalle.getRow(curRow).height = 22;
      curRow++;
    } else {
      detalleTurno.gastos.forEach((g, gIdx) => {
        const rowBg = gIdx % 2 === 1 ? "FFF8FAFC" : "FFFFFFFF";
        const r = wsDetalle.getRow(curRow);
        r.values = [
          g.fecha,
          g.hora,
          g.categoria,
          g.concepto,
          "",
          "",
          "",
          "",
          "",
          "",
          g.monto,
          g.fondoNombre,
          g.proveedor || "-",
          "",
          g.folioTicket ? `#${g.folioTicket}` : "-",
          "",
          "",
          "",
          "",
          "",
        ];
        r.height = 22;
        r.eachCell((cell, col) => {
          cell.font = { name: "Segoe UI", size: 9.5, color: { argb: "FF1E293B" } };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
          cell.border = softBorder;
          if ([1, 2, 3, 12, 15].includes(col)) cell.alignment = { vertical: "middle", horizontal: "center" };
          else if (col === 11) {
            cell.numFmt = '"$"#,##0.00';
            cell.alignment = { vertical: "middle", horizontal: "right" };
            cell.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FFDC2626" } };
          } else {
            cell.alignment = { vertical: "middle", horizontal: "left" };
          }
        });
        wsDetalle.mergeCells(`D${curRow}:J${curRow}`);
        wsDetalle.mergeCells(`M${curRow}:N${curRow}`);
        wsDetalle.mergeCells(`O${curRow}:T${curRow}`);
        curRow++;
      });
    }

    // Fila Total Gastos Operativos
    const rTotG = wsDetalle.getRow(curRow);
    rTotG.values = [
      "TOTAL GASTOS OPERATIVOS:",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      totalGastosOperativos,
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
    ];
    rTotG.height = 24;
    rTotG.eachCell((cell, col) => {
      cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF0F172A" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
      cell.border = {
        top: { style: "thin", color: { argb: "FF0F172A" } },
        bottom: { style: "double", color: { argb: "FF0F172A" } },
      };
      if (col === 11) {
        cell.numFmt = '"$"#,##0.00';
        cell.alignment = { vertical: "middle", horizontal: "right" };
      }
    });
    wsDetalle.mergeCells(`A${curRow}:J${curRow}`);
    curRow += 2;

    // =========================================================================
    // SECCIÓN 3: CONCILIACIÓN MATEMÁTICA DE CAJA CHICA (MOSTRADOR)
    // =========================================================================
    wsDetalle.mergeCells(`A${curRow}:T${curRow}`);
    const secConcilBanner = wsDetalle.getCell(`A${curRow}`);
    secConcilBanner.value = "3. CONCILIACIÓN FINAL DE EFECTIVO EN CAJA CHICA (MOSTRADOR)";
    secConcilBanner.font = { name: "Segoe UI", size: 10.5, bold: true, color: { argb: "FFFFFFFF" } };
    secConcilBanner.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF047857" } };
    secConcilBanner.alignment = { vertical: "middle", horizontal: "left" };
    wsDetalle.getRow(curRow).height = 24;
    curRow++;

    const concilItems = [
      ["(+) Fondo de Apertura Inicial en Gaveta", f1Apertura, "Fondo base entregado al iniciar jornada"],
      ["(+) Cobros en Efectivo de Ventas del Turno", f1Entradas, `${conteoEfectivo} ventas cobradas en efectivo`],
      ["(-) Salidas de Caja Chica por Refacciones a Proveedores", -totalRefaccionesCajaChica, "Blue, Llantas Plus, Omar, Dar, Pat, San"],
      ["(-) Gastos Operativos Menores de Mostrador", -totalGastosOperativos, "Consumibles, alimentos o retiros autorizados (REC)"],
      ["(=) Saldo Teórico Final que Debe Haber en Gaveta", teoricoF1, "Efectivo físico esperado por el sistema"],
      ["(=) Arqueo Físico Declarado por Cajero(a)", f1Declarado, "Conteo ciego de billetes y monedas"],
      ["(=) Diferencia / Descuadre de Caja", difF1, difF1 === 0 ? "Cuadrado Perfecto ($0.00)" : (difF1 > 0 ? "Sobrante de efectivo" : "Faltante de efectivo")],
      ["↳ Destino: Fondo Base que se Deja para el Siguiente Turno", fondoSig, "Permanece en gaveta"],
      ["↳ Destino: Remesa en Efectivo Retirada", remesa, "Entregada a supervisor / caja fuerte"],
    ];

    concilItems.forEach(([label, monto, obs], idx) => {
      const r = wsDetalle.getRow(curRow);
      r.values = [label, "", "", "", "", "", "", "", "", "", monto, obs, "", "", "", "", "", "", "", ""];
      r.height = 22;
      r.eachCell((c, col) => {
        c.font = { name: "Segoe UI", size: 9.5 };
        c.border = softBorder;
        if (col === 1) {
          c.font = { name: "Segoe UI", size: 9.5, bold: idx === 4 || idx === 5 || idx === 6 };
          c.alignment = { vertical: "middle", horizontal: "left" };
        } else if (col === 11) {
          c.numFmt = '"$"#,##0.00';
          c.alignment = { vertical: "middle", horizontal: "right" };
          c.font = {
            name: "Segoe UI",
            size: 10,
            bold: true,
            color: {
              argb:
                idx === 6
                  ? (Number(monto) === 0 ? "FF166534" : "FFDC2626")
                  : idx === 4 || idx === 5
                  ? "FF1E3A8A"
                  : Number(monto) < 0
                  ? "FF991B1B"
                  : "FF0F172A",
            },
          };
        } else if (col === 12) {
          c.font = { name: "Segoe UI", size: 8.5, italic: true, color: { argb: "FF64748B" } };
          c.alignment = { vertical: "middle", horizontal: "left" };
        }
      });
      wsDetalle.mergeCells(`A${curRow}:J${curRow}`);
      wsDetalle.mergeCells(`L${curRow}:T${curRow}`);
      curRow++;
    });

    // Anchos de columna Hoja 2 (20 Columnas perfectamente dimensionadas)
    wsDetalle.columns = [
      { width: 13 }, // 1 (A): No. Orden
      { width: 10 }, // 2 (B): Hora
      { width: 25 }, // 3 (C): Cliente
      { width: 15 }, // 4 (D): Teléfono
      { width: 24 }, // 5 (E): Vehículo
      { width: 13 }, // 6 (F): Placas
      { width: 12 }, // 7 (G): Tipo
      { width: 34 }, // 8 (H): Concepto / Descripción
      { width: 8 },  // 9 (I): Cant.
      { width: 14 }, // 10 (J): P. Unitario ($)
      { width: 15 }, // 11 (K): Importe ($)
      { width: 26 }, // 12 (L): Método de Cobro
      { width: 15 }, // 13 (M): Comisión TPV ($)
      { width: 16 }, // 14 (N): Neto Pasarela ($)
      { width: 20 }, // 15 (O): Proveedor
      { width: 15 }, // 16 (P): Caja Chica ($)
      { width: 14 }, // 17 (Q): Fondo ($)
      { width: 15 }, // 18 (R): Pendiente ($)
      { width: 15 }, // 19 (S): Utilidad Real ($)
      { width: 22 }, // 20 (T): Folio Ticket / Garantía
    ];

    // =========================================================================
    // DESCARGA O RETORNO DEL BUFFER
    // =========================================================================
    const buffer = await workbook.xlsx.writeBuffer();

    if (typeof window !== "undefined") {
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const filename = `Corte_${empresaNombre.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.xlsx`;
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
        teoricoF1: resumen.efectivo?.saldo_teorico || 0,
        teoricoF2: 0,
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
