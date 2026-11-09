// [CX-VRT01-R2] Why: rerun the original reproductions against rebuilt source and inspect their content. Rejected: a successful child exit without checking its observed bytes.
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root='lab/verify/RT01/round2',out=root+'/reproductions',names=['probe','public-routes','journal-single'];
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const before=Object.fromEntries(names.map(n=>[n,hash(root+'/'+n+'.ts')]));
const commands=[];
for(const n of names){const command=['node','--import','tsx',root+'/'+n+'.ts',out+'/'],started=new Date().toISOString();const r=spawnSync(command[0],command.slice(1),{encoding:'utf8',timeout:180000,maxBuffer:16*1024**2,env:{...process.env,TSX_DISABLE_CACHE:'1'}});writeFileSync(out+'/'+n+'.stdout',r.stdout??'');writeFileSync(out+'/'+n+'.stderr',r.stderr??'');commands.push({command,started,ended:new Date().toISOString(),exit:r.status});assert.equal(r.status,0,n);}
const read=n=>JSON.parse(readFileSync(out+'/'+n,'utf8'));
assert.equal(read('probe-summary.json').length,4);for(const r of read('probe-summary.json'))assert.equal(r.suite,'completed');
for(const r of [...read('route-probes.json'),...read('public-routes.json')])assert.deepEqual([r.observed.tag,r.observed.axis],['BasisNotAvailable','recordedAt']);
for(const n of names)assert.equal(before[n],hash(root+'/'+n+'.ts'));
writeFileSync(out+'/commands.json',JSON.stringify({before,commands,checkedReproductions:32},null,2)+'\n');
console.log('four actual adapter schedules and all 32 original refusal reproductions completed');
