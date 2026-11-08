#!/usr/bin/env node
// lab/bin/engine.mjs up|down|status|logs --lane xtdb|qlever --slot dev|s1|s2|s3 [--fresh]
//   [--holder NAME] [--exp EXP-NNN] [--remove-volume] [--note TEXT] [--force] [--tail N]
//   [--follower [--follower-profile NAME]] [--cpuset-cpus LIST]
// lab/bin/engine.mjs settle|stop|verify|listing --lane xtdb --slot S;  golden --lane xtdb --slot S --manifest FILE;
//   clone --lane xtdb --slot S --golden-record FILE [--no-verify];  golden-rm --golden-record FILE;  toolcheck
//   (EXP-K01 seed once, clone faithfully; the section above status() explains each)
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
import net from 'node:net';
import path from 'node:path';
import {
  CONFIG_DIR, DOCKER_HOST, ENGINE_DIR, LabError, POOL_FILE, dockerArgs, OWNER_FORMAT, REPO, admission, appendEvent, atomicJson, checkFollowerConfig,
  containersOnVolume, cpusetOverlap, defaultHolder, docker, dockerStats, fail, fmtBytes, inspect, listTx2Containers, loadSlots, main, now,
  parseArgs, parseCpuset, readJson, readOwner, reconcile, sha256, sha256File, sleep, slotInfo, vmDisk, volumeBytes, volumeGuard, withPool,
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
    '--label', `tx2.lane=${info.lane}`, '--label', `tx2.slot=${info.slot}`, '--label', `tx2.config-sha256=${eff.sha256}`,
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

/**
 * [EXP-K01] GET an XTDB healthz path from inside the container (the lab publishes only pgwire). The image's wget is GNU
 * wget (`apk add wget`, references/xtdb/docker/Dockerfile): -S prints the status line on stderr, --content-on-error keeps
 * a 503 body. Returns { status, body }; status null when the exec itself failed.
 */
export function healthz(container, route, { post = false } = {}) {
  const r = spawnSync('docker', dockerArgs(['exec', container, 'wget', '-q', '-S', '--content-on-error', '-O', '-', ...(post ? ['--post-data='] : []), `http://127.0.0.1:8080${route}`]), { encoding: 'utf8', timeout: 30_000 });
  const status = Number((/HTTP\/[\d.]+ (\d{3})/.exec(r.stderr ?? '') ?? [])[1]) || null;
  return { status, body: (r.stdout ?? '').trim(), exit: r.status };
}

/**
 * Host-side readiness: XTDB container healthz + pgwire port open + (writers) /healthz/started; QLever answers a SPARQL query.
 * [EXP-K01] R26 1.2 item 9 and RULINGS Q74d: /healthz/alive does not wait for replay, so a restarted or cloned writer
 * could pass on alive while it still replays REPLICA_LOG and answer reads from a partial state. /healthz/started returns
 * 200 only once every critical database has processed up to the log head it saw at start. A fresh node passes at once.
 * Followers keep the alive-only rule (EXP-X05 behaviour unchanged).
 */
export async function probe(info) {
  const c = inspect(info.container);
  if (!c?.State.Running) return { ok: false, why: `container ${c ? c.State.Status : 'absent'}` };
  if (info.lane === 'xtdb') {
    const health = c.State.Health?.Status;
    const open = await tcpOpen(info.port);
    if (info.role === 'follower' || health !== 'healthy' || !open) return { ok: health === 'healthy' && open, why: `health=${health} pgwire=${open ? 'open' : 'closed'}` };
    const started = healthz(info.container, '/healthz/started');
    return { ok: started.status === 200, why: `health=${health} pgwire=open started=${started.status ?? 'exec-failed'}${started.status === 200 ? '' : ` ${started.body.slice(0, 120)}`}` };
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

/**
 * hooks.prepareVolume (EXP-K01 clone): runs after the reservation and the --fresh removal, right before docker run, so
 * a clone fills the new volume before the first start (Docker then never populates it from the image directory).
 */
async function up(config, info, opts, hooks = {}) {
  const holder = defaultHolder(opts);
  const slot = acquireSlot(info, holder, opts.exp);
  try {
    const eff = effectiveConfig(config, info);
    const existing = inspect(info.container);
    // [EXP-K01] The owner record says what the slot volume holds; a --fresh start wipes it, and a restart makes an
    // earlier readiness verdict stale (the start appends a NoOp to REPLICA_LOG and replays), so it is re-run by `verify`.
    if (slot.owner.volumeContent && (opts.fresh || !existing?.State.Running)) {
      const owner = readOwner(info);
      if (opts.fresh) delete owner.volumeContent;
      else owner.volumeContent.readiness = { verdict: 'STALE', reason: `restarted at ${now()}; run engine.mjs verify` };
      atomicJson(info.ownerFile, owner);
    }
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
        if (hooks.prepareVolume) await hooks.prepareVolume(eff);
        assertSingleWriter(info, eff);
        hooks.marks && (hooks.marks.runAt = Date.now());
        docker(runArgs(info, eff, holder));
      }
      const ready = await waitReady(info);
      hooks.marks && (hooks.marks.readyAt = Date.now());
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

// ---------------------------------------------------------------- seed once, clone faithfully (EXP-K01)
//
// [EXP-K01] Why: every XTDB A0, NS and PAIR-0 run seeds its slot through the commit path, 38 minutes or more at the 10k
// rung (EXP-N01 A0 receipt). R26 section 6: seed once on an exclusive slot, settle it, prove a clean stop, copy the
// stopped volume into a write-once golden volume, and start faithful copies of it on any slot with the same system
// config (RULINGS Q74a-g). Subcommands (XTDB lane, exclusive slots held by the caller):
//   settle     POST /system/finish-block, then wait for compactor jobs 0 and an empty live index (Q74b)
//   stop       docker stop -t 60 and prove the stop was clean; container, lock and reservation stay
//   golden     settle, freeze fingerprint (C3-C8), clean stop, copy into tx2-golden-xtdb-<key8>, golden.json beside the manifest
//   clone      wipe the slot volume, copy a golden in, start, gate on /healthz/started, then C1-C8 (Q74d)
//   verify     re-run C2-C8 on a cloned slot (after a restart)
//   listing    list a stopped slot's volume (path, size, mode, owner, sha256), optionally diffed with a golden (R26 P-e)
//   golden-rm  remove a golden volume that no container mounts
//   toolcheck  the helper image's tools that R26 assumes (R26 P-g)
// The SQL side of settle, freeze and verify is lab/bench/clone-check.ts (it needs the built XTDB client; lab/bin takes no
// dependencies). Rejected: hard links and overlay volumes (R26 3.2: shared inodes, a different I/O path); copying a
// running engine (torn LOG tail); R26 6.3's empty-node start before the copy (the copy fills a new volume before the
// first docker run instead, so Docker never populates it from the image and the owner is set once, explicitly).

export const HOST_DISK_FLOOR_BYTES = 5 * 1024 ** 3;
const HOST_DISK_PATH = process.env.TX2_HOST_DISK_PATH ?? path.dirname(path.dirname(new URL(DOCKER_HOST).pathname));
const GOLDEN_RECORD_FORMAT = 'tx2-xtdb-golden/1';
const XTDB_UID = '20000:20000';
// M01's PAIR system/placement split (Q67g): fields that differ between slots without changing what the engine runs.
const PLACEMENT_FIELDS = ['slot', 'publish', 'volume', 'cpuset', 'cpusetCpus'];

/** Canonical JSON (sorted keys at every level), so a key does not depend on property order. */
export const canonicalJson = value => JSON.stringify(value, (key, v) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map(k => [k, v[k]])) : v));

/** The slot-independent part of an effective config: what a golden's bytes and a clone's behaviour depend on. */
export function systemConfig(effective) {
  return Object.fromEntries(Object.entries(effective).filter(([k]) => !PLACEMENT_FIELDS.includes(k)));
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

/** Q74f: refuse a copy that would leave the host below the floor. The VM disk is a sparse file, so a copy can grow it by its size. */
export function diskFloorVerdict({ freeBytes, copyBytes, floorBytes = HOST_DISK_FLOOR_BYTES }) {
  const afterBytes = freeBytes - copyBytes;
  return { ok: afterBytes >= floorBytes, freeBytes, copyBytes, afterBytes, floorBytes,
    reason: afterBytes >= floorBytes ? null : `host free disk ${fmtBytes(freeBytes)} - copy ${fmtBytes(copyBytes)} = ${fmtBytes(afterBytes)} < floor ${fmtBytes(floorBytes)} (Q74f)` };
}
export function hostDisk() {
  const s = fs.statfsSync(HOST_DISK_PATH);
  return { path: HOST_DISK_PATH, freeBytes: s.bavail * s.bsize, totalBytes: s.blocks * s.bsize };
}

/**
 * R26 1.5 item 2: a stop is clean only if the log of this run says `Node stopped.`, never `could not stop node cleanly`
 * (the shutdown hook's halt(1) after 10 s, references/xtdb/main/src/main/clojure/xtdb/main.clj:81-98), and the JVM
 * exited 0 or 143 (SIGTERM). 137 is a SIGKILL after the grace period; 1 is the halt.
 */
export function stopVerdict({ log, exitCode, oomKilled }) {
  const reasons = [];
  const stoppedLine = String(log).split('\n').reverse().find(line => line.includes('Node stopped.')) ?? null;
  if (!stoppedLine) reasons.push('no "Node stopped." in this run\'s log');
  if (/could not stop node cleanly/.test(log)) reasons.push('log says "could not stop node cleanly"');
  if (![0, 143].includes(exitCode)) reasons.push(`exit code ${exitCode}`);
  if (oomKilled) reasons.push('OOM killed');
  return { ok: reasons.length === 0, stoppedLine: stoppedLine?.trim().slice(0, 300) ?? null, exitCode, oomKilled: !!oomKilled, reasons };
}

/**
 * Helper-container listing of a mounted directory: one stat line and one sha256 line per regular file, `.tmp` upload
 * scratch excluded (R26 1.1: transient, moved into place by rename). BusyBox find/stat/sha256sum/sort (R26 P-g).
 */
export const listingScript = dir => `echo @@stat; cd ${dir} && find . -type f ! -path '*/.tmp/*' -exec stat -c '%n|%s|%a|%u|%g' {} + | LC_ALL=C sort; `
  + `echo @@sha; cd ${dir} && find . -type f ! -path '*/.tmp/*' -exec sha256sum {} + | LC_ALL=C sort -k 2; echo @@end`;

/** Parse one listingScript output into sorted file records and a tree hash over every field. */
export function parseListing(text) {
  const stat = [], sha = new Map();
  let section = null;
  for (const line of String(text).split('\n')) {
    if (line.startsWith('@@')) { section = line.slice(2).trim(); continue; }
    if (!line.trim()) continue;
    if (section === 'stat') {
      const [p, bytes, mode, uid, gid] = line.split('|');
      stat.push({ path: p, bytes: Number(bytes), mode, uid, gid });
    } else if (section === 'sha') {
      const m = /^([0-9a-f]{64})\s+(.+)$/.exec(line);
      if (!m) fail('ENGINE', `bad sha256sum line ${JSON.stringify(line)}`);
      sha.set(m[2], m[1]);
    }
  }
  if (section !== 'end') fail('ENGINE', 'listing output is truncated (no @@end)');
  const files = stat.map(f => ({ ...f, sha256: sha.get(f.path) ?? null })).sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  if (files.some(f => !f.sha256) || sha.size !== files.length) fail('ENGINE', 'listing stat and sha256 sections disagree');
  const lines = files.map(f => `${f.path}|${f.bytes}|${f.mode}|${f.uid}|${f.gid}|${f.sha256}`);
  return { files, count: files.length, bytes: files.reduce((s, f) => s + f.bytes, 0), treeSha256: sha256(lines.join('\n') + '\n') };
}

/** Files that differ between two listings (R26 P-e: a first start may only append to the logs and add files). */
export function diffListings(before, after) {
  const a = new Map(before.files.map(f => [f.path, f])), b = new Map(after.files.map(f => [f.path, f]));
  const changed = [...a.keys()].filter(p => b.has(p) && (a.get(p).sha256 !== b.get(p).sha256 || a.get(p).bytes !== b.get(p).bytes || a.get(p).mode !== b.get(p).mode || a.get(p).uid !== b.get(p).uid));
  const removed = [...a.keys()].filter(p => !b.has(p));
  const added = [...b.keys()].filter(p => !a.has(p));
  const logs = new Set(['./log/LOG', './log/REPLICA_LOG']);
  const changedOutsideLogs = changed.filter(p => !logs.has(p));
  return { changed, added, removed, changedOutsideLogs, storageImmutable: changedOutsideLogs.length === 0 && removed.length === 0 };
}

/** One throwaway helper on the pinned image, root, no network, memory-capped, named tx2-clone-* (counted as external by others' admission). */
function helper(config, name, mounts, script) {
  return docker(['run', '--rm', '--network', 'none', '-u', '0:0', '--name', name, '--memory', '512m', '--memory-swap', '512m',
    '--label', 'tx2.managed-by=lab/bin/engine.mjs', '--label', 'tx2.role=clone-helper', ...mounts.flatMap(m => ['-v', m]),
    '--entrypoint', 'sh', config.lanes.xtdb.image, '-c', `set -eu; ${script}`]);
}
const sections = (text, marker) => { const i = text.indexOf(marker); if (i < 0) fail('ENGINE', `helper output has no ${marker}`); return [text.slice(0, i), text.slice(i + marker.length)]; };

/** lab/bench/clone-check.ts (settle | freeze | verify); progress on stderr, one JSON document on stdout. */
function cloneCheck(args) {
  const r = spawnSync(process.execPath, [path.join(REPO, 'lab/bench/clone-check.ts'), ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], maxBuffer: 256 << 20, timeout: 3600_000 });
  let out = null;
  try { out = JSON.parse(r.stdout); } catch {}
  if (!out) fail('ENGINE', `clone-check ${args[0]} exited ${r.status} without a JSON verdict: ${String(r.stdout).slice(-800)}`);
  return out;
}

function requireHeldXtdbSlot(info, opts) {
  if (info.lane !== 'xtdb') fail('USAGE', 'golden, clone and settle exist for the xtdb lane only (R26 6.4 has the QLever variant, not built)');
  if (info.mode !== 'exclusive') fail('REFUSED', `${info.lane}-${info.slot} is ${info.mode}; clones and goldens use exclusive slots only`);
  const owner = readOwner(info);
  if (owner && owner.holder !== defaultHolder(opts)) fail('REFUSED', `${info.lane}-${info.slot} is held by "${owner.holder}"`);
  return owner;
}
function requireRunningSlot(config, info) {
  const c = inspect(info.container);
  if (!c?.State.Running) fail('REFUSED', `${info.container} is not running`);
  const eff = effectiveConfig(config, info);
  if (c.Config.Labels?.['tx2.config-sha256'] !== eff.sha256) fail('REFUSED', `${info.container} runs config ${c.Config.Labels?.['tx2.config-sha256']?.slice(0, 12)}, not the effective ${eff.sha256.slice(0, 12)}`);
  if (c.Image !== info.laneConf.imageId) fail('REFUSED', `${info.container} image ${c.Image} is not the pinned ${info.laneConf.imageId}`);
  return { c, eff };
}
const writeJson = (file, value) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n'); };

/** Q74b settle on a running slot (also the fresh-seeded arm's settle in E1). */
async function settle(config, info, opts) {
  if (!readOwner(info)) fail('REFUSED', `${info.lane}-${info.slot} has no slot lock`);
  requireHeldXtdbSlot(info, opts);
  requireRunningSlot(config, info);
  const out = cloneCheck(['settle', '--url', info.endpoint, '--container', info.container, ...(opts['timeout-s'] ? ['--timeout-s', String(opts['timeout-s'])] : [])]);
  process.stdout.write(JSON.stringify(out, null, 2) + '\n');
  if (!out.settled) fail('ENGINE', `${info.container} did not settle: ${out.reason}`);
  return out;
}

/** docker stop -t 60 and the clean-stop proof (R26 1.5 item 2). Container, slot lock and reservation stay. */
async function stopSlot(config, info, opts) {
  if (!readOwner(info)) fail('REFUSED', `${info.lane}-${info.slot} has no slot lock`);
  requireHeldXtdbSlot(info, opts);
  const before = inspect(info.container);
  if (!before) fail('REFUSED', `${info.container} does not exist`);
  if (!before.Config.Labels?.['tx2.managed-by']) fail('REFUSED', `${info.container} was not started by lab/bin/engine.mjs`);
  const t0 = Date.now();
  if (before.State.Running) docker(['stop', '-t', '60', info.container], { allowFail: true });
  const stopMs = Date.now() - t0;
  const after = inspect(info.container);
  if (after?.State.Running) fail('ENGINE', `${info.container} still running after docker stop -t 60`);
  const logs = spawnSync('docker', dockerArgs(['logs', '--since', before.State.StartedAt, info.container]), { encoding: 'utf8', maxBuffer: 256 << 20 });
  const verdict = stopVerdict({ log: `${logs.stdout ?? ''}\n${logs.stderr ?? ''}`, exitCode: after.State.ExitCode, oomKilled: after.State.OOMKilled });
  await withPool(async ledger => { const e = ledger.reservations.find(item => item.container === info.container); if (e) Object.assign(e, { state: 'stopped', stoppedAt: now() }); });
  appendEvent({ event: 'stopped', container: info.container, clean: verdict.ok });
  const out = { container: info.container, containerId: after.Id, startedAt: before.State.StartedAt, finishedAt: after.State.FinishedAt, stopMs, wasRunning: before.State.Running, verdict };
  if (opts.print !== false) process.stdout.write(JSON.stringify(out, null, 2) + '\n');
  return out;
}

/**
 * Golden (R26 6.2): settle, freeze record, clean stop, copy into a new write-once volume through a read-only source mount.
 * The slot stays held with its container stopped; release it with `down --remove-volume` or clone onto it.
 */
async function golden(config, info, opts) {
  if (!readOwner(info)) fail('REFUSED', `${info.lane}-${info.slot} has no slot lock`);
  requireHeldXtdbSlot(info, opts);
  if (!opts.manifest) fail('USAGE', 'golden needs --manifest runs/xtdb-seed/<name>/manifest.json (lab/bench/xtdb-seed.ts)');
  const manifestFile = path.resolve(String(opts.manifest));
  const manifest = readJson(manifestFile);
  if (manifest.format !== 'tx2-xtdb-seed/1' || manifest.lane !== 'xtdb') fail('REFUSED', `${manifestFile} is ${manifest.format}/${manifest.lane}, not an XTDB seed manifest`);
  if (!manifest.result?.complete) fail('REFUSED', `the seed in ${manifestFile} is incomplete (${manifest.result?.seededSubjects}/${manifest.subjects})`);
  const recordFile = path.join(path.dirname(manifestFile), 'golden.json');
  if (fs.existsSync(recordFile)) fail('REFUSED', `${recordFile} exists: one golden per seed manifest`);
  const { c, eff } = requireRunningSlot(config, info);
  const systemConfigSha256 = sha256(JSON.stringify(systemConfig(eff.effective)));
  const k = goldenKey({ seedInputs: manifest.seedInputs, imageId: c.Image, systemConfigSha256 });
  const volume = `tx2-golden-xtdb-${k.key8}`;
  if (docker(['volume', 'inspect', volume], { allowFail: true })) fail('REFUSED', `${volume} already exists (goldens are write-once; engine.mjs golden-rm first)`);
  const timings = {};
  let t = Date.now();
  const settled = cloneCheck(['settle', '--url', info.endpoint, '--container', info.container]);
  timings.settleS = (Date.now() - t) / 1000;
  if (!settled.settled) fail('ENGINE', `${info.container} did not settle: ${settled.reason}`);
  t = Date.now();
  const freeze = cloneCheck(['freeze', '--url', info.endpoint, '--container', info.container, '--manifest', manifestFile]);
  timings.freezeS = (Date.now() - t) / 1000;
  if (!freeze.ok) fail('ENGINE', `freeze fingerprint failed: ${JSON.stringify(freeze.errors ?? freeze).slice(0, 600)}`);
  const stop = await stopSlot(config, info, { ...opts, print: false });
  timings.stopS = stop.stopMs / 1000;
  if (!stop.verdict.ok) fail('REFUSED', `${info.container} did not stop cleanly (${stop.verdict.reasons.join('; ')}); no golden made`);
  const sourceBytes = volumeBytes(config, info.volume);
  const diskBefore = hostDisk();
  const floor = diskFloorVerdict({ freeBytes: diskBefore.freeBytes, copyBytes: sourceBytes });
  if (!floor.ok) fail('REFUSED', floor.reason);
  docker(['volume', 'create', '--label', 'tx2.managed-by=lab/bin/engine.mjs', '--label', 'tx2.golden=1', '--label', `tx2.seed-key=${k.key}`, volume]);
  t = Date.now();
  let src, dst;
  try {
    const out = helper(config, `tx2-clone-gold-${k.key8}`, [`${info.volume}:/src:ro`, `${volume}:/dst`],
      `${listingScript('/src')}; echo @@copy; cp -a /src/. /dst/; find /dst -name .tmp -type d -prune -exec rm -rf {} +; chown ${XTDB_UID} /dst; sync; ${listingScript('/dst')}`);
    const [a, b] = sections(out, '@@copy');
    src = parseListing(a);
    dst = parseListing(b);
  } catch (error) { docker(['volume', 'rm', volume], { allowFail: true }); throw error; }
  timings.copyS = (Date.now() - t) / 1000;
  if (src.treeSha256 !== dst.treeSha256) { docker(['volume', 'rm', volume], { allowFail: true }); fail('ENGINE', `golden copy differs from its source (${src.treeSha256.slice(0, 12)} vs ${dst.treeSha256.slice(0, 12)}); golden removed`); }
  const goldenBytes = volumeBytes(config, volume);
  const filesFile = path.join(path.dirname(manifestFile), 'golden-files.json');
  writeJson(filesFile, dst.files);
  const pick = name => dst.files.find(f => f.path === name)?.sha256 ?? null;
  const record = {
    format: GOLDEN_RECORD_FORMAT, key: k.key, key8: k.key8, keyInputs: k.inputs, volume, createdAt: now(), holder: defaultHolder(opts), experiment: opts.exp ?? null,
    manifest: { path: path.relative(REPO, manifestFile), sha256: sha256File(manifestFile), scope: manifest.scope, subjects: manifest.subjects, lastPosition: manifest.result.lastPosition, seedWallS: manifest.capture?.wallS ?? null },
    source: { slot: info.slot, container: info.container, containerId: c.Id, volume: info.volume, imageId: c.Image, configSha256: eff.sha256, systemConfigSha256, systemConfig: systemConfig(eff.effective) },
    settle: settled, freeze, stop,
    copy: { sourceBytes, goldenBytes, files: dst.count, fileBytes: dst.bytes, treeSha256: dst.treeSha256, logSha256: pick('./log/LOG'), replicaLogSha256: pick('./log/REPLICA_LOG'), filesFile: path.relative(REPO, filesFile), filesSha256: sha256File(filesFile), sourceMatches: true },
    hostDisk: { before: diskBefore, after: hostDisk(), floor },
    timings,
    rule: 'never start an engine on this volume; clone it (engine.mjs clone --golden-record this file)',
  };
  writeJson(recordFile, record);
  await withPool(async ledger => {
    ledger.goldens = (ledger.goldens ?? []).filter(g => g.volume !== volume);
    ledger.goldens.push({ volume, key: k.key, bytes: goldenBytes, holder: defaultHolder(opts), record: recordFile, at: now() });
  });
  appendEvent({ event: 'golden-created', volume, key: k.key, bytes: goldenBytes });
  process.stderr.write(`[lab] golden ${volume} (${fmtBytes(goldenBytes)}, ${dst.count} files, tree ${dst.treeSha256.slice(0, 12)}) from ${info.container}; settle ${timings.settleS.toFixed(1)} s, freeze ${timings.freezeS.toFixed(1)} s, stop ${timings.stopS.toFixed(1)} s, copy ${timings.copyS.toFixed(1)} s\n[lab] record ${recordFile}; ${info.container} is stopped and still held\n`);
  process.stdout.write(JSON.stringify({ record: recordFile, volume, key: k.key, timings }) + '\n');
}

/** Read and check a golden record: its key recomputes, its volume exists with that key, its manifest is unchanged. */
function loadGolden(file) {
  const recordFile = path.resolve(String(file));
  const record = readJson(recordFile);
  if (record.format !== GOLDEN_RECORD_FORMAT) fail('REFUSED', `${recordFile} is not a ${GOLDEN_RECORD_FORMAT} record`);
  const again = goldenKey({ seedInputs: record.keyInputs.seedInputs, imageId: record.keyInputs.engine.imageId, systemConfigSha256: record.keyInputs.engine.systemConfigSha256 });
  if (again.key !== record.key) fail('REFUSED', `${recordFile}: key does not recompute from its inputs`);
  const vol = docker(['volume', 'inspect', record.volume], { allowFail: true });
  if (!vol) fail('REFUSED', `golden volume ${record.volume} does not exist`);
  if (JSON.parse(vol)[0].Labels?.['tx2.seed-key'] !== record.key) fail('REFUSED', `${record.volume} is labelled with another key`);
  const manifestFile = path.resolve(REPO, record.manifest.path);
  if (!fs.existsSync(manifestFile) || sha256File(manifestFile) !== record.manifest.sha256) fail('REFUSED', `seed manifest ${record.manifest.path} is missing or changed since the golden was made`);
  return { record, recordFile, manifestFile };
}

/**
 * Clone (R26 6.3, folded into up): pool admission and reservation, remove the slot container and volume, create the
 * volume, copy the golden in through a read-only mount, chown the root to the XTDB user, check C1 against the golden,
 * docker run with the slot's own effective config, wait for /healthz/started (probe), then C2-C8 (clone-check verify).
 */
async function clone(config, info, opts) {
  requireHeldXtdbSlot(info, opts);
  if (!opts['golden-record']) fail('USAGE', 'clone needs --golden-record runs/xtdb-seed/<name>/golden.json');
  const { record, recordFile, manifestFile } = loadGolden(opts['golden-record']);
  const eff = effectiveConfig(config, info);
  const systemConfigSha256 = sha256(JSON.stringify(systemConfig(eff.effective)));
  if (systemConfigSha256 !== record.keyInputs.engine.systemConfigSha256 || info.laneConf.imageId !== record.keyInputs.engine.imageId)
    fail('REFUSED', `stale golden: ${info.container} would run system config ${systemConfigSha256.slice(0, 12)} on ${info.laneConf.imageId.slice(7, 19)}, the golden was made on ${record.keyInputs.engine.systemConfigSha256.slice(0, 12)} on ${record.keyInputs.engine.imageId.slice(7, 19)} (Q74a)`);
  if (containersOnVolume(record.volume).length) fail('REFUSED', `golden ${record.volume} is mounted by ${containersOnVolume(record.volume).join(', ')}`);
  const goldenBytes = volumeBytes(config, record.volume);
  const marks = { begin: Date.now() };
  let copy = null;
  await up(config, info, { ...opts, fresh: true }, {
    marks,
    prepareVolume: async () => {
      const disk = hostDisk();
      const floor = diskFloorVerdict({ freeBytes: disk.freeBytes, copyBytes: goldenBytes });
      if (!floor.ok) fail('REFUSED', floor.reason);
      docker(['volume', 'create', '--label', 'tx2.managed-by=lab/bin/engine.mjs', '--label', `tx2.cloned-from=${record.volume}`, '--label', `tx2.seed-key=${record.key}`, info.volume]);
      const t = Date.now();
      let listing;
      try {
        listing = parseListing(helper(config, `tx2-clone-${info.slot}`, [`${record.volume}:/src:ro`, `${info.volume}:/dst`],
          `cp -a /src/. /dst/; chown ${XTDB_UID} /dst; sync; ${listingScript('/dst')}`));
      } catch (error) { docker(['volume', 'rm', info.volume], { allowFail: true }); throw error; }
      copy = { startedAt: new Date(t).toISOString(), copyS: (Date.now() - t) / 1000, goldenBytes, files: listing.count, fileBytes: listing.bytes, treeSha256: listing.treeSha256, hostDisk: { before: disk, floor } };
      copy.c1 = { pass: listing.treeSha256 === record.copy.treeSha256, expected: record.copy.treeSha256, observed: listing.treeSha256, files: listing.count, expectedFiles: record.copy.files };
      if (!copy.c1.pass) {
        const diff = diffListings({ files: readJson(path.resolve(REPO, record.copy.filesFile)) }, listing);
        docker(['volume', 'rm', info.volume], { allowFail: true });
        fail('ENGINE', `C1 failed: copy of ${record.volume} differs from the golden (changed ${diff.changed.length}, added ${diff.added.length}, removed ${diff.removed.length}); volume removed, nothing started`);
      }
    },
  });
  const c = inspect(info.container);
  const owner = readOwner(info);
  owner.volumeContent = {
    kind: 'clone', goldenVolume: record.volume, key: record.key, goldenRecord: path.relative(REPO, recordFile), goldenRecordSha256: sha256File(recordFile),
    manifest: record.manifest.path, manifestSha256: record.manifest.sha256, freezeSha256: sha256(canonicalJson(record.freeze)), clonedAt: now(), containerId: c.Id, startedAt: c.State.StartedAt,
    copy, timings: { copyS: copy.copyS, runToStartedS: (marks.readyAt - marks.runAt) / 1000, totalToStartedS: (marks.readyAt - marks.begin) / 1000 },
    readiness: { verdict: 'PENDING' },
  };
  atomicJson(info.ownerFile, owner);
  appendEvent({ event: 'cloned', container: info.container, golden: record.volume, key: record.key });
  process.stderr.write(`[lab] ${info.container} cloned from ${record.volume}: copy ${copy.copyS.toFixed(1)} s, C1 PASS (${copy.files} files), docker run to /healthz/started ${owner.volumeContent.timings.runToStartedS.toFixed(1)} s\n`);
  if (opts['no-verify']) return;
  await verify(config, info, opts);
}

/** C2-C8 on a cloned slot against its golden's freeze record; the verdict lands in owner.json (the driver requires PASS). */
async function verify(config, info, opts) {
  requireHeldXtdbSlot(info, opts);
  const owner = readOwner(info);
  const content = owner?.volumeContent;
  if (content?.kind !== 'clone') fail('REFUSED', `${info.lane}-${info.slot} holds no clone (owner.json volumeContent)`);
  requireRunningSlot(config, info);
  const { recordFile } = loadGolden(path.resolve(REPO, content.goldenRecord));
  const t = Date.now();
  const verdict = cloneCheck(['verify', '--url', info.endpoint, '--container', info.container, '--golden-record', recordFile, '--owner', info.ownerFile]);
  const file = path.join(REPO, 'runs/xtdb-clone', `${info.slot}-${new Date().toISOString().replace(/[:.]/g, '')}.json`);
  writeJson(file, verdict);
  const latest = readOwner(info);
  latest.volumeContent.readiness = { verdict: verdict.verdict, at: now(), checksS: (Date.now() - t) / 1000, file: path.relative(REPO, file), sha256: sha256File(file), failed: Object.entries(verdict.checks ?? {}).filter(([, v]) => !v.pass).map(([k]) => k) };
  atomicJson(info.ownerFile, latest);
  process.stdout.write(JSON.stringify(verdict, null, 2) + '\n');
  process.stderr.write(`[lab] ${info.container} readiness ${verdict.verdict} (${latest.volumeContent.readiness.failed.join(', ') || 'C1-C8 pass'}) in ${latest.volumeContent.readiness.checksS.toFixed(1)} s; ${path.relative(REPO, file)}\n`);
  if (verdict.verdict !== 'PASS') fail('ENGINE', `${info.container} is not ready: ${latest.volumeContent.readiness.failed.join(', ')} failed (Q74d)`);
}

/** List a stopped slot's volume through a read-only helper; with --golden-record, diff it with the golden (R26 P-e). */
async function listing(config, info, opts) {
  if (!readOwner(info)) fail('REFUSED', `${info.lane}-${info.slot} has no slot lock`);
  requireHeldXtdbSlot(info, opts);
  const c = inspect(info.container);
  if (c?.State.Running) fail('REFUSED', `${info.container} is running; stop it first (a listing of a live Local log is torn)`);
  if (!docker(['volume', 'inspect', info.volume], { allowFail: true })) fail('REFUSED', `${info.volume} does not exist`);
  const list = parseListing(helper(config, `tx2-clone-list-${info.slot}`, [`${info.volume}:/src:ro`], listingScript('/src')));
  const out = { volume: info.volume, at: now(), count: list.count, bytes: list.bytes, treeSha256: list.treeSha256, files: list.files };
  if (opts['golden-record']) {
    const { record } = loadGolden(opts['golden-record']);
    out.golden = { volume: record.volume, treeSha256: record.copy.treeSha256, diff: diffListings({ files: readJson(path.resolve(REPO, record.copy.filesFile)) }, list) };
  }
  if (opts.out) writeJson(path.resolve(String(opts.out)), out);
  process.stdout.write(JSON.stringify({ ...out, files: opts.out ? `${out.files.length} files in ${opts.out}` : out.files }, null, 2) + '\n');
}

async function goldenRm(config, opts) {
  const recordFile = opts['golden-record'] ? path.resolve(String(opts['golden-record'])) : null;
  const volume = recordFile ? readJson(recordFile).volume : opts.volume;
  if (!volume || !/^tx2-golden-xtdb-[0-9a-f]{8}$/.test(volume)) fail('USAGE', 'golden-rm needs --golden-record FILE or --volume tx2-golden-xtdb-<key8>');
  const vol = docker(['volume', 'inspect', volume], { allowFail: true });
  if (vol && JSON.parse(vol)[0].Labels?.['tx2.golden'] !== '1') fail('REFUSED', `${volume} is not labelled tx2.golden=1`);
  const users = containersOnVolume(volume);
  if (users.length) fail('REFUSED', `${volume} is mounted by ${users.join(', ')}`);
  if (vol) docker(['volume', 'rm', volume]);
  if (docker(['volume', 'inspect', volume], { allowFail: true })) fail('ENGINE', `${volume} still exists`);
  await withPool(async ledger => { ledger.goldens = (ledger.goldens ?? []).filter(g => g.volume !== volume); });
  appendEvent({ event: 'golden-removed', volume });
  process.stderr.write(`[lab] golden ${volume} ${vol ? 'removed' : 'was already absent'}\n`);
}

/** Expected outcome of every TOOLCHECK_SCRIPT line (R26 P-g). */
export const TOOLCHECK_EXPECT = {
  'cp-a': out => out.includes('20000:20000 640 1577836800'),
  'find-exec-plus': out => out.includes('/t/dst/a/f 1'),
  'find-prune-rm': out => out.includes('removed'),
  'stat-c': out => /\/t\/dst\/a\/f\|1\|640\|20000\|20000/.test(out),
  'sha256sum': out => /^[0-9a-f]{64}\s/.test(out),
  'sort-k': out => out.startsWith('a 1'),
  'chown': out => out.includes('20000:20000'),
  'sync': () => true,
  'wget-post-data': out => /GNU Wget/.test(out) && /post-data=1/.test(out),
  'du-k': out => /^\d+\s/.test(out),
};
const TOOLCHECK_SCRIPT = `r() { n=$1; shift; if o=$("$@" 2>&1); then s=ok; else s=FAIL; fi; printf '%s|%s|%s\\n' "$n" "$s" "$(printf '%s' "$o" | tr '\\n' ' ' | cut -c1-300)"; };
mkdir -p /t/src/a/.tmp /t/dst; printf x > /t/src/a/f; printf x > /t/src/a/.tmp/g; chown -R 20000:20000 /t/src; chmod 640 /t/src/a/f; touch -d '2020-01-01 00:00:00' /t/src/a/f;
r busybox sh -c 'readlink -f /bin/sh; busybox 2>&1 | head -1';
r cp-a sh -c 'cp -a /t/src/. /t/dst/ && stat -c "%u:%g %a %Y" /t/dst/a/f';
r find-exec-plus sh -c 'find /t/dst -type f -exec stat -c "%n %s" {} + | sort';
r find-prune-rm sh -c 'find /t/dst -name .tmp -type d -prune -exec rm -rf {} + && test ! -e /t/dst/a/.tmp && echo removed';
r stat-c stat -c '%n|%s|%a|%u|%g' /t/dst/a/f;
r sha256sum sha256sum /t/dst/a/f;
r sort-k sh -c 'printf "b 2\\na 1\\n" | LC_ALL=C sort -k 2';
r chown sh -c 'chown 20000:20000 /t/dst && stat -c %u:%g /t/dst';
r sync sync;
r wget-post-data sh -c 'readlink -f "$(command -v wget)"; wget --version | head -1; echo post-data=$(wget --help | grep -c -- --post-data)';
r du-k du -s -k /t`;

/** R26 P-g: run the tools R26's procedure assumes inside the pinned image (no network, no volumes). */
async function toolcheck(config) {
  const out = docker(['run', '--rm', '--network', 'none', '-u', '0:0', '--memory', '256m', '--memory-swap', '256m', '--entrypoint', 'sh', config.lanes.xtdb.image, '-c', TOOLCHECK_SCRIPT]);
  const rows = out.split('\n').filter(Boolean).map(line => { const [name, status, ...rest] = line.split('|'); return { name, status, output: rest.join('|') }; });
  const checks = rows.map(row => ({ ...row, pass: row.status === 'ok' && (TOOLCHECK_EXPECT[row.name]?.(row.output) ?? true) }));
  const missing = Object.keys(TOOLCHECK_EXPECT).filter(name => !rows.some(row => row.name === name));
  const result = { image: config.lanes.xtdb.image, at: now(), pass: missing.length === 0 && checks.every(c => c.pass), missing, checks };
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  if (!result.pass) process.exitCode = 1;
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
  // [EXP-K01] Golden volumes hold VM disk outside any reservation; admission already counts them through real df.
  for (const entry of ledger.goldens ?? []) console.log(`  golden volume ${entry.volume} ${fmtBytes(entry.bytes)} key=${entry.key.slice(0, 12)} holder=${entry.holder}`);
}

if (import.meta.url === `file://${process.argv[1]}`) main(async () => {
  const { positional, options } = parseArgs(process.argv.slice(2));
  const command = positional[0];
  const config = loadSlots();
  if (command === 'status') return status(config);
  if (command === 'toolcheck') return toolcheck(config);
  if (command === 'golden-rm') return goldenRm(config, options);
  const K01 = ['settle', 'stop', 'golden', 'clone', 'verify', 'listing'];
  if (!['up', 'down', 'logs', ...K01].includes(command)) fail('USAGE', 'usage: engine.mjs up|down|status|logs --lane xtdb|qlever --slot dev|s1|s2|s3 [--fresh] [--follower] [--cpuset-cpus LIST]\n'
    + '  EXP-K01: settle|stop --lane xtdb --slot S; golden --lane xtdb --slot S --manifest FILE; clone --lane xtdb --slot S --golden-record FILE [--no-verify];\n'
    + '  verify --lane xtdb --slot S; listing --lane xtdb --slot S [--golden-record FILE] [--out FILE]; golden-rm --golden-record FILE|--volume V; toolcheck');
  if (!options.lane || !options.slot) fail('USAGE', '--lane and --slot are required');
  const info = slotInfo(config, options.lane, options.slot);
  if (options.follower) {
    const fol = followerInfo(config, info, options);
    if (command === 'up') return followerUp(config, info, fol, options);
    if (command === 'down') return followerDown(config, info, fol, options);
    spawnSync('docker', dockerArgs(['logs', '--tail', String(options.tail ?? 200), fol.container]), { stdio: 'inherit' });
    return;
  }
  if (options['cpuset-cpus']) info.cpusetCpus = parseCpuset(options['cpuset-cpus'], config.vm.cpus).join(',');
  if (command === 'settle') return settle(config, info, options);
  if (command === 'stop') return stopSlot(config, info, options);
  if (command === 'golden') return golden(config, info, options);
  if (command === 'clone') return clone(config, info, options);
  if (command === 'verify') return verify(config, info, options);
  if (command === 'listing') return listing(config, info, options);
  if (command === 'up') return up(config, info, options);
  if (command === 'down') return down(config, info, options);
  spawnSync('docker', dockerArgs(['logs', '--tail', String(options.tail ?? 200), info.container]), { stdio: 'inherit' });
});
