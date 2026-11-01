import { describe, it, expect } from "vitest";
import {
  groupItemsByOperation,
  getOperationWarrantyText,
  classifyOperationCategory,
  buildFourTiresPromoBundle,
} from "../lib/services/serviceOperationsEngine";

describe("Cova Service Operations & Packaging Engine", () => {
  it("clasifica correctamente categorías de operación", () => {
    expect(classifyOperationCategory("Llantas y Ruedas")).toBe("Llantas");
    expect(classifyOperationCategory("Suspensión Delantera")).toBe("Suspensión");
    expect(classifyOperationCategory("Frenos Traseros")).toBe("Frenos");
    expect(classifyOperationCategory("Mantenimiento Preventivo")).toBe("General");
  });

  it("determina garantía diferenciada si las llantas incluyen montaje en taller vs para llevar", () => {
    const conMontaje = getOperationWarrantyText("Llantas", true, true);
    expect(conMontaje).toContain("Garantía Cova Tires: 6 meses o 10,000 km en montaje");
    expect(conMontaje).toContain("Garantía de fábrica");

    const sinMontaje = getOperationWarrantyText("Llantas", false, true);
    expect(sinMontaje).toContain("Venta de neumáticos para llevar");
    expect(sinMontaje).toContain("No aplica garantía de instalación");
  });

  it("agrupa llantas, refacciones y servicios asociados en secciones separadas con sus subtotales", () => {
    const tires = [
      {
        id: "t1",
        paquete_operacion: "Llantas y Ruedas",
        precio_unitario: 2500,
        cantidad: 4,
        subtotal: 10000,
      },
    ];

    const services = [
      {
        id: "s1",
        paquete_operacion: "Llantas y Ruedas",
        nombre: "Montaje de Llanta (Rin 17)",
        codigo_sku: "SRV-MONT-20",
        precio_cobrado: 0,
        es_cortesia: true,
        cantidad: 4,
        subtotal: 0,
      },
      {
        id: "s2",
        paquete_operacion: "Llantas y Ruedas",
        nombre: "Balanceo Dinámico",
        codigo_sku: "SRV-BAL-CLIP",
        precio_cobrado: 120,
        cantidad: 4,
        subtotal: 480,
      },
      {
        id: "s3",
        paquete_operacion: "Suspensión y Dirección",
        nombre: "Mano de Obra Amortiguadores",
        codigo_sku: "SRV-SUS-AMORT",
        precio_cobrado: 800,
        cantidad: 1,
        subtotal: 800,
      },
    ];

    const parts = [
      {
        id: "p1",
        paquete_operacion: "Suspensión y Dirección",
        nombre: "Amortiguadores Delanteros Monroe",
        precio_unitario: 1800,
        cantidad: 2,
        subtotal: 3600,
      },
      {
        id: "p2",
        paquete_operacion: "Suspensión y Dirección",
        nombre: "Bases de Amortiguador",
        precio_unitario: 650,
        cantidad: 2,
        subtotal: 1300,
      },
    ];

    const groups = groupItemsByOperation(tires, services, parts);

    expect(groups).toHaveLength(2);

    // Group 1: Llantas
    const llantasGroup = groups.find((g) => g.nombre === "Llantas y Ruedas")!;
    expect(llantasGroup).toBeDefined();
    expect(llantasGroup.tires).toHaveLength(1);
    expect(llantasGroup.services).toHaveLength(2);
    expect(llantasGroup.subtotal).toBe(10480);
    expect(llantasGroup.hasMontajeEnTaller).toBe(true);
    expect(llantasGroup.garantiaTexto).toContain("Garantía Cova Tires: 6 meses");

    // Group 2: Suspensión
    const suspGroup = groups.find((g) => g.nombre === "Suspensión y Dirección")!;
    expect(suspGroup).toBeDefined();
    expect(suspGroup.parts).toHaveLength(2);
    expect(suspGroup.services).toHaveLength(1);
    expect(suspGroup.subtotal).toBe(5700); // 3600 + 1300 + 800
    expect(suspGroup.garantiaTexto).toContain("90 días o 5,000 km");
  });

  it("genera el paquete de 4 llantas con montaje y válvulas de cortesía ($0.00)", () => {
    const bundle = buildFourTiresPromoBundle(16, 4, [
      { id: "s-m16", codigo_sku: "SRV-MONT-16", nombre: "Montaje R16", precio: 100 },
      { id: "s-val", codigo_sku: "SRV-VAL-TR413", nombre: "Válvula TR-413", precio: 50 },
      { id: "s-bal", codigo_sku: "SRV-BAL-CLIP", nombre: "Balanceo Clip", precio: 100 },
    ]);

    expect(bundle).toHaveLength(3);

    // Montaje debe ser $0.00
    expect(bundle[0].precio_cobrado).toBe(0.00);
    expect(bundle[0].es_cortesia).toBe(true);

    // Válvulas deben ser $0.00
    expect(bundle[1].precio_cobrado).toBe(0.00);
    expect(bundle[1].es_cortesia).toBe(true);

    // Balanceo mantiene su cobro
    expect(bundle[2].precio_cobrado).toBe(100);
    expect(bundle[2].es_cortesia).toBe(false);
  });
});
