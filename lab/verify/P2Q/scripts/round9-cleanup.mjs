// [CX-VP2Q-4-R9] Why: observe only exact worktree-owned fixtures and this review's job labels after execution ends.
// Rejected: broad process cleanup (other agents and resident engines are outside this review's ownership).
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
const root = process.cwd(), started = Date.now();
const lines = execFileSync("ps", ["-axo", "pid,ppid,command"], { encoding: "utf8" }).split("\n");
const fixtures = lines.filter(line => line.includes(root) && (line.includes("packages/qlever/test/fixtures/lock-holder.ts") || line.includes("lab/verify/P2Q/scripts/lock-holder.ts")));
const jobs = lines.filter(line => line.includes("--label CX-VP2Q-4-R9-") && !line.includes("round9-cleanup.mjs"));
const productDrift = execFileSync("git", ["diff", "36dacc2e", "--", "packages/core/src", "packages/qlever/src"], { encoding: "utf8" });
const free = fs.statfsSync(root);
fs.writeFileSync(path.join(root, "lab/verify/P2Q/evidence-round9/final-cleanup.json"), JSON.stringify({ started, finished: Date.now(), root,
  target: execFileSync("git", ["rev-parse", "36dacc2e"], { encoding: "utf8" }).trim(), fixtures, jobs, productDrift,
  freeBytes: free.bavail * free.bsize, engineLifecycle: "none", processCleanup: "none", heavySlotClaim: "none (read-only observation)" }, null, 2) + "\n", { flag: "wx" });
if (fixtures.length || jobs.length || productDrift) throw new Error("unexpected owned process or product drift; inspect observation");
console.log(JSON.stringify({ fixtures: fixtures.length, jobs: jobs.length, productDrift: false }));
