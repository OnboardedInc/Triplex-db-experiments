// [EXP-QH1-R4] Why: a public pull must return a graph that existed at one commit (P1 pinned reads, answer correctness). CX-VQH1 F1
// showed the level-by-level fallback of Triples.reach reading each level at a fresh head, so a commit between levels produced a graph
// no cut contains. These tests commit between levels through the public T.transact and require the whole old graph (the pull began
// before the commit) and, for a pull started afterwards, the whole new graph. Ported from the reviewer's
// review-adversarial.test.ts ("public commits alone reproduce the fallback's mixed-cut closure") with the corrected expectation.
// Rejected: asserting the mixed result the reviewer's version recorded (it certified the defect, not the semantics); injecting the
// commit by private log mutation only (the public-commit cases are the ones a caller can reach; the direct-log cases are kept as a
// second, lower-level witness).
import { describe, expect, it } from "vitest";
import { Effect, Layer, ManagedRuntime } from "effect";
import * as core from "@triplex-build/triplex";
import * as rt from "@triplex-build/triplex/runtime";
import { HostBroker } from "../../../packages/qlever/src/broker/broker.js";
import { HostLog } from "../../../packages/qlever/src/broker/log.js";
import { makeQleverBrokerStorageAdapter } from "../../../packages/qlever/src/broker/BrokerStorageAdapter.js";
import { makeQleverQueryExecutor } from "../../../packages/qlever/src/QleverQueryExecutor.js";
import { append, fresh, row } from "./helpers.js";

const client: any = {
  query: async (sql: string) => {
    if (sql === "SELECT ?s WHERE { ?s ?p ?o } LIMIT 1") return [];
    throw new TypeError("offline", {
      cause: Object.assign(new Error("offline"), { code: "ECONNREFUSED" }),
    });
  },
};
const E = core.EntityId.make;
const A = core.Attribute.make;
const tx = (n: number) => "_tx/" + n.toString().padStart(26, "0");
const shape = (r: { triples: readonly core.Triple[] }) =>
  r.triples.map((t) => [t.entityId, t.value.value]);

const OLD = [
  ["root", "a"],
  ["a", "b"],
  ["b", 1],
];

type Mode = "h1-off" | "h1-on-recordedAt" | "h1-on-head";

const open = async (mode: Mode, hook: (ids: readonly string[]) => Promise<void>) => {
  const broker = await HostBroker.open({ dir: fresh(), scopeKey: "reach-cut", minFreeBytes: 0 });
  const adapter = makeQleverBrokerStorageAdapter(
    client,
    "reach-cut",
    broker,
    mode === "h1-off" ? {} : { currentRoute: "h1" },
  );
  const intercepted = {
    ...adapter,
    getByEntities: (ids: readonly string[], basis: any) =>
      adapter.getByEntities(ids, basis).pipe(Effect.tap(() => Effect.promise(() => hook(ids)))),
  };
  const runtime = ManagedRuntime.make(
    rt.Runtime.define({
      name: "reach-cut",
      storage: Layer.succeed(rt.StorageAdapter, intercepted),
      queries: Layer.succeed(
        rt.QueryExecutor,
        makeQleverQueryExecutor(client, "reach-cut", { sourceView: adapter.sourceView }),
      ),
    }).layer({
      scope: rt.DatabaseScope.test("reach-cut"),
      capabilities: rt.Capabilities.none,
      // One clock reading for every commit: the two commits share recordedAt = 1000, so a timestamp cannot name a cut.
      deterministic: { startTime: 1000, seed: "reach-cut" },
    }),
  );
  const T = await runtime.runPromise(Effect.service(core.Triples));
  return { broker, adapter, runtime, T };
};

const seed = (T: core.TriplesService) =>
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
  ]);

describe("a commit between levels yields the whole old graph or the whole new graph", () => {
  for (const mode of ["h1-off", "h1-on-recordedAt"] as const) {
    for (const after of ["root", "a"] as const) {
      it(`${mode}, commit lands after the read of ${after}`, async () => {
        let armed = false,
          changed = false,
          ids: any[] = [],
          T!: core.TriplesService,
          runtime!: Awaited<ReturnType<typeof open>>["runtime"];
        const o = await open(mode, async (read) => {
          if (!armed || changed || !read.includes(after)) return;
          changed = true;
          // One commit: the root reference goes, b's value is replaced. At this cut the closure is empty.
          await runtime.runPromise(
            T.transact([
              { op: "retract", id: ids[0] },
              { op: "retract", id: ids[2] },
              {
                op: "assert",
                entityId: E("b"),
                attribute: A(":x/value"),
                value: { type: "number", value: 2 },
                validFrom: 0,
              },
            ]),
          );
        });
        ({ T, runtime } = o);
        try {
          const first = await runtime.runPromise(seed(T));
          ids = first.triples.map((t) => t.id);
          armed = true;
          const basis = { validAt: 2000, ...(mode === "h1-off" ? {} : { recordedAt: 1000 }) };
          const answer = await runtime.runPromise(T.reach(E("root"), basis));
          expect(changed).toBe(true);
          expect(shape(answer)).toEqual(OLD);
          expect(answer.hops).toBe(3);
          // A pull that starts after the commit sees the whole new graph (the root reference is gone).
          armed = false;
          expect(shape(await runtime.runPromise(T.reach(E("root"), { validAt: 2000 })))).toEqual(
            [],
          );
          // The record-time cut at the same instant still names no cut by itself; the head is the new graph.
          expect(o.broker.head()).toBeGreaterThan(first.position);
        } finally {
          await runtime.dispose();
          await o.broker.close();
        }
      }, 120000);
    }
  }

  it("H1 on, no record-time cut: the direct route answers the whole old graph, then the whole new graph", async () => {
    const o = await open("h1-on-head", async () => {});
    const { T, runtime, adapter } = o;
    try {
      const first = await runtime.runPromise(seed(T));
      const before = await runtime.runPromise(T.reach(E("root"), { validAt: 2000 }));
      expect(shape(before)).toEqual(OLD);
      expect(adapter.routes.h1).toBeGreaterThan(0);
      await runtime.runPromise(T.transact([{ op: "retract", id: first.triples[0]!.id }]));
      const after = await runtime.runPromise(T.reach(E("root"), { validAt: 2000 }));
      expect(shape(after)).toEqual([]);
    } finally {
      await runtime.dispose();
      await o.broker.close();
    }
  }, 120000);

  it("an explicit caller pin (withCurrentPull) is not overridden by the pull's own position", async () => {
    const o = await open("h1-off", async () => {});
    const { T, runtime, adapter } = o;
    try {
      const first = await runtime.runPromise(seed(T));
      await runtime.runPromise(
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
      );
      const pinned = await adapter.withCurrentPull(
        "root",
        () => runtime.runPromise(T.reach(E("root"), { validAt: 2000 })),
        first.position,
      );
      expect(shape(pinned)).toEqual(OLD);
    } finally {
      await runtime.dispose();
      await o.broker.close();
    }
  }, 120000);

  for (const mode of ["h1-off", "h1-on-head"] as const) {
    it(`${mode}: reads inside a transaction still see its staged writes (the pull's position is not applied)`, async () => {
      const o = await open(mode, async () => {});
      const { T, runtime, adapter } = o;
      try {
        await runtime.runPromise(seed(T));
        const result = await runtime.runPromise(
          adapter.withTransaction(
            Effect.gen(function* () {
              // Staged in this transaction: a new child under b that no committed cut contains.
              yield* T.transact([
                {
                  op: "assert",
                  entityId: E("b"),
                  attribute: A(":x/ref"),
                  value: { type: "ref", value: E("staged") },
                  validFrom: 0,
                },
                {
                  op: "assert",
                  entityId: E("staged"),
                  attribute: A(":x/value"),
                  value: { type: "number", value: 7 },
                  validFrom: 0,
                },
              ]);
              return yield* T.reach(E("root"), { validAt: 2000 });
            }),
          ),
        );
        expect(
          shape(result)
            .map((x) => x.join(":"))
            .toSorted(),
        ).toEqual(["a:b", "b:1", "b:staged", "root:a", "staged:7"].toSorted());
      } finally {
        await runtime.dispose();
        await o.broker.close();
      }
    }, 120000);
  }
});

// Lower-level witness (the reviewer's direct-log cases): the commit is appended to the broker log between levels, with an exact
// position cut at 2048 and 3072.
for (const mode of ["off", "recordedAt", "pinned-control"] as const) {
  it(`snapshot boundary ${mode}: whole old graph`, async () => {
    const broker = await HostBroker.open({
      dir: fresh(),
      scopeKey: "reach-cut-snapshot",
      minFreeBytes: 0,
    });
    const log = (broker as any).log as HostLog;
    const adapter = makeQleverBrokerStorageAdapter(client, "reach-cut-snapshot", broker, {
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
        name: "reach-cut-snapshot",
        storage: Layer.succeed(rt.StorageAdapter, intercepted),
        queries: Layer.succeed(
          rt.QueryExecutor,
          makeQleverQueryExecutor(client, "reach-cut-snapshot", {
            sourceView: adapter.sourceView,
          }),
        ),
      }).layer({
        scope: rt.DatabaseScope.test("reach-cut-snapshot"),
        capabilities: rt.Capabilities.none,
        deterministic: { startTime: 1000, seed: "reach-cut" },
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
      expect(shape(answer)).toEqual([
        ["root", "target"],
        ["target", 1],
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
