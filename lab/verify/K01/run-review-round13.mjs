// [EXP-K01-VK01-R13] Why: preserve source-bound offline receipts after retiring the process-gate suites. Rejected: adopting historical passes for the new granting gate.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
const root = path.resolve(import.meta.dirname, "../../.."),
  out = path.join(root, "lab/verify/K01/evidence/review-round13");
fs.mkdirSync(out, { recursive: true });
if (fs.existsSync(path.join(out, "run.json")))
  throw Error("retain the prior attempt before rerunning");
const raw="/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VK01/round13/attempt-4";
if(fs.existsSync(raw))throw Error("preserve raw attempt");
const disk = fs.statfsSync(root);
if (disk.bavail * disk.bsize < 5 * 1024 ** 3) throw Error("disk floor");
fs.mkdirSync(raw,{recursive:true});
const files = [
  "lab/verify/K01/run-review-round13.mjs",
  "lab/verify/K01/counts-review.test.ts",
  "lab/verify/K01/catalog-review.test.mjs",
  "lab/bench/lib/g0-catalog.ts",
  "lab/bench/test/g0-catalog.test.ts",
  "lab/bench/test/engine-binding.test.ts",
  "lab/bench/test/fixtures/g0-smoke13.json",
  "lab/bench/test/fixtures/g0-missing-live12.json",
  "lab/verify/K01/smoke-round13.mjs",
  "pnpm-lock.yaml",
  "node_modules/typescript/lib/typescript.js",
  "lab/bench/clone-check.ts",
  "lab/bin/test/lab.test.mjs",
  "lab/bench/test/bench.test.ts",
  "lab/bench/lib/g0.ts",
  "lab/bench/lib/n01-counts.ts",
  "lab/bench/lib/seed.ts",
  "lab/bench/lib/commands.ts",
  "lab/bench/lib/world.ts",
  "packages/core/src/store/transactionMetadata.ts",
  "packages/core/src/store/TriplesLive.ts",
  "packages/core/src/store/systemNamespace.ts",
  "packages/core/dist/store/transactionMetadata.js",
  "packages/core/dist/store/TriplesLive.js",
  "packages/xtdb/dist/XtdbStorageAdapter.js",
  "packages/xtdb/dist/codecs.js",
  "packages/xtdb/dist/index.js",
  "packages/core/dist/index.js",
  "packages/core/dist/runtime/index.js",
  "lab/bench/test/g0-counts.test.ts",
  "lab/bench/test/fixtures/g0-count-live11.json",
  "lab/experiments/EXP-K01-seed-clone/evidence/live-round11/seed.log",
  "lab/experiments/EXP-K01-seed-clone/evidence/live-round11/receipt.json",
  "lab/bench/lib/g0-values.ts",
  "lab/bench/lib/g0-wire.ts",
  "lab/bench/lib/g0-native.ts",
  "lab/bench/test/g0-native.test.ts",
  "lab/bench/test/g0-live.test.ts",
  "lab/bench/test/fixtures/g0-live-round10.json",
  "lab/experiments/EXP-K01-seed-clone/REPORT-round13.md",
  "lab/experiments/EXP-K01-seed-clone/evidence/live-round10/wire.log",
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
  raw,
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
      "lab/bench/test/g0-live.test.ts",
      "lab/bench/test/g0-counts.test.ts",
      "lab/bench/test/g0-catalog.test.ts",
      "lab/bench/test/engine-binding.test.ts",
    ],
  ],
  ["reviewer", ["--test", "lab/verify/K01/g0-review.test.mjs"]],
  ["columns", ["--test", "lab/verify/K01/columns-review.test.mjs"]],
  ["representation", ["--test", "lab/verify/K01/representation-review.test.mjs"]],
  ["catalog-review",["--test","lab/verify/K01/catalog-review.test.mjs"]],
  ["counts",["--test","lab/verify/K01/counts-review.test.ts"]],
  ["types", ["node_modules/typescript/bin/tsc", "--noEmit", "-p", "lab/bench/tsconfig.json"]],
]) {
  const r = spawnSync(process.execPath, args, {
    cwd: root,
    env: {
      ...process.env,
      TX2_K01_CATALOG_OUT: path.join(raw,"catalog-review"),
      TX2_K01_COUNTS_OUT: path.join(raw,"counts"),
      TX2_K01_REP_OUT:path.join(raw,"representation"),
      TX2_K01_REVIEW_OUT:
        path.join(raw,"reviewer"),
      TX2_K01_COLUMNS_OUT:
        path.join(raw,"columns"),
    },
    encoding: "utf8",
    timeout: 120000,
    maxBuffer: 16 << 20,
  });
  const text = (r.stdout ?? "") + (r.stderr ?? "");
  fs.writeFileSync(path.join(out, label + ".log"), text);
  const counts=Object.fromEntries([...text.matchAll(/^# (tests|pass|fail|cancelled|skipped|todo) (\d+)$/gm)].map(m=>[m[1],Number(m[2])]));
  const total=({tests:256,reviewer:30,columns:98,representation:57,counts:48,"catalog-review":22})[label];
  const summaryOkay=total===undefined || counts.tests===total && counts.pass===total && ["fail","cancelled","skipped","todo"].every(k=>counts[k]===0);
  receipt.runs.push({
    counts, summaryOkay,
    label,
    args,
    status: r.status,
    signal: r.signal,
    error: r.error?.message,
    sha256: sha(text),
  });
  process.stdout.write(label+": "+r.status+", "+JSON.stringify(counts)+"\n");
}
receipt.inputsUnchanged=files.every(f=>receipt.sources[f]===sha(fs.readFileSync(path.join(root,f))));
fs.writeFileSync(path.join(out,"SHA256SUMS-RAW"),fs.readdirSync(raw,{recursive:true}).map(f=>path.join(raw,f)).filter(f=>fs.statSync(f).isFile()).sort().map(f=>sha(fs.readFileSync(f))+"  "+f+"\n").join(""));
fs.writeFileSync(path.join(out, "run.json"), JSON.stringify(receipt, null, 2) + "\n");
process.exitCode = !receipt.inputsUnchanged || receipt.runs.some((r) => r.status !== 0 || r.signal || r.error || !r.summaryOkay) ? 1 : 0;
