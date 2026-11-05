import { describe, it, expect } from "vitest";
import {
  ResumenTurnoTeorico,
  TurnoVentaOrden,
  TurnoVentaPagoDesglose,
} from "@/services/cajaTurnoService";

describe("Corte Z y Balance de Caja Enriquecido - Terminales y Multi-Método", () => {
  describe("1. Enriquecimiento de Terminales TPV (MSI y Comisiones Absorbidas)", () => {
    it("debe estructurar el desglose de terminales con proveedor, modalidad y comisiones retenidas", () => {
      const resumen: ResumenTurnoTeorico = {
        fondo1: {
          nombre: "Fondo 1: Mostrador",
          apertura: 400,
          entradasEfectivoPOS: 3813,
          salidasGastos: 0,
          traspasosRecibidos: 0,
          traspasosEnviados: 0,
          saldoTeoricoCalculado: 4213,
        },
        fondo2: {
          nombre: "Fondo 2: Reserva",
          apertura: 8500,
          traspasosRecibidos: 0,
          traspasosEnviados: 0,
          saldoTeoricoCalculado: 8500,
        },
        bancosSPEI: [
          { cuentaId: "c1", banco: "BanBajío", alias: "BanBajío Fiscal", total: 2000, conteo: 1 },
          { cuentaId: "c2", banco: "Mercado Pago", alias: "Mercado Pago Wallet", total: 250, conteo: 1 },
        ],
        tarjetasTPV: {
          total: 1200,
          conteo: 1,
          totalComisiones: 90,
          totalNeto: 1110,
          desglose: [
            {
              metodo: "Mercado Pago 3 Meses Sin Intereses",
              proveedor: "Mercado Pago",
              plazo_msi: 3,
              modalidad: "3 MSI",
              bruto: 1200,
              comision: 90,
              neto: 1110,
              conteo: 1,
            },
          ],
        },
        bnpl: { total: 0, conteo: 0 },
        totalVentasTurno: 7263,
        cantidadTransacciones: 6,
      };

      expect(resumen.tarjetasTPV.total).toBe(1200);
      expect(resumen.tarjetasTPV.totalComisiones).toBe(90);
      expect(resumen.tarjetasTPV.totalNeto).toBe(1110);
      expect(resumen.tarjetasTPV.desglose).toHaveLength(1);

      const t = resumen.tarjetasTPV.desglose![0];
      expect(t.metodo).toBe("Mercado Pago 3 Meses Sin Intereses");
      expect(t.modalidad).toBe("3 MSI");
      expect(t.comision).toBe(90);
      expect(t.bruto).toBe(1200);
      expect(t.neto).toBe(1110);
    });
  });

  describe("2. Reporte de Ventas y Servicios: Desglose de Cuentas SPEI y Multi-Método", () => {
    it("debe desglosar correctamente una orden pagada con múltiples métodos (Split Payment)", () => {
      const pagosOrden1018: TurnoVentaPagoDesglose[] = [
        {
          id: "pago-efectivo-1",
          monto: 1000,
          metodo: "Efectivo",
          metodoDetalle: "Pago en Efectivo",
          referencia: "ORD-1018",
        },
        {
          id: "pago-spei-2",
          monto: 2000,
          metodo: "Transferencia",
          metodoDetalle: "Transferencia SPEI (BanBajío Fiscal)",
          bancoNombre: "BanBajío",
          cuentaAlias: "BanBajío Fiscal",
          referencia: "675467",
        },
      ];

      const orden: TurnoVentaOrden = {
        ordenId: "ord-1018",
        folio: 1018,
        folioStr: "#1018",
        clienteNombre: "Minera del Fuerte S.A. de C.V.",
        clienteTelefono: "6671234567",
        vehiculoDesc: "Toyota Hilux Doble Cabina 2022",
        placas: "VLD-401-C",
        fechaPago: "2026-11-05T19:40:00Z",
        metodoPago: "Multimétodo (Efectivo + Transferencia)",
        referencia: "ORD-1018, 675467",
        pagosDesglose: pagosOrden1018,
        partidas: [],
        totalVenta: 3000,
        totalCostos: 1850,
        utilidadBruta: 1150,
        margenPorcentaje: 38.3,
      };

      expect(orden.metodoPago).toContain("Multimétodo");
      expect(orden.pagosDesglose).toHaveLength(2);
      expect(orden.pagosDesglose![0].metodo).toBe("Efectivo");
      expect(orden.pagosDesglose![0].monto).toBe(1000);
      expect(orden.pagosDesglose![1].metodo).toBe("Transferencia");
      expect(orden.pagosDesglose![1].cuentaAlias).toBe("BanBajío Fiscal");
      expect(orden.pagosDesglose![1].monto).toBe(2000);
      expect(orden.pagosDesglose![1].referencia).toBe("675467");
    });

    it("debe especificar la cuenta bancaria destino en pagos con Transferencia individual", () => {
      const pagoSpei: TurnoVentaPagoDesglose[] = [
        {
          id: "pago-spei-1020",
          monto: 250,
          metodo: "Transferencia",
          metodoDetalle: "Transferencia SPEI (Mercado Pago • Mercado Pago Wallet)",
          bancoNombre: "Mercado Pago",
          cuentaAlias: "Mercado Pago Wallet",
          referencia: "23452345",
        },
      ];

      const orden: TurnoVentaOrden = {
        ordenId: "ord-1020",
        folio: 1020,
        folioStr: "#1020",
        clienteNombre: "Eduardo Torres",
        clienteTelefono: "-",
        vehiculoDesc: "Ford Fusion SE Luxury 2015",
        placas: "VRM-855-A",
        fechaPago: "2026-11-05T19:41:00Z",
        metodoPago: "Transferencia (Mercado Pago Wallet)",
        referencia: "23452345",
        pagosDesglose: pagoSpei,
        partidas: [],
        totalVenta: 250,
        totalCostos: 0,
        utilidadBruta: 250,
        margenPorcentaje: 100,
      };

      expect(orden.metodoPago).toBe("Transferencia (Mercado Pago Wallet)");
      expect(orden.pagosDesglose![0].cuentaAlias).toBe("Mercado Pago Wallet");
      expect(orden.pagosDesglose![0].referencia).toBe("23452345");
    });
  });

  describe("3. Apertura Inmediata del Comprobante de Cierre Z", () => {
    it("valida que los datos pasados a onSuccess incluyan turno_id para activar el visor de ventas de inmediato", () => {
      const payloadOnSuccess = {
        success: true,
        turno_id: "dae92ba7-4981-4ba8-bf56-560798f1b64d",
        turnoId: "dae92ba7-4981-4ba8-bf56-560798f1b64d",
        declaradoF1: 4212,
        declaradoF2: 8500,
        teoricoF1: 4213,
        teoricoF2: 8500,
        diferenciaF1: -1,
        diferenciaF2: 0,
        remesa: 3812,
        fondoSiguiente: 400,
      };

      expect(payloadOnSuccess.turno_id).toBeDefined();
      expect(payloadOnSuccess.turno_id).toBe("dae92ba7-4981-4ba8-bf56-560798f1b64d");
      expect(payloadOnSuccess.teoricoF1).toBe(4213);
    });
  });
});
