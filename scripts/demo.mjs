import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
if (process.env.LOCAL_HTTPS === 'true' && (!existsSync(process.env.LOCAL_HTTPS_CERT || 'dev-cert.pem') || !existsSync(process.env.LOCAL_HTTPS_KEY || 'dev-key.pem'))) {
  console.error('demo:lan cần dev-cert.pem và dev-key.pem. Xem phần Test camera và offline trong STAGING.md.');
  process.exit(1);
}
const api = spawn(process.execPath, ['scripts/mock-central-api.mjs'], { stdio: 'inherit' });
const web = spawn(npm, ['run', process.env.DEMO_PWA === '1' ? 'dev:pwa' : 'dev'], { stdio: 'inherit' });

function stop() {
  api.kill('SIGTERM');
  web.kill('SIGTERM');
}

process.on('SIGINT', stop);
process.on('SIGTERM', stop);
api.on('exit', (code) => { if (code && code !== 0) { web.kill('SIGTERM'); process.exitCode = code; } });
web.on('exit', (code) => { if (code && code !== 0) { api.kill('SIGTERM'); process.exitCode = code; } });
