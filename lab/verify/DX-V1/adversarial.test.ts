import assert from "node:assert/strict";
import { test } from "node:test";
import { Option } from "effect";
import { packEntity } from "../../../packages/datomic/dist/index.js";
import {
  ReplicaReader,
  prepareEntity,
  replicaReply,
  restoreReplicaReply,
} from "../../bench/lib/replica-reads.ts";
import { observe } from "../../bench/lib/observe.ts";
import { canonicalRow, canonicalWorld } from "../../bench/lib/canonical.ts";
import { wire, packed, gatewayRows, result, seeded, judgeFor, record } from "./round2/fixtures.ts";

// [DX-V1-R2] Why: assert only the repaired promises; the removed-defect characterizations remain historical.
// Rejected: requiring the old wrong answer before checking the corrected answer.
test("F1 claim: both local modes return complete gateway Triples; projection-only data declines", async () => {
  const texts = [wire("before", 1, 100, 0, 20)],
    reader = new ReplicaReader();
  reader.apply({
    position: 1,
    reset: true,
    valid: true,
    recordTime: 100,
    changes: [["root", undefined, packed(texts)]],
  });
  const expected = gatewayRows(texts);
  for (const rows of [false, true]) {
    const actual = await reader.pullAt(
      "root",
      { recordedPosition: 1, validAt: 10 },
      async () => {
        throw Error("unexpected fallback");
      },
      undefined,
      rows,
    );
    assert.equal(actual.route, "replica");
    assert.deepEqual(actual.triples, expected);
    for (const key of [
      "validTo",
      "createdBy",
      "entityType",
      "schemaVersion",
      "txId",
      "retractedAt",
      "retractTxId",
    ])
      assert(Option.isOption((actual.triples[0] as any)[key]));
    assert.deepEqual(observe(actual), observe({ ...actual, observation: undefined }));
    const restored = restoreReplicaReply(structuredClone(replicaReply(actual)));
    assert.deepEqual(restored.triples, expected);
    assert.equal(canonicalWorld(restored.triples), canonicalWorld(expected));
  }
  const projection = new ReplicaReader();
  projection.apply({
    position: 1,
    reset: true,
    valid: true,
    changes: [
      [
        "root",
        undefined,
        prepareEntity(
          "root",
          packEntity(1, [
            {
              id: "projection",
              entityId: "root",
              attribute: ":test/value",
              value: { type: "string", value: "projection" },
              position: 1,
              validFrom: 0,
            },
          ]),
        ),
      ],
    ],
  });
  for (const rows of [false, true]) {
    let calls = 0;
    const actual = await projection.pullAt(
      "root",
      { recordedPosition: 1, validAt: 10 },
      async () => {
        calls++;
        return result(expected);
      },
      undefined,
      rows,
    );
    assert.equal(actual.route, "fallback");
    assert.equal(calls, 1);
    assert.deepEqual(actual.triples, expected);
  }
});

test("F2 claim: unchanged judge rejects altered public fields, missing/undefined fields, signed zero and wrong Option tags", () => {
  const { model, rows } = seeded(),
    judge = judgeFor(model);
  assert.equal(judge(record(rows)).ok, true);
  const changes: any = {
    id: "wrong",
    entityId: "wrong",
    attribute: "wrong",
    value: { type: "string", value: "wrong" },
    recordedAt: 101,
    validFrom: -1,
    validTo: Option.some(20),
    createdBy: Option.some("other"),
    entityType: Option.some("Other"),
    schemaVersion: Option.some(2),
    txId: Option.some("other"),
    retractedAt: Option.some(200),
    retractTxId: Option.some("other"),
    extra: true,
  };
  let rejected = 0;
  for (const [key, value] of Object.entries(changes)) {
    assert.equal(judge(record([{ ...rows[0], [key]: value }, ...rows.slice(1)])).ok, false, key);
    rejected++;
  }
  for (const key of Object.keys(rows[0])) {
    const omitted = { ...rows[0] };
    delete omitted[key];
    assert.equal(judge(record([omitted, ...rows.slice(1)])).ok, false, "missing " + key);
    assert.equal(
      judge(record([{ ...rows[0], [key]: undefined }, ...rows.slice(1)])).ok,
      false,
      "undefined " + key,
    );
    rejected += 2;
  }
  for (const option of [
    { _tag: "None" },
    {},
    { _tag: "Some", value: undefined },
    { _tag: "Wrong" },
  ]) {
    assert.equal(judge(record([{ ...rows[0], entityType: option }, ...rows.slice(1)])).ok, false);
    rejected++;
  }
  for (const [left, right] of [
    [-0, 0],
    [{ nested: [-0] }, { nested: [0] }],
  ]) {
    assert.notEqual(canonicalRow({ value: left }), canonicalRow({ value: right }));
  }
  assert.equal(judge(record(rows, 100, 10, "Timeout")).ok, false);
  console.log(JSON.stringify({ claim: "F2", rejectedMutations: rejected }));
});

test("F3 claim: newest time-only clock declines; next greater applied journal closes the prior cut", async () => {
  const firstTexts = [wire("before", 1, 100)],
    first = packed(firstTexts),
    reader = new ReplicaReader();
  reader.apply({
    position: 1,
    reset: true,
    valid: true,
    recordTime: 100,
    changes: [["root", undefined, first]],
  });
  const equalTexts = [wire("after", 2, 100)],
    equalExpected = gatewayRows(equalTexts, 2);
  const open = await reader.pullAt("root", { recordedAt: 100, validAt: 10 }, async () =>
    result(equalExpected),
  );
  assert.equal(open.route, "fallback");
  assert.equal(open.replicaFallbackReason, "open-record-clock");
  assert.deepEqual(open.triples, equalExpected);
  reader.apply({
    position: 2,
    reset: false,
    valid: true,
    recordTime: 100,
    changes: [["root", first, packed(equalTexts, 2)]],
  });
  assert.equal(reader.index.resolve({ recordedAt: 100, validAt: 10 }), undefined);
  const regular = new ReplicaReader();
  regular.apply({
    position: 1,
    reset: true,
    valid: true,
    recordTime: 100,
    changes: [["root", undefined, first]],
  });
  regular.apply({ position: 2, reset: false, valid: true, recordTime: 101, changes: [] });
  const closed = await regular.pullAt("root", { recordedAt: 100, validAt: 10 }, async () => {
    throw Error("unexpected fallback");
  });
  assert.equal(closed.route, "replica");
  assert.deepEqual(closed.triples, gatewayRows(firstTexts));
  assert.equal(regular.index.resolve({ recordedAt: 101, validAt: 10 }), undefined);
});
