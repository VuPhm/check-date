import { randomBytes, scryptSync } from 'node:crypto';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const [command, code, managerPassword, joinCode, ...nameParts] = process.argv.slice(2);
const databaseFile = resolve(process.env.PILOT_DB_FILE || 'data/pilot-api.sqlite');

function passwordHash(value) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(value, salt, 32).toString('hex')}`;
}
function usage() {
  console.error('Dùng: node server/manage-pilot.mjs add-store <mã 4 số> <mật khẩu CHT> <PIN 4 số> [tên cửa hàng]');
  process.exitCode = 1;
}

if (command !== 'add-store' || !/^\d{4}$/.test(code || '') || !(managerPassword || '').trim() || !/^\d{4}$/.test(joinCode || '')) usage();
else if (!existsSync(databaseFile)) {
  console.error(`Chưa tìm thấy cơ sở dữ liệu: ${databaseFile}. Hãy khởi động API ít nhất một lần.`);
  process.exitCode = 1;
} else {
  const db = new DatabaseSync(databaseFile);
  db.exec('PRAGMA busy_timeout = 5000;');
  const existing = db.prepare('SELECT id FROM stores WHERE code = ?').get(code);
  if (existing) { console.error(`Mã cửa hàng ${code} đã tồn tại.`); process.exitCode = 1; }
  else {
    const name = nameParts.join(' ').trim() || `Co.op Food ${code}`;
    db.prepare('INSERT INTO stores (id, code, name, password_hash, join_code_hash) VALUES (?, ?, ?, ?, ?)').run(code, code, name, passwordHash(managerPassword), passwordHash(joinCode));
    console.log(`Đã tạo cửa hàng ${code}: ${name}`);
  }
  db.close();
}
