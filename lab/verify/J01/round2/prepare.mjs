// [CX-VJ01-2] Why: execute pinned Git sources without modifying reviewed packages. Rejected: cherry-picking implementation into the reviewer branch.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const root = 'lab/verify/J01/round2';
const sha = b => createHash('sha256').update(b).digest('hex');
const git = (...args) => execFileSync('git', args);
const manifest = { at: new Date().toISOString(), node: process.version, sources: {}, files: {}, owners: {} };
for (const [arm, ref] of [['main', 'ab31bebc54bf11a8fba82bb5a9a2c0a7198d6127'], ['candidate', '0d9a860']]) {
  manifest.sources[arm] = git('rev-parse', ref).toString().trim();
  for (const pkg of ['xtdb', 'qlever']) {
    for (const file of git('ls-tree', '-r', '--name-only', ref, `packages/${pkg}/src`).toString().trim().split('\n')) {
      const dest = `${root}/trees/${arm}/${pkg}/${file.split('/src/')[1]}`;
      const bytes = git('show', `${ref}:${file}`);
      fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.writeFileSync(dest, bytes);
      manifest.files[dest] = { source: file, sha256: sha(bytes) };
    }
    const link = `${root}/trees/${arm}/${pkg}/node_modules`;
    if (!fs.existsSync(link)) fs.symlinkSync(path.resolve(`packages/${pkg}/node_modules`), link, 'dir');
  }
}
for (const file of ['pnpm-lock.yaml', 'packages/core/dist/index.js', 'packages/core/dist/runtime/index.js', 'packages/xtdb/node_modules/postgres/src/types.js']) manifest.files[file] = { sha256: sha(fs.readFileSync(file)) };
for (const lane of ['xtdb', 'qlever']) {
  const file = `/Users/sam/projects/triplex-db-2/lab/locks/${lane}-dev/owner.json`;
  manifest.owners[lane] = { path: file, sha256: sha(fs.readFileSync(file)), owner: JSON.parse(fs.readFileSync(file)) };
}
fs.writeFileSync(`${root}/source-manifest.json`, JSON.stringify(manifest, null, 2) + '\n');
// Same independent adapter/RDF comparator as round 1, with only source/output paths changed.
let offline = fs.readFileSync('lab/verify/J01/offline.mjs', 'utf8');
offline = offline.replaceAll("'../../../packages/core/", "'../../../../packages/core/")
  .replaceAll("'../../../packages/xtdb/src/", "'./trees/candidate/xtdb/")
  .replaceAll("'../../../packages/qlever/src/", "'./trees/candidate/qlever/")
  .replaceAll("'./baseline/xtdb/", "'./trees/main/xtdb/")
  .replaceAll("'./baseline/qlever/", "'./trees/main/qlever/")
  .replaceAll('lab/verify/J01/offline.json', `${root}/offline.json`);
fs.writeFileSync(`${root}/offline.mjs`, offline);
