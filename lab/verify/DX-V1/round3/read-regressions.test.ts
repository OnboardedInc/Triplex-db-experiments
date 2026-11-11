import assert from "node:assert/strict";
import { test } from "node:test";
import { Option } from "effect";
import { RecentReads, packEntity } from "../../../../packages/datomic/dist/index.js";
import {
  ReplicaReader,
  restoreReplicaReply,
  replicaReply,
} from "../../../bench/lib/replica-reads.ts";
import { ExpectationCache } from "../../../bench/lib/expectation-cache.ts";
import { observe } from "../../../bench/lib/observe.ts";
import { canonicalRow, canonicalWorld } from "../../../bench/lib/canonical.ts";
import { wire, packed, gatewayRows, result, seeded, judgeFor, record } from "./fixtures.ts";

// [DX-V1-R3] Why: strict fixtures explicitly carry source proof; position-only fixtures keep default admission.
// Rejected: interpreting newly conservative defaults as broken clock eligibility.
test("metadata and interval revisions retain the selected source version, including a retracted row's old tx/clock", async () => {
  const firstTexts = [wire("old", 1, 100, 0, 30)],
    secondTexts = [
      wire("corrected", 2, 200, 5, 10, {
        created_by: "corrector",
        tx_id: "_tx/00000000000000000000000002",
      }),
    ];
  const a = packed(firstTexts),
    b = packed(secondTexts, 2),
    reader = new ReplicaReader();
  reader.apply({
    position: 1,
    reset: true,
    valid: true,
    recordTime: 100,
    changes: [["root", undefined, a]],
  });
  const held = await reader.pullAt("root", { recordedPosition: 1, validAt: 5 }, async () => {
    throw Error("fallback");
  });
  reader.apply({
    position: 2,
    reset: false,
    valid: true,
    recordTime: 200,
    changes: [["root", a, b]],
  });
  for (const p of [1, 2])
    for (const validAt of [0, 5, 9, 10, 29, 30]) {
      const expected = gatewayRows(p === 1 ? firstTexts : secondTexts, p).filter(
        (t) => t.validFrom <= validAt && (Option.isNone(t.validTo) || t.validTo.value > validAt),
      );
      const answer = await reader.pullAt("root", { recordedPosition: p, validAt }, async () => {
        throw Error("fallback");
      });
      assert.deepEqual(answer.triples, expected);
      assert.deepEqual(observe(answer), observe({ ...answer, observation: undefined }));
    }
  reader.apply({
    position: 3,
    reset: false,
    valid: true,
    recordTime: 300,
    changes: [["root", b, packed([], 3, "root", 0)]],
  });
  assert.deepEqual(
    (
      await reader.pullAt("root", { recordedPosition: 3, validAt: 5 }, async () => {
        throw Error("fallback");
      })
    ).triples,
    [],
  );
  assert.deepEqual(held.triples, gatewayRows(firstTexts));
  assert.equal((held.triples[0] as any).recordedAt, 100);
  assert.equal((held.triples[0] as any).txId.value, "_tx/00000000000000000000000001");
});

test("closed-clock eligibility at bootstrap, first following cut, floor, image install and rebuild", () => {
  const index = new RecentReads(2, 100000, true);
  index.apply({ position: 10, reset: true, valid: true, recordTime: 100, changes: [] });
  assert.equal(index.resolve({ recordedAt: 100, validAt: 0 }), undefined);
  index.apply({ position: 11, reset: false, valid: true, recordTime: 101, changes: [] });
  assert.equal(index.resolve({ recordedAt: 100, validAt: 0 }), 10);
  index.apply({ position: 12, reset: false, valid: true, recordTime: 102, changes: [] });
  index.apply({ position: 13, reset: false, valid: true, recordTime: 103, changes: [] });
  assert.equal(index.floor, 11);
  assert.equal(index.resolve({ recordedAt: 100, validAt: 0 }), undefined);
  assert.equal(index.resolve({ recordedAt: 101, validAt: 0 }), 11);
  assert.equal(index.resolve({ recordedAt: 103, validAt: 0 }), undefined);
  const copy = new RecentReads(2, 100000, true);
  copy.install(structuredClone(index.image()));
  assert.equal(copy.resolve({ recordedAt: 101, validAt: 0 }), 11);
  assert.equal(copy.resolve({ recordedAt: 103, validAt: 0 }), undefined);
  copy.apply({ position: 20, reset: true, valid: true, recordTime: NaN, changes: [] });
  copy.apply({ position: 21, reset: false, valid: true, recordTime: 200, changes: [] });
  assert.equal(copy.resolve({ recordedAt: 200, validAt: 0 }), undefined);
  assert.equal(copy.resolve({ recordedPosition: 21, validAt: 0 }), 21);
});

test("canonical field matrix distinguishes missing, undefined, null, Options and all supported value representations", () => {
  const options = [
    Option.none(),
    Option.some(undefined),
    Option.some(null),
    Option.some(0),
    Option.some(-0),
    { _tag: "None" },
    { _tag: "Some", value: 0 },
    {},
  ];
  const rows = [
    {},
    { validTo: undefined },
    { validTo: null },
    ...options.map((validTo) => ({ validTo })),
  ];
  assert.equal(new Set(rows.map(canonicalRow)).size, rows.length);
  const values = [
    0,
    -0,
    "0",
    false,
    null,
    undefined,
    [0],
    [-0],
    { a: 0 },
    { a: -0 },
    { a: undefined },
    {},
    { a: [false] },
  ];
  assert.equal(new Set(values.map((value) => canonicalRow({ value }))).size, values.length);
  const base = gatewayRows([wire()])[0];
  for (const tag of ["Some", "None", "Wrong", undefined]) {
    const restored = restoreReplicaReply({
      ...result([{ ...base, validTo: tag === undefined ? {} : { _tag: tag, value: 7 } }]),
      observation: undefined,
    });
    const expected =
      tag === "None"
        ? Option.none()
        : tag === "Some"
          ? Option.some(7)
          : tag === undefined
            ? {}
            : { _tag: tag, value: 7 };
    assert.equal(
      canonicalRow({ validTo: (restored.triples[0] as any).validTo }),
      canonicalRow({ validTo: expected }),
    );
    if (tag !== "None") assert.notEqual(canonicalWorld(restored.triples), canonicalWorld([base]));
  }
  const restored = restoreReplicaReply(structuredClone(replicaReply(result([base]))));
  assert.deepEqual(restored.triples, [base]);
});

test("two entity versions sharing a revision never share prepared bytes, metadata or digest cache entries", async () => {
  const a = packed([wire("old", 1, 100)], 1, "root", 7),
    b = packed([wire("new", 2, 200)], 2, "root", 7);
  const reader = new ReplicaReader();
  reader.apply({ position: 1, reset: true, valid: true, changes: [["root", undefined, a]] });
  const old = await reader.pullAt("root", { recordedPosition: 1, validAt: 10 }, async () => {
    throw Error("fallback");
  });
  reader.apply({ position: 2, reset: false, valid: true, changes: [["root", a, b]] });
  const next = await reader.pullAt("root", { recordedPosition: 2, validAt: 10 }, async () => {
    throw Error("fallback");
  });
  assert.notEqual(observe(old).digest, observe(next).digest);
  assert.deepEqual(observe(old), observe({ ...old, observation: undefined }));
  assert.deepEqual(observe(next), observe({ ...next, observation: undefined }));
  assert.equal((old.triples[0] as any).recordedAt, 100);
  assert.equal((next.triples[0] as any).recordedAt, 200);
});
