import { existsSync, readFileSync } from 'node:fs';

const failures = [];
function requireText(path, pattern, message) {
  const text = readFileSync(path, 'utf8');
  if (!pattern.test(text)) failures.push(message);
}
function forbid(path, pattern, message) {
  const text = readFileSync(path, 'utf8');
  if (pattern.test(text)) failures.push(message);
}

for (const path of ['scripts/mock-central-api.mjs', 'scripts/demo.mjs', 'STAGING.md', 'deploy/pilot/docker-compose.yml']) {
  if (existsSync(path)) failures.push(`Không được còn setup thử nghiệm/legacy: ${path}`);
}
forbid('src/services/syncApi.ts', /access_token=/, 'SSE không được đưa token vào URL.');
forbid('server/pilot-api.mjs', /PILOT_STORE_CODE \|\| '0001'/, 'API không được có bootstrap store mặc định.');
forbid('server/pilot-api.mjs', /PILOT_JOIN_CODE \|\| '1234'/, 'API không được có PIN mặc định.');
requireText('server/pilot-api.mjs', /bootstrapManagerPassword\.length < 12/, 'Bootstrap CHT phải yêu cầu mật khẩu tối thiểu 12 ký tự.');
requireText('server/pilot-api.mjs', /request\.socket\.remoteAddress/, 'System admin phải bị giới hạn loopback.');
requireText('deploy/pilot-windows/WINDOWS-HANDOFF.md', /Smoke-test bắt buộc/, 'Handoff Windows phải có smoke-test.');

if (failures.length) {
  console.error('Security review check thất bại:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Security review check đạt: không còn mock/credential mặc định, SSE không lộ token URL.');
