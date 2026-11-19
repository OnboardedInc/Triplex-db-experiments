import assert from "node:assert/strict";
import { W0, canonical, sha256 } from "../../../bench/lib/w0-world.ts";
import {
  allIndexes,
  bounds,
  bucket,
  derive,
  describe,
  differences,
  member,
  type Location,
  type Posting,
  type Range,
} from "./rules.ts";

export const ordered = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
export const byPosting = (a: Posting, b: Posting) =>
  a.value - b.value || ordered(a.subject, b.subject) || ordered(a.key, b.key);
export function checkCensus(census: readonly string[], observed: readonly string[]) {
  assert(
    census.every((s, i) => W0.isPlacementId(s) && (i === 0 || census[i - 1]! < s)),
    "invalid ordered census",
  );
  assert.deepEqual(
    [...observed].sort(ordered),
    census,
    "source differs from independently supplied census",
  );
  return sha256(canonical(census));
}
export class LookupIndex {
  readonly locations = new Map<string, Location>();
  readonly postings = new Map<string, Posting[]>();
  readonly censusHash: string;
  constructor(
    readonly census: readonly string[],
    worlds: readonly W0.World[],
    readonly basis: W0.Basis,
    readonly available = allIndexes(),
  ) {
    this.censusHash = checkCensus(
      census,
      worlds.map((w) => w.subject),
    );
    for (const world of worlds) {
      const { location, postings } = describe(world, basis, available);
      const prior = this.locations.get(location.id);
      if (prior) assert.deepEqual(prior, location, "two subjects disagree on shared location");
      this.locations.set(location.id, location);
      for (const p of postings) {
        const k = bucket(p),
          list = this.postings.get(k) ?? [];
        list.push(p);
        this.postings.set(k, list);
      }
    }
    for (const list of this.postings.values()) list.sort(byPosting);
  }
  range(r: Range): Posting[] {
    const list = this.postings.get(bucket(r)) ?? [],
      [from, to] = bounds(list, (p) => p.value, r);
    return list.slice(from, to);
  }
  select(old: W0.CompiledRelease, next: W0.CompiledRelease, load: (s: string) => W0.World) {
    const { ranges, fallback } = derive(
      old,
      next,
      this.basis.validTime,
      [...this.locations.values()],
      this.available,
    );
    const keys = new Set<string>();
    let yielded = 0,
      worldPulls = 0;
    for (const r of ranges)
      for (const p of this.range(r)) {
        keys.add(member(p));
        yielded++;
      }
    // [DX-ACT2] Why: an unavailable input index makes its whole rule an exact census sweep. Rejected: an empty range (silently certifies the complement).
    if (fallback.length)
      for (const subject of this.census) {
        worldPulls++;
        for (const [key] of differences(load(subject), this.basis, old, next)) {
          const [s, rule, k] = JSON.parse(key);
          if (fallback.includes(rule)) keys.add(member({ subject: s, rule, key: k }));
        }
      }
    return { keys: [...keys].sort(), yielded, worldPulls, ranges: ranges.length, fallback };
  }
}
