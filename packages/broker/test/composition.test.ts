import { afterEach, expect, it } from "vitest";
import { Effect, Layer, ManagedRuntime } from "effect";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { Triples, EntityId, string } from "@triplex-build/triplex";
import {
  Runtime,
  StorageAdapter,
  QueryExecutor,
  DatabaseScope,
  Capabilities,
} from "@triplex-build/triplex/runtime";
import { HostBroker, makeBrokerStorageAdapter } from "../src/index.js";
import { triplesConformanceCases } from "@triplex-build/triplex-testkit";
import { MemoryBrokerReplica } from "../src/memory.js";
const cleanups: (() => Promise<unknown>)[] = [];
afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup();
});
const open = async (
  dir = path.resolve(import.meta.dirname, "../../../runs/EXP-P2B", randomUUID()),
  replica = new MemoryBrokerReplica(),
  autoApply = false,
) => {
  const scope = "p2b-test";
  const broker = await HostBroker.open({
    dir,
    scopeKey: scope,
    replica,
    autoApply,
    decisionStamp: true,
    requireFullFsync: false,
    minFreeBytes: 5 * 1024 ** 3,
  });
  const adapter = makeBrokerStorageAdapter(replica, scope, broker, { basisWaitMs: 10 });
  // Storage conformance is exercised here; a Datalog request must never be silently answered by this fixture.
  const refused = () => Effect.die(new Error("This storage-only fixture cannot execute Datalog"));
  const managed = ManagedRuntime.make(
    Runtime.define({
      name: "p2b-memory-storage",
      storage: Layer.succeed(StorageAdapter, adapter),
      queries: Layer.succeed(QueryExecutor, {
        execute: refused,
        executePage: refused,
        explain: refused,
        explainPage: refused,
      }),
    }).layer({ scope: DatabaseScope.test(scope), capabilities: Capabilities.none }),
  );
  const triples = await managed.runPromise(Triples);
  cleanups.push(
    () => broker.close(),
    () => managed.dispose(),
  );
  return {
    dir,
    broker,
    replica,
    adapter,
    triples,
    run: <A, E>(effect: Effect.Effect<A, E>) => managed.runPromise(effect),
  };
};
const ops = (tag: string, count = 10) =>
  Array.from({ length: count }, (_, i) => ({
    op: "assert" as const,
    entityId: EntityId.make("subject"),
    attribute: `:p2b/f${i}`,
    value: string(`${tag}-${i}`),
    validFrom: 1,
  }));

it("ACK is readable through overlay; retraction cannot change an earlier pinned answer", async () => {
  const r = await open();
  const receipt = await r.run(r.triples.transact(ops("a"), { commandId: "one" }));
  const basis = { validAt: 2, recordedPosition: receipt.position };
  const before = await r.run(r.adapter.getByEntity("subject", basis));
  expect(before).toHaveLength(10);
  expect(before.every((row) => row.recorded_at === receipt.instant)).toBe(true);
  await r.run(r.triples.transact([{ op: "retract", id: before[0]!.id as never }]));
  expect(await r.run(r.adapter.getByEntity("subject", basis))).toEqual(before);
  r.replica.unavailable = true;
  expect(await r.run(r.adapter.getByEntity("subject", basis))).toEqual(before);
  expect(r.adapter.routes.overlay).toBeGreaterThan(0);
  expect(r.adapter.routes.log).toBeGreaterThan(0);
});

it("duplicates resolve original journal receipt, including after reopening the durable broker", async () => {
  const r = await open();
  const original = await r.run(r.triples.transact(ops("original"), { commandId: "retry" }));
  const head = r.broker.head();
  await expect(
    r.run(r.triples.transact(ops("ignored"), { commandId: "retry" })),
  ).rejects.toMatchObject({ _tag: "CommandAlreadyCommittedError" });
  const journal = await r.run(r.triples.transaction(original.txId));
  expect(journal?.instant).toBe(original.instant);
  await r.broker.close();
  const next = await open(r.dir, r.replica);
  expect(next.broker.head()).toBe(head);
  expect(await next.run(next.triples.transaction(original.txId))).toEqual(journal);
  await expect(
    next.run(next.triples.transact(ops("ignored"), { commandId: "retry" })),
  ).rejects.toMatchObject({ _tag: "CommandAlreadyCommittedError" });
  expect(next.broker.head()).toBe(head);
});

it("replica catch-up preserves the exact answer and original stamp; future cuts refuse", async () => {
  const r = await open();
  const receipt = await r.run(r.triples.transact(ops("a")));
  const basis = { validAt: 2, recordedPosition: receipt.position };
  const overlay = await r.run(r.adapter.getByEntity("subject", basis));
  r.broker.startApplier();
  await r.broker.awaitReplica(receipt.position, 2000, "repository");
  expect(await r.run(r.adapter.getByEntity("subject", basis))).toEqual(overlay);
  expect(r.adapter.routes.replica).toBeGreaterThan(0);
  await expect(
    r.run(
      r.adapter.getByEntity("subject", { ...basis, recordedPosition: r.broker.head() + 100000 }),
    ),
  ).rejects.toMatchObject({ reason: "basis-not-reached" });
  expect(
    await r.run(r.adapter.getByEntity("subject", { validAt: 2, recordedAt: receipt.instant })),
  ).toEqual(overlay);
});

it("same-operation lost ACK returns its original position and stamp without a new feed position", async () => {
  const r = await open();
  const row = {
    id: "raw",
    entity_id: "subject",
    attribute: ":p2b/raw",
    value_type: "string" as const,
    value_string: "x",
    value_number: null,
    value_boolean: null,
    value_datetime: null,
    value_json: null,
    recorded_at: 1,
    recorded_position: -1,
    valid_from: 1,
    valid_to: null,
    created_by: null,
    retracted_at: null,
    retracted_position: null,
    retract_tx_id: null,
    entity_type: null,
    schema_version: 1,
    tx_id: "tx",
  };
  const txn = {
    operationId: "lost-ack",
    attemptId: "attempt",
    sourceK: 0,
    reads: { entities: new Set<string>(), scopeWide: false },
    claims: [],
    placeholders: [-1],
    rows: [row],
    priors: new Map(),
    newIds: new Set([row.id]),
  };
  const first = await r.broker.submit(txn);
  const retry = await r.broker.submit({ ...txn, attemptId: "retry" });
  expect(first.kind).toBe("committed");
  expect(retry.kind).toBe("committed");
  if (first.kind !== "committed" || retry.kind !== "committed") throw new Error("No receipt");
  expect(retry.positions).toEqual(first.positions);
  expect(retry.stamp).toBe(first.stamp);
  expect(retry.replayed).toBe(true);
  expect(r.broker.stats().commits).toBe(1);
  await r.broker.close();
  const recovered = await open(r.dir, r.replica);
  const afterRestart = await recovered.broker.submit(txn);
  expect(afterRestart.kind).toBe("committed");
  if (afterRestart.kind !== "committed") throw new Error("No recovered receipt");
  expect(afterRestart.positions).toEqual(first.positions);
  expect(afterRestart.stamp).toBe(first.stamp);
  expect(afterRestart.replayed).toBe(true);
});

const storageCases = new Set([
  "assert then get and match return the fact",
  "same-value facts in one batch keep distinct identities",
  "transact records provenance datoms",
  "reserved Triplex namespaces reject ordinary writes atomically",
  "transaction journals cannot be retracted through ordinary writes",
  "historical corrections preserve what was previously recorded",
  "batch entity reads preserve association, missing entries, and temporal basis",
]);
it.each(triplesConformanceCases.filter((test) => storageCases.has(test.name)))(
  "upstream storage corpus: $name",
  async (test) => {
    const r = await open();
    await r.run(test.run as Effect.Effect<void, unknown>);
  },
);

it("decided-time mode refuses an existing unstamped stream instead of changing its record-time contract", async () => {
  const dir = path.resolve(import.meta.dirname, "../../../runs/EXP-P2B", randomUUID());
  const broker = await HostBroker.open({
    dir,
    scopeKey: "migration",
    decisionStamp: false,
    requireFullFsync: false,
  });
  await broker.submit({
    operationId: "unstamped",
    attemptId: "one",
    sourceK: 0,
    reads: { entities: new Set(), scopeWide: false },
    claims: [],
    placeholders: [-1],
    rows: [],
    priors: new Map(),
    newIds: new Set(),
  });
  await broker.close();
  await expect(
    HostBroker.open({ dir, scopeKey: "migration", decisionStamp: true, requireFullFsync: false }),
  ).rejects.toThrow("Unstamped broker history");
  const originalMode = await HostBroker.open({
    dir,
    scopeKey: "migration",
    decisionStamp: false,
    requireFullFsync: false,
  });
  await originalMode.close();
});
