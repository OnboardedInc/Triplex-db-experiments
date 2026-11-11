import assert from "node:assert/strict";
import { test } from "node:test";
import { RecentReads } from "../../../../packages/datomic/dist/index.js";
import { ReplicaReadHost, ReplicaReader } from "../../../bench/lib/replica-reads.ts";
import { packed, wire, gatewayRows } from "./fixtures.ts";

// [DX-V1-R3] Why: policy must travel with each index image and recovery must discard an old clock proof.
// Rejected: assuming every reader in a process inherits the strict policy of the first opened scope.
test("strict and non-strict indexes coexist; images replace policy rather than retain stale true", () => {
  const strict = new RecentReads(2, 100000, true),
    loose = new RecentReads(2, 100000, false);
  for (const index of [strict, loose]) {
    index.apply({ position: 10, reset: true, valid: true, recordTime: 100, changes: [] });
    index.apply({ position: 11, reset: false, valid: true, recordTime: 101, changes: [] });
  }
  assert.equal(strict.resolve({ recordedAt: 100, validAt: 0 }), 10);
  assert.equal(loose.resolve({ recordedAt: 100, validAt: 0 }), undefined);
  const copy = new RecentReads();
  copy.install(structuredClone(strict.image()));
  assert.equal(copy.resolve({ recordedAt: 100, validAt: 0 }), 10);
  copy.install(structuredClone(loose.image()));
  assert.equal(copy.strictRecordClocks, false);
  assert.equal(copy.resolve({ recordedAt: 100, validAt: 0 }), undefined);
  const old: any = structuredClone(strict.image());
  delete old.strictRecordClocks;
  copy.install(old);
  assert.equal(copy.strictRecordClocks, false);
  for (const p of [12, 13])
    strict.apply({ position: p, reset: false, valid: true, recordTime: 90 + p, changes: [] });
  assert.equal(strict.floor, 11);
  assert.equal(strict.resolve({ recordedAt: 100, validAt: 0 }), undefined);
  assert.equal(strict.resolve({ recordedAt: 101, validAt: 0 }), 11);
  assert.equal(strict.resolve({ recordedAt: 103, validAt: 0 }), undefined);
});

test("actual host update hook invalidates bootstrap clock proof on rebuild while held payloads survive", async () => {
  const host: any = new (ReplicaReadHost as any)({}, new Map([[1, 100]]), 100000, true);
  const raw = packed([wire()]),
    old = raw;
  host.replica.onUpdate({
    position: 1,
    reset: true,
    valid: true,
    changes: [["root", undefined, raw]],
  });
  host.times.set(2, 101);
  host.replica.onUpdate({ position: 2, reset: false, valid: true, changes: [] });
  const reader = new ReplicaReader(100000, host.index);
  const held = await reader.pullAt("root", { recordedAt: 100, validAt: 10 }, async () => {
    throw Error("fallback");
  });
  assert.equal(held.route, "replica");
  host.times.set(10, 200);
  host.replica.onUpdate({
    position: 10,
    reset: true,
    valid: true,
    changes: [["root", undefined, old]],
  });
  host.times.set(11, 201);
  host.replica.onUpdate({ position: 11, reset: false, valid: true, changes: [] });
  assert.equal(host.index.strictRecordClocks, true);
  assert.equal(host.index.resolve({ recordedAt: 200, validAt: 10 }), undefined);
  assert.equal(host.index.resolve({ recordedPosition: 10, validAt: 10 }), 10);
  assert.deepEqual(held.triples, gatewayRows([wire()]));
  const copy = new RecentReads();
  copy.install(structuredClone(host.index.image()));
  assert.equal(copy.resolve({ recordedAt: 200, validAt: 10 }), undefined);
});
