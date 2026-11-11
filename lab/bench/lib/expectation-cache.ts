import type { Model, Expected, Commit } from "./model.ts";
// [DX-R3] Why: global receipt clocks and current valid times vary even when a subject's expected world does not.
// Rejected: recomputing every subject part for every read, or caching observed results instead of comparing every read.
export class ExpectationCache {
  private subjects = new Map<number, { list: readonly Commit[]; length: number; record: number[]; valid: number[]; values: Map<string, Expected> }>();
  readonly diagnostics = { hits: 0, misses: 0 };
  readonly model: Model;
  constructor(model: Model) { this.model = model; }
  expected(subject: number, recordedAt: number, validAt: number) {
    if (!Number.isFinite(recordedAt) || !Number.isFinite(validAt)) return this.model.expected(subject, recordedAt, validAt);
    const list = this.model.commits.get(subject) ?? EMPTY;
    let entry = this.subjects.get(subject);
    if (!entry || entry.list !== list || entry.length !== list.length) {
      entry = { list, length: list.length, record: [...new Set<number>(list.map((c: Commit) => c.instant))].sort((a,b)=>a-b),
        valid: [...new Set<number>(list.flatMap((c: Commit) => [c.stampValidFrom, ...c.parts.map((p) => p.validFrom)]))].sort((a,b)=>a-b), values: new Map() };
      this.subjects.set(subject, entry);
    }
    const key = upper(entry.record, recordedAt) + '/' + upper(entry.valid, validAt);
    let value = entry.values.get(key);
    if (value) { this.diagnostics.hits++; return value; }
    this.diagnostics.misses++;
    value = this.model.expected(subject, recordedAt, validAt);
    if (entry.values.size === 64) entry.values.clear();
    entry.values.set(key, value);
    return value;
  }
}
const EMPTY: readonly Commit[] = [];
function upper(xs: readonly number[], value: number) {
  let lo=0, hi=xs.length;
  while(lo<hi) { const mid=(lo+hi)>>>1; if(xs[mid]! <= value) lo=mid+1; else hi=mid; }
  return lo;
}
