import { spawn } from 'node:child_process';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const api = spawn(process.execPath, ['scripts/mock-central-api.mjs'], { stdio: 'inherit' });
const web = spawn(npm, ['run', 'dev'], { stdio: 'inherit' });

function stop() {
  api.kill('SIGTERM');
  web.kill('SIGTERM');
}

process.on('SIGINT', stop);
process.on('SIGTERM', stop);
api.on('exit', (code) => { if (code && code !== 0) { web.kill('SIGTERM'); process.exitCode = code; } });
web.on('exit', (code) => { if (code && code !== 0) { api.kill('SIGTERM'); process.exitCode = code; } });
