import { supabase } from "../src/lib/supabase";

const EMPRESA_ID = "b2ad09db-0a34-4876-9ca3-d584c40bd294"; // Cova
const FONDO1_ID = "c0000000-0000-0000-0000-000000000001"; // Mostrador
const FONDO2_ID = "c0000000-0000-0000-0000-000000000002"; // Reserva

async function limpiarHistorialCova() {
  console.log("================================================================");
  console.log("🧹 INICIANDO LIMPIEZA TOTAL DE HISTORIAL DE COVA (DESDE CERO)");
  console.log("================================================================\n");

  // 1. Iniciar sesión como SuperAdmin de Cova
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: "eduardo@cova.mx",
    password: "Cova2026!",
  });

  if (authErr) {
    throw new Error("Error autenticando: " + authErr.message);
  }
  console.log(`✅ Sesión autenticada como: ${auth.user?.email}\n`);

  // 2. Obtener IDs de órdenes de Cova
  const { data: ords, error: ordsErr } = await supabase
    .from("ordenes_servicio")
    .select("id, folio")
    .eq("empresa_id", EMPRESA_ID);

  if (ordsErr) console.warn("Aviso al obtener órdenes:", ordsErr.message);

  const ordIds = (ords || []).map((o) => o.id);
  console.log(`📋 Órdenes encontradas para Cova: ${ordIds.length}`);

  // 3. Eliminar registros hijos de las órdenes
  if (ordIds.length > 0) {
    console.log("🗑️  Eliminando dependencias de órdenes...");
    await supabase.from("checklist_danos").delete().in("orden_servicio_id", ordIds);
    await supabase.from("inspecciones_dvi").delete().in("orden_servicio_id", ordIds);
    await supabase.from("trabajos_diferidos").delete().in("orden_origen_id", ordIds);
    await supabase.from("orden_servicio_servicios").delete().in("orden_servicio_id", ordIds);
    await supabase.from("orden_servicio_refacciones").delete().in("orden_servicio_id", ordIds);
    await supabase.from("pagos_orden").delete().in("orden_servicio_id", ordIds);
    await supabase.from("compras_proveedores").delete().in("orden_servicio_id", ordIds);
    
    // Eliminar las órdenes
    const { error: delOrdErr } = await supabase.from("ordenes_servicio").delete().in("id", ordIds);
    if (delOrdErr) {
      console.error("Error al eliminar ordenes_servicio:", delOrdErr.message);
    } else {
      console.log(`   ✓ ${ordIds.length} órdenes de servicio eliminadas`);
    }
  }

  // 4. Limpiar compras de proveedores y abonos residuales
  console.log("🗑️  Limpiando compras de proveedores y abonos...");
  await supabase.from("proveedores_abonos").delete().eq("empresa_id", EMPRESA_ID);
  await supabase.from("compras_proveedores").delete().eq("empresa_id", EMPRESA_ID);
  await supabase.from("pagos_orden").delete().eq("empresa_id", EMPRESA_ID);

  // 5. Limpiar cotizaciones y ventas mostrador
  console.log("🗑️  Limpiando cotizaciones y ventas de mostrador...");
  await supabase.from("detalles_cotizacion").delete().eq("empresa_id", EMPRESA_ID);
  await supabase.from("cotizaciones").delete().eq("empresa_id", EMPRESA_ID);

  // 6. Limpiar turnos, movimientos, traspasos y arqueos de caja
  console.log("🗑️  Limpiando turnos de caja, movimientos, traspasos y arqueos...");
  await supabase.from("caja_traspasos_fondos").delete().eq("empresa_id", EMPRESA_ID);
  await supabase.from("caja_movimientos").delete().eq("empresa_id", EMPRESA_ID);

  const { data: turnos } = await supabase.from("caja_turnos").select("id").eq("empresa_id", EMPRESA_ID);
  const turnoIds = (turnos || []).map((t) => t.id);
  if (turnoIds.length > 0) {
    await supabase.from("caja_arqueos_denominaciones").delete().in("turno_id", turnoIds);
  }
  const { error: delTurnosErr } = await supabase.from("caja_turnos").delete().eq("empresa_id", EMPRESA_ID);
  if (delTurnosErr) {
    console.error("Error al eliminar caja_turnos:", delTurnosErr.message);
  } else {
    console.log(`   ✓ ${turnoIds.length} turnos/cortes de caja eliminados`);
  }

  // 7. Resetear saldos de los fondos de caja
  console.log("💵 Reseteando saldos base de fondos de caja...");
  await supabase.from("caja_fondos").update({ saldo_actual: 400.0 }).eq("id", FONDO1_ID);
  await supabase.from("caja_fondos").update({ saldo_actual: 8500.0 }).eq("id", FONDO2_ID);
  console.log("   ✓ Fondo 1 (Mostrador Operativo): $400.00 MXN");
  console.log("   ✓ Fondo 2 (Reserva Taller): $8,500.00 MXN");

  // 8. Limpiar audit logs operativos
  console.log("📜 Limpiando audit logs de órdenes y caja...");
  await supabase
    .from("audit_logs")
    .delete()
    .eq("empresa_id", EMPRESA_ID)
    .in("entity_type", ["ordenes_servicio", "caja_turnos", "caja_movimientos", "cotizaciones", "compras_proveedores"]);

  // 9. Verificación final
  console.log("\n================================================================");
  console.log("🔍 VERIFICACIÓN DE ESTADO FINAL PARA COVA");
  console.log("================================================================");

  const { count: countOrds } = await supabase.from("ordenes_servicio").select("*", { count: "exact", head: true }).eq("empresa_id", EMPRESA_ID);
  const { count: countTurnos } = await supabase.from("caja_turnos").select("*", { count: "exact", head: true }).eq("empresa_id", EMPRESA_ID);
  const { count: countMovs } = await supabase.from("caja_movimientos").select("*", { count: "exact", head: true }).eq("empresa_id", EMPRESA_ID);
  const { count: countCompras } = await supabase.from("compras_proveedores").select("*", { count: "exact", head: true }).eq("empresa_id", EMPRESA_ID);
  const { count: countCotiz } = await supabase.from("cotizaciones").select("*", { count: "exact", head: true }).eq("empresa_id", EMPRESA_ID);
  const { count: countPagos } = await supabase.from("pagos_orden").select("*", { count: "exact", head: true }).eq("empresa_id", EMPRESA_ID);

  console.log(`- Órdenes de servicio: ${countOrds}`);
  console.log(`- Turnos de caja (cortes): ${countTurnos}`);
  console.log(`- Movimientos de caja: ${countMovs}`);
  console.log(`- Compras proveedores: ${countCompras}`);
  console.log(`- Cotizaciones / ventas mostrador: ${countCotiz}`);
  console.log(`- Pagos de órdenes: ${countPagos}`);

  if (countOrds === 0 && countTurnos === 0 && countMovs === 0 && countCompras === 0 && countCotiz === 0 && countPagos === 0) {
    console.log("\n🎉 ¡COVA HA QUEDADO 100% LIMPIO Y LISTO PARA EMPEZAR DESDE CERO!");
  } else {
    console.warn("\n⚠️  Algunos registros no se eliminaron por completo.");
  }
}

limpiarHistorialCova().catch((err) => {
  console.error("Error fatal:", err);
  process.exit(1);
});
