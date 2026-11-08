// [CX-VP2Q-5] Why: retain a machine-readable inventory of every distinct outage schedule.
// Rejected: a pass count alone (would hide which client/surface lost basis metadata).
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
const root = path.resolve(import.meta.dirname, '../evidence-round5');
const all = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
  const file = path.join(dir, entry.name);
  return entry.isDirectory() ? all(file) : [file];
});
const files = all(root);
const outcomes = files.filter(file => /round[45]-(http|live|predicate|native|datalog|cause|baseline)-.*\.json$/.test(file)).map(file => {
  const record = JSON.parse(fs.readFileSync(file, 'utf8'));
  return { file: path.relative(root, file), ...record };
});
const gates = files.filter(file => file.endsWith('.json')).flatMap(file => {
  const record = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!('sourceStillMatches' in record)) return [];
  if (!record.sourceStillMatches) throw Error(`Source drift: ${file}`);
  const log = path.join(root, record.name + '.log');
  const sha256 = createHash('sha256').update(fs.readFileSync(log)).digest('hex');
  if (sha256 !== record.logSha256) throw Error(`Log drift: ${log}`);
  return [{ file: path.relative(root, file), name: record.name, code: record.code, target: record.target, head: record.head, sourceStillMatches: true }];
});
fs.writeFileSync(path.join(root, 'SUMMARY.json'), JSON.stringify({ generatedAt: new Date().toISOString(), gates, outcomes }, null, 2) + '\n');
const manifestFiles = all(root).filter(file => path.basename(file) !== 'MANIFEST.json');
const manifest = manifestFiles.sort().map(file => ({ file: path.relative(root, file), bytes: fs.statSync(file).size, sha256: createHash('sha256').update(fs.readFileSync(file)).digest('hex') }));
fs.writeFileSync(path.join(root, 'MANIFEST.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ gates: gates.length, outcomes: outcomes.length, evidenceFiles: manifest.length }));
