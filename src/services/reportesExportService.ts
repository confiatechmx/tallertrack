import * as XLSX from "xlsx";
import { ResumenCorteDiarioAuditoria } from "@/services/cajaTurnoService";

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

export const ReportesExportService = {
  /**
   * Genera la estructura en memoria del libro de Excel (.xlsx) con 3 pestañas:
   * 1. Detalle de Ventas (Machote Digital)
   * 2. Corte y Conciliación
   * 3. Proveedores y CxP
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

    // =========================================================================
    // HOJA 1: DETALLE DE VENTAS (MACHOTE DIGITAL)
    // =========================================================================
    const ventasRows: any[] = [
      [`${nombreTaller.toUpperCase()} - REPORTE DETALLADO DE VENTAS`],
      [`Fecha de Turno: ${fechaAperturaStr}`, `Estado: ${resumen.estado}`, `Turno ID: ${resumen.turno_id}`],
      [],
      [
        "No. Venta",
        "Cliente",
        "Vehículo",
        "Teléfono",
        "¿Factura?",
        "Métodos de Pago",
        "Descripción / Partida",
        "Cantidad",
        "P. Unitario ($)",
        "Importe ($)",
        "Proveedor",
        "Folio Ticket/Nota",
        "Fuente Pago Costo",
        "Costo Unitario ($)",
        "Costo Total ($)",
        "Comisión Tarjeta ($)",
        "Ganancia Neta ($)",
        "Garantía (Meses)",
        "Evidencia Comprobante",
      ],
    ];

    if (ventas.length === 0) {
      ventasRows.push(["Sin ventas registradas en este turno."]);
    } else {
      ventas.forEach((v) => {
        if (!v.items || v.items.length === 0) {
          ventasRows.push([
            v.noVenta,
            v.cliente,
            v.vehiculo,
            v.telefono,
            v.factura ? "SÍ" : "NO",
            v.metodosPago,
            "Servicio / Venta General",
            1,
            v.totalVenta,
            v.totalVenta,
            "-",
            "-",
            "-",
            v.totalCostos,
            v.totalCostos,
            v.comisionBancaria,
            v.gananciaNeta,
            "-",
            "-",
          ]);
        } else {
          v.items.forEach((item, idx) => {
            const isFirst = idx === 0;
            ventasRows.push([
              isFirst ? v.noVenta : "",
              isFirst ? v.cliente : "",
              isFirst ? v.vehiculo : "",
              isFirst ? v.telefono : "",
              isFirst ? (v.factura ? "SÍ" : "NO") : "",
              isFirst ? v.metodosPago : "",
              item.descripcion,
              item.cantidad,
              item.precioUnitario,
              item.importe,
              item.proveedor || "-",
              item.folioTicket || "-",
              item.fuentePago || "-",
              item.costoUnitario || 0,
              item.costoTotal || 0,
              isFirst ? v.comisionBancaria : 0,
              isFirst ? v.gananciaNeta : (item.importe - (item.costoTotal || 0)),
              item.mesesGarantia ? `${item.mesesGarantia} meses` : "-",
              item.evidenciaUrl || "-",
            ]);
          });
        }
      });
    }

    const wsVentas = XLSX.utils.aoa_to_sheet(ventasRows);
    XLSX.utils.book_append_sheet(workbook, wsVentas, "Detalle de Ventas");

    // =========================================================================
    // HOJA 2: CORTE Y CONCILIACIÓN
    // =========================================================================
    const corteRows: any[] = [
      [`${nombreTaller.toUpperCase()} - CORTE DIARIO Y CONCILIACIÓN DE CAJA`],
      [`Fecha: ${fechaAperturaStr}`, `Estado: ${resumen.estado}`, `Generado: ${new Date().toLocaleString("es-MX")}`],
      [],
      ["--- 1. RESUMEN DE EFECTIVO (MOSTRADOR) ---", ""],
      ["Concepto", "Monto ($)"],
      ["Apertura Fondo 1 (Mostrador)", resumen.efectivo?.apertura_declarada || 0],
      ["Ingresos por Ventas en Efectivo", resumen.efectivo?.entradas_ventas || 0],
      ["Salidas / Gastos de Caja Chica", resumen.efectivo?.salidas_gastos || 0],
      ["Saldo Teórico en Sistema", resumen.efectivo?.saldo_teorico || 0],
      ["Efectivo Declarado (Arqueo Ciego)", resumen.efectivo?.cierre_declarado ?? "-"],
      ["Diferencia (Entrego vs Debe)", resumen.efectivo?.diferencia ?? 0],
      ["Remesa Retirada (Caja Fuerte)", resumen.efectivo?.remesa_retirada || 0],
      ["Fondo Remanente para Siguiente Turno", resumen.efectivo?.fondo_siguiente || 0],
      ["Justificación de Descuadre", resumen.efectivo?.justificacion_descuadre || "Ninguna"],
      [],
      ["--- 2. CONCILIACIÓN DE CUENTAS BANCARIAS SPEI ---", "", "", ""],
      ["Banco", "Alias", "¿Cuenta Fiscal?", "Total Recibido ($)", "No. Transacciones"],
    ];

    if (resumen.bancos && resumen.bancos.length > 0) {
      resumen.bancos.forEach((b) => {
        corteRows.push([b.banco, b.alias, b.es_fiscal ? "SÍ (Fiscal)" : "NO (Operativa)", b.total, b.conteo]);
      });
    } else {
      corteRows.push(["Sin movimientos SPEI", "-", "-", 0, 0]);
    }

    corteRows.push(
      [],
      ["--- 3. TERMINALES Y TARJETAS (COMISIONES Y MSI) ---", "", "", "", ""],
      ["Terminal / Método", "Plazo", "Monto Bruto ($)", "Comisión Deducida ($)", "Monto Neto ($)", "Transacciones"]
    );

    if (resumen.tarjetas?.desglose && resumen.tarjetas.desglose.length > 0) {
      resumen.tarjetas.desglose.forEach((t) => {
        corteRows.push([
          t.metodo,
          t.plazo_msi ? `${t.plazo_msi} Meses Sin Intereses` : "1 Exhibición",
          t.bruto,
          t.comision,
          t.neto,
          t.conteo,
        ]);
      });
      corteRows.push([
        "TOTAL TARJETAS",
        "",
        resumen.tarjetas.total_bruto,
        resumen.tarjetas.total_comisiones,
        resumen.tarjetas.total_neto,
        resumen.tarjetas.conteo,
      ]);
    } else {
      corteRows.push(["Sin cobros con tarjeta en este turno", "-", 0, 0, 0, 0]);
    }

    corteRows.push(
      [],
      ["--- 4. BALANCE FINANCIERO Y SEPARACIÓN FISCAL ---", ""],
      ["Rubro", "Monto ($)"],
      ["Ventas Brutas Totales", resumen.fiscal?.ventas_brutas || 0],
      ["(-) Comisiones Bancarias / MSI (Absorbidas)", resumen.fiscal?.comisiones_retenidas || 0],
      ["(=) Ventas Netas Recibidas", resumen.fiscal?.ventas_netas || 0],
      ["(-) Costo de Refacciones y Compras a Proveedores", resumen.fiscal?.costos_refacciones || 0],
      ["(=) GANANCIA NETA TOTAL DEL TURNO", resumen.fiscal?.ganancia_neta_total || 0],
      ["Ganancias en Cuentas Fiscales (SAT/CFDI)", resumen.fiscal?.ganancia_fiscal || 0],
      ["GANANCIA NETA DESPUÉS DE FISCAL", resumen.fiscal?.ganancia_despues_de_fiscal || 0],
      [],
      ["--- 5. REGISTRO DEL DÍA (KPIS DE TALLER) ---", "", ""],
      ["Categoría Clave", "Unidad", "Cantidad Acumulada"]
    );

    if (resumen.registro_del_dia && resumen.registro_del_dia.length > 0) {
      resumen.registro_del_dia.forEach((k) => {
        corteRows.push([k.categoria, k.unidad, k.cantidad]);
      });
    } else {
      corteRows.push(["Sin KPIs registrados", "-", 0]);
    }

    const wsCorte = XLSX.utils.aoa_to_sheet(corteRows);
    XLSX.utils.book_append_sheet(workbook, wsCorte, "Corte y Conciliación");

    // =========================================================================
    // HOJA 3: PROVEEDORES Y CXP
    // =========================================================================
    const provRows: any[] = [
      [`${nombreTaller.toUpperCase()} - HISTORIAL DE PROVEEDORES, COMPRAS Y GARANTÍAS`],
      [`Fecha de Turno: ${fechaAperturaStr}`],
      [],
      ["RESUMEN DE PROVEEDORES DEL TURNO", ""],
      ["Total Pagado en Efectivo (Caja Chica)", resumen.proveedores?.total_pagado_caja_chica || 0],
      ["Total Comprado a Crédito (Nuevos Pasivos)", resumen.proveedores?.total_credito_nuevo || 0],
      ["Total Abonos a Deudas Anteriores", resumen.proveedores?.total_abonos_credito || 0],
      [],
      [
        "Proveedor",
        "Folio Ticket/Nota",
        "Descripción",
        "Costo ($)",
        "Fuente de Pago",
        "Estatus Pago",
        "Estatus Garantía",
        "Evidencia Comprobante",
      ],
    ];

    if (resumen.proveedores?.compras && resumen.proveedores.compras.length > 0) {
      resumen.proveedores.compras.forEach((c) => {
        provRows.push([
          c.proveedor,
          c.folio,
          c.descripcion,
          c.costo,
          c.fuente_pago,
          c.estatus_pago,
          c.estatus_garantia,
          c.evidencia_url || "Sin evidencia adjunta",
        ]);
      });
    } else {
      provRows.push(["Sin compras a proveedores en este turno", "-", "-", 0, "-", "-", "-", "-"]);
    }

    const wsProv = XLSX.utils.aoa_to_sheet(provRows);
    XLSX.utils.book_append_sheet(workbook, wsProv, "Proveedores y CxP");

    return workbook;
  },

  /**
   * Genera el libro Excel y dispara la descarga en el navegador
   */
  exportarCorteExcel(
    resumen: ResumenCorteDiarioAuditoria,
    ventas: VentaItemReporte[] = [],
    nombreTaller = "Cova Tires"
  ) {
    const workbook = this.generarLibroExcel(resumen, ventas, nombreTaller);
    const fechaAperturaStr = new Date(resumen.fecha_apertura).toLocaleDateString("es-MX", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const filename = `Corte_Diario_${nombreTaller.replace(/\s+/g, "_")}_${fechaAperturaStr.replace(/\//g, "-")}.xlsx`;
    XLSX.writeFile(workbook, filename);
  },
};
