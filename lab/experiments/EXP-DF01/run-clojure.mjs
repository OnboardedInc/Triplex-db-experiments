import { spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
const root = path.resolve(import.meta.dirname, '../../..');
const dist = process.env.DF01_DATOMIC_DIST ?? '/Users/sam/Claude/Projects/triplex-db-2/downloads/datomic-pro-1.0.7745/extracted/datomic-pro-1.0.7745';
const java = process.env.DF01_JAVA ?? '/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-DF01/jdk-21.0.13+9-jre/Contents/Home/bin/java';
// [EXP-DF01] Why: same vendor jars, no peer service or transactor needed for fake-queue tests.
// Rejected: docker run (would need a lifecycle grant for a test that has no engine dependency).
const classpath = [path.join(dist, '*'), path.join(dist, 'lib/*'), path.join(dist, 'resources'), path.join(root, 'packages/datomic/gateway/src')].join(path.delimiter);
const output = process.env.DF01_RECORDED_PAGE ?? path.join(import.meta.dirname, 'recorded-page.json');
const files = fs.readdirSync(path.join(root, 'packages/datomic/gateway/src/triplex/gateway')).filter(p => p.endsWith('.clj')).map(p => 'packages/datomic/gateway/src/triplex/gateway/' + p);
files.push('packages/datomic/src/codec-spec.json');
const jars = [dist, path.join(dist, 'lib')].flatMap(dir => fs.readdirSync(dir).filter(p => p.endsWith('.jar')).map(p => path.join(dir, p)));
const vendorFiles = [...jars, java, path.join(path.dirname(java), '../lib/server/libjvm.dylib')].filter(p => fs.existsSync(p));
files.push(...vendorFiles);
files.push('lab/experiments/EXP-DF01/run-clojure.mjs');
const hashes = () => Object.fromEntries(files.map(p => [p, createHash('sha256').update(fs.readFileSync(path.resolve(root, p))).digest('hex')]));
const inputs = hashes();
console.log(JSON.stringify({ kind: 'offline-fake-peer', started: new Date().toISOString(), java, dist, inputs }));
if (fs.existsSync(output)) fs.unlinkSync(output);
const result = spawnSync(java, ['-Xmx256m', `-Dtriplex.codec.spec=${path.join(root, 'packages/datomic/src/codec-spec.json')}`, '-cp', classpath, 'clojure.main', '-m', 'triplex.gateway.feed-test'], {
  cwd: root, stdio: 'inherit', env: { ...process.env, DF01_RECORDED_PAGE: output },
});
if (result.error) throw result.error;
if (JSON.stringify(inputs) !== JSON.stringify(hashes())) throw new Error('Gateway source changed during offline gate');
if (result.status === 0) {
  if (!fs.existsSync(output)) throw new Error('No fresh projected page');
  console.log(JSON.stringify({ output, sha256: createHash('sha256').update(fs.readFileSync(output)).digest('hex') }));
}
process.exitCode = result.status ?? 1;
