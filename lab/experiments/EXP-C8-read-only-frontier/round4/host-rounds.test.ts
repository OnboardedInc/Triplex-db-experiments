import { readFileSync, writeFileSync } from "node:fs";
import { it, expect } from "vitest";
import { ruleClosure, memoryEdges } from "../../../../packages/core/src/native/FrontierClosure.ts";
// [EXP-C8-R4] Why: separate CPU closure rounds from the two actual source SELECTs.
// Rejected: describing in-memory predecessor calls as per-round engine queries.
it("records rule rounds over the exact profiled native base rows", async () => {
  const out = "lab/experiments/EXP-C8-read-only-frontier/round4";
  const profile = JSON.parse(readFileSync(`${out}/profile-original.json`, "utf8"));
  const base = profile.res.map((r: string[]) => r.map((v) => JSON.parse(v)) as [string, string]);
  const started = performance.now();
  const result = await ruleClosure({
    base,
    steps: [
      { predecessors: memoryEdges(base.map(([a, b]: [string, string]) => [b, a])), tail: "free" },
    ],
    maxDepth: 100,
    maxPairs: 100000,
  });
  writeFileSync(
    `${out}/host-rounds.json`,
    JSON.stringify(
      { input: base, ...result, ms: performance.now() - started, engineRequestsDuringRounds: 0 },
      null,
      2,
    ) + "\n",
  );
  expect(
    result.pairs
      .filter(([a]) => a === "c8:a")
      .map(([, b]) => b)
      .sort(),
  ).toEqual(["c8:b", "c8:c", "c8:d"]);
});
