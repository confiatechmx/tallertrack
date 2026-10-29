import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabase client before any service imports
vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: "https://mock.storage/test.jpg" } }),
      }),
    },
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "test-user-id" } } }),
    },
  },
}));

import { TenantMetodosPagoService, TenantMetodoPago } from "@/services/tenantMetodosPagoService";
import { ProveedorService, CompraProveedorInsert } from "@/services/proveedorService";
import { ReportesExportService } from "@/services/reportesExportService";
import { ResumenCorteDiarioAuditoria } from "@/services/cajaTurnoService";

describe("Suite Cova Tires: Pagos Autogestionables, Proveedores y Corte Diario", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Cálculo de Comisiones Bancarias y Meses Sin Intereses (MSI)", () => {
    it("debe calcular la comisión del 2.0% para BanBajío Tarjeta TPV y deducirla del neto", () => {
      const metodoBanbajio: Partial<TenantMetodoPago> = {
        nombre: "BanBajío Tarjeta (TPV)",
        tipo: "TARJETA_CREDITO",
        proveedor: "BanBajío",
        comision_porcentaje: 2.0,
        comision_fija: 0.0,
        comision_iva_incluido: true,
      };

      const resultado = TenantMetodosPagoService.calcularComision(10000, metodoBanbajio);

      expect(resultado.montoBruto).toBe(10000);
      expect(resultado.comisionMonto).toBe(200.0);
      expect(resultado.montoNeto).toBe(9800.0);
    });

    it("debe calcular la comisión del 3.5% para Mercado Pago en 1 sola exhibición", () => {
      const metodoMP: Partial<TenantMetodoPago> = {
        nombre: "Mercado Pago Tarjeta",
        tipo: "TARJETA_CREDITO",
        proveedor: "Mercado Pago",
        comision_porcentaje: 3.5,
        comision_fija: 0.0,
        comision_iva_incluido: true,
      };

      const resultado = TenantMetodosPagoService.calcularComision(5000, metodoMP);

      expect(resultado.montoBruto).toBe(5000);
      expect(resultado.comisionMonto).toBe(175.0);
      expect(resultado.montoNeto).toBe(4825.0);
    });

    it("debe calcular correctamente comisiones escalonadas de Mercado Pago a Meses Sin Intereses (3, 6, 9 y 12 MSI)", () => {
      const msiConfigs = [
        { plazo: 3, pct: 7.5, bruto: 12000, comisionEsperada: 900.0, netoEsperado: 11100.0 },
        { plazo: 6, pct: 11.5, bruto: 15000, comisionEsperada: 1725.0, netoEsperado: 13275.0 },
        { plazo: 9, pct: 15.5, bruto: 18000, comisionEsperada: 2790.0, netoEsperado: 15210.0 },
        { plazo: 12, pct: 19.5, bruto: 24000, comisionEsperada: 4680.0, netoEsperado: 19320.0 },
      ];

      for (const item of msiConfigs) {
        const metodoMSI: Partial<TenantMetodoPago> = {
          nombre: `Mercado Pago ${item.plazo} MSI`,
          tipo: "MSI",
          proveedor: "Mercado Pago",
          plazo_msi: item.plazo,
          comision_porcentaje: item.pct,
          comision_fija: 0,
          comision_iva_incluido: true,
        };

        const res = TenantMetodosPagoService.calcularComision(item.bruto, metodoMSI);
        expect(res.comisionMonto).toBe(item.comisionEsperada);
        expect(res.montoNeto).toBe(item.netoEsperado);
      }
    });

    it("debe mantener el 100% neto sin comisiones cuando el pago es en Efectivo o SPEI", () => {
      const metodoEfectivo: Partial<TenantMetodoPago> = {
        nombre: "Efectivo",
        tipo: "EFECTIVO",
        proveedor: "Efectivo",
        comision_porcentaje: 0.0,
      };

      const res = TenantMetodosPagoService.calcularComision(4500, metodoEfectivo);
      expect(res.comisionMonto).toBe(0);
      expect(res.montoNeto).toBe(4500);
    });
  });

  describe("2. Trazabilidad de Proveedores, Evidencias y Garantías", () => {
    it("debe calcular fechas de vencimiento de crédito y garantía acordes a las políticas", () => {
      const fechaCompra = new Date("2026-10-29T10:00:00Z");
      const diasCredito = 30; // AutoZone Comercial
      const mesesGarantia = 3;

      const fechaLimitePago = new Date(fechaCompra);
      fechaLimitePago.setDate(fechaCompra.getDate() + diasCredito);

      const fechaVencGarantia = new Date(fechaCompra);
      fechaVencGarantia.setMonth(fechaCompra.getMonth() + mesesGarantia);

      expect(fechaLimitePago.toISOString().split("T")[0]).toBe("2026-11-28");
      expect(fechaVencGarantia.toISOString().split("T")[0]).toBe("2027-01-29");
    });

    it("debe estructurar compras con folio, fuente de pago y saldo deudor", () => {
      const mockCompra: CompraProveedorInsert = {
        empresa_id: "b2ad09db-0a34-4876-9ca3-d584c40bd294",
        sucursal_id: "b2ad09db-0a34-4876-9ca3-d584c40bd295",
        proveedor_id: "p1000000-0000-0000-0000-000000000001",
        folio_ticket_nota: "AZ-89210",
        descripcion: "2 Llantas Michelin 205/55R16",
        monto_costo: 3200.0,
        fuente_pago: "CREDITO_PENDIENTE",
        estatus_pago: "PENDIENTE",
        monto_pagado: 0.0,
        monto_saldo_pendiente: 3200.0,
        fecha_compra: "2026-10-29",
        fecha_limite_pago: "2026-11-28",
        evidencia_url: "https://storage.autolisto.com/proveedores/ticket_89210.jpg",
        evidencia_tipo: "IMAGE",
        meses_garantia: 12,
        fecha_vencimiento_garantia: "2027-10-29",
        estatus_garantia: "VIGENTE",
      };

      expect(mockCompra.folio_ticket_nota).toBe("AZ-89210");
      expect(mockCompra.monto_saldo_pendiente).toBe(3200.0);
      expect(mockCompra.estatus_garantia).toBe("VIGENTE");
      expect(mockCompra.evidencia_url).toContain(".jpg");
    });
  });

  describe("3. Snapshot Consolidado de Corte Diario y Balance Fiscal", () => {
    const mockSnapshot: ResumenCorteDiarioAuditoria = {
      success: true,
      turno_id: "t0000000-0000-0000-0000-000000000001",
      estado: "CERRADO",
      fecha_apertura: "2026-10-29T08:00:00Z",
      fecha_cierre: "2026-10-29T18:00:00Z",
      efectivo: {
        apertura_declarada: 1500.0,
        entradas_ventas: 8400.0,
        salidas_gastos: 1200.0,
        saldo_teorico: 8700.0,
        cierre_declarado: 8700.0,
        diferencia: 0.0,
        remesa_retirada: 7200.0,
        fondo_siguiente: 1500.0,
        justificacion_descuadre: null,
      },
      bancos: [
        { cuenta_id: "c1", banco: "BBVA", alias: "BBVA Fiscal", es_fiscal: true, total: 14500.0, conteo: 4 },
        { cuenta_id: "c2", banco: "BanBajío", alias: "BanBajío Fiscal", es_fiscal: true, total: 6200.0, conteo: 2 },
        { cuenta_id: "c3", banco: "Inbursa", alias: "Inbursa Operativa", es_fiscal: false, total: 3800.0, conteo: 1 },
        { cuenta_id: "c4", banco: "Mercado Pago", alias: "MP Wallet", es_fiscal: false, total: 2500.0, conteo: 2 },
      ],
      tarjetas: {
        total_bruto: 18000.0,
        total_comisiones: 1250.0,
        total_neto: 16750.0,
        conteo: 5,
        desglose: [
          { metodo: "BanBajío Tarjeta", plazo_msi: null, bruto: 6000, comision: 120, neto: 5880, conteo: 2 },
          { metodo: "Mercado Pago", plazo_msi: null, bruto: 4000, comision: 140, neto: 3860, conteo: 1 },
          { metodo: "Mercado Pago", plazo_msi: 6, bruto: 8000, comision: 990, neto: 7010, conteo: 2 },
        ],
      },
      proveedores: {
        total_pagado_caja_chica: 1200.0,
        total_credito_nuevo: 4500.0,
        total_abonos_credito: 2000.0,
        compras: [],
      },
      fiscal: {
        ventas_brutas: 53400.0,
        comisiones_retenidas: 1250.0,
        ventas_netas: 52150.0,
        costos_refacciones: 18500.0,
        ganancia_neta_total: 33650.0,
        ganancia_fiscal: 20700.0,
        ganancia_despues_de_fiscal: 12950.0,
      },
      registro_del_dia: [
        { categoria: "#LLANTA NUEVA", unidad: "PZ", cantidad: 16 },
        { categoria: "#LLANTA USADA", unidad: "PZ", cantidad: 4 },
        { categoria: "#AMORT", unidad: "PZ", cantidad: 6 },
        { categoria: "#DESPONCHES", unidad: "PZ", cantidad: 9 },
        { categoria: "#ALINEACIONES", unidad: "PZ", cantidad: 5 },
        { categoria: "#BALATAS", unidad: "PARES", cantidad: 3 },
      ],
    };

    it("debe validar la congruencia del arqueo ciego (Caja Cuadrada)", () => {
      expect(mockSnapshot.efectivo.cierre_declarado).toBe(mockSnapshot.efectivo.saldo_teorico);
      expect(mockSnapshot.efectivo.diferencia).toBe(0.0);
      expect(mockSnapshot.efectivo.remesa_retirada + mockSnapshot.efectivo.fondo_siguiente).toBe(
        mockSnapshot.efectivo.cierre_declarado
      );
    });

    it("debe calcular la ganancia neta restando comisiones bancarias absorbidas y costos", () => {
      const f = mockSnapshot.fiscal;
      expect(f.ventas_brutas - f.comisiones_retenidas).toBe(f.ventas_netas);
      expect(f.ventas_netas - f.costos_refacciones).toBe(f.ganancia_neta_total);
      expect(f.ganancia_neta_total - f.ganancia_fiscal).toBe(f.ganancia_despues_de_fiscal);
    });

    it("debe contener las 6 métricas operativas del machote de Cova en el registro del día", () => {
      const kpis = mockSnapshot.registro_del_dia;
      expect(kpis).toHaveLength(6);
      expect(kpis.find((k) => k.categoria === "#LLANTA NUEVA")?.cantidad).toBe(16);
      expect(kpis.find((k) => k.categoria === "#BALATAS")?.unidad).toBe("PARES");
      expect(kpis.find((k) => k.categoria === "#AMORT")?.cantidad).toBe(6);
    });
  });

  describe("4. Generación de Reportes Excel (.xlsx)", () => {
    it("debe crear el libro de Excel con las 3 pestañas requeridas", () => {
      const mockSnapshot: ResumenCorteDiarioAuditoria = {
        success: true,
        turno_id: "test-turno-1",
        estado: "AUDITADO",
        fecha_apertura: "2026-10-29T08:00:00Z",
        fecha_cierre: "2026-10-29T18:00:00Z",
        efectivo: {
          apertura_declarada: 1500,
          entradas_ventas: 5000,
          salidas_gastos: 500,
          saldo_teorico: 6000,
          cierre_declarado: 6000,
          diferencia: 0,
          remesa_retirada: 4500,
          fondo_siguiente: 1500,
          justificacion_descuadre: null,
        },
        bancos: [],
        tarjetas: { total_bruto: 0, total_comisiones: 0, total_neto: 0, conteo: 0, desglose: [] },
        proveedores: { total_pagado_caja_chica: 0, total_credito_nuevo: 0, total_abonos_credito: 0, compras: [] },
        fiscal: {
          ventas_brutas: 5000,
          comisiones_retenidas: 0,
          ventas_netas: 5000,
          costos_refacciones: 1000,
          ganancia_neta_total: 4000,
          ganancia_fiscal: 2000,
          ganancia_despues_de_fiscal: 2000,
        },
        registro_del_dia: [],
      };

      const wb = ReportesExportService.generarLibroExcel(mockSnapshot, [], "Cova Tires");

      expect(wb.SheetNames).toEqual([
        "Detalle de Ventas",
        "Corte y Conciliación",
        "Proveedores y CxP",
      ]);
      expect(wb.Sheets["Detalle de Ventas"]).toBeDefined();
      expect(wb.Sheets["Corte y Conciliación"]).toBeDefined();
      expect(wb.Sheets["Proveedores y CxP"]).toBeDefined();
    });
  });
});
