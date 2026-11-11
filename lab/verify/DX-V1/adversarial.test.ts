import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import { gunzipSync } from "node:zlib";
import {
  RecentReads,
  Replica,
  packEntity,
  type SweepRow,
} from "../../../packages/datomic/dist/index.js";
import { encodeRowText } from "../../../packages/datomic/dist/rowText.js";
import { decodeEntity, reachResponse } from "../../../packages/datomic/dist/reach.js";
import { decodeReplicaRows } from "../../../packages/datomic/dist/replica/decodeRows.js";
import { Slabs } from "../../../packages/datomic/dist/replica/sharedIndex.js";
import { ReplicaReader, prepareEntity } from "../../bench/lib/replica-reads.ts";
import { observe, R } from "../../bench/lib/observe.ts";
import { Model } from "../../bench/lib/model.ts";
import { ExpectationCache } from "../../bench/lib/expectation-cache.ts";
import {
  ownFacts,
  sharedFacts,
  ids,
  accountsFor,
  accountOfSubject,
} from "../../bench/lib/world.ts";
import { ReadRecords } from "../../bench/lib/read-records.ts";
import { worldBytes } from "../../experiments/EXP-DX1/r3/canonical-world.ts";

// [DX-V1] Why: execute the exact source judge without starting driver.main or opening a database.
// Rejected: a hand-written copy of judgeRead (could miss its actual acceptance behavior).
const driver = fs.readFileSync(new URL("../../bench/driver.ts", import.meta.url), "utf8");
const judgeBody = driver.slice(
  driver.indexOf("function judgeRead("),
  driver.indexOf("// [DX-R3] Why: one byte per verdict"),
);
const judge = new Function(
  "expectations",
  "model",
  "R",
  judgeBody.replace("r: ReadRecord", "r") + "; return judgeRead;",
);
const row = (e: string, value: any, p = 1, from = 0, to?: number): SweepRow => ({
  id: `${e}-${p}`,
  entityId: e,
  attribute: "value",
  value,
  position: p,
  validFrom: from,
  ...(to === undefined ? {} : { validTo: to }),
});
function wire(r: SweepRow) {
  return encodeRowText({
    id: r.id,
    entity_id: r.entityId,
    attribute: r.attribute,
    value_type: r.value.type,
    value_string: ["ref", "string", "integer", "blob"].includes(r.value.type)
      ? r.value.value
      : null,
    value_number: r.value.type === "number" ? r.value.value : null,
    value_boolean: r.value.type === "boolean" ? Number(r.value.value) : null,
    value_datetime: r.value.type === "datetime" ? r.value.value : null,
    value_json: r.value.type === "json" ? JSON.stringify(r.value.value) : null,
    recorded_position: pOf(r),
    recorded_at: pOf(r) * 100,
    valid_from: r.validFrom,
    valid_to: r.validTo ?? null,
    created_by: "client",
    entity_type: "Subject",
    schema_version: 1,
    tx_id: "_tx/00000000000000000000000001",
    retracted_at: null,
    retracted_position: null,
    retract_tx_id: null,
  } as any);
}
const pOf = (r: SweepRow) => r.position;
const pullResult = (triples: readonly any[]) => ({
  triples,
  entities: 1,
  depth: 0,
  roundTrips: 1,
  route: "source",
  language: "test",
  waitedMs: 0,
});
function record(
  triples: readonly any[],
  subject = 0,
  recordedAt = 100,
  validAt = 2000_000_000_000,
) {
  const o = observe(pullResult(triples));
  return [
    0,
    subject,
    recordedAt,
    validAt,
    1,
    1,
    o.stamp,
    o.facts,
    o.digest,
    o.bytes,
    0,
    0,
    null,
    0,
    1,
    0,
    -1,
    0,
    "replica",
    "packed",
    0,
  ] as any;
}

test("F1: actual gateway Triple and local result disagree on normal row metadata", async () => {
  const r = row("root", { type: "string", value: "present" }, 1, 0, 20);
  const text = wire(r);
  const gateway = reachResponse("root", new Map([["root", decodeEntity("root", 1, [text])]]), {
    validAt: 10,
    recordedPosition: 1,
  });
  const reader = new ReplicaReader();
  reader.apply({
    position: 1,
    reset: true,
    valid: true,
    recordTime: 100,
    changes: [
      [
        "root",
        undefined,
        prepareEntity("root", packEntity(1, decodeReplicaRows("root", 1, [text], 1))),
      ],
    ],
  });
  const actual = await reader.pullAt("root", { recordedPosition: 1, validAt: 10 }, async () => {
    throw Error("fallback");
  });
  assert.equal(actual.route, "replica");
  assert.equal((gateway.triples[0] as any).recordedAt, 100);
  assert.equal((actual.triples[0] as any).recordedAt, undefined);
  assert.equal((gateway.triples[0] as any).createdBy.value, "client");
  assert.equal((actual.triples[0] as any).createdBy, undefined);
  assert.equal((gateway.triples[0] as any).validTo.value, 20);
  assert.equal(actual.triples[0]!.validTo, 20);
  assert.notDeepEqual(actual.triples, gateway.triples);
  assert.deepEqual(observe(actual), observe(pullResult(gateway.triples)));
  if (process.env.DX_V1_ASSERT_CLAIM === "1") assert.deepEqual(actual.triples, gateway.triples);
});

test("F2: unchanged judgeRead accepts incorrect assertion identity and temporal metadata", () => {
  const model = new Model(2000),
    expectations = new ExpectationCache(model);
  const facts = [
    ...ownFacts(0, accountsFor(2000)),
    ...sharedFacts(accountOfSubject(0, accountsFor(2000))),
  ];
  const correct = facts.map((f, i) => ({
    id: `correct-${i}`,
    entityId: f.e,
    attribute: f.a,
    value: f.v,
    position: 1,
    validFrom: 0,
  }));
  const wrong = correct.map((r, i) => ({
    ...r,
    id: `WRONG-${i}`,
    position: 9999,
    validFrom: -999999,
    validTo: 2000_000_000_001,
  }));
  const check = judge(expectations, model, R);
  assert.deepEqual(check(record(correct)), { ok: true, kind: "correct" });
  assert.notEqual(worldBytes(correct), worldBytes(wrong));
  assert.deepEqual(check(record(wrong)), { ok: true, kind: "correct" });
  if (process.env.DX_V1_ASSERT_CLAIM === "1") assert.equal(check(record(wrong)).ok, false);
});

test("F2: canonical member serialization collapses signed zero, nested JSON zero and field boundaries", () => {
  const pairs = [
    [row("root", { type: "number", value: -0 }), row("root", { type: "number", value: 0 })],
    [
      row("root", { type: "json", value: { nested: [-0] } }),
      row("root", { type: "json", value: { nested: [0] } }),
    ],
    [
      { ...row("root", { type: "string", value: "x" }), entityId: "a\u0001b", attribute: "c" },
      { ...row("root", { type: "string", value: "x" }), entityId: "a", attribute: "b\u0001c" },
    ],
  ];
  for (const [left, right] of pairs) {
    assert.notEqual(worldBytes([left]), worldBytes([right]));
    assert.deepEqual(observe(pullResult([left])), observe(pullResult([right])));
  }
});

test("atomic half-applied journal stays unavailable at new position, old cut remains whole", async () => {
  const root = row("root", { type: "ref", value: "child" });
  const child = row("child", { type: "string", value: "old" });
  let release!: () => void, enter!: () => void;
  const entered = new Promise<void>((resolve) => {
    enter = resolve;
  });
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const page = (p: number, rs: SweepRow[]) => ({
    position: p,
    t: String(p),
    reset: true,
    entities: rs.map((r) => [r.entityId, p, [wire(r)]]),
    closures: [["root", rs.map((r) => r.entityId)]],
  });
  const source: any = {
    head: async () => 1,
    page: async () => page(1, [root, child]),
    feed: async () => ({
      head: 2,
      transactions: [
        {
          position: 2,
          entities: ["root"],
          replacement: page(2, [
            row("root", { type: "ref", value: "new" }, 2),
            row("new", { type: "string", value: "new" }, 2),
          ]),
        },
      ],
    }),
  };
  const replica = new Replica(source, 0),
    index = new RecentReads();
  replica.onUpdate = (update) => index.apply(update);
  await replica.bootstrap(["root"]);
  const held = await replica.snapshotAt(1);
  // [DX-V1] Why: legacy need refresh yields while all changes remain staged outside the public index.
  // Rejected: manually mutating Replica's private entity table to manufacture a half commit.
  source.feed = async () => ({
    head: 2,
    transactions: [{ position: 2, entities: ["root", "child"] }],
  });
  source.page = async () => {
    enter();
    await gate;
    return {
      ...page(2, [
        row("root", { type: "ref", value: "child" }, 2),
        row("child", { type: "string", value: "new" }, 2),
      ]),
      closures: [
        ["root", ["root"]],
        ["child", ["child"]],
      ],
    };
  };
  const following = replica.followOnce();
  await entered;
  assert.equal(index.pull("root", { recordedPosition: 2, validAt: 0 }), undefined);
  assert.equal(
    index.pull("root", { recordedPosition: 1, validAt: 0 })!.rows[1]!.value.value,
    "old",
  );
  release();
  await following;
  assert.equal(
    index.pull("root", { recordedPosition: 2, validAt: 0 })!.rows[1]!.value.value,
    "new",
  );
  assert.equal(held.world("root")[1]!.value.value, "old");
});

test("independent temporal fold: 300 cuts, shared refs/cycles/leaving closures, corrections, retractions, byte eviction and held results", async () => {
  const reader = new ReplicaReader(12000);
  const state = new Map<string, SweepRow[]>(),
    versions = new Map<string, any>();
  const cuts = new Map<number, Map<string, SweepRow[]>>();
  const names = ["root", "other", "shared", "child", "cycle"];
  let seed = 0x13579bdf,
    checked = 0,
    fallbacks = 0;
  const rand = () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return seed >>> 0;
  };
  const held: { bytes: string; result: any }[] = [];
  for (let p = 1; p <= 300; p++) {
    const changed = p === 1 ? names : [names[rand() % names.length]!];
    const changes: any[] = [];
    for (const id of changed) {
      const rs: SweepRow[] = [];
      if (rand() % 5)
        rs.push(row(id, { type: "string", value: `v${p}` }, p, rand() % 20, 21 + (rand() % 20)));
      if (rand() % 3)
        rs.push({
          ...row(
            id,
            { type: "ref", value: names[rand() % names.length]! },
            p,
            rand() % 20,
            21 + (rand() % 20),
          ),
          id: `${id}-ref-${p}`,
          attribute: "link",
        });
      state.set(id, rs);
      const next = prepareEntity(id, packEntity(rs.length ? p : 0, rs));
      changes.push([id, versions.get(id), next]);
      versions.set(id, next);
    }
    reader.apply({ reset: p === 1, valid: true, position: p, recordTime: p * 100, changes });
    cuts.set(p, new Map(state));
    for (const position of new Set([1, p, reader.index.floor, Math.max(1, p - 3)])) {
      for (const validAt of [-1, 0, 10, 20, 21, 30, 40, 50]) {
        const snapshot = cuts.get(position)!;
        const expected: SweepRow[] = [],
          queue = ["root"],
          seen = new Set(queue);
        for (const id of queue)
          for (const r of snapshot.get(id) ?? []) {
            if (r.validFrom > validAt || (r.validTo !== undefined && r.validTo <= validAt))
              continue;
            expected.push(r);
            if (r.value.type === "ref" && !seen.has(r.value.value)) {
              seen.add(r.value.value);
              queue.push(r.value.value);
            }
          }
        const result = await reader.pullAt(
          "root",
          { recordedPosition: position, recordedAt: position * 100, validAt },
          async () => {
            fallbacks++;
            return pullResult(expected);
          },
        );
        assert.equal(worldBytes(result.triples), worldBytes(expected));
        assert.deepEqual(observe(result), observe(pullResult(expected)));
        checked++;
        if (p % 30 === 0 && position === p && validAt === 20)
          held.push({
            bytes: worldBytes(expected),
            result: await reader.pullAt(
              "root",
              { recordedPosition: position, validAt },
              async () => {
                throw Error("fallback");
              },
            ),
          });
      }
    }
  }
  for (const saved of held) assert.equal(worldBytes(saved.result.triples), saved.bytes);
  assert(reader.index.floor > 1 && fallbacks > 0);
  console.log(
    JSON.stringify({
      temporalFold: { checked, fallbacks, held: held.length, floor: reader.index.floor },
    }),
  );
});

test("duplicate, missing and out-of-order reader deltas invalidate; separately lagging reader falls back", async () => {
  for (const p of [1, 3, 0]) {
    const index = new RecentReads();
    index.apply({ position: 1, reset: true, valid: true, changes: [] });
    assert.throws(
      () => index.apply({ position: p, reset: false, valid: true, changes: [] }),
      /gap/,
    );
    assert.equal(index.resolve({ recordedPosition: 1, validAt: 0 }), undefined);
  }
  const a = new ReplicaReader(),
    b = new ReplicaReader();
  const old = prepareEntity("root", packEntity(1, [row("root", { type: "string", value: "old" })]));
  for (const r of [a, b])
    r.apply({ position: 1, reset: true, valid: true, changes: [["root", undefined, old]] });
  a.apply({
    position: 2,
    reset: false,
    valid: true,
    changes: [
      [
        "root",
        old,
        prepareEntity("root", packEntity(2, [row("root", { type: "string", value: "new" }, 2)])),
      ],
    ],
  });
  const answer = await b.pullAt("root", { recordedPosition: 2, validAt: 0 }, async () =>
    pullResult([row("root", { type: "string", value: "new" }, 2)]),
  );
  assert.equal(answer.route, "fallback");
  assert.equal(answer.triples[0]!.value.value, "new");
});

test("source gap, duplicate, out-of-order, omitted and declined journals fail closed", async () => {
  for (const transactions of [
    [{ position: 3, entities: [] }],
    [
      { position: 2, entities: [] },
      { position: 2, entities: [] },
    ],
    [
      { position: 3, entities: [] },
      { position: 2, entities: [] },
    ],
    [],
  ]) {
    const source: any = {
      head: async () => 1,
      page: async () => ({
        position: 1,
        t: "1",
        reset: true,
        entities: [["root", 1, [wire(row("root", { type: "string", value: "old" }))]]],
        closures: [["root", ["root"]]],
      }),
      feed: async () => ({ head: 3, transactions }),
    };
    const replica = new Replica(source, 0),
      reader = new ReplicaReader();
    replica.onUpdate = (delta) =>
      reader.apply({
        ...delta,
        changes: delta.changes.map(([id, previous, e]) => [id, previous, prepareEntity(id, e)]),
      });
    await replica.bootstrap(["root"]);
    const held = await replica.snapshotAt(1);
    await assert.rejects(replica.followOnce());
    assert.equal(replica.isValid, false);
    assert.equal(reader.index.pull("root", { recordedPosition: 1, validAt: 0 }), undefined);
    assert.equal(held.world("root")[0]!.value.value, "old");
  }
  const replica = new Replica(
    {
      head: async () => 1,
      page: async () => ({
        declined: "scope",
        position: 1,
        t: "1",
        reset: true,
        entities: [],
        closures: [],
      }),
      feed: async () => {
        throw Error("declined");
      },
    },
    0,
  );
  await assert.rejects(replica.bootstrap(["root"]));
  assert.equal(replica.isValid, false);
});

test("a correction to an existing assertion's interval retains its old cut and exact new endpoints", async () => {
  const reader = new ReplicaReader();
  const oldRow = row("root", { type: "string", value: "same assertion" }, 1, 10, 20);
  const nextRow = { ...oldRow, validFrom: 0, validTo: 5 };
  const old = prepareEntity("root", packEntity(1, [oldRow]));
  reader.apply({ position: 1, reset: true, valid: true, changes: [["root", undefined, old]] });
  reader.apply({
    position: 2,
    reset: false,
    valid: true,
    changes: [["root", old, prepareEntity("root", packEntity(2, [nextRow]))]],
  });
  for (const p of [1, 2])
    for (const validAt of [-1, 0, 4, 5, 9, 10, 19, 20]) {
      const r = p === 1 ? oldRow : nextRow;
      const expected = r.validFrom <= validAt && validAt < r.validTo! ? [r] : [];
      const actual = await reader.pullAt("root", { recordedPosition: p, validAt }, async () => {
        throw Error("fallback");
      });
      assert.equal(worldBytes(actual.triples), worldBytes(expected));
      assert.deepEqual(observe(actual), observe(pullResult(expected)));
    }
});

test("unknown/duplicate/regressing clocks decline after observation; a captured result survives rebuild", async () => {
  for (const time of [NaN, 99, 100]) {
    const index = new RecentReads();
    index.apply({ position: 1, reset: true, valid: true, recordTime: 100, changes: [] });
    index.apply({ position: 2, reset: false, valid: true, recordTime: time, changes: [] });
    assert.equal(index.resolve({ recordedAt: 100, validAt: 0 }), undefined);
    assert.equal(index.resolve({ recordedPosition: 2, validAt: 0 }), 2);
  }
  const reader = new ReplicaReader();
  reader.apply({
    position: 1,
    reset: true,
    valid: true,
    changes: [
      [
        "root",
        undefined,
        prepareEntity("root", packEntity(1, [row("root", { type: "string", value: "old" })])),
      ],
    ],
  });
  const result = await reader.pullAt("root", { recordedPosition: 1, validAt: 0 }, async () => {
    throw Error("fallback");
  });
  reader.apply({
    position: 10,
    reset: true,
    valid: true,
    changes: [
      [
        "root",
        undefined,
        prepareEntity(
          "root",
          packEntity(10, [row("root", { type: "string", value: "rebuilt" }, 10)]),
        ),
      ],
    ],
  });
  assert.equal(result.triples[0]!.value.value, "old");
  assert.equal(reader.index.pull("root", { recordedPosition: 1, validAt: 0 }), undefined);
});

test("F3: time-only read returns the earlier cut while a committed equal-clock journal is delayed", async () => {
  const reader = new ReplicaReader();
  const before = row("root", { type: "string", value: "before" });
  const after = row("root", { type: "string", value: "after" }, 2);
  const initial = prepareEntity("root", packEntity(1, [before]));
  reader.apply({
    position: 1,
    reset: true,
    valid: true,
    recordTime: 100,
    changes: [["root", undefined, initial]],
  });
  // [DX-V1] Why: non-replay-safe SPI accepts equality with the prior clock (commit.clj:91-96).
  // Rejected: regressing timestamps; equality alone preserves the gateway's regular-position capability.
  const gateway = async () => pullResult([after]);
  const answer = await reader.pullAt("root", { recordedAt: 100, validAt: 0 }, gateway);
  assert.equal(answer.route, "replica");
  assert.equal(answer.triples[0]!.value.value, "before");
  assert.notEqual(worldBytes(answer.triples), worldBytes((await gateway()).triples));
  if (process.env.DX_V1_ASSERT_CLAIM === "1")
    assert.equal(worldBytes(answer.triples), worldBytes((await gateway()).triples));
  reader.apply({
    position: 2,
    reset: false,
    valid: true,
    recordTime: 100,
    changes: [["root", initial, prepareEntity("root", packEntity(2, [after]))]],
  });
  assert.equal(
    (await reader.pullAt("root", { recordedAt: 100, validAt: 0 }, gateway)).route,
    "fallback",
  );
  assert.equal(
    reader.index.pull("root", { recordedPosition: 1, validAt: 0 })!.rows[0]!.value.value,
    "before",
  );
});

test("slab append and rollover never change retained SharedArrayBuffer slices", () => {
  const slabs = new Slabs();
  const original = slabs.put(packEntity(1, [row("root", { type: "string", value: "original" })]));
  const bytes = Buffer.from(new Uint8Array(original.buffer, original.offset, original.byteLength));
  for (let p = 2; p <= 80; p++)
    slabs.put(
      packEntity(
        p,
        Array.from({ length: 500 }, (_, i) => ({
          ...row("other", { type: "integer", value: String(p) }, p),
          id: `row-${i}`,
        })),
      ),
    );
  assert.deepEqual(
    Buffer.from(new Uint8Array(original.buffer, original.offset, original.byteLength)),
    bytes,
  );
});

test("late ACK expected-state append invalidates cache; spill checks all 9000 tuples and detects truncation", () => {
  const model = new Model(2000),
    cache = new ExpectationCache(model);
  const before = cache.expected(0, 200, 20);
  model.addCommit(0, {
    instant: 100,
    position: 2,
    txId: "late",
    stamp: 1,
    stampValidFrom: 10,
    parts: [{ validFrom: 10, a: 1, b: 2, n: 1 }],
    ackAtMs: 1000,
    stream: "background",
  });
  assert.deepEqual(cache.expected(0, 200, 20), model.expected(0, 200, 20));
  assert.notDeepEqual(cache.expected(0, 200, 20), before);
  const dir = new URL("./spill-test", import.meta.url).pathname;
  assert(!fs.existsSync(dir));
  try {
    const store = new ReadRecords(dir),
      rows: any[] = [];
    for (let i = 0; i < 9000; i++) {
      const r = record([row("root", { type: "string", value: String(i) })]);
      r[R.phase] = i % 7;
      r[R.error] = i % 13 ? null : "Timeout";
      r[R.digest] = `digest-${i}`;
      r[R.start] = 1000 + i / 16;
      r[R.waitedMs] = -0;
      rows.push(r);
      store.push(r);
    }
    store.checkpoint();
    const resumed = new ReadRecords(dir, true);
    assert.deepEqual([...resumed], rows);
    const phase: any[] = [];
    resumed.forPhase(3, (r) => phase.push(r));
    assert.deepEqual(
      phase,
      rows.filter((r) => r[R.phase] === 3),
    );
    fs.truncateSync(`${dir}/0.f64`, 100);
    assert.throws(() => [...new ReadRecords(dir, true)], /Truncated/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("recorded real gateway page exhibits F1 on original bytes", () => {
  const directory = "/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-R1/tx2-dxr1-1000-d/pages";
  const request = JSON.parse(fs.readFileSync(`${directory}/request-0.json`, "utf8"));
  const response = JSON.parse(
    gunzipSync(fs.readFileSync(`${directory}/response-0.json.gz`)).toString(),
  );
  assert(request.rowPage && response.entities.length);
  const [id, rev, wire] = response.entities.find((entry: any) => entry[2].length);
  const gateway = decodeEntity(id, rev, wire).rows;
  const local = decodeReplicaRows(id, rev, wire, response.position);
  assert.equal(gateway.length, local.length);
  assert.equal(typeof gateway[0].recordedAt, "number");
  assert.equal((local[0] as any).recordedAt, undefined);
  assert.deepEqual(observe(pullResult(gateway)), observe(pullResult(local)));
  console.log(
    JSON.stringify({
      recordedMetadataCounterexample: {
        root: id,
        position: response.position,
        gatewayRecordedAt: gateway[0].recordedAt,
        localRecordedAt: null,
        facts: local.length,
      },
    }),
  );
});
