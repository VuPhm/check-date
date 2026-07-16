import { defineStore } from 'pinia';
import type { ActivityEvent, DeviceSession, ServerEndpoint, SyncStatus } from '../domain/types';
import { deviceSessionSchema, serverEndpointSchema } from '../domain/schemas';
import { acknowledgeChanges, assignUnboundRecords, getPendingChanges, getSyncCursor, mergeSyncSnapshot, setSyncCursor } from '../repositories/localDatabase';
import { checkSyncServer, subscribeToBranchEvents, syncWithServer } from '../services/syncApi';

const SESSION_STORAGE_KEY = 'coop_device_session';
const BRANCH_STORAGE_KEY = 'coop_branch_identity';
const ENDPOINT_STORAGE_KEY = 'coop_sync_endpoint';
const LAST_SYNC_STORAGE_KEY = 'coop_last_synced_at';
const SEEN_ACTIVITY_STORAGE_KEY = 'coop_seen_activity';
const KNOWN_ACTIVITY_STORAGE_KEY = 'coop_known_activity';
const AUTH_NOTICE_STORAGE_KEY = 'coop_auth_notice';
const defaultEndpoint: ServerEndpoint = { basePath: '/api' };
let branchEvents: EventSource | null = null;
let syncTimer: number | null = null;

export const useAppStore = defineStore('app', {
  state: () => ({
    endpoint: defaultEndpoint as ServerEndpoint,
    session: null as DeviceSession | null,
    syncStatus: (navigator.onLine ? 'idle' : 'offline') as SyncStatus,
    lastSyncedAt: null as string | null,
    syncError: null as string | null,
    managerName: '' as string,
    storeName: 'CO.OP FOOD' as string,
    storeNameDirty: false as boolean,
    authNotice: '' as string,
    activityEvents: [] as ActivityEvent[],
    seenActivityIds: [] as string[],
    knownActivityIds: [] as string[],
  }),
  getters: {
    branch: (state) => state.session ? {
      id: state.session.branchId, code: state.session.branchId, name: state.session.displayName,
    } : null,
    isManager: (state) => state.session?.role === 'manager',
    actionableEvents: (state): ActivityEvent[] => {
      if (!state.session) return [];
      return state.activityEvents.filter((event) => state.session?.role === 'manager'
        ? event.actorRole === 'employee' && (event.type === 'kph.created' || event.type === 'kph.deleted' || event.type === 'employee.joined')
        : event.targetUserId === state.session?.id && (event.type === 'kph.approved' || event.type === 'kph.rejected' || event.type === 'employee.removed'));
    },
    unreadActionableEvents(): ActivityEvent[] {
      return this.actionableEvents.filter((event) => !this.seenActivityIds.includes(event.id));
    },
  },
  actions: {
    hydrateSettings() {
      const endpoint = localStorage.getItem(ENDPOINT_STORAGE_KEY);
      if (endpoint) {
        try { this.endpoint = serverEndpointSchema.parse(JSON.parse(endpoint)); } catch { localStorage.removeItem(ENDPOINT_STORAGE_KEY); }
      }
      this.lastSyncedAt = localStorage.getItem(LAST_SYNC_STORAGE_KEY) || null;
      this.managerName = localStorage.getItem('kph_cht') || '';
      this.storeName = localStorage.getItem('kph_store') || 'CO.OP FOOD';
      this.authNotice = localStorage.getItem(AUTH_NOTICE_STORAGE_KEY) || '';
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
      this.authNotice = '';
      localStorage.removeItem(AUTH_NOTICE_STORAGE_KEY);
      if (validated.role === 'manager') this.managerName = validated.displayName;
      try { this.seenActivityIds = JSON.parse(localStorage.getItem(`${SEEN_ACTIVITY_STORAGE_KEY}:${validated.id}`) || '[]'); } catch { this.seenActivityIds = []; }
      try { this.knownActivityIds = JSON.parse(localStorage.getItem(`${KNOWN_ACTIVITY_STORAGE_KEY}:${validated.id}`) || '[]'); } catch { this.knownActivityIds = []; }
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(validated));
      localStorage.setItem(BRANCH_STORAGE_KEY, JSON.stringify({
        id: validated.branchId, code: validated.branchId, name: validated.branchId,
      }));
      this.startLiveSync();
    },
    clearSession(reason = '') {
      this.session = null;
      this.authNotice = reason;
      if (reason) localStorage.setItem(AUTH_NOTICE_STORAGE_KEY, reason); else localStorage.removeItem(AUTH_NOTICE_STORAGE_KEY);
      this.seenActivityIds = [];
      this.knownActivityIds = [];
      localStorage.removeItem(SESSION_STORAGE_KEY);
      localStorage.removeItem(BRANCH_STORAGE_KEY);
      branchEvents?.close(); branchEvents = null;
    },
    updateSessionDisplayName(displayName: string) {
      if (!this.session) return;
      const validated = deviceSessionSchema.parse({ ...this.session, displayName: displayName.trim() });
      this.session = validated; localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(validated));
      if (validated.role === 'manager') { this.managerName = validated.displayName; localStorage.setItem('kph_cht', validated.displayName); }
    },
    setStoreName(storeName: string, markDirty = true) { this.storeName = storeName.trim() || 'CO.OP FOOD'; this.storeNameDirty = markDirty; localStorage.setItem('kph_store', this.storeName); },
    bindConnectivityEvents() {
      window.addEventListener('online', () => {
        this.syncStatus = 'idle';
        if (this.session) void this.syncNow().catch(() => undefined);
      });
      window.addEventListener('offline', () => { this.syncStatus = 'offline'; });
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && this.session) void this.syncNow().catch(() => undefined);
      });
      if (syncTimer === null) syncTimer = window.setInterval(() => {
        if (document.visibilityState === 'visible' && this.session && navigator.onLine) void this.syncNow().catch(() => undefined);
      }, 30_000);
    },
    startLiveSync() {
      branchEvents?.close();
      if (!this.session || typeof EventSource === 'undefined') return;
      branchEvents = subscribeToBranchEvents(this.endpoint, this.session, () => void this.syncNow().catch(() => undefined));
    },
    markActivityRead(ids: string[]) {
      if (!this.session || !ids.length) return;
      this.seenActivityIds = [...new Set([...this.seenActivityIds, ...ids])].slice(-500);
      localStorage.setItem(`${SEEN_ACTIVITY_STORAGE_KEY}:${this.session.id}`, JSON.stringify(this.seenActivityIds));
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
        const snapshot = await syncWithServer(this.endpoint, this.session, cursor, changes, this.storeNameDirty ? { storeName: this.storeName } : undefined);
        if (snapshot.profile?.displayName && snapshot.profile.displayName !== this.session.displayName) {
          this.session = deviceSessionSchema.parse({ ...this.session, displayName: snapshot.profile.displayName });
          localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(this.session));
        }
        if (snapshot.profile?.managerName) { this.managerName = snapshot.profile.managerName; localStorage.setItem('kph_cht', snapshot.profile.managerName); }
        if (snapshot.profile?.storeName) this.setStoreName(snapshot.profile.storeName, false);
        this.storeNameDirty = false;
        await mergeSyncSnapshot(snapshot.kphLogs, snapshot.historyLogs);
        await Promise.all([acknowledgeChanges(snapshot.acceptedChangeIds), setSyncCursor(this.session.branchId, snapshot.cursor)]);
        this.lastSyncedAt = snapshot.serverTime;
        if (snapshot.activityEvents.length) {
          const known = new Set(this.knownActivityIds);
          const fresh = snapshot.activityEvents.filter((event) => !known.has(event.id));
          this.activityEvents = snapshot.activityEvents.slice(0, 50);
          const hasBaseline = this.knownActivityIds.length > 0;
          this.knownActivityIds = [...new Set([...snapshot.activityEvents.map((event) => event.id), ...this.knownActivityIds])].slice(0, 500);
          localStorage.setItem(`${KNOWN_ACTIVITY_STORAGE_KEY}:${this.session.id}`, JSON.stringify(this.knownActivityIds));
          const actionableFresh = fresh.filter((event) => this.actionableEvents.some((item) => item.id === event.id) && !this.seenActivityIds.includes(event.id));
          const importantNotice = actionableFresh.filter((event) => event.type === 'employee.joined' || event.type === 'employee.removed');
          if ((hasBaseline && actionableFresh.length) || importantNotice.length) window.dispatchEvent(new CustomEvent('coop:sync-summary', { detail: actionableFresh }));
        }
        localStorage.setItem(LAST_SYNC_STORAGE_KEY, snapshot.serverTime);
        this.syncStatus = 'synced';
        window.dispatchEvent(new CustomEvent('coop:remote-sync'));
        if (snapshot.revoked) this.clearSession('Tài khoản nhân viên đã bị CHT thu hồi. Hãy đăng nhập hoặc tham gia lại cửa hàng nếu cần.');
        return snapshot;
      } catch (error) {
        if (/\b401\b/.test(error instanceof Error ? error.message : '')) {
          this.clearSession('Phiên thiết bị không còn hiệu lực. Hãy đăng nhập hoặc tham gia lại cửa hàng.');
          error = new Error('Phiên thiết bị không còn hiệu lực. Hãy đăng nhập lại.');
        }
        this.syncStatus = 'error';
        this.syncError = error instanceof Error ? error.message : 'Đồng bộ thất bại.';
        throw error;
      }
    },
  },
});
