// [EXP-SQL01] Why: bind delivered source, receipts and retained synthetic fixtures after all gates stop.
// Rejected: copying databases into Git or treating passing exit codes as source/evidence identity.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
const root = 'lab/verify/SQL01', exp = 'lab/experiments/EXP-SQL01';
const hash = async file => {
  const h = createHash('sha256');
  for await (const chunk of fs.createReadStream(file)) h.update(chunk);
  return { bytes: fs.statSync(file).size, sha256: h.digest('hex') };
};
const walk = dir => fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }).flatMap(d => d.isDirectory() ? walk(path.join(dir, d.name)) : d.isFile() ? [path.join(dir, d.name)] : []) : [];
const entries = async files => {
  const out = {};
  for (const file of [...new Set(files)].sort()) out[file] = await hash(file);
  return out;
};
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const reviewer = '/Users/sam/projects/triplex-db-2/.claude/worktrees/verify-sql01/lab/verify/SQL01';
const originals = {};
for (const file of ['review.test.ts', 'schedules.test.ts', 'gate.mjs', 'vitest.config.ts', 'kill.mjs', 'kill-child.ts']) {
  originals[file] = { reviewer: await hash(path.join(reviewer, file)), delivered: await hash(path.join(root, file)) };
}
fs.writeFileSync(root + '/evidence/round2-regression-origins.json', JSON.stringify({ reviewerPath: reviewer, reviewerHead: git('-C', path.resolve(reviewer), 'rev-parse', 'HEAD'), files: originals, changes: 'review adds 37-cut route comparison; schedules adds checkpoint outcomes and writer-lock probe; gate changes only the heavy-job label to the builder ID after final test execution; other three files copied byte-for-byte' }, null, 2) + '\n');
const raw = walk(root + '/data').concat(fs.existsSync('runs/broker/EXP-SQL01') ? fs.readdirSync('runs/broker/EXP-SQL01').filter(n => n.startsWith('r2')).flatMap(n => walk('runs/broker/EXP-SQL01/' + n)) : []);
fs.writeFileSync(root + '/evidence/round2-raw-data.json', JSON.stringify({ root: process.cwd(), retained: await entries(raw) }, null, 2) + '\n');
const require = createRequire(path.resolve('packages/qlever/package.json'));
const Driver = require('better-sqlite3'), db = new Driver(':memory:');
const native = require.resolve('better-sqlite3/build/Release/better_sqlite3.node');
const identity = { node: process.version, platform: process.platform, arch: process.arch, betterSqlite3: require('better-sqlite3/package.json').version, sqlite: db.prepare('SELECT sqlite_version() v').get().v, native, nativeIdentity: await hash(native) };
db.close();
fs.writeFileSync(root + '/evidence/round2-native.json', JSON.stringify(identity, null, 2) + '\n');
const inputs = execFileSync('rg', ['--files', 'packages/qlever/src', 'packages/qlever/test', 'packages/core/src', 'lab/verify/P2Q', '-g', '*.ts', '-g', '*.mjs'], { encoding: 'utf8' }).trim().split('\n');
const files = walk(root).filter(f => !f.startsWith(root + '/data/')).concat(inputs, [exp + '/REPORT-round2.md', exp + '/seal-round2.mjs', 'pnpm-lock.yaml', 'packages/qlever/package.json']);
const manifest = { head: git('rev-parse', 'HEAD'), createdAt: new Date().toISOString(), entries: await entries(files) };
fs.writeFileSync(exp + '/MANIFEST-round2.json', JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ head: manifest.head, files: Object.keys(manifest.entries).length, rawFiles: raw.length, rawBytes: Object.values(JSON.parse(fs.readFileSync(root + '/evidence/round2-raw-data.json')).retained).reduce((n, f) => n + f.bytes, 0), identity }));
