// [CX-VP2Q-4-R8] Why: retain final product drift and exact worktree-owned fixture process observations.
// Rejected: broad process cleanup (other agents and resident engines are outside this review's ownership).
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
const root = process.cwd();
const processes = execFileSync("ps", ["-axo", "pid,ppid,command"], { encoding: "utf8" });
const fixtureProcesses = processes.split("\n").filter(line => line.includes(root) &&
  (line.includes("packages/qlever/test/fixtures/lock-holder.ts") || line.includes("lab/verify/P2Q/scripts/lock-holder.ts")));
const productDrift = execFileSync("git", ["diff", "d14992e", "--", "packages/core/src", "packages/qlever/src", "lab/experiments/EXP-P2Q-qlever-log-broker/bench"], { encoding: "utf8" });
const free = fs.statfsSync(root);
const result = { at: new Date().toISOString(), fixtureProcesses, productDrift, freeBytes: free.bavail * free.bsize,
  engineLifecycle: "none", processCleanup: "none", retainedState: "lab/verify/P2Q/state-round8/",
  retainedEarlierAttempts: true };
fs.writeFileSync(path.join(root, "lab/verify/P2Q/evidence-round8/final-cleanup.json"), JSON.stringify(result, null, 2) + "\n");
if (fixtureProcesses.length || productDrift) throw new Error("Unexpected fixture process or product drift; inspect evidence");
console.log(JSON.stringify({ fixtureProcesses: fixtureProcesses.length, productDrift: false, freeBytes: result.freeBytes }));
