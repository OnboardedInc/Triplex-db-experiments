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
              const response = await client.request<{ declined?: string }>(
                "POST",
                `/v2/db/${db}/reach`,
                { root, basis },
              );
              const fast = await Effect.runPromise(a.getReachTriples!(root, basis));
              comparisons++;
              if (response.declined) {
                declines[response.declined] = (declines[response.declined] ?? 0) + 1;
                expect(fast).toBeUndefined();
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
                expect(fast).toEqual(oracle);
                accepted++;
              }
            }
          }
        } finally {
          await runtime.dispose();
          await client.delete(scope);
        }
      }
      const results = { comparisons, accepted, declines, seed: "0x19870219" };
      console.log(JSON.stringify(results));
      if (process.env["DX1_RESULTS"])
        writeFileSync(process.env["DX1_RESULTS"], JSON.stringify(results, null, 2));
      expect(accepted).toBeGreaterThan(2000);
      expect(client.reachDiagnostics.faults).toBe(0);
    } finally {
      client.close();
    }
  }, 600000);
});
