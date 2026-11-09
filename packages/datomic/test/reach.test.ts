import { writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { Effect, Layer, ManagedRuntime } from "effect";
import { describe, expect, it, vi } from "vitest";
import { Triples, type ResolvedTemporalBasis } from "@triplex-build/triplex";
import {
  Capabilities,
  DatabaseScope,
  QueryExecutor,
  Runtime,
  StorageAdapter,
} from "@triplex-build/triplex/runtime";
import { DatomicClient } from "../src/DatomicClient.js";
import { makeDatomicStorageAdapter } from "../src/DatomicStorageAdapter.js";
import { makeDatomicQueryExecutor } from "../src/DatomicQueryExecutor.js";

// [EXP-DX1] Why: public fast pulls must equal the original public BFS at every generated cut.
// Rejected: trusting endpoint success or comparing unordered sets.
describe.skipIf(process.env["DATOMIC_INTEGRATION"] !== "1")("row-datom reach equivalence", () => {
  it("compares 200 seeded scenarios, exact/interior/time cuts, cycles and retractions", async () => {
    const client = new DatomicClient(
      process.env["DATOMIC_GATEWAY_URL"] ?? "http://127.0.0.1:8490",
      20000,
    );
    let comparisons = 0,
      accepted = 0;
    const declines: Record<string, number> = {};
    let seed = 0x19870219;
    const rand = () => {
      seed ^= seed << 13;
      seed ^= seed >>> 17;
      seed ^= seed << 5;
      return seed >>> 0;
    };
    try {
      for (let scenario = 0; scenario < 200; scenario++) {
        const scope = DatabaseScope.test(`dx1-${randomUUID()}`);
        const a = makeDatomicStorageAdapter(client, scope);
        let oracleBasis: ResolvedTemporalBasis | undefined;
        const oracleAdapter = {
          ...a,
          getByEntities: (ids: readonly string[], basis?: ResolvedTemporalBasis) =>
            a.getByEntities(ids, oracleBasis ?? basis),
        };
        const runtime = ManagedRuntime.make(
          Runtime.define({
            name: "dx1",
            storage: Layer.succeed(StorageAdapter, oracleAdapter),
            queries: Layer.succeed(QueryExecutor, makeDatomicQueryExecutor(client, scope)),
          }).layer({ scope, capabilities: Capabilities.none }),
        );
        await Effect.runPromise(a.initialize());
        const db = (await client.create(scope)).db;
        const triples = await runtime.runPromise(Triples);
        const ids: string[] = [];
        const positions: number[] = [];
        const times: number[] = [];
        try {
          for (let commit = 0; commit < 6; commit++) {
            const time =
              scenario % 10 === 0 && commit === 4 ? 50 : 100 + Math.floor(commit / 2) * 100;
            times.push(time);
            await Effect.runPromise(
              a.withTransaction(
                Effect.gen(function* () {
                  const p = yield* a.nextCommitPosition();
                  positions.push(p);
                  if (commit > 0 && commit % 2 === 1)
                    yield* a.retract(
                      ids[commit - 1]!,
                      time,
                      `_tx/${String(commit).padStart(26, "0")}`,
                      p,
                    );
                  for (let j = 0; j < 4; j++) {
                    const id = `r${commit}-${j}`;
                    if (j === 0) ids.push(id);
                    yield* a.insert(
                      {
                        entityId: `e${(commit + j) % 5}`,
                        attribute: `a${j}`,
                        value:
                          j < 3
                            ? { type: "ref", value: `e${rand() % 7}` }
                            : { type: "string", value: `quote\"\\😀-${rand()}` },
                        validFrom: [-10, 0, 100, 200][rand() % 4]!,
                        validTo: rand() % 3 === 0 ? 300 : undefined,
                      },
                      `_tx/${String(commit).padStart(26, "0")}`,
                      time,
                      id,
                      p,
                    );
                  }
                  if (commit === 3)
                    yield* a.withTransaction(
                      Effect.gen(function* () {
                        const p2 = yield* a.nextCommitPosition();
                        yield* a.insert(
                          {
                            entityId: "e0",
                            attribute: "extra",
                            value: { type: "ref", value: "e0" },
                          },
                          "_tx/00000000000000000000000099",
                          time,
                          "nested",
                          p2,
                        );
                      }),
                    );
                }),
              ),
            );
            if (commit % 2 !== 1) continue;
            const head = await Effect.runPromise(a.currentCommitPosition());
            if (scenario === 0 && commit === 1) {
              const requests = vi.spyOn(client, "request");
              await runtime.runPromise(triples.reach("e0" as never, { validAt: 200 }));
              expect(requests).toHaveBeenCalledTimes(1);
              requests.mockRestore();
            }
            const bases: ResolvedTemporalBasis[] = [
              { validAt: 100 },
              ...positions.map((p) => ({
                validAt: [0, 100, 299, 300][rand() % 4]!,
                recordedPosition: p,
              })),
              { validAt: 200, recordedPosition: head },
              ...[0, time, time + 1, time - 1].map((r) => ({ validAt: 200, recordedAt: r })),
              { validAt: 0, recordedAt: time, recordedPosition: positions[0]! },
            ];
            for (const basis of bases) {
              const root = `e${rand() % 8}`;
              const response = await client.request<{
                declined?: string;
                closures?: [string, string[]][];
              }>("POST", `/v2/db/${db}/reach`, { root, basis });
              const fast = await Effect.runPromise(a.getReachTriples!(root, basis));
              // [DX-B2-N2] Why: every generated cut exercises inline, references and a shared page.
              // Rejected: checking only head reads (would miss older-revision cache errors).
              const fresh = new DatomicClient(
                process.env["DATOMIC_GATEWAY_URL"] ?? "http://127.0.0.1:8490",
              );
              const freshAdapter = makeDatomicStorageAdapter(fresh, scope);
              let inline;
              try {
                inline = await Effect.runPromise(freshAdapter.getReachTriples!(root, basis));
              } finally {
                fresh.close();
              }
              const warm = await Effect.runPromise(a.getReachTriples!(root, basis));
              const pageRoots = [root, `e${rand() % 8}`];
              const page = await Effect.runPromise(a.getReachTriplesMany!(pageRoots, basis));
              comparisons++;
              if (response.declined) {
                declines[response.declined] = (declines[response.declined] ?? 0) + 1;
                expect(fast).toBeUndefined();
                expect(inline).toBeUndefined();
                expect(warm).toBeUndefined();
                expect(page).toBeUndefined();
              } else {
                expect(fast).toBeDefined();
                oracleBasis = basis;
                const oracle = await runtime.runPromise(
                  StorageAdapter.reachBy((ids) => triples.entities(ids as never, basis), root),
                );
                if (JSON.stringify(fast) !== JSON.stringify(oracle))
                  console.log(
                    JSON.stringify({ scenario, commit, root, basis, response, fast, oracle }),
                  );
                const visited = new Set([
                  root,
                  ...oracle.triples.map((t) => t.entityId),
                  ...oracle.triples.flatMap((t) => (t.value.type === "ref" ? [t.value.value] : [])),
                ]);
                expect(new Set(response.closures?.[0]?.[1])).toEqual(visited);
                expect(fast).toEqual(oracle);
                expect(inline).toEqual(oracle);
                expect(warm).toEqual(oracle);
                expect(page?.[0]).toEqual(oracle);
                const otherOracle = await runtime.runPromise(
                  StorageAdapter.reachBy(
                    (ids) => triples.entities(ids as never, basis),
                    pageRoots[1]!,
                  ),
                );
                expect(page?.[1]).toEqual(otherOracle);
                accepted++;
              }
            }
          }
        } finally {
          await runtime.dispose();
          await client.delete(scope);
        }
      }
      const results = {
        comparisons,
        accepted,
        answerComparisons: accepted * 5,
        refMisses: client.reachDiagnostics.refMisses,
        declines,
        seed: "0x19870219",
      };
      console.log(JSON.stringify(results));
      if (process.env["DX1_RESULTS"])
        writeFileSync(process.env["DX1_RESULTS"], JSON.stringify(results, null, 2));
      expect(accepted).toBeGreaterThan(2000);
      expect(client.reachDiagnostics.faults).toBe(0);
      console.log(JSON.stringify({ refMisses: client.reachDiagnostics.refMisses }));
    } finally {
      client.close();
    }
  }, 600000);
});

// [EXP-DX1] Why: unusual low-level positions must decline rather than expose rows outside the commit cut.
// Rejected: assuming every SPI caller used the core's allocated position.
describe.skipIf(process.env["DATOMIC_INTEGRATION"] !== "1")("irregular SPI position guards", () => {
  it("declines fresh positions outside (sourceK, position] and future retirements", async () => {
    const client = new DatomicClient(process.env["DATOMIC_GATEWAY_URL"] ?? "http://127.0.0.1:8490");
    try {
      for (const mode of ["lower", "upper", "retirement"]) {
        const scope = DatabaseScope.test(`dx1-irregular-${randomUUID()}`);
        const a = makeDatomicStorageAdapter(client, scope);
        try {
          await Effect.runPromise(a.initialize());
          await Effect.runPromise(
            a.withTransaction(
              Effect.gen(function* () {
                const p = yield* a.nextCommitPosition();
                yield* a.insert(
                  {
                    entityId: "root",
                    attribute: ":dx/guard",
                    value: { type: "string", value: "guarded" },
                    validFrom: 0,
                  },
                  "_tx/00000000000000000000000001",
                  100,
                  "row",
                  mode === "lower" ? 0 : mode === "upper" ? p + 1 : p,
                );
              }),
            ),
          );
          if (mode === "retirement")
            await Effect.runPromise(
              a.withTransaction(
                Effect.gen(function* () {
                  const p = yield* a.nextCommitPosition();
                  yield* a.retract("row", 200, "_tx/00000000000000000000000002", p + 1);
                }),
              ),
            );
          expect(
            await Effect.runPromise(a.getReachTriples!("root", { validAt: 200 })),
          ).toBeUndefined();
          expect(client.reachDiagnostics.declines["irregular"]).toBeGreaterThan(0);
        } finally {
          await client.delete(scope);
        }
      }
    } finally {
      client.close();
    }
  }, 30000);
});

// [DX-B2-N2] Why: exercise revision changes, concurrent reference delivery and reset recovery against actual fallback bytes.
// Rejected: endpoint status checks (cannot detect a stale shared row).
describe.skipIf(process.env["DATOMIC_INTEGRATION"] !== "1")("revision cache transitions", () => {
  it("keeps shared changes, retraction-only commits, old cuts and 50 concurrent cold pulls exact", async () => {
    const client = new DatomicClient(
      process.env["DATOMIC_GATEWAY_URL"] ?? "http://127.0.0.1:8490",
      20000,
    );
    const scope = DatabaseScope.test(`dx2-cache-${randomUUID()}`);
    const a = makeDatomicStorageAdapter(client, scope);
    let oracleBasis: ResolvedTemporalBasis | undefined;
    const runtime = ManagedRuntime.make(
      Runtime.define({
        name: "dx2-cache",
        storage: Layer.succeed(StorageAdapter, {
          ...a,
          getByEntities: (ids, basis) => a.getByEntities(ids, oracleBasis ?? basis),
        }),
        queries: Layer.succeed(QueryExecutor, makeDatomicQueryExecutor(client, scope)),
      }).layer({ scope, capabilities: Capabilities.none }),
    );
    const replies: any[] = [];
    const original = client.request.bind(client);
    client.request = async (...args) => {
      const result = await original(...args);
      if (args[1].endsWith("/reach") || args[1].endsWith("/reach-many")) replies.push(result);
      return result as never;
    };
    let p = 0;
    const commit = async (
      time: number,
      additions: { id: string; entity: string; value: any; from?: number }[],
      retracts: string[] = [],
    ) => {
      await Effect.runPromise(
        a.withTransaction(
          Effect.gen(function* () {
            p = yield* a.nextCommitPosition();
            for (const id of retracts)
              yield* a.retract(id, time, `_tx/${String(p).padStart(26, "0")}`, p);
            for (const row of additions)
              yield* a.insert(
                {
                  entityId: row.entity,
                  attribute: ":test/value",
                  value: row.value,
                  validFrom: row.from ?? 0,
                },
                `_tx/${String(p).padStart(26, "0")}`,
                time,
                row.id,
                p,
              );
          }),
        ),
      );
      return p;
    };
    try {
      const triples = await runtime.runPromise(Triples);
      const old = await commit(100, [
        { id: "root-shared", entity: "root", value: { type: "ref", value: "shared" } },
        { id: "root-fixed", entity: "root", value: { type: "ref", value: "fixed" } },
        { id: "shared-1", entity: "shared", value: { type: "string", value: "before" } },
        {
          id: "future",
          entity: "shared",
          value: { type: "ref", value: "future-target" },
          from: 100,
        },
        {
          id: "fixed-1",
          entity: "fixed",
          value: { type: "json", value: { nested: ["immutable"] } },
        },
      ]);
      const check = async (basis: ResolvedTemporalBasis) => {
        oracleBasis = basis;
        const expected = await runtime.runPromise(
          StorageAdapter.reachBy((ids) => triples.entities(ids as never, basis), "root"),
        );
        const actual = await Effect.runPromise(a.getReachTriples!("root", basis));
        if (JSON.stringify(actual) !== JSON.stringify(expected))
          console.log(JSON.stringify({ basis, replies: replies.slice(-3), actual, expected }));
        expect(actual).toEqual(expected);
        expect(
          await Effect.runPromise(a.getReachTriplesMany!(["root", "shared", "absent"], basis)),
        ).toEqual([
          expected,
          await runtime.runPromise(
            StorageAdapter.reachBy((ids) => triples.entities(ids as never, basis), "shared"),
          ),
          { triples: [], hops: 1 },
        ]);
      };
      await check({ validAt: 0, recordedPosition: old });
      await check({ validAt: 0, recordedPosition: old });
      if (process.env["DX2_EXPECT_RESET"] !== "1")
        expect(replies.some((r) => r.entities?.some((e: any[]) => e.length === 2))).toBe(true);
      await commit(
        200,
        [{ id: "shared-2", entity: "shared", value: { type: "string", value: "after" } }],
        ["shared-1"],
      );
      await check({ validAt: 100, recordedPosition: p });
      await check({ validAt: 0, recordedPosition: old });
      await check({ validAt: 100, recordedPosition: p });
      await commit(300, [], ["shared-2"]);
      await check({ validAt: 100, recordedPosition: p });
      const cached = await Effect.runPromise(a.getReachTriples!("root", { validAt: 0 }));
      const json = cached!.triples.find((t) => t.value.type === "json")!;
      expect(Object.isFrozen(json)).toBe(true);
      expect(Object.isFrozen(json.value)).toBe(true);
      expect(() => {
        (json.value as any).value.nested[0] = "changed";
      }).toThrow();
      // Deliberately lose the client copy while the gateway retains its reference state.
      client.reachCache.clear();
      const before = client.reachDiagnostics.refMisses;
      await check({ validAt: 0, recordedPosition: p });
      if (process.env["DX2_EXPECT_RESET"] !== "1")
        expect(client.reachDiagnostics.refMisses).toBeGreaterThan(before);
      client.reachCache.clear();
      client.reachSession = randomUUID();
      oracleBasis = { validAt: 0 };
      const expected = await runtime.runPromise(
        StorageAdapter.reachBy((ids) => triples.entities(ids as never, { validAt: 0 }), "root"),
      );
      const concurrent = await Promise.all(
        Array.from({ length: 50 }, () =>
          Effect.runPromise(a.getReachTriples!("root", { validAt: 0 })),
        ),
      );
      concurrent.forEach((result) => expect(result).toEqual(expected));
      const transitions = {
        concurrentPulls: 50,
        refMisses: client.reachDiagnostics.refMisses,
        resets: client.reachDiagnostics.resets,
      };
      console.log(JSON.stringify(transitions));
      if (process.env["DX2_TRANSITION_RESULTS"])
        writeFileSync(process.env["DX2_TRANSITION_RESULTS"], JSON.stringify(transitions));
      if (process.env["DX2_EXPECT_RESET"] === "1")
        expect(client.reachDiagnostics.resets).toBeGreaterThan(0);
      expect(client.reachDiagnostics.faults).toBe(0);
    } finally {
      await runtime.dispose();
      await client.delete(scope);
      client.close();
    }
  }, 60000);
});
