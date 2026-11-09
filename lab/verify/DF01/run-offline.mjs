import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync, execFileSync } from 'node:child_process';

// [CX-VDF01] Why: bind the actual gateway, review probes, runtime and vendor dependencies before and after execution.
// Rejected: reusing the builder's successful receipt (does not establish fresh independent observations).
const root = path.resolve(import.meta.dirname, '../../..');
const out = import.meta.dirname;
const dist = '/Users/sam/Claude/Projects/triplex-db-2/downloads/datomic-pro-1.0.7745/extracted/datomic-pro-1.0.7745';
const java = '/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-DF01/jdk-21.0.13+9-jre/Contents/Home/bin/java';
const source = fs.readdirSync(path.join(root, 'packages/datomic/gateway/src/triplex/gateway'))
  .filter(p => p.endsWith('.clj')).map(p => `packages/datomic/gateway/src/triplex/gateway/${p}`);
const jars = [dist, path.join(dist, 'lib')].flatMap(dir => fs.readdirSync(dir)
  .filter(p => p.endsWith('.jar')).map(p => path.join(dir, p)));
const files = [...source, 'packages/datomic/src/codec-spec.json',
  'lab/verify/DF01/offline_verify.clj', 'lab/verify/DF01/run-offline.mjs',
  ...jars, java, path.resolve(path.dirname(java), '../lib/server/libjvm.dylib')];
const hash = p => createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const hashes = () => Object.fromEntries(files.map(p => [p, hash(path.resolve(root, p))]));
const inputs = hashes();
const outputs = ['projected-page.json', 'before-excision.json', 'after-excision.json'];
for (const name of outputs) fs.rmSync(path.join(out, name), { force: true });
const identity = { kind: 'offline-only', slot: null, startedAt: new Date().toISOString(),
  head: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(), inputs };
fs.writeFileSync(path.join(out, 'offline-inputs.json'), JSON.stringify(identity, null, 2) + '\n');
const cp = [path.join(dist, '*'), path.join(dist, 'lib/*'), path.join(dist, 'resources'),
  path.join(root, 'packages/datomic/gateway/src'), out].join(path.delimiter);
const result = spawnSync(java, ['-Xmx256m', `-Dtriplex.codec.spec=${path.join(root, 'packages/datomic/src/codec-spec.json')}`,
  '-cp', cp, 'clojure.main', '-m', 'offline-verify'], {
  cwd: root, stdio: 'inherit', env: { ...process.env, CX_VDF01_OUTPUT: out, DF01_RECORDED_PAGE: path.join(out, outputs[0]) },
});
if (result.error) throw result.error;
if (JSON.stringify(inputs) !== JSON.stringify(hashes())) throw new Error('Inputs changed during execution');
fs.writeFileSync(path.join(out, 'offline-result.json'), JSON.stringify({ ...identity,
  inputs: 'offline-inputs.json', finishedAt: new Date().toISOString(), exitCode: result.status,
  signal: result.signal, outputs: Object.fromEntries(outputs.filter(p => fs.existsSync(path.join(out, p)))
    .map(p => [p, hash(path.join(out, p))])),
}, null, 2) + '\n');
process.exitCode = result.status ?? 2;
