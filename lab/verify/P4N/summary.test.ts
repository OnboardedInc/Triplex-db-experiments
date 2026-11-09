// [CX-VP4N] Why: use analytically solvable clustered data to check the nested bootstrap and the probe's lack of influence on CPU.
// Rejected: verifying statistics only by rerunning the same script on retained measurements.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { it, expect } from "vitest";
import { fresh } from "../QH1/helpers.js";
it("rounds are resampled as clusters, twins match, and the probe is never a divisor", () => {
  const dir = fresh();
  fs.mkdirSync(dir, { recursive: true });
  for (let round = 0; round < 2; round++)
    for (const arm of ["ref", "ref@2", "candidate"]) {
      const totalUs = (round ? 300 : 100) * (arm === "candidate" ? 0.5 : 1);
      const probe = { totalUs: round ? 9 : 1 };
      const s = {
        batches: [{ pulls: 100, totalUs }],
        probeBefore: probe,
        probeAfter: probe,
        heavySlotsBefore: [],
        heavySlotsAfter: [],
        loadBefore: [0],
        loadAfter: [0],
        mainUsPerPull: totalUs / 100,
        workersUsPerPull: 0,
        otherUsPerPull: 0,
        p50: 1,
        p99: 2,
        rowsPerPull: 1,
      };
      fs.writeFileSync(
        path.join(dir, `r${round}-${arm}.json`),
        JSON.stringify({ arm, execArgv: [], segments: [s], answerDigests: [{ full: "same" }] }),
      );
    }
  const calculate = (quiet: string) =>
    JSON.parse(
      execFileSync("node", ["lab/experiments/EXP-P4N/g4/summary4.mjs", dir, "ref", quiet], {
        encoding: "utf8",
      }),
    );
  const a = calculate("1"),
    b = calculate("100");
  expect(a.arms.ref.pullsPerCpuSecond).toBe(500000);
  expect(a.arms.ref.bootstrap95.lo).toBe((100 * 1e6) / 300);
  expect(a.arms.ref.bootstrap95.hi).toBe((100 * 1e6) / 100);
  expect(a.paired["ref@2"].bootstrap95OfMeanRatio).toEqual({ lo: 1, median: 1, hi: 1 });
  expect(a.paired.candidate.bootstrap95OfMeanRatio).toEqual({ lo: 0.5, median: 0.5, hi: 0.5 });
  expect(a.arms).toEqual(b.arms);
  expect(a.paired).toEqual(b.paired);
  expect(a.hostPerRound.map((x: any) => x.green)).toEqual([true, false]);
  expect(b.hostPerRound.map((x: any) => x.green)).toEqual([true, true]);
});
