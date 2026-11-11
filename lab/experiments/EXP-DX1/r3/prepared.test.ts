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
    assert.equal(worldBytes(fast.triples), worldBytes(exact.rows));
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

test("lazy worlds retain the exact selected version after the window advances", async () => {
  const reader = new ReplicaReader();
  const original = prepareEntity(
    "root",
    packEntity(1, [
      {
        id: "old",
        entityId: "root",
        attribute: "value",
        value: { type: "string", value: "old" },
        position: 1,
        validFrom: 0,
      },
    ]),
  );
  reader.apply({ reset: true, valid: true, position: 1, changes: [["root", undefined, original]] });
  const basis = { validAt: 0 };
  const result = await reader.pullAt("root", basis, async () => { throw Error("fallback"); });
  basis.validAt = -1;
  assert(Object.getOwnPropertyDescriptor(result, "triples")?.get);
  reader.apply({
    reset: false,
    valid: true,
    position: 2,
    changes: [["root", original, prepareEntity("root", packEntity(2, []))]],
  });
  assert.equal(result.triples[0]?.value.value, "old");
  assert.equal(result.triples.length, 1);
});

// [DX-R3] Why: a peer-placement experiment must change the actual transport endpoint, not only its report label.
// Rejected: assuming a worker's default composition endpoint controls the explicit replica client.
test("replica peer selection keeps reader and writer controls distinct", async () => {
  const { replicaEndpoint } = await import("../../../bench/lib/replica-reads.ts");
  const env = { DATOMIC_URL: "http://writer:8080", DATOMIC_READ_URLS: "http://reader:8080,http://reader2:8080" };
  assert.equal(replicaEndpoint(env, "reader"), "http://reader:8080");
  assert.equal(replicaEndpoint(env, "writer"), "http://writer:8080");
  assert.equal(replicaEndpoint({ DATOMIC_URL: env.DATOMIC_URL }, "reader"), env.DATOMIC_URL);
});

// [DX-R3] Why: the P3 follower must actually move off W while gateway RYOW preserves its exact writer route.
// Rejected: changing the shared default and reintroducing stale gateway RYOW reads.
test("local-mode P3 follower can use R without changing the gateway-mode writer route", async () => {
  const { sideThreadEnvironment } = await import("../../../bench/lib/side-thread.ts");
  const env = { DATOMIC_URL: "http://writer:8080", DATOMIC_READ_URLS: "http://reader:8080" };
  assert.equal(sideThreadEnvironment(env, "reader").DATOMIC_READ_URLS, env.DATOMIC_READ_URLS);
  assert.equal(sideThreadEnvironment(env).DATOMIC_READ_URLS, env.DATOMIC_URL);
  assert.equal(env.DATOMIC_READ_URLS, "http://reader:8080");
});

// [DX-R3] Why: sharing the host index must still wake RYOW waiters only after the host applies the exact target cut.
// Rejected: advancing a second index or resolving a wait from an ACK before the feed applies it.
test("RYOW shares an externally applied index and wakes only at its target", async () => {
  const { ReplicaReader } = await import("../../../bench/lib/replica-reads.ts");
  const first = new ReplicaReader();
  first.index.apply({ position: 10, reset: true, valid: true, recordTime: 100, changes: [] });
  const ryow = new ReplicaReader(64 * 1024 ** 2, first.index);
  assert.equal(ryow.index, first.index);
  let completed = false;
  const pending = ryow.wait(12, 500).then(() => { completed = true; });
  first.index.apply({ position: 11, reset: false, valid: true, recordTime: 101, changes: [] });
  ryow.notify(); await Promise.resolve(); assert.equal(completed, false);
  first.index.apply({ position: 12, reset: false, valid: true, recordTime: 102, changes: [] });
  ryow.notify(); await pending; assert.equal(completed, true);
});

// [DX-R3] Why: an ACK-to-apply histogram must retain its censoring denominator and count each valid position once.
// Rejected: reporting incomplete applications as zeros or counting a recovery replay twice.
test("apply-delay summary exposes missing ACKed positions and clamps apply-before-ACK to zero", async () => {
  const { appliedDelay } = await import("../../../bench/lib/replica-thread.ts");
  const result = appliedDelay([{ position: 1, at: 90 }, { position: 1, at: 110 }, { position: 2, at: 225 }, { position: 9, at: 900 }], new Map([[1, { at: 100 }], [2, { at: 200 }], [3, { at: 300 }]]));
  assert.equal(result.count, 2); assert.equal(result.acknowledgedPositions, 3);
  assert.equal(result.p50Ms, 0); assert(result.p99Ms! >= 25 && result.p99Ms! < 25.2);
  assert.deepEqual(result.unappliedAcknowledgedPositions, [3]);
});
