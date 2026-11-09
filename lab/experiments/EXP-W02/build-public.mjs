// @ts-nocheck -- [EXP-CHECKJS-R2] dynamic collections, runtime Buffer-to-JSON coercion, or validated values without static narrowing. Binding errors remain checked by lab/bin/checkjs.mjs.
// [EXP-W02-R2] Why: package builds must precede typechecking their public exports; pnpm's run parser
// rejects the install-only --store-dir option. Rejected: excluding the live adapter or using a sibling dist.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const root = new URL('../../../', import.meta.url).pathname;
for (const pkg of ['core', 'testkit', 'xtdb', 'qualification', 'w0']) {
  const cwd = path.join(root, 'packages', pkg);
  const script = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'))).scripts.build;
  // Only the pinned repository's simple tsdown/tsc build argv are accepted, never arbitrary shell evaluation.
  for (const part of script.split(' && ')) {
    const [tool, ...args] = part.split(' ');
    if (!['tsdown', 'tsc'].includes(tool) || args.some(a => !/^[a-zA-Z0-9_./=-]+$/.test(a))) throw Error('unsupported build recipe: ' + part);
    const bin = tool === 'tsdown' ? 'tsdown/dist/run.mjs' : 'typescript/bin/tsc';
    const argv = [path.join(root, 'node_modules', bin), ...args];
    console.log(JSON.stringify({ package: pkg, argv: [process.execPath, ...argv] }));
    const r = spawnSync(process.execPath, argv, { cwd, stdio: 'inherit' });
    if (r.status !== 0) process.exit(r.status ?? 1);
  }
}

if (process.argv.includes('--regenerate-goldens')) {
  const r = spawnSync(process.execPath, ['--experimental-strip-types', 'lab/scenarios/v2/expect.ts'], { cwd: root, stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
