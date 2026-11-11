import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import { Option } from "effect";
import { packEntity, RecentReads } from "../../../../packages/datomic/dist/index.js";
import { decodeReplicaRows } from "../../../../packages/datomic/dist/replica/decodeRows.js";
import { decodeEntity, reachResponse } from "../../../../packages/datomic/dist/reach.js";
import { encodeRowText } from "../../../../packages/datomic/dist/rowText.js";
import {
  prepareEntity,
  ReplicaReader,
  replicaReply,
  restoreReplicaReply,
} from "../../../bench/lib/replica-reads.ts";
import { observe, R } from "../../../bench/lib/observe.ts";
import { canonicalWorld } from "../../../bench/lib/canonical.ts";
import { ownFacts, sharedFacts, accountsFor, accountOfSubject } from "../../../bench/lib/world.ts";
import { Model } from "../../../bench/lib/model.ts";
import { ExpectationCache } from "../../../bench/lib/expectation-cache.ts";

const wire = (value = "before", position = 1, recordedAt = 100) =>
  encodeRowText({
    id: `row-${position}`,
    entity_id: "root",
    attribute: "value",
    value_type: "string",
    value_string: value,
    value_number: null,
    value_boolean: null,
    value_datetime: null,
    value_json: null,
    recorded_position: position,
    recorded_at: recordedAt,
    valid_from: 0,
    valid_to: 20,
    created_by: "client",
    entity_type: "Subject",
    schema_version: 1,
    tx_id: "_tx/00000000000000000000000001",
    retracted_at: null,
    retracted_position: null,
    retract_tx_id: null,
  } as any);
const result = (triples: readonly any[]) => ({
  triples,
  entities: 1,
  depth: 0,
  roundTrips: 1,
  route: "source",
  language: "test",
  waitedMs: 0,
});
const packed = (text: string, position: number) =>
  prepareEntity(
    "root",
    packEntity(position, decodeReplicaRows("root", position, [text], position)),
  );

test("F1 corrected: public full Triple equality, actual Options, prepared and materialized observations", async () => {
  const text = wire(),
    p = packed(text, 1),
    reader = new ReplicaReader();
  reader.apply({
    reset: true,
    valid: true,
    position: 1,
    recordTime: 100,
    changes: [["root", undefined, p]],
  });
  const expected = reachResponse("root", new Map([["root", decodeEntity("root", 1, [text])]]), {
    recordedPosition: 1,
    validAt: 10,
  });
  for (const rows of [false, true]) {
    const actual = await reader.pullAt(
      "root",
      { recordedPosition: 1, validAt: 10 },
      async () => {
        throw Error("fallback");
      },
      undefined,
      rows,
    );
    assert.equal(actual.route, "replica");
    assert.deepEqual(actual.triples, expected.triples);
    assert(Option.isSome(actual.triples[0]!.validTo));
    assert.equal(canonicalWorld(actual.triples), canonicalWorld(expected.triples));
    assert.deepEqual(observe(actual), observe(result(expected.triples)));
    assert.deepEqual(observe(actual), observe({ ...actual, observation: undefined }));
    assert(Object.isFrozen(actual.triples[0]));
    const restored = restoreReplicaReply(structuredClone(replicaReply(actual)));
    assert.deepEqual(restored.triples, expected.triples);
    assert(Option.isOption(restored.triples[0]!.validTo));
    assert(Object.isFrozen(actual.triples));
  }
});

test("F2 corrected: real judge rejects every changed field, signed zero, nested JSON and field-boundary ambiguity", () => {
  const model = new Model(2000),
    expectations = new ExpectationCache(model);
  const facts = [
    ...ownFacts(0, accountsFor(2000)),
    ...sharedFacts(accountOfSubject(0, accountsFor(2000))),
  ];
  const triples = facts.map((f, i) => ({
    id: `id-${i}`,
    entityId: f.e,
    attribute: f.a,
    value: f.v,
    recordedAt: 100,
    validFrom: 0,
    validTo: Option.none(),
    createdBy: Option.some("writer"),
    entityType: Option.none(),
    schemaVersion: Option.some(1),
    txId: Option.some("tx-1"),
    retractedAt: Option.none(),
    retractTxId: Option.none(),
  }));
  model.bindReceipt(
    facts.map((f) => ({ op: "assert", entityId: f.e, attribute: f.a, value: f.v, validFrom: 0 })),
    { triples, txId: "tx-1", position: 1, instant: 100 },
  );
  const source = fs.readFileSync(new URL("../../../bench/driver.ts", import.meta.url), "utf8");
  const body = source.slice(
    source.indexOf("function judgeRead("),
    source.indexOf("// [DX-R3] Why: one byte per verdict"),
  );
  const judge = new Function(
    "expectations",
    "model",
    "R",
    body.replace("r: ReadRecord", "r") + "; return judgeRead;",
  )(expectations, model, R);
  const record = (rows: any[]) => {
    const o = observe(result(rows));
    return [
      0,
      0,
      100,
      10,
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
    ];
  };
  assert.equal(judge(record(triples)).ok, true);
  const mutations: Record<string, any> = {
    id: "WRONG",
    entityId: "wrong",
    attribute: "wrong",
    value: { type: "string", value: "wrong" },
    position: 9999,
    recordedAt: 101,
    validFrom: -1,
    validTo: Option.some(21),
    createdBy: Option.some("other"),
    entityType: Option.some("Other"),
    schemaVersion: Option.some(2),
    txId: Option.some("other"),
    retractedAt: Option.some(102),
    retractTxId: Option.some("other"),
  };
  for (const [field, value] of Object.entries(mutations)) {
    const changed = [...triples];
    changed[0] = { ...changed[0]!, [field]: value };
    assert.equal(judge(record(changed)).ok, false, field);
  }
  const wrongOption = [...triples];
  wrongOption[0] = { ...wrongOption[0]!, createdBy: { _tag: "Some", value: "writer" } as any };
  assert.equal(
    judge(record(wrongOption)).ok,
    false,
    "plain Option lookalike is not a public Effect Option",
  );
  for (const [left, right] of [
    [-0, 0],
    [{ nested: [-0] }, { nested: [0] }],
  ]) {
    assert.notEqual(
      observe(result([{ ...triples[0], value: left }])).digest,
      observe(result([{ ...triples[0], value: right }])).digest,
    );
  }
  assert.notEqual(
    observe(result([{ entityId: "a\u0001b", attribute: "c" }])).digest,
    observe(result([{ entityId: "a", attribute: "b\u0001c" }])).digest,
  );
});

test("F3 corrected: time-only newest clock falls back before delayed equal-clock journal; later clock closes a regular cut", async () => {
  const first = packed(wire(), 1),
    second = packed(wire("after", 2, 100), 2),
    reader = new ReplicaReader();
  reader.apply({
    reset: true,
    valid: true,
    position: 1,
    recordTime: 100,
    changes: [["root", undefined, first]],
  });
  const gateway = async () => result(decodeEntity("root", 2, [wire("after", 2, 100)]).rows);
  const actual = await reader.pullAt(
    "root",
    { recordedAt: 100, validAt: 10 },
    gateway,
    undefined,
    false,
    1,
  );
  assert.equal(actual.route, "fallback");
  assert.equal(actual.replicaFallbackReason, "non-strict-record-clock");
  assert.equal(canonicalWorld(actual.triples), canonicalWorld((await gateway()).triples));
  reader.apply({
    reset: false,
    valid: true,
    position: 2,
    recordTime: 100,
    changes: [["root", first, second]],
  });
  assert.equal(reader.index.resolve({ recordedAt: 100, validAt: 10 }), undefined);
  const closedReader = new ReplicaReader(
    64 * 1024 ** 2,
    new RecentReads(20_000, 64 * 1024 ** 2, true),
  );
  closedReader.apply({
    reset: true,
    valid: true,
    position: 1,
    recordTime: 100,
    changes: [["root", undefined, first]],
  });
  closedReader.apply({
    reset: false,
    valid: true,
    position: 2,
    recordTime: 101,
    changes: [["root", first, packed(wire("later", 2, 101), 2)]],
  });
  const closed = await closedReader.pullAt("root", { recordedAt: 100, validAt: 10 }, async () => {
    throw Error("unexpected closed-clock fallback");
  });
  assert.equal(closed.route, "replica");
  assert.deepEqual(closed.triples, decodeEntity("root", 1, [wire()]).rows);
  const regular = new RecentReads(20_000, 64 * 1024 ** 2, true);
  regular.apply({ reset: true, valid: true, position: 1, recordTime: 100, changes: [] });
  assert.equal(regular.resolve({ recordedAt: 100, validAt: 10 }), undefined);
  regular.apply({ reset: false, valid: true, position: 2, recordTime: 101, changes: [] });
  assert.equal(regular.resolve({ recordedAt: 100, validAt: 10 }), 1);
  const clone = new RecentReads();
  clone.install(structuredClone(regular.image()));
  assert.equal(clone.resolve({ recordedAt: 100, validAt: 10 }), 1);
  assert.equal(clone.resolve({ recordedAt: 101, validAt: 10 }), undefined);
  clone.apply({ reset: false, valid: true, position: 3, changes: [] });
  assert.equal(clone.resolve({ recordedAt: 100, validAt: 10 }), undefined);
});

test("projection-only fixtures decline the public route while the standalone SweepRow API remains usable", async () => {
  const p = packEntity(1, [
    {
      id: "projection",
      entityId: "root",
      attribute: "value",
      value: { type: "string", value: "x" },
      position: 1,
      validFrom: 0,
    },
  ]);
  const reader = new ReplicaReader();
  reader.apply({
    reset: true,
    valid: true,
    position: 1,
    changes: [["root", undefined, prepareEntity("root", p)]],
  });
  assert.equal(
    reader.index.pull("root", { recordedPosition: 1, validAt: 1 })!.rows[0]!.id,
    "projection",
  );
  const answer = await reader.pullAt("root", { recordedPosition: 1, validAt: 1 }, async () =>
    result([]),
  );
  assert.equal(answer.route, "fallback");
});
