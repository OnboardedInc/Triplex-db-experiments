import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import path from "node:path";

// [CX-VC8] Why: preserve every suite's exit and raw output under reviewer ownership. Rejected: root check (includes unrelated builds).
const root = process.cwd();
const results = [];
for (const name of ["core", "xtdb", "qlever", "qualification"]) {
  const args = [
    path.join(root, "node_modules/vitest/vitest.mjs"),
    "run",
    "--maxWorkers=1",
    "--no-file-parallelism",
  ];
  const started = new Date().toISOString();
  const result = spawnSync(process.execPath, args, {
    cwd: path.join(root, "packages", name),
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
    env: {
      ...process.env,
      XTDB_INTEGRATION: "0",
      QLEVER_INTEGRATION: "0",
      TRIPLEX_INTEGRATION: "0",
      TRIPLEX_DUCKDB: "0",
    },
  });
  writeFileSync(`lab/experiments/EXP-C8-read-only-frontier/round3/offline-${name}.log`, result.stdout + result.stderr);
  results.push({
    name,
    started,
    finished: new Date().toISOString(),
    command: [process.execPath, ...args],
    status: result.status,
    signal: result.signal,
    error: String(result.error ?? ""),
  });
  console.log(name, result.status, (result.stdout + result.stderr).slice(-1300));
}
const args = [
  "--test",
  "../../qualification/compare.test.mjs",
  "load/dispatch.test.ts",
  "load/model.test.ts",
];
const node = spawnSync(process.execPath, args, {
  cwd: path.join(root, "packages/qualification"),
  encoding: "utf8",
  maxBuffer: 16 * 1024 * 1024,
});
writeFileSync("lab/experiments/EXP-C8-read-only-frontier/round3/offline-node.log", node.stdout + node.stderr);
results.push({
  name: "qualification-node",
  command: [process.execPath, ...args],
  status: node.status,
  signal: node.signal,
});
writeFileSync("lab/experiments/EXP-C8-read-only-frontier/round3/offline-results.json", JSON.stringify(results, null, 2) + "\n");
console.log("qualification-node", node.status, (node.stdout + node.stderr).slice(-600));
process.exitCode = results.some((result) => result.status !== 0) ? 1 : 0;
