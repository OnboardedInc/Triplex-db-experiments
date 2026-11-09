// [EXP-W02-R2] Why: each named claim has a concrete store observation and an independently replayed input.
// Rejected: assigning every claim index to one generic kernel-conformance comparison.
import { W0, canonical, V_W0 } from '../../bench/lib/w0-world.ts';
import { Probe, instant } from './probe.ts';
// @ts-ignore -- independent Python oracle seam.
import { runDomain } from '../lib/domain.mjs';
export const CLAIMS: Record<number, readonly string[]> = {
  1: ['next-task-on-reconcile'], 5: ['background-obligation-re-evaluated'],
  6: ['exact-two-hop-affected-and-rerun', 'post-change-minimum-wage'],
  9: ['moved-obligations-and-persisted-boundary'], 17: ['proposals-do-not-count'], 18: ['overdue-maintained-projection'],
};
export function futureBoundary(output: any, V: number): string | null {
  return output.obligations.map((o: any) => o.boundary).filter((b: string) => b > instant(V)).sort()[0] ?? null;
}
export async function reconcileClaim(probe: Probe, scenario: number, subject: string, P = -1, V = V_W0) {
  if (![1, 5, 6, 9, 17].includes(scenario)) throw Error('not a per-subject reconcile claim');
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
  const claim = { scenario, index: scenario === 6 ? 1 : 0, id: CLAIMS[scenario].at(-1), status: 'OFFLINE-MATCH', attempt: probe.attempt, basis: output.basis };
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
  const claim = { scenario: 6, index: 0, id: CLAIMS[6][0], status: 'OFFLINE-MATCH', attempt: probe.attempt, basis };
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
  const claim = { scenario: 18, index: 0, id: CLAIMS[18][0], status: 'OFFLINE-MATCH', attempt: probe.attempt, basis: projection.basis };
  probe.claims.push(claim); return { pin, projection, claims: [claim] };
}
