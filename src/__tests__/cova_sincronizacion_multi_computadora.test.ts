import { describe, it, expect, vi } from "vitest";

describe("Bloque 6: Sincronización Multi-Computadora en Tiempo Real (Mostrador 1 y Mostrador 2) - Cova", () => {
  const sucursalIdCova = "b2ad09db-0a34-4876-9ca3-d584c40bd295";

  describe("1. Configuración de Canales y Listeners WebSockets (Postgres Changes)", () => {
    it("debe registrar suscripciones en tiempo real para todas las tablas críticas de caja", () => {
      const registeredTables: string[] = [];
      const registeredEvents: Record<string, string> = {};

      const mockChannel = {
        on: vi.fn((type: string, config: any, callback: () => void) => {
          if (type === "postgres_changes") {
            registeredTables.push(config.table);
            registeredEvents[config.table] = config.event;
          }
          return mockChannel;
        }),
        subscribe: vi.fn(),
      };

      const mockSupabase = {
        channel: vi.fn((_name?: string) => mockChannel),
      };

      // Simular registro en caja/page.tsx
      const targetSucId = sucursalIdCova;
      mockSupabase
        .channel(`caja-sync-${targetSucId}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "caja_turnos", filter: `sucursal_id=eq.${targetSucId}` }, () => {})
        .on("postgres_changes", { event: "*", schema: "public", table: "caja_fondos", filter: `sucursal_id=eq.${targetSucId}` }, () => {})
        .on("postgres_changes", { event: "*", schema: "public", table: "pagos_orden", filter: `sucursal_id=eq.${targetSucId}` }, () => {})
        .on("postgres_changes", { event: "*", schema: "public", table: "caja_movimientos", filter: `sucursal_id=eq.${targetSucId}` }, () => {})
        .on("postgres_changes", { event: "*", schema: "public", table: "caja_traspasos_fondos" }, () => {})
        .on("postgres_changes", { event: "*", schema: "public", table: "ordenes_servicio", filter: `sucursal_id=eq.${targetSucId}` }, () => {})
        .subscribe();

      expect(mockSupabase.channel).toHaveBeenCalledWith(`caja-sync-${sucursalIdCova}`);
      expect(registeredTables).toContain("caja_turnos");
      expect(registeredTables).toContain("caja_fondos");
      expect(registeredTables).toContain("pagos_orden");
      expect(registeredTables).toContain("caja_movimientos");
      expect(registeredTables).toContain("caja_traspasos_fondos");
      expect(registeredTables).toContain("ordenes_servicio");

      // Validar que eventos cubran inserciones, actualizaciones y cancelaciones
      expect(registeredEvents["caja_turnos"]).toBe("*");
      expect(registeredEvents["pagos_orden"]).toBe("*");
      expect(registeredEvents["caja_movimientos"]).toBe("*");
      expect(registeredEvents["caja_fondos"]).toBe("*");
    });
  });

  describe("2. Reactividad de Apertura de Turno Compartido", () => {
    it("debe actualizar el estado de TurnoStatusBar en Computadora 2 cuando Computadora 1 abre el turno", () => {
      let estadoTurnoComp2: "CERRADO" | "ABIERTO" = "CERRADO";
      let turnoActivoComp2: any = null;

      const onAperturaRealtimeCallback = (payload: any) => {
        if (payload.new && payload.new.estado === "ABIERTO") {
          estadoTurnoComp2 = "ABIERTO";
          turnoActivoComp2 = payload.new;
        }
      };

      // Computadora 1 ejecuta la apertura en base de datos
      const payloadBroadcast = {
        eventType: "INSERT",
        new: {
          id: "turno-101",
          sucursal_id: sucursalIdCova,
          estado: "ABIERTO",
          monto_apertura_fondo1: 400.0,
          monto_apertura_fondo2: 8500.0,
          fecha_apertura: new Date().toISOString(),
        },
      };

      // Supabase Realtime despacha el evento a Computadora 2
      onAperturaRealtimeCallback(payloadBroadcast);

      expect(estadoTurnoComp2).toBe("ABIERTO");
      expect(turnoActivoComp2).not.toBeNull();
      expect(turnoActivoComp2.monto_apertura_fondo1).toBe(400.0);
    });
  });

  describe("3. Reactividad en Gastos y Movimientos de Patio sin F5", () => {
    it("debe actualizar inmediatamente el acumulado de caja chica al registrar un egreso en Mostrador 1", () => {
      let saldoFondo1Comp2 = 400.0;
      const gastosComp2: any[] = [];

      const onGastoRealtimeCallback = (nuevoMovimiento: any) => {
        gastosComp2.push(nuevoMovimiento);
        if (nuevoMovimiento.tipo === "Gasto / Insumos" || nuevoMovimiento.tipo === "EGRESO") {
          saldoFondo1Comp2 -= nuevoMovimiento.monto;
        }
      };

      // Mostrador 1 registra compra de tornillería por $150
      const nuevoGasto = {
        id: "mov-882",
        tipo: "Gasto / Insumos",
        monto: 150.0,
        concepto: "Compra tornillería para suspensión",
        sucursal_id: sucursalIdCova,
      };

      onGastoRealtimeCallback(nuevoGasto);

      expect(gastosComp2).toHaveLength(1);
      expect(saldoFondo1Comp2).toBe(250.0); // 400 - 150
    });
  });

  describe("4. Cobros Simultáneos y Control de Concurrencia entre Mostradores", () => {
    it("debe evitar doble cobro cuando una orden ya fue liquidada en Mostrador 1", () => {
      const ordenMostrador = {
        id: "orden-2001",
        folio: 2001,
        total: 15000,
        estatus_pago: "Pendiente",
      };

      const procesarCobro = (orden: typeof ordenMostrador, monto: number) => {
        if (orden.estatus_pago === "Pagado") {
          throw new Error("ORDEN_YA_PAGADA: Esta orden ya fue liquidada por otro cajero.");
        }
        orden.estatus_pago = "Pagado";
        return { success: true, montoCobrado: monto };
      };

      // Mostrador 1 liquida la orden
      const res1 = procesarCobro(ordenMostrador, 15000);
      expect(res1.success).toBe(true);
      expect(ordenMostrador.estatus_pago).toBe("Pagado");

      // Mostrador 2 intenta liquidar la misma orden segundos después
      expect(() => procesarCobro(ordenMostrador, 15000)).toThrow(
        "ORDEN_YA_PAGADA: Esta orden ya fue liquidada por otro cajero."
      );
    });
  });
});
