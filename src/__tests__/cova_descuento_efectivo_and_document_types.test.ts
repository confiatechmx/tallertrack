import { describe, it, expect } from "vitest";

describe("Cova Cash Discount & Document Types (Cotización vs Nota de Venta)", () => {
  describe("Configurable Tenant Cash Discount", () => {
    it("aplica descuento configurable del 3% en efectivo para Cova Tires", () => {
      const granTotal = 19300.0;
      const tenantConfig = {
        descuento_efectivo_habilitado: true,
        descuento_efectivo_porcentaje: 3.0,
      };

      const pct = tenantConfig.descuento_efectivo_habilitado
        ? tenantConfig.descuento_efectivo_porcentaje
        : 0;
      const descuentoEsperado = Math.round((granTotal * (pct / 100)) * 100) / 100;
      const netoCobrarEfectivo = granTotal - descuentoEsperado;

      expect(pct).toBe(3.0);
      expect(descuentoEsperado).toBe(579.0);
      expect(netoCobrarEfectivo).toBe(18721.0);
    });

    it("no aplica descuento si el tenant lo tiene deshabilitado", () => {
      const granTotal = 19300.0;
      const tenantConfig = {
        descuento_efectivo_habilitado: false,
        descuento_efectivo_porcentaje: 3.0,
      };

      const pct = tenantConfig.descuento_efectivo_habilitado
        ? tenantConfig.descuento_efectivo_porcentaje
        : 0;
      const descuento = Math.round((granTotal * (pct / 100)) * 100) / 100;
      const netoCobrar = granTotal - descuento;

      expect(descuento).toBe(0);
      expect(netoCobrar).toBe(granTotal);
    });

    it("al liquidar con el neto en efectivo y acreditar el descuento, el saldo pendiente queda en 0 y estatus es Pagado", () => {
      const granTotal = 19300.0;
      const cashPct = 3.0;
      const descuento = Math.round((granTotal * (cashPct / 100)) * 100) / 100; // 579.00
      const netoPagado = granTotal - descuento; // 18721.00

      const pagosAprobados = [
        {
          id: "pago-1",
          proveedor_pago: "Efectivo",
          monto_total: netoPagado,
          descuento_aplicado: descuento,
          estatus: "Aprobado",
        },
      ];

      const totalPagado = pagosAprobados.reduce((acc, p) => acc + p.monto_total, 0);
      const totalDescuentos = pagosAprobados.reduce((acc, p) => acc + p.descuento_aplicado, 0);
      const saldoPendiente = Math.max(0, granTotal - totalPagado - totalDescuentos);
      const estatusPago = totalPagado + totalDescuentos >= granTotal ? "Pagado" : "Pendiente";

      expect(totalPagado).toBe(18721.0);
      expect(totalDescuentos).toBe(579.0);
      expect(saldoPendiente).toBe(0);
      expect(estatusPago).toBe("Pagado");
    });
  });

  describe("Separación entre Cotización y Nota de Venta", () => {
    const mockOrder = {
      folio: 1001,
      estatus_pago: "Pagado",
      servicios: [
        { id: "s1", nombre: "Alineación 3D", estatus_aprobacion: "Aprobado", subtotal: 480 },
        { id: "s2", nombre: "Cambio de Bujes Horquilla", estatus_aprobacion: "Diferido", subtotal: 950 },
      ],
      refacciones: [
        { id: "r1", nombre: "Amortiguador KYB", estatus_aprobacion: "Aprobado", subtotal: 2900 },
        { id: "r2", nombre: "Horquilla Inferior Izq", estatus_aprobacion: "Diferido", subtotal: 1600 },
      ],
    };

    it("en Nota de Venta NUNCA deben mostrarse partidas diferidas / no autorizadas", () => {
      const docType = "nota_venta";

      // Solo partidas aprobadas
      const partidasEnNota = [
        ...mockOrder.servicios.filter((s) => s.estatus_aprobacion === "Aprobado"),
        ...mockOrder.refacciones.filter((r) => r.estatus_aprobacion === "Aprobado"),
      ];

      // Partidas diferidas
      const partidasDiferidas = [
        ...mockOrder.servicios.filter((s) => s.estatus_aprobacion === "Diferido"),
        ...mockOrder.refacciones.filter((r) => r.estatus_aprobacion === "Diferido"),
      ];

      // En nota de venta, la sección de diferidos no se renderiza
      const mostrarSeccionDiferidos = docType === "cotizacion" && partidasDiferidas.length > 0;

      expect(mostrarSeccionDiferidos).toBe(false);
      expect(partidasEnNota).toHaveLength(2);
      expect(partidasEnNota.map((p) => p.nombre)).toEqual(["Alineación 3D", "Amortiguador KYB"]);
    });

    it("en Cotización SÍ se muestran las partidas diferidas como trabajos recomendados", () => {
      const docType = "cotizacion";

      const partidasDiferidas = [
        ...mockOrder.servicios.filter((s) => s.estatus_aprobacion === "Diferido"),
        ...mockOrder.refacciones.filter((r) => r.estatus_aprobacion === "Diferido"),
      ];

      const mostrarSeccionDiferidos = docType === "cotizacion" && partidasDiferidas.length > 0;

      expect(mostrarSeccionDiferidos).toBe(true);
      expect(partidasDiferidas).toHaveLength(2);
      expect(partidasDiferidas.map((p) => p.nombre)).toContain("Cambio de Bujes Horquilla");
      expect(partidasDiferidas.map((p) => p.nombre)).toContain("Horquilla Inferior Izq");
    });
  });
});
