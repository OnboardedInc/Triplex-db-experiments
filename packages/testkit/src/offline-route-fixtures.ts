import type { TripleRow } from "@triplex-build/triplex/runtime";
import {
  foldRouteHistory,
  decideRouteCommit,
  routeFuture,
  snapshotRouteRows,
  routeHead,
  routeRetentionHorizons,
  RouteRefusal,
  type RouteFixture,
  type RouteHistory,
  type RouteRequest,
  type RouteRetentionCut,
} from "./route-equivalence.js";

/**
 * Semantic route models, not engine qualification. Q1-Q3/Q5 model the broker
 * design in R31; they do not claim broker source exists in this checkout.
 */
export const makeOfflineRouteFixture = (
  lane: "xtdb" | "qlever",
  options: {
    readonly preFixH1?: boolean;
    readonly decider?: "decided" | "staged-stamps";
  } = {},
): RouteFixture => {
  let history: RouteHistory = { seed: 0, now: 0, commits: [] };
  let source: readonly TripleRow[] = [],
    replica: readonly TripleRow[] = [];
  let forced = "",
    horizon = 0;
  const cache = new Map<string, readonly TripleRow[]>();
  const ids =
    lane === "xtdb"
      ? ["X1-all-valid-time", "X6-cold", "X6-warm"]
      : [
          "Q1-replica",
          "Q2-overlay",
          "Q3-source-after-eviction",
          "Q5-outage-source",
          "Q5-h1-disabled",
          ...(options.preFixH1 ? ["Q4-pre-fix-H1"] : []),
        ];
  const visible = (rows: readonly TripleRow[], request: RouteRequest) => {
    const basis = request.basis;
    return rows.filter((row) => {
      if (request.entityId !== undefined && request.entityId !== row.entity_id) return false;
      if (row.recorded_position > (basis.recordedPosition ?? routeHead(history))) return false;
      if (basis.recordedAt !== undefined && row.recorded_at > basis.recordedAt) return false;
      if (request.history) return true;
      const retired =
        row.retracted_at !== null &&
        row.retracted_position !== null &&
        row.retracted_position <= (basis.recordedPosition ?? routeHead(history)) &&
        row.retracted_at <= (basis.recordedAt ?? Infinity);
      const valid = basis.validAt ?? history.now;
      return !retired && row.valid_from <= valid && (row.valid_to === null || row.valid_to > valid);
    });
  };
  return {
    lane: `${lane}-offline-model`,
    decide: (input, previous) => decideRouteCommit(input, previous, options.decider),
    reset: (next) => {
      history = next;
      source = foldRouteHistory(next);
      replica = [];
      horizon = 0;
      cache.clear();
    },
    append: (commit) => {
      history = {
        ...history,
        commits: [...history.commits, commit],
        ...(history.attempts && commit.receipt
          ? {
              attempts: [
                ...history.attempts,
                {
                  id: commit.receipt.attemptId,
                  status: "committed" as const,
                  position: commit.position,
                  stagedAt: commit.stagedAt ?? commit.instant,
                  stagedOrder: Math.max(...history.attempts.map((a) => a.stagedOrder)) + 1,
                  decidedOrder: Math.max(...history.attempts.map((a) => a.decidedOrder)) + 1,
                },
              ],
            }
          : {}),
      };
      source = foldRouteHistory(history);
      cache.clear();
    },
    event: (event, context) => {
      if (["index-job", "flush", "compaction"].includes(event))
        return { status: "pending", reason: "Requires live engine qualification" };
      if (event === "purge" || event === "purge-pinned")
        horizon = context?.horizon ?? routeHead(history);
      if (event === "catch-up") replica = source;
      if (event === "cold-cache") cache.clear();
      if (event === "evict-overlay") replica = [];
      return {
        status: "model-applied",
        reason: "Offline semantic event only; not engine qualification",
        ...(event === "purge" || event === "purge-pinned"
          ? { retirement: { horizon, pinned: event === "purge-pinned" } }
          : {}),
      };
    },
    routes: ids.map((id) => ({
      id,
      contract: "snapshot",
      retention: {
        kind: id === "Q4-pre-fix-H1" ? "position-retired" : "complete",
        plan: (current, extension): readonly RouteRetentionCut[] => {
          const [pinned, unpinned] = routeRetentionHorizons(current, extension.position);
          return [
            { id: "pinned", event: "purge-pinned", horizon: pinned!, pinned: true },
            { id: "unpinned", event: "purge", horizon: unpinned!, pinned: false },
          ];
        },
      },
      eligible: (request, current) => !routeFuture(request, current),
      refusals: ["BasisNotAvailable"],
      force: () => {
        forced = id;
        if (id === "Q1-replica") replica = source;
        if (id === "Q2-overlay") replica = [];
        if (id === "X6-cold") cache.clear();
      },
      read: async (request) => {
        const position = request.basis.recordedPosition ?? routeHead(history);
        if (routeFuture(request, history))
          throw new RouteRefusal("BasisNotAvailable", "Future position");
        let candidates = source;
        if (forced === "Q1-replica") candidates = replica;
        if (forced === "Q2-overlay") {
          const merged = new Map(replica.map((row) => [row.id, row]));
          for (const row of source) merged.set(row.id, row);
          candidates = [...merged.values()];
        }
        // [EXP-RQ01] Why: preserve SQL01 F1's pre-fix selection before filtering T.
        // Rejected: filtering record time first (would conceal the 30/40 defect).
        if (forced === "Q4-pre-fix-H1" && position >= horizon && !request.history)
          candidates = source.filter(
            (row) => row.retracted_position === null || row.retracted_position > position,
          );
        const key = JSON.stringify(request);
        let rows = visible(candidates, request);
        if (forced.startsWith("X6")) {
          rows = [...(cache.get(key) ?? rows)];
          cache.set(key, rows);
        }
        return {
          rows: snapshotRouteRows(rows, request, routeHead(history)),
          taken: forced,
          basis: {
            ...request.basis,
            ...(request.basis.recordedAt !== undefined ? { recordedPosition: position } : {}),
          },
        };
      },
    })),
  };
};

/** Explicit unimplemented adapters: never count these as tested routes or passing gates. */
export const pendingRouteAdapters = [
  {
    lane: "qlever",
    route: "Q4-H1",
    status: "unimplemented",
    ruling: "Q89b/Q89c",
    required:
      "Bind broker outage and disabled-H1 hooks; refuse T/TP, history and cuts below horizon with typed errors.",
  },
  {
    lane: "datomic",
    route: "D1-current/D2-as-of/D3-held/D4-with/D6-multi-request",
    status: "unimplemented",
    ruling: "Q89d/Q89e",
    required:
      "Force current/as-of and cold P-to-t map; pin all requests; inject a commit between query and optional pull.",
  },
] as const;
