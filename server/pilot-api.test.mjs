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

test('seeds the initial manager with the four-digit store code', async () => {
  const response = await managerLogin('0001');
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.session.branchId, '0001');
  assert.equal(body.session.role, 'manager');
});

test('temporarily blocks repeated failed manager logins', async () => {
  assert.equal((await managerLogin('wrong')).status, 401);
  assert.equal((await managerLogin('wrong')).status, 401);
  assert.equal((await managerLogin('0001')).status, 429);
});

test('lets the local system administrator create and list a pilot store', async () => {
  const create = await systemRequest('/v1/system/stores', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ code: '0002', name: 'Co.op Food 0002' }),
  });
  assert.equal(create.status, 201);
  const stores = await systemRequest('/v1/system/stores');
  assert.equal(stores.status, 200);
  assert.equal((await stores.json()).stores.some((store) => store.code === '0002'), true);
});
