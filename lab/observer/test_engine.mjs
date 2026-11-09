// [EXP-OBS01] Why: check admission preconditions without starting or modifying residents.
// Rejected: mock Docker successes as engine qualification.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { buildKernelLikeBtf } from './btf_fixture.mjs';
import { sectionedDump } from './dump_fixture.mjs';
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
  Config: { Image: 'quay.io/iovisor/bpftrace@sha256:' + 'b'.repeat(64), Labels: {}, Env: ['PATH=/usr/bin', 'BPFTRACE_PERF_RB_PAGES=1024', 'BPFTRACE_MAX_MAP_KEYS=65536'], ...over.Config },
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
  refused({ Config: { Env: ['BPFTRACE_PERF_RB_PAGES=1024'] } }, /BPFTRACE_MAX_MAP_KEYS must be set/);
  refused({ Config: { Env: ['BPFTRACE_PERF_RB_PAGES=1024', 'BPFTRACE_MAX_MAP_KEYS=4096'] } }, /BPFTRACE_MAX_MAP_KEYS must be set/);
  refused({ Config: { Env: ['BPFTRACE_MAX_MAP_KEYS=65536'] } }, /PERF_RB_PAGES must be set/);
  refused({ Mounts: [{ Type: 'volume', Name: 'candidate-store', Destination: '/data', RW: true }] }, /unexpected mount/);
  refused({ Mounts: [{ Type: 'volume', Name: 'someone-elses', Destination: '/witness', RW: true }] }, /run volume/);
  refused({ Mounts: [{ Type: 'bind', Destination: '/sys/kernel/btf', RW: true }] }, /read-only/);
  refused({ Mounts: [{ Type: 'bind', Destination: '/var/run/docker.sock', RW: true }] }, /unexpected mount/);
});
test('witness create arguments carry the exact profile and the pinned program with its directory pair', () => {
  const args = witness.witnessCreateArgs({ name: 'tx2-sw-x', holder: 'h', image: 'sha256:' + 'c'.repeat(64), cpu: 5, volume: 'sw-run', dirs: [[266338305, 77]] });
  const text = args.join(' ');
  for (const needle of ['-e BPFTRACE_MAX_MAP_KEYS=65536', '--cap-drop ALL', '--cap-add BPF', '--cap-add PERFMON', '--network none', '--read-only', 'no-new-privileges', '--entrypoint bpftrace', '--memory 268435456', '-o /witness/trace.txt', 'vm_syncwitness.bt:/program/vm_syncwitness.bt:ro', '266338305 77 266338305 77'])assert.ok(text.includes(needle), needle);
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

// ---- OBS01 round 10: W0 checks from R49 (pure verdicts; the VM steps themselves are not run)
test('map keys are explicit, bounded, recorded in the create arguments and refused when low', () => {
  const create = (extra = {}) => witness.witnessCreateArgs({ name: 'tx2-sw-x', holder: 'h', image: 'sha256:' + 'c'.repeat(64), cpu: 5, volume: 'sw-run', dirs: [[266338305, 77]], ...extra });
  assert.ok(create().join(' ').includes('-e BPFTRACE_MAX_MAP_KEYS=' + witness.MAP_KEYS));
  assert.ok(create({ mapKeys: 1 << 20 }).join(' ').includes('BPFTRACE_MAX_MAP_KEYS=1048576'));
  for (const bad of [4096, 16383, 0, -1, 1.5, 4194305, NaN]) assert.throws(() => create({ mapKeys: bad }), /MAX_MAP_KEYS/);
  assert.deepEqual(witness.mapKeysVerdict({ configured: 65536 }).reasons, []);
  assert.equal(witness.mapKeysVerdict({ configured: 4096 }).pass, false);
  assert.equal(witness.mapKeysVerdict({ configured: undefined }).pass, false);
  assert.equal(witness.envValue({ Config: { Env: ['A=1', 'BPFTRACE_MAX_MAP_KEYS=7=8'] } }, 'BPFTRACE_MAX_MAP_KEYS'), '7=8');
  assert.equal(witness.envValue({ Config: {} }, 'A'), undefined);
});
// [OBS01-R11] samples carry the independent local references of vm_clockcheck.py: receivedNs/receivedAfterNs are CLOCK_MONOTONIC reads bracketing the CLOCK_BOOTTIME read receivedBootNs.
// sepNs is the local boot-minus-monotonic separation (suspended time); the bracket is 200 ns wide, so the lower bound of the separation is sepNs - 100.
const samples = (offsetNs, n = 50, hopNs = 2_000_000, sepNs = 3_600_000_000_000) => Array.from({ length: n }, (_, i) => { const mono = 100_000_000_000 + i * 20_000_000; const received = mono + hopNs + 5 * (i % 3); return { monotonicNs: mono + offsetNs, bootNs: mono + offsetNs + sepNs, receivedNs: received, receivedBootNs: received + 100 + sepNs, receivedAfterNs: received + 200 }; });
test('clock transport check: CONSISTENT only when monotonic fits and boot is excluded; INCONSISTENT on a contradiction; otherwise INCONCLUSIVE (never a pass)', () => {
  const ok = witness.clockVerdict(samples(0));
  assert.equal(ok.status, 'CONSISTENT'); assert.equal(ok.pass, true); assert.equal(ok.toleranceNs, witness.CLOCK_TOLERANCE_NS); assert.equal(ok.probeBootMinusMonotonicNs, 3_600_000_000_000);
  assert.equal(witness.clockVerdict(samples(0, 50, witness.CLOCK_TOLERANCE_NS)).status, 'CONSISTENT');          // the boundary hop is allowed
  assert.equal(witness.clockVerdict(samples(0, 50, witness.CLOCK_TOLERANCE_NS + 100)).status, 'INCONSISTENT');   // lags the reference by more than the tolerance
  const bare = witness.clockVerdict(samples(5_000_000_000));                                                    // a bare nsecs after 5 s of VM suspend: value ahead of the receipt
  assert.equal(bare.status, 'INCONSISTENT'); assert.match(bare.reasons.join(';'), /runs ahead/);
  const behind = witness.clockVerdict(samples(-5_000_000_000)); assert.equal(behind.status, 'INCONSISTENT'); assert.match(behind.reasons.join(';'), /lags/);
  assert.equal(witness.clockVerdict(samples(1_000_000, 50, 0)).status, 'CONSISTENT');                            // minimum hop exactly -1 ms: inside the stated slack
  assert.equal(witness.clockVerdict(samples(1_000_001, 50, 0)).status, 'INCONSISTENT');                          // one nanosecond further ahead refuses
  assert.equal(witness.clockVerdict(samples(0, 19)).pass, false);                                               // too few samples
  assert.equal(witness.clockVerdict(null).pass, false);
  assert.equal(witness.clockVerdict([...samples(0, 49), { monotonicNs: -1, bootNs: 0, receivedNs: 0 }]).status, 'INCONSISTENT');
  const backwards = samples(0); [backwards[10].monotonicNs, backwards[11].monotonicNs] = [backwards[11].monotonicNs, backwards[10].monotonicNs];
  assert.match(witness.clockVerdict(backwards).reasons.join(';'), /backwards/);
});
test('clock transport check: a separation not larger than the uncertainty is INCONCLUSIVE, including a boot substitution (R10-F3 shapes)', () => {
  const edge = 99_000_000 + 100;                                                                                // uncertainty = tolerance + slack - min hop (2 ms) = 99 ms; the separation lower bound is sepNs - 100
  for (const [sep, want] of [[0, 'INCONCLUSIVE'], [500_000, 'INCONCLUSIVE'], [edge, 'INCONCLUSIVE'], [edge + 1, 'CONSISTENT'], [3_600_000_000_000, 'CONSISTENT']]) assert.equal(witness.clockVerdict(samples(0, 50, 2_000_000, sep)).status, want, 'sep ' + sep);
  const inconclusive = witness.clockVerdict(samples(0, 50, 2_000_000, 0));
  assert.equal(inconclusive.pass, false); assert.match(inconclusive.reasons.join(';'), /not larger than the measured uncertainty/); assert.equal(typeof inconclusive.separationNs, 'number');
  // the wrong primitive (a boot value in the monotonic field) with small separation or large transport delay is not refuted by observation: INCONCLUSIVE, not PASS
  const aliased = (sep, delay) => samples(0, 50, delay, sep).map(r => ({ ...r, monotonicNs: r.monotonicNs + sep }));  // boot reading: value is `sep` ahead
  assert.notEqual(witness.clockVerdict(aliased(500_000, 100_000)).status, 'CONSISTENT');
  assert.notEqual(witness.clockVerdict(aliased(10_000_000, 20_000_000)).status, 'CONSISTENT');
  assert.notEqual(witness.clockVerdict(aliased(0, 100_000)).status, 'CONSISTENT');
  // no independent references at all (the pre-round-11 sample shape): inconclusive; partial references: inconsistent
  assert.equal(witness.clockVerdict(samples(0).map(({ receivedBootNs, receivedAfterNs, ...r }) => r)).status, 'INCONCLUSIVE');
  assert.equal(witness.clockVerdict(samples(0).map((r, i) => i === 3 ? { ...r, receivedBootNs: null } : r)).status, 'INCONSISTENT');
  assert.equal(witness.clockVerdict(samples(0).map(r => ({ ...r, receivedAfterNs: r.receivedNs - 1 }))).status, 'INCONSISTENT');
});
test('the clock helper really stamps receipt time and its output feeds the transport check (child stands in for the bpftrace container)', async () => {
  const { spawnSync } = await import('node:child_process');
  const child = "import time\nfor i in range(30):\n print('CK|%d|%d'%(time.monotonic_ns(),time.monotonic_ns()+9),flush=True);time.sleep(.005)";
  const out = spawnSync('python3', ['-B', '-c', fs.readFileSync(witness.CLOCK_HELPER, 'utf8'), '--', 'python3', '-c', child], { encoding: 'utf8', timeout: 30000 });
  assert.equal(out.status, 0, out.stderr);
  const rows = out.stdout.split('\n').filter(Boolean).map(l => JSON.parse(l));
  assert.equal(rows.length, 30);
  const linux = process.platform === 'linux';
  for (const r of rows) { assert.deepEqual(Object.keys(r).sort(), ['bootNs', 'monotonicNs', 'receivedAfterNs', 'receivedBootNs', 'receivedNs']); assert.equal(r.receivedBootNs === null, !linux); assert.equal(r.receivedAfterNs === null, !linux); if (linux) assert.ok(r.receivedAfterNs >= r.receivedNs && r.receivedBootNs >= r.receivedNs); }
  // the stand-in child reads the receiving process's own clock, so it is monotonic-consistent: never INCONSISTENT; INCONCLUSIVE here because a local suspend separation is ~0
  assert.notEqual(witness.clockVerdict(rows).status, 'INCONSISTENT');
  const shifted = rows.map(r => ({ ...r, monotonicNs: r.monotonicNs + 10 ** 10, bootNs: r.bootNs + 10 ** 10 }));
  assert.equal(witness.clockVerdict(shifted).status, 'INCONSISTENT');
});
test('perf_event_paranoid is recorded and a failed attach with only CAP_PERFMON refuses naming the level', () => {
  assert.deepEqual(witness.perfParanoidVerdict({ paranoid: 4, tracepointAttach: { ok: true } }), { pass: true, paranoid: 4, reasons: [] });
  assert.equal(witness.perfParanoidVerdict({ paranoid: 2, tracepointAttach: { ok: true } }).pass, true);
  const refused = witness.perfParanoidVerdict({ paranoid: 4, tracepointAttach: { ok: false, detail: 'perf_event_open: Permission denied' } });
  assert.equal(refused.pass, false); assert.match(refused.reasons[0], /CAP_PERFMON alone is not enough.*perf_event_paranoid=4.*Permission denied.*CAP_SYS_ADMIN/);
  assert.equal(witness.perfParanoidVerdict({ paranoid: NaN, tracepointAttach: { ok: true } }).pass, false);
  assert.equal(witness.perfParanoidVerdict({ paranoid: 4 }).pass, false);
});
test('peak witness memory is checked against the 256 MiB cap with stated headroom and OOM kills refuse', () => {
  const cap = witness.WITNESS_MEMORY;
  assert.equal(witness.memoryVerdict({ peakBytes: 100 * 2 ** 20, oomKills: 0 }).pass, true);
  assert.equal(witness.memoryVerdict({ peakBytes: Math.floor(cap * 0.8), oomKills: 0 }).pass, true);
  assert.equal(witness.memoryVerdict({ peakBytes: Math.floor(cap * 0.8) + 1, oomKills: 0 }).pass, false);
  assert.match(witness.memoryVerdict({ peakBytes: 1, oomKills: 2 }).reasons.join(';'), /OOM-killed 2/);
  for (const bad of [{ peakBytes: null, oomKills: 0 }, { peakBytes: -1, oomKills: 0 }, { peakBytes: 1, oomKills: null }]) assert.equal(witness.memoryVerdict(bad).pass, false);
  assert.equal(witness.oomKillsOf('low 0\nhigh 0\nmax 0\noom 0\noom_kill 3\n'), 3); assert.equal(witness.oomKillsOf('oom 1\n'), null);
});
test('ext4 built in: a module BTF file or an unresolved probe refuses', () => {
  const listing = { 'fexit:vmlinux:ext4_file_write_iter': 'fexit:vmlinux:ext4_file_write_iter\n', 'fentry:vmlinux:ext4_sync_fs': 'fentry:vmlinux:ext4_sync_fs\n' };
  assert.equal(witness.ext4BuiltinVerdict({ ext4BtfPresent: false, listing }).pass, true);
  assert.match(witness.ext4BuiltinVerdict({ ext4BtfPresent: true, listing }).reasons.join(';'), /btf\/ext4 must be absent/);
  assert.match(witness.ext4BuiltinVerdict({ ext4BtfPresent: false, listing: { ...listing, 'fentry:vmlinux:ext4_page_mkwrite': '' } }).reasons.join(';'), /did not resolve fentry:vmlinux:ext4_page_mkwrite/);
  assert.equal(witness.ext4BuiltinVerdict({ ext4BtfPresent: undefined, listing }).pass, false);
  assert.equal(witness.ext4BuiltinVerdict({ ext4BtfPresent: false, listing: {} }).pass, false);
});
// ---- OBS01 round 11 (R10-F3): the clock primitive is proven from the compiled program. The "compiled output" samples below are CONSTRUCTED by the builder
// from the documented shapes of LLVM IR, BPF disassembly and the verifier log (R49 holds no bpftrace debug-output excerpt and no bpftrace ran offline).
// They are NOT recordings. W0 is the first place a real dump is captured (<out>/w0-compiled-program.txt); replace or add a recorded sample then.
const ir = id => `  %x = call i64 inttoptr (i64 ${id} to i64 ()*)()`;
const ir18 = id => `  %x = tail call i64 inttoptr (i64 ${id} to ptr)()`;
const dis = id => `      12:\t85 00 00 00 ${id.toString(16).padStart(2, '0')} 00 00 00\tcall ${id}`;
const ver = (name, id) => `12: (85) call ${name}#${id}`;
const pinned = fs.readFileSync(witness.PROGRAM);
// [OBS01-R12] The proof judges the per-probe disassembly section and takes helper ids from the kernel BTF (both CONSTRUCTED: btf_fixture.mjs, dump_fixture.mjs) and requires a clean exit of every process.
const okRun = { exitCode: 0, signal: null, timedOut: false, error: null };
const fixtureBtf = buildKernelLikeBtf();
const dumpOf = (callIds, form) => sectionedDump({ sections: Array.from({ length: 15 }, (_, i) => ({ name: 's_probe_' + (i + 1), calls: callIds, form })) });
const fifteenOf = (id, form) => dumpOf([id], form);
const goodProof = (compiledText, over = {}) => ({ expectedSourceSha256: sha(pinned), mountedSourceSha256: sha(pinned), sourceText: pinned.toString('utf8'), versionOutput: 'bpftrace v0.20.2\n',
  versionRun: okRun, hashRun: okRun, btf: { ...okRun, bytes: fixtureBtf }, compiled: { stdout: compiledText ?? sectionedDump(), stderr: '', exitCode: 0, timedOut: false }, ...over });
function sha(b) { return crypto.createHash('sha256').update(b).digest('hex'); }
test('compiled-program parser reads helper calls in the IR (old and opaque-pointer forms), disassembly and verifier forms [constructed samples]', () => {
  const p = witness.parseCompiledHelpers([ir(5), ir18(5), ir(125), '  %y = call i32 @llvm.bpf.pseudo(i64 1, i64 2)', '  %z = load i64, ptr inttoptr (i64 0 to ptr)', dis(5), dis(125), '      13:\t85 10 00 00 7d 00 00 00\tcall 0x7d', ver('bpf_ktime_get_ns', 5), ver('bpf_get_current_pid_tgid', 14)].join('\n'));
  assert.deepEqual(p.ir, { 5: 2, 125: 1 }); assert.deepEqual(p.asm, { 5: 1, 125: 2 }); assert.deepEqual(p.named, { 5: 1, 14: 1 }); assert.deepEqual(p.problems, []);
  assert.deepEqual(witness.parseCompiledHelpers('').ir, {}); assert.deepEqual(witness.parseCompiledHelpers(undefined).asm, {});
});
test('clock primitive step passes only on the pinned program, exact bpftrace version and a complete, allow-listed, monotonic-only compiled program [constructed samples]', () => {
  const run = (compiled, over) => witness.clockPrimitiveVerdict(goodProof(compiled, over));
  const good = run(); assert.deepEqual(good.reasons, []); assert.equal(good.pass, true); assert.equal(good.sourceMonotonicSites, 15); assert.equal(good.monotonicCalls, 15); assert.deepEqual(good.flags, witness.COMPILE_FLAGS);
  assert.equal(good.sections.length, 15); assert.equal(good.helperIds.bpf_ktime_get_ns, 5);                                      // ids reported are the ones read from the kernel BTF
  for (const form of ['numeric', 'bytes', 'bytes-only', 'paren']) assert.equal(run(fifteenOf(5, form)).pass, true, form);
  assert.equal(run(sectionedDump({ form: 'named' })).pass, true); assert.equal(run(sectionedDump({ form: 'name' })).pass, true);
  assert.equal(run(dumpOf([5, 5, 5])).pass, true);                                                                                // more calls than sites is fine
  const refuse = (compiled, over, pattern) => { const v = run(compiled, over); assert.equal(v.pass, false); assert.match(v.reasons.join(';'), pattern); return v; };
  // [OBS01-R13] Why (Q109a): the structured parser is DIAGNOSTIC, not gating. `diagnose` expects the diagnostic to report the problem; the gate passes unless the dump names a forbidden clock helper (token scan).
  // Rejected: keeping these as gate refusals (the gate is the static source check, the pinned hash/version/statuses and the token scan only).
  const diagnose = (compiled, over, pattern) => { const v = run(compiled, over), tokens = witness.forbiddenClockTokens(compiled ?? sectionedDump()).length > 0; assert.equal(v.pass, !tokens); assert.equal(v.diagnostic.pass, false); assert.match(v.diagnostic.reasons.join(';'), pattern); return v; };
  const withLast = calls => sectionedDump({ sections: Array.from({ length: 15 }, (_, i) => ({ name: 's_probe_' + (i + 1), calls: i === 14 ? [5, ...calls] : [5] })) });
  diagnose(withLast([125]), undefined, /another clock: bpf_ktime_get_boot_ns#125 x1/);                                             // one boot read among monotonic ones
  diagnose(fifteenOf(125), undefined, /boot_ns/);                                                                                   // the bare-nsecs shape: every read is boot
  for (const [id, name] of [[118, 'jiffies64'], [160, 'coarse_ns'], [208, 'tai_ns']]) for (const form of ['numeric', 'bytes', 'paren']) diagnose(withLast([id]), undefined, new RegExp('another clock: .*' + name));
  diagnose(sectionedDump({ form: 'named', sections: [...Array.from({ length: 14 }, (_, i) => ({ name: 's_probe_' + (i + 1), calls: [5] })), { name: 's_probe_15', calls: [5, 125], form: 'named' }] }), undefined, /bpf_ktime_get_boot_ns#125/);
  diagnose(sectionedDump({ sections: Array.from({ length: 15 }, (_, i) => ({ name: 's_probe_' + (i + 1), calls: [5], extra: i === 14 ? ['  @@: (85) call bpf_ktime_get_ns#125'] : [] })) }), undefined, /listed with id 125, the kernel enum says bpf_ktime_get_boot_ns/);   // name and id disagree
  diagnose(sectionedDump({ sections: Array.from({ length: 15 }, (_, i) => ({ name: 's_probe_' + (i + 1), calls: [5], extra: i === 14 ? ['  @@: (85) call bpf_ktime_get_boot_ns#5'] : [] })) }), undefined, /listed with id 5, the kernel enum says bpf_ktime_get_ns/);
  diagnose(sectionedDump({ sections: Array.from({ length: 15 }, (_, i) => ({ name: 's_probe_' + (i + 1), calls: [5], extra: i === 14 ? ['  @@: (85) call bpf_ktime_get_new_ns#300'] : [] })) }), undefined, /id 300 .* is not in the kernel bpf_func_id enum/);
  refuse(sectionedDump() + '\n; mentions bpf_ktime_get_tai_ns in a comment', undefined, /names a forbidden clock helper: bpf_ktime_get_tai_ns/);   // the token scan is the gate
  diagnose(Array.from({ length: 14 }, () => 0).length && sectionedDump({ sections: Array.from({ length: 15 }, (_, i) => ({ name: 's_probe_' + (i + 1), calls: i === 0 ? [] : [5] })) }), undefined, /fewer bpf_ktime_get_ns calls \(14\) than the 15/);
  refuse('', undefined, /compile dump is empty/); diagnose('error: unknown option -d', undefined, /compiled program section not found/);
  refuse(undefined, { compiled: { stdout: sectionedDump(), stderr: '', exitCode: null, timedOut: true } }, /did not terminate/);
  refuse(undefined, { versionOutput: 'bpftrace v0.20.1\n' }, /not exactly v0\.20\.2/); refuse(undefined, { versionOutput: 'bpftrace v0.20.2-dirty\n' }, /not exactly/); refuse(undefined, { versionOutput: '' }, /not exactly/);
  refuse(undefined, { mountedSourceSha256: '0'.repeat(64) }, /different program than the pinned source/);
  refuse(undefined, { mountedSourceSha256: null }, /hash not recorded/); refuse(undefined, { expectedSourceSha256: null }, /hash not recorded/);
  refuse(undefined, { sourceText: pinned.toString('utf8') + '\n' }, /source text analysed is not the pinned source/);
  const withBare = Buffer.from(pinned.toString('utf8') + '\nEND { printf("%llu", nsecs); }\n'); refuse(undefined, { sourceText: withBare.toString('utf8'), expectedSourceSha256: sha(withBare), mountedSourceSha256: sha(withBare) }, /reads a clock other than nsecs\(monotonic\)/);
  refuse(undefined, { sourceText: '', expectedSourceSha256: sha(Buffer.from('')), mountedSourceSha256: sha(Buffer.from('')) }, /no nsecs\(monotonic\) read/);
  assert.equal(witness.clockPrimitiveVerdict(undefined).pass, false);
  assert.equal(run().compiledSha256, sha(Buffer.from(sectionedDump())));                                                          // the receipt binds the exact compiled text it judged
});
test('the real program sources pass or fail the source-side check as designed', () => {
  assert.equal(witness.sourceTimeSites(fs.readFileSync(witness.PROGRAM, 'utf8')).monotonic, 15); assert.deepEqual(witness.sourceTimeSites(fs.readFileSync(witness.PROGRAM, 'utf8')).other, []);
  assert.ok(witness.sourceTimeSites(fs.readFileSync(witness.CLOCK_PROBE, 'utf8')).other.length > 0);                                // the probe's nsecs(boot) is exactly what the proof would refuse in the witness
});
test('W0 passes its clock step only on the program proof; an observational result never substitutes and only a contradiction blocks', () => {
  const good = () => ({ clockSamples: samples(0), clockProgram: goodProof(), paranoid: 4, tracepointAttach: { ok: true }, ext4BtfPresent: false, listing: { 'fexit:vmlinux:ext4_file_write_iter': 'fexit:vmlinux:ext4_file_write_iter' },
    attach: { pass: true, witnessCgroup: { memoryPeakBytes: 90 * 2 ** 20, oomKills: 0, maxMapKeys: 65536 } } });
  assert.deepEqual(witness.judgeW0(good()).reasons, []);
  const mutate = f => { const x = good(); f(x); return witness.judgeW0(x); };
  assert.equal(mutate(x => { x.clockSamples = samples(0, 50, 2_000_000, 0); }).pass, true);                                     // INCONCLUSIVE observation: W0 still passes on the proof
  assert.equal(mutate(x => { x.clockSamples = samples(0, 50, 2_000_000, 0); }).clockIdentity.observational, 'INCONCLUSIVE');
  assert.equal(mutate(x => { x.clockSamples = samples(0, 50, 2_000_000, 0); }).clockIdentity.provenBy, 'compiled program');
  const bootNamed = sectionedDump() + '\n  99: (85) call bpf_ktime_get_boot_ns#125\n';
  assert.match(mutate(x => { x.clockProgram = goodProof(bootNamed); }).reasons.join(';'), /^clock: compiled dump names a forbidden clock helper: bpf_ktime_get_boot_ns/);
  assert.equal(mutate(x => { x.clockProgram = goodProof(bootNamed); x.clockSamples = samples(0); }).pass, false);   // a CONSISTENT observation cannot rescue a failed proof
  // [OBS01-R13] a numeric-only boot read (no name token) is reported by the DIAGNOSTIC and does not block W0 (Q109a threat model: the dump comes from the lab-trusted image)
  const numericOnly = mutate(x => { x.clockProgram = goodProof(fifteenOf(125)); }); assert.equal(numericOnly.pass, true); assert.equal(numericOnly.checks.clock.diagnostic.pass, false);
  assert.match(numericOnly.checks.clock.diagnostic.reasons.join(';'), /compiled program reads another clock/);
  assert.equal(mutate(x => { x.clockProgram = undefined; }).pass, false);                                                         // proof not recorded
  assert.match(mutate(x => { x.clockSamples = samples(7e9); }).reasons.join(';'), /^clockTransport:/);                              // a contradiction still blocks
  assert.equal(mutate(x => { x.clockSamples = null; }).pass, false);                                                              // an unrecorded transport check is a refusal
  assert.match(mutate(x => { x.tracepointAttach = { ok: false, detail: 'EACCES' }; }).reasons.join(';'), /perf:/);
  assert.match(mutate(x => { x.attach.witnessCgroup.memoryPeakBytes = 250 * 2 ** 20; }).reasons.join(';'), /memory:/);
  assert.match(mutate(x => { x.ext4BtfPresent = true; }).reasons.join(';'), /ext4:/);
  assert.match(mutate(x => { x.attach.witnessCgroup.maxMapKeys = 4096; }).reasons.join(';'), /mapKeys:/);
  assert.match(mutate(x => { x.attach.pass = false; }).reasons.join(';'), /attach:/);
  assert.equal(mutate(x => { delete x.attach.witnessCgroup; }).pass, false);                       // an unrecorded item is a refusal, not a pass
});
test('the trace program and the clock probe use only nsecs(monotonic) and the Dockerfile is pinned (static)', () => {
  const strip = file => fs.readFileSync(file, 'utf8').split('\n').filter(l => !l.trim().startsWith('//')).join('\n');
  assert.deepEqual(strip(witness.PROGRAM).match(/\bnsecs\b(?!\(monotonic\))/g) ?? [], []);                  // the witness program: no bare nsecs, no boot clock
  assert.deepEqual(strip(witness.CLOCK_PROBE).match(/\bnsecs\b(?!\((monotonic|boot)\))/g) ?? [], []);        // the probe names its clock too
  assert.match(strip(witness.CLOCK_PROBE), /nsecs\(boot\)/);                                          // recorded only to show the bare clock's offset
  const docker = fs.readFileSync(path.join(path.dirname(witness.PROGRAM), 'bpftrace-image/Dockerfile'), 'utf8');
  assert.match(docker, /^FROM --platform=linux\/arm64 ubuntu:24\.04@sha256:19cad59657037cffa0ac9a48107019b768900ff1071140965827513ac866bd5e$/m);
});

test.after(() => fs.rmSync(tmp, { recursive: true }));
