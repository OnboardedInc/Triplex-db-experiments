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
const qualifiedNames = ["earlier-offline", "new-offline", "foundation", "package", "core-focused", "qlever-source-typecheck", "core-typecheck", "new-live-journal-retry", "earlier-live", "guard-mutated-retry", "enum-baseline-retry", "enum-direct-confirm", "enum-inherited-retry", "enum-merged-retry"];
const rejectedNames = ["new-live", "qlever-typecheck", "guard-mutated", "enum-baseline", "enum-direct", "enum-inherited", "enum-merged", "enum-direct-retry"];
const gateNames = [...qualifiedNames, ...rejectedNames];
const receipts = [];
const cases = name => read(path.join(out, name, "vitest.json")).testResults.flatMap(suite => suite.assertionResults);
for (const name of gateNames) {
  const r = read(path.join(out, name, "receipt.json"));
  assert.equal(r.name, name); assert(r.fresh && r.sourceStillMatches && r.heavySlotStillMatches);
  assert.equal(r.accepted, qualifiedNames.includes(name));
  if (r.accepted) assert(r.contentMatches);
  assert.equal(hash(fs.readFileSync(path.join(out, name, "command.log"))), r.logSha256);
  assert.equal(r.heavySlot.owner.label, `CX-VP2Q-4-R9-${name}`);
  assert.equal(hash(JSON.stringify(r.heavySlot.owner, null, 2) + "\n"), r.heavySlot.sha256);
  for (const item of r.preimages) assert.equal(hash(fs.readFileSync(item.file)), item.sha256, item.file);
  if (typeof r.expected === "object") {
    const file = path.join(out, name, "vitest.json"), data = read(file), tests = cases(name);
    assert.equal(hash(fs.readFileSync(file)), r.resultSha256);
    assert(data.startTime >= r.started && data.startTime <= r.finished);
    assert(fs.statSync(file).mtimeMs >= r.started && fs.statSync(file).mtimeMs <= r.finished);
    const observed = { passed: tests.filter(t => t.status === "passed").length, failed: tests.filter(t => t.status === "failed").length, total: tests.length };
    assert.deepEqual(observed, r.counts);
    if (r.accepted) {
      assert.deepEqual(observed, r.expected); assert.equal(data.success, r.expected.failed === 0);
      assert.equal(r.code, r.expected.failed === 0 ? 0 : 1);
    } else assert.equal(r.code, 1);
  } else {
    if (r.accepted) { assert.equal(r.code, 0); assert.equal(fs.readFileSync(path.join(out, name, "command.log")).length, 0); }
    else { assert.equal(name, "qlever-typecheck"); assert.equal(r.code, 2); assert.match(fs.readFileSync(path.join(out, name, "command.log"), "utf8"), /Cannot find module .@triplex-build\/triplex/); }
  }
  receipts.push({ name, head: r.head, target: r.target, attempt: r.attempt, counts: r.counts, heavySlot: r.heavySlot, accepted: r.accepted });
}
assert.equal(new Set(receipts.map(r => r.attempt)).size, gateNames.length);
assert.equal(new Set(receipts.map(r => r.target)).size, 1);
assert.equal(new Set(receipts.map(r => r.head)).size, 1);
const directFailure = cases("enum-direct-confirm").filter(t => t.status === "failed");
assert.equal(directFailure.length, 1);
assert.match(directFailure[0].fullName, /public read inventory/);
assert.match(fs.readFileSync(path.join(out, "enum-direct-confirm/command.log"), "utf8"), /round9Read/);
const mutantRoot = path.join(root, "lab/verify/P2Q/scratch-round9-retry");
const witnesses = [];
for (const kind of ["direct", "inherited", "merged"]) {
  const gate = kind === "direct" ? "enum-direct-confirm" : `enum-${kind}-retry`;
  const receipt = read(path.join(out, gate, "receipt.json"));
  const file = path.join(out, gate, "cases/round9-added-read-observation.json"), witness = read(file);
  assert(fs.statSync(file).mtimeMs >= receipt.started && fs.statSync(file).mtimeMs <= receipt.finished);
  assert(witness.names.includes("round9Read")); assert(witness.requested > witness.observed);
  assert.deepEqual(witness.value, []); assert.equal(witness.gateCalls, 0); assert.equal(witness.maskCalls, 0);
  assert.equal(hash(fs.readFileSync(path.join(mutantRoot, kind, "lab/verify/P2Q/tests/round8-policy.test.ts"))), hash(fs.readFileSync("lab/verify/P2Q/tests/round8-policy.test.ts")));
  const selected = cases(gate);
  assert(selected.find(t => /independent scratch control/.test(t.fullName) && t.status === "passed"));
  if (kind !== "direct") { const guards = selected.filter(t => /inventory requires|every executable/.test(t.fullName)); assert.equal(guards.length, 2); assert(guards.every(t => t.status === "passed")); }
  const copied = path.join(out, "scratch-preimages", kind); fs.mkdirSync(copied, { recursive: true });
  for (const source of ["packages/core/src/store/Triples.ts", "packages/core/src/store/TriplesLive.ts", "lab/verify/P2Q/tests/round8-policy.test.ts", "lab/verify/P2Q/tests/round9-added-read.test.ts"])
    fs.copyFileSync(path.join(mutantRoot, kind, source), path.join(copied, path.basename(source) + ".txt"));
  witnesses.push({ kind, ...witness, enumerationRejected: kind === "direct" });
}
const guardFailure = cases("guard-mutated-retry").filter(t => t.status === "failed");
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
  const gate = kind === "standard" ? "new-live-journal-retry" : "new-live";
  const file = path.join(out, gate, "cases", `round8-${kind}-journal-immutable.json`), row = read(file);
  const producer = read(path.join(out, gate, "receipt.json"));
  assert(fs.statSync(file).mtimeMs >= producer.started && fs.statSync(file).mtimeMs <= producer.finished);
  assert.equal(JSON.parse(row.before).transactions[0].position, row.first);
  for (const field of ["after", "transaction", "afterMetadata", "transactionAfterMetadata"]) assert.equal(row[field], row.before);
  comparisons.push({ gate, filename: path.basename(file), identicalJournalPages: 4 });
}
const future = [];
for (const [gate, kind, count] of [["new-offline", "offline", 6], ["new-live", "standard", 10], ["new-live", "fresh", 10]]) {
  const rows = read(path.join(out, gate, "cases", `round8-${kind}-public-future.json`));
  assert.equal(rows.length, count);
  for (const row of rows) { assert.equal(row.ok, false); assert.equal(row.error.reason, "basis-not-reached"); assert.equal(row.error.required, row.future); assert(row.error.observed < row.error.required); assert.equal(typeof row.error.replica, "string"); }
  future.push({ gate, kind, cases: rows.length });
}
assert.equal(execFileSync("git", ["diff", "36dacc2e", "--", "packages/core/src", "packages/qlever/src"], { encoding: "utf8" }), "");
const primaryFailure = cases("new-live").filter(t => t.status === "failed");
assert.equal(primaryFailure.length, 1); assert.match(primaryFailure[0].fullName, /standard journal at an old cut/);
assert.match(primaryFailure[0].failureMessages.join("\n"), /replica.*unreachable.*request timeout/s);
assert.equal(cases("new-live-journal-retry").filter(t => t.status === "passed").length, 1);
const logProof = read(path.join(out, "retirement-readback/readback.json"));
assert.equal(logProof.results.length, 2);
assert.equal(logProof.sourceScriptSha256, hash(fs.readFileSync("lab/verify/P2Q/scripts/round9-log-readback.mjs")));
for (const proof of logProof.results) {
  assert.equal(proof.sourceSha256, hash(fs.readFileSync(path.join(out, "retirement-readback", `${proof.kind}-segment.log`))));
  assert.equal(proof.receiptSha256, hash(fs.readFileSync(path.join(out, proof.gate, "receipt.json"))));
  assert.equal(proof.caseSha256, hash(fs.readFileSync(path.join(out, proof.gate, "cases", `round8-${proof.kind}-journal-immutable.json`))));
  assert.equal(proof.fullPagesIdentical, 4);
}
const audit = read(path.join(out, "foundation/cases/round7-source-class-audit.json"));
const dependencies = audit.modules.map(module => ({ file: module.file, expected: module.sha256, observed: hash(fs.readFileSync(module.file)) }));
const bundled = process.binding("natives")["internal/deps/undici/undici"];
const start = bundled.indexOf("// lib/core/errors.js"), end = bundled.indexOf("\n// lib/", start + 5);
dependencies.push({file: "Node bundled lib/core/errors.js", expected: audit.bundled.sha256, observed: hash(bundled.slice(start, end))});
assert(dependencies.every(row => row.expected === row.observed));
fs.writeFileSync(path.join(out, "DEPENDENCY-READBACK.json"), JSON.stringify({unchanged: true, dependencies}, null, 2) + "\n");
const summary = { verdict: "FIX-FIRST", reason: "enumeration misses inherited and declaration-merged public reads", receipts, witnesses, comparisons, future,
  fullByteComparisons: comparisons.reduce((sum, row) => sum + (row.identicalJournalPages ?? 1), 0),
  qualifiedReceipts: qualifiedNames.length, rejectedFirstAttemptsRetained: rejectedNames,
  mutationControlsAreProductPasses: false, q91: "qlever-dev timing is diagnostic only; no latency acceptance" };
fs.writeFileSync(path.join(out, "SUMMARY.json"), JSON.stringify(summary, null, 2) + "\n");
const all = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? all(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
const manifest = all(out).filter(file => !file.endsWith("/MANIFEST.json")).sort().map(file => ({ file: path.relative(out, file), bytes: fs.statSync(file).size, sha256: hash(fs.readFileSync(file)) }));
fs.writeFileSync(path.join(out, "MANIFEST.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log(JSON.stringify({ verdict: summary.verdict, receipts: receipts.length, qualified: summary.qualifiedReceipts, byteComparisons: summary.fullByteComparisons, evidenceFiles: manifest.length }));
