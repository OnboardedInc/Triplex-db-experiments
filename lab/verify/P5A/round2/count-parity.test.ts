// [CX-VP5A-R2] Why: compare independent count faults with an otherwise identical row scan. Rejected: inferring count parity only from removing a row.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { performance } from "node:perf_hooks";
import { test } from "node:test";
import { memoryComposition } from "../../../bench/lib/memory.ts";
import { seedW0 } from "../../../bench/lib/w0-seed.ts";
import { freezeMemoryG0, fingerprintSweep, w0Check } from "../../../bench/lib/w0-fingerprint.ts";
import { fields, readG0, admitG0, hash } from "../../../bench/lib/g0.ts";
import { V_W0, sha256 } from "../../../bench/lib/w0-world.ts";

const raw = path.join("/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VP5A/round2", "count-parity-" + randomUUID());
fs.mkdirSync(raw, { recursive: true });
const report: any = { classification: "REVIEW-FIXTURE", acceptance: false,
  source: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  testSha256: sha256(fs.readFileSync(new URL(import.meta.url))), cases: [] };
fs.writeFileSync("lab/verify/P5A/round2/count-parity-attempt.json", JSON.stringify({ raw }, null, 2));
const save = () => fs.writeFileSync(path.join(raw, "observations.json"), JSON.stringify(report, null, 2));
const scope = randomUUID(), comp = memoryComposition("xtdb", scope);
const seed = await seedW0(comp, 50, path.join(raw, "seed.ndjson"));
execFileSync("python3", ["-I", "lab/oracles/domain/cli.py", "--population", "--rung", "50", "--fingerprint", "--out", path.join(raw, "oracle.json")]);
const oracle = JSON.parse(fs.readFileSync(path.join(raw, "oracle.json"), "utf8"));
const input: any = { endpoint: comp.backend.url, scope, basis: { position: seed.basis.tx, validAt: V_W0 },
  expected: { ...oracle.fingerprint, N: 50 }, counts: seed.counts };
const reader = comp.g0Reader!(scope), base: Record<string, any[]> = {};
for (const table of Object.keys(fields)) {
  base[table] = [];
  for await (const row of reader.scan(table, scope, new AbortController().signal)) base[table].push(structuredClone(row));
}
const pin = await freezeMemoryG0(comp, input);
input.pin = pin;
const expected: any = { scope, position: input.basis.position, counts: pin.counts, world: "W0" };
// [CX-VP5A-R2] Why: run the exact original K01 preimages and the integrated coordinator against identical returned rows. Rejected: comparing only names or expected digest strings.
const k01: any = await import("../evidence/k01-1794193488840/g0.js");
assert.equal((await k01.readG0(reader, expected, w0Check(comp, input))).D, pin.D);
assert.equal((await readG0(reader, expected, w0Check(comp, input))).D, pin.D);
report.D = pin.D;
save();

test("P5/current G0/exact K01 agree on unchanged content and all planted mutations", async () => {
  const mutations: [string, (t: Record<string, any[]>) => void][] = [["unchanged", () => {}], ["one count-only discrepancy", () => {}]];
  for (const [name, mutate] of mutations) {
    const tables = structuredClone(base); mutate(tables);
    const candidate = { ...reader, count: async (t: string) => tables[t].length + (name === "one count-only discrepancy" && t === "tx_assertions" ? 1 : 0),
      scan: async function* (t: string) { yield* tables[t]; } };
    const candidateComp = { ...comp, g0Reader: () => candidate };
    const calls = [
      () => fingerprintSweep(input, async () => ({ endpoint: input.endpoint, scope, comp: candidateComp, close: async () => {} })),
      () => admitG0(candidate, pin, expected, w0Check(comp, input)),
      () => k01.admitG0(candidate, pin, expected, w0Check(comp, input)),
    ];
    const results = [];
    for (const call of calls) {
      try { const r = await call(); results.push({ granted: true, status: r.status, D: r.admission?.D ?? r.D }); }
      catch (e) { results.push({ granted: false, error: String(e) }); }
    }
    report.cases.push({ name, rowsSha256: hash(tables), results }); save();
    assert.deepEqual(results.map(r => r.granted), [name === "unchanged", name === "unchanged", name === "unchanged"], name);
  }
  const badCounts = { ...input, counts: { ...input.counts, assertions: input.counts.assertions + 1 } };
  await assert.rejects(fingerprintSweep(badCounts), /count mismatch/);
  report.countMismatchRefused = true; save();
});
