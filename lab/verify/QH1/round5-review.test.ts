// [CX-VQH1-R5] Why: count real native-position requests, not hook wrapper invocations, and check late-level and staged reads.
// Rejected: testing only hook presence or using live engines for a deterministic adapter-level regression.
import fs from "node:fs";
import path from "node:path";
import { expect, it } from "vitest";
import { Effect, Layer, ManagedRuntime } from "effect";
import * as core from "@triplex-build/triplex";
import * as rt from "@triplex-build/triplex/runtime";
import { makeXtdbStorageAdapter } from "../../../packages/xtdb/src/XtdbStorageAdapter.js";
import { makeDatomicStorageAdapter } from "../../../packages/datomic/src/DatomicStorageAdapter.js";
import { decodeRow as decodeDatomicRow } from "../../../packages/datomic/src/protocol.js";
import { makeQleverStorageAdapter } from "../../../packages/qlever/src/QleverStorageAdapter.js";
import { numericFromOrderKey } from "../../../packages/qlever/src/rdf.js";
import { base, row } from "./helpers.js";

type Lane = "xtdb" | "datomic" | "qlever-native";
const E = core.EntityId.make,
  A = core.Attribute.make;
const tx = (n: number) => "_tx/" + String(n).padStart(26, "0");
const shape = (r: core.ReachResult) => r.triples.map((t) => [t.entityId, t.value.value]);
const OLD = [
  ["root", "a"],
  ["a", "b"],
  ["b", 1],
];
const MIXED = [
  ["root", "a"],
  ["a", "b"],
  ["b", 2],
];

function fixture(lane: Lane, after: "root" | "a" | undefined, noHook = false) {
  const state = {
    head: 1,
    changed: false,
    positions: 0,
    failPosition: false,
    requests: [] as { ids: string[]; cut: number | null }[],
  };
  const ref = (i: number, entity: string, target: string): rt.TripleRow => ({
    ...row(i, entity, 1),
    recorded_at: 1000,
    tx_id: tx(1),
    value_type: "ref",
    value_number: null,
    value_string: target,
  });
  const root = ref(1, "root", "a"),
    middle = ref(2, "a", "b");
  const leaf = { ...row(3, "b", 1), recorded_at: 1000, tx_id: tx(1), value_number: 1 };
  const next = { ...row(4, "b", 2), recorded_at: 1000, tx_id: tx(2), value_number: 2 };
  const position = () => {
    state.positions++;
    if (state.failPosition) throw Error("review-position-unavailable");
    return state.head;
  };
  const rows = (
    ids: readonly string[],
    cut?: number,
    held?: number,
    staged: rt.TripleRow[] = [],
  ) => {
    state.requests.push({ ids: [...ids], cut: cut ?? null });
    const snapshot = (held ?? cut ?? state.head) < 2 ? [root, middle, leaf] : [middle, next];
    const selected = [...snapshot, ...staged].filter(
      (r) => ids.includes(r.entity_id) && (cut === undefined || r.recorded_position <= cut),
    );
    if (after && ids.includes(after) && !state.changed) {
      state.changed = true;
      state.head = 2;
    }
    return selected;
  };
  let adapter: rt.StorageAdapterService;
  if (lane === "xtdb")
    adapter = makeXtdbStorageAdapter(
      {
        submit: async () => ({}),
        query: async (sql: string, params: unknown[]) => {
          if (sql.startsWith("SELECT position")) return [{ position: position() }];
          if (!sql.includes("FROM tx_assertions")) throw Error("Unexpected SQL " + sql);
          const entities = /entity_id IN \(([^)]+)\)/.exec(sql)!;
          const ids = params.slice(1, 1 + entities[1]!.split(",").length) as string[];
          const offset = sql.indexOf("recorded_position <= ?");
          const cut =
            offset < 0
              ? undefined
              : (params[(sql.slice(0, offset).match(/\?/g) ?? []).length] as number);
          return rows(ids, cut);
        },
      } as any,
      "r5-review",
    );
  else if (lane === "datomic")
    adapter = makeDatomicStorageAdapter(
      {
        create: async () => ({}),
        basis: async () => ({ position: { v: position() } }),
        begin: async () => ({ handle: "held", position: state.head }),
        release: async () => ({}),
        rows: async (_db: string, input: any) =>
          rows(
            input.entityIds,
            input.basis?.recordedPosition,
            input.handle ? 1 : undefined,
            input.staged?.rows.map(decodeDatomicRow) ?? [],
          ),
      } as any,
      "r5-review",
    );
  else
    adapter = makeQleverStorageAdapter(
      {
        query: async (sql: string) => {
          if (sql === "SELECT ?s WHERE { ?s ?p ?o } LIMIT 1") return [];
          if (sql.startsWith("SELECT ?position"))
            return [{ position: { type: "literal", value: String(position()) } }];
          if (!sql.startsWith("SELECT ?row")) throw Error("Unexpected SPARQL " + sql);
          const entities = /VALUES \?entity \{ ([^}]+) \}/.exec(sql)!;
          const ids = [...entities[1]!.matchAll(/"([^"]*)"/g)].map((m) => m[1]!);
          const cutText = /FILTER\(\?recordedOrder <= "([^"]+)"/.exec(sql)?.[1];
          return rows(ids, cutText === undefined ? undefined : numericFromOrderKey(cutText)).map(
            (r) => ({ row: { type: "literal", value: JSON.stringify(r) } }),
          );
        },
      } as any,
      "r5-review",
    );
  const selected = noHook ? { ...adapter, pullPosition: undefined } : adapter;
  const runtime = ManagedRuntime.make(
    rt.Runtime.define({
      name: "r5-review",
      storage: Layer.succeed(rt.StorageAdapter, selected),
      queries: Layer.succeed(rt.QueryExecutor, {} as any),
    }).layer({
      scope: rt.DatabaseScope.test("r5-review"),
      capabilities: rt.Capabilities.none,
      deterministic: { startTime: 1000, seed: "r5-review" },
    }),
  );
  return { state, adapter, runtime };
}

for (const lane of ["xtdb", "datomic", "qlever-native"] as const) {
  for (const after of ["root", "a"] as const)
    for (const at of [undefined, 1000]) {
      it(`${lane}: one native cut, commit after ${after}, recordedAt ${at ?? "head"}`, async () => {
        const observations = [];
        for (const noHook of [false, true]) {
          const { state, runtime } = fixture(lane, after, noHook);
          try {
            const T = await runtime.runPromise(Effect.service(core.Triples));
            const basis = { validAt: 2000, ...(at === undefined ? {} : { recordedAt: at }) };
            const answer = await runtime.runPromise(T.reach(E("root"), basis));
            // This is first so removing the hook fails on observed bytes, rather than on a missing method assertion.
            expect(shape(answer)).toEqual(noHook ? MIXED : OLD);
            expect(answer.hops).toBe(3);
            expect(state.changed).toBe(true);
            expect(state.positions).toBe(noHook ? 0 : 1);
            expect(state.requests).toHaveLength(3);
            expect(state.requests.every((r) => r.cut === (noHook ? null : 1))).toBe(true);
            observations.push({
              noHook,
              nativePositionRequests: state.positions,
              requests: [...state.requests],
              answer: shape(answer),
            });
            if (!noHook) {
              expect(shape(await runtime.runPromise(T.reach(E("root"), basis)))).toEqual([]);
              expect(state.positions).toBe(2);
            }
          } finally {
            await runtime.dispose();
          }
        }
        fs.writeFileSync(
          path.join(base, `r5-${lane}-${after}-${at ?? "head"}.json`),
          JSON.stringify(observations, null, 2),
        );
      });
    }

  it(`${lane}: transaction hook offers no position and staged rows remain visible`, async () => {
    const { adapter, state, runtime } = fixture(lane, undefined);
    try {
      const T = await runtime.runPromise(Effect.service(core.Triples));
      const result = await runtime.runPromise(
        adapter
          .withTransaction(
            Effect.gen(function* () {
              const before = state.positions;
              expect(yield* adapter.pullPosition!()).toBeUndefined();
              const p = yield* adapter.nextCommitPosition();
              yield* adapter.insert(
                {
                  entityId: E("root"),
                  attribute: A(":x/staged"),
                  value: { type: "ref", value: E("staged") },
                  validFrom: 0,
                },
                tx(2),
                1000,
                "5".padStart(26, "0"),
                p,
              );
              yield* adapter.insert(
                {
                  entityId: E("staged"),
                  attribute: A(":x/value"),
                  value: { type: "number", value: 7 },
                  validFrom: 0,
                },
                tx(2),
                1000,
                "6".padStart(26, "0"),
                p,
              );
              expect(yield* adapter.pullPosition!()).toBeUndefined();
              const answer = yield* T.reach(E("root"), { validAt: 2000, recordedAt: 1000 });
              expect(
                shape(answer)
                  .map((r) => r.join(":"))
                  .sort(),
              ).toEqual(["root:a", "a:b", "b:1", "root:staged", "staged:7"].sort());
              expect(state.positions).toBe(before);
              return yield* Effect.fail("REVIEW_ROLLBACK");
            }),
          )
          .pipe(
            Effect.catch((error) =>
              error === "REVIEW_ROLLBACK" ? Effect.succeed("rolled-back") : Effect.fail(error),
            ),
          ),
      );
      expect(result).toBe("rolled-back");
    } finally {
      await runtime.dispose();
    }
  });

  it(`${lane}: failed position capture refuses the pull before answering any level`, async () => {
    const { state, runtime } = fixture(lane, undefined);
    try {
      const T = await runtime.runPromise(Effect.service(core.Triples));
      state.failPosition = true;
      await expect(runtime.runPromise(T.reach(E("root"), { validAt: 2000 }))).rejects.toMatchObject(
        { _tag: "ReadError" },
      );
      expect(state.positions).toBe(1);
      expect(state.requests).toEqual([]);
    } finally {
      await runtime.dispose();
    }
  });
}
