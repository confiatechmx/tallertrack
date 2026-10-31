/**
 * Fast-path quotation and size helpers for Cova Tires Just-in-Time (JIT) quoting.
 */

export const TOP_TIRE_BRANDS = [
  "Michelin",
  "Bridgestone",
  "Continental",
  "Goodyear",
  "Pirelli",
  "Hankook",
  "Tornel",
  "Firestone",
  "Yokohama",
  "Kumho",
  "Nexen",
  "Goodride",
  "Linglong",
  "BFGoodrich",
  "Toyo",
  "Cooper",
  "Falken",
  "General",
  "Dunlop",
  "Maxxis",
  "Royal Black",
  "Haida",
  "Waterfall",
  "Westlake",
];

export const PROVEEDORES_LLANTAS = [
  "Mayoreo de Llantas MTY",
  "Distribuidora Gonzalitos",
  "Radial Llantas",
  "TireDirect México",
  "Interpuerto Llantas",
  "Distribuidor Local Express",
];

export const POPULAR_RIMS = [14, 15, 16, 17, 18, 19, 20];

export const POPULAR_TIRE_SIZES = [
  "175/70R14",
  "185/65R15",
  "185/60R15",
  "195/65R15",
  "205/55R16",
  "205/60R16",
  "215/55R17",
  "225/65R17",
  "265/70R17",
  "235/60R18",
  "245/70R16",
  "275/55R20",
];

/**
 * Parses freeform user or WhatsApp text into tire specs (width, aspect ratio, rim, brand).
 */
export const parseMedidaExpress = (input: string) => {
  const cleaned = input.trim().replace(/\s+/g, "");
  let detectedBrand: string | null = null;

  for (const b of TOP_TIRE_BRANDS) {
    if (new RegExp(`\\b${b}\\b`, "i").test(input)) {
      detectedBrand = b;
      break;
    }
  }

  // 1. Millimetric measures (e.g. 205/55R16, 225-65-17)
  const match = cleaned.match(/(\d{3})[\/\-]??(\d{2})[rR\/\-]??(\d{2})/i);
  if (match) {
    const a = parseInt(match[1]);
    const p = parseInt(match[2]);
    const r = parseInt(match[3]);
    if (a >= 135 && a <= 335 && p >= 25 && p <= 85 && r >= 12 && r <= 24) {
      return { ancho: a, perfil: p, rin: r, marca: detectedBrand };
    }
  }

  // 2. Flotation measures (e.g. 33x12.50R15, 35x12.50R17)
  const matchFlot = cleaned.match(/(\d{2})x(\d{2}(?:\.\d{1,2})?)[rR](\d{2})/i);
  if (matchFlot) {
    const diam = parseInt(matchFlot[1]);
    const anchoFlot = Math.round(parseFloat(matchFlot[2]));
    const r = parseInt(matchFlot[3]);
    return { ancho: diam, perfil: anchoFlot, rin: r, marca: detectedBrand };
  }

  return null;
};

/**
 * Infers OEM tire size based on vehicle make and model popular in Mexico.
 */
export const inferOemTireSize = (marca?: string, modelo?: string): string | null => {
  if (!marca && !modelo) return null;
  const mod = `${marca || ""} ${modelo || ""}`.toLowerCase().trim();

  // Pickups & SUVs grandes
  if (
    mod.includes("lobo") ||
    mod.includes("cheyenne") ||
    mod.includes("silverado") ||
    mod.includes("f-150") ||
    mod.includes("f150") ||
    mod.includes("sierra") ||
    mod.includes("ram 1500") ||
    mod.includes("ram") ||
    mod.includes("tahoe") ||
    mod.includes("suburban") ||
    mod.includes("expedition")
  ) {
    return "275/55R20";
  }
  if (
    mod.includes("tacoma") ||
    mod.includes("4runner") ||
    mod.includes("colorado") ||
    mod.includes("canyon") ||
    mod.includes("wrangler") ||
    mod.includes("rubicon")
  ) {
    return "265/70R17";
  }
  if (
    mod.includes("hilux") ||
    mod.includes("frontier") ||
    mod.includes("np300") ||
    mod.includes("ranger") ||
    mod.includes("l200") ||
    mod.includes("d-max")
  ) {
    return "245/70R16";
  }
  // Crossovers / SUVs medianas
  if (
    mod.includes("rav4") ||
    mod.includes("cr-v") ||
    mod.includes("crv") ||
    mod.includes("x-trail") ||
    mod.includes("xtrail") ||
    mod.includes("sportage") ||
    mod.includes("tucson") ||
    mod.includes("cx-5") ||
    mod.includes("cx5") ||
    mod.includes("forester") ||
    mod.includes("equinox") ||
    mod.includes("escape")
  ) {
    return "225/65R17";
  }
  if (
    mod.includes("grand cherokee") ||
    mod.includes("explorer") ||
    mod.includes("edge") ||
    mod.includes("traverse") ||
    mod.includes("highlander") ||
    mod.includes("sorento") ||
    mod.includes("santa fe") ||
    mod.includes("pathfinder")
  ) {
    return "235/60R18";
  }
  if (
    mod.includes("kicks") ||
    mod.includes("creta") ||
    mod.includes("tracker") ||
    mod.includes("duster") ||
    mod.includes("hr-v") ||
    mod.includes("hrv") ||
    mod.includes("seltos") ||
    mod.includes("soul") ||
    mod.includes("taos")
  ) {
    return "215/55R17";
  }
  // Sedanes compactos
  if (
    mod.includes("sentra") ||
    mod.includes("jetta") ||
    mod.includes("golf") ||
    mod.includes("civic") ||
    mod.includes("corolla") ||
    mod.includes("mazda 3") ||
    mod.includes("mazda3") ||
    mod.includes("forte") ||
    mod.includes("elantra") ||
    mod.includes("cruze") ||
    mod.includes("focus") ||
    mod.includes("leon")
  ) {
    return "205/55R16";
  }
  // Subcompactos B
  if (
    mod.includes("versa") ||
    mod.includes("tiida") ||
    mod.includes("march") ||
    mod.includes("note")
  ) {
    return "185/65R15";
  }
  if (
    mod.includes("vento") ||
    mod.includes("polo") ||
    mod.includes("rio") ||
    mod.includes("gol") ||
    mod.includes("ibiza") ||
    mod.includes("yaris") ||
    mod.includes("fit") ||
    mod.includes("sonic") ||
    mod.includes("accent")
  ) {
    return "185/60R15";
  }
  // Económicos A
  if (
    mod.includes("aveo") ||
    mod.includes("beat") ||
    mod.includes("spark") ||
    mod.includes("chevy") ||
    mod.includes("matiz") ||
    mod.includes("i10") ||
    mod.includes("grand i10") ||
    mod.includes("kwid")
  ) {
    return "175/70R14";
  }
  // Vans comerciales
  if (
    mod.includes("urvan") ||
    mod.includes("hiace") ||
    mod.includes("transporter") ||
    mod.includes("transit")
  ) {
    return "195/80R15";
  }

  return null;
};
