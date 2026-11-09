import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
const root = path.resolve(import.meta.dirname, "../../../.."),
  dest = import.meta.dirname,
  raw = "/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-RT01/round6";
const hash = (p) => createHash("sha256").update(fs.readFileSync(p)).digest("hex"),
  json = (p) => JSON.parse(fs.readFileSync(path.join(raw, p), "utf8"));
const usedSources = (map, predicate) => {
  for (const [p, h] of Object.entries(map))
    if (predicate(p)) assert.equal(hash(path.join(root, p)), h, p);
};
// [EXP-RT01] Why: adopt only current executed product/matrix/model bytes and exact assertions; preserve the occupied admission as NOT_RUN. Rejected: treating a planned live runner or the earlier guard's G2 as qualification of this source.
const product = json("offline/attempt1/execution.json");
assert.equal(product.phases.length, 25);
assert.equal(product.sourceUnchanged, true);
assert.equal(product.runnerUnchanged, true);
assert.ok(product.phases.every((p) => p.exit === 0));
usedSources(product.sourceAfter, () => true);
let total = 0;
for (const [pkg, n] of Object.entries({
  core: 864,
  testkit: 96,
  xtdb: 95,
  qlever: 39,
  sqlite: 6,
  postgres: 2,
  cloudflare: 10,
})) {
  const text = fs.readFileSync(path.join(raw, `offline/attempt1/${pkg}-tests.txt`), "utf8");
  assert.match(text, new RegExp(`Tests\\s+${n} passed`));
  total += n;
}
assert.equal(total, 1112);
for (const p of product.phases)
  assert.equal(hash(path.join(raw, "offline/attempt1", p.file)), p.sha256);
const matrix = json("reproductions/attempt1/execution.json");
assert.equal(matrix.sourceUnchanged, true);
assert.equal(matrix.error, null);
assert.ok(matrix.phases.every((p) => p.exit === 0));
usedSources(
  matrix.after,
  (p) =>
    p.startsWith("packages/") ||
    p === "pnpm-lock.yaml" ||
    p.includes("round6/reproductions/") ||
    p.endsWith("round6/run-reproductions.mjs"),
);
for (const [folder, n] of [
  ["matrix", 510],
  ["pending", 80],
]) {
  const rows = json(`reproductions/attempt1/${folder}/observations.json`);
  assert.equal(rows.length, n);
  assert.ok(rows.every((r) => r.matches));
}
const proofs = json("reproductions/attempt1/pending-proof/summary.json");
assert.equal(proofs.length, 4);
for (const p of proofs) {
  assert.deepEqual(p.before, { error: { tag: "BasisNotAvailable", axis: "recordedAt" } });
  assert.ok(p.elapsed >= 1900);
  assert.equal(p.afterRows, 1);
  assert.equal(p.receiptInstant, 1000.001);
}
const extras = json("extras1/execution.json");
assert.equal(extras.sourceUnchanged, true);
assert.deepEqual(
  extras.phases.map((p) => [p.name, p.exit]),
  [
    ["reproductions", 0],
    ["guard-plan", 1],
  ],
);
assert.equal(
  hash(path.join(raw, "extras1/guard-plan-source.ts")),
  extras.before["lab/experiments/EXP-RT01/round6/guard-plan.ts"],
);
const modelRun = json("plan2/execution.json"),
  model = json("plan2/plan.json");
assert.equal(modelRun.exit, 0);
assert.equal(modelRun.sourceUnchanged, true);
assert.equal(hash(path.join(raw, "plan2/plan.json")), modelRun.planSha256);
usedSources(
  modelRun.after,
  (p) =>
    p.startsWith("packages/") ||
    p === "pnpm-lock.yaml" ||
    p.endsWith("guard-plan.ts") ||
    p.endsWith("run-plan.mjs"),
);
assert.equal(model.cases.length, 8);
for (const c of model.cases) {
  assert.equal(c.before.positionVisits, c.modelScopeRows);
  assert.equal(c.before.stampVisits, c.modelScopeRows);
  assert.equal(c.after.positionVisits, c.modelScopeRows);
  assert.equal(c.after.stampVisits, Math.min(c.modelScopeRows, 1));
  assert.equal(c.before.allowed, 1);
  assert.equal(c.after.allowed, 1);
  assert.ok(c.after.plan.some((r) => String(r.detail).includes("(_id=?)")));
}
assert.equal(model.after.a0.statementCount, 6);
assert.equal(model.after.compact.statementCount, 5);
const admission = json("admission1/decision.json");
assert.equal(admission.up, null);
assert.equal(admission.reason, "exclusive reservation occupied");
assert.equal(admission.freeBytes, 13253419008);
assert.deepEqual(admission.inspections, []);
const reservations = admission.pool.reservations.filter((r) => r.holder === "CX-G03-V");
assert.equal(reservations.length, 2);
assert.deepEqual(reservations.map((r) => r.container).sort(), [
  "tx2-g03-f6d8ea5cba52162f-V3-observer",
  "tx2-g03-f6d8ea5cba52162f-V3-writer",
]);
assert.ok(
  reservations.every(
    (r) =>
      r.slot === undefined &&
      r.state === "starting" &&
      r.cleanupRequired &&
      r.memBytes === 134217728,
  ),
);
for (const [name, r] of [
  ["status", admission.status],
  ["disk", admission.disk],
]) {
  assert.equal(r.exit, 0);
  assert.equal(fs.readFileSync(path.join(raw, `admission1/${name}.stdout`), "utf8"), r.stdout);
  assert.equal(fs.readFileSync(path.join(raw, `admission1/${name}.stderr`), "utf8"), r.stderr);
}
assert.ok(!fs.existsSync(path.join(raw, "g2-attempt1")));
assert.ok(!fs.existsSync(path.join(raw, "g6-attempt1")));
assert.ok(!fs.existsSync(path.join(raw, "owner-start.json")));
assert.ok(!fs.existsSync(path.join(raw, "cleanup.json")));
const pins = json("pins1/inventory.json");
assert.equal(pins.main, "bb36862daf55b4f46a3cbf763f757c6341de4575");
assert.equal(pins.mainContractVersion, "0.3.13");
const changedPins = pins.paths.filter((p) => p.classification === "RT01-change");
assert.deepEqual(
  changedPins.map((p) => p.path),
  ["packages/testkit/src/index.ts"],
);
assert.equal(hash(path.join(root, changedPins[0].path)), changedPins[0].branchSha256);
assert.equal(
  execFileSync("git", ["diff", pins.fork, "--", "lab/acceptance", "lab/oracles/replay"], {
    cwd: root,
    encoding: "utf8",
  }),
  "",
);
const productChanges = [
  "packages/xtdb/src/XtdbStorageAdapter.ts",
  "packages/xtdb/test/fixtures/record-time-client.ts",
  "packages/xtdb/test/record-time-offline.test.ts",
  "packages/xtdb/test/marker-stamp.test.ts",
].map((p) => {
  const old = spawnSync("git", ["show", `HEAD:${p}`], { cwd: root });
  return {
    path: p,
    oldSha256: old.status === 0 ? createHash("sha256").update(old.stdout).digest("hex") : null,
    newSha256: hash(path.join(root, p)),
    pinned: pins.paths.some((v) => v.path === p),
  };
});
assert.ok(productChanges.every((c) => !c.pinned));
for (const p of fs.readdirSync(dest).filter((p) => p.endsWith(".mjs"))) {
  const r = spawnSync(process.execPath, ["--check", path.join(dest, p)], { encoding: "utf8" });
  assert.equal(r.status, 0, p + " " + r.stderr);
}
const result = {
  schema: "rt01-round6/1",
  parentHead: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
  node: process.version,
  sealedAt: new Date().toISOString(),
  offline: {
    productPhases: 25,
    productTests: total,
    skippedIntegrations: 116,
    readMatrix: 510,
    pendingMatrix: 80,
    publicationProofs: 4,
    journalClockEncodings: 2,
    guardPlanModelCases: 8,
  },
  cause: {
    extraAggregate: "CONFIRMED_FROM_CAPTURED_SQL",
    modelStampVisits: "N -> min(N,1)",
    nativeHistoricalRows: "NOT_VERIFIED",
    completeLatencyAttribution: "NOT_PROVEN",
  },
  live: {
    status: "NOT_RUN_G03_VM_WINDOW",
    checkedAt: admission.at,
    holders: reservations.map((r) => ({
      container: r.container,
      holder: r.holder,
      pid: r.pid,
      state: r.state,
    })),
    s1EngineExclusiveObserved: false,
    resourcesAcquired: false,
    cleanupCommandsRun: false,
    newG2Qualified: false,
    newG6Qualified: false,
  },
  productChanges,
  changedPins,
  independentReview: false,
  sealSha256: hash(import.meta.filename),
};
fs.writeFileSync(path.join(dest, "RESULT.json"), JSON.stringify(result, null, 2) + "\n");
console.log(
  JSON.stringify({
    productTests: total,
    readMatrix: 510,
    pendingMatrix: 80,
    live: result.live.status,
  }),
);
