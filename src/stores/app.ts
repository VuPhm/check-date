import { defineStore } from 'pinia';
import type { BranchIdentity, ServerEndpoint, SyncStatus } from '../domain/types';
import { serverEndpointSchema } from '../domain/schemas';

const ENDPOINT_STORAGE_KEY = 'coop_server_endpoint';

export const useAppStore = defineStore('app', {
  state: () => ({
    branch: null as BranchIdentity | null,
    endpoint: null as ServerEndpoint | null,
    syncStatus: (navigator.onLine ? 'idle' : 'offline') as SyncStatus,
    lastSyncedAt: null as string | null,
  }),
  actions: {
    hydrateEndpoint() {
      const raw = localStorage.getItem(ENDPOINT_STORAGE_KEY);
      if (!raw) return;
      try {
        this.endpoint = serverEndpointSchema.parse(JSON.parse(raw));
      } catch {
        localStorage.removeItem(ENDPOINT_STORAGE_KEY);
      }
    },
    setEndpoint(endpoint: ServerEndpoint) {
      const validated = serverEndpointSchema.parse(endpoint);
      this.endpoint = validated;
      localStorage.setItem(ENDPOINT_STORAGE_KEY, JSON.stringify(validated));
    },
    bindConnectivityEvents() {
      window.addEventListener('online', () => {
        this.syncStatus = 'idle';
      });
      window.addEventListener('offline', () => {
        this.syncStatus = 'offline';
      });
    },
  },
});
