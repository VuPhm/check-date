import type { DeviceSession, HistoryLog, KphLog, ManagedDevice, ManagedEmployee, ServerEndpoint } from '../domain/types';

interface WireBlob {
  __coopBlob: true;
  type: string;
  base64: string;
}

type WireKphLog = Omit<KphLog, 'image' | 'images'> & {
  image?: Blob | string | null | WireBlob;
  images?: Array<Blob | string | WireBlob>;
};

interface SyncResponse {
  branchId: string;
  serverTime: string;
  kphLogs: KphLog[];
  historyLogs: HistoryLog[];
  cursor: string;
  acceptedChangeIds: string[];
}

interface WireSyncResponse extends Omit<SyncResponse, 'kphLogs'> {
  kphLogs: WireKphLog[];
}

function apiUrl(endpoint: ServerEndpoint, path: string): URL {
  const basePath = endpoint.basePath.trim() || '/api';
  if (/^https?:\/\//i.test(basePath)) return new URL(path.replace(/^\//, ''), `${basePath.replace(/\/$/, '')}/`);
  return new URL(`${basePath === '/' ? '' : basePath.replace(/\/$/, '')}${path}`, window.location.origin);
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

async function serializeBlob(blob: Blob): Promise<WireBlob> {
  return { __coopBlob: true, type: blob.type || 'application/octet-stream', base64: bytesToBase64(new Uint8Array(await blob.arrayBuffer())) };
}

function deserializeBlob(value: WireBlob): Blob {
  const binary = atob(value.base64);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new Blob([bytes], { type: value.type });
}

async function toWireLog(log: KphLog): Promise<WireKphLog> {
  const wireLog: WireKphLog = { ...log };
  if (log.image instanceof Blob) wireLog.image = await serializeBlob(log.image);
  if (Array.isArray(log.images)) {
    wireLog.images = await Promise.all(log.images.map((image) => image instanceof Blob ? serializeBlob(image) : image));
  }
  return wireLog;
}

function fromWireLog(log: WireKphLog): KphLog {
  const localLog = { ...log };
  if (localLog.image && typeof localLog.image === 'object' && '__coopBlob' in localLog.image) {
    localLog.image = deserializeBlob(localLog.image as unknown as WireBlob);
  }
  if (Array.isArray(localLog.images)) {
    localLog.images = localLog.images.map((image) => typeof image === 'object' && image !== null && '__coopBlob' in image
      ? deserializeBlob(image as unknown as WireBlob)
      : image);
  }
  return localLog as KphLog;
}

async function requestJson<T>(url: URL, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`Máy chủ trả về ${response.status}.`);
  return response.json() as Promise<T>;
}

export async function checkSyncServer(endpoint: ServerEndpoint): Promise<{ branchCount: number }> {
  return requestJson<{ branchCount: number }>(apiUrl(endpoint, '/health'));
}

export async function loginManager(
  endpoint: ServerEndpoint, input: { storeCode: string; password: string; deviceName: string },
): Promise<DeviceSession> {
  const response = await requestJson<{ session: DeviceSession }>(apiUrl(endpoint, '/v1/auth/manager/login'), {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input),
  });
  return response.session;
}

export async function joinEmployee(
  endpoint: ServerEndpoint, input: { storeCode: string; joinCode: string; displayName: string; employeeCode: string; deviceName: string },
): Promise<DeviceSession> {
  const response = await requestJson<{ session: DeviceSession }>(apiUrl(endpoint, '/v1/auth/employee/join'), {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input),
  });
  return response.session;
}

function authorizedOptions(token: string, options: RequestInit = {}): RequestInit {
  return { ...options, headers: { ...options.headers, authorization: `Bearer ${token}` } };
}

export async function getStoreAdministration(endpoint: ServerEndpoint, session: DeviceSession): Promise<{ employees: ManagedEmployee[]; devices: ManagedDevice[]; joinCode: string }> {
  return requestJson(apiUrl(endpoint, '/v1/store/administration'), authorizedOptions(session.accessToken));
}

export async function updateStoreAdministration(endpoint: ServerEndpoint, session: DeviceSession, input: { password?: string; joinCode?: string }): Promise<void> {
  await requestJson(apiUrl(endpoint, '/v1/store/administration'), authorizedOptions(session.accessToken, {
    method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input),
  }));
}

export async function revokeDevice(endpoint: ServerEndpoint, session: DeviceSession, deviceId: string): Promise<void> {
  await requestJson(apiUrl(endpoint, `/v1/store/devices/${encodeURIComponent(deviceId)}`), authorizedOptions(session.accessToken, { method: 'DELETE' }));
}

export async function removeEmployee(endpoint: ServerEndpoint, session: DeviceSession, employeeId: string): Promise<void> {
  await requestJson(apiUrl(endpoint, `/v1/store/employees/${encodeURIComponent(employeeId)}`), authorizedOptions(session.accessToken, { method: 'DELETE' }));
}

export async function syncWithServer(
  endpoint: ServerEndpoint,
  session: DeviceSession,
  cursor: string | null,
  changes: Array<{ id: string; kind: 'kph' | 'history'; record: KphLog | HistoryLog }>,
): Promise<SyncResponse> {
  const payload = {
    cursor,
    changes: await Promise.all(changes.map(async (change) => ({
      ...change, record: change.kind === 'kph' ? await toWireLog(change.record as KphLog) : change.record,
    }))),
  };
  const response = await requestJson<WireSyncResponse>(apiUrl(endpoint, '/v1/sync'), {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${session.accessToken}` },
    body: JSON.stringify(payload),
  });
  return { ...response, kphLogs: response.kphLogs.map(fromWireLog) };
}
