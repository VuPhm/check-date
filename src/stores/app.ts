import { defineStore } from 'pinia';
import type { DeviceSession, ServerEndpoint, SyncStatus } from '../domain/types';
import { deviceSessionSchema, serverEndpointSchema } from '../domain/schemas';
import { acknowledgeChanges, assignUnboundRecords, getPendingChanges, getSyncCursor, mergeSyncSnapshot, setSyncCursor } from '../repositories/localDatabase';
import { checkSyncServer, syncWithServer } from '../services/syncApi';

const SESSION_STORAGE_KEY = 'coop_device_session';
const BRANCH_STORAGE_KEY = 'coop_branch_identity';
const ENDPOINT_STORAGE_KEY = 'coop_sync_endpoint';
const LAST_SYNC_STORAGE_KEY = 'coop_last_synced_at';
const defaultEndpoint: ServerEndpoint = { basePath: '/api' };

export const useAppStore = defineStore('app', {
  state: () => ({
    endpoint: defaultEndpoint as ServerEndpoint,
    session: null as DeviceSession | null,
    syncStatus: (navigator.onLine ? 'idle' : 'offline') as SyncStatus,
    lastSyncedAt: null as string | null,
    syncError: null as string | null,
  }),
  getters: {
    branch: (state) => state.session ? {
      id: state.session.branchId, code: state.session.branchId, name: state.session.displayName,
    } : null,
    isManager: (state) => state.session?.role === 'manager',
  },
  actions: {
    hydrateSettings() {
      const endpoint = localStorage.getItem(ENDPOINT_STORAGE_KEY);
      if (endpoint) {
        try { this.endpoint = serverEndpointSchema.parse(JSON.parse(endpoint)); } catch { localStorage.removeItem(ENDPOINT_STORAGE_KEY); }
      }
      this.lastSyncedAt = localStorage.getItem(LAST_SYNC_STORAGE_KEY) || null;
    },
    setEndpoint(basePath: string) {
      this.endpoint = serverEndpointSchema.parse({ basePath });
      localStorage.setItem(ENDPOINT_STORAGE_KEY, JSON.stringify(this.endpoint));
    },
    hydrateSession() {
      const raw = localStorage.getItem(SESSION_STORAGE_KEY);
      if (!raw) return;
      try {
        this.setSession(deviceSessionSchema.parse(JSON.parse(raw)));
      } catch {
        localStorage.removeItem(SESSION_STORAGE_KEY);
      }
    },
    setSession(session: DeviceSession) {
      const validated = deviceSessionSchema.parse(session);
      this.session = validated;
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(validated));
      localStorage.setItem(BRANCH_STORAGE_KEY, JSON.stringify({
        id: validated.branchId, code: validated.branchId, name: validated.branchId,
      }));
    },
    clearSession() {
      this.session = null;
      localStorage.removeItem(SESSION_STORAGE_KEY);
      localStorage.removeItem(BRANCH_STORAGE_KEY);
    },
    bindConnectivityEvents() {
      window.addEventListener('online', () => {
        this.syncStatus = 'idle';
        if (this.session) void this.syncNow().catch(() => undefined);
      });
      window.addEventListener('offline', () => { this.syncStatus = 'offline'; });
    },
    async testConnection() {
      this.syncError = null;
      this.syncStatus = 'syncing';
      try {
        const result = await checkSyncServer(this.endpoint);
        this.syncStatus = 'synced';
        return result;
      } catch (error) {
        this.syncStatus = 'error';
        this.syncError = error instanceof Error ? error.message : 'Không kết nối được máy chủ.';
        throw error;
      }
    },
    async syncNow() {
      if (this.syncStatus === 'syncing') return;
      if (!this.session) throw new Error('Hãy ghép thiết bị với cửa hàng trước.');
      if (!navigator.onLine) {
        this.syncStatus = 'offline';
        throw new Error('Thiết bị đang ngoại tuyến.');
      }
      this.syncError = null;
      this.syncStatus = 'syncing';
      try {
        await assignUnboundRecords(this.session.branchId, this.session.id);
        const [cursor, changes] = await Promise.all([getSyncCursor(this.session.branchId), getPendingChanges(this.session.branchId)]);
        const snapshot = await syncWithServer(this.endpoint, this.session, cursor, changes);
        await mergeSyncSnapshot(snapshot.kphLogs, snapshot.historyLogs);
        await Promise.all([acknowledgeChanges(snapshot.acceptedChangeIds), setSyncCursor(this.session.branchId, snapshot.cursor)]);
        this.lastSyncedAt = snapshot.serverTime;
        localStorage.setItem(LAST_SYNC_STORAGE_KEY, snapshot.serverTime);
        this.syncStatus = 'synced';
        window.dispatchEvent(new CustomEvent('coop:remote-sync'));
        return snapshot;
      } catch (error) {
        this.syncStatus = 'error';
        this.syncError = error instanceof Error ? error.message : 'Đồng bộ thất bại.';
        throw error;
      }
    },
  },
});
