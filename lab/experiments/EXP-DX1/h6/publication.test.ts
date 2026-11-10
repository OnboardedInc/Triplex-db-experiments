import assert from "node:assert/strict";
import { test } from "node:test";
import { encodePublicationEvidence } from "../../../bench/lib/w0-outbox.ts";
// [DX-H6] Why: reproduce the real post-ACK failure using fractional timings and integer business sequences.
// Rejected: allowing floats in W0's canonical encoder to make telemetry serialization succeed.
test("publication evidence preserves integer deliveries and excludes fractional telemetry", () => {
  const actual = {
    deliveries: [{ id: "work", seq: 1n, payload: '{"amount":1650}' }],
    retry: false,
    timing: { buildOutboxMs: 28.843 },
  };
  const encoded = encodePublicationEvidence(actual);
  assert.equal(
    encoded,
    '{"deliveries":[{"id":"work","payload":"{\\"amount\\":1650}","seq":1}],"retry":false}',
  );
  assert.ok(!encoded.includes("timing"));
  assert.throws(
    () => encodePublicationEvidence({ deliveries: [{ seq: 1.5 }], retry: false }),
    /non-integer/,
  );
});
