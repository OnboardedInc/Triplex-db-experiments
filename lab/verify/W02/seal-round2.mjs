// [CX-VW02-R2] Why: make the completed durable reviewer attempts independently checksum-verifiable.
// Rejected: committing bulky raw oracle output or using an integrity manifest as semantic authority.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
const dir = path.join(import.meta.dirname, 'round2');
const index = JSON.parse(fs.readFileSync(path.join(dir, 'controller-index.json')));
const files = [];
const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
 const f = path.join(d, e.name); if (e.isDirectory()) walk(f); else if (e.isFile() && !['SHA256SUMS', 'INDEX.md'].includes(e.name)) files.push(f);
} };
for (const d of [index.raw, index.campaignRaw, dir]) walk(d);
const records = files.map(file => ({ file, bytes: fs.statSync(file).size, sha256: createHash('sha256').update(fs.readFileSync(file)).digest('hex') }));
fs.writeFileSync(path.join(dir, 'SHA256SUMS'), records.map(r => `${r.sha256}  ${r.file}`).join('\n') + '\n');
fs.writeFileSync(path.join(dir, 'INDEX.md'), `# W02 independent review round 2 evidence\n\nVerdict and full gap list: ../VERIFY-round2.md.\n\n- Controller receipt: ${index.raw}/receipt.json\n- Full campaign: ${index.campaignRaw}/review-results.json\n- Additional basis/spec/evidence controls: ${index.raw}/extra-round2.json\n- Compact outcomes: results.json\n- Exact open spec claims/member IDs: gaps.json\n\nSHA256SUMS indexes ${records.length} files (${records.reduce((n, r) => n + r.bytes, 0)} bytes). Paths are absolute; use shasum -a 256 -c SHA256SUMS.\nAll bulky raw files are durable outside Git. This inventory establishes file integrity only.\n\nAll three offline lane sets have 40 matches, 26 expected missing-claim failures and 4 blocks.\nThe 33 wrong-outcome controls reject before missing-claim enforcement; no GS acceptance is claimed.\n`);
console.log(JSON.stringify({ files: records.length, bytes: records.reduce((n, r) => n + r.bytes, 0), largeFiles: records.filter(r => r.bytes > 1000000).map(r => r.file) }));
