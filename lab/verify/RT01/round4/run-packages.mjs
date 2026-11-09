// [CX-VRT01-R4] Why: rerun package and backend-offline tests independently before the saved matrices. Rejected: adopting the builder's logs or starting Testcontainers.
import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
const root = process.cwd();
const attempt = process.argv[2] ?? "packages";
const evidence = path.join(
  path.join(root,"lab/verify/RT01/round4"),
  attempt,
);
await fs.mkdir(evidence, { recursive: true });
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const source = async () => {
  const paths = spawnSync(
    "git",
    ["ls-files", "-co", "--exclude-standard", "-z", "packages", ".changeset", "pnpm-lock.yaml"],
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
const runnerBefore = sha(await fs.readFile(import.meta.filename));
const before = await source();
const phases = [];
for (const pkg of [
  "core",
  "testkit",
  "xtdb",
  "qlever",
  "sql",
  "sqlite",
  "postgres",
  "cloudflare",
]) {
  const cwd = path.join(root, "packages", pkg);
  const jobs =
    pkg === "sql"
      ? [
          ["build", "tsdown", []],
          [
            "declarations",
            "tsc",
            ["--declaration", "--emitDeclarationOnly", "--rootDir", "src", "--outDir", "dist"],
          ],
        ]
      : [
          ["build", "tsdown", []],
          ["types", "tsc", ["--noEmit"]],
          [
            "tests",
            "vitest",
            [
              "run",
              ...(pkg === "postgres" ? ["test/exports.test.ts"] : []),
              "--maxWorkers=1",
              "--no-file-parallelism",
            ],
          ],
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
      context: "offline-no-engine",
      runnerSha256: runnerBefore,
      runnerUnchanged: runnerBefore === sha(await fs.readFile(import.meta.filename)),
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
