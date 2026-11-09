// [EXP-QH1] Why: do not rebuild dist while the baseline process is using its frozen modules.
// Rejected: overlapping builds and timed source variants.
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
const base = "/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-QH1";
let receipt;
while (!receipt) {
  for (const dir of fs.readdirSync(base).filter((d) => d.startsWith("baseline-G0-retry-"))) {
    const f = path.join(base, dir, "receipt.json");
    if (fs.existsSync(f)) receipt = JSON.parse(fs.readFileSync(f));
  }
  if (!receipt) await new Promise((r) => setTimeout(r, 1000));
}
if (receipt.result.code !== 0) throw Error("Baseline G0 failed; no candidate timing");
const run = async (label, command) => {
  const child = spawn(
    process.execPath,
    [
      "lab/experiments/EXP-QH1/run.mjs",
      label,
      "node",
      "lab/bin/heavy.mjs",
      "--label",
      "CX-QH1-" + label,
      "--",
      ...command,
    ],
    { stdio: "inherit" },
  );
  const code = await new Promise((resolve) => child.on("close", resolve));
  if (code !== 0) throw Error(label + " failed");
};
await run("candidate-build-a2", ["node", "lab/experiments/EXP-HS01/build.mjs"]);
await run("fixture-clone", ["node", "lab/experiments/EXP-QH1/migrate-fixture.mjs"]);
await run("candidate-G0-G5", [
  "node_modules/.bin/tsx",
  "lab/experiments/EXP-QH1/bench.ts",
  "candidate",
  path.join(base, "candidate-w0-10k/store"),
  path.join(base, "candidate-G0-G5.json"),
  "10000",
]);
