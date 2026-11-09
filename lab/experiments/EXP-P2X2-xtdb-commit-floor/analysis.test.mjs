// @ts-nocheck -- [EXP-CHECKJS-R2] runtime-populated records, option bags, or branch-specific union members; dynamic collections, runtime Buffer-to-JSON coercion, or validated values without static narrowing. Binding errors remain checked by lab/bin/checkjs.mjs.
import test from "node:test";
import assert from "node:assert/strict";
import {
  decision,
  summary,
  metricDiff,
  engineMeans,
  failedRead,
  bindingMatches,
} from "./analysis.mjs";
import { encode, text } from "./wire.mjs";
import { generateTrace, traceDigest } from "./trace.mjs";
test("exact decision thresholds and missing observations", () => {
  assert.equal(decision({ f3: 6, f5: 20, resolve: 7 }), "D2");
  for (const v of [{ f3: 6.0001 }, { f5: 20.0001 }, { resolve: 7.0001 }])
    assert.equal(decision(v), "D1");
  for (const v of [
    {},
    { f3: 6 },
    { f3: NaN, f5: 20, resolve: 7 },
    { f3: null, f5: 20, resolve: 7 },
    { f3: -1, f5: 20, resolve: 7 },
  ])
    assert.equal(decision(v), "NOT RUN");
});
test("statistics reject absent and nonfinite samples", () => {
  assert.throws(() => summary([]));
  assert.throws(() => summary([NaN]));
  assert.equal(summary([1, 2, 3, 4]).p50, 2);
});
test("metric differences reject missing/reset series", () => {
  assert.equal(metricDiff("x_sum 3", "x_sum 5", "x", "_sum"), 2);
  assert.equal(metricDiff("x_sum 5", "x_sum 3", "x", "_sum"), null);
  assert.equal(metricDiff("", "x_sum 3", "x", "_sum"), null);
});
test("wire packets carry parameters, not SQL literals", () => {
  const b = encode({ sql: "SELECT $1", params: [text("payload")] });
  assert.equal(String.fromCharCode(b[0]), "P");
  assert(b.includes(Buffer.from("payload")));
  assert(b.includes(Buffer.from("SELECT $1")));
  const kinds = [];
  for (let i = 0; i < b.length; ) {
    kinds.push(String.fromCharCode(b[i]));
    i += 1 + b.readInt32BE(i + 1);
  }
  assert.deepEqual(kinds, ["P", "B", "D", "E", "S"]);
});
test("frozen trace repeats byte for byte", () => {
  const opts = { seed: "EXP-P2X2-v1", subjects: 10000, durationS: 600 };
  const a = generateTrace(opts);
  assert.equal(traceDigest(a), traceDigest(generateTrace(opts)));
  assert(a.some((e) => e.resend));
  assert(a.some((e) => e.ackLoss));
});

test("a failed read remains a failed observation without accessing result locals", () => {
  const r = failedRead(2, { seq: 7, resend: false }, false, new Error("timeout"));
  assert.equal(r.contentMatches, false);
  assert.equal(r.error.message, "timeout");
  assert.equal(r.seq, 7);
  assert.equal(r.fullActual, undefined);
});

test("binding rejects absent fields, stale samples, restarts, changed config and source", () => {
  const a = {
    container: "a".repeat(64),
    head: "b".repeat(40),
    image: "sha256:" + "c".repeat(64),
    configSha256: "d".repeat(64),
    startedAt: "2026-11-09T00:00:00Z",
    at: "2026-11-09T01:00:01Z",
    owner: { holder: "CX-P2X2", createdAt: "2026-11-09T00:00:00Z" },
    caps: { memory: 3758096384, cpus: 2000000000, cpuset: "4,5" },
    files: { "driver.mjs": "e".repeat(64) },
  };
  const b = { ...structuredClone(a), at: "2026-11-09T01:00:02Z" },
    window = { startedAt: "2026-11-09T01:00:00Z", endedAt: "2026-11-09T01:00:03Z" };
  assert.equal(bindingMatches(a, b, window), true);
  assert.equal(bindingMatches({}, {}, window), false);
  assert.equal(bindingMatches(a, b, {}), false);
  for (const changes of [
    { container: "f".repeat(64) },
    { startedAt: "2026-11-09T00:01:00Z" },
    { at: "2026-11-09T00:59:59Z" },
    { configSha256: "f".repeat(64) },
    { files: {} },
    { files: { "driver.mjs": "f".repeat(64) } },
    { owner: { ...a.owner, holder: "someone-else" } },
  ])
    assert.equal(bindingMatches(a, { ...b, ...changes }, window), false);
});

test("unpopulated counters are unavailable, not a zero-cost native margin", () => {
  const raw = "tx_op_timer_seconds_count 0\ntx_op_timer_seconds_sum 0";
  assert.equal(engineMeans(raw, raw, 150).tx_op_timer_seconds.perCommitMs, null);
  assert.equal(metricDiff('x_sum{n="a"} 2\nx_sum{n="b"} 3', 'x_sum{n="a"} 3', "x", "_sum"), null);
});
