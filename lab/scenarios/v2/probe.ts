// [EXP-W02-R2] Why: independently replay authored inputs before comparing any memory-store bytes.
// Rejected: feeding the observed snapshot to both kernels (would let the same wrong state agree).
import { checkedRead } from './read.ts';
import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { W0, canonical, worldOf, factValue, isReference, triplexValue, V_W0, type WorldRow } from '../../bench/lib/w0-world.ts';
import type { CompositionHandle } from '../../bench/lib/composition.ts';
// @ts-ignore -- existing independent replay adapter is ESM JavaScript.
import { runOracle } from '../lib/oracle.mjs';
// @ts-ignore -- independent CLI operation, with source identity and fresh subprocess.
import { runDomain, domainIdentity } from '../lib/domain.mjs';
export const instant = (ms: number) => new Date(ms).toISOString().replace(/\.(\d{3})Z$/, '.$1000Z');
export function probeSourceIdentity() {
  const root = new URL('../../../', import.meta.url), files: string[] = [];
  const walk = (dir: string) => { for (const e of fs.readdirSync(new URL(dir, root), { withFileTypes: true })) {
    const f = dir + '/' + e.name;
    if (e.isDirectory() && e.name !== '__pycache__') walk(f);
    else if (e.isFile() && /\.(ts|mjs|js|json|py|md)$/.test(f)) files.push(f);
  } };
  for (const dir of ['lab/scenarios/v2', 'lab/oracles/replay', 'lab/oracles/domain', 'lab/world/W0', 'packages/w0/dist']) walk(dir);
  for (const d of fs.readdirSync(new URL('lab/scenarios', root))) { const f = 'lab/scenarios/' + d + '/scenario.json'; if (fs.existsSync(new URL(f, root))) files.push(f); }
  files.push('lab/scenarios/run.mjs', 'lab/scenarios/lib/policy.mjs', 'lab/scenarios/lib/triplex.mjs', 'lab/bench/lib/composition.ts', 'lab/acceptance/cases/CS-GS.json', 'lab/acceptance/obligations.json', 'lab/scenarios/lib/domain.mjs', 'lab/scenarios/lib/oracle.mjs', 'lab/bench/lib/memory.ts', 'lab/bench/lib/w0-world.ts', 'lab/bench/lib/w0-public.ts', 'lab/bench/lib/triplex.ts');
  return createHash('sha256').update(JSON.stringify(files.sort().map(f => [f, createHash('sha256').update(fs.readFileSync(new URL(f, root))).digest('hex')]))).digest('hex');
}
export const PROBES: Probe[] = [];
export class Probe {
  readonly attempt = randomUUID();
  readonly sourceSha256 = probeSourceIdentity();
  readonly commands: any[] = [];
  readonly outcomes: any[] = [];
  readonly refs = new Map<string, string>();
  readonly entities = new Set<string>();
  readonly checks: any[] = [];
  readonly reads: any[] = [];
  readonly claims: any[] = [];
  readonly oracleCases: any[] = [];
  comp: CompositionHandle;
  readonly dir: string;
  constructor(comp: CompositionHandle, dir: string) { if (comp.name !== 'memory') throw Error('Probe requires the offline dense-position memory composition'); this.comp = comp; this.dir = process.env.TX2_W02_PROBE_REPORT ? path.join(path.dirname(process.env.TX2_W02_PROBE_REPORT), 'replay') : dir; fs.mkdirSync(this.dir, { recursive: true }); PROBES.push(this); }
  async commit(operations: readonly any[], commandId = `probe:${this.commands.length}`, meta: any = {}) {
    const index = this.commands.length;
    const ops = operations.map((op, k) => {
      if (op.op === 'assert') { this.entities.add(op.entityId); return { ...op, ref: `a:${index}:${k}` }; }
      const target = this.refs.get(op.id);
      if (!target) throw Error('unknown authored retraction');
      return { op: 'retract', target };
    });
    const result = await this.comp.transact(operations, { actor: 'gs-probe', commandId, ...meta });
    this.commands.push({ operations: ops, meta: { actor: 'gs-probe', commandId, ...(meta.preconditions ? { preconditions: meta.preconditions.map((p: any) => p._tag === 'EntityState' ? { _tag: 'EntityState', entityId: p.entityId, targets: p.tripleIds.map((id: string) => this.refs.get(id)) } : p) } : {}) } });
    this.outcomes.push(result.ok ? { outcome: 'committed', position: result.value.position, txId: result.value.txId } : { outcome: 'rejected', tag: result.tag });
    if (result.ok) {
      if (result.value.triples.length !== ops.filter(op => op.op === 'assert').length) throw Error('receipt assertion count differs from authored command');
      let k = 0;
      for (const op of ops) if (op.op === 'assert') this.refs.set(result.value.triples[k++].id, op.ref);
    }
    return result;
  }
  async set(entity: string, attribute: string, value: unknown, validFrom = V_W0) {
    const P = await this.comp.currentPosition();
    const page = await this.read([entity], { position: P, validAt: V_W0 });
    return this.commit([
      ...page.rows.filter(r => r.entityId === entity && r.attribute === attribute).map(r => ({ op: 'retract', id: r.id })),
      { op: 'assert', entityId: entity, attribute, value: triplexValue(attribute, value), validFrom },
    ]);
  }
  async expectedRows(subject: string, P: number, V = V_W0): Promise<WorldRow[]> {
    const queries = [...this.entities].sort().map((entityId, i) => ({ id: String(i), kind: 'entityTriples', entityId, cut: { position: P, validAt: V } }));
    const input = { format: 'triplex-db-2/o-replay-case/1', caseId: `${this.attempt}:${this.oracleCases.length}`, defaultScope: 's1',
      adapter: { schemaVersion: 1 }, rules: {}, schemas: [], enforcement: { mode: 'off' }, commands: this.commands, queries };
    const r: any = await runOracle(input, this.dir);
    if (!r.result || r.notModeled || r.exitCode !== 0 || r.result.queries?.length !== queries.length) throw Error('O-REPLAY incomplete/refused case');
    // [EXP-W02-R2] Why: a rejected valid write must fail even if a read at the old actual position still agrees. Rejected: using the store's head alone as the expected replay cut.
    if (r.result.commandOutcomes.length !== this.outcomes.length) throw Error('O-REPLAY command denominator differs');
    let expectedPosition = 0;
    for (const row of r.result.commandOutcomes) {
      const expected = row.expected, observed = this.outcomes[row.command];
      const want = expected.outcome === 'committed' ? { outcome: 'committed', position: ++expectedPosition } : { outcome: 'rejected', tag: expected.errorTag };
      if (want.outcome === 'rejected' && !want.tag) throw Error('oracle rejection is not typed');
      const got = observed.outcome === 'committed' ? { outcome: 'committed', position: observed.position } : observed;
      this.equal('command-outcome:' + row.command, canonical(got), canonical(want), { command: row.command, caseSha256: r.caseSha256 });
    }
    const committed = this.outcomes.filter(o => o.outcome === 'committed');
    this.equal('unique-receipt-txIds', new Set(committed.map(o => o.txId)).size, committed.length);
    this.oracleCases.push({ caseSha256: r.caseSha256, caseId: input.caseId });
    const rows: WorldRow[] = r.result.queries.flatMap((q: any) => {
      if (q.error || !q.result?.raw) throw Error('O-REPLAY query error');
      return q.result.raw.map((row: any) => ({ id: row.id, entityId: row.entityId, attribute: row.attribute, value: row.value,
        position: row.recordedPosition, validFrom: row.validFrom, ...(row.validTo == null ? {} : { validTo: row.validTo }) }));
    });
    const seen = new Set([subject]), selected: WorldRow[] = [];
    for (const e of seen) for (const row of rows.filter(r => r.entityId === e)) {
      selected.push(row); if (row.value.type === 'ref') seen.add(row.value.value);
    }
    return selected;
  }
  async state(subject: string, P = -1, V = V_W0) {
    if (P < 0) P = await this.comp.currentPosition();
    const expected = await this.expectedRows(subject, P, V);
    const observed = (await this.read([subject], { position: P, validAt: V })).rows;
    this.compareRows('state:' + subject, observed, expected, { P, V });
    return { expected: worldOf(subject, expected), observed: worldOf(subject, observed), P, V };
  }
  read(subjects: readonly string[], basis: { position: number; validAt: number }) {
    return checkedRead(this.comp, subjects, basis, this.reads);
  }
  compareRows(id: string, observed: readonly WorldRow[], expected: readonly WorldRow[], binding: unknown) {
    const bytes = (rows: readonly WorldRow[]) => canonical(rows.map(r => [r.entityId, r.attribute, r.value, r.validFrom, r.validTo ?? null, r.position]).sort((a, b) => canonical(a).localeCompare(canonical(b))));
    this.equal(id, bytes(observed), bytes(expected), binding);
  }
  async route(subject: string, P: number, read: () => Promise<readonly WorldRow[]>, V = V_W0) {
    const expected = await this.expectedRows(subject, P, V);
    this.compareRows('route:' + subject, await read(), expected, { P, V });
  }
  equal(id: string, observed: unknown, expected: unknown, binding: unknown = {}) {
    const ok = observed === expected;
    this.checks.push({ id, ok, observed, expected, binding, sourceSha256: this.sourceSha256, attempt: this.attempt, endpoint: this.comp.backend.url, scope: this.comp.scopeName });
    if (!ok) throw Error(`${id}: observed content differs`);
  }
  finish() { if (probeSourceIdentity() !== this.sourceSha256) throw Error('probe sources/builds changed during attempt'); }
  async domain(subject: string, release = 'R1', P = -1, V = V_W0) {
    const state = await this.state(subject, P, V), basis = { tx: state.P, validTime: instant(V) };
    const activations = [{ from: W0.POPULATION_VALID_TIME, release: W0.RELEASES_BY_NAME.get(release)!.hash, tx: 1 }];
    const expectedInput = { world: state.expected, basis, activations };
    const observedInput = { world: state.observed, basis, activations };
    const oracle = runDomain('reconcile', canonical(expectedInput));
    const bytes = W0.runOpBytes('reconcile', Buffer.from(canonical(observedInput)));
    this.equal('domain:' + subject, bytes, oracle.outputBytes, { P: state.P, V, inputSha256: oracle.inputSha256, oracleIdentity: oracle.identity });
    return JSON.parse(bytes);
  }
}
export function rows(facts: readonly any[]) {
  return facts.map(f => ({ op: 'assert', entityId: f.e, attribute: f.a, value: triplexValue(f.a, f.v), validFrom: V_W0 }));
}
export const baseFacts = (subject: string, location = 'loc:a') => [
  { e: subject, a: 'startDate', v: '2026-11-02' }, { e: subject, a: 'location', v: location },
  { e: subject, a: 'payRateCents', v: 1650 }, { e: subject, a: 'weeklyMinutes', v: 2400 },
  { e: subject, a: 'bgcStatus', v: 'consider' },
  { e: location, a: 'jurisdiction', v: location === 'loc:a' ? 'jur:a' : 'jur:b' },
  { e: location === 'loc:a' ? 'jur:a' : 'jur:b', a: 'stateMinWageCents', v: 1500 },
];
export function decision(subject: string, local: string, author: string) {
  const d = `${subject}/dec:${local}`;
  return rows([{ e: subject, a: 'decisions', v: d }, { e: d, a: 'target', v: 'i9.section2' }, { e: d, a: 'verdict', v: 'approve' }, { e: d, a: 'author', v: author }]);
}
