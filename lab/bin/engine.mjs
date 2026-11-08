#!/usr/bin/env node
// lab/bin/engine.mjs up|down|status|logs --lane xtdb|qlever --slot dev|s1|s2|s3 [--fresh]
//   [--holder NAME] [--exp EXP-NNN] [--remove-volume] [--note TEXT] [--force] [--tail N]
//
// [EXP-000] Why: one command per slot with an explicit reservation ledger, so two agents cannot
// both observe free capacity and both start (review r2 finding 12). The pool ledger
// (lab/locks/pool.json) is only read-modified-written under the exclusive mkdir lock
// lab/locks/pool.lock; stale locks are detected by pid liveness. Containers are tx2-<lane>-<slot>
// with named volumes tx2-<lane>-<slot>-data (virtiofs bind mounts are slow for databases); only
// the small read-only config file is bind-mounted.
// Rejected: docker compose per slot (project labels and a second config source of truth);
// a daemon (no process to babysit with at most 10 agents).
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import {
  CONFIG_DIR, ENGINE_DIR, LabError, POOL_FILE, dockerArgs, OWNER_FORMAT, REPO, admission, appendEvent, atomicJson, defaultHolder, docker, dockerStats,
  fail, fmtBytes, inspect, listTx2Containers, loadSlots, main, now, parseArgs, readJson, readOwner, reconcile, sha256,
  sleep, slotInfo, vmDisk, volumeBytes, withPool,
} from './lib.mjs';
import { readMeasureLease } from './heavy-lock.mjs';

// [EXP-M01] Why (R22 section 3; RULINGS Q60c): a `--cpus 2` quota is itself a noise source on this host (the busiest
// slot used 1.9 cores while 77% of its 100 ms CFS periods were throttled). A slot with "regime": "cpuset" gets a
// cpuset of `cpus` vCPUs and no CFS quota (`--cpuset-cpus`, set at creation because a running JVM does not re-read
// its CPU count). Quota slots keep their exact effective config, so their config hash and running containers are
// untouched. Rejected: `docker update --cpuset-cpus` on running containers (the JVM keeps its old CPU count) and
// a smaller `--cpu-period` (mitigation only).
export const cpuList = text => {
  const out = new Set();
  for (const part of String(text ?? '').split(',').map(x => x.trim()).filter(Boolean)) {
    const [a, b] = part.split('-').map(Number);
    for (let c = a; c <= (b ?? a); c++) out.add(c);
  }
  return out;
};
export const regimeOf = info => info.regime ?? 'quota';

/** Effective engine configuration: the bytes the container actually runs with. */
export function effectiveConfig(config, info) {
  const dir = path.join(ENGINE_DIR, `${info.lane}-${info.slot}`);
  fs.mkdirSync(dir, { recursive: true });
  if (info.lane === 'xtdb') {
    // Unchanged repo xtdb-config.yaml (pgwire 5432, healthz 8080, local log and storage under
    // /var/lib/xtdb, 512 MiB memory cache). Heap and direct memory come from the slot.
    const yaml = fs.readFileSync(path.join(CONFIG_DIR, 'xtdb-config.yaml'));
    const file = path.join(dir, 'config.yaml');
    fs.writeFileSync(file, yaml);
    const effective = {
      lane: 'xtdb', slot: info.slot, image: info.laneConf.image, configYamlSha256: sha256(yaml),
      env: { JDK_JAVA_OPTIONS: info.javaOpts }, memBytes: info.memBytes, cpus: info.cpus,
      publish: `127.0.0.1:${info.port}:5432`, volume: `${info.volume}:/var/lib/xtdb`, cmd: ['-f', '/etc/xtdb/config.yaml'],
      health: 'wget -q -O /dev/null http://127.0.0.1:8080/healthz/alive',
      ...cpusetFields(info),
    };
    return { effective, sha256: sha256(JSON.stringify(effective)), files: { config: file } };
  }
  // QLever: repo qlever-start.sh with the slot's query memory (-m). Port stays 7019 inside.
  const original = fs.readFileSync(path.join(CONFIG_DIR, 'qlever-start.sh'), 'utf8');
  if (!/ -m 2G /.test(original)) fail('CONFIG', 'qlever-start.sh no longer has "-m 2G"; update engine.mjs');
  const script = original.replace(' -m 2G ', ` -m ${info.qleverMemory} `);
  const file = path.join(dir, 'start.sh');
  fs.writeFileSync(file, script);
  const effective = {
    lane: 'qlever', slot: info.slot, image: info.laneConf.image, startScriptSha256: sha256(script),
    sourceStartScriptSha256: sha256(original), qleverMemory: info.qleverMemory, memBytes: info.memBytes, cpus: info.cpus,
    publish: `127.0.0.1:${info.port}:7019`, volume: `${info.volume}:/data`, volumeInit: 'marker /data/.tx2-volume, chown -R 999:999 /data (image user qlever); no -w (start.sh does cd /data)', entrypoint: ['/bin/bash', '/config/start.sh'],
    health: "curl -fsS -o /dev/null 'http://127.0.0.1:7019/?query=SELECT%20*%20WHERE%20%7B%20%3Fs%20%3Fp%20%3Fo%20%7D%20LIMIT%201'",
    ...cpusetFields(info),
  };
  return { effective, sha256: sha256(JSON.stringify(effective)), files: { startScript: file } };
}

/** Only cpuset slots carry these keys, so a quota slot's effective config (and its sha256) is byte-identical to before. */
function cpusetFields(info) {
  if (regimeOf(info) === 'quota') return {};
  if (regimeOf(info) !== 'cpuset') fail('CONFIG', `${info.lane}-${info.slot}: unknown regime ${info.regime}`);
  if (cpuList(info.cpuset).size !== info.cpus) fail('CONFIG', `${info.lane}-${info.slot}: cpuset "${info.cpuset}" has ${cpuList(info.cpuset).size} vCPUs, cpus is ${info.cpus}`);
  return { regime: 'cpuset', cpuset: info.cpuset };
}

export function runArgs(info, eff, holder) {
  const e = eff.effective;
  const cpu = regimeOf(info) === 'cpuset' ? ['--cpuset-cpus', info.cpuset] : ['--cpus', String(info.cpus)];
  const common = [
    'run', '-d', '--name', info.container, '--restart', 'no',
    '--label', `tx2.lane=${info.lane}`, '--label', `tx2.slot=${info.slot}`, '--label', `tx2.config-sha256=${eff.sha256}`,
    '--label', `tx2.holder=${holder}`, '--label', 'tx2.managed-by=lab/bin/engine.mjs',
    '--memory', String(info.memBytes), '--memory-swap', String(info.memBytes), ...cpu,
    '-p', e.publish, '-v', e.volume,
    '--health-cmd', e.health, '--health-interval', '5s', '--health-timeout', '3s', '--health-start-period', '20s', '--health-retries', '3',
  ];
  if (info.lane === 'xtdb')
    return [...common, '-e', `JDK_JAVA_OPTIONS=${info.javaOpts}`, '-v', `${eff.files.config}:/etc/xtdb/config.yaml:ro`, info.laneConf.image, ...e.cmd];
  return [...common, '--platform', 'linux/arm64', '-v', `${eff.files.startScript}:/config/start.sh:ro`, '--entrypoint', '/bin/bash', info.laneConf.image, '/config/start.sh'];
}

const tcpOpen = port => new Promise(resolve => {
  const socket = net.connect({ host: '127.0.0.1', port });
  socket.setTimeout(2000);
  socket.on('connect', () => { socket.destroy(); resolve(true); });
  socket.on('error', () => resolve(false));
  socket.on('timeout', () => { socket.destroy(); resolve(false); });
});

/** Host-side readiness: XTDB container healthz + pgwire port open; QLever answers a SPARQL query. */
export async function probe(info) {
  const c = inspect(info.container);
  if (!c?.State.Running) return { ok: false, why: `container ${c ? c.State.Status : 'absent'}` };
  if (info.lane === 'xtdb') {
    const health = c.State.Health?.Status;
    const open = await tcpOpen(info.port);
    return { ok: health === 'healthy' && open, why: `health=${health} pgwire=${open ? 'open' : 'closed'}` };
  }
  try {
    const response = await fetch(`${info.endpoint}/?query=${encodeURIComponent('SELECT * WHERE { ?s ?p ?o } LIMIT 1')}`,
      { headers: { Accept: 'application/sparql-results+json' }, signal: AbortSignal.timeout(5000) });
    return { ok: response.ok, why: `sparql HTTP ${response.status}` };
  } catch (error) { return { ok: false, why: `sparql ${error.cause?.code ?? error.message}` }; }
}

async function waitReady(info, timeoutMs = 240_000) {
  const started = Date.now();
  let last;
  while (Date.now() - started < timeoutMs) {
    last = await probe(info);
    if (last.ok) return last;
    const c = inspect(info.container);
    if (c && !c.State.Running && c.State.Status === 'exited') fail('ENGINE', `${info.container} exited (code ${c.State.ExitCode}); see: node lab/bin/engine.mjs logs --lane ${info.lane} --slot ${info.slot}`);
    await sleep(2000);
  }
  fail('ENGINE', `${info.container} not ready after ${timeoutMs / 1000}s (${last?.why})`);
}

/**
 * Effective cgroup v2 values as the container sees them (its own cgroup namespace): what Q60c binds into
 * owner.json and PAIR receipts, read back rather than assumed from the docker flags.
 */
export function parseCgroup(text) {
  const [cpuMax, cpuset, cpuWeight, ...rest] = String(text ?? '').split('\n');
  if (!cpuMax || cpuset === undefined) return null;
  const stat = Object.fromEntries(rest.map(line => line.trim().split(/\s+/)).filter(f => f.length === 2 && /^\d+$/.test(f[1])).map(([k, v]) => [k, Number(v)]));
  const out = { cpuMax: cpuMax.trim(), cpuset: cpuset.trim(), cpuWeight: Number(cpuWeight) };
  if (stat.nr_periods !== undefined) Object.assign(out, { usageUsec: stat.usage_usec, nrPeriods: stat.nr_periods, nrThrottled: stat.nr_throttled, throttledUsec: stat.throttled_usec,
    throttledShare: stat.nr_periods ? stat.nr_throttled / stat.nr_periods : 0 });
  return out;
}
export function cgroupOf(container) {
  try {
    return parseCgroup(execFileSync('docker', dockerArgs(['exec', container, 'cat', '/sys/fs/cgroup/cpu.max', '/sys/fs/cgroup/cpuset.cpus.effective', '/sys/fs/cgroup/cpu.weight', '/sys/fs/cgroup/cpu.stat']),
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 15_000 }));
  } catch { return null; }
}
/** VM-wide PSI cpu line, read inside any running container (/proc/pressure is not namespaced). */
function vmPsi(container) {
  try { return execFileSync('docker', dockerArgs(['exec', container, 'cat', '/proc/pressure/cpu']), { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 15_000 }).split('\n')[0].trim(); }
  catch { return null; }
}
/** After ready: bind the effective cgroup values into owner.json; warn when a cpuset slot is not what slots.json says. */
function recordCgroup(info) {
  const cgroup = cgroupOf(info.container);
  const owner = readOwner(info);
  if (owner) atomicJson(info.ownerFile, { ...owner, regime: regimeOf(info), cgroup, cgroupAt: now() });
  if (regimeOf(info) === 'cpuset' && (!cgroup || !cgroup.cpuMax.startsWith('max') || cgroup.cpuset !== info.cpuset))
    process.stderr.write(`[lab] WARNING ${info.container}: effective cgroup ${JSON.stringify(cgroup)} is not cpuset ${info.cpuset} without quota\n`);
  return cgroup;
}

function exportsFor(info) {
  const lines = [
    `export ${info.laneConf.envVar}='${info.endpoint}'`,
    ...Object.entries(info.laneConf.integrationEnv).map(([k, v]) => `export ${k}=${v}`),
    `export TRIPLEX_LAB_SLOT_OWNER='${info.ownerFile}'`,
    `export DOCKER_HOST='unix:///Users/sam/.colima/triplex2/docker.sock'  # only for manual docker calls; never the default context`,
  ];
  // The lab QLever server runs with --no-access-check, so no QLEVER_ACCESS_TOKEN is needed.
  return lines.join('\n');
}

/** Acquire (or confirm) the persistent slot lock. dev is a shared resident; s* are exclusive. */
function acquireSlot(info, holder, experiment) {
  fs.mkdirSync(path.dirname(info.lockDir), { recursive: true });
  let created = false;
  try { fs.mkdirSync(info.lockDir); created = true; } catch (error) { if (error.code !== 'EEXIST') throw error; }
  if (!created) {
    let owner = readOwner(info);
    for (let i = 0; !owner && i < 25; i++) { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 200); owner = readOwner(info); }
    if (!owner) fail('REFUSED', `${info.lockDir} exists without owner.json; inspect and remove it by hand if abandoned`);
    if (owner.holder !== holder && info.mode !== 'resident')
      fail('REFUSED', `${info.lane}-${info.slot} is held by "${owner.holder}" (${owner.experiment ?? 'no experiment'}) since ${owner.createdAt}`);
    return { owner, created: false };
  }
  const owner = {
    format: OWNER_FORMAT, lane: info.lane, slot: info.slot, mode: info.mode, container: info.container, volume: info.volume,
    endpoint: info.endpoint, port: info.port, holder, experiment: experiment ?? null, pid: process.pid, worktree: REPO, createdAt: now(),
  };
  atomicJson(info.ownerFile, owner);
  appendEvent({ event: 'slot-acquired', slot: `${info.lane}-${info.slot}`, holder });
  return { owner, created: true };
}

function releaseSlot(info) {
  fs.rmSync(info.lockDir, { recursive: true, force: true });
  appendEvent({ event: 'slot-released', slot: `${info.lane}-${info.slot}` });
}

async function up(config, info, opts) {
  const holder = defaultHolder(opts);
  const slot = acquireSlot(info, holder, opts.exp);
  try {
    const eff = effectiveConfig(config, info);
    const existing = inspect(info.container);
    if (existing && !opts.fresh && existing.Config.Labels?.['tx2.config-sha256'] !== eff.sha256)
      fail('REFUSED', `${info.container} runs config ${existing.Config.Labels?.['tx2.config-sha256']?.slice(0, 12)} but slots.json now gives ${eff.sha256.slice(0, 12)}; rerun with --fresh to recreate (wipes the volume)`);
    if (existing?.State.Running && !opts.fresh) {
      const ready = await waitReady(info, 60_000);
      recordCgroup(info);
      process.stderr.write(`[lab] ${info.container} already running (${ready.why})\n`);
      process.stdout.write(exportsFor(info) + '\n');
      return;
    }
    // Reserve atomically before any docker run/start.
    await withPool(async ledger => {
      // [EXP-M01] Q60h: a measurement window freezes pool admission for everyone but the lease holder.
      const lease = readMeasureLease();
      if (lease && !lease.stale && lease.holder !== holder)
        throw new LabError('REFUSED', `pool admission is frozen by the measurement lease of "${lease.holder}" (${lease.label}) since ${lease.at}`);
      const all = listTx2Containers({ all: true });
      reconcile(ledger, all);
      const disk = vmDisk(config);
      const request = { container: info.container, memBytes: info.memBytes, diskForecastBytes: info.diskForecastBytes };
      const verdict = admission({ config, reservations: ledger.reservations, running: all, request, diskUsedBytes: disk.usedBytes });
      ledger.external = verdict.external;
      if (!verdict.ok)
        throw new LabError('REFUSED', `pool refuses ${info.container}: ${verdict.reasons.join('; ')}. Holding: ${verdict.holders.join(', ') || 'nothing'}`);
      ledger.reservations = ledger.reservations.filter(entry => entry.container !== info.container);
      ledger.reservations.push({
        container: info.container, lane: info.lane, slot: info.slot, memBytes: info.memBytes, cpus: info.cpus,
        diskForecastBytes: info.diskForecastBytes, holder, experiment: opts.exp ?? null, pid: process.pid, state: 'starting', reservedAt: now(),
      });
      appendEvent({ event: 'reserved', container: info.container, memAfter: verdict.memAfter, diskAfter: verdict.diskAfter });
    });
    try {
      if (opts.fresh) {
        if (existing) docker(['rm', '-f', info.container]);
        docker(['volume', 'rm', info.volume], { allowFail: true });
        if (docker(['volume', 'inspect', info.volume], { allowFail: true })) fail('ENGINE', `volume ${info.volume} still exists after --fresh removal`);
      }
      if (existing && !opts.fresh) docker(['start', info.container]);
      else {
        if (info.lane === 'qlever') {
          // The QLever image runs as uid 999 and has no /data, so a new named volume would be
          // root-owned. Give it to uid 999 once instead of running the server as root.
          docker(['volume', 'create', '--label', 'tx2.managed-by=lab/bin/engine.mjs', info.volume]);
          // The marker keeps the volume non-empty: docker copies the mount point's ownership onto an
          // EMPTY named volume at container create, which silently undid the chown (seen 2026-11-07).
          docker(['run', '--rm', '--network', 'none', '-u', '0:0', '-v', `${info.volume}:/data`, '--entrypoint', 'sh', info.laneConf.image,
            '-c', 'echo "tx2 volume initialized for uid 999" > /data/.tx2-volume && chown -R 999:999 /data']);
        }
        docker(runArgs(info, eff, holder));
      }
      const ready = await waitReady(info);
      const cgroup = recordCgroup(info);
      await withPool(async ledger => {
        const entry = ledger.reservations.find(item => item.container === info.container);
        if (entry) Object.assign(entry, { state: 'running', pid: null, configSha256: eff.sha256, readyAt: now(), regime: regimeOf(info), cpuset: cgroup?.cpuset ?? null });
      });
      process.stderr.write(`[lab] ${info.container} ready (${ready.why}); cap ${fmtBytes(info.memBytes)}, ${regimeOf(info) === 'cpuset' ? `cpuset ${info.cpuset} (no quota)` : `${info.cpus} CPU quota`}, cgroup cpu.max ${cgroup?.cpuMax ?? '?'}, config ${eff.sha256.slice(0, 12)}\n`);
      process.stdout.write(exportsFor(info) + '\n');
    } catch (error) {
      // Keep the reservation while a container exists (it may hold memory); drop it otherwise.
      if (!inspect(info.container)) await withPool(async ledger => { ledger.reservations = ledger.reservations.filter(e => e.container !== info.container); });
      else await withPool(async ledger => { const e = ledger.reservations.find(item => item.container === info.container); if (e) Object.assign(e, { state: 'failed', pid: null }); });
      throw error;
    }
  } catch (error) {
    if (slot.created && !inspect(info.container)) releaseSlot(info);
    throw error;
  }
}

async function down(config, info, opts) {
  const holder = defaultHolder(opts);
  const owner = readOwner(info);
  if (owner && owner.holder !== holder && !opts.force)
    fail('REFUSED', `${info.lane}-${info.slot} is held by "${owner.holder}"; pass --force only if you own it`);
  const existing = inspect(info.container);
  if (existing) {
    if (!existing.Config.Labels?.['tx2.managed-by']) fail('REFUSED', `${info.container} was not started by lab/bin/engine.mjs; not stopping it`);
    docker(['stop', '-t', '30', info.container], { allowFail: true });
    docker(['rm', '-f', info.container]);
  }
  // Prove cleanup before releasing anything.
  if (inspect(info.container)) fail('ENGINE', `${info.container} still exists; reservation kept`);
  let volumeNote;
  if (opts['remove-volume']) {
    docker(['volume', 'rm', info.volume], { allowFail: true });
    if (docker(['volume', 'inspect', info.volume], { allowFail: true })) fail('ENGINE', `volume ${info.volume} still exists; reservation kept`);
    volumeNote = 'removed';
  } else volumeNote = docker(['volume', 'inspect', info.volume], { allowFail: true }) ? 'retained' : 'absent';
  await withPool(async ledger => {
    ledger.reservations = ledger.reservations.filter(entry => entry.container !== info.container);
    ledger.retainedVolumes = (ledger.retainedVolumes ?? []).filter(entry => entry.volume !== info.volume);
    if (volumeNote === 'retained')
      ledger.retainedVolumes.push({ volume: info.volume, holder, note: opts.note ?? 'retained by engine down (default)', at: now(), bytes: volumeBytes(config, info.volume) });
  });
  releaseSlot(info);
  appendEvent({ event: 'down', container: info.container, volume: volumeNote });
  process.stderr.write(`[lab] ${info.container} removed; volume ${info.volume} ${volumeNote}; reservation and slot lock released\n`);
}

async function status(config) {
  const all = listTx2Containers({ all: true });
  const stats = Object.fromEntries(dockerStats().map(row => [row.name, row]));
  const ledger = readJson(POOL_FILE(), { reservations: [], retainedVolumes: [] });
  const rows = [];
  for (const lane of Object.keys(config.slots)) for (const slot of Object.keys(config.slots[lane])) {
    const info = slotInfo(config, lane, slot);
    const c = all.find(item => item.name === info.container);
    const owner = readOwner(info);
    const ready = c?.running ? await probe(info) : null;
    // [EXP-M01] regime and lifetime throttled share (nr_throttled / nr_periods) per running container (R22 section 3).
    const cg = c?.running ? cgroupOf(info.container) : null;
    rows.push({
      slot: `${lane}-${slot}`, port: info.port, cap: `${fmtBytes(info.memBytes)}/${info.cpus}cpu`,
      // The configured regime; "!" marks a running container whose effective cgroup does not match it (made under other config).
      regime: `${regimeOf(info) === 'cpuset' ? `cpuset:${info.cpuset}` : 'quota'}${cg && (regimeOf(info) === 'cpuset') !== cg.cpuMax.startsWith('max') ? '!' : ''}`,
      state: c ? `${c.status}${c.health ? '/' + c.health : ''}` : '-', ready: ready ? (ready.ok ? 'READY' : 'NOT-READY ' + ready.why) : '-',
      throttled: cg ? `${(100 * (cg.throttledShare ?? 0)).toFixed(0)}%${cg.cpuMax.startsWith('max') ? '(noquota)' : ''}` : '-',
      mem: stats[info.container] ? fmtBytes(stats[info.container].memBytes) : '-', holder: owner ? `${owner.holder}${owner.experiment ? ' ' + owner.experiment : ''}` : '-',
    });
  }
  const widths = Object.keys(rows[0]).map(key => Math.max(key.length, ...rows.map(row => String(row[key]).length)));
  const line = values => values.map((value, i) => String(value).padEnd(widths[i])).join('  ');
  console.log(line(Object.keys(rows[0])));
  for (const row of rows) console.log(line(Object.values(row)));
  const disk = vmDisk(config);
  const verdict = admission({ config, reservations: ledger.reservations, running: all, request: { container: '(none)', memBytes: 0, diskForecastBytes: 0 }, diskUsedBytes: disk.usedBytes });
  console.log(`\npool: ${fmtBytes(verdict.memUsed)} of ${fmtBytes(config.pool.memLimitBytes)} reserved; disk ${fmtBytes(disk.usedBytes)} used + ${fmtBytes(verdict.diskForecast)} forecast of ${fmtBytes(config.pool.diskUsedLimitBytes)}`);
  for (const entry of ledger.reservations) console.log(`  reservation ${entry.container} ${fmtBytes(entry.memBytes)} ${entry.cpus}cpu state=${entry.state} holder=${entry.holder}`);
  for (const entry of verdict.external) console.log(`  external    ${entry.container} ${fmtBytes(entry.memBytes)} ${entry.nanoCpus ? entry.nanoCpus / 1e9 + 'cpu' : 'uncapped-cpu'}${entry.uncapped ? ' UNCAPPED (counts as whole VM)' : ''}`);
  for (const entry of ledger.retainedVolumes ?? []) console.log(`  retained volume ${entry.volume} ${fmtBytes(entry.bytes)} holder=${entry.holder} note=${entry.note}`);
  const anyRunning = all.find(c => c.running);
  const psi = anyRunning ? vmPsi(anyRunning.name) : null;
  if (psi) console.log(`vm psi cpu: ${psi}`);
  const lease = readMeasureLease();
  if (lease) console.log(`measurement lease: ${lease.stale ? 'STALE ' : ''}held by "${lease.holder}" (${lease.label}) since ${lease.at}; pool admission frozen for others`);
}

if (import.meta.url === `file://${process.argv[1]}`) main(async () => {
  const { positional, options } = parseArgs(process.argv.slice(2));
  const command = positional[0];
  const config = loadSlots();
  if (command === 'status') return status(config);
  if (!['up', 'down', 'logs'].includes(command)) fail('USAGE', 'usage: engine.mjs up|down|status|logs --lane xtdb|qlever --slot dev|s1|s2|s3 [--fresh]');
  if (!options.lane || !options.slot) fail('USAGE', '--lane and --slot are required');
  const info = slotInfo(config, options.lane, options.slot);
  if (command === 'up') return up(config, info, options);
  if (command === 'down') return down(config, info, options);
  spawnSync('docker', dockerArgs(['logs', '--tail', String(options.tail ?? 200), info.container]), { stdio: 'inherit' });
});
