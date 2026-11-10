import { randomUUID } from "node:crypto";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { DatabaseScope } from "@triplex-build/triplex/runtime";
import { DatomicClient } from "../src/DatomicClient.js";
import { makeDatomicStorageAdapter } from "../src/DatomicStorageAdapter.js";

// [DX-B3-M3] Why: timestamp reordering must retain exact position pulls without enabling unsafe record-time pulls.
// Rejected: clearing the sticky irregular flag (would make record-time cuts inexact).
describe.skipIf(process.env["DATOMIC_INTEGRATION"] !== "1")("position regularity proof", () => {
  it("keeps exact position/current reach after time regression but declines record-time reach", async () => {
    const client = new DatomicClient(
      process.env["DATOMIC_GATEWAY_URL"] ?? "http://127.0.0.1:8499",
      10000,
    );
    const scope = DatabaseScope.test(`dxb3-time-${randomUUID()}`),
      a = makeDatomicStorageAdapter(client, scope);
    try {
      await Effect.runPromise(a.initialize());
      for (const [id, time] of [
        ["one", 200],
        ["two", 100],
      ] as const) {
        await Effect.runPromise(
          a.withTransaction(
            Effect.gen(function* () {
              const p = yield* a.nextCommitPosition();
              yield* a.insert(
                {
                  entityId: "root",
                  attribute: ":time/value",
                  value: { type: "string", value: id },
                  validFrom: 0,
                },
                `_tx/${id.toUpperCase().padStart(26, "0")}`,
                time,
                id,
                p,
              );
            }),
          ),
        );
      }
      const head = await Effect.runPromise(a.getReachTriples!("root", { validAt: 0 }));
      expect(head, JSON.stringify(client.reachDiagnostics)).toBeDefined();
      expect(head!.triples.map((t) => t.id)).toEqual(["two", "one"]);
      const first = await Effect.runPromise(
        a.getReachTriples!("root", { validAt: 0, recordedPosition: 1 }),
      );
      expect(first!.triples.map((t) => t.id)).toEqual(["one"]);
      expect(
        await Effect.runPromise(a.getReachTriples!("root", { validAt: 0, recordedAt: 150 })),
      ).toBeUndefined();
      expect(
        (await Effect.runPromise(a.getByEntity("root", { validAt: 0, recordedAt: 150 }))).map(
          (r) => r.id,
        ),
      ).toEqual(["two"]);
    } finally {
      await client.delete(scope);
      client.close();
    }
  });
  it("declines fast reach when a row has a position outside its physical commit span", async () => {
    const client = new DatomicClient(
      process.env["DATOMIC_GATEWAY_URL"] ?? "http://127.0.0.1:8499",
      10000,
    );
    const scope = DatabaseScope.test(`dxb3-position-${randomUUID()}`),
      a = makeDatomicStorageAdapter(client, scope);
    try {
      await Effect.runPromise(a.initialize());
      await Effect.runPromise(
        a.withTransaction(
          Effect.gen(function* () {
            yield* a.nextCommitPosition();
            yield* a.insert(
              {
                entityId: "root",
                attribute: ":time/value",
                value: { type: "string", value: "future" },
                validFrom: 0,
              },
              "future",
              100,
              "future",
              99,
            );
          }),
        ),
      );
      expect(await Effect.runPromise(a.getReachTriples!("root", { validAt: 0 }))).toBeUndefined();
    } finally {
      await client.delete(scope);
      client.close();
    }
  });
});
