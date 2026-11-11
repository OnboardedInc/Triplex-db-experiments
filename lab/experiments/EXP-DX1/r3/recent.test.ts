import assert from "node:assert/strict";
import { test } from "node:test";
import { MessageChannel } from "node:worker_threads";
import {
  RecentReads,
  pullAt,
  unpackEntity,
  packEntity,
  type SweepRow,
} from "../../../../packages/datomic/dist/index.js";
// Test construction uses the built packer, not a second serialization implementation.

const row = (value: string, position = 1, entityId = "root"): SweepRow => ({
  id: value,
  entityId,
  attribute: "value",
  value: { type: "string", value },
  position,
  validFrom: 0,
});
const packed = (value: string, p = 1) => packEntity(p, [row(value, p)]);
const value = (index: RecentReads, p: number) =>
  index.pull("root", { recordedPosition: p, validAt: 0 })?.rows[0]?.value.value;
const boot = (index: RecentReads, e = packed("a")) =>
  index.apply({
    reset: true,
    valid: true,
    position: 1,
    recordTime: 100,
    changes: [["root", undefined, e]],
  });

test("exact floor, current, missing, time mapping and byte eviction", () => {
  const index = new RecentReads(2, 100000, true),
    a = packed("a"),
    b = packed("b", 2),
    c = packed("c", 3),
    d = packed("d", 4);
  boot(index, a);
  index.apply({
    reset: false,
    valid: true,
    position: 2,
    recordTime: 200,
    changes: [["root", a, b]],
  });
  index.apply({
    reset: false,
    valid: true,
    position: 3,
    recordTime: 300,
    changes: [["root", b, c]],
  });
  assert.deepEqual([value(index, 1), value(index, 2), value(index, 3)], ["a", "b", "c"]);
  index.apply({
    reset: false,
    valid: true,
    position: 4,
    recordTime: 400,
    changes: [["root", c, d]],
  });
  assert.equal(index.floor, 2);
  assert.equal(value(index, 1), undefined);
  assert.equal(value(index, 2), "b");
  assert.equal(index.resolve({ recordedAt: 200, validAt: 0 }), 2);
  assert.equal(index.resolve({ recordedAt: 201, validAt: 0 }), undefined);
  assert.equal(index.resolve({ recordedPosition: 3, recordedAt: 200, validAt: 0 }), undefined);
  const tiny = new RecentReads(100, 0);
  boot(tiny, a);
  tiny.apply({ reset: false, valid: true, position: 2, changes: [["root", a, b]] });
  assert.equal(tiny.floor, 2);
  assert.equal(tiny.historyBytes, 0);
  assert.equal(value(tiny, 1), undefined);
});
test("valid-time row and reference intervals are half open, including cycles and missing closures", () => {
  const index = new RecentReads();
  const root = packEntity(1, [
    { ...row("r"), value: { type: "ref", value: "child" as any }, validFrom: 10, validTo: 20 },
  ]);
  const child = packEntity(1, [
    { ...row("x", 1, "child"), validFrom: 15, validTo: 18 },
    { ...row("cycle", 1, "child"), value: { type: "ref", value: "root" as any } },
  ]);
  index.apply({
    reset: true,
    valid: true,
    position: 1,
    changes: [
      ["root", undefined, root],
      ["child", undefined, child],
    ],
  });
  assert.equal(index.pull("root", { validAt: 9 })?.rows.length, 0);
  assert.equal(index.pull("root", { validAt: 10 })?.rows.length, 2);
  assert.equal(index.pull("root", { validAt: 15 })?.rows.length, 3);
  assert.equal(index.pull("root", { validAt: 18 })?.rows.length, 2);
  assert.equal(index.pull("root", { validAt: 20 })?.rows.length, 0);
  const incomplete = new RecentReads();
  boot(incomplete, root);
  assert.equal(incomplete.pull("root", { validAt: 15 }), undefined);
});
test("new entities decline before their known existence; gaps/rebuilds invalidate old cuts", () => {
  const index = new RecentReads();
  boot(index);
  index.apply({
    reset: false,
    valid: true,
    position: 2,
    changes: [["new", undefined, packed("new", 2)]],
  });
  assert.equal(index.pull("new", { recordedPosition: 1, validAt: 0 }), undefined);
  assert.throws(() => index.apply({ reset: false, valid: true, position: 4, changes: [] }), /gap/);
  assert.equal(value(index, 2), undefined);
  boot(index);
  assert.equal(index.floor, 1);
  assert.equal(value(index, 1), "a");
  index.apply({ reset: true, valid: false, position: 1, changes: [] });
  assert.equal(value(index, 1), undefined);
});
test("regressing and duplicate clocks decline record-time reads", () => {
  for (const time of [99, 100]) {
    const index = new RecentReads();
    boot(index);
    index.apply({ reset: false, valid: true, position: 2, recordTime: time, changes: [] });
    assert.equal(index.resolve({ recordedAt: 100, validAt: 0 }), undefined);
    assert.equal(index.resolve({ recordedPosition: 2, validAt: 0 }), 2);
  }
});
test("ahead receipt waits, then exact fallback; mapped times cannot override explicit position", async () => {
  const index = new RecentReads();
  boot(index);
  let fallbacks = 0,
    waits = 0;
  const fallback = async () => {
    fallbacks++;
    return "gateway";
  };
  const result = await pullAt(
    index,
    "root",
    { recordedPosition: 2, validAt: 0 },
    fallback,
    async () => {
      waits++;
    },
  );
  assert.equal(result.route, "fallback");
  assert.equal(fallbacks, 1);
  assert.equal(waits, 1);
  const a = packed("a");
  const local = await pullAt(
    index,
    "root",
    { recordedPosition: 2, validAt: 0 },
    fallback,
    async () => {
      index.apply({
        reset: false,
        valid: true,
        position: 2,
        changes: [["root", a, packed("b", 2)]],
      });
    },
  );
  assert.equal(local.route, "replica");
});
test("worker delta clones retain shared bytes and exact historical cuts", async () => {
  const { port1, port2 } = new MessageChannel();
  const a = packed("a"),
    b = packed("b", 2),
    source = new RecentReads();
  boot(source, a);
  const copy = new RecentReads();
  copy.install(structuredClone(source.image()));
  await new Promise<void>((resolve, reject) => {
    port2.once("message", (delta) => {
      try {
        copy.apply(delta);
        assert.equal(value(copy, 1), "a");
        assert.equal(value(copy, 2), "b");
        resolve();
      } catch (e) {
        reject(e);
      }
    });
    port1.postMessage({ reset: false, valid: true, position: 2, changes: [["root", a, b]] });
  });
  port1.close();
  port2.close();
  const image = structuredClone(source.image());
  assert(image.entities[0]![2].buffer instanceof SharedArrayBuffer);
  assert.deepEqual(unpackEntity("root", image.entities[0]![2], 0), [row("a")]);
});

test("sidecar bytes count toward eviction and survive shared-image installation", () => {
  const a = { ...packed("a"), additionalBytes: 4096 },
    b = packed("b", 2);
  const bounded = new RecentReads(20000, 4000);
  boot(bounded, a);
  bounded.apply({ reset: false, valid: true, position: 2, changes: [["root", a, b]] });
  assert.equal(bounded.floor, 2);
  assert.equal(bounded.historyBytes, 0);
  const roomy = new RecentReads();
  boot(roomy, a);
  roomy.apply({ reset: false, valid: true, position: 2, changes: [["root", a, b]] });
  assert.equal(roomy.historyBytes, a.buffer.byteLength + 4096);
  const copy = new RecentReads();
  copy.install(structuredClone(roomy.image()));
  assert.equal(copy.historyBytes, roomy.historyBytes);
  assert.equal(value(copy, 1), "a");
});
