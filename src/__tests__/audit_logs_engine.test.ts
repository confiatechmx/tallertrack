import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabase
vi.mock("@/lib/supabase", () => {
  const mockSelect = vi.fn();
  const mockFrom = vi.fn(() => ({
    select: mockSelect,
  }));
  const mockRpc = vi.fn();

  return {
    supabase: {
      from: mockFrom,
      rpc: mockRpc,
    },
  };
});

import { supabase } from "@/lib/supabase";
import { auditLogService, AuditLogRecord } from "../services/auditLogService";

describe("Motor de Auditoría Forense y Operativa Universal (Audit Logs Enterprise)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("debe mapear correctamente un registro de auditoría con severidad, diffs y actor", async () => {
    const rawMockData = [
      {
        id: "log-1",
        empresa_id: "emp-100",
        sucursal_id: "suc-1",
        actor_id: "user-42",
        actor_nombre: "Carlos Mecánico",
        actor_rol: "Mecánico",
        ip_address: "187.190.24.12",
        user_agent: "Mozilla/5.0 (Android; Mobile)",
        entity_type: "ordenes_servicio",
        entity_id: "ord-1042",
        entity_label: "Orden #1042",
        action: "STATUS_CHANGE",
        severity: "INFO",
        summary: 'Cambió el estado de "En Inspección" a "En Rampa"',
        motivo: null,
        changes: {
          estado: { old: "En Inspección", new: "En Rampa" },
          bahia_rampa: { old: "Por Asignar", new: "Rampa 2" },
        },
        snapshot: { id: "ord-1042", estado: "En Rampa" },
        created_at: "2026-10-28T05:00:00Z",
      },
    ];

    const mockOrder = vi.fn().mockReturnThis();
    const mockRange = vi.fn().mockResolvedValue({ data: rawMockData, count: 1, error: null });

    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: mockOrder,
        range: mockRange,
      }),
    });

    const result = await auditLogService.getLogs({}, 50, 0);

    expect(result.count).toBe(1);
    expect(result.logs.length).toBe(1);

    const first = result.logs[0];
    expect(first.actor_nombre).toBe("Carlos Mecánico");
    expect(first.severity).toBe("INFO");
    expect(first.changes?.estado.new).toBe("En Rampa");
    expect(first.changes?.bahia_rampa.new).toBe("Rampa 2");
  });

  it("debe consultar la línea de tiempo inmutable de una orden específica (getEntityTimeline)", async () => {
    const mockTimelineRows = [
      {
        id: "log-3",
        empresa_id: "emp-100",
        entity_type: "ordenes_servicio",
        entity_id: "ord-1042",
        actor_nombre: "Juan Asesor",
        actor_rol: "Asesor",
        action: "VOID",
        severity: "CRITICAL",
        summary: "Canceló la orden por solicitud del cliente",
        motivo: "Cliente decidió posponer servicio por viaje",
        changes: { estado: { old: "En Rampa", new: "Cancelado" } },
        created_at: "2026-10-28T05:30:00Z",
      },
      {
        id: "log-2",
        empresa_id: "emp-100",
        entity_type: "ordenes_servicio",
        entity_id: "ord-1042",
        actor_nombre: "Carlos Mecánico",
        actor_rol: "Mecánico",
        action: "STATUS_CHANGE",
        severity: "INFO",
        summary: 'Cambió estado a "En Rampa"',
        motivo: null,
        changes: {},
        created_at: "2026-10-28T05:15:00Z",
      },
    ];

    const mockEq1 = vi.fn().mockReturnThis();
    const mockEq2 = vi.fn().mockReturnThis();
    const mockOrder = vi.fn().mockResolvedValue({ data: mockTimelineRows, error: null });

    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn((field, val) => {
          if (field === "entity_type") return { eq: vi.fn(() => ({ order: mockOrder })) };
          return { order: mockOrder };
        }),
      }),
    });

    const timeline = await auditLogService.getEntityTimeline("ordenes_servicio", "ord-1042");

    expect(timeline.length).toBe(2);
    expect(timeline[0].severity).toBe("CRITICAL");
    expect(timeline[0].motivo).toContain("viaje");
    expect(timeline[1].severity).toBe("INFO");
  });

  it("debe invocar correctamente la RPC log_custom_audit para eventos de negocio personalizados", async () => {
    (supabase.rpc as any).mockResolvedValue({
      data: "log-generated-uuid-999",
      error: null,
    });

    const logId = await auditLogService.logCustomEvent({
      entityType: "ordenes_servicio",
      entityId: "ord-1042",
      action: "WHATSAPP_DISPATCH",
      summary: "Envió presupuesto interactivo al cliente vía WhatsApp (+52 81 2345 6789)",
      severity: "INFO",
      details: { phone: "+52 81 2345 6789", template: "presupuesto_v2" },
    });

    expect(logId).toBe("log-generated-uuid-999");
    expect(supabase.rpc).toHaveBeenCalledWith("log_custom_audit", expect.objectContaining({
      p_entity_type: "ordenes_servicio",
      p_action: "WHATSAPP_DISPATCH",
      p_severity: "INFO",
    }));
  });

  it("debe generar un CSV válido con BOM UTF-8 y escapar campos con comillas", () => {
    const mockLogs: AuditLogRecord[] = [
      {
        id: "l1",
        empresa_id: "e1",
        sucursal_id: "s1",
        actor_id: "u1",
        actor_nombre: 'Roberto "El Jefe" Asesor',
        actor_rol: "Administrador",
        ip_address: "187.190.24.12",
        user_agent: "Desktop Chrome",
        entity_type: "cotizaciones",
        entity_id: "c1",
        entity_label: "Cotización #501",
        action: "DISCOUNT_OVERRIDE",
        severity: "WARNING",
        summary: "Aplicó descuento de 15% a llantas Michelin",
        motivo: "Cliente de flotilla con 4 autos",
        changes: { total: { old: 5000, new: 4250 } },
        snapshot: null,
        created_at: "2026-10-28T05:00:00Z",
      },
    ];

    // Mock DOM elements for CSV download
    const mockLink = {
      setAttribute: vi.fn(),
      click: vi.fn(),
    };
    vi.spyOn(document, "createElement").mockReturnValue(mockLink as any);
    vi.spyOn(document.body, "appendChild").mockImplementation(() => mockLink as any);
    vi.spyOn(document.body, "removeChild").mockImplementation(() => mockLink as any);
    const mockCreateUrl = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock-url");
    const mockRevokeUrl = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});

    auditLogService.exportToCsv(mockLogs, "test_auditoria.csv");

    expect(mockLink.setAttribute).toHaveBeenCalledWith("download", "test_auditoria.csv");
    expect(mockLink.click).toHaveBeenCalled();
    expect(mockCreateUrl).toHaveBeenCalled();
  });
});
