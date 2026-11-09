import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync,spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
// [EXP-DA01] Why: a live PASS requires this attempt's exact test output, unchanged source/builds and the pinned resident, not a historical log. Rejected: treating exit zero alone as acceptance.
const dir=import.meta.dirname,root=process.cwd();
const hash=b=>createHash('sha256').update(b).digest('hex');
const read=p=>JSON.parse(fs.readFileSync(p));
function fingerprint(){
  const files=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','packages/datomic','packages/core','packages/testkit','lab/bin','lab/config','lab/oracles/replay','pnpm-lock.yaml'],{encoding:'utf8'}).trim().split('\n');
  function walk(p){for(const e of fs.readdirSync(p,{withFileTypes:true})){const f=path.join(p,e.name);if(e.isDirectory())walk(f);else if(e.isFile())files.push(f);}}
  for(const p of ['packages/core/dist','packages/testkit/dist'])walk(p);
  return Object.fromEntries([...new Set(files)].sort().map(f=>[f,hash(fs.readFileSync(f))]));
}
const ownerPath='/Users/sam/projects/triplex-db-2/lab/locks/datomic-dev/owner.json';
const ownerBytes=fs.readFileSync(ownerPath,'utf8'),source=fingerprint(),health=await(await fetch('http://127.0.0.1:8470/health')).json();
const image=read('lab/config/slots.json').lanes.datomic.imageId;
const inspect=()=>JSON.parse(execFileSync('docker',['-H','unix:///Users/sam/.colima/triplex2/docker.sock','inspect','tx2-datomic-dev'],{encoding:'utf8'}))[0];
const before=inspect();assert.equal(before.Image,image);assert.equal(before.State.Running,true);
const output=path.join(dir,'live-final.json'),log=path.join(dir,'live-final.log');
assert.equal(fs.existsSync(output),false);const fd=fs.openSync(log,'wx');
const args=['node_modules/vitest/vitest.mjs','run','packages/datomic/test','packages/testkit/test/routeEquivalence.test.ts','--disableConsoleIntercept','--silent=false','--reporter=default','--reporter=json','--outputFile='+output];
const startedAt=new Date().toISOString();
let status;try{status=spawnSync(process.execPath,args,{env:{...process.env,DATOMIC_INTEGRATION:'1'},stdio:['ignore',fd,fd]}).status;}finally{fs.closeSync(fd);}
const report=read(output),events=fs.readFileSync(log,'utf8').split('\n').filter(l=>l.startsWith('{')).flatMap(l=>{try{return [JSON.parse(l)]}catch{return []}}),created=events.filter(e=>e.kind==='datomic-test-db-created'),deleted=events.filter(e=>e.kind==='datomic-test-db-deleted');
const outcome={startedAt,endedAt:new Date().toISOString(),head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),source,health,image,containerId:before.Id,owner:JSON.parse(ownerBytes),args,status,outputSha256:hash(fs.readFileSync(output)),logSha256:hash(fs.readFileSync(log)),created,deleted,passed:report.numPassedTests,failures:report.numFailedTests};
fs.writeFileSync(path.join(dir,'live-receipt.json'),JSON.stringify(outcome,null,2)+'\n',{flag:'wx'});
assert.equal(status,0);assert.equal(report.success,true);assert.equal(report.numPassedTests,118);assert.equal(report.numFailedTests,0);assert.equal(report.numPendingTests,0);
assert.equal(created.length,18);assert.equal(deleted.length,18);for(const c of created)assert.equal(deleted.filter(d=>d.scope===c.scope&&d.db===c.db&&d.deleted===true).length,1);
assert.deepEqual(fingerprint(),source);assert.equal(fs.readFileSync(ownerPath,'utf8'),ownerBytes);assert.deepEqual(await(await fetch('http://127.0.0.1:8470/health')).json(),health);
const after=inspect();assert.equal(after.Id,before.Id);assert.equal(after.State.StartedAt,before.State.StartedAt);assert.equal(after.Image,image);
console.log(JSON.stringify({validated:true,passed:report.numPassedTests,deleted:deleted.length,image}));
