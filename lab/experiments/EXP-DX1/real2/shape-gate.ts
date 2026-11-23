import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { loadParams, productionOffers, sessionReport, tapeReport, type Shape } from "../w1/field/production.ts";

// [DX-REAL2] Offline gate for the production-shaped tape (no stack): (1) every server cell's tape report matches
// the production study within the stated tolerances, (2) the tape is a pure function of its inputs, and
// (3) every existing campaign's plan is byte-identical to PREP1 d6e62fbe7's.
const here = (name: string) => fileURLToPath(new URL(name, import.meta.url));
const { params, sha256 } = loadParams(here("production-shape.json"));
const out = process.argv[2];

/** Study targets (request-level saves, all accounts) and the tolerance each tape must meet. */
export const targets = {
  within10s: [0.4, 0.03], within60s: [0.691, 0.03], within5min: [0.83, 0.03], within1h: [0.893, 0.03],
  firstEver: [0.039, 0.015], older: [0.018, 0.01],
  sessionMean: [7.6, 0.6], sessionP50: [3, 0], sessionP90: [20, 3], sessionSingle: [0.33, 0.03],
  peoplePerSave: [0.48, 0.06], firstSinceStartWhole: [0.28, 0.07],
  restartFirstMinute2min: [0.54, 0.12], restartWindow2min: [0.38, 0.08],
  rowsPerSaveMean: [17, 1.5], factsPerRow: [1.2, 0.03],
} as const;
const within = (name: keyof typeof targets, got: number | null) => {
  const [want, tol] = targets[name];
  assert(got !== null && Math.abs(got - want) <= tol + 1e-9, `${name}: ${got} not within ${want} ± ${tol}`);
  return { name, want, tolerance: tol, got };
};

const seconds = 300, quiet = 1050;
const cellsChecked = [];
for (const [shape, rate] of [["R", 235], ["R", 394], ["S", 235], ["S", 394], ["S", 620]] as [Shape, number][]) {
  const band = [235, 394, 620].indexOf(rate);
  const remaining = rate * seconds - quiet;
  const rowTargets = Array.from({ length: 9 }, (_, n) => Math.floor(remaining / 9) + Number(n < remaining % 9));
  const tape = productionOffers(params, shape, band, rowTargets, seconds);
  const again = productionOffers(params, shape, band, rowTargets, seconds);
  assert.equal(createHash("sha256").update(JSON.stringify(tape)).digest("hex"),
    createHash("sha256").update(JSON.stringify(again)).digest("hex"), "the tape is not deterministic");
  const report = tapeReport(tape, seconds, params);
  const n = report.neighbours, g = n.returnGapDeclared;
  const sessions = sessionReport(params, band, rowTargets, seconds);
  const checks = [
    within("within10s", g.within10s), within("within60s", g.within60s), within("within5min", g.within5min),
    within("within1h", g.within1h), within("firstEver", g.firstEver), within("older", g.older),
    within("sessionMean", sessions.sizeMean), within("sessionP50", sessions.sizeP50),
    within("sessionP90", sessions.sizeP90), within("sessionSingle", sessions.singleShare),
    within("peoplePerSave", n.peoplePerSaveMedianMinute), within("firstSinceStartWhole", n.firstSinceStartShareWhole),
    within("restartFirstMinute2min", n.restart.firstMinute.savedInPrevious120s),
    within("restartWindow2min", n.restart.wholeWindow.savedInPrevious120s),
    within("rowsPerSaveMean", n.rowsPerSave.mean), within("factsPerRow", n.facts / n.rows),
  ];
  assert.equal(n.rows, remaining, "rows offered differ from the fixed load");
  assert.equal(n.commits, shape === "R" ? remaining : n.saves);
  assert(n.declaredGapsCheckedInsideWindow > 0.6 * n.saves);
  cellsChecked.push({ shape, rate, band, commits: n.commits, commitsPerSecond: n.commitsPerSecond, saves: n.saves,
    rows: n.rows, facts: n.facts, factsPerCommit: n.factsPerCommit, distinctPeople: n.distinctPeople,
    distinctPeopleFirstMinute: n.distinctPeopleFirstMinute, returnGapDeclared: g, sessions,
    perMinute: n.perMinute, restart: n.restart, checks });
}

// Existing campaigns: the plan bytes PREP1 d6e62fbe7 produced, before this change.
const baseline: Record<string, string> = {
  "rolling": "00cd6c08c6dd8bc12a294f5f55358f6cb9bd6ecac5481242637f40b0cf80517d",
  "rolling DX_PREP1_CACHE32=1": "8739a44b0122bf26a9eec2e84e737158e7059aa5d8f74b5b6f6450eff5a781ef",
  "rolling DX_PREP1_ROLLING_ARM=rolling6": "a6112f3ff6df66bf46d4d0fd277c4fe81f374cd86420bce23b2630b57de78e48",
  "rolling DX_PREP1_FRESH_CREDITS=6": "038c07e1b10141a237570307752fdd370af2538af4277c8c71133654d9a9abfb",
  "scale": "6ebb644622b390873472ffc0e58e462de0e305ecd617ebec630d634db52526ab",
  "ceiling": "e5e83b08827d3a5775fb8281591cb3064ed20dbafddd38a46d1134ce5a842096",
  "tail": "6b7402371bf1fdca0e6350900efeef2fb094d097cc4a2394be12c729613397c8",
  "fair": "754d0957a03dacdeb143ffc9b577f7dd725d0fd66db1dc8f89768f976c6276c5",
  "comparison": "d237a5cf0b281f766b32208e3c94a0c1bd28eda03474ca3b2f56310980f74ea2",
};
const unchanged: Record<string, boolean> = {};
for (const [key, digest] of Object.entries(baseline)) {
  const [campaign, extra] = key.split(" ");
  const env = { ...process.env, DX_PREP1_CAMPAIGN: campaign! };
  for (const name of ["DX_PREP1_CACHE32", "DX_PREP1_ROLLING_ARM", "DX_PREP1_FRESH_CREDITS", "DX_REAL2_SET", "DX_REAL2_PARAMS"])
    delete env[name];
  if (extra) env[extra.split("=")[0]!] = extra.split("=")[1]!;
  const bytes = execFileSync("node", ["--import", "tsx", here("../prep1/server-produce.ts"), "plan"],
    { env, maxBuffer: 1 << 30 });
  unchanged[key] = createHash("sha256").update(bytes).digest("hex") === digest;
  assert(unchanged[key], "plan changed for " + key);
}
const result = { version: "triplex-real2-shape-gate/1", paramsSha256: sha256, targets, cells: cellsChecked, unchanged };
if (out) writeFileSync(out, JSON.stringify(result, null, 1) + "\n", { flag: "wx" });
console.log("REAL2_SHAPE_GATE passed: " + cellsChecked.length + " cells within tolerance, " +
  Object.keys(unchanged).length + " existing plans byte-identical");
