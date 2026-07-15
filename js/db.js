// Compatibility bridge while history.js and kph.js are migrated to Vue.
export {
    initDB,
    getAllLogs,
    addLog,
    deleteLog,
    softDeleteLog,
    clearAllLogs,
    getAllHistoryLogs,
    addHistoryLog,
    deleteHistoryLog,
    softDeleteHistoryLog,
    clearAllHistoryLogs,
    getPendingChanges,
    acknowledgeChanges,
    getSyncCursor,
    setSyncCursor,
    assignUnboundRecords
} from '../src/repositories/localDatabase.ts';
