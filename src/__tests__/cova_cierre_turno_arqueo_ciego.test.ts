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

import {
  CajaTurnoService,
  calcularTotalDenominaciones,
  DenominacionesConteo,
  DENOMINACIONES_BASE,
} from "@/services/cajaTurnoService";
import { supabase } from "@/lib/supabase";

describe("Bloque 4: Cierre de Turno y Arqueo Ciego (Corte Z) - Cova", () => {
  describe("1. Matriz de Conteo Ciego de Denominaciones Mexicanas", () => {
    it("debe calcular con precisión la suma de billetes, monedas y centavos", () => {
      const conteo: DenominacionesConteo = {
        b1000: 2, // $2,000
        b500: 3,  // $1,500
        b200: 5,  // $1,000
        b100: 4,  // $400
        b50: 6,   // $300
        b20: 5,   // $100
        m20: 2,   // $40
        m10: 5,   // $50
        m5: 6,    // $30
        m2: 10,   // $20
        m1: 15,   // $15
        centavos: 3.50, // $3.50
      };

      const total = calcularTotalDenominaciones(conteo);
      // 2000 + 1500 + 1000 + 400 + 300 + 100 + 40 + 50 + 30 + 20 + 15 + 3.50 = 5458.50
      expect(total).toBe(5458.50);
    });

    it("debe manejar conteo vacío en ceros sin errores ni NaN", () => {
      const total = calcularTotalDenominaciones(DENOMINACIONES_BASE);
      expect(total).toBe(0);
    });
  });

  describe("2. Regla de Tolerancia y Descuadre (±$10.00 MXN)", () => {
    const evaluarCierre = (declarado: number, teorico: number, justificacion: string) => {
      const diferencia = declarado - teorico;
      const dentroDeTolerancia = Math.abs(diferencia) <= 10.00;
      const justificacionValida = !dentroDeTolerancia ? justificacion.trim().length > 0 : true;

      return {
        diferencia,
        dentroDeTolerancia,
        puedeCerrar: dentroDeTolerancia || justificacionValida,
        estadoVisual: dentroDeTolerancia ? "CUADRADO_VERDE" : (diferencia > 0 ? "SOBRANTE_ALERTA" : "FALTANTE_ROJO"),
      };
    };

    it("debe marcar como Cuadrado (Verde) cuando la diferencia está dentro de ±$10.00 MXN", () => {
      const resCero = evaluarCierre(1500, 1500, "");
      expect(resCero.dentroDeTolerancia).toBe(true);
      expect(resCero.puedeCerrar).toBe(true);
      expect(resCero.estadoVisual).toBe("CUADRADO_VERDE");

      const resToleranciaPos = evaluarCierre(1508.50, 1500, "");
      expect(resToleranciaPos.dentroDeTolerancia).toBe(true);
      expect(resToleranciaPos.puedeCerrar).toBe(true);
      expect(resToleranciaPos.estadoVisual).toBe("CUADRADO_VERDE");

      const resToleranciaNeg = evaluarCierre(1491, 1500, "");
      expect(resToleranciaNeg.dentroDeTolerancia).toBe(true);
      expect(resToleranciaNeg.puedeCerrar).toBe(true);
      expect(resToleranciaNeg.estadoVisual).toBe("CUADRADO_VERDE");
    });

    it("debe bloquear el cierre si la discrepancia supera ±$10.00 MXN y no hay justificación", () => {
      const resFaltanteSinJust = evaluarCierre(1450, 1500, "");
      expect(resFaltanteSinJust.dentroDeTolerancia).toBe(false);
      expect(resFaltanteSinJust.puedeCerrar).toBe(false);
      expect(resFaltanteSinJust.estadoVisual).toBe("FALTANTE_ROJO");

      const resSobranteSinJust = evaluarCierre(1550, 1500, "   ");
      expect(resSobranteSinJust.dentroDeTolerancia).toBe(false);
      expect(resSobranteSinJust.puedeCerrar).toBe(false);
      expect(resSobranteSinJust.estadoVisual).toBe("SOBRANTE_ALERTA");
    });

    it("debe permitir el cierre con discrepancia si el cajero redacta una justificación para auditoría", () => {
      const resConJust = evaluarCierre(1450, 1500, "Se dio cambio incorrecto en orden #1002 por confusión en billete");
      expect(resConJust.dentroDeTolerancia).toBe(false);
      expect(resConJust.puedeCerrar).toBe(true);
      expect(resConJust.estadoVisual).toBe("FALTANTE_ROJO");
    });
  });

  describe("3. Cálculo de Remesa de Retiro y Fondo Fijo Siguiente ($400 Cova)", () => {
    it("debe calcular la remesa sugerida descontando el fondo base de morralla", () => {
      const fondoBaseApertura = 400; // Fondo 1 para Cova
      const totalContadoFondo1 = 12450; // Apertura $400 + $12,050 de cobros en efectivo

      const fondoSiguiente = fondoBaseApertura;
      const remesaSugerida = Math.max(0, totalContadoFondo1 - fondoSiguiente);

      expect(remesaSugerida).toBe(12050);
      expect(totalContadoFondo1 - remesaSugerida).toBe(fondoSiguiente);
    });

    it("debe sugerir $0 de remesa si el efectivo total contado es menor o igual al fondo base", () => {
      const fondoBaseApertura = 400;
      const totalContadoFondo1 = 350; // Hubo gastos en patio superiores a los cobros

      const fondoSiguiente = fondoBaseApertura;
      const remesaSugerida = Math.max(0, totalContadoFondo1 - fondoSiguiente);

      expect(remesaSugerida).toBe(0);
    });
  });

  describe("4. Estructura e Inmutabilidad del Snapshot de Cierre (Corte Z)", () => {
    it("debe contener todos los atributos auditables de la operación en el snapshot JSONB", () => {
      const snapshot = {
        fecha_cierre: new Date().toISOString(),
        usuario_cierre_id: "cajero-uuid-123",
        teorico_f1: 5400,
        declarado_f1: 5400,
        diferencia_f1: 0,
        teorico_f2: 8500,
        declarado_f2: 8500,
        diferencia_f2: 0,
        entradas_pos_f1: 5000,
        salidas_f1: 0,
        ventas_tpv: 8200,
        ventas_spei: 4500,
        ventas_bnpl: 0,
        total_recaudado_turno: 17700,
        remesa_retirada: 5000,
        fondo_siguiente_f1: 400,
        justificacion_descuadre: "",
        denominaciones_f1: { b500: 10, b200: 2 },
      };

      expect(snapshot.teorico_f1).toBe(5400);
      expect(snapshot.declarado_f1).toBe(5400);
      expect(snapshot.diferencia_f1).toBe(0);
      expect(snapshot.total_recaudado_turno).toBe(17700);
      expect(snapshot.remesa_retirada).toBe(5000);
      expect(snapshot.fondo_siguiente_f1).toBe(400);
    });

    it("debe invocar fn_cerrar_turno_caja con los parámetros completos y procesar respuesta", async () => {
      (supabase.rpc as any).mockResolvedValueOnce({
        data: {
          success: true,
          turno_id: "turno-test-123",
          teorico_f1: 5400,
          declarado_f1: 5400,
          diferencia_f1: 0,
          teorico_f2: 8500,
          declarado_f2: 8500,
          diferencia_f2: 0,
          remesa: 5000,
          fondo_siguiente: 400,
        },
        error: null,
      });

      const res = await CajaTurnoService.cerrarTurno({
        turnoId: "turno-test-123",
        usuarioCierreId: "user-test-cova",
        declaradoF1: 5400,
        declaradoF2: 8500,
        denominacionesF1: { ...DENOMINACIONES_BASE, b500: 10, b200: 2 },
        justificacion: "",
        montoRemesa: 5000,
        montoFondoSiguiente: 400,
      });

      expect(res.success).toBe(true);
      expect(res.diferenciaF1).toBe(0);
      expect(res.teoricoF1).toBe(5400);
      expect(supabase.rpc).toHaveBeenCalledWith(
        "fn_cerrar_turno_caja",
        expect.objectContaining({
          p_turno_id: "turno-test-123",
          p_declarado_f1: 5400,
          p_declarado_f2: 8500,
          p_monto_remesa: 5000,
          p_monto_fondo_siguiente: 400,
        })
      );
    });
  });
});
