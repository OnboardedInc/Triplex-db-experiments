import fs from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import assert from "node:assert/strict";
import { test } from "node:test";
import { Option } from "effect";
import { DatomicClient, RecentReads } from "../../../../packages/datomic/dist/index.js";
import { ReplicaReader } from "../../../bench/lib/replica-reads.ts";
import { ExpectationCache } from "../../../bench/lib/expectation-cache.ts";
import { Model } from "../../../bench/lib/model.ts";
import { canonicalWorld, typed } from "../../../bench/lib/canonical.ts";
import { observe, R } from "../../../bench/lib/observe.ts";
import { rawLocalCoverage } from "../../../bench/lib/raw-local-coverage.ts";
import { ids } from "../../../bench/lib/world.ts";
import {
  wire,
  packed,
  gatewayRows,
  result,
  seeded,
  judgeFor,
  record,
} from "../../../verify/DX-V1/round2/fixtures.ts";

// [DX-R3] Why: assert corrected outcomes directly, without the review's unconditional defect characterizations.
// Rejected: weakening or editing the independent reviewer's counterexamples.
test("R2-A: cached and uncached judges reject expired rows and accept the exact smaller world", () => {
  const { model, rows } = seeded((row, i) =>
    i === 3 ? { ...row, validTo: Option.some(20) } : row,
  );
  const cache = new ExpectationCache(model),
    judge = judgeFor(model, cache);
  assert.equal(judge(record(rows, 100, 10)).ok, true);
  assert.equal(judge(record(rows, 100, 20)).ok, false);
  assert.equal(
    judge(
      record(
        rows.filter((_, i) => i !== 3),
        100,
        20,
      ),
    ).ok,
    true,
  );
  assert.deepEqual(cache.expected(0, 100, 20), model.expected(0, 100, 20));
});

test("R2-A: full reachable seed/shared, reference, validTo and retraction boundaries give exact counts and stamps", () => {
  const model = new Model(2000),
    cache = new ExpectationCache(model),
    root = ids.placement(0);
  const ops = [
    {
      entityId: root,
      attribute: ":placement/stamp",
      value: { type: "integer", value: "0" },
      validFrom: 0,
      validTo: 30,
    },
    {
      entityId: root,
      attribute: "ref",
      value: { type: "ref", value: "shared" },
      validFrom: 10,
      validTo: 20,
    },
    {
      entityId: "shared",
      attribute: "data",
      value: { type: "string", value: "x" },
      validFrom: 15,
      validTo: 18,
    },
  ].map((x) => ({ ...x, op: "assert" }));
  const rows = ops.map((o, i) => ({
    id: `f${i}`,
    entityId: o.entityId,
    attribute: o.attribute,
    value: o.value,
    recordedAt: 100,
    validFrom: o.validFrom,
    validTo: Option.some(o.validTo),
    createdBy: Option.none(),
    entityType: Option.none(),
    schemaVersion: Option.some(1),
    txId: Option.some("tx1"),
    retractedAt: Option.none(),
    retractTxId: Option.none(),
  }));
  model.bindReceipt(ops, { position: 1, instant: 100, txId: "tx1", triples: rows });
  for (let stage = 0; stage < 2; stage++) {
    if (stage)
      model.bindReceipt([{ op: "retract", id: "f2" }], {
        position: 2,
        instant: 200,
        txId: "tx2",
        triples: [],
      });
    for (const r of [99, 100, 101, 199, 200, 201])
      for (const v of [-1, 0, 9, 10, 14, 15, 17, 18, 19, 20, 29, 30]) {
        const seen = new Set([root]),
          visible: any[] = [];
        for (const entity of seen)
          for (const t of rows)
            if (
              t.entityId === entity &&
              r >= 100 &&
              !(stage && t.id === "f2" && r >= 200) &&
              t.validFrom <= v &&
              Option.isSome(t.validTo) &&
              t.validTo.value > v
            ) {
              visible.push(t);
              if (t.value.type === "ref") seen.add(t.value.value);
            }
        const observed = observe(result(visible)),
          expected = cache.expected(0, r, v);
        assert.equal(expected.digest, observed.digest, `${stage}/${r}/${v}`);
        assert.equal(expected.facts, observed.facts);
        assert.equal(expected.stamp, observed.stamp);
        assert.deepEqual(expected, model.expected(0, r, v));
      }
  }
  assert(cache.diagnostics.hits > 0);
});

test("R2-C: unsupported prototypes/properties are rejected rather than certified as JSON", () => {
  const { model, rows } = seeded((row, i) =>
    i === 3 ? { ...row, value: { type: "json", value: {} } } : row,
  );
  assert.equal(judgeFor(model)(record(rows)).ok, true);
  const sparse = Array(1),
    hidden = Object.defineProperty({}, "x", { value: 1 }),
    accessor = Object.defineProperty({}, "x", {
      enumerable: true,
      get() {
        throw Error("must not invoke");
      },
    });
  for (const value of [
    new Date(0),
    new Map(),
    new Set(),
    new (class X {})(),
    Object.create({}),
    Object.setPrototypeOf([], null),
    sparse,
    hidden,
    accessor,
    { [Symbol("x")]: 1 },
  ]) {
    assert.throws(() => typed(value), /Unsupported canonical/);
    const bad = rows.map((row, i) => (i === 3 ? { ...row, value: { type: "json", value } } : row));
    assert.throws(() => record(bad), (e: any) => e._tag === "CanonicalValueError");
    const invalid = record(rows); invalid[12] = "CanonicalValueError";
    assert.deepEqual(judgeFor(model)(invalid), { ok: false, kind: "invalid-value" });
  }
  assert.doesNotThrow(() => typed({ nested: [Object.create(null), -0, null] }));
});

test("R2-B: non-strict scopes never admit a time-only cut, including before a regressing journal arrives", async () => {
  const initial = packed([wire("old", 1, 100)]),
    reader = new ReplicaReader();
  reader.apply({
    position: 1,
    reset: true,
    valid: true,
    recordTime: 100,
    changes: [["root", undefined, initial]],
  });
  reader.apply({ position: 2, reset: false, valid: true, recordTime: 101, changes: [] });
  const expected = gatewayRows([wire("old", 1, 100), wire("late", 3, 100)], 3);
  const answer = await reader.pullAt("root", { recordedAt: 100, validAt: 10 }, async () =>
    result(expected),
  );
  assert.equal(answer.route, "fallback");
  assert.equal(canonicalWorld(answer.triples), canonicalWorld(expected));
  assert.equal(reader.index.resolve({ recordedAt: 100, validAt: 10 }), undefined);
  assert.equal(reader.index.resolve({ recordedPosition: 1, validAt: 10 }), 1);
  assert.equal(reader.index.resolve({ validAt: 10 }), 2);
  const clone = new RecentReads();
  clone.install(structuredClone(reader.index.image()));
  assert.equal(clone.resolve({ recordedAt: 100, validAt: 10 }), undefined);
});

test("strict scope policy and closed-cut proof survive shared index images; old images default non-strict", () => {
  const strict = new RecentReads(20_000, 100000, true);
  strict.apply({ position: 1, reset: true, valid: true, recordTime: 100, changes: [] });
  assert.equal(strict.resolve({ recordedAt: 100, validAt: 0 }), undefined);
  strict.apply({ position: 2, reset: false, valid: true, recordTime: 101, changes: [] });
  assert.equal(strict.resolve({ recordedAt: 100, validAt: 0 }), 1);
  const clone = new RecentReads();
  clone.install(structuredClone(strict.image()));
  assert.equal(clone.resolve({ recordedAt: 100, validAt: 0 }), 1);
  const image = strict.image();
  delete (image as any).strictRecordClocks;
  clone.install(image);
  assert.equal(clone.resolve({ recordedAt: 100, validAt: 0 }), undefined);
});

test("raw local coverage requires matching full payloads from every reader ladder level", () => {
  const levels = [
    { idx: 0, name: "L1", readers: 1 },
    { idx: 1, name: "L4", readers: 4 },
    { idx: 2, name: "p4", readers: 2 },
  ];
  const sample = (phase: number, route = "replica", gatewayCanonical = "bytes") => ({
    phase,
    route,
    fullCanonical: "bytes",
    gatewayCanonical,
  });
  assert.deepEqual(
    rawLocalCoverage(levels, [sample(0), sample(1, "fallback")]).map((x) => x.ok),
    [true, false],
  );
  assert.deepEqual(
    rawLocalCoverage(levels, [sample(0), sample(1)]).map((x) => x.compared),
    [1, 1],
  );
  assert.equal(rawLocalCoverage(levels, [sample(0), sample(1, "replica", "WRONG")])[1]!.ok, false);
});

// [DX-R3] Why: reopening an old seed must report its actual policy rather than echo the requested upgrade.
// Rejected: treating a strict create request as proof of source enforcement.
test("scope creation explicitly requests strict clocks while default and reopened scopes keep their policy", async () => {
  const client = new DatomicClient("http://127.0.0.1:1"), bodies: any[] = [];
  client.request = async <T>(_method: any, route: string, body: any): Promise<T> => {
    assert.equal(route, "/v1/db/create"); bodies.push(body);
    return { db: "existing", created: false, schemaHash: "fixture", strictRecordClocks: false } as T;
  };
  try {
    assert.equal((await client.create("scope", "lean", true)).strictRecordClocks, false);
    await client.create("default");
    assert.deepEqual(bodies, [
      { scope: "scope", layout: "lean", strictRecordClocks: true },
      { scope: "default", layout: "legacy", strictRecordClocks: false },
    ]);
  } finally { client.close(); }
});

// [DX-R3] Why: domain violations must also survive the compact verdict array used by the full ladder.
// Rejected: testing judgeRead alone (an unregistered kind becomes an invalid byte index).
test("invalid returned values survive the actual driver's compact verdict pipeline", () => {
  const { model, rows } = seeded(), input = record(rows); input[12] = "CanonicalValueError";
  const source = fs.readFileSync(new URL("../../../bench/driver.ts", import.meta.url), "utf8");
  const body = source.slice(source.indexOf("function judgeRead("), source.indexOf("const bandOf ="));
  const run = new Function("expectations", "model", "R", "records", "let judgedReadCount = 0;\n" +
    stripTypeScriptTypes(body) + "; const indices = readVerdicts(); return { count: judgedReadCount, verdict: VERDICTS[indices[0]] };");
  assert.deepEqual(run(new ExpectationCache(model), model, R, [input]), {
    count: 1, verdict: { ok: false, kind: "invalid-value" },
  });
});
