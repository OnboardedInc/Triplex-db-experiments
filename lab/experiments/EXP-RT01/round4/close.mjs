import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
const dir = import.meta.dirname,
  root = path.resolve(dir, "../../../.."),
  experiment = path.dirname(dir);
const durable = "/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-RT01/round4";
const hash = (p) => createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const read = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const packages = process.argv[2],
  attempt = process.argv[3];
assert.match(packages, /^packages\d+$/);
assert.match(attempt, /^attempt\d+$/);
const gates = read(path.join(durable, packages, "execution.json")),
  repro = read(path.join(durable, attempt, "execution.json"));
assert.equal(gates.sourceUnchanged, true);
assert.equal(gates.phases.length, 25);
assert.equal(repro.sourceUnchanged, true);
assert.equal(repro.error, null);
assert.equal(repro.phases.length, 4);
for (const phase of gates.phases) {
  assert.equal(phase.exit, 0, JSON.stringify(phase));
  assert.equal(hash(path.join(durable, packages, phase.file)), phase.sha256);
}
for (const [file, digest] of Object.entries(gates.sourceAfter))
  assert.equal(hash(path.join(root, file)), digest, file);
for (const [file, digest] of Object.entries(repro.after))
  assert.equal(hash(path.join(root, file)), digest, file);
assert.equal(gates.runnerUnchanged, true);
assert.equal(hash(path.join(dir, "run-packages.mjs")), gates.runnerSha256);
for (const phase of repro.phases) {
  assert.equal(phase.exit, 0);
  for (const kind of ["stdout", "stderr"])
    assert.equal(
      hash(path.join(durable, attempt, phase.name + "." + kind)),
      phase[kind + "Sha256"],
    );
}
const tests = {};
for (const pkg of ["core", "testkit", "xtdb", "qlever", "sqlite", "postgres", "cloudflare"]) {
  const log = fs.readFileSync(path.join(durable, packages, pkg + "-tests.txt"), "utf8");
  const count = Number(/Tests\s+(\d+) passed/.exec(log)?.[1]);
  assert.ok(count > 0, pkg);
  tests[pkg] = count;
}
assert.equal(tests.core, 864);
assert.equal(tests.testkit, 96);
assert.equal(tests.xtdb, 79);
assert.equal(tests.qlever, 39);
// [EXP-RT01] Why: judge complete observed records, not merely successful probes. Rejected: promoting a clock-filtered empty page or a receipt without its decoded content.
for (const encoding of ["a0", "compact"]) {
  const r = read(path.join(durable, attempt, encoding + "-observed.json"));
  assert.equal(r.before.transactions.length, 1);
  const first = r.before.transactions[0];
  assert.equal(first.txId, r.receipt.txId);
  assert.equal(first.position, r.receipt.position);
  assert.ok(first.changes.length > 0);
  for (const name of ["after", "restored", "original"]) assert.deepEqual(r[name], r.before);
  assert.deepEqual(r.aheadBehind, r.ahead);
  assert.equal(r.ahead.transactions[0].txId, r.future.txId);
  assert.deepEqual(r.continuation.transactions, r.before.transactions);
  assert.deepEqual(r.behind.transaction, first);
  assert.deepEqual(r.behind.command, first);
  assert.deepEqual(r.behind.feed.transactions, r.before.transactions);
  const calls = read(path.join(durable, attempt, encoding + "-sql.json"));
  assert.ok(calls.some((c) => c.sql?.includes("recorded_position")));
  assert.ok(!calls.some((c) => /valid_from\s*<=/.test(c.sql ?? "")));
}
for (const [name, count] of [
  ["matrix", 510],
  ["pending", 80],
]) {
  const rows = read(path.join(durable, attempt, name, "observations.json"));
  assert.equal(rows.length, count);
  assert.ok(rows.every((row) => row.matches));
}
const proofs = read(path.join(durable, attempt, "pending-proof/summary.json"));
assert.equal(proofs.length, 4);
for (const proof of proofs) {
  assert.deepEqual(proof.before, { error: { tag: "BasisNotAvailable", axis: "recordedAt" } });
  assert.ok(proof.elapsed >= 1900);
  assert.equal(proof.afterRows, 1);
}
const pinDrift = [];
const walk = (v, location = "") => {
  if (Array.isArray(v)) v.forEach((x, i) => walk(x, location + "/" + i));
  else if (v && typeof v === "object") {
    if (
      typeof v.path === "string" &&
      typeof v.sha256 === "string" &&
      fs.existsSync(path.join(root, v.path))
    ) {
      const actual = hash(path.join(root, v.path));
      if (actual !== v.sha256)
        pinDrift.push({ location, path: v.path, old: v.sha256, new: actual });
    }
    for (const [k, x] of Object.entries(v)) walk(x, location + "/" + k);
  }
};
walk(read(path.join(root, "lab/acceptance/obligations.json")));
assert.equal(pinDrift.length, 3);
assert.ok(pinDrift.every((p) => p.path === "packages/testkit/src/index.ts"));
const delta = execFileSync(
  "git",
  ["diff", "26772e42", "--", "lab/acceptance", "lab/oracles/replay"],
  { cwd: root, encoding: "utf8" },
);
assert.equal(delta, "");
const result = {
  observedAt: new Date().toISOString(),
  sourceParent: gates.head,
  context: "offline-no-engine",
  packageSourceAndBuildBytesMatch: true,
  tests,
  journalClockEncodings: ["a0", "compact"],
  matrix: 510,
  pending: 80,
  pendingProofs: 4,
  pinDrift,
  acceptanceAndOracleDelta: delta,
  liveG2G6Qualified: false,
  independentReview: false,
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
for (const p of files)
  assert.equal(
    hash(p),
    fs
      .readFileSync(path.join(dir, "DURABLE-SHA256SUMS"), "utf8")
      .split("\n")
      .find((l) => l.endsWith("  " + p))
      .slice(0, 64),
  );
fs.writeFileSync(
  path.join(dir, "DURABLE-INDEX.json"),
  JSON.stringify(
    {
      root: durable,
      files: files.length,
      bytes: files.reduce((n, p) => n + fs.statSync(p).size, 0),
      attempts: fs.readdirSync(durable).sort(),
      adopted: [packages, attempt],
      retention: "All first failures retained; no raw output committed",
    },
    null,
    2,
  ) + "\n",
);
console.log(JSON.stringify(result));
