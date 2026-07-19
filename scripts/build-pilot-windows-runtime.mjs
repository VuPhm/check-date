import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const output = resolve(root, 'out/pilot-windows/runtime');
const required = [
  'dist',
  'server/pilot-api.mjs',
  'server/pilot-host.mjs',
  'server/pilot-supervisor.mjs',
  'deploy/pilot-windows/service/CoopFoodPilotService.xml',
  'deploy/pilot-windows/vendor/node/node.exe',
  'deploy/pilot-windows/vendor/cloudflared/cloudflared.exe',
  'deploy/pilot-windows/vendor/winsw/CoopFoodPilotService.exe',
];

for (const path of required) {
  if (!existsSync(resolve(root, path))) throw new Error(`Thiếu ${path}. Xem deploy/pilot-windows/WINDOWS-HANDOFF.md để chuẩn bị runtime Windows.`);
}

rmSync(resolve(root, 'out/pilot-windows'), { recursive: true, force: true });
mkdirSync(output, { recursive: true });
cpSync(resolve(root, 'dist'), resolve(output, 'dist'), { recursive: true });
mkdirSync(resolve(output, 'server'), { recursive: true });
for (const file of ['pilot-api.mjs', 'pilot-host.mjs', 'pilot-supervisor.mjs']) cpSync(resolve(root, 'server', file), resolve(output, 'server', file));
for (const [source, destination] of [
  ['deploy/pilot-windows/vendor/node', 'node'],
  ['deploy/pilot-windows/vendor/cloudflared', 'cloudflared'],
  ['deploy/pilot-windows/vendor/winsw', 'service'],
]) cpSync(resolve(root, source), resolve(output, destination), { recursive: true });
cpSync(resolve(root, 'deploy/pilot-windows/service/CoopFoodPilotService.xml'), resolve(output, 'service/CoopFoodPilotService.xml'));
console.log(`Đã tạo runtime Windows tại ${output}`);
