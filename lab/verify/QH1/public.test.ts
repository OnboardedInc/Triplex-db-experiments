// [EXP-QH1] Why: verify the unchanged public per-hop API actually consumes the direct columnar decoder.
// Rejected: a worker-only throughput claim or bypassing transaction staging to exercise reads.
import { it, expect } from "vitest";
import { Effect, Layer, ManagedRuntime } from "effect";
import * as core from "@triplex-build/triplex";
import * as rt from "@triplex-build/triplex/runtime";
import { HostBroker } from "../../../packages/qlever/src/broker/broker.js";
import { makeQleverBrokerStorageAdapter } from "../../../packages/qlever/src/broker/BrokerStorageAdapter.js";
import { makeQleverQueryExecutor } from "../../../packages/qlever/src/QleverQueryExecutor.js";
import { fresh, append, row } from "./helpers.js";
import { HostLog } from "../../../packages/qlever/src/broker/log.js";
import { h1Rows, wholePullTuples } from "../../../packages/qlever/src/broker/h1.js";
it("public T.entities uses one prefetch operation for a whole pull and preserves duplicate input semantics", async () => {
  const broker = await HostBroker.open({ dir: fresh(), scopeKey: "QH1-public", minFreeBytes: 0 });
  let pulls = 0,
    replicaReads = 0;
  const client: any = {
    query: async () => {
      replicaReads++;
      throw new TypeError("offline", {
        cause: Object.assign(new Error("offline"), { code: "ECONNREFUSED" }),
      });
    },
  };
  const adapter = makeQleverBrokerStorageAdapter(client, "QH1-public", broker, {
    currentRoute: "h1",
    basisWaitMs: 10,
    onPull: () => pulls++,
  });
  const runtime = ManagedRuntime.make(
    rt.Runtime.define({
      name: "QH1-public",
      storage: Layer.succeed(rt.StorageAdapter, adapter),
      queries: Layer.succeed(
        rt.QueryExecutor,
        makeQleverQueryExecutor(client, "QH1-public", { sourceView: adapter.sourceView }),
      ),
    }).layer({
      scope: rt.DatabaseScope.test("QH1-public"),
      capabilities: rt.Capabilities.none,
      deterministic: { startTime: 1000, seed: "QH1-public" },
    }),
  );
  try {
    const T = await runtime.runPromise(Effect.service(core.Triples));
    await runtime.runPromise(
      T.transact([
        {
          op: "assert",
          entityId: core.EntityId.make("root"),
          attribute: core.Attribute.make(":x/ref"),
          value: { type: "ref", value: core.EntityId.make("external/odd") },
          validFrom: 0,
        },
        {
          op: "assert",
          entityId: core.EntityId.make("external/odd"),
          attribute: core.Attribute.make(":x/value"),
          value: { type: "number", value: 0.30000000000000004 },
          validFrom: 0,
        },
      ]),
    );
    await expect(
      runtime.runPromise(
        T.transact([
          {
            op: "assert",
            entityId: core.EntityId.make("bad"),
            attribute: core.Attribute.make(":x/value"),
            value: { type: "number", value: -0 },
            validFrom: 0,
          },
        ]),
      ),
    ).rejects.toThrow(/outside/);
    replicaReads = 0;
    await adapter.withCurrentPull("root", async () => {
      const roots = await runtime.runPromise(
        T.entities([core.EntityId.make("root"), core.EntityId.make("root")], { validAt: 1000 }),
      );
      expect(roots.map((r) => r.length)).toEqual([1, 1]);
      const children = await runtime.runPromise(
        T.entities([core.EntityId.make("external/odd")], { validAt: 1001 }),
      );
      expect(children[0]![0]!.value).toEqual({ type: "number", value: 0.30000000000000004 });
    });
    expect(pulls).toBe(1);
    expect(replicaReads).toBe(0);
    for (const ids of [[], ["root"]])
      await expect(
        runtime.runPromise(
          adapter.getEntityTriples!(ids, { validAt: 1000, recordedPosition: broker.head() + 1024 }),
        ),
      ).rejects.toThrow(/not available/);
    expect(pulls).toBe(1);

    await runtime.runPromise(
      adapter.withTransaction(
        Effect.gen(function* () {
          expect(yield* adapter.getEntityTriples!(["root"], { validAt: 1000 })).toBeUndefined();
        }),
      ),
    );
  } finally {
    await runtime.dispose();
    await broker.close();
  }
});
it("verbatim fallback preserves non-UTF8 dictionary names and exact timestamp doubles", async () => {
  const { log } = await HostLog.open(fresh(), { minFreeBytes: 0 });
  const r = {
    ...row(1, "s:\ud800/a", 2048),
    attribute: ":x/\ud800",
    recorded_at: 1000.0000000000001,
    valid_from: 1000.0000000000001,
    created_by: "\ud800",
    tx_id: "tx:\ud800",
  };
  try {
    await append(log, [r]);
    const answer = await log.wholePull(2048, [r.entity_id]);
    const t = [...h1Rows(wholePullTuples(answer), { validAt: 2000 }).values()][0]![0]!;
    expect(t.entityId).toBe(r.entity_id);
    expect(t.attribute).toBe(r.attribute);
    expect(t.recordedAt).toBe(r.recorded_at);
    expect(t.validFrom).toBe(r.valid_from);
  } finally {
    await log.close();
  }
});
