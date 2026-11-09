// [EXP-OBS01] Why: only orchestrator tooling provisions observer credentials and witnesses.
// Rejected: starting a collector in the benchmark client (the SUT could replace its evidence).
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { ClockSampler } from './observer-clock.mjs';
const clockSamplers = new Map();
import { randomUUID, createHmac } from 'node:crypto';
import {
  ENGINE_DIR, REPO, admission, appendEvent, atomicJson, cpusetOverlap, defaultHolder, docker,
  dockerArgs, fail, inspect, listTx2Containers, parseCpuset, readJson, readOwner, reconcile, sha256, sleep,
  vmDisk, withDirLock, withPool,
} from './lib.mjs';

const ROOT = path.join(ENGINE_DIR, 'observers');
const SOURCE = path.join(REPO, 'lab/observer');
const MEMORY = 128 * 1024 * 1024;
const stateFile = info => path.join(ROOT, `${info.lane}-${info.slot}.json`);
const canonical = value => {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
  // HMAC objects have only ASCII strings and ordinary finite JSON values.
  return JSON.stringify(value);
};
function ownerCheck(info, opts) {
  if (info.mode !== 'exclusive') fail('REFUSED', 'observers require an exclusive slot; residents are unchanged');
  const owner = readOwner(info);
  if (!owner || owner.holder !== defaultHolder(opts)) fail('REFUSED', 'observer belongs to the exclusive slot holder');
}
function safeId(value, label) {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(value)) fail('USAGE', `invalid ${label}`);
  return value;
}
function signedOk(bytes, key) {
  // [EXP-OBS01] Why: use exact Python canonical number spelling (1.0 is not JS JSON's 1).
  // Rejected: parse and reserialize in JS (can alter floating-point spelling).
  const text = bytes.toString('ascii').trim();
  const value = JSON.parse(text);
  const unsigned = text.replace(/,\"hmac\":\"[a-f0-9]{64}\"/, '');
  return unsigned !== text && createHmac('sha256', key).update(unsigned).digest('hex') === value.hmac;
}
function source(id, kind, endpoint, method = 'scrape', reader = 'file', extra = {}) {
  return { streamId: id.replaceAll('.', '-'), kind, sourceId: kind.split('/').at(-1), endpoint, method, reader,
    cadenceMs: method === 'tail' ? 250 : 100, normalizer: { id: 'obs01-source-samples', version: '1', sha256: sha256(fs.readFileSync(path.join(SOURCE, 'normalize.py'))) }, ...extra };
}

export function observerPlan(config, info, engine, opts) {
  const engineCpus = engine.HostConfig.CpusetCpus;
  const cpuset = parseCpuset(String(opts['observer-cpus'] ?? ''), config.vm.cpus).join(',');
  if (!engineCpus || cpusetOverlap(engineCpus, cpuset, config.vm.cpus).length)
    fail('REFUSED', 'pin the engine and supply a disjoint --observer-cpus CPU set');
  if (opts.image == null || !/@sha256:[a-f0-9]{64}$/.test(opts.image)) fail('USAGE', 'observer --image must be digest-pinned (use observer-image first)');
  const maxBundleBytes = Number(opts['max-bundle-bytes'] ?? 64 * 1024 * 1024);
  if (!Number.isSafeInteger(maxBundleBytes) || maxBundleBytes < 16 * 1024 * 1024 || maxBundleBytes > 1024 * 1024 * 1024)
    fail('USAGE', '--max-bundle-bytes must be an integer from 16 MiB to 1 GiB');
  const key = fs.realpathSync(opts['key-file'] ?? '');
  if (fs.readFileSync(key).length !== 32) fail('REFUSED', 'evaluator key must contain exactly 32 bytes');
  const runId = safeId(opts['run-id'], 'run-id');
  const receiptId = safeId(opts['receipt-id'], 'receipt-id');
  const keyId = safeId(opts['key-id'], 'key-id');
  const engineId = engine.Id;
  const name = `tx2-obs-${info.lane}-${info.slot}`;
  const dir = path.join(ROOT, runId);
  const volume = engine.Mounts.find(m => m.Name === info.volume);
  if (!volume) fail('REFUSED', 'engine slot volume is not mounted');
  const cgroup = opts.engineCgroup ?? `/sys/fs/cgroup/docker/${engineId}`;
  const streams = ['memory.current', 'memory.peak', 'memory.stat', 'memory.events', 'cpu.stat', 'io.stat'].map(file => source(`H1.${file}`, 'HO/any/H1', `${cgroup}/${file}`));
  streams.push(source('H1.resources','HO/any/H1',cgroup,'scrape','resource',{cadenceMs:1000,owner:engine.Id}), source('H4.all','HO/any/H4','/proc/net','scrape','sockets'));
  streams.push(source('H4.tcp', 'HO/any/H4', '/proc/net/tcp'), source('H4.tcp6', 'HO/any/H4', '/proc/net/tcp6'));
  const features=engine.Config.Labels['tx2.observation-features'] ?? 'all';
  if (info.lane === 'xtdb') streams.push(source('X6.log', 'EI-log/xtdb/X6', '/engine/observer-engine.log', 'tail'), source('X7.spans', 'EI-trace/xtdb/X7', 'http://127.0.0.1:4318/v1/traces', 'capture', 'otlp'), source('T1.wire','TO/xtdb/T1','tcp://127.0.0.1:18090','capture','wire'), source('X1.metrics', 'EI-metric/xtdb/X1.node.tx.latestCompletedTxId', 'http://127.0.0.1:8080/metrics', 'scrape', 'http', { cadenceMs: 250 }));
  if (info.lane === 'qlever') {
    streams.push(source('T2.wire','TO/qlever/T2','tcp://127.0.0.1:18090','capture','wire'));
    streams.push(source('Q1.metrics', 'EI-metric/qlever/Q1', 'http://127.0.0.1:7019/metrics', 'scrape', 'http', { cadenceMs: 250 }));
    streams.push(source('Q4.active', 'EI-query/qlever/Q4', 'http://127.0.0.1:7019/?cmd=dump-active-queries', 'query', 'http', { cadenceMs: 250 }));
    const log = safeId(opts['index-name'] ?? 'triplex', 'index-name');
    streams.push(source('Q3.events', 'EI-log/qlever/Q3', `/engine/${log}.metrics-log.jsonl`, 'tail'));
  }
  if (info.lane === 'datomic') {
    const pids = String(opts['gateway-pids'] ?? '').split(',').map(Number);
    if (pids.some(p => !Number.isSafeInteger(p) || p < 1)) fail('USAGE', '--gateway-pids requires engine-namespace JVM PIDs');
    streams.push(source('H5.threads', 'HO/any/H5', '/proc', 'scrape', 'threads', { pids }));
    const metrics = opts['transactor-metrics'];
    if (typeof metrics !== 'string' || !/^[-a-zA-Z0-9_/.]+$/.test(metrics) || metrics.includes('..') || metrics.startsWith('/'))
      fail('USAGE', '--transactor-metrics requires a relative metrics-callback file inside the engine volume');
    streams.push(source('D1.metrics', 'EI-metric/datomic/D1', `/engine/${metrics}`, 'tail'));
  }
  if (opts['enable-probes']) {
    streams.push(source('H6.scans','HO/any/H6','observer-private-commands','capture','commands'));
    if (info.lane==='xtdb') streams.push(source('X2.probes','EI-query/xtdb/X2','http://127.0.0.1:8080/system/finish-block','capture','commands'), source('X4.queries','EI-query/xtdb/X4','pgwire://127.0.0.1:5432','capture','commands'));
  }
  const selected = opts['observer-streams'] ? String(opts['observer-streams']).split(',') : null;
  const enabledStreams=streams.filter(s=>!(s.sourceId==='X6' && !['all','logs'].includes(features)) && !(s.sourceId==='X7' && !['all','spans'].includes(features)) && !(s.sourceId==='Q3' && !['all','logs'].includes(features)) && (!selected || selected.includes(s.streamId)));
  if (selected && (enabledStreams.length!==selected.length || !selected.length)) fail('REFUSED','unknown/disabled observer stream selection');
  // [EXP-OBS01] Why: Q91a requires base and delta context even for a narrowly selected timing stream.
  // Rejected: delta-only latency with no index-state witness, or inventing touched-block coverage from a global gauge.
  if(info.lane==='qlever')enabledStreams.push(source('Q2.index-state','EI-query/qlever/Q2','http://127.0.0.1:7019','query','qlever-state',{cadenceMs:1000}));
  if (!enabledStreams.length) fail('REFUSED','empty observer stream inventory');
  const collectorSource = fs.readFileSync(path.join(SOURCE, 'collector.py'));
  const plan = { runId, receiptId, keyId, streams:enabledStreams, maxUncertaintyMs: 1, clockPort: 18080, maxBundleBytes,
    collector: { dependencies: Object.fromEntries(['capture.py','commands.py','pgclient.py'].map(name=>[name,sha256(fs.readFileSync(path.join(SOURCE,name)))])), imageDigest: opts.image, sourceSha256: sha256(collectorSource), configSha256: '', containerId: name, cgroupPath: '', cpuset },
    sut: { lane: info.lane, engineContainerId: engineId, engineImageDigest: engine.Image, engineConfigSha256: engine.Config.Labels['tx2.config-sha256'], enginePids: [] } };
  plan.collector.configSha256 = sha256(canonical({ ...plan, collector: { ...plan.collector, configSha256: '' } }));
  return { name, dir, key, keyFingerprint: sha256(fs.readFileSync(key)), cpuset, volume: volume.Name, plan };
}

export async function observerUp(config, info, opts) {
  ownerCheck(info, opts);
  const engine = inspect(info.container);
  if (!engine?.State.Running) fail('REFUSED', 'engine must already be running');
  if (!engine.HostConfig.PortBindings?.['18080/tcp']?.some(b => b.HostIp === '127.0.0.1' && Number(b.HostPort) === info.port + 10000))
    fail('REFUSED', 'start exclusive engine with --observation-sources to publish its observer clock');
  const plan = observerPlan(config, info, engine, opts);
  if (fs.existsSync(plan.dir) || inspect(plan.name)) fail('REFUSED', 'run or observer already exists; retain it and choose a new run-id');
  await withPool(async ledger => {
    const running = listTx2Containers({ all: true }); reconcile(ledger, running);
    // [EXP-OBS01] Why: reserve CPUs under the same lock as memory, preventing simultaneous claims.
    // Rejected: a pre-lock availability check (two observers can both see the last free CPU).
    for (const c of running) {
      if (c.name === info.container || !c.running) continue;
      const pin = inspect(c.name)?.HostConfig.CpusetCpus;
      if (pin && cpusetOverlap(pin, plan.cpuset, config.vm.cpus).length) fail('REFUSED', `observer CPU overlaps ${c.name}`);
      if (!pin && c.labels?.['tx2.slot'] && c.labels['tx2.slot'] !== 'dev') fail('REFUSED', `measurement slot ${c.name} is unpinned`);
    }
    for (const r of ledger.reservations) if (r.cpusetCpus && cpusetOverlap(r.cpusetCpus, plan.cpuset, config.vm.cpus).length)
      fail('REFUSED', `observer CPU reserved by ${r.container}`);
    const verdict = admission({ config, reservations: ledger.reservations, running, request: { container: plan.name, memBytes: MEMORY, diskForecastBytes: plan.plan.maxBundleBytes + 8 * 1024 * 1024 }, diskUsedBytes: vmDisk(config).usedBytes });
    if (!verdict.ok) fail('REFUSED', verdict.reasons.join('; '));
    const usedKeys = readJson(path.join(ROOT, 'key-fingerprints.json'), {});
    if (usedKeys[plan.keyFingerprint] || Object.values(usedKeys).some(k => k.keyId === plan.plan.keyId))
      fail('REFUSED', 'each observer attempt requires a fresh evaluator key and key-id');
    usedKeys[plan.keyFingerprint] = { runId: plan.plan.runId, keyId: plan.plan.keyId };
    atomicJson(path.join(ROOT, 'key-fingerprints.json'), usedKeys);
    ledger.reservations.push({ container: plan.name, lane: info.lane, slot: info.slot, role: 'observer', memBytes: MEMORY, cpus: 1, cpusetCpus: plan.cpuset, diskForecastBytes: plan.plan.maxBundleBytes + 8 * 1024 * 1024, holder: defaultHolder(opts), state: 'starting', pid: process.pid });
  });
  try {
    fs.mkdirSync(plan.dir, { recursive: true, mode: 0o700 });
    const codeDir = path.join(plan.dir, 'code'); fs.mkdirSync(codeDir);
    for (const name of ['collector.py', 'normalize.py', 'capture.py', 'commands.py', 'pgclient.py', 'verify_seal.py']) fs.copyFileSync(path.join(SOURCE, name), path.join(codeDir, name));
    // [EXP-OBS01] Why: preserve controller bytes as well as sampler bytes for independent replay.
    // Rejected: reconstructing an old attempt from a later working tree.
    if (opts['protocol-spec']) {
      const policies=JSON.parse(fs.readFileSync(opts['protocol-spec'],'utf8'));
      atomicJson(path.join(plan.dir,'protocol-spec.json'),policies);
      for (const stream of plan.plan.streams) if (policies[stream.streamId]) {
        const specFile=path.join(plan.dir,`${stream.streamId}.case.json`);
        atomicJson(specFile,policies[stream.streamId]);
        const normalizerFile=`${stream.streamId}.normalize.py`;
        const output=path.join(codeDir,normalizerFile);
        const compiled=spawnSync('python3',['-I','-B',path.join(SOURCE,'compile_protocol.py'),specFile,stream.sourceId,output],{encoding:'utf8'});
        if (compiled.status!==0) fail('REFUSED',`normalizer compilation failed: ${compiled.stderr}`);
        stream.normalizer={id:'obs01-protocol',version:'2',sha256:sha256(fs.readFileSync(output))};
        stream.normalizerFile=normalizerFile;
      }
    }
    const tooling = {};
    for (const name of ['engine.mjs', 'observer.mjs', 'observer-clock.mjs', 'archive-volume.mjs', 'lib.mjs']) {
      const bytes = fs.readFileSync(path.join(REPO, 'lab/bin', name));
      fs.writeFileSync(path.join(codeDir, name), bytes); tooling[name] = sha256(bytes);
    }
    atomicJson(path.join(plan.dir, 'tooling-manifest.json'), { node: process.version, files: tooling });
    const engineInputs = [];
    for (const mount of engine.Mounts.filter(m => ['/config/start.sh', '/etc/xtdb/config.yaml', '/etc/xtdb/log4j2.xml'].includes(m.Destination))) {
      const bytes = fs.readFileSync(mount.Source);
      const name = `engine-input-${engineInputs.length}.bin`;
      fs.writeFileSync(path.join(plan.dir, name), bytes);
      engineInputs.push({ destination: mount.Destination, sha256: sha256(bytes), retained: name });
    }
    atomicJson(path.join(plan.dir, 'engine-inputs.json'), engineInputs);
    plan.plan.sut.engineConfigInputsSha256 = sha256(canonical(engineInputs));
    fs.writeFileSync(path.join(plan.dir, 'config.json'), canonical(plan.plan) + '\n');
    const args = ['run', '-d', '--name', plan.name, '--restart', 'no', '--label', 'tx2.managed-by=lab/bin/engine.mjs', '--label', 'tx2.role=observer', '--label', `tx2.holder=${defaultHolder(opts)}`,
      '--network', `container:${engine.Id}`, '--pid', `container:${engine.Id}`, '--cgroupns', 'host', '--cap-drop', 'ALL', '--cap-add','DAC_READ_SEARCH', '--security-opt', 'no-new-privileges', '--read-only',
      '--memory', String(MEMORY), '--memory-swap', String(MEMORY), '--cpus', '1', '--cpuset-cpus', plan.cpuset,
      '-v', '/sys/fs/cgroup:/sys/fs/cgroup:ro', '-v', `${plan.volume}:/engine:ro`, '-v', `${codeDir}:/collector:ro`,
      '-v', `${path.join(plan.dir, 'config.json')}:/config.json:ro`, '-v', `${plan.key}:/run/key:ro`, '-v', `${plan.dir}/output:/obs`,
      '--entrypoint', 'python3', opts.image, '-I', '-B', '/collector/collector.py', '/config.json', '/run/key', '/obs/bundle'];
    fs.mkdirSync(path.join(plan.dir, 'output'), { mode: 0o700 });
    const id = docker(args);
    atomicJson(stateFile(info), { name: plan.name, dir: plan.dir, key: plan.key, runId: plan.plan.runId, holder: defaultHolder(opts), containerId: id });
    await withPool(async ledger => { Object.assign(ledger.reservations.find(r => r.container === plan.name), { state: 'running', pid: null }); });
    const ready=path.join(plan.dir,'output/bundle/ready.json');
    for (let attempt=0; !fs.existsSync(ready); attempt++) {
      if (attempt>=300 || !inspect(plan.name)?.State.Running) fail('REFUSED','observer failed before source/proxy readiness; retain its attempt and stop through observer-down');
      await sleep(100);
    }
    appendEvent({ event: 'observer-start', container: plan.name, runId: plan.plan.runId });
    const log = fs.openSync(path.join(plan.dir, 'watch.log'), 'a');
    const child = spawn(process.execPath, [path.join(REPO, 'lab/bin/engine.mjs'), 'observer-watch', '--lane', info.lane, '--slot', info.slot, '--holder', defaultHolder(opts)], { detached: true, stdio: ['ignore', log, log], env: process.env });
    child.unref(); fs.closeSync(log);
    console.log(JSON.stringify({ observer: id, bundle: `${plan.dir}/output/bundle`, witness: `${ROOT}/witness.jsonl` }));
  } catch (error) {
    if (!inspect(plan.name)) await withPool(async ledger => { ledger.reservations = ledger.reservations.filter(r => r.container !== plan.name); });
    throw error;
  }
}

export async function observerWitness(info, opts) {
  ownerCheck(info, opts);
  const state = readJson(stateFile(info));
  if (state.holder !== defaultHolder(opts)) fail('REFUSED', 'observer holder differs');
  const root = path.join(state.dir, 'output/bundle');
  if (!fs.existsSync(path.join(root, 'index.json'))) return;
  const key = fs.readFileSync(state.key);
  await withDirLock(path.join(ROOT, 'witness.lock'), async () => {
    const index = readJson(path.join(root, 'index.json'));
    for (const [streamId, entries] of Object.entries(index)) {
      if (!entries.length) continue;
      const last = entries.at(-1);
      const hp = path.resolve(root, last.header);
      if (!hp.startsWith(root + '/') || fs.lstatSync(hp).isSymbolicLink()) fail('REFUSED', 'external header');
      const bytes = fs.readFileSync(hp), header = JSON.parse(bytes);
      if (header.streamId !== streamId || header.seq !== entries.length - 1 || sha256(bytes) !== last.headerSha256 || !signedOk(bytes, key)) fail('REFUSED', 'witness header failed authentication');
      const witness = { runId: state.runId, streamId, seq: header.seq, headSha256: sha256(bytes), tMono: header.tEndMono, observedHostMono: Number(process.hrtime.bigint()) / 1e6, observedAtReal: new Date().toISOString() };
      const fd = fs.openSync(path.join(ROOT, 'witness.jsonl'), 'a', 0o600);
      try { fs.writeSync(fd, JSON.stringify(witness) + '\n'); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    }
  });
}

export async function observerWatch(info, opts) {
  let lastWitness = 0;
  const initial = readJson(stateFile(info));
  for (;;) {
    const current = readJson(stateFile(info), null);
    if (current?.runId !== initial.runId || current.stopping) return;
    const c = inspect(initial.name);
    if (!c) return;
    if (Date.now() - lastWitness >= 10000 && fs.existsSync(path.join(initial.dir, 'output/bundle/index.json'))) {
      await observerWitness(info, opts); lastWitness = Date.now();
    }
    if (!c.State.Running) return;
    try { await observerBridge(info, opts); }
    catch (error) { fs.appendFileSync(path.join(initial.dir, 'bridge-rejections.jsonl'), JSON.stringify({ at: new Date().toISOString(), error: error.message, sample: error.sample ?? null }) + '\n'); }
    await sleep(1000);
  }
}

export async function observerDown(info, opts) {
  ownerCheck(info, opts);
  const state = readJson(stateFile(info));
  const c = inspect(state.name);
  if (state.holder !== defaultHolder(opts) || (c && c.Id !== state.containerId)) fail('REFUSED', 'observer identity differs');
  atomicJson(stateFile(info), { ...state, stopping: true });
  if (c?.State.Running) docker(['stop', '-t', '15', state.name]);
  await observerWitness(info, opts);
  const sealed = fs.existsSync(path.join(state.dir, 'output/bundle/seal.json'));
  if (c) {
    const logs = spawnSync('docker', dockerArgs(['logs', state.name]), { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
    fs.writeFileSync(path.join(state.dir, 'container-logs.txt'), (logs.stdout ?? '') + (logs.stderr ?? ''));
    atomicJson(path.join(state.dir, 'container-final.json'), inspect(state.name));
    docker(['rm', state.name]);
  }
  if (inspect(state.name)) fail('ENGINE', 'observer remains; reservation retained');
  await withPool(async ledger => { ledger.reservations = ledger.reservations.filter(r => r.container !== state.name); });
  fs.renameSync(stateFile(info), path.join(state.dir, 'stopped.json'));
  appendEvent({ event: 'observer-stop', container: state.name, runId: state.runId, sealed });
  console.log(JSON.stringify({ sealed, retained: state.dir }));
}

export function observerImage(opts) {
  if (!opts.image) fail('USAGE', '--image is required');
  docker(['pull', opts.image]);
  console.log(docker(['image', 'inspect', opts.image, '--format', '{{json .RepoDigests}}']));
}

export async function observerBridge(info, opts) {
  ownerCheck(info, opts);
  const state = readJson(stateFile(info));
  const port = info.port + 10000;
  if (!clockSamplers.has(port)) clockSamplers.set(port, new ClockSampler(port));
  const sample = await clockSamplers.get(port).sample();
  const { send, receive } = sample;
  // [EXP-OBS01] Why: refuse imprecise samples. Rejected: inventing a zero-RTT VM bridge.
  if (receive - send > 2) {
    const error = new Error(`clock bridge RTT ${receive - send}ms exceeds 2ms`); error.sample=sample; throw error;
  }
  await withDirLock(path.join(ROOT, 'bridge.lock'), async () => {
    const current = readJson(stateFile(info), null);
    if (current?.runId !== state.runId || current.stopping) fail('REFUSED', 'observer stopped while clock sample was in flight');
    fs.appendFileSync(path.join(state.dir, 'output/bundle/clock/bridge.jsonl'), JSON.stringify(sample) + '\n');
  });
  console.log(JSON.stringify(sample));
}

export function observerRetain(opts) {
  const runId = safeId(opts['run-id'], 'run-id');
  const dir = path.join(ROOT, runId);
  const state = readJson(path.join(dir, 'stopped.json'));
  if (state.holder !== defaultHolder(opts) || state.runId !== runId || inspect(state.name))
    fail('REFUSED', 'retention requires the original holder and a removed observer');
  const root = path.join(dir, 'output/bundle');
  const envelope = readJson(path.join(root, 'bundle.json'));
  const index = readJson(path.join(root, 'index.json'));
  const witnesses = fs.readFileSync(path.join(ROOT, 'witness.jsonl'), 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse).filter(w => w.runId === runId);
  const seal = readJson(path.join(root, 'seal.json'));
  const key = fs.readFileSync(state.key);
  const verifier=path.join(dir,'code/verify_seal.py');
  if(!fs.existsSync(verifier))fail('REFUSED','historical run lacks integrity verifier; retain its original context');
  const integrity=spawnSync('python3',['-I','-B',verifier,root,state.key,path.join(dir,'config.json'),path.join(dir,'code')],{encoding:'utf8',timeout:60000});
  if(integrity.status!==0)fail('REFUSED','retention integrity check failed: '+integrity.stderr);
  const unsigned = { runId: seal.runId, heads: seal.heads };
  if (createHmac('sha256', key).update(canonical(unsigned)).digest('hex') !== seal.hmac) fail('REFUSED', 'invalid seal');
  for (const [sid, entries] of Object.entries(index)) {
    const last = entries.at(-1);
    if (!last || seal.heads[sid] !== last.headerSha256 || !witnesses.some(w => w.streamId === sid && w.seq === entries.length - 1 && w.headSha256 === last.headerSha256))
      fail('REFUSED', 'independent final witness missing');
  }
  const retention = { runId, receiptId: envelope.receiptId, keyId: envelope.keyId, engine: envelope.sut.lane,
    bundleSha256: sha256(fs.readFileSync(path.join(root, 'bundle.json'))),
    bridgeSha256: sha256(fs.readFileSync(path.join(root, 'clock/bridge.jsonl'))),
    streams: envelope.streams.map(s => ({ ...s, normalizerPath: path.join(dir, 'code', s.normalizerFile ?? 'normalize.py'), chunks: index[s.streamId] })),
    witnessHeads: witnesses, clockMaxUncertaintyMs: envelope.clock.maxUncertaintyMs };
  atomicJson(path.join(dir, 'retention.json'), retention);
  console.log(JSON.stringify({ retention: path.join(dir, 'retention.json'), bundle: root }));
}

export async function observerCommand(info,opts) {
  ownerCheck(info,opts);const state=readJson(stateFile(info));
  const allowed=['finish-block','scan','count'];
  if(!allowed.includes(opts.action))fail('REFUSED','unknown observer action');
  const id=randomUUID();const directory=path.join(state.dir,'output/commands');fs.mkdirSync(directory,{recursive:true});
  const command={action:opts.action,canary:opts.canary,relation:opts.relation,label:opts.label};
  atomicJson(path.join(directory,id+'.json'),command);
  const result=path.join(state.dir,'output/results',id+'.json');
  for(let attempt=0;attempt<600;attempt++){
    if(fs.existsSync(result)){const value=readJson(result);if(value.error)fail('REFUSED',value.error);console.log(JSON.stringify(value));return;}
    if(!inspect(state.name)?.State.Running)fail('REFUSED','observer stopped during command');
    await sleep(100);
  }
  fail('REFUSED','observer command timed out; retain command and partial evidence');
}
