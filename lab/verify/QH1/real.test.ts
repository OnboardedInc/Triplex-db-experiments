// [EXP-QH1-R3] Why: W0 has no REAL values, so its answer equality cannot catch a lossy transport (SQLite's JSON functions round REAL to 15
// digits, R46 section 1 item 8; Q105b "no silent precision loss"). This writes finite doubles through the public write path and
// proves bit-exact round trip through the production whole-pull route (T.reach) and the per-level route, including subnormals,
// MAX_VALUE, 2^53 neighbours and 3,000 random IEEE bit patterns, and REAL (non-integer) record times through the row-level path.
// Rejected: a transport-only test of the SQL text (the decode and the domain check are part of the round trip), and integer-valued
// samples (integers may skip %!.17g, REAL must not).
import { it, expect } from "vitest";
import { Effect, Layer, ManagedRuntime, Option } from "effect";
import * as core from "@triplex-build/triplex";
import * as rt from "@triplex-build/triplex/runtime";
import { HostBroker } from "../../../packages/qlever/src/broker/broker.js";
import { makeQleverBrokerStorageAdapter } from "../../../packages/qlever/src/broker/BrokerStorageAdapter.js";
import { makeQleverQueryExecutor } from "../../../packages/qlever/src/QleverQueryExecutor.js";
import { HostLog } from "../../../packages/qlever/src/broker/log.js";
import { fresh, append, row } from "./helpers.js";

const bits = (n: number) => {
  const d = new DataView(new ArrayBuffer(8));
  d.setFloat64(0, n);
  return d.getBigUint64(0);
};
const doubles = (count: number) => {
  const edges = [
    5e-324,
    -5e-324,
    2.2250738585072014e-308,
    2.225073858507201e-308,
    Number.MAX_VALUE,
    -Number.MAX_VALUE,
    Number.EPSILON,
    2 ** 53 - 1,
    2 ** 53,
    2 ** 53 + 2,
    -(2 ** 53),
    1 / 3,
    0.1 + 0.2,
    0.30000000000000004,
    1e-7,
    123456789.12345679,
    1e21,
    1e-300,
    4.9406564584124654e-324,
    9007199254740993.5,
    0.5,
    1,
  ];
  const view = new DataView(new ArrayBuffer(8));
  let seed = 4242;
  const next = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0);
  const out = [...edges];
  while (out.length < count) {
    view.setUint32(0, next());
    view.setUint32(4, next());
    const v = view.getFloat64(0);
    if (Number.isFinite(v) && !Object.is(v, -0)) out.push(v);
  }
  return out;
};

it("REAL values and extreme doubles round trip bit-exactly through the whole-pull and per-level routes", async () => {
  const broker = await HostBroker.open({
    dir: fresh(),
    scopeKey: "QH1-real",
    minFreeBytes: 0,
  });
  const client: any = {
    query: async () => {
      throw new TypeError("offline", {
        cause: Object.assign(new Error("offline"), { code: "ECONNREFUSED" }),
      });
    },
  };
  const adapter = makeQleverBrokerStorageAdapter(client, "QH1-real", broker, {
    currentRoute: "h1",
    basisWaitMs: 10,
  });
  const runtime = ManagedRuntime.make(
    rt.Runtime.define({
      name: "QH1-real",
      storage: Layer.succeed(rt.StorageAdapter, adapter),
      queries: Layer.succeed(
        rt.QueryExecutor,
        makeQleverQueryExecutor(client, "QH1-real", {
          sourceView: adapter.sourceView,
        }),
      ),
    }).layer({
      scope: rt.DatabaseScope.test("QH1-real"),
      capabilities: rt.Capabilities.none,
      deterministic: { startTime: 1000, seed: "QH1-real" },
    }),
  );
  try {
    const T = await runtime.runPromise(Effect.service(core.Triples));
    const values = doubles(3000);
    const E = core.EntityId.make,
      A = core.Attribute.make;
    for (let i = 0; i < values.length; i += 250) {
      const ops: any[] = [];
      for (let j = i; j < Math.min(i + 250, values.length); j++) {
        ops.push({
          op: "assert",
          entityId: E("root"),
          attribute: A(":x/child"),
          value: { type: "ref", value: E("c:" + j) },
          validFrom: 0,
        });
        ops.push({
          op: "assert",
          entityId: E("c:" + j),
          attribute: A(":x/real"),
          value: { type: "number", value: values[j]! },
          validFrom: 0,
        });
      }
      await runtime.runPromise(T.transact(ops));
    }
    const check = (triples: readonly core.Triple[]) => {
      const reals = new Map<string, number>();
      for (const t of triples)
        if (t.attribute === ":x/real")
          reals.set(t.entityId, t.value.value as number);
      expect(reals.size).toBe(values.length);
      let mismatches = 0;
      for (let j = 0; j < values.length; j++)
        if (bits(reals.get("c:" + j)!) !== bits(values[j]!)) mismatches++;
      expect(mismatches).toBe(0);
    };
    const reach = await runtime.runPromise(
      T.reach(E("root"), { validAt: 1000 }),
    );
    check(reach.triples);
    expect(reach.hops).toBe(2);
    // The per-level route (the public BFS over T.entities) must agree.
    const children = values.map((_, j) => E("c:" + j));
    const level = await runtime.runPromise(
      T.entities(children, { validAt: 1000 }),
    );
    check(level.flat());
    expect(adapter.routes.h1).toBeGreaterThan(0);
  } finally {
    await runtime.dispose();
    await broker.close();
  }
}, 300000);

it("REAL record times and valid-from offsets round trip bit-exactly through the whole-pull route", async () => {
  const broker = await HostBroker.open({
    dir: fresh(),
    scopeKey: "QH1-realtime",
    minFreeBytes: 0,
  });
  const log = (broker as any).log as HostLog;
  const client: any = {
    query: async () => {
      throw new TypeError("offline", {
        cause: Object.assign(new Error("offline"), { code: "ECONNREFUSED" }),
      });
    },
  };
  const adapter = makeQleverBrokerStorageAdapter(
    client,
    "QH1-realtime",
    broker,
    { currentRoute: "h1", basisWaitMs: 10 },
  );
  try {
    const instants = [
      1000.0000000000001,
      1000.5,
      1e15 + 0.25,
      2 ** 52 + 0.5,
      123456789.123456789,
      0.1,
    ];
    const rows = instants.map((at, i) => ({
      ...row(i + 1, i === 0 ? "t:root" : "t:root/" + i, 2048),
      value_type: "ref" as const,
      value_number: null,
      value_string: i + 1 < instants.length ? "t:root/" + (i + 1) : "t:root/1",
      recorded_at: at,
      valid_from: at + 0.25,
    }));
    await append(log, rows);
    // The rows go straight to the log; publish the durable LSN the way a commit would so the adapter's basis gate passes.
    (broker as any).durableLsn = log.nextLsn - 1;
    const result = await Effect.runPromise(
      adapter.getReachTriples!("t:root", {
        validAt: 1e16,
        recordedPosition: 2048,
      }),
    );
    expect(result).toBeDefined();
    const byId = new Map(result!.triples.map((t) => [t.id, t]));
    expect(byId.size).toBe(instants.length);
    for (const r of rows) {
      const t = byId.get(r.id)!;
      expect(bits(t.recordedAt)).toBe(bits(r.recorded_at));
      expect(bits(t.validFrom)).toBe(bits(r.valid_from));
      expect(Option.isNone(t.validTo)).toBe(true);
    }
  } finally {
    await broker.close();
  }
}, 120000);
