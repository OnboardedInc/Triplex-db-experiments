import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';

// [CX-VDF01-R2] Why: bind the final deadline interleaving to the already verified immutable candidate source.
// Rejected: changing the successful general probes or replacing the production clock/loop.
const review = import.meta.dirname;
const root = path.resolve(review, '../../..');
const out = path.join(review, 'round2', process.argv[2] ?? 'deadline-cut-1');
fs.mkdirSync(out);
const sourceAttempt = path.join(review, 'round2/candidate-2');
const identity = JSON.parse(fs.readFileSync(path.join(sourceAttempt, 'inputs.json')));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const git = args => execFileSync('git', args, { cwd: root });
assert.equal(identity.candidate, '0f6c28c08daf9d370d2370eca8d152931b0ac512');
for (const b of identity.bindings) assert.deepEqual(fs.readFileSync(path.join(sourceAttempt, b.copy)), git(['show', `${identity.candidate}:${b.source}`]));
const probe = path.join(out, 'deadline_cut_verify.clj');
fs.copyFileSync(path.join(review, 'deadline_cut_verify.clj'), probe);
const deps = Object.keys(identity.inputs).filter(p => p.endsWith('.jar') || p.endsWith('/bin/java') || p.endsWith('libjvm.dylib'));
const files = [...deps.map(p => path.resolve(root, p)), ...identity.bindings.map(b => path.join(sourceAttempt, b.copy)),
  probe, path.join(review, 'deadline_cut_verify.clj'), import.meta.filename];
const hashes = () => Object.fromEntries(files.map(file => [path.relative(root, file), sha(fs.readFileSync(file))]));
const inputs = hashes();
const locks = '/Users/sam/projects/triplex-db-2/lab/locks/heavy';
const grant = fs.readdirSync(locks).filter(p => /^\d+$/.test(p)).flatMap(p => {
  try { return [JSON.parse(fs.readFileSync(path.join(locks, p, 'owner.json')))]; } catch { return []; }
}).find(p => p.pid === process.ppid);
assert.ok(grant);
const space = fs.statfsSync(root);
assert.ok(space.bavail * space.bsize > 5 * 1024 ** 3);
const startedAt = new Date().toISOString();
fs.writeFileSync(path.join(out, 'inputs.json'), JSON.stringify({ candidate: identity.candidate, slot: null,
  startedAt, grant, inputs }, null, 2) + '\n');
const dist = '/Users/sam/Claude/Projects/triplex-db-2/downloads/datomic-pro-1.0.7745/extracted/datomic-pro-1.0.7745';
const java = deps.find(p => p.endsWith('/bin/java'));
const source = path.join(sourceAttempt, 'source');
const cp = [path.join(dist, '*'), path.join(dist, 'lib/*'), path.join(dist, 'resources'), source, out].join(path.delimiter);
const result = spawnSync(path.resolve(root, java), ['-Xmx256m', `-Dtriplex.codec.spec=${path.join(source, 'codec-spec.json')}`,
  '-cp', cp, 'clojure.main', '-m', 'deadline-cut-verify'], { cwd: root, stdio: 'inherit', timeout: 30000 });
assert.deepEqual(inputs, hashes());
fs.writeFileSync(path.join(out, 'result.json'), JSON.stringify({ candidate: identity.candidate, slot: null,
  startedAt, finishedAt: new Date().toISOString(), code: result.status, signal: result.signal,
  error: result.error?.message ?? null }, null, 2) + '\n');
process.exitCode = result.status ?? 2;
