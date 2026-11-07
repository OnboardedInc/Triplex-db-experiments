/** What a read observed, in the same terms the expected-state model computes. */
import type { PullResult } from "./composition.ts";
import { Digest } from "./rng.ts";
import { memberOf } from "./world.ts";

export interface Observed {
  digest: string;
  /** Highest visible `:placement/stamp`, -1 when none is visible. */
  stamp: number;
  /** Number of visible `:placement/stamp` facts (exactly 1 when CAS holds). */
  stamps: number;
  facts: number;
  /** Client-observed result size: bytes of canonical member text (not engine bytes read). */
  bytes: number;
}

export function observe(pr: PullResult): Observed {
  const d = new Digest();
  let stamp = -1, stamps = 0, bytes = 0;
  for (const t of pr.triples) {
    const m = memberOf(t.entityId, t.attribute, t.value);
    d.add(m);
    bytes += m.length;
    if (t.attribute === ":placement/stamp") {
      stamps++;
      stamp = Math.max(stamp, Number(t.value.value));
    }
  }
  return { digest: d.hex(), stamp, stamps, facts: d.n, bytes };
}

/** Record layout shared by reader workers and the driver (arrays keep worker messages small). */
export const R = {
  phase: 0, subject: 1, recordedAt: 2, validAt: 3, start: 4, latency: 5, stamp: 6, facts: 7, digest: 8, bytes: 9, depth: 10, roundTrips: 11, error: 12,
  /** 0 latest receipt, 1 receipt from the last hour, 2 past valid time */
  basisKind: 13,
  /** source position of the receipt the basis names (driver-recorded) */
  basisPosition: 14,
  /** 0 single pull, 1 split without a commit between steps, 2 split with a commit between steps */
  split: 15,
  forcedPosition: 16,
  hotPick: 17,
  route: 18,
  language: 19,
  waitedMs: 20,
} as const;
export type ReadRecord = [number, number, number, number, number, number, number, number, string, number, number, number, string | null, number, number, number, number, number, string, string, number];
