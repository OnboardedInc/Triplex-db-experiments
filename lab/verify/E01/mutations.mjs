// V-E01 check 1: revert or weaken each round-8 fix in a scratch copy of lab/bin and rerun the suite there.
// Usage: node lab/verify/E01/mutations.mjs <scratchDir> [id ...]   (writes lab/verify/E01/mutations/<id>.{txt,json})
// The worktree's own lab/bin/claim.mjs is never edited: each mutation runs in <scratchDir>/<id>/ (a copy of lab/bin,
// lab/acceptance and lab/config, which is everything the test files read).
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const WT = path.resolve(import.meta.dirname, '../../..');
const OUT = path.join(import.meta.dirname, 'mutations');
const [scratch, ...only] = process.argv.slice(2);
if (!scratch) { console.error('usage: mutations.mjs <scratchDir> [id ...]'); process.exit(1); }

// Each mutation: the fix it reverts, the exact text replaced (must occur once), and the test it is expected to break.
const M = {
  // Control: the unmutated copy must pass every test, so a failure below is the mutation's.
  'M0-control': { guards: 'none (copy unmutated)', expect: null, edits: [] },
  'M1-alias-revert': { guards: 'RUN-ALIAS-DIST (Q67b)', expect: /runs its own instance/, edits: [
    [/runtimeSha256: sha256\(runtimeListing\(runtime\)\), distSha256/, 'distSha256'],
    [/sourceTreeSha256, buildSpecSha256, lockfileSha256: lockfileSha256 \?\? null, toolchain,\n/, '\n'],
    ['if (!byIdentity.has(identity)) byIdentity.set(identity, rec);', 'byIdentity.set(identity, rec);'],
  ] },
  'M1w-runtime-dropped': { guards: 'RUN-ALIAS-DIST (Q67b), weakened: tree label kept, runtime listing dropped', expect: null, edits: [
    ['runtimeSha256: sha256(runtimeListing(runtime)), ', ''],
  ] },
  'M2-no-group-kill': { guards: 'RUN-BACKGROUND-HELPER (Q67e)', expect: /build helper left running/, edits: [
    ["if (r.pid) { try { process.kill(-r.pid, 'SIGKILL'); } catch { /* the group is already gone */ } }", ''],
  ] },
  'M3-no-oracle-rehash': { guards: 'escaped process, oracle copy (Q67e)', expect: /edited oracle copy is never run again/, edits: [
    ['function verifyOracleCopy(x, root) {\n    if (root.broken) return false;', 'function verifyOracleCopy(x, root) {\n    return true;'],
  ] },
  'M3b-no-evidence-check': { guards: 'escaped process, evidence (Q67e)', expect: /edited oracle copy is never run again/, edits: [
    [/  if \(run\.objects && fs\.existsSync\(run\.objects\)\) for .*EVIDENCE-TAMPERED.*\n/, ''],
  ] },
  'M4-hash-overrides-comparator': { guards: 'bag comparator in compare (Q67i)', expect: /re-judged with its declared comparator/, edits: [
    ["const v = Buffer.isBuffer(exp) && Buffer.isBuffer(obs) ? recompute(cmp, exp, obs) : 'FAIL';",
      "const v0 = Buffer.isBuffer(exp) && Buffer.isBuffer(obs) ? recompute(cmp, exp, obs) : 'FAIL'; const v = v0 === 'PASS' && !exp.equals(obs) ? 'FAIL' : v0;"],
  ] },
  'M4b-caseResultVerdict-hash': { guards: 'bag comparator in caseResultVerdict (Q67i)', expect: /re-judged with its declared comparator/, edits: [
    ["return e.ok && o.ok ? recompute(rec.comparator, e.bytes, o.bytes) : 'FAIL';", "return e.ok && o.ok ? (rec.expectedSha256 === rec.observedSha256 ? 'PASS' : 'FAIL') : 'FAIL';"],
  ] },
  'M5-qualify-promotion': { guards: 'RUN-PROMOTION (Q67j, qualify)', expect: /log-source promotion is rejected/, edits: [
    [/  if \(claim\.kind === 'promotion'\) why\('PROMOTION-UNSUPPORTED', [^\n]*qualification is rejected[^\n]*\n/, ''],
  ] },
  'M5b-admit-promotion': { guards: 'POSITIVE-PROMOTION (Q67j, admit)', expect: /POSITIVE-PROMOTION documents/, edits: [
    [/  if \(claim\.kind === 'promotion'\) why\('PROMOTION-UNSUPPORTED', [^\n]*admission is rejected[^\n]*\n/, ''],
  ] },
};

// The whole tracked tree at 2796455 (the reference self-check reads files across lab/, not only lab/bin and lab/acceptance).
function copyTree(dst) {
  fs.rmSync(dst, { recursive: true, force: true });
  fs.mkdirSync(dst, { recursive: true });
  execFileSync('tar', ['-x', '-f', '-', '-C', dst], { input: execFileSync('git', ['-C', WT, 'archive', '--format=tar', '2796455'], { maxBuffer: 1 << 30 }), maxBuffer: 1 << 30 });
}
function mutate(file, edits) {
  let text = fs.readFileSync(file, 'utf8');
  for (const [from, to] of edits) {
    const n = typeof from === 'string' ? text.split(from).length - 1 : (text.match(new RegExp(from.source, 'g')) ?? []).length;
    if (n !== 1) throw new Error(`${file}: pattern ${from} occurs ${n} times`);
    text = text.replace(from, to);
  }
  fs.writeFileSync(file, text);
}
const runOne = id => new Promise(done => {
  const dir = path.join(scratch, id);
  copyTree(dir);
  mutate(path.join(dir, 'lab/bin/claim.mjs'), M[id].edits);
  const log = fs.openSync(path.join(OUT, `${id}.txt`), 'w');
  const t0 = Date.now();
  const p = spawn(process.execPath, ['--test', 'lab/bin/test/claim.test.mjs', 'lab/bin/test/lab.test.mjs'], { cwd: dir, stdio: ['ignore', log, log] });
  p.on('exit', code => {
    fs.closeSync(log);
    const text = fs.readFileSync(path.join(OUT, `${id}.txt`), 'utf8');
    const failed = [...text.matchAll(/^not ok \d+ - (.*)$/gm)].map(m => m[1]);
    const pass = Number(/^# pass (\d+)/m.exec(text)?.[1]), fail = Number(/^# fail (\d+)/m.exec(text)?.[1]);
    const r = { id, guards: M[id].guards, exit: code, pass, fail, failed, expectedTestFailed: M[id].expect ? failed.some(t => M[id].expect.test(t)) : null, seconds: Math.round((Date.now() - t0) / 1000) };
    fs.writeFileSync(path.join(OUT, `${id}.json`), JSON.stringify(r, null, 2) + '\n');
    console.log(JSON.stringify(r));
    done(r);
  });
});

fs.mkdirSync(OUT, { recursive: true });
const ids = only.length ? only : Object.keys(M);
// Three at a time: each run builds its own fixtures under its own mkdtemp root.
const queue = [...ids];
await Promise.all([0, 1, 2].map(async () => { while (queue.length) await runOne(queue.shift()); }));
