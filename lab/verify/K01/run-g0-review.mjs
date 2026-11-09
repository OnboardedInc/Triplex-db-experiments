// [EXP-K01-VK01-R6] Why: preserve source-bound offline receipts after retiring the process-gate suites. Rejected: adopting historical passes for the new granting gate.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
const root = path.resolve(import.meta.dirname, "../../.."),
  out = path.join(root, "lab/verify/K01/evidence/review-round6");
fs.mkdirSync(out, { recursive: true });
if (fs.existsSync(path.join(out, "g0-review-run.json")))
  throw Error("retain the prior attempt before rerunning");
const disk = fs.statfsSync(root);
if (disk.bavail * disk.bsize < 5 * 1024 ** 3) throw Error("disk floor");
const files = [
  "lab/verify/K01/run-g0-review.mjs",
  "lab/bench/clone-check.ts",
  "lab/bin/test/lab.test.mjs",
  "lab/bench/test/bench.test.ts",
  "lab/bench/lib/g0.ts",
  "lab/bench/lib/g0-xtdb.ts",
  "lab/bench/lib/bulk.ts",
  "lab/bench/driver.ts",
  "lab/bench/xtdb-seed.ts",
  "lab/bin/engine.mjs",
  "lab/bin/lib.mjs",
  "lab/bench/test/g0.test.ts",
  "lab/verify/K01/g0-review.test.mjs",
];
const sha = (b) => createHash("sha256").update(b).digest("hex");
const receipt = {
  head: spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).stdout.trim(),
  at: new Date().toISOString(),
  disk,
  node: process.version,
  sources: Object.fromEntries(files.map((f) => [f, sha(fs.readFileSync(path.join(root, f)))])),
  runs: [],
};
for (const [label, args] of [["g0-review", ["--test", "lab/verify/K01/g0-review.test.mjs"]]]) {
  const r = spawnSync(process.execPath, args, {
    cwd: root,
    encoding: "utf8",
    timeout: 120000,
    maxBuffer: 16 << 20,
  });
  const text = (r.stdout ?? "") + (r.stderr ?? "");
  fs.writeFileSync(path.join(out, label + ".log"), text);
  receipt.runs.push({
    label,
    args,
    status: r.status,
    signal: r.signal,
    error: r.error?.message,
    sha256: sha(text),
  });
}
fs.writeFileSync(path.join(out, "g0-review-run.json"), JSON.stringify(receipt, null, 2) + "\n");
process.exitCode = receipt.runs.some((r) => r.status !== 0 || r.signal || r.error) ? 1 : 0;
