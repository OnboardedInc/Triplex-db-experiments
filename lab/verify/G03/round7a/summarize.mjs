// [CX-VG03-56-R7A] Why: require completed-process receipts, exact test totals and retained bytes before recording final checks. Rejected: converting queued work or the builder's historical TAP into a fresh pass.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
const dir=import.meta.dirname,root=path.resolve(dir,'../../../..'),durable='/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VG03-56/round7a';
const sha=b=>createHash('sha256').update(b).digest('hex'),git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:16*1024*1024});
const observed=JSON.parse(fs.readFileSync(path.join(dir,'process-exits.json')));
const suites=[['full-attempt1',268,['lab/bin/test/claim.test.mjs','lab/bin/test/claim-round2.test.mjs','lab/bin/test/lab.test.mjs','lab/bin/test/box.test.mjs','lab/bin/test/box-policy.test.mjs','lab/experiments/EXP-G03/ns/offline.test.mjs','lab/experiments/EXP-G03/ns/fault.test.mjs','lab/experiments/EXP-G03/ns/round7a.test.mjs']],['ns-attempt1',160,['lab/bin/test/lab.test.mjs','lab/bin/test/box.test.mjs','lab/bin/test/box-policy.test.mjs','lab/experiments/EXP-G03/ns/offline.test.mjs','lab/experiments/EXP-G03/ns/fault.test.mjs','lab/experiments/EXP-G03/ns/round7a.test.mjs']],['evaluator-attempt1',108,['lab/bin/test/claim.test.mjs','lab/bin/test/claim-round2.test.mjs']]];
const checks=suites.map(([name,expected,files])=>{
 assert.equal(observed[name],0,'actual observed process exit '+name);const bytes=fs.readFileSync(path.join(dir,name+'.tap')),tap=bytes.toString(),counts={};
 for(const key of ['tests','pass','fail','cancelled','skipped','todo']){const matches=[...tap.matchAll(new RegExp('^# '+key+' (\\d+)$','gm'))];assert.equal(matches.length,1,name+' terminal '+key);counts[key]=Number(matches[0][1])}
 assert.equal(counts.tests,expected);assert.equal(counts.pass,expected);for(const key of ['fail','cancelled','skipped','todo'])assert.equal(counts[key],0);
 assert.equal([...tap.matchAll(/^ok \d+ - /gm)].length,expected);assert.ok(!/^not ok /m.test(tap));assert.match(tap,new RegExp('^1\\.\\.'+expected+'$','m'));
 return {name,command:['node','lab/bin/heavy.mjs','--label',name==='full-attempt1'?'CX-VG03-56-R7A-full':name==='ns-attempt1'?'CX-VG03-56-R7A-ns':'CX-VG03-56-R7A-evaluator','--','node','--test',...files],exit:observed[name],...counts,tapSha256:sha(bytes),durationMs:Number(tap.match(/^# duration_ms ([\d.]+)$/m)[1])};
});
assert.equal(observed['contract-verify'],0);assert.match(fs.readFileSync(path.join(dir,'contract-verify.txt'),'utf8'),/second regeneration byte-identical/);
assert.equal(observed['pin-review'],0);const pins=JSON.parse(fs.readFileSync(path.join(dir,'pin-review.json')));assert.deepEqual(pins.changedDirectPins,[]);assert.deepEqual(pins.changedEvaluatorClosure,[]);assert.notEqual(pins.driverBundle.oldSha256,pins.driverBundle.newSha256);
assert.equal(git(['diff','9c4b68aa','--','.',':!lab/verify/G03']), '');
const traces=[],holders=new Set();
for(const run of ['full-attempt1','evaluator-attempt1']){
 const base=path.join(durable,run),names=fs.readdirSync(base).filter(n=>n.endsWith('.json')).sort();assert.ok(names.length>0);let bytes=0;
 const manifest=names.map(name=>{const b=fs.readFileSync(path.join(base,name));bytes+=b.length;const doc=JSON.parse(b);assert.match(doc.request.holder,/^CX-G03-r3-(claim|integrity)-[a-f0-9]{8}$/);holders.add(doc.request.holder);return sha(b)+'  '+name}).join('\n')+'\n';
 fs.writeFileSync(path.join(base,'SHA256SUMS'),manifest);fs.writeFileSync(path.join(dir,run+'-trace-SHA256SUMS'),manifest);traces.push({run,path:base,files:names.length,bytes,manifestSha256:sha(manifest)});
}
const inventories=[];for(const holder of [...holders].sort()){
 const run=holder.slice('CX-G03-'.length),raw=execFileSync(process.execPath,['lab/bin/engine.mjs','box','inventory','--run',run,'--holder',holder],{cwd:root,encoding:'utf8',maxBuffer:2*1024*1024}),inventory=JSON.parse(raw);
 assert.deepEqual(inventory,{containers:'',volumes:'',networks:''},'cleanup '+holder);assert.equal(fs.existsSync('/Users/sam/.tx2-evaluator/fixtures-g03-'+run),false);inventories.push({holder,run,...inventory});
}
const result={review:'CX-VG03-56-R7A',at:new Date().toISOString(),verdict:'FIX-FIRST',qualification:false,reviewedCode:'ef1a9216',reviewedReport:'9c4b68aa',testedCommit:'3a8cdeb7ef5f344cdcfb220d9012400f81307672',currentHead:git(['rev-parse','HEAD']).trim(),reviewedSourceUnchanged:true,checks,contract:{exit:0,byteIdentical:true},pins:{exit:0,changedDirectPins:[],changedEvaluatorClosure:[],driverBundle:pins.driverBundle},traces,inventories,remainingFindings:['F3 control-stream rejection skips terminal/raw export','F4 null initial domain bypasses constant-domain check']};
fs.writeFileSync(path.join(dir,'checks.json'),JSON.stringify(result,null,2)+'\n');fs.writeFileSync(path.join(durable,'INDEX.json'),JSON.stringify({review:result.review,qualification:false,traces,retention:'Synthetic fixture request/result traces from the two completed reviewer runs; no credentials/dependency caches copied.'},null,2)+'\n');
console.log(JSON.stringify({verdict:result.verdict,qualification:false,checks:checks.map(c=>({name:c.name,exit:c.exit,pass:c.pass})),holdersGone:inventories.length,traces:traces.map(t=>({run:t.run,files:t.files,bytes:t.bytes}))},null,2));
