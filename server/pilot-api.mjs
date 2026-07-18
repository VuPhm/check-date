import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { createServer } from 'node:http';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const port = Number(process.env.PORT || 8787);
const databaseFile = resolve(process.env.PILOT_DB_FILE || 'data/pilot-api.sqlite');
const defaultStoreCode = String(process.env.PILOT_STORE_CODE || '0001');
const defaultManagerPassword = String(process.env.PILOT_MANAGER_PASSWORD || defaultStoreCode);
const defaultJoinCode = String(process.env.PILOT_JOIN_CODE || '1234');
const sessionDays = Number(process.env.SESSION_DAYS || 30);
const clients = new Map();

mkdirSync(dirname(databaseFile), { recursive: true });
const db = new DatabaseSync(databaseFile);
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
db.exec(`
  CREATE TABLE IF NOT EXISTS stores (id TEXT PRIMARY KEY, code TEXT UNIQUE NOT NULL, name TEXT NOT NULL, manager_name TEXT, password_hash TEXT NOT NULL, join_code_hash TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0);
  CREATE TABLE IF NOT EXISTS employees (id TEXT PRIMARY KEY, branch_id TEXT NOT NULL, display_name TEXT NOT NULL, employee_code TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1, UNIQUE(branch_id, employee_code));
  CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, device_id TEXT NOT NULL, user_id TEXT NOT NULL, branch_id TEXT NOT NULL, display_name TEXT NOT NULL, role TEXT NOT NULL, device_name TEXT NOT NULL, expires_at TEXT NOT NULL, revoked_at TEXT, last_seen_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS records (kind TEXT NOT NULL, branch_id TEXT NOT NULL, id TEXT NOT NULL, body TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL, deleted_at TEXT, server_revision INTEGER NOT NULL, PRIMARY KEY(kind, branch_id, id));
  CREATE TABLE IF NOT EXISTS activity (id TEXT PRIMARY KEY, branch_id TEXT NOT NULL, body TEXT NOT NULL, created_at TEXT NOT NULL);
`);

function hash(value) { return createHash('sha256').update(value).digest('hex'); }
function passwordHash(value) { const salt = randomBytes(16).toString('hex'); return `${salt}:${scryptSync(value, salt, 32).toString('hex')}`; }
function passwordMatches(value, stored) { const [salt, expected] = stored.split(':'); const actual = scryptSync(value, salt, 32).toString('hex'); return timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex')); }
function now() { return new Date().toISOString(); }
function one(sql, ...params) { return db.prepare(sql).get(...params); }
function many(sql, ...params) { return db.prepare(sql).all(...params); }
function run(sql, ...params) { return db.prepare(sql).run(...params); }
function json(value) { return JSON.stringify(value); }
function parse(value) { return JSON.parse(value); }
function send(response, status, body) { response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type, authorization', 'access-control-allow-methods': 'GET, POST, PATCH, DELETE, OPTIONS' }); response.end(JSON.stringify(body)); }
function fail(response, status, error) { send(response, status, { error }); }
function readBody(request) { return new Promise((resolve, reject) => { let raw = ''; request.on('data', (chunk) => { raw += chunk; if (raw.length > 15 * 1024 * 1024) reject(new Error('Payload quá lớn.')); }); request.on('end', () => { try { resolve(JSON.parse(raw || '{}')); } catch { reject(new Error('Payload JSON không hợp lệ.')); } }); }); }
function seedStore() { if (!one('SELECT id FROM stores WHERE code = ?', defaultStoreCode)) run('INSERT INTO stores (id, code, name, password_hash, join_code_hash) VALUES (?, ?, ?, ?, ?)', defaultStoreCode, defaultStoreCode, `Co.op Food ${defaultStoreCode}`, passwordHash(defaultManagerPassword), passwordHash(defaultJoinCode)); }
seedStore();

function sessionFrom(request) {
  const token = request.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const row = one('SELECT * FROM sessions WHERE token_hash = ?', hash(token));
  if (!row || row.revoked_at || Date.parse(row.expires_at) <= Date.now()) return null;
  return { tokenHash: row.token_hash, deviceId: row.device_id, id: row.user_id, branchId: row.branch_id, displayName: row.display_name, role: row.role, deviceName: row.device_name };
}
function publicSession(session, token) { return { id: session.id, displayName: session.displayName, role: session.role, branchId: session.branchId, deviceId: session.deviceId, accessToken: token }; }
function createSession(store, role, userId, displayName, deviceName) {
  const token = randomBytes(32).toString('base64url'); const deviceId = randomUUID(); const expiresAt = new Date(Date.now() + sessionDays * 86400000).toISOString();
  run('INSERT INTO sessions VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)', hash(token), deviceId, userId, store.id, displayName, role, deviceName, expiresAt, now());
  return publicSession({ id: userId, displayName, role, branchId: store.id, deviceId }, token);
}
function nextRevision(branchId) { run('UPDATE stores SET revision = revision + 1 WHERE id = ?', branchId); return one('SELECT revision FROM stores WHERE id = ?', branchId).revision; }
function publish(branchId) { for (const response of clients.get(branchId) || []) response.write('event: branch-changed\ndata: {}\n\n'); }
function storeByCode(code) { return one('SELECT * FROM stores WHERE code = ?', String(code || '')); }
function isDeleted(record) { return Boolean(record?.deletedAt); }
function storedRecord(kind, branchId, id) { const row = one('SELECT * FROM records WHERE kind = ? AND branch_id = ? AND id = ?', kind, branchId, id); return row ? { row, record: parse(row.body) } : null; }
function newer(incoming, existing) { const iv = Number(incoming.version || 0); const ev = Number(existing.version || 0); if (iv !== ev) return iv > ev; return Date.parse(incoming.updatedAt || incoming.createdAt || 0) >= Date.parse(existing.updatedAt || existing.createdAt || 0); }
function appendActivity(session, record, previous) {
  const status = record.trangThaiDuyet; const type = record.deletedAt ? 'kph.deleted' : status === 'da_duyet' ? 'kph.approved' : status === 'khong_duyet' ? 'kph.rejected' : 'kph.created';
  const verb = type === 'kph.deleted' ? 'đã xóa' : type === 'kph.approved' ? 'đã duyệt' : type === 'kph.rejected' ? 'đã không duyệt' : previous ? 'đã cập nhật' : 'đã tạo';
  const body = { id: randomUUID(), branchId: session.branchId, type, recordId: record.id, actorName: session.displayName, actorRole: session.role, targetUserId: record.createdBy, summary: `${session.displayName} ${verb} phiếu: ${record.tenHang || record.sku || 'KPH'}`, createdAt: now() };
  run('INSERT INTO activity VALUES (?, ?, ?, ?)', body.id, session.branchId, json(body), body.createdAt);
}
function appendEmployeeJoined(store, employee) {
  const body = { id: randomUUID(), branchId: store.id, type: 'employee.joined', recordId: employee.id, actorName: employee.display_name, actorRole: 'employee', targetUserId: `manager:${store.id}`, summary: `${employee.display_name} đã tham gia cửa hàng`, createdAt: now() };
  run('INSERT INTO activity VALUES (?, ?, ?, ?)', body.id, store.id, json(body), body.createdAt);
}
function updateProfile(session, profile) {
  if (!profile || typeof profile !== 'object') return;
  const displayName = String(profile.displayName || '').trim();
  if (displayName && displayName !== session.displayName) {
    run('UPDATE sessions SET display_name = ? WHERE user_id = ? AND branch_id = ? AND revoked_at IS NULL', displayName, session.id, session.branchId);
    if (session.role === 'manager') run('UPDATE stores SET manager_name = ? WHERE id = ?', displayName, session.branchId);
    else run('UPDATE employees SET display_name = ? WHERE id = ? AND branch_id = ?', displayName, session.id, session.branchId);
    session.displayName = displayName;
  }
  const storeName = String(profile.storeName || '').trim();
  if (session.role === 'manager' && storeName) run('UPDATE stores SET name = ? WHERE id = ?', storeName, session.branchId);
}
function mergeChange(kind, session, record) {
  if (!record?.id) return false;
  const existing = storedRecord(kind, session.branchId, record.id);
  if (kind === 'kph' && session.role === 'employee') {
    if (!existing && isDeleted(record)) return false;
    if (!existing) { record = { ...record, createdBy: session.id, updatedBy: session.id, branchId: session.branchId }; }
    else if (!(isDeleted(record) && existing.record.createdBy === session.id && (existing.record.trangThaiDuyet || 'cho_duyet') === 'cho_duyet')) return false;
  }
  if (record.branchId && record.branchId !== session.branchId) return false;
  if (existing && !newer(record, existing.record)) return true;
  const timestamp = now(); const revision = nextRevision(session.branchId); const normalized = isDeleted(record) ? { ...record, deletedAt: timestamp, updatedAt: timestamp, serverRevision: revision } : { ...record, branchId: session.branchId, serverRevision: revision, serverUpdatedAt: timestamp };
  run('INSERT OR REPLACE INTO records VALUES (?, ?, ?, ?, ?, ?, ?, ?)', kind, session.branchId, record.id, json(normalized), Number(normalized.version || 0), normalized.updatedAt || normalized.createdAt || timestamp, normalized.deletedAt || null, revision);
  if (kind === 'kph') appendActivity(session, normalized, existing?.record);
  return true;
}

createServer(async (request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host}`); const path = url.pathname.replace(/^\/api/, '') || '/';
  if (request.method === 'OPTIONS') return send(response, 204, {});
  if (request.method === 'GET' && path === '/health') return send(response, 200, { ok: true, mode: 'pilot-api', branchCount: one('SELECT COUNT(*) AS count FROM stores').count });
  if (request.method === 'GET' && path === '/v1/events') {
    const row = one('SELECT * FROM sessions WHERE token_hash = ?', hash(url.searchParams.get('access_token') || ''));
    if (!row || row.revoked_at || Date.parse(row.expires_at) <= Date.now()) return fail(response, 401, 'Phiên không hợp lệ.');
    response.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' }); response.write(': connected\n\n');
    const set = clients.get(row.branch_id) || new Set(); set.add(response); clients.set(row.branch_id, set); request.on('close', () => set.delete(response)); return;
  }
  try {
    if (request.method === 'POST' && path === '/v1/auth/manager/login') {
      const body = await readBody(request); const store = storeByCode(body.storeCode); if (!store || !passwordMatches(String(body.password || ''), store.password_hash)) return fail(response, 401, 'Mã cửa hàng hoặc mật khẩu không đúng.');
      const name = String(body.displayName || store.manager_name || `CHT ${store.code}`).trim(); if (name !== store.manager_name) run('UPDATE stores SET manager_name = ? WHERE id = ?', name, store.id);
      return send(response, 200, { session: createSession(store, 'manager', `manager:${store.id}`, name, String(body.deviceName || 'Thiết bị CHT')) });
    }
    if (request.method === 'POST' && path === '/v1/auth/employee/join') {
      const body = await readBody(request); const store = storeByCode(body.storeCode); if (!store || !passwordMatches(String(body.joinCode || ''), store.join_code_hash)) return fail(response, 401, 'Mã cửa hàng hoặc mã tham gia không đúng.');
      const displayName = String(body.displayName || '').trim(); const employeeCode = String(body.employeeCode || '').trim(); if (!displayName || !employeeCode) return fail(response, 400, 'Cần họ tên và mã nhân viên.');
      let employee = one('SELECT * FROM employees WHERE branch_id = ? AND employee_code = ?', store.id, employeeCode); if (!employee) { const id = randomUUID(); run('INSERT INTO employees VALUES (?, ?, ?, ?, 1)', id, store.id, displayName, employeeCode); employee = one('SELECT * FROM employees WHERE id = ?', id); nextRevision(store.id); appendEmployeeJoined(store, employee); publish(store.id); } if (!employee.active) return fail(response, 403, 'Tài khoản nhân viên đã bị xóa.');
      if (employee.display_name !== displayName) run('UPDATE employees SET display_name = ? WHERE id = ?', displayName, employee.id);
      return send(response, 200, { session: createSession(store, 'employee', employee.id, displayName, String(body.deviceName || 'Thiết bị nhân viên')) });
    }
    const session = sessionFrom(request); if (!session) return fail(response, 401, 'Thiết bị chưa được ghép hoặc đã bị thu hồi.');
    if (request.method === 'POST' && path === '/v1/sync') {
      const body = await readBody(request); updateProfile(session, body.profile); const changes = Array.isArray(body.changes) ? body.changes : []; const acceptedChangeIds = [];
      for (const change of changes) if (change?.kind === 'kph' || change?.kind === 'history') if (mergeChange(change.kind, session, change.record)) acceptedChangeIds.push(change.id);
      const cursor = Number(body.cursor || 0) || 0; const store = one('SELECT * FROM stores WHERE id = ?', session.branchId); const records = many('SELECT * FROM records WHERE branch_id = ? AND server_revision > ?', session.branchId, cursor);
      const snapshot = { branchId: session.branchId, serverTime: now(), cursor: String(store.revision), acceptedChangeIds, activityEvents: many('SELECT body FROM activity WHERE branch_id = ? ORDER BY created_at DESC LIMIT 50', session.branchId).map((row) => parse(row.body)), kphLogs: records.filter((row) => row.kind === 'kph').map((row) => parse(row.body)), historyLogs: records.filter((row) => row.kind === 'history').map((row) => parse(row.body)), profile: { displayName: session.displayName, managerName: store.manager_name || '', storeName: store.name }, revoked: false };
      run('UPDATE sessions SET last_seen_at = ? WHERE token_hash = ?', now(), session.tokenHash); if (acceptedChangeIds.length) publish(session.branchId); return send(response, 200, snapshot);
    }
    if (path === '/v1/store/administration') {
      if (session.role !== 'manager') return fail(response, 403, 'Chỉ CHT được quản trị cửa hàng.'); const store = one('SELECT * FROM stores WHERE id = ?', session.branchId);
      if (request.method === 'GET') return send(response, 200, { employees: many('SELECT id, display_name, employee_code, active FROM employees WHERE branch_id = ? AND active = 1', session.branchId).map((row) => ({ id: row.id, displayName: row.display_name, employeeCode: row.employee_code, active: Boolean(row.active) })), devices: many('SELECT device_id, user_id, display_name, role, device_name, last_seen_at FROM sessions WHERE branch_id = ? AND revoked_at IS NULL', session.branchId).map((row) => ({ deviceId: row.device_id, userId: row.user_id, displayName: row.display_name, role: row.role, deviceName: row.device_name, lastSeenAt: row.last_seen_at })) });
      if (request.method === 'PATCH') { const body = await readBody(request); if (body.password) run('UPDATE stores SET password_hash = ? WHERE id = ?', passwordHash(String(body.password)), store.id); if (body.joinCode) run('UPDATE stores SET join_code_hash = ? WHERE id = ?', passwordHash(String(body.joinCode)), store.id); return send(response, 200, { ok: true }); }
    }
    const deviceId = path.match(/^\/v1\/store\/devices\/([^/]+)$/)?.[1]; if (request.method === 'DELETE' && deviceId && session.role === 'manager') { run('UPDATE sessions SET revoked_at = ? WHERE device_id = ? AND branch_id = ?', now(), deviceId, session.branchId); return send(response, 200, { ok: true }); }
    const employeeId = path.match(/^\/v1\/store\/employees\/([^/]+)$/)?.[1]; if (request.method === 'DELETE' && employeeId && session.role === 'manager') { run('UPDATE employees SET active = 0 WHERE id = ? AND branch_id = ?', employeeId, session.branchId); run('UPDATE sessions SET revoked_at = ? WHERE user_id = ?', now(), employeeId); publish(session.branchId); return send(response, 200, { ok: true }); }
    return fail(response, 404, 'Không tìm thấy endpoint.');
  } catch (error) { return fail(response, 400, error instanceof Error ? error.message : 'Yêu cầu không hợp lệ.'); }
}).listen(port, '0.0.0.0', () => console.log(`Pilot API running on :${port}; database: ${databaseFile}`));
