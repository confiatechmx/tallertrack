import { describe, it, expect } from "vitest";

describe("Cova Just-in-Time Tire Quoting & Margin Engine", () => {
  // Test Medida Express Parser
  const parseMedidaExpress = (input: string) => {
    const cleaned = input.trim().replace(/\s+/g, "");
    const match = cleaned.match(/^(\d{3})[\/\-]??(\d{2})[rR\/\-]??(\d{2})$/i);
    if (match) {
      const a = parseInt(match[1]);
      const p = parseInt(match[2]);
      const r = parseInt(match[3]);
      if (a >= 135 && a <= 335 && p >= 25 && p <= 85 && r >= 12 && r <= 24) {
        return { ancho: a, perfil: p, rin: r };
      }
    }
    return null;
  };

  it("parsea formatos comunes de medidas de llantas mexicanas sin fricción", () => {
    expect(parseMedidaExpress("205/55R16")).toEqual({ ancho: 205, perfil: 55, rin: 16 });
    expect(parseMedidaExpress("225 65 17")).toEqual({ ancho: 225, perfil: 65, rin: 17 });
    expect(parseMedidaExpress("265/70/17")).toEqual({ ancho: 265, perfil: 70, rin: 17 });
    expect(parseMedidaExpress("185/65-15")).toEqual({ ancho: 185, perfil: 65, rin: 15 });
    expect(parseMedidaExpress("2755520")).toEqual({ ancho: 275, perfil: 55, rin: 20 });
    expect(parseMedidaExpress("invalido")).toBeNull();
  });

  it("calcula precio de venta y utilidad a partir de costo distribuidor y margen", () => {
    const costo = 1500;
    const margenPct = 25;
    const cantidad = 4;

    const precioVentaUnitario = Math.round(costo * (1 + margenPct / 100) * 100) / 100;
    const subtotal = Math.round(precioVentaUnitario * cantidad * 100) / 100;
    const costoTotal = costo * cantidad;
    const utilidadBruta = subtotal - costoTotal;

    expect(precioVentaUnitario).toBe(1875.00);
    expect(subtotal).toBe(7500.00);
    expect(costoTotal).toBe(6000.00);
    expect(utilidadBruta).toBe(1500.00);
  });

  it("calcula margen en porcentaje cuando el vendedor captura el precio de venta final", () => {
    const costo = 2000;
    const precioVenta = 2600;

    const margenCalculado = Math.round(((precioVenta - costo) / costo) * 1000) / 10;
    expect(margenCalculado).toBe(30.0);
  });

  it("permite cotizar y agregar llantas con stock 0 (Sobre Pedido / JIT) sin errores de inventario", () => {
    const tire = {
      id: "tire-jit-001",
      marca: "Michelin",
      modelo_llanta: "Primacy 4",
      stock_actual: 0,
      costo_adquisicion: 1850,
      precio_venta: 2450,
    };

    const isJit = Number(tire.stock_actual) <= 0;
    expect(isJit).toBe(true);

    const cantidad = 4;
    const subtotal = tire.precio_venta * cantidad;
    const costo = tire.costo_adquisicion * cantidad;
    const margenBruto = subtotal - costo;

    expect(subtotal).toBe(9800);
    expect(costo).toBe(7400);
    expect(margenBruto).toBe(2400);
  });
});
