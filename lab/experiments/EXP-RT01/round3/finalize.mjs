import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
const dir = import.meta.dirname,
  root = path.resolve(dir, "../../../.."),
  experiment = path.dirname(dir);
const durable = "/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-RT01/round3";
const read = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const hash = (p) => createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const packages = process.argv[2] ?? "packages3",
  attempt = process.argv[3] ?? "attempt1";
const gates = read(path.join(durable, packages, "execution.json")),
  repro = read(path.join(durable, attempt, "execution.json"));
assert.equal(gates.sourceUnchanged, true);
assert.equal(gates.phases.length, 14);
assert.equal(repro.sourceUnchanged, true);
assert.equal(repro.error, null);
for (const phase of gates.phases) {
  assert.equal(phase.exit, 0);
  assert.equal(hash(path.join(durable, packages, phase.file)), phase.sha256);
}
for (const [file, expected] of Object.entries(gates.sourceAfter))
  assert.equal(hash(path.join(root, file)), expected, file);
for (const [file, expected] of Object.entries(repro.after))
  assert.equal(hash(path.join(root, file)), expected, file);
for (const phase of repro.phases) {
  assert.equal(phase.exit, 0);
  assert.equal(hash(path.join(durable, attempt, phase.name + ".stdout")), phase.stdoutSha256);
  assert.equal(hash(path.join(durable, attempt, phase.name + ".stderr")), phase.stderrSha256);
}
const tests = Object.fromEntries(
  ["core", "testkit", "xtdb", "qlever"].map((pkg) => [
    pkg,
    Number(
      /Tests\s+(\d+) passed/.exec(
        fs.readFileSync(path.join(durable, packages, pkg + "-tests.txt"), "utf8"),
      )?.[1],
    ),
  ]),
);
assert.equal(
  Object.values(tests).reduce((sum, n) => sum + n, 0),
  1074,
);
const summaries = {};
for (const [name, count] of [
  ["matrix", 510],
  ["pending", 80],
]) {
  const rows = read(path.join(durable, attempt, name, "observations.json"));
  assert.equal(rows.length, count);
  assert.ok(rows.every((row) => row.matches));
  summaries[name] = {
    observations: rows.length,
    matches: rows.filter((row) => row.matches).length,
  };
}
const proofs = read(path.join(durable, attempt, "pending-proof/summary.json"));
assert.equal(proofs.length, 4);
for (const proof of proofs) {
  assert.deepEqual(proof.before, { error: { tag: "BasisNotAvailable", axis: "recordedAt" } });
  assert.equal(proof.afterRows, 1);
}
const pinDrift = [];
const walk = (value, location = "") => {
  if (Array.isArray(value)) value.forEach((v, i) => walk(v, location + "/" + i));
  else if (value && typeof value === "object") {
    if (
      typeof value.path === "string" &&
      typeof value.sha256 === "string" &&
      fs.existsSync(path.join(root, value.path))
    ) {
      const actual = hash(path.join(root, value.path));
      if (actual !== value.sha256)
        pinDrift.push({ location, path: value.path, old: value.sha256, new: actual });
    }
    for (const [k, v] of Object.entries(value)) walk(v, location + "/" + k);
  }
};
walk(read(path.join(root, "lab/acceptance/obligations.json")));
assert.equal(pinDrift.length, 3);
assert.ok(pinDrift.every((pin) => pin.path === "packages/testkit/src/index.ts"));
const delta = execFileSync(
  "git",
  ["diff", "506cfaf2", "--name-only", "--", "lab/acceptance", "lab/oracles/replay"],
  { cwd: root, encoding: "utf8" },
);
assert.equal(delta, "");
// [EXP-RT01] Why: publish only content-checked fresh attempts bound to these exact bytes. Rejected: adopting command zero, historical PASS or a source-drifted attempt as acceptance.
const result = {
  observedAt: new Date().toISOString(),
  productHead: gates.head,
  sourceAndBuildBytesMatch: true,
  tests,
  summaries,
  pendingProofs: 4,
  pinDrift,
  acceptanceAndOracleDelta: delta,
  independentReview: false,
  liveG2G6Qualified: false,
};
fs.writeFileSync(path.join(dir, "RESULT.json"), JSON.stringify(result, null, 2) + "\n");
const files = [];
const visit = (p) => {
  for (const item of fs.readdirSync(p, { withFileTypes: true })) {
    const file = path.join(p, item.name);
    if (item.isDirectory()) visit(file);
    else files.push(file);
  }
};
visit(durable);
files.sort();
fs.writeFileSync(
  path.join(dir, "DURABLE-SHA256SUMS"),
  files.map((file) => `${hash(file)}  ${file}`).join("\n") + "\n",
);
fs.writeFileSync(
  path.join(dir, "DURABLE-INDEX.json"),
  JSON.stringify(
    {
      root: durable,
      files: files.length,
      bytes: files.reduce((sum, p) => sum + fs.statSync(p).size, 0),
      attempts: fs.readdirSync(durable).sort(),
      adopted: [packages, attempt],
      retention:
        "All first failures and diagnostic/source-drifted attempts retained; no raw output committed",
    },
    null,
    2,
  ) + "\n",
);
console.log(JSON.stringify(result));
