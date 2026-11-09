// @ts-nocheck -- [CX-A01-040] Why: integration adds this runtime protocol or command fixture to checkJs; dynamic JSON/message fields lack static record types. Binding errors remain checked by lab/bin/checkjs.mjs. Rejected: excluding current executable code.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { assertionRow } from './fixture.mjs';

const out = process.argv[2];
fs.mkdirSync(out);
const root = process.cwd();
const dir = path.resolve('packages/datomic');
const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json')));
const { DatomicClient } = await import(pathToFileURL(path.resolve(dir, pkg.exports['.'].import)));
const client = new DatomicClient('http://127.0.0.1:8470');
// [EXP-DF01] Why: serialize the shared raw fixture using the production client before gateway validation. Rejected: manually tagged JSON (would skip the wire boundary).
let wire;
client.request = async (_method, _path, input) => { wire = input.rows[0]; };
await client.transact('offline', { rows: [assertionRow] });
client.close();
fs.writeFileSync(path.join(out, 'wire-fixture.json'), JSON.stringify(wire));
const dist = '/Users/sam/Claude/Projects/triplex-db-2/downloads/datomic-pro-1.0.7745/extracted/datomic-pro-1.0.7745';
const java = '/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-DF01/jdk-21.0.13+9-jre/Contents/Home/bin/java';
const files = [import.meta.filename, path.resolve(import.meta.dirname, 'fixture.mjs'), path.resolve(import.meta.dirname, 'fixture_test.clj'),
  ...fs.readdirSync('packages/datomic/gateway/src/triplex/gateway').filter(n => n.endsWith('.clj')).map(n => `packages/datomic/gateway/src/triplex/gateway/${n}`),
  'packages/datomic/src/codec-spec.json', java,
  ...[dist, path.join(dist, 'lib'), path.join(dir, 'dist')].flatMap(d => fs.readdirSync(d).filter(n => /\.(jar|js)$/.test(n)).map(n => path.join(d, n)))];
const hashes = () => Object.fromEntries(files.map(p => [p, createHash('sha256').update(fs.readFileSync(p)).digest('hex')]));
const before = hashes();
const disk = fs.statfsSync(root);
assert(disk.bavail * disk.bsize >= 5 * 1024**3);
fs.writeFileSync(path.join(out, 'inputs.json'), JSON.stringify({ label: 'OFFLINE', slot: null, started: new Date().toISOString(),
  head: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), hashes: before }, null, 2));
const result = spawnSync(java, ['-Xmx256m', `-Dtriplex.codec.spec=${root}/packages/datomic/src/codec-spec.json`, '-cp',
  [path.join(dist, '*'), path.join(dist, 'lib/*'), path.join(dist, 'resources'), path.resolve('packages/datomic/gateway/src'), import.meta.dirname].join(path.delimiter),
  'clojure.main', '-m', 'fixture-test'], { encoding: 'utf8', env: { ...process.env, DF01_WIRE_FIXTURE: path.resolve(out, 'wire-fixture.json') } });
fs.writeFileSync(path.join(out, 'test.log'), result.stdout + result.stderr);
assert.deepEqual(hashes(), before, 'Input bytes changed');
fs.writeFileSync(path.join(out, 'result.json'), JSON.stringify({ exitCode: result.status, signal: result.signal,
  finished: new Date().toISOString(), inputsStable: true }, null, 2));
process.stdout.write(result.stdout + result.stderr);
process.exitCode = result.status ?? 1;
