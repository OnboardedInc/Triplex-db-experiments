import {
  generateRouteBases,
  routeHead,
  routeRetentionHorizons,
  routeShape,
  type RouteHistory,
  type RouteRequest,
} from "./route-equivalence.js";

export const requiredRouteHistoryKinds = [
  "singleAssert",
  "groupAssert",
  "singleRetract",
  "groupRetract",
  "manyThenRetract",
  "replacement",
  "selfRetraction",
  "boundedCorrection",
  "futureValid",
  "nestedOrdinal",
  "claimsOnly",
  "positionOnly",
  "casAbort",
  "stageInversion",
  "sameMillisecond",
  "clockRollback",
] as const;

// [EXP-RQ01] Why: measure semantic witnesses from row identities and attempt receipts.
// Rejected: index-modulo operation labels (the original labels concealed cross-subject corrections).
export const measureRouteCoverage = (
  history: RouteHistory,
  requests: readonly RouteRequest[] = generateRouteBases(history),
) => {
  const kinds = Object.fromEntries(requiredRouteHistoryKinds.map((kind) => [kind, 0])) as Record<
    (typeof requiredRouteHistoryKinds)[number],
    number
  >;
  const live = new Map<
    string,
    { entity_id: string; attribute: string; valid_from: number; valid_to: number | null }
  >();
  for (const [index, commit] of history.commits.entries()) {
    const assertions = commit.writes.filter((w) => w.op === "assert");
    const retractions = commit.writes.filter((w) => w.op === "retract");
    if (assertions.length === 1 && !retractions.length) kinds.singleAssert++;
    if (assertions.length >= 5 && assertions.length <= 50 && !retractions.length)
      kinds.groupAssert++;
    if (retractions.length === 1) kinds.singleRetract++;
    if (retractions.length > 1) kinds.groupRetract++;
    for (const retract of retractions) {
      const prior = live.get(retract.id);
      if (
        prior &&
        retractions.length === 1 &&
        [...live.entries()].some(
          ([id, peer]) =>
            id !== retract.id &&
            peer.entity_id === prior.entity_id &&
            peer.attribute === prior.attribute,
        )
      )
        kinds.manyThenRetract++;
      for (const assertion of assertions)
        if (
          prior &&
          assertion.row.entity_id === prior.entity_id &&
          assertion.row.attribute === prior.attribute
        ) {
          kinds.replacement++;
          if (
            assertion.row.valid_to !== null &&
            (assertion.row.valid_from !== prior.valid_from ||
              assertion.row.valid_to !== prior.valid_to)
          )
            kinds.boundedCorrection++;
        }
      if (assertions.some((a) => a.row.id === retract.id)) kinds.selfRetraction++;
    }
    if (assertions.some((a) => a.row.valid_from > history.now)) kinds.futureValid++;
    const attempt = history.attempts?.find(
      (a) =>
        a.id === commit.receipt?.attemptId &&
        a.status === "committed" &&
        a.position === commit.position,
    );
    const receiptValid =
      attempt &&
      commit.receipt?.position === commit.position &&
      commit.receipt.instant === commit.instant;
    if (
      receiptValid &&
      commit.nested &&
      commit.nested.ordinal > 1 &&
      commit.position % 1024 !== 0 &&
      history.commits.some(
        (c) =>
          c.nested?.callback === commit.nested!.callback &&
          c.nested.ordinal < commit.nested!.ordinal &&
          c.position < commit.position,
      )
    )
      kinds.nestedOrdinal++;
    if (receiptValid && !commit.writes.length) {
      if (commit.claims?.length) kinds.claimsOnly++;
      else kinds.positionOnly++;
    }
    if (index && commit.instant === history.commits[index - 1]!.instant) kinds.sameMillisecond++;
    if (index && commit.instant < history.commits[index - 1]!.instant) kinds.clockRollback++;
    for (const write of commit.writes) {
      if (write.op === "assert") live.set(write.row.id, write.row);
      else live.delete(write.id);
    }
  }
  const attempts = history.attempts ?? [];
  const stagingClock = [...attempts].sort((a, b) => a.stagedOrder - b.stagedOrder);
  kinds.clockRollback = stagingClock.filter(
    (a, index) => index > 0 && a.stagedAt < stagingClock[index - 1]!.stagedAt,
  ).length;
  const aborted = attempts.filter(
    (a) =>
      a.status === "aborted" &&
      a.reason === "CAS-conflict" &&
      a.writes?.length &&
      a.conflict?.expected === "live" &&
      a.conflict.observed === "retracted" &&
      history.commits.some(
        (c) =>
          c.position < a.position &&
          c.writes.some((w) => w.op === "retract" && w.id === a.conflict!.id),
      ) &&
      a.writes.every(
        (w) =>
          w.op !== "assert" ||
          !history.commits.some((c) =>
            c.writes.some((actual) => actual.op === "assert" && actual.row.id === w.row.id),
          ),
      ) &&
      !history.commits.some((c) => c.position === a.position),
  );
  kinds.casAbort = aborted.length;
  for (const a of attempts.filter((a) => a.status === "committed"))
    for (const b of attempts.filter((b) => b.status === "committed")) {
      const ac = history.commits.find((c) => c.receipt?.attemptId === a.id),
        bc = history.commits.find((c) => c.receipt?.attemptId === b.id);
      if (
        ac &&
        bc &&
        a.stagedOrder < b.stagedOrder &&
        a.decidedOrder > b.decidedOrder &&
        a.stagedAt < b.stagedAt &&
        ac.writes.some(
          (x) =>
            x.op === "assert" &&
            bc.writes.some((y) => y.op === "assert" && y.row.entity_id !== x.row.entity_id),
        )
      )
        kinds.stageInversion++;
    }
  const positions = requests
    .filter((r) => routeShape(r) === "P")
    .map((r) => r.basis.recordedPosition);
  const times = requests.filter((r) => routeShape(r) === "T").map((r) => r.basis.recordedAt);
  const vs = requests.filter((r) => routeShape(r) === "V").map((r) => r.basis.validAt);
  const rows = history.commits.flatMap((c) =>
    c.writes.flatMap((w) => (w.op === "assert" ? [w.row] : [])),
  );
  const horizons = routeRetentionHorizons(history);
  const cuts = {
    everyPosition: history.commits.every((c) => positions.includes(c.position)),
    nestedReceipts: history.commits
      .filter((c) => c.nested)
      .every((c) => positions.includes(c.position)),
    abortGaps: aborted.length > 0 && aborted.every((a) => positions.includes(a.position + 1)),
    pinnedHorizon: [horizons[0]!, horizons[0]! - 1].every((p) => positions.includes(p)),
    unpinnedHorizon: [horizons[1]!, horizons[1]! - 1].every((p) => positions.includes(p)),
    everyRecordBoundary: history.commits.every((c) =>
      [-0.5, 0, 0.5].every((d) => times.includes(c.instant + d)),
    ),
    everyValidBoundary: rows.every((r) =>
      [r.valid_from, ...(r.valid_to === null ? [] : [r.valid_to])].every((v) =>
        [-1, 0, 1].every((d) => vs.includes(v + d)),
      ),
    ),
    omittedValidAt: requests.some((r) => r.basis.validAt === undefined),
    now: vs.includes(history.now),
    futurePosition: positions.includes(routeHead(history) + 1),
    futureRecordTime: times.some((t) => t! > Math.max(...history.commits.map((c) => c.instant))),
    earlierTThanP: requests.some(
      (r) =>
        routeShape(r) === "TP" &&
        history.commits.some(
          (c) => c.position === r.basis.recordedPosition && c.instant > r.basis.recordedAt!,
        ),
    ),
    laterTThanP: requests.some(
      (r) =>
        routeShape(r) === "TP" &&
        history.commits.some(
          (c) => c.position === r.basis.recordedPosition && c.instant < r.basis.recordedAt!,
        ),
    ),
    entityHistoryAtEveryPosition: [...new Set(rows.map((r) => r.entity_id))].every((entityId) =>
      history.commits.every((c) =>
        requests.some(
          (r) => r.history && r.entityId === entityId && r.basis.recordedPosition === c.position,
        ),
      ),
    ),
  };
  const shapes = Object.fromEntries(
    ["L", "V", "P", "T", "TP", "H"].map((shape) => [
      shape,
      requests.filter((r) => routeShape(r) === shape).length,
    ]),
  );
  const missing = [
    ...requiredRouteHistoryKinds.filter((kind) => kinds[kind] < 1),
    ...Object.entries(cuts)
      .filter(([, present]) => !present)
      .map(([name]) => name),
    ...Object.entries(shapes)
      .filter(([, count]) => count < 1)
      .map(([name]) => `shape:${name}`),
  ];
  return {
    seed: history.seed,
    commits: history.commits.length,
    kinds,
    cuts,
    shapes,
    missing,
    receiptIdentities: history.commits.map((c) => c.receipt),
    stagingClock: stagingClock.map((a) => ({
      attemptId: a.id,
      stagedOrder: a.stagedOrder,
      instant: a.stagedAt,
    })),
    abortedAttempts: aborted,
    retentionHorizons: horizons,
    pendingEngineEvents: ["index-job", "flush", "compaction"],
    complete: missing.length === 0,
  };
};

export const requireRouteCoverage = (history: RouteHistory, requests?: readonly RouteRequest[]) => {
  const coverage = measureRouteCoverage(history, requests);
  if (!coverage.complete) throw new Error(`Missing R31 coverage: ${coverage.missing.join(", ")}`);
  return coverage;
};
