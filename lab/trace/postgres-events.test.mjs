import assert from "node:assert/strict";
import test from "node:test";
import { parsePostgresDuration, wallBridge } from "./postgres-events.mjs";

test("only role-labelled duration lines carry SQL timing", () => {
  const line =
    "dxpg|2026-11-20 12:00:00.123 UTC|321|abc.321|19|triplex-tx|LOG:  duration: 2.501 ms";
  assert.deepEqual(parsePostgresDuration(line), {
    backend: 321,
    session: "abc.321",
    seq: 19,
    application: "triplex-tx",
    durationMs: 2.501,
    wallEnd: Date.UTC(2026, 10, 20, 12, 0, 0, 123),
  });
  assert.equal(parsePostgresDuration(line + " SELECT payload"), null);
  assert.equal(parsePostgresDuration(line.replace("triplex-tx", "psql")), null);
});

test("guest wall bridge refuses missing endpoints, clock steps and stale spans", () => {
  const clock = {
    domain: "linux-monotonic",
    bootId: "11223344-abcd-efef-abab-001122334455",
    offsetMs: 100,
  };
  const qualified = wallBridge({
    clock,
    clockAnchors: [
      [1000, 800, 0.01],
      [2000, 1800, 0.02],
      [3000, 2100, 0.03],
      [9000, 8100, 0.02],
    ],
  });
  assert.equal(qualified(999), null);
  assert.equal(qualified(1500).at, 1400);
  assert.equal(qualified(2500), null);
  assert.equal(qualified(6000), null);
  assert.equal(
    wallBridge({
      clock,
      clockAnchors: [
        [1400, 0, 0],
        [1300, 1, 0],
      ],
    })(1350),
    null,
  );
});
