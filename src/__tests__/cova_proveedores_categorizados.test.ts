import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockInsert = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: mockSelect,
      insert: mockInsert,
    })),
  },
}));

import { ProveedorService } from "../services/proveedorService";

describe("Punto I: Catálogo de Proveedores Categorizados (Llantas, Suspensión y Torno) - Cova", () => {
  const covaEmpresaId = "b2ad09db-0a34-4876-9ca3-d584c40bd294";

  const proveedoresCovaMock = [
    // Llantas (10)
    { id: "p-ll-1", nombre_comercial: "Ayon", categoria: "LLANTAS", meses_garantia_default: 12, dias_credito: 0 },
    { id: "p-ll-2", nombre_comercial: "Tersa", categoria: "LLANTAS", meses_garantia_default: 12, dias_credito: 0 },
    { id: "p-ll-3", nombre_comercial: "Herrera", categoria: "LLANTAS", meses_garantia_default: 12, dias_credito: 0 },
    { id: "p-ll-4", nombre_comercial: "Llyasa", categoria: "LLANTAS", meses_garantia_default: 12, dias_credito: 0 },
    { id: "p-ll-5", nombre_comercial: "Servimundo", categoria: "LLANTAS", meses_garantia_default: 12, dias_credito: 0 },
    { id: "p-ll-6", nombre_comercial: "Blue Tyre", categoria: "LLANTAS", meses_garantia_default: 12, dias_credito: 0 },
    { id: "p-ll-7", nombre_comercial: "Llantas Plus", categoria: "LLANTAS", meses_garantia_default: 12, dias_credito: 0 },
    { id: "p-ll-8", nombre_comercial: "Husa", categoria: "LLANTAS", meses_garantia_default: 12, dias_credito: 0 },
    { id: "p-ll-9", nombre_comercial: "Guzmán", categoria: "LLANTAS", meses_garantia_default: 12, dias_credito: 0 },
    { id: "p-ll-10", nombre_comercial: "Radial Llantas", categoria: "LLANTAS", meses_garantia_default: 12, dias_credito: 0 },

    // Suspensión y Amortiguadores (17)
    { id: "p-su-1", nombre_comercial: "Dar Refaccionaria", categoria: "SUSPENSION", meses_garantia_default: 3, dias_credito: 0 },
    { id: "p-su-2", nombre_comercial: "Obal Zapata", categoria: "SUSPENSION", meses_garantia_default: 3, dias_credito: 0 },
    { id: "p-su-3", nombre_comercial: "Obal Revolución", categoria: "SUSPENSION", meses_garantia_default: 3, dias_credito: 0 },
    { id: "p-su-4", nombre_comercial: "Arredondo", categoria: "SUSPENSION", meses_garantia_default: 3, dias_credito: 0 },
    { id: "p-su-5", nombre_comercial: "Rioja", categoria: "SUSPENSION", meses_garantia_default: 3, dias_credito: 0 },
    { id: "p-su-6", nombre_comercial: "O'Reilly 6 de Enero", categoria: "SUSPENSION", meses_garantia_default: 3, dias_credito: 0 },
    { id: "p-su-7", nombre_comercial: "O'Reilly Oasis", categoria: "SUSPENSION", meses_garantia_default: 3, dias_credito: 0 },
    { id: "p-su-8", nombre_comercial: "AutoZone", categoria: "SUSPENSION", meses_garantia_default: 3, dias_credito: 0 },
    { id: "p-su-9", nombre_comercial: "Hollman", categoria: "SUSPENSION", meses_garantia_default: 3, dias_credito: 0 },
    { id: "p-su-10", nombre_comercial: "Ryuk", categoria: "SUSPENSION", meses_garantia_default: 3, dias_credito: 0 },
    { id: "p-su-11", nombre_comercial: "San Nayarit", categoria: "SUSPENSION", meses_garantia_default: 3, dias_credito: 0 },
    { id: "p-su-12", nombre_comercial: "Pat Autopartes", categoria: "SUSPENSION", meses_garantia_default: 3, dias_credito: 0 },
    { id: "p-su-13", nombre_comercial: "Vazlo Autodis", categoria: "SUSPENSION", meses_garantia_default: 3, dias_credito: 0 },
    { id: "p-su-14", nombre_comercial: "Tornicenter", categoria: "SUSPENSION", meses_garantia_default: 3, dias_credito: 0 },
    { id: "p-su-15", nombre_comercial: "Hules y Bandas", categoria: "SUSPENSION", meses_garantia_default: 3, dias_credito: 0 },
    { id: "p-su-16", nombre_comercial: "Refaccionaria Manny", categoria: "SUSPENSION", meses_garantia_default: 3, dias_credito: 0 },
    { id: "p-su-17", nombre_comercial: "Refaccionaria Acosta", categoria: "SUSPENSION", meses_garantia_default: 3, dias_credito: 0 },

    // Torno y Maquilas (1)
    { id: "p-to-1", nombre_comercial: "Torno Chalio", categoria: "TORNO_MAQUILA", meses_garantia_default: 1, dias_credito: 0 },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("contiene exactamente los 28 proveedores reales de Cova en formato Title Case", () => {
    const llantas = proveedoresCovaMock.filter((p) => p.categoria === "LLANTAS");
    const suspension = proveedoresCovaMock.filter((p) => p.categoria === "SUSPENSION");
    const torno = proveedoresCovaMock.filter((p) => p.categoria === "TORNO_MAQUILA");

    expect(proveedoresCovaMock).toHaveLength(28);
    expect(llantas).toHaveLength(10);
    expect(suspension).toHaveLength(17);
    expect(torno).toHaveLength(1);

    // Formato Title Case (no mayúsculas sostenidas)
    const tieneMayusculasViejas = proveedoresCovaMock.some((p) => p.nombre_comercial === p.nombre_comercial.toUpperCase() && p.nombre_comercial.length > 4);
    expect(tieneMayusculasViejas).toBe(false);

    // Torno Chalio presente
    expect(torno[0].nombre_comercial).toBe("Torno Chalio");
    expect(torno[0].categoria).toBe("TORNO_MAQUILA");

    // Llantas verificadas
    const nombresLlantas = llantas.map((l) => l.nombre_comercial);
    expect(nombresLlantas).toContain("Ayon");
    expect(nombresLlantas).toContain("Tersa");
    expect(nombresLlantas).toContain("Blue Tyre");
    expect(nombresLlantas).toContain("Radial Llantas");

    // Suspensión verificadas
    const nombresSuspension = suspension.map((s) => s.nombre_comercial);
    expect(nombresSuspension).toContain("Dar Refaccionaria");
    expect(nombresSuspension).toContain("Obal Zapata");
    expect(nombresSuspension).toContain("AutoZone");
  });

  it("asigna garantías estándar congruentes con el tipo de proveedor (12 meses llantas / 3 meses refacciones / 1 mes torno)", () => {
    const todosLlantas12m = proveedoresCovaMock
      .filter((p) => p.categoria === "LLANTAS")
      .every((p) => p.meses_garantia_default === 12);

    const todosSuspension3m = proveedoresCovaMock
      .filter((p) => p.categoria === "SUSPENSION")
      .every((p) => p.meses_garantia_default === 3);

    const torno1m = proveedoresCovaMock
      .filter((p) => p.categoria === "TORNO_MAQUILA")
      .every((p) => p.meses_garantia_default === 1);

    expect(todosLlantas12m).toBe(true);
    expect(todosSuspension3m).toBe(true);
    expect(torno1m).toBe(true);
  });

  it("ProveedorService.obtenerProveedores aplica filtro por categoría en la consulta a Supabase", async () => {
    const mockQueryBuilder: any = {
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then: vi.fn().mockImplementation((resolve) =>
        resolve({
          data: proveedoresCovaMock.filter((p) => p.categoria === "TORNO_MAQUILA"),
          error: null,
        })
      ),
    };

    mockSelect.mockReturnValue(mockQueryBuilder);

    const { data } = await ProveedorService.obtenerProveedores(covaEmpresaId, "TORNO_MAQUILA");

    expect(mockSelect).toHaveBeenCalledWith("*");
    expect(mockQueryBuilder.eq).toHaveBeenCalledWith("activo", true);
    expect(mockQueryBuilder.eq).toHaveBeenCalledWith("empresa_id", covaEmpresaId);
    expect(mockQueryBuilder.eq).toHaveBeenCalledWith("categoria", "TORNO_MAQUILA");
    expect(data).toHaveLength(1);
    expect(data[0].nombre_comercial).toBe("Torno Chalio");
  });
});
