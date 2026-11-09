import { it, expect } from "vitest";
import { Effect, Layer } from "effect";
import { Triples, EntityId, string } from "@triplex-build/triplex";
import { Runtime, DatabaseScope, Capabilities, KvBackend } from "@triplex-build/triplex/runtime";
import { makeTestKvBackend } from "../../../packages/core/src/kv/kv/InMemoryKvBackend.js";
import { SqliteTriples } from "@triplex-build/triplex-sqlite";

// [CX-VDF01-R4] Why: the journal predicate's reserved-type premise must hold at the real public write boundary.
// Rejected: calling isReservedEntityType alone (does not prove write rejection or atomicity).
const kv = Runtime.fromKv({ name: "review", backend: Layer.sync(KvBackend, makeTestKvBackend) }).layer({
  scope: DatabaseScope.test("df01-r4"), capabilities: Capabilities.none,
});
for (const [name, layer] of [["kv", kv], ["storage-adapter/sqlite", SqliteTriples.layerMemory]] as const) {
  it(`rejects ordinary _Transaction writes atomically through ${name}`, async () => {
    await Effect.runPromise(Effect.gen(function* () {
      const store = yield* Triples;
      const forbidden = { entityId: EntityId.make("_tx/user-selected"), attribute: ":status", value: string("hidden"), entityType: "_Transaction" };
      for (const write of [
        store.assert(forbidden),
        store.assertBatch([{ entityId: EntityId.make("order:rollback"), attribute: ":status", value: string("open") }, forbidden]),
        store.transact([{ op: "assert", ...forbidden }]),
      ]) {
        const message = yield* write.pipe(Effect.match({ onFailure: (error) => error.message, onSuccess: () => "WRITE SUCCEEDED" }));
        expect(message).toContain("entity type _Transaction");
      }
      expect(yield* store.match({ entityId: forbidden.entityId })).toEqual([]);
      expect(yield* store.match({ entityId: EntityId.make("order:rollback") })).toEqual([]);
      const accepted = yield* store.assert({ ...forbidden, entityType: "Label" });
      expect(accepted.entityId).toBe(forbidden.entityId);
      expect((yield* store.match({ entityId: forbidden.entityId })).length).toBe(1);
    }).pipe(Effect.provide(layer)));
  });
}
