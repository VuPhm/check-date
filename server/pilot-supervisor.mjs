import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const runtimeDirectory = resolve(fileURLToPath(new URL('.', import.meta.url)));

function loadRuntimeEnvironment() {
  const configPath = process.env.PILOT_CONFIG_PATH;
  if (!configPath) return process.env;
  const config = JSON.parse(readFileSync(resolve(configPath), 'utf8'));
  if (!config || typeof config !== 'object' || Array.isArray(config)) throw new Error('PILOT_CONFIG_PATH phải trỏ tới JSON object hợp lệ.');
  const mapped = {
    ...(config.databaseFile ? { PILOT_DB_FILE: String(config.databaseFile) } : {}),
    ...(config.backupDirectory ? { PILOT_BACKUP_DIR: String(config.backupDirectory) } : {}),
    ...(config.distDirectory ? { PILOT_DIST_DIR: String(config.distDirectory) } : {}),
    ...(config.systemAdminToken ? { PILOT_SYSTEM_ADMIN_TOKEN: String(config.systemAdminToken) } : {}),
    ...(config.bootstrapStoreCode ? { PILOT_STORE_CODE: String(config.bootstrapStoreCode) } : {}),
    ...(config.bootstrapManagerPassword ? { PILOT_MANAGER_PASSWORD: String(config.bootstrapManagerPassword) } : {}),
    ...(config.bootstrapJoinCode ? { PILOT_JOIN_CODE: String(config.bootstrapJoinCode) } : {}),
    ...(config.tunnelToken ? { PILOT_TUNNEL_TOKEN: String(config.tunnelToken) } : {}),
    ...(config.hostPort ? { PILOT_HOST_PORT: String(config.hostPort) } : {}),
    ...(config.statusFile ? { PILOT_STATUS_PATH: String(config.statusFile) } : {}),
  };
  return { ...process.env, ...mapped };
}

const runtimeEnvironment = loadRuntimeEnvironment();
const hostScript = resolve(runtimeEnvironment.PILOT_HOST_SCRIPT || resolve(runtimeDirectory, 'pilot-host.mjs'));
const nodeExecutable = runtimeEnvironment.PILOT_NODE_EXECUTABLE || process.execPath;
const hostAddress = runtimeEnvironment.PILOT_HOST || '127.0.0.1';
const hostPort = Number(runtimeEnvironment.PILOT_HOST_PORT || runtimeEnvironment.PORT || 8787);
const healthUrl = `http://${hostAddress}:${hostPort}/api/health`;
const healthTimeoutMs = Number(runtimeEnvironment.PILOT_HEALTH_TIMEOUT_MS || 30_000);
const healthPollMs = Number(runtimeEnvironment.PILOT_HEALTH_POLL_MS || 500);
const tunnelBinary = runtimeEnvironment.PILOT_CLOUDFLARED_BIN || 'cloudflared';
const tunnelToken = runtimeEnvironment.PILOT_TUNNEL_TOKEN || '';
const skipTunnel = runtimeEnvironment.PILOT_SKIP_TUNNEL === 'true';
const statusPath = runtimeEnvironment.PILOT_STATUS_PATH || '';

function delay(milliseconds) { return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds)); }
function log(component, message) { console.log(`[pilot-supervisor] ${component}: ${message}`); }
function forwardOutput(component, stream) {
  stream?.setEncoding('utf8');
  stream?.on('data', (chunk) => process.stdout.write(`[${component}] ${chunk}`));
}
function writeStatus(state, detail = '') {
  if (!statusPath) return;
  mkdirSync(dirname(statusPath), { recursive: true });
  const temporary = `${statusPath}.tmp`;
  writeFileSync(temporary, JSON.stringify({ state, detail, updatedAt: new Date().toISOString(), hostUrl: healthUrl }), 'utf8');
  renameSync(temporary, statusPath);
}

async function stopChild(child, name) {
  if (!child || child.exitCode !== null || child.signalCode) return;
  const exited = once(child, 'exit');
  child.kill('SIGTERM');
  const timeout = delay(10_000).then(() => 'timeout');
  if (await Promise.race([exited.then(() => 'exit'), timeout]) === 'timeout') {
    log(name, 'không dừng đúng hạn, buộc kết thúc process.');
    child.kill('SIGKILL');
    await exited;
  }
}

export class PilotSupervisor {
  constructor() {
    this.host = undefined; this.tunnel = undefined; this.stopping = false; this.failing = false;
    this.tunnelRetryMs = 2_000; this.tunnelRetryTimer = undefined;
    writeStatus('starting-host');
  }

  spawnHost() {
    if (!existsSync(hostScript)) throw new Error(`Không tìm thấy Pilot Host: ${hostScript}`);
    this.host = spawn(nodeExecutable, [hostScript], { env: { ...runtimeEnvironment, PILOT_HOST: hostAddress, PORT: String(hostPort) }, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    forwardOutput('host', this.host.stdout); forwardOutput('host', this.host.stderr);
    this.host.once('error', (error) => this.fail(`không chạy được Host: ${error.message}`));
    this.host.once('exit', (code, signal) => { this.host = undefined; if (!this.stopping) this.fail(`Host dừng bất thường (${signal || code || 'unknown'}).`); });
  }

  async waitForHost() {
    const deadline = Date.now() + healthTimeoutMs;
    while (!this.stopping && Date.now() < deadline) {
      try {
        const response = await fetch(healthUrl, { signal: AbortSignal.timeout(Math.min(2_000, healthPollMs * 3)) });
        if (response.ok) return;
      } catch { /* Host vẫn đang khởi động. */ }
      await delay(healthPollMs);
    }
    if (!this.stopping) throw new Error(`Host không healthy trong ${Math.round(healthTimeoutMs / 1000)} giây.`);
  }

  spawnTunnel() {
    if (skipTunnel) { log('tunnel', 'bỏ qua theo PILOT_SKIP_TUNNEL=true.'); writeStatus('running', 'Tunnel bị bỏ qua cho local development.'); return; }
    if (!tunnelToken) throw new Error('Thiếu PILOT_TUNNEL_TOKEN.');
    this.tunnel = spawn(tunnelBinary, ['tunnel', 'run', '--token', tunnelToken], { env: runtimeEnvironment, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    forwardOutput('tunnel', this.tunnel.stdout); forwardOutput('tunnel', this.tunnel.stderr);
    this.tunnel.once('error', (error) => this.scheduleTunnelRetry(`không chạy được tunnel: ${error.message}`));
    this.tunnel.once('exit', (code, signal) => { this.tunnel = undefined; if (!this.stopping) this.scheduleTunnelRetry(`tunnel dừng (${signal || code || 'unknown'}).`); });
    writeStatus('running', 'Tunnel process đang chạy.'); log('tunnel', 'đã khởi động.');
  }

  scheduleTunnelRetry(reason) {
    if (this.stopping || this.tunnelRetryTimer) return;
    const retryIn = this.tunnelRetryMs;
    this.tunnelRetryMs = Math.min(this.tunnelRetryMs * 2, 30_000);
    writeStatus('degraded', `${reason} Thử lại sau ${Math.round(retryIn / 1000)} giây.`);
    log('tunnel', `${reason} Thử lại sau ${Math.round(retryIn / 1000)} giây.`);
    this.tunnelRetryTimer = setTimeout(() => {
      this.tunnelRetryTimer = undefined;
      try { this.spawnTunnel(); }
      catch (error) { this.scheduleTunnelRetry(error instanceof Error ? error.message : 'lỗi tunnel không xác định.'); }
    }, retryIn);
  }

  async start() {
    writeStatus('starting-host'); this.spawnHost(); await this.waitForHost(); if (this.stopping) return;
    writeStatus('starting-tunnel');
    this.spawnTunnel(); log('cluster', `đang chạy; Host healthy tại ${healthUrl}.`);
  }

  async stop(exitCode = 0) {
    if (this.stopping) return;
    this.stopping = true;
    writeStatus('stopping');
    if (this.tunnelRetryTimer) clearTimeout(this.tunnelRetryTimer);
    await stopChild(this.tunnel, 'tunnel'); await stopChild(this.host, 'host');
    writeStatus(exitCode === 0 ? 'stopped' : 'error', exitCode === 0 ? '' : 'Supervisor kết thúc do Host lỗi.');
    process.exit(exitCode);
  }

  fail(message) {
    if (this.failing || this.stopping) return;
    this.failing = true; writeStatus('error', message); console.error(`[pilot-supervisor] cluster: ${message}`); void this.stop(1);
  }
}

export async function startPilotSupervisor() {
  const supervisor = new PilotSupervisor();
  process.once('SIGINT', () => void supervisor.stop());
  process.once('SIGTERM', () => void supervisor.stop());
  try { await supervisor.start(); }
  catch (error) { supervisor.fail(error instanceof Error ? error.message : 'không thể khởi động cụm.'); }
  return supervisor;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) void startPilotSupervisor();
