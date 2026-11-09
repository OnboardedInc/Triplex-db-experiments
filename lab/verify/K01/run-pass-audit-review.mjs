// [EXP-K01-VK01-R4] Why: keep fresh offline gates and adapted regressions separate from prior failure evidence. Rejected: overwriting historical case files or adopting earlier passing TAP.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const root = path.resolve(import.meta.dirname, '../../..');
const out = path.join(root, 'lab/verify/K01/evidence/review-round4');
const tmp = path.join(import.meta.dirname, 'tmp/review-round4');
if (fs.statfsSync(root).bavail * fs.statfsSync(root).bsize < 5 * 1024 ** 3) throw Error('host disk below 5 GiB');
fs.mkdirSync(out, { recursive: true }); fs.mkdirSync(tmp, { recursive: true });
const hash = b => createHash('sha256').update(b).digest('hex');
const tracked = ['lab/bin/engine.mjs','lab/bin/owner-state.mjs','lab/bin/xtdb-log.mjs','lab/bench/clone-check.ts','lab/bench/lib/clone.ts','lab/bench/lib/bulk.ts','lab/experiments/EXP-K01-seed-clone/round2-live.mjs','lab/verify/K01/freshness.test.mjs','lab/verify/K01/round4.test.mjs','lab/verify/K01/tail-fixtures.mjs','lab/verify/K01/run-pass-audit-review.mjs','lab/verify/K01/pass-audit-review.test.mjs','lab/bin/lib.mjs','lab/verify/K01/q83e-review.test.mjs','lab/verify/K01/round5.test.mjs','lab/verify/K01/offline.test.mjs','lab/verify/K01/round3.test.mjs','lab/bench/test/clone.test.ts'];
const receipt = { at: new Date().toISOString(), head: spawnSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).stdout.trim(), offlineOnly: true, hostDisk: fs.statfsSync(root), node: process.version, sources: Object.fromEntries(tracked.map(f=>[f,hash(fs.readFileSync(path.join(root,f)))])), runs: [] };
const casePaths = ['lab/verify/K01/evidence/cases.json','lab/verify/K01/evidence/review-round2/freshness-cases.json','lab/verify/K01/evidence/review-round3/new-cases.json'];
const old = casePaths.map(f=>fs.existsSync(path.join(root,f))?fs.readFileSync(path.join(root,f)):null);
try {
 for(const [label,args] of [
 ['pass-audit-review',['--test','lab/verify/K01/pass-audit-review.test.mjs']],
 ]) {
  const start=Date.now(), r=spawnSync(process.execPath,args,{cwd:root,env:{...process.env,TMPDIR:tmp},encoding:'utf8',timeout:120000,maxBuffer:16<<20});
  const text=(r.stdout??'')+(r.stderr??''); fs.writeFileSync(path.join(out,label+'.log'),text);
  receipt.runs.push({label,args,exit:r.status,signal:r.signal,error:r.error?.message??null,elapsedMs:Date.now()-start,sha256:hash(text)});
 }
 for(const f of [])if(fs.existsSync(path.join(root,f)))fs.copyFileSync(path.join(root,f),path.join(out,path.basename(f)));
} finally {
 casePaths.forEach((f,i)=>{if(old[i])fs.writeFileSync(path.join(root,f),old[i]);else fs.rmSync(path.join(root,f),{force:true});});
 fs.rmSync(tmp,{recursive:true,force:true});
 fs.writeFileSync(path.join(out,'pass-audit-run.json'),JSON.stringify(receipt,null,2)+'\n');
}
process.stdout.write(JSON.stringify(receipt,null,2)+'\n');
process.exitCode=receipt.runs.some(r=>r.exit!==0||r.signal||r.error)?1:0;
