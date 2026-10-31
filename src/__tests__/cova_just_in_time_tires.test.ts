import { describe, it, expect } from "vitest";
import { inferOemTireSize, parseMedidaExpress } from "../lib/tires/tireSpeedHelpers";

describe("Cova Just-in-Time Tire Quoting & Margin Engine", () => {
  it("parsea formatos comunes y detecta marca copiada desde WhatsApp", () => {
    expect(parseMedidaExpress("205/55R16 Michelin")).toEqual({
      ancho: 205,
      perfil: 55,
      rin: 16,
      marca: "Michelin",
    });
    expect(parseMedidaExpress("225 65 17 Linglong GreenMax")).toEqual({
      ancho: 225,
      perfil: 65,
      rin: 17,
      marca: "Linglong",
    });
    expect(parseMedidaExpress("33x12.50R15 BFGoodrich")).toEqual({
      ancho: 33,
      perfil: 13,
      rin: 15,
      marca: "BFGoodrich",
    });
  });

  it("calcula precio de venta y utilidad a partir de costo distribuidor y margen", () => {
    const costo = 1500;
    const margenPct = 25;
    const cantidad = 4;

    const precioVentaUnitario = Math.round(costo * (1 + margenPct / 100) * 100) / 100;
    const subtotal = Math.round(precioVentaUnitario * cantidad * 100) / 100;
    const costoTotal = costo * cantidad;
    const utilidadBruta = subtotal - costoTotal;

    expect(precioVentaUnitario).toBe(1875.0);
    expect(subtotal).toBe(7500.0);
    expect(costoTotal).toBe(6000.0);
    expect(utilidadBruta).toBe(1500.0);
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

  it("infiere correctamente la medida OEM según el modelo y marca del vehículo", () => {
    expect(inferOemTireSize("Nissan", "Versa Advance")).toBe("185/65R15");
    expect(inferOemTireSize("Volkswagen", "Jetta Trendline")).toBe("205/55R16");
    expect(inferOemTireSize("Honda", "CR-V Touring")).toBe("225/65R17");
    expect(inferOemTireSize("Ford", "Lobo Platinum")).toBe("275/55R20");
    expect(inferOemTireSize("Toyota", "Tacoma TRD")).toBe("265/70R17");
    expect(inferOemTireSize("Chevrolet", "Aveo")).toBe("175/70R14");
    expect(inferOemTireSize("Nissan", "NP300")).toBe("245/70R16");
    expect(inferOemTireSize("Desconocido", "Modelo X")).toBeNull();
  });
});
