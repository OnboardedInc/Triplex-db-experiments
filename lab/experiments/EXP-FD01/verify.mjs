// [EXP-FD01] Why: retain every failed attempt with source hashes before running offline checks.
// Rejected: overwrite a PASS.json (loses freshness and the first failure).
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
const root = path.resolve(import.meta.dirname, "../../..");
const attempt = path.join("/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-FD01", randomUUID());
fs.mkdirSync(attempt, { recursive: true });
const sha = (b) => createHash("sha256").update(b).digest("hex");
const files = spawnSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], {
  cwd: root,
  encoding: "utf8",
})
  .stdout.trim()
  .split("\n")
  .filter((p) =>
    /^(packages\/(core|host|testkit)\/|lab\/experiments\/EXP-FD01\/|lab\/(bin|bench|oracles\/replay)\/|pnpm-lock.yaml$)/.test(
      p,
    ),
  );
const source = Object.fromEntries(
  files
    .filter((f) => fs.statSync(path.join(root, f)).isFile())
    .map((f) => [f, sha(fs.readFileSync(path.join(root, f)))]),
);
const record = {
  format: "FD01-offline-checks/1",
  attempt,
  source,
  slot: null,
  engines: false,
  steps: [],
};
fs.writeFileSync(path.join(attempt, "attempt.json"), JSON.stringify(record, null, 2));
const steps = [
  ["core-build", "packages/core", "../../node_modules/.bin/tsdown", []],
  ["host-build", "packages/host", "../../node_modules/.bin/tsdown", []],
  [
    "host-declarations",
    "packages/host",
    "../../node_modules/.bin/tsc",
    ["--declaration", "--emitDeclarationOnly", "--rootDir", "src", "--outDir", "dist"],
  ],
  ["testkit-build", "packages/testkit", "../../node_modules/.bin/tsdown", []],
  ["core-typecheck", "packages/core", "../../node_modules/.bin/tsc", ["--noEmit"]],
  ["host-typecheck", "packages/host", "../../node_modules/.bin/tsc", ["--noEmit"]],
  ["testkit-typecheck", "packages/testkit", "../../node_modules/.bin/tsc", ["--noEmit"]],
  [
    "host-feed-tests",
    "packages/host",
    "../../node_modules/.bin/vitest",
    [
      "run",
      "test/feed/feed.test.ts",
      "--reporter=json",
      `--outputFile=${path.join(attempt, "vitest.json")}`,
    ],
  ],
];
steps.push(["bench-tests", ".", process.execPath, ["--test", "lab/bench/test/bench.test.ts"]]);
let code = 0;
for (const [name, cwd, cmd, args] of steps) {
  console.log(name);
  const out = spawnSync(cmd, args, {
    cwd: path.join(root, cwd),
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
    env: { ...process.env, FD01_CRASH_EVIDENCE: path.join(attempt, "crash-observations.json") },
  });
  const raw = out.stdout + "\n" + out.stderr;
  fs.writeFileSync(path.join(attempt, name + ".log"), raw);
  record.steps.push({ name, command: [cmd, ...args], cwd, status: out.status, sha256: sha(raw) });
  fs.writeFileSync(path.join(attempt, "attempt.json"), JSON.stringify(record, null, 2));
  if (out.status !== 0) {
    console.log(raw.slice(-14000));
    code = 1;
    break;
  }
}
record.sourceUnchanged = files.every(
  (f) => !source[f] || sha(fs.readFileSync(path.join(root, f))) === source[f],
);
if (!record.sourceUnchanged) code = 1;
record.completedAt = new Date().toISOString();
fs.writeFileSync(path.join(attempt, "attempt.json"), JSON.stringify(record, null, 2));
console.log(JSON.stringify({ attempt, code, sourceUnchanged: record.sourceUnchanged }));
process.exitCode = code;
