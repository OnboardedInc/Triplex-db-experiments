import fs from "node:fs";
import { createHash } from "node:crypto";
import { generateTrace } from "./lib/trace.ts";
import { checkV3Trace, assertRequiredPlanCounts } from "./lib/verdict-plan.ts";
import { nsPlan } from "./lib/phases.ts";

// [DX-T1-12] Why: verify the frozen offered cohorts before any database or measured container exists.
// Rejected: discover a sparse band after hours of reads, or modify its rate to reach the minimum.
const result = {
  ...checkV3Trace(generateTrace({ seed: "ns-v2", subjects: 10000, durationS: 7200 })),
  phases: nsPlan("v3"),
  sourceFiles: Object.fromEntries(
    ["trace.ts", "phases.ts", "verdict-plan.ts"].map((n) => [
      n,
      createHash("sha256")
        .update(fs.readFileSync(new URL(`./lib/${n}`, import.meta.url)))
        .digest("hex"),
    ]),
  ),
};
const text = JSON.stringify(result, null, 2) + "\n";
const secondsOnly = process.argv.includes("--seconds");
const output = process.argv.slice(2).find((a) => !a.startsWith("--"));
if (secondsOnly) process.stdout.write(result.offeredSeconds + "\n");
else if (output) fs.writeFileSync(output, text, { flag: "wx" });
else process.stdout.write(text);
if (process.argv.includes("--strict")) assertRequiredPlanCounts(result);
