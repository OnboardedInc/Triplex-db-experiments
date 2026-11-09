// [CX-VP2Q-4-R9] Why: bind the final readback's own executed script and actual slot, and retain the first sealing observation.
// Rejected: trusting a pre-existing SUMMARY or recording only test-producer bindings (does not bind the verdict-producing readback).
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
const root = process.cwd(), out = path.join(root, "lab/verify/P2Q/evidence-round9"), started = Date.now();
const free = fs.statfsSync(root); assert(free.bavail * free.bsize >= 5 * 1024 ** 3);
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const sources = [import.meta.filename, path.join(root, "lab/verify/P2Q/scripts/round9-seal.mjs")].map(file => ({ file, sha256: hash(fs.readFileSync(file)) }));
const slot = () => {
  const locks = path.join(process.env.TX2_LOCKS_DIR ?? "/Users/sam/projects/triplex-db-2/lab/locks", "heavy");
  const rows = fs.readdirSync(locks).flatMap(index => {
    const file = path.join(locks, index, "owner.json"); if (!fs.existsSync(file)) return [];
    const bytes = fs.readFileSync(file), owner = JSON.parse(bytes);
    return owner.pid === process.ppid && owner.label === "CX-VP2Q-4-R9-seal-final" ? [{ file, owner, sha256: hash(bytes) }] : [];
  });
  assert.equal(rows.length, 1); return rows[0];
};
const owner = slot(), prior = path.join(out, "seal-first-observation"); fs.mkdirSync(prior);
fs.copyFileSync(path.join(out, "SUMMARY.json"), path.join(prior, "SUMMARY.json"));
fs.copyFileSync(path.join(out, "MANIFEST.json"), path.join(prior, "MANIFEST.json.txt"));
const child = spawnSync(process.execPath, [sources[1].file], { cwd: root, encoding: "utf8" });
fs.writeFileSync(path.join(out, "seal-final.log"), child.stdout + child.stderr, { flag: "wx" });
assert.equal(child.status, 0); const observed = JSON.parse(child.stdout);
assert.equal(observed.verdict, "FIX-FIRST"); assert.equal(observed.receipts, 22); assert.equal(observed.qualified, 14); assert.equal(observed.byteComparisons, 104);
const summaryFile = path.join(out, "SUMMARY.json"), summary = JSON.parse(fs.readFileSync(summaryFile));
assert(fs.statSync(summaryFile).mtimeMs >= started); assert.equal(summary.verdict, "FIX-FIRST");
assert.equal(summary.witnesses.filter(row => !row.enumerationRejected && row.names.includes("round9Read") && row.gateCalls === 0 && row.maskCalls === 0 && row.requested > row.observed).length, 2);
for (const source of sources) assert.equal(hash(fs.readFileSync(source.file)), source.sha256);
assert.deepEqual(slot(), owner);
const receipt = { started, finished: Date.now(), head: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  heavySlot: owner, sources, childStatus: child.status, summarySha256: hash(fs.readFileSync(summaryFile)), logSha256: hash(fs.readFileSync(path.join(out, "seal-final.log"))), observed,
  acceptedForPurpose: "fresh source/slot-bound verification of FIX-FIRST enumeration finding" };
fs.writeFileSync(path.join(out, "seal-receipt.json"), JSON.stringify(receipt, null, 2) + "\n", { flag: "wx" });
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
const files = walk(out).filter(file => file !== path.join(out, "MANIFEST.json")).sort();
const manifest = files.map(file => ({ file: path.relative(out, file), bytes: fs.statSync(file).size, sha256: hash(fs.readFileSync(file)) }));
fs.writeFileSync(path.join(out, "MANIFEST.json"), JSON.stringify(manifest, null, 2) + "\n");
for (const item of manifest) assert.equal(hash(fs.readFileSync(path.join(out, item.file))), item.sha256);
console.log(JSON.stringify({ verdict: summary.verdict, evidenceFiles: manifest.length, sourceAndSlotBound: true }));
