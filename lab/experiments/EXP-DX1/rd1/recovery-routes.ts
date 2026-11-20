import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const bytes = readFileSync(process.argv[2]!);
const run = JSON.parse(bytes.toString());
assert.equal(run.verdictPlanId, "ns-v3/2");
const groups = new Map<string, { cycles: number[]; seconds: number; correct: number; fallbacks: number }>();
for (const p of run.phases.filter((p: any) => p.pool === "recovery")) {
  const stress = run.phases.find((x: any) => x.pool === "L1024" && x.cycle === p.cycle);
  assert(stress && p.stats && stress.stats);
  const key = (stress.stats.routing.fallbackShare ?? 0) < 0.01 ? "under-1-percent-stress-fallback" : "at-least-1-percent-stress-fallback";
  const group = groups.get(key) ?? { cycles: [], seconds: 0, correct: 0, fallbacks: 0 };
  groups.set(key, group);
  group.cycles.push(p.cycle);
  group.seconds += p.stats.windowS;
  group.correct += p.stats.correct;
  group.fallbacks += p.stats.routing.routes.fallback ?? 0;
}
assert.equal([...groups.values()].flatMap(g => g.cycles).length, 18);
console.log(JSON.stringify({ reportSha256: createHash("sha256").update(bytes).digest("hex"),
  diagnostic: "settled 256-reader recovery phases, grouped by preceding 1,024-reader fallback share",
  groups: Object.fromEntries([...groups].map(([key, g]) => [key, { ...g, correctPerS: g.correct / g.seconds, fallbackShare: g.fallbacks / g.correct }])) }, null, 2));
