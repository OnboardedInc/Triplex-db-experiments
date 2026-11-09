// [EXP-RQ01] Why: check the packed public API using existing pinned dependencies.
// Rejected: source-alias smoke tests (would not exercise the tarball exports).
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
const root = process.cwd();
const controllerSha256 = createHash("sha256")
  .update(fs.readFileSync(import.meta.filename))
  .digest("hex");
const out = path.join(root, ".experiments/rq01-package-smoke-round2");
fs.mkdirSync(out, { recursive: true });
const pack = spawnSync(
  "/opt/homebrew/bin/pnpm",
  [
    "--config.store-dir=/Users/sam/projects/triplex-db-2/.pnpm-store",
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
const entries = list.stdout.trim().split("\n");
for (const required of [
  "package/dist/index.js",
  "package/dist/index.d.ts",
  "package/dist/route-equivalence.js",
  "package/dist/route-equivalence.d.ts",
  "package/dist/offline-route-fixtures.js",
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
fs.symlinkSync("/Users/sam/projects/triplex-db-2/packages/core", path.join(scope, "triplex"));
fs.symlinkSync(
  "/Users/sam/projects/triplex-db-2/node_modules/effect",
  path.join(consumer, "node_modules/effect"),
);
fs.writeFileSync(
  path.join(consumer, "smoke.mjs"),
  `import { generateRouteHistory, makeOfflineRouteFixture, runRouteEquivalence } from '@triplex-build/triplex-testkit';
const result = await runRouteEquivalence({history: generateRouteHistory(89, 16), fixture: makeOfflineRouteFixture('qlever')});
if (result.violations.length) throw new Error(JSON.stringify(result.violations));
console.log('packed public exports: pass; observations=' + result.observations.length);
`,
);
const smoke = spawnSync("node", ["smoke.mjs"], { cwd: consumer, encoding: "utf8" });
console.log(smoke.stdout, smoke.stderr);
const receipt = {
  controllerSha256,
  at: new Date().toISOString(),
  tarball,
  sha256: createHash("sha256").update(fs.readFileSync(tarball)).digest("hex"),
  entries,
  packExit: pack.status,
  consumerExit: smoke.status,
  dependencies: "existing pinned core/effect package links; no registry install",
  passed: smoke.status === 0,
};
fs.writeFileSync(
  "lab/experiments/EXP-RQ01/evidence/round2-package-smoke.json",
  JSON.stringify(receipt, null, 2) + "\n",
);
process.exitCode = receipt.passed ? 0 : 1;
