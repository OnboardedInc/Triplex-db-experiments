import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
const dir = import.meta.dirname,
  experiment = path.dirname(dir),
  root = path.resolve(dir, "../../../..");
const durable = "/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-RT01/round3";
const hash = (p) => createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const read = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
let checked = 0;
for (const line of fs
  .readFileSync(path.join(dir, "DURABLE-SHA256SUMS"), "utf8")
  .trim()
  .split("\n")) {
  const [expected, file] = line.split("  ");
  assert.ok(file.startsWith(durable + "/"));
  assert.equal(hash(file), expected, file);
  checked++;
}
const proofs = read(path.join(durable, "attempt1/pending-proof/summary.json"));
assert.deepEqual(proofs.map((p) => p.id).sort(), [
  "qlever-a0",
  "qlever-compact",
  "xtdb-a0",
  "xtdb-compact",
]);
// [EXP-RT01] Why: verify positive proof contents as well as refusal/count summaries. Rejected: accepting a one-row answer without matching its receipt identity and fields.
for (const proof of proofs) {
  const observed = read(path.join(durable, `attempt1/pending-proof/${proof.id}-observed.json`));
  assert.deepEqual(observed.after, observed.later.triples);
  assert.equal(observed.after[0].recordedAt, observed.basis.recordedAt);
  assert.deepEqual(observed.before, { error: { tag: "BasisNotAvailable", axis: "recordedAt" } });
}
const gates = read(path.join(durable, "packages3/execution.json"));
for (const [file, expected] of Object.entries(gates.sourceAfter))
  assert.equal(hash(path.join(root, file)), expected, file);
fs.writeFileSync(
  path.join(dir, "VERIFIED.json"),
  JSON.stringify(
    {
      observedAt: new Date().toISOString(),
      productHead: gates.head,
      durableFilesMatched: checked,
      positiveProofsMatchExactReceiptTriples: 4,
      packageSourceMatches: true,
      independentAcceptance: false,
    },
    null,
    2,
  ) + "\n",
);
const listed = () =>
  [
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
const sums = (base, files) =>
  fs.writeFileSync(
    path.join(base, "SHA256SUMS"),
    files
      .map((p) => `${hash(path.join(root, p))}  ${path.relative(base, path.join(root, p))}`)
      .join("\n") + "\n",
  );
sums(
  dir,
  listed().filter(
    (p) => p.startsWith("lab/experiments/EXP-RT01/round3/") && !p.endsWith("/SHA256SUMS"),
  ),
);
sums(
  experiment,
  listed().filter((p) => p !== "lab/experiments/EXP-RT01/SHA256SUMS"),
);
let local = 0;
for (const base of [dir, experiment])
  for (const line of fs.readFileSync(path.join(base, "SHA256SUMS"), "utf8").trim().split("\n")) {
    const [expected, file] = line.split("  ");
    assert.equal(hash(path.join(base, file)), expected, file);
    local++;
  }
console.log(
  JSON.stringify({
    durableFilesVerified: checked,
    localManifestEntriesVerified: local,
    positiveProofsMatchReceipts: 4,
  }),
);
