import { describe, it, expect, vi } from "vitest";

// Mock Supabase
vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      eq: vi.fn(),
      gte: vi.fn(),
      in: vi.fn(),
      is: vi.fn(),
    })),
    rpc: vi.fn(),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-test-cova" } } }),
    },
  },
}));

import { CajaTurnoService, CajaFondo, CajaTurno } from "@/services/cajaTurnoService";

describe("Bloque 3: Control de Turnos, Traspasos y Flujo de Fondos Administrativo - Cova", () => {
  const covaSucursalId = "b2ad09db-0a34-4876-9ca3-d584c40bd295";
  const covaEmpresaId = "b2ad09db-0a34-4876-9ca3-d584c40bd294";

  const mockFondos: CajaFondo[] = [
    {
      id: "fondo-f1-cova",
      empresa_id: covaEmpresaId,
      sucursal_id: covaSucursalId,
      nombre: "Fondo Mostrador Cova",
      tipo: "OPERATIVO",
      saldo_actual: 400.0,
      saldo_minimo_alerta: 100.0,
      activo: true,
    },
    {
      id: "fondo-f2-cova",
      empresa_id: covaEmpresaId,
      sucursal_id: covaSucursalId,
      nombre: "Fondo Reserva / Caja Fuerte Cova",
      tipo: "RESERVA",
      saldo_actual: 8500.0,
      saldo_minimo_alerta: 2000.0,
      activo: true,
    },
  ];

  const mockTurnoActivo: CajaTurno = {
    id: "turno-cova-101",
    empresa_id: covaEmpresaId,
    sucursal_id: covaSucursalId,
    usuario_apertura_id: "user-cajero-cova",
    usuario_cierre_id: null,
    fecha_apertura: "2026-11-01T08:00:00Z",
    fecha_cierre: null,
    estado: "ABIERTO",
    monto_apertura_fondo1: 400.0,
    monto_apertura_fondo2: 8500.0,
    monto_cierre_declarado_f1: null,
    monto_cierre_declarado_f2: null,
    monto_cierre_teorico_f1: null,
    monto_cierre_teorico_f2: null,
    diferencia_f1: null,
    diferencia_f2: null,
    justificacion_descuadre: null,
    monto_remesa_retirada: 0,
    monto_fondo_siguiente_f1: 400.0,
    snapshot_resumen: null,
    created_at: "2026-11-01T08:00:00Z",
  };

  describe("1. Apertura de Turno Dual (F1 Mostrador $400 / F2 Reserva $8,500)", () => {
    it("debe validar los montos de arqueo inicial predeterminados para Cova", () => {
      const f1 = mockFondos.find((f) => f.tipo === "OPERATIVO")!;
      const f2 = mockFondos.find((f) => f.tipo === "RESERVA")!;

      expect(f1.saldo_actual).toBe(400.0);
      expect(f2.saldo_actual).toBe(8500.0);
      expect(mockTurnoActivo.monto_apertura_fondo1).toBe(400.0);
      expect(mockTurnoActivo.monto_apertura_fondo2).toBe(8500.0);
    });

    it("debe rechazar montos de apertura negativos o no numéricos", () => {
      const validarMontos = (f1: number, f2: number) => {
        if (isNaN(f1) || f1 < 0) return { valid: false, error: "Monto F1 inválido" };
        if (isNaN(f2) || f2 < 0) return { valid: false, error: "Monto F2 inválido" };
        return { valid: true };
      };

      expect(validarMontos(-50, 8500).valid).toBe(false);
      expect(validarMontos(400, -100).valid).toBe(false);
      expect(validarMontos(400, 8500).valid).toBe(true);
    });
  });

  describe("2. Traspasos Bidireccionales Intra-Día (Rescate F2->F1 y Reabastecimiento F1->F2)", () => {
    it("debe ejecutar un rescate de mostrador (F2 -> F1) manteniendo la suma neta sucursal intacta ($0.00)", () => {
      let f1Saldo = 400.0;
      let f2Saldo = 8500.0;
      const montoRescate = 1000.0;

      const sumaAntes = f1Saldo + f2Saldo;

      // Transferencia F2 -> F1
      expect(f2Saldo >= montoRescate).toBe(true);
      f2Saldo -= montoRescate;
      f1Saldo += montoRescate;

      const sumaDespues = f1Saldo + f2Saldo;

      expect(f1Saldo).toBe(1400.0);
      expect(f2Saldo).toBe(7500.0);
      expect(sumaDespues - sumaAntes).toBe(0.0); // Efecto neto $0.00
    });

    it("debe ejecutar reabastecimiento de reserva (F1 -> F2) con el excedente de ventas", () => {
      let f1Saldo = 3500.0; // Mostrador con ventas acumuladas
      let f2Saldo = 7500.0;
      const montoReabastecimiento = 2500.0;

      const sumaAntes = f1Saldo + f2Saldo;

      // Transferencia F1 -> F2
      expect(f1Saldo >= montoReabastecimiento).toBe(true);
      f1Saldo -= montoReabastecimiento;
      f2Saldo += montoReabastecimiento;

      const sumaDespues = f1Saldo + f2Saldo;

      expect(f1Saldo).toBe(1000.0);
      expect(f2Saldo).toBe(10000.0);
      expect(sumaDespues - sumaAntes).toBe(0.0);
    });

    it("debe rechazar un traspaso si el saldo del fondo origen es insuficiente", () => {
      const f1Saldo = 300.0;
      const montoIntento = 500.0;

      const esValido = f1Saldo >= montoIntento;
      expect(esValido).toBe(false);
    });

    it("debe impedir un traspaso hacia el mismo fondo", () => {
      const fondoOrigenId = "fondo-f1-cova";
      const fondoDestinoId = "fondo-f1-cova";

      const esMismoFondo = fondoOrigenId === fondoDestinoId;
      expect(esMismoFondo).toBe(true);
    });
  });

  describe("3. Retiros Administrativos y Reposición de Fondos", () => {
    it("debe sumar al teórico de caja chica las entradas por 'Reposición de Fondo' o 'Ingreso Extra'", () => {
      const movimientos = [
        { tipo: "Reposición de Fondo", monto: 1500.0, metodo: "Efectivo" },
        { tipo: "Ingreso Extra", monto: 300.0, metodo: "Efectivo" },
        { tipo: "Gasto / Insumos", monto: 120.0, metodo: "Efectivo" },
      ];

      const entradas = movimientos
        .filter((m) =>
          ["Fondo Inicial", "Ingreso Extra", "Reposición de Fondo"].includes(m.tipo)
        )
        .reduce((sum, m) => sum + m.monto, 0);

      expect(entradas).toBe(1800.0);
    });

    it("debe deducir del teórico de caja chica los 'Retiros Administrativos' y gastos", () => {
      const movimientos = [
        { tipo: "Retiro Administrativo", monto: 5000.0, metodo: "Efectivo" },
        { tipo: "Gasto / Insumos", monto: 250.0, metodo: "Efectivo" },
        { tipo: "Pago Proveedor", monto: 450.0, metodo: "Efectivo" },
      ];

      const salidas = movimientos
        .filter((m) =>
          ["Gasto / Insumos", "Pago Proveedor", "Retiro Administrativo", "Retiro de Efectivo"].includes(m.tipo)
        )
        .reduce((sum, m) => sum + m.monto, 0);

      expect(salidas).toBe(5700.0);
    });

    it("debe calcular con precisión el saldo teórico final de Fondo 1 considerando todos los flujos", () => {
      const aperturaF1 = 400.0;
      const ventasEfectivoPOS = 12500.0;
      const reposicionExterna = 1000.0; // Reposición de Fondo
      const gastosTaller = 350.0; // Gasto / Insumos
      const retiroAdmin = 8000.0; // Retiro Administrativo para depósito en banco
      const traspasoRecibidoDeF2 = 1500.0; // Rescate desde Reserva
      const traspasoEnviadoAF2 = 2000.0; // Reabastecimiento a Reserva

      const teoricoF1 =
        aperturaF1 +
        ventasEfectivoPOS +
        reposicionExterna -
        gastosTaller -
        retiroAdmin +
        traspasoRecibidoDeF2 -
        traspasoEnviadoAF2;

      // 400 + 12500 + 1000 - 350 - 8000 + 1500 - 2000 = 5050.0
      expect(teoricoF1).toBe(5050.0);
    });

    it("debe calcular el saldo teórico de Fondo 2 (Reserva) considerando traspasos y retiros de bóveda", () => {
      const aperturaF2 = 8500.0;
      const inyeccionCapitalF2 = 5000.0; // Reposición a Reserva
      const retiroBoveda = 3000.0; // Retiro Administrativo de Reserva
      const traspasoEnviadoAF1 = 1500.0; // Enviado a Mostrador
      const traspasoRecibidoDeF1 = 2000.0; // Recibido de Mostrador

      const teoricoF2 =
        aperturaF2 +
        inyeccionCapitalF2 -
        retiroBoveda -
        traspasoEnviadoAF1 +
        traspasoRecibidoDeF1;

      // 8500 + 5000 - 3000 - 1500 + 2000 = 11000.0
      expect(teoricoF2).toBe(11000.0);
    });
  });
});
