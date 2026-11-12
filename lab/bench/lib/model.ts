/** Receipt-bound full-row expectations: record visibility, valid-time intervals and reachable reference closures.
 * The business digest below remains only for legacy unbound fixtures; the driver refuses to certify those reads.
 */
// [DX-R3] Why: seed/shared expiry and retractions affect counts, stamps and every cache boundary.
// Rejected: non-expiring business counts beside a complete-row digest (can accept an expired assertion).
import { FullRowModel } from "./full-row-model.ts";
import type { Receipt } from "./composition.ts";
import { Digest } from "./rng.ts";
import { accountOfSubject, accountsFor, memberOf, ownFacts, sharedFacts } from "./world.ts";
import type { Fact } from "./world.ts";

export interface Part {
  readonly validFrom: number;
  readonly a: number;
  readonly b: number;
  readonly n: number;
}
export interface Commit {
  readonly instant: number;
  readonly position: number;
  readonly txId: string;
  /** New `:placement/stamp` value, or -1 when the command does not move the stamp. */
  readonly stamp: number;
  readonly stampValidFrom: number;
  readonly parts: readonly Part[];
  readonly ackAtMs: number;
  readonly stream: string;
}
export interface Expected {
  fullRows: boolean;
  stamp: number;
  digest: string;
  facts: number;
  commits: number;
}

/** Digest parts grouped by validFrom: + for added facts, - for removed facts. */
export function partsOf(
  added: readonly Fact[],
  addedValidFrom: readonly number[],
  removed: readonly Fact[],
  removedValidFrom: readonly number[],
): Part[] {
  const groups = new Map<number, Digest>();
  const g = (vf: number) => groups.get(vf) ?? groups.set(vf, new Digest()).get(vf)!;
  added.forEach((f, k) => g(addedValidFrom[k]!).add(memberOf(f.e, f.a, f.v)));
  removed.forEach((f, k) => g(removedValidFrom[k]!).remove(memberOf(f.e, f.a, f.v)));
  return [...groups].map(([validFrom, d]) => ({ validFrom, a: d.a, b: d.b, n: d.n }));
}

export class Model {
  private full: FullRowModel | undefined;
  receiptVersion = 0;
  bindReceipt(operations: readonly any[], receipt: Receipt, actor?: string): void {
    this.full ??= new FullRowModel();
    this.full.add(operations, receipt, actor);
    this.receiptVersion++;
  }
  readonly accounts: number;
  readonly subjects: number;
  private shared = new Map<number, Digest>();
  private seeds = new Map<number, Digest>();
  readonly commits = new Map<number, Commit[]>();
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
      for (const f of ownFacts(i, this.accounts)) d.add(memberOf(f.e, f.a, f.v));
      d.plus(this.sharedDigest(accountOfSubject(i, this.accounts)));
      if (this.seeds.size < 200_000) this.seeds.set(i, d);
    }
    return d;
  }
  addCommit(subject: number, commit: Commit): void {
    const list = this.commits.get(subject) ?? [];
    list.push(commit);
    this.commits.set(subject, list);
  }
  expectationBoundaries(subject: number) {
    if (this.full) return this.full.boundaries(subject);
    const list = this.commits.get(subject) ?? [];
    return {
      record: [...new Set(list.map((c) => c.instant))].sort((a, b) => a - b),
      valid: [
        ...new Set(list.flatMap((c) => [c.stampValidFrom, ...c.parts.map((p) => p.validFrom)])),
      ].sort((a, b) => a - b),
    };
  }
  expected(subject: number, recordedAt: number, validAt: number): Expected {
    if (this.full)
      return {
        fullRows: true,
        ...this.full.summary(subject, recordedAt, validAt),
        commits: (this.commits.get(subject) ?? []).filter((c) => c.instant <= recordedAt).length,
      };
    const d = new Digest().plus(this.seedDigest(subject));
    let last: Commit | null = null,
      commits = 0;
    for (const c of this.commits.get(subject) ?? []) {
      if (c.instant > recordedAt) continue;
      commits++;
      for (const p of c.parts) if (p.validFrom <= validAt) d.plus(p);
      if (c.stamp >= 0 && (!last || c.position > last.position)) last = c;
    }
    const stamp = !last ? 0 : last.stampValidFrom <= validAt ? last.stamp : -1;
    return { fullRows: this.full !== undefined, stamp, digest: d.hex(), facts: d.n, commits };
  }
  /** Commits of the subject with instant <= R acknowledged after time t (arrived after the read started). */
  lateArrivals(subject: number, recordedAt: number, t: number): number {
    return (this.commits.get(subject) ?? []).filter((c) => c.instant <= recordedAt && c.ackAtMs > t)
      .length;
  }
  /** Did any commit to the subject get acknowledged inside [from, to]? (split-read evidence) */
  committedBetween(subject: number, from: number, to: number): boolean {
    return (this.commits.get(subject) ?? []).some((c) => c.ackAtMs >= from && c.ackAtMs <= to);
  }
}
