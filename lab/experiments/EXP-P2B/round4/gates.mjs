// [EXP-P2B-R4] Why: completed gate status requires fresh semantic test output and unchanged actual source/dependency bytes.
// Rejected: adopting a prior exit code or a report from a different checkout.
import fs from "node:fs";
import path from "node:path";
import { spawnSync, execFileSync } from "node:child_process";
import { randomUUID, createHash } from "node:crypto";
import { createRequire } from "node:module";
const out = path.join(
  "/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-P2B/round4",
  `gates-${randomUUID()}`,
);
fs.mkdirSync(out);
const files = execFileSync(
  "rg",
  [
    "--files",
    "packages/core/src",
    "packages/core/dist",
    "packages/testkit/src",
    "packages/testkit/dist",
    "packages/broker/src",
    "packages/broker/test",
    "packages/xtdb/src",
    "packages/xtdb/test",
    "packages/qlever/src",
    "packages/qlever/test",
    "lab/verify/P2B",
    "lab/experiments/EXP-P2B/round4",
  ],
  { encoding: "utf8" },
)
  .trim()
  .split("\n");
// [EXP-P2B-R4] Why: declarations/maps are rebuilt outputs; declaration union ordering can vary while runtime bytes and source stay identical.
// Rejected: accepting changed runtime JS or weakening source/native identity checks.
for (let i = files.length - 1; i >= 0; i--)
  if (files[i].includes("/dist/") && !files[i].endsWith(".js")) files.splice(i, 1);
files.push(
  "pnpm-lock.yaml",
  "lab/experiments/EXP-P2B/gates.mjs",
  "packages/broker/tsconfig.json",
  "packages/broker/tsdown.config.ts",
);
const req = createRequire(path.resolve("packages/broker/package.json"));
const binaries = [
  process.execPath,
  req.resolve("better-sqlite3/build/Release/better_sqlite3.node"),
];
const hash = (file) => createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const identities = () => Object.fromEntries([...files, ...binaries].map((f) => [f, hash(f)]));
const before = identities();
fs.writeFileSync(path.join(out, "inputs-before.json"), JSON.stringify(before, null, 2));
for (const file of files) {
  const to = path.join(out, "preimages", file);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(file, to);
}
const stages = [
  ["upstream", ["lab/experiments/EXP-P2B/gates.mjs"], [24, 48, 81]],
  [
    "regressions",
    [
      "node_modules/vitest/vitest.mjs",
      "run",
      "--config",
      "lab/experiments/EXP-P2B/round4/vitest.config.mjs",
    ],
    [9],
  ],
];
const results = [];
for (const [name, args, counts] of stages) {
  const log = path.join(out, `${name}.log`),
    fd = fs.openSync(log, "wx");
  const priorAttempts = new Set(fs.readdirSync(path.dirname(out)));
  const child = spawnSync(process.execPath, args, { stdio: ["ignore", fd, fd] });
  fs.closeSync(fd);
  const text = fs
    .readFileSync(log, "utf8")
    .replace(new RegExp(String.fromCharCode(27) + "\\[[0-9;]*m", "g"), "");
  const observed = [...text.matchAll(/Tests\s+(\d+) passed/g)].map((x) => Number(x[1]));
  const valid =
    child.status === 0 &&
    JSON.stringify(observed) === JSON.stringify(counts) &&
    !text.includes("Unhandled Errors");
  const observations =
    name === "regressions"
      ? fs
          .readdirSync(path.dirname(out))
          .filter((n) => n.startsWith("review-") && !priorAttempts.has(n))
          .map((n) => path.join(path.dirname(out), n, "observations.json"))
      : [];
  const boundObservations =
    name !== "regressions" ||
    (observations.length === 1 &&
      (() => {
        const data = JSON.parse(fs.readFileSync(observations[0], "utf8"));
        return (
          data.attempt === path.basename(path.dirname(observations[0])) &&
          data.fixtureSha256 === hash("lab/verify/P2B/review.test.ts") &&
          data.observations.length === 7
        );
      })());
  results.push({
    name,
    args,
    status: child.status,
    counts: observed,
    valid: valid && boundObservations,
    observations,
    logSha256: hash(log),
  });
  if (!valid || !boundObservations) break;
}
const after = identities(),
  unchanged = JSON.stringify(before) === JSON.stringify(after);
fs.writeFileSync(path.join(out, "inputs-after.json"), JSON.stringify(after, null, 2));
const result = {
  out,
  node: process.version,
  head: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  results,
  unchanged,
  executionComplete: unchanged && results.length === 2 && results.every((r) => r.valid),
};
fs.writeFileSync(path.join(out, "result.json"), JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify(result));
if (!result.executionComplete) process.exitCode = 1;
