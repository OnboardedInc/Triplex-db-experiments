import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { guardSeed, validatePreflight } from "./preflight-runner.ts";
const binding = { slot: "slot-a", source: "a".repeat(40), nonce: "attempt-a" };
const proof = {
  binding,
  scope: "act2-preflight-attempt-a",
  subjects: 1000,
  cut: 6,
  windows: [
    { phase: "baseline", position: 3, save: 4, txId: "first" },
    { phase: "sweep", position: 5, save: 6, txId: "second" },
  ],
  elapsedMs: 600,
  oracleSha256: "f".repeat(64),
  sourceInputs: "0".repeat(64),
};
test("large-seed admission requires this attempt and two distinct committed windows within ten minutes", () => {
  validatePreflight(proof, binding);
  for (const invalid of [
    { subjects: 999 },
    { elapsedMs: 600000 },
    { cut: 7 },
    { oracleSha256: "" },
    { windows: [proof.windows[0]] },
    { windows: [proof.windows[0], { ...proof.windows[1], txId: "first" }] },
    { windows: proof.windows.slice().reverse() },
  ])
    assert.throws(() => validatePreflight({ ...proof, ...invalid } as typeof proof, binding));
  for (const other of [{ slot: "other" }, { source: "b".repeat(40) }, { nonce: "prior" }])
    assert.throws(() => validatePreflight(proof, { ...binding, ...other }));
  const dir = mkdtempSync(path.join(tmpdir(), "act2-refuse-"));
  try {
    assert.throws(() => guardSeed(dir, binding, {}), /EEXIST/);
  } finally {
    rmSync(dir, { recursive: true });
  }
});
