#!/usr/bin/env node
// lab/bin/engine.mjs up|down|status|logs --lane xtdb|qlever --slot dev|s1|s2|s3 [--fresh]
//   [--holder NAME] [--exp EXP-NNN] [--remove-volume] [--note TEXT] [--force] [--tail N]
//   [--follower [--follower-profile NAME]] [--cpuset-cpus LIST]
//
// [EXP-X05] --follower acts on the slot's read-only XTDB follower tx2-xtdb-<slot>-ro (R19 1.1, 1.7):
// same image and named volume, lab/config/xtdb-follower-config.yaml (readOnlyDatabases: true), its own
// pool reservation, held under the slot's lock by the slot's holder. --cpuset-cpus pins a writer or a
// follower to VM CPUs (R19 1.6: --cpus is a quota, not a pinning); the cpuset is part of the effective
// config, so a container started with one is recreated (--fresh) to drop it. Every XTDB start passes
// volumeGuard first: no second read-write container on a slot volume.
//
// [EXP-000] Why: one command per slot with an explicit reservation ledger, so two agents cannot
// both observe free capacity and both start (review r2 finding 12). The pool ledger
// (lab/locks/pool.json) is only read-modified-written under the exclusive mkdir lock
// lab/locks/pool.lock; stale locks are detected by pid liveness. Containers are tx2-<lane>-<slot>
// with named volumes tx2-<lane>-<slot>-data (virtiofs bind mounts are slow for databases); only
// the small read-only config file is bind-mounted.
// Rejected: docker compose per slot (project labels and a second config source of truth);
// a daemon (no process to babysit with at most 10 agents).
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { checkXtdb, quietXtdb, healthXtdb } from '../bench/lib/g0-xtdb.ts';
import net from 'node:net';
import path from 'node:path';
import {
  CONFIG_DIR, ENGINE_DIR, LabError, POOL_FILE, dockerArgs, OWNER_FORMAT, REPO, admission, appendEvent, atomicJson, checkFollowerConfig,
  containersOnVolume, cpusetOverlap, defaultHolder, docker, dockerStats, fail, fmtBytes, inspect, listTx2Containers, loadSlots, main, now,
  parseArgs, parseCpuset, readJson, readOwner, reconcile, sha256, sleep, slotInfo, vmDisk, volumeBytes, volumeGuard, withPool,
} from './lib.mjs';

/**
 * The read-only follower of an XTDB slot (EXP-X05): its own container, port and memory cap; the slot's
 * volume, lock and holder. Port is the slot port + portOffset (5471-5473 -> 5481-5483), checked like a slot port.
 */
export function followerInfo(config, info, opts = {}) {
  const conf = config.lanes.xtdb?.follower;
  if (info.lane !== 'xtdb' || !conf) fail('USAGE', 'followers exist only for the xtdb lane (slots.json lanes.xtdb.follower)');
  const port = info.port + conf.portOffset;
  // --follower-profile NAME swaps memory cap, JVM options and config file for a named smaller footprint (slots.json profiles).
  const profileName = opts['follower-profile'] ?? null;
  const profile = profileName ? conf.profiles?.[profileName] : {};
  if (!profile) fail('USAGE', `unknown follower profile ${profileName}; slots.json has ${Object.keys(conf.profiles ?? {}).join(', ') || 'none'}`);
  if (config.forbiddenPorts.includes(port)) fail('CONFIG', `Port ${port} is forbidden`);
  for (const range of config.reservedPortRanges) if (port >= range.from && port <= range.to) fail('CONFIG', `Port ${port} belongs to ${range.owner}`);
  return {
    ...info, role: 'follower', writer: info.container, container: `${info.container}-ro`, port,
    endpoint: info.laneConf.urlTemplate.replace('{port}', String(port)), memBytes: profile.memBytes ?? conf.memBytes, cpus: conf.cpus,
    javaOpts: profile.javaOpts ?? conf.javaOpts, profile: profileName,
    volumeMode: conf.volumeMode, configFile: path.join(CONFIG_DIR, profile.configFile ?? conf.configFile), configSource: profile.configFile ?? conf.configFile, diskForecastBytes: 0,
    cpusetCpus: opts['cpuset-cpus'] ? parseCpuset(opts['cpuset-cpus'], config.vm.cpus).join(',') : null,
  };
}

/**
 * Refuse unless volumeGuard passes on the config bytes this container will mount (R19 1.1: no second
 * read-write process on a Local log). Run before any destructive step and again right before docker
 * run/start, so a container that appeared in between is still seen. XTDB lane only: the hazard is the
 * XTDB Local log, and the QLever start path (chown init container) is left exactly as it was.
 */
export function assertSingleWriter(info, eff) {
  if (info.lane !== 'xtdb') return null;
  const verdict = volumeGuard({ volume: info.volume, container: info.container, configText: fs.readFileSync(eff.files.config, 'utf8'), mountedBy: containersOnVolume(info.volume) });
  if (!verdict.ok) fail('REFUSED', verdict.reason);
  return verdict;
}

/** Effective engine configuration: the bytes the container actually runs with. */
export function effectiveConfig(config, info) {
  const dir = path.join(ENGINE_DIR, `${info.lane}-${info.slot}${info.role === 'follower' ? '-ro' : ''}`);
  fs.mkdirSync(dir, { recursive: true });
  // [EXP-X05] A cpuset joins the effective config only when given, so every existing slot keeps its hash.
  const pin = info.cpusetCpus ? { cpusetCpus: info.cpusetCpus } : {};
  if (info.role === 'follower') {
    const yaml = fs.readFileSync(info.configFile);
    const file = path.join(dir, 'config.yaml');
    fs.writeFileSync(file, yaml);
    const effective = {
      lane: 'xtdb', slot: info.slot, role: 'follower', follows: info.writer, ...(info.profile ? { profile: info.profile } : {}), image: info.laneConf.image, configSource: info.configSource,
      configYamlSha256: sha256(yaml), env: { JDK_JAVA_OPTIONS: info.javaOpts }, memBytes: info.memBytes, cpus: info.cpus, ...pin,
      publish: `127.0.0.1:${info.port}:5432`, volume: `${info.volume}:/var/lib/xtdb${info.volumeMode === 'ro' ? ':ro' : ''}`, cmd: ['-f', '/etc/xtdb/config.yaml'],
      health: 'wget -q -O /dev/null http://127.0.0.1:8080/healthz/alive',
    };
    return { effective, sha256: sha256(JSON.stringify(effective)), files: { config: file } };
  }
  if (info.lane === 'xtdb') {
    // Unchanged repo xtdb-config.yaml (pgwire 5432, healthz 8080, local log and storage under
    // /var/lib/xtdb, 512 MiB memory cache). Heap and direct memory come from the slot.
    const yaml = fs.readFileSync(path.join(CONFIG_DIR, 'xtdb-config.yaml'));
    const file = path.join(dir, 'config.yaml');
    fs.writeFileSync(file, yaml);
    const effective = {
      lane: 'xtdb', slot: info.slot, image: info.laneConf.image, configYamlSha256: sha256(yaml),
      env: { JDK_JAVA_OPTIONS: info.javaOpts }, memBytes: info.memBytes, cpus: info.cpus, ...pin,
      publish: `127.0.0.1:${info.port}:5432`, volume: `${info.volume}:/var/lib/xtdb`, cmd: ['-f', '/etc/xtdb/config.yaml'],
      health: 'wget -q -O /dev/null http://127.0.0.1:8080/healthz/alive',
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
  };
  return { effective, sha256: sha256(JSON.stringify(effective)), files: { startScript: file } };
}

function runArgs(info, eff, holder) {
  const e = eff.effective;
  const common = [
    'run', '-d', '--name', info.container, '--restart', 'no',
    '--label', `tx2.lane=${info.lane}`, '--label', `tx2.slot=${info.slot}`, '--label', `tx2.config-sha256=${eff.sha256}`, '--label', `tx2.system-config-sha256=${sha256(JSON.stringify(systemConfig(eff.effective)))}`,
    '--label', `tx2.holder=${holder}`, '--label', 'tx2.managed-by=lab/bin/engine.mjs',
    ...(info.role === 'follower' ? ['--label', 'tx2.role=follower', '--label', `tx2.follows=${info.writer}`, '--label', `tx2.follower-profile=${info.profile ?? 'default'}`] : []),
    '--memory', String(info.memBytes), '--memory-swap', String(info.memBytes), '--cpus', String(info.cpus),
    ...(e.cpusetCpus ? ['--cpuset-cpus', e.cpusetCpus] : []),
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

function exportsFor(info) {
  if (info.role === 'follower') return `export XTDB_FOLLOWER_URL='${info.endpoint}'\nexport TX2_FOLLOWER_CONTAINER='${info.container}'`;
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

async function up(config, info, opts, hooks = {}) {
  const holder = defaultHolder(opts);
  const slot = acquireSlot(info, holder, opts.exp);
  try {
    const eff = effectiveConfig(config, info);
    const existing = inspect(info.container);
    if (existing && !opts.fresh && existing.Config.Labels?.['tx2.config-sha256'] !== eff.sha256)
      fail('REFUSED', `${info.container} runs config ${existing.Config.Labels?.['tx2.config-sha256']?.slice(0, 12)} but slots.json now gives ${eff.sha256.slice(0, 12)}; rerun with --fresh to recreate (wipes the volume)`);
    if (existing?.State.Running && !opts.fresh) {
      const ready = await waitReady(info, 60_000);
      process.stderr.write(`[lab] ${info.container} already running (${ready.why})\n`);
      process.stdout.write(exportsFor(info) + '\n');
      return;
    }
    // [EXP-X05] Before --fresh removes anything: a follower (or any other container) on this volume
    // makes this start a second container, and the writer config is read-write, so refuse now.
    assertSingleWriter(info, eff);
    // Reserve atomically before any docker run/start.
    await withPool(async ledger => {
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
      assertSingleWriter(info, eff);
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
        if (hooks.prepareVolume) await hooks.prepareVolume();
        docker(runArgs(info, eff, holder));
      }
      const ready = await waitReady(info);
      await withPool(async ledger => {
        const entry = ledger.reservations.find(item => item.container === info.container);
        if (entry) Object.assign(entry, { state: 'running', pid: null, configSha256: eff.sha256, readyAt: now() });
      });
      process.stderr.write(`[lab] ${info.container} ready (${ready.why}); cap ${fmtBytes(info.memBytes)}, ${info.cpus} CPU, config ${eff.sha256.slice(0, 12)}\n`);
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
  // [EXP-X05] A follower outliving its writer would block the next writer start (volumeGuard) and keep
  // its pool reservation; take it down first, explicitly.
  if (info.lane === 'xtdb' && config.lanes.xtdb.follower && inspect(`${info.container}-ro`))
    fail('REFUSED', `${info.container}-ro still exists; run: node lab/bin/engine.mjs down --lane xtdb --slot ${info.slot} --follower`);
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

/**
 * [EXP-X05] Start the slot's read-only follower (R19 1.7). Preconditions, each a refusal:
 * the slot is exclusive and held by this holder (a follower is part of that slot's reservation, never of
 * the shared dev resident); the writer is ready (R19 1.7: LOG and REPLICA_LOG must exist first); the
 * follower config is read-only with the writer's log and storage paths; writer and follower cpusets do
 * not overlap when either is pinned (R19 1.6); volumeGuard passes; the pool admits its memory cap.
 * A follower holds no state of its own (the volume is the writer's and it never writes), so a stopped or
 * differently configured follower container is removed and recreated rather than restarted.
 */
async function followerUp(config, info, fol, opts) {
  const holder = defaultHolder(opts);
  if (info.mode !== 'exclusive') fail('REFUSED', `followers attach only to exclusive slots, not ${info.lane}-${info.slot} (${info.mode})`);
  const owner = readOwner(info);
  if (!owner) fail('REFUSED', `${info.lane}-${info.slot} has no slot lock; start its writer first`);
  if (owner.holder !== holder) fail('REFUSED', `${info.lane}-${info.slot} is held by "${owner.holder}"; a follower belongs to the slot's holder`);
  const writer = inspect(info.container);
  const ready = writer?.State.Running ? await probe(info) : null;
  if (!ready?.ok) fail('REFUSED', `writer ${info.container} is not ready (${ready?.why ?? 'not running'}); R19 1.7: start the follower after the writer has created its logs`);
  const eff = effectiveConfig(config, fol);
  const writerConfig = writer.Mounts.find(mount => mount.Destination === '/etc/xtdb/config.yaml')?.Source;
  if (!writerConfig || !fs.existsSync(writerConfig)) fail('REFUSED', `cannot read the config file ${info.container} runs (${writerConfig ?? 'no /etc/xtdb/config.yaml mount'})`);
  const check = checkFollowerConfig(fs.readFileSync(writerConfig, 'utf8'), fs.readFileSync(eff.files.config, 'utf8'));
  if (!check.ok) fail('REFUSED', `follower config ${fol.configSource}: ${check.reasons.join('; ')}`);
  const writerCpuset = writer.HostConfig.CpusetCpus || null;
  if (writerCpuset || fol.cpusetCpus) {
    const shared = cpusetOverlap(writerCpuset, fol.cpusetCpus, config.vm.cpus);
    if (shared.length) fail('REFUSED', `follower cpuset ${fol.cpusetCpus ?? '(unpinned)'} shares CPUs ${shared.join(',')} with writer cpuset ${writerCpuset ?? '(unpinned)'}`);
  }
  const existing = inspect(fol.container);
  if (existing?.State.Running && existing.Config.Labels?.['tx2.config-sha256'] === eff.sha256) {
    const again = await waitReady(fol, 60_000);
    process.stderr.write(`[lab] ${fol.container} already running (${again.why})\n`);
    process.stdout.write(exportsFor(fol) + '\n');
    return;
  }
  assertSingleWriter(fol, eff);
  await withPool(async ledger => {
    const all = listTx2Containers({ all: true });
    reconcile(ledger, all);
    const request = { container: fol.container, memBytes: fol.memBytes, diskForecastBytes: 0 };
    const verdict = admission({ config, reservations: ledger.reservations, running: all, request, diskUsedBytes: vmDisk(config).usedBytes });
    ledger.external = verdict.external;
    if (!verdict.ok) throw new LabError('REFUSED', `pool refuses ${fol.container}: ${verdict.reasons.join('; ')}. Holding: ${verdict.holders.join(', ') || 'nothing'}`);
    ledger.reservations = ledger.reservations.filter(entry => entry.container !== fol.container);
    ledger.reservations.push({
      container: fol.container, lane: 'xtdb', slot: info.slot, role: 'follower', follows: info.container, memBytes: fol.memBytes, cpus: fol.cpus,
      diskForecastBytes: 0, holder, experiment: opts.exp ?? owner.experiment ?? null, pid: process.pid, state: 'starting', reservedAt: now(),
    });
    appendEvent({ event: 'reserved', container: fol.container, memAfter: verdict.memAfter, diskAfter: verdict.diskAfter });
  });
  try {
    if (existing) docker(['rm', '-f', fol.container]);
    assertSingleWriter(fol, eff);
    docker(runArgs(fol, eff, holder));
    const up = await waitReady(fol);
    await withPool(async ledger => {
      const entry = ledger.reservations.find(item => item.container === fol.container);
      if (entry) Object.assign(entry, { state: 'running', pid: null, configSha256: eff.sha256, readyAt: now() });
    });
    process.stderr.write(`[lab] ${fol.container} ready (${up.why}); follows ${info.container} on ${eff.effective.volume}; cap ${fmtBytes(fol.memBytes)}, ${fol.cpus} CPU${fol.cpusetCpus ? ` on ${fol.cpusetCpus}` : ''}, config ${eff.sha256.slice(0, 12)}\n`);
    process.stdout.write(exportsFor(fol) + '\n');
  } catch (error) {
    if (!inspect(fol.container)) await withPool(async ledger => { ledger.reservations = ledger.reservations.filter(e => e.container !== fol.container); });
    else await withPool(async ledger => { const e = ledger.reservations.find(item => item.container === fol.container); if (e) Object.assign(e, { state: 'failed', pid: null }); });
    throw error;
  }
}

/** [EXP-X05] Remove the follower and its reservation. The slot lock and the volume stay with the writer. */
async function followerDown(config, info, fol, opts) {
  const holder = defaultHolder(opts);
  const owner = readOwner(info);
  if (owner && owner.holder !== holder && !opts.force)
    fail('REFUSED', `${info.lane}-${info.slot} is held by "${owner.holder}"; pass --force only if you own it`);
  const existing = inspect(fol.container);
  if (existing) {
    if (existing.Config.Labels?.['tx2.role'] !== 'follower') fail('REFUSED', `${fol.container} is not a harness follower; not stopping it`);
    docker(['stop', '-t', '30', fol.container], { allowFail: true });
    docker(['rm', '-f', fol.container]);
  }
  if (inspect(fol.container)) fail('ENGINE', `${fol.container} still exists; reservation kept`);
  await withPool(async ledger => { ledger.reservations = ledger.reservations.filter(entry => entry.container !== fol.container); });
  appendEvent({ event: 'down', container: fol.container, role: 'follower' });
  process.stderr.write(`[lab] ${fol.container} removed; reservation released; ${info.container} and ${info.volume} untouched\n`);
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
    rows.push({
      slot: `${lane}-${slot}`, port: info.port, cap: `${fmtBytes(info.memBytes)}/${info.cpus}cpu`,
      state: c ? `${c.status}${c.health ? '/' + c.health : ''}` : '-', ready: ready ? (ready.ok ? 'READY' : 'NOT-READY ' + ready.why) : '-',
      mem: stats[info.container] ? fmtBytes(stats[info.container].memBytes) : '-', holder: owner ? `${owner.holder}${owner.experiment ? ' ' + owner.experiment : ''}` : '-',
    });
    // [EXP-X05] A follower shows as its own row under its slot when its container exists.
    const f = lane === 'xtdb' && config.lanes.xtdb.follower ? all.find(item => item.name === `${info.container}-ro`) : null;
    if (f) {
      const profile = f.labels['tx2.follower-profile'];
      const fol = followerInfo(config, info, profile && profile !== 'default' ? { 'follower-profile': profile } : {});
      const fready = f.running ? await probe(fol) : null;
      rows.push({
        slot: `${lane}-${slot}-ro`, port: fol.port, cap: `${fmtBytes(fol.memBytes)}/${fol.cpus}cpu`, state: `${f.status}${f.health ? '/' + f.health : ''}`,
        ready: fready ? (fready.ok ? 'READY' : 'NOT-READY ' + fready.why) : '-', mem: stats[fol.container] ? fmtBytes(stats[fol.container].memBytes) : '-',
        holder: owner ? `${owner.holder} (follower)` : '-',
      });
    }
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
}

export const canonicalJson = value => JSON.stringify(value, (key, v) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map(k => [k, v[k]])) : v));

/** The slot-independent part of an effective config: what a golden's bytes and a clone's behaviour depend on. */
export function systemConfig(effective) {
  return Object.fromEntries(Object.entries(effective).filter(([k]) => !["lane","slot","publish","volume","cpusetCpus"].includes(k)));
}

/**
 * Q74a golden key: the seed half (adapter commit and built dist hashes, world and seed-generator hashes, driver seed
 * options; written by lab/bench/xtdb-seed.ts into manifest.seedInputs) plus the engine half (image digest, system
 * config hash). A golden is valid only for exactly these inputs (R26 6.1, risk 1).
 */
export function goldenKey({ seedInputs, imageId, systemConfigSha256 }) {
  if (!seedInputs || !imageId || !systemConfigSha256) fail('USAGE', 'goldenKey needs seedInputs, imageId and systemConfigSha256');
  const inputs = { format: 'tx2-golden-key/1', seedInputs, engine: { imageId, systemConfigSha256 } };
  const key = sha256(canonicalJson(inputs));
  return { key, key8: key.slice(0, 8), inputs };
}


export const listingScript = dir => `(
set -eu; ${emptyTmpScript(dir)};
work=$(mktemp -d); trap 'rm -rf "$work"' EXIT; cd ${dir};
find . -type f ! -path '*/.tmp/*' -exec stat -c '%n|%s|%a|%u|%g' {} + > "$work/stat";
LC_ALL=C sort "$work/stat" > "$work/stat.sorted";
find . -type f ! -path '*/.tmp/*' -exec sha256sum {} + > "$work/sha";
LC_ALL=C sort -k 2 "$work/sha" > "$work/sha.sorted";
echo @@stat; cat "$work/stat.sorted"; echo @@sha; cat "$work/sha.sorted"; echo @@end
)`;

// [EXP-K01-R2] Why: interrupted uploads are forensic evidence, never disposable copy scratch (Q83b). Rejected: deleting .tmp to manufacture an equal tree.
export const emptyTmpScript = dir => `tmp=$(find ${dir}/buffers -path '*/.tmp/*' ! -type d -print); test -z "$tmp" || { echo 'non-empty .tmp refused' >&2; exit 1; }`;

/** Parse one listingScript output into sorted file records and a tree hash over every field. */
export function parseListing(text) {
  const stat = [], sha = new Map(), seen = new Set();
  let section = null, phase = 0;
  for (const line of String(text).split('\n')) {
    if (line.startsWith('@@')) { section = line.slice(2).trim(); if (section !== ['stat', 'sha', 'end'][phase++]) fail('ENGINE', 'listing sections are missing, duplicated or out of order'); continue; }
    if (!line.trim()) continue;
    if (section === 'stat') {
      const [p, bytes, mode, uid, gid, extra] = line.split('|');
      if (extra !== undefined || !p?.startsWith('./') || seen.has(p) || !/^(0|[1-9][0-9]*)$/.test(bytes) || !Number.isSafeInteger(Number(bytes)) || !/^[0-7]{3,4}$/.test(mode) || !/^[0-9]+$/.test(uid) || !/^[0-9]+$/.test(gid)) fail('ENGINE', 'invalid or duplicate file stat in tree preimage');
      seen.add(p);
      stat.push({ path: p, bytes: Number(bytes), mode, uid, gid });
    } else if (section === 'sha') {
      const m = /^([0-9a-f]{64})\s+(.+)$/.exec(line);
      if (!m) fail('ENGINE', `bad sha256sum line ${JSON.stringify(line)}`);
      if (sha.has(m[2])) fail('ENGINE', 'duplicate file hash in tree preimage');
      sha.set(m[2], m[1]);
    } else fail('ENGINE', 'unexpected bytes outside listing sections');
  }
  if (section !== 'end' || phase !== 3) fail('ENGINE', 'listing output is truncated (no @@end)');
  const files = stat.map(f => ({ ...f, sha256: sha.get(f.path) ?? null })).sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  if (files.some(f => !f.sha256) || sha.size !== files.length) fail('ENGINE', 'listing stat and sha256 sections disagree');
  const lines = files.map(f => `${f.path}|${f.bytes}|${f.mode}|${f.uid}|${f.gid}|${f.sha256}`);
  return { files, count: files.length, bytes: files.reduce((s, f) => s + f.bytes, 0), treeSha256: sha256(lines.join('\n') + '\n') };
}


// [EXP-K01-R7] Why: owner files describe slot ownership only; G0 in the driver grants reuse. Rejected: readiness certificates, lifecycle tokens, stopped-tail proofs and transported C3-C8 results.
export const HOST_DISK_FLOOR_BYTES = 5 * 1024 ** 3;
const HOST_DISK_PATH = REPO;
export const hostDisk = () => {
  const s = fs.statfsSync(HOST_DISK_PATH);
  return { freeBytes: s.bavail * s.bsize };
};
export function diskFloorVerdict({ freeBytes, copyBytes }) {
  return {
    ok:
      [freeBytes, copyBytes].every((n) => typeof n === "number" && Number.isFinite(n) && n >= 0) &&
      freeBytes - copyBytes >= HOST_DISK_FLOOR_BYTES,
    reason: "Q74f disk floor",
  };
}
function helper(config, name, mounts, script) {
  return docker([
    "run",
    "--rm",
    "--network",
    "none",
    "--name",
    name,
    "--memory",
    "512m",
    "--memory-swap",
    "512m",
    "-u",
    "0:0",
    ...mounts.flatMap((v) => ["-v", v]),
    "--entrypoint",
    "sh",
    config.lanes.xtdb.image,
    "-c",
    `set -eu; ${script}`,
  ]);
}
function requireSlot(info, opts) {
  const owner = readOwner(info);
  if (
    info.lane !== "xtdb" ||
    info.mode !== "exclusive" ||
    (owner && owner.holder !== defaultHolder(opts))
  )
    fail("REFUSED", "K01 needs this holder’s exclusive XTDB slot");
}
function stopped(info) {
  const c = inspect(info.container);
  if (!c || c.State.Running) fail("REFUSED", "copy needs an observed stopped source");
}
async function stopSlot(config, info, opts = {}) {
  requireSlot(info, opts);
  const start = Date.now();
  const result = spawnSync("docker", dockerArgs(["stop", "-t", "60", info.container]), {
    encoding: "utf8",
    timeout: 70_000,
  });
  // [EXP-K01-R7] Why: stop lines, exit code and duration explain failures but never grant or refuse content. Rejected: the Log4j shutdown race as an admission gate.
  const diagnostics = {
    stop: {
      status: result.status,
      signal: result.signal,
      stdout: result.stdout,
      stderr: result.stderr,
      ms: Date.now() - start,
    },
  };
  diagnostics.logs = docker(["logs", "--tail", "100", info.container], {
    allowFail: true,
    timeoutMs: 30_000,
  });
  stopped(info);
  return diagnostics;
}
function checkKey(config, info, record) {
  const eff = effectiveConfig(config, info);
  const system = sha256(JSON.stringify(systemConfig(eff.effective)));
  if (
    info.laneConf.imageId !== record.keyInputs.engine.imageId ||
    system !== record.keyInputs.engine.systemConfigSha256
  )
    fail("REFUSED", "K0 stale image/system config");
  return eff;
}
function loadGolden(file) {
  const record = readJson(path.resolve(file));
  if (record.format !== "tx2-xtdb-golden/2" || !record.g0?.D || !record.L)
    fail("REFUSED", "Q93 golden record required");
  const again = goldenKey({ seedInputs: record.keyInputs.seedInputs, ...record.keyInputs.engine });
  if (
    again.key !== record.key ||
    sha256File(path.resolve(REPO, record.manifest.path)) !== record.manifest.sha256
  )
    fail("REFUSED", "K0 stale key/manifest");
  return record;
}
async function copyToSlot(config, info, opts, record) {
  checkKey(config, info, record);
  if (containersOnVolume(record.volume).length) fail("REFUSED", "golden must not be mounted");
  if (
    !diskFloorVerdict({
      freeBytes: hostDisk().freeBytes,
      copyBytes: volumeBytes(config, record.volume),
    }).ok
  )
    fail("REFUSED", "copy disk floor");
  await up(
    config,
    info,
    { ...opts, fresh: true },
    {
      prepareVolume: async () => {
        docker(["volume", "create", "--label", "tx2.managed-by=lab/bin/engine.mjs", info.volume]);
        const tree = parseListing(
          helper(
            config,
            `tx2-k01-copy-${info.slot}`,
            [`${record.volume}:/src:ro`, `${info.volume}:/dst`],
            `cp -a /src/. /dst/; chown 20000:20000 /dst; sync; ${listingScript("/dst")}`,
          ),
        );
        if (tree.treeSha256 !== record.treeSha256) fail("REFUSED", "K1 copy tree differs");
      },
    },
  );
  await healthXtdb(info.endpoint, info.container);
}
async function fresh(config, info, opts) {
  requireSlot(info, opts);
  const m = readJson(path.resolve(opts.manifest));
  if (!m.g0?.D) fail("REFUSED", "pre-freeze pin required");
  const r = spawnSync(
    process.execPath,
    [
      path.join(REPO, "lab/bench/clone-check.ts"),
      "recipe",
      "--url",
      info.endpoint,
      "--container",
      info.container,
    ],
    { encoding: "utf8", timeout: 1_300_000 },
  );
  if (r.status !== 0) fail("REFUSED", "fresh-arm recipe refused");
  await stopSlot(config, info, opts);
  await up(config, info, { ...opts, fresh: false });
  await healthXtdb(info.endpoint, info.container);
  const layout = await quietXtdb(info.endpoint);
  const file = path.join(path.dirname(path.resolve(opts.manifest)), "fresh-state.json");
  fs.writeFileSync(
    file,
    JSON.stringify({
      ...layout,
      D: m.g0.D,
      manifestSha256: sha256File(path.resolve(opts.manifest)),
    }) + "\n",
    { flag: "wx" },
  );
  process.stdout.write(`export TRIPLEX_LAB_FRESH_STATE='${file}'\n`);
}
async function golden(config, info, opts) {
  requireSlot(info, opts);
  const manifestFile = path.resolve(opts.manifest),
    m = readJson(manifestFile);
  if (!m.g0?.D || !m.result.complete)
    fail("REFUSED", "pre-freeze G0 pin required in seed manifest");
  const file = path.join(path.dirname(manifestFile), "golden.json");
  if (fs.existsSync(file)) fail("REFUSED", "golden record already exists");
  const c = inspect(info.container),
    eff = effectiveConfig(config, info);
  const k = goldenKey({
    seedInputs: m.seedInputs,
    imageId: c.Image,
    systemConfigSha256: sha256(JSON.stringify(systemConfig(eff.effective))),
  });
  const volume = `tx2-golden-xtdb-${k.key8}`;
  // [EXP-K01-R7] Why: a failed lookup must not permit copying into an older golden. Rejected: suppressing volume-inspect errors as absence.
  if (docker(["volume", "ls", "--filter", `name=^${volume}$`, "--format", "{{.Name}}"]))
    fail("REFUSED", "golden volume already exists");
  // [EXP-K01-R7] Why: D is pinned in the seed writer before freeze. Rejected: deriving the expected content from the copied bytes.
  const recipe = spawnSync(
    process.execPath,
    [
      path.join(REPO, "lab/bench/clone-check.ts"),
      "recipe",
      "--url",
      info.endpoint,
      "--container",
      info.container,
    ],
    { encoding: "utf8", timeout: 1_300_000 },
  );
  if (recipe.status !== 0) fail("REFUSED", "freeze recipe failed or timed out");
  const diagnostics = await stopSlot(config, info, opts);
  if (
    !diskFloorVerdict({
      freeBytes: hostDisk().freeBytes,
      copyBytes: volumeBytes(config, info.volume),
    }).ok
  )
    fail("REFUSED", "golden disk floor");
  docker([
    "volume",
    "create",
    "--label",
    "tx2.managed-by=lab/bin/engine.mjs",
    "--label",
    "tx2.golden=1",
    volume,
  ]);
  process.stderr.write(
    `[K01] created ${volume}; retained until manual golden-rm, including on qualification failure\n`,
  );
  const raw = helper(
    config,
    `tx2-k01-golden-${info.slot}`,
    [`${info.volume}:/src:ro`, `${volume}:/dst`],
    `${listingScript("/src")}; echo @@copy; cp -a /src/. /dst/; chown 20000:20000 /dst; sync; ${listingScript("/dst")}`,
  );
  const [src, dst] = raw.split("@@copy").map(parseListing);
  if (src.treeSha256 !== dst.treeSha256) fail("REFUSED", "K1 golden copy differs");
  const record = {
    format: "tx2-xtdb-golden/2",
    key: k.key,
    keyInputs: k.inputs,
    volume,
    treeSha256: dst.treeSha256,
    g0: m.g0,
    manifest: { path: path.relative(REPO, manifestFile), sha256: sha256File(manifestFile) },
    diagnostics,
  };
  await copyToSlot(config, info, opts, record);
  const layout = await quietXtdb(info.endpoint);
  await checkXtdb(info.endpoint, m, m.g0);
  await stopSlot(config, info, opts);
  await up(config, info, { ...opts, fresh: false });
  await healthXtdb(info.endpoint, info.container);
  await quietXtdb(info.endpoint, layout);
  await checkXtdb(info.endpoint, m, m.g0);
  // [EXP-K01-R7] Why: publication follows two actual clone starts reproducing D and L. Rejected: checking only the source/reference or publishing a persisted readiness PASS.
  fs.writeFileSync(
    file,
    JSON.stringify({ ...record, ...layout, qualifiedAt: now() }, null, 2) + "\n",
    { flag: "wx" },
  );
  process.stderr.write(
    `[K01] published ${file}; kept golden ${volume} (${volumeBytes(config, volume)} bytes); qualification clone remains in ${info.volume}\n`,
  );
}
async function clone(config, info, opts) {
  requireSlot(info, opts);
  const record = loadGolden(opts["golden-record"]);
  await copyToSlot(config, info, opts, record);
  process.stdout.write(`export TRIPLEX_LAB_GOLDEN='${path.resolve(opts["golden-record"])}'\n`);
}
async function goldenRm(config, opts) {
  const volume = opts.volume ?? loadGolden(opts["golden-record"]).volume;
  if (!/^tx2-golden-xtdb-[0-9a-f]{8}$/.test(volume) || containersOnVolume(volume).length)
    fail("REFUSED", "manual golden cleanup needs an unmounted owned golden name");
  const labels = JSON.parse(docker(["volume", "inspect", volume]))[0]?.Labels;
  if (labels?.["tx2.managed-by"] !== "lab/bin/engine.mjs" || labels?.["tx2.golden"] !== "1")
    fail("REFUSED", "golden cleanup needs managed golden labels");
  docker(["volume", "rm", volume]);
}

if (import.meta.url === `file://${process.argv[1]}`)
  main(async () => {
    const { positional, options } = parseArgs(process.argv.slice(2));
    const command = positional[0];
    const config = loadSlots();
    if (command === "golden-rm") return goldenRm(config, options);
    if (command === "status") return status(config);
    if (
      !["up", "down", "logs", "golden", "clone", "fresh", "stop", "listing", "toolcheck"].includes(
        command,
      )
    )
      fail(
        "USAGE",
        "usage: engine.mjs up|down|status|logs --lane xtdb|qlever --slot dev|s1|s2|s3 [--fresh] [--follower] [--cpuset-cpus LIST]",
      );
    if (!options.lane || !options.slot) fail("USAGE", "--lane and --slot are required");
    const info = slotInfo(config, options.lane, options.slot);
    if (options.follower) {
      const fol = followerInfo(config, info, options);
      if (command === "up") return followerUp(config, info, fol, options);
      if (command === "down") return followerDown(config, info, fol, options);
      spawnSync(
        "docker",
        dockerArgs(["logs", "--tail", String(options.tail ?? 200), fol.container]),
        { stdio: "inherit" },
      );
      return;
    }
    if (options["cpuset-cpus"])
      info.cpusetCpus = parseCpuset(options["cpuset-cpus"], config.vm.cpus).join(",");
    if (command === "fresh") return fresh(config, info, options);
    if (command === "golden") return golden(config, info, options);
    if (command === "clone") return clone(config, info, options);
    if (command === "stop") {
      console.log(JSON.stringify(await stopSlot(config, info, options)));
      return;
    }
    if (command === "listing") {
      stopped(info);
      console.log(
        helper(
          config,
          `tx2-k01-list-${info.slot}`,
          [`${info.volume}:/src:ro`],
          listingScript("/src"),
        ),
      );
      return;
    }
    if (command === "toolcheck") {
      console.log(docker(["version"]));
      return;
    }
    if (command === "up") return up(config, info, options);
    if (command === "down") return down(config, info, options);
    spawnSync(
      "docker",
      dockerArgs(["logs", "--tail", String(options.tail ?? 200), info.container]),
      { stdio: "inherit" },
    );
  });
