import { randomUUID } from "node:crypto";
import { Effect, Layer, ManagedRuntime } from "effect";
import { describe, expect, it } from "vitest";
import { Triples } from "@triplex-build/triplex";
import {
  DatabaseScope,
  Runtime,
  StorageAdapter,
  QueryExecutor,
  Capabilities,
} from "@triplex-build/triplex/runtime";
import { DatomicClient } from "../src/DatomicClient.js";
import { makeDatomicStorageAdapter } from "../src/DatomicStorageAdapter.js";
import { makeDatomicQueryExecutor } from "../src/DatomicQueryExecutor.js";
// [DX-B5-L3] Why: compare observable answers, order and temporal metadata against an independent physical layout.
// Rejected: comparing counts, accepting declines as equivalence, or using nondeterministic assertion identities.
describe.skipIf(process.env.DATOMIC_INTEGRATION !== "1")("layout differential", () => {
  // [DX-B6-4] Why: both layouts must filter the same untyped SPI neighbors.
  // Rejected: counting a decoder failure as journal parity.
  it("filters untyped journal neighbors before branded decoding on both layouts", async () => {
    const client = new DatomicClient(process.env.DATOMIC_GATEWAY_URL ?? "http://127.0.0.1:8505");
    const outcomes = [];
    try {
      for (const layout of ["legacy", "lean"] as const) {
        const scope = DatabaseScope.test(`b5-error-${layout}-${randomUUID()}`);
        const adapter = makeDatomicStorageAdapter(client, scope, { layout });
        const runtime = ManagedRuntime.make(
          Runtime.define({
            name: "b5-error",
            storage: Layer.succeed(StorageAdapter, adapter),
            queries: Layer.succeed(QueryExecutor, makeDatomicQueryExecutor(client, scope)),
          }).layer({
            scope,
            capabilities: Capabilities.none,
            deterministic: { startTime: 1000, seed: "b5-error" },
          }),
        );
        try {
          const triples = await runtime.runPromise(Triples);
          const receipt = await runtime.runPromise(
            triples.transact([
              {
                op: "assert",
                entityId: "root" as never,
                attribute: ":public/value" as never,
                value: { type: "string", value: "one" },
              },
            ]),
          );
          await Effect.runPromise(
            adapter.withTransaction(
              Effect.gen(function* () {
                const p = yield* adapter.nextCommitPosition();
                yield* adapter.insert(
                  {
                    entityId: receipt.txId,
                    attribute: ":_tx/actor",
                    value: { type: "string", value: "untyped" },
                  },
                  "spi",
                  1000,
                  "untyped-journal",
                  p,
                );
              }),
            ),
          );
          expect(await Effect.runPromise(adapter.getById("untyped-journal"))).toMatchObject({
            entity_id: receipt.txId,
            entity_type: null,
            tx_id: "spi",
          });
          const page = await Effect.runPromise(adapter.getTransactionsAfter!(0, 10));
          expect(page).toHaveLength(1);
          expect(page![0]!.txId).toBe(receipt.txId);
          expect(page![0]!.triples.some((t) => t.id === "untyped-journal")).toBe(false);
          expect(page![0]!.triples.length).toBeGreaterThan(0);
          const outcome = page![0]!.triples.map((t) => ({
            attribute: t.attribute,
            value: t.value,
          }));
          outcomes.push(outcome);
        } finally {
          await runtime.dispose();
          await client.delete(scope);
        }
      }
      expect(outcomes[0]).toEqual(outcomes[1]);
      console.log(JSON.stringify({ typedErrorParity: outcomes }));
    } finally {
      client.close();
    }
  });
  it("compares 300 deterministic scenarios across every storage read and public journal/reach", async () => {
    const c = new DatomicClient(process.env.DATOMIC_GATEWAY_URL ?? "http://127.0.0.1:8505", 30000);
    let seed = 0x19870219,
      comparisons = 0,
      fast = 0,
      rowClosures = 0,
      randomDraws = 0;
    const rand = () => {
      randomDraws++;
      seed ^= seed << 13;
      seed ^= seed >>> 17;
      seed ^= seed << 5;
      return seed >>> 0;
    };
    const count = Number(process.env.DX_B5_SCENARIOS ?? 300);
    const equal = (a: unknown, b: unknown) => {
      expect(a).toEqual(b);
      comparisons++;
    };
    try {
      const firstScenario = Number(process.env.DX_B5_SCENARIO_START ?? 0);
      // [DX-B6] Why: split the unchanged 300-case corpus across 15-minute windows without restarting its RNG stream.
      // Rejected: independent batch seeds (would silently replace scenarios 100..299).
      const drawsPerScenario =
        6 * 4 * 3 + [2, 5, 7].reduce((n, positions) => n + positions + 7 + positions, 0);
      if (
        !Number.isSafeInteger(firstScenario) ||
        firstScenario < 0 ||
        !Number.isSafeInteger(count) ||
        count < 1
      )
        throw new RangeError("Invalid differential range");
      for (let skipped = 0; skipped < firstScenario * drawsPerScenario; skipped++) rand();
      const inputRandomState = seed;
      for (let scenario = firstScenario; scenario < firstScenario + count; scenario++) {
        const stores = await Promise.all(
          (["legacy", "lean"] as const).map(async (layout) => {
            const scope = DatabaseScope.test(`b5-${layout}-${randomUUID()}`);
            const adapter = makeDatomicStorageAdapter(c, scope, { layout });
            const runtime = ManagedRuntime.make(
              Runtime.define({
                name: "b5",
                storage: Layer.succeed(StorageAdapter, adapter),
                queries: Layer.succeed(QueryExecutor, makeDatomicQueryExecutor(c, scope)),
              }).layer({
                scope,
                capabilities: Capabilities.none,
                deterministic: { startTime: 1000, seed: `b5-${scenario}` },
              }),
            );
            const triples = await runtime.runPromise(Triples);
            return { scope, adapter, runtime, triples };
          }),
        );
        const [legacy, lean] = stores;
        try {
          const positions: number[] = [];
          const rowIds: string[] = [];
          for (let commit = 0; commit < 6; commit++) {
            const timestamp =
              scenario % 10 === 0 && commit === 4 ? 50 : 100 + Math.floor(commit / 2) * 100;
            const inputs = Array.from({ length: 4 }, (_, j) => ({
              entityId: `e${(commit + j) % 5}`,
              entityType: "_Test",
              attribute: `a${j}`,
              value:
                j < 3
                  ? { type: "ref" as const, value: `e${rand() % 7}` }
                  : { type: "string" as const, value: `quote\"\\😀-${rand()}` },
              validFrom: [-10, 0, 100, 200][rand() % 4]!,
              validTo: rand() % 3 === 0 ? 300 : undefined,
            }));
            const id = `r${commit}-0`;
            rowIds.push(id);
            for (const s of stores)
              await Effect.runPromise(
                s.adapter.withTransaction(
                  Effect.gen(function* () {
                    const p = yield* s.adapter.nextCommitPosition();
                    if (s === legacy) positions.push(p);
                    if (commit % 2 === 1)
                      yield* s.adapter.retract(
                        rowIds[commit - 1]!,
                        timestamp,
                        scenario % 5 === 0 && commit === 5
                          ? ""
                          : `_tx/${String(commit).padStart(26, "0")}`,
                        p,
                      );
                    for (const [j, input] of inputs.entries())
                      yield* s.adapter.insert(
                        input,
                        `_tx/${String(commit).padStart(26, "0")}`,
                        timestamp,
                        `r${commit}-${j}`,
                        p,
                      );
                    if (commit === 2 && scenario % 7 === 0) {
                      yield* s.adapter.insert(
                        {
                          entityId: "e0",
                          entityType: "_Test",
                          attribute: "born",
                          value: { type: "string", value: "retired in same physical transaction" },
                          validFrom: 0,
                        },
                        "_tx/00000000000000000000000077",
                        timestamp,
                        "born",
                        p,
                      );
                      yield* s.adapter.retract(
                        "born",
                        timestamp + 1,
                        "_tx/00000000000000000000000078",
                        p,
                      );
                    }
                    if (commit === 2 && scenario % 11 === 0) {
                      yield* s.adapter.insert(
                        {
                          entityId: "e0",
                          entityType: "_Test",
                          attribute: "a0",
                          value: { type: "string", value: "imported explicit position" },
                          validFrom: 0,
                        },
                        "_tx/00000000000000000000000079",
                        timestamp,
                        "imported",
                        0,
                      );
                    }
                    if (commit === 3)
                      yield* s.adapter.withTransaction(
                        Effect.gen(function* () {
                          const p2 = yield* s.adapter.nextCommitPosition();
                          if (s === legacy) positions.push(p2);
                          // A retirement at the interior logical position requires a marker, even though the physical tx ends later.
                          yield* s.adapter.retract(
                            "r1-1",
                            timestamp - 1,
                            "_tx/00000000000000000000000098",
                            p,
                          );
                          yield* s.adapter.insert(
                            {
                              entityId: "e0",
                              attribute: "nested",
                              value: { type: "ref", value: "e0" },
                              validFrom: 0,
                            },
                            "_tx/00000000000000000000000099",
                            timestamp,
                            "nested",
                            p2,
                          );
                        }),
                      );
                  }),
                ),
              );
            if (commit % 2 !== 1) continue;
            const bases = [
              { validAt: 100 },
              { validAt: 100, recordedPosition: 0 },
              ...positions.map((recordedPosition) => ({
                validAt: [0, 100, 299, 300][rand() % 4]!,
                recordedPosition,
              })),
              { validAt: 200, recordedPosition: Math.min(4, positions.at(-1)!) },
              ...[0, timestamp, timestamp - 1, timestamp + 1].map((recordedAt) => ({
                validAt: 200,
                recordedAt,
              })),
            ];
            for (const basis of bases) {
              const root = `e${rand() % 8}`;
              const requests = [
                (s: typeof lean) => s.adapter.getByEntity(root, basis),
                (s: typeof lean) => s.adapter.getByEntities([root, "e0"], basis),
                (s: typeof lean) => s.adapter.query({ entityId: root }, basis),
                (s: typeof lean) => s.adapter.query({ attribute: "a1" }, basis),
                (s: typeof lean) => s.adapter.query({ entityType: "_Test" }, basis),
                (s: typeof lean) => s.adapter.dependencyState(["a0", "a1"], basis),
              ];
              for (const request of requests)
                equal(
                  await Effect.runPromise(request(lean)),
                  await Effect.runPromise(request(legacy)),
                );
              const reach = await Effect.runPromise(lean.adapter.getReachTriples!(root, basis));
              equal(reach, await Effect.runPromise(legacy.adapter.getReachTriples!(root, basis)));
              if (reach) {
                fast++;
                const rows = await Effect.runPromise(lean.adapter.getReachRows!(root, basis));
                const map = await Effect.runPromise(
                  lean.adapter.getByEntities([...new Set(rows!.map((r) => r.entity_id))], basis),
                );
                const raw = new Map([...map.values()].flat().map((r) => [r.id, r]));
                equal(
                  rows,
                  reach.triples.map((t) => raw.get(t.id)),
                );
                rowClosures++;
                const many = await Effect.runPromise(lean.adapter.getReachRowsMany!([root], basis));
                equal(many, [rows]);
              }
            }
            for (const id of rowIds)
              equal(
                await Effect.runPromise(lean.adapter.getById(id)),
                await Effect.runPromise(legacy.adapter.getById(id)),
              );
            for (const root of ["e0", "e1", "e2", "e3", "e4"])
              equal(
                await Effect.runPromise(lean.adapter.history(root)),
                await Effect.runPromise(legacy.adapter.history(root)),
              );
          }
          // Retraction-only physical transaction, including explicit metadata unlike its final transaction envelope.
          for (const s of stores)
            await Effect.runPromise(
              s.adapter.withTransaction(
                Effect.gen(function* () {
                  const p = yield* s.adapter.nextCommitPosition();
                  yield* s.adapter.retract("nested", 500, "_tx/00000000000000000000000100", p);
                }),
              ),
            );
          equal(
            await Effect.runPromise(lean.adapter.history("e0")),
            await Effect.runPromise(legacy.adapter.history("e0")),
          );
          // Public deterministic journals and duplicate claims exercise the indexed routes as well as receipt positions.
          for (let j = 0; j < 2; j++) {
            const receipts = [];
            for (const s of stores)
              receipts.push(
                await s.runtime.runPromise(
                  s.triples.transact(
                    [
                      {
                        op: "assert",
                        entityId: "public" as never,
                        attribute: ":public/value" as never,
                        value: { type: "string", value: `v${j}` },
                        validFrom: 0,
                      },
                    ],
                    { commandId: `cmd${j}` },
                  ),
                ),
              );
            equal(receipts[0], receipts[1]);
            equal(
              await lean.runtime.runPromise(lean.triples.transactionByCommand(`cmd${j}`)),
              await legacy.runtime.runPromise(legacy.triples.transactionByCommand(`cmd${j}`)),
            );
          }
          equal(
            await lean.runtime.runPromise(lean.triples.transactions({ after: 0, limit: 10 })),
            await legacy.runtime.runPromise(legacy.triples.transactions({ after: 0, limit: 10 })),
          );
          const duplicate = await Promise.all(
            stores.map((s) =>
              s.runtime.runPromise(s.triples.transact([], { commandId: "cmd0" })).then(
                () => "ok",
                (e) => e._tag,
              ),
            ),
          );
          equal(duplicate[0], duplicate[1]);
          expect(randomDraws).toBe((scenario + 1) * drawsPerScenario);
        } finally {
          for (const s of stores) {
            await s.runtime.dispose();
            await c.delete(s.scope);
          }
        }
      }
      expect(fast).toBeGreaterThan(0);
      expect(rowClosures).toBe(fast);
      console.log(
        JSON.stringify({
          firstScenario,
          scenarios: count,
          inputRandomState,
          finalRandomState: seed,
          randomDraws,
          drawsPerScenario,
          comparisons,
          fast,
          rowClosures,
        }),
      );
    } finally {
      c.close();
    }
  }, 900000);
});
