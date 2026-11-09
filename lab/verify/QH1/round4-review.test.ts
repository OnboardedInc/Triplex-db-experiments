// [CX-VQH1-R4] Why: check cut propagation before a declining direct attempt and inspect all three in-scope unhooked adapters.
// Rejected: treating the broker's fixed reproduction as coverage of other adapters or serializing writers behind the pull.
import fs from "node:fs";
import path from "node:path";
import { expect, it } from "vitest";
import { Effect, Layer, ManagedRuntime } from "effect";
import * as core from "@triplex-build/triplex";
import * as rt from "@triplex-build/triplex/runtime";
import { makeXtdbStorageAdapter } from "../../../packages/xtdb/src/XtdbStorageAdapter.js";
import { makeDatomicStorageAdapter } from "../../../packages/datomic/src/DatomicStorageAdapter.js";
import { makeQleverStorageAdapter } from "../../../packages/qlever/src/QleverStorageAdapter.js";
import { numericFromOrderKey } from "../../../packages/qlever/src/rdf.js";
import { HostBroker } from "../../../packages/qlever/src/broker/broker.js";
import { makeQleverBrokerStorageAdapter } from "../../../packages/qlever/src/broker/BrokerStorageAdapter.js";
import { makeQleverQueryExecutor } from "../../../packages/qlever/src/QleverQueryExecutor.js";
import { fresh, row, base } from "./helpers.js";

const E = core.EntityId.make;
const A = core.Attribute.make;
const shape = (r: core.ReachResult) => r.triples.map((t) => [t.entityId, t.value.value]);
const offline: any = {
  query: async (sql: string) => {
    if (sql === "SELECT ?s WHERE { ?s ?p ?o } LIMIT 1") return [];
    throw new TypeError("offline", {
      cause: Object.assign(new Error("offline"), { code: "ECONNREFUSED" }),
    });
  },
};

it("captures once before a direct attempt that reads, a writer commits, and the attempt declines", async () => {
  const broker = await HostBroker.open({ dir: fresh(), scopeKey: "r4-decline", minFreeBytes: 0 });
  const adapter = makeQleverBrokerStorageAdapter(offline, "r4-decline", broker, {
    currentRoute: "h1",
  });
  let calls = 0,
    armed = false,
    first: core.TransactionResult,
    T: core.TriplesService;
  const cuts: { operation: string; position: number | undefined }[] = [];
  const wrapped = {
    ...adapter,
    pullPosition: () => {
      calls++;
      return adapter.pullPosition!();
    },
    getReachTriples: (root: string, basis: core.ResolvedTemporalBasis) =>
      Effect.gen(function* () {
        cuts.push({ operation: "direct", position: basis.recordedPosition });
        const before = yield* adapter.getReachTriples!(root, basis);
        if (!armed) return before;
        expect(shape(before!)).toEqual([
          ["root", "a"],
          ["a", "b"],
          ["b", 1],
        ]);
        armed = false;
        // Awaiting a real committed writer here also rejects a read implementation that holds a writer-blocking lock.
        yield* Effect.promise(() =>
          runtime.runPromise(
            T.transact([
              { op: "retract", id: first.triples[0]!.id },
              { op: "retract", id: first.triples[2]!.id },
              {
                op: "assert",
                entityId: E("b"),
                attribute: A(":x/value"),
                value: { type: "number", value: 2 },
                validFrom: 0,
              },
            ]),
          ),
        );
        return undefined;
      }),
    getEntityTriples: (ids: readonly string[], basis: core.ResolvedTemporalBasis) => {
      cuts.push({ operation: "fallback:" + ids.join(","), position: basis.recordedPosition });
      return adapter.getEntityTriples!(ids, basis);
    },
  };
  const runtime = ManagedRuntime.make(
    rt.Runtime.define({
      name: "r4-decline",
      storage: Layer.succeed(rt.StorageAdapter, wrapped),
      queries: Layer.succeed(
        rt.QueryExecutor,
        makeQleverQueryExecutor(offline, "r4-decline", { sourceView: adapter.sourceView }),
      ),
    }).layer({
      scope: rt.DatabaseScope.test("r4-decline"),
      capabilities: rt.Capabilities.none,
      deterministic: { startTime: 1000, seed: "r4-decline" },
    }),
  );
  try {
    T = await runtime.runPromise(Effect.service(core.Triples));
    first = await runtime.runPromise(
      T.transact([
        {
          op: "assert",
          entityId: E("root"),
          attribute: A(":x/ref"),
          value: { type: "ref", value: E("a") },
          validFrom: 0,
        },
        {
          op: "assert",
          entityId: E("a"),
          attribute: A(":x/ref"),
          value: { type: "ref", value: E("b") },
          validFrom: 0,
        },
        {
          op: "assert",
          entityId: E("b"),
          attribute: A(":x/value"),
          value: { type: "number", value: 1 },
          validFrom: 0,
        },
      ]),
    );
    armed = true;
    const answer = await runtime.runPromise(T.reach(E("root"), { validAt: 2000 }));
    expect(calls).toBe(1);
    expect(shape(answer)).toEqual([
      ["root", "a"],
      ["a", "b"],
      ["b", 1],
    ]);
    expect(cuts.map((c) => c.operation)).toEqual([
      "direct",
      "fallback:root",
      "fallback:a",
      "fallback:b",
    ]);
    expect(cuts.every((c) => c.position === first.position)).toBe(true);
    expect(broker.head()).toBeGreaterThan(first.position);
    fs.writeFileSync(
      path.join(base, "r4-decline-witness.json"),
      JSON.stringify(
        { calls, cuts, start: first.position, after: broker.head(), answer: shape(answer) },
        null,
        2,
      ),
    );
  } finally {
    await runtime.dispose();
    await broker.close();
  }
}, 30000);

it("an unpinned withCurrentPull context captures its first cut and keeps it for later reach calls", async () => {
  const broker = await HostBroker.open({ dir: fresh(), scopeKey: "r4-context", minFreeBytes: 0 });
  const adapter = makeQleverBrokerStorageAdapter(offline, "r4-context", broker, {
    currentRoute: "h1",
  });
  const runtime = ManagedRuntime.make(
    rt.Runtime.define({
      name: "r4-context",
      storage: Layer.succeed(rt.StorageAdapter, adapter),
      queries: Layer.succeed(
        rt.QueryExecutor,
        makeQleverQueryExecutor(offline, "r4-context", { sourceView: adapter.sourceView }),
      ),
    }).layer({
      scope: rt.DatabaseScope.test("r4-context"),
      capabilities: rt.Capabilities.none,
      deterministic: { startTime: 1000, seed: "r4-context" },
    }),
  );
  try {
    const T = await runtime.runPromise(Effect.service(core.Triples));
    const initial = await runtime.runPromise(
      T.transact([
        {
          op: "assert",
          entityId: E("root"),
          attribute: A(":x/value"),
          value: { type: "number", value: 1 },
          validFrom: 0,
        },
      ]),
    );
    await adapter.withCurrentPull("root", async () => {
      expect(shape(await runtime.runPromise(T.reach(E("root"), { validAt: 2000 })))).toEqual([
        ["root", 1],
      ]);
      await runtime.runPromise(T.transact([{ op: "retract", id: initial.triples[0]!.id }]));
      expect(await runtime.runPromise(adapter.pullPosition!())).toBe(initial.position);
      expect(shape(await runtime.runPromise(T.reach(E("root"), { validAt: 2000 })))).toEqual([
        ["root", 1],
      ]);
      await runtime.runPromise(
        adapter.withTransaction(
          Effect.gen(function* () {
            expect(yield* adapter.pullPosition!()).toBeUndefined();
          }),
        ),
      );
    });
    expect(shape(await runtime.runPromise(T.reach(E("root"), { validAt: 2000 })))).toEqual([]);
  } finally {
    await runtime.dispose();
    await broker.close();
  }
}, 30000);

for (const lane of ["xtdb", "datomic", "qlever-non-broker"] as const) {
  it(`${lane}: records remaining mixed-cut closure; an explicit-position control stays coherent`, async () => {
    const observations: unknown[] = [];
    for (const withPin of [false, true]) {
      let head = 1,
        changed = false,
        captured = 0;
      const nativeRequests: unknown[] = [];
      const root = {
        ...row(1, "root", 1),
        tx_id: "_tx/" + "1".padStart(26, "0"),
        recorded_at: 1000,
        value_type: "ref" as const,
        value_number: null,
        value_string: "target",
      };
      const old = { ...row(2, "target", 1), tx_id: root.tx_id, recorded_at: 1000, value_number: 1 };
      const next = {
        ...row(3, "target", 2),
        tx_id: "_tx/" + "2".padStart(26, "0"),
        recorded_at: 1000,
        value_number: 2,
      };
      // This is an offline two-commit native-response fixture, not a live engine or public-write claim.
      const nativeRows = (ids: readonly string[], cut?: number) => {
        const p = cut ?? head;
        nativeRequests.push({ ids, cut: cut ?? null, observedHead: head });
        const rows = p < 2 ? [root, old] : [next];
        const selected = rows.filter((r) => ids.includes(r.entity_id));
        if (ids.includes("root") && !changed) {
          changed = true;
          head = 2;
        }
        return selected;
      };
      let adapter: rt.StorageAdapterService;
      if (lane === "xtdb")
        adapter = makeXtdbStorageAdapter(
          {
            submit: async () => ({}),
            query: async (sql: string, params: unknown[]) => {
              if (sql.startsWith("SELECT position")) return [{ position: head }];
              if (!sql.includes("FROM tx_assertions")) throw Error("Unexpected SQL: " + sql);
              const clause = /entity_id IN \(([^)]+)\)/.exec(sql)!;
              const ids = params.slice(1, 1 + clause[1]!.split(",").length) as string[];
              const offset = sql.indexOf("recorded_position <= ?");
              const cut =
                offset < 0
                  ? undefined
                  : (params[(sql.slice(0, offset).match(/\?/g) ?? []).length] as number);
              return nativeRows(ids, cut);
            },
          } as any,
          "r4-native",
        );
      else if (lane === "datomic")
        adapter = makeDatomicStorageAdapter(
          {
            create: async () => ({}),
            basis: async () => ({ position: { v: head } }),
            rows: async (_db: string, input: any) =>
              nativeRows(input.entityIds, input.basis?.recordedPosition),
          } as any,
          "r4-native",
        );
      else
        adapter = makeQleverStorageAdapter(
          {
            query: async (sql: string) => {
              if (sql === "SELECT ?s WHERE { ?s ?p ?o } LIMIT 1") return [];
              if (sql.startsWith("SELECT ?position"))
                return [{ position: { type: "literal", value: String(head) } }];
              if (!sql.startsWith("SELECT ?row")) throw Error("Unexpected SPARQL: " + sql);
              const entities = /VALUES \?entity \{ ([^}]+) \}/.exec(sql)!;
              const ids = [...entities[1]!.matchAll(/"([^"]*)"/g)].map((m) => m[1]!);
              const cutText = /FILTER\(\?recordedOrder <= "([^"]+)"/.exec(sql)?.[1];
              const cut = cutText === undefined ? undefined : numericFromOrderKey(cutText);
              return nativeRows(ids, cut).map((r) => ({
                row: { type: "literal", value: JSON.stringify(r) },
              }));
            },
          } as any,
          "r4-native",
        );
      expect(adapter.pullPosition).toBeUndefined();
      const selected = withPin
        ? {
            ...adapter,
            pullPosition: () =>
              Effect.sync(() => {
                captured++;
                return head;
              }),
          }
        : adapter;
      const runtime = ManagedRuntime.make(
        rt.Runtime.define({
          name: "r4-native",
          storage: Layer.succeed(rt.StorageAdapter, selected),
          queries: Layer.succeed(rt.QueryExecutor, {} as any),
        }).layer({
          scope: rt.DatabaseScope.test("r4-native"),
          capabilities: rt.Capabilities.none,
          deterministic: { startTime: 1000, seed: "r4-native" },
        }),
      );
      try {
        const T = await runtime.runPromise(Effect.service(core.Triples));
        const answer = await runtime.runPromise(
          T.reach(E("root"), { validAt: 2000, recordedAt: 1000 }),
        );
        expect(changed).toBe(true);
        expect(shape(answer)).toEqual([
          ["root", "target"],
          ["target", withPin ? 1 : 2],
        ]);
        expect(captured).toBe(withPin ? 1 : 0);
        observations.push({ withPin, answer: shape(answer), nativeRequests });
      } finally {
        await runtime.dispose();
      }
    }
    fs.writeFileSync(
      path.join(base, "r4-" + lane + "-witness.json"),
      JSON.stringify(observations, null, 2),
    );
  });
}
