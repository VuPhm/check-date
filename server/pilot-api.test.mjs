import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test, { after, before } from 'node:test';

process.env.PILOT_DB_FILE = join(mkdtempSync(join(tmpdir(), 'coopfood-pilot-api-')), 'pilot.sqlite');
process.env.PILOT_AUTH_MAX_ATTEMPTS = '2';
process.env.PILOT_SYSTEM_ADMIN_TOKEN = 'test-system-token';
process.env.PILOT_STORE_CODE = '0001';
process.env.PILOT_MANAGER_PASSWORD = 'test-manager-password';
process.env.PILOT_JOIN_CODE = '1234';

const { closePilotDatabase, createPilotApiHandler } = await import('./pilot-api.mjs');
const server = createServer(createPilotApiHandler());
let baseUrl;

before(async () => {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  server.close();
  await once(server, 'close');
  closePilotDatabase();
});

async function managerLogin(password) {
  return fetch(`${baseUrl}/api/v1/auth/manager/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ storeCode: '0001', password, deviceName: 'Test device' }),
  });
}

async function systemRequest(path, options = {}) {
  return fetch(`${baseUrl}/api${path}`, {
    ...options,
    headers: { 'x-pilot-system-token': 'test-system-token', ...(options.headers || {}) },
  });
}

test('creates the initial manager from explicit bootstrap credentials', async () => {
  const response = await managerLogin('test-manager-password');
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.session.branchId, '0001');
  assert.equal(body.session.role, 'manager');
});

test('temporarily blocks repeated failed manager logins', async () => {
  assert.equal((await managerLogin('wrong')).status, 401);
  assert.equal((await managerLogin('wrong')).status, 401);
  assert.equal((await managerLogin('test-manager-password')).status, 429);
});

test('lets the local system administrator create and list a pilot store', async () => {
  const create = await systemRequest('/v1/system/stores', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ code: '0002', name: 'Co.op Food 0002', joinCode: '5678', password: 'mat-khau-cht-0002' }),
  });
  assert.equal(create.status, 201);
  const stores = await systemRequest('/v1/system/stores');
  assert.equal(stores.status, 200);
  assert.equal((await stores.json()).stores.some((store) => store.code === '0002'), true);
});

async function employeeJoin(displayName, employeeCode) {
  return fetch(`${baseUrl}/api/v1/auth/employee/join`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ storeCode: '0001', joinCode: '1234', displayName, employeeCode, deviceName: 'Employee device' }),
  });
}

async function syncRequest(token, changes = [], cursor = '0') {
  return fetch(`${baseUrl}/api/v1/sync`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ changes, cursor }),
  });
}

test('enforces IDOR authorization checks on history logs sync for employees', async () => {
  // Join Employee 1 and 2
  const res1 = await employeeJoin('Emp One', 'EMP01');
  const body1 = await res1.json();
  const token1 = body1.session.accessToken;

  const res2 = await employeeJoin('Emp Two', 'EMP02');
  const body2 = await res2.json();
  const token2 = body2.session.accessToken;

  const recordId = 'history-test-1';
  const historyRecord = {
    id: recordId,
    nsx: '10/06/2026',
    rawHsdDate: '25/06/2026',
    rawHsdDays: 15,
    formattedHsd: '25/06/2026',
    result: '18/06/2026',
    daysRemaining: 10,
    alertClass: 'state-safe',
    alertLabel: 'An toàn',
    alertType: 'safe',
    alertWeight: 3,
    isShortProduct: false,
    isExpiredProduct: false,
    tenHang: 'Sữa Milo',
    quantity: 5,
    dvt: 'EA',
    checkedAt: new Date().toISOString(),
  };

  // 1. Employee 1 creates the history record
  const sync1 = await syncRequest(token1, [{ id: 'change-1', kind: 'history', record: historyRecord }]);
  assert.equal(sync1.status, 200);
  const sync1Body = await sync1.json();
  assert.deepEqual(sync1Body.acceptedChangeIds, ['change-1']);

  // 2. Employee 2 attempts to overwrite Employee 1's history record
  const modifiedRecord = {
    ...historyRecord,
    tenHang: 'Sữa Milo Hack',
    version: 2,
  };
  const sync2 = await syncRequest(token2, [{ id: 'change-2', kind: 'history', record: modifiedRecord }]);
  assert.equal(sync2.status, 200);
  const sync2Body = await sync2.json();
  // Change should NOT be accepted because Employee 2 does not own the record
  assert.deepEqual(sync2Body.acceptedChangeIds, []);
});

test('prevents version lock-in by rejecting sync versions that jump too high', async () => {
  const res = await employeeJoin('Emp One', 'EMP01');
  const body = await res.json();
  const token = body.session.accessToken;

  const recordId = 'history-version-test';
  const historyRecord = {
    id: recordId,
    nsx: '10/06/2026',
    rawHsdDate: '25/06/2026',
    rawHsdDays: 15,
    formattedHsd: '25/06/2026',
    result: '18/06/2026',
    daysRemaining: 10,
    alertClass: 'state-safe',
    alertLabel: 'An toàn',
    alertType: 'safe',
    alertWeight: 3,
    isShortProduct: false,
    isExpiredProduct: false,
    tenHang: 'Sữa Milo',
    quantity: 5,
    dvt: 'EA',
    checkedAt: new Date().toISOString(),
  };

  // Sync initial version 1
  await syncRequest(token, [{ id: 'change-v1', kind: 'history', record: { ...historyRecord, version: 1 } }]);

  // Try to sync version 100 (jumps by 99, which is > 50)
  const syncHuge = await syncRequest(token, [{ id: 'change-vhuge', kind: 'history', record: { ...historyRecord, version: 100 } }]);
  assert.equal(syncHuge.status, 400);
  const hugeBody = await syncHuge.json();
  assert.match(hugeBody.error, /Phiên bản đồng bộ không hợp lệ/);
});

test('enforces defense-in-depth character length constraints on kph record creation', async () => {
  const res = await employeeJoin('Emp One', 'EMP01');
  const body = await res.json();
  const token = body.session.accessToken;

  const kphRecord = {
    id: 'kph-len-test',
    detectedDate: '21/07/2026',
    detectedBy: 'Emp One',
    sku: '123456',
    productName: 'A'.repeat(257), // Exceeds max 256 characters for tenHang
    unit: 'EA',
    quantity: 10,
    condition: 'Bình thường',
    resolution: 'KHÁC',
    resolutionText: 'Đổi trả',
    resolutionDate: '22/07/2026',
    tenHang: 'A'.repeat(257), // Match productName
    version: 1,
  };

  const syncRes = await syncRequest(token, [{ id: 'change-kph-len', kind: 'kph', record: kphRecord }]);
  assert.equal(syncRes.status, 400);
  const syncResBody = await syncRes.json();
  assert.match(syncResBody.error, /Tên hàng hóa không hợp lệ/);
});

