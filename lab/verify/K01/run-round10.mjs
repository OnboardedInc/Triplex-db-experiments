// [EXP-K01-R10] Why: preserve source-bound offline receipts after retiring the process-gate suites. Rejected: adopting historical passes for the new granting gate.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
const root = path.resolve(import.meta.dirname, "../../.."),
  out = path.join(root, "lab/experiments/EXP-K01-seed-clone/evidence/round10");
fs.mkdirSync(out, { recursive: true });
if (fs.existsSync(path.join(out, "run.json")))
  throw Error("retain the prior attempt before rerunning");
const disk = fs.statfsSync(root);
if (disk.bavail * disk.bsize < 5 * 1024 ** 3) throw Error("disk floor");
const files = [
  "lab/verify/K01/run-round10.mjs",
  "lab/bench/clone-check.ts",
  "lab/bin/test/lab.test.mjs",
  "lab/bench/test/bench.test.ts",
  "lab/bench/lib/g0.ts",
  "lab/bench/lib/g0-values.ts",
  "lab/bench/lib/g0-wire.ts",
  "lab/bench/lib/g0-native.ts",
  "lab/bench/test/g0-native.test.ts",
  "lab/verify/K01/representation-review.test.mjs",
  "lab/bench/lib/g0-normalize.ts",
  "lab/bench/test/g0-values.test.ts",
  "lab/bench/test/g0-e1.test.ts",
  "lab/verify/K01/columns-review.test.mjs",
  "lab/bench/lib/g0-schema.ts",
  "lab/bench/test/g0-schema.test.ts",
  "lab/verify/K01/g0-review.test.mjs",
  "lab/bench/lib/g0-xtdb.ts",
  "lab/bench/lib/bulk.ts",
  "lab/bench/driver.ts",
  "lab/bench/xtdb-seed.ts",
  "lab/bin/engine.mjs",
  "lab/bin/lib.mjs",
  "lab/bench/test/g0.test.ts",
];
const schemaFiles = fs
  .readdirSync(path.join(root, "packages/xtdb/src"), { recursive: true })
  .filter((f) => String(f).endsWith(".ts"))
  .map((f) => "packages/xtdb/src/" + f);
files.push(...schemaFiles);
const sha = (b) => createHash("sha256").update(b).digest("hex");
const receipt = {
  head: spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).stdout.trim(),
  at: new Date().toISOString(),
  disk,
  node: process.version,
  sources: Object.fromEntries(files.map((f) => [f, sha(fs.readFileSync(path.join(root, f)))])),
  runs: [],
};
for (const [label, args] of [
  [
    "tests",
    [
      "--test",
      "lab/bin/test/lab.test.mjs",
      "lab/bench/test/bench.test.ts",
      "lab/bench/test/g0.test.ts",
      "lab/bench/test/g0-schema.test.ts",
      "lab/bench/test/g0-values.test.ts",
      "lab/bench/test/g0-e1.test.ts",
      "lab/bench/test/g0-native.test.ts",
    ],
  ],
  ["reviewer", ["--test", "lab/verify/K01/g0-review.test.mjs"]],
  ["columns", ["--test", "lab/verify/K01/columns-review.test.mjs"]],
  ["representation", ["--test", "lab/verify/K01/representation-review.test.mjs"]],
  ["types", ["node_modules/typescript/bin/tsc", "--noEmit", "-p", "lab/bench/tsconfig.json"]],
]) {
  const r = spawnSync(process.execPath, args, {
    cwd: root,
    env: {
      ...process.env,
      TX2_K01_REP_OUT:"/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-K01-R2/round10/attempt-2/representation",
      TX2_K01_REVIEW_OUT:
        "/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-K01-R2/round10/attempt-2/reviewer",
      TX2_K01_COLUMNS_OUT:
        "/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-K01-R2/round10/attempt-2/columns",
    },
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
fs.writeFileSync(path.join(out, "run.json"), JSON.stringify(receipt, null, 2) + "\n");
process.exitCode = receipt.runs.some((r) => r.status !== 0 || r.signal || r.error) ? 1 : 0;
