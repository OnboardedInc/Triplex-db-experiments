// [CX-VW02] Why: retain a portable per-file checksum inventory for bulky evidence kept outside Git.
// Rejected: committing raw multi-megabyte oracle directories or asserting integrity from filenames.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
const dir = path.join(import.meta.dirname, 'evidence');
const results = JSON.parse(fs.readFileSync(path.join(dir, 'results.json')));
const sha = b => createHash('sha256').update(b).digest('hex');
// This streams only the small retained reviewer files; no world fingerprint, engine or trial executes.
const files = [];
const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
 const f = path.join(d, e.name); if (e.isDirectory()) walk(f); else if (e.isFile()) files.push(f);
} };
walk(results.raw); walk(dir);
const records = files.map(f => ({ file: f, bytes: fs.statSync(f).size, sha256: sha(fs.readFileSync(f)) }));
fs.writeFileSync(path.join(import.meta.dirname, 'SHA256SUMS'), records.map(r => `${r.sha256}  ${r.file}`).join('\n') + '\n');
console.log(JSON.stringify({ format: 'CX-VW02-evidence-index/1', raw: results.raw, files: records.length, bytes: records.reduce((s, r) => s + r.bytes, 0), filesOver1MB: records.filter(r => r.bytes > 1000000).map(r => r.file), manifestSha256: sha(fs.readFileSync(path.join(import.meta.dirname, 'SHA256SUMS'))) }));
