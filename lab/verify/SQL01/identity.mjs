// [EXP-SQL01] Why: bind reviewer execution to the requested builder bytes and retained fixtures.
// Rejected: citing a branch name without checking its source and evidence hashes.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const root = path.resolve('lab/verify/SQL01'), evidence = path.join(root, 'evidence');
const hash = b => createHash('sha256').update(b).digest('hex');
const digest = file => ({ bytes: fs.statSync(file).size, sha256: hash(fs.readFileSync(file)) });
const walk = dir => fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : e.isFile() ? [path.join(dir, e.name)] : []) : [];
const prefix = process.env.SQL01_ATTEMPT ?? 'identity';
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const manifestFile = 'lab/experiments/EXP-SQL01/evidence/MANIFEST.json';
const builder = JSON.parse(fs.readFileSync(manifestFile)), checked = [], mismatches = [];
for (const [file, expected] of Object.entries(builder.files)) {
  const actual = fs.existsSync(file) ? digest(file) : null;
  checked.push({ file, expected, actual });
  if (!actual || actual.sha256 !== expected.sha256 || actual.bytes !== expected.bytes) mismatches.push(file);
}
const require = createRequire(path.resolve('packages/qlever/package.json'));
const driver = fs.realpathSync(require.resolve('better-sqlite3'));
const driverRoot = path.resolve(path.dirname(driver), '..');
const D = require('better-sqlite3'), db = new D(':memory:');
const sqlite = db.prepare('SELECT sqlite_version() version, sqlite_source_id() source').get();
const compileOptions = db.pragma('compile_options'); db.close();
const identity = {
  head: git('rev-parse', 'HEAD'), branch: git('branch', '--show-current'),
  requestedBuilderHead: git('rev-parse', '53d41ad'), implementationHead: builder.implementationHead,
  productDiffAgainstBuilder: git('diff', '53d41ad', '--', 'packages', 'pnpm-lock.yaml'),
  productDiffAgainstImplementation: git('diff', '3a53c3b', '--', 'packages', 'pnpm-lock.yaml'),
  node: process.version, platform: process.platform, arch: process.arch,
  lockfile: digest('pnpm-lock.yaml'), driver, driverPackage: JSON.parse(fs.readFileSync(path.join(driverRoot, 'package.json'))).version,
  nativeBinary: digest(path.join(driverRoot, 'build/Release/better_sqlite3.node')),
  sqlite, compileOptions,
  coreBuild: Object.fromEntries(walk('packages/core/dist').sort().map(f => [f, digest(f)])),
  builderEvidenceManifest: digest(manifestFile), builderManifestChecked: checked.length, builderManifestMismatches: mismatches,
  disk: execFileSync('df', ['-k', '.'], { encoding: 'utf8' }),
};
fs.writeFileSync(path.join(evidence, prefix + '-identity.json'), JSON.stringify(identity, null, 2) + '\n');
fs.writeFileSync(path.join(evidence, prefix + '-builder-manifest.json'), JSON.stringify({ checked, mismatches }, null, 2) + '\n');
const raw = Object.fromEntries(walk(path.join(root, 'data')).sort().map(f => [path.relative(root, f), digest(f)]));
fs.writeFileSync(path.join(evidence, prefix + '-raw-data.json'), JSON.stringify({ retained: true, files: raw, totalBytes: Object.values(raw).reduce((n, f) => n + f.bytes, 0) }, null, 2) + '\n');
console.log(JSON.stringify({ sqlite, driverPackage: identity.driverPackage, builderManifestChecked: checked.length, mismatches, productUnchanged: !identity.productDiffAgainstBuilder && !identity.productDiffAgainstImplementation, rawFiles: Object.keys(raw).length, rawBytes: Object.values(raw).reduce((n, f) => n + f.bytes, 0) }));
if (mismatches.length || identity.productDiffAgainstBuilder || identity.productDiffAgainstImplementation) process.exitCode = 1;
