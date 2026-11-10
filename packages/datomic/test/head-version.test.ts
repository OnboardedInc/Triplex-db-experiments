import { randomUUID } from "node:crypto";
import { Layer, ManagedRuntime } from "effect";
import { describe, expect, it } from "vitest";
import { Triples } from "@triplex-build/triplex";
import {
  Runtime,
  StorageAdapter,
  QueryExecutor,
  DatabaseScope,
  Capabilities,
} from "@triplex-build/triplex/runtime";
import { DatomicClient } from "../src/DatomicClient.js";
import { makeDatomicStorageAdapter } from "../src/DatomicStorageAdapter.js";
import { makeDatomicQueryExecutor } from "../src/DatomicQueryExecutor.js";

// [DX-B8] Why: commit receipts, snapshots, journal heads and basis must agree after scope position stops moving.
// Rejected: checking only commit return values (would miss stale snapshot/basis headers).
describe.skipIf(process.env.DATOMIC_INTEGRATION !== "1")("immutable transaction head", () => {
  it("exposes the same nonzero head through each public header and retains an older snapshot", async () => {
    const scope = DatabaseScope.test(`b8-head-${randomUUID()}`);
    const client = new DatomicClient(process.env.DATOMIC_GATEWAY_URL!, 30000);
    const adapter = makeDatomicStorageAdapter(client, scope);
    const runtime = ManagedRuntime.make(
      Runtime.define({
        name: "b8-head",
        storage: Layer.succeed(StorageAdapter, adapter),
        queries: Layer.succeed(QueryExecutor, makeDatomicQueryExecutor(client, scope)),
      }).layer({ scope, capabilities: Capabilities.none }),
    );
    try {
      const triples = await runtime.runPromise(Triples);
      const db = (await client.create(scope)).db;
      const commit = (text: string) =>
        runtime.runPromise(
          triples.transact([
            {
              op: "assert",
              entityId: "b8-root" as never,
              attribute: ":b8/value" as never,
              value: { type: "string", value: text },
              validFrom: 0,
            },
          ]),
        );
      const first = await commit("one");
      const snapshot = await client.begin(db);
      expect(snapshot.position).toBe(first.position);
      const second = await commit("two");
      expect(second.position).toBe(first.position + 1);
      expect(Number((await client.basis(db)).position.v)).toBe(second.position);
      const held = await client.rows(db, {
        handle: snapshot.handle,
        pattern: { entityId: "b8-root" },
      });
      expect(held.filter((r) => r.attribute === ":b8/value").map((r) => r.value_string)).toEqual([
        "one",
      ]);
      const current = await client.begin(db);
      expect(current.position).toBe(second.position);
    } finally {
      await runtime.dispose();
      await client.delete(scope);
      client.close();
    }
  });
});
