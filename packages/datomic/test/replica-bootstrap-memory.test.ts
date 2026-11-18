import { expect, it } from "vitest";
import { packEntity, RecentReads } from "../dist/index.js";
import {
  BootstrapStatsSlabs,
  prepareEntity,
  ReplicaReader,
} from "../../../lab/bench/lib/replica-reads.ts";
import { observe } from "../../../lab/bench/lib/observe.ts";

const metadata = {
  recordedAt: 100,
  createdBy: "writer",
  entityType: null,
  schemaVersion: 1,
  txId: "fixture",
};
const root = packEntity(1, [{
  id: "root-ref", entityId: "root", attribute: "ref",
  value: { type: "ref", value: "child" }, position: 1,
  validFrom: 5, validTo: 10, publicMetadata: metadata,
}]);
const child = packEntity(1, [{
  id: "child-stamp", entityId: "child", attribute: ":placement/stamp",
  value: { type: "number", value: -0 }, position: 1,
  validFrom: 0, publicMetadata: metadata,
}]);
const delta = {
  position: 1, reset: true, valid: true, recordTime: 100,
  changes: [["root", undefined, root], ["child", undefined, child]] as const,
};

// [DX-T1-15] Why: exercise the nonzero slab offset across image transfer, a live update and historical references.
// Rejected: comparing only a buffer address or the latest cut where a misplaced statistic could go unnoticed.
it("preserves exact read cuts with shared bootstrap summaries after image cloning", async () => {
  const slabs = new BootstrapStatsSlabs();
  const normal = new ReplicaReader(100_000);
  normal.apply({ ...delta, changes: delta.changes.map(([id, previous, entity]) => [
    id, previous, prepareEntity(id, entity),
  ]) });
  const packed = new RecentReads(20_000, 100_000);
  packed.apply(delta, (id, entity) => prepareEntity(id, entity, slabs));
  const image = packed.image();
  const first = image.entities[0]![2] as ReturnType<typeof prepareEntity>;
  const second = image.entities[1]![2] as ReturnType<typeof prepareEntity>;
  expect(first.stats).toBe(second.stats);
  expect(second.statsOffset).toBe(first.statsBytes);
  const compact = new ReplicaReader(100_000);
  compact.install(structuredClone(image));
  const replacement = packEntity(2, [{
    id: "child-v2", entityId: "child", attribute: ":placement/stamp",
    value: { type: "number", value: 9 }, position: 2,
    validFrom: 0, publicMetadata: { ...metadata, recordedAt: 200 },
  }]);
  for (const reader of [normal, compact]) reader.apply({
    position: 2, reset: false, valid: true, recordTime: 200,
    changes: [["child", child, prepareEntity("child", replacement)]],
  });
  for (const recordedPosition of [1, 2]) for (const validAt of [0, 5, 9, 10]) {
    const basis = { recordedPosition, validAt };
    const fallback = async () => { throw Error("Unexpected gateway fallback"); };
    const a = await normal.pullAt("root", basis, fallback);
    const b = await compact.pullAt("root", basis, fallback);
    expect(observe(b)).toEqual(observe(a));
    expect(b.triples).toEqual(a.triples);
  }
});

it("rejects preparation that changes authoritative bytes before admitting a cut", () => {
  const packed = new RecentReads();
  expect(() => packed.apply(delta, () => child)).toThrow(/changed packed slice/);
  expect(packed.resolve({ recordedPosition: 1, validAt: 7 })).toBeUndefined();
});
