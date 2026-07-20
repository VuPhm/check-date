import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { createServer } from 'node:http';
import { mkdirSync, statfsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const port = Number(process.env.PORT || 8787);
const databaseFile = resolve(process.env.PILOT_DB_FILE || 'data/pilot-api.sqlite');
const bootstrapStoreCode = String(process.env.PILOT_STORE_CODE || '');
const bootstrapManagerPassword = String(process.env.PILOT_MANAGER_PASSWORD || '');
const bootstrapJoinCode = String(process.env.PILOT_JOIN_CODE || '');
const sessionDays = Math.min(Math.max(Number(process.env.SESSION_DAYS || 7), 1), 30);
const maxBodyBytes = 12 * 1024 * 1024;
const maxChangesPerSync = 100;
const authWindowMs = Number(process.env.PILOT_AUTH_WINDOW_MS || 15 * 60 * 1000);
const authBlockMs = Number(process.env.PILOT_AUTH_BLOCK_MS || 15 * 60 * 1000);
const authMaxAttempts = Number(process.env.PILOT_AUTH_MAX_ATTEMPTS || 5);
const systemAdminToken = String(process.env.PILOT_SYSTEM_ADMIN_TOKEN || '');
const backupDirectory = resolve(process.env.PILOT_BACKUP_DIR || resolve(dirname(databaseFile), '../backups'));
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
  CREATE TABLE IF NOT EXISTS auth_rate_limits (scope TEXT PRIMARY KEY, attempts INTEGER NOT NULL, window_started_at TEXT NOT NULL, blocked_until TEXT, updated_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
`);

function applyMigration(version, statement) {
  if (db.prepare('SELECT version FROM schema_migrations WHERE version = ?').get(version)) return;
  db.exec(statement);
  db.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)').run(version, new Date().toISOString());
}

applyMigration(1, 'ALTER TABLE stores ADD COLUMN disabled_at TEXT');
applyMigration(2, 'CREATE TABLE system_audit (id TEXT PRIMARY KEY, action TEXT NOT NULL, details TEXT NOT NULL, created_at TEXT NOT NULL)');

function hash(value) { return createHash('sha256').update(value).digest('hex'); }
function passwordHash(value) { const salt = randomBytes(16).toString('hex'); return `${salt}:${scryptSync(value, salt, 32).toString('hex')}`; }
function passwordMatches(value, stored) { const [salt, expected] = stored.split(':'); const actual = scryptSync(value, salt, 32).toString('hex'); return timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex')); }
function now() { return new Date().toISOString(); }
function one(sql, ...params) { return db.prepare(sql).get(...params); }
function many(sql, ...params) { return db.prepare(sql).all(...params); }
function run(sql, ...params) { return db.prepare(sql).run(...params); }
function json(value) { return JSON.stringify(value); }
function parse(value) { return JSON.parse(value); }
const securityHeaders = {
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'no-referrer',
  'permissions-policy': 'camera=(self), geolocation=(), microphone=()',
  'content-security-policy': "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; connect-src 'self'; img-src 'self' blob: data:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'",
};
function send(response, status, body) { response.writeHead(status, { ...securityHeaders, 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); response.end(JSON.stringify(body)); }
function fail(response, status, error) { send(response, status, { error }); }
function readBody(request) {
  const contentLength = Number(request.headers['content-length'] || 0);
  if (contentLength > maxBodyBytes) return Promise.reject(new Error('Payload quá lớn.'));
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0; let finished = false;
    request.on('data', (chunk) => {
      if (finished) return;
      size += chunk.length;
      if (size > maxBodyBytes) { finished = true; request.resume(); reject(new Error('Payload quá lớn.')); return; }
      chunks.push(chunk);
    });
    request.on('end', () => { if (!finished) { try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); } catch { reject(new Error('Payload JSON không hợp lệ.')); } } });
    request.on('error', reject);
  });
}
function requireText(value, field, max, { min = 1, pattern } = {}) {
  const text = String(value || '').trim();
  if (text.length < min || text.length > max || (pattern && !pattern.test(text))) throw new Error(`${field} không hợp lệ.`);
  return text;
}
function validateRecord(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) throw new Error('Bản ghi đồng bộ không hợp lệ.');
  requireText(record.id, 'Mã bản ghi', 128);
  if (Buffer.byteLength(JSON.stringify(record), 'utf8') > maxBodyBytes) throw new Error('Bản ghi đồng bộ quá lớn.');
  return record;
}
function seedStore() {
  if (one('SELECT id FROM stores LIMIT 1')) return;
  if (!/^\d{4}$/.test(bootstrapStoreCode) || !/^\d{4}$/.test(bootstrapJoinCode) || bootstrapManagerPassword.length < 12) {
    console.warn('Pilot khởi động không có cửa hàng. Hoàn tất Setup để tạo CHT và PIN đầu tiên.');
    return;
  }
  run('INSERT INTO stores (id, code, name, password_hash, join_code_hash) VALUES (?, ?, ?, ?, ?)', bootstrapStoreCode, bootstrapStoreCode, `Co.op Food ${bootstrapStoreCode}`, passwordHash(bootstrapManagerPassword), passwordHash(bootstrapJoinCode));
}
seedStore();

function clientIp(request) {
  const forwarded = request.headers['cf-connecting-ip'];
  if (typeof forwarded === 'string' && forwarded.trim()) return forwarded.trim();
  return request.socket.remoteAddress || 'unknown';
}
function authScopes(kind, storeCode, request) {
  const code = String(storeCode || '').replace(/\D/g, '').slice(0, 4) || 'unknown';
  const ip = clientIp(request);
  return [
    { scope: `${kind}:store-ip:${code}:${ip}`, maxAttempts: authMaxAttempts },
    { scope: `${kind}:ip:${ip}`, maxAttempts: authMaxAttempts * 6 },
  ];
}
function isAuthBlocked(scopes) {
  const timestamp = Date.now();
  return scopes.some(({ scope }) => {
    const row = one('SELECT blocked_until FROM auth_rate_limits WHERE scope = ?', scope);
    return row?.blocked_until && Date.parse(row.blocked_until) > timestamp;
  });
}
function recordAuthFailure(scopes) {
  const timestamp = Date.now();
  for (const { scope, maxAttempts } of scopes) {
    const row = one('SELECT attempts, window_started_at FROM auth_rate_limits WHERE scope = ?', scope);
    const withinWindow = row && timestamp - Date.parse(row.window_started_at) < authWindowMs;
    const attempts = withinWindow ? Number(row.attempts) + 1 : 1;
    const blockedUntil = attempts >= maxAttempts ? new Date(timestamp + authBlockMs).toISOString() : null;
    run('INSERT OR REPLACE INTO auth_rate_limits (scope, attempts, window_started_at, blocked_until, updated_at) VALUES (?, ?, ?, ?, ?)', scope, attempts, withinWindow ? row.window_started_at : now(), blockedUntil, now());
  }
}
function clearAuthFailures(scopes) { for (const { scope } of scopes) run('DELETE FROM auth_rate_limits WHERE scope = ?', scope); }
function systemAuthorized(request) {
  const provided = request.headers['x-pilot-system-token'];
  const remote = request.socket.remoteAddress;
  if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(remote || '') || request.headers['cf-connecting-ip'] || request.headers['x-forwarded-for']) return false;
  if (!systemAdminToken || typeof provided !== 'string') return false;
  const expected = Buffer.from(systemAdminToken); const actual = Buffer.from(provided);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
function systemAudit(action, details = {}) { run('INSERT INTO system_audit VALUES (?, ?, ?, ?)', randomUUID(), action, json(details), now()); }
function createPilotBackup() {
  const name = `pilot-${now().replace(/[:.]/g, '-')}.sqlite`;
  const destination = resolve(backupDirectory, name);
  mkdirSync(backupDirectory, { recursive: true });
  db.exec(`VACUUM INTO '${destination.replace(/'/g, "''")}'`);
  systemAudit('backup.created', { filename: name });
  return { filename: name, path: destination, createdAt: now() };
}
function systemHealth() {
  const filesystem = statfsSync(dirname(databaseFile));
  return {
    ok: true,
    mode: 'pilot-host',
    branchCount: one('SELECT COUNT(*) AS count FROM stores WHERE disabled_at IS NULL').count,
    databaseWritable: db.isOpen,
    diskFreeBytes: Number(filesystem.bavail) * Number(filesystem.bsize),
    backupDirectory,
  };
}

function sessionFrom(request) {
  const token = request.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const row = one('SELECT sessions.* FROM sessions JOIN stores ON stores.id = sessions.branch_id WHERE sessions.token_hash = ? AND stores.disabled_at IS NULL', hash(token));
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
function storeByCode(code) { return one('SELECT * FROM stores WHERE code = ? AND disabled_at IS NULL', String(code || '')); }
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
  const displayName = profile.displayName === undefined ? '' : requireText(profile.displayName, 'Tên hiển thị', 100);
  if (displayName && displayName !== session.displayName) {
    run('UPDATE sessions SET display_name = ? WHERE user_id = ? AND branch_id = ? AND revoked_at IS NULL', displayName, session.id, session.branchId);
    if (session.role === 'manager') run('UPDATE stores SET manager_name = ? WHERE id = ?', displayName, session.branchId);
    else run('UPDATE employees SET display_name = ? WHERE id = ? AND branch_id = ?', displayName, session.id, session.branchId);
    session.displayName = displayName;
  }
  const storeName = profile.storeName === undefined ? '' : requireText(profile.storeName, 'Tên cửa hàng', 150);
  if (session.role === 'manager' && storeName) run('UPDATE stores SET name = ? WHERE id = ?', storeName, session.branchId);
}
function mergeChange(kind, session, record) {
  validateRecord(record);
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

export function createPilotApiHandler() {
  return async (request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host}`); const path = url.pathname.replace(/^\/api/, '') || '/';
  if (request.method === 'OPTIONS') return fail(response, 405, 'CORS không được hỗ trợ.');
  if (request.method === 'GET' && path === '/health') return send(response, 200, { ok: true, mode: 'pilot-api', branchCount: one('SELECT COUNT(*) AS count FROM stores WHERE disabled_at IS NULL').count });
  if (request.method === 'GET' && path === '/v1/events') {
    const session = sessionFrom(request);
    if (!session) return fail(response, 401, 'Phiên không hợp lệ.');
    response.writeHead(200, { ...securityHeaders, 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' }); response.write(': connected\n\n');
    const set = clients.get(session.branchId) || new Set(); set.add(response); clients.set(session.branchId, set); request.on('close', () => set.delete(response)); return;
  }
  try {
    if (path.startsWith('/v1/system/')) {
      if (!systemAuthorized(request)) return fail(response, 401, 'Không có quyền quản trị hệ thống.');
      if (request.method === 'GET' && path === '/v1/system/health') return send(response, 200, systemHealth());
      if (request.method === 'GET' && path === '/v1/system/stores') return send(response, 200, { stores: many('SELECT code, name, manager_name, disabled_at, revision FROM stores ORDER BY code').map((store) => ({ code: store.code, name: store.name, managerName: store.manager_name || '', disabled: Boolean(store.disabled_at), revision: store.revision })) });
      if (request.method === 'POST' && path === '/v1/system/stores') {
        const body = await readBody(request); const code = requireText(body.code, 'Mã cửa hàng', 4, { pattern: /^\d{4}$/ }); const name = body.name ? requireText(body.name, 'Tên cửa hàng', 150) : `Co.op Food ${code}`; const joinCode = requireText(body.joinCode, 'Mã PIN', 4, { pattern: /^\d{4}$/ }); const password = requireText(body.password, 'Mật khẩu', 256, { min: 12 });
        if (one('SELECT id FROM stores WHERE code = ?', code)) return fail(response, 409, 'Mã cửa hàng đã tồn tại.');
        run('INSERT INTO stores (id, code, name, password_hash, join_code_hash) VALUES (?, ?, ?, ?, ?)', code, code, name, passwordHash(password), passwordHash(joinCode));
        systemAudit('store.created', { code, name }); return send(response, 201, { code, name });
      }
      const systemStoreCode = path.match(/^\/v1\/system\/stores\/(\d{4})$/)?.[1];
      if (request.method === 'PATCH' && systemStoreCode) {
        const body = await readBody(request); const store = one('SELECT * FROM stores WHERE code = ?', systemStoreCode); if (!store) return fail(response, 404, 'Không tìm thấy cửa hàng.');
        if (typeof body.name === 'string' && body.name.trim()) run('UPDATE stores SET name = ? WHERE code = ?', body.name.trim(), systemStoreCode);
        if (typeof body.disabled === 'boolean') { run('UPDATE stores SET disabled_at = ? WHERE code = ?', body.disabled ? now() : null, systemStoreCode); if (body.disabled) run('UPDATE sessions SET revoked_at = ? WHERE branch_id = ?', now(), store.id); }
        systemAudit('store.updated', { code: systemStoreCode, disabled: body.disabled }); return send(response, 200, { ok: true });
      }
      if (request.method === 'POST' && path === '/v1/system/backups') return send(response, 201, createPilotBackup());
      return fail(response, 404, 'Không tìm thấy quản trị hệ thống.');
    }
    if (request.method === 'POST' && path === '/v1/auth/manager/login') {
      const body = await readBody(request); const scopes = authScopes('manager', body.storeCode, request);
      if (isAuthBlocked(scopes)) return fail(response, 429, 'Thử lại sau ít phút.');
      const store = storeByCode(body.storeCode); if (!store || !passwordMatches(String(body.password || ''), store.password_hash)) { recordAuthFailure(scopes); return fail(response, 401, 'Mã cửa hàng hoặc mật khẩu không đúng.'); }
      clearAuthFailures(scopes);
      const name = String(body.displayName || store.manager_name || `CHT ${store.code}`).trim(); if (name !== store.manager_name) run('UPDATE stores SET manager_name = ? WHERE id = ?', name, store.id);
      return send(response, 200, { session: createSession(store, 'manager', `manager:${store.id}`, name, String(body.deviceName || 'Thiết bị CHT')) });
    }
    if (request.method === 'POST' && path === '/v1/auth/employee/join') {
      const body = await readBody(request); const scopes = authScopes('employee', body.storeCode, request);
      if (isAuthBlocked(scopes)) return fail(response, 429, 'Thử lại sau ít phút.');
      const store = storeByCode(body.storeCode); if (!store || !passwordMatches(String(body.joinCode || ''), store.join_code_hash)) { recordAuthFailure(scopes); return fail(response, 401, 'Mã cửa hàng hoặc mã tham gia không đúng.'); }
      clearAuthFailures(scopes);
      const displayName = String(body.displayName || '').trim(); const employeeCode = String(body.employeeCode || '').trim(); if (!displayName || !employeeCode) return fail(response, 400, 'Cần họ tên và mã nhân viên.');
      let employee = one('SELECT * FROM employees WHERE branch_id = ? AND employee_code = ?', store.id, employeeCode); if (!employee) { const id = randomUUID(); run('INSERT INTO employees VALUES (?, ?, ?, ?, 1)', id, store.id, displayName, employeeCode); employee = one('SELECT * FROM employees WHERE id = ?', id); nextRevision(store.id); appendEmployeeJoined(store, employee); publish(store.id); } if (!employee.active) return fail(response, 403, 'Tài khoản nhân viên đã bị xóa.');
      if (employee.display_name !== displayName) run('UPDATE employees SET display_name = ? WHERE id = ?', displayName, employee.id);
      return send(response, 200, { session: createSession(store, 'employee', employee.id, displayName, String(body.deviceName || 'Thiết bị nhân viên')) });
    }
    const session = sessionFrom(request); if (!session) return fail(response, 401, 'Thiết bị chưa được ghép hoặc đã bị thu hồi.');
    if (request.method === 'POST' && path === '/v1/sync') {
      const body = await readBody(request); updateProfile(session, body.profile); const changes = Array.isArray(body.changes) ? body.changes : []; if (changes.length > maxChangesPerSync) throw new Error('Quá nhiều thay đổi trong một lần đồng bộ.'); const acceptedChangeIds = [];
      for (const change of changes) if (change?.kind === 'kph' || change?.kind === 'history') if (mergeChange(change.kind, session, change.record)) acceptedChangeIds.push(change.id);
      const cursor = Number(body.cursor || 0) || 0; const store = one('SELECT * FROM stores WHERE id = ?', session.branchId); const records = many('SELECT * FROM records WHERE branch_id = ? AND server_revision > ?', session.branchId, cursor);
      const snapshot = { branchId: session.branchId, serverTime: now(), cursor: String(store.revision), acceptedChangeIds, activityEvents: many('SELECT body FROM activity WHERE branch_id = ? ORDER BY created_at DESC LIMIT 50', session.branchId).map((row) => parse(row.body)), kphLogs: records.filter((row) => row.kind === 'kph').map((row) => parse(row.body)), historyLogs: records.filter((row) => row.kind === 'history').map((row) => parse(row.body)), profile: { displayName: session.displayName, managerName: store.manager_name || '', storeName: store.name }, revoked: false };
      run('UPDATE sessions SET last_seen_at = ? WHERE token_hash = ?', now(), session.tokenHash); if (acceptedChangeIds.length) publish(session.branchId); return send(response, 200, snapshot);
    }
    if (path === '/v1/store/administration') {
      if (session.role !== 'manager') return fail(response, 403, 'Chỉ CHT được quản trị cửa hàng.'); const store = one('SELECT * FROM stores WHERE id = ?', session.branchId);
      if (request.method === 'GET') return send(response, 200, { employees: many('SELECT id, display_name, employee_code, active FROM employees WHERE branch_id = ? AND active = 1', session.branchId).map((row) => ({ id: row.id, displayName: row.display_name, employeeCode: row.employee_code, active: Boolean(row.active) })), devices: many('SELECT device_id, user_id, display_name, role, device_name, last_seen_at FROM sessions WHERE branch_id = ? AND revoked_at IS NULL', session.branchId).map((row) => ({ deviceId: row.device_id, userId: row.user_id, displayName: row.display_name, role: row.role, deviceName: row.device_name, lastSeenAt: row.last_seen_at })) });
      if (request.method === 'PATCH') { const body = await readBody(request); let sessionsRevoked = false; if (body.password !== undefined) { run('UPDATE stores SET password_hash = ? WHERE id = ?', passwordHash(requireText(body.password, 'Mật khẩu', 256, { min: 12 })), store.id); run("UPDATE sessions SET revoked_at = ? WHERE branch_id = ? AND role = 'manager' AND revoked_at IS NULL", now(), session.branchId); sessionsRevoked = true; } if (body.joinCode !== undefined) run('UPDATE stores SET join_code_hash = ? WHERE id = ?', passwordHash(requireText(body.joinCode, 'Mã PIN', 4, { pattern: /^\d{4}$/ })), store.id); return send(response, 200, { ok: true, sessionsRevoked }); }
    }
    const deviceId = path.match(/^\/v1\/store\/devices\/([^/]+)$/)?.[1]; if (request.method === 'DELETE' && deviceId && session.role === 'manager') { run('UPDATE sessions SET revoked_at = ? WHERE device_id = ? AND branch_id = ?', now(), deviceId, session.branchId); return send(response, 200, { ok: true }); }
    const employeeId = path.match(/^\/v1\/store\/employees\/([^/]+)$/)?.[1]; if (request.method === 'DELETE' && employeeId && session.role === 'manager') { run('UPDATE employees SET active = 0 WHERE id = ? AND branch_id = ?', employeeId, session.branchId); run('UPDATE sessions SET revoked_at = ? WHERE user_id = ?', now(), employeeId); publish(session.branchId); return send(response, 200, { ok: true }); }
    return fail(response, 404, 'Không tìm thấy endpoint.');
  } catch (error) { return fail(response, 400, error instanceof Error ? error.message : 'Yêu cầu không hợp lệ.'); }
  };
}

export function createPilotApiServer() {
  return createServer(createPilotApiHandler());
}

export function closePilotDatabase() {
  if (db.isOpen) db.close();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = createPilotApiServer();
  server.listen(port, '0.0.0.0', () => console.log(`Pilot API running on :${port}; database: ${databaseFile}`));
}
