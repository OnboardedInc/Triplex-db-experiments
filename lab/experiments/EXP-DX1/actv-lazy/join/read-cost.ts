import assert from "node:assert/strict";
import fs from "node:fs";
import { W0, canonical } from "../../../../bench/lib/w0-world.ts";
import { authoredSeed, expectedPolicy } from "./deep-reference.ts";
import { largeRelease, parseShape } from "./large-release.ts";

// [DX-ACT6] Why: a read before settlement evaluates every policy in force for the subject it reads. This prices that on
// the Mac (diagnostic times; counts are exact): per read, the policies evaluated, the trace entries and answer bytes the
// answer carries, and the kernel and serialization time, for 40, 200, 1,000 and 5,000 policies, for a subject that
// owes every form and one that owes none; plus compiling the release (once per release by hash with
// TX2_RELEASE_DOCS=ref, on every read with full documents).
// Usage: node --experimental-transform-types read-cost.ts OUT.json
const out = process.argv[2]!;
assert(out);
const validTime = W0.POPULATION_VALID_TIME,
  basis = { tx: 9, validTime };
const worlds = Array.from({ length: 64 }, (_, i) => expectedPolicy(i, authoredSeed(i, 5)));
const median = (xs: number[]) => xs.toSorted((a, b) => a - b)[Math.floor(xs.length / 2)]!;
const rows: unknown[] = [];
const base = W0.compileRelease(W0.R2.doc);
for (const policies of [0, 40, 200, 1000, 5000]) {
  for (const permille of [1000, 0]) {
    const doc = policies ? largeRelease(W0.R2.doc, parseShape(`forms=${policies},policies=${policies},permille=${permille}`)) : W0.R2.doc;
    const compileUs: number[] = [];
    let rel = base;
    for (let k = 0; k < 5; k++) {
      const t = performance.now();
      rel = W0.compileRelease(doc);
      compileUs.push((performance.now() - t) * 1000);
    }
    const evalUs: number[] = [],
      jsonUs: number[] = [];
    let bytes = 0,
      trace = 0,
      work = 0;
    for (let rep = 0; rep < 3; rep++)
      for (const w of worlds) {
        const t = performance.now();
        const o = W0.evaluateWorld(w, rel, basis);
        const t2 = performance.now();
        assert(!W0.isFailure(o));
        const j = W0.outputJson(o);
        jsonUs.push((performance.now() - t2) * 1000);
        evalUs.push((t2 - t) * 1000);
        if (rep === 0) {
          bytes += Buffer.byteLength(j);
          trace += o.trace.length;
          work += o.workItems.length;
        }
      }
    const row = {
      policies,
      owes: permille === 1000 ? "every form" : "none",
      docBytes: Buffer.byteLength(canonical(doc)),
      compileMsDiagnostic: +(median(compileUs) / 1000).toFixed(2),
      perRead: {
        policiesEvaluated: policies,
        traceEntries: Math.round(trace / worlds.length),
        workItems: Math.round(work / worlds.length),
        answerBytes: Math.round(bytes / worlds.length),
        evaluateUsDiagnostic: Math.round(median(evalUs)),
        serializeUsDiagnostic: Math.round(median(jsonUs)),
      },
    };
    rows.push(row);
    console.log(JSON.stringify(row));
    if (!policies) break;
  }
}
fs.writeFileSync(out, JSON.stringify({ subjects: worlds.length, rows }, null, 2) + "\n");
