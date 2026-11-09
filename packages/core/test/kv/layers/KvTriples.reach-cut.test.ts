/**
 * [EXP-QH1-R4] A KV pull (`reach`, and a multi-entity `entities` call) reads every level and entity at one commit position.
 * A commit landing between two scans yields the whole old graph (the pull began before it) or, for a later pull, the whole new
 * graph; never a mix. Both commits carry the same clock reading, so a timestamp cannot name the cut.
 * Rejected: asserting only the final state (the defect is visible only while a commit lands mid-pull).
 */
import { describe, expect, it } from "vitest";
import { Effect, Layer, ManagedRuntime, Stream } from "effect";
import { Triples, EntityId, Attribute } from "../../../src/index.js";
import type { TripleId } from "../../../src/Branded.js";
import { makeTestKvBackend } from "../../../src/kv/kv/InMemoryKvBackend.js";
import { KvBackend, type KvBackendService } from "../../../src/kv/kv/KvBackend.js";
import { KvTriplesLive } from "../../../src/kv/layers/KvTriplesLive.js";
import { TripleStoreRuntime } from "../../../src/store/TripleStoreRuntime.js";

const E = EntityId.make;
const A = Attribute.make;
const NOW = 1_800_000_000_000;

const harness = () => {
  let id = 0;
  const nextId = () => String(++id).padStart(26, "0");
  const base = makeTestKvBackend();
  // The hook runs after the Nth completed range scan (one per scanned entity) once armed.
  const state = { armed: false, scans: 0, fireAt: 0, fired: false, hook: async () => {} };
  const backend: KvBackendService = {
    ...base,
    getRange: (options) =>
      Stream.unwrap(
        Effect.gen(function* () {
          const entries = yield* Stream.runCollect(base.getRange(options));
          if (state.armed && !state.fired) {
            state.scans++;
            if (state.scans === state.fireAt) {
              state.fired = true;
              yield* Effect.promise(() => state.hook());
            }
          }
          return Stream.fromIterable(entries);
        }),
      ),
  };
  const layer = KvTriplesLive.pipe(
    Layer.provide(Layer.succeed(KvBackend, backend)),
    Layer.provide(
      Layer.succeed(TripleStoreRuntime, {
        scope: "test:kv-reach-cut",
        now: Effect.succeed(NOW),
        nextTxId: Effect.sync(() => `_tx/${nextId()}`),
        nextTripleId: Effect.sync(() => nextId() as TripleId),
      }),
    ),
  );
  return { state, runtime: ManagedRuntime.make(layer) };
};

const ref = (entityId: string, to: string) =>
  ({
    op: "assert",
    entityId: E(entityId),
    attribute: A(":x/ref"),
    value: { type: "ref", value: E(to) },
    validFrom: 0,
  }) as const;
const num = (entityId: string, value: number) =>
  ({
    op: "assert",
    entityId: E(entityId),
    attribute: A(":x/value"),
    value: { type: "number", value },
    validFrom: 0,
  }) as const;
const shape = (r: {
  readonly triples: readonly { entityId: string; value: { value: unknown } }[];
}) => r.triples.map((t) => [t.entityId, t.value.value]);

describe("KV pulls read at one commit position", () => {
  for (const fireAt of [1, 2]) {
    for (const withRecordedAt of [false, true]) {
      it(`reach: commit after scan ${fireAt}${withRecordedAt ? ", record-time cut at the shared instant" : ""}`, async () => {
        const { state, runtime } = harness();
        try {
          const T = await runtime.runPromise(Effect.service(Triples));
          const first = await runtime.runPromise(
            T.transact([ref("root", "a"), ref("a", "b"), num("b", 1)]),
          );
          const ids = first.triples.map((t) => t.id);
          state.armed = true;
          state.fireAt = fireAt;
          state.hook = async () => {
            await runtime.runPromise(
              T.transact([
                { op: "retract", id: ids[0]! },
                { op: "retract", id: ids[2]! },
                num("b", 2),
              ]),
            );
          };
          const answer = await runtime.runPromise(
            T.reach(E("root"), { validAt: NOW, ...(withRecordedAt ? { recordedAt: NOW } : {}) }),
          );
          expect(state.fired).toBe(true);
          expect(shape(answer)).toEqual([
            ["root", "a"],
            ["a", "b"],
            ["b", 1],
          ]);
          expect(answer.hops).toBe(3);
          state.armed = false;
          expect(shape(await runtime.runPromise(T.reach(E("root"), { validAt: NOW })))).toEqual([]);
        } finally {
          await runtime.dispose();
        }
      });
    }
  }

  it("entities: one call over several entities reads one cut", async () => {
    const { state, runtime } = harness();
    try {
      const T = await runtime.runPromise(Effect.service(Triples));
      const first = await runtime.runPromise(T.transact([ref("root", "a"), num("b", 1)]));
      const ids = first.triples.map((t) => t.id);
      state.armed = true;
      state.fireAt = 1;
      state.hook = async () => {
        await runtime.runPromise(
          T.transact([{ op: "retract", id: ids[0]! }, { op: "retract", id: ids[1]! }, num("b", 2)]),
        );
      };
      const bodies = await runtime.runPromise(T.entities([E("root"), E("b")], { validAt: NOW }));
      expect(state.fired).toBe(true);
      expect(bodies.map((body) => body.map((t) => [t.entityId, t.value.value]))).toEqual([
        [["root", "a"]],
        [["b", 1]],
      ]);
    } finally {
      await runtime.dispose();
    }
  });
});
