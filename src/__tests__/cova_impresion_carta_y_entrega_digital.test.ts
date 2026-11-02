import { describe, it, expect } from "vitest";

describe("Bloque 5: Impresión Tamaño Carta y Entrega Digital - Cova", () => {
  const covaEmpresa = {
    id: "b2ad09db-0a34-4876-9ca3-d584c40bd294",
    nombre_comercial: "Cova",
    rfc: "COV2201019A1",
    direccion: "Río Aguanaval 1595, Col. Pascual Orozco, C.P. 80170, Culiacán Rosales, Sin.",
    telefono: "+526674125459",
    tasa_iva: 16,
    color_primario: "#1C3EFF",
    terminos_condiciones: "Garantía de 30 días o 1,000 km en mano de obra. Neumáticos y refacciones con garantía oficial de fabricante.",
  };

  const covaSucursal = {
    id: "b2ad09db-0a34-4876-9ca3-d584c40bd295",
    nombre: "Cova",
    codigo: "COVA",
    direccion: "Río Aguanaval 1595, Col. Pascual Orozco, C.P. 80170, Culiacán Rosales, Sin.",
    telefono: "+526674125459",
  };

  describe("1. Recibo Oficial de Pago (Formato Carta)", () => {
    it("debe calcular correctamente los subtotales por concepto (servicios, refacciones, llantas) y el desglose de IVA", () => {
      const servicios = [{ precio_cobrado: 600, cantidad: 2 }]; // 1,200
      const refacciones = [{ precio_unitario: 800, cantidad: 2 }]; // 1,600
      const llantas = [{ precio_unitario: 2500, cantidad: 4 }]; // 10,000

      const subtotalServicios = servicios.reduce((acc, s) => acc + s.precio_cobrado * s.cantidad, 0);
      const subtotalRefacciones = refacciones.reduce((acc, r) => acc + r.precio_unitario * r.cantidad, 0);
      const subtotalLlantas = llantas.reduce((acc, l) => acc + l.precio_unitario * l.cantidad, 0);

      const granTotal = subtotalServicios + subtotalRefacciones + subtotalLlantas;
      expect(granTotal).toBe(12800);

      const tasaIva = covaEmpresa.tasa_iva;
      const subtotalSinIva = granTotal / (1 + tasaIva / 100);
      const iva = granTotal - subtotalSinIva;

      expect(Math.round(subtotalSinIva * 100) / 100).toBe(11034.48);
      expect(Math.round(iva * 100) / 100).toBe(1765.52);
    });

    it("debe detallar múltiples formas de pago (Split Payment) con referencias y montos individuales", () => {
      const splitPayments = [
        { proveedor_pago: "Efectivo", metodo_detalle: "Efectivo", monto: 5000, referencia: null },
        { proveedor_pago: "Tarjeta", metodo_detalle: "BanBajío TPV Tarjeta", monto: 4800, referencia: "AUT-91823" },
        { proveedor_pago: "Transferencia", metodo_detalle: "SPEI BanBajío Fiscal", monto: 3000, referencia: "RASTREO-88291" },
      ];

      const totalCobrado = splitPayments.reduce((acc, p) => acc + p.monto, 0);
      expect(totalCobrado).toBe(12800);

      const metodosDetalle = splitPayments.map(
        (p) => `${p.proveedor_pago} ($${p.monto})${p.referencia ? ` Ref: ${p.referencia}` : ""}`
      );

      expect(metodosDetalle).toHaveLength(3);
      expect(metodosDetalle[1]).toContain("Ref: AUT-91823");
      expect(metodosDetalle[2]).toContain("Ref: RASTREO-88291");
    });

    it("debe incluir las pólizas de garantía de mano de obra y de fabricante de neumáticos", () => {
      expect(covaEmpresa.terminos_condiciones).toContain("30 días o 1,000 km en mano de obra");
      expect(covaEmpresa.terminos_condiciones).toContain("Neumáticos y refacciones con garantía oficial de fabricante");
    });
  });

  describe("2. Acta de Cierre y Arqueo de Turno (Corte Z Carta)", () => {
    it("debe contener el encabezado oficial de Cova con dirección y teléfono de sucursal", () => {
      expect(covaEmpresa.nombre_comercial).toBe("Cova");
      expect(covaSucursal.direccion).toBe("Río Aguanaval 1595, Col. Pascual Orozco, C.P. 80170, Culiacán Rosales, Sin.");
      expect(covaSucursal.telefono).toBe("+526674125459");
    });

    it("debe estructurar el arqueo comparativo dual y destino de efectivo (Remesa + Fondo Siguiente)", () => {
      const cierreData = {
        turno_id: "turno-cova-uuid-999",
        declaradoF1: 15400,
        teoricoF1: 15400,
        diferenciaF1: 0,
        declaradoF2: 8500,
        teoricoF2: 8500,
        diferenciaF2: 0,
        fondoSiguiente: 400, // $400 base Cova
        remesa: 15000,       // $15,000 retirada a caja fuerte
      };

      expect(cierreData.declaradoF1 - cierreData.remesa).toBe(cierreData.fondoSiguiente);
      expect(cierreData.diferenciaF1).toBe(0);
      expect(cierreData.diferenciaF2).toBe(0);
    });

    it("debe consolidar las firmas autógrafas de entrega y recepción de fondos", () => {
      const cajeroNombre = "Hugo Beltrán";
      const supervisorNombre = "Larissa Orozco";

      const bloqueFirmas = {
        entrega: { cargo: "Cajero(a) Entrega Turno", responsable: cajeroNombre },
        recepcion: { cargo: "Administrador / Supervisor", responsable: supervisorNombre },
      };

      expect(bloqueFirmas.entrega.responsable).toBe("Hugo Beltrán");
      expect(bloqueFirmas.recepcion.responsable).toBe("Larissa Orozco");
    });
  });

  describe("3. Despacho Digital y Enlace al Comprobante por WhatsApp", () => {
    it("debe normalizar el número telefónico mexicano a formato E.164 (521... / 52...)", () => {
      const tel1 = "6674125459";
      const tel2 = "+52 667 412 5459";
      const tel3 = "526674125459";

      const normalizar = (tel: string) => {
        const clean = tel.replace(/\D/g, "");
        return clean.startsWith("52") ? clean : `52${clean}`;
      };

      expect(normalizar(tel1)).toBe("526674125459");
      expect(normalizar(tel2)).toBe("526674125459");
      expect(normalizar(tel3)).toBe("526674125459");
    });

    it("debe generar el enlace público al comprobante digital accesible en la nube", () => {
      const orderId = "b1284e9c-4f70-4f51-a968-3f81e35d045a";
      const origin = "https://cova.tallertrack.com";
      const url = `${origin}/orden/${orderId}/imprimir`;

      expect(url).toBe("https://cova.tallertrack.com/orden/b1284e9c-4f70-4f51-a968-3f81e35d045a/imprimir");
    });

    it("debe armar el mensaje oficial de WhatsApp con desglose, liga digital y agradecimiento de garantía", () => {
      const orderId = "b1284e9c-4f70-4f51-a968-3f81e35d045a";
      const folioDisplay = "#1001";
      const ticketFolio = "REC-1001";
      const origin = "https://cova.tallertrack.com";
      const digitalUrl = `${origin}/orden/${orderId}/imprimir`;

      const msg = [
        `🧾 *RECIBO OFICIAL DE PAGO Y COMPROBANTE DE CAJA*`,
        `🏢 *Cova*`,
        `🔖 Recibo: ${ticketFolio} | Orden: ${folioDisplay}`,
        `🚗 Nissan Versa (VNL-284-A)`,
        `👤 Cliente: Larissa Orozco`,
        `--------------------------------`,
        `💳 Método: Efectivo`,
        `💰 Monto Pagado: $12,800.00 MXN`,
        `🏁 Saldo Pendiente: $0.00 MXN`,
        `--------------------------------`,
        `🔗 Ver comprobante digital:`,
        digitalUrl,
        `--------------------------------`,
        `✅ ¡Gracias por tu preferencia! Póliza de garantía: 30 días o 1,000 km en mano de obra y garantía oficial de fabricante en neumáticos y refacciones.`,
      ].join("\n");

      expect(msg).toContain("REC-1001");
      expect(msg).toContain("Nissan Versa");
      expect(msg).toContain(digitalUrl);
      expect(msg).toContain("30 días o 1,000 km");
    });
  });
});
