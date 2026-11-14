import { createClient } from "@/lib/supabase/client";
import { localDB, type OutboxMutation, type OutboxMutationType, type CachedOrdenActiva } from "@/lib/offline/db";
import { getActiveTerminalId, generateOfflineFolio } from "@/lib/offline/terminalConfig";

export interface SyncStatusSummary {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncedAt: string | null;
  failedCount: number;
}

type SyncListener = (status: SyncStatusSummary) => void;

class OfflineSyncService {
  private listeners: Set<SyncListener> = new Set();
  private isSyncing = false;
  private lastSyncedAt: string | null = null;
  private syncTimer: NodeJS.Timeout | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      // Escuchar eventos nativos de red
      window.addEventListener("online", () => this.handleNetworkChange(true));
      window.addEventListener("offline", () => this.handleNetworkChange(false));

      // Timer periódico suave cada 45 segundos para vaciar cola si hay red
      this.syncTimer = setInterval(() => {
        if (navigator.onLine && !this.isSyncing) {
          this.syncPendingMutations().catch(() => {});
        }
      }, 45000);
    }
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    this.emitStatus();
    return () => this.listeners.delete(listener);
  }

  private async emitStatus() {
    const summary = await this.getStatus();
    this.listeners.forEach((l) => l(summary));
  }

  public async getStatus(): Promise<SyncStatusSummary> {
    const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
    let pendingCount = 0;
    let failedCount = 0;

    try {
      pendingCount = await localDB.outbox_mutaciones
        .where("status")
        .anyOf(["pending", "syncing"])
        .count();

      failedCount = await localDB.outbox_mutaciones
        .where("status")
        .equals("failed")
        .count();
    } catch {
      // IndexedDB podría estar cerrándose
    }

    return {
      isOnline,
      isSyncing: this.isSyncing,
      pendingCount,
      lastSyncedAt: this.lastSyncedAt,
      failedCount,
    };
  }

  private async handleNetworkChange(isOnline: boolean) {
    await this.emitStatus();
    if (isOnline) {
      // Al recuperar conexión, intentar sincronizar de inmediato
      this.syncPendingMutations().catch(() => {});
    }
  }

  /**
   * Encola una mutación en la Outbox de IndexedDB
   */
  public async enqueueMutation(params: {
    empresa_id: string;
    sucursal_id?: string | null;
    mutation_type: OutboxMutationType;
    entity_id: string;
    payload: any;
  }): Promise<OutboxMutation> {
    const id = crypto.randomUUID();
    const terminal_id = getActiveTerminalId();
    const client_recorded_at = new Date().toISOString();

    const mutation: OutboxMutation = {
      id,
      empresa_id: params.empresa_id,
      sucursal_id: params.sucursal_id,
      terminal_id,
      mutation_type: params.mutation_type,
      entity_id: params.entity_id,
      payload: params.payload,
      status: "pending",
      retry_count: 0,
      client_recorded_at,
    };

    await localDB.outbox_mutaciones.add(mutation);
    await this.emitStatus();

    // Si aparentemente hay red, disparar sincronización inmediata en segundo plano
    if (typeof navigator !== "undefined" && navigator.onLine) {
      setTimeout(() => this.syncPendingMutations().catch(() => {}), 100);
    }

    return mutation;
  }

  /**
   * Sincroniza todas las mutaciones pendientes de forma secuencial e idempotente
   */
  public async syncPendingMutations(): Promise<{ synced: number; failed: number }> {
    if (this.isSyncing) return { synced: 0, failed: 0 };
    if (typeof navigator !== "undefined" && !navigator.onLine) return { synced: 0, failed: 0 };

    this.isSyncing = true;
    await this.emitStatus();

    let synced = 0;
    let failed = 0;
    const supabase = createClient();

    try {
      const pendingMutations = await localDB.outbox_mutaciones
        .where("status")
        .anyOf(["pending", "failed"])
        .sortBy("client_recorded_at");

      for (const mut of pendingMutations) {
        // Marcar como 'syncing'
        await localDB.outbox_mutaciones.update(mut.id, { status: "syncing" });

        try {
          await this.processSingleMutation(supabase, mut);

          // Éxito: marcar como synced con timestamp
          await localDB.outbox_mutaciones.update(mut.id, {
            status: "synced",
            synced_at: new Date().toISOString(),
          });
          synced++;
        } catch (err: any) {
          console.warn(`[SyncWorker] Error procesando mutación ${mut.mutation_type} (${mut.id}):`, err);
          await localDB.outbox_mutaciones.update(mut.id, {
            status: "failed",
            retry_count: mut.retry_count + 1,
            error_message: err?.message || String(err),
          });
          failed++;
        }
      }

      this.lastSyncedAt = new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
    } finally {
      this.isSyncing = false;
      await this.emitStatus();
    }

    return { synced, failed };
  }

  /**
   * Procesa una mutación específica contra Supabase
   */
  private async processSingleMutation(supabase: any, mut: OutboxMutation) {
    const { mutation_type, payload } = mut;

    switch (mutation_type) {
      case "CREAR_ORDEN": {
        // Si la orden ya existe por ID, es un replay idempotente.
        // Sanitizar folio: en Postgres es autoincremental integer, por lo que si viene
        // un folio temporal offline tipo string (ej. 'ORD-T1-8F3A2B'), se guarda en checklist_recepcion
        const cleanPayload = { ...payload };
        if (typeof cleanPayload.folio === "string" || !cleanPayload.folio) {
          const offlineFolio = cleanPayload.folio || cleanPayload.folio_offline;
          delete cleanPayload.folio;
          if (offlineFolio) {
            cleanPayload.checklist_recepcion = {
              ...(cleanPayload.checklist_recepcion || {}),
              folio_offline: offlineFolio,
            };
          }
        }
        delete cleanPayload.folio_offline;

        const { error } = await supabase
          .from("ordenes_servicio")
          .upsert(cleanPayload, { onConflict: "id" });
        if (error) throw error;
        break;
      }

      case "ACTUALIZAR_ESTADO_ORDEN": {
        const { orden_id, nuevo_estado, notas } = payload;
        const updateData: any = { estado: nuevo_estado };
        if (notas) updateData.notas = notas;

        const { error } = await supabase
          .from("ordenes_servicio")
          .update(updateData)
          .eq("id", orden_id);
        if (error) throw error;
        break;
      }

      case "AGREGAR_ITEM_ORDEN": {
        const { tipo, item } = payload;
        const targetTable = tipo === "refaccion" ? "orden_servicio_refacciones" : "orden_servicio_servicios";
        const { error } = await supabase.from(targetTable).upsert(item, { onConflict: "id" });
        if (error) throw error;
        break;
      }

      case "ELIMINAR_ITEM_ORDEN": {
        const { tipo, item_id } = payload;
        const targetTable = tipo === "refaccion" ? "orden_servicio_refacciones" : "orden_servicio_servicios";
        const { error } = await supabase.from(targetTable).delete().eq("id", item_id);
        if (error) throw error;
        break;
      }

      case "REGISTRAR_PAGO_ORDEN": {
        // Soporte idempotente para pagos
        const { error } = await supabase.from("pagos_orden").upsert(payload, { onConflict: "id" });
        if (error) throw error;
        break;
      }

      case "CREAR_CLIENTE_EXPRESS": {
        const { cliente, vehiculo } = payload;
        if (cliente) {
          const { error: errCli } = await supabase.from("clientes").upsert(cliente, { onConflict: "id" });
          if (errCli) throw errCli;
        }
        if (vehiculo) {
          const { error: errVeh } = await supabase.from("vehiculos").upsert(vehiculo, { onConflict: "id" });
          if (errVeh) throw errVeh;
        }
        break;
      }

      default:
        console.warn("[SyncWorker] Tipo de mutación no soportado:", mutation_type);
    }
  }

  /**
   * Precaché pasivo en segundo plano: descarga llantas, refacciones, clientes y órdenes
   * Se ejecuta sin bloquear la UI cuando el sistema tiene internet.
   */
  public async precacheTenantData(empresaId: string, sucursalId?: string | null) {
    if (typeof window === "undefined" || !navigator.onLine) return;

    try {
      const supabase = createClient();

      // 1. Catálogo de refacciones y llantas
      const { data: llantas } = await supabase
        .from("inventario_llantas_base")
        .select("id, empresa_id, nombre, marca, medida, codigo_sat, precio_venta, precio_lista, stock_actual, updated_at")
        .eq("empresa_id", empresaId)
        .limit(300);

      if (llantas && llantas.length > 0) {
        await localDB.productos.bulkPut(
          llantas.map((l: any) => ({
            id: l.id,
            empresa_id: l.empresa_id,
            nombre: l.nombre,
            marca: l.marca,
            medida: l.medida,
            codigo_sat: l.codigo_sat,
            tipo: "llanta",
            precio_venta: Number(l.precio_venta || 0),
            precio_lista: Number(l.precio_lista || 0),
            stock_actual: Number(l.stock_actual || 0),
            updated_at: l.updated_at || new Date().toISOString(),
          }))
        );
      }

      // 2. Servicios de taller
      const { data: servicios } = await supabase
        .from("servicios_taller")
        .select("id, empresa_id, nombre, categoria, precio_sugerido, updated_at")
        .eq("empresa_id", empresaId)
        .limit(200);

      if (servicios && servicios.length > 0) {
        await localDB.servicios.bulkPut(
          servicios.map((s: any) => ({
            id: s.id,
            empresa_id: s.empresa_id,
            nombre: s.nombre,
            categoria: s.categoria,
            precio_sugerido: Number(s.precio_sugerido || 0),
            updated_at: s.updated_at || new Date().toISOString(),
          }))
        );
      }

      // 3. Clientes y Vehículos recientes
      const { data: clientes } = await supabase
        .from("clientes")
        .select("id, empresa_id, nombre, telefono, email, rfc, updated_at")
        .eq("empresa_id", empresaId)
        .order("updated_at", { ascending: false })
        .limit(200);

      if (clientes && clientes.length > 0) {
        await localDB.clientes.bulkPut(clientes);
      }

      // 4. Órdenes activas del día / semana con refacciones, servicios y pagos completos
      let queryOrdenes = supabase
        .from("ordenes_servicio")
        .select(`
          id,
          empresa_id,
          sucursal_id,
          folio,
          estado,
          sub_estado,
          total,
          saldo_pendiente,
          pagado,
          notas,
          notas_recepcion,
          problema_reportado,
          diagnostico_tecnico,
          bahia_rampa,
          mecanico_id,
          prioridad,
          nivel_gasolina,
          kilometraje_ingreso,
          checklist_recepcion,
          updated_at,
          clientes:cliente_id (id, nombre, telefono, correo, rfc),
          vehiculos:vehiculo_id (id, marca, modelo, anio, color, placas, vin, kilometraje_actual),
          orden_servicio_servicios (
            id, servicio_id, concepto_personalizado, mecanico_id, cantidad, horas_labor, precio_cobrado, comision_porcentaje, estatus_aprobacion, notas, paquete_operacion, es_cortesia, garantia_especifica,
            servicios_taller ( id, nombre, categoria, precio )
          ),
          orden_servicio_refacciones (
            id, nombre, numero_parte, proveedor, cantidad, costo_unitario, margen_porcentaje, precio_unitario, subtotal, estatus_aprobacion, paquete_operacion, es_cortesia, garantia_especifica
          ),
          pagos_orden (
            id, monto_total, proveedor_pago, metodo_detalle, referencia, estatus, fecha_pago, deleted_at
          ),
          inspecciones_dvi (
            id, orden_servicio_id, item_key, categoria, severidad, notas
          )
        `)
        .eq("empresa_id", empresaId)
        .not("estado", "in", '("entregado","cancelado")')
        .order("updated_at", { ascending: false })
        .limit(100);

      if (sucursalId) {
        queryOrdenes = queryOrdenes.eq("sucursal_id", sucursalId);
      }

      const { data: ordenes } = await queryOrdenes;

      if (ordenes && ordenes.length > 0) {
        const cachedOrdenes: CachedOrdenActiva[] = ordenes.map((o: any) => {
          const cli = o.clientes || {};
          const veh = o.vehiculos || {};
          const vehResumen = veh.marca ? `${veh.marca} ${veh.modelo || ""} ${veh.placas || ""}`.trim() : "Vehículo sin ficha";

          return {
            id: o.id,
            empresa_id: o.empresa_id,
            sucursal_id: o.sucursal_id,
            folio: o.folio || "SIN-FOLIO",
            cliente_id: null,
            cliente_nombre: cli.nombre || "Cliente Mostrador",
            cliente_telefono: cli.telefono || null,
            vehiculo_id: null,
            vehiculo_resumen: vehResumen,
            placas: veh.placas || null,
            estado: o.estado || "recepcion",
            total: Number(o.total || 0),
            saldo_pendiente: Number(o.saldo_pendiente || 0),
            pagado: Number(o.pagado || 0),
            notas: o.notas || null,
            updated_at: o.updated_at || new Date().toISOString(),
            raw_data: o,
          };
        });

        await localDB.ordenes_activas.bulkPut(cachedOrdenes);
      }

      this.lastSyncedAt = new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
      await this.emitStatus();
    } catch (err) {
      console.warn("[OfflineSyncService] Precaché no completado (red intermitente):", err);
    }
  }
}

export const offlineSyncService = new OfflineSyncService();
