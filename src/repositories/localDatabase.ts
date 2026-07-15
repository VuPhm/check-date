import Dexie, { type EntityTable } from 'dexie';
import type { HistoryLog, KphLog } from '../domain/types';

const DB_NAME = 'coop_kph_db';

class CoopDateDatabase extends Dexie {
  kph_logs!: EntityTable<KphLog, 'id'>;
  history_logs!: EntityTable<HistoryLog, 'id'>;

  constructor() {
    super(DB_NAME);
    // Dexie scales version values internally. 0.2 maps to the existing native
    // IndexedDB version 2, so this migration keeps current user data intact.
    this.version(0.2).stores({
      kph_logs: 'id',
      history_logs: 'id',
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
  await localDatabase.kph_logs.put(log);
}

export async function deleteLog(id: string): Promise<void> {
  await initDB();
  await localDatabase.kph_logs.delete(id);
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
  await localDatabase.history_logs.put(log);
}

export async function deleteHistoryLog(id: string): Promise<void> {
  await initDB();
  await localDatabase.history_logs.delete(id);
}

export async function clearAllHistoryLogs(): Promise<void> {
  await initDB();
  await localDatabase.history_logs.clear();
}
