import {
  feedBytes,
  type FeedEntry,
  type FeedPage,
  type FeedCrashPoint,
} from "@triplex-build/triplex/feed";

// [EXP-FD01] Why: Q98e audits a source-enumerated prefix, including non-commit resolutions.
// Rejected: inferring expected positions from the delivered stream (a dropped entry then vanishes twice).
export interface FeedExpectation {
  /** Independently enumerated source prefix with O-REPLAY change identities, not adapter output. */
  readonly entries: readonly FeedEntry[];
  readonly source: string;
  readonly finalToken: string;
}
export function auditFeed(
  pages: readonly FeedPage[],
  expected: FeedExpectation,
): { positions: number; resolutions: number } {
  if (!expected.entries.length || !pages.length) throw new Error("Void feed audit");
  const actual = pages.flatMap((p) => p.entries);
  if (pages.some((p) => p.cursor.source !== expected.source))
    throw new Error("Feed source binding mismatch");
  if (pages.at(-1)!.cursor.token !== expected.finalToken)
    throw new Error("Published prefix not reached");
  if (actual.length !== expected.entries.length) throw new Error("Feed gap/extra resolution");
  const subjectLast = new Map<string, bigint>();
  const positions = new Set<string>();
  const commands = new Set<string>();
  const coordinates = new Set<string>();
  let prior: FeedEntry | undefined;
  for (const [i, e] of actual.entries()) {
    if (feedBytes(e) !== feedBytes(expected.entries[i]!))
      throw new Error(`Feed content/resolution mismatch at ${i}`);
    const coordinate = JSON.stringify([e.stream, e.epoch, e.offset]);
    if (coordinates.has(coordinate)) throw new Error("Repeated source resolution");
    coordinates.add(coordinate);
    if (
      prior &&
      (e.stream !== prior.stream ||
        BigInt(e.epoch) < BigInt(prior.epoch) ||
        (e.epoch === prior.epoch && BigInt(e.offset) <= BigInt(prior.offset)))
    )
      throw new Error("Source resolution order violation");
    if (prior && e.epoch !== prior.epoch && (e.kind !== "epoch" || e.previousEpoch !== prior.epoch))
      throw new Error("Unresolved epoch transition");
    prior = e;
    if (e.kind !== "commit") continue;
    for (const tx of e.transactions) {
      for (const command of tx.commandIds) {
        if (commands.has(command)) throw new Error("Resent command allocated new position");
        commands.add(command);
      }
      for (const p of tx.positions) {
        const key = JSON.stringify([e.stream, e.epoch, p]);
        if (positions.has(key)) throw new Error("Duplicate position");
        positions.add(key);
        for (const subject of new Set(
          tx.changes.filter((c) => c.position === p).map((c) => c.entity),
        )) {
          const s = JSON.stringify([e.stream, e.epoch, subject]);
          if ((subjectLast.get(s) ?? -1n) >= BigInt(p))
            throw new Error("Per-subject order violation");
          subjectLast.set(s, BigInt(p));
        }
      }
    }
  }
  return { positions: positions.size, resolutions: actual.length };
}
export function auditResume(first: readonly FeedEntry[], resumed: readonly FeedEntry[]): void {
  if (
    first.length !== resumed.length ||
    first.some((e, i) => feedBytes(e) !== feedBytes(resumed[i]!))
  )
    throw new Error("Resume bytes differ");
}
export function requireGapMutationCaught(
  pages: readonly FeedPage[],
  expected: FeedExpectation,
): void {
  auditFeed(pages, expected);
  if (!pages.some((p) => p.entries.some((e) => e.kind === "commit")))
    throw new Error("Void gap mutation");
  let dropped = false;
  const mutation = pages.map((p) => ({
    ...p,
    entries: p.entries.filter((e) => {
      if (!dropped && e.kind === "commit") {
        dropped = true;
        return false;
      }
      return true;
    }),
  }));
  let caught = false;
  try {
    auditFeed(mutation, expected);
  } catch {
    caught = true;
  }
  if (!caught) throw new Error("M-FEED-GAP survived");
}
export interface CrashObservation {
  readonly crashed: boolean;
  readonly gaps: number;
  readonly duplicateEffects: number;
  readonly affectedMatches: boolean;
  readonly checkpointMatches: boolean;
  readonly resumeBytesMatch: boolean;
}
/** Harness must stop a real process at the requested hook and reopen the SAME host file. */
export async function runFeedCrashConformance(
  run: (
    point: FeedCrashPoint,
    attempt: number,
    arm: "keyed-atomic" | "unkeyed-split",
  ) => Promise<CrashObservation>,
) {
  const points: readonly FeedCrashPoint[] = ["before-effect", "after-effect", "after-checkpoint"];
  let controlDuplicates = 0;
  for (const point of points) {
    for (let attempt = 0; attempt < 100; attempt++) {
      const keyed = await run(point, attempt, "keyed-atomic");
      if (
        !keyed.crashed ||
        keyed.gaps ||
        keyed.duplicateEffects ||
        !keyed.affectedMatches ||
        !keyed.checkpointMatches ||
        !keyed.resumeBytesMatch
      )
        throw new Error(`Keyed crash failed: ${point}/${attempt}`);
      const control = await run(point, attempt, "unkeyed-split");
      if (
        !control.crashed ||
        control.gaps ||
        !control.checkpointMatches ||
        !control.affectedMatches ||
        !control.resumeBytesMatch
      )
        throw new Error(`Void split control: ${point}/${attempt}`);
      if (point === "after-effect" && control.duplicateEffects === 0)
        throw new Error("Void X3 control: after-effect crash did not duplicate");
      controlDuplicates += control.duplicateEffects;
    }
  }
  return { keyedCrashes: 300, controlCrashes: 300, controlDuplicates };
}
