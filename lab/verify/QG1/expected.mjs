import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { ownFacts, sharedFacts, accountOfSubject, accountsFor, memberOf } from '../../bench/lib/world.ts';
import { chooseHistorySample } from '../../bench/lib/samples.ts';

// [CX-VQG1] Why: regenerate expected content without opening an engine or trusting
// stored expected digests. Rejected: replaying contentEqual flags (no content check).
const root = process.argv[2];
const out = process.argv[3];
if (!root || !out || fs.existsSync(out)) throw Error('root and new output required');
const manifest = JSON.parse(fs.readFileSync(`${root}/base-10m-attempt2/manifest.json`)).seedManifest;
const accounts = accountsFor(manifest.subjects);
const sample = chooseHistorySample(manifest.subjects, 20, 'QG1-p4-v1', accounts);
const expected = sample.map(subject => {
  const members = [...ownFacts(subject, accounts), ...sharedFacts(accountOfSubject(subject, accounts))]
    .map(f => memberOf(f.e, f.a, f.v)).sort();
  return { subject, count: members.length, sha256: createHash('sha256').update(JSON.stringify(members)).digest('hex') };
});
fs.writeFileSync(out, JSON.stringify({ manifestSubjects: manifest.subjects, basis: manifest.result.lastPosition, expected }, null, 2) + '\n', { flag: 'wx' });
