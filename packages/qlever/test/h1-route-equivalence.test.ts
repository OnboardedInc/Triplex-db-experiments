// [CX-INT-Q] Why: R31/Q89b needs the actual SQLite retirement predicate in the shared /route gate.
// Rejected: another H1 model (would pass while the worker still discarded record-time rows).
import path from "node:path";
import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import type { TripleRow } from "@triplex-build/triplex/runtime";
import {
  generateRouteHistory,
  routeHead,
  routeRetentionHorizons,
  snapshotRouteRows,
  RouteRefusal,
  runRouteEquivalence,
  type RouteFixture,
  type RouteHistory,
  type RouteCommit,
  type RouteRequest,
} from "@triplex-build/triplex-testkit/route";
import { HostLog, H1BasisUnsupported } from "../src/broker/log.js";
import { encodeCommitGroup } from "../src/broker/frames.js";
import { FrameKind } from "../src/broker/frame.js";

it("H1 refuses T/TP at its worker boundary; the complete source answers identical cuts before and after purge", async () => {
  const { log } = await HostLog.open(
    path.resolve(import.meta.dirname, "../../../runs/broker/CX-INT-Q", randomUUID()),
    {
      minFreeBytes: 0,
    },
  );
  let history: RouteHistory = { seed: 0, now: 0, commits: [] };
  let lsn = 2,
    horizon = 0;
  const current = new Map<string, TripleRow>();
  const append = async (commit: RouteCommit) => {
    const rows: TripleRow[] = [],
      priors: TripleRow[] = [];
    for (const write of commit.writes) {
      if (write.op === "assert")
        rows.push({
          ...write.row,
          recorded_position: commit.position,
          recorded_at: commit.instant,
        });
      else {
        const prior = current.get(write.id)!;
        priors.push(prior);
        rows.push({
          ...prior,
          retracted_position: commit.position,
          retracted_at: commit.instant,
          retract_tx_id: `tx:${commit.position}`,
        });
      }
      const latest = rows.at(-1)!;
      current.set(latest.id, latest);
    }
    await log.append(
      FrameKind.COMMIT_GROUP,
      encodeCommitGroup({
        v: 1,
        stream: "CX-INT-Q",
        lsn,
        epoch: log.epoch,
        members: [
          {
            operationId: `op:${lsn}`,
            attemptId: `attempt:${lsn}`,
            positions: [commit.position],
            claims: [],
            rows,
            priors,
            subjects: [...new Set(rows.map((r) => r.entity_id))],
          },
        ],
      }),
    );
    lsn++;
  };
  const visible = (rows: readonly TripleRow[], request: RouteRequest) =>
    rows.filter(
      (row) =>
        (request.entityId === undefined || row.entity_id === request.entityId) &&
        row.recorded_position <= (request.basis.recordedPosition ?? routeHead(history)) &&
        (request.basis.recordedAt === undefined || row.recorded_at <= request.basis.recordedAt) &&
        (request.history ||
          ((row.retracted_position === null ||
            row.retracted_position > (request.basis.recordedPosition ?? routeHead(history)) ||
            row.retracted_at! > (request.basis.recordedAt ?? Infinity)) &&
            row.valid_from <= (request.basis.validAt ?? history.now) &&
            (row.valid_to === null || row.valid_to > (request.basis.validAt ?? history.now)))),
    );
  const fixture: RouteFixture = {
    lane: "qlever-actual-sqlite-h1",
    reset: async (next) => {
      history = next;
      for (const commit of next.commits) await append(commit);
    },
    append: async (commit) => {
      await append(commit);
      history = { ...history, commits: [...history.commits, commit] };
    },
    event: (event, context) => {
      if (event !== "purge" && event !== "purge-pinned") return;
      const requested = context!.horizon;
      const pin = context!.pinned ? log.pinBasis(requested, "CX-INT-Q") : undefined;
      try {
        horizon = log.purge(requested).h;
      } finally {
        pin?.release();
      }
      return {
        status: "applied",
        reason: "actual SQLite purge",
        retirement: { horizon, pinned: context!.pinned },
      };
    },
    routes: ["Q4-H1", "Q5-source"].map((id) => ({
      id,
      contract: "snapshot" as const,
      retention: {
        kind: id === "Q4-H1" ? ("position-retired" as const) : ("complete" as const),
        plan: (h, extension) =>
          routeRetentionHorizons(h, extension.position).map((cut, i) => ({
            id: `cut:${i}`,
            event: i === 0 ? ("purge-pinned" as const) : ("purge" as const),
            horizon: cut,
            pinned: i === 0,
          })),
      },
      eligible: (request, h) =>
        (request.basis.recordedPosition ?? routeHead(h)) <= routeHead(h) &&
        (id !== "Q4-H1" ||
          (!request.history &&
            request.basis.recordedAt === undefined &&
            (request.basis.recordedPosition ?? routeHead(h)) >= horizon)),
      refusals: ["BasisNotAvailable", "SnapshotExpired"],
      force: () => {},
      read: async (request) => {
        const b = request.basis.recordedPosition ?? routeHead(history);
        if (b > routeHead(history))
          throw new RouteRefusal("BasisNotAvailable", "future source position");
        const selection = request.entityId === undefined ? {} : { entities: [request.entityId] };
        let rows: readonly TripleRow[];
        if (id === "Q4-H1") {
          if (request.history) throw new RouteRefusal("BasisNotAvailable", "H1 has no raw history");
          try {
            const result = await log.pull({ recordedPosition: b, ...request.basis }, selection);
            if (!result.eligible) throw new RouteRefusal("SnapshotExpired", "below H1 horizon");
            rows = result.rows;
          } catch (error) {
            if (!(error instanceof H1BasisUnsupported)) throw error;
            expect(error.reason).toBe("h1-record-time-unsupported");
            throw new RouteRefusal("BasisNotAvailable", error.message);
          }
        } else rows = log.recent(0, selection);
        return {
          rows: snapshotRouteRows(visible(rows, request), request, routeHead(history)),
          taken: id,
          basis: request.basis,
        };
      },
    })),
  };
  try {
    const result = await runRouteEquivalence({ fixture, history: generateRouteHistory(89, 16) });
    expect(result.violations).toEqual([]);
    expect(result.reference).toBe("offline-fold-not-independent");
    for (const shape of ["T", "TP"]) {
      const observations = result.observations.filter(
        (o) =>
          o.route === "Q4-H1" &&
          o.request.basis.recordedAt !== undefined &&
          (shape === "TP") === (o.request.basis.recordedPosition !== undefined),
      );
      expect(observations.length).toBeGreaterThan(0);
      expect(observations.every((o) => o.outcome === "refuse:BasisNotAvailable")).toBe(true);
    }
  } finally {
    await log.close();
  }
}, 120_000);
