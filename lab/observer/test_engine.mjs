// [EXP-OBS01] Why: check admission preconditions without starting or modifying residents.
// Rejected: mock Docker successes as engine qualification.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
process.env.TX2_ENGINE_DIR ??= path.resolve('runs/OBS01/test-engines');
const { observerPlan } = await import('../bin/observer.mjs');
const { sameResident } = await import('../bin/resident-observer.mjs');
const { effectiveConfig } = await import('../bin/engine.mjs');
const { loadSlots, slotInfo } = await import('../bin/lib.mjs');
const witness = await import('../bin/sync-witness.mjs');
const config = loadSlots();
const info = slotInfo(config, 'xtdb', 's1');
const tmp = fs.mkdtempSync(path.resolve('runs/OBS01/node-test-'));
const key = path.join(tmp, 'external.key'); fs.writeFileSync(key, Buffer.alloc(32, 7));
const engine = { Id: 'e'.repeat(64), Image: 'sha256:engine', HostConfig: { CpusetCpus: '0,1' }, Config: { Labels: { 'tx2.config-sha256': 'config' } }, Mounts: [{ Name: info.volume }] };
const opts = { 'observer-cpus': '5', image: `python@sha256:${'a'.repeat(64)}`, 'key-file': key, 'run-id': 'test', 'receipt-id': 'receipt', 'key-id': 'key' };
test('resident binding ignores mount order but refuses restart, config or mount changes',()=>{
 const a={...engine,Mounts:[{Destination:'/a',Name:'a'},{Destination:'/b',Name:'b'}],State:{Running:true,StartedAt:'one'}};
 assert.equal(sameResident(a,{...a,Mounts:a.Mounts.toReversed()}),true);
 assert.equal(sameResident(a,{...a,State:{Running:true,StartedAt:'two'}}),false);
 assert.equal(sameResident(a,{...a,Mounts:[{Destination:'/a',Name:'wrong'}]}),false);
 assert.equal(sameResident(a,{...a,Config:{Labels:{changed:true}}}),false);
});
test('requires disjoint CPU pinning', () => {
  assert.throws(() => observerPlan(config, info, engine, { ...opts, 'observer-cpus': '1' }));
  assert.throws(() => observerPlan(config, info, { ...engine, HostConfig: { CpusetCpus: '' } }, opts));
});
test('requires evaluator key, immutable image and safe identities', () => {
  assert.throws(() => observerPlan(config, info, engine, { ...opts, image: 'python:latest' }));
  assert.throws(() => observerPlan(config, info, engine, { ...opts, 'run-id': '../other' }));
  fs.writeFileSync(key, Buffer.alloc(31));
  assert.throws(() => observerPlan(config, info, engine, opts));
  fs.writeFileSync(key, Buffer.alloc(32));
});
test('output budget is bounded before admission', () => {
  assert.throws(() => observerPlan(config, info, engine, { ...opts, 'max-bundle-bytes': 'Infinity' }));
  assert.throws(() => observerPlan(config, info, engine, { ...opts, 'max-bundle-bytes': '1' }));
  assert.equal(observerPlan(config, info, engine, opts).plan.maxBundleBytes, 64 * 1024 * 1024);
});
test('XTDB completed transaction source and host sources are collected', () => {
  const p = observerPlan(config, info, engine, opts);
  assert.equal(p.plan.streams.find(s => s.streamId === 'X1-metrics').sourceId, 'X1.node.tx.latestCompletedTxId');
  assert.equal(p.plan.streams.filter(s => s.kind === 'HO/any/H1').length, 7);
});
test('Datomic plans independent thread and callback samples', () => {
  const d = { ...info, lane: 'datomic', container: 'tx2-datomic-s1', volume: 'tx2-datomic-s1-data' };
  const e = { ...engine, Mounts: [{ Name: d.volume }] };
  const options = { ...opts, 'gateway-pids': '2,7', 'transactor-metrics': 'log/transactor-metrics.jsonl' };
  const p = observerPlan(config, d, e, options);
  assert.deepEqual(p.plan.streams.find(s => s.streamId === 'H5-threads').pids, [2, 7]);
  assert.equal(p.plan.streams.find(s => s.streamId === 'D1-metrics').method, 'tail');
  assert.throws(() => observerPlan(config, d, e, { ...options, 'transactor-metrics': '../gateway-output' }));
});
test('protected clock ports are refused', () => {
  assert.throws(() => effectiveConfig(config, { ...info, observationSources: true, port: 5442 }));
});
test('QLever profile is opt-in and resident script remains unchanged', () => {
  const q = slotInfo(config, 'qlever', 's3');
  const plain = effectiveConfig(config, q);
  const original = fs.readFileSync(plain.files.startScript, 'utf8');
  const qEngine={...engine,Mounts:[{Name:q.volume}]};
  const p=observerPlan(config,q,qEngine,{...opts,'observer-streams':'T2-wire'});
  assert.deepEqual(p.plan.streams.map(s=>s.streamId),['T2-wire','Q2-index-state']);
  const observed = effectiveConfig(config, { ...q, observationSources: true, cpusetCpus: '0' });
  const script = fs.readFileSync(observed.files.startScript, 'utf8');
  assert.match(original, /--no-metrics-log/);
  assert.doesNotMatch(original, /--enable-metrics/);
  assert.match(script, /--enable-metrics/);
  assert.doesNotMatch(script, /--no-metrics-log/);
  assert.equal(observed.effective.cpusetCpus, '0');
  assert.equal(observed.effective.observerClockPublish, '127.0.0.1:17073:18080');
  // Restore the stopped slot's effective config bytes after inspecting the variant.
  effectiveConfig(config, q);
});
test('follower effective config keeps its own JVM settings without observer logging', () => {
  const file=path.join(tmp,'follower.yaml');fs.writeFileSync(file,'server:\n  port: 5432\n');
  const follower={...info,role:'follower',writer:info.container,configFile:file,configSource:'fixture',javaOpts:'-Xmx256m'};
  assert.equal(effectiveConfig(config,follower).effective.env.JDK_JAVA_OPTIONS,'-Xmx256m');
});

// ---- OBS01 round 9: sync witness controller pieces (pure; no Docker)
const goodWitness = (over = {}) => ({
  Config: { Image: 'quay.io/iovisor/bpftrace@sha256:' + 'b'.repeat(64), Labels: {}, ...over.Config },
  HostConfig: { CapAdd: ['BPF', 'PERFMON'], CapDrop: ['ALL'], Privileged: false, ReadonlyRootfs: true, NetworkMode: 'none', PidMode: '', IpcMode: 'private',
    SecurityOpt: ['no-new-privileges'], Devices: [], Memory: 268435456, ...over.HostConfig },
  Mounts: over.Mounts ?? [{ Type: 'volume', Name: 'sw-run', Destination: '/witness', RW: true }, { Type: 'bind', Destination: '/sys/kernel/btf', RW: false },
    { Type: 'bind', Destination: '/sys/kernel/tracing', RW: false }, { Type: 'bind', Destination: '/program/vm_syncwitness.bt', RW: false }],
});
test('witness profile accepts only CAP_BPF + CAP_PERFMON, private namespaces and the run volume', () => {
  assert.deepEqual(witness.verifyWitnessProfile(goodWitness(), { volume: 'sw-run' }), []);
  assert.deepEqual(witness.verifyWitnessProfile(goodWitness({ HostConfig: { CapAdd: ['CAP_BPF', 'CAP_PERFMON'] } }), { volume: 'sw-run' }), []);
  const refused = (over, text) => assert.match(witness.verifyWitnessProfile(goodWitness(over), { volume: 'sw-run' }).join(';'), text);
  refused({ HostConfig: { CapAdd: ['BPF', 'PERFMON', 'SYS_ADMIN'] } }, /exactly BPF and PERFMON/);
  refused({ HostConfig: { CapAdd: ['BPF'] } }, /exactly BPF and PERFMON/);
  refused({ HostConfig: { CapDrop: [] } }, /CapDrop/);
  refused({ HostConfig: { Privileged: true } }, /privileged/);
  refused({ HostConfig: { NetworkMode: 'bridge' } }, /network/);
  refused({ HostConfig: { PidMode: 'host' } }, /pid/);
  refused({ HostConfig: { ReadonlyRootfs: false } }, /read-only/);
  refused({ HostConfig: { SecurityOpt: ['no-new-privileges', 'seccomp=unconfined'] } }, /unconfined/);
  refused({ HostConfig: { SecurityOpt: [] } }, /no-new-privileges/);
  refused({ HostConfig: { Memory: 0 } }, /256 MiB/);
  refused({ Config: { Image: 'bpftrace:latest' } }, /pinned/);
  refused({ Mounts: [{ Type: 'volume', Name: 'candidate-store', Destination: '/data', RW: true }] }, /unexpected mount/);
  refused({ Mounts: [{ Type: 'volume', Name: 'someone-elses', Destination: '/witness', RW: true }] }, /run volume/);
  refused({ Mounts: [{ Type: 'bind', Destination: '/sys/kernel/btf', RW: true }] }, /read-only/);
  refused({ Mounts: [{ Type: 'bind', Destination: '/var/run/docker.sock', RW: true }] }, /unexpected mount/);
});
test('witness create arguments carry the exact profile and the pinned program with its directory pair', () => {
  const args = witness.witnessCreateArgs({ name: 'tx2-sw-x', holder: 'h', image: 'sha256:' + 'c'.repeat(64), cpu: 5, volume: 'sw-run', dirs: [[266338305, 77]] });
  const text = args.join(' ');
  for (const needle of ['--cap-drop ALL', '--cap-add BPF', '--cap-add PERFMON', '--network none', '--read-only', 'no-new-privileges', '--entrypoint bpftrace', '--memory 268435456', '-o /witness/trace.txt', 'vm_syncwitness.bt:/program/vm_syncwitness.bt:ro', '266338305 77 266338305 77'])assert.ok(text.includes(needle), needle);
  assert.equal(args.filter(a => a === '--cap-add').length, 2);
  assert.ok(!args.includes('--privileged') && !args.includes('--pid') && !text.includes('docker.sock'));
  assert.throws(() => witness.witnessCreateArgs({ name: 'n', holder: 'h', image: 'sha256:' + 'c'.repeat(64), cpu: 5, volume: 'v', dirs: [] }));
  assert.throws(() => witness.witnessCreateArgs({ name: 'n', holder: 'h', image: 'sha256:' + 'c'.repeat(64), cpu: 5, volume: 'v', dirs: [[1, 2], [3, 4], [5, 6]] }));
});
test('kernel dev encoding matches the Python normalizer vectors', () => {
  for (const [major, minor] of [[254, 1], [8, 17], [259, 0], [4095, 1048575 & 0xfffff]]) {
    const st = (BigInt(minor) & 0xffn) | (BigInt(major & 0xfff) << 8n) | ((BigInt(minor) & ~0xffn) << 12n);
    assert.equal(witness.kernelDev(st), major * 2 ** 20 + minor);
  }
});
test('exclusive slot holders block the witness window and the cost gate uses per-commit counter deltas', () => {
  assert.deepEqual(witness.exclusiveHeld({ reservations: [{ container: 'tx2-xtdb-dev' }, { container: 'tx2-qlever-s1' }] }, [{ name: 'tx2-datomic-s2', running: true }, { name: 'tx2-g03-1', running: true }]), ['tx2-qlever-s1', 'tx2-datomic-s2']);
  assert.deepEqual(witness.exclusiveHeld({ reservations: [{ container: 'tx2-xtdb-dev' }] }, [{ name: 'tx2-qlever-dev', running: true }]), []);
  const samples = [0, 1, 2, 3].map(i => ({ t: i * 100, runTimeNs: i * i * 1000, runCnt: i * 10 }));
  const cost = witness.perCommitCost(samples, [50, 150, 160, 250, 260, 270, 280]);
  assert.deepEqual(cost.intervals.map(r => [r.commits, r.deltaNs, r.perCommitNs]), [[1, 1000, 1000], [2, 3000, 1500], [4, 5000, 1250]]);
  assert.equal(cost.p99PerCommitNs, 1500);
  assert.throws(() => witness.perCommitCost([{ t: 0, runTimeNs: 5, runCnt: 1 }, { t: 10, runTimeNs: 4, runCnt: 2 }], [5]), /backwards/);
  assert.throws(() => witness.perCommitCost(samples, [5000]), /no commit/);
  assert.equal(witness.nearestRank([5, 1, 3, 2, 4], .99), 5);
});
test.after(() => fs.rmSync(tmp, { recursive: true }));
