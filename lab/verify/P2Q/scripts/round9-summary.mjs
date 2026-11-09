// [CX-VP2Q-4-R9] Why: derive the review from fresh contents and bound receipts, not accepted/equal flags alone.
// Rejected: a green count as proof of a complete inventory (the scratch controls deliberately test that claim).
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
const root = process.cwd(), out = path.join(root, "lab/verify/P2Q/evidence-round9");
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const read = file => JSON.parse(fs.readFileSync(file, "utf8"));
const gateNames = ["earlier-offline", "new-offline", "foundation", "package", "core-focused", "qlever-typecheck", "core-typecheck", "new-live", "earlier-live", "guard-mutated", "enum-baseline", "enum-direct", "enum-inherited", "enum-merged"];
const receipts = [];
const cases = name => read(path.join(out, name, "vitest.json")).testResults.flatMap(suite => suite.assertionResults);
for (const name of gateNames) {
  const r = read(path.join(out, name, "receipt.json"));
  assert.equal(r.name, name); assert(r.accepted && r.contentMatches && r.fresh && r.sourceStillMatches && r.heavySlotStillMatches);
  assert.equal(hash(fs.readFileSync(path.join(out, name, "command.log"))), r.logSha256);
  assert.equal(r.heavySlot.owner.label, `CX-VP2Q-4-R9-${name}`);
  assert.equal(hash(JSON.stringify(r.heavySlot.owner, null, 2) + "\n"), r.heavySlot.sha256);
  for (const item of r.preimages) assert.equal(hash(fs.readFileSync(item.file)), item.sha256, item.file);
  if (typeof r.expected === "object") {
    const file = path.join(out, name, "vitest.json"), data = read(file), tests = cases(name);
    assert.equal(hash(fs.readFileSync(file)), r.resultSha256);
    assert(data.startTime >= r.started && data.startTime <= r.finished);
    assert(fs.statSync(file).mtimeMs >= r.started && fs.statSync(file).mtimeMs <= r.finished);
    assert.equal(tests.length, r.expected.total);
    assert.equal(tests.filter(t => t.status === "passed").length, r.expected.passed);
    assert.equal(tests.filter(t => t.status === "failed").length, r.expected.failed);
    assert.equal(data.success, r.expected.failed === 0);
    assert.equal(r.code, r.expected.failed === 0 ? 0 : 1);
  } else {
    assert.equal(r.code, 0); assert.equal(fs.readFileSync(path.join(out, name, "command.log")).length, 0);
  }
  receipts.push({ name, head: r.head, target: r.target, attempt: r.attempt, counts: r.counts, heavySlot: r.heavySlot, accepted: true });
}
assert.equal(new Set(receipts.map(r => r.attempt)).size, gateNames.length);
assert.equal(new Set(receipts.map(r => r.target)).size, 1);
assert.equal(new Set(receipts.map(r => r.head)).size, 1);
const directFailure = cases("enum-direct").filter(t => t.status === "failed");
assert.equal(directFailure.length, 1);
assert.match(directFailure[0].fullName, /public read inventory/);
assert.match(directFailure[0].failureMessages.join("\n"), /round9Read/);
const mutantRoot = path.join(root, "lab/verify/P2Q/scratch-round9");
const witnesses = [];
for (const kind of ["direct", "inherited", "merged"]) {
  const receipt = read(path.join(out, `enum-${kind}`, "receipt.json"));
  const file = path.join(out, `enum-${kind}`, "cases/round9-added-read-observation.json"), witness = read(file);
  assert(fs.statSync(file).mtimeMs >= receipt.started && fs.statSync(file).mtimeMs <= receipt.finished);
  assert(witness.names.includes("round9Read")); assert(witness.requested > witness.observed);
  assert.deepEqual(witness.value, []); assert.equal(witness.gateCalls, 0); assert.equal(witness.maskCalls, 0);
  assert.equal(hash(fs.readFileSync(path.join(mutantRoot, kind, "lab/verify/P2Q/tests/round8-policy.test.ts"))), hash(fs.readFileSync("lab/verify/P2Q/tests/round8-policy.test.ts")));
  const selected = cases(`enum-${kind}`);
  assert(selected.find(t => /independent scratch control/.test(t.fullName) && t.status === "passed"));
  if (kind !== "direct") assert(selected.filter(t => /inventory requires|every executable/.test(t.fullName)).every(t => t.status === "passed"));
  const copied = path.join(out, "scratch-preimages", kind); fs.mkdirSync(copied, { recursive: true });
  for (const source of ["packages/core/src/store/Triples.ts", "packages/core/src/store/TriplesLive.ts", "lab/verify/P2Q/tests/round8-policy.test.ts", "lab/verify/P2Q/tests/round9-added-read.test.ts"])
    fs.copyFileSync(path.join(mutantRoot, kind, source), path.join(copied, path.basename(source) + ".txt"));
  witnesses.push({ kind, ...witness, enumerationRejected: kind === "direct" });
}
const guardFailure = cases("guard-mutated").filter(t => t.status === "failed");
assert.equal(guardFailure.length, 1); assert.match(guardFailure[0].failureMessages.join("\n"), /UND_ERR_QA_ADDED_TRANSPORT/);
const comparisons = [];
const checkBytes = (gate, filename, expectedCount) => {
  const receipt = read(path.join(out, gate, "receipt.json"));
  const file = path.join(out, gate, "cases", filename), input = read(file);
  assert(fs.statSync(file).mtimeMs >= receipt.started && fs.statSync(file).mtimeMs <= receipt.finished);
  const records = Array.isArray(input) ? input : [input];
  assert.equal(records.filter(row => row.supported !== false).length, expectedCount);
  for (const row of records) {
    if (row.supported === false) { assert.equal(row.beforeError._tag, "DatalogValidationError"); assert.equal(row.error._tag, "DatalogValidationError"); continue; }
    assert.equal(typeof row.before, "string"); assert.equal(row.after, row.before, `${gate}/${filename}/${row.route}`);
    if (["select", "selectWithRelations"].includes(row.route)) assert.equal(JSON.parse(row.before)[0].v.value, "first-0");
    comparisons.push({ gate, filename, route: row.route ?? "entityPage", transaction: row.transaction, identical: true });
  }
};
for (const kind of ["overlay", "log", "replica"]) checkBytes("new-offline", `round8-${kind}-immutable.json`, 12);
checkBytes("new-offline", "round8-model-implicit-pin.json", 2);
checkBytes("new-offline", "round8-model-entity-page.json", 1);
for (const kind of ["standard", "fresh"]) checkBytes("new-live", `round8-${kind}-immutable.json`, 27);
checkBytes("new-live", "round8-live-implicit-pin.json", 2);
checkBytes("new-live", "round8-live-entity-page.json", 1);
for (const kind of ["standard", "fresh"]) {
  const file = path.join(out, "new-live", "cases", `round8-${kind}-journal-immutable.json`), row = read(file);
  assert.equal(JSON.parse(row.before).transactions[0].position, row.first);
  for (const field of ["after", "transaction", "afterMetadata", "transactionAfterMetadata"]) assert.equal(row[field], row.before);
  comparisons.push({ gate: "new-live", filename: path.basename(file), identicalJournalPages: 4 });
}
const future = [];
for (const [gate, kind, count] of [["new-offline", "offline", 6], ["new-live", "standard", 10], ["new-live", "fresh", 10]]) {
  const rows = read(path.join(out, gate, "cases", `round8-${kind}-public-future.json`));
  assert.equal(rows.length, count);
  for (const row of rows) { assert.equal(row.ok, false); assert.equal(row.error.reason, "basis-not-reached"); assert.equal(row.error.required, row.future); assert(row.error.observed < row.error.required); assert.equal(typeof row.error.replica, "string"); }
  future.push({ gate, kind, cases: rows.length });
}
assert.equal(execFileSync("git", ["diff", "36dacc2e", "--", "packages/core/src", "packages/qlever/src"], { encoding: "utf8" }), "");
const summary = { verdict: "FIX-FIRST", reason: "enumeration misses inherited and declaration-merged public reads", receipts, witnesses, comparisons, future,
  mutationControlsAreProductPasses: false, q91: "qlever-dev timing is diagnostic only; no latency acceptance" };
fs.writeFileSync(path.join(out, "SUMMARY.json"), JSON.stringify(summary, null, 2) + "\n");
const all = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? all(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
const manifest = all(out).filter(file => !file.endsWith("/MANIFEST.json")).sort().map(file => ({ file: path.relative(out, file), bytes: fs.statSync(file).size, sha256: hash(fs.readFileSync(file)) }));
fs.writeFileSync(path.join(out, "MANIFEST.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log(JSON.stringify({ verdict: summary.verdict, gates: receipts.length, byteComparisons: comparisons.length, evidenceFiles: manifest.length }));
