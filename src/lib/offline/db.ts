import Dexie, { type EntityTable } from "dexie";

export interface CachedProducto {
  id: string;
  empresa_id: string;
  sucursal_id?: string | null;
  nombre: string;
  marca?: string | null;
  medida?: string | null;
  codigo_sat?: string | null;
  tipo: "llanta" | "refaccion" | "accesorio" | "insumo";
  precio_venta: number;
  precio_lista?: number;
  stock_actual: number;
  ubicacion?: string | null;
  updated_at: string;
}

export interface CachedServicio {
  id: string;
  empresa_id: string;
  nombre: string;
  categoria?: string | null;
  precio_sugerido: number;
  tiempo_estimado_minutos?: number;
  updated_at: string;
}

export interface CachedCliente {
  id: string;
  empresa_id: string;
  nombre: string;
  telefono?: string | null;
  email?: string | null;
  rfc?: string | null;
  direccion?: string | null;
  updated_at: string;
}

export interface CachedVehiculo {
  id: string;
  cliente_id: string;
  empresa_id: string;
  placas: string;
  marca?: string | null;
  modelo?: string | null;
  anio?: number | null;
  vin?: string | null;
  color?: string | null;
  odometro?: number | null;
  updated_at: string;
}

export interface CachedOrdenActiva {
  id: string;
  empresa_id: string;
  sucursal_id?: string | null;
  folio: string;
  folio_offline?: string | null;
  cliente_id?: string | null;
  cliente_nombre: string;
  cliente_telefono?: string | null;
  vehiculo_id?: string | null;
  vehiculo_resumen: string;
  placas?: string | null;
  estado: string; // 'recepcion' | 'presupuesto' | 'aprobado' | 'en_proceso' | 'terminado' | 'entregado' | 'cobrado' | 'cancelado'
  total: number;
  saldo_pendiente: number;
  pagado: number;
  items_resumen?: string | null;
  notas?: string | null;
  updated_at: string;
  raw_data?: any; // Snapshot completo para renderizar detalle
}

export type OutboxMutationType =
  | "CREAR_ORDEN"
  | "ACTUALIZAR_ESTADO_ORDEN"
  | "AGREGAR_ITEM_ORDEN"
  | "ELIMINAR_ITEM_ORDEN"
  | "REGISTRAR_PAGO_ORDEN"
  | "CREAR_CLIENTE_EXPRESS"
  | "CREAR_VEHICULO_EXPRESS"
  | "ACTUALIZAR_ODOMETRO";

export interface OutboxMutation {
  id: string; // UUIDv4 local
  empresa_id: string;
  sucursal_id?: string | null;
  terminal_id: string; // ej. 'T1', 'T2'
  mutation_type: OutboxMutationType;
  entity_id: string; // ID de la orden, cliente, pago, etc.
  payload: any;
  status: "pending" | "syncing" | "synced" | "failed";
  retry_count: number;
  error_message?: string | null;
  client_recorded_at: string; // ISO 8601 en el momento del click físico
  synced_at?: string | null;
}

export interface TerminalConfigEntry {
  key: string;
  value: any;
}

export class TallerTrackLocalDB extends Dexie {
  productos!: EntityTable<CachedProducto, "id">;
  servicios!: EntityTable<CachedServicio, "id">;
  clientes!: EntityTable<CachedCliente, "id">;
  vehiculos!: EntityTable<CachedVehiculo, "id">;
  ordenes_activas!: EntityTable<CachedOrdenActiva, "id">;
  outbox_mutaciones!: EntityTable<OutboxMutation, "id">;
  terminal_config!: EntityTable<TerminalConfigEntry, "key">;

  constructor() {
    super("TallerTrack_Offline_DB");

    this.version(1).stores({
      productos: "id, empresa_id, tipo, nombre, marca, medida, updated_at",
      servicios: "id, empresa_id, nombre, categoria, updated_at",
      clientes: "id, empresa_id, nombre, telefono, updated_at",
      vehiculos: "id, cliente_id, empresa_id, placas, updated_at",
      ordenes_activas: "id, empresa_id, folio, estado, cliente_nombre, placas, updated_at",
      outbox_mutaciones: "id, empresa_id, terminal_id, mutation_type, status, client_recorded_at",
      terminal_config: "key",
    });
  }
}

export const localDB = new TallerTrackLocalDB();
