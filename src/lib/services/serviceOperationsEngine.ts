/**
 * Engine for Cova Tires Service Packages, Operations Grouping, and Warranties.
 */

export interface OperationGroup {
  id: string;
  nombre: string;
  categoria: "Llantas" | "Suspensión" | "Frenos" | "General" | "Otro";
  tires: any[];
  services: any[];
  parts: any[];
  subtotal: number;
  garantiaTexto: string;
  hasMontajeEnTaller: boolean;
}

export const DEFAULT_OPERATION_PACKAGES = [
  "Llantas y Ruedas",
  "Suspensión y Dirección",
  "Frenos",
  "Mantenimiento y Servicios Generales",
];

/**
 * Categorizes an operation package name into a standard group category.
 */
export const classifyOperationCategory = (packageName: string): "Llantas" | "Suspensión" | "Frenos" | "General" | "Otro" => {
  const norm = (packageName || "").toLowerCase();
  if (norm.includes("llanta") || norm.includes("rueda") || norm.includes("neumat")) return "Llantas";
  if (norm.includes("suspens") || norm.includes("amortiguador") || norm.includes("direcc")) return "Suspensión";
  if (norm.includes("freno") || norm.includes("balata") || norm.includes("disco")) return "Frenos";
  if (norm.includes("mantenimiento") || norm.includes("general") || norm.includes("alineac") || norm.includes("afinac")) return "General";
  return "Otro";
};

/**
 * Determines warranty terms based on operation category and whether shop mounting was included.
 */
export const getOperationWarrantyText = (
  categoria: "Llantas" | "Suspensión" | "Frenos" | "General" | "Otro",
  hasMontaje: boolean,
  hasTires: boolean,
  customWarranty?: string | null
): string => {
  if (customWarranty) return customWarranty;

  if (categoria === "Llantas" || hasTires) {
    if (hasMontaje) {
      return "Garantía Cova Tires: 6 meses o 10,000 km en montaje, balanceo y rodamiento + Garantía de fábrica por escrito.";
    }
    return "Venta de neumáticos para llevar (Sin montaje en taller Cova). Garantía directa de fabricante por defecto de fábrica. No aplica garantía de instalación, alineación ni rodamiento.";
  }

  if (categoria === "Suspensión") {
    return "Garantía Cova Tires: 90 días o 5,000 km en mano de obra e instalación de componentes de suspensión.";
  }

  if (categoria === "Frenos") {
    return "Garantía Cova Tires: 60 días o 3,000 km en mano de obra de frenado y rectificado.";
  }

  return "Garantía estándar de taller: 30 días en mano de obra y servicio realizado.";
};

/**
 * Checks if a service is a mounting service (montaje).
 */
export const isMountingService = (service: any): boolean => {
  const sku = (service.servicios_taller?.codigo_sku || service.codigo_sku || "").toUpperCase();
  const name = (service.servicios_taller?.nombre || service.nombre || "").toLowerCase();
  return sku.startsWith("SRV-MONT") || name.includes("montaje");
};

/**
 * Groups tires, services, and parts by operation package for segmented presentation on quotes, orders, and print sheets.
 */
export const groupItemsByOperation = (
  tires: any[] = [],
  services: any[] = [],
  parts: any[] = []
): OperationGroup[] => {
  const groupsMap = new Map<string, { tires: any[]; services: any[]; parts: any[] }>();

  // Helper to place item into group
  const getGroupKey = (rawPkg?: string | null, fallback: string = "General") => {
    const pkg = (rawPkg || "").trim();
    return pkg.length > 0 ? pkg : fallback;
  };

  // 1. Group Tires (default to 'Llantas y Ruedas')
  for (const t of tires) {
    const key = getGroupKey(t.paquete_operacion, "Llantas y Ruedas");
    if (!groupsMap.has(key)) groupsMap.set(key, { tires: [], services: [], parts: [] });
    groupsMap.get(key)!.tires.push(t);
  }

  // 2. Group Services (auto-classify if not set)
  for (const s of services) {
    let key = (s.paquete_operacion || "").trim();
    if (!key || key.toLowerCase() === "general") {
      const srvName = (s.servicios_taller?.nombre || s.nombre || "").toLowerCase();
      const srvCat = (s.servicios_taller?.categoria || "").toLowerCase();
      if (srvName.includes("montaje") || srvName.includes("balanceo") || srvName.includes("válvula") || srvCat.includes("llanta")) {
        key = "Llantas y Ruedas";
      } else if (srvName.includes("amortiguador") || srvCat.includes("suspens")) {
        key = "Suspensión y Dirección";
      } else if (srvName.includes("balata") || srvCat.includes("freno")) {
        key = "Frenos";
      } else {
        key = "Mantenimiento y Servicios Generales";
      }
    }
    if (!groupsMap.has(key)) groupsMap.set(key, { tires: [], services: [], parts: [] });
    groupsMap.get(key)!.services.push(s);
  }

  // 3. Group Parts / Buyouts (auto-classify if not set)
  for (const p of parts) {
    let key = (p.paquete_operacion || "").trim();
    if (!key || key.toLowerCase() === "general") {
      const partName = (p.nombre || "").toLowerCase();
      if (partName.includes("amortiguador") || partName.includes("base") || partName.includes("rótula") || partName.includes("terminal")) {
        key = "Suspensión y Dirección";
      } else if (partName.includes("balata") || partName.includes("disco") || partName.includes("caliper")) {
        key = "Frenos";
      } else {
        key = "Mantenimiento y Servicios Generales";
      }
    }
    if (!groupsMap.has(key)) groupsMap.set(key, { tires: [], services: [], parts: [] });
    groupsMap.get(key)!.parts.push(p);
  }

  // Build OperationGroup objects
  const result: OperationGroup[] = [];
  for (const [nombre, items] of groupsMap.entries()) {
    let categoria = classifyOperationCategory(nombre);
    const hasTires = items.tires.length > 0;
    const hasMontaje = items.services.some(isMountingService);

    // If category could not be derived from the package name, infer from items
    if (categoria === "Otro") {
      if (hasTires) {
        categoria = "Llantas";
      } else if (
        items.parts.some((p) => {
          const n = (p.nombre || "").toLowerCase();
          return (
            n.includes("amortiguador") ||
            n.includes("base") ||
            n.includes("rótula") ||
            n.includes("terminal") ||
            n.includes("bieleta") ||
            n.includes("estabilizador") ||
            n.includes("cacahuate") ||
            n.includes("horquilla") ||
            n.includes("suspens")
          );
        }) ||
        items.services.some((s) => {
          const n = (s.servicios_taller?.nombre || s.nombre || "").toLowerCase();
          return n.includes("suspens") || n.includes("amortiguador") || n.includes("direcc") || n.includes("alineac");
        })
      ) {
        categoria = "Suspensión";
      } else if (
        items.parts.some((p) => {
          const n = (p.nombre || "").toLowerCase();
          return n.includes("balata") || n.includes("disco") || n.includes("freno") || n.includes("caliper") || n.includes("tambor");
        }) ||
        items.services.some((s) => {
          const n = (s.servicios_taller?.nombre || s.nombre || "").toLowerCase();
          return n.includes("freno") || n.includes("balata") || n.includes("rectific");
        })
      ) {
        categoria = "Frenos";
      } else {
        categoria = "General";
      }
    }

    const subtotalTires = items.tires.reduce((acc, t) => {
      const p = Number(t.precio_unitario || 0);
      const q = Number(t.cantidad || 1);
      return acc + (t.subtotal != null ? Number(t.subtotal) : p * q);
    }, 0);

    const subtotalServices = items.services.reduce((acc, s) => {
      const p = Number(s.precio_cobrado || 0);
      const q = Number(s.cantidad || 1);
      return acc + (s.subtotal != null ? Number(s.subtotal) : p * q);
    }, 0);

    const subtotalParts = items.parts.reduce((acc, p) => {
      const pUnit = Number(p.precio_unitario || 0);
      const q = Number(p.cantidad || 1);
      return acc + (p.subtotal != null ? Number(p.subtotal) : pUnit * q);
    }, 0);

    const subtotal = Math.round((subtotalTires + subtotalServices + subtotalParts) * 100) / 100;
    const garantiaTexto = getOperationWarrantyText(categoria, hasMontaje, hasTires);

    result.push({
      id: `op-${nombre.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
      nombre,
      categoria,
      tires: items.tires,
      services: items.services,
      parts: items.parts,
      subtotal,
      garantiaTexto,
      hasMontajeEnTaller: hasMontaje,
    });
  }

  // Sort groups: numbered blocks in order ("Bloque 1", "Operación 2"), then standard category order
  const categoryOrder: Record<string, number> = {
    Llantas: 1,
    Suspensión: 2,
    Frenos: 3,
    General: 4,
    Otro: 5,
  };

  return result.sort((a, b) => {
    const numA = a.nombre.match(/\d+/);
    const numB = b.nombre.match(/\d+/);
    if (numA && numB) {
      const diff = parseInt(numA[0], 10) - parseInt(numB[0], 10);
      if (diff !== 0) return diff;
    }
    return (categoryOrder[a.categoria] || 99) - (categoryOrder[b.categoria] || 99);
  });
};

/**
 * Creates the standard 4-Tire Promo Bundle items (Montaje $0.00 Cortesía, Válvulas $0.00 Cortesía, Balanceo dinámico).
 */
export const buildFourTiresPromoBundle = (
  rin: number = 16,
  quantity: number = 4,
  availableServices: any[] = []
) => {
  // Determine montage service based on rim size
  let montageSku = "SRV-MONT-16";
  if (rin >= 17 && rin <= 20) montageSku = "SRV-MONT-20";
  else if (rin > 20) montageSku = "SRV-MONT-CAM";

  const montageService = availableServices.find((s) => s.codigo_sku === montageSku) || {
    id: "promo-montaje",
    nombre: `Montaje de Llanta (Rin ${rin})`,
    precio: 100,
  };

  const valveService = availableServices.find((s) => s.codigo_sku === "SRV-VAL-TR413") || {
    id: "promo-valvula",
    nombre: "Válvula de Hule de Seguridad TR-413 (Nueva)",
    precio: 50,
  };

  const balanceService = availableServices.find((s) => s.codigo_sku === "SRV-BAL-CLIP") || {
    id: "promo-balanceo",
    nombre: "Balanceo Dinámico por Computadora (Plomo de Clip)",
    precio: 100,
  };

  return [
    {
      servicio_id: montageService.id,
      nombre: montageService.nombre,
      cantidad: quantity,
      precio_sugerido: Number(montageService.precio || 100),
      precio_cobrado: 0.00, // CORTESÍA / PROMOCIÓN
      es_cortesia: true,
      paquete_operacion: "Llantas y Ruedas",
      notas: "Cortesía en la compra de 4 neumáticos nuevos",
    },
    {
      servicio_id: valveService.id,
      nombre: valveService.nombre,
      cantidad: quantity,
      precio_sugerido: Number(valveService.precio || 50),
      precio_cobrado: 0.00, // CORTESÍA / PROMOCIÓN
      es_cortesia: true,
      paquete_operacion: "Llantas y Ruedas",
      notas: "Cortesía en la compra de 4 neumáticos nuevos",
    },
    {
      servicio_id: balanceService.id,
      nombre: balanceService.nombre,
      cantidad: quantity,
      precio_sugerido: Number(balanceService.precio || 100),
      precio_cobrado: Number(balanceService.precio || 100),
      es_cortesia: false,
      paquete_operacion: "Llantas y Ruedas",
      notas: "Balanceo computarizado de alta precisión",
    },
  ];
};
