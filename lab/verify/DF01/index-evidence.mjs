import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

// [CX-VDF01] Why: the committed index must describe the exact retained bytes and reviewed source bindings.
// Rejected: indexing large dependency trees or relying on filenames as evidence identity.
const out = import.meta.dirname;
const root = path.resolve(out, '../../..');
const sha = p => createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const reviewed = JSON.parse(fs.readFileSync(path.join(out, 'offline-inputs.json')));
const secondary = JSON.parse(fs.readFileSync(path.join(out, 'secondary-result.json')));
for (const bindings of [reviewed.inputs, secondary.inputs]) {
  for (const [file, expected] of Object.entries(bindings)) assert.equal(sha(path.resolve(root, file)), expected, file);
}
assert.equal(reviewed.head, 'bc8a5edb1701ee92b42b8249fbe14ce5f17f652d');
assert.equal(secondary.head, reviewed.head);
const external = secondary.cliTarball;
assert.equal(fs.statSync(external.path).size, external.bytes);
assert.equal(sha(external.path), external.sha256);
fs.writeFileSync(path.join(out, 'EXTERNAL-SHA256SUMS'), `${external.sha256}  ${external.path}\n`);
const files = dir => fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))
  .flatMap(e => e.isDirectory() ? files(path.join(dir, e.name)) : [path.join(dir, e.name)]);
const retained = files(out).filter(p => !['SHA256SUMS', 'index.log'].includes(path.basename(p)));
let total = 0;
for (const file of retained) {
  assert.equal(fs.lstatSync(file).isSymbolicLink(), false);
  const bytes = fs.statSync(file).size;
  assert.ok(bytes <= 1000000, `Oversized review artifact ${file}`);
  total += bytes;
}
assert.ok(total <= 5000000, 'Review artifacts require external retention');
fs.writeFileSync(path.join(out, 'SHA256SUMS'), retained.map(p => `${sha(p)}  ${path.relative(out, p)}`).join('\n') + '\n');
console.log(JSON.stringify({ indexedAt: new Date().toISOString(), files: retained.length, bytes: total,
  sourceBindingsChecked: Object.keys(reviewed.inputs).length + Object.keys(secondary.inputs).length,
  externalTarballChecked: true, reviewedHead: reviewed.head }));
