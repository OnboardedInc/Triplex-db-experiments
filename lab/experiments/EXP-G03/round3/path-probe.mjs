// [EXP-G03] Why: reproduce the PATH fixture's exact low-memory failure and prove the streaming replacement with real boxes.
// Rejected: raising the cap or accepting missing JSON as a passing identity check.
import fs from'node:fs';import os from'node:os';import path from'node:path';import{spawnSync}from'node:child_process';import assert from'node:assert/strict';
import{BoxExecutor}from'../../../bin/box.mjs';import{gitSource}from'../../../bin/claim.mjs';import{REPO,sha256}from'../../../bin/lib.mjs';import{authorityPolicy}from'../../../bin/box-policy.mjs';
const authority={commit:gitSource(REPO).resolve('HEAD'),repo:REPO},holder='CX-G03-r3-path',id='r3-path',store='tx2-g03-r3-path-store';
const engine=(action,args=[])=>{const r=spawnSync(process.execPath,['lab/bin/engine.mjs','box',action,'--run',id,'--holder',holder,...args],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);return JSON.parse(r.stdout)};
const work=fs.mkdtempSync(path.join(os.tmpdir(),'g03-r3-path-')),objects={},put=b=>{const h=sha256(b);objects[h]=Buffer.from(b).toString('base64');return h};let box;
const original="const fs=require('fs'),crypto=require('crypto');console.log(JSON.stringify({path:process.execPath,sha256:crypto.createHash('sha256').update(fs.readFileSync(process.execPath)).digest('hex'),version:process.version}))";
const streaming="(async()=>{const fs=require('fs'),crypto=require('crypto'),hash=crypto.createHash('sha256');for await(const chunk of fs.createReadStream(process.execPath))hash.update(chunk);console.log(JSON.stringify({path:process.execPath,sha256:hash.digest('hex'),version:process.version}))})()";
const results=[];
try{engine('volume',['--name',store]);const policy=authorityPolicy(gitSource(REPO),authority.commit);box=new BoxExecutor({config:{...policy.box,caseMemoryBytes:67108864,store},authority,workDir:work,holder,put});const volume=box.volume('path');
for(const script of[original,streaming]){const r=box.case({volume},Buffer.from('{}'),'normal',['node','-e',script]);results.push({exit:r.exit,stdout:r.stdout.toString(),stderr:r.stderr.toString()})}
assert.equal(results[1].exit,0,results[1].stderr);assert.match(JSON.parse(results[1].stdout).sha256,/^[a-f0-9]{64}$/);
}finally{box?.close();engine('remove-volume',['--name',store]);fs.rmSync(work,{recursive:true,force:true});fs.writeFileSync(path.join(import.meta.dirname,'path-probe.json'),JSON.stringify({authority,results,records:box?.records,objects},null,2))}
console.log(JSON.stringify(results));
