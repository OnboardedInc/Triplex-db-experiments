// [CX-VQH1] Why: challenge the new closure API at a commit boundary and exercise each dictionary column separately.
// Rejected: counting a green worker corpus as coverage of multi-level fallback snapshots.
import { expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { Effect, Layer, ManagedRuntime, Option } from "effect";
import * as core from "@triplex-build/triplex";
import * as rt from "@triplex-build/triplex/runtime";
import { HostBroker } from "../../../packages/qlever/src/broker/broker.js";
import { HostLog } from "../../../packages/qlever/src/broker/log.js";
import { makeQleverBrokerStorageAdapter } from "../../../packages/qlever/src/broker/BrokerStorageAdapter.js";
import { makeQleverQueryExecutor } from "../../../packages/qlever/src/QleverQueryExecutor.js";
import { h1Rows, wholePullTuples } from "../../../packages/qlever/src/broker/h1.js";
import { sqliteWorker } from "../../../packages/qlever/src/broker/sqlite-worker.js";
import { openWorker } from "./worker-client.js";
import { append, fresh, row, base } from "./helpers.js";

const client: any = {
  query: async (sql: string) => {
    if (sql === "SELECT ?s WHERE { ?s ?p ?o } LIMIT 1") return [];
    throw new TypeError("offline", {
      cause: Object.assign(new Error("offline"), { code: "ECONNREFUSED" }),
    });
  },
};
const E = core.EntityId.make;
const tx = (n: number) => "_tx/" + n.toString().padStart(26, "0");
const bits = (n: number) => {
  const d = new DataView(new ArrayBuffer(8));
  d.setFloat64(0, n);
  return d.getBigUint64(0);
};

it("public commits alone reproduce the fallback's mixed-cut closure", async () => {
  const witnesses: any[] = [];
  for (const recordedAt of [undefined, 1000]) {
    const broker = await HostBroker.open({
      dir: fresh(),
      scopeKey: "review-public",
      minFreeBytes: 0,
    });
    const adapter = makeQleverBrokerStorageAdapter(
      client,
      "review-public",
      broker,
      recordedAt === undefined ? {} : { currentRoute: "h1" },
    );
    let armed = false,
      changed = false,
      rootId: any,
      childId: any,
      T: core.TriplesService;
    const intercepted = {
      ...adapter,
      getByEntities: (ids: readonly string[], basis: any) =>
        adapter.getByEntities(ids, basis).pipe(
          Effect.tap(() =>
            Effect.promise(async () => {
              if (!armed || changed || !ids.includes("root")) return;
              changed = true;
              await runtime.runPromise(
                T.transact([
                  { op: "retract", id: rootId },
                  { op: "retract", id: childId },
                  {
                    op: "assert",
                    entityId: E("target"),
                    attribute: core.Attribute.make(":x/value"),
                    value: { type: "number", value: 2 },
                    validFrom: 0,
                  },
                ]),
              );
            }),
          ),
        ),
    };
    const runtime = ManagedRuntime.make(
      rt.Runtime.define({
        name: "review-public",
        storage: Layer.succeed(rt.StorageAdapter, intercepted),
        queries: Layer.succeed(
          rt.QueryExecutor,
          makeQleverQueryExecutor(client, "review-public", { sourceView: adapter.sourceView }),
        ),
      }).layer({
        scope: rt.DatabaseScope.test("review-public"),
        capabilities: rt.Capabilities.none,
        deterministic: { startTime: 1000, seed: "review-public" },
      }),
    );
    try {
      T = await runtime.runPromise(Effect.service(core.Triples));
      const first = await runtime.runPromise(
        T.transact([
          {
            op: "assert",
            entityId: E("root"),
            attribute: core.Attribute.make(":x/ref"),
            value: { type: "ref", value: E("target") },
            validFrom: 0,
          },
          {
            op: "assert",
            entityId: E("target"),
            attribute: core.Attribute.make(":x/value"),
            value: { type: "number", value: 1 },
            validFrom: 0,
          },
        ]),
      );
      [rootId, childId] = first.triples.map((t) => t.id);
      armed = true;
      const answer = await runtime.runPromise(
        T.reach(E("root"), { validAt: 2000, ...(recordedAt === undefined ? {} : { recordedAt }) }),
      );
      expect(changed).toBe(true);
      expect(answer.triples.map((t) => [t.entityId, t.value.value])).toEqual([
        ["root", "target"],
        ["target", 2],
      ]);
      expect((await runtime.runPromise(T.reach(E("root"), { validAt: 2000 }))).triples).toEqual([]);
      witnesses.push({
        witness: "public-commits-mixed-cut",
        recordedAt: recordedAt ?? null,
        firstPosition: first.position,
        afterPosition: broker.head(),
        answer: answer.triples.map((t) => ({
          entity: t.entityId,
          value: t.value.value,
          recordedAt: t.recordedAt,
        })),
        afterAnswer: [],
      });
    } finally {
      await runtime.dispose();
      await broker.close();
    }
  }
  fs.writeFileSync(path.join(base, "mixed-cut-witness.json"), JSON.stringify(witnesses, null, 2));
}, 120000);

for (const mode of ["off", "recordedAt", "pinned-control"] as const) {
  it(`snapshot boundary ${mode}: records whether reach mixes commits`, async () => {
    const broker = await HostBroker.open({
      dir: fresh(),
      scopeKey: "review-snapshot",
      minFreeBytes: 0,
    });
    const log = (broker as any).log as HostLog;
    const adapter = makeQleverBrokerStorageAdapter(client, "review-snapshot", broker, {
      currentRoute: mode === "off" ? undefined : "h1",
    });
    const root = {
      ...row(1, "root", 2048),
      tx_id: tx(1),
      value_type: "ref" as const,
      value_number: null,
      value_string: "target",
    };
    const old = { ...row(2, "target", 2048), tx_id: tx(1), value_number: 1 };
    let changed = false;
    const intercepted = {
      ...adapter,
      getByEntities: (ids: readonly string[], basis: any) =>
        adapter.getByEntities(ids, basis).pipe(
          Effect.tap(() =>
            Effect.promise(async () => {
              if (changed || !ids.includes("root")) return;
              changed = true;
              await append(log, [
                { ...root, retracted_at: 200, retracted_position: 3072, retract_tx_id: tx(2) },
                { ...old, retracted_at: 200, retracted_position: 3072, retract_tx_id: tx(2) },
                { ...row(3, "target", 3072), recorded_at: 200, tx_id: tx(2), value_number: 2 },
              ]);
              (broker as any).durableLsn = log.nextLsn - 1;
              (broker as any).headPosition = 3072;
            }),
          ),
        ),
    };
    const runtime = ManagedRuntime.make(
      rt.Runtime.define({
        name: "review-snapshot",
        storage: Layer.succeed(rt.StorageAdapter, intercepted),
        queries: Layer.succeed(
          rt.QueryExecutor,
          makeQleverQueryExecutor(client, "review-snapshot", { sourceView: adapter.sourceView }),
        ),
      }).layer({
        scope: rt.DatabaseScope.test("review-snapshot"),
        capabilities: rt.Capabilities.none,
        deterministic: { startTime: 1000, seed: "review" },
      }),
    );
    try {
      const T = await runtime.runPromise(Effect.service(core.Triples));
      await append(log, [root, old]);
      (broker as any).durableLsn = log.nextLsn - 1;
      (broker as any).headPosition = 2048;
      const read = () =>
        runtime.runPromise(
          T.reach(E("root"), { validAt: 1000, ...(mode === "off" ? {} : { recordedAt: 200 }) }),
        );
      const answer =
        mode === "pinned-control"
          ? await adapter.withCurrentPull("root", read, 2048)
          : await read();
      expect(changed).toBe(true);
      expect(answer.triples.map((t) => [t.entityId, t.value.value])).toEqual([
        ["root", "target"],
        ["target", mode === "pinned-control" ? 1 : 2],
      ]);
      // No cut has root's ref and target=2: the same commit removes that ref and replaces target=1 with target=2.
      const after = await runtime.runPromise(T.reach(E("root"), { validAt: 1000 }));
      expect(after.triples).toEqual([]);
    } finally {
      await runtime.dispose();
      await broker.close();
    }
  }, 120000);
}

it("each blob dictionary projection triggers the guard and preserves every original field", async () => {
  const marker = "bad:\ud800";
  const fields = [
    "entity_id",
    "attribute",
    "value_string",
    "created_by",
    "entity_type",
    "tx_id",
  ] as const;
  for (const field of fields) {
    const r = {
      ...row(10, "root", 1024),
      [field]: marker,
      ...(field === "value_string" ? { value_type: "ref", value_number: null } : {}),
    };
    for (const guarded of [true, false]) {
      const source = guarded
        ? sqliteWorker
        : sqliteWorker.replace("return safe.get(args);", "throw Error('REVIEW_BLOB_FALLBACK');");
      expect(source === sqliteWorker).toBe(guarded);
      const worker = await openWorker(source);
      try {
        await worker.append([r]);
        const pull = () => worker.call("wholePull", { basis: 1024, roots: [r.entity_id] });
        if (!guarded) {
          await expect(pull(), field).rejects.toThrow("REVIEW_BLOB_FALLBACK");
          continue;
        }
        const tuples = wholePullTuples(await pull());
        expect(tuples).toHaveLength(1);
        expect(tuples[0]![14].row).toEqual(r);
        if (field === "value_string") {
          expect(() => h1Rows(tuples, { validAt: 1000 })).toThrow(/outside/);
          continue;
        }
        const t = [...h1Rows(tuples, { validAt: 1000 }).values()].flat()[0]!;
        expect(t.entityId).toBe(r.entity_id);
        expect(t.attribute).toBe(r.attribute);
        expect(Option.getOrNull(t.createdBy)).toBe(r.created_by);
        expect(Option.getOrNull(t.entityType)).toBe(r.entity_type);
        expect(Option.getOrNull(t.txId)).toBe(r.tx_id);
      } finally {
        await worker.close();
      }
    }
  }
}, 120000);

it("REAL record metadata survives both public reach and entities APIs at IEEE precision", async () => {
  const broker = await HostBroker.open({ dir: fresh(), scopeKey: "review-real", minFreeBytes: 0 });
  const log = (broker as any).log as HostLog;
  const adapter = makeQleverBrokerStorageAdapter(client, "review-real", broker, {
    currentRoute: "h1",
  });
  const runtime = ManagedRuntime.make(
    rt.Runtime.define({
      name: "review-real",
      storage: Layer.succeed(rt.StorageAdapter, adapter),
      queries: Layer.succeed(
        rt.QueryExecutor,
        makeQleverQueryExecutor(client, "review-real", { sourceView: adapter.sourceView }),
      ),
    }).layer({ scope: rt.DatabaseScope.test("review-real"), capabilities: rt.Capabilities.none }),
  );
  const r = {
    ...row(1, "root", 2048),
    tx_id: tx(1),
    recorded_at: 1000.0000000000001,
    valid_from: 1000.5000000000001,
    valid_to: 100000.00000000001,
    value_number: 2 ** 53 + 2,
  };
  try {
    const T = await runtime.runPromise(Effect.service(core.Triples));
    await append(log, [r]);
    (broker as any).durableLsn = log.nextLsn - 1;
    (broker as any).headPosition = 2048;
    for (const t of [
      (await runtime.runPromise(T.reach(E("root"), { validAt: 2000 }))).triples[0]!,
      (await runtime.runPromise(T.entities([E("root")], { validAt: 2000 })))[0]![0]!,
    ]) {
      expect(bits(t.recordedAt)).toBe(bits(r.recorded_at));
      expect(bits(t.validFrom)).toBe(bits(r.valid_from));
      expect(bits(Option.getOrThrow(t.validTo))).toBe(bits(r.valid_to));
      expect(bits(t.value.value as number)).toBe(bits(r.value_number));
    }
  } finally {
    await runtime.dispose();
    await broker.close();
  }
}, 120000);
