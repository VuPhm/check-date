import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { closePilotDatabase, createPilotApiHandler } from './pilot-api.mjs';

const host = process.env.PILOT_HOST || '127.0.0.1';
const port = Number(process.env.PORT || 8787);
const serverDirectory = resolve(fileURLToPath(new URL('.', import.meta.url)));
const distDirectory = resolve(process.env.PILOT_DIST_DIR || resolve(serverDirectory, '../dist'));
const apiHandler = createPilotApiHandler();
const securityHeaders = {
  'x-content-type-options': 'nosniff', 'x-frame-options': 'DENY', 'referrer-policy': 'no-referrer',
  'permissions-policy': 'camera=(self), geolocation=(), microphone=()',
  'content-security-policy': "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; connect-src 'self'; img-src 'self' blob: data:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'",
};

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.woff2': 'font/woff2',
};

function send(response, status, body) {
  response.writeHead(status, { ...securityHeaders, 'content-type': 'text/plain; charset=utf-8' });
  response.end(body);
}

function isInsideDist(candidate) {
  return candidate === distDirectory || candidate.startsWith(`${distDirectory}${sep}`);
}

function navigationRequest(request, pathname) {
  return !extname(pathname) && (request.headers.accept || '').includes('text/html');
}

function serveFile(request, response, filename) {
  const extension = extname(filename).toLowerCase();
  const headers = {
    'content-type': mimeTypes[extension] || 'application/octet-stream',
    'cache-control': filename.endsWith(`${sep}index.html`) || extension === '.webmanifest'
      ? 'no-cache'
      : 'public, max-age=31536000, immutable',
  };
  response.writeHead(200, { ...securityHeaders, ...headers });
  if (request.method === 'HEAD') return response.end();
  createReadStream(filename).pipe(response);
}

export function createPilotHost() {
  return createServer((request, response) => {
    const url = new URL(request.url || '/', `http://${request.headers.host || host}`);
    if (url.pathname === '/api' || url.pathname.startsWith('/api/')) return apiHandler(request, response);
    if (request.method !== 'GET' && request.method !== 'HEAD') return send(response, 405, 'Phương thức không được hỗ trợ.');

    let pathname;
    try { pathname = decodeURIComponent(url.pathname); }
    catch { return send(response, 400, 'Đường dẫn không hợp lệ.'); }
    const requested = pathname === '/' ? '/index.html' : pathname;
    const candidate = resolve(distDirectory, `.${requested}`);
    if (!isInsideDist(candidate)) return send(response, 403, 'Không được phép truy cập.');
    if (existsSync(candidate) && statSync(candidate).isFile()) return serveFile(request, response, candidate);
    if (navigationRequest(request, pathname)) return serveFile(request, response, resolve(distDirectory, 'index.html'));
    return send(response, 404, 'Không tìm thấy tài nguyên.');
  });
}

export function startPilotHost() {
  if (!existsSync(resolve(distDirectory, 'index.html'))) throw new Error(`Không tìm thấy frontend build tại ${distDirectory}. Hãy build trước khi chạy Pilot Host.`);
  const server = createPilotHost();
  let stopping = false;
  const stop = () => {
    if (stopping) return;
    stopping = true;
    server.close(() => {
      closePilotDatabase();
      process.exit(0);
    });
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  server.listen(port, host, () => console.log(`Pilot Host running on http://${host}:${port}; dist: ${distDirectory}`));
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) startPilotHost();
