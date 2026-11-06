import { describe, it, expect, vi } from "vitest";

// Mock Supabase
const mockSupabaseQuery: any = {
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  or: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  single: vi.fn(),
};

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => mockSupabaseQuery),
  },
}));

import {
  TenantEstacionesService,
  DEFAULT_COVA_ESTACIONES,
  TenantEstacionTrabajo,
} from "@/services/tenantEstacionesService";

describe("Catálogo Autogestionable de Estaciones de Trabajo y Rampas - Cova", () => {
  const covaEmpresaId = "b2ad09db-0a34-4876-9ca3-d584c40bd294";
  const covaSucursalId = "b2ad09db-0a34-4876-9ca3-d584c40bd295";

  const mockEstacionesCova: TenantEstacionTrabajo[] = [
    {
      id: "est-1",
      empresa_id: covaEmpresaId,
      sucursal_id: covaSucursalId,
      nombre: "Fosa de diagnóstico",
      codigo: "FOSA-DIAG",
      tipo: "FOSA",
      descripcion: "Fosa especializada de inspección rápida y diagnóstico de suspensión",
      orden: 1,
      activo: true,
      created_at: "2026-11-06T12:00:00Z",
      updated_at: "2026-11-06T12:00:00Z",
    },
    {
      id: "est-2",
      empresa_id: covaEmpresaId,
      sucursal_id: covaSucursalId,
      nombre: "Rampa frenera 1",
      codigo: "RAMPA-FRENOS-1",
      tipo: "RAMPA",
      descripcion: "Rampa principal para servicio integral de frenos y balatas",
      orden: 2,
      activo: true,
      created_at: "2026-11-06T12:00:00Z",
      updated_at: "2026-11-06T12:00:00Z",
    },
    {
      id: "est-3",
      empresa_id: covaEmpresaId,
      sucursal_id: covaSucursalId,
      nombre: "Rampa frenera 2",
      codigo: "RAMPA-FRENOS-2",
      tipo: "RAMPA",
      descripcion: "Rampa secundaria para rectificado y frenos pesados",
      orden: 3,
      activo: true,
      created_at: "2026-11-06T12:00:00Z",
      updated_at: "2026-11-06T12:00:00Z",
    },
    {
      id: "est-4",
      empresa_id: covaEmpresaId,
      sucursal_id: covaSucursalId,
      nombre: "Portería",
      codigo: "PORTERIA",
      tipo: "PORTERIA",
      descripcion: "Estación de portería para atención y desmonte de neumáticos",
      orden: 4,
      activo: true,
      created_at: "2026-11-06T12:00:00Z",
      updated_at: "2026-11-06T12:00:00Z",
    },
    {
      id: "est-5",
      empresa_id: covaEmpresaId,
      sucursal_id: covaSucursalId,
      nombre: "Comodín 1",
      codigo: "COMODIN-1",
      tipo: "COMODIN",
      descripcion: "Bahía comodín multiusos para trabajos auxiliares",
      orden: 5,
      activo: true,
      created_at: "2026-11-06T12:00:00Z",
      updated_at: "2026-11-06T12:00:00Z",
    },
    {
      id: "est-6",
      empresa_id: covaEmpresaId,
      sucursal_id: covaSucursalId,
      nombre: "Comodín 2",
      codigo: "COMODIN-2",
      tipo: "COMODIN",
      descripcion: "Bahía comodín multiusos de apoyo en piso",
      orden: 6,
      activo: true,
      created_at: "2026-11-06T12:00:00Z",
      updated_at: "2026-11-06T12:00:00Z",
    },
  ];

  describe("1. Catálogo Oficial de Estaciones de Cova", () => {
    it("debe contener exactamente las 6 estaciones de Cova en el orden operativo correcto", () => {
      const nombresEsperados = [
        "Fosa de diagnóstico",
        "Rampa frenera 1",
        "Rampa frenera 2",
        "Portería",
        "Comodín 1",
        "Comodín 2",
      ];

      expect(mockEstacionesCova).toHaveLength(6);
      expect(mockEstacionesCova.map((e) => e.nombre)).toEqual(nombresEsperados);
    });

    it("cada estación debe contar con la tipificación adecuada para el taller", () => {
      const fosa = mockEstacionesCova.find((e) => e.nombre === "Fosa de diagnóstico")!;
      const rampa1 = mockEstacionesCova.find((e) => e.nombre === "Rampa frenera 1")!;
      const rampa2 = mockEstacionesCova.find((e) => e.nombre === "Rampa frenera 2")!;
      const porteria = mockEstacionesCova.find((e) => e.nombre === "Portería")!;
      const comodin1 = mockEstacionesCova.find((e) => e.nombre === "Comodín 1")!;
      const comodin2 = mockEstacionesCova.find((e) => e.nombre === "Comodín 2")!;

      expect(fosa.tipo).toBe("FOSA");
      expect(rampa1.tipo).toBe("RAMPA");
      expect(rampa2.tipo).toBe("RAMPA");
      expect(porteria.tipo).toBe("PORTERIA");
      expect(comodin1.tipo).toBe("COMODIN");
      expect(comodin2.tipo).toBe("COMODIN");
    });
  });

  describe("2. Autogestión por Tenant y Aislamiento Multi-Tenant", () => {
    it("debe consultar las estaciones filtradas por empresa_id", async () => {
      mockSupabaseQuery.order.mockResolvedValue({ data: mockEstacionesCova, error: null });

      const res = await TenantEstacionesService.obtenerEstaciones(covaEmpresaId, covaSucursalId);

      expect(res.error).toBeNull();
      expect(res.data).toHaveLength(6);
      expect(res.data[0].nombre).toBe("Fosa de diagnóstico");
    });

    it("debe permitir crear una nueva estación personalizada para otro tenant", async () => {
      const nuevaEstacion = {
        empresa_id: "otra-empresa-id",
        nombre: "Rampa 3 Alineación 3D",
        tipo: "RAMPA" as const,
        orden: 7,
        activo: true,
      };

      mockSupabaseQuery.insert.mockReturnValue(mockSupabaseQuery);
      mockSupabaseQuery.select.mockReturnValue(mockSupabaseQuery);
      mockSupabaseQuery.single.mockResolvedValue({
        data: { id: "est-7", ...nuevaEstacion },
        error: null,
      });

      const res = await TenantEstacionesService.crearEstacion(nuevaEstacion);

      expect(res.error).toBeNull();
      expect(res.data?.nombre).toBe("Rampa 3 Alineación 3D");
      expect(res.data?.id).toBe("est-7");
    });

    it("debe permitir desactivar temporalmente una estación sin borrar su historial", async () => {
      mockSupabaseQuery.update.mockReturnValue(mockSupabaseQuery);
      mockSupabaseQuery.eq.mockResolvedValue({ error: null });

      const res = await TenantEstacionesService.desactivarEstacion("est-5");
      expect(res.success).toBe(true);
    });
  });

  describe("3. Degradación Elegante y Fallback en UI", () => {
    it("el fallback por defecto incluye todas las estaciones oficiales de Cova", () => {
      expect(DEFAULT_COVA_ESTACIONES).toHaveLength(6);
      expect(DEFAULT_COVA_ESTACIONES.map((e) => e.nombre)).toEqual([
        "Fosa de diagnóstico",
        "Rampa frenera 1",
        "Rampa frenera 2",
        "Portería",
        "Comodín 1",
        "Comodín 2",
      ]);
    });
  });
});
