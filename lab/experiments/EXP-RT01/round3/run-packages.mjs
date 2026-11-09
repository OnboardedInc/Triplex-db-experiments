import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
const root = path.resolve(import.meta.dirname, "../../../..");
const attempt = process.argv[2] ?? `offline-${randomUUID()}`;
const evidence = path.join(
  "/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-RT01/round3",
  attempt,
);
await fs.mkdir(evidence, { recursive: true });
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const source = async () => {
  const paths = spawnSync(
    "git",
    [
      "ls-files",
      "-z",
      "packages/core",
      "packages/testkit",
      "packages/xtdb",
      "packages/qlever",
      "pnpm-lock.yaml",
    ],
    { cwd: root, encoding: "utf8" },
  )
    .stdout.split("\0")
    .filter(Boolean);
  return Object.fromEntries(
    await Promise.all(
      paths.map(async (file) => [file, sha(await fs.readFile(path.join(root, file)))]),
    ),
  );
};
const before = await source();
const phases = [];
for (const pkg of ["core", "testkit", "xtdb", "qlever"]) {
  const cwd = path.join(root, "packages", pkg);
  const jobs = [
    ["build", "tsdown", []],
    ["types", "tsc", ["--noEmit"]],
    ["tests", "vitest", ["run", "--maxWorkers=1", "--no-file-parallelism"]],
  ];
  if (pkg === "core")
    jobs.push(
      ["runtime-types", "tsc", ["--noEmit", "-p", "test/runtime/tsconfig.json"]],
      ["entity-types", "tsc", ["--noEmit", "-p", "test/entity/tsconfig.json"]],
    );
  for (const [phase, command, args] of jobs) {
    const started = new Date().toISOString();
    const result = spawnSync(path.join(root, "node_modules/.bin", command), args, {
      cwd,
      timeout: 300000,
      maxBuffer: 32 * 1024 ** 2,
      encoding: "utf8",
    });
    const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
    const file = `${pkg}-${phase}.txt`;
    await fs.writeFile(path.join(evidence, file), output);
    phases.push({
      pkg,
      phase,
      command,
      args,
      started,
      ended: new Date().toISOString(),
      exit: result.status,
      signal: result.signal,
      error: result.error?.message ?? null,
      file,
      sha256: sha(output),
    });
    console.log(`${attempt} ${pkg} ${phase}: exit ${result.status}`);
  }
}
const after = await source();
await fs.writeFile(
  path.join(evidence, "execution.json"),
  JSON.stringify(
    {
      attempt,
      head: spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).stdout.trim(),
      sourceBefore: before,
      sourceAfter: after,
      sourceUnchanged: JSON.stringify(before) === JSON.stringify(after),
      phases,
    },
    null,
    2,
  ) + "\n",
);
process.exitCode =
  phases.some((p) => p.exit !== 0) || JSON.stringify(before) !== JSON.stringify(after) ? 1 : 0;

// [EXP-RT01] Why: dependent probes consume these builds, so keep them in the same serialized grant. Rejected: a second concurrent job (can import a dist tree while it is being rebuilt).
if (process.exitCode === 0) {
  const repro = spawnSync(
    process.execPath,
    [path.join(import.meta.dirname, "run-reproductions.mjs"), process.argv[3] ?? "attempt1"],
    { cwd: root, stdio: "inherit", timeout: 600000 },
  );
  process.exitCode = repro.status ?? 1;
}
