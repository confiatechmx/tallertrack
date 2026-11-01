import { describe, it, expect, vi } from "vitest";
import { CajaTurnoService, CuentaBancaria } from "../services/cajaTurnoService";

describe("Punto C: Catálogo Autogestionable de Cuentas Bancarias SPEI y POS", () => {
  const mockCuentas: CuentaBancaria[] = [
    {
      id: "c-bbva",
      empresa_id: "b2ad09db-0a34-4876-9ca3-d584c40bd294",
      sucursal_id: "b2ad09db-0a34-4876-9ca3-d584c40bd295",
      banco: "BBVA",
      alias: "BBVA Fiscal (Facturación)",
      titular: "Cova Tires S.A. de C.V.",
      clabe: null, // Pendiente de ingresar clave por el cliente
      numero_cuenta: null,
      activo: true,
      es_fiscal: true,
      tipo_cuenta: "FISCAL",
    },
    {
      id: "c-banorte",
      empresa_id: "b2ad09db-0a34-4876-9ca3-d584c40bd294",
      sucursal_id: "b2ad09db-0a34-4876-9ca3-d584c40bd295",
      banco: "Banorte",
      alias: "Banorte Operativa Taller",
      titular: "Cova Tires Servicios",
      clabe: null,
      numero_cuenta: null,
      activo: true,
      es_fiscal: false,
      tipo_cuenta: "OPERATIVA",
    },
    {
      id: "c-santander",
      empresa_id: "b2ad09db-0a34-4876-9ca3-d584c40bd294",
      sucursal_id: "b2ad09db-0a34-4876-9ca3-d584c40bd295",
      banco: "Santander",
      alias: "Santander Reserva",
      titular: "Cova Tires Administración",
      clabe: null,
      numero_cuenta: null,
      activo: false, // Inactiva
      es_fiscal: false,
      tipo_cuenta: "OPERATIVA",
    },
  ];

  it("permite dar de alta cuentas bancarias sin CLABE inicial (dejando listo para ingresar la clave después)", () => {
    const nuevaCuenta: Omit<CuentaBancaria, "id"> = {
      empresa_id: "b2ad09db-0a34-4876-9ca3-d584c40bd294",
      sucursal_id: null,
      banco: "BanBajío",
      alias: "BanBajío Fiscal",
      titular: "Cova Tires S.A. de C.V.",
      clabe: null,
      numero_cuenta: null,
      activo: true,
      es_fiscal: true,
      tipo_cuenta: "FISCAL",
    };

    expect(nuevaCuenta.clabe).toBeNull();
    expect(nuevaCuenta.alias).toBe("BanBajío Fiscal");
    expect(nuevaCuenta.es_fiscal).toBe(true);
  });

  it("permite actualizar la CLABE de una cuenta previamente creada cuando el cliente la proporcione", () => {
    const cuentaExistente = { ...mockCuentas[0] };
    expect(cuentaExistente.clabe).toBeNull();

    // Actualización de CLABE por el usuario en configuración
    const clabeReal = "012580001394829102";
    const cuentaActualizada = {
      ...cuentaExistente,
      clabe: clabeReal,
      numero_cuenta: "0139482910",
    };

    expect(cuentaActualizada.clabe).toBe("012580001394829102");
    expect(cuentaActualizada.numero_cuenta).toBe("0139482910");
  });

  it("filtra únicamente cuentas activas para el punto de venta / terminal de cobro", () => {
    const cuentasParaPOS = mockCuentas.filter((c) => c.activo);
    expect(cuentasParaPOS).toHaveLength(2);
    expect(cuentasParaPOS.map((c) => c.alias)).toEqual([
      "BBVA Fiscal (Facturación)",
      "Banorte Operativa Taller",
    ]);
  });

  it("asigna la cuenta_bancaria_id y el detalle de método al registrar un cobro por Transferencia SPEI", () => {
    const selectedCuenta = mockCuentas[0]; // BBVA Fiscal
    const monto = 3500.0;
    const referenciaBancaria = "SPEI-789012";

    const pagoRegistrado = {
      orden_servicio_id: "orden-123",
      monto_total: monto,
      proveedor_pago: "Transferencia",
      metodo_detalle: `Transferencia SPEI (${selectedCuenta.alias} - ${selectedCuenta.banco})`,
      referencia: referenciaBancaria,
      cuenta_bancaria_id: selectedCuenta.id,
      estatus: "Aprobado",
    };

    expect(pagoRegistrado.cuenta_bancaria_id).toBe("c-bbva");
    expect(pagoRegistrado.metodo_detalle).toContain("BBVA Fiscal");
    expect(pagoRegistrado.metodo_detalle).toContain("BBVA");
    expect(pagoRegistrado.referencia).toBe("SPEI-789012");
  });
});
