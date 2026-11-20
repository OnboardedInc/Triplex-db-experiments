import assert from "node:assert/strict";
import { test } from "node:test";
import { timings, verifyTimings } from "./observations.ts";

const o = { offered: 99, ingress: 100, cutoff: 1100, mode: "owed" as const };
const first = { started: 200, headObserved: 201, finished: 210, basis: { tx: 20 } };
const deadline = { started: 1100, headObserved: 1102, finished: 1110, basis: { tx: 20 } };
const raw = { entered: 102, durable: 180, nativeCut: 20, first, deadline, coldDeadline: deadline };

test("timing replay rejects an edited derived field and keeps recipe and physical endpoints separate", () => {
  const observed = { ...raw, ...timings(o, raw) };
  verifyTimings(o, observed);
  assert.equal(observed.ingressToDurableMs, 80);
  assert.equal(observed.changedValuesDurableMs, null);
  assert.throws(() => verifyTimings(o, { ...observed, offeredToDurableMs: 0 }), /Inconsistent/);
});

test("a delayed invocation, delayed native head, or stale cold reader records a miss", () => {
  assert.equal(timings(o, raw).deadlineMiss, false);
  for (const coldDeadline of [
    { ...deadline, started: 2100, headObserved: 2101, finished: 2102 },
    { ...deadline, headObserved: 1160, finished: 1161 },
    { ...deadline, basis: { tx: 19 } },
  ])
    assert.equal(timings(o, { ...raw, coldDeadline }).deadlineMiss, true);
});
