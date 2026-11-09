import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { matchW0Live } from "../lib/w0-live.ts";

test("paired traffic uses identical offer-time prefix and retains ACKs after its end", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dxh2-pair-"));
  const baseline = {
    raw: path.join(dir, "baseline.ndjson"),
    startedAtMs: 1000,
    windowMs: 100,
    seed: "same",
    offsetS: 0,
    generatorTraceSha256: "same",
  };
  const sweep = {
    raw: path.join(dir, "sweep.ndjson"),
    startedAtMs: 2000,
    windowMs: 200,
    seed: "same",
    offsetS: 0,
    generatorTraceSha256: "same",
  };
  fs.writeFileSync(
    baseline.raw,
    [
      { kind: "read", started: 1010, ms: 5 },
      { kind: "commit", scheduled: 1050, started: 1200, ms: 10 },
    ]
      .map((r) => JSON.stringify(r))
      .join("\n"),
  );
  fs.writeFileSync(
    sweep.raw,
    [
      { kind: "read", started: 2010, ms: 10 },
      { kind: "read", started: 2150, ms: 999 },
      { kind: "commit", scheduled: 2050, started: 2250, ms: 20 },
      { kind: "commit", scheduled: 2150, started: 2250, ms: 999 },
    ]
      .map((r) => JSON.stringify(r))
      .join("\n"),
  );
  assert.throws(() => matchW0Live(baseline, { ...sweep, seed: "different" }), /binding mismatch/);
  const result = matchW0Live(baseline, sweep);
  assert.equal(result.matchedWindowMs, 100);
  assert.equal(result.fullSweepCovered, false);
  assert.equal(result.read.p99Ratio, 2);
  assert.equal(result.commit.p99Ratio, 2);
  assert.equal(result.commit.sweep.count, 1);
  assert.equal(result.classification, "DIAGNOSTIC");
});
