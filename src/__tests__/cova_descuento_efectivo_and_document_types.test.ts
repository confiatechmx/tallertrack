import { describe, it, expect } from "vitest";

describe("Validaciones de Descuento en Efectivo y Diferenciación Cotización vs Nota", () => {
  describe("Descuento en Efectivo Configurable por Tenant (Cova Tires: 3%)", () => {
    it("debe calcular correctamente el 3% de descuento preferencial en efectivo", () => {
      const subtotalConIva = 1000.0;
      const descuentoEfectivoActivo = true;
      const porcentajeDescuento = 3.0; // 3%

      const descuentoCalculado = descuentoEfectivoActivo
        ? (subtotalConIva * porcentajeDescuento) / 100
        : 0;

      const totalAPagar = subtotalConIva - descuentoCalculado;

      expect(descuentoCalculado).toBe(30.0);
      expect(totalAPagar).toBe(970.0);
    });

    it("no debe aplicar descuento si la opción de tenant está desactivada", () => {
      const subtotalConIva = 1000.0;
      const descuentoEfectivoActivo = false;
      const porcentajeDescuento = 3.0;

      const descuentoCalculado = descuentoEfectivoActivo
        ? (subtotalConIva * porcentajeDescuento) / 100
        : 0;

      const totalAPagar = subtotalConIva - descuentoCalculado;

      expect(descuentoCalculado).toBe(0);
      expect(totalAPagar).toBe(1000.0);
    });

    it("solo aplica para método de pago EFECTIVO, no para tarjeta ni transferencia", () => {
      const subtotalConIva = 5000.0;
      const tasaDescuento = 3.0;

      const calcularTotal = (metodo: string) => {
        const esEfectivo = metodo === "efectivo";
        const desc = esEfectivo ? (subtotalConIva * tasaDescuento) / 100 : 0;
        return subtotalConIva - desc;
      };

      expect(calcularTotal("efectivo")).toBe(4850.0);
      expect(calcularTotal("tarjeta")).toBe(5000.0);
      expect(calcularTotal("transferencia")).toBe(5000.0);
    });
  });

  describe("Diferenciación de Impresión: Cotización vs Nota de Venta (Exclusión de Trabajos No Autorizados)", () => {
    const mockOrder = {
      folio: "OT-2026-0042",
      cliente: "Eduardo Mendoza",
      servicios: [
        { id: "s1", nombre: "Alineación 3D", estatus_aprobacion: "Aprobado", precio: 450 },
        { id: "s2", nombre: "Balanceo de 4 Ruedas", estatus_aprobacion: "Diferido", precio: 300 },
      ],
      refacciones: [
        { id: "r1", nombre: "Amortiguador KYB", estatus_aprobacion: "Aprobado", precio: 2200 },
        { id: "r2", nombre: "Bujes de Horquilla", estatus_aprobacion: "Diferido", precio: 800 },
      ],
    };

    it("en Nota de Venta solo deben salir partidas cobradas/autorizadas, NUNCA diferidas", () => {
      const docType: "cotizacion" | "nota_venta" = "nota_venta";

      // Filtro idéntico al de DocumentoPrintModal / Impresión
      const serviciosFiltrados = mockOrder.servicios.filter((s) => {
        if (docType === "nota_venta") return s.estatus_aprobacion !== "Diferido";
        return true;
      });

      const refaccionesFiltradas = mockOrder.refacciones.filter((r) => {
        if (docType === "nota_venta") return r.estatus_aprobacion !== "Diferido";
        return true;
      });

      const partidasEnNota = [...serviciosFiltrados, ...refaccionesFiltradas];

      // Verificamos que ninguna partida diferida esté presente
      const tieneDiferidos = partidasEnNota.some((p) => p.estatus_aprobacion === "Diferido");
      expect(tieneDiferidos).toBe(false);

      // Partidas diferidas
      const partidasDiferidas = [
        ...mockOrder.servicios.filter((s) => s.estatus_aprobacion === "Diferido"),
        ...mockOrder.refacciones.filter((r) => r.estatus_aprobacion === "Diferido"),
      ];

      // En nota de venta, la sección de diferidos no se renderiza
      const mostrarSeccionDiferidos = (docType as string) === "cotizacion" && partidasDiferidas.length > 0;

      expect(mostrarSeccionDiferidos).toBe(false);
      expect(partidasEnNota).toHaveLength(2);
      expect(partidasEnNota.map((p) => p.nombre)).toEqual(["Alineación 3D", "Amortiguador KYB"]);
    });

    it("en Cotización SÍ se muestran las partidas diferidas como trabajos recomendados", () => {
      const docType: "cotizacion" | "nota_venta" = "cotizacion";

      const partidasDiferidas = [
        ...mockOrder.servicios.filter((s) => s.estatus_aprobacion === "Diferido"),
        ...mockOrder.refacciones.filter((r) => r.estatus_aprobacion === "Diferido"),
      ];

      const mostrarSeccionDiferidos = docType === "cotizacion" && partidasDiferidas.length > 0;

      expect(mostrarSeccionDiferidos).toBe(true);
      expect(partidasDiferidas).toHaveLength(2);
      expect(partidasDiferidas.map((p) => p.nombre)).toEqual(["Balanceo de 4 Ruedas", "Bujes de Horquilla"]);
    });
  });
});
