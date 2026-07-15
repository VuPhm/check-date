import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const port = Number(process.env.PORT || 8787);
const dataFile = resolve(process.env.MOCK_DATA_FILE || 'data/mock-central-api.json');
const defaultStores = Array.from({ length: 300 }, (_, index) => {
  const code = String(index + 1).padStart(4, '0');
  return { id: code, code, name: `Co.op Food thử nghiệm ${code}`, password: code, joinCode: '1234' };
});
if (process.env.MOCK_RESET === '1' && existsSync(dataFile)) rmSync(dataFile);
const persisted = existsSync(dataFile) ? JSON.parse(readFileSync(dataFile, 'utf8')) : {};
const stores = persisted.stores || defaultStores;
const storeData = new Map();
const devices = new Map();
const employees = new Map();

for (const employee of persisted.employees || []) employees.set(employee.id, employee);
for (const [branchId, value] of Object.entries(persisted.storeData || {})) {
  storeData.set(branchId, { kph: new Map(value.kph || []), history: new Map(value.history || []), revision: value.revision || 0 });
}
function persist() {
  mkdirSync(dirname(dataFile), { recursive: true });
  writeFileSync(dataFile, JSON.stringify({
    stores, employees: [...employees.values()],
    storeData: Object.fromEntries([...storeData].map(([branchId, value]) => [branchId, { revision: value.revision, kph: [...value.kph], history: [...value.history] }])),
  }, null, 2));
}

function send(response, status, body) {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'access-control-allow-headers': 'content-type, authorization',
  });
  response.end(status === 204 ? undefined : JSON.stringify(body));
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let raw = '';
    request.on('data', (chunk) => { raw += chunk; });
    request.on('end', () => { try { resolve(JSON.parse(raw || '{}')); } catch (error) { reject(error); } });
  });
}

function updatedAt(record) {
  const timestamp = record?.updatedAt || record?.createdAt;
  const time = typeof timestamp === 'string' ? Date.parse(timestamp) : NaN;
  return Number.isFinite(time) ? time : 0;
}

function version(record) {
  return typeof record?.version === 'number' && Number.isFinite(record.version)
    ? record.version
    : 0;
}

function isDeleted(record) {
  return typeof record?.deletedAt === 'string' && record.deletedAt.length > 0;
}

function merge(records, incoming, serverTime, nextRevision = () => 0) {
  for (const record of incoming || []) {
    if (!record?.id) continue;
    const existing = records.get(record.id);
    // A tombstone is valid only for a log the central server has already seen.
    // This prevents a stale/invalid local delete from removing a new log that
    // was first uploaded by another device.
    if (isDeleted(record) && !existing) continue;
    // Older clients do not have sync metadata. Treat their records as older
    // when the server already has a versioned record, so they cannot undo an
    // edit/approval made from another device.
    if (!existing
      || version(record) > version(existing)
      || (version(record) === version(existing) && updatedAt(record) >= updatedAt(existing))) {
      records.set(record.id, isDeleted(record)
        ? { ...record, deletedAt: serverTime, updatedAt: serverTime, serverUpdatedAt: serverTime, serverRevision: nextRevision() }
        : { ...record, serverUpdatedAt: serverTime, serverRevision: nextRevision() });
    }
  }
}

function hasReceivedDeletion(session, record) {
  return Date.parse(session.lastSyncedAt || '') >= Date.parse(record.deletedAt || '');
}

function pruneAcknowledgedDeletions(branchId, data) {
  const branchDevices = [...devices.values()].filter((device) => device.branchId === branchId);
  if (!branchDevices.length) return;
  for (const [id, record] of data.kph) {
    if (isDeleted(record) && branchDevices.every((device) => hasReceivedDeletion(device, record))) data.kph.delete(id);
  }
  for (const [id, record] of data.history) {
    if (isDeleted(record) && branchDevices.every((device) => hasReceivedDeletion(device, record))) data.history.delete(id);
  }
}

function findStore(code) {
  return stores.find((store) => store.code === String(code || ''));
}

function createSession(store, deviceName, role, user = null) {
  const deviceId = randomUUID();
  const accessToken = randomUUID();
  const session = { deviceId, deviceName, accessToken, id: user?.id || deviceId, displayName: user?.displayName || deviceName, role, branchId: store.id, ...(user?.employeeCode ? { employeeCode: user.employeeCode } : {}) };
  devices.set(accessToken, session);
  return session;
}

function storeEmployees(branchId) { return [...employees.values()].filter((item) => item.branchId === branchId && item.active); }

function sessionFrom(request) {
  const token = request.headers.authorization?.replace(/^Bearer\s+/i, '');
  return token ? devices.get(token) : null;
}

createServer(async (request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host}`);
  const pathname = url.pathname.replace(/^\/api/, '') || '/';
  if (request.method === 'OPTIONS') return send(response, 204, {});
  if (request.method === 'GET' && pathname === '/health') return send(response, 200, { ok: true, branchCount: stores.length, mode: 'mock-central-api' });

  try {
    if (request.method === 'POST' && pathname === '/v1/auth/manager/login') {
      const body = await readJson(request); const store = findStore(body.storeCode);
      if (!store || body.password !== store.password) return send(response, 401, { error: 'Mã cửa hàng hoặc mật khẩu không đúng.' });
      return send(response, 200, { session: createSession(store, String(body.deviceName || 'Thiết bị CHT'), 'manager', { id: `manager:${store.id}`, displayName: `CHT ${store.code}` }) });
    }
    if (request.method === 'POST' && pathname === '/v1/auth/employee/join') {
      const body = await readJson(request); const store = findStore(body.storeCode);
      if (!store || body.joinCode !== store.joinCode) return send(response, 401, { error: 'Mã cửa hàng hoặc mã tham gia không đúng.' });
      const displayName = String(body.displayName || '').trim(); const employeeCode = String(body.employeeCode || '').trim();
      if (!displayName || !employeeCode) return send(response, 400, { error: 'Cần nhập họ tên và mã nhân viên.' });
      let employee = storeEmployees(store.id).find((item) => item.employeeCode === employeeCode);
      if (!employee) { employee = { id: randomUUID(), branchId: store.id, displayName, employeeCode, active: true }; employees.set(employee.id, employee); persist(); }
      return send(response, 200, { session: createSession(store, String(body.deviceName || 'Thiết bị nhân viên'), 'employee', employee) });
    }
    if (pathname === '/v1/store/administration') {
      const session = sessionFrom(request); const store = session && findStore(session.branchId);
      if (!session || session.role !== 'manager' || !store) return send(response, 403, { error: 'Chỉ CHT được quản trị cửa hàng.' });
      if (request.method === 'GET') return send(response, 200, { joinCode: store.joinCode, employees: storeEmployees(store.id).map(({ id, displayName, employeeCode, active }) => ({ id, displayName, employeeCode, active })), devices: [...devices.values()].filter((item) => item.branchId === store.id).map(({ deviceId, deviceName, id, displayName, role, lastSyncedAt }) => ({ deviceId, deviceName, userId: id, displayName, role, lastSeenAt: lastSyncedAt })) });
      if (request.method === 'PATCH') { const body = await readJson(request); if (body.joinCode) store.joinCode = String(body.joinCode); if (body.password) store.password = String(body.password); persist(); return send(response, 200, { ok: true }); }
    }
    const deviceMatch = pathname.match(/^\/v1\/store\/devices\/([^/]+)$/);
    if (request.method === 'DELETE' && deviceMatch) { const session = sessionFrom(request); const target = [...devices.entries()].find(([, value]) => value.deviceId === deviceMatch[1]); if (!session || session.role !== 'manager' || !target || target[1].branchId !== session.branchId) return send(response, 403, { error: 'Không có quyền thu hồi thiết bị.' }); devices.delete(target[0]); return send(response, 200, { ok: true }); }
    const employeeMatch = pathname.match(/^\/v1\/store\/employees\/([^/]+)$/);
    if (request.method === 'DELETE' && employeeMatch) { const session = sessionFrom(request); const employee = employees.get(employeeMatch[1]); if (!session || session.role !== 'manager' || !employee || employee.branchId !== session.branchId) return send(response, 403, { error: 'Không có quyền xoá nhân viên.' }); employee.active = false; for (const [token, device] of devices) if (device.id === employee.id) devices.delete(token); persist(); return send(response, 200, { ok: true }); }
    if (request.method === 'POST' && pathname === '/v1/sync') {
      const session = sessionFrom(request);
      if (!session) return send(response, 401, { error: 'Thiết bị chưa được ghép hoặc đã bị thu hồi.' });
      const body = await readJson(request);
      const serverTime = new Date().toISOString();
      const data = storeData.get(session.branchId) || { kph: new Map(), history: new Map(), revision: 0 };
      const changes = Array.isArray(body.changes) ? body.changes : [];
      const kphChanges = changes.filter((change) => change?.kind === 'kph');
      const permittedKph = kphChanges.map((change) => change.record).filter((record) => {
        const existing = data.kph.get(record?.id);
        if (session.role === 'manager') return true;
        if (!existing) {
          record.createdBy = session.id; record.updatedBy = session.id; record.branchId = session.branchId;
          return !record.deletedAt;
        }
        // Employees may only delete their own pending record. All other edits
        // and every change after an approval are server-rejected.
        return Boolean(record.deletedAt) && existing.createdBy === session.id && (existing.trangThaiDuyet || 'cho_duyet') === 'cho_duyet';
      });
      const permittedHistory = changes.filter((change) => change?.kind === 'history').map((change) => change.record)
        .filter((record) => record && (!record.branchId || record.branchId === session.branchId));
      const acceptedChangeIds = [
        ...kphChanges.filter((change) => permittedKph.includes(change.record)).map((change) => change.id),
        ...changes.filter((change) => change?.kind === 'history' && permittedHistory.includes(change.record)).map((change) => change.id),
      ];
      const nextRevision = () => ++data.revision;
      merge(data.kph, permittedKph, serverTime, nextRevision); merge(data.history, permittedHistory, serverTime, nextRevision); storeData.set(session.branchId, data); persist();
      const cursorRevision = Number(body.cursor || 0) || 0;
      const changedSince = (record) => Number(record.serverRevision || 0) > cursorRevision;
      const snapshot = { branchId: session.branchId, serverTime, cursor: String(data.revision), acceptedChangeIds, kphLogs: [...data.kph.values()].filter(changedSince), historyLogs: [...data.history.values()].filter(changedSince) };
      session.lastSyncedAt = serverTime;
      pruneAcknowledgedDeletions(session.branchId, data);
      return send(response, 200, snapshot);
    }
  } catch {
    return send(response, 400, { error: 'Payload JSON không hợp lệ.' });
  }
  return send(response, 404, { error: 'Không tìm thấy endpoint mock.' });
}).listen(port, '0.0.0.0', () => {
  console.log(`Mock Central API: http://0.0.0.0:${port}/api`);
  console.log(`Test: mã cửa hàng 0001–0300, mật khẩu CHT mặc định = mã cửa hàng, mã tham gia = 1234. Dữ liệu: ${dataFile}`);
});
