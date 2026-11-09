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
import { stageDatomicContext, verifiedTree, verifyDatomicContext } from './datomic-context.mjs';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import {
  CONFIG_DIR, ENGINE_DIR, LabError, POOL_FILE, dockerArgs, OWNER_FORMAT, REPO, admission, appendEvent, atomicJson, checkFollowerConfig,
  containersOnVolume, cpusetOverlap, defaultHolder, docker, dockerStats, fail, fmtBytes, inspect, listTx2Containers, loadSlots, main, now,
  parseArgs, parseCpuset, readJson, readOwner, reconcile, sha256, sleep, slotInfo, vmDisk, volumeBytes, volumeGuard, withPool, sha256File,
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

// [EXP-DA00] Why: source-relative byte manifests bind image and gateway; reject tag drift. Rejected: trusting a mutable local tag.
export function datomicTree(dir) {
  return verifiedTree(dir);
}
export function datomicSources() {
  const config = datomicTree(path.join(CONFIG_DIR, 'lab/config/datomic'));
  const gateway = datomicTree(path.join(CONFIG_DIR, 'packages/datomic/gateway'));
  const codec = { path: 'codec-spec.json', bytes: fs.statSync(path.join(CONFIG_DIR, 'packages/datomic/src/codec-spec.json')).size,
    sha256: sha256File(path.join(CONFIG_DIR, 'packages/datomic/src/codec-spec.json')) };
  return { config, gateway, codec, sha256: sha256(JSON.stringify({ config, gateway, codec })) };
}
function assertDatomicImage(info) {
  const out = docker(['image', 'inspect', info.laneConf.image], { allowFail: true });
  const image = out && JSON.parse(out)[0];
  if (!image || !info.laneConf.imageId || image.Id !== info.laneConf.imageId)
    fail('REFUSED', 'Datomic local image id differs from slots.json; run engine.mjs build --lane datomic');
  if (image.Config.Labels?.['tx2.build-inputs-sha256'] !== info.laneConf.buildInputsSha256 || datomicSources().sha256 !== info.laneConf.sourceInputsSha256)
    fail('REFUSED', 'Datomic image build inputs differ from current source; rebuild and review the new pin');
  return image;
}
function datomicDiskFloor() {
  const disk = fs.statfsSync(REPO);
  if (disk.bavail * disk.bsize < 5 * 1024 ** 3) fail('REFUSED', 'Host free disk below 5 GiB');
}
async function buildDatomic(config) {
  datomicDiskFloor();
  const download = '/Users/sam/Claude/Projects/triplex-db-2/downloads/datomic-pro-1.0.7745';
  const zip = path.join(download, 'datomic-pro-1.0.7745.zip');
  const dist = path.join(download, 'extracted/datomic-pro-1.0.7745');
  const verification = readJson(path.join(CONFIG_DIR, 'lab/config/datomic/verification.json'));
  if (sha256File(zip) !== verification.zipSha256) fail('REFUSED', 'Datomic zip checksum differs');
  const peer = path.join(dist, 'peer-1.0.7745.jar');
  const sums = fs.readFileSync(path.join(CONFIG_DIR, 'lab/config/datomic/SHA256SUMS'), 'utf8');
  if (!sums.includes(`${sha256File(peer)}  peer-1.0.7745.jar`)) fail('REFUSED', 'Datomic extracted peer checksum differs');
  const check = spawnSync('python3', ['-c', `import hashlib,pathlib,sys,zipfile
root=pathlib.Path(sys.argv[2]); archive=zipfile.ZipFile(sys.argv[1]); prefix='datomic-pro-1.0.7745/'
expected={n[len(prefix):]:hashlib.sha256(archive.read(n)).hexdigest() for n in archive.namelist() if n.startswith(prefix) and not n.endswith('/')}
actual={str(f.relative_to(root)):hashlib.sha256(f.read_bytes()).hexdigest() for f in root.rglob('*') if f.is_file()}
assert actual==expected, 'Extracted Datomic bytes differ from the pinned ZIP'
`, zip, dist], { encoding: 'utf8' });
  if (check.status !== 0) fail('REFUSED', `Datomic extraction verification failed: ${check.stderr}`);
  const gpg = spawnSync('gpg', ['--homedir', path.join(download, 'gnupg'), '--status-fd', '1', '--verify', path.join(CONFIG_DIR, 'lab/config/datomic/peer.jar.asc'), peer], { encoding: 'utf8' });
  if (gpg.status !== 0 || !gpg.stdout.includes(`VALIDSIG ${verification.fingerprint} `)) fail('REFUSED', 'Datomic peer signature failed');
  const sources = datomicSources();
  const distribution = datomicTree(dist);
  const buildInputsSha256 = sha256(JSON.stringify({ sources, distribution }));
  const parent = path.join(ENGINE_DIR, 'datomic-build');
  fs.mkdirSync(parent, { recursive: true });
  const context = path.join(parent, `${buildInputsSha256}-${process.pid}-${Date.now()}`);
  const fileInput = (source, destination, file) => ({ source, destination, manifest: [{ ...file, path: '' }] });
  const staged = stageDatomicContext(context, [
    { source: dist, destination: 'datomic', manifest: distribution },
    { source: path.join(CONFIG_DIR, 'lab/config/datomic'), destination: 'config', manifest: sources.config },
    { source: path.join(CONFIG_DIR, 'packages/datomic/gateway'), destination: 'gateway', manifest: sources.gateway },
    fileInput(path.join(CONFIG_DIR, 'packages/datomic/src/codec-spec.json'), 'gateway/codec-spec.json', sources.codec),
    fileInput(path.join(CONFIG_DIR, 'lab/config/datomic/Dockerfile'), 'Dockerfile', sources.config.find(f => f.path === 'Dockerfile')),
  ]);
  // [EXP-DA01] Why: ZIP extraction omits executable mode bits; only verified bin files receive the documented 0755 transform. Rejected: preserving arbitrary host executable bits.
  for (const name of fs.readdirSync(path.join(context, 'datomic/bin')))
    if (fs.statSync(path.join(context, 'datomic/bin', name)).isFile()) fs.chmodSync(path.join(context, 'datomic/bin', name), 0o755);
  verifyDatomicContext(context, staged);
  const dockerConfig = path.join(ENGINE_DIR, 'datomic-docker-config');
  const buildxConfig = path.join(ENGINE_DIR, 'datomic-buildx');
  fs.mkdirSync(dockerConfig, { recursive: true });
  fs.mkdirSync(buildxConfig, { recursive: true });
  const result = spawnSync('docker', dockerArgs(['build', '--platform', 'linux/arm64', '--build-arg', `BUILD_INPUTS_SHA256=${buildInputsSha256}`, '-t', config.lanes.datomic.image, context]), { stdio: 'inherit', env: { ...process.env, DOCKER_CONFIG: dockerConfig, BUILDX_CONFIG: buildxConfig } });
  if (result.status !== 0) fail('DOCKER', 'Datomic image build failed');
  if (sources.sha256 !== datomicSources().sha256) fail('REFUSED', 'Datomic source changed during build; image not pinned');
  const image = JSON.parse(docker(['image', 'inspect', config.lanes.datomic.image]))[0];
  Object.assign(config.lanes.datomic, { imageId: image.Id, buildInputsSha256, sourceInputsSha256: sources.sha256 });
  // Update Datomic keys only, preserving existing lane configuration bytes.
  const slotsFile = path.join(CONFIG_DIR, 'lab/config/slots.json');
  let text = fs.readFileSync(slotsFile, 'utf8');
  for (const key of ['imageId', 'buildInputsSha256', 'sourceInputsSha256']) {
    const value = config.lanes.datomic[key];
    const start = text.indexOf('"datomic":');
    const end = text.indexOf('\n  },\n  "slots"', start);
    let section = text.slice(start, end);
    const pattern = new RegExp(`"${key}": (?:null|"[^"]*")`);
    if (pattern.test(section)) section = section.replace(pattern, `"${key}": "${value}"`);
    else section = section.replace(/\n    }$/, `,\n      "${key}": "${value}"\n    }`);
    text = text.slice(0, start) + section + text.slice(end);
  }
  fs.writeFileSync(slotsFile, text);
  const receipt = { imageId: image.Id, imageSize: image.Size, buildInputsSha256, sourceInputsSha256: sources.sha256, context, staged, sources, distribution, verification, gpg: { stdout: gpg.stdout, stderr: gpg.stderr } };
  atomicJson(path.join(context, 'build-receipt.json'), receipt);
  appendEvent({ event: 'datomic-build', imageId: image.Id, buildInputsSha256 });
  console.log(JSON.stringify({ ...config.lanes.datomic, imageSize: image.Size, receipt: path.join(context, 'build-receipt.json') }, null, 2));
}
async function selftestDatomic(config, opts) {
  datomicDiskFloor();
  const info = slotInfo(config, 'datomic', 'dev');
  assertDatomicImage(info);
  const name = 'tx2-datomic-selftest';
  const holder = defaultHolder(opts);
  // [EXP-DA00] Why: ephemeral tests consume real pool capacity. Rejected: unaccounted docker run --rm.
  await withPool(async ledger => {
    const all = listTx2Containers({ all: true });
    reconcile(ledger, all);
    if (ledger.reservations.some(e => e.container === name) || inspect(name)) fail('REFUSED', 'Datomic selftest already owned/running');
    const request = { container: name, memBytes: 1.5 * 1024 ** 3, diskForecastBytes: 0 };
    const verdict = admission({ config, reservations: ledger.reservations, running: all, request, diskUsedBytes: vmDisk(config).usedBytes });
    if (!verdict.ok) fail('REFUSED', `pool refuses selftest: ${verdict.reasons.join('; ')}`);
    ledger.reservations.push({ ...request, holder, lane: 'datomic', slot: 'selftest', cpus: 1, pid: process.pid, state: 'starting', reservedAt: now() });
    appendEvent({ event: 'reserved', container: name, holder });
  });
  try {
    const result = spawnSync('docker', dockerArgs(['run', '--rm', '--name', name, '--network', 'none', '--memory', String(1.5 * 1024 ** 3), '--memory-swap', String(1.5 * 1024 ** 3), '--cpus', '1', '--label', 'tx2.managed-by=lab/bin/engine.mjs', '--label', `tx2.holder=${holder}`, info.laneConf.imageId, 'selftest']), { stdio: 'inherit' });
    if (result.status !== 0) fail('ENGINE', 'Datomic selftest failed');
    appendEvent({ event: 'datomic-selftest-pass', imageId: info.laneConf.imageId });
  } finally {
    if (inspect(name)) fail('ENGINE', 'Selftest container remains; reservation retained');
    await withPool(async ledger => { ledger.reservations = ledger.reservations.filter(e => e.container !== name); });
    appendEvent({ event: 'released', container: name, holder });
  }
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
  if (info.lane === 'datomic') {
    const sources = datomicSources();
    const transactor = path.join(dir, 'transactor.properties');
    const entrypoint = path.join(dir, 'entrypoint.sh');
    fs.copyFileSync(path.join(CONFIG_DIR, 'lab/config/datomic/transactor.properties'), transactor);
    fs.copyFileSync(path.join(CONFIG_DIR, 'lab/config/datomic/entrypoint.sh'), entrypoint);
    const effective = {
      lane: 'datomic', slot: info.slot, image: info.laneConf.image, imageId: info.laneConf.imageId,
      buildInputsSha256: info.laneConf.buildInputsSha256, sourceInputsSha256: sources.sha256,
      gatewaySourceSha256: sha256(JSON.stringify(sources.gateway)), configMountMode: 'ro',
      transactorOpts: info.transactorOpts, gatewayOpts: info.gatewayOpts,
      txCpus: info.txCpus, gwCpus: info.gwCpus, profile: info.slot === 'dev' ? 'dev' : 'exclusive',
      memBytes: info.memBytes, cpus: info.cpus, ...pin,
      publish: `127.0.0.1:${info.port}:8080`, volume: `${info.volume}:/data`,
      health: `bash -c 'exec 3<>/dev/tcp/127.0.0.1/8080; printf "GET /health HTTP/1.0\\r\\n\\r\\n" >&3; head -n 1 <&3 | grep -q "HTTP/1.[01] 200"'`,
    };
    if (cpusetOverlap(info.txCpus, info.gwCpus, config.vm.cpus).length) fail('CONFIG', 'Datomic JVM cpusets overlap');
    if (info.cpusetCpus) {
      const allowed = parseCpuset(info.cpusetCpus, config.vm.cpus);
      for (const cpu of [...parseCpuset(info.txCpus, config.vm.cpus), ...parseCpuset(info.gwCpus, config.vm.cpus)])
        if (!allowed.includes(cpu)) fail('CONFIG', 'Datomic JVM CPUs outside container cpuset');
    }
    return { effective, sha256: sha256(JSON.stringify(effective)), files: { transactor, entrypoint } };
  }
  // QLever: repo qlever-start.sh with the slot's query memory (-m). Port stays 7019 inside.
  const original = fs.readFileSync(path.join(CONFIG_DIR, 'qlever-start.sh'), 'utf8');
  if (!/ -m 2G /.test(original)) fail('CONFIG', 'qlever-start.sh no longer has "-m 2G"; update engine.mjs');
  // [EXP-QG1] Why: an exclusive slot can boot an immutable captured index or N-Quads
  // without mutating a running index. Rejected: docker cp over live index files (unsafe).
  const seedFiles = info.qleverSeedDir ? Object.fromEntries(fs.readdirSync(info.qleverSeedDir)
    .filter(name => name === 'seed.nq.gz' || /^triplex\.[a-zA-Z0-9._-]+$/.test(name))
    .sort().map(name => [name, sha256(fs.readFileSync(path.join(info.qleverSeedDir, name)))])) : null;
  if (seedFiles && !seedFiles['seed.nq.gz'] && !seedFiles['triplex.index.pso']) fail('CONFIG', 'seed has neither N-Quads nor a base index');
  const seedDigest = seedFiles ? sha256(JSON.stringify(seedFiles)) : null;
  const seedChecks = seedFiles ? Object.entries(seedFiles).map(([name, hash]) => `${hash}  ${name}`).join('\n') : '';
  const seed = info.qleverSeedDir ? `if [[ -f /data/.qg1-seeded ]]; then
  [[ "$(cat /data/.qg1-seeded)" = "${seedDigest}" ]] || { echo 'seed binding changed' >&2; exit 1; }
else
  [[ ! -f /data/triplex.index.pso ]] || { echo 'seed requires an empty index volume' >&2; exit 1; }
  (cd /seed; sha256sum -c <<'QG1_SUMS'
${seedChecks}
QG1_SUMS
  )
  if [[ -f /seed/seed.nq.gz ]]; then
    cd /data
    printf '%s' '{"num-triples-per-batch":500000}' > /data/qg1-settings.json
    gunzip -c /seed/seed.nq.gz | qlever-index -i triplex -f - -F nq -s /data/qg1-settings.json --stxxl-memory 512M --no-patterns
  else
    cp /seed/triplex.* /data/
  fi
  printf '%s' '${seedDigest}' > /data/.qg1-seeded
fi
` : '';
  const script = original.replace('cd /data\n', `cd /data\n${seed}`).replace(' -m 2G ', ` -m ${info.qleverMemory} `);
  const boundScript = info.qleverSeedDir ? script.replace(' --persist-updates ', ' --rebuild-keep-previous-index-dirs none --persist-updates ') : script;
  const file = path.join(dir, 'start.sh');
  fs.writeFileSync(file, boundScript);
  const effective = {
    ...(info.qleverSeedDir ? { seedDir: info.qleverSeedDir, seedFiles, seedDigest } : {}),
    lane: 'qlever', slot: info.slot, image: info.laneConf.image, startScriptSha256: sha256(boundScript),
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
  if (info.lane === 'datomic')
    return [...common, '-v', `${eff.files.transactor}:/config/transactor.properties:ro`, '-v', `${eff.files.entrypoint}:/config/entrypoint.sh:ro`, '-e', `TRANSACTOR_JAVA_OPTS=${e.transactorOpts}`, '-e', `GATEWAY_JAVA_OPTS=${e.gatewayOpts}`,
      '-e', `TX_CPUS=${e.txCpus}`, '-e', `GW_CPUS=${e.gwCpus}`, '-e', `DATOMIC_PROFILE=${e.profile}`,
      '-e', `GATEWAY_SOURCE_SHA256=${e.gatewaySourceSha256}`, info.laneConf.imageId];
  if (info.lane === 'xtdb')
    return [...common, '-e', `JDK_JAVA_OPTIONS=${info.javaOpts}`, '-v', `${eff.files.config}:/etc/xtdb/config.yaml:ro`, info.laneConf.image, ...e.cmd];
  return [...common, ...(info.qleverSeedDir ? ['-v', `${info.qleverSeedDir}:/seed:ro`] : []), '--platform', 'linux/arm64', '-v', `${eff.files.startScript}:/config/start.sh:ro`, '--entrypoint', '/bin/bash', info.laneConf.image, '/config/start.sh'];
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
  if (info.lane === 'datomic') {
    try {
      const response = await fetch(`${info.endpoint}/health`, { signal: AbortSignal.timeout(3000) });
      const body = await response.json();
      const expected = sha256(JSON.stringify(datomicSources().gateway));
      return { ok: response.ok && body.datomicVersion === '1.0.7745' && body.gatewaySourceHash === expected, why: `gateway HTTP ${response.status}` };
    } catch (error) { return { ok: false, why: `gateway ${error.message}` }; }
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

async function up(config, info, opts) {
  const holder = defaultHolder(opts);
  if (info.lane === 'datomic') assertDatomicImage(info);
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

if (import.meta.url === `file://${process.argv[1]}`) main(async () => {
  const { positional, options } = parseArgs(process.argv.slice(2));
  const command = positional[0];
  let policy, authorityGit;
  if (options.authority) {
    const { gitSource } = await import('./claim.mjs');
    const { authorityPolicy } = await import('./box-policy.mjs');
    if (!options['authority-repo']) fail('USAGE', '--authority-repo is required with --authority');
    authorityGit = gitSource(path.resolve(options['authority-repo']));
    policy = authorityPolicy(authorityGit, options.authority);
  }
  const config = policy ? policy.slots : loadSlots();
  if (command === 'box') {
    const { boxCommand } = await import('./box-engine.mjs');
    console.log(JSON.stringify(await boxCommand(config, positional[1], options, { policy, authorityGit })));
    return;
  }
  if (command === 'status') return status(config);
  if (options.lane === 'datomic' && command === 'build') return buildDatomic(config);
  if (options.lane === 'datomic' && command === 'selftest') return selftestDatomic(config, options);
  if (!['up', 'down', 'logs'].includes(command)) fail('USAGE', 'usage: engine.mjs up|down|status|logs --lane xtdb|qlever --slot dev|s1|s2|s3 [--fresh] [--follower] [--cpuset-cpus LIST]');
  if (!options.lane || !options.slot) fail('USAGE', '--lane and --slot are required');
  const info = slotInfo(config, options.lane, options.slot);
  // [EXP-QG1] Why: overrides never reach shared residents; effective bytes bind the run.
  // Rejected: changing slots.json for everyone during a measurement window.
  if (options['qlever-memory'] || options['qlever-seed-dir']) {
    if (info.lane !== 'qlever' || info.mode !== 'exclusive') fail('USAGE', 'QLever overrides require an exclusive QLever slot');
    if (options['qlever-memory']) {
      if (options['qlever-memory'] !== '1000M') fail('USAGE', 'only the experiment memory override 1000M is allowed');
      info.qleverMemory = options['qlever-memory'];
    }
    if (options['qlever-seed-dir']) {
      info.qleverSeedDir = fs.realpathSync(options['qlever-seed-dir']);
      if (!fs.statSync(info.qleverSeedDir).isDirectory()) fail('USAGE', 'seed must be a directory');
    }
  }
  if (options.follower) {
    const fol = followerInfo(config, info, options);
    if (command === 'up') return followerUp(config, info, fol, options);
    if (command === 'down') return followerDown(config, info, fol, options);
    spawnSync('docker', dockerArgs(['logs', '--tail', String(options.tail ?? 200), fol.container]), { stdio: 'inherit' });
    return;
  }
  if (options['cpuset-cpus']) info.cpusetCpus = parseCpuset(options['cpuset-cpus'], config.vm.cpus).join(',');
  if (command === 'up') return up(config, info, options);
  if (command === 'down') return down(config, info, options);
  spawnSync('docker', dockerArgs(['logs', '--tail', String(options.tail ?? 200), info.container]), { stdio: 'inherit' });
});
