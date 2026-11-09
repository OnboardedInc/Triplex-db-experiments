// [CX-VW02] Why: run the submitted cases with wrong source observations without editing reviewed code.
// Rejected: accepting green unit tests as proof that each scenario can reject a wrong outcome.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { runCase, runCases } from '../../../scenarios/v2/case-driver.ts';
import { Probe, PROBES } from '../../../scenarios/v2/probe.ts';
import { FeedReplica } from '../../../scenarios/v2/faults.ts';
import { W0, canonical } from '../../../bench/lib/w0-world.ts';
import { specs } from '../../../scenarios/v2/expect.ts';
import { generateScenario } from '../../../scenarios/v2/generate.ts';
import { generateTrace } from '../../../bench/lib/trace.ts';
import { mapW0Trace } from '../../../bench/lib/w0-trace.ts';
// @ts-ignore -- reviewed ESM helper.
import { requireDomainClaims, expectDomain } from '../../../scenarios/lib/domain.mjs';
// @ts-ignore -- reviewed ESM helper.
import { caseManifest } from '../../../scenarios/v2/cases.mjs';
const root = path.resolve(import.meta.dirname, '../../../..');
const attempt = new Date().toISOString().replace(/[:.]/g, '-') + '-' + randomUUID().slice(0, 6);
const raw = `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-W02/${attempt}`;
fs.mkdirSync(raw, { recursive: true });
const sha = (x: string | Buffer) => createHash('sha256').update(x).digest('hex');
const sourceFiles = spawnSync('git', ['ls-files', 'lab/scenarios', 'lab/bench/lib', 'lab/oracles', 'lab/world/W0', 'lab/bin/gate.mjs', 'lab/acceptance'], { encoding: 'utf8' }).stdout.trim().split('\n');
const hashes = () => Object.fromEntries(sourceFiles.map(f => [f, sha(fs.readFileSync(path.join(root, f)))]));
const before = hashes();
const results: any = { attempt, raw, reviewedHead: spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim(), sourceBefore: before, baseline: {}, mutations: [], checks: {} };
function saveRaw(name: string, value: any) { fs.writeFileSync(path.join(raw, name + '.json'), JSON.stringify(value, null, 1) + '\n'); }
const compact = (r: any) => ({ id: r.id, status: r.status, reason: r.reason?.split('\n')[0], claims: r.domainClaims, checks: r.checks.length, details: r.details });
for (const lane of ['datomic', 'qlever'] as const) {
  const r = await runCases(lane, path.join(raw, `${lane}-baseline.json`));
  assert.equal(r.cases.length, 70); assert.equal(r.matched + r.blocked + r.failed, 70); assert.equal(r.matched, 40); assert.equal(r.failed, 26); assert.equal(r.blocked, 4); // Missing named schedules fail closed.
  assert.deepEqual(r.cases.filter(c => c.status === 'BLOCKED').map(c => c.id).sort(), ['GS-03-SUPERSEDED-REVISION', 'GS-16', 'GS-16-WITNESS-NEG', 'GS-16-WITNESS-POS'].sort());
  const failed = r.cases.filter(c => c.status === 'FAIL');
  assert(failed.every(c => c.reason?.includes('required-domain-claim:')));
  const missingScenarios = new Set([3, 8, 10, 11, 12, 14, 19, 20]);
  assert.deepEqual(failed.map(c => c.id).sort(), caseManifest().cases.filter((c: any) => missingScenarios.has(c.scenario) || ['GS-10-11-COMMON-BASIS', 'GS-19B-OUTBOX-CRASH'].includes(c.id)).map((c: any) => c.id).sort());
  results.baseline[lane] = r.cases.map(compact);
  console.log(`baseline ${lane}: ${r.matched} matched, ${r.blocked} blocked, ${r.failed} failed`);
}
type Mode = 'wrong-current' | 'wrong-basis' | 'lost-commit' | 'duplicate-effect';
const state = Probe.prototype.state, commit = Probe.prototype.commit;
let mode: Mode | null = null, injected = 0;
const decorated = new WeakSet<object>();
function decorate(p: Probe) {
  if (decorated.has(p.comp)) return;
  decorated.add(p.comp);
  const transact = p.comp.transact.bind(p.comp);
  p.comp.transact = async (ops, meta) => {
    if (mode === 'lost-commit' && p.commands.length > 0 && ops.some(o => o.op === 'assert' && o.entityId === 'pl:p')) {
      injected++;
      // The source ACK has the expected assertion count, but its data landed under the wrong subject.
      ops = ops.map(o => o.op === 'assert' && o.entityId === 'pl:p' ? { ...o, entityId: 'pl:lost' } : o);
    }
    if (mode === 'duplicate-effect') ops = ops.map(o => {
      if (o.op !== 'assert' || o.entityId !== 'gs:receiver' || o.attribute !== 'state') return o;
      const value = JSON.parse(o.value.value);
      if (!value.effects?.length) return o;
      injected++; value.effects.push(structuredClone(value.effects[0]));
      return { ...o, value: { ...o.value, value: canonical(value) } };
    });
    return transact(ops, meta);
  };
}
Probe.prototype.commit = async function (...args: Parameters<typeof commit>) { decorate(this); return commit.apply(this, args); };
Probe.prototype.state = async function (...args: Parameters<typeof state>) {
  decorate(this);
  const page = this.comp.sweepPage;
  this.comp.sweepPage = async (subjects, basis, between) => {
    const requested = { ...basis };
    if (mode === 'wrong-basis' && basis.position < await this.comp.currentPosition()) {
      injected++; basis = { ...basis, position: await this.comp.currentPosition() };
    }
    const r = await page(subjects, basis, between);
    if (mode === 'wrong-current' && this.commands.length > 1) {
      const target = r.rows.findIndex(row => row.entityId === 'pl:p' && row.attribute === 'payRateCents');
      if (target >= 0) { injected++; r.rows = r.rows.map((row, k) => k === target ? { ...row, value: { type: 'integer', value: '9999' } } : row); }
    }
    // Preserve the requested metadata: the comparator must check content at the driver's basis.
    return { ...r, position: requested.position };
  };
  try { return await state.apply(this, args); } finally { this.comp.sweepPage = page; }
};
async function mutant(id: string, mutation: Mode) {
  mode = mutation; injected = 0;
  const r = await runCase(id, 'datomic', path.join(raw, mutation));
  const row = { mutation, injected, ...compact(r) };
  assert.equal(r.status, 'FAIL'); assert(injected > 0);
  assert(!r.reason?.includes('required-domain-claim:'), 'mutation must fail before missing-claim coverage');
  results.mutations.push(row); saveRaw(`${mutation}-${id}`, r); mode = null;
  console.log(JSON.stringify(row));
  return row;
}
for (let n = 1; n <= 20; n++) {
  const r = await mutant(`GS-${String(n).padStart(2, '0')}`, 'wrong-current');
  assert.equal(r.status, 'FAIL');
  assert(r.injected > 0);
}
for (const n of [1, 4, 7, 8, 12, 13, 17]) {
  const r = await mutant(`GS-${String(n).padStart(2, '0')}`, 'lost-commit');
  assert.equal(r.status, 'FAIL'); assert(r.injected > 0);
}
for (const id of ['GS-08', 'GS-12', 'GS-10', 'GS-11', 'GS-10-11-COMMON-BASIS']) {
  const r = await mutant(id, 'wrong-basis');
  assert(r.injected > 0);
  assert.equal(r.status, 'FAIL');
}
// [CX-VW02] Why: a named domain requirement added by the spec must fail closed on the real offline entry.
// Rejected: testing only the helper, which the offline driver never calls.
const read = fs.readFileSync;
(fs as any).readFileSync = function (file: any, ...rest: any[]) {
  const bytes = (read as any)(file, ...rest);
  if (String(file).endsWith('/01-monday-rush/scenario.json') && new Error().stack?.includes('cases.mjs')) {
    const spec = JSON.parse(String(bytes)); spec.domain.push('CX-VW02 missing oracle operation must fail closed');
    return Buffer.from(JSON.stringify(spec));
  }
  return bytes;
};
try {
  assert.equal(caseManifest().cases.find((c: any) => c.id === 'GS-01').domainClaims.length, 2);
  const r = await runCase('GS-01', 'datomic', path.join(raw, 'missing-claim'));
  assert.equal(r.status, 'FAIL');
  results.checks.missingClaim = compact(r); saveRaw('missing-claim', r);
} finally { fs.readFileSync = read; }
// Check the separate helper really refuses omissions (the defect is bypassing it).
const ctx: any = { spec: { domain: ['claim A', 'claim B'] }, opts: { runTag: 'fresh', scope: 'scope', sourceSha256: 'source' }, comp: { endpoint: 'memory://scope' }, domainRequests: [], checks: [], check(id: string, ok: boolean, detail: any) { this.checks.push({ id, ok, detail }); return ok; } };
requireDomainClaims(ctx); assert.equal(ctx.checks.filter((c: any) => !c.ok).length, 2);
results.checks.missingClaimHelper = ctx.checks;
// A generic unrelated check can also be assigned to arbitrary claims by the helper API.
const generic = { op: 'publish', input: { evaluations: [], state: { items: [], pending: [], subjects: [] } } };
const unrelated = W0.runOpBytes('publish', Buffer.from(canonical(generic.input)));
expectDomain(ctx, { id: 'unrelated', ...generic, claims: [0, 1], observedBytes: unrelated, observation: { runTag: 'fresh', scope: 'scope', endpoint: 'memory://scope', sourceSha256: 'source', recordedPosition: 1 } });
ctx.checks = []; requireDomainClaims(ctx); assert(ctx.checks.every((c: any) => c.ok));
results.checks.unrelatedClaimCoverage = ctx.checks;
// Replica fallback's returned bytes are ignored by its CS-GS case.
const replicaRead = FeedReplica.prototype.read;
let badReplicaReads = 0;
FeedReplica.prototype.read = async function (...args: Parameters<typeof replicaRead>) { await replicaRead.apply(this, args); badReplicaReads++; return []; };
try {
  const r = await runCase('GS-04B-INDEX-PARTITION', 'datomic', path.join(raw, 'wrong-fallback'));
  assert(badReplicaReads > 0); assert.equal(r.status, 'FAIL');
  results.checks.wrongFallback = { ...compact(r), injected: badReplicaReads }; saveRaw('wrong-fallback', r);
} finally { FeedReplica.prototype.read = replicaRead; }
// Confirm a duplicated visible receiver effect in the actual source store is rejected.
const duplicate = await mutant('GS-19B-OUTBOX-CRASH', 'duplicate-effect');
assert(duplicate.injected > 0); assert.equal(duplicate.status, 'FAIL');
results.checks.duplicateEffect = duplicate;
Probe.prototype.state = state; Probe.prototype.commit = commit;
// Every generated background byte must equal the frozen trace mapped by Q92k, including burst events.
const background = [];
for (const spec of specs()) {
  const gen = generateScenario(spec, 500);
  const expected = generateTrace({ seed: String(spec.seed), subjects: 500, durationS: 240 }).map(ev => {
    const m = mapW0Trace(ev);
    return { id: m.commandId, stream: 'background', atMs: ev.atMs, subject: W0.placementId(ev.subject), rows: m.rows, validFrom: m.validFrom, resend: ev.resend, ackLoss: ev.ackLoss };
  }).sort((a, b) => a.atMs - b.atMs || a.stream.localeCompare(b.stream) || a.id.localeCompare(b.id));
  assert.deepEqual(gen.events.filter(e => e.stream === 'background'), expected);
  assert(expected.some(e => e.atMs >= 120000 && e.atMs < 180000));
  background.push({ scenario: spec.id, count: expected.length, burstCount: expected.filter(e => e.atMs >= 120000 && e.atMs < 180000).length, sha256: sha(JSON.stringify(expected)), durationS: gen.durationS });
}
results.checks.background = background;
const after = hashes(); assert.deepEqual(after, before); results.sourceUnchanged = true;
saveRaw('probes', PROBES.map(p => ({ attempt: p.attempt, sourceSha256: p.sourceSha256, endpoint: p.comp.backend.url, scope: p.comp.scopeName, commands: p.commands, outcomes: p.outcomes, claims: p.claims, checks: p.checks, oracleCases: p.oracleCases })));
saveRaw('review-results', results);

console.log(JSON.stringify({ complete: true, raw, mutations: results.mutations.length, sourceUnchanged: true }));
