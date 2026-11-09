// [EXP-QH1] Why: source seeding and timing are dependency-ordered; waiting holds no heavy grant.
// Rejected: opening a store while its seed process still owns it.
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
const base = "/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-QH1";
const seed = path.join(base, "baseline-w0-10k/seed-manifest.json");
while (!fs.existsSync(seed)) await new Promise((r) => setTimeout(r, 1000));
const receipt = JSON.parse(fs.readFileSync(seed));
if (receipt.status !== "SEEDED-CONTENT-VERIFIED" || !receipt.buildsStillMatch)
  throw Error("Baseline not content/build verified");
const child = spawn(
  process.execPath,
  [
    "lab/experiments/EXP-QH1/run.mjs",
    "baseline-G0",
    "node",
    "lab/bin/heavy.mjs",
    "--label",
    "CX-QH1-baseline-G0",
    "--",
    "node_modules/.bin/tsx",
    "lab/experiments/EXP-QH1/bench.ts",
    "baseline",
    path.join(base, "baseline-w0-10k/store"),
    path.join(base, "baseline-G0.json"),
    "10000",
  ],
  { stdio: "inherit" },
);
process.exitCode = await new Promise((resolve) => child.on("close", resolve));
