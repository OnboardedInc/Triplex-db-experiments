// [CX-VG03-7D] Why: require actual fresh offline evidence and keep prohibited fixture gates explicitly missing before emitting the final verdict. Rejected: turning historical builder logs or running jobs into reviewer acceptance.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
const dir=import.meta.dirname,root=path.resolve(dir,'../../../..'),sha=b=>createHash('sha256').update(b).digest('hex'),read=n=>fs.readFileSync(path.join(dir,n)),json=n=>JSON.parse(read(n)),git=a=>execFileSync('git',a,{cwd:root});
const exits=json('process-exits.json');assert.equal(git(['diff','1432f79a','--','.',':!lab/verify/G03']).length,0);
assert.match(git(['branch','--show-current']).toString(),/^verify\/G03-7d\n$/);
const checks=[];
for(const [name,wantPass,wantFail]of [['ns',186,1],['ns-attempt2',187,0]]){
 const tap=read(name+'.tap').toString();assert.equal(exits[name],wantFail?1:0);
 for(const [kind,count]of [['tests',187],['pass',wantPass],['fail',wantFail],['cancelled',0],['skipped',0],['todo',0]])assert.match(tap,new RegExp('^# '+kind+' '+count+'$','m'));
 if(wantFail){assert.match(tap,/sysctl:.*Operation not permitted/);assert.match(tap,/not ok \d+ - guarded driver can stage in private runtime parent beside readonly bundle/)}
 checks.push({name,pass:wantPass,fail:wantFail,total:187,exit:exits[name],tapSha256:sha(Buffer.from(tap))});
}
assert.equal(exits['contract-verify'],0);assert.match(read('contract-verify.txt').toString(),/second regeneration byte-identical/);
const control=json('control-review.json');assert.equal(exits['control-review'],0);assert.equal(control.observations.length,101);assert.ok(control.observations.every(o=>o.exact===true));assert.equal(control.boxSha256,sha(fs.readFileSync(path.join(root,'lab/bin/box.mjs'))));
const retention=json('retention-final.json');assert.equal(exits['retention-final'],0);assert.equal(retention.observations.length,12);assert.ok(retention.observations.every(o=>o.nineVolumesSurviveClose===true));assert.equal(retention.coordinatorSha256,sha(fs.readFileSync(path.join(root,'lab/bin/ns-run.mjs'))));assert.equal(retention.boxSha256,control.boxSha256);assert.equal(retention.reviewerToolSha256,sha(read('retention-review.mjs')));
const liveness=json('liveness-review.json');assert.equal(exits['liveness-review'],0);assert.equal(liveness.head,exits.testedHead);assert.deepEqual(liveness.observations.map(o=>[o.name,o.pass,o.fail,o.exit]),[['current',27,0,0],['old-both',17,10,1],['old-box',20,7,1],['old-ns',24,3,1]]);
for(const o of liveness.observations){assert.equal(o.tapSha256,sha(read('liveness-'+o.name+'.tap')));assert.equal(o.manifestSha256,sha(read('liveness-'+o.name+'-sources.json')))}
const pins=json('pin-review.json');assert.equal(exits['pin-review'],0);assert.equal(pins.testedHead,exits.testedHead);assert.deepEqual(pins.changedDirectPins,[]);assert.equal(pins.acceptanceUnchanged,true);assert.equal(pins.reviewedSourceUnchanged,true);
const raw=json('raw-evidence.json');assert.equal(raw.copyVerifiedBeforeLocalRemoval,true);
for(const e of raw.entries){const b=fs.readFileSync(path.join(raw.root,e.path));assert.equal(b.length,e.bytes);assert.equal(sha(b),e.sha256)}
assert.match(exits.full,/^NOT RUN/);assert.match(exits.evaluator,/^NOT RUN/);
const summary={at:new Date().toISOString(),review:'CX-VG03-7D',testedHead:exits.testedHead,verdict:'FIX-FIRST',reason:'Fresh requested full/evaluator gates require Docker lifecycle prohibited by the task; no remaining F5/F6/F7 code defect reproduced offline',qualification:false,checks,contract:{exit:0,byteIdentical:true},controlCases:101,retentionCases:12,regressionCounts:liveness.observations.map(({name,pass,fail})=>({name,pass,fail})),full:exits.full,evaluator:exits.evaluator,rawRoot:raw.root,rawFiles:raw.files,rawBytes:raw.bytes};
fs.writeFileSync(path.join(dir,'summary.json'),JSON.stringify(summary,null,2)+'\n');
const artifacts=[];for(const entry of fs.readdirSync(dir,{withFileTypes:true})){assert.ok(entry.isFile(),'raw output must be outside git: '+entry.name);if(entry.name==='SHA256SUMS')continue;const b=read(entry.name);assert.ok(b.length<=1000000,entry.name+' is too large');artifacts.push({path:entry.name,sha256:sha(b)})}
const report=path.resolve(dir,'../VERIFY-round7d.md');artifacts.push({path:'../VERIFY-round7d.md',sha256:sha(fs.readFileSync(report))});
fs.writeFileSync(path.join(dir,'SHA256SUMS'),artifacts.sort((a,b)=>a.path.localeCompare(b.path)).map(e=>e.sha256+'  '+e.path+'\n').join(''));
console.log(JSON.stringify(summary,null,2));
