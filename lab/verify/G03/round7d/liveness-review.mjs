// [CX-VG03-7D] Why: run unchanged current regressions against exact Git blobs from both revisions. Rejected: inferring regression sensitivity from the new code or retaining redundant source copies after recording their Git identities.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {spawnSync,execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
const root=path.dirname(new URL(import.meta.url).pathname),repo=path.resolve(root,'../../../..'),sha=b=>createHash('sha256').update(b).digest('hex');
const git=(args)=>execFileSync('git',args,{cwd:repo,maxBuffer:32*1024*1024});
const head=git(['rev-parse','HEAD']).toString().trim(),old=git(['rev-parse','67844167']).toString().trim();
const files=git(['ls-tree','-r','--name-only',head,'lab/bin','lab/bench/ns-driver','lab/experiments/EXP-G03/ns']).toString().trim().split('\n');
const observations=[];
for(const [name,oldFiles,wantPass,wantFail]of [['current',[],27,0],['old-both',['lab/bin/box.mjs','lab/bin/ns-run.mjs'],17,10],['old-box',['lab/bin/box.mjs'],20,7],['old-ns',['lab/bin/ns-run.mjs'],24,3]]){
 const snapshot=path.join(root,'snapshot-'+name);fs.mkdirSync(snapshot);const manifest=[];
 for(const p of files){const ref=oldFiles.includes(p)?old:head,b=git(['show',ref+':'+p]),dest=path.join(snapshot,p);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,b);manifest.push({path:p,commit:ref,sha256:sha(b)})}
 fs.writeFileSync(path.join(root,'liveness-'+name+'-sources.json'),JSON.stringify(manifest,null,2)+'\n');
 const result=spawnSync(process.execPath,['--test','lab/experiments/EXP-G03/ns/round7c.test.mjs'],{cwd:snapshot,encoding:'utf8',maxBuffer:8*1024*1024});
 fs.writeFileSync(path.join(root,'liveness-'+name+'.tap'),result.stdout);fs.writeFileSync(path.join(root,'liveness-'+name+'.stderr'),result.stderr);
 const total=Number(result.stdout.match(/^# tests (\d+)$/m)?.[1]),pass=Number(result.stdout.match(/^# pass (\d+)$/m)?.[1]),fail=Number(result.stdout.match(/^# fail (\d+)$/m)?.[1]);
 assert.equal(result.status,wantFail?1:0,result.stderr);assert.equal(total,27);assert.equal(pass,wantPass);assert.equal(fail,wantFail);
 for(const kind of ['cancelled','skipped','todo'])assert.match(result.stdout,new RegExp('^# '+kind+' 0$','m'));
 const failures=[...result.stdout.matchAll(/^not ok \d+ - (.+)$/gm)].map(m=>m[1]);assert.equal(failures.length,wantFail);
 if(name==='old-both')assert.ok(failures.every(n=>/control-(null|array|scalar)|^F7:|^F5:/.test(n)));
 observations.push({name,oldFiles,exit:result.status,total,pass,fail,failures,tapSha256:sha(Buffer.from(result.stdout)),manifestSha256:sha(fs.readFileSync(path.join(root,'liveness-'+name+'-sources.json')))});
 // All child processes exited synchronously; only the owned, fully indexed snapshot is removed. Git blobs and the source manifest are retained.
 fs.rmSync(snapshot,{recursive:true});assert.equal(fs.existsSync(snapshot),false);
}
console.log(JSON.stringify({at:new Date().toISOString(),head,old,observations},null,2));
