/** Offline only. Freeze implementation, oracle and test harness before native work. */
import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
const root = path.resolve(import.meta.dirname, "../..");
const runId = randomUUID();
const output = path.join(import.meta.dirname, "generated", runId);
const list = (relative: string): string[] =>
  readdirSync(path.join(root, relative), { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? list(path.join(relative, entry.name)) : [path.join(relative, entry.name)],
  );
const files = [
  ...list("packages/qlever/src"),
  ...list("packages/core/src"),
  ...list("packages/qlever/dist"),
  ...list("packages/core/dist"),
  ...list("packages/testkit/src"),
  "packages/qlever/test/query.test.ts",
  "packages/qlever/vitest.config.ts",
  "vitest.workspace-aliases.ts",
  "qualification/workloads/temporal-workloads.json",
  "packages/qualification/workloads/runner.ts",
  "scripts/triplex-lease.py",
  "pnpm-lock.yaml",
  "packages/qlever/package.json",
  "package.json",
  "experiments/qlever-common/PACKET.md",
  "experiments/qlever-common/prepare.ts",
  "experiments/qlever-common/run.ts",
].sort();
mkdirSync(output, { recursive: true });
const hashes = Object.fromEntries(
  files.map((file) => [
    file,
    createHash("sha256")
      .update(readFileSync(path.join(root, file)))
      .digest("hex"),
  ]),
);
for (const file of files.filter(
  (file) => file.startsWith("packages/qlever/") || file.startsWith("experiments/qlever-common/"),
)) {
  const archive = path.join(output, "source", file);
  mkdirSync(path.dirname(archive), { recursive: true });
  writeFileSync(archive, readFileSync(path.join(root, file)), { flag: "wx" });
}
const manifest = {
  format: "qlever-full-compiler-domain-wave/1",
  wave: 4,
  runId,
  nodeVersion: process.version,
  status: "PREPARED_NOT_EXECUTED",
  createdAt: new Date().toISOString(),
  sourceSha256: hashes,
  profile: {
    perNodeMemoryBytes: 2 * 1024 ** 3,
    cpus: 2,
    queryAllocator: "512M",
    cache: "64M",
    threads: 4,
    plannerBudget: 100,
    nativeTimeoutMs: 5000,
    executorTimeoutMs: 6000,
    maxPatternClauses: 32,
    maxResponseBytes: 4 * 1024 ** 2,
    maxResultRows: 1000,
    maxAggregateInputRows: 1000,
    maxRecursiveRows: 1000,
    nodeStopBytes: 1.5 * 1024 ** 3,
    aggregateNodeStopBytes: 3 * 1024 ** 3,
    aggregateClientStopBytes: 2 * 1024 ** 3,
  },
  nodes: [
    {
      plan: "distinct",
      sourcePlan: "compact",
      container: "triplex-qlever-candidate-a",
      url: "http://127.0.0.1:7021",
    },
    {
      plan: "mask",
      sourcePlan: "compact",
      container: "triplex-qlever-candidate-b",
      url: "http://127.0.0.1:7022",
    },
  ],
  test: "packages/qlever/test/query.test.ts",
  expectedTestsPerNode: 7,
  topology: "2x2GiB experimental; original4GiB node stopped",
  gateClaim: false,
};
writeFileSync(path.join(output, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n", {
  flag: "wx",
});
console.log(
  JSON.stringify({
    manifest: path.join(output, "manifest.json"),
    networkRequests: 0,
    sourceFiles: files.length,
  }),
);
