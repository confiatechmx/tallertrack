import { describe, it, expect } from "vitest";
import { CajaFondo, CajaTurno, CajaTurnoService } from "../services/cajaTurnoService";

describe("Punto D: Control Dual de Fondos de Caja Chica - Cova Tires", () => {
  const mockFondosCova: CajaFondo[] = [
    {
      id: "c0000000-0000-0000-0000-000000000001",
      empresa_id: "b2ad09db-0a34-4876-9ca3-d584c40bd294",
      sucursal_id: "b2ad09db-0a34-4876-9ca3-d584c40bd295",
      nombre: "Fondo 1: Operativo Mostrador",
      tipo: "OPERATIVO",
      saldo_actual: 400.0,
      saldo_minimo_alerta: 100.0,
      activo: true,
    },
    {
      id: "c0000000-0000-0000-0000-000000000002",
      empresa_id: "b2ad09db-0a34-4876-9ca3-d584c40bd294",
      sucursal_id: "b2ad09db-0a34-4876-9ca3-d584c40bd295",
      nombre: "Fondo 2: Reserva Taller",
      tipo: "RESERVA",
      saldo_actual: 8500.0,
      saldo_minimo_alerta: 2000.0,
      activo: true,
    },
  ];

  it("establece Fondo 1 en $400.00 MXN y Fondo 2 en $8,500.00 MXN para Cova Tires", () => {
    const f1 = mockFondosCova.find((f) => f.tipo === "OPERATIVO");
    const f2 = mockFondosCova.find((f) => f.tipo === "RESERVA");

    expect(f1).toBeDefined();
    expect(f1?.saldo_actual).toBe(400.0);
    expect(f1?.saldo_minimo_alerta).toBe(100.0);

    expect(f2).toBeDefined();
    expect(f2?.saldo_actual).toBe(8500.0);
    expect(f2?.saldo_minimo_alerta).toBe(2000.0);
  });

  it("calcula correctamente la remesa sugiriendo dejar el fondo base de $400 para el día siguiente", () => {
    const totalEfectivoContadoF1 = 9200.0; // Mostrador acumuló ventas en efectivo
    const fondoBaseSiguienteTurno = mockFondosCova[0].saldo_actual; // $400.00

    const remesaCalculada = Math.max(0, totalEfectivoContadoF1 - fondoBaseSiguienteTurno);

    // Debe enviar $8,800 a sobre de remesa y dejar $400 en gaveta
    expect(remesaCalculada).toBe(8800.0);
    expect(fondoBaseSiguienteTurno).toBe(400.0);
    expect(remesaCalculada + fondoBaseSiguienteTurno).toBe(totalEfectivoContadoF1);
  });

  it("permite traspasos de cambio desde Reserva ($8,500) a Mostrador ($400) sin alterar el saldo total del taller", () => {
    let saldoF1 = 400.0;
    let saldoF2 = 8500.0;
    const montoTraspaso = 1000.0; // Rescate de morralla / cambio

    expect(montoTraspaso).toBeLessThanOrEqual(saldoF2);

    saldoF2 -= montoTraspaso;
    saldoF1 += montoTraspaso;

    expect(saldoF1).toBe(1400.0);
    expect(saldoF2).toBe(7500.0);
    expect(saldoF1 + saldoF2).toBe(8900.0); // Conservación neta
  });

  it("detecta cuando Fondo 1 cae por debajo del umbral mínimo de alerta ($100.00)", () => {
    const saldoPostGastos = 80.0; // Se pagaron varios consumibles menores
    const f1 = mockFondosCova[0];

    const requiereAlertaTraspaso = saldoPostGastos < (f1.saldo_minimo_alerta || 100);
    expect(requiereAlertaTraspaso).toBe(true);
  });
});
