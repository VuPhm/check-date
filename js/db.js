// Compatibility bridge while history.js and kph.js are migrated to Vue.
export {
    initDB,
    getAllLogs,
    addLog,
    deleteLog,
    clearAllLogs,
    getAllHistoryLogs,
    addHistoryLog,
    deleteHistoryLog,
    clearAllHistoryLogs
} from '../src/repositories/localDatabase.ts';
