// [DX-CON1] G12, the first gate of build step 5: one stock ConfigStore.commit (Triplex's own layer, unbounded load())
// on the lean-layout toy, through the write gateway, then a stock load() that must find the release and the ref.
// Usage: node src/gate-g12.ts [--ref test]   (toy only: the stock load() scans every entity five times)
// The ref defaults to test, the console's own rule (every commit moves test), so the release stays reachable from the
// refs the console walks. A commit to any other ref is invisible to the console.
// Why: the console's bounded reads (config.ts) are only worth building if the stock writer accepts the commit.
import assert from "node:assert/strict";
import { Attribute, ConfigStore, EntityType } from "@triplex-build/triplex/config";
import { Triples } from "@triplex-build/triplex";
import { Capabilities, QueryExecutor, Runtime, StorageAdapter } from "@triplex-build/triplex/runtime";
import { DatomicClient, makeDatomicQueryExecutor, makeDatomicStorageAdapter } from "@triplex-build/triplex-datomic";
import { Effect, Layer, ManagedRuntime } from "effect";
import { Demo, loadConnection } from "./store.ts";

const conn = loadConnection();
assert(conn.kind === "toy", "G12 runs the stock loader, which scans; toy only");
const ref = process.argv.includes("--ref") ? process.argv[process.argv.indexOf("--ref") + 1]! : "test";
const demo = new Demo(conn);
const writer = new DatomicClient(conn.writeUrl, 60_000);
const definition = Runtime.define({
  name: "datomic",
  storage: Layer.succeed(StorageAdapter, makeDatomicStorageAdapter(writer, demo.scope, { layout: "lean", serverRecordTime: true })),
  queries: Layer.succeed(QueryExecutor, makeDatomicQueryExecutor(writer, demo.scope)),
});
const triplex = definition.layer({ scope: demo.scope, capabilities: Capabilities.none });
const rt = ManagedRuntime.make(Layer.merge(triplex, ConfigStore.layer.pipe(Layer.provide(triplex))));

const Subject = EntityType.make("Subject", {
  attributes: {
    account: Attribute.use(Attribute.text(":subject/account"), { required: true }),
    member: Attribute.use(Attribute.text(":subject/member"), { required: true }),
    status: Attribute.use(Attribute.text(":placement/status")),
  },
});
const t0 = performance.now();
const before = await rt.runPromise(Effect.flatMap(ConfigStore.ConfigStore, (s) => s.load()));
const loadMs = performance.now() - t0;
const t1 = performance.now();
const result = await rt.runPromise(Effect.gen(function* () {
  const store = yield* ConfigStore.ConfigStore;
  const nodes = yield* Subject.nodes;
  const newest = before.snapshots[before.snapshots.length - 1];
  const keep = (newest?.root.children.map((c) => c.node) ?? []).filter((n) => !nodes.some((x) => x.kind === n.kind && x.key === n.key));
  return yield* store.commit({ label: "g12-stock-commit", objects: [...keep, ...nodes], ref });
})).catch((error: unknown) => {
  console.log("G12 COMMIT FAILED " + JSON.stringify({ tag: (error as { _tag?: string })._tag, message: String((error as Error).message ?? error) }));
  process.exit(1);
});
const commitMs = performance.now() - t1;
const after = await rt.runPromise(Effect.flatMap(ConfigStore.ConfigStore, (s) => s.load()));
const resolved = await rt.runPromise(Effect.flatMap(ConfigStore.ConfigStore, (s) => s.resolveRef(ref)));
assert.equal(resolved?.id, result.snapshot.id);
assert.equal(after.snapshots.length, before.snapshots.length + 1);
// Stock commit's object set here is Subject alone; run on a store with other types it would drop them from the
// newest release, so the gate keeps the newest release's other objects (as the console does).
const tx = await rt.runPromise(Effect.flatMap(Triples, (s) => s.transactions({ after: result.transaction.position - 1, limit: 1 })));
const journal = tx.transactions[0]!;
assert.equal(journal.position, result.transaction.position);
console.log("G12 PASSED " + JSON.stringify({
  ref, snapshot: result.snapshot.id, position: result.transaction.position,
  objectsBefore: before.objects.size, objectsAfter: after.objects.size, snapshotsAfter: after.snapshots.length,
  journal: { actor: journal.actor ?? null, configSnapshot: (journal as { configSnapshot?: string }).configSnapshot ?? null, changes: journal.changes.length },
  diagnosticMs: { stockLoad: Math.round(loadMs), commitIncludingStockLoad: Math.round(commitMs) },
}));
await rt.dispose();
writer.close();
demo.close();
