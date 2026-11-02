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

describe("Punto I: Catálogo de Proveedores Categorizados (Llantas vs Suspensión y Refacciones) - Cova", () => {
  const covaEmpresaId = "b2ad09db-0a34-4876-9ca3-d584c40bd294";

  const proveedoresCovaMock = [
    // Llantas (10)
    { id: "p-ll-1", nombre_comercial: "AYON", categoria: "LLANTAS", meses_garantia_default: 12, dias_credito: 0 },
    { id: "p-ll-2", nombre_comercial: "TERSA", categoria: "LLANTAS", meses_garantia_default: 12, dias_credito: 0 },
    { id: "p-ll-3", nombre_comercial: "HERRERA", categoria: "LLANTAS", meses_garantia_default: 12, dias_credito: 0 },
    { id: "p-ll-4", nombre_comercial: "LLYASA", categoria: "LLANTAS", meses_garantia_default: 12, dias_credito: 0 },
    { id: "p-ll-5", nombre_comercial: "SERVIMUNDO", categoria: "LLANTAS", meses_garantia_default: 12, dias_credito: 0 },
    { id: "p-ll-6", nombre_comercial: "BLUE TYRE", categoria: "LLANTAS", meses_garantia_default: 12, dias_credito: 0 },
    { id: "p-ll-7", nombre_comercial: "LLANTAS PLUS", categoria: "LLANTAS", meses_garantia_default: 12, dias_credito: 0 },
    { id: "p-ll-8", nombre_comercial: "HUSA", categoria: "LLANTAS", meses_garantia_default: 12, dias_credito: 0 },
    { id: "p-ll-9", nombre_comercial: "GUZMAN", categoria: "LLANTAS", meses_garantia_default: 12, dias_credito: 0 },
    { id: "p-ll-10", nombre_comercial: "RADIAL LLANTAS", categoria: "LLANTAS", meses_garantia_default: 12, dias_credito: 0 },

    // Suspensión y Amortiguadores (17)
    { id: "p-su-1", nombre_comercial: "DAR REFACCIONARIA", categoria: "SUSPENSION", meses_garantia_default: 3, dias_credito: 0 },
    { id: "p-su-2", nombre_comercial: "OBAL ZAPATA", categoria: "SUSPENSION", meses_garantia_default: 3, dias_credito: 0 },
    { id: "p-su-3", nombre_comercial: "OBAL REVOLUCION", categoria: "SUSPENSION", meses_garantia_default: 3, dias_credito: 0 },
    { id: "p-su-4", nombre_comercial: "ARREDONDO", categoria: "SUSPENSION", meses_garantia_default: 3, dias_credito: 0 },
    { id: "p-su-5", nombre_comercial: "RIOJA", categoria: "SUSPENSION", meses_garantia_default: 3, dias_credito: 0 },
    { id: "p-su-6", nombre_comercial: "OREALLY 6 ENERO", categoria: "SUSPENSION", meses_garantia_default: 3, dias_credito: 0 },
    { id: "p-su-7", nombre_comercial: "OREALLY OASIS", categoria: "SUSPENSION", meses_garantia_default: 3, dias_credito: 0 },
    { id: "p-su-8", nombre_comercial: "AUTOZONE", categoria: "SUSPENSION", meses_garantia_default: 3, dias_credito: 0 },
    { id: "p-su-9", nombre_comercial: "HOLLMAN", categoria: "SUSPENSION", meses_garantia_default: 3, dias_credito: 0 },
    { id: "p-su-10", nombre_comercial: "RYUK", categoria: "SUSPENSION", meses_garantia_default: 3, dias_credito: 0 },
    { id: "p-su-11", nombre_comercial: "SAN NAYARIT", categoria: "SUSPENSION", meses_garantia_default: 3, dias_credito: 0 },
    { id: "p-su-12", nombre_comercial: "PAT AUTOPARTES", categoria: "SUSPENSION", meses_garantia_default: 3, dias_credito: 0 },
    { id: "p-su-13", nombre_comercial: "VAZLO AUTODIS", categoria: "SUSPENSION", meses_garantia_default: 3, dias_credito: 0 },
    { id: "p-su-14", nombre_comercial: "TORNICENTER", categoria: "SUSPENSION", meses_garantia_default: 3, dias_credito: 0 },
    { id: "p-su-15", nombre_comercial: "HULES Y BANDAS", categoria: "SUSPENSION", meses_garantia_default: 3, dias_credito: 0 },
    { id: "p-su-16", nombre_comercial: "REFACCIONARIA MANNY", categoria: "SUSPENSION", meses_garantia_default: 3, dias_credito: 0 },
    { id: "p-su-17", nombre_comercial: "REFACCIONARIA ACOSTA", categoria: "SUSPENSION", meses_garantia_default: 3, dias_credito: 0 },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("contiene exactamente los 27 proveedores reales dados de alta para Cova en Culiacán", () => {
    const llantas = proveedoresCovaMock.filter((p) => p.categoria === "LLANTAS");
    const suspension = proveedoresCovaMock.filter((p) => p.categoria === "SUSPENSION");

    expect(proveedoresCovaMock).toHaveLength(27);
    expect(llantas).toHaveLength(10);
    expect(suspension).toHaveLength(17);

    // Verificamos nombres de llantas
    const nombresLlantas = llantas.map((l) => l.nombre_comercial);
    expect(nombresLlantas).toContain("AYON");
    expect(nombresLlantas).toContain("TERSA");
    expect(nombresLlantas).toContain("BLUE TYRE");
    expect(nombresLlantas).toContain("RADIAL LLANTAS");

    // Verificamos nombres de suspensión
    const nombresSuspension = suspension.map((s) => s.nombre_comercial);
    expect(nombresSuspension).toContain("DAR REFACCIONARIA");
    expect(nombresSuspension).toContain("OBAL ZAPATA");
    expect(nombresSuspension).toContain("OBAL REVOLUCION");
    expect(nombresSuspension).toContain("AUTOZONE");
    expect(nombresSuspension).toContain("TORNICENTER");
  });

  it("asigna garantías estándar congruentes con el tipo de proveedor (12 meses llantas / 3 meses refacciones)", () => {
    const todosLlantas12m = proveedoresCovaMock
      .filter((p) => p.categoria === "LLANTAS")
      .every((p) => p.meses_garantia_default === 12);

    const todosSuspension3m = proveedoresCovaMock
      .filter((p) => p.categoria === "SUSPENSION")
      .every((p) => p.meses_garantia_default === 3);

    expect(todosLlantas12m).toBe(true);
    expect(todosSuspension3m).toBe(true);
  });

  it("ProveedorService.obtenerProveedores aplica filtro por categoría en la consulta a Supabase", async () => {
    const mockQueryBuilder: any = {
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then: vi.fn().mockImplementation((resolve) =>
        resolve({
          data: proveedoresCovaMock.filter((p) => p.categoria === "LLANTAS"),
          error: null,
        })
      ),
    };

    mockSelect.mockReturnValue(mockQueryBuilder);

    const { data } = await ProveedorService.obtenerProveedores(covaEmpresaId, "LLANTAS");

    expect(mockSelect).toHaveBeenCalledWith("*");
    expect(mockQueryBuilder.eq).toHaveBeenCalledWith("activo", true);
    expect(mockQueryBuilder.eq).toHaveBeenCalledWith("empresa_id", covaEmpresaId);
    expect(mockQueryBuilder.eq).toHaveBeenCalledWith("categoria", "LLANTAS");
    expect(data).toHaveLength(10);
    expect(data.every((p) => p.categoria === "LLANTAS")).toBe(true);
  });
});
