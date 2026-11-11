import assert from "node:assert/strict";
import { test } from "node:test";
import { packEntity, type SweepRow } from "../../../../packages/datomic/dist/index.js";
import { prepareEntity, ReplicaReader, ReplicaReadHost } from "../../../bench/lib/replica-reads.ts";
import { worldBytes } from "./canonical-world.ts";
import { observe } from "../../../bench/lib/observe.ts";

test("prepared contributions include every actual typed fact at valid-time boundaries and old cuts", async () => {
  const values: any[] = [
    { type: "string", value: "\ud800/é" },
    { type: "integer", value: "9007199254740993" },
    { type: "boolean", value: true },
    { type: "number", value: -0 },
    { type: "datetime", value: 42 },
    { type: "blob", value: "body", mimeType: "text/plain", size: 4 },
    { type: "json", value: { a: [-0, "é", { x: 1 }] } },
    { type: "ref", value: "child" },
  ];
  const rows: SweepRow[] = values.map((value, i) => ({
    entityId: "root",
    id: `row-${i}`,
    attribute: `attribute-${i}`,
    value,
    position: 1,
    validFrom: i,
    ...(i % 2 ? { validTo: i + 10 } : {}),
  }));
  rows.push({
    entityId: "root",
    id: "stamp",
    attribute: ":placement/stamp",
    value: { type: "number", value: 3 },
    position: 1,
    validFrom: 0,
  });
  const child: SweepRow[] = [
    {
      entityId: "child",
      id: "cycle",
      attribute: "back",
      value: { type: "ref", value: "root" as any },
      position: 1,
      validFrom: 0,
    },
  ];
  assert.notEqual(
    worldBytes([{ ...rows[3]!, value: { type: "number", value: -0 } }]),
    worldBytes([{ ...rows[3]!, value: { type: "number", value: 0 } }]),
  );
  assert.equal(worldBytes(rows), worldBytes([...rows].reverse()));
  const rootEntity = prepareEntity("root", packEntity(1, rows)),
    childEntity = prepareEntity("child", packEntity(1, child));
  const reader = new ReplicaReader();
  reader.apply({
    reset: true,
    valid: true,
    position: 1,
    recordTime: 100,
    changes: [
      ["root", undefined, rootEntity],
      ["child", undefined, childEntity],
    ],
  });
  const newer = prepareEntity(
    "root",
    packEntity(2, [{ ...rows.at(-1)!, value: { type: "number", value: 4 }, position: 2 }]),
  );
  reader.apply({
    reset: false,
    valid: true,
    position: 2,
    recordTime: 200,
    changes: [["root", rootEntity, newer]],
  });
  for (const p of [1, 2])
    for (let validAt = -1; validAt < 25; validAt += 0.5) {
      const basis = { recordedPosition: p, recordedAt: p * 100, validAt };
      const expected = reader.index.pull("root", basis)!;
      const fast = await reader.pullAt("root", basis, async () => {
        throw Error("unexpected fallback");
      });
      assert.deepEqual(
        observe(fast),
        observe({
          triples: expected.rows,
          entities: expected.entities,
          depth: expected.depth,
          roundTrips: 0,
          route: "replica",
          language: "packed",
          waitedMs: 0,
        }),
      );
    }
  const clone = new ReplicaReader();
  clone.install(structuredClone(reader.index.image()));
  assert.deepEqual(
    observe(
      await clone.pullAt("root", { recordedAt: 100, validAt: 9 }, async () => {
        throw Error("fallback");
      }),
    ),
    observe(
      await reader.pullAt("root", { recordedAt: 100, validAt: 9 }, async () => {
        throw Error("fallback");
      }),
    ),
  );
});

test("receipt wait is bounded and reports a fallback; intervening ACK retains the requested basis", async () => {
  const reader = new ReplicaReader(),
    root = prepareEntity("root", packEntity(1, []));
  reader.apply({
    reset: true,
    valid: true,
    position: 1,
    recordTime: 100,
    changes: [["root", undefined, root]],
  });
  let fallbacks = 0;
  const fallback = async () => {
    fallbacks++;
    return {
      triples: [],
      entities: 1,
      depth: 0,
      roundTrips: 1,
      route: "source",
      language: "gateway",
      waitedMs: 0,
    };
  };
  const ahead = await reader.pullAt(
    "root",
    { recordedPosition: 2, recordedAt: 200, validAt: 0 },
    fallback,
  );
  assert.equal(ahead.route, "fallback");
  assert(ahead.waitedMs >= 5);
  assert.equal(fallbacks, 1);
  const straddled = await reader.pullAt(
    "root",
    { recordedPosition: 1, validAt: 0 },
    fallback,
    async () => {
      reader.apply({
        reset: false,
        valid: true,
        position: 2,
        recordTime: 200,
        changes: [["root", root, prepareEntity("root", packEntity(2, []))]],
      });
    },
  );
  assert.equal(straddled.route, "replica");
  assert.equal(reader.index.position, 2);
});

test("recovery does not anchor a record clock from pending or previously rejected journals", async () => {
  const times = new Map([[1, 100]]);
  const host = new (ReplicaReadHost as any)({}, times) as ReplicaReadHost;
  const entity = packEntity(1, []);
  host.replica.onUpdate!({
    reset: true,
    valid: true,
    position: 1,
    changes: [["root", undefined, entity]],
  });
  assert.equal(host.index.resolve({ recordedAt: 100, validAt: 0 }), 1);
  times.set(2, 200);
  host.replica.onUpdate!({ reset: true, valid: false, position: 1, changes: [] });
  assert.equal(times.size, 0);
  times.set(3, 300);
  host.replica.onUpdate!({
    reset: true,
    valid: true,
    position: 3,
    changes: [["root", undefined, entity]],
  });
  assert.equal(host.index.resolve({ recordedAt: 300, validAt: 0 }), undefined);
  assert.equal(host.index.resolve({ recordedPosition: 3, validAt: 0 }), 3);
  await host.close();
});

test("many interval boundaries use compact shared summaries, with exact end-point observations", async () => {
  const rows: SweepRow[] = Array.from({ length: 512 }, (_, i) => ({
    id: `r${i}`,
    entityId: "root",
    attribute: i % 5 ? "value" : ":placement/stamp",
    value: { type: "number", value: i },
    position: 1,
    validFrom: i,
    ...(i % 3 ? { validTo: i + 200 } : {}),
  }));
  const packed = packEntity(1, rows),
    prepared = prepareEntity("root", packed);
  assert(prepared.stats instanceof SharedArrayBuffer);
  assert(prepared.stats.byteLength <= (rows.length * 2 + 1) * 64);
  const reader = new ReplicaReader();
  reader.apply({ reset: true, valid: true, position: 1, changes: [["root", undefined, prepared]] });
  for (const validAt of [-1, 0, 1, 199, 200, 511, 512, 710, 711, Number.MAX_VALUE]) {
    const exact = reader.index.pull("root", { validAt })!;
    const fast = await reader.pullAt("root", { validAt }, async () => {
      throw Error("fallback");
    });
    assert.deepEqual(
      observe(fast),
      observe({
        triples: exact.rows,
        entities: 1,
        depth: 0,
        roundTrips: 0,
        route: "replica",
        language: "packed",
        waitedMs: 0,
      }),
    );
  }
});
