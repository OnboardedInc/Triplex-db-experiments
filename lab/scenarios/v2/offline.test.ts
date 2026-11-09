import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { latencyReceipt } from '../../receipts/latency.mjs';
import { W0 } from '../../bench/lib/w0-world.ts';
import { generateScenario, generatorIdentity } from './generate.ts';
import { specs } from './expect.ts';
// @ts-ignore -- ESM lab helpers.
import { caseManifest, manifestBytes } from './cases.mjs';
// @ts-ignore -- ESM lab helpers.
import { domainIdentity, runDomain, expectDomain, requireDomainClaims } from '../lib/domain.mjs';
// @ts-ignore -- ESM lab helpers.
import { gsRefusals, brokerEnv } from '../lib/policy.mjs';
const root = new URL('../../../', import.meta.url);
const contract = JSON.parse(fs.readFileSync(new URL('lab/acceptance/obligations.json', root), 'utf8'));
const find = (obj: any): any => {
  if (!obj || typeof obj !== 'object') return null;
  if (obj['CS-GS']?.requiredCases) return obj['CS-GS'];
  for (const v of Object.values(obj)) { const r = find(v); if (r) return r; }
};
test('CS-GS has exactly the contract denominator with 40 nonempty witness selectors', () => {
  const set = find(contract), manifest = caseManifest();
  assert.deepEqual(new Set(manifest.cases.map((c: any) => c.id)), new Set([...set.requiredTags, ...set.requiredCases]));
  assert.equal(manifest.cases.filter((c: any) => c.kind === 'witness' && c.selector).length, 40);
  assert.equal(fs.readFileSync(new URL('lab/acceptance/cases/CS-GS.json', root), 'utf8'), manifestBytes());
});
test('all 20 streams are deterministic, W0 vocabulary only, and include a complete burst', () => {
  const schema = JSON.parse(fs.readFileSync(new URL('lab/world/W0/schema.json', root), 'utf8'));
  const kinds = Object.values(schema.entityKinds) as any[];
  const identity = generatorIdentity();
  for (const spec of specs()) {
    const a = generateScenario(spec, 500), b = generateScenario(spec, 500);
    assert.equal(a.streamSha256, b.streamSha256);
    assert.equal(a.sourceSha256, identity);
    assert.equal(a.durationS, 240);
    assert(a.events.some(e => e.stream === 'background' && e.atMs >= 120000 && e.atMs < 180000));
    assert(a.events.some(e => e.stream === 'background' && e.atMs >= 180000));
    assert(a.overlay > 0);
    assert(a.witnesses.positive.length > 0 && a.witnesses.negative.length > 0);
    for (const e of a.events) for (const [entity, attribute] of e.rows) {
      const kind = kinds.find(k => new RegExp(k.idPattern).test(entity));
      assert(kind, entity); assert(kind.attributes[attribute], `${entity}/${attribute}`);
      assert(!attribute.startsWith(':'));
    }
  }
});
test('short or nonfinite windows cannot silently remove the burst', () => {
  for (const duration of [0, 30, 179, NaN, Infinity]) assert.throws(() => generateScenario({ id: 1, seed: 1 }, 500, duration));
});
test('all four domain operations execute independent case bytes', () => {
  const dir = new URL('lab/world/W0/cases/', root);
  const cases = fs.readdirSync(dir).filter(f => f.endsWith('.json')).map(f => JSON.parse(fs.readFileSync(new URL(f, dir), 'utf8')));
  for (const op of ['reconcile', 'affected', 'publish', 'receive'] as const) {
    const c = cases.find(c => c.op === op);
    assert(c, op);
    const result = runDomain(op, c.input);
    assert.equal(result.outputBytes, W0.runOpBytes(op, Buffer.from(JSON.stringify(c.input))));
    assert.equal(result.identity, domainIdentity());
  }
  assert.throws(() => runDomain('signal-ack', {}), /unsupported/);
});
test('domain claim rejects prose, wrong content, stale run and missing named claim coverage', () => {
  const input = { evaluations: [], state: { items: [], pending: [], subjects: [] } };
  const good = runDomain('publish', input).outputBytes;
  const ctx = () => ({ opts: { runTag: 'this', scope: 'scope', sourceSha256: 'source' }, comp: { endpoint: 'engine' },
    spec: { domain: ['publication matches oracle'] }, domainRequests: [] as any[], checks: [] as any[],
    check(id: string, ok: boolean) { this.checks.push({ id, ok }); return ok; } });
  const observation = { runTag: 'this', scope: 'scope', endpoint: 'engine', sourceSha256: 'source', recordedPosition: 1 };
  const request = { id: 'publication', kind: 'work-items', claims: [0], op: 'publish', input, observation, observedBytes: good };
  for (const bad of [{ observedBytes: 'descriptive prose' }, { observation: { ...observation, runTag: 'old' } }, { observation: null }]) {
    const c = ctx(); assert.equal(expectDomain(c, { ...request, ...bad }), false); requireDomainClaims(c); assert(c.checks.every(x => !x.ok));
  }
  const c = ctx(); assert(expectDomain(c, request)); requireDomainClaims(c); assert(c.checks.every(x => x.ok));
  const missing = ctx(); requireDomainClaims(missing); assert.equal(missing.checks[0].ok, false);
});
test('qualification refuses legacy world, old contract and delta-only QLever', () => {
  const receiptPath = (value: any) => { const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'gs-r5-')), 'receipt.json'); fs.writeFileSync(file, JSON.stringify(latencyReceipt({ format: 'tx2-gs-run/2', elapsedMs: 0, ...value }))); return file; };
  assert(gsRefusals(receiptPath({ lane: 'xtdb', qleverConnectionMode: null, scenarios: [] }), '0.3.12').length >= 3);
  const r = { lane: 'qlever', qleverConnectionMode: 'keep-alive', generator: 'W02/1', world: { admission: { status: 'MATCHING' }, countsStart: {}, countsEnd: {} },
    qlever: { commitPath: 'broker', brokerDirectory: '/owned', baseTriples: 1, deltaTriples: 100 }, scenarios: [] };
  assert(gsRefusals(receiptPath(r), '0.4.0').some((s: string) => s.startsWith('Q91a')));
});
test('QLever broker path is explicit, owned and selected', () => {
  const dir = new URL('runs/', root).pathname;
  fs.mkdirSync(dir, { recursive: true });
  assert.throws(() => brokerEnv('qlever', undefined, dir), /requires/);
  assert.throws(() => brokerEnv('qlever', '/tmp/broker', dir), /inside/);
  assert.equal(brokerEnv('qlever', path.join(dir, 'W02', 'broker'), dir).QLEVER_COMMIT_PATH, 'broker');
});
