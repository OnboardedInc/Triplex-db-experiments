// Run through lab/bin/heavy.mjs. Only scratch copies under runs/ are patched.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { REPO, sha256, treeFiles } from '../../bin/lib.mjs';

// [EXP-W01b] Why: the experiment brief forbids packages/* edits; preserve executable patch proof
// on isolated copies. Rejected: editing dist to try the fix (would not bind to built source).
const dir = path.join(REPO, 'lab/scenarios/12-audit-march-3');
const out = fs.mkdtempSync(path.join(REPO, 'runs/gs12-patch-'));
const receipt = { format: 'tx2-gs12-patch-check/1', out: path.relative(REPO, out), startedAt: new Date().toISOString(),
  patchSha256: sha256(fs.readFileSync(path.join(dir, 'fix.patch'))),
  probeSha256: sha256(fs.readFileSync(path.join(dir, 'probe.ts'))),
  checkerSha256: sha256(fs.readFileSync(import.meta.filename)),
  baseSource: treeFiles(path.join(REPO, 'packages/core/src')), steps: [], status: 'RUNNING' };
const run = (label, command, args, cwd) => {
  const r = spawnSync(command, args, { cwd, encoding: 'utf8', env: { ...process.env, NODE_ENV: 'test' } });
  const stdout = r.stdout ?? '', stderr = r.stderr ?? '';
  fs.writeFileSync(path.join(out, `${label}.stdout.txt`), stdout);
  fs.writeFileSync(path.join(out, `${label}.stderr.txt`), stderr);
  receipt.steps.push({ label, command, args, cwd: path.relative(REPO, cwd), code: r.status, signal: r.signal,
    stdoutSha256: sha256(stdout), stderrSha256: sha256(stderr), error: r.error?.message ?? null });
  if (r.status !== 0) throw new Error(`${label} failed: ${stderr.slice(-1000)}`);
};
try {
  for (const mode of ['baseline', 'patched']) {
    const root = path.join(out, mode), core = path.join(root, 'packages/core');
    fs.mkdirSync(core, { recursive: true });
    fs.cpSync(path.join(REPO, 'packages/core/src'), path.join(core, 'src'), { recursive: true });
    for (const f of ['tsconfig.node.json', 'tsconfig.base.json']) fs.copyFileSync(path.join(REPO, f), path.join(root, f));
    for (const f of ['package.json', 'tsconfig.json']) fs.copyFileSync(path.join(REPO, 'packages/core', f), path.join(core, f));
    fs.symlinkSync(path.join(REPO, 'node_modules'), path.join(root, 'node_modules'));
    fs.symlinkSync(path.join(REPO, 'packages/core/node_modules'), path.join(core, 'node_modules'));
    fs.copyFileSync(path.join(dir, 'probe.ts'), path.join(core, 'probe.ts'));
    if (mode === 'patched') run('apply', 'git', ['apply', '--unsafe-paths', '--directory', root, path.join(dir, 'fix.patch')], REPO);
    run(`${mode}-probe`, path.join(REPO, 'node_modules/.bin/tsx'), ['probe.ts', ...(mode === 'patched' ? ['--patched'] : [])], core);
    if (mode === 'patched') {
      receipt.patchedSource = treeFiles(path.join(core, 'src'));
      run('patched-typecheck', path.join(REPO, 'node_modules/.bin/tsc'), ['--noEmit', '-p', 'tsconfig.json'], core);
    }
  }
  receipt.status = 'PASS';
} catch (e) { receipt.status = 'FAIL'; receipt.error = String(e.stack ?? e); process.exitCode = 1; }
receipt.endedAt = new Date().toISOString();
fs.writeFileSync(path.join(out, 'receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify({ status: receipt.status, receipt: path.relative(REPO, path.join(out, 'receipt.json')) }));
