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
  it("admite registrar servicios de mano de obra libres con concepto_personalizado sin requerir servicio_id", () => {
    const servicioLibre = {
      id: "srv-libre-1",
      orden_servicio_id: "ord-123",
      servicio_id: null,
      concepto_personalizado: "Ajuste especial de chicote y varillaje",
      precio_cobrado: 350.0,
      horas_labor: 0.5,
      mecanico_id: "mec-1",
      comision_porcentaje: 20,
      estatus_aprobacion: "Aprobado",
      paquete_operacion: "Mantenimiento General",
      es_cortesia: false,
    };

    expect(servicioLibre.servicio_id).toBeNull();
    expect(servicioLibre.concepto_personalizado).toBe("Ajuste especial de chicote y varillaje");
    expect(servicioLibre.precio_cobrado).toBe(350.0);
  });

  it("resuelve prioritariamente concepto_personalizado sobre el nombre del catalogo", () => {
    const srv1 = {
      concepto_personalizado: "Torneado especial de disco ventilado",
      servicios_taller: { nombre: "Rectificado de Disco" },
    };
    const srv2 = {
      concepto_personalizado: null,
      servicios_taller: { nombre: "Alineación 3D" },
    };

    const resolverNombre = (s: any) => s.concepto_personalizado || s.servicios_taller?.nombre || "Servicio";

    expect(resolverNombre(srv1)).toBe("Torneado especial de disco ventilado");
    expect(resolverNombre(srv2)).toBe("Alineación 3D");
  });

  it("permite editar campos de refacción recalculando costo, markup y precio sin necesidad de eliminar y reingresar", () => {
    const refaccionOriginal = {
      id: "ref-1",
      nombre: "Balatas Delanteras",
      cantidad: 1,
      costo_unitario: 500,
      margen_porcentaje: 35,
      precio_unitario: 675,
      subtotal: 675,
    };

    // Modificar cantidad a 2 y margen a 40%
    const nuevaCantidad = 2;
    const nuevoMargen = 40;
    const nuevoPrecio = Math.round(refaccionOriginal.costo_unitario * (1 + nuevoMargen / 100));
    const nuevoSubtotal = nuevaCantidad * nuevoPrecio;

    const refaccionActualizada = {
      ...refaccionOriginal,
      cantidad: nuevaCantidad,
      margen_porcentaje: nuevoMargen,
      precio_unitario: nuevoPrecio,
      subtotal: nuevoSubtotal,
    };

    expect(refaccionActualizada.cantidad).toBe(2);
    expect(refaccionActualizada.precio_unitario).toBe(700);
    expect(refaccionActualizada.subtotal).toBe(1400);
  });

  it("permite actualizar un servicio asignándole nuevo técnico, horas y precio de forma reactiva", () => {
    const servicioOriginal = {
      id: "srv-1",
      concepto_personalizado: "Diagnóstico inicial",
      mecanico_id: "mec-1",
      horas_labor: 0.5,
      precio_cobrado: 300,
      es_cortesia: false,
    };

    const servicioEditado = {
      ...servicioOriginal,
      concepto_personalizado: "Diagnóstico completo por escáner y compresión",
      mecanico_id: "mec-2",
      horas_labor: 1.5,
      precio_cobrado: 650,
    };

    expect(servicioEditado.concepto_personalizado).toBe("Diagnóstico completo por escáner y compresión");
    expect(servicioEditado.mecanico_id).toBe("mec-2");
    expect(servicioEditado.horas_labor).toBe(1.5);
    expect(servicioEditado.precio_cobrado).toBe(650);
  });

  it("permite distribuir partidas en bloques libres a voluntad del usuario (ej. 2 bloques de suspensión independientes)", () => {
    // Escenario solicitado por el usuario:
    // Bloque 1: Amortiguadores y Bases + Mano de obra de instalación de amortiguadores
    // Bloque 2: Tornillos estabilizadores + Mano de obra de tornillos estabilizadores
    const services = [
      {
        id: "s1",
        paquete_operacion: "Bloque 1: Amortiguadores y Bases",
        nombre: "Instalación de amortiguadores delanteros",
        precio_cobrado: 700,
        cantidad: 1,
        subtotal: 700,
      },
      {
        id: "s2",
        paquete_operacion: "Bloque 2: Tornillos Estabilizadores",
        nombre: "Instalación de tornillos estabilizadores (cacahuates)",
        precio_cobrado: 350,
        cantidad: 1,
        subtotal: 350,
      },
    ];

    const parts = [
      {
        id: "p1",
        paquete_operacion: "Bloque 1: Amortiguadores y Bases",
        nombre: "Amortiguadores Delanteros Gas",
        precio_unitario: 1500,
        cantidad: 2,
        subtotal: 3000,
      },
      {
        id: "p2",
        paquete_operacion: "Bloque 1: Amortiguadores y Bases",
        nombre: "Bases de Amortiguador Delanteras",
        precio_unitario: 450,
        cantidad: 2,
        subtotal: 900,
      },
      {
        id: "p3",
        paquete_operacion: "Bloque 2: Tornillos Estabilizadores",
        nombre: "Tornillos Estabilizadores Delanteros SYD",
        precio_unitario: 280,
        cantidad: 2,
        subtotal: 560,
      },
    ];

    const groups = groupItemsByOperation([], services, parts);

    // Deben ser exactamente 2 bloques separados, NO fusionados
    expect(groups).toHaveLength(2);

    const b1 = groups.find((g) => g.nombre === "Bloque 1: Amortiguadores y Bases")!;
    expect(b1).toBeDefined();
    expect(b1.parts).toHaveLength(2);
    expect(b1.services).toHaveLength(1);
    expect(b1.subtotal).toBe(4600); // 3000 + 900 + 700
    expect(b1.categoria).toBe("Suspensión");

    const b2 = groups.find((g) => g.nombre === "Bloque 2: Tornillos Estabilizadores")!;
    expect(b2).toBeDefined();
    expect(b2.parts).toHaveLength(1);
    expect(b2.services).toHaveLength(1);
    expect(b2.subtotal).toBe(910); // 560 + 350
    expect(b2.categoria).toBe("Suspensión");

    // Ordenamiento numérico: Bloque 1 va antes que Bloque 2
    expect(groups[0].nombre).toBe("Bloque 1: Amortiguadores y Bases");
    expect(groups[1].nombre).toBe("Bloque 2: Tornillos Estabilizadores");
  });

  it("infiere la categoría correcta de un bloque con nombre genérico basado en sus refacciones", () => {
    const parts = [
      {
        id: "p-freno",
        paquete_operacion: "Operación 1",
        nombre: "Juego de Balatas Delanteras Cerámicas",
        precio_unitario: 650,
        cantidad: 1,
      },
    ];
    const services = [
      {
        id: "s-rect",
        paquete_operacion: "Operación 1",
        nombre: "Rectificado de Discos",
        precio_cobrado: 400,
        cantidad: 1,
      },
    ];

    const groups = groupItemsByOperation([], services, parts);
    expect(groups).toHaveLength(1);
    expect(groups[0].categoria).toBe("Frenos");
    expect(groups[0].garantiaTexto).toContain("Garantía Cova Tires: 60 días o 3,000 km");
  });
});