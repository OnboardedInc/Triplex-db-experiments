import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// [Opus W1] Why: the pair's comparison, moved out of v01/study-server.ts unchanged so it can also run on the Mac from a
// campaign's two sealed summaries (the 1B owner-head pair's append summary was refused on the server, 2026-11-24 UTC).
// Rejected: a second hand-written comparison for the Mac that could drift from the server's.
// Mac use: node --no-warnings --experimental-transform-types lab/experiments/EXP-DX1/w1/serial/compare.ts <campaign>
export function retirementComparison(campaign: string, expect: { source: string; creditMode: string }) {
  const arms = ["reference", "append"].map((arm) =>
    JSON.parse(fs.readFileSync(path.join(campaign, arm, "retirement-diagnostic.json"), "utf8")));
  assert(arms.every((arm) => arm.source === expect.source && arm.creditMode === expect.creditMode));
  assert.notEqual(arms[0].attempt, arms[1].attempt);
  assert.notEqual(arms[0].slot, arms[1].slot);
  assert.deepEqual(arms[0].windows.map((x: { tapeSha256: string }) => x.tapeSha256),
    arms[1].windows.map((x: { tapeSha256: string }) => x.tapeSha256));
  assert.equal(arms[0].windows[0].firstCut, arms[1].windows[0].firstCut);
  // [Opus W1] Why: state the migrated-person read cost as treatment over reference for each window, phase and read.
  const ratio = (a?: number | null, b?: number | null) => a && b ? Math.round((a / b) * 1000) / 1000 : null;
  const migratedReadRatios = arms[1].windows.map((w: any, i: number) => {
    const ref = arms[0].windows[i].migratedReads, trt = w.migratedReads;
    if (!ref || !trt) return { rate: w.rate, unavailable: true };
    return { rate: w.rate, ...Object.fromEntries(["loaded", "settled"].map((phase) => [phase, Object.fromEntries(
      ["current", "pinned"].map((kind) => [kind, { p50: ratio(trt[phase][kind].p50Ms, ref[phase][kind].p50Ms),
        p99: ratio(trt[phase][kind].p99Ms, ref[phase][kind].p99Ms) }]))])) };
  });
  // [DX-INT1] Why: late SQL reads per save for loader-edited and untouched people, reference then treatment, per window.
  const ownerGroupReads = arms[1].windows.map((w: any, i: number) => {
    const late = (arm: any) => arm.halves[1].byOwnerGroup ?? {};
    const ref = late(arms[0].windows[i]), trt = late(w);
    return { rate: w.rate, ...Object.fromEntries([...new Set([...Object.keys(ref), ...Object.keys(trt)])].sort().map((g) => [g, {
      saves: [ref[g]?.saves ?? 0, trt[g]?.saves ?? 0],
      sqlReadsPerSave: [ref[g]?.sqlReadsPerSave.mean ?? null, trt[g]?.sqlReadsPerSave.mean ?? null] }])) };
  });
  return { arms, migratedReadRatios, ownerGroupReads };
}

if (import.meta.main) {
  const [campaign] = process.argv.slice(2);
  assert(campaign);
  const input = JSON.parse(fs.readFileSync(path.join(campaign, "input.json"), "utf8"));
  assert(input.retirement && input.pairOption);
  const { arms, migratedReadRatios, ownerGroupReads } = retirementComparison(campaign, { source: input.source, creditMode: input.policy.creditMode });
  fs.writeFileSync(path.join(campaign, "retirement-comparison.json"), JSON.stringify({ source: input.source, age: input.age,
    creditMode: input.policy.creditMode, imagePin: input.imagePin, transferPin: input.transferPin, arms, pairOption: input.pairOption,
    migratedReadRatios, ownerGroupReads, computedOn: "Mac, from the campaign's two summaries" }, null, 2) + "\n", { flag: "wx" });
  console.log("retirement-comparison.json written");
}
