import fs from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
const root = process.cwd();
const run = (pkg, args) => {
  if (fs.existsSync(path.join(root, "runs/EXP-P2B/dependency-maintenance")))
    throw new Error("Dependency maintenance in progress");
  const disk = fs.statfsSync(root, { bigint: true });
  if (disk.bavail * disk.bsize < 5n * 1024n ** 3n)
    throw new Error("Refusing a new gate command below 5 GiB disk floor");
  const result = spawnSync(
    process.execPath,
    args.map((arg) => (arg.startsWith("@ROOT/") ? path.join(root, arg.slice(6)) : arg)),
    { cwd: path.join(root, "packages", pkg), stdio: "inherit" },
  );
  if (result.status !== 0) process.exit(result.status ?? 1);
};
for (const pkg of ["core", "testkit", "broker", "qlever", "xtdb"]) {
  run(pkg, ["@ROOT/node_modules/tsdown/dist/run.mjs"]);
  if (pkg !== "core")
    run(pkg, [
      "@ROOT/node_modules/typescript/bin/tsc",
      "--declaration",
      "--emitDeclarationOnly",
      "--rootDir",
      "src",
      "--outDir",
      "dist",
    ]);
}
for (const pkg of ["broker", "qlever", "xtdb"])
  run(pkg, ["@ROOT/node_modules/typescript/bin/tsc", "--noEmit"]);
run("broker", [
  "@ROOT/node_modules/vitest/vitest.mjs",
  "run",
  "--maxWorkers=1",
  "--no-file-parallelism",
]);
run("xtdb", [
  "@ROOT/node_modules/vitest/vitest.mjs",
  "run",
  "test/broker.test.ts",
  "test/broker-route.test.ts",
  "test/native-query.test.ts",
  "test/query-compiler.test.ts",
  "--maxWorkers=1",
  "--no-file-parallelism",
]);
run("qlever", [
  "@ROOT/node_modules/vitest/vitest.mjs",
  "run",
  "test/broker.test.ts",
  "test/sqlite-broker.test.ts",
  // [EXP-P2B-R3] Why: async pin/purge migration must retain the actual H1 route corpus. Rejected: checking only adapter mocks.
  "test/h1-route-equivalence.test.ts",
  "test/broker-fixes.test.ts",
  "test/broker-answer-errors.test.ts",
  "test/broker-request-errors.test.ts",
  "test/broker-transport-errors.test.ts",
  "--maxWorkers=1",
  "--no-file-parallelism",
]);
