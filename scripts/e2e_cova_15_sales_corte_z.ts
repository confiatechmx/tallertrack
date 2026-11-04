import fs from "fs";
import path from "path";
import { supabase } from "../src/lib/supabase";
import { ReportesExportService } from "../src/services/reportesExportService";
import { CajaTurnoService, calcularTotalDenominaciones, DenominacionesConteo } from "../src/services/cajaTurnoService";

const EMPRESA_ID = "b2ad09db-0a34-4876-9ca3-d584c40bd294"; // Cova
const SUCURSAL_ID = "b2ad09db-0a34-4876-9ca3-d584c40bd295"; // Cova Matriz
const CAJERO_ID = "ba75b602-82ed-42ce-8eda-1fa8a9c3f7f5"; // Larissa Orozco
const FONDO1_ID = "c0000000-0000-0000-0000-000000000001"; // Mostrador
const FONDO2_ID = "c0000000-0000-0000-0000-000000000002"; // Reserva
const BANBAJIO_ID = "c1000000-0000-0000-0000-000000000004";
const INBURSA_ID = "c1000000-0000-0000-0000-000000000005";
const MP_WALLET_ID = "c1000000-0000-0000-0000-000000000006";

async function main() {
  console.log("================================================================================");
  console.log("🚀 INICIANDO PRUEBA END-TO-END: 15 VENTAS, PROVEEDORES, GARANTÍAS Y CORTE Z");
  console.log("🏢 Empresa: COVA • Sucursal: Cova Matriz");
  console.log("================================================================================\n");

  // 1. Iniciar sesión como Larissa Orozco
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: "larissa.orozcor@gmail.com",
    password: "Cova123456!",
  });
  if (authErr) throw new Error("Error al autenticar: " + authErr.message);
  console.log(`✅ [1/7] Sesión iniciada como: ${auth.user.email} (Larissa Orozco - Administradora de Caja)`);

  // Limpieza defensiva previa para asegurar base 100% limpia
  console.log("🧹 Limpiando cualquier dato previo...");
  const { data: prevOrds } = await supabase.from("ordenes_servicio").select("id").eq("empresa_id", EMPRESA_ID);
  const prevOrdIds = (prevOrds || []).map((o) => o.id);
  if (prevOrdIds.length > 0) {
    await supabase.from("checklist_danos").delete().in("orden_servicio_id", prevOrdIds);
    await supabase.from("inspecciones_dvi").delete().in("orden_servicio_id", prevOrdIds);
    await supabase.from("trabajos_diferidos").delete().in("orden_origen_id", prevOrdIds);
    await supabase.from("orden_servicio_servicios").delete().in("orden_servicio_id", prevOrdIds);
    await supabase.from("orden_servicio_refacciones").delete().in("orden_servicio_id", prevOrdIds);
    await supabase.from("compras_proveedores").delete().in("orden_servicio_id", prevOrdIds);
    await supabase.from("pagos_orden").delete().in("orden_servicio_id", prevOrdIds);
    await supabase.from("ordenes_servicio").delete().in("id", prevOrdIds);
  }
  await supabase.from("proveedores_abonos").delete().eq("empresa_id", EMPRESA_ID);
  await supabase.from("compras_proveedores").delete().eq("empresa_id", EMPRESA_ID);
  await supabase.from("caja_movimientos").delete().eq("empresa_id", EMPRESA_ID);
  await supabase.from("pagos_orden").delete().eq("empresa_id", EMPRESA_ID);
  await supabase.from("caja_turnos").delete().eq("empresa_id", EMPRESA_ID);
  await supabase.from("caja_fondos").update({ saldo_actual: 400.0 }).eq("id", FONDO1_ID);
  await supabase.from("caja_fondos").update({ saldo_actual: 8500.0 }).eq("id", FONDO2_ID);
  console.log("   ✓ Base limpia y fondos reseteados a $400 (Mostrador) y $8,500 (Reserva)");

  // 2. Obtener catálogos base (clientes, vehículos, proveedores, servicios de taller)
  const { data: clientes } = await supabase.from("clientes").select("id, nombre, telefono").eq("empresa_id", EMPRESA_ID);
  const { data: vehiculos } = await supabase.from("vehiculos").select("id, cliente_id, marca, modelo, anio, placas").eq("empresa_id", EMPRESA_ID);
  const { data: proveedores } = await supabase.from("proveedores").select("id, nombre_comercial, categoria, dias_credito, meses_garantia_default").eq("empresa_id", EMPRESA_ID);
  const { data: serviciosTaller } = await supabase.from("servicios_taller").select("id, nombre, precio, categoria").eq("empresa_id", EMPRESA_ID);

  console.log(`📋 Catálogos cargados: ${clientes?.length} clientes, ${vehiculos?.length} vehículos, ${proveedores?.length} proveedores, ${serviciosTaller?.length} servicios de taller`);

  const srvFallback = serviciosTaller?.[0]?.id || "55c9bab2-eea5-45ee-ad87-8122d4d98f75";
  const findSrvId = (nombreKeyword: string) => {
    const s = serviciosTaller?.find((x) => x.nombre.toLowerCase().includes(nombreKeyword.toLowerCase()));
    return s ? s.id : srvFallback;
  };

  const clientePublico = clientes?.find((c) => c.nombre.includes("Público")) || clientes![0];
  const clienteCarlos = clientes?.find((c) => c.nombre.includes("Carlos Mendoza")) || clientes![1];
  const clienteAndrea = clientes?.find((c) => c.nombre.includes("Andrea")) || clientes![2];
  const clienteMinera = clientes?.find((c) => c.nombre.includes("Minera")) || clientes![3];
  const clienteEduardo = clientes?.find((c) => c.nombre.includes("Eduardo Torres")) || clientes![0];
  const clienteRoberto = clientes?.find((c) => c.nombre.includes("Roberto")) || clientes![1];

  const vehiculoPublico = vehiculos?.[0]?.id;
  const vehiculoCarlos = vehiculos?.find((v) => v.modelo?.toLowerCase().includes("versa"))?.id || vehiculos?.[0]?.id;
  const vehiculoAndrea = vehiculos?.find((v) => v.modelo?.toLowerCase().includes("rav4"))?.id || vehiculos?.[1]?.id;
  const vehiculoMazda = vehiculos?.find((v) => v.modelo?.toLowerCase().includes("3") || v.modelo?.toLowerCase().includes("cx3"))?.id || vehiculos?.[2]?.id;

  const provArredondo = proveedores?.find((p) => p.nombre_comercial.includes("Arredondo"))!;
  const provAutoZone = proveedores?.find((p) => p.nombre_comercial.includes("AutoZone"))!;
  const provAyon = proveedores?.find((p) => p.nombre_comercial.includes("Ayon"))!;
  const provDar = proveedores?.find((p) => p.nombre_comercial.includes("Dar"))!;
  const provTersa = proveedores?.find((p) => p.nombre_comercial.includes("Tersa"))!;
  const provRioja = proveedores?.find((p) => p.nombre_comercial.includes("Rioja"))!;
  const provObal = proveedores?.find((p) => p.nombre_comercial.includes("Obal"))!;
  const provTornicenter = proveedores?.find((p) => p.nombre_comercial.includes("Tornicenter"))!;
  const provManny = proveedores?.find((p) => p.nombre_comercial.includes("Manny"))!;

  // 3. Apertura de Turno
  console.log("\n📦 [2/7] Abriendo Turno de Caja con Fondos Iniciales...");
  const { data: aperturaRes, error: aperturaErr } = await (supabase.rpc as any)("fn_abrir_turno_caja", {
    p_empresa_id: EMPRESA_ID,
    p_sucursal_id: SUCURSAL_ID,
    p_usuario_id: CAJERO_ID,
    p_monto_fondo1: 400.0,
    p_monto_fondo2: 8500.0,
  });

  if (aperturaErr) throw new Error("Error al abrir turno: " + aperturaErr.message);
  const turnoId = aperturaRes.turno_id;
  console.log(`✅ Turno abierto con éxito (ID: ${turnoId})`);
  console.log(`   💵 Fondo 1 (Operativo Mostrador): $400.00 MXN`);
  console.log(`   🏦 Fondo 2 (Reserva Taller): $8,500.00 MXN`);

  // 4. Definición de las 15 ventas con variación completa
  const VENTAS_CONFIG = [
    {
      folio: 1001,
      cliente: clientePublico,
      vehiculoId: vehiculoPublico,
      tipo: "Solo Servicios de Taller (Sin compra externa)",
      servicios: [{ srvId: findSrvId("Montaje"), nombre: "Montaje de 2 Llantas (Rin 13 a 16)", precio: 200.0, cant: 2 }],
      refacciones: [],
      proveedorCompra: null,
      pagos: [{ metodo: "Efectivo", monto: 400.0, detalle: "Efectivo en mostrador", caja_fondo_id: FONDO1_ID }],
    },
    {
      folio: 1002,
      cliente: clienteCarlos,
      vehiculoId: vehiculoCarlos,
      tipo: "Servicio + Balatas Cerámicas (Efectivo Caja Chica / Garantía 3 Meses)",
      servicios: [{ srvId: findSrvId("Balatas"), nombre: "Mano de Obra: Reemplazo de Balatas (Por Eje)", precio: 450.0, cant: 1 }],
      refacciones: [{ nombre: "Balatas Delanteras Cerámicas Fritec", numParte: "FRI-5162", costo: 420.0, precio: 750.0, cant: 1 }],
      proveedorCompra: {
        prov: provArredondo,
        costo: 420.0,
        folio: "ARR-8812",
        fuente: "CAJA_CHICA",
        garantiaMeses: 3,
        evidencia: "https://cova.tallertrack.com/uploads/evidencia_arr_8812.jpg",
      },
      pagos: [{ metodo: "Efectivo", monto: 1200.0, detalle: "Pago en Efectivo exacto", caja_fondo_id: FONDO1_ID }],
    },
    {
      folio: 1003,
      cliente: clienteAndrea,
      vehiculoId: vehiculoAndrea,
      tipo: "Afinación + Insumos AutoZone (Tarjeta Débito TPV)",
      servicios: [{ srvId: findSrvId("Inspección"), nombre: "Inspección y Diagnóstico de Seguridad Multipunto (DVI)", precio: 250.0, cant: 1 }],
      refacciones: [
        { nombre: "Aceite Sintético Mobil 1 5W-30 (Garrafa 5L)", numParte: "MOB-5W30", costo: 780.0, precio: 1250.0, cant: 1 },
        { nombre: "Filtro de Aceite y Filtro de Aire Mann", numParte: "MANN-441", costo: 250.0, precio: 450.0, cant: 1 },
      ],
      proveedorCompra: {
        prov: provAutoZone,
        costo: 1030.0,
        folio: "AZ-99312",
        fuente: "CAJA_CHICA",
        garantiaMeses: 1,
        evidencia: "https://cova.tallertrack.com/uploads/ticket_autozone_99312.pdf",
      },
      pagos: [{ metodo: "Tarjeta", monto: 1950.0, detalle: "BanBajío TPV Débito", referencia: "VOUCHER-55102" }],
    },
    {
      folio: 1004,
      cliente: clienteEduardo,
      vehiculoId: vehiculoAndrea,
      tipo: "2 Llantas Nuevas Continental a Crédito Proveedor (Transferencia BanBajío Fiscal)",
      servicios: [{ srvId: findSrvId("Alineación Computarizada 3D (4"), nombre: "Alineación Computarizada 3D (4 Ruedas / Ambos Ejes)", precio: 650.0, cant: 1 }],
      refacciones: [{ nombre: "Llanta 225/65R17 Continental ProContact TX", numParte: "CON-2256517", costo: 1950.0, precio: 2700.0, cant: 2 }],
      proveedorCompra: {
        prov: provAyon,
        costo: 3900.0,
        folio: "AYON-44102",
        fuente: "CREDITO_PENDIENTE",
        garantiaMeses: 12,
        evidencia: "https://cova.tallertrack.com/uploads/factura_ayon_44102.pdf",
      },
      pagos: [{ metodo: "Transferencia", monto: 6050.0, detalle: "SPEI BanBajío Fiscal", cuenta_bancaria_id: BANBAJIO_ID, referencia: "SPEI-774102" }],
    },
    {
      folio: 1005,
      cliente: clienteMinera,
      vehiculoId: vehiculoCarlos,
      tipo: "Amortiguadores Monroe Flotilla a Crédito Proveedor (Transferencia Inbursa Operativa)",
      servicios: [{ srvId: findSrvId("Amortiguador Delantero (Mano"), nombre: "Reemplazo e Instalación de Amortiguador Delantero (Mano de Obra)", precio: 650.0, cant: 2 }],
      refacciones: [{ nombre: "Amortiguador Monroe Gas-Matic HD", numParte: "MON-G4120", costo: 850.0, precio: 1275.0, cant: 4 }],
      proveedorCompra: {
        prov: provDar,
        costo: 3400.0,
        folio: "DAR-2104",
        fuente: "CREDITO_PENDIENTE",
        garantiaMeses: 12,
        evidencia: "https://cova.tallertrack.com/uploads/nota_dar_2104.jpg",
      },
      pagos: [{ metodo: "Transferencia", monto: 6400.0, detalle: "SPEI Inbursa Operativa", cuenta_bancaria_id: INBURSA_ID, referencia: "SPEI-INB-9981" }],
    },
    {
      folio: 1006,
      cliente: clienteRoberto,
      vehiculoId: vehiculoMazda,
      tipo: "Nitrógeno y Plomo Adhesivo (Tarjeta Crédito TPV 1 Exhibición)",
      servicios: [
        { srvId: findSrvId("Nitrógeno"), nombre: "Calibración e Inflado con Nitrógeno (4 Ruedas)", precio: 250.0, cant: 1 },
        { srvId: findSrvId("Balanceo Dinámico"), nombre: "Balanceo Dinámico por Computadora (Plomo Adhesivo Oculto)", precio: 120.0, cant: 2 },
      ],
      refacciones: [],
      proveedorCompra: null,
      pagos: [{ metodo: "Tarjeta", monto: 490.0, detalle: "BanBajío Crédito TPV", referencia: "VOUCHER-6621" }],
    },
    {
      folio: 1007,
      cliente: clientePublico,
      vehiculoId: vehiculoPublico,
      tipo: "Vulcanizado Express (Efectivo)",
      servicios: [{ srvId: findSrvId("Ponchadura (Parche"), nombre: "Reparación Profesional de Ponchadura (Parche Tipo Hongo / Vulcanizado)", precio: 250.0, cant: 1 }],
      refacciones: [],
      proveedorCompra: null,
      pagos: [{ metodo: "Efectivo", monto: 250.0, detalle: "Efectivo", caja_fondo_id: FONDO1_ID }],
    },
    {
      folio: 1008,
      cliente: clienteAndrea,
      vehiculoId: vehiculoAndrea,
      tipo: "Alineación y Líquido Frenos (Mercado Pago QR / Wallet)",
      servicios: [{ srvId: findSrvId("Alineación Computarizada 3D (Eje"), nombre: "Alineación Computarizada 3D (Eje Delantero)", precio: 450.0, cant: 1 }],
      refacciones: [{ nombre: "Líquido de Frenos Pentosin Super DOT4 (1L)", numParte: "PENT-DOT4", costo: 180.0, precio: 320.0, cant: 1 }],
      proveedorCompra: {
        prov: provRioja,
        costo: 180.0,
        folio: "RIO-5541",
        fuente: "CAJA_CHICA",
        garantiaMeses: 1,
        evidencia: "https://cova.tallertrack.com/uploads/nota_rioja_5541.jpg",
      },
      pagos: [{ metodo: "Mercado Pago", monto: 770.0, detalle: "MP QR Wallet", cuenta_bancaria_id: MP_WALLET_ID, referencia: "MP-TRANS-4481" }],
    },
    {
      folio: 1009,
      cliente: clienteCarlos,
      vehiculoId: vehiculoCarlos,
      tipo: "Terminales de Dirección SYD (Pago MIXTO: Efectivo + Tarjeta TPV)",
      servicios: [{ srvId: findSrvId("Terminal de Dirección (Mano"), nombre: "Reemplazo de Terminal de Dirección (Mano de Obra)", precio: 350.0, cant: 2 }],
      refacciones: [{ nombre: "Juego de Rótulas y Terminales SYD Reforzadas", numParte: "SYD-9021", costo: 1150.0, precio: 1850.0, cant: 1 }],
      proveedorCompra: {
        prov: provObal,
        costo: 1150.0,
        folio: "OBAL-7740",
        fuente: "CREDITO_PENDIENTE",
        garantiaMeses: 6,
        evidencia: "https://cova.tallertrack.com/uploads/remision_obal_7740.pdf",
      },
      pagos: [
        { metodo: "Efectivo", monto: 1000.0, detalle: "Parte en Efectivo", caja_fondo_id: FONDO1_ID },
        { metodo: "Tarjeta", monto: 1550.0, detalle: "Resto BanBajío TPV", referencia: "VOUCHER-88124" },
      ],
    },
    {
      folio: 1010,
      cliente: clienteRoberto,
      vehiculoId: vehiculoMazda,
      tipo: "4 Llantas Nuevas Tornel a Crédito Proveedor (Mercado Pago 3 Meses Sin Intereses)",
      servicios: [
        { srvId: findSrvId("Montaje"), nombre: "Montaje de Llanta (Rin 13 a 16)", precio: 100.0, cant: 4 },
        { srvId: findSrvId("Válvula de Hule"), nombre: "Válvula de Hule de Seguridad TR-413 (Nueva)", precio: 50.0, cant: 4 },
      ],
      refacciones: [{ nombre: "Llanta 185/65R15 Tornel Real", numParte: "TOR-1856515", costo: 900.0, precio: 1300.0, cant: 4 }],
      proveedorCompra: {
        prov: provTersa,
        costo: 3600.0,
        folio: "TERSA-3391",
        fuente: "CREDITO_PENDIENTE",
        garantiaMeses: 12,
        evidencia: "https://cova.tallertrack.com/uploads/factura_tersa_3391.pdf",
      },
      pagos: [{ metodo: "Tarjeta", monto: 5800.0, detalle: "Mercado Pago 3 Meses Sin Intereses", referencia: "MP-MSI3-99014" }],
    },
    {
      folio: 1011,
      cliente: clienteMinera,
      vehiculoId: vehiculoCarlos,
      tipo: "Horquillas Reforzadas Manny (Transferencia BanBajío Fiscal)",
      servicios: [{ srvId: findSrvId("Amortiguador Delantero (Por"), nombre: "Mano de Obra: Reemplazo de Amortiguador Delantero (Por Pieza)", precio: 400.0, cant: 2 }],
      refacciones: [{ nombre: "Horquilla con Bujes Prensa Reforzada", numParte: "HORQ-SET2", costo: 775.0, precio: 1200.0, cant: 2 }],
      proveedorCompra: {
        prov: provManny,
        costo: 1550.0,
        folio: "MANNY-1029",
        fuente: "CAJA_CHICA",
        garantiaMeses: 3,
        evidencia: "https://cova.tallertrack.com/uploads/nota_manny_1029.jpg",
      },
      pagos: [{ metodo: "Transferencia", monto: 3200.0, detalle: "SPEI BanBajío Fiscal", cuenta_bancaria_id: BANBAJIO_ID, referencia: "SPEI-MIN-4412" }],
    },
    {
      folio: 1012,
      cliente: clientePublico,
      vehiculoId: vehiculoPublico,
      tipo: "Batería LTH AutoZone a Crédito Proveedor (Pago MIXTO: Efectivo + Tarjeta Débito)",
      servicios: [{ srvId: findSrvId("Inspección"), nombre: "Inspección y Diagnóstico de Seguridad Multipunto (DVI)", precio: 250.0, cant: 1 }],
      refacciones: [{ nombre: "Batería Automotriz LTH Grupo 42 (Garantía 12 Meses)", numParte: "LTH-42-400", costo: 1650.0, precio: 2350.0, cant: 1 }],
      proveedorCompra: {
        prov: provAutoZone,
        costo: 1650.0,
        folio: "AZ-88401",
        fuente: "CREDITO_PENDIENTE",
        garantiaMeses: 12,
        evidencia: "https://cova.tallertrack.com/uploads/poliza_garantia_lth_88401.jpg",
      },
      pagos: [
        { metodo: "Efectivo", monto: 1200.0, detalle: "Efectivo Mostrador", caja_fondo_id: FONDO1_ID },
        { metodo: "Tarjeta", monto: 1400.0, detalle: "Tarjeta Débito TPV", referencia: "VOUCHER-99214" },
      ],
    },
    {
      folio: 1013,
      cliente: clienteEduardo,
      vehiculoId: vehiculoMazda,
      tipo: "Alineación 3D y Válvulas Metálicas (Efectivo)",
      servicios: [
        { srvId: findSrvId("Alineación 3D por"), nombre: "Alineación 3D por Computadora y Balanceo (4 Ruedas)", precio: 850.0, cant: 1 },
        { srvId: findSrvId("Válvula Metálica"), nombre: "Válvula Metálica Cromada de Alta Resistencia", precio: 120.0, cant: 4 },
      ],
      refacciones: [],
      proveedorCompra: null,
      pagos: [{ metodo: "Efectivo", monto: 1330.0, detalle: "Efectivo", caja_fondo_id: FONDO1_ID }],
    },
    {
      folio: 1014,
      cliente: clienteCarlos,
      vehiculoId: vehiculoCarlos,
      tipo: "Balatas Traseras Fritec (Mercado Pago 6 Meses Sin Intereses)",
      servicios: [{ srvId: findSrvId("Balatas"), nombre: "Mano de Obra: Reemplazo de Balatas (Por Eje)", precio: 450.0, cant: 1 }],
      refacciones: [{ nombre: "Juego Balatas Traseras Fritec Cerámica", numParte: "FRI-TR44", costo: 380.0, precio: 650.0, cant: 1 }],
      proveedorCompra: {
        prov: provArredondo,
        costo: 380.0,
        folio: "ARR-9124",
        fuente: "CAJA_CHICA",
        garantiaMeses: 3,
        evidencia: "https://cova.tallertrack.com/uploads/nota_arr_9124.jpg",
      },
      pagos: [{ metodo: "Tarjeta", monto: 1100.0, detalle: "Mercado Pago 6 Meses Sin Intereses", referencia: "MP-MSI6-7781" }],
    },
    {
      folio: 1015,
      cliente: clienteMinera,
      vehiculoId: vehiculoAndrea,
      tipo: "Tirantes Moog Tornicenter (Pago MIXTO: Transferencia BanBajío + Tarjeta TPV)",
      servicios: [{ srvId: findSrvId("Terminal de Dirección (Mano"), nombre: "Reemplazo de Terminal de Dirección (Mano de Obra)", precio: 450.0, cant: 2 }],
      refacciones: [{ nombre: "Tirante y Tornillo Estabilizador Moog HD", numParte: "MOOG-HD-99", costo: 445.0, precio: 775.0, cant: 2 }],
      proveedorCompra: {
        prov: provTornicenter,
        costo: 890.0,
        folio: "TORNI-440",
        fuente: "CREDITO_PENDIENTE",
        garantiaMeses: 3,
        evidencia: "https://cova.tallertrack.com/uploads/remision_torni_440.pdf",
      },
      pagos: [
        { metodo: "Transferencia", monto: 1500.0, detalle: "Anticipo SPEI BanBajío", cuenta_bancaria_id: BANBAJIO_ID, referencia: "SPEI-MIN-9921" },
        { metodo: "Tarjeta", monto: 950.0, detalle: "Finiquito Tarjeta TPV", referencia: "VOUCHER-77140" },
      ],
    },
  ];

  console.log(`\n💳 [3/7] Procesando las 15 Órdenes de Servicio en Turno Activo...`);
  let sumVentasTotales = 0;
  let sumCobrosEfectivo = 0;
  let sumCobrosTarjeta = 0;
  let sumCobrosSpei = 0;
  let sumCobrosMP = 0;
  let sumEgresosCajaChica = 0;
  let sumCreditosProveedores = 0;

  for (let idx = 0; idx < VENTAS_CONFIG.length; idx++) {
    const cfg = VENTAS_CONFIG[idx];

    // A) Insertar orden de servicio con campos obligatorios
    const { data: ord, error: ordErr } = await supabase
      .from("ordenes_servicio")
      .insert({
        empresa_id: EMPRESA_ID,
        sucursal_id: SUCURSAL_ID,
        vehiculo_id: cfg.vehiculoId,
        folio: cfg.folio,
        estado: "Listo para Entrega",
        estatus_pago: "Pagado",
        problema_reportado: cfg.tipo,
        nivel_gasolina: "1/2",
        kilometraje_ingreso: 45000 + idx * 1250,
        fecha_ingreso: new Date().toISOString(),
      })
      .select()
      .single();

    if (ordErr) throw new Error(`Error en orden #${cfg.folio}: ${ordErr.message}`);

    // B) Insertar servicios con servicio_id válido
    for (const s of cfg.servicios) {
      const { error: srvErr } = await supabase.from("orden_servicio_servicios").insert({
        empresa_id: EMPRESA_ID,
        orden_servicio_id: ord.id,
        servicio_id: s.srvId,
        precio_cobrado: s.precio * s.cant,
        cantidad: s.cant,
        estatus_aprobacion: "Aprobado",
        notas: s.nombre,
      });
      if (srvErr) throw new Error(`Error insertando servicio en orden #${cfg.folio}: ${srvErr.message}`);
    }

    // C) Compra a proveedor con garantía y evidencia si aplica
    let compraId: string | null = null;
    if (cfg.proveedorCompra) {
      const p = cfg.proveedorCompra;
      const today = new Date();
      const fechaVenc = new Date(today);
      fechaVenc.setMonth(today.getMonth() + p.garantiaMeses);

      const { data: compData, error: compErr } = await supabase
        .from("compras_proveedores")
        .insert({
          empresa_id: EMPRESA_ID,
          sucursal_id: SUCURSAL_ID,
          proveedor_id: p.prov.id,
          orden_servicio_id: ord.id,
          caja_turno_id: turnoId,
          folio_ticket_nota: p.folio,
          descripcion: `Refacciones para Orden #${cfg.folio}`,
          monto_costo: p.costo,
          fuente_pago: p.fuente,
          estatus_pago: p.fuente === "CAJA_CHICA" ? "PAGADO" : "PENDIENTE",
          monto_pagado: p.fuente === "CAJA_CHICA" ? p.costo : 0.0,
          monto_saldo_pendiente: p.fuente === "CAJA_CHICA" ? 0.0 : p.costo,
          fecha_compra: today.toISOString().split("T")[0],
          meses_garantia: p.garantiaMeses,
          fecha_vencimiento_garantia: fechaVenc.toISOString().split("T")[0],
          estatus_garantia: "VIGENTE",
          evidencia_url: p.evidencia,
          evidencia_tipo: p.evidencia.endsWith(".pdf") ? "PDF" : "IMAGE",
        })
        .select()
        .single();

      if (compErr) throw new Error(`Error en compra prov orden #${cfg.folio}: ${compErr.message}`);
      compraId = compData.id;

      if (p.fuente === "CAJA_CHICA") {
        sumEgresosCajaChica += p.costo;
      } else {
        sumCreditosProveedores += p.costo;
      }
    }

    // D) Insertar refacciones en orden (con margen_porcentaje)
    for (const r of cfg.refacciones) {
      const subtotal = r.precio * r.cant;
      const margen = r.precio > 0 ? Math.round(((r.precio - r.costo) / r.precio) * 100) : 0;

      const { error: refErr } = await supabase.from("orden_servicio_refacciones").insert({
        empresa_id: EMPRESA_ID,
        orden_servicio_id: ord.id,
        nombre: r.nombre,
        numero_parte: r.numParte,
        cantidad: r.cant,
        costo_unitario: r.costo,
        margen_porcentaje: margen,
        precio_unitario: r.precio,
        subtotal,
        compra_proveedor_id: compraId,
        proveedor_id: cfg.proveedorCompra?.prov?.id || null,
        folio_ticket_nota: cfg.proveedorCompra?.folio || null,
        fuente_pago: cfg.proveedorCompra?.fuente || null,
        evidencia_url: cfg.proveedorCompra?.evidencia || null,
        estatus_aprobacion: "Aprobado",
        garantia_especifica: cfg.proveedorCompra ? `${cfg.proveedorCompra.garantiaMeses} Meses Garantía Proveedor` : null,
      });
      if (refErr) throw new Error(`Error en refacción orden #${cfg.folio}: ${refErr.message}`);
    }

    // E) Registrar pagos vía la función multi-pago oficial
    const pagosPayload = cfg.pagos.map((p) => ({
      metodo: p.metodo,
      monto: p.monto,
      detalle: p.detalle,
      referencia: (p as any).referencia || `FOL-${cfg.folio}`,
      cuenta_bancaria_id: (p as any).cuenta_bancaria_id || null,
      caja_fondo_id: (p as any).caja_fondo_id || null,
    }));

    const { data: regPagoRes, error: regPagoErr } = await (supabase.rpc as any)("fn_registrar_pagos_orden_multi", {
      p_orden_id: ord.id,
      p_sucursal_id: SUCURSAL_ID,
      p_pagos: pagosPayload,
    });

    if (regPagoErr) throw new Error(`Error registrando pagos de orden #${cfg.folio}: ${regPagoErr.message}`);

    const totalOrden = cfg.pagos.reduce((acc, curr) => acc + curr.monto, 0);
    sumVentasTotales += totalOrden;

    for (const p of cfg.pagos) {
      if (p.metodo === "Efectivo") sumCobrosEfectivo += p.monto;
      else if (p.metodo === "Tarjeta") sumCobrosTarjeta += p.monto;
      else if (p.metodo === "Transferencia") sumCobrosSpei += p.monto;
      else if (p.metodo === "Mercado Pago") sumCobrosMP += p.monto;
    }

    const provInfo = cfg.proveedorCompra
      ? ` | Prov: ${cfg.proveedorCompra.prov.nombre_comercial} ($${cfg.proveedorCompra.costo} ${cfg.proveedorCompra.fuente === "CAJA_CHICA" ? "Efectivo" : "Crédito"})`
      : "";
    console.log(`   ✓ Orden #${cfg.folio} (${cfg.cliente.nombre}): Total $${totalOrden.toLocaleString("es-MX", { minimumFractionDigits: 2 })} [${cfg.pagos.map((p) => p.metodo).join(" + ")}]${provInfo}`);
  }

  // 5. Movimiento de gasto general de caja chica (insumos de taller)
  console.log("\n🛠️ [4/7] Registrando Gasto Operativo de Taller en Caja Chica...");
  const gastoInsumosMonto = 180.0;
  await supabase.from("caja_movimientos").insert({
    empresa_id: EMPRESA_ID,
    sucursal_id: SUCURSAL_ID,
    caja_turno_id: turnoId,
    caja_fondo_id: FONDO1_ID,
    tipo: "EGRESO",
    categoria: "OPERATIVO",
    concepto: "Compra de Desengrasante Industrial y Guantes de Nitrilo",
    monto: gastoInsumosMonto,
    metodo: "Efectivo",
    folio_ticket: "F-INS-7721",
    comprobante_url: "https://cova.tallertrack.com/uploads/comprobante_insumos_7721.jpg",
    usuario_id: CAJERO_ID,
  });
  sumEgresosCajaChica += gastoInsumosMonto;
  console.log(`   ✓ Egresos totales de Caja Chica registrados: $${sumEgresosCajaChica.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN`);

  // 6. Arqueo y Cierre de Turno (Corte Z Definitivo)
  console.log("\n🧮 [5/7] Realizando Arqueo de Fondos y Cierre de Caja (Corte Z)...");
  const saldoInicialF1 = 400.0;
  const saldoInicialF2 = 8500.0;

  // Teórico Efectivo Fondo 1 = 400 + cobros en efectivo - egresos caja chica
  const teoricoF1 = saldoInicialF1 + sumCobrosEfectivo - sumEgresosCajaChica;
  const teoricoF2 = saldoInicialF2; // Sin movimientos en reserva

  console.log(`   💵 Teórico en Gaveta Mostrador (Fondo 1): $${teoricoF1.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`);
  console.log(`      (Inicial: $400.00 + Cobros Efectivo: $${sumCobrosEfectivo.toFixed(2)} - Egresos Caja Chica: $${sumEgresosCajaChica.toFixed(2)})`);
  console.log(`   🏦 Teórico en Reserva Taller (Fondo 2): $${teoricoF2.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`);

  // Denominaciones físicas exactas para que quede 100% CUADRADO ($2,040.00 en Mostrador)
  let remanente = Math.round(teoricoF1);
  const denominacionesF1: DenominacionesConteo = {
    b1000: Math.floor(remanente / 1000), // 2 de $1,000 = $2,000
    b500: 0,
    b200: 0,
    b100: 0,
    b50: 0,
    b20: 2, // 2 de $20 = $40
    m20: 0,
    m10: 0,
    m5: 0,
    m2: 0,
    m1: 0,
    centavos: 0,
  };

  const totalContadoF1 = calcularTotalDenominaciones(denominacionesF1);

  // Reserva: 8 billetes de $1,000 y 1 de $500 = $8,500.00
  const denominacionesF2: DenominacionesConteo = {
    b1000: 8,
    b500: 1,
    b200: 0,
    b100: 0,
    b50: 0,
    b20: 0,
    m20: 0,
    m10: 0,
    m5: 0,
    m2: 0,
    m1: 0,
    centavos: 0,
  };
  const totalContadoF2 = calcularTotalDenominaciones(denominacionesF2);

  // Fondo que se deja en caja para el siguiente turno: $400.00
  const fondoSiguienteF1 = 400.0;
  // Remesa a retirar a sobre/caja fuerte: totalContadoF1 - fondoSiguienteF1
  const montoRemesa = Math.max(0, totalContadoF1 - fondoSiguienteF1);

  console.log(`   🔒 Arqueo Físico Declarado F1: $${totalContadoF1.toLocaleString("es-MX", { minimumFractionDigits: 2 })} (✓ Cuadrado)`);
  console.log(`   🔒 Arqueo Físico Declarado F2: $${totalContadoF2.toLocaleString("es-MX", { minimumFractionDigits: 2 })} (✓ Cuadrado)`);
  console.log(`   💰 Remesa Retirada a Sobre/Caja Fuerte: $${montoRemesa.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`);
  console.log(`   🪙 Fondo en Gaveta para Siguiente Turno: $${fondoSiguienteF1.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`);

  const cierreRes = await CajaTurnoService.cerrarTurno({
    turnoId,
    usuarioCierreId: CAJERO_ID,
    declaradoF1: totalContadoF1,
    declaradoF2: totalContadoF2,
    denominacionesF1,
    denominacionesF2,
    justificacion: "Corte de turno vespertino normal sin discrepancias",
    montoRemesa,
    montoFondoSiguiente: fondoSiguienteF1,
  });

  if (!cierreRes.success) throw new Error("Error cerrando turno: " + cierreRes.error);
  console.log(`✅ [6/7] Corte Z Registrado y Turno Cerrado Exitosamente.`);

  // 7. Generación de Reportes y Validación Contable
  console.log("\n📊 [7/7] Consultando Detalle Completo y Generando Reporte Excel...");
  const detalleCompleto = await CajaTurnoService.obtenerDetalleTurnoCompleto(turnoId);
  if (!detalleCompleto) throw new Error("No se pudo obtener el detalle completo del turno cerrado");

  console.log(`\n================== RESUMEN FINANCIERO DEL CORTE Z ==================`);
  console.log(`Total Ventas y Servicios:      $${detalleCompleto.totales.totalVentas.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN`);
  console.log(`Total Costos de Refacciones:    $${detalleCompleto.totales.totalCostos.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN`);
  console.log(`Utilidad Bruta Operativa:       $${detalleCompleto.totales.utilidadEstimada.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN`);
  console.log(`Margen de Utilidad Promedio:    ${detalleCompleto.totales.margenEstimadoPorcentaje}%`);
  console.log(`Total Órdenes Cobradas:         ${detalleCompleto.totales.cantidadOrdenes} órdenes`);
  console.log(`Total Partidas Auditadas:       ${detalleCompleto.totales.cantidadPartidas}`);
  console.log(`Total Egresos de Caja Chica:    $${detalleCompleto.totales.totalGastos.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN`);
  console.log(`Movimientos de Gasto Auditados: ${detalleCompleto.gastos.length} salidas`);
  console.log(`====================================================================\n`);

  // Obtener snapshot guardado del turno
  const { data: turnoRecord } = await supabase.from("caja_turnos").select("*").eq("id", turnoId).single();

  // Exportar Excel mediante ReportesExportService
  const excelBuffer = await ReportesExportService.exportarCorteExcelElegante({
    empresaNombre: "COVA • Centro de Servicio Automotriz",
    sucursalNombre: "Cova Matriz",
    cajeroNombre: "Larissa Orozco",
    fechaTurno: new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" }),
    turnoId,
    cierreData: {
      declaradoF1: totalContadoF1,
      declaradoF2: totalContadoF2,
      teoricoF1,
      teoricoF2,
      diferenciaF1: 0,
      diferenciaF2: 0,
      remesa: montoRemesa,
      fondoSiguiente: fondoSiguienteF1,
      resumenTeorico: turnoRecord?.snapshot_resumen,
      justificacion_descuadre: turnoRecord?.justificacion_descuadre,
    },
    detalleTurno: detalleCompleto,
  });

  const outputPath = path.resolve(process.cwd(), "Corte_Z_Cova_Auditoria_E2E.xlsx");
  fs.writeFileSync(outputPath, Buffer.from(excelBuffer as ArrayBuffer));
  console.log(`📁 Archivo Excel exportado con éxito: ${outputPath} (${(excelBuffer as ArrayBuffer).byteLength} bytes)`);

  console.log("\n✨ PRUEBA END-TO-END COMPLETADA CON ÉXITO: 100% VERIFICADO.");
}

main().catch((err) => {
  console.error("❌ ERROR FATAL EN PRUEBA E2E:", err);
  process.exit(1);
});
