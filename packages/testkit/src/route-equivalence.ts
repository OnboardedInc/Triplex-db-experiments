import { instantOf, nextStamp, stampOf } from "@triplex-build/triplex";
import { validateRouteHistory } from "./route-history-grammar.js";
import { requireRouteCoverage } from "./route-coverage.js";
import { Sha256 } from "@triplex-build/triplex/content";
import type { TripleRow } from "@triplex-build/triplex/runtime";

export type RouteShape = "L" | "V" | "P" | "T" | "TP" | "H";
export interface RouteBasis {
  readonly validAt?: number;
  readonly recordedAt?: number;
  readonly recordedPosition?: number;
}
export interface RouteRequest {
  readonly basis: RouteBasis;
  readonly entityId?: string;
  readonly history?: boolean;
}
export type RouteWrite =
  | { readonly op: "assert"; readonly row: TripleRow }
  | { readonly op: "retract"; readonly id: string };
export type RouteResultContract = "snapshot" | "raw-lifetime";
export interface RouteAttempt {
  readonly id: string;
  readonly status: "committed" | "aborted";
  readonly position: number;
  readonly stagedAt: number;
  readonly stagedOrder: number;
  readonly decidedOrder: number;
  readonly reason?: "CAS-conflict";
  readonly writes?: readonly RouteWrite[];
  readonly conflict?: {
    readonly id: string;
    readonly expected: "live";
    readonly observed: "retracted";
  };
}
export interface RouteCommit {
  readonly stagedAt?: number;
  readonly position: number;
  readonly instant: number;
  readonly writes: readonly RouteWrite[];
  readonly receipt?: {
    readonly attemptId: string;
    readonly position: number;
    readonly instant: number;
  };
  readonly nested?: { readonly callback: string; readonly ordinal: number; readonly size: number };
  readonly claims?: readonly string[];
}
export type RouteCommitInput = Omit<RouteCommit, "instant"> & {
  readonly instant?: number;
  readonly stagedAt: number;
};
/** Offline decisions only; live fixtures bind the receipt's instant instead. */
export const decideRouteCommit = (
  input: RouteCommitInput,
  previous: RouteCommit | undefined,
  mode: "decided" | "staged-stamps" = "decided",
): RouteCommit => {
  const sameTransaction =
    input.nested !== undefined && input.nested.callback === previous?.nested?.callback;
  const instant =
    input.instant ??
    (mode === "staged-stamps"
      ? input.stagedAt
      : sameTransaction
        ? previous!.instant
        : instantOf(nextStamp(previous ? stampOf(previous.instant) : 0, input.stagedAt)));
  return {
    ...input,
    instant,
    ...(input.receipt ? { receipt: { ...input.receipt, instant } } : {}),
  };
};
export const routeWatermark = (history: RouteHistory): number =>
  Math.max(0, ...history.commits.map((commit) => commit.instant));
export const routeUnavailableAxis = (
  request: RouteRequest,
  history: RouteHistory,
): "recordedPosition" | "recordedAt" | undefined =>
  (request.basis.recordedPosition ?? 0) > routeHead(history)
    ? "recordedPosition"
    : (request.basis.recordedAt ?? 0) > routeWatermark(history)
      ? "recordedAt"
      : undefined;
export const routeFuture = (request: RouteRequest, history: RouteHistory): boolean =>
  routeUnavailableAxis(request, history) !== undefined;
export const routeBasisRefusal = (
  request: RouteRequest,
  history: RouteHistory,
  surface = "offline-route",
): RouteRefusal => {
  const axis = routeUnavailableAxis(request, history);
  if (!axis) throw new Error("The route basis is available");
  return new RouteRefusal("BasisNotAvailable", "Future basis", {
    axis,
    required: request.basis[axis]!,
    observed: axis === "recordedAt" ? routeWatermark(history) : routeHead(history),
    waitedMs: 0,
    surface,
  });
};

export interface RouteHistory {
  readonly seed: number;
  readonly now: number;
  readonly commits: readonly RouteCommit[];
  readonly attempts?: readonly RouteAttempt[];
}
export type RouteEvent =
  | "purge-pinned"
  | "purge"
  | "catch-up"
  | "cold-cache"
  | "evict-overlay"
  | "index-job"
  | "flush"
  | "compaction";
export interface RouteEventContext {
  readonly horizon: number;
  readonly pinned: boolean;
  readonly routes?: readonly string[];
  readonly cutId?: string;
}
export interface RouteEventOutcome {
  readonly status: "model-applied" | "applied" | "pending";
  readonly reason: string;
  readonly retirement?: { readonly horizon: number; readonly pinned: boolean };
}
export type RouteRefusalTag =
  | "BasisNotAvailable"
  | "ReplicaUnavailable"
  | "SnapshotExpired"
  | "DatalogValidationError";
export class RouteRefusal extends Error {
  readonly axis?: "recordedPosition" | "recordedAt";
  readonly required?: number;
  readonly observed?: number;
  readonly waitedMs?: number;
  readonly surface?: string;
  constructor(
    readonly _tag: RouteRefusalTag,
    message: string,
    details?: {
      axis: "recordedPosition" | "recordedAt";
      required: number;
      observed: number;
      waitedMs: number;
      surface: string;
    },
  ) {
    super(message);
    Object.assign(this, details);
  }
}
export interface RouteAnswer {
  readonly rows: readonly TripleRow[];
  readonly taken: string;
  readonly basis?: RouteBasis;
}
export interface RouteDriver {
  readonly id: string;
  readonly contract: RouteResultContract;
  readonly retention: {
    readonly kind: "complete" | "position-retired";
    readonly plan: (history: RouteHistory, extension: RouteCommit) => readonly RouteRetentionCut[];
  };
  /** False declares that this route cannot serve this exact basis in this snapshot. */
  readonly eligible: (request: RouteRequest, history: RouteHistory) => boolean;
  readonly refusals: readonly RouteRefusalTag[];
  readonly force: () => void | Promise<void>;
  readonly read: (request: RouteRequest) => Promise<RouteAnswer>;
}
export interface RouteRetentionCut {
  readonly id: string;
  readonly event: "purge-pinned" | "purge";
  readonly horizon: number;
  readonly pinned: boolean;
}
export interface RouteExecutionPlan {
  readonly history: RouteHistory;
  readonly extension: RouteCommit;
  readonly extensionAttempt: RouteAttempt | null;
  readonly requests: readonly RouteRequest[];
  readonly policies: readonly {
    readonly route: string;
    readonly kind: "complete" | "position-retired";
    readonly cuts: readonly RouteRetentionCut[];
  }[];
  readonly digest: string;
}
export interface RouteFixture {
  readonly lane: string;
  readonly routes: readonly RouteDriver[];
  readonly decide?: (input: RouteCommitInput, previous?: RouteCommit) => RouteCommit;
  readonly reset: (history: RouteHistory) => void | Promise<void>;
  readonly append: (commit: RouteCommit) => void | Promise<void>;
  readonly event: (
    event: RouteEvent,
    context?: RouteEventContext,
  ) => void | RouteEventOutcome | Promise<void | RouteEventOutcome>;
}

export const routeShape = (request: RouteRequest): RouteShape =>
  request.history
    ? "H"
    : request.basis.recordedAt !== undefined
      ? request.basis.recordedPosition !== undefined
        ? "TP"
        : "T"
      : request.basis.recordedPosition !== undefined
        ? "P"
        : request.basis.validAt !== undefined
          ? "V"
          : "L";

// [EXP-RQ01] Why: tagged scalar encodings preserve -0 and avoid number/string collisions.
// Rejected: JSON.stringify alone (loses -0 and object key order).
export const canonicalRouteValue = (value: unknown): string => {
  if (value === null) return "null";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("Nonfinite route value");
    return `n:${Object.is(value, -0) ? "-0" : String(value)}`;
  }
  if (typeof value === "string") return `s:${JSON.stringify(value)}`;
  if (typeof value === "boolean") return `b:${value}`;
  if (Array.isArray(value)) return `[${value.map(canonicalRouteValue).join(",")}]`;
  if (typeof value === "object")
    return `{${Object.keys(value)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${canonicalRouteValue((value as Record<string, unknown>)[key])}`,
      )
      .join(",")}}`;
  throw new TypeError(`Unsupported route value: ${typeof value}`);
};
export const canonicalRouteRows = (rows: readonly TripleRow[]): string =>
  canonicalRouteValue(rows.map(canonicalRouteValue).sort());

export const routeHead = (history: RouteHistory): number => history.commits.at(-1)?.position ?? 0;

/** Offline fold only; independent O-REPLAY remains a separate qualification gate. */
export const foldRouteHistory = (history: RouteHistory): readonly TripleRow[] => {
  validateRouteHistory(history);
  const rows = new Map<string, TripleRow>();
  for (const commit of history.commits)
    for (const write of commit.writes) {
      if (write.op === "assert") {
        if (rows.has(write.row.id)) throw new Error(`Duplicate assertion ${write.row.id}`);
        rows.set(write.row.id, {
          ...write.row,
          recorded_at: commit.instant,
          recorded_position: commit.position,
        });
      } else {
        const row = rows.get(write.id);
        if (!row) throw new Error(`Missing assertion ${write.id}`);
        rows.set(write.id, {
          ...row,
          retracted_at: commit.instant,
          retracted_position: commit.position,
          retract_tx_id: `tx:${commit.position}`,
        });
      }
    }
  return [...rows.values()];
};
export const replayRouteAnswer = (
  history: RouteHistory,
  request: RouteRequest,
  contract: RouteResultContract = "snapshot",
): readonly TripleRow[] => {
  const {
    recordedAt: time = Infinity,
    recordedPosition: position = routeHead(history),
    validAt = history.now,
  } = request.basis;
  if (routeFuture(request, history)) throw routeBasisRefusal(request, history);
  const rows = foldRouteHistory(history).filter(
    (row) =>
      (request.entityId === undefined || row.entity_id === request.entityId) &&
      row.recorded_position <= position &&
      row.recorded_at <= time &&
      (request.history ||
        ((row.retracted_position === null ||
          row.retracted_position > position ||
          row.retracted_at === null ||
          row.retracted_at > time) &&
          row.valid_from <= validAt &&
          (row.valid_to === null || validAt < row.valid_to))),
  );
  return contract === "snapshot" ? snapshotRouteRows(rows, request, routeHead(history)) : rows;
};

// [EXP-RQ01] Why: Q89i hides a later retirement, including all its metadata.
// Rejected: comparing only IDs/values (would miss incorrect in-cut retirement metadata).
export const snapshotRouteRows = (
  rows: readonly TripleRow[],
  request: RouteRequest,
  head: number,
): readonly TripleRow[] =>
  rows.map((row) =>
    row.retracted_position !== null &&
    (row.retracted_position > (request.basis.recordedPosition ?? head) ||
      (row.retracted_at !== null && row.retracted_at > (request.basis.recordedAt ?? Infinity)))
      ? { ...row, retracted_at: null, retracted_position: null, retract_tx_id: null }
      : row,
  );

export const routeRow = (
  id: string,
  entityId: string,
  value: string,
  validFrom = 0,
  validTo: number | null = null,
): TripleRow => ({
  id,
  entity_id: entityId,
  attribute: ":route/value",
  value_type: "string",
  value_string: value,
  value_number: null,
  value_boolean: null,
  value_datetime: null,
  value_json: null,
  recorded_at: 0,
  recorded_position: 0,
  valid_from: validFrom,
  valid_to: validTo,
  created_by: "route-fixture",
  retracted_at: null,
  retracted_position: null,
  retract_tx_id: null,
  entity_type: "RouteSubject",
  schema_version: 1,
  tx_id: `tx:${id}`,
});

/** Each seed includes every required operation; random choices vary subjects and bounded valid intervals. */
export const generateRouteHistory = (seed = 1, count = 40): RouteHistory => {
  if (!Number.isSafeInteger(count) || count < 16)
    throw new RangeError("At least sixteen commits required");
  let state = seed >>> 0;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state;
  };
  const commits: RouteCommit[] = [];
  const attempts: RouteAttempt[] = [];
  const add = (writes: RouteWrite[], index: number, extra: Partial<RouteCommit> = {}) => {
    const position = index % 16 === 9 ? index * 1024 + 1 : (index + 1) * 1024;
    const stagedAt =
      1000 + Math.floor(index / 2) - (index % 16 === 14 ? 2 : index % 16 === 15 ? 3 : 0);
    const instant =
      extra.nested?.callback === commits.at(-1)?.nested?.callback && extra.nested
        ? commits.at(-1)!.instant
        : instantOf(nextStamp(commits.length ? stampOf(commits.at(-1)!.instant) : 0, stagedAt));
    const id = `attempt:${index}`;
    const stagedOrder = index % 16 === 13 ? index + 1 : index % 16 === 14 ? index - 1 : index;
    attempts.push({
      id,
      status: "committed",
      position,
      stagedAt,
      stagedOrder,
      decidedOrder: index,
    });
    commits.push({
      position,
      stagedAt,
      instant,
      writes,
      receipt: { attemptId: id, position, instant },
      ...extra,
    });
  };
  const prior = (id: string) => {
    const row = commits.flatMap((c) => c.writes).find((w) => w.op === "assert" && w.row.id === id);
    if (!row || row.op !== "assert") throw new Error(`Missing replacement target ${id}`);
    return row.row;
  };
  for (let index = 0; index < count; index++) {
    const subject = `subject:${random() % 6}`;
    const row = routeRow(`row:${index}`, subject, `value:${random()}`);
    switch (index % 16) {
      case 0:
        add(
          Array.from({ length: 40 }, (_, n) => ({
            op: "assert",
            row: routeRow(`group:${index}:${n}`, subject, `${n}`),
          })),
          index,
        );
        break;
      case 1:
        add(
          Array.from({ length: 10 }, (_, n) => ({ op: "retract", id: `group:${index - 1}:${n}` })),
          index,
        );
        break;
      case 2:
        add(
          [
            { op: "assert", row },
            { op: "assert", row: { ...row, id: `${row.id}:many`, value_string: "second" } },
          ],
          index,
        );
        break;
      case 3:
        add(
          [
            { op: "retract", id: `row:${index - 1}` },
            {
              op: "assert",
              row: {
                ...row,
                entity_id: prior(`row:${index - 1}`).entity_id,
                attribute: prior(`row:${index - 1}`).attribute,
              },
            },
          ],
          index,
        );
        break;
      case 4:
        add(
          [
            { op: "assert", row },
            { op: "retract", id: row.id },
          ],
          index,
        );
        break;
      case 5:
        add(
          [{ op: "assert", row: { ...row, valid_from: -30, valid_to: 20 + (random() % 20) } }],
          index,
        );
        break;
      case 6:
        add(
          [
            { op: "retract", id: `row:${index - 1}` },
            {
              op: "assert",
              row: {
                ...row,
                entity_id: prior(`row:${index - 1}`).entity_id,
                attribute: prior(`row:${index - 1}`).attribute,
                valid_from: -20,
                valid_to: 50,
              },
            },
          ],
          index,
        );
        break;
      case 7:
        add([{ op: "assert", row: { ...row, valid_from: 3000 } }], index);
        break;
      case 8:
      case 9:
        add([{ op: "assert", row }], index, {
          nested: {
            callback: `callback:${Math.floor(index / 16)}`,
            size: 2,
            ordinal: (index % 16) - 7,
          },
        });
        break;
      case 10:
        add([], index, { claims: [`claim:${index}`] });
        break;
      case 11:
        add([], index);
        break;
      case 12:
        attempts.push({
          id: `abort:${index}`,
          status: "aborted",
          reason: "CAS-conflict",
          writes: [{ op: "assert", row: routeRow(`aborted:${index}`, subject, "must-not-appear") }],
          conflict: { id: `row:${index - 10}`, expected: "live", observed: "retracted" },
          position: commits.at(-1)!.position + 128,
          stagedAt: 1000 + Math.floor(index / 2),
          stagedOrder: index - 0.5,
          decidedOrder: index - 0.5,
        });
        add([{ op: "assert", row }], index);
        break;
      case 13:
      case 14:
        add(
          [
            {
              op: "assert",
              row: { ...row, entity_id: `subject:${index % 16 === 13 ? 0 : 1}` },
            },
          ],
          index,
        );
        break;
      default:
        add([{ op: "assert", row }], index);
    }
  }
  const history = { seed, now: 2000, commits, attempts };
  validateRouteHistory(history, true);
  return history;
};

export const routeRetentionHorizons = (
  history: RouteHistory,
  extensionPosition = routeHead(history) + 2048,
): readonly number[] => [
  history.commits[Math.floor(history.commits.length / 2)]?.position ?? 0,
  extensionPosition,
];

export const generateRouteBases = (
  history: RouteHistory,
  full = false,
  horizons: readonly number[] = routeRetentionHorizons(history),
): readonly RouteRequest[] => {
  validateRouteHistory(history);
  const positions = [
    ...new Set([
      0,
      ...horizons.flatMap((h) => [h, h - 1]),
      ...(history.attempts ?? [])
        .filter((a) => a.status === "aborted")
        .flatMap((a) => [a.position, a.position + 1]),
      ...history.commits.flatMap((c) => [c.position, c.position + 1]),
      routeHead(history) + 1,
    ]),
  ];
  const times = [
    ...new Set(history.commits.flatMap((c) => [c.instant - 0.5, c.instant, c.instant + 0.5])),
  ];
  const validTimes = [
    ...new Set([
      history.now,
      ...foldRouteHistory(history).flatMap((r) => [
        r.valid_from - 1,
        r.valid_from,
        r.valid_from + 1,
        ...(r.valid_to === null ? [] : [r.valid_to - 1, r.valid_to, r.valid_to + 1]),
      ]),
    ]),
  ];
  const requests: RouteRequest[] = [
    { basis: {} },
    ...validTimes.map((validAt) => ({ basis: { validAt } })),
  ];
  for (const position of positions)
    requests.push({ basis: { validAt: history.now, recordedPosition: position } });
  for (const time of [...times, Math.max(...times) + 1])
    requests.push({ basis: { validAt: history.now, recordedAt: time } });
  const pairs = full
    ? positions.flatMap((p) => times.map((t) => [p, t] as const))
    : Array.from(
        { length: 200 },
        (_, i) => [positions[i % positions.length]!, times[(i * 7) % times.length]!] as const,
      );
  for (const [recordedPosition, recordedAt] of pairs)
    for (const validAt of full ? validTimes : [history.now, -30, 50])
      requests.push({ basis: { recordedPosition, recordedAt, validAt } });
  for (const entityId of new Set(foldRouteHistory(history).map((r) => r.entity_id)))
    for (const recordedPosition of positions)
      requests.push({ basis: { recordedPosition }, entityId, history: true });
  return requests;
};

export interface RouteViolation {
  readonly rule: "HE-1" | "HE-2" | "HE-3" | "HE-4" | "HE-5" | "HE-6" | "HE-7" | "HE-8" | "forcing";
  readonly route: string;
  readonly request: RouteRequest;
  readonly phase: string;
  readonly detail: string;
}
export interface RouteObservation {
  readonly route: string;
  readonly request: RouteRequest;
  readonly phase: string;
  readonly contract: RouteResultContract;
  readonly outcome: string;
}
export interface RouteEquivalenceResult {
  readonly seed: number;
  readonly lane: string;
  readonly reference: string;
  readonly plan: RouteExecutionPlan;
  readonly observations: readonly RouteObservation[];
  readonly coverage: {
    readonly requiredShapes: readonly RouteShape[];
    readonly minimumPerShape: number;
    readonly shapes: Readonly<Record<RouteShape, number>>;
  };
  readonly events: readonly {
    readonly event: RouteEvent;
    readonly context: RouteEventContext;
    readonly outcome: RouteEventOutcome;
  }[];
  readonly violations: readonly RouteViolation[];
}

/** Returns all failures, including expected defect fixtures; callers must assert violations explicitly. */
export interface RouteEquivalenceOptions {
  readonly fixture: RouteFixture;
  readonly history: RouteHistory;
  readonly requests?: readonly RouteRequest[];
  readonly extension?: RouteCommit;
  /** A narrowed diagnostic scope must be explicit; the qualification default requires all shapes. */
  readonly scope?: { readonly shapes: readonly RouteShape[]; readonly minimumPerShape?: number };
  /** Supply an independently implemented oracle for qualification; the default is diagnostic only. */
  readonly reference?: {
    readonly name: string;
    readonly answer: (
      history: RouteHistory,
      request: RouteRequest,
      contract: RouteResultContract,
    ) => readonly TripleRow[] | Promise<readonly TripleRow[]>;
  };
}

const freezeCopy = <T>(value: T): T => {
  const freeze = (input: unknown): void => {
    if (input !== null && typeof input === "object") {
      for (const child of Object.values(input)) freeze(child);
      Object.freeze(input);
    }
  };
  const copy = structuredClone(value);
  freeze(copy);
  return copy;
};

// [EXP-RQ01] Why: one immutable plan binds driver policies, custom append and exact request bytes.
// Rejected: recomputing default horizons after execution (certified the wrong purge plan).
export const makeRouteExecutionPlan = (options: RouteEquivalenceOptions): RouteExecutionPlan => {
  if (
    !options.fixture.routes.length ||
    options.fixture.routes.some((r) => !r.id) ||
    new Set(options.fixture.routes.map((r) => r.id)).size !== options.fixture.routes.length
  )
    throw new Error("Routes must be nonempty and have unique IDs");
  const history = freezeCopy(options.history);
  validateRouteHistory(history);
  let extension = freezeCopy(
    options.extension ?? {
      position: routeHead(history) + 2048,
      instant: Math.max(...history.commits.map((c) => c.instant)) + 10,
      writes: [{ op: "assert" as const, row: routeRow("extension", "extension", "new") }],
    },
  );
  let extensionAttempt: RouteAttempt | null = null;
  if (history.attempts !== undefined) {
    const attemptId = extension.receipt?.attemptId ?? `extension:${extension.position}`;
    extension = freezeCopy({
      ...extension,
      receipt: extension.receipt ?? {
        attemptId,
        position: extension.position,
        instant: extension.instant,
      },
    });
    extensionAttempt = {
      id: attemptId,
      status: "committed",
      position: extension.position,
      stagedAt: extension.stagedAt ?? extension.instant,
      stagedOrder: Math.max(...history.attempts.map((a) => a.stagedOrder)) + 1,
      decidedOrder: Math.max(...history.attempts.map((a) => a.decidedOrder)) + 1,
    };
  }
  validateRouteHistory({
    ...history,
    commits: [...history.commits, extension],
    ...(extensionAttempt ? { attempts: [...history.attempts!, extensionAttempt] } : {}),
  });
  const policies = options.fixture.routes.map((route) => {
    if (!route.retention || !["complete", "position-retired"].includes(route.retention.kind))
      throw new Error(`Route ${route.id} must declare its retention policy`);
    const cuts = freezeCopy(
      route.retention.kind === "complete" && options.scope
        ? []
        : route.retention.plan(history, extension),
    );
    if (route.retention.kind === "position-retired" && !cuts.length)
      throw new Error(`Retired route ${route.id} must declare retirement cuts`);
    if (new Set(cuts.map((c) => c.id)).size !== cuts.length)
      throw new Error(`Duplicate retention cut IDs: ${route.id}`);
    for (const cut of cuts)
      if (
        !cut.id ||
        !Number.isSafeInteger(cut.horizon) ||
        cut.horizon <= 0 ||
        cut.horizon > extension.position ||
        (cut.event !== "purge" && cut.event !== "purge-pinned") ||
        cut.pinned !== (cut.event === "purge-pinned")
      )
        throw new Error(`Invalid retention cut: ${route.id}`);
    return { route: route.id, kind: route.retention.kind, cuts };
  });
  const horizons = policies.flatMap((p) => p.cuts.map((c) => c.horizon));
  const requests = freezeCopy(options.requests ?? generateRouteBases(history, false, horizons));
  if (!requests.length) throw new Error("Route gate requires nonempty requests");
  for (const policy of policies)
    for (const cut of policy.cuts)
      for (const position of [cut.horizon, cut.horizon - 1])
        if (!requests.some((r) => routeShape(r) === "P" && r.basis.recordedPosition === position))
          throw new Error(`Missing retention boundary ${position} for ${policy.route}/${cut.id}`);
  const content = { history, extension, extensionAttempt, policies, requests };
  return freezeCopy({ ...content, digest: Sha256.hex(canonicalRouteValue(content)) });
};

export const runRouteEquivalence = async (
  options: RouteEquivalenceOptions,
): Promise<RouteEquivalenceResult> => {
  const { fixture } = options;
  if (
    !fixture.routes.length ||
    new Set(fixture.routes.map((r) => r.id)).size !== fixture.routes.length
  )
    throw new Error("Routes must be nonempty and have unique IDs");
  const plan = makeRouteExecutionPlan(options);
  let history = plan.history;
  for (const route of fixture.routes)
    if (route.contract !== "snapshot" && route.contract !== "raw-lifetime")
      throw new Error(`Route ${route.id} must declare its result contract`);
  const { extension, requests } = plan;
  const requiredShapes = options.scope?.shapes ?? (["L", "V", "P", "T", "TP", "H"] as const);
  const minimumPerShape = options.scope?.minimumPerShape ?? 1;
  if (
    !requiredShapes.length ||
    requiredShapes.some((shape) => !["L", "V", "P", "T", "TP", "H"].includes(shape)) ||
    !Number.isSafeInteger(minimumPerShape) ||
    minimumPerShape < 1
  )
    throw new Error("Route gate requires nonempty shape scope and positive minimum coverage");
  const shapes = Object.fromEntries(
    ["L", "V", "P", "T", "TP", "H"].map((shape) => [
      shape,
      new Set(requests.filter((r) => routeShape(r) === shape).map(canonicalRouteValue)).size,
    ]),
  ) as Record<RouteShape, number>;
  for (const shape of requiredShapes)
    if (shapes[shape] < minimumPerShape)
      throw new Error(
        `Missing minimum coverage for ${shape}: ${shapes[shape]} < ${minimumPerShape}`,
      );
  const events: { event: RouteEvent; context: RouteEventContext; outcome: RouteEventOutcome }[] =
    [];
  const violations: RouteViolation[] = [],
    observations: RouteObservation[] = [];
  const previous = new Map<string, string>();
  const hashes = new Map<string, string>();
  const hash = (canonical: string) => {
    let value = hashes.get(canonical);
    if (value === undefined) {
      value = Sha256.hex(canonical);
      hashes.set(canonical, value);
    }
    return value;
  };
  const ordered = [...history.commits, extension];
  for (const commit of ordered) {
    try {
      stampOf(commit.instant);
    } catch {
      violations.push({
        rule: "HE-8",
        detail: "Decided instant is not an exact microsecond stamp",
        route: "decider",
        request: { basis: {} },
        phase: "decision",
      });
    }
  }
  for (let i = 1; i < ordered.length; i++) {
    const a = ordered[i - 1]!,
      b = ordered[i]!;
    const nested = b.nested !== undefined && b.nested.callback === a.nested?.callback;
    if (nested ? b.instant !== a.instant : b.instant <= a.instant)
      violations.push({
        rule: "HE-8",
        detail: "Decided instants do not follow transaction order",
        route: "decider",
        request: { basis: {} },
        phase: "decision",
      });
  }
  await fixture.reset(history);
  const phase = async (name: string, repeat: boolean) => {
    for (const request of requests) {
      const future = routeFuture(request, history);
      const expected = new Map<RouteResultContract, string>();
      if (!future)
        for (const contract of new Set(fixture.routes.map((r) => r.contract)))
          expected.set(
            contract,
            canonicalRouteRows(
              await (options.reference?.answer ?? replayRouteAnswer)(history, request, contract),
            ),
          );
      const answers = new Map<RouteResultContract, string[]>();
      for (const route of fixture.routes) {
        const fail = (rule: RouteViolation["rule"], detail: string) =>
          violations.push({ rule, detail, route: route.id, request, phase: name });
        const eligible = route.eligible(request, history) && !future;
        await route.force();
        try {
          const answer = await route.read(request);
          if ("eligible" in answer && answer.eligible === false)
            fail("HE-6", "Ineligible flag reached caller");
          if (answer.taken !== route.id) fail("forcing", `Observed ${answer.taken}`);
          if (!eligible) fail("HE-3", "Ineligible route answered");
          const canonical = canonicalRouteRows(answer.rows);
          if (canonical !== expected.get(route.contract))
            fail("HE-1", "Answer differs from offline replay");
          if (request.basis.recordedAt !== undefined && answer.basis === undefined)
            fail("HE-7", "T-shaped answer omitted its pinned basis");
          if (
            answer.basis !== undefined &&
            canonicalRouteValue(answer.basis) !==
              canonicalRouteValue({
                ...request.basis,
                ...(request.basis.recordedAt !== undefined
                  ? { recordedPosition: request.basis.recordedPosition ?? routeHead(history) }
                  : {}),
              })
          )
            fail("HE-7", "Basis echo differs from request");
          const group = answers.get(route.contract) ?? [];
          group.push(canonical);
          answers.set(route.contract, group);
          const key = `${route.id}:${canonicalRouteValue(request)}`;
          const pinned =
            request.basis.recordedAt !== undefined || request.basis.recordedPosition !== undefined;
          if (
            repeat &&
            pinned &&
            route.contract === "snapshot" &&
            previous.has(key) &&
            previous.get(key) !== canonical
          )
            fail("HE-5", "Identical pinned request changed after maintenance/commit");
          if (!repeat) previous.set(key, canonical);
          observations.push({
            route: route.id,
            request,
            phase: name,
            contract: route.contract,
            outcome: `answer:sha256:${hash(canonical)}:count:${answer.rows.length}`,
          });
        } catch (error) {
          const tag = error instanceof Error && "_tag" in error ? error._tag : undefined;
          const axis = routeUnavailableAxis(request, history);
          if (
            axis &&
            tag === "BasisNotAvailable" &&
            (typeof error !== "object" ||
              error === null ||
              !("axis" in error) ||
              error.axis !== axis ||
              !("required" in error) ||
              error.required !== request.basis[axis])
          )
            fail("HE-3", "Future-basis refusal omitted or changed its axis/required cut");
          if (eligible || !route.refusals.includes(tag as RouteRefusalTag))
            fail("HE-3", `Undeclared refusal: ${String(error)}`);
          observations.push({
            route: route.id,
            request,
            phase: name,
            contract: route.contract,
            outcome: `refuse:${String(tag)}`,
          });
        }
      }
      if ([...answers.values()].some((group) => new Set(group).size > 1))
        violations.push({
          rule: "HE-2",
          route: "*",
          request,
          phase: name,
          detail: "Routes disagree",
        });
      // [EXP-RQ01] Why: a raw-history answer cannot satisfy snapshot availability under Q89i.
      // Rejected: one shared availability counter (would let an unavailable snapshot view pass).
      if (!future)
        for (const contract of expected.keys()) {
          if (!answers.get(contract)?.length)
            violations.push({
              rule: "HE-4",
              route: `*:${contract}`,
              request,
              phase: name,
              detail: `No ${contract} route answered`,
            });
        }
    }
  };
  await phase("initial", false);
  await fixture.append(extension);
  history = {
    ...history,
    commits: [...history.commits, extension],
    ...(plan.extensionAttempt ? { attempts: [...history.attempts!, plan.extensionAttempt] } : {}),
  };
  await phase("append", true);
  const retirementEvents = new Map<string, { cut: RouteRetentionCut; routes: string[] }>();
  for (const policy of plan.policies)
    for (const cut of policy.cuts) {
      const key = canonicalRouteValue(cut);
      const entry = retirementEvents.get(key) ?? { cut, routes: [] };
      entry.routes.push(policy.route);
      retirementEvents.set(key, entry);
    }
  for (const { cut, routes } of retirementEvents.values()) {
    const context = { horizon: cut.horizon, pinned: cut.pinned, routes, cutId: cut.id };
    const outcome = await fixture.event(cut.event, context);
    if (
      !outcome ||
      !["applied", "model-applied"].includes(outcome.status) ||
      outcome.retirement?.horizon !== cut.horizon ||
      outcome.retirement.pinned !== cut.pinned
    )
      throw new Error(`Retention event did not confirm planned boundary ${cut.id}`);
    events.push({ event: cut.event, context, outcome });
    await phase(cut.event, true);
  }
  for (const event of [
    "evict-overlay",
    "catch-up",
    "cold-cache",
    "index-job",
    "flush",
    "compaction",
  ] as const) {
    const context = { horizon: extension.position, pinned: false };
    const outcome = (await fixture.event(event, context)) ?? {
      status: "pending" as const,
      reason: "Driver supplied no event evidence",
    };
    events.push({ event, context, outcome });
    if (outcome.status !== "pending") await phase(event, true);
  }
  return {
    seed: history.seed,
    lane: fixture.lane,
    reference: options.reference?.name ?? "offline-fold-not-independent",
    plan,
    observations,
    coverage: { requiredShapes, minimumPerShape, shapes },
    events,
    violations,
  };
};

export const makeRouteEquivalenceCases = (options: Parameters<typeof runRouteEquivalence>[0]) => [
  {
    name: `${options.fixture.lane} route equivalence seed ${options.history.seed}`,
    run: async () => {
      const result = await runRouteEquivalence(options);
      if (!options.scope)
        requireRouteCoverage(result.plan.history, result.plan.requests, result.plan);
      if (result.violations.length)
        throw new Error(
          JSON.stringify({
            count: result.violations.length,
            first: result.violations.slice(0, 20),
          }),
        );
      return result;
    },
  },
];
