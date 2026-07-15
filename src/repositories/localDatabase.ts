import Dexie, { type EntityTable } from 'dexie';
import type { HistoryLog, KphLog } from '../domain/types';

export interface SyncChange { id: string; branchId: string; kind: 'kph' | 'history'; recordId: string; record: KphLog | HistoryLog; }
export interface SyncState { branchId: string; cursor: string; }

const DB_NAME = 'coop_kph_db';

class CoopDateDatabase extends Dexie {
  kph_logs!: EntityTable<KphLog, 'id'>;
  history_logs!: EntityTable<HistoryLog, 'id'>;
  sync_outbox!: EntityTable<SyncChange, 'id'>;
  sync_state!: EntityTable<SyncState, 'branchId'>;

  constructor() {
    super(DB_NAME);
    // Dexie scales version values internally. 0.2 maps to the existing native
    // IndexedDB version 2, so this migration keeps current user data intact.
    this.version(0.2).stores({
      kph_logs: 'id',
      history_logs: 'id',
    });
    this.version(0.3).stores({
      kph_logs: 'id', history_logs: 'id', sync_outbox: 'id, branchId', sync_state: 'branchId',
    });
  }
}

export const localDatabase = new CoopDateDatabase();

export async function initDB(): Promise<CoopDateDatabase> {
  if (!localDatabase.isOpen()) await localDatabase.open();
  return localDatabase;
}

export async function getAllLogs(): Promise<KphLog[]> {
  await initDB();
  return localDatabase.kph_logs.toArray();
}

export async function addLog(log: KphLog): Promise<void> {
  await initDB();
  await localDatabase.transaction('rw', localDatabase.kph_logs, localDatabase.sync_outbox, async () => {
    await localDatabase.kph_logs.put(log); await queueChange('kph', log);
  });
}

export async function deleteLog(id: string): Promise<void> {
  await initDB();
  await localDatabase.kph_logs.delete(id);
}

/** Keep a deletion marker until every paired device has received it. A hard
 * delete lets an offline device upload its stale copy and resurrect a log. */
export async function softDeleteLog(log: KphLog): Promise<void> {
  await initDB();
  const now = new Date().toISOString();
  const deleted = {
    ...log,
    image: undefined,
    images: undefined,
    deletedAt: now,
    updatedAt: now,
    version: (typeof log.version === 'number' ? log.version : 0) + 1,
  }; await localDatabase.transaction('rw', localDatabase.kph_logs, localDatabase.sync_outbox, async () => { await localDatabase.kph_logs.put(deleted); await queueChange('kph', deleted); });
}

export async function clearAllLogs(): Promise<void> {
  await initDB();
  await localDatabase.kph_logs.clear();
}

export async function getAllHistoryLogs(): Promise<HistoryLog[]> {
  await initDB();
  return localDatabase.history_logs.toArray();
}

export async function addHistoryLog(log: HistoryLog): Promise<void> {
  await initDB();
  await localDatabase.transaction('rw', localDatabase.history_logs, localDatabase.sync_outbox, async () => { await localDatabase.history_logs.put(log); await queueChange('history', log); });
}

export async function deleteHistoryLog(id: string): Promise<void> {
  await initDB();
  await localDatabase.history_logs.delete(id);
}

export async function softDeleteHistoryLog(log: HistoryLog): Promise<void> {
  await initDB();
  const now = new Date().toISOString();
  const deleted = {
    ...log,
    deletedAt: now,
    updatedAt: now,
    version: (typeof log.version === 'number' ? log.version : 0) + 1,
  }; await localDatabase.transaction('rw', localDatabase.history_logs, localDatabase.sync_outbox, async () => { await localDatabase.history_logs.put(deleted); await queueChange('history', deleted); });
}

async function queueChange(kind: SyncChange['kind'], record: KphLog | HistoryLog): Promise<void> {
  if (!record.branchId) return;
  await localDatabase.sync_outbox.put({ id: `${kind}:${record.id}`, branchId: record.branchId, kind, recordId: record.id, record });
  window.dispatchEvent(new CustomEvent('coop:local-change'));
}

export async function getPendingChanges(branchId: string): Promise<SyncChange[]> { await initDB(); return localDatabase.sync_outbox.where('branchId').equals(branchId).toArray(); }
export async function acknowledgeChanges(ids: string[]): Promise<void> { await initDB(); await localDatabase.sync_outbox.bulkDelete(ids); }
export async function getSyncCursor(branchId: string): Promise<string | null> { await initDB(); return (await localDatabase.sync_state.get(branchId))?.cursor || null; }
export async function setSyncCursor(branchId: string, cursor: string): Promise<void> { await initDB(); await localDatabase.sync_state.put({ branchId, cursor }); }
export async function assignUnboundRecords(branchId: string, userId: string): Promise<void> {
  await initDB();
  await localDatabase.transaction('rw', localDatabase.kph_logs, localDatabase.history_logs, localDatabase.sync_outbox, async () => {
    for (const record of await localDatabase.kph_logs.toArray()) if (!record.branchId) { const bound = { ...record, branchId, createdBy: record.createdBy || userId, updatedBy: userId }; await localDatabase.kph_logs.put(bound); await queueChange('kph', bound); }
    for (const record of await localDatabase.history_logs.toArray()) if (!record.branchId) { const bound = { ...record, branchId, createdBy: record.createdBy || userId, updatedBy: userId }; await localDatabase.history_logs.put(bound); await queueChange('history', bound); }
  });
}

export async function clearAllHistoryLogs(): Promise<void> {
  await initDB();
  await localDatabase.history_logs.clear();
}

/** Merge the server snapshot. Deleted records are tombstones and must remain
 * locally until all paired devices have had a chance to receive them. */
export async function mergeSyncSnapshot(kphLogs: KphLog[], historyLogs: HistoryLog[]): Promise<void> {
  await initDB();
  await localDatabase.transaction('rw', localDatabase.kph_logs, localDatabase.history_logs, async () => {
    await localDatabase.kph_logs.bulkPut(kphLogs);
    await localDatabase.history_logs.bulkPut(historyLogs);
  });
}
