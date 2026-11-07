/**
 * Expected-state model: what a subject pull must return at a record-time basis R.
 *
 * World(i, R) = seed world of i (final seed version) + every committed trace command of i whose
 * receipt instant is <= R. Commands are applied as multiset digest deltas, so checking a read costs
 * O(commands of that subject). All seed commands precede the trace, and readers only pick R at or
 * after the seed end, so the seed contributes in full. Valid time: every fact the driver writes has
 * validFrom <= the read's validAt (seed facts 2023, trace facts at their scheduled time, corrections
 * 30 days back) and no validTo, so validAt filters nothing here; the O-REPLAY sample checks the full
 * (P, R, V) semantics independently.
 */
import { Digest } from "./rng.ts";
import { accountsFor, historyDepth, memberOf, ownFacts, sharedFacts } from "./world.ts";
import type { Fact } from "./world.ts";

export interface Commit {
  readonly instant: number;
  readonly position: number;
  readonly txId: string;
  readonly stamp: number;
  readonly delta: { a: number; b: number; n: number };
  readonly ackAtMs: number;
}

export interface Expected {
  stamp: number;
  digest: string;
  facts: number;
  /** Commits of the subject with instant <= R, newest first, for diagnosing a violation. */
  commits: number;
}

export function deltaOf(added: readonly Fact[], removed: readonly Fact[]) {
  const d = new Digest();
  for (const f of added) d.add(memberOf(f.e, f.a, f.v));
  for (const f of removed) d.remove(memberOf(f.e, f.a, f.v));
  return { a: d.a, b: d.b, n: d.n };
}

export class Model {
  readonly accounts: number;
  private shared = new Map<number, Digest>();
  private seeds = new Map<number, Digest>();
  readonly commits = new Map<number, Commit[]>();
  readonly subjects: number;
  constructor(subjects: number) {
    this.subjects = subjects;
    this.accounts = accountsFor(subjects);
  }
  private sharedDigest(a: number): Digest {
    let d = this.shared.get(a);
    if (!d) {
      d = new Digest();
      for (const f of sharedFacts(a)) d.add(memberOf(f.e, f.a, f.v));
      this.shared.set(a, d);
    }
    return d;
  }
  seedDigest(i: number): Digest {
    let d = this.seeds.get(i);
    if (!d) {
      d = new Digest();
      for (const f of ownFacts(i, this.accounts, historyDepth(i) - 1)) d.add(memberOf(f.e, f.a, f.v));
      d.plus(this.sharedDigest(i % this.accounts));
      if (this.seeds.size < 200_000) this.seeds.set(i, d);
    }
    return d;
  }
  addCommit(subject: number, commit: Commit): void {
    const list = this.commits.get(subject) ?? [];
    list.push(commit);
    this.commits.set(subject, list);
  }
  expected(subject: number, recordedAt: number): Expected {
    const d = new Digest().plus(this.seedDigest(subject));
    let stamp = 0, commits = 0;
    for (const c of this.commits.get(subject) ?? []) {
      if (c.instant > recordedAt) continue;
      d.plus(c.delta);
      stamp = Math.max(stamp, c.stamp);
      commits++;
    }
    return { stamp, digest: d.hex(), facts: d.n, commits };
  }
  /** Commits of the subject with instant <= R that were acknowledged after `t` (late arrivals). */
  lateArrivals(subject: number, recordedAt: number, t: number): number {
    return (this.commits.get(subject) ?? []).filter((c) => c.instant <= recordedAt && c.ackAtMs > t).length;
  }
}
