// [EXP-QH1] Why: register the real H1w owner/prefetch route in RQ01; exact temporal cuts are the floor.
// Rejected: testing only a row-count model or validating one route against itself.
import { it, expect } from "vitest";
import { Effect, Option } from "effect";
import { HostBroker } from "../../../packages/qlever/src/broker/broker.js";
import { makeQleverBrokerStorageAdapter } from "../../../packages/qlever/src/broker/BrokerStorageAdapter.js";
import { H1SnapshotExpired } from "../../../packages/qlever/src/broker/log.js";
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
import type { TripleRow } from "@triplex-build/triplex/runtime";
import { append, row, fresh } from "./helpers.js";
import { h1Rows, h1TupleId, wholePullTuples } from "../../../packages/qlever/src/broker/h1.js";
it("RQ01 with H1w registered, typed T/TP/future/expired refusal and Q89i repeat", async () => {
  const broker = await HostBroker.open({ dir: fresh(), scopeKey: "qh1-rq01", minFreeBytes: 0 });
  const log = (broker as any).log;
  // [EXP-QH1-R3] Why: the whole-pull adapter operation is a separate H1 route and is registered beside the raw worker route.
  // Rejected: assuming the worker route's verdict covers the adapter's own decode, cut and cache handling.
  const adapter = makeQleverBrokerStorageAdapter(
    { query: async () => { throw new TypeError("offline", { cause: Object.assign(new Error("offline"), { code: "ECONNREFUSED" }) }); } } as any,
    "qh1-rq01",
    broker,
    { currentRoute: "h1", basisWaitMs: 10 },
  );
  let history: RouteHistory = { seed: 0, now: 0, commits: [] },
    horizon = 0;
  const latest = new Map<string, TripleRow>();
  const write = async (c: RouteCommit) => {
    const rs: TripleRow[] = [];
    for (const w of c.writes) {
      const r =
        w.op === "assert"
          ? { ...w.row, recorded_position: c.position, recorded_at: c.instant }
          : {
              ...latest.get(w.id)!,
              retracted_position: c.position,
              retracted_at: c.instant,
              retract_tx_id: `tx:${c.position}`,
            };
      rs.push(r);
      latest.set(r.id, r);
    }
    await append(log, rs);
    // The fixture writes frames straight to the log (positions are the route history's own); the adapter route reads through the
    // broker's resolved prefix, so publish the new durable LSN the way a commit would. Rejected: broker.submit (it assigns positions).
    (broker as any).durableLsn = log.nextLsn - 1;
  };
  const visible = (rows: readonly TripleRow[], r: RouteRequest) =>
    rows.filter(
      (row) =>
        (r.entityId === undefined || row.entity_id === r.entityId) &&
        row.recorded_position <= (r.basis.recordedPosition ?? routeHead(history)) &&
        (r.basis.recordedAt === undefined || row.recorded_at <= r.basis.recordedAt) &&
        (r.history ||
          ((row.retracted_position === null ||
            row.retracted_position > (r.basis.recordedPosition ?? routeHead(history)) ||
            row.retracted_at! > (r.basis.recordedAt ?? Infinity)) &&
            row.valid_from <= (r.basis.validAt ?? history.now) &&
            (row.valid_to === null || row.valid_to > (r.basis.validAt ?? history.now)))),
    );
  const fixture: RouteFixture = {
    lane: "qlever-H1w-owner",
    reset: async (h) => {
      history = h;
      for (const c of h.commits) await write(c);
    },
    append: async (c) => {
      await write(c);
      history = { ...history, commits: [...history.commits, c] };
    },
    event: (event, context) => {
      if (event !== "purge" && event !== "purge-pinned") return;
      const pin = context!.pinned ? log.pinBasis(context!.horizon, "QH1") : undefined;
      try {
        horizon = log.purge(context!.horizon).h;
      } finally {
        pin?.release();
      }
      return {
        status: "applied",
        reason: "actual SQLite horizon",
        retirement: { horizon, pinned: context!.pinned },
      };
    },
    routes: ["QH1w", "QH1r", "source"].map((id) => ({
      id,
      contract: "snapshot" as const,
      retention: {
        kind: id !== "source" ? ("position-retired" as const) : ("complete" as const),
        plan: (h, extension) =>
          routeRetentionHorizons(h, extension.position).map((cut, i) => ({
            id: `cut:${i}`,
            event: i === 0 ? ("purge-pinned" as const) : ("purge" as const),
            horizon: cut,
            pinned: i === 0,
          })),
      },
      eligible: (r, h) =>
        (r.basis.recordedPosition ?? routeHead(h)) <= routeHead(h) &&
        (id === "source" ||
          (!r.history &&
            r.basis.recordedAt === undefined &&
            (r.basis.recordedPosition ?? routeHead(h)) >= horizon)),
      refusals: ["BasisNotAvailable", "SnapshotExpired"],
      force: () => {},
      read: async (r) => {
        const b = r.basis.recordedPosition ?? routeHead(history);
        if (b > routeHead(history)) throw new RouteRefusal("BasisNotAvailable", "future");
        let rows: readonly TripleRow[];
        if (id === "source")
          rows = log.recent(0, r.entityId === undefined ? {} : { entities: [r.entityId] });
        else if (id === "QH1r") {
          if (r.history || r.basis.recordedAt !== undefined)
            throw new RouteRefusal("BasisNotAvailable", "H1 refuses record time/history");
          const roots =
            r.entityId === undefined
              ? [...new Set([...latest.values()].map((x) => x.entity_id))]
              : [r.entityId];
          const found = new Map<string, any>();
          for (const root of roots) {
            const pulled = await Effect.runPromise(
              adapter.getReachTriples!(root, {
                validAt: r.basis.validAt ?? history.now,
                recordedPosition: b,
              }),
            ).catch((e) => {
              if (e instanceof H1SnapshotExpired || /expired/i.test(String(e?.reason ?? e)))
                throw new RouteRefusal("SnapshotExpired", "expired");
              throw e;
            });
            if (pulled === undefined) throw new RouteRefusal("SnapshotExpired", "expired");
            for (const t of pulled.triples)
              if (r.entityId === undefined || t.entityId === r.entityId) found.set(t.id, t);
          }
          rows = [...found.values()].map((t: any) => {
            const columns: any = {
              value_string: null,
              value_number: null,
              value_boolean: null,
              value_datetime: null,
              value_json: null,
            };
            columns[
              t.value.type === "ref" || t.value.type === "integer" ? "value_string" : "value_" + t.value.type
            ] =
              t.value.type === "boolean"
                ? Number(t.value.value)
                : t.value.type === "json"
                  ? JSON.stringify(t.value.value)
                  : t.value.value;
            return {
              id: t.id,
              entity_id: t.entityId,
              attribute: t.attribute,
              value_type: t.value.type,
              ...columns,
              recorded_position: latest.get(t.id)!.recorded_position,
              recorded_at: t.recordedAt,
              valid_from: t.validFrom,
              valid_to: Option.getOrNull(t.validTo),
              created_by: Option.getOrNull(t.createdBy),
              entity_type: Option.getOrNull(t.entityType),
              schema_version: Option.getOrNull(t.schemaVersion),
              tx_id: Option.getOrNull(t.txId),
              retracted_at: Option.getOrNull(t.retractedAt),
              retracted_position: null,
              retract_tx_id: Option.getOrNull(t.retractTxId),
            } as TripleRow;
          });
        } else {
          if (r.history || r.basis.recordedAt !== undefined)
            throw new RouteRefusal("BasisNotAvailable", "H1 refuses record time/history");
          try {
            const roots =
              r.entityId === undefined
                ? [...new Set([...latest.values()].map((r) => r.entity_id))]
                : [r.entityId];
            const whole = await log.wholePull(b, roots),
              tuples = wholePullTuples(whole);
            const triples = [
              ...h1Rows(tuples, { validAt: r.basis.validAt ?? history.now }).values(),
            ].flat();
            const positions = new Map(tuples.map((t: any) => [h1TupleId(t), t[7]]));
            rows = triples.map((t) => {
              const columns: any = {
                value_string: null,
                value_number: null,
                value_boolean: null,
                value_datetime: null,
                value_json: null,
              };
              columns[
                t.value.type === "ref" || t.value.type === "integer"
                  ? "value_string"
                  : "value_" + t.value.type
              ] =
                t.value.type === "boolean"
                  ? Number(t.value.value)
                  : t.value.type === "json"
                    ? JSON.stringify(t.value.value)
                    : t.value.value;
              return {
                id: t.id,
                entity_id: t.entityId,
                attribute: t.attribute,
                value_type: t.value.type,
                ...columns,
                recorded_position: positions.get(t.id) as number,
                recorded_at: t.recordedAt,
                valid_from: t.validFrom,
                valid_to: Option.getOrNull(t.validTo),
                created_by: Option.getOrNull(t.createdBy),
                entity_type: Option.getOrNull(t.entityType),
                schema_version: Option.getOrNull(t.schemaVersion),
                tx_id: Option.getOrNull(t.txId),
                retracted_at: Option.getOrNull(t.retractedAt),
                retracted_position: null,
                retract_tx_id: Option.getOrNull(t.retractTxId),
              } as TripleRow;
            });
          } catch (e) {
            if (e instanceof H1SnapshotExpired)
              throw new RouteRefusal("SnapshotExpired", "expired");
            throw e;
          }
        }
        return {
          rows: snapshotRouteRows(visible(rows, r), r, routeHead(history)),
          taken: id,
          basis: r.basis,
        };
      },
    })),
  };
  try {
    const result = await runRouteEquivalence({ fixture, history: generateRouteHistory(89, 16) });
    expect(result.violations).toEqual([]);
  } finally {
    await broker.close();
  }
}, 120000);

it("per-pull prefetch survives purge/commits, shares no other scope/cut, and fetches cross-owner refs", async () => {
  const broker = await HostBroker.open({ dir: fresh(), scopeKey: "qh1-cache", minFreeBytes: 0 });
  const client: any = {
    query: async () => {
      throw new TypeError("offline", {
        cause: Object.assign(new Error("offline"), { code: "ECONNREFUSED" }),
      });
    },
  };
  let calls = 0;
  const adapter = makeQleverBrokerStorageAdapter(client, "qh1-cache", broker, {
    currentRoute: "h1",
    onPull: () => calls++,
  });
  const submit = async (rows: TripleRow[]) => {
    const decision = await broker.submit({
      operationId: String(Math.random()),
      attemptId: String(Math.random()),
      sourceK: broker.head(),
      reads: { entities: new Set(), scopeWide: false },
      claims: [],
      placeholders: [-1],
      rows: rows.map((r) => ({ ...r, recorded_position: -1 })),
      priors: new Map(),
      newIds: new Set(rows.map((r) => r.id)),
    });
    if (decision.kind !== "committed") throw Error("fixture commit failed");
  };
  try {
    await submit([
      {
        ...row(1, "root", 2048),
        value_type: "ref",
        value_number: null,
        value_string: "external/odd",
      },
      row(2, "external/odd", 2048),
      {
        ...row(3, "external/odd", 2048),
        value_type: "ref",
        value_number: null,
        value_string: "root",
      },
    ]);
    const b = { recordedPosition: 2048, validAt: 100 };
    await adapter.withCurrentPull(
      "root",
      async () => {
        const root = await Effect.runPromise(adapter.getEntityTriples!(["root"], b));
        expect(root?.get("root")?.[0]?.value).toEqual({ type: "ref", value: "external/odd" });
        // Advance durable marker without changing original facts; retire H1 beyond b between hops.
        await submit([row(4, "new", 3072)]);
        broker.purgeCurrent(3072);
        const child = await Effect.runPromise(adapter.getEntityTriples!(["external/odd"], b));
        expect(child?.get("external/odd")?.length).toBe(2);
      },
      2048,
    );
    expect(calls).toBe(1);
    expect(await Effect.runPromise(adapter.getEntityTriples!(["root"], b))).toBeUndefined();
    expect(
      await Effect.runPromise(adapter.getEntityTriples!(["root"], { ...b, recordedAt: 100 })),
    ).toBeUndefined();
    expect(
      Option.isNone(
        (await Effect.runPromise(
          adapter.getEntityTriples!(["root"], { ...b, recordedPosition: 3072 }),
        ))!.get("root")![0]!.retractedAt,
      ),
    ).toBe(true);
  } finally {
    await broker.close();
  }
});
