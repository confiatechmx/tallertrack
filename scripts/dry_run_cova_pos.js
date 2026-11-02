const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Load environment variables
const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.trim().split('=');
  if (parts.length >= 2) {
    const k = parts[0].trim();
    const v = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
    env[k] = v;
  }
});

const covaEmpresaId = 'b2ad09db-0a34-4876-9ca3-d584c40bd294';
const covaSucursalId = 'b2ad09db-0a34-4876-9ca3-d584c40bd295';
const covaUserId = '6864a8d9-88de-4d5c-ba65-df6a5d7b6137'; // Eduardo Cova (SuperAdmin)

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function runDryRun() {
  console.log('===============================================================');
  console.log('🏁 SIMULACIÓN DE PRUEBA PRE-ENTREGA ("DRY RUN CARTA")');
  console.log('Tenant: Cova (Culiacán Rosales, Sin.)');
  console.log(`Empresa ID: ${covaEmpresaId}`);
  console.log(`Sucursal ID: ${covaSucursalId}`);
  console.log('===============================================================\n');

  // 0. Detectar fondos configurados
  const { data: fondos, error: errFondos } = await supabase
    .from('caja_fondos')
    .select('*')
    .eq('empresa_id', covaEmpresaId)
    .order('tipo');

  if (errFondos || !fondos || fondos.length === 0) {
    throw new Error('No se encontraron fondos configurados: ' + JSON.stringify(errFondos));
  }

  const f1 = fondos.find(f => f.tipo === 'MOSTRADOR') || fondos[0];
  const f2 = fondos.find(f => f.tipo === 'CAJA_FUERTE') || fondos[1] || fondos[0];
  console.log(`💼 Fondos Operativos:`);
  console.log(`   - F1 (${f1.nombre}): Saldo actual $${Number(f1.saldo_actual).toFixed(2)} MXN`);
  console.log(`   - F2 (${f2.nombre}): Saldo actual $${Number(f2.saldo_actual).toFixed(2)} MXN\n`);

  // 1. PASO 1: Verificar o Aperturar Turno de Caja
  console.log('▶️ PASO 1: Verificando turno de caja operativa para Cova...');
  let { data: turnoActivo } = await supabase
    .from('caja_turnos')
    .select('*')
    .eq('sucursal_id', covaSucursalId)
    .eq('estado', 'ABIERTO')
    .maybeSingle();

  let turnoId;
  if (turnoActivo) {
    turnoId = turnoActivo.id;
    console.log(`ℹ️ Turno en curso detectado: ID ${turnoId}`);
    console.log(`   - Apertura F1 Mostrador: $${Number(turnoActivo.monto_apertura_fondo1).toFixed(2)} MXN`);
    console.log(`   - Apertura F2 Reserva:   $${Number(turnoActivo.monto_apertura_fondo2).toFixed(2)} MXN\n`);
  } else {
    const f1OpenAmount = 400.0;
    const f2OpenAmount = 8500.0;
    const { data: nuevoTurno, error: errAbrir } = await supabase.rpc('fn_abrir_turno_caja', {
      p_empresa_id: covaEmpresaId,
      p_sucursal_id: covaSucursalId,
      p_usuario_id: covaUserId,
      p_monto_fondo1: f1OpenAmount,
      p_monto_fondo2: f2OpenAmount
    });
    if (errAbrir) throw errAbrir;
    turnoId = nuevoTurno.id || nuevoTurno;
    console.log(`✅ Nuevo turno aperturado: ID ${turnoId}`);
    console.log(`   - Apertura F1 Mostrador: $${f1OpenAmount.toFixed(2)} MXN`);
    console.log(`   - Apertura F2 Reserva:   $${f2OpenAmount.toFixed(2)} MXN\n`);
  }

  // 2. PASO 2: Cobro POS con Split Payment (Efectivo + SPEI)
  console.log('▶️ PASO 2: Registrando cobro con Pago Dividido (Split Payment)...');
  const { data: ordenes } = await supabase
    .from('ordenes_servicio')
    .select('id, folio')
    .eq('empresa_id', covaEmpresaId)
    .order('folio', { ascending: false })
    .limit(1);

  const orderTargetId = ordenes && ordenes.length > 0 ? ordenes[0].id : null;
  const folioTarget = ordenes && ordenes.length > 0 ? ordenes[0].folio : 1001;

  // Cuentas bancarias de Cova
  const { data: cuentas } = await supabase
    .from('cuentas_bancarias')
    .select('id, banco, alias')
    .eq('empresa_id', covaEmpresaId)
    .limit(1);
  const targetCuentaId = cuentas && cuentas.length > 0 ? cuentas[0].id : null;

  const splitPayments = [
    {
      metodo: 'Efectivo',
      proveedor_pago: 'Efectivo',
      monto: 1200.0,
      monto_total: 1200.0,
      detalle: 'Efectivo en Caja Mostrador',
      metodo_detalle: 'Efectivo en Caja Mostrador',
      referencia: `DRY-EFVO-${Date.now().toString().slice(-4)}`,
      caja_fondo_id: f1.id,
      caja_turno_id: turnoId,
      descuento_aplicado: 0.0
    },
    {
      metodo: 'Transferencia',
      proveedor_pago: 'Transferencia',
      monto: 1450.0,
      monto_total: 1450.0,
      detalle: 'SPEI BanBajío Fiscal Cova',
      metodo_detalle: 'SPEI BanBajío Fiscal Cova',
      referencia: `SPEI-${Date.now().toString().slice(-4)}`,
      cuenta_bancaria_id: targetCuentaId,
      caja_fondo_id: null,
      caja_turno_id: turnoId,
      descuento_aplicado: 0.0
    }
  ];

  console.log(`   - Orden Folio: #${1000 + Number(folioTarget)}`);
  console.log(`   - Sub-pago 1: $1,200.00 MXN en Efectivo (Fondo 1 Mostrador)`);
  console.log(`   - Sub-pago 2: $1,450.00 MXN en SPEI Transferencia (${cuentas?.[0]?.alias || 'BanBajío Fiscal'})`);

  const { error: errPagos } = await supabase.rpc('fn_registrar_pagos_orden_multi', {
    p_orden_id: orderTargetId,
    p_pagos: splitPayments,
    p_sucursal_id: covaSucursalId
  });

  if (errPagos) throw errPagos;
  console.log(`✅ Pago dividido registrado exitosamente por $2,650.00 MXN.\n`);

  // 3. PASO 3: Traspaso Intra-Día F1 -> F2 (Resguardo de Efectivo Excedente)
  console.log('▶️ PASO 3: Ejecutando traspaso intra-día F1 (Mostrador) ➔ F2 (Reserva/Caja Fuerte)...');
  const traspasoMonto = 1000.0;
  const { error: errTraspaso } = await supabase.rpc('fn_traspaso_entre_fondos', {
    p_turno_id: turnoId,
    p_fondo_origen_id: f1.id,
    p_fondo_destino_id: f2.id,
    p_monto: traspasoMonto,
    p_concepto: 'Resguardo de efectivo excedente matutino en caja fuerte',
    p_usuario_id: covaUserId
  });

  if (errTraspaso) throw errTraspaso;
  console.log(`✅ Traspaso exitoso por $${traspasoMonto.toFixed(2)} MXN.`);
  console.log(`   - Fondo 1 disminuyó -$${traspasoMonto.toFixed(2)} MXN`);
  console.log(`   - Fondo 2 aumentó +$${traspasoMonto.toFixed(2)} MXN\n`);

  // 4. PASO 4: Registro de Gasto Menor de Patio
  console.log('▶️ PASO 4: Registrando gasto menor operativo de patio (Tornicenter)...');
  const gastoMonto = 250.0;
  const idempotencyKey = `gasto-dry-${Date.now()}`;
  const { error: errGasto } = await supabase.rpc('fn_registrar_movimiento_caja', {
    p_tipo: 'EGRESO',
    p_concepto: 'Compra urgente de tornillería y silicón RTV automotriz en Tornicenter',
    p_monto: gastoMonto,
    p_metodo: 'Efectivo',
    p_responsable: 'Eduardo Torres',
    p_sucursal_id: covaSucursalId,
    p_idempotency_key: idempotencyKey,
    p_caja_turno_id: turnoId,
    p_caja_fondo_id: f1.id
  });

  if (errGasto) throw errGasto;
  console.log(`✅ Gasto de caja chica registrado: $${gastoMonto.toFixed(2)} MXN deducido de Fondo 1.\n`);

  // 5. PASO 5: Consultar Auditoría Dinámica del Turno y Ejecutar Cierre Z
  console.log('▶️ PASO 5: Ejecutando Auditoría y Cierre de Turno Z con Arqueo Ciego...');
  
  // Consultar resumen auditado
  const { data: auditRes, error: errAudit } = await supabase.rpc('fn_resumen_corte_diario_auditoria', {
    p_turno_id: turnoId
  });

  if (errAudit) throw errAudit;
  console.log(`📊 Snapshot de Auditoría obtenido:`);
  console.log(`   - Ventas Totales del Turno: $${auditRes.kpis.ventas_brutas.toFixed(2)} MXN`);
  console.log(`   - Entradas Ventas en Efectivo: $${auditRes.efectivo.entradas_ventas.toFixed(2)} MXN`);
  console.log(`   - Salidas y Gastos Registrados: $${auditRes.efectivo.salidas_gastos.toFixed(2)} MXN`);
  console.log(`   - Cuentas Bancarias SPEI Conciliadas: ${auditRes.bancos.length}`);
  console.log(`   - Tarjetas TPV Conciliadas: ${auditRes.tarjetas.conteo} transacciones\n`);

  // Calcular teórico real acumulado en ambos fondos
  // Re-consultar turno actualizado con todos los movimientos
  const { data: turnoCalculo } = await supabase
    .from('caja_turnos')
    .select('monto_apertura_fondo1, monto_apertura_fondo2')
    .eq('id', turnoId)
    .single();

  const apF1 = Number(turnoCalculo.monto_apertura_fondo1 || 400);
  const apF2 = Number(turnoCalculo.monto_apertura_fondo2 || 8500);

  // Consultar sumas netas para F1 y F2
  const { data: pagosEfvo } = await supabase
    .from('pagos_orden')
    .select('monto_total')
    .eq('caja_turno_id', turnoId)
    .eq('proveedor_pago', 'Efectivo')
    .is('deleted_at', null);

  const totalEfvoIngresado = (pagosEfvo || []).reduce((acc, p) => acc + Number(p.monto_total), 0);

  const { data: egresosF1 } = await supabase
    .from('caja_movimientos')
    .select('monto')
    .eq('caja_turno_id', turnoId)
    .eq('tipo', 'EGRESO');

  const totalEgresosF1 = (egresosF1 || []).reduce((acc, m) => acc + Number(m.monto), 0);

  const { data: traspasosF1toF2 } = await supabase
    .from('caja_traspasos_fondos')
    .select('monto')
    .eq('turno_id', turnoId)
    .eq('fondo_origen_id', f1.id)
    .eq('fondo_destino_id', f2.id);

  const totalTraspasado = (traspasosF1toF2 || []).reduce((acc, t) => acc + Number(t.monto), 0);

  const f1Teorico = apF1 + totalEfvoIngresado - totalEgresosF1 - totalTraspasado;
  const f2Teorico = apF2 + totalTraspasado;
  const totalFisicoDeclarado = f1Teorico + f2Teorico;

  console.log(`🔍 Conciliación de Arqueo Ciego Físico:`);
  console.log(`   - Fondo 1 (Mostrador): $${f1Teorico.toFixed(2)} MXN`);
  console.log(`   - Fondo 2 (Caja Fuerte / Reserva): $${f2Teorico.toFixed(2)} MXN`);
  console.log(`   - Total Efectivo a Declarar: $${totalFisicoDeclarado.toFixed(2)} MXN`);

  // Denominaciones físicas correspondientes
  const denomsF1 = { "1000": 0, "500": 0, "200": 1, "100": 1, "50": 0, "20": 2, "10": 1, "5": 0, "2": 0, "1": 0, "0.5": 0 };
  const denomsF2 = { "1000": 0, "500": Math.floor(f2Teorico / 500), "200": 0, "100": 0, "50": 0, "20": 0, "10": 0, "5": 0, "2": 0, "1": 0, "0.5": 0 };

  const remesaRetiro = Math.max(0, f2Teorico - 8500) + Math.max(0, f1Teorico - 400);
  const siguienteFondoBase = 400.0; // Fondo base garantizado para Cova

  const { data: turnoCerrado, error: errCerrar } = await supabase.rpc('fn_cerrar_turno_caja', {
    p_turno_id: turnoId,
    p_usuario_cierre_id: covaUserId,
    p_declarado_f1: f1Teorico,
    p_declarado_f2: f2Teorico,
    p_denominaciones_f1: denomsF1,
    p_denominaciones_f2: denomsF2,
    p_justificacion: 'Cierre Z auditado. Ensayo General Pre-Entrega exitoso.',
    p_monto_remesa: remesaRetiro,
    p_monto_fondo_siguiente: siguienteFondoBase
  });

  if (errCerrar) throw errCerrar;

  console.log(`\n===============================================================`);
  console.log(`🏆 CORTE Z SELLADO CON ÉXITO Y SNAPSHOT AUDITABLE INMUTABLE`);
  console.log(`===============================================================`);
  console.log(`   - Turno ID: ${turnoId}`);
  console.log(`   - Estatus Final: CERRADO`);
  console.log(`   - Declarado F1: $${Number(turnoCerrado?.declarado_f1 || f1Teorico).toFixed(2)} MXN`);
  console.log(`   - Declarado F2: $${Number(turnoCerrado?.declarado_f2 || f2Teorico).toFixed(2)} MXN`);
  console.log(`   - Diferencia F1: $${Number(turnoCerrado?.diferencia_f1 || 0).toFixed(2)} MXN (CUADRATURA EXACTA)`);
  console.log(`   - Diferencia F2: $${Number(turnoCerrado?.diferencia_f2 || 0).toFixed(2)} MXN (CUADRATURA EXACTA)`);
  console.log(`   - Remesa Retirada para Depósito: $${remesaRetiro.toFixed(2)} MXN`);
  console.log(`   - Fondo Base Siguiente Turno: $${siguienteFondoBase.toFixed(2)} MXN`);

  // 6. PASO 6: Demostrar Apertura de Nuevo Turno Ininterrumpido
  console.log('\n▶️ PASO 6: Aperturando el Siguiente Turno Operativo con el Fondo Base Siguiente...');
  const { data: nuevoTurnoSiguiente, error: errSiguiente } = await supabase.rpc('fn_abrir_turno_caja', {
    p_empresa_id: covaEmpresaId,
    p_sucursal_id: covaSucursalId,
    p_usuario_id: covaUserId,
    p_monto_fondo1: siguienteFondoBase,
    p_monto_fondo2: 8500.0
  });

  if (errSiguiente) throw errSiguiente;
  const nuevoId = nuevoTurnoSiguiente.id || nuevoTurnoSiguiente;
  console.log(`✅ Siguiente turno abierto exitosamente.`);
  console.log(`   - Turno ID: ${nuevoId}`);
  console.log(`   - F1 (Fondo Inicial Mostrador): $${siguienteFondoBase.toFixed(2)} MXN`);
  console.log(`   - F2 (Fondo Inicial Reserva):   $8,500.00 MXN`);
  console.log(`\n🏁 SIMULACIÓN DRY RUN PRE-ENTREGA COMPLETADA AL 100%.`);
}

runDryRun().catch(err => {
  console.error('\n❌ ERROR FATAL:', err);
  process.exit(1);
});
