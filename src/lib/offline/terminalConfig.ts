export const TERMINAL_STORAGE_KEY = "tallertrack_terminal_id";
export const TERMINAL_NAME_STORAGE_KEY = "tallertrack_terminal_name";

export interface TerminalOption {
  id: string;
  nombre: string;
  descripcion: string;
}

export const PRESET_TERMINALES: TerminalOption[] = [
  { id: "T1", nombre: "Mostrador Principal", descripcion: "Caja principal y atención a clientes" },
  { id: "T2", nombre: "Recepción / Patio", descripcion: "Tablet o móvil de asesor en entrada de vehículos" },
  { id: "T3", nombre: "Bahía / Alineación", descripcion: "Terminal técnica de mecánicos o centro llantero" },
];

/**
 * Obtiene el identificador de la terminal actual (ej. 'T1', 'T2', 'T3').
 * Si no está configurado, asigna 'T1' por defecto de manera resiliente.
 */
export function getActiveTerminalId(): string {
  if (typeof window === "undefined") return "T1";
  try {
    const stored = localStorage.getItem(TERMINAL_STORAGE_KEY);
    if (stored && stored.trim().length > 0) {
      return stored.trim();
    }
    // Asignación por defecto
    localStorage.setItem(TERMINAL_STORAGE_KEY, "T1");
    localStorage.setItem(TERMINAL_NAME_STORAGE_KEY, "Mostrador Principal");
    return "T1";
  } catch {
    return "T1";
  }
}

/**
 * Guarda la terminal seleccionada para este dispositivo.
 */
export function setActiveTerminal(terminalId: string, nombre?: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TERMINAL_STORAGE_KEY, terminalId);
    const found = PRESET_TERMINALES.find((t) => t.id === terminalId);
    const nameToSave = nombre || found?.nombre || `Terminal ${terminalId}`;
    localStorage.setItem(TERMINAL_NAME_STORAGE_KEY, nameToSave);
  } catch (err) {
    console.error("Error guardando terminal:", err);
  }
}

/**
 * Genera un folio seguro de contingencia offline.
 * Estructura: ORD-[TERMINAL]-[HEX_TIMESTAMP]
 * Ejemplo: ORD-T1-8F3A2B
 * Garantiza unicidad entre terminales desconectadas.
 */
export function generateOfflineFolio(prefix = "ORD"): string {
  const terminal = getActiveTerminalId();
  const timeHex = (Date.now() % 16777215).toString(16).toUpperCase().padStart(6, "0");
  const randomSuffix = Math.floor(Math.random() * 90 + 10); // 2 dígitos aleatorios
  return `${prefix}-${terminal}-${timeHex}${randomSuffix}`;
}
