import { R, type ReadRecord } from "./observe.ts";
type Sample = { phase: number; start: number; subject: number; basis: { recordedAt: number; validAt: number } };
// [DX-R3-P8] Why: bind raw samples to the first exact retained attempt in one spill traversal, preserving find's semantics.
// Rejected: scanning the complete multi-gigabyte spill once per sample, or matching only subject/basis.
export function sampleMatches(records: Iterable<ReadRecord>, samples: readonly Sample[]): (ReadRecord | undefined)[] {
  const matches: (ReadRecord | undefined)[] = new Array(samples.length);
  const wanted = new Map<string, number[]>();
  const key = (phase: number, start: number) => `${Object.is(phase, -0) ? "-0" : phase}:${Object.is(start, -0) ? "-0" : start}`;
  samples.forEach((s, i) => { const k = key(s.phase, s.start); (wanted.get(k) ?? wanted.set(k, []).get(k)!).push(i); });
  let remaining = samples.length;
  if (!remaining) return matches;
  for (const r of records) {
    const k = key(r[R.phase], r[R.start]), candidates = wanted.get(k);
    if (!candidates) continue;
    for (let n = candidates.length - 1; n >= 0; n--) {
      const i = candidates[n]!, s = samples[i]!;
      if (!Object.is(r[R.subject], s.subject) || !Object.is(r[R.recordedAt], s.basis.recordedAt) || !Object.is(r[R.validAt], s.basis.validAt)) continue;
      matches[i] = r; candidates.splice(n, 1); remaining--;
    }
    if (!candidates.length) wanted.delete(k);
    if (!remaining) break;
  }
  return matches;
}
