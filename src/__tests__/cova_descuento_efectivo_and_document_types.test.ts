import { describe, it, expect } from "vitest";

describe("Validaciones de Precios según Forma de Pago y Diferenciación Cotización vs Nota", () => {
  describe("Esquema Dual de Precios Autogestionable por Tenant (Efectivo/SPEI Base vs Tarjeta)", () => {
    it("debe mantener el precio base para pagos en efectivo y transferencias SPEI", () => {
      const subtotalConIva = 1000.0;
      const porcentajeTarjetaAutogestionado = 4.3;
      const calcularTotal = (metodo: "efectivo" | "transferencia" | "tarjeta") => {
        if (metodo === "tarjeta") {
          return Math.round(subtotalConIva * (1 + porcentajeTarjetaAutogestionado / 100) * 100) / 100;
        }
        return subtotalConIva;
      };

      expect(calcularTotal("efectivo")).toBe(1000.0);
      expect(calcularTotal("transferencia")).toBe(1000.0);
      expect(calcularTotal("tarjeta")).toBe(1043.0);
    });

    it("el tenant puede autogestionar y personalizar el porcentaje de tarjeta (ej: 5.0% o 3.8%)", () => {
      const base = 5000.0;
      const porcentajePersonalizado = 5.0;
      const precioTarjeta = Math.round(base * (1 + porcentajePersonalizado / 100) * 100) / 100;

      expect(precioTarjeta).toBe(5250.0);
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

    it("debe ser resiliente a orden nula o indefinida en cálculo de saldos y opciones de pago (Null Safety en render)", () => {
      const order: any = null;
      const pagosList: any[] = [];
      const granTotal = 0;

      const totalPagado = pagosList
        .filter((p: any) => (p.estatus === "Aprobado" || p.estatus === "COMPLETADO") && !p.deleted_at)
        .reduce((acc: number, p: any) => acc + Number(p.monto_total || 0), 0);
      const totalDescuentosEnPagos = pagosList
        .filter((p: any) => (p.estatus === "Aprobado" || p.estatus === "COMPLETADO") && !p.deleted_at)
        .reduce((acc: number, p: any) => acc + Number(p.descuento_aplicado || 0), 0);

      const totalDescuentoOrden = Math.max(Number(order?.descuento_efectivo_monto || 0), totalDescuentosEnPagos);
      const saldoPendiente = Math.max(0, granTotal - totalPagado - totalDescuentoOrden);

      expect(totalDescuentoOrden).toBe(0);
      expect(saldoPendiente).toBe(0);
    });
  });
});
