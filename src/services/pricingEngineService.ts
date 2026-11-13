/**
/**
 * Pricing Engine Service - TallerTrack (ConfiaTech Ecosistema)
 * 
 * Reglas de Pricing y Ajustes por Forma de Pago (Modo Cova / Tenant):
 * 1. Precio Base = Precio Efectivo (Inmutable en BD). Siempre se presenta como
 *    "Precio de Lista" o "Precio Promoción" (sin leyendas de descuento o recargos).
 * 2. Pago con Tarjeta TPV: +4.3% redondeado a la decena inmediatamente superior.
 * 3. Si la orden es 100% servicios (sin refacciones ni llantas), no se aplica comisión.
 * 4. La Mano de Obra se congela al 100% en la cotización y nota de venta.
 * 5. El diferencial de tarjeta se prorratea ponderadamente entre las refacciones y llantas.
 * 6. Cada renglón de refacción queda con un importe total terminado en múltiplo de 10,
 *    asignando cualquier residuo al artículo de mayor valor para cuadre exacto al centavo.
 * 7. Pagos parciales / multimetal aplican el cálculo exclusivamente a la porción de tarjeta.
 */

export interface PricingEngineItem {
  id: string;
  tipo: "servicio" | "refaccion" | "llanta";
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface PricingEngineCalculationOptions {
  porcentajeTarjeta?: number;
  plazoMsi?: number | null;
  modo?: "prorrateo_decenas" | "estandar";
}

export interface ItemProrrateado {
  id: string;
  tipo: "servicio" | "refaccion" | "llanta";
  nombre: string;
  cantidad: number;
  precioUnitarioOriginal: number;
  subtotalOriginal: number;
  precioUnitarioFinal: number;
  subtotalFinal: number;
  diferencial: number;
}

export interface PricingEngineResult {
  granTotalEfectivo: number;
  granTotalTarjeta: number;
  diferencialTotal: number;
  tieneRefacciones: boolean;
  totalServicios: number;
  totalRefaccionesOriginal: number;
  totalRefaccionesFinal: number;
  itemsProrrateados: ItemProrrateado[];
}

/**
 * Calcula el monto a cobrar en tarjeta aplicando la sobretasa y redondeando
 * a la decena inmediatamente superior (múltiplo de 10).
 * 
 * Si la orden no tiene refacciones (100% servicios), la comisión no se aplica.
 */
export function calcularTotalTarjeta({
  monto,
  porcentaje = 4.3,
  tieneRefacciones = true,
  plazoMsi = null,
}: {
  monto: number;
  porcentaje?: number;
  tieneRefacciones?: boolean;
  plazoMsi?: number | null;
}): number {
  if (monto <= 0) return 0;

  // Regla Cova: Si la orden es 100% mano de obra/servicios, no se cobra recargo
  if (!tieneRefacciones) {
    return Number(monto.toFixed(2));
  }

  let pct = porcentaje;
  if (plazoMsi) {
    if (plazoMsi === 3) pct = 7.5;
    else if (plazoMsi === 6) pct = 11.5;
    else if (plazoMsi === 9) pct = 15.5;
    else if (plazoMsi === 12) pct = 19.5;
    else pct = 7.5;
  }

  // +pct% redondeado a la decena inmediatamente superior
  const raw = monto * (1 + pct / 100);
  const decenaSuperior = Math.ceil(raw / 10) * 10;
  return decenaSuperior;
}

/**
 * Prorratea el diferencial de pago con tarjeta ponderadamente entre refacciones y llantas,
 * congelando la mano de obra y asegurando que los importes de renglón sean múltiplos de 10.
 */
export function prorratearPreciosParaTarjeta(
  items: PricingEngineItem[],
  options?: PricingEngineCalculationOptions
): PricingEngineResult {
  const porcentaje = options?.porcentajeTarjeta ?? 4.3;
  const plazoMsi = options?.plazoMsi ?? null;

  const servicios = items.filter((i) => i.tipo === "servicio");
  const refacciones = items.filter((i) => i.tipo !== "servicio");

  const totalServicios = servicios.reduce(
    (acc, s) => acc + Number(s.subtotal || s.precioUnitario * s.cantidad || 0),
    0
  );
  const totalRefaccionesOriginal = refacciones.reduce(
    (acc, r) => acc + Number(r.subtotal || r.precioUnitario * r.cantidad || 0),
    0
  );

  const granTotalEfectivo = totalServicios + totalRefaccionesOriginal;
  const tieneRefacciones = refacciones.length > 0;

  const granTotalTarjeta = calcularTotalTarjeta({
    monto: granTotalEfectivo,
    porcentaje,
    tieneRefacciones,
    plazoMsi,
  });

  const diferencialTotal = Math.max(0, granTotalTarjeta - granTotalEfectivo);

  // Si no hay refacciones o no hay diferencial que prorratear, retornar sin alteraciones
  if (!tieneRefacciones || diferencialTotal <= 0) {
    const itemsProrrateados: ItemProrrateado[] = items.map((item) => {
      const origSub = Number(item.subtotal || item.precioUnitario * item.cantidad || 0);
      return {
        id: item.id,
        tipo: item.tipo,
        nombre: item.nombre,
        cantidad: item.cantidad || 1,
        precioUnitarioOriginal: item.precioUnitario,
        subtotalOriginal: origSub,
        precioUnitarioFinal: item.precioUnitario,
        subtotalFinal: origSub,
        diferencial: 0,
      };
    });

    return {
      granTotalEfectivo,
      granTotalTarjeta,
      diferencialTotal: 0,
      tieneRefacciones,
      totalServicios,
      totalRefaccionesOriginal,
      totalRefaccionesFinal: totalRefaccionesOriginal,
      itemsProrrateados,
    };
  }

  // Servicios quedan congelados
  const serviciosProrrateados: ItemProrrateado[] = servicios.map((s) => {
    const origSub = Number(s.subtotal || s.precioUnitario * s.cantidad || 0);
    return {
      id: s.id,
      tipo: "servicio",
      nombre: s.nombre,
      cantidad: s.cantidad || 1,
      precioUnitarioOriginal: s.precioUnitario,
      subtotalOriginal: origSub,
      precioUnitarioFinal: s.precioUnitario,
      subtotalFinal: origSub,
      diferencial: 0,
    };
  });

  // Meta total para refacciones en tarjeta
  const totalRefaccionesTarget = totalRefaccionesOriginal + diferencialTotal;

  // Reparto proporcional ponderado
  const refaccionesConMeta = refacciones.map((r) => {
    const origSub = Number(r.subtotal || r.precioUnitario * r.cantidad || 0);
    const peso = totalRefaccionesOriginal > 0 ? origSub / totalRefaccionesOriginal : 1 / refacciones.length;
    const diffTeorico = diferencialTotal * peso;
    const subtotalTeorico = origSub + diffTeorico;
    // Redondear a la decena más cercana
    const subtotalRedondeado = Math.round(subtotalTeorico / 10) * 10;

    return {
      r,
      origSub,
      peso,
      subtotalRedondeado,
    };
  });

  // Cuadre exacto con el target para absorber residuos de redondeo
  const sumaSubtotalesRedondeados = refaccionesConMeta.reduce(
    (acc, cur) => acc + cur.subtotalRedondeado,
    0
  );
  const residuo = totalRefaccionesTarget - sumaSubtotalesRedondeados;

  if (residuo !== 0 && refaccionesConMeta.length > 0) {
    // Asignar el residuo (+10, -10, etc.) a la partida de mayor valor
    let maxIdx = 0;
    let maxSub = refaccionesConMeta[0].origSub;
    for (let i = 1; i < refaccionesConMeta.length; i++) {
      if (refaccionesConMeta[i].origSub > maxSub) {
        maxSub = refaccionesConMeta[i].origSub;
        maxIdx = i;
      }
    }
    refaccionesConMeta[maxIdx].subtotalRedondeado += residuo;
  }

  const refaccionesProrrateadas: ItemProrrateado[] = refaccionesConMeta.map(
    ({ r, origSub, subtotalRedondeado }) => {
      const cant = r.cantidad || 1;
      const unitarioFinal = Number((subtotalRedondeado / cant).toFixed(2));
      return {
        id: r.id,
        tipo: r.tipo,
        nombre: r.nombre,
        cantidad: cant,
        precioUnitarioOriginal: r.precioUnitario,
        subtotalOriginal: origSub,
        precioUnitarioFinal: unitarioFinal,
        subtotalFinal: subtotalRedondeado,
        diferencial: subtotalRedondeado - origSub,
      };
    }
  );

  // Mantener el orden original de los ítems
  const mapaResultados = new Map<string, ItemProrrateado>();
  [...serviciosProrrateados, ...refaccionesProrrateadas].forEach((item) => {
    mapaResultados.set(item.id, item);
  });

  const itemsProrrateados = items.map((item) => mapaResultados.get(item.id)!);

  return {
    granTotalEfectivo,
    granTotalTarjeta,
    diferencialTotal,
    tieneRefacciones: true,
    totalServicios,
    totalRefaccionesOriginal,
    totalRefaccionesFinal: totalRefaccionesTarget,
    itemsProrrateados,
  };
}
