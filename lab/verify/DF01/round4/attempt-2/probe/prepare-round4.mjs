import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

// [CX-VDF01-R4] Why: compare actual immutable feed implementations, never a reimplementation of their predicates.
// Rejected: importing a sibling checkout's mutable source or changing production files to make the test runnable.
const review = import.meta.dirname;
const root = path.resolve(review, '../../..');
const out = path.join(review, 'round4');
fs.mkdirSync(out, { recursive: true });
const sources = path.join(out, 'sources');
fs.mkdirSync(sources);
const git = args => execFileSync('git', args, { cwd: root });
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const specs = [
  ['datomic', '302a7a63', ['packages/datomic/gateway/src', 'packages/datomic/src/codec-spec.json']],
  ['broker', '8c96ea90e6d51dd727bcaf41d23d8f83e4da8e87', ['packages/qlever/src', 'packages/core/src', 'packages/core/package.json']],
  ['p2x', 'fb6681a4c5b54bfef63ad5ee670047946a24617c', ['packages/xtdb/src']],
  ['rt01', '7ee171ea294577b3f5d6aca027b311f27465b802', ['packages/core/src']],
];
const bindings = [];
for (const [label, ref, paths] of specs) {
  const commit = git(['rev-parse', `${ref}^{commit}`]).toString().trim();
  const files = git(['ls-tree', '-r', '--name-only', commit, '--', ...paths]).toString().trim().split('\n');
  for (const file of files) {
    const bytes = git(['show', `${commit}:${file}`]);
    const copy = path.join(sources, label, file);
    fs.mkdirSync(path.dirname(copy), { recursive: true }); fs.writeFileSync(copy, bytes);
    bindings.push({ label, commit, file, copy: path.relative(review, copy), sha256: sha(bytes),
      blob: git(['rev-parse', `${commit}:${file}`]).toString().trim() });
  }
}
// A native dependency is reused by an owned link; it is not copied into evidence or installed globally.
const native = path.join(root, 'node_modules/.pnpm/better-sqlite3@12.10.0/node_modules/better-sqlite3');
const links = path.join(sources, 'broker/node_modules');
fs.mkdirSync(links); fs.symlinkSync(native, path.join(links, 'better-sqlite3'));
assert.equal(git(['diff', '--name-only', '302a7a63', 'HEAD', '--', 'packages/core', 'packages/sql', 'packages/sqlite']).toString(), '');
const files = git(['ls-tree', '-r', '--name-only', '302a7a63', '--', 'packages/core/src', 'packages/sql/src', 'packages/sqlite/src']).toString().trim().split('\n');
const coreInputs = Object.fromEntries(files.map(file => {
  const bytes = fs.readFileSync(path.join(root, file));
  assert.deepEqual(bytes, git(['show', `302a7a63:${file}`]));
  return [file, sha(bytes)];
}));
fs.writeFileSync(path.join(out, 'source-bindings.json'), JSON.stringify({ bindings, coreInputs,
  nativeAddon: { file: path.join(native, 'build/Release/better_sqlite3.node'),
    sha256: sha(fs.readFileSync(path.join(native, 'build/Release/better_sqlite3.node'))) } }, null, 2) + '\n');
console.log(JSON.stringify({ sourceFiles: bindings.length, reviewedCoreFiles: files.length, sources: specs.map(([label, ref]) => ({ label, ref })) }));
