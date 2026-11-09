import { spawnSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
const root = process.cwd(),
  disk = fs.statfsSync(root, { bigint: true });
if (disk.bavail * disk.bsize < 5n * 1024n ** 3n) throw Error("Below 5 GiB disk floor");
for (const args of [
  [path.join(root, "node_modules/tsdown/dist/run.mjs")],
  [
    path.join(root, "node_modules/typescript/bin/tsc"),
    "--declaration",
    "--emitDeclarationOnly",
    "--rootDir",
    "src",
    "--outDir",
    "dist",
  ],
  [
    path.join(root, "node_modules/vitest/vitest.mjs"),
    "run",
    "--maxWorkers=1",
    "--no-file-parallelism",
  ],
]) {
  const result = spawnSync(process.execPath, args, {
    cwd: path.join(root, "packages/broker"),
    stdio: "inherit",
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
