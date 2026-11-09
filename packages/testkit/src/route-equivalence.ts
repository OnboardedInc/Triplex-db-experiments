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
export interface RouteCommit {
  readonly position: number;
  readonly instant: number;
  readonly writes: readonly RouteWrite[];
}
export interface RouteHistory {
  readonly seed: number;
  readonly now: number;
  readonly commits: readonly RouteCommit[];
}
export type RouteEvent = "purge" | "catch-up" | "cold-cache";
export type RouteRefusalTag =
  | "BasisNotAvailable"
  | "ReplicaUnavailable"
  | "SnapshotExpired"
  | "DatalogValidationError";
export class RouteRefusal extends Error {
  constructor(
    readonly _tag: RouteRefusalTag,
    message: string,
  ) {
    super(message);
  }
}
export interface RouteAnswer {
  readonly rows: readonly TripleRow[];
  readonly taken: string;
  readonly basis?: RouteBasis;
}
export interface RouteDriver {
  readonly id: string;
  /** False declares that this route cannot serve this exact basis in this snapshot. */
  readonly eligible: (request: RouteRequest, history: RouteHistory) => boolean;
  readonly refusals: readonly RouteRefusalTag[];
  readonly force: () => void | Promise<void>;
  readonly read: (request: RouteRequest) => Promise<RouteAnswer>;
}
export interface RouteFixture {
  readonly lane: string;
  readonly routes: readonly RouteDriver[];
  readonly reset: (history: RouteHistory) => void | Promise<void>;
  readonly append: (commit: RouteCommit) => void | Promise<void>;
  readonly event: (event: RouteEvent) => void | Promise<void>;
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
): readonly TripleRow[] => {
  const {
    recordedAt: time = Infinity,
    recordedPosition: position = routeHead(history),
    validAt = history.now,
  } = request.basis;
  if (position > routeHead(history)) throw new RouteRefusal("BasisNotAvailable", "Future position");
  return foldRouteHistory(history).filter(
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
};

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
  if (!Number.isSafeInteger(count) || count < 8)
    throw new RangeError("At least eight commits required");
  let state = seed >>> 0;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state;
  };
  const commits: RouteCommit[] = [];
  const add = (writes: RouteWrite[], index: number) =>
    commits.push({ position: (index + 1) * 1024, instant: 1000 + Math.floor(index / 2), writes });
  for (let index = 0; index < count; index++) {
    const subject = `subject:${random() % 6}`;
    const row = routeRow(`row:${index}`, subject, `value:${random()}`);
    switch (index % 8) {
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
            { op: "assert", row },
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
            { op: "assert", row: { ...row, valid_from: -20, valid_to: 50 } },
          ],
          index,
        );
        break;
      default:
        add([{ op: "assert", row: { ...row, valid_from: 3000 } }], index);
    }
  }
  return { seed, now: 2000, commits };
};

export const generateRouteBases = (
  history: RouteHistory,
  full = false,
): readonly RouteRequest[] => {
  const positions = [
    ...new Set([
      0,
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
  readonly rule: "HE-1" | "HE-2" | "HE-3" | "HE-4" | "HE-5" | "HE-6" | "HE-7" | "forcing";
  readonly route: string;
  readonly request: RouteRequest;
  readonly phase: string;
  readonly detail: string;
}
export interface RouteObservation {
  readonly route: string;
  readonly request: RouteRequest;
  readonly phase: string;
  readonly outcome: string;
}
export interface RouteEquivalenceResult {
  readonly seed: number;
  readonly lane: string;
  readonly reference: string;
  readonly observations: readonly RouteObservation[];
  readonly violations: readonly RouteViolation[];
}

/** Returns all failures, including expected defect fixtures; callers must assert violations explicitly. */
export const runRouteEquivalence = async (options: {
  readonly fixture: RouteFixture;
  readonly history: RouteHistory;
  readonly requests?: readonly RouteRequest[];
  readonly extension?: RouteCommit;
  /** Supply an independently implemented oracle for qualification; the default is diagnostic only. */
  readonly reference?: {
    readonly name: string;
    readonly answer: (
      history: RouteHistory,
      request: RouteRequest,
    ) => readonly TripleRow[] | Promise<readonly TripleRow[]>;
  };
}): Promise<RouteEquivalenceResult> => {
  const { fixture } = options;
  if (
    !fixture.routes.length ||
    new Set(fixture.routes.map((r) => r.id)).size !== fixture.routes.length
  )
    throw new Error("Routes must be nonempty and have unique IDs");
  let history = options.history;
  const requests = (options.requests ?? generateRouteBases(history)).map((request) =>
    Object.freeze({ ...request, basis: Object.freeze({ ...request.basis }) }),
  );
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
  await fixture.reset(history);
  const phase = async (name: string, repeat: boolean) => {
    for (const request of requests) {
      const future = (request.basis.recordedPosition ?? 0) > routeHead(history);
      const expected = future
        ? undefined
        : canonicalRouteRows(
            await (options.reference?.answer ?? replayRouteAnswer)(history, request),
          );
      const answers: string[] = [];
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
          if (canonical !== expected) fail("HE-1", "Answer differs from offline replay");
          if (
            answer.basis !== undefined &&
            canonicalRouteValue(answer.basis) !== canonicalRouteValue(request.basis)
          )
            fail("HE-7", "Basis echo differs from request");
          answers.push(canonical);
          const key = `${route.id}:${canonicalRouteValue(request)}`;
          const pinned =
            request.basis.recordedAt !== undefined || request.basis.recordedPosition !== undefined;
          if (repeat && pinned && previous.has(key) && previous.get(key) !== canonical)
            fail("HE-5", "Identical pinned request changed after maintenance/commit");
          if (!repeat) previous.set(key, canonical);
          observations.push({
            route: route.id,
            request,
            phase: name,
            outcome: `answer:sha256:${hash(canonical)}:count:${answer.rows.length}`,
          });
        } catch (error) {
          const tag = error instanceof Error && "_tag" in error ? error._tag : undefined;
          if (eligible || !route.refusals.includes(tag as RouteRefusalTag))
            fail("HE-3", `Undeclared refusal: ${String(error)}`);
          observations.push({
            route: route.id,
            request,
            phase: name,
            outcome: `refuse:${String(tag)}`,
          });
        }
      }
      if (new Set(answers).size > 1)
        violations.push({
          rule: "HE-2",
          route: "*",
          request,
          phase: name,
          detail: "Routes disagree",
        });
      if (!future && !answers.length)
        violations.push({
          rule: "HE-4",
          route: "*",
          request,
          phase: name,
          detail: "No route answered",
        });
    }
  };
  await phase("initial", false);
  const extension = options.extension ?? {
    position: routeHead(history) + 2048,
    instant: Math.max(...history.commits.map((c) => c.instant)) + 10,
    writes: [{ op: "assert" as const, row: routeRow("extension", "extension", "new") }],
  };
  await fixture.append(extension);
  history = { ...history, commits: [...history.commits, extension] };
  await phase("append", true);
  for (const event of ["purge", "catch-up", "cold-cache"] as const) {
    await fixture.event(event);
    await phase(event, true);
  }
  return {
    seed: history.seed,
    lane: fixture.lane,
    reference: options.reference?.name ?? "offline-fold-not-independent",
    observations,
    violations,
  };
};

export const makeRouteEquivalenceCases = (options: Parameters<typeof runRouteEquivalence>[0]) => [
  {
    name: `${options.fixture.lane} route equivalence seed ${options.history.seed}`,
    run: async () => {
      const result = await runRouteEquivalence(options);
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
