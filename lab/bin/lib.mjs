// Shared helpers for lab/bin (EXP-000). Node 22 built-ins and the docker CLI only.
// [EXP-000] Why: thin scripts, no daemon, mkdir locks; at most 10 agents and 3 heavy slots.
// Rejected: the homebase controller in qualification/devloop (queue, scheduler, quota mount,
// state v2), built for another machine and far heavier than this lab needs.
// atomicJson, hashFile and pidAlive-style liveness are adapted from qualification/devloop/io.mjs.
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { observe, complete, processObservation, text, byteCount, forecast, digestBytes } from './observation.ts';

export const REPO = path.resolve(import.meta.dirname, '../..');

/** The main checkout shared by every worktree: locks, pool ledger and engine config live there. */
export const MAIN = (() => {
  try {
    const common = execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], { cwd: REPO, encoding: 'utf8' }).trim();
    return path.dirname(fs.realpathSync(common));
  } catch (error) { throw new Error(`cannot locate shared git state: ${error.message}`); }
})();
export const LOCKS = process.env.TX2_LOCKS_DIR ?? path.join(MAIN, 'lab/locks');
export const ENGINE_DIR = process.env.TX2_ENGINE_DIR ?? path.join(MAIN, 'runs/engines');
export const OBJECTS = path.join(REPO, 'runs/objects');
// [EXP-002] Why: engine configuration (slots.json, qlever-start.sh, xtdb-config.yaml) is read from the
// main checkout so every worktree agrees on one shared resident config. A branch that changes the
// engine config must be able to run its own config before merge; TX2_CONFIG_DIR names that checkout.
// Other worktrees then see a config-hash mismatch on the slot and fail closed, which is intended.
// Rejected: always reading the worktree (each worktree would recreate the shared residents).
export const CONFIG_DIR = process.env.TX2_CONFIG_DIR ? path.resolve(process.env.TX2_CONFIG_DIR) : MAIN;
export const SLOTS_FILE = path.join(CONFIG_DIR, 'lab/config/slots.json');

export const now = () => new Date().toISOString();
export const sha256 = bytes => complete(observe('sha256', { algorithm: 'sha256' }, () => bytes, digestBytes));
export const sha256File = file => complete(observe('file hash', { file: path.resolve(file) }, () => fs.readFileSync(file), digestBytes));
export const json = value => JSON.stringify(value, null, 2) + '\n';
export const sleep = ms => new Promise(done => setTimeout(done, ms));
export const GiB = 1024 ** 3;
export const fmtBytes = n => n == null ? '?' : n >= GiB ? (n / GiB).toFixed(2) + ' GiB' : (n / 1024 ** 2).toFixed(0) + ' MiB';

export class LabError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}
export const fail = (code, message) => { throw new LabError(code, message); };

export function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  // [EXP-K01-R6] Why: ENOENT is an explicit absent-file state for optional ledger/owner metadata; malformed bytes and other read failures still throw. Rejected: a catch-all empty object.
  catch (error) { if (error.code === 'ENOENT' && fallback !== undefined) return fallback; throw error; }
}

/** Write via temp + rename (or exclusive create). Adapted from qualification/devloop/io.mjs. */
export function atomicJson(file, value, { exclusive = false } = {}) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (exclusive) {
    const fd = fs.openSync(file, 'wx', 0o644);
    try { fs.writeSync(fd, json(value)); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    return;
  }
  const temporary = `${file}.${randomUUID()}.tmp`;
  const fd = fs.openSync(temporary, 'wx', 0o644);
  try { fs.writeSync(fd, json(value)); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  fs.renameSync(temporary, file);
}

export function pidAlive(pid) {
  if (!Number.isSafeInteger(pid) || pid < 1) return false;
  try { process.kill(pid, 0); return true; } // liveness observation only; never signals
  // [EXP-K01-R6] Why: permission denial means potentially alive and unknown errors must not release resources. Rejected: treating every process-read error as dead.
  catch (error) { if (error.code === 'EPERM') return true; if (error.code === 'ESRCH') return false; throw error; }
}

// ---------------------------------------------------------------- mkdir locks

/**
 * Exclusive mkdir lock with owner metadata. A lock whose owner pid is dead is stale and is
 * broken (renamed aside for evidence, then removed). Waits up to timeoutMs.
 */
// [EXP-K01-R6] Why: missing optional lock metadata is an explicit creation-race state; unknown age defaults to fresh and keeps the lock, never admits work. Only a proven dead pid or aged absent owner allows recovery. Rejected: treating malformed/failed metadata reads as unlocked.
export async function withDirLock(dir, fn, { timeoutMs = 60_000, label = path.basename(dir), quiet = false } = {}) {
  const started = Date.now();
  let announced = false;
  for (;;) {
    try {
      fs.mkdirSync(path.dirname(dir), { recursive: true });
      fs.mkdirSync(dir);
      atomicJson(path.join(dir, 'owner.json'), { pid: process.pid, host: os.hostname(), at: now(), argv: process.argv.slice(1) });
      break;
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      const owner = readJson(path.join(dir, 'owner.json'), null);
      const age = Date.now() - (fs.statSync(dir, { throwIfNoEntry: false })?.mtimeMs ?? Date.now());
      if ((owner && !pidAlive(owner.pid)) || (!owner && age > 30_000)) {
        breakStaleLock(dir);
        continue;
      }
      if (Date.now() - started > timeoutMs) fail('LOCK_TIMEOUT', `Timed out waiting for ${label} held by pid ${owner?.pid}`);
      if (!announced && !quiet) { process.stderr.write(`[lab] waiting for ${label} (held by pid ${owner?.pid})\n`); announced = true; }
      await sleep(200);
    }
  }
  try { return await fn(); }
  finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

export function breakStaleLock(dir) {
  const aside = `${dir}.stale-${Date.now()}-${randomBytes(3).toString('hex')}`;
  try { fs.renameSync(dir, aside); } catch (error) { if (error.code === 'ENOENT') return; throw error; }
  const owner = readJson(path.join(aside, 'owner.json'), null);
  appendEvent({ event: 'stale-lock-broken', lock: dir, owner });
  fs.rmSync(aside, { recursive: true, force: true });
}

export function appendEvent(event) {
  fs.mkdirSync(LOCKS, { recursive: true });
  fs.appendFileSync(path.join(LOCKS, 'events.jsonl'), JSON.stringify({ at: now(), pid: process.pid, ...event }) + '\n');
}

// ---------------------------------------------------------------- config and docker

export function loadSlots() { return readJson(SLOTS_FILE); }

export function slotInfo(config, lane, slot) {
  const laneConf = config.lanes[lane];
  if (!laneConf) fail('USAGE', `Unknown lane ${lane}; choose ${Object.keys(config.lanes).join('|')}`);
  const slotConf = config.slots[lane][slot];
  if (!slotConf) fail('USAGE', `Unknown slot ${slot}; choose ${Object.keys(config.slots[lane]).join('|')}`);
  const port = slotConf.port;
  if (config.forbiddenPorts.includes(port)) fail('CONFIG', `Port ${port} is forbidden`);
  for (const range of config.reservedPortRanges) if (port >= range.from && port <= range.to) fail('CONFIG', `Port ${port} belongs to ${range.owner}`);
  const container = `tx2-${lane}-${slot}`;
  return {
    lane, slot, ...slotConf, laneConf, container, volume: `${container}-data`,
    endpoint: laneConf.urlTemplate.replace('{port}', String(port)),
    lockDir: path.join(LOCKS, `${lane}-${slot}`),
    ownerFile: path.join(LOCKS, `${lane}-${slot}`, 'owner.json'),
  };
}

export const DOCKER_HOST = 'unix:///Users/sam/.colima/triplex2/docker.sock';
export function dockerArgs(args) {
  // Every call names the dedicated VM explicitly; the default context runs Sam's other stack.
  return ['-H', process.env.TX2_DOCKER_HOST ?? DOCKER_HOST, ...args];
}
// [EXP-K01-R6] Why: allowFail cannot turn a failed command into absence. Rejected: null on any error (consumers publish successful cleanup from unknown state). Legacy allowFail is intentionally no longer a suppression option.
export function docker(args, { input, stderrEmpty = false } = {}) {
  const command = ['docker', ...dockerArgs(args)];
  return complete(processObservation('docker', { command }, spawnSync(command[0], command.slice(1), { encoding: 'utf8', input, maxBuffer: 64 * 1024 * 1024 }), out => out.stdout.trim(), { stderrEmpty }));
}
export function inspect(name) {
  const names = docker(['ps', '-a', '--filter', `name=^${name}$`, '--format', '{{.Names}}']).split('\n').filter(Boolean);
  // [EXP-K01-R6] Why: empty successful enumeration is proven absence, not a swallowed inspect error. Rejected: treating any failed inspect as no container.
  if (!names.length) return null;
  if (names.length !== 1 || names[0] !== name) fail('DOCKER', 'container enumeration does not bind exact name');
  return complete(observe('container inspect', { name }, () => docker(['inspect', '--type', 'container', name]), raw => {
    const rows = JSON.parse(text(raw));
    if (!Array.isArray(rows) || rows.length !== 1 || !rows[0].Id || typeof rows[0].State?.Running !== 'boolean' || !rows[0].Config || !rows[0].HostConfig) throw Error('incomplete container inspect');
    return rows[0];
  }));
}
export function inspectVolume(name) {
  const names = docker(['volume', 'ls', '--filter', `name=^${name}$`, '--format', '{{.Name}}']).split('\n').filter(Boolean);
  if (!names.length) return null;
  if (names.length !== 1 || names[0] !== name) fail('DOCKER', 'volume enumeration does not bind exact name');
  return complete(observe('volume inspect', { name }, () => docker(['volume', 'inspect', name]), raw => {
    const rows = JSON.parse(text(raw));
    if (!Array.isArray(rows) || rows.length !== 1 || rows[0].Name !== name || !rows[0].Labels) throw Error('incomplete volume inspect');
    return text(raw);
  }));
}
export function listTx2Containers({ all = false } = {}) {
  const out = docker(['ps', ...(all ? ['-a'] : []), '--filter', 'name=^tx2-', '--format', '{{.Names}}']);
  const names = out ? out.split('\n').filter(Boolean) : [];
  return names.map(name => {
    const info = inspect(name);
    if (!info) fail('DOCKER', `enumerated container ${name} disappeared; retry full observation`);
    return {
      name,
      running: info.State.Running,
      status: info.State.Status,
      health: info.State.Health?.Status ?? null,
      memBytes: info.HostConfig.Memory === 0 ? null : byteCount(info.HostConfig.Memory),
      nanoCpus: info.HostConfig.NanoCpus === 0 ? null : byteCount(info.HostConfig.NanoCpus),
      image: info.Config.Image,
      imageId: info.Image,
      labels: info.Config.Labels ?? {},
      startedAt: info.State.StartedAt,
    };
  });
}
export function dockerStats() {
  const out = docker(['stats', '--no-stream', '--format', '{{json .}}']);
  const parse = text => {
    const m = /^([\d.]+)\s*([KMGT]?i?B)/.exec(text.trim());
    if (!m) fail('DOCKER', 'incomplete memory observation');
    const unit = { B: 1, KiB: 1024, MiB: 1024 ** 2, GiB: 1024 ** 3, TiB: 1024 ** 4, kB: 1e3, KB: 1e3, MB: 1e6, GB: 1e9, TB: 1e12 }[m[2]];
    return byteCount(Math.round(Number(m[1]) * unit));
  };
  return out.split('\n').filter(Boolean).map(line => JSON.parse(line)).map(row => ({
    name: row.Name,
    memBytes: parse(row.MemUsage.split('/')[0]),
    memLimitBytes: parse(row.MemUsage.split('/')[1]),
    cpuPercent: forecast(Number(/^([0-9]+(?:\.[0-9]+)?)%$/.exec(row.CPUPerc)?.[1])),
  }));
}
/** VM disk via a throwaway container from an already pulled pinned image (no pull, no busybox). */
export function parseVmDisk(out) {
  const lines = text(out).trim().split('\n');
  if (lines.length !== 2 || !/^Filesystem\s/.test(lines[0])) throw Error('incomplete df observation');
  const f = lines[1].trim().split(/\s+/);
  if (f.length !== 6 || !f.slice(1,4).every(x => /^[0-9]+$/.test(x))) throw Error('invalid df byte fields');
  const totalBytes = byteCount(Number(f[1])), usedBytes = byteCount(Number(f[2])), availableBytes = byteCount(Number(f[3]));
  if (totalBytes === 0 || usedBytes > totalBytes || availableBytes > totalBytes || usedBytes + availableBytes > totalBytes) throw Error('inconsistent df observation');
  return { totalBytes, usedBytes, availableBytes };
}
export function vmDisk(config) {
  return complete(observe('VM disk', { image: config.lanes.xtdb.image }, () => docker(['run', '--rm', '--network', 'none', '--entrypoint', 'df', config.lanes.xtdb.image, '-P', '-B1', '/']), parseVmDisk));
}
export function volumeBytes(config, volume) {
  if (!inspectVolume(volume)) fail('DOCKER', `volume ${volume} is absent; no size observation`);
  return complete(observe('volume bytes', { volume, image: config.lanes.xtdb.image }, () => docker(['run', '--rm', '--network', 'none', '-v', `${volume}:/v:ro`, '--entrypoint', 'du', config.lanes.xtdb.image, '-s', '-k', '/v'], { stderrEmpty: true }), raw => {
    const m = /^([0-9]+)\s+\/v$/.exec(text(raw)); if (!m) throw Error('incomplete du observation');
    return byteCount(Number(m[1]) * 1024);
  }));
}

// ---------------------------------------------------------------- second-writer guard and followers (EXP-X05)

/**
 * Parse the flat two-level YAML the lab XTDB configs use: top-level keys, one level of children
 * indented by exactly two spaces, optional `!Tag` values, `#` comments. Any other line throws.
 * [EXP-X05] Why a strict subset parser: the second-writer guard below must never pass on a config it
 * cannot read, and lab/bin takes no dependencies (EXP-000 header). Rejected: a regex search for
 * "readOnlyDatabases: true" anywhere in the file, which a commented-out or nested line satisfies.
 */
export function parseFlatYaml(text) {
  const top = new Map();
  let parent = null;
  String(text).split('\n').forEach((raw, index) => {
    const line = raw.replace(/\r$/, '').replace(/\s+#.*$/, '');
    if (/^\s*(#.*)?$/.test(line)) return;
    let m = /^([A-Za-z][\w-]*):(?:\s+(.*?))?\s*$/.exec(line);
    if (m) {
      if (top.has(m[1])) fail('CONFIG', `duplicate top-level key ${m[1]} at line ${index + 1}`);
      parent = { value: m[2] ?? '', children: new Map() };
      top.set(m[1], parent);
      return;
    }
    m = /^ {2}([A-Za-z][\w-]*):(?:\s+(.*?))?\s*$/.exec(line);
    if (m && parent) {
      if (parent.children.has(m[1])) fail('CONFIG', `duplicate key ${m[1]} at line ${index + 1}`);
      parent.children.set(m[1], m[2] ?? '');
      return;
    }
    fail('CONFIG', `unsupported YAML at line ${index + 1}: ${JSON.stringify(raw)}`);
  });
  return top;
}

/**
 * True only for a config whose top level says exactly `readOnlyDatabases: true`. Quoted, capitalised,
 * nested, commented or unparsable forms count as read-write, so the guard fails closed.
 * R19 1.1: `readOnlyDatabases: true` makes the primary and every attached secondary read-only
 * (DatabaseCatalog.kt:118,210), opens both logs as ReadOnlyLocalLog and never claims leadership.
 */
// [EXP-K01-R6] Why: this legacy boolean helper maps invalid config to conservative read-write; volumeGuard independently requires a complete parse first. Rejected: using this boolean fallback alone to certify a configuration.
export function xtdbConfigReadOnly(text) {
  try { return parseFlatYaml(text).get('readOnlyDatabases')?.value === 'true'; } catch { return false; }
}

/**
 * The second-writer guard. R19 1.1: the Local log takes no file lock and each record's offset footer
 * is computed from position() before the write (LocalLog.kt:129-136,160-175), so a second read-write
 * XTDB process on a slot volume corrupts the log silently. Rule: a container may start on a volume
 * that another container already mounts only if its own config sets `readOnlyDatabases: true`.
 * Other containers count in every state (a stopped one can be started again with plain docker), and
 * the container itself is excluded so a restart of the same container is not a second writer.
 * Rejected: trusting a label or the follower's name, which say nothing about the bytes it runs.
 */
export function volumeGuard({ volume, container, configText, mountedBy }) {
  const others = mountedBy.filter(name => name !== container);
  const parsed = observe('writer configuration', { volume, container }, () => configText, parseFlatYaml);
  if (parsed.state !== 'complete') return { ok: false, others, readOnly: false, observation: parsed, reason: parsed.error };
  const readOnly = parsed.value.get('readOnlyDatabases')?.value === 'true';
  if (others.length === 0 || readOnly) return { ok: true, others, readOnly };
  return {
    ok: false, others, readOnly,
    reason: `${container} would be a second read-write container on ${volume} (already mounted by ${others.join(', ')}); `
      + 'its config must set top-level readOnlyDatabases: true (R19 1.1: the Local log has no file locks)',
  };
}

/** Every container (any state) that mounts the named volume, by name. */
export function containersOnVolume(volume) {
  const out = docker(['ps', '-a', '--filter', `volume=${volume}`, '--format', '{{.Names}}']);
  return out ? out.split('\n').filter(Boolean) : [];
}

/**
 * A follower config must be read-only and read the writer's own log and storage (same type, same
 * absolute path): R19 1.1 and open question 4, a follower attaches secondaries at the paths recorded
 * in the primary's catalog. healthz must stay on 8080 because the harness health check uses it.
 */
// [EXP-K01-R6] Why: config read/parse errors are collected refusal reasons and missing required paths fail; optional chains below format those reasons only. Rejected: matching two absent paths as valid configuration.
export function checkFollowerConfig(writerText, followerText) {
  const reasons = [];
  let writer = null, follower = null;
  try { writer = parseFlatYaml(writerText); } catch (error) { reasons.push(`writer config: ${error.message}`); }
  try { follower = parseFlatYaml(followerText); } catch (error) { reasons.push(`follower config: ${error.message}`); }
  if (follower && follower.get('readOnlyDatabases')?.value !== 'true') reasons.push('follower config does not set top-level readOnlyDatabases: true');
  if (writer && writer.get('readOnlyDatabases')?.value === 'true') reasons.push('writer config is read-only, so nothing would write the log');
  if (writer && follower) for (const key of ['log', 'storage']) {
    const w = writer.get(key), f = follower.get(key);
    if (!w || !f || !w.children.has('path') || !f.children.has('path') || w.value !== f.value || w.children.get('path') !== f.children.get('path'))
      reasons.push(`${key} is ${f?.value} ${f?.children.get('path')} on the follower but ${w?.value} ${w?.children.get('path')} on the writer`);
  }
  if (follower && follower.get('healthz')?.children.get('port') !== '8080') reasons.push('follower healthz.port must be 8080 (the harness health check)');
  return { ok: reasons.length === 0, reasons };
}

/**
 * Parse a docker --cpuset-cpus list ("0,1" or "2-3") into a sorted array, checked against the VM.
 * R19 1.6: --cpus is a quota, not a pinning, so a writer and a follower with --cpus 2 each can still
 * run on the same cores; only disjoint cpusets take the readers off the writer's CPUs.
 */
export function parseCpuset(text, vmCpus) {
  const cpus = new Set();
  for (const part of String(text).split(',')) {
    const m = /^(\d+)(?:-(\d+))?$/.exec(part.trim());
    if (!m) fail('USAGE', `bad cpuset ${JSON.stringify(text)}`);
    const from = Number(m[1]), to = Number(m[2] ?? m[1]);
    if (from > to || to >= vmCpus) fail('USAGE', `cpuset ${text} is outside the VM's CPUs 0-${vmCpus - 1}`);
    for (let cpu = from; cpu <= to; cpu++) cpus.add(cpu);
  }
  return [...cpus].sort((a, b) => a - b);
}
/** CPUs two containers share; an unpinned container (null) may run on every VM CPU. */
export function cpusetOverlap(a, b, vmCpus) {
  const all = Array.from({ length: vmCpus }, (_, i) => i);
  const left = a ? parseCpuset(a, vmCpus) : all, right = new Set(b ? parseCpuset(b, vmCpus) : all);
  return left.filter(cpu => right.has(cpu));
}

// ---------------------------------------------------------------- pool ledger

export const POOL_FILE = () => path.join(LOCKS, 'pool.json');
export const POOL_LOCK = () => path.join(LOCKS, 'pool.lock');

/**
 * Pure admission arithmetic (unit-tested). reservations: ledger entries; running: running tx2-*
 * containers from docker. External = running tx2-* with no ledger entry (research probes);
 * an uncapped external container counts as the whole VM so admission fails closed.
 */
export function admission({ config, reservations, running, request, diskUsedBytes }) {
  const validation = observe('pool resource observations', { container: request.container }, () => ({config, reservations, running, request, diskUsedBytes}), () => {
    byteCount(diskUsedBytes); byteCount(config.vm.memBytes); byteCount(config.pool.memLimitBytes); byteCount(config.pool.diskUsedLimitBytes);
    if (!config.vm.memBytes || !config.pool.memLimitBytes || !config.pool.diskUsedLimitBytes) throw Error('missing positive resource capacity');
    forecast(request.memBytes); forecast(request.diskForecastBytes);
    for (const r of reservations) { forecast(r.memBytes); forecast(r.diskForecastBytes); }
    for (const r of running) { if (r.memBytes !== null) byteCount(r.memBytes); }
    return true;
  });
  if (validation.state === 'failed') return { ok: false, reasons: [validation.error], observation: validation, external: [], holders: [] };
  const ledgerNames = new Set(reservations.map(entry => entry.container));
  // [EXP-K01-R6] Why: a successfully inspected explicit null cap means uncapped, so charge the whole VM. Rejected: missing/invalid cap (validation above refuses it).
  const external = running.filter(c => c.running && !ledgerNames.has(c.name)).map(c => ({
    container: c.name, external: true, memBytes: (c.memBytes === null || c.memBytes === 0) ? config.vm.memBytes : c.memBytes, nanoCpus: c.nanoCpus, uncapped: !c.memBytes,
  }));
  const others = reservations.filter(entry => entry.container !== request.container);
  const memUsed = [...others, ...external].reduce((sum, entry) => sum + entry.memBytes, 0);
  const memAfter = memUsed + request.memBytes;
  const diskForecast = others.reduce((sum, entry) => sum + entry.diskForecastBytes, 0);
  const diskAfter = diskUsedBytes + diskForecast + request.diskForecastBytes;
  const reasons = [];
  if (![memUsed, memAfter, diskForecast, diskAfter].every(n => Number.isFinite(n) && n >= 0 && n <= Number.MAX_SAFE_INTEGER)) reasons.push('invalid resource sum');
  if (memAfter > config.pool.memLimitBytes)
    reasons.push(`memory: ${fmtBytes(memUsed)} reserved + ${fmtBytes(request.memBytes)} requested = ${fmtBytes(memAfter)} > pool ${fmtBytes(config.pool.memLimitBytes)}`);
  if (diskAfter > config.pool.diskUsedLimitBytes)
    reasons.push(`disk: ${fmtBytes(diskUsedBytes)} used + ${fmtBytes(diskForecast)} forecast by others + ${fmtBytes(request.diskForecastBytes)} forecast = ${fmtBytes(diskAfter)} > ${fmtBytes(config.pool.diskUsedLimitBytes)}`);
  const holders = [...others.map(entry => `${entry.container} ${fmtBytes(entry.memBytes)} (${entry.holder})`),
    ...external.map(entry => `${entry.container} ${fmtBytes(entry.memBytes)} (external${entry.uncapped ? ', UNCAPPED' : ''})`)];
  return { ok: reasons.length === 0, reasons, memUsed, memAfter, diskForecast, diskAfter, external, holders };
}

/** Read-modify-write the ledger under the one exclusive pool lock. */
export async function withPool(fn) {
  return withDirLock(POOL_LOCK(), async () => {
    const ledger = readJson(POOL_FILE(), { format: 'tx2-pool/1', reservations: [], retainedVolumes: [], external: [] });
    const result = await fn(ledger);
    ledger.updatedAt = now();
    atomicJson(POOL_FILE(), ledger);
    return result;
  }, { label: 'pool lock' });
}

/** Drop reservations whose container is gone and whose reserving process is dead (crashed `up`). */
export function reconcile(ledger, allContainers) {
  const exists = new Set(allContainers.map(c => c.name));
  const dropped = [];
  ledger.reservations = ledger.reservations.filter(entry => {
    if (exists.has(entry.container) || pidAlive(entry.pid)) return true;
    dropped.push(entry);
    return false;
  });
  for (const entry of dropped) appendEvent({ event: 'reservation-dropped-stale', entry });
  return dropped;
}

// ---------------------------------------------------------------- slot owner

export const OWNER_FORMAT = 'tx2-slot-owner/1';
export function defaultHolder(args = {}) {
  return args.holder ?? process.env.TX2_HOLDER ?? `worktree:${REPO}`;
}
export function readOwner(info) {
  // [EXP-K01-R6] Why: a missing file is an explicit absence; a present malformed owner is a failed read. Rejected: treating JSON null/false or a partial owner as an unowned slot.
  let raw;
  try { raw = fs.readFileSync(info.ownerFile, 'utf8'); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  return complete(observe('slot owner', { file: info.ownerFile, lane: info.lane, slot: info.slot }, () => raw, value => {
    const owner = JSON.parse(text(value));
    if (!owner || typeof owner !== 'object' || Array.isArray(owner) || typeof owner.holder !== 'string' || !owner.holder) throw Error('incomplete slot owner');
    return owner;
  }));
}

// ---------------------------------------------------------------- source identity

// [EXP-K01-R6] Why: optional git failure is used only for historical stash metadata; canonical diff/head/file identity still requires successful reads. Rejected: using optional stash output as source PASS.
export function git(args, { allowFail = false } = {}) {
  try { return execFileSync('git', args, { cwd: REPO, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 }).trim(); }
  catch (error) { if (allowFail) return null; throw error; }
}
export function gitBuffer(args) {
  return execFileSync('git', args, { cwd: REPO, maxBuffer: 1024 * 1024 * 1024 });
}

// Untracked files under these roots are executed inputs and are hashed and stored.
export const SOURCE_ROOTS = ['packages', 'qualification', 'lab/bin', 'lab/config', 'vitest.workspace-aliases.ts', 'tsconfig.base.json', 'tsconfig.node.json', 'package.json', 'pnpm-workspace.yaml', 'pnpm-lock.yaml', 'turbo.json'];
const SECRET = /(token|secret|credential|\.pem$|\.key$|\.env)/i;

/**
 * Identity of the source that ran, including uncommitted changes. `git stash create` covers
 * tracked edits only, so untracked executed inputs and modified files are listed explicitly.
 */
export function sourceIdentity() {
  const head = git(['rev-parse', 'HEAD']);
  const headTree = git(['rev-parse', 'HEAD^{tree}']);
  const branch = git(['rev-parse', '--abbrev-ref', 'HEAD']);
  const porcelain = git(['status', '--porcelain=v1', '--untracked-files=all']);
  const dirty = porcelain.length > 0;
  // [EXP-K01-R6] Why: no optional stash is display/provenance absence, not missing canonical identity; sourceTreeId below still hashes required current diff and files. Rejected: certifying source from a failed stash.
  const stashCommit = dirty ? git(['stash', 'create'], { allowFail: true }) || null : null;
  const stashTree = stashCommit ? git(['rev-parse', `${stashCommit}^{tree}`]) : null;
  // Executed inputs only: changes outside SOURCE_ROOTS (notebooks, review logs written by other
  // agents) are listed by name but neither hashed into the source id nor stored as objects.
  const diff = gitBuffer(['diff', 'HEAD', '--binary', '--', ...SOURCE_ROOTS]);
  const modified = git(['diff', 'HEAD', '--name-only', '--', ...SOURCE_ROOTS]).split('\n').filter(Boolean);
  const otherDirtyPaths = gitBuffer(['status', '--porcelain=v1', '--', '.', ...SOURCE_ROOTS.map(root => `:(exclude)${root}`)]).toString('utf8').split('\n').filter(Boolean).map(line => line.slice(3));
  const untracked = git(['ls-files', '--others', '--exclude-standard', '--', ...SOURCE_ROOTS]).split('\n').filter(Boolean);
  const fileEntry = file => {
    const absolute = path.join(REPO, file);
    if (!fs.existsSync(absolute)) return { path: file, deleted: true };
    const stat = fs.statSync(absolute);
    if (!stat.isFile()) return { path: file, kind: 'non-file' };
    return { path: file, bytes: stat.size, sha256: sha256File(absolute), secretLike: SECRET.test(file) };
  };
  const untrackedFiles = untracked.map(fileEntry);
  const modifiedFiles = modified.map(fileEntry);
  const diffSha256 = sha256(diff);
  const sourceTreeId = sha256(JSON.stringify({ headTree, diffSha256, untracked: untrackedFiles.map(f => [f.path, f.sha256 ?? null]) }));
  return { head, headTree, branch, dirty, stashCommit, stashTree, diffScope: SOURCE_ROOTS, diffSha256, diffBytes: diff.length, modifiedFiles, untrackedFiles, otherDirtyPaths, sourceTreeId, diff };
}

// ---------------------------------------------------------------- object store

/** Content-addressed store under runs/objects/<sha256>. Never deleted by the harness. */
export function storeObject(bytes) {
  const digest = sha256(bytes);
  const target = path.join(OBJECTS, digest);
  if (!fs.existsSync(target)) {
    fs.mkdirSync(OBJECTS, { recursive: true });
    const temporary = `${target}.${randomUUID()}.tmp`;
    fs.writeFileSync(temporary, bytes, { mode: 0o444 });
    fs.renameSync(temporary, target);
  }
  return digest;
}
export function storeFile(file, { role, relativeTo = REPO } = {}) {
  const rel = path.relative(relativeTo, file);
  if (/(^|\/)(node_modules|\.pnpm-store)(\/|$)/.test(rel)) fail('OBJECT', `Refusing to store dependency cache ${rel}`);
  if (SECRET.test(path.basename(file))) return { path: rel, role, refused: 'secret-like name, not stored' };
  const bytes = fs.readFileSync(file);
  return { path: rel, role, bytes: bytes.length, sha256: storeObject(bytes) };
}

/** All regular files under a directory, sorted, with hashes. */
export function treeFiles(dir) {
  const out = [];
  const visit = current => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile()) out.push({ path: path.relative(REPO, absolute), bytes: fs.statSync(absolute).size, sha256: sha256File(absolute) });
    }
  };
  if (fs.existsSync(dir)) visit(dir);
  return out.sort((a, b) => a.path.localeCompare(b.path));
}

// ---------------------------------------------------------------- processes

/** Run a command, tee nothing, capture stdout/stderr to files; resolves with exit info. */
export function runLogged(command, args, { cwd = REPO, env = process.env, stdoutFile, stderrFile, timeoutMs } = {}) {
  return new Promise(resolve => {
    const started = Date.now();
    const out = fs.openSync(stdoutFile, 'w');
    const err = fs.openSync(stderrFile, 'w');
    const child = spawn(command, args, { cwd, env, stdio: ['ignore', out, err] });
    let timedOut = false;
    const timer = timeoutMs ? setTimeout(() => { timedOut = true; child.kill('SIGTERM'); setTimeout(() => child.kill('SIGKILL'), 10_000); }, timeoutMs) : null;
    child.on('close', (code, signal) => {
      if (timer) clearTimeout(timer);
      fs.closeSync(out); fs.closeSync(err);
      resolve({ command: [command, ...args].join(' '), code, signal, timedOut, elapsedMs: Date.now() - started });
    });
    child.on('error', error => {
      if (timer) clearTimeout(timer);
      fs.closeSync(out); fs.closeSync(err);
      resolve({ command: [command, ...args].join(' '), code: null, error: String(error), elapsedMs: Date.now() - started });
    });
  });
}

export function parseArgs(argv) {
  const positional = [], options = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--') { options['--'] = argv.slice(i + 1); break; }
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) options[key] = true;
      else { options[key] = next; i++; }
    } else positional.push(arg);
  }
  return { positional, options };
}

export function main(fn) {
  fn().catch(error => {
    process.stderr.write(`[lab] ${error.code ? error.code + ': ' : ''}${error.message}\n`);
    if (error.observation) process.stderr.write(json(error.observation));
    if (error.cleanup) process.stderr.write(json(error.cleanup));
    if (!(error instanceof LabError)) process.stderr.write(error.stack + '\n');
    process.exitCode = error.code === 'REFUSED' ? 3 : 1;
  });
}
