import { describe, it, expect } from "vitest";
import {
  calcularTotalTarjeta,
  prorratearPreciosParaTarjeta,
  type PricingEngineItem,
} from "../services/pricingEngineService";

describe("Pricing Engine - TallerTrack (Reglas de Mostrador Cova)", () => {
  describe("calcularTotalTarjeta", () => {
    it("aplica +4.3% y redondea a la decena inmediatamente superior", () => {
      // 1000 * 1.043 = 1043 -> ceil a decena = 1050
      expect(calcularTotalTarjeta({ monto: 1000, porcentaje: 4.3, tieneRefacciones: true })).toBe(1050);

      // 500 * 1.043 = 521.5 -> ceil a decena = 530
      expect(calcularTotalTarjeta({ monto: 500, porcentaje: 4.3, tieneRefacciones: true })).toBe(530);

      // 2450 * 1.043 = 2555.35 -> ceil a decena = 2560
      expect(calcularTotalTarjeta({ monto: 2450, porcentaje: 4.3, tieneRefacciones: true })).toBe(2560);
    });

    it("no cobra recargo ni comisión si la orden es 100% mano de obra (sin refacciones)", () => {
      expect(calcularTotalTarjeta({ monto: 800, porcentaje: 4.3, tieneRefacciones: false })).toBe(800);
      expect(calcularTotalTarjeta({ monto: 1500, porcentaje: 4.3, tieneRefacciones: false })).toBe(1500);
    });

    it("soporta sobretasas de Meses Sin Intereses (MSI)", () => {
      // 3 MSI: 7.5% -> 1000 * 1.075 = 1075 -> ceil = 1080
      expect(
        calcularTotalTarjeta({ monto: 1000, tieneRefacciones: true, plazoMsi: 3 })
      ).toBe(1080);

      // 6 MSI: 11.5% -> 1000 * 1.115 = 1115 -> ceil = 1120
      expect(
        calcularTotalTarjeta({ monto: 1000, tieneRefacciones: true, plazoMsi: 6 })
      ).toBe(1120);

      // 12 MSI: 19.5% -> 1000 * 1.195 = 1195 -> ceil = 1200
      expect(
        calcularTotalTarjeta({ monto: 1000, tieneRefacciones: true, plazoMsi: 12 })
      ).toBe(1200);
    });
  });

  describe("prorratearPreciosParaTarjeta", () => {
    it("congela la mano de obra y prorratea el diferencial en refacciones como múltiplos de 10", () => {
      const items: PricingEngineItem[] = [
        {
          id: "srv-1",
          tipo: "servicio",
          nombre: "Alineación y Balanceo",
          cantidad: 1,
          precioUnitario: 300,
          subtotal: 300,
        },
        {
          id: "ref-1",
          tipo: "refaccion",
          nombre: "Filtro de Aceite",
          cantidad: 1,
          precioUnitario: 150,
          subtotal: 150,
        },
        {
          id: "lla-1",
          tipo: "llanta",
          nombre: "Llanta Michelin 205/55R16",
          cantidad: 2,
          precioUnitario: 800,
          subtotal: 1600,
        },
      ];

      // Gran total efectivo = 300 + 150 + 1600 = 2050
      // Tarjeta = ceil(2050 * 1.043 / 10) * 10 = ceil(2138.15 / 10) * 10 = 2140
      // Diferencial = 90
      const res = prorratearPreciosParaTarjeta(items);

      expect(res.granTotalEfectivo).toBe(2050);
      expect(res.granTotalTarjeta).toBe(2140);
      expect(res.diferencialTotal).toBe(90);

      // Mano de obra congelada
      const srvProrr = res.itemsProrrateados.find((i) => i.id === "srv-1")!;
      expect(srvProrr.subtotalFinal).toBe(300);
      expect(srvProrr.precioUnitarioFinal).toBe(300);
      expect(srvProrr.diferencial).toBe(0);

      // Refacciones y llantas absorbieron los 90 pesos
      const refProrr = res.itemsProrrateados.find((i) => i.id === "ref-1")!;
      const llaProrr = res.itemsProrrateados.find((i) => i.id === "lla-1")!;

      // Cada subtotal final debe ser múltiplo de 10
      expect(refProrr.subtotalFinal % 10).toBe(0);
      expect(llaProrr.subtotalFinal % 10).toBe(0);

      // Suma total cuadra al centavo
      const sumaFinal = res.itemsProrrateados.reduce((acc, i) => acc + i.subtotalFinal, 0);
      expect(sumaFinal).toBe(2140);
    });

    it("resuelve el escenario del usuario con 4 llantas y cantidad > 1", () => {
      const items: PricingEngineItem[] = [
        {
          id: "lla-4",
          tipo: "llanta",
          nombre: "Juego de 4 Llantas 185/65R15",
          cantidad: 4,
          precioUnitario: 1200,
          subtotal: 4800,
        },
      ];

      // 4800 * 1.043 = 5006.4 -> ceil a decena = 5010
      const res = prorratearPreciosParaTarjeta(items);

      expect(res.granTotalTarjeta).toBe(5010);
      const prorr = res.itemsProrrateados[0];
      expect(prorr.subtotalFinal).toBe(5010);
      expect(prorr.subtotalFinal % 10).toBe(0);
      expect(prorr.precioUnitarioFinal).toBe(1252.5); // 5010 / 4
    });

    it("no modifica nada si la orden no contiene refacciones", () => {
      const items: PricingEngineItem[] = [
        {
          id: "srv-afinacion",
          tipo: "servicio",
          nombre: "Afinación Mayor",
          cantidad: 1,
          precioUnitario: 1200,
          subtotal: 1200,
        },
      ];

      const res = prorratearPreciosParaTarjeta(items);

      expect(res.granTotalEfectivo).toBe(1200);
      expect(res.granTotalTarjeta).toBe(1200);
      expect(res.diferencialTotal).toBe(0);
      expect(res.itemsProrrateados[0].subtotalFinal).toBe(1200);
      expect(res.itemsProrrateados[0].diferencial).toBe(0);
    });

    it("absorbe residuos de redondeo en la partida de mayor valor", () => {
      const items: PricingEngineItem[] = [
        {
          id: "ref-grande",
          tipo: "refaccion",
          nombre: "Amortiguador Delantero",
          cantidad: 1,
          precioUnitario: 1000,
          subtotal: 1000,
        },
        {
          id: "ref-chica",
          tipo: "refaccion",
          nombre: "Buje de Horquilla",
          cantidad: 1,
          precioUnitario: 200,
          subtotal: 200,
        },
      ];

      // Total 1200 * 1.043 = 1251.6 -> 1260 (Diff = 60)
      const res = prorratearPreciosParaTarjeta(items);

      expect(res.granTotalTarjeta).toBe(1260);
      const suma = res.itemsProrrateados.reduce((acc, i) => acc + i.subtotalFinal, 0);
      expect(suma).toBe(1260);

      res.itemsProrrateados.forEach((it) => {
        expect(it.subtotalFinal % 10).toBe(0);
      });
    });
  });
});
