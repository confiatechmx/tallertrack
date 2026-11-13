import { supabase } from "../src/lib/supabase";

interface TenantInfo {
  id: string;
  nombre_comercial: string;
  subdominio: string;
}

// Credenciales administrativas maestras
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "eduardo@cova.mx";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Cova2026!";

// Parsear argumentos CLI
const args = process.argv.slice(2);
function getArg(name: string): string | undefined {
  const match = args.find((a) => a.startsWith(`--${name}=`));
  if (match) return match.split("=")[1]?.trim();
  const index = args.indexOf(`--${name}`);
  if (index !== -1 && args[index + 1] && !args[index + 1].startsWith("--")) {
    return args[index + 1].trim();
  }
  return undefined;
}

const isList = args.includes("--list") || args.includes("-l");
const isDryRun = args.includes("--dry-run");
const isConfirmed = args.includes("--yes") || args.includes("-y") || args.includes("--confirm");
const targetSlug = getArg("slug");
const targetId = getArg("id");
const targetName = getArg("nombre");
const customFondo1 = getArg("fondo1");
const customFondo2 = getArg("fondo2");

async function main() {
  console.log("================================================================");
  console.log("🏢 TALLERTRACK / AUTOLISTO - RESET DE HISTORIAL POR TENANT");
  console.log("================================================================\n");

  // 1. Iniciar sesión administrativa SuperAdmin
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });

  if (authErr) {
    throw new Error(`Error autenticando como ${ADMIN_EMAIL}: ${authErr.message}`);
  }
  console.log(`🔐 Autenticado con privilegios SuperAdmin: ${auth.user?.email}`);

  // 2. Obtener lista de empresas/tenants
  const { data: empresas, error: empErr } = await supabase
    .from("empresas")
    .select("id, nombre_comercial, subdominio");

  if (empErr || !empresas || empresas.length === 0) {
    throw new Error(`Error obteniendo tenants: ${empErr?.message || "No se encontraron tenants"}`);
  }

  // Si se solicita --list o no se especificó ningún filtro
  if (isList || (!targetSlug && !targetId && !targetName)) {
    console.log("\n📋 LISTA DE TENANTS REGISTRADOS:");
    console.log("----------------------------------------------------------------");
    for (const emp of empresas) {
      const { count: ords } = await supabase
        .from("ordenes_servicio")
        .select("*", { count: "exact", head: true })
        .eq("empresa_id", emp.id);

      const { count: turnos } = await supabase
        .from("caja_turnos")
        .select("*", { count: "exact", head: true })
        .eq("empresa_id", emp.id);

      const { count: movs } = await supabase
        .from("caja_movimientos")
        .select("*", { count: "exact", head: true })
        .eq("empresa_id", emp.id);

      console.log(`• [${emp.subdominio || "sin-slug"}] ${emp.nombre_comercial}`);
      console.log(`  ID: ${emp.id}`);
      console.log(`  Órdenes: ${ords || 0} | Turnos Caja: ${turnos || 0} | Movimientos: ${movs || 0}`);
      console.log("----------------------------------------------------------------");
    }

    console.log("\n💡 Para limpiar un tenant específico, ejecuta:");
    console.log("   npx tsx --env-file=.env.local scripts/limpiar_historial_tenant.ts --slug=<slug> --yes");
    console.log("   (Opcional) --fondo1=400 --fondo2=8500  (para asignar fondos base)");
    console.log("   (Opcional) --dry-run  (para simular sin borrar nada)\n");
    return;
  }

  // 3. Resolver el tenant objetivo
  let tenant: TenantInfo | undefined;
  if (targetId) {
    tenant = empresas.find((e) => e.id.toLowerCase() === targetId.toLowerCase());
  } else if (targetSlug) {
    tenant = empresas.find((e) => (e.subdominio || "").toLowerCase() === targetSlug.toLowerCase());
  } else if (targetName) {
    tenant = empresas.find((e) =>
      e.nombre_comercial.toLowerCase().includes(targetName.toLowerCase())
    );
  }

  if (!tenant) {
    console.error("❌ No se encontró ningún tenant que coincida con el criterio proporcionado.");
    console.log("   Usa --list para ver los slugs e IDs disponibles.");
    process.exit(1);
  }

  console.log(`\n🎯 Tenant Seleccionado:`);
  console.log(`   Nombre: ${tenant.nombre_comercial}`);
  console.log(`   Slug:   ${tenant.subdominio}`);
  console.log(`   ID:     ${tenant.id}\n`);

  // 4. Conteo previo
  const { data: ords } = await supabase
    .from("ordenes_servicio")
    .select("id, folio")
    .eq("empresa_id", tenant.id);
  const ordIds = (ords || []).map((o) => o.id);

  const { count: countTurnos } = await supabase
    .from("caja_turnos")
    .select("*", { count: "exact", head: true })
    .eq("empresa_id", tenant.id);

  const { count: countMovs } = await supabase
    .from("caja_movimientos")
    .select("*", { count: "exact", head: true })
    .eq("empresa_id", tenant.id);

  const { count: countCompras } = await supabase
    .from("compras_proveedores")
    .select("*", { count: "exact", head: true })
    .eq("empresa_id", tenant.id);

  const { count: countCotiz } = await supabase
    .from("cotizaciones")
    .select("*", { count: "exact", head: true })
    .eq("empresa_id", tenant.id);

  const { count: countPagos } = await supabase
    .from("pagos_orden")
    .select("*", { count: "exact", head: true })
    .eq("empresa_id", tenant.id);

  console.log("📊 RESUMEN DE REGISTROS A LIMPIAR:");
  console.log(`   • Órdenes de servicio:             ${ordIds.length}`);
  console.log(`   • Turnos de caja (cortes):         ${countTurnos || 0}`);
  console.log(`   • Movimientos de caja:             ${countMovs || 0}`);
  console.log(`   • Compras a proveedores:           ${countCompras || 0}`);
  console.log(`   • Cotizaciones / ventas mostrador: ${countCotiz || 0}`);
  console.log(`   • Pagos de órdenes:                ${countPagos || 0}`);

  if (isDryRun) {
    console.log("\n⚠️  MODO DRY-RUN ACTIVADO: No se realizaron cambios en la base de datos.");
    return;
  }

  if (!isConfirmed) {
    console.warn("\n⚠️  ADVERTENCIA DE SEGURIDAD:");
    console.warn("   Esta acción eliminará de forma irreversible el historial de órdenes y cortes de este tenant.");
    console.warn("   Para proceder, agrega la bandera --yes o --confirm al comando:\n");
    console.warn(`   npx tsx --env-file=.env.local scripts/limpiar_historial_tenant.ts --slug=${tenant.subdominio} --yes\n`);
    return;
  }

  console.log("\n🚀 Ejecutando limpieza en cascada...");

  // 5. Cascada de eliminación
  if (ordIds.length > 0) {
    console.log("   🗑️  Eliminando dependencias de órdenes...");
    await supabase.from("checklist_danos").delete().in("orden_servicio_id", ordIds);
    await supabase.from("inspecciones_dvi").delete().in("orden_servicio_id", ordIds);
    await supabase.from("trabajos_diferidos").delete().in("orden_origen_id", ordIds);
    await supabase.from("orden_servicio_servicios").delete().in("orden_servicio_id", ordIds);
    await supabase.from("orden_servicio_refacciones").delete().in("orden_servicio_id", ordIds);
    await supabase.from("pagos_orden").delete().in("orden_servicio_id", ordIds);
    await supabase.from("compras_proveedores").delete().in("orden_servicio_id", ordIds);

    const { error: ordDelErr } = await supabase.from("ordenes_servicio").delete().in("id", ordIds);
    if (ordDelErr) {
      console.error("   ❌ Error eliminando ordenes_servicio:", ordDelErr.message);
    } else {
      console.log(`   ✓ ${ordIds.length} órdenes de servicio eliminadas`);
    }
  }

  // 6. Proveedores y compras residuales
  console.log("   🗑️  Eliminando abonos y compras a proveedores...");
  await supabase.from("proveedores_abonos").delete().eq("empresa_id", tenant.id);
  await supabase.from("compras_proveedores").delete().eq("empresa_id", tenant.id);
  await supabase.from("pagos_orden").delete().eq("empresa_id", tenant.id);

  console.log("   💳 Reseteando saldos y estados de cuenta de proveedores a $0.00...");
  const { error: resetProvsErr } = await supabase
    .from("proveedores")
    .update({ saldo_deudor_actual: 0.0, updated_at: new Date().toISOString() })
    .eq("empresa_id", tenant.id);
  if (resetProvsErr) {
    console.error("   ❌ Error al resetear saldos de proveedores:", resetProvsErr.message);
  } else {
    console.log("   ✓ Estados de cuenta y saldos de proveedores reseteados a $0.00");
  }

  // 7. Cotizaciones
  console.log("   🗑️  Eliminando cotizaciones y ventas de mostrador...");
  await supabase.from("detalles_cotizacion").delete().eq("empresa_id", tenant.id);
  await supabase.from("cotizaciones").delete().eq("empresa_id", tenant.id);

  // 8. Caja chica y turnos
  console.log("   🗑️  Eliminando turnos de caja, arqueos y movimientos...");
  await supabase.from("caja_traspasos_fondos").delete().eq("empresa_id", tenant.id);
  await supabase.from("caja_movimientos").delete().eq("empresa_id", tenant.id);

  const { data: turnos } = await supabase.from("caja_turnos").select("id").eq("empresa_id", tenant.id);
  const turnoIds = (turnos || []).map((t) => t.id);
  if (turnoIds.length > 0) {
    await supabase.from("caja_arqueos_denominaciones").delete().in("turno_id", turnoIds);
  }
  const { error: turnDelErr } = await supabase.from("caja_turnos").delete().eq("empresa_id", tenant.id);
  if (turnDelErr) {
    console.error("   ❌ Error eliminando caja_turnos:", turnDelErr.message);
  } else {
    console.log(`   ✓ ${turnoIds.length} turnos/cortes de caja eliminados`);
  }

  // 9. Reset fondos de caja
  const f1Val = customFondo1 !== undefined ? Number(customFondo1) : 400.0;
  const f2Val = customFondo2 !== undefined ? Number(customFondo2) : 8500.0;

  console.log(`   💵 Restableciendo saldos base de fondos (F1: $${f1Val}, F2: $${f2Val})...`);
  await supabase
    .from("caja_fondos")
    .update({ saldo_actual: f1Val, updated_at: new Date().toISOString() })
    .eq("empresa_id", tenant.id)
    .eq("tipo", "OPERATIVO");

  await supabase
    .from("caja_fondos")
    .update({ saldo_actual: f2Val, updated_at: new Date().toISOString() })
    .eq("empresa_id", tenant.id)
    .eq("tipo", "RESERVA");

  // 10. Limpieza de logs de auditoría operativos
  console.log("   📜 Limpiando logs de auditoría operativos...");
  await supabase
    .from("audit_logs")
    .delete()
    .eq("empresa_id", tenant.id)
    .in("entity_type", [
      "ordenes_servicio",
      "caja_turnos",
      "caja_movimientos",
      "cotizaciones",
      "compras_proveedores",
    ]);

  // 11. Verificación final
  console.log("\n================================================================");
  console.log("🔍 ESTADO FINAL TRAS LA LIMPIEZA");
  console.log("================================================================");

  const { count: finalOrds } = await supabase.from("ordenes_servicio").select("*", { count: "exact", head: true }).eq("empresa_id", tenant.id);
  const { count: finalTurnos } = await supabase.from("caja_turnos").select("*", { count: "exact", head: true }).eq("empresa_id", tenant.id);
  const { count: finalMovs } = await supabase.from("caja_movimientos").select("*", { count: "exact", head: true }).eq("empresa_id", tenant.id);
  const { count: finalCompras } = await supabase.from("compras_proveedores").select("*", { count: "exact", head: true }).eq("empresa_id", tenant.id);
  const { count: finalCotiz } = await supabase.from("cotizaciones").select("*", { count: "exact", head: true }).eq("empresa_id", tenant.id);
  const { count: finalPagos } = await supabase.from("pagos_orden").select("*", { count: "exact", head: true }).eq("empresa_id", tenant.id);

  const { data: finalProvs } = await supabase
    .from("proveedores")
    .select("saldo_deudor_actual")
    .eq("empresa_id", tenant.id);
  const totalSaldoDeudor = (finalProvs || []).reduce((acc, p) => acc + Number(p.saldo_deudor_actual || 0), 0);

  console.log(`   • Órdenes de servicio:             ${finalOrds || 0}`);
  console.log(`   • Turnos de caja (cortes):         ${finalTurnos || 0}`);
  console.log(`   • Movimientos de caja:             ${finalMovs || 0}`);
  console.log(`   • Compras a proveedores:           ${finalCompras || 0}`);
  console.log(`   • Cotizaciones / ventas mostrador: ${finalCotiz || 0}`);
  console.log(`   • Pagos de órdenes:                ${finalPagos || 0}`);
  console.log(`   • Saldo deudor proveedores (CxP):  $${totalSaldoDeudor.toFixed(2)}`);

  if (!finalOrds && !finalTurnos && !finalMovs && !finalCompras && !finalCotiz && !finalPagos && totalSaldoDeudor === 0) {
    console.log(`\n🎉 ¡El tenant "${tenant.nombre_comercial}" ha quedado 100% limpio y listo para operar desde cero!`);
  } else {
    console.warn("\n⚠️  Algunos registros residuales requieren revisión manual.");
  }
}

main().catch((err) => {
  console.error("❌ Error fatal durante la ejecución:", err);
  process.exit(1);
});
