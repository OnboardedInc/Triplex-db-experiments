// [EXP-G03] Why: audit only this attempt's named holders and preserve the declared round-2 store.
// Rejected: broad cleanup of other agents or accepting an empty Docker listing without checking command success.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';
import {POOL_FILE,sha256} from '../../../bin/lib.mjs';
const dir=path.resolve(process.argv[2]??import.meta.dirname),provenance=JSON.parse(fs.readFileSync(path.join(dir,'fixture-provenance.json')));
const inventory=holder=>{const r=spawnSync(process.execPath,['lab/bin/engine.mjs','box','inventory','--run','r4-audit','--holder',holder],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);return JSON.parse(r.stdout)};
const inventories=provenance.map(p=>({holder:p.holder,...inventory(p.holder)}));
for(const r of inventories)for(const k of ['containers','volumes','networks'])assert.equal(r[k],'',r.holder+' '+k);
const retainedRound2=inventory('CX-G03');assert.equal(retainedRound2.containers,'');assert.equal(retainedRound2.networks,'');
assert.deepEqual(retainedRound2.volumes.trim().split('\n').filter(Boolean).map(s=>JSON.parse(s).Name),['tx2-g03-r2store-store-b2b3e6e8cdfb']);
const holders=new Set([...provenance.map(p=>p.holder),'CX-G03']);const reservations=JSON.parse(fs.readFileSync(POOL_FILE())).reservations.filter(r=>holders.has(r.holder));assert.deepEqual(reservations,[]);
const remainingClones=provenance.map(p=>'fixtures-g03-'+p.holder.replace(/^CX-G03-/,'' )).filter(name=>fs.existsSync(path.join('/Users/sam/.tx2-evaluator',name)));assert.deepEqual(remainingClones,[]);
fs.writeFileSync(path.join(dir,'cleanup-final.json'),JSON.stringify({observedAt:new Date().toISOString(),sourceSnapshotSha256:sha256(fs.readFileSync(path.join(dir,'source-snapshot.json'))),inventories,retainedRound2,reservations,remainingClones},null,2)+'\n');
console.log('attempt holders empty; retained round-2 store only');
