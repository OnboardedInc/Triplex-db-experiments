// [EXP-RQ01] Why: check the packed public API using existing pinned dependencies.
// Rejected: source-alias smoke tests (would not exercise the tarball exports).
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import {
  hashFiles,
  sourceFiles,
  heavyAdmission,
  sameAdmission,
  distFiles,
  readFreshJson,
  sha,
} from "./attempt-io.mjs";
const attempt = process.argv[2] ?? "round2";
if (!/^[a-zA-Z0-9_-]+$/.test(attempt)) throw new Error("Invalid package smoke attempt");
const root = process.cwd();
const admission = heavyAdmission();
const token = randomUUID(),
  started = Date.now();
const inputs = [
  ...sourceFiles(),
  import.meta.filename,
  "lab/experiments/EXP-RQ01/attempt-io.mjs",
  "pnpm-lock.yaml",
  "packages/testkit/package.json",
  "packages/testkit/README.md",
  "/Users/sam/projects/triplex-db-2/packages/core/package.json",
  "/Users/sam/projects/triplex-db-2/node_modules/effect/package.json",
];
inputs.push(
  ...distFiles("/Users/sam/projects/triplex-db-2/packages/core/dist"),
  ...distFiles("/Users/sam/projects/triplex-db-2/node_modules/effect/dist"),
);
const before = hashFiles(inputs),
  distribution = hashFiles(distFiles());
const controllerSha256 = createHash("sha256")
  .update(fs.readFileSync(import.meta.filename))
  .digest("hex");
const out = path.join(root, `.experiments/rq01-package-smoke-${attempt}`);
fs.mkdirSync(out, { recursive: false });
const pack = spawnSync(
  "/opt/homebrew/bin/pnpm",
  [
    "--config.store-dir=/Users/sam/projects/triplex-db-2/.pnpm-store",
    "--config.offline=true",
    "--filter",
    "@triplex-build/triplex-testkit",
    "pack",
    "--pack-destination",
    out,
  ],
  { encoding: "utf8" },
);
console.log(pack.stdout, pack.stderr);
if (pack.status !== 0) process.exit(pack.status ?? 1);
const tarball = path.join(
  out,
  fs.readdirSync(out).find((n) => n.endsWith(".tgz")),
);
const list = spawnSync("tar", ["-tzf", tarball], { encoding: "utf8" });
if (list.status !== 0) throw new Error(list.stderr);
const entries = list.stdout.trim().split("\n");
for (const required of [
  "package/dist/index.js",
  "package/dist/index.d.ts",
  "package/dist/route.js",
  "package/dist/route.d.ts",
  "package/dist/route-equivalence.js",
  "package/dist/route-equivalence.d.ts",
  "package/dist/offline-route-fixtures.js",
  "package/dist/route-history-grammar.js",
  "package/dist/route-history-grammar.d.ts",
  "package/dist/route-coverage.js",
  "package/dist/route-coverage.d.ts",
]) {
  if (!entries.includes(required)) throw new Error(`Missing ${required}`);
}
if (entries.some((n) => n.includes("/src/") || n.includes("/test/") || n.includes("node_modules")))
  throw new Error("Unexpected tarball source/cache");
const consumer = path.join(out, "consumer");
const scope = path.join(consumer, "node_modules/@triplex-build");
fs.mkdirSync(scope, { recursive: true });
const unpack = spawnSync("tar", ["-xzf", tarball, "-C", consumer], { encoding: "utf8" });
if (unpack.status !== 0) throw new Error(unpack.stderr);
fs.renameSync(path.join(consumer, "package"), path.join(scope, "triplex-testkit"));
for (const file of Object.keys(distribution)) {
  const packed = path.join(scope, "triplex-testkit", path.relative("packages/testkit", file));
  if (sha(fs.readFileSync(packed)) !== distribution[file])
    throw new Error(`Packed build mismatch: ${file}`);
}
fs.symlinkSync("/Users/sam/projects/triplex-db-2/packages/core", path.join(scope, "triplex"));
fs.symlinkSync(
  "/Users/sam/projects/triplex-db-2/node_modules/effect",
  path.join(consumer, "node_modules/effect"),
);
fs.writeFileSync(
  path.join(consumer, "smoke.mjs"),
  `import fs from "node:fs";
import { generateRouteHistory, makeOfflineRouteFixture, runRouteEquivalence, replayRouteAnswer } from '@triplex-build/triplex-testkit/route';
const result = await runRouteEquivalence({history: generateRouteHistory(89, 16), fixture: makeOfflineRouteFixture('qlever')});
if (result.violations.length) throw new Error(JSON.stringify(result.violations));
const known = replayRouteAnswer(generateRouteHistory(89,16), { basis: { validAt: 2000, recordedPosition: 1024 } });
fs.writeFileSync('result.json', JSON.stringify({attemptToken: process.env.EXP_RQ01_ATTEMPT_TOKEN,
  observations: result.observations.length, violations: result.violations, shapes: result.coverage.shapes,
  contracts: [...new Set(result.observations.map(o=>o.contract))],
  knownIds: known.map(r=>r.id).sort(), masked: known.every(r=>r.retracted_at===null && r.retracted_position===null && r.retract_tx_id===null)}));
console.log('packed public exports: observations=' + result.observations.length);
`,
);
const consumerStarted = Date.now();
const smoke = spawnSync("node", ["smoke.mjs"], {
  cwd: consumer,
  encoding: "utf8",
  env: { ...process.env, EXP_RQ01_ATTEMPT_TOKEN: token },
});
console.log(smoke.stdout, smoke.stderr);
const observed = readFreshJson(path.join(consumer, "result.json"), consumerStarted);
const content =
  observed.attemptToken === token &&
  observed.observations > 0 &&
  observed.violations.length === 0 &&
  Object.values(observed.shapes).every((n) => n > 0) &&
  JSON.stringify(observed.contracts) === '["snapshot"]' &&
  observed.masked &&
  JSON.stringify(observed.knownIds) ===
    JSON.stringify(Array.from({ length: 40 }, (_, i) => `group:0:${i}`).sort());
const sourceStillMatches = JSON.stringify(before) === JSON.stringify(hashFiles(inputs));
const distributionStillMatches =
  JSON.stringify(distribution) === JSON.stringify(hashFiles(distFiles()));
const admissionStillMatches = sameAdmission(admission);
const receipt = {
  started,
  attemptToken: token,
  admission,
  admissionStillMatches,
  source: before,
  sourceStillMatches,
  distribution,
  distributionStillMatches,
  content,
  observed,
  consumerOutputSha256: sha(fs.readFileSync(path.join(consumer, "result.json"))),
  controllerSha256,
  at: new Date().toISOString(),
  tarball,
  sha256: createHash("sha256").update(fs.readFileSync(tarball)).digest("hex"),
  entries,
  packExit: pack.status,
  consumerExit: smoke.status,
  dependencies: "existing pinned core/effect package links; no registry install",
  passed:
    smoke.status === 0 &&
    content &&
    sourceStillMatches &&
    distributionStillMatches &&
    admissionStillMatches,
};
fs.writeFileSync(
  `lab/experiments/EXP-RQ01/evidence/${attempt}-package-smoke.json`,
  JSON.stringify(receipt, null, 2) + "\n",
);
process.exitCode = receipt.passed ? 0 : 1;
