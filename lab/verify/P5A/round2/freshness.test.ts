import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { performance } from "node:perf_hooks";
import { test } from "node:test";
import { memoryComposition } from "../../../bench/lib/memory.ts";
import { seedW0 } from "../../../bench/lib/w0-seed.ts";
import { freezeMemoryG0, fingerprintSweep } from "../../../bench/lib/w0-fingerprint.ts";
import { V_W0, sha256 } from "../../../bench/lib/w0-world.ts";
const raw = path.join("/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VP5A/round2", "freshness-" + randomUUID());
fs.mkdirSync(raw, { recursive: true });
fs.writeFileSync("lab/verify/P5A/round2/freshness-attempt.json", JSON.stringify({ raw }, null, 2));
const scope = randomUUID(), comp = memoryComposition("xtdb", scope);
const seed = await seedW0(comp, 50, path.join(raw, "seed.ndjson"));
execFileSync("python3", ["-I", "lab/oracles/domain/cli.py", "--population", "--rung", "50", "--fingerprint", "--out", path.join(raw, "oracle.json")]);
const expected = { ...JSON.parse(fs.readFileSync(path.join(raw, "oracle.json"), "utf8")).fingerprint, N: 50 };
const input: any = { endpoint: comp.backend.url, scope, basis: { position: seed.basis.tx, validAt: V_W0 }, expected, counts: seed.counts };
input.pin = await freezeMemoryG0(comp, input);
const report: any = { acceptance: false, testSha256: sha256(fs.readFileSync(new URL(import.meta.url))), cases: [] };
for (const kind of ["deadline", "abort"]) {
  test(`gate must refuse ${kind} covering the final count`, async () => {
    const deadlineMs = 5000, controller = new AbortController();
    let calls = 0;
    // [CX-VP5A-R2] Why: the wrapper's last observation is part of freshness; an inner valid digest cannot override cancellation or expired total time. Rejected: injecting wrong content (would mask this lifecycle defect).
    const wrapped = { ...comp, storeCounts: async () => {
      calls++;
      if (kind === "deadline") await new Promise(r => setTimeout(r, deadlineMs + 100));
      if (kind === "abort" && calls === 2) controller.abort(new Error("cancelled during end-count read"));
      return comp.storeCounts();
    } };
    let result: any; const start = performance.now();
    try { result = await fingerprintSweep({ ...input, deadlineMs, signal: controller.signal }, async () => ({ endpoint: input.endpoint, scope, comp: wrapped, close: async () => {} })); }
    catch (e) { result = { refusal: String(e) }; }
    const elapsedMs = performance.now() - start;
    report.cases.push({ kind, deadlineMs, elapsedMs, calls, aborted: controller.signal.aborted, result });
    fs.writeFileSync(path.join(raw, "observations.json"), JSON.stringify(report, null, 2));
    assert.notEqual(result.status, "complete-and-matching", "freshness must refuse before granting");
  });
}
