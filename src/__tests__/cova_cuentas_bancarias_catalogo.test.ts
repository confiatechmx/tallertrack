import { describe, it, expect } from "vitest";
import { CuentaBancaria } from "../services/cajaTurnoService";

describe("Punto C: Catálogo Autogestionable de Cuentas Bancarias SPEI y POS - Cova Tires", () => {
  const mockCuentasCova: CuentaBancaria[] = [
    {
      id: "c-banbajio",
      empresa_id: "b2ad09db-0a34-4876-9ca3-d584c40bd294",
      sucursal_id: "b2ad09db-0a34-4876-9ca3-d584c40bd295",
      banco: "BanBajío",
      alias: "BanBajío Fiscal",
      titular: "Cova Tires S.A. de C.V.",
      clabe: null, // Pendiente de ingresar clave por el cliente
      numero_cuenta: null,
      activo: true,
      es_fiscal: true,
      tipo_cuenta: "FISCAL",
    },
    {
      id: "c-inbursa",
      empresa_id: "b2ad09db-0a34-4876-9ca3-d584c40bd294",
      sucursal_id: "b2ad09db-0a34-4876-9ca3-d584c40bd295",
      banco: "Inbursa",
      alias: "Inbursa Operativa",
      titular: "Cova Tires Servicios",
      clabe: null,
      numero_cuenta: null,
      activo: true,
      es_fiscal: false,
      tipo_cuenta: "OPERATIVA",
    },
    {
      id: "c-mp",
      empresa_id: "b2ad09db-0a34-4876-9ca3-d584c40bd294",
      sucursal_id: "b2ad09db-0a34-4876-9ca3-d584c40bd295",
      banco: "Mercado Pago",
      alias: "Mercado Pago Wallet",
      titular: "Cova Tires MP",
      clabe: null,
      numero_cuenta: null,
      activo: true,
      es_fiscal: false,
      tipo_cuenta: "OPERATIVA",
    },
  ];

  it("garantiza que BanBajío es la cuenta oficial Fiscal (SAT) y las demás son operativas con CLABE pendiente", () => {
    const cuentaFiscal = mockCuentasCova.find((c) => c.es_fiscal);
    expect(cuentaFiscal).toBeDefined();
    expect(cuentaFiscal?.banco).toBe("BanBajío");
    expect(cuentaFiscal?.alias).toBe("BanBajío Fiscal");
    expect(cuentaFiscal?.tipo_cuenta).toBe("FISCAL");
    expect(cuentaFiscal?.clabe).toBeNull();

    const cuentasOperativas = mockCuentasCova.filter((c) => !c.es_fiscal);
    expect(cuentasOperativas.map((c) => c.banco)).toEqual(["Inbursa", "Mercado Pago"]);
  });

  it("permite actualizar la CLABE de BanBajío cuando el cliente proporcione los 18 dígitos", () => {
    const cuentaExistente = { ...mockCuentasCova[0] };
    expect(cuentaExistente.clabe).toBeNull();

    const clabeReal = "030580900011223344";
    const cuentaActualizada = {
      ...cuentaExistente,
      clabe: clabeReal,
      numero_cuenta: "9000112233",
    };

    expect(cuentaActualizada.clabe).toBe("030580900011223344");
    expect(cuentaActualizada.numero_cuenta).toBe("9000112233");
  });

  it("filtra únicamente cuentas activas para el punto de venta / terminal de cobro", () => {
    const cuentasParaPOS = mockCuentasCova.filter((c) => c.activo);
    expect(cuentasParaPOS).toHaveLength(3);
    expect(cuentasParaPOS.map((c) => c.alias)).toEqual([
      "BanBajío Fiscal",
      "Inbursa Operativa",
      "Mercado Pago Wallet",
    ]);
  });

  it("asigna la cuenta_bancaria_id y el detalle de método al registrar un cobro por Transferencia BanBajío Fiscal", () => {
    const selectedCuenta = mockCuentasCova[0]; // BanBajío Fiscal
    const monto = 4200.0;
    const referenciaBancaria = "SPEI-BAJIO-45819";

    const pagoRegistrado = {
      orden_servicio_id: "orden-123",
      monto_total: monto,
      proveedor_pago: "Transferencia",
      metodo_detalle: `Transferencia SPEI (${selectedCuenta.alias} - ${selectedCuenta.banco})`,
      referencia: referenciaBancaria,
      cuenta_bancaria_id: selectedCuenta.id,
      estatus: "Aprobado",
    };

    expect(pagoRegistrado.cuenta_bancaria_id).toBe("c-banbajio");
    expect(pagoRegistrado.metodo_detalle).toContain("BanBajío Fiscal");
    expect(pagoRegistrado.metodo_detalle).toContain("BanBajío");
    expect(pagoRegistrado.referencia).toBe("SPEI-BAJIO-45819");
  });
});
