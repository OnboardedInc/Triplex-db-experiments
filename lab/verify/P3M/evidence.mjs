// [CX-VP3M] Why: preserve the gate and its content-addressed inputs outside git with verifiable bytes.
// Rejected: committing raw gate output or silently moving a receipt without a read-back digest.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const root = path.resolve(import.meta.dirname, '../../..');
const evidence = '/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VP3M';
const hash = p => createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const log = fs.readFileSync(path.join(evidence, 'g0.log'), 'utf8');
const id = /\[lab\] (G0-xtdb-\d+T\d+Z-[a-f0-9]+): raw output/.exec(log)?.[1];
assert.ok(id, 'Fresh reviewer G0 run id must exist');
const receiptFile = path.join(root, 'lab/runs/G0', id + '.json');
const receipt = JSON.parse(fs.readFileSync(receiptFile, 'utf8'));
assert.equal(receipt.runId, id);
assert.equal(receipt.experiment, 'CX-VP3M');
assert.equal(receipt.slot, null);
assert.equal(receipt.runKind, 'diagnostic');
const archive = path.join(evidence, 'g0', id);
fs.mkdirSync(archive, { recursive: true });
fs.cpSync(path.join(root, receipt.rawDir), path.join(archive, 'raw'), { recursive: true });
fs.mkdirSync(path.join(archive, 'objects'), { recursive: true });
for (const object of receipt.objects) {
  if (!object.sha256) continue;
  const src = path.join(root, 'runs/objects', object.sha256);
  assert.equal(hash(src), object.sha256);
  const dst = path.join(archive, 'objects', object.sha256);
  // [CX-VP3M] Why: receipts can reference one read-only object under several roles.
  // Rejected: overwriting the first immutable copy when the same hash is encountered again.
  if (!fs.existsSync(dst)) fs.copyFileSync(src, dst);
  assert.equal(hash(dst), object.sha256);
}
const copy = path.join(archive, 'receipt.json');
fs.copyFileSync(receiptFile, copy);
assert.equal(hash(copy), hash(receiptFile));
// Retain the immutable gate receipt bytes in the review's specified result directory.
const local = path.join(import.meta.dirname, id + '.json');
fs.copyFileSync(receiptFile, local);
assert.equal(hash(local), hash(receiptFile));
fs.unlinkSync(receiptFile);
const files = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? files(path.join(dir, e.name)) : e.isFile() ? [path.join(dir, e.name)] : []);
const manifest = files(evidence).sort().map(p => `${hash(p)}  ${path.relative(evidence, p)}`).join('\n') + '\n';
fs.writeFileSync(path.join(import.meta.dirname, 'SHA256SUMS'), manifest);
console.log(JSON.stringify({ id, verdict: receipt.verdict, counts: receipt.counts, archive, manifestFiles: manifest.trim().split('\n').length }));
