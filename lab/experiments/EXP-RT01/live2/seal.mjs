import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
const root = path.resolve(import.meta.dirname, "../../../.."),
  raw = "/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-RT01/live2",
  dest = import.meta.dirname;
const sha = (b) => createHash("sha256").update(b).digest("hex"),
  hash = (p) => sha(fs.readFileSync(p)),
  read = (p) => JSON.parse(fs.readFileSync(path.join(raw, p), "utf8"));
const checkSources = (map) => {
  for (const [p, h] of Object.entries(map)) assert.equal(hash(path.join(root, p)), h, p);
};
// [EXP-RT01] Why: closure adopts assertion content, exact denominators, fresh source/build bindings and the first failed metric. Rejected: promoting process exit or a diagnostic completion flag into acceptance.
const offline = read("offline/attempt1/execution.json"),
  budget = read("offline/testkit-budget1/execution.json");
assert.equal(offline.phases.length, 25);
assert.equal(offline.sourceUnchanged, true);
assert.equal(offline.runnerUnchanged, true);
checkSources(offline.sourceAfter);
assert.deepEqual(
  offline.phases.filter((p) => p.exit !== 0).map((p) => [p.pkg, p.phase]),
  [["testkit", "tests"]],
);
for (const p of offline.phases)
  assert.equal(hash(path.join(raw, "offline/attempt1", p.file)), p.sha256);
assert.ok(
  fs
    .readFileSync(path.join(raw, "offline/attempt1/testkit-tests.txt"), "utf8")
    .includes("Test timed out in 5000ms"),
);
assert.equal(budget.exit, 0);
assert.equal(budget.sourceUnchanged, true);
assert.equal(budget.runnerUnchanged, true);
checkSources(budget.sourceAfter);
assert.equal(hash(path.join(raw, "offline/testkit-budget1/tests.txt")), budget.logSha256);
assert.match(
  fs.readFileSync(path.join(raw, "offline/testkit-budget1/tests.txt"), "utf8"),
  /96 passed \(96\)/,
);
const expected = { core: 864, xtdb: 89, qlever: 39, sqlite: 6, postgres: 2, cloudflare: 10 };
let productTests = 96;
for (const [pkg, n] of Object.entries(expected)) {
  assert.match(
    fs.readFileSync(path.join(raw, `offline/attempt1/${pkg}-tests.txt`), "utf8"),
    new RegExp(`Tests\\s+${n} passed`),
  );
  productTests += n;
}
assert.equal(productTests, 1106);
const diag = read("diagnostic1/outcomes.json"),
  diagnosticRun = read("diagnostic1/execution.json");
assert.equal(diag.diagnostic, true);
assert.equal(diag.grantsAcceptance, false);
assert.equal(diag.failure, null);
assert.equal(diag.failures.length, 6);
assert.equal(diagnosticRun.sourceUnchanged, true);
assert.equal(
  hash(path.join(raw, "diagnostic1/g2-source.ts")),
  diagnosticRun.before["lab/experiments/EXP-RT01/live2/g2.ts"],
);
const g2 = read("g2-attempt1/execution.json"),
  outcomes = read("g2-attempt1/outcomes.json");
assert.equal(g2.sourceUnchanged, true);
checkSources(g2.after);
assert.equal(g2.live.exit, 0);
assert.equal(g2.phases.length, 6);
assert.ok(g2.phases.every((p) => p.exit === 0));
checkSources(g2.build);
assert.equal(outcomes.diagnostic, false);
assert.equal(outcomes.grantsAcceptance, true);
assert.deepEqual(outcomes.failures, []);
assert.equal(outcomes.failure, null);
const events = fs
  .readFileSync(path.join(raw, "g2-attempt1/progress.jsonl"), "utf8")
  .trim()
  .split("\n")
  .map(JSON.parse);
const count = (k) => events.filter((e) => e.kind === k).length;
assert.equal(count("case-pass"), 197);
assert.equal(count("route-pass"), 42);
assert.equal(count("schedule-pass"), 2);
assert.equal(count("determinism-pass"), 1);
assert.equal(count("query-error"), 0);
assert.equal(count("first-failure"), 0);
for (const encoding of ["a0", "compact"]) {
  assert.equal(
    events.filter((e) => e.kind === "case-pass" && e.phase === `conformance-${encoding}`).length,
    44,
  );
  assert.equal(
    events.filter((e) => e.kind === "case-pass" && e.phase === `T1-T12-${encoding}`).length,
    12,
  );
  assert.equal(
    new Set(
      events
        .filter((e) => e.kind === "route-pass" && e.phase === `named-routes-${encoding}`)
        .map((e) => e.name),
    ).size,
    21,
  );
}
const devents = fs
  .readFileSync(path.join(raw, "diagnostic1/progress.jsonl"), "utf8")
  .trim()
  .split("\n")
  .map(JSON.parse);
assert.ok(devents.find((e) => e.kind === "query-start").sql.includes("information_schema"));
assert.equal(devents.find((e) => e.kind === "query-end").rows, 0);
assert.ok(
  devents
    .find((e) => e.kind === "submit-start")
    .statements.some((s) => s.sql.includes("CREATE TABLE tx_meta")),
);
const baseline = read("baseline/identity.json");
assert.equal(baseline.commit, "59e07afb7a25dfb22bca60f8d769b74651aa835a");
assert.ok(baseline.phases.every((p) => p.exit === 0));
for (const [p, h] of Object.entries(baseline.files))
  assert.equal(hash(path.join(raw, "baseline", p)), h, p);
const g6 = read("g6-attempt1/execution.json"),
  rule = read("g6-attempt1/AA-RULE-BEFORE-B.json"),
  point = read("g6-attempt1/point-0-a0-10.json");
assert.equal(g6.sourceUnchanged, true);
assert.equal(g6.runnerUnchanged, true);
checkSources(g6.after);
for (const [p, h] of Object.entries(g6.runnerHashes)) assert.equal(hash(path.join(dest, p)), h, p);
assert.equal(g6.points.length, 1);
assert.equal(g6.calibration.length, 4);
assert.equal(point.history, 0);
assert.equal(point.encoding, "a0");
assert.equal(point.size, 10);
assert.equal(point.A.n, 150);
assert.equal(point.B.n, 150);
assert.match(g6.failure.error, /G6 regression AB:0:a0:10 p50/);
assert.equal(point.ruleSha256, hash(path.join(raw, "g6-attempt1/AA-RULE-BEFORE-B.json")));
for (const c of rule.calibration) {
  assert.equal(c.left.n, 150);
  assert.equal(c.right.n, 150);
  for (const k of ["p50", "p99"])
    assert.equal(c.tolerance[k], Math.max(c.left[k] / c.right[k], c.right[k] / c.left[k]) - 1);
}
const quantile = (xs, p) => [...xs].sort((a, b) => a - b)[Math.ceil(xs.length * p) - 1];
for (const arm of ["A", "B"]) {
  const blocks = point.blocks.filter((b) => b.arm === arm),
    samples = blocks.flatMap((b) => b.samples);
  assert.equal(samples.length, 150);
  for (const k of ["p50", "p99"])
    assert.equal(
      point[arm][k],
      quantile(
        samples.map((s) => s.ms),
        k === "p50" ? 0.5 : 0.99,
      ),
    );
  assert.deepEqual(
    blocks.map((b) => [b.before.logicalCommits, b.after.logicalCommits]),
    [
      [0, 75],
      [75, 150],
    ],
  );
  assert.equal(new Set(samples.map((s) => s.txId)).size, 150);
  for (const s of samples) {
    assert.equal(s.submits, 1);
    assert.equal(s.submittedStatements, 6);
    assert.equal(s.wireExecutions, s.wireReadyCycles);
    assert.equal(s.wireExecutions, arm === "B" && s.position === 1 ? 17 : 13);
  }
  for (const projection of ["position", "stamp", "both"])
    assert.equal(point.scans[arm].samples[projection].length, 30);
}
assert.ok(point.ratios.p50 > 1 + point.tolerance.p50);
assert.ok(point.ratios.p99 > 1 + point.tolerance.p99);
const gevents = fs
    .readFileSync(path.join(raw, "g6-attempt1/events.jsonl"), "utf8")
    .trim()
    .split("\n")
    .map(JSON.parse),
  frozen = gevents.findIndex((e) => e.kind === "rule-frozen"),
  firstB = gevents.findIndex((e) => e.kind === "sample" && e.arm === "B");
assert.ok(frozen >= 0 && firstB > frozen);
assert.equal(gevents.filter((e) => e.kind === "first-failure").length, 1);
assert.equal(gevents.filter((e) => e.stage.startsWith("AB:10000")).length, 0);
const start = read("engine-start.json")[0],
  end = read("engine-end.json")[0];
assert.equal(start.Id, end.Id);
assert.equal(end.State.OOMKilled, false);
assert.equal(end.State.Health.Status, "healthy");
assert.equal(start.HostConfig.Memory, 3758096384);
assert.equal(start.HostConfig.NanoCpus, 2000000000);
const cleanup = read("cleanup.json");
for (const k of [
  "ownerAbsent",
  "poolReservationAbsent",
  "poolRetainedVolumeAbsent",
  "containerAbsent",
  "volumeAbsent",
])
  assert.equal(cleanup[k], true, k);
for (const p of cleanup.phases) {
  for (const kind of ["stdout", "stderr"])
    assert.equal(hash(path.join(raw, `${p.name}.${kind}`)), p[`${kind}Sha256`]);
}
assert.ok(cleanup.phases.slice(0, 2).every((p) => p.exit === 0));
assert.equal(fs.readFileSync(path.join(raw, "docker-context.stdout"), "utf8").trim(), "colima");
assert.ok(Date.parse(cleanup.phases[0].started) > Date.parse(gevents.at(-1).at));
const pin = read("pins1/inventory.json");
assert.deepEqual(
  pin.paths.filter((p) => p.classification === "RT01-change").map((p) => p.path),
  ["packages/testkit/src/index.ts"],
);
checkSources(
  Object.fromEntries(pin.paths.filter((p) => p.branchSha256).map((p) => [p.path, p.branchSha256])),
);
assert.equal(
  execFileSync("git", ["diff", pin.fork, "--", "lab/acceptance", "lab/oracles/replay"], {
    cwd: root,
    encoding: "utf8",
  }),
  "",
);
const captured = JSON.parse(
  fs.readFileSync(path.join(root, "packages/xtdb/test/fixtures/bootstrap-live-error.json")),
);
assert.equal(hash(captured.source), captured.sha256);
const testPath = path.join(dest, "wire.test.mjs"),
  unitBefore = hash(testPath),
  wireBefore = hash(path.join(dest, "wire.mjs"));
const unit = spawnSync(process.execPath, ["--test", testPath], {
  encoding: "utf8",
  timeout: 10000,
});
fs.writeFileSync(path.join(raw, "wire-unit-bound.txt"), (unit.stdout ?? "") + (unit.stderr ?? ""));
assert.equal(unit.status, 0);
assert.match(unit.stdout, /# pass 1/);
assert.equal(hash(testPath), unitBefore);
assert.equal(hash(path.join(dest, "wire.mjs")), wireBefore);
const result = {
  schema: "rt01-live-round2/1",
  sealedAt: new Date().toISOString(),
  parentHead: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
  node: process.version,
  productTests,
  offlineSkipped: 116,
  diagnostic: { grantsAcceptance: false, orderedFailures: 6 },
  G2: {
    builderGate: "PASS",
    caseAssertions: 197,
    sharedCases: 88,
    availableRoutes: 42,
    schedules: 24,
    independentReview: false,
  },
  G6: {
    verdict: "FAIL_REGRESSION",
    firstFailure: g6.failure,
    point: { A: point.A, B: point.B, ratios: point.ratios, tolerance: point.tolerance },
    laterPoints: "NOT_RUN_STOP_FIRST_FAILURE",
    history10k: false,
  },
  engine: {
    id: start.Id,
    image: start.Image,
    memory: start.HostConfig.Memory,
    cpu: start.HostConfig.NanoCpus,
  },
  cleanup: "VERIFIED_OWN_RESOURCES_REMOVED",
  stalePin: pin.paths.find((p) => p.classification === "RT01-change"),
  sealSha256: hash(import.meta.filename),
  unit: {
    testSha256: unitBefore,
    counterSha256: wireBefore,
    logSha256: hash(path.join(raw, "wire-unit-bound.txt")),
  },
  livePromotion: false,
};
fs.writeFileSync(path.join(dest, "RESULT.json"), JSON.stringify(result, null, 2) + "\n");
const files = [];
function visit(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) visit(p);
    else if (e.isFile())
      files.push({ path: path.relative(raw, p), bytes: fs.statSync(p).size, sha256: hash(p) });
  }
}
visit(raw);
files.sort((a, b) => a.path.localeCompare(b.path));
fs.writeFileSync(
  path.join(dest, "DURABLE-INDEX.json"),
  JSON.stringify(
    {
      root: raw,
      files: files.length,
      bytes: files.reduce((n, f) => n + f.bytes, 0),
      entries: files,
    },
    null,
    2,
  ) + "\n",
);
fs.writeFileSync(
  path.join(dest, "DURABLE-SHA256SUMS"),
  files.map((f) => `${f.sha256}  ${f.path}\n`).join(""),
);
console.log(
  JSON.stringify({
    productTests,
    G2: result.G2.builderGate,
    G6: result.G6.verdict,
    files: files.length,
    bytes: files.reduce((n, f) => n + f.bytes, 0),
  }),
);
