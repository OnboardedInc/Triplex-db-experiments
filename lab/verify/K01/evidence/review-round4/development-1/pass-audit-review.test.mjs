// [EXP-K01-VK01-R4] Why: exercise producer acquisition and diagnostic success boundaries omitted by the PASS audit. Rejected: testing only hand-edited JSON receipts (does not reproduce how local producers can certify failed observations).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { after, test } from 'node:test';
import { listingScript, parseListing, diskFloorVerdict } from '../../bin/engine.mjs';
import { admission } from '../../bin/lib.mjs';
const root = path.resolve(import.meta.dirname, '../../..');
const evidence = path.join(import.meta.dirname, 'evidence/review-round4');
const scratch = path.join(import.meta.dirname, 'tmp/pass-audit-review');
fs.mkdirSync(scratch, { recursive: true });
const observations = [];
const hash = b => createHash('sha256').update(b).digest('hex');
const engine = fs.readFileSync(path.join(root, 'lab/bin/engine.mjs'), 'utf8');
function section(start, end) { const a = engine.indexOf(start), b = engine.indexOf(end, a + start.length); assert.ok(a >= 0 && b > a); return engine.slice(a, b); }
after(() => { fs.mkdirSync(evidence, { recursive: true }); fs.writeFileSync(path.join(evidence, 'pass-audit-cases.json'), JSON.stringify(observations, null, 2) + '\n'); fs.rmSync(scratch, { recursive: true, force: true }); });
for (const fault of ['none', 'stat', 'sha', 'both', 'enumeration']) test(`C1 acquisition refuses partial trees: ${fault}`, () => {
  const dir = fs.mkdtempSync(path.join(scratch, 'tree-')), bin = path.join(dir, 'bin'); fs.mkdirSync(bin);
  for (const [name, secret] of [['src', 'original'], ['dst', 'different']]) { const p = path.join(dir, name); fs.mkdirSync(path.join(p, 'buffers'), { recursive: true }); fs.writeFileSync(path.join(p, 'visible'), 'same'); fs.writeFileSync(path.join(p, 'hidden'), secret); }
  // [EXP-K01-VK01-R4] Why: Mac stat differs from the pinned image's GNU interface. Rejected: Docker execution (this review is offline); these shims preserve successful outputs and inject explicit nonzero acquisition errors for one real file.
  const stat = `#!/usr/bin/env python3\nimport os,sys,stat\nfailed=False\nfor p in sys.argv[3:]:\n if p.endswith('/hidden') and os.environ['K01_FAULT'] in ('stat','both'):\n  print('stat: injected read failure '+p,file=sys.stderr); failed=True; continue\n s=os.stat(p); print(f'{p}|{s.st_size}|{stat.S_IMODE(s.st_mode):o}|{s.st_uid}|{s.st_gid}')\nsys.exit(1 if failed else 0)\n`;
  const sha = `#!/usr/bin/env python3\nimport os,sys,hashlib\nfailed=False\nfor p in sys.argv[1:]:\n if p.endswith('/hidden') and os.environ['K01_FAULT'] in ('sha','both'):\n  print('sha256sum: injected read failure '+p,file=sys.stderr); failed=True; continue\n print(hashlib.sha256(open(p,'rb').read()).hexdigest()+'  '+p)\nsys.exit(1 if failed else 0)\n`;
  const find = `#!/usr/bin/env python3\nimport os,sys,subprocess\na=sys.argv[1:]\npartial=os.environ['K01_FAULT']=='enumeration' and a[0]=='.'\nif partial:\n i=a.index('-exec'); a[i:i]=['!','-name','hidden']\nr=subprocess.run(['/usr/bin/find',*a])\nif partial: print('find: injected directory read failure',file=sys.stderr)\nsys.exit(1 if partial else r.returncode)\n`;
  for (const [name, body] of [['stat', stat], ['sha256sum', sha], ['find', find]]) fs.writeFileSync(path.join(bin, name), body, { mode: 0o755 });
  const runs = ['src', 'dst'].map(name => {
    const r = spawnSync('/bin/sh', ['-c', 'set -eu; ' + listingScript(path.join(dir, name))], { env: { ...process.env, PATH: bin + ':' + process.env.PATH, K01_FAULT: fault }, encoding: 'utf8' });
    let tree = null, error = null; try { tree = parseListing(r.stdout); } catch (e) { error = e.message; }
    return { name, exit: r.status, signal: r.signal, spawnError: r.error?.message ?? null, stdout: r.stdout, stderr: r.stderr, tree, error };
  });
  const accepted = runs.every(r => r.exit === 0 && !r.signal && !r.spawnError && r.tree) && runs[0].tree.treeSha256 === runs[1].tree.treeSha256;
  observations.push({ kind: 'listing', fault, actualHiddenHashes: ['src','dst'].map(n => hash(fs.readFileSync(path.join(dir,n,'hidden')))), accepted, runs });
  assert.equal(accepted, false, 'different actual file contents must not produce C1 equality');
});
for (const variant of ['removed', 'still-present', 'inspect-failed']) test(`single-cut cleanup refuses unproven absence: ${variant}`, async () => {
  const dir = fs.mkdtempSync(path.join(scratch, 'singlecut-')), info = { container: 'fixture', volume: 'source', slot: 'fixture', endpoint: 'offline' };
  let present = false, receipt = null; const calls = [];
  const context = { fs, path, Date, requireHeldXtdbSlot: () => {}, requireRunningSlot: () => {},
    cloneCheck: args => args[0] === 'settle' ? { settled: true, after: {} } : {}, stopSlot: async () => ({ verdict: { ok: true } }), offlineCheck: () => ({ ok: true }), hostDisk: () => ({ freeBytes: 10 * 1024 ** 3 }), volumeBytes: () => 1, diskFloorVerdict,
    now: () => new Date().toISOString(), writeJson: (_file, value) => { receipt = structuredClone(value); },
    docker: (args, options) => { calls.push({ args, options }); if (args[1] === 'create') { present = true; return 'created'; } if (args[1] === 'rm') { if (variant === 'removed') present = false; return variant === 'removed' ? 'removed' : null; } if (args[1] === 'inspect') return variant === 'inspect-failed' || !present ? null : '[{"Name":"fixture"}]'; throw Error('unexpected docker request'); },
    helper: () => { throw Error('injected copy helper failure after snapshot creation'); }, fail: (_c, m) => { throw Error(m); },
  };
  const probe = vm.runInNewContext(section('async function oneCutProbe(config, info, opts)', '/** Read and check a golden record') + ';oneCutProbe', context);
  await assert.rejects(probe({}, info, { manifest: path.join(dir, 'manifest.json') }), /injected copy helper failure/);
  observations.push({ kind: 'singlecut-cleanup', variant, present, receipt, calls });
  assert.equal(receipt.snapshotRemoved, !present, 'a failed inspect cannot prove removal');
});
const config = { vm: { memBytes: 10_000 }, pool: { memLimitBytes: 10_000, diskUsedLimitBytes: 10_000 } };
for (const [name, value] of [['NaN', NaN], ['infinite', Infinity], ['negative', -1], ['missing', undefined]]) test(`pool admission refuses invalid disk observation: ${name}`, () => {
  const result = admission({ config, reservations: [], running: [], request: { container: 'fixture', memBytes: 1, diskForecastBytes: 1 }, diskUsedBytes: value });
  observations.push({ kind: 'admission', name, value: String(value), result });
  assert.equal(result.ok, false);
});
test('pool admission valid observation control', () => {
  assert.equal(admission({ config, reservations: [], running: [], request: { container: 'fixture', memBytes: 1, diskForecastBytes: 1 }, diskUsedBytes: 1 }).ok, true);
});
