import { R, type ReadRecord } from "./observe.ts";
import type { ExpectationCache } from "./expectation-cache.ts";

export const VERDICTS = [
  "correct",
  "error",
  "stale-late-arrival",
  "stale",
  "future-or-latest-state",
  "wrong-world",
  "invalid-value",
].map((kind) => ({ ok: kind === "correct", kind }));

// [DX-RD1] Why: the rolling collector and final all-ACK replay use the same full-row comparator.
// Rejected: counting observed digests before comparing them to an independent expectation at the requested cut.
export function judgeReadCode(r: ReadRecord, expectations: ExpectationCache): number {
  if (r[R.error] === "CanonicalValueError") return 6;
  if (r[R.error] !== null) return 1;
  const exp = expectations.expected(r[R.subject], r[R.recordedAt], r[R.validAt]);
  if (!exp.fullRows) return 5;
  if (r[R.stamp] === exp.stamp && r[R.facts] === exp.facts && r[R.digest] === exp.digest) return 0;
  if (exp.stamp >= 0 && r[R.stamp] < exp.stamp)
    return expectations.model.lateArrivals(r[R.subject], r[R.recordedAt], r[R.start]) > 0 ? 2 : 3;
  if (r[R.stamp] > exp.stamp) return 4;
  return 5;
}

export function wasHot(r: ReadRecord, expectations: ExpectationCache) {
  const list = expectations.model.commits.get(r[R.subject]);
  if (!list) return false;
  const start = r[R.start];
  return list.some((c) => c.ackAtMs < start && start - c.ackAtMs <= 60_000);
}
