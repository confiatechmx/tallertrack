"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { offlineSyncService, type SyncStatusSummary } from "@/services/offlineSyncService";
import { getActiveTerminalId, setActiveTerminal, PRESET_TERMINALES, type TerminalOption } from "@/lib/offline/terminalConfig";
import { useTenant } from "@/context/TenantContext";

interface OfflineSyncContextValue extends SyncStatusSummary {
  terminalId: string;
  terminalName: string;
  presetTerminales: TerminalOption[];
  cambiarTerminal: (id: string) => void;
  syncNow: () => Promise<void>;
  precacheNow: () => Promise<void>;
}

const OfflineSyncContext = createContext<OfflineSyncContextValue>({
  isOnline: true,
  isSyncing: false,
  pendingCount: 0,
  failedCount: 0,
  lastSyncedAt: null,
  terminalId: "T1",
  terminalName: "Mostrador Principal",
  presetTerminales: PRESET_TERMINALES,
  cambiarTerminal: () => {},
  syncNow: async () => {},
  precacheNow: async () => {},
});

export function OfflineSyncProvider({ children }: { children: React.ReactNode }) {
  const { empresa, sucursalActiva } = useTenant();
  const [status, setStatus] = useState<SyncStatusSummary>({
    isOnline: true,
    isSyncing: false,
    pendingCount: 0,
    failedCount: 0,
    lastSyncedAt: null,
  });
  const [terminalId, setTerminalIdState] = useState<string>("T1");

  // Cargar terminal activa al montar
  useEffect(() => {
    const tid = getActiveTerminalId();
    setTerminalIdState(tid);
  }, []);

  // Suscribirse al servicio de sincronización
  useEffect(() => {
    const unsubscribe = offlineSyncService.subscribe((newStatus) => {
      setStatus(newStatus);
    });
    return () => unsubscribe();
  }, []);

  // Precaché pasivo en segundo plano cuando se carga la empresa o cambia la sucursal
  useEffect(() => {
    if (empresa?.id && status.isOnline) {
      // Deferir 2 segundos para no competir con el render inicial
      const timer = setTimeout(() => {
        offlineSyncService.precacheTenantData(empresa.id, sucursalActiva?.id).catch(() => {});
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [empresa?.id, sucursalActiva?.id, status.isOnline]);

  const cambiarTerminal = useCallback((id: string) => {
    setActiveTerminal(id);
    setTerminalIdState(id);
  }, []);

  const syncNow = useCallback(async () => {
    await offlineSyncService.syncPendingMutations();
  }, []);

  const precacheNow = useCallback(async () => {
    if (empresa?.id) {
      await offlineSyncService.precacheTenantData(empresa.id, sucursalActiva?.id);
    }
  }, [empresa?.id, sucursalActiva?.id]);

  const currentTerminalObj = PRESET_TERMINALES.find((t) => t.id === terminalId);
  const terminalName = currentTerminalObj?.nombre || `Terminal ${terminalId}`;

  return (
    <OfflineSyncContext.Provider
      value={{
        ...status,
        terminalId,
        terminalName,
        presetTerminales: PRESET_TERMINALES,
        cambiarTerminal,
        syncNow,
        precacheNow,
      }}
    >
      {children}
    </OfflineSyncContext.Provider>
  );
}

export function useOfflineSync() {
  return useContext(OfflineSyncContext);
}
