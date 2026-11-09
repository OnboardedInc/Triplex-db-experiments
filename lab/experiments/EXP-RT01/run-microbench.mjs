import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import ts from "typescript";
import { createHash, randomUUID } from "node:crypto";
const root = path.resolve(import.meta.dirname, "../../..");
const files = [];
const lock = path.join(import.meta.dirname, ".microbench.lock");
await fs.writeFile(lock, JSON.stringify({ pid: process.pid, attempt: randomUUID() }), {
  flag: "wx",
});
const hash = (value) => createHash("sha256").update(value).digest("hex");
const snapshot = async () => {
  const paths = spawnSync(
    "git",
    [
      "ls-files",
      "-z",
      "packages/core",
      "packages/xtdb",
      "pnpm-lock.yaml",
      "lab/experiments/EXP-RT01/run-microbench.mjs",
      "lab/experiments/EXP-RT01/adapter-microbench.ts",
      "lab/experiments/EXP-RT01/microbench.ts",
    ],
    { cwd: root, encoding: "utf8" },
  )
    .stdout.split("\0")
    .filter(Boolean);
  for (const file of await fs.readdir(path.join(root, "packages/core/dist/storage")))
    if (file.endsWith(".js")) paths.push(`packages/core/dist/storage/${file}`);
  return Object.fromEntries(
    await Promise.all(
      paths.map(async (file) => [file, hash(await fs.readFile(path.join(root, file)))]),
    ),
  );
};
const before = await snapshot();
try {
  for (const name of ["TriplesLive", "transactionMetadata"]) {
    let source = await fs.readFile(
      path.join(import.meta.dirname, `evidence/main-${name}.txt`),
      "utf8",
    );
    if (name === "TriplesLive")
      source = source.replace(
        '"./transactionMetadata.js"',
        '"./__rt01_main_transactionMetadata.js"',
      );
    // [EXP-RT01] Why: compare the exact pre-change core without another checkout/install. Rejected: benchmarking the stamp helper alone (omits journal cost).
    const target = path.join(root, `packages/core/src/store/__rt01_main_${name}.js`);
    await fs.writeFile(
      target,
      ts.transpileModule(source, {
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
      }).outputText,
    );
    files.push(target);
  }
  if (process.argv.includes("--adapter")) {
    const source = await fs.readFile(
      path.join(import.meta.dirname, "evidence/main-XtdbStorageAdapter.txt"),
      "utf8",
    );
    const target = path.join(root, "packages/xtdb/src/__rt01_main_XtdbStorageAdapter.js");
    await fs.writeFile(
      target,
      ts.transpileModule(source, {
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
      }).outputText,
    );
    files.push(target);
  }
  const result = spawnSync(
    path.join(root, "node_modules/.bin/tsx"),
    [
      path.join(
        import.meta.dirname,
        process.argv.includes("--adapter") ? "adapter-microbench.ts" : "microbench.ts",
      ),
    ],
    { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 ** 2 },
  );
  const after = await snapshot();
  const baseline = Object.fromEntries(
    await Promise.all(
      files.map(async (file) => [path.relative(root, file), hash(await fs.readFile(file))]),
    ),
  );
  if (result.stderr) process.stderr.write(result.stderr);
  let measurement;
  try {
    measurement = JSON.parse(result.stdout);
  } catch {
    measurement = { rawStdout: result.stdout };
  }
  process.stdout.write(
    JSON.stringify(
      {
        ...measurement,
        execution: {
          node: process.version,
          head: spawnSync("git", ["rev-parse", "HEAD"], {
            cwd: root,
            encoding: "utf8",
          }).stdout.trim(),
          exit: result.status,
          error: result.error?.message ?? null,
          baselineCommit: "59e07afb7a25dfb22bca60f8d769b74651aa835a",
          baseline,
          sourceBefore: before,
          sourceAfter: after,
          sourceUnchanged: JSON.stringify(before) === JSON.stringify(after),
        },
      },
      null,
      2,
    ) + "\n",
  );
  process.exitCode =
    result.status !== 0 || JSON.stringify(before) !== JSON.stringify(after) ? 1 : 0;
} finally {
  for (const file of files) await fs.unlink(file);
  await fs.unlink(lock);
}
