// [EXP-P4N-R2] Why (F3): the brief (4.3 item 2) asks for a quiet reference "established once", fixed before any grade is applied. This records
// one calibration attempt: N probe samples spread over about a minute with the host's load and heavy-slot holders beside each, no pulls and
// no other work in this process. The reference is the 5th percentile of the attempt's samples; `quiet.json` (written by quiet-pick.mjs) names
// the lowest of at least three attempts spaced apart and is committed before the round 2 measurements are graded. A segment is eligible only
// when both of its probes are within +10% of that fixed value. Rejected: the minimum probe found anywhere in a result directory (round 1:
// retrospective, and one arm's lucky probe graded every arm).
// usage: tsx quiet-probe.ts <out.json> [samples=200] [intervalMs=300]
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { makeProbe } from "./probe.ts";
const [out, samplesArg = "200", intervalArg = "300"] = process.argv.slice(2);
if (!out) throw Error("usage: quiet-probe.ts <out.json> [samples] [intervalMs]");
const E = "/Users/sam/Claude/Projects/triplex-db-2/evidence";
const root = path.join(E, "QH1-R3/arms/final");
const store = process.env.P4N_STORE ?? path.join(E, "P4N-R1/store");
const D = createRequire(path.join(root, "packages/qlever/package.json"))("better-sqlite3");
const probeDb = new D(path.join(store, "broker.db"), { readonly: true });
const roots: string[] = probeDb
  .prepare("SELECT name FROM ents WHERE name LIKE 'pl:%' AND instr(name,'/')=0 ORDER BY name")
  .pluck()
  .all();
probeDb.close();
const { probe, fixture, close } = makeProbe(D, store, roots);
const slots = () => {
  try {
    const dir = "/Users/sam/projects/triplex-db-2/lab/locks/heavy";
    return fs
      .readdirSync(dir)
      .filter((n) => /^\d+$/.test(n))
      .map(
        (n) => JSON.parse(fs.readFileSync(path.join(dir, n, "owner.json"), "utf8")).label as string,
      );
  } catch {
    return [] as string[];
  }
};
const samples: { totalUs: number; load1: number; heavyHolders: number }[] = [];
for (let i = 0; i < Number(samplesArg); i++) {
  const p = probe();
  samples.push({
    totalUs: p.totalUs,
    load1: os.loadavg()[0]!,
    heavyHolders: slots().filter((l) => !l.startsWith("P4N-R2-quiet")).length,
  });
  await new Promise((r) => setTimeout(r, Number(intervalArg)));
}
close();
const sorted = samples.map((s) => s.totalUs).sort((a, b) => a - b);
const at = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * (sorted.length - 1)))]!;
fs.writeFileSync(
  out,
  JSON.stringify({
    kind: "quiet-probe-attempt",
    at: new Date().toISOString(),
    node: process.version,
    store,
    fixture,
    samples: samples.length,
    p05Us: at(0.05),
    p25Us: at(0.25),
    medianUs: at(0.5),
    minUs: sorted[0],
    loadRange: [Math.min(...samples.map((s) => s.load1)), Math.max(...samples.map((s) => s.load1))],
    heavyHoldersRange: [
      Math.min(...samples.map((s) => s.heavyHolders)),
      Math.max(...samples.map((s) => s.heavyHolders)),
    ],
    raw: samples,
  }),
);
console.log(JSON.stringify({ p05Us: at(0.05), medianUs: at(0.5), minUs: sorted[0] }));
