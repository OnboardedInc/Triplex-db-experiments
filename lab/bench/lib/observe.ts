/** What a read observed, in the same terms the expected-state model computes. */
import type { PullResult } from "./composition.ts";
import { Digest, hash2 } from "./rng.ts";
import { canonicalRow, supportedDescriptors } from "./canonical.ts";

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

// [DX-H7] Why: immutable cached facts recur at many bases; hash their actual content once.
// Rejected: ID/revision-only result caching (could hide mutations or valid-time filtering).
type MemberPart = { a: number; b: number; bytes: number; stamp: number; stamps: number };
const members = new WeakMap<object, MemberPart>();
const frozenData = (v: unknown): boolean => {
  if (v === null || typeof v !== "object") return typeof v !== "function";
  if (!Object.isFrozen(v)) return false;
  const descriptors = supportedDescriptors(v);
  return Object.values(descriptors).every((d) => frozenData(d.value));
};
export function observe(pr: PullResult): Observed {
  // [DX-R3] Why: follower hashes every fact in each immutable version; readers add those exact contributions.
  // Rejected: sampling facts or replacing the independent expected-state comparison.
  if (pr.observation) return pr.observation;
  const d = new Digest();
  let stamp = -1,
    stamps = 0,
    bytes = 0;
  for (const t of pr.triples) {
    let part = members.get(t);
    if (!part) {
      const m = canonicalRow(t);
      const [a, b] = hash2(m);
      const isStamp = t.attribute === ":placement/stamp";
      part = {
        a,
        b,
        bytes: m.length,
        stamp: isStamp ? Number(t.value.value) : -1,
        stamps: isStamp ? 1 : 0,
      };
      // [DX-R3] Why: cache only complete immutable public rows, including Option payloads and nested values.
      // Rejected: caching a projection while unexamined metadata can still change.
      if (Object.isFrozen(t)) {
        const descriptors = supportedDescriptors(t);
        if (
          Object.keys(descriptors).every(
            (k) => descriptors[k] && "value" in descriptors[k] && frozenData(descriptors[k].value),
          )
        )
          members.set(t, part);
      }
    }
    d.a = (d.a + part.a) >>> 0;
    d.b = (d.b + part.b) >>> 0;
    d.n++;
    bytes += part.bytes;
    stamps += part.stamps;
    if (part.stamps) stamp = Math.max(stamp, part.stamp);
  }
  return { digest: d.hex(), stamp, stamps, facts: d.n, bytes };
}

/** Record layout shared by reader workers and the driver (arrays keep worker messages small). */
export const R = {
  phase: 0,
  subject: 1,
  recordedAt: 2,
  validAt: 3,
  start: 4,
  latency: 5,
  stamp: 6,
  facts: 7,
  digest: 8,
  bytes: 9,
  depth: 10,
  roundTrips: 11,
  error: 12,
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
export type ReadRecord = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  string,
  number,
  number,
  number,
  string | null,
  number,
  number,
  number,
  number,
  number,
  string,
  string,
  number,
];
