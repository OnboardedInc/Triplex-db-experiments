// [EXP-K01-VK01-R7] Why: execute the real coverage guard against scratch schema edits and an intentionally stale projection. Rejected: calling assert.notDeepEqual without proving the guard process fails.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fields } from '../../bench/lib/g0.ts';
const root = path.resolve(import.meta.dirname, '../../..');
const out = path.join(import.meta.dirname, 'evidence/review-round7/schema-guard');
fs.mkdirSync(out, { recursive: true });
assert.ok(!fs.existsSync(path.join(out, 'run.json')), 'preserve previous guard attempts');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const files = ['lab/bench/lib/g0.ts', 'lab/bench/lib/g0-schema.ts', 'lab/bench/test/g0-schema.test.ts', ...fs.readdirSync(path.join(root, 'packages/xtdb/src'), { recursive: true }).filter(f => f.endsWith('.ts')).map(f => 'packages/xtdb/src/' + f)];
const original = Object.fromEntries(files.map(f => [f, fs.readFileSync(path.join(root, f), 'utf8')]));
const runs = [];
for (const variant of ['assertion-column', 'side-column', 'side-table']) for (const stale of [false, true]) {
  const label = variant + (stale ? '-stale' : '-covered');
  const scratch = path.join(import.meta.dirname, 'tmp/schema-' + label);
  assert.ok(!fs.existsSync(scratch), 'scratch must be a new attempt');
  const changed = { ...original };
  if (variant === 'assertion-column') changed['packages/xtdb/src/codecs.ts'] = changed['packages/xtdb/src/codecs.ts'].replace('"id",', '"review_future_column", "id",');
  if (variant === 'side-column') changed['packages/xtdb/src/XtdbStorageAdapter.ts'] = changed['packages/xtdb/src/XtdbStorageAdapter.ts'].replace('tx_attempts (_id,', 'tx_attempts (review_future_column, _id,');
  if (variant === 'side-table') changed['packages/xtdb/src/review-future.ts'] = 'const sql = "CREATE TABLE tx_review_future (_id, scope_key, review_future_column)";\n';
  if (stale) changed['lab/bench/lib/g0.ts'] = changed['lab/bench/lib/g0.ts'].replace('export const fields = storedFields;', 'export const fields = ' + JSON.stringify(fields) + ';');
  const edits = Object.keys(changed).filter(f => changed[f] !== original[f]);
  assert.equal(edits.length, stale ? 2 : 1);
  try {
    for (const [file, bytes] of Object.entries(changed)) {
      const target = path.join(scratch, file);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, bytes);
    }
    const r = spawnSync(process.execPath, ['--test', '--test-name-pattern', '^independent declaration audit', 'lab/bench/test/g0-schema.test.ts'], { cwd: scratch, encoding: 'utf8', timeout: 30000, maxBuffer: 4 << 20 });
    const log = (r.stdout ?? '') + (r.stderr ?? '');
    fs.writeFileSync(path.join(out, label + '.log'), log);
    const inputs = {};
    for (const file of edits) {
      const name = label + '.' + file.replaceAll('/', '_') + '.txt';
      fs.writeFileSync(path.join(out, name), changed[file]);
      inputs[file] = { before: original[file] === undefined ? null : sha(original[file]), after: sha(changed[file]), snapshot: name };
    }
    runs.push({ label, stale, status: r.status, signal: r.signal, error: r.error?.message, inputs, logSha256: sha(log) });
    assert.equal(r.signal, null);
    assert.equal(r.error, undefined);
    assert.equal(r.status, stale ? 1 : 0, label);
    if (stale) assert.match(log, /not ok \d+ - independent declaration audit fails if any stored column lacks coverage/);
    else {
      assert.match(log, /ok \d+ - independent declaration audit fails if any stored column lacks coverage/);
      assert.match(log, /# pass 1\n# fail 0/);
    }
  } finally { fs.rmSync(scratch, { recursive: true, force: true }); }
}
fs.writeFileSync(path.join(out, 'run.json'), JSON.stringify({ at: new Date().toISOString(), original: Object.fromEntries(Object.entries(original).map(([f, b]) => [f, sha(b)])), runs }, null, 2) + '\n');
process.stdout.write('Six scratch controls: 3 automatically covered schemas pass; 3 stale projections fail the real independent guard.\n');
