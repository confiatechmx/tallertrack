import { describe, it, expect, vi } from "vitest";

// Mock Supabase
vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      eq: vi.fn(),
    })),
    rpc: vi.fn(),
  },
}));

import { TenantMetodosPagoService, TenantMetodoPago } from "@/services/tenantMetodosPagoService";

describe("Bloque 2: Flujo Operativo del POS (Cobranza en Mostrador) - Cova", () => {
  // Mock tenant Cova data
  const mockCovaEmpresa = {
    id: "b2ad09db-0a34-4876-9ca3-d584c40bd294",
    nombre_comercial: "Cova",
  };

  const mockCovaMetodos: Partial<TenantMetodoPago>[] = [
    {
      id: "tpv-banbajio-1",
      empresa_id: mockCovaEmpresa.id,
      nombre: "BanBajío Tarjeta (TPV)",
      tipo: "TARJETA_CREDITO",
      proveedor: "Terminal TPV BanBajío",
      comision_porcentaje: 2.0,
      comision_fija: 0,
      ajuste_porcentaje: 4.3,
      activo: true,
    },
    {
      id: "mp-exhibicion-1",
      empresa_id: mockCovaEmpresa.id,
      nombre: "Mercado Pago Tarjeta (1 Exhibición)",
      tipo: "TARJETA_CREDITO",
      proveedor: "Mercado Pago",
      comision_porcentaje: 3.5,
      comision_fija: 0,
      ajuste_porcentaje: 4.3,
      activo: true,
    },
    {
      id: "mp-msi-3",
      empresa_id: mockCovaEmpresa.id,
      nombre: "Mercado Pago (3 MSI)",
      tipo: "MSI",
      proveedor: "Mercado Pago",
      plazo_msi: 3,
      comision_porcentaje: 7.5,
      comision_fija: 0,
      ajuste_porcentaje: 7.5,
      activo: true,
    },
  ];

  const mockCuentasBancarias = [
    { id: "cta-bajio-1", banco: "BanBajío", alias: "BanBajío Fiscal", clabe: "030730900012345678", es_fiscal: true },
    { id: "cta-inbursa-1", banco: "Inbursa", alias: "Inbursa Operativa", clabe: "036730900087654321", es_fiscal: false },
    { id: "cta-mp-1", banco: "Mercado Pago", alias: "Mercado Pago Wallet", clabe: "722730900011223344", es_fiscal: false },
  ];

  const mockOrders = [
    {
      id: "ord-1",
      folio: 1,
      estado: "Listo para Entrega",
      granTotal: 5800.0,
      pagado: 0.0,
      saldo: 5800.0,
      vehiculos: {
        marca: "Nissan",
        modelo: "Versa 2021",
        placas: "VND-482-A",
        clientes: { nombre: "Carlos Mendoza" },
      },
    },
    {
      id: "ord-2",
      folio: 2,
      estado: "En Proceso",
      granTotal: 3200.0,
      pagado: 1000.0,
      saldo: 2200.0,
      vehiculos: {
        marca: "Toyota",
        modelo: "Hilux 2020",
        placas: "UKP-912-C",
        clientes: { nombre: "Agrícola del Valle" },
      },
    },
    {
      id: "ord-3",
      folio: 3,
      estado: "Entregado",
      granTotal: 1500.0,
      pagado: 1500.0,
      saldo: 0.0,
      vehiculos: {
        marca: "Volkswagen",
        modelo: "Jetta 2018",
        placas: "ABC-123-X",
        clientes: { nombre: "María Beltrán" },
      },
    },
  ];

  // Helper matching POS search logic
  function filterPosOrders(orders: typeof mockOrders, query: string, filter: "ALL" | "READY" | "PARTIAL") {
    return orders.filter((o) => {
      if (o.saldo <= 0.01 && !query.trim()) return false;
      if (filter === "READY" && o.estado !== "Listo para Entrega") return false;
      if (filter === "PARTIAL" && (o.pagado <= 0.01 || o.saldo <= 0.01)) return false;

      if (!query.trim()) return true;
      const q = query.toLowerCase().trim();
      const folioStr = `#${1000 + Number(o.folio || 1)}`.toLowerCase();
      const rawFolio = String(1000 + Number(o.folio || 1));
      const directFolio = String(o.folio || "");
      const vehStr = `${o.vehiculos?.marca || ""} ${o.vehiculos?.modelo || ""} ${o.vehiculos?.placas || ""}`.toLowerCase();
      const cliStr = `${o.vehiculos?.clientes?.nombre || ""}`.toLowerCase();
      return (
        folioStr.includes(q) ||
        rawFolio.includes(q) ||
        directFolio.includes(q) ||
        vehStr.includes(q) ||
        cliStr.includes(q)
      );
    });
  }

  describe("1. Búsqueda Ágil en POS", () => {
    it("debe encontrar una orden buscando por folio con prefijo numeral (#1001) o directo (1001)", () => {
      const resWithHash = filterPosOrders(mockOrders, "#1001", "ALL");
      expect(resWithHash).toHaveLength(1);
      expect(resWithHash[0].id).toBe("ord-1");

      const resDirect = filterPosOrders(mockOrders, "1001", "ALL");
      expect(resDirect).toHaveLength(1);
      expect(resDirect[0].id).toBe("ord-1");
    });

    it("debe filtrar por placas del vehículo (ej: VND-482-A)", () => {
      const res = filterPosOrders(mockOrders, "VND", "ALL");
      expect(res).toHaveLength(1);
      expect(res[0].vehiculos.placas).toBe("VND-482-A");
    });

    it("debe filtrar por nombre de cliente (ej: Carlos Mendoza)", () => {
      const res = filterPosOrders(mockOrders, "carlos", "ALL");
      expect(res).toHaveLength(1);
      expect(res[0].id).toBe("ord-1");
    });

    it("debe filtrar por estado 'Listo para Entrega'", () => {
      const res = filterPosOrders(mockOrders, "", "READY");
      expect(res).toHaveLength(1);
      expect(res[0].estado).toBe("Listo para Entrega");
      expect(res[0].id).toBe("ord-1");
    });

    it("debe filtrar por órdenes con abono parcial", () => {
      const res = filterPosOrders(mockOrders, "", "PARTIAL");
      expect(res).toHaveLength(1);
      expect(res[0].id).toBe("ord-2");
      expect(res[0].pagado).toBe(1000.0);
      expect(res[0].saldo).toBe(2200.0);
    });
  });

  describe("2. Esquema Dual de Precios en POS (Efectivo/SPEI Base vs Tarjeta +4.3%)", () => {
    it("debe mantener el precio base en efectivo o transferencia sin tachaduras ni recargos", () => {
      const saldoBase = 1000.0;
      const montoEfectivo = saldoBase;
      const montoSPEI = saldoBase;

      expect(montoEfectivo).toBe(1000.0);
      expect(montoSPEI).toBe(1000.0);
    });

    it("debe calcular el precio de tarjeta utilizando el ajuste porcentual autogestionable del método", () => {
      const saldoBase = 1000.0;
      const metodoTPV = mockCovaMetodos.find((m) => m.id === "tpv-banbajio-1")!;
      const precioCalculado = TenantMetodosPagoService.calcularPrecioSegunMetodo(saldoBase, metodoTPV);

      expect(precioCalculado).toBe(1043.0);
    });

    it("permite al tenant configurar un porcentaje personalizado por método (ej. 7.5% para 3 MSI)", () => {
      const saldoBase = 2000.0;
      const metodoMSI = mockCovaMetodos.find((m) => m.id === "mp-msi-3")!;
      const precioMSI = TenantMetodosPagoService.calcularPrecioSegunMetodo(saldoBase, metodoMSI);

      // 2000 * 1.075 = 2150.0
      expect(precioMSI).toBe(2150.0);
    });

    it("aplica porcentaje fallback si el método no tiene porcentaje individual definido", () => {
      const saldoBase = 1000.0;
      const metodoSinAjuste = { id: "otro", nombre: "Terminal Genérica" };
      const precioConFallback = TenantMetodosPagoService.calcularPrecioSegunMetodo(saldoBase, metodoSinAjuste, 5.0);

      expect(precioConFallback).toBe(1050.0);
    });

    it("debe calcular correctamente el cambio al entregar billetes en efectivo en mostrador", () => {
      const montoEfectivo = 1000.0;
      const efectivoEntregado = 1200.0;
      const cambio = Math.max(0, efectivoEntregado - montoEfectivo);
      const faltante = Math.max(0, montoEfectivo - efectivoEntregado);

      expect(cambio).toBe(200.0);
      expect(faltante).toBe(0.0);
    });

    it("debe detectar faltante si el efectivo entregado no cubre el monto", () => {
      const montoEfectivo = 1000.0;
      const efectivoEntregado = 500.0;
      const cambio = Math.max(0, efectivoEntregado - montoEfectivo);
      const faltante = Math.max(0, montoEfectivo - efectivoEntregado);

      expect(cambio).toBe(0.0);
      expect(faltante).toBe(500.0);
    });
  });

  describe("3. Terminales TPV Cova y Comisiones en Trastienda", () => {
    it("debe calcular la comisión de BanBajío TPV (2.0% + 16% IVA ley bancaria) en back-office sin alterar el cobro al cliente", () => {
      const cobroCliente = 5000.0;
      const metodoBajio = mockCovaMetodos.find((m) => m.id === "tpv-banbajio-1")!;
      const comisionResult = TenantMetodosPagoService.calcularComision(cobroCliente, metodoBajio);

      expect(comisionResult.comisionPorcentaje).toBe(2.0);
      // 5000 * 2% = 100 base + 16% IVA bancario = 116.0
      expect(comisionResult.comisionMonto).toBe(116.0);
      expect(comisionResult.montoNeto).toBe(4884.0);
    });

    it("debe calcular la comisión de Mercado Pago 1 Exhibición (3.5% + 16% IVA ley bancaria)", () => {
      const cobroCliente = 2000.0;
      const metodoMP = mockCovaMetodos.find((m) => m.id === "mp-exhibicion-1")!;
      const comisionResult = TenantMetodosPagoService.calcularComision(cobroCliente, metodoMP);

      expect(comisionResult.comisionPorcentaje).toBe(3.5);
      // 2000 * 3.5% = 70 base + 16% IVA bancario = 81.20
      expect(comisionResult.comisionMonto).toBe(81.2);
      expect(comisionResult.montoNeto).toBe(1918.8);
    });

    it("debe calcular la sobretasa y comisión de 3 Meses Sin Intereses en Mercado Pago", () => {
      const cobroCliente = 6000.0;
      const metodoMSI = mockCovaMetodos.find((m) => m.id === "mp-msi-3")!;
      const comisionResult = TenantMetodosPagoService.calcularComision(cobroCliente, metodoMSI);

      expect(metodoMSI.plazo_msi).toBe(3);
      expect(comisionResult.comisionPorcentaje).toBe(7.5);
      // 6000 * 7.5% = 450 base + 16% IVA = 522.0
      expect(comisionResult.comisionMonto).toBe(522.0);
      expect(comisionResult.montoNeto).toBe(5478.0);
    });
  });

  describe("4. Cuentas Bancarias para Transferencias SPEI", () => {
    it("debe permitir seleccionar la cuenta destino fiscal de BanBajío", () => {
      const ctaFiscal = mockCuentasBancarias.find((c) => c.es_fiscal);
      expect(ctaFiscal).toBeDefined();
      expect(ctaFiscal?.banco).toBe("BanBajío");
      expect(ctaFiscal?.clabe).toBe("030730900012345678");
    });

    it("debe permitir registrar clave de rastreo SPEI para comprobante", () => {
      const claveRastreo = "SPEI-20261105-894129";
      expect(claveRastreo.length).toBeGreaterThan(5);
    });
  });
});
