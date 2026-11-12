import assert from "node:assert/strict";
import { test } from "node:test";
import { packEntity, unpackEntity, type ReplicaRow } from "../../../../packages/datomic/dist/index.js";
import { canonicalWorld } from "../../../bench/lib/canonical.ts";
import { ReplicaReader, prepareEntity, publicRow } from "../../../bench/lib/replica-reads.ts";
import { observe } from "../../../bench/lib/observe.ts";
import { CutCache } from "../../../bench/lib/cut-cache.ts";

const original: ReplicaRow = { id: "r", entityId: "root", attribute: "a", position: 1, validFrom: 0, validTo: 10,
  value: { type: "number", value: -0 }, publicMetadata: { recordedAt: 100, createdBy: "actor", entityType: "Kind", schemaVersion: 1, txId: "tx" } };
// [DX-R3-P8] Why: memo hits require all encoded content, not a stable ID or unchanged revision.
// Rejected: tests that mutate only business values while metadata or IEEE zero changes reuse a certificate.
test("packed memo keys cover every field and preserve IEEE signed zero", () => {
  const memo = new Map<string, ReplicaRow>();
  const decode = (row: ReplicaRow, id = "root") => unpackEntity(id, packEntity(1, [row]), 0, true, true, memo)[0]!;
  const first = decode(original);
  assert.strictEqual(decode(original), first);
  const variants: ReplicaRow[] = [
    ...[{ id: "other" }, { attribute: "b" }, { position: 2 }, { validFrom: -1 }, { validTo: 11 }, { value: { type: "number", value: 0 } }].map(change => ({ ...original, ...change } as ReplicaRow)),
    ...Object.entries({ recordedAt: 101, createdBy: "other", entityType: "Other", schemaVersion: 2, txId: "other" }).map(([field, value]) => ({ ...original, publicMetadata: { ...original.publicMetadata!, [field]: value } })),
  ];
  for (const row of variants) {
    const actual = decode(row);
    assert.notStrictEqual(actual, first);
    assert.equal(canonicalWorld([actual]), canonicalWorld(unpackEntity("root", packEntity(1, [row]), 0, true, true)));
    assert.notEqual(canonicalWorld([actual]), canonicalWorld([first]));
  }
  assert.notStrictEqual(decode(original, "another-root"), first);
});
test("world cache binds child versions, every valid boundary, floor and reset", async () => {
  const make = (revision: number, rows: ReplicaRow[]) => prepareEntity(rows[0]?.entityId ?? "child", packEntity(revision, rows));
  const root = make(1, [{ ...original, value: { type: "ref", value: "child" as any }, validTo: 20 }]);
  const childRow = { ...original, id: "c", entityId: "child", validFrom: 2, validTo: 8 };
  const child = make(1, [childRow]);
  const reader = new ReplicaReader();
  reader.apply({ position: 1, reset: true, valid: true, changes: [["root", undefined, root], ["child", undefined, child]] });
  const fallback = async (): Promise<never> => { throw Error("unexpected fallback"); };
  const pull = (position: number, validAt: number) => reader.pullAt("root", { recordedPosition: position, validAt }, fallback);
  for (const validAt of [1, 3, 4, 7, 8, 9, 20, 21, 3]) {
    const pr = await pull(1, validAt);
    const expected = [original, childRow].map((row, i) => publicRow(i === 0 ? { ...row, value: { type: "ref", value: "child" as any }, validTo: 20 } : row))
      .filter(row => row.validFrom! <= validAt && (row.validTo._tag === "None" || row.validTo.value > validAt));
    assert.equal(canonicalWorld(pr.triples), canonicalWorld(expected));
    assert.deepEqual(observe(pr), observe({ ...pr, observation: undefined }));
  }
  assert(reader.diagnostics.worldCache.hits > 0);
  const changed = make(2, [{ ...childRow, value: { type: "number", value: 5 } }]);
  reader.apply({ position: 2, reset: false, valid: true, changes: [["child", child, changed]] });
  assert.notEqual((await pull(2, 3)).observation!.digest, (await pull(1, 3)).observation!.digest);
  reader.apply({ position: 2, reset: true, valid: true, changes: [["root", undefined, root], ["child", undefined, changed]] });
  await assert.rejects(pull(1, 3), /fallback/);
  assert.equal(reader.diagnostics.worldCache.entries, 0);
});
test("cached lazy worlds materialize separately and bound weak manifests", () => {
  const cache = new CutCache(4096), buffer = new SharedArrayBuffer(1024);
  const selected = ["root", { buffer, revision: 1 }];
  let calls = 0;
  const read = () => { calls++; return []; };
  const value = { get triples() { return read(); }, observation: { digest: "x", stamp: -1, stamps: 0, facts: 0, bytes: 0 }, entities: 0, depth: 0, roundTrips: 0, route: "replica", language: "packed", waitedMs: 0 };
  cache.put("root", 1, 0, 10, value, selected, read);
  const a = cache.get("root", 1, 2, 0)!, b = cache.get("root", 1, 3, 7)!;
  assert.equal(calls, 0); void a.triples; void a.triples; assert.equal(calls, 1);
  void b.triples; assert.equal(calls, 2); assert.equal(b.waitedMs, 7);
  assert.equal(cache.get("root", 1, 10, 0), undefined);
  assert.equal(cache.get("root", 2, 3, 0), undefined);
  for (let p = 2; p < 10; p++) cache.put("root", p, 0, 10, value, ["root", { buffer: new SharedArrayBuffer(1024), revision: p }], read);
  assert(cache.diagnostics.bytes <= 4096); assert(cache.diagnostics.evictions > 0);
  cache.clear(); assert.equal(cache.diagnostics.bytes, 0);
});

test("an unavailable weak version triggers a fresh exact walk instead of a cached certificate", async () => {
  const reader = new ReplicaReader(), packed = prepareEntity("root", packEntity(1, [original]));
  reader.apply({ reset: true, valid: true, position: 1, changes: [["root", undefined, packed]] });
  const basis = { recordedPosition: 1, validAt: 3 };
  const fallback = async (): Promise<never> => { throw Error("unexpected gateway fallback"); };
  const expected = canonicalWorld((await reader.pullAt("root", basis, fallback)).triples);
  const prototype = WeakRef.prototype as any, deref = prototype.deref;
  try {
    prototype.deref = () => undefined;
    const result = await reader.pullAt("root", basis, fallback);
    assert.equal(canonicalWorld(result.triples), expected);
    assert.equal(reader.diagnostics.worldCache.weakMisses, 1);
  } finally { prototype.deref = deref; }
});

test("turn promotions end before an index update and before the next turn", async () => {
  const cache = new CutCache(), packed = { buffer: new SharedArrayBuffer(1024), revision: 1 };
  const value = { triples: [], observation: { digest: "x", stamp: -1, stamps: 0, facts: 0, bytes: 0 }, entities: 0, depth: 0, roundTrips: 0, route: "replica", language: "packed", waitedMs: 0 };
  cache.put("root", 1, 0, 10, value, ["root", packed], () => []);
  assert(cache.get("root", 1, 2, 0));
  const prototype = WeakRef.prototype as any, deref = prototype.deref;
  try {
    prototype.deref = () => undefined;
    assert(cache.get("root", 1, 2, 0));
    cache.releasePromotions();
    assert.equal(cache.get("root", 1, 2, 0), undefined);
    prototype.deref = deref;
    cache.put("root", 1, 0, 10, value, ["root", packed], () => []);
    assert(cache.get("root", 1, 2, 0));
    await new Promise<void>(resolve => setImmediate(resolve));
    prototype.deref = () => undefined;
    assert.equal(cache.get("root", 1, 2, 0), undefined);
  } finally { prototype.deref = deref; cache.clear(); }
});

// [DX-R3-P9] Why: a larger measured byte budget must retain useful cuts beyond the old count cap, while eviction remains bounded.
// Rejected: an entry-count control whose capacity is unrelated to measured manifest size.
test("world cache capacity follows its complete byte charge beyond 2048 entries", () => {
  const cache = new CutCache(8 * 1024 ** 2), packed = {buffer:new SharedArrayBuffer(1024),revision:1};
  const value = {triples:[],observation:{digest:"exact",stamp:-1,stamps:0,facts:0,bytes:0},entities:0,depth:0,roundTrips:0,route:"replica",language:"packed",waitedMs:0};
  for(let p=0;p<3000;p++) cache.put("root",p,0,10,value,["root",packed],()=>[]);
  assert.equal(cache.diagnostics.entries,3000);assert(cache.diagnostics.bytes<=cache.maxBytes);
  assert.equal(cache.get("root",0,1,0)?.observation?.digest,"exact");
  for(let p=3000;p<10000;p++) cache.put("root",p,0,10,value,["root",packed],()=>[]);
  assert(cache.diagnostics.evictions>0);assert(cache.diagnostics.bytes<=cache.maxBytes);
  cache.clear();assert.equal(cache.diagnostics.bytes,0);
});
