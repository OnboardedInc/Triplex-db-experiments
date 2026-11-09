// [EXP-RQ01] Why: retain each offline attempt with source hashes and actual exits.
// Rejected: a mutable PASS file (cannot bind a result to the code it exercised).
import { randomUUID } from "node:crypto";
import {
  hashFiles,
  sourceFiles,
  heavyAdmission,
  sameAdmission,
  distFiles,
  readFreshJson,
  sha,
} from "./attempt-io.mjs";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const attempt = process.argv[2];
if (!attempt || !/^[a-zA-Z0-9_-]+$/.test(attempt))
  throw new Error("Usage: gate.mjs UNIQUE_ATTEMPT");
const root = process.cwd();
const out = path.join(root, "lab/experiments/EXP-RQ01/evidence", attempt);
fs.mkdirSync(out, { recursive: false });
const admission = heavyAdmission();
const token = randomUUID();
const started = Date.now();
const files = [
  ...sourceFiles(),
  "lab/experiments/EXP-RQ01/attempt-io.mjs",
  "lab/experiments/EXP-RQ01/reviewer-round2/provenance.json",
  "lab/experiments/EXP-RQ01/reviewer-round2/probe.mjs",
  "lab/experiments/EXP-RQ01/reviewer-round2/boundary.mjs",
  "lab/experiments/EXP-RQ01/retention-probe.mjs",
  "vitest.workspace-aliases.ts",
  "tsconfig.base.json",
  "tsconfig.node.json",
  "packages/testkit/vitest.config.ts",
  "packages/xtdb/vitest.config.ts",
  "packages/qlever/vitest.config.ts",
  "packages/testkit/package.json",
  "packages/testkit/tsdown.config.ts",
  "lab/bin/heavy.mjs",
  "lab/bin/heavy-lock.mjs",
  "lab/bin/lib.mjs",
  "node_modules/typescript/lib/_tsc.js",
  "node_modules/vitest/dist/cli.js",
  "lab/experiments/EXP-RQ01/Q89i.md",
  "lab/experiments/EXP-RQ01/reviewer-round1/provenance.json",
  "packages/testkit/src/route-coverage.ts",
  "packages/testkit/test/route-equivalence-review.test.mjs",
  "lab/experiments/EXP-RQ01/coverage.mjs",
  "lab/experiments/EXP-RQ01/reviewer-round1/review.mjs",
  "packages/testkit/src/index.ts",
  "packages/testkit/src/route-equivalence.ts",
  "packages/testkit/src/offline-route-fixtures.ts",
  "packages/testkit/test/route-equivalence.test.ts",
  "packages/xtdb/test/route-equivalence.test.ts",
  "packages/qlever/test/route-equivalence.test.ts",
  "packages/xtdb/src/XtdbStorageAdapter.ts",
  "packages/xtdb/src/codecs.ts",
  "lab/experiments/EXP-RQ01/gate.mjs",
  "pnpm-lock.yaml",
];
const hashes = () => hashFiles(files);
const before = hashes();
const commands = [
  [
    "testkit",
    [
      "node",
      "node_modules/vitest/vitest.mjs",
      "run",
      "--configLoader",
      "runner",
      "--config",
      "packages/testkit/vitest.config.ts",
      "packages/testkit/test",
    ],
  ],
  [
    "xtdb",
    [
      "node",
      "node_modules/vitest/vitest.mjs",
      "run",
      "--configLoader",
      "runner",
      "--root",
      "packages/xtdb",
      "--config",
      path.join(root, "packages/xtdb/vitest.config.ts"),
      "test/route-equivalence.test.ts",
    ],
  ],
  [
    "qlever",
    [
      "node",
      "node_modules/vitest/vitest.mjs",
      "run",
      "--configLoader",
      "runner",
      "--root",
      "packages/qlever",
      "--config",
      path.join(root, "packages/qlever/vitest.config.ts"),
      "test/route-equivalence.test.ts",
    ],
  ],
  [
    "typecheck",
    ["node", "node_modules/typescript/bin/tsc", "--noEmit", "-p", "packages/testkit/tsconfig.json"],
  ],
  ["build", ["node", "node_modules/tsdown/dist/run.mjs"]],
  ["coverage", ["node", "lab/experiments/EXP-RQ01/coverage.mjs", path.join(out, "coverage.json")]],
];
// tsdown's working directory selects the package's normal build config.
const results = [];
let distribution = null;
for (const [label, command] of commands) {
  const cwd = label === "build" ? path.join(root, "packages/testkit") : root;
  let args =
    label === "build" ? [path.join(root, "node_modules/tsdown/dist/run.mjs")] : command.slice(1);
  const childStarted = Date.now();
  const report = path.join(out, `${label}-tests.json`);
  const testCommand = ["testkit", "xtdb", "qlever"].includes(label);
  if (testCommand) args = [...args, "--reporter=json", `--outputFile=${report}`];
  const result = spawnSync(command[0], args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
    env: { ...process.env, EXP_RQ01_ATTEMPT_TOKEN: token },
  });
  fs.writeFileSync(
    path.join(out, `${label}.log`),
    `${result.stdout ?? ""}${result.stderr ?? ""}${result.error ?? ""}`,
  );
  let content = result.status === 0,
    detail;
  try {
    if (testCommand) {
      const json = readFreshJson(report, childStarted);
      const assertions = json.testResults.flatMap((test) => test.assertionResults);
      const required =
        label === "testkit"
          ? ["consecutive physical groups", "custom purge-cut dropped-row", "known-failing Q89a"]
          : [];
      content =
        content &&
        json.startTime >= childStarted &&
        json.numTotalTests > 0 &&
        json.numPassedTests === json.numTotalTests &&
        json.numFailedTests === 0 &&
        json.numPendingTests === 0 &&
        (json.numTodoTests ?? 0) === 0 &&
        assertions.length === json.numTotalTests &&
        assertions.every((a) => a.status === "passed") &&
        required.every((name) => assertions.some((a) => a.fullName.includes(name)));
      detail = {
        total: json.numTotalTests,
        passed: json.numPassedTests,
        required,
        reportSha256: sha(fs.readFileSync(report)),
      };
    } else if (label === "typecheck")
      content = content && !result.stdout.trim() && !result.stderr.trim();
    else if (label === "build") {
      distribution = hashFiles(distFiles());
      content =
        content &&
        fs.statSync("packages/testkit/dist/index.js").mtimeMs >= childStarted &&
        fs.existsSync("packages/testkit/dist/route-history-grammar.d.ts");
      detail = { distribution };
    }
  } catch (error) {
    content = false;
    detail = String(error);
  }
  results.push({
    label,
    command: [command[0], ...args],
    cwd,
    started: childStarted,
    status: result.status,
    signal: result.signal,
    content,
    detail,
  });
}
const coverage = fs.existsSync(path.join(out, "coverage.json"))
  ? JSON.parse(fs.readFileSync(path.join(out, "coverage.json"), "utf8"))
  : null;
let coverageContent = false;
try {
  const fresh = readFreshJson(
    path.join(out, "coverage.json"),
    results.find((r) => r.label === "coverage").started,
  );
  coverageContent =
    fresh.attemptToken === token &&
    fresh.records.length === 5 &&
    fresh.records.every(
      (c, i) =>
        c.seed === [1, 42, 890, 89, 891][i] &&
        c.complete &&
        !c.missing.length &&
        c.binding === "exact-execution-plan" &&
        Object.values(c.kinds).every((n) => n > 0) &&
        Object.values(c.cuts).every(Boolean) &&
        Object.values(c.actualObservations).every((v) => v.answers > 0) &&
        c.retentionBoundaries.every(
          (cut) =>
            cut.requested &&
            c.events.some(
              (e) =>
                e.context.routes?.includes(cut.route) &&
                e.context.cutId === cut.id &&
                e.context.horizon === cut.horizon &&
                e.outcome.retirement?.horizon === cut.horizon &&
                e.outcome.retirement.pinned === cut.pinned,
            ),
        ),
    ) &&
    fresh.retentionProbe.cleanViolations === 0 &&
    fresh.retentionProbe.correctRouteViolations === 0 &&
    fresh.retentionProbe.caughtHE1 > 0 &&
    fresh.retentionProbe.caughtHE2 > 0 &&
    fresh.retentionProbe.missingCutsRejected;
} catch {
  coverageContent = false;
}
const distributionStillMatches =
  distribution !== null && JSON.stringify(distribution) === JSON.stringify(hashFiles(distFiles()));
const admissionStillMatches = sameAdmission(admission);
const sourceStillMatches = JSON.stringify(before) === JSON.stringify(hashes());
const receipt = {
  experiment: "EXP-RQ01-round3",
  started,
  attemptToken: token,
  admission,
  admissionStillMatches,
  distributionStillMatches,
  coverageContent,
  at: new Date().toISOString(),
  head: spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).stdout.trim(),
  seeds: [1, 42, 890, 89, 891],
  reference: "offline-fold-not-independent",
  source: before,
  sourceStillMatches,
  results,
  coverage,
  passed:
    coverageContent &&
    sourceStillMatches &&
    distributionStillMatches &&
    admissionStillMatches &&
    results.every((r) => r.status === 0 && r.content),
};
fs.writeFileSync(path.join(out, "receipt.json"), JSON.stringify(receipt, null, 2) + "\n");
console.log(JSON.stringify({ out, passed: receipt.passed, results }));
process.exitCode = receipt.passed ? 0 : 1;
