import { expect, it } from "vitest";
import { createHash } from "node:crypto";
import { qualifyIdleRefusal } from "../../../lab/trace/idle-proof.mjs";

// [DX-T1-10] Why: a refusal receipt must reject altered native results, stale attempts and foreign inputs independently.
// Rejected: test only a successful 409 or accept an unchanged logical position as proof of an empty native log.
const input = {
  run: "tx2-dxt1-test",
  slot: "tx2-dxt1-test",
  source: "a".repeat(40),
  scope: "scope",
  createdAt: 2000,
};
const text = JSON.stringify(input),
  manifest = { tag: input.run, slot: input.slot, source: input.source, startedAt: 1000 };
const result = {
  ...input,
  schema: "triplex.idle-refusal.v1",
  requestHash: createHash("sha256").update(text).digest("hex"),
  startedAt: 2100,
  endedAt: 2500,
  beforeT: 42,
  afterT: 42,
  transactions: 0,
  datoms: 0,
  responses: Array.from({ length: 25 }, () => ({ status: 409, code: "CasConflict" })),
};
it("qualifies only actual empty native log windows bound to this proof input", () => {
  expect(qualifyIdleRefusal(text, result, manifest, 3000).datoms).toBe(0);
});
it("rejects writes, unrelated refusals, stale clocks and another source", () => {
  for (const patch of [
    { afterT: 43 },
    { transactions: 1 },
    { datoms: 1 },
    { source: "b".repeat(40) },
    { requestHash: "0".repeat(64) },
    { startedAt: 0 },
    { endedAt: 4001 },
    { responses: [{ status: 409, code: "ClockConflict" }] },
    { responses: result.responses.slice(1) },
  ])
    expect(() => qualifyIdleRefusal(text, { ...result, ...patch }, manifest, 3000)).toThrow();
  expect(() => qualifyIdleRefusal(text, result, manifest, 100000)).toThrow();
});
