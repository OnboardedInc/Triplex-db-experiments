// [EXP-P5-R4] Why: the K01 backport must reject elapsed CPU work and a changed independent post-scan count. Rejected: asserting digest equality alone (does not test freshness or volume).
import assert from "node:assert/strict";
import { test } from "node:test";
import { performance } from "node:perf_hooks";
import { bounded, readG0, fields, type Reader } from "../lib/g0.ts";
test("shared coordinator refuses CPU completion after its absolute deadline", async () => {
  await assert.rejects(
    bounded(async () => {
      const until = performance.now() + 10;
      while (performance.now() < until) {}
      return "late";
    }, 1),
    /deadline/,
  );
});
test("shared coordinator refuses independent table count changed after scan", async () => {
  const counts = Object.fromEntries(
    Object.keys(fields).map((t) => [
      t,
      ["tx_assertions", "tx_claims", "tx_attempts", "tx_meta"].includes(t) ? 1 : 0,
    ]),
  );
  let reads = 0;
  const reader: Reader = {
    endpoint: "fixture://post-count",
    scopes: async () => [{ scope_key: "seed", position: 1 }],
    count: async (t) => (t === "tx_assertions" && ++reads === 2 ? 2 : counts[t]),
    async *scan(t) {
      for (let i = 0; i < counts[t]; i++) yield Object.fromEntries(fields[t].map((f) => [f, null]));
    },
  };
  await assert.rejects(
    readG0(reader, { scope: "seed", position: 1, world: "N01", counts }),
    /end count changed/,
  );
});
