import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabase client before any service imports
vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: "https://mock.storage/test.jpg" } }),
      }),
    },
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "test-user-id" } } }),
    },
  },
}));

import { supabase } from "@/lib/supabase";
import { ProveedorService } from "@/services/proveedorService";

describe("Suite Cova Tires: Comprobantes de Compra Multirrefacción (1 Ticket -> N Piezas)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Vincular múltiples refacciones a un solo ticket de compra", () => {
    it("debe actualizar en bloque compra_proveedor_id, garantía y folio en todas las refacciones seleccionadas", async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({ error: null }),
      });

      (supabase.from as any).mockReturnValue({
        update: mockUpdate,
      });

      const compraMock = {
        id: "compra-uuid-1234",
        proveedor_id: "prov-valle-uuid",
        folio_ticket_nota: "T-89412",
        fuente_pago: "CAJA_CHICA",
        evidencia_url: "https://storage.cova.com/tickets/t89412.jpg",
        meses_garantia: 6,
      };

      const refaccionIds = ["ref-balatas-1", "ref-discos-2", "ref-liquido-3"];

      const result = await ProveedorService.vincularRefaccionesATicket(compraMock, refaccionIds);

      expect(result.success).toBe(true);
      expect(result.error).toBeNull();
      expect(supabase.from).toHaveBeenCalledWith("orden_servicio_refacciones");
      expect(mockUpdate).toHaveBeenCalledWith({
        compra_proveedor_id: "compra-uuid-1234",
        proveedor_id: "prov-valle-uuid",
        folio_ticket_nota: "T-89412",
        fuente_pago: "CAJA_CHICA",
        evidencia_url: "https://storage.cova.com/tickets/t89412.jpg",
        garantia_especifica: "6 meses - Nota #T-89412",
      });
    });

    it("debe retornar success sin invocar la base de datos si la lista de refacciones está vacía", async () => {
      const compraMock = {
        id: "compra-uuid-1234",
        folio_ticket_nota: "T-89412",
      };

      const result = await ProveedorService.vincularRefaccionesATicket(compraMock, []);
      expect(result.success).toBe(true);
      expect(supabase.from).not.toHaveBeenCalled();
    });
  });

  describe("2. Consultar tickets de compra por orden de servicio", () => {
    it("debe consultar las compras asociadas a la orden de servicio con su proveedor", async () => {
      const mockCompras = [
        {
          id: "compra-1",
          folio_ticket_nota: "T-89412",
          descripcion: "Balatas y Discos",
          monto_costo: 2450.0,
          meses_garantia: 6,
          proveedores: {
            id: "prov-1",
            nombre_comercial: "Refaccionaria El Valle",
          },
        },
      ];

      const mockOrder = vi.fn().mockResolvedValue({ data: mockCompras, error: null });
      const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      const res = await ProveedorService.obtenerComprasPorOrden("orden-hilux-1018");

      expect(res.error).toBeNull();
      expect(res.data).toHaveLength(1);
      expect(res.data[0].folio_ticket_nota).toBe("T-89412");
      expect(supabase.from).toHaveBeenCalledWith("compras_proveedores");
      expect(mockEq).toHaveBeenCalledWith("orden_servicio_id", "orden-hilux-1018");
    });
  });
});
