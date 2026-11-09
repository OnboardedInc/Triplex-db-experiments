// [EXP-W02-R2] Why: each named claim has a concrete store observation and an independently replayed input.
// Rejected: assigning every claim index to one generic kernel-conformance comparison.
import { W0, canonical, V_W0 } from '../../bench/lib/w0-world.ts';
import { Probe, instant } from './probe.ts';
// @ts-ignore -- independent Python oracle seam.
import { runDomain } from '../lib/domain.mjs';
export const CLAIMS: Record<number, readonly string[]> = {
  1: ['next-task-on-reconcile'], 2: ['first-pull-next-task'], 5: ['background-obligation-re-evaluated'],
  6: ['exact-two-hop-affected-and-rerun', 'post-change-minimum-wage'],
  9: ['moved-obligations-and-persisted-boundary'], 17: ['proposals-do-not-count'], 18: ['overdue-maintained-projection'],
};
export function futureBoundary(output: any, V: number): string | null {
  return output.obligations.map((o: any) => o.boundary).filter((b: string) => b > instant(V)).sort()[0] ?? null;
}
export async function reconcileClaim(probe: Probe, scenario: number, subject: string, P = -1, V = V_W0) {
  if (![1, 2, 5, 6, 9, 17].includes(scenario)) throw Error('not a per-subject reconcile claim');
  const output = await probe.domain(subject, 'R1', P, V);
  if (scenario === 9) {
    const boundary = futureBoundary(output, V);
    const id = 'gs:dependency:' + subject;
    const value = { subject, basis: output.basis, nextTemporalBoundary: boundary };
    const result = await probe.set(id, 'dependencyState', canonical(value));
    if (!result.ok) throw Error(result.tag);
    const state = await probe.state(id);
    const observed = state.observed.facts.find(f => f.a === 'dependencyState')!.v;
    probe.equal('GS-09:stored-nextTemporalBoundary', observed, canonical(value), output.basis);
  }
  const claim = { scenario, index: scenario === 6 ? 1 : 0, id: CLAIMS[scenario].at(-1), status: 'OFFLINE-MATCH', evidence: probe.checks.flatMap((c, i) => (c.id.startsWith('domain:') || c.id.startsWith('GS-')) ? [i] : []), attempt: probe.attempt, basis: output.basis };
  probe.claims.push(claim); return { output, claims: [claim] };
}
export async function affectedClaim(probe: Probe, subjects: readonly string[], writes: readonly (readonly [string, string])[]) {
  const P = await probe.comp.currentPosition();
  const states = await Promise.all(subjects.map(s => probe.state(s, P)));
  const basis = { tx: P, validTime: instant(V_W0) };
  const expectedInput = { basis, release: 'R1', worlds: states.map(s => s.expected), writes };
  const observedInput = { ...expectedInput, worlds: states.map(s => s.observed) };
  const oracle = runDomain('affected', canonical(expectedInput));
  const observed = W0.runOpBytes('affected', Buffer.from(canonical(observedInput)));
  probe.equal('GS-06:affected-subjects', observed, oracle.outputBytes, { P, writes, oracle: oracle.identity });
  const affected: string[] = JSON.parse(observed).affected;
  const rerun: string[] = [];
  for (const subject of affected) { await reconcileClaim(probe, 6, subject, P); rerun.push(subject); }
  const record = { position: P, affected, checkpoint: P, rerun };
  const r = await probe.set('gs:consumer', 'affected-and-checkpoint', canonical(record));
  if (!r.ok) throw Error(r.tag);
  const persisted = await probe.state('gs:consumer');
  probe.equal('GS-06:durable-affected-checkpoint', persisted.observed.facts.find(f => f.a === 'affected-and-checkpoint')!.v, canonical(record), { P });
  probe.equal('GS-06:rerun-exactly-once', canonical(rerun), canonical(affected), { P });
  const claim = { scenario: 6, index: 0, id: CLAIMS[6][0], status: 'OFFLINE-MATCH', evidence: probe.checks.flatMap((c, i) => (c.id.startsWith('domain:') || c.id.startsWith('GS-')) ? [i] : []), attempt: probe.attempt, basis };
  probe.claims.push(claim); return { affected, claims: [claim] };
}
export async function dashboardClaim(probe: Probe, subjects: readonly string[], validAt: number) {
  const P = await probe.comp.currentPosition();
  const expected: string[] = [], observed: string[] = [];
  for (const subject of subjects) {
    const state = await probe.state(subject, P, validAt);
    const basis = { tx: P, validTime: instant(validAt) };
    const activations = [{ from: W0.POPULATION_VALID_TIME, release: W0.R1.hash, tx: 1 }];
    const input = { basis, activations, world: state.expected };
    const oracle = JSON.parse(runDomain('reconcile', canonical(input)).outputBytes);
    const output = JSON.parse(W0.runOpBytes('reconcile', Buffer.from(canonical({ ...input, world: state.observed }))));
    if (oracle.tasks.some((t: any) => t.kind === 'i9.section2' && t.overdue)) expected.push(subject);
    if (output.tasks.some((t: any) => t.kind === 'i9.section2' && t.overdue)) observed.push(subject);
  }
  const projection = { basis: { recordedPosition: P, validAt }, subjects: observed.sort() };
  const r = await probe.set('gs:dashboard', 'projection', canonical(projection));
  if (!r.ok) throw Error(r.tag);
  const pin = r.value.position;
  const stored = await probe.state('gs:dashboard', pin);
  const bytes = stored.observed.facts.find(f => f.a === 'projection')!.v as string;
  probe.equal('GS-18:maintained-projection', bytes, canonical({ basis: projection.basis, subjects: expected.sort() }), { P, pin });
  const claim = { scenario: 18, index: 0, id: CLAIMS[18][0], status: 'OFFLINE-MATCH', evidence: probe.checks.flatMap((c, i) => (c.id.startsWith('domain:') || c.id.startsWith('GS-')) ? [i] : []), attempt: probe.attempt, basis: projection.basis };
  probe.claims.push(claim); return { pin, projection, claims: [claim] };
}

// [EXP-W02-R3] Why: exact spec text selects a known executable claim; additions and wording changes fail closed.
// Rejected: counting claim indices or accepting an unrelated empty publication as coverage.
const SPEC_TEXT: Record<number, readonly string[]> = {
  "13": [],
  "4": [],
  "18": [
    "which placements are overdue at a basis (W0 due rule; O-DOMAIN)"
  ],
  "14": [
    "the new tenant's first release activation evaluates its subjects (O-DOMAIN)"
  ],
  "9": [
    "obligations moved by the new start dates and their next-boundary times (O-DOMAIN; Triplex dependencyState.nextTemporalBoundary is the database-side witness)"
  ],
  "3": [
    "a revision older than the applied one is acknowledged as superseded (W0 rule; O-DOMAIN, fails closed until EXP-D01; provisional, flagged for Sam in TARGETS 6.1)"
  ],
  "17": [
    "proposals never count as decisions (W0 rule; O-DOMAIN)"
  ],
  "10": [
    "R2 evaluated for every in-scope subject at R_act and published as work items through the outbox (O-DOMAIN)",
    "in-flight reconciles evaluate R1 (O-DOMAIN)",
    "rollback R1 -> R2 -> R1 publishes three deliveries for a changed notice (O-DOMAIN payloads; delivery identity per Q38f)"
  ],
  "20": [
    "every expiring subject is re-run at the boundary and gains the re-verification obligation (O-DOMAIN)"
  ],
  "11": [
    "the preview of R2 at GS.10's R_act equals GS.10's sweep output at R_act (O-DOMAIN)"
  ],
  "12": [
    "the explanation (obligations and why) at (R_past, 2026-03-03) (O-DOMAIN)"
  ],
  "1": [
    "each reconcile pull's next task (O-DOMAIN)"
  ],
  "6": [
    "GS.06b affected-subject set = exactly the loc1 workers, all re-run (O-DOMAIN dependency rule over the :placement/location reference)",
    "pay-rate-at-or-above-minimum-wage obligations after the change (O-DOMAIN)"
  ],
  "7": [],
  "15": [],
  "16": [
    "explain still works with markers in place of PII (O-DOMAIN explanation over erased inputs)"
  ],
  "19": [
    "the dependency-index affected-subject set including subjects reached through referenced entities (O-DOMAIN)",
    "work-item payloads and their publication sequences under W0 (O-DOMAIN); the harness payload is the asserted (attribute, value) set per subject"
  ],
  "8": [
    "derived state of each corrected subject is re-run (O-DOMAIN affected set; fails closed until EXP-D01)"
  ],
  "5": [
    "the background-check obligation of each changed subject is re-evaluated (O-DOMAIN)"
  ],
  "2": [
    "the next task after Section 1 is visible on the first pull (O-DOMAIN; fails closed until EXP-D01)"
  ]
};
export function requireSpecClaims(probe: Probe, scenario: number, texts: readonly string[]) {
  for (const [index, text] of texts.entries()) {
    if (SPEC_TEXT[scenario]?.[index] !== text) throw Error('unmapped spec domain claim: ' + text);
    const records = probe.claims.filter(c => c.scenario === scenario && c.index === index && c.attempt === probe.attempt && c.status === 'OFFLINE-MATCH');
    const required: Record<string, string[]> = { '1:0': ['domain:'], '2:0': ['domain:'], '5:0': ['domain:'], '6:0': ['GS-06:affected-subjects', 'GS-06:rerun-exactly-once'], '6:1': ['domain:'], '9:0': ['domain:', 'GS-09:stored-nextTemporalBoundary'], '17:0': ['domain:'], '18:0': ['GS-18:maintained-projection'] };
    const prefixes = required[scenario + ':' + index] ?? [];
    const executed = prefixes.length > 0 && records.some(c => c.evidence?.length && c.evidence.every((n: number) => {
      const check = probe.checks[n];
      return check?.ok && check.attempt === probe.attempt && check.sourceSha256 === probe.sourceSha256 && (check.id.startsWith('domain:') || check.id.startsWith('GS-'));
    }) && prefixes.every(prefix => c.evidence.some((n: number) => probe.checks[n].id.startsWith(prefix))));
    probe.equal('required-domain-claim:' + scenario + ':' + index, !!executed, true, { text, scenario, index });
  }
}
