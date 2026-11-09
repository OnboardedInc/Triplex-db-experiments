import {
  feedBytes,
  feedPositionKey,
  publicationLagMs,
  type FeedInstant,
  type FeedPublication,
  type FeedCursor,
  type AffectedSubject,
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
export interface ConsumerSnapshot {
  readonly dependencies?: Readonly<Record<string, readonly Record<string, unknown>[]>>;
  readonly effects: readonly AffectedSubject[];
  readonly affected: readonly AffectedSubject[];
  readonly checkpoint: FeedCursor | null;
}
const snapshotBytes = (s: ConsumerSnapshot) =>
  JSON.stringify({
    effects: s.effects.map((a) => JSON.stringify([a.epoch, a.position, a.subject])).sort(),
    affected: s.affected.map((a) => JSON.stringify([a.epoch, a.position, a.subject])).sort(),
    dependencies: s.dependencies ?? {},
    checkpoint: s.checkpoint === null ? null : [s.checkpoint.source, s.checkpoint.token],
  });
export type FeedCrashScenario = FeedCrashPoint | "before-commit" | "after-commit";
export interface CrashObservation {
  readonly crashed: boolean;
  /** Read from the reopened file BEFORE recovery/replay, never inferred from final state. */
  readonly beforeReplay: ConsumerSnapshot;
  readonly gaps: number;
  readonly duplicateEffects: number;
  readonly affectedMatches: boolean;
  readonly checkpointMatches: boolean;
  readonly resumeBytesMatch: boolean;
}
// [EXP-FD01-R2] Why: keyed replay can hide two commits. Require the old/new durable state at the stop itself.
// Rejected: using only recovered duplicate/gap counters (QA's keyed-split mutant passed all original tests).
export function auditConsumerAtomicity(
  observed: ConsumerSnapshot,
  expected: { readonly before: ConsumerSnapshot; readonly after: ConsumerSnapshot },
  point: FeedCrashScenario,
): void {
  const target =
    point === "after-commit" || point === "after-checkpoint" ? expected.after : expected.before;
  if (!observed || snapshotBytes(observed) !== snapshotBytes(target))
    throw new Error(`Nonatomic consumer state before replay: ${point}`);
}
/** Driver intercepts real COMMIT execution, stops the child, reads durable state, THEN invokes replay. */
export async function runFeedCrashConformance(
  run: (
    point: FeedCrashScenario,
    attempt: number,
    arm: "keyed-atomic" | "unkeyed-split" | "keyed-split",
  ) => Promise<CrashObservation>,
  expected: { readonly before: ConsumerSnapshot; readonly after: ConsumerSnapshot },
) {
  if (!expected || snapshotBytes(expected.before) === snapshotBytes(expected.after))
    throw new Error("Void atomicity expectation");
  const points: readonly FeedCrashScenario[] = [
    "after-commit",
    "before-commit",
    "before-effect",
    "after-effect",
    "after-checkpoint",
  ];
  let controlDuplicates = 0;
  let splitAtomicityRejections = 0;
  for (const point of points) {
    for (let attempt = 0; attempt < 100; attempt++) {
      const keyed = await run(point, attempt, "keyed-atomic");
      auditConsumerAtomicity(keyed.beforeReplay, expected, point);
      if (
        !keyed.crashed ||
        keyed.gaps ||
        keyed.duplicateEffects ||
        !keyed.affectedMatches ||
        !keyed.checkpointMatches ||
        !keyed.resumeBytesMatch
      )
        throw new Error(`Keyed crash failed: ${point}/${attempt}`);
      if (point === "before-commit" || point === "after-commit") {
        if (point === "before-commit") continue;
        const split = await run(point, attempt, "keyed-split");
        if (
          !split.crashed ||
          split.gaps ||
          split.duplicateEffects ||
          !split.affectedMatches ||
          !split.checkpointMatches ||
          !split.resumeBytesMatch
        )
          throw new Error("Void keyed-split control");
        let rejected = false;
        try {
          auditConsumerAtomicity(split.beforeReplay, expected, point);
        } catch {
          rejected = true;
        }
        if (!rejected) throw new Error("Keyed split commit survived atomicity audit");
        splitAtomicityRejections++;
        continue;
      }
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
  return {
    keyedCrashes: 500,
    controlCrashes: 300,
    splitCrashes: 100,
    splitAtomicityRejections,
    controlDuplicates,
  };
}

/** Compare every committed position's reported lag with independent source publication and durable-known observations. */
export function auditFeedLag(
  pages: readonly FeedPage[],
  publications: readonly FeedPublication[],
  known: readonly (FeedInstant & { readonly lagMs: number })[],
  producerRecords: readonly FeedPublication[],
): readonly number[] {
  const positions = new Set(
    pages.flatMap((p) =>
      p.entries.flatMap((e) =>
        e.kind === "commit"
          ? e.transactions.flatMap((t) =>
              t.positions.map((position) =>
                feedPositionKey({
                  source: p.cursor.source,
                  stream: e.stream,
                  epoch: e.epoch,
                  position,
                }),
              ),
            )
          : [],
      ),
    ),
  );
  if (!positions.size) throw new Error("Void publication lag audit");
  const index = (rows: readonly FeedInstant[]) => {
    const result = new Map<string, FeedInstant>();
    for (const row of rows) {
      const key = feedPositionKey(row);
      if (!positions.has(key) || result.has(key))
        throw new Error("Duplicate or foreign lag observation");
      result.set(key, row);
    }
    return result;
  };
  const published = index(publications);
  const completed = index(known);
  const records = index(producerRecords);
  if (completed.size !== positions.size) throw new Error("Missing durable-known observation");
  return [...positions].map((key) => {
    const observation = completed.get(key)! as FeedInstant & { readonly lagMs: number };
    const lag = publicationLagMs(
      published.get(key) as FeedPublication | undefined,
      observation,
      records.get(key) as FeedPublication | undefined,
    );
    if (!Number.isFinite(observation.lagMs) || observation.lagMs !== lag)
      throw new Error("Lag differs from source publication interval");
    return lag;
  });
}
