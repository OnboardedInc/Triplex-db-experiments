import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
const dir = import.meta.dirname,
  root = path.resolve(dir, "../../../.."),
  experiment = path.dirname(dir),
  durable = "/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-RT01/live-window";
const hash = (p) => createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const read = (p) => JSON.parse(fs.readFileSync(path.join(durable, p), "utf8"));
const run = read("g2-attempt1/execution.json"),
  observation = read("g2-attempt1/outcomes.json"),
  owner = read("owner-start.json"),
  start = read("engine-start-inspect.json")[0],
  failureEngine = read("engine-failure-inspect.stdout")[0],
  cleanup = read("cleanup-verification.json"),
  pool = read("pool-post-cleanup.json"),
  state = read("post-cleanup-state.json");
// [EXP-RT01] Why: qualify the actual first failure and exact cleanup, not the intended suite or a process-only success. Rejected: promoting compiled tests or unrun performance arms to PASS.
assert.equal(run.phases.length, 6);
for (const phase of run.phases) {
  assert.equal(phase.exit, 0);
  assert.equal(hash(path.join(durable, "g2-attempt1", phase.file)), phase.sha256);
}
assert.equal(run.live.exit, 1);
assert.equal(run.sourceUnchanged, true);
for (const [p, h] of Object.entries(run.before)) {
  assert.equal(run.after[p], h, p);
  assert.equal(hash(path.join(root, p)), h, p);
}
for (const [p, h] of Object.entries(run.build)) assert.equal(hash(path.join(root, p)), h, p);
for (const kind of ["stdout", "stderr"])
  assert.equal(hash(path.join(durable, "g2-attempt1/live." + kind)), run.live[kind + "Sha256"]);
assert.equal(owner.holder, "CX-RT01");
assert.equal(owner.slot, "s1");
assert.equal(owner.lane, "xtdb");
assert.deepEqual(observation.owner, owner);
assert.equal(start.Id, failureEngine.Id);
assert.equal(start.Image, failureEngine.Image);
assert.equal(start.Config.Labels["tx2.holder"], owner.holder);
assert.equal(start.HostConfig.Memory, 3758096384);
assert.equal(start.HostConfig.NanoCpus, 2000000000);
assert.equal(failureEngine.State.Running, true);
assert.equal(failureEngine.State.OOMKilled, false);
assert.equal(failureEngine.State.Health.Status, "healthy");
assert.equal(observation.outcomes.length, 0);
assert.equal(observation.failure.phase, "timeout-diagnosis");
assert.match(observation.failure.error, /Cannot initialize XTDB tables/);
const trace = fs
  .readFileSync(path.join(durable, "g2-attempt1/progress.jsonl"), "utf8")
  .trim()
  .split("\n")
  .map(JSON.parse);
const queries = trace.filter((e) => e.kind === "query-start"),
  errors = trace.filter((e) => e.kind === "query-error");
assert.equal(queries.length, 2);
assert.equal(errors.length, 2);
assert.equal(
  queries[0].sql,
  "SELECT position, stamp FROM tx_meta FOR ALL VALID_TIME WHERE scope_key = ?",
);
assert.match(errors[0].error, /Table not found: tx_meta/);
assert.equal(queries[1].sql, "SELECT position FROM tx_meta FOR ALL VALID_TIME WHERE scope_key = ?");
assert.match(errors[1].error, /Table not found: tx_meta/);
assert.ok(errors[0].ms < 30000);
assert.equal(trace.filter((e) => e.kind === "submit-start").length, 0);
assert.equal(trace.filter((e) => /-(pass)$/.test(e.kind)).length, 0);
assert.equal(hash(path.join(durable, "cleanup.json")), cleanup.originalCleanupSha256);
assert.equal(hash(path.join(durable, "cleanup-original.mjs")), cleanup.originalRunnerSha256);
assert.equal(hash(path.join(dir, "verify-cleanup.mjs")), cleanup.verifierSha256);
assert.ok(
  cleanup.retainedOriginalFalseNegative &&
    cleanup.containerAbsentAtCleanup &&
    cleanup.volumeAbsentAtCleanup &&
    cleanup.slotReleasedAtCleanup &&
    cleanup.fstrimCompleted &&
    cleanup.dockerContextCommandCompleted &&
    cleanup.noLifecycleRetried,
);
assert.equal(state.owner, null);
assert.ok(state.ourReservationAbsent && state.ourRetainedVolumeAbsent);
assert.ok(!pool.reservations.some((r) => r.container === "tx2-xtdb-s1"));
assert.ok(!(pool.retainedVolumes ?? []).some((r) => r.volume === "tx2-xtdb-s1-data"));
assert.equal(
  execFileSync(
    "git",
    ["diff", run.head, "--", "packages", "lab/acceptance", "lab/oracles/replay"],
    { cwd: root, encoding: "utf8" },
  ).trim(),
  "",
);
const result = {
  observedAt: new Date().toISOString(),
  sourceHead: run.head,
  sourceAndBuildBytesMatch: true,
  slot: "xtdb-s1",
  holder: owner.holder,
  engineId: start.Id,
  image: start.Image,
  configSha256: start.Config.Labels["tx2.config-sha256"],
  buildPhases: 6,
  G2: "BLOCKED_FRESH_DATABASE_INITIALIZATION",
  G6: "NOT_RUN_FIRST_NON_TIMEOUT_STOP_POLICY",
  completedConformanceCases: 0,
  queryCalls: 2,
  compatibilityFallbackMs: errors[1].ms,
  applicationSubmits: 0,
  firstQueryMs: errors[0].ms,
  failure: observation.failure,
  priorTimeoutCauseUnresolved: true,
  liveQualified: false,
  performanceQualified: false,
  cleanupVerified: true,
  originalCleanupFalseNegativeRetained: true,
};
fs.writeFileSync(path.join(dir, "RESULT.json"), JSON.stringify(result, null, 2) + "\n");
const files = [];
const visit = (p) => {
  for (const item of fs.readdirSync(p, { withFileTypes: true })) {
    const f = path.join(p, item.name);
    if (item.isDirectory()) visit(f);
    else files.push(f);
  }
};
visit(durable);
files.sort();
fs.writeFileSync(
  path.join(dir, "DURABLE-SHA256SUMS"),
  files.map((p) => `${hash(p)}  ${p}`).join("\n") + "\n",
);
fs.writeFileSync(
  path.join(dir, "DURABLE-INDEX.json"),
  JSON.stringify(
    {
      root: durable,
      files: files.length,
      bytes: files.reduce((n, p) => n + fs.statSync(p).size, 0),
      attempt: "g2-attempt1",
      status: result.G2,
      retention:
        "First initialization failure, engine logs/identity and original failed cleanup checker retained; no G6 or successful live qualification",
    },
    null,
    2,
  ) + "\n",
);
const listed = [
  ...new Set(
    execFileSync("git", ["ls-files", "-co", "--exclude-standard", "lab/experiments/EXP-RT01"], {
      cwd: root,
      encoding: "utf8",
    })
      .trim()
      .split("\n"),
  ),
]
  .filter(Boolean)
  .sort();
const sums = (base, items) =>
  fs.writeFileSync(
    path.join(base, "SHA256SUMS"),
    items
      .map((p) => `${hash(path.join(root, p))}  ${path.relative(base, path.join(root, p))}`)
      .join("\n") + "\n",
  );
for (const p of listed) assert.ok(fs.statSync(path.join(root, p)).size <= 1000000, p);
sums(
  dir,
  listed.filter(
    (p) => p.startsWith("lab/experiments/EXP-RT01/live/") && !p.endsWith("/SHA256SUMS"),
  ),
);
sums(
  experiment,
  [...new Set([...listed, "lab/experiments/EXP-RT01/live/SHA256SUMS"])]
    .filter((p) => p !== "lab/experiments/EXP-RT01/SHA256SUMS")
    .sort(),
);
let checked = 0;
for (const [base, name] of [
  [dir, "SHA256SUMS"],
  [dir, "DURABLE-SHA256SUMS"],
  [experiment, "SHA256SUMS"],
])
  for (const line of fs.readFileSync(path.join(base, name), "utf8").trim().split("\n")) {
    const [h, p] = line.split("  ");
    assert.equal(hash(path.resolve(base, p)), h, p);
    checked++;
  }
console.log(
  JSON.stringify({
    G2: result.G2,
    G6: result.G6,
    cleanupVerified: true,
    manifestEntriesVerified: checked,
  }),
);
