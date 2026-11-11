import assert from "node:assert/strict";
import { test } from "node:test";
import { Option } from "effect";
import { Model } from "../../../bench/lib/model.ts";
import { ExpectationCache } from "../../../bench/lib/expectation-cache.ts";
import { ids } from "../../../bench/lib/world.ts";
import { observe } from "../../../bench/lib/observe.ts";
import { result } from "./fixtures.ts";

// [DX-V1-R3] Why: independently enumerate visible receipt rows, including changing shared/cyclic closures and late ACKs.
// Rejected: comparing the expectation cache only to the same model it wraps.
test("cache cuts match an independent closure walk before and after a late receipt", () => {
  const model = new Model(2000),
    cache = new ExpectationCache(model);
  const versions = new Map<string, { row: any; from: number; until: number }>();
  const root = ids.placement(0),
    other = ids.placement(1);
  const a = (
    id: string,
    e: string,
    type: string,
    value: any,
    from: number,
    to: number,
    attribute = "v",
  ) => ({
    id,
    op: "assert",
    entityId: e,
    attribute,
    value: { type, value },
    validFrom: from,
    validTo: to,
  });
  const receipt = (position: number, instant: number, ops: any[]) => {
    const assertions = ops.filter((o) => o.op === "assert");
    const rows = assertions.map((o) => ({
      id: o.id,
      entityId: o.entityId,
      attribute: o.attribute,
      value: o.value,
      recordedAt: instant,
      validFrom: o.validFrom,
      validTo: Option.some(o.validTo),
      createdBy: Option.some("writer"),
      entityType: Option.none(),
      schemaVersion: Option.some(1),
      txId: Option.some(`tx${position}`),
      retractedAt: Option.none(),
      retractTxId: Option.none(),
    }));
    model.bindReceipt(ops, { position, instant, txId: `tx${position}`, triples: rows }, "writer");
    for (const row of rows) versions.set(row.id, { row, from: instant, until: Infinity });
    for (const op of ops) if (op.op === "retract") versions.get(op.id)!.until = instant;
  };
  receipt(1, 100, [
    a("s0", root, "integer", "0", -50, 50, ":placement/stamp"),
    a("s1", other, "integer", "0", -50, 50, ":placement/stamp"),
    a("rx", root, "ref", "x", 0, 20),
    a("ox", other, "ref", "x", 10, 25),
    a("xy", "x", "ref", "y", -10, 10),
    a("xa", "x", "string", "A", 5, 30),
    a("yr", "y", "ref", root, 8, 12),
    a("yb", "y", "string", "B", -15, 13),
  ]);
  receipt(3, 300, [
    { op: "retract", id: "rx" },
    { op: "retract", id: "xa" },
    a("rz", root, "ref", "z", 15, 35),
    a("zc", "z", "string", "C", 16, 18),
  ]);
  let comparisons = 0;
  const verify = () => {
    for (const subject of [1, 0, 0])
      for (const r of [99, 100, 101, 199, 200, 201, 299, 300, 301])
        for (const v of [
          -51, -50, -15, -10, -1, -0, 0, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
          21, 24, 25, 29, 30, 34, 35, 49, 50,
        ]) {
          const seen = new Set([ids.placement(subject)]),
            rows: any[] = [];
          for (const e of seen)
            for (const { row, from, until } of versions.values())
              if (
                row.entityId === e &&
                from <= r &&
                until > r &&
                row.validFrom <= v &&
                row.validTo.value > v
              ) {
                rows.push(row);
                if (row.value.type === "ref") seen.add(row.value.value);
              }
          const exact = observe(result(rows)),
            actual = cache.expected(subject, r, v);
          assert.deepEqual(
            { digest: actual.digest, facts: actual.facts, stamp: actual.stamp },
            { digest: exact.digest, facts: exact.facts, stamp: exact.stamp },
            `${subject}/${r}/${v}`,
          );
          assert.deepEqual(actual, model.expected(subject, r, v));
          comparisons++;
        }
  };
  verify();
  const before = cache.expected(0, 200, 9).digest;
  receipt(2, 200, [{ op: "retract", id: "yb" }, a("xz", "x", "ref", "z", 7, 11)]);
  verify();
  assert.notEqual(cache.expected(0, 200, 9).digest, before);
  assert(cache.diagnostics.hits > 0);
  console.log(
    JSON.stringify({
      comparisons,
      diagnostics: cache.diagnostics,
      receiptVersion: model.receiptVersion,
    }),
  );
});
