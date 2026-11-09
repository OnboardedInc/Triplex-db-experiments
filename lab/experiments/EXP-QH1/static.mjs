// [EXP-QH1] Why: a retained script proves these checks actually executed; subprocess stdin is closed.
// Rejected: passing a heredoc through run.mjs (its child correctly receives no stdin).
import { execFileSync } from "node:child_process";
const run = (cmd, args) => execFileSync(cmd, args, { stdio: "inherit" });
run("node", ["lab/experiments/EXP-QH1/pin-audit.mjs"]);
run("shasum", ["-a", "256", "-c", "lab/acceptance/pins/O-REPLAY-0.4.9-SHA256SUMS"]);
run("git", ["diff", "--check"]);
run("node_modules/.bin/oxlint", [
  "packages/core/src/ValueDomain.ts",
  "packages/core/src/storage/StorageAdapter.ts",
  "packages/core/src/store/TriplesLive.ts",
  "packages/qlever/src/broker",
  "packages/qlever/src/index.ts",
  "lab/verify/QH1",
  "lab/experiments/EXP-QH1",
  "lab/bench/lib/broker-h1.ts",
  "--deny-warnings",
]);
run("node_modules/.bin/oxfmt", [
  "--check",
  "packages/core/src/ValueDomain.ts",
  "packages/core/src/runtime/index.ts",
  "packages/core/src/storage/StorageAdapter.ts",
  "packages/qlever/src/broker/BrokerStorageAdapter.ts",
  "packages/qlever/src/broker/broker.ts",
  "packages/qlever/src/broker/h1.ts",
  "packages/qlever/src/broker/log.ts",
  "packages/qlever/src/broker/sqlite-worker.ts",
  "packages/qlever/src/index.ts",
  "lab/bench/lib/broker-h1.ts",
  "lab/verify/QH1",
  ...[
    "run",
    "baseline-then",
    "candidate-then",
    "migrate-fixture",
    "mutants",
    "pin-audit",
    "summarize",
    "static",
  ].map((name) => "lab/experiments/EXP-QH1/" + name + ".mjs"),
  "lab/experiments/EXP-QH1/bench.ts",
]);
