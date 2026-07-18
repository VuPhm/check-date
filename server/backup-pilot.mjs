import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const source = resolve(process.env.PILOT_DB_FILE || 'data/pilot-api.sqlite');
const destination = resolve(process.argv[2] || `backups/pilot-api-${new Date().toISOString().replace(/[:.]/g, '-')}.sqlite`);
const quotedDestination = destination.replace(/'/g, "''");
mkdirSync(dirname(destination), { recursive: true });
const db = new DatabaseSync(source);
db.exec('PRAGMA busy_timeout = 5000;');
db.exec(`VACUUM INTO '${quotedDestination}'`);
db.close();
console.log(`Đã sao lưu nhất quán: ${destination}`);
