// [EXP-W02-R3] Why: distinguish the query cut reported by the answering route from its current head.
// Rejected: echoing the caller's basis in the verifier (conceals a route that used latest state).
import { canonical, type PositionBasis } from '../../bench/lib/w0-world.ts';
import type { CompositionHandle } from '../../bench/lib/composition.ts';
export async function checkedRead(comp: CompositionHandle, subjects: readonly string[], basis: PositionBasis, observations: any[]) {
  const requestedBasis = { ...basis };
  const answer = await comp.sweepPage(subjects, basis);
  const observation = { subjects: [...subjects], requestedBasis, reportedBasis: answer.reportedBasis ?? null,
    endpoint: comp.backend.url, scope: comp.scopeName, head: answer.position };
  observations.push(observation);
  if (canonical(observation.reportedBasis) !== canonical(requestedBasis)) throw Error('read-basis mismatch: ' + canonical(observation));
  return answer;
}
