// [CX-VRT01-R3] Why: rerun all previous counterexamples on fresh source and inspect complete outcomes. Rejected: replacing the previous failed verdict with a builder exit code.
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root='lab/verify/RT01/round3',out=root+'/reproductions',names=['probe','public-routes','journal-single','read-matrix','pending-reads','pending-proof'];
for(const folder of ['matrix','pending','pending-proof'])mkdirSync(root+'/'+folder,{recursive:true});
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const before=Object.fromEntries(names.map(n=>[n,hash(root+'/'+n+'.ts')]));const commands=[];
for(const n of names){const command=['node','--import','tsx',root+'/'+n+'.ts',out+'/'],started=new Date().toISOString();const r=spawnSync(command[0],command.slice(1),{encoding:'utf8',timeout:180000,maxBuffer:16*1024**2,env:{...process.env,TSX_DISABLE_CACHE:'1'}});writeFileSync(out+'/'+n+'.stdout',r.stdout??'');writeFileSync(out+'/'+n+'.stderr',r.stderr??'');commands.push({command,started,ended:new Date().toISOString(),exit:r.status});assert.equal(r.status,0,n);}
const read=p=>JSON.parse(readFileSync(root+'/'+p,'utf8'));
assert.equal(read('reproductions/probe-summary.json').length,4);for(const r of read('reproductions/probe-summary.json'))assert.equal(r.suite,'completed');
for(const r of [...read('reproductions/route-probes.json'),...read('reproductions/public-routes.json')])assert.deepEqual([r.observed.tag,r.observed.axis],['BasisNotAvailable','recordedAt']);
for(const folder of ['matrix','pending']){const s=read(folder+'/summary.json');assert.equal(s.scenarios,s.matches);assert.equal(s.scenarios,folder==='matrix'?510:80);}
for(const row of read('pending-proof/summary.json')){assert.equal(row.before.error.tag,'BasisNotAvailable');assert.equal(row.before.error.axis,'recordedAt');assert.equal(row.afterRows,1);}
for(const n of names)assert.equal(before[n],hash(root+'/'+n+'.ts'));
writeFileSync(out+'/commands.json',JSON.stringify({before,commands},null,2)+'\n');console.log('all original reproductions, matrices and pending before/after schedules match');
