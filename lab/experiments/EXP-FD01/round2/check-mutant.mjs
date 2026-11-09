// [EXP-FD01-R2] Why: prove the concrete suite rejects QA's original split, not just a synthetic partial-state object.
// Rejected: treating idempotent recovery or a nonzero test exit from import errors as an atomicity rejection.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
const root = path.resolve(import.meta.dirname, "../../../..");
const dir = path.join(
  "/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-FD01",
  "round2-mutant-" + randomUUID(),
);
fs.mkdirSync(dir, { recursive: true });
const files = [
  "packages/host/test/feed/feed.test.ts",
  "packages/host/test/feed/crash-child.mjs",
  "packages/host/src/feed/ConsumerStore.ts",
  "packages/testkit/src/feed/index.ts",
  "packages/core/src/feed/index.ts",
  "lab/experiments/EXP-FD01/round2/source-hook.mjs",
  "lab/experiments/EXP-FD01/round2/mutant-hook.mjs",
  "lab/experiments/EXP-FD01/round2/reviewer-probes/mutate.mjs",
  "lab/experiments/EXP-FD01/round2/check-mutant.mjs",
];
const sha = (b) => createHash("sha256").update(b).digest("hex");
const source = Object.fromEntries(files.map((p) => [p, sha(fs.readFileSync(path.join(root, p)))]));
for (const file of files) {
  const target = path.join(dir, "preimages", file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(path.join(root, file), target);
}
fs.writeFileSync(
  path.join(dir, "inputs.json"),
  JSON.stringify({ source, engines: false, slot: null }, null, 2),
);
const report = path.join(dir, "vitest.json");
const hook = path.join(root, "lab/experiments/EXP-FD01/round2/mutant-hook.mjs");
const out = spawnSync(
  path.join(root, "node_modules/.bin/vitest"),
  [
    "run",
    "test/feed/feed.test.ts",
    "-t",
    "recovers 100 actual",
    "--reporter=json",
    `--outputFile=${report}`,
  ],
  {
    cwd: path.join(root, "packages/host"),
    encoding: "utf8",
    env: {
      ...process.env,
      NODE_OPTIONS: `--import=${hook}`,
      FD01_CRASH_EVIDENCE: path.join(dir, "crash-observations.json"),
    },
    maxBuffer: 8 * 1024 * 1024,
  },
);
fs.writeFileSync(path.join(dir, "output.log"), out.stdout + "\n" + out.stderr);
const actual = fs.existsSync(report) ? JSON.parse(fs.readFileSync(report, "utf8")) : null;
const failures =
  actual?.testResults.flatMap((t) => t.assertionResults.filter((a) => a.status === "failed")) ?? [];
const sourceUnchanged = files.every((p) => sha(fs.readFileSync(path.join(root, p))) === source[p]);
const observations = fs.existsSync(path.join(dir, "crash-observations.json"))
  ? JSON.parse(fs.readFileSync(path.join(dir, "crash-observations.json"), "utf8"))
  : [];
const partial = observations[0];
const rows = (values) =>
  values?.map((v) => JSON.stringify([v.epoch, v.position, v.subject])).sort();
const expectedRows = [
  JSON.stringify(["1", "1", "other"]),
  JSON.stringify(["1", "1", "subject"]),
].sort();
const counterexampleMatches =
  observations.length === 1 &&
  partial?.point === "after-commit" &&
  partial.arm === "keyed-atomic" &&
  partial.exit === 77 &&
  partial.beforeReplay.checkpoint === null &&
  JSON.stringify(rows(partial.beforeReplay.effects)) === JSON.stringify(expectedRows) &&
  JSON.stringify(rows(partial.beforeReplay.affected)) === JSON.stringify(expectedRows) &&
  partial.trace.commitEvents.length === 2 &&
  partial.trace.commitEvents[0].phase === "before" &&
  partial.trace.commitEvents[1].phase === "after" &&
  partial.trace.commitEvents.every((e) => e.index === 0 && /^\s*COMMIT\s*$/i.test(e.statement));
const rejected =
  counterexampleMatches &&
  out.status === 1 &&
  failures.length === 1 &&
  failures[0].failureMessages.some((m) =>
    m.includes("Nonatomic consumer state before replay: after-commit"),
  ) &&
  sourceUnchanged;
fs.writeFileSync(
  path.join(dir, "observation.json"),
  JSON.stringify(
    { exit: out.status, rejected, counterexampleMatches, sourceUnchanged, failures, observations },
    null,
    2,
  ),
);
console.log(JSON.stringify({ dir, rejected, sourceUnchanged, exit: out.status }));
if (!rejected) {
  console.error(out.stdout + "\n" + out.stderr);
  process.exitCode = 1;
}
