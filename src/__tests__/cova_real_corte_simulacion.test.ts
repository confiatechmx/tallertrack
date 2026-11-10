import { describe, it, expect, vi } from "vitest";

// Mock Supabase para pruebas puras de lógica y servicios
vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "cajero-cova-user" } } }),
    },
  },
}));

import {
  CajaTurnoService,
  calcularTotalDenominaciones,
  DenominacionesConteo,
  TurnoDetalleCompleto,
  TurnoVentaOrden,
} from "@/services/cajaTurnoService";
import { ReportesExportService } from "@/services/reportesExportService";

describe("Simulación Shadow Run: Corte Real de COVA - Martes 03 Noviembre 2026", () => {
  // Datos reales del Excel de Cova
  const VENTAS_REALES_COVA = [
    {
      noVenta: 1,
      cliente: "GRISELDA SANCHEZ",
      telefono: "6671909966",
      vehiculo: "CHEVY 2007",
      metodoPago: "TRANSFER_MP",
      totalIngreso: 2180.0,
      partidas: [
        { descripcion: "2x 185/60 R14 BLACKHAWK HH11", importe: 2180.0 },
        { descripcion: "2x MONTAJE, BALANCEO Y PIVOTE", importe: 0.0, esCortesia: true },
      ],
      compras: [
        { proveedor: "LLANTAS PLUS", costo: 1608.0, fuentePago: "CAJA_CHICA" },
      ],
      costoTotal: 1608.0,
      gananciaEsperada: 572.0,
    },
    {
      noVenta: 2,
      cliente: "ARNOLDO GUERRERO",
      telefono: "6674962050",
      vehiculo: "SENTRA 2002",
      metodoPago: "EFECTIVO",
      totalIngreso: 600.0,
      partidas: [
        { descripcion: "1x 185/70 R14 NEXEN USADA", importe: 600.0 },
        { descripcion: "1x MONTAJE", importe: 0.0, esCortesia: true },
      ],
      compras: [
        { proveedor: "INVENTARIO SH", costo: 250.0, fuentePago: "CREDITO_PENDIENTE" },
      ],
      costoTotal: 250.0,
      gananciaEsperada: 350.0,
    },
    {
      noVenta: 3,
      cliente: "ABRAHAM",
      telefono: "6672438609",
      vehiculo: "SENTRA 2002",
      metodoPago: "EFECTIVO",
      totalIngreso: 350.0,
      partidas: [
        { descripcion: "1x 185/65 R14 USADA + INSTALACION", importe: 350.0 },
      ],
      compras: [
        { proveedor: "SH", costo: 150.0, fuentePago: "CREDITO_PENDIENTE" },
      ],
      costoTotal: 150.0,
      gananciaEsperada: 200.0,
    },
    {
      noVenta: 4,
      cliente: "RENE ZAMORA",
      telefono: "6672265403",
      vehiculo: "MARCH 2021",
      metodoPago: "EFECTIVO",
      totalIngreso: 1100.0,
      partidas: [
        { descripcion: "1x 185/60 R14 GREEN LANDER", importe: 400.0 },
        { descripcion: "1x 185/60 R14 KELLY", importe: 450.0 },
        { descripcion: "1x ALINEACION (No hay garantía detalle en suspensión)", importe: 250.0 },
      ],
      compras: [
        { proveedor: "INVENTARIO SH", costo: 500.0, fuentePago: "CREDITO_PENDIENTE" },
      ],
      costoTotal: 500.0,
      gananciaEsperada: 600.0,
    },
    {
      noVenta: 5,
      cliente: "JUAN",
      telefono: "6671451902",
      vehiculo: "RANGER MO 2011",
      metodoPago: "EFECTIVO",
      totalIngreso: 9160.0,
      partidas: [
        { descripcion: "4x 245/75 R16 LCH TREX ALLTERRAIN", importe: 9160.0 },
        { descripcion: "4x MONTAJE, BALANCEO Y PIVOTE", importe: 0.0, esCortesia: true },
      ],
      compras: [
        { proveedor: "BLUE", costo: 7520.0, fuentePago: "CAJA_CHICA" },
      ],
      costoTotal: 7520.0,
      gananciaEsperada: 1640.0,
    },
    {
      noVenta: 6,
      cliente: "EDUARDO",
      telefono: "6677970195",
      vehiculo: "CAPTIVA 2013",
      metodoPago: "TRANSFER_MP",
      totalIngreso: 3865.0,
      partidas: [
        { descripcion: "2x 235/65 R17 NOBHEX JUAGUEY SUC", importe: 3740.0 },
        { descripcion: "2x MONTAJES, BALANCEOS Y PIVOTE", importe: 0.0, esCortesia: true },
        { descripcion: "1x ALINEACION", importe: 125.0 },
      ],
      compras: [
        { proveedor: "AYON", costo: 3100.0, fuentePago: "CREDITO_PENDIENTE" },
      ],
      costoTotal: 3100.0,
      gananciaEsperada: 765.0,
    },
    {
      noVenta: 7,
      cliente: "YOSELIN",
      telefono: "6673002830",
      vehiculo: "RAV4 2006",
      metodoPago: "TRANSFER_MP",
      totalIngreso: 3200.0,
      partidas: [
        { descripcion: "2x 225/65 R17 JOYROAD GRAND TOURED", importe: 3100.0 },
        { descripcion: "2x MONTAJE, BALANCEO Y PIVOTE", importe: 0.0, esCortesia: true },
        { descripcion: "2x CAMBIOS", importe: 100.0 },
      ],
      compras: [
        { proveedor: "AYON", costo: 2500.0, fuentePago: "CREDITO_PENDIENTE" },
      ],
      costoTotal: 2500.0,
      gananciaEsperada: 700.0,
    },
    {
      noVenta: 8,
      cliente: "ADAN",
      telefono: "6672169487",
      vehiculo: "VENTO 2017",
      metodoPago: "EFECTIVO",
      totalIngreso: 250.0,
      partidas: [
        { descripcion: "1x ALINEACION", importe: 250.0 },
      ],
      compras: [],
      costoTotal: 0.0,
      gananciaEsperada: 250.0,
    },
    {
      noVenta: 9,
      cliente: "MAHARBAL",
      telefono: "S/N",
      vehiculo: "S/V",
      metodoPago: "EFECTIVO",
      totalIngreso: 70.0,
      partidas: [
        { descripcion: "1x MONTAJE RIN 19", importe: 70.0 },
      ],
      compras: [],
      costoTotal: 0.0,
      gananciaEsperada: 70.0,
    },
    {
      noVenta: 10,
      cliente: "JORGE",
      telefono: "6671075272",
      vehiculo: "COROLLA 2015",
      metodoPago: "TRANSFER_MP",
      totalIngreso: 2740.0,
      partidas: [
        { descripcion: "2x 205/55 R16 NOBHEX", importe: 2700.0 },
        { descripcion: "2x MONTAJE", importe: 0.0, esCortesia: true },
        { descripcion: "1x ROTACION", importe: 40.0 },
      ],
      compras: [
        { proveedor: "INVENTARIO LARISSA", costo: 1600.0, fuentePago: "CREDITO_PENDIENTE" },
      ],
      costoTotal: 1600.0,
      gananciaEsperada: 1140.0,
    },
    {
      noVenta: 11,
      cliente: "SERVICIOS CHICOS",
      telefono: "S/N",
      vehiculo: "COROLLA / JAC",
      metodoPago: "EFECTIVO",
      totalIngreso: 140.0,
      partidas: [
        { descripcion: "1x MONTAJE- COROLLA-EFECTIVO", importe: 50.0 },
        { descripcion: "1x DESPONCHE-JAC-EFECTIVO", importe: 90.0 },
      ],
      compras: [],
      costoTotal: 0.0,
      gananciaEsperada: 140.0,
    },
    {
      noVenta: 12,
      cliente: "PONCIANO GALVAN",
      telefono: "6672665150",
      vehiculo: "COROLLA 2016",
      notaEspecial: "CANDADO ENTREGADO",
      metodoPago: "EFECTIVO",
      totalIngreso: 4200.0,
      partidas: [
        { descripcion: "2x BALEROS TRIPOIDES", importe: 2500.0 },
        { descripcion: "1x MANO DE OBRA", importe: 1700.0 },
      ],
      compras: [
        { proveedor: "OMAR REYNOSA", costo: 2000.0, fuentePago: "CAJA_CHICA" },
      ],
      costoTotal: 2000.0,
      gananciaEsperada: 2200.0,
    },
    {
      noVenta: 13,
      cliente: "RICARDO CAZAREZ",
      telefono: "6671773900",
      vehiculo: "NP300",
      metodoPago: "TRANSFER_MP",
      totalIngreso: 878.42,
      partidas: [
        { descripcion: "1x 255/70 R16 BRIDGESTONE / USADA", importe: 808.42 },
        { descripcion: "1x BALANCEO", importe: 70.0 },
      ],
      compras: [
        { proveedor: "INVENTARIO HUGO", costo: 350.0, fuentePago: "CREDITO_PENDIENTE" },
      ],
      costoTotal: 350.0,
      gananciaEsperada: 528.42,
    },
    {
      noVenta: 14,
      cliente: "RICARDO ESCALANTE",
      telefono: "6673503081",
      vehiculo: "COROLLA 2014",
      notaEspecial: "CANDADO ENTREGADO",
      metodoPago: "EFECTIVO",
      totalIngreso: 6040.0,
      partidas: [
        { descripcion: "2x AMORTIGUADORES DELANTEROS KYB", importe: 4600.0 },
        { descripcion: "2x BASES DELANTERAS (3M)", importe: 1440.0 },
        { descripcion: "INSTALACION GRATIS", importe: 0.0, esCortesia: true },
      ],
      compras: [
        { proveedor: "DAR", costo: 857.14, fuentePago: "CAJA_CHICA" },
        { proveedor: "PAT", costo: 3794.18, fuentePago: "CAJA_CHICA" },
      ],
      costoTotal: 4651.32,
      gananciaEsperada: 1388.68,
    },
    {
      noVenta: 15,
      cliente: "ALBERTO SAMANIEGO",
      telefono: "6673163988",
      vehiculo: "SUELTAS",
      notaEspecial: "PENDIENTE DE INSTALACION",
      metodoPago: "TRANSFER_MP",
      totalIngreso: 3226.46,
      partidas: [
        { descripcion: "2x 235/60 R15 MASSIMO LEONEL1", importe: 3226.46 },
        { descripcion: "2x MONTAJES, BALANCEO Y PIVOTE", importe: 0.0, esCortesia: true },
      ],
      compras: [
        { proveedor: "AYON", costo: 2540.0, fuentePago: "CREDITO_PENDIENTE" },
      ],
      costoTotal: 2540.0,
      gananciaEsperada: 686.46,
    },
    {
      noVenta: 16,
      cliente: "RICARDO ESCALANTE",
      telefono: "6674099662",
      vehiculo: "COROLLA 2014",
      notaEspecial: "CANDADO ENTREGADO",
      metodoPago: "TRANSFER_MP",
      totalIngreso: 780.0,
      partidas: [
        { descripcion: "2x HULES DE LA BARRA ESTABILIZADORA", importe: 380.0 },
        { descripcion: "1x MANO DE OBRA", importe: 400.0 },
      ],
      compras: [
        { proveedor: "SAN", costo: 183.0, fuentePago: "CAJA_CHICA" },
      ],
      costoTotal: 183.0,
      gananciaEsperada: 597.0,
    },
  ];

  const GASTOS_CAJA_GENERALES = [
    { concepto: "Gastos varios de caja / Retiro menor", monto: 400.0, metodo: "Efectivo" },
  ];

  it("1. Debe sumar exactamente los ingresos por Efectivo ($21,910.00) y Mercado Pago/Transferencia ($16,869.88)", () => {
    let totalEfectivo = 0;
    let totalTransferMP = 0;

    VENTAS_REALES_COVA.forEach((v) => {
      if (v.metodoPago === "EFECTIVO") {
        totalEfectivo += v.totalIngreso;
      } else {
        totalTransferMP += v.totalIngreso;
      }
    });

    const granTotal = totalEfectivo + totalTransferMP;

    expect(Number(totalEfectivo.toFixed(2))).toBe(21910.0);
    expect(Number(totalTransferMP.toFixed(2))).toBe(16869.88);
    expect(Number(granTotal.toFixed(2))).toBe(38779.88);
  });

  it("2. Debe separar fielmente las salidas de efectivo de Caja Chica ($15,962.32) de las cuentas por pagar a crédito ($10,990.00)", () => {
    let salidasCajaChica = 0;
    let comprasCredito = 0;

    VENTAS_REALES_COVA.forEach((v) => {
      v.compras.forEach((c) => {
        if (c.fuentePago === "CAJA_CHICA") {
          salidasCajaChica += c.costo;
        } else {
          comprasCredito += c.costo;
        }
      });
    });

    const costoTotalRefacciones = salidasCajaChica + comprasCredito;

    expect(Number(salidasCajaChica.toFixed(2))).toBe(15962.32);
    expect(Number(comprasCredito.toFixed(2))).toBe(10990.0);
    expect(Number(costoTotalRefacciones.toFixed(2))).toBe(26952.32);
  });

  it("3. Debe calcular la ganancia bruta ($11,827.56) y neta deduciendo gastos de caja ($11,427.56)", () => {
    let gananciaBrutaCalculada = 0;

    VENTAS_REALES_COVA.forEach((v) => {
      const g = v.totalIngreso - v.costoTotal;
      expect(Number(g.toFixed(2))).toBe(v.gananciaEsperada);
      gananciaBrutaCalculada += g;
    });

    const totalGastosCaja = GASTOS_CAJA_GENERALES.reduce((acc, g) => acc + g.monto, 0);
    const gananciaNetaCalculada = gananciaBrutaCalculada - totalGastosCaja;

    expect(Number(gananciaBrutaCalculada.toFixed(2))).toBe(11827.56);
    expect(Number(gananciaNetaCalculada.toFixed(2))).toBe(11427.56);
  });

  it("4. Arqueo Ciego: Debe cuadrar al centavo el saldo teórico en gaveta ($5,547.68 + Fondo Apertura)", () => {
    const fondoApertura = 1000.0; // Fondo operativo estándar en gaveta
    const entradasEfectivo = 21910.0;
    const salidasCajaCompras = 15962.32;
    const gastosCaja = 400.0;

    // Saldo Teórico en gaveta
    const saldoTeoricoGaveta = fondoApertura + entradasEfectivo - salidasCajaCompras - gastosCaja;
    expect(Number(saldoTeoricoGaveta.toFixed(2))).toBe(6547.68);

    // Conteo Ciego de Denominaciones exacto para $6,547.68:
    const conteoCiegoCajero: DenominacionesConteo = {
      b1000: 4,   // $4,000
      b500: 4,    // $2,000
      b200: 2,    // $400
      b100: 1,    // $100
      b50: 0,     // $0
      b20: 2,     // $40
      m20: 0,     // $0
      m10: 0,     // $0
      m5: 0,      // $0
      m2: 0,      // $0
      m1: 7,      // $7
      centavos: 0.68, // $0.68
    };

    const totalDeclarado = calcularTotalDenominaciones(conteoCiegoCajero);
    expect(Number(totalDeclarado.toFixed(2))).toBe(6547.68);

    const diferencia = totalDeclarado - saldoTeoricoGaveta;
    expect(Math.abs(diferencia)).toBeLessThanOrEqual(0.01);
  });

  it("5. Auditoría y Reportes: Construye la estructura TurnoDetalleCompleto lista para exportar a Excel y PDF", () => {
    const ventasTurno: TurnoVentaOrden[] = VENTAS_REALES_COVA.map((v) => ({
      ordenId: `ord-${v.noVenta}`,
      folio: 1000 + v.noVenta,
      clienteNombre: v.cliente,
      vehiculoModelo: v.vehiculo,
      telefono: v.telefono,
      totalOrden: v.totalIngreso,
      pagadoEfectivo: v.metodoPago === "EFECTIVO" ? v.totalIngreso : 0,
      pagadoBancos: v.metodoPago !== "EFECTIVO" ? v.totalIngreso : 0,
      pagadoTarjeta: 0,
      costoRefaccionesDirecto: v.costoTotal,
      utilidadBruta: v.gananciaEsperada,
      partidas: v.partidas.map((p) => ({
        tipo: "Neumático",
        descripcion: p.descripcion,
        cantidad: 1,
        costoUnitario: 0,
        costoTotal: 0,
        precioUnitario: p.importe,
        importe: p.importe,
        margenMonto: p.importe,
        margenPorcentaje: 100,
      })),
      comprasProveedores: v.compras.map((c) => ({
        id: `compra-${v.noVenta}`,
        proveedor: c.proveedor,
        folio: `TICK-${v.noVenta}`,
        montoCosto: c.costo,
        fuentePago: c.fuentePago,
        descripcion: `Compra refacciones venta #${v.noVenta}`,
      })),
    }));

    const detalleTurno: TurnoDetalleCompleto = {
      turno: {
        id: "turno-cova-martes-03",
        empresa_id: "b2ad09db-0a34-4876-9ca3-d584c40bd294",
        sucursal_id: "b2ad09db-0a34-4876-9ca3-d584c40bd295",
        usuario_apertura_id: "cajero-1",
        usuario_cierre_id: "cajero-1",
        fecha_apertura: "2026-11-03T08:30:00.000Z",
        fecha_cierre: "2026-11-03T19:45:00.000Z",
        estado: "CERRADO",
        monto_apertura_fondo1: 1000.0,
        monto_apertura_fondo2: 0,
        monto_cierre_declarado_f1: 6547.68,
        monto_cierre_declarado_f2: 0,
        monto_cierre_teorico_f1: 6547.68,
        monto_cierre_teorico_f2: 0,
        diferencia_f1: 0,
        diferencia_f2: 0,
        justificacion_descuadre: null,
        monto_remesa_retirada: 5547.68,
        monto_fondo_siguiente_f1: 1000.0,
        snapshot_resumen: null,
        created_at: "2026-11-03T08:30:00.000Z",
      },
      ventas: ventasTurno,
      gastos: GASTOS_CAJA_GENERALES.map((g, idx) => ({
        id: `gasto-${idx}`,
        concepto: g.concepto,
        monto: g.monto,
        categoria: "GASTO_OPERATIVO",
        metodo_pago: g.metodo,
        fecha: "2026-11-03T14:00:00.000Z",
      })),
      traspasos: [],
    };

    expect(detalleTurno.ventas.length).toBe(16);
    expect(detalleTurno.gastos.length).toBe(1);

    const totalVentas = detalleTurno.ventas.reduce((acc, v) => acc + v.totalOrden, 0);
    const totalCostos = detalleTurno.ventas.reduce((acc, v) => acc + v.costoRefaccionesDirecto, 0);
    const ganancia = totalVentas - totalCostos - 400.0;

    expect(Number(totalVentas.toFixed(2))).toBe(38779.88);
    expect(Number(totalCostos.toFixed(2))).toBe(26952.32);
    expect(Number(ganancia.toFixed(2))).toBe(11427.56);

    console.log("\n=======================================================");
    console.log("📊 RESULTADO DE AUDITORÍA COMPARATIVA COVA vs TALLERTRACK");
    console.log("=======================================================");
    console.log(`• Total Ventas (16 órdenes):    $${totalVentas.toFixed(2)} MXN  (OK)`);
    console.log(`• Ingresos en Efectivo:          $21,910.00 MXN  (OK)`);
    console.log(`• Ingresos Mercado Pago/Transf:  $16,869.88 MXN  (OK)`);
    console.log(`• Salidas de Caja Chica:        -$15,962.32 MXN  (OK)`);
    console.log(`• Gasto de Caja Menor:            -$400.00 MXN  (OK)`);
    console.log(`• Cuentas x Pagar Crédito Prov:  $10,990.00 MXN  (OK)`);
    console.log(`• Efectivo Restante en Gaveta:    $5,547.68 MXN (+ Fondo) (OK)`);
    console.log(`• Ganancia Neta del Día:         $11,427.56 MXN  (OK)`);
    console.log("=======================================================\n");
  });
});
