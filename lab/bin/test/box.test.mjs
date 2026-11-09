// [EXP-G03] Why: verify rejection boundaries without granting fixtures access to an engine.
// Rejected: assertions that merely repeat the generated docker argv.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { BOX_ENV, profileProblems, selectBoxInputs, tarFiles } from '../box.mjs';
import { qualifyClaim } from '../claim.mjs';
const file = text => ({mode:'100644',bytes:Buffer.from(text)});
test('input allowlist never includes lab, links or missing dependency roots',()=>{
 const files=new Map([['package.json',file('{}')],['pnpm-lock.yaml',file('lock')],['pnpm-workspace.yaml',file('workspace')],['packages/core/a.ts',file('x')],['lab/oracles/answers.py',file('expected')]]);
 const snapshot={files};const selectors=['package.json','pnpm-lock.yaml','pnpm-workspace.yaml','packages/core/'];
 assert.deepEqual([...selectBoxInputs(snapshot,selectors).keys()],[...files.keys()].slice(0,4));
 for(const p of ['lab/','../','/tmp','packages/../lab'])assert.throws(()=>selectBoxInputs(snapshot,[...selectors,p]));
 files.set('packages/core/a.ts',{...file('/lab'),mode:'120000'});assert.throws(()=>selectBoxInputs(snapshot,selectors),/regular git blob/);
 assert.throws(()=>selectBoxInputs(snapshot,['packages/core/']));
});
test('tar carries exact bytes, executable mode and long ustar path without extracting',()=>{
 const long='packages/'+('x'.repeat(80))+'/entry.ts';const tar=tarFiles(new Map([[long,file('long')],['run.sh',{...file('hello\n'),mode:'100755'}]]));
 const names=execFileSync('tar',['-tf','-'],{input:tar,encoding:'utf8'});assert.ok(names.includes(long));
 assert.equal(execFileSync('tar',['-xOf','-','run.sh'],{input:tar,encoding:'utf8'}),'hello\n');
 assert.throws(()=>tarFiles(new Map([['../outside',file('x')]])));
});
const expected={image:'sha256:abc',network:'none',memory:123,pids:64,mounts:[{name:'tx2-instance',target:'/work',rw:false}],env:[]};
function valid(){return {Image:expected.image,Config:{User:'10001:10001',Hostname:'tx2-box',Env:BOX_ENV},Mounts:[{Type:'volume',Name:'tx2-instance',Destination:'/work',RW:false}],HostConfig:{Privileged:false,ReadonlyRootfs:true,PidMode:'',IpcMode:'private',NetworkMode:'none',CapDrop:['ALL'],CapAdd:[],SecurityOpt:['no-new-privileges=true'],Devices:[],Memory:123,MemorySwap:123,PidsLimit:64,OomScoreAdj:500,NanoCpus:1e9,Tmpfs:{'/tmp':'rw,nosuid,nodev,size=1g,mode=1777'},RestartPolicy:{Name:'no'},LogConfig:{Config:{'max-size':'1m','max-file':'1'}}}};}
test('inspect check refuses changed containment, limits, image, mounts and environment',()=>{
 assert.deepEqual(profileProblems(valid(),expected),[]);
 const mutations=[c=>c.Image='other',c=>c.Config.User='0',c=>c.HostConfig.Privileged=true,c=>c.HostConfig.PidMode='host',c=>c.HostConfig.NetworkMode='bridge',c=>c.HostConfig.ReadonlyRootfs=false,c=>c.HostConfig.CapAdd=['SYS_ADMIN'],c=>c.HostConfig.SecurityOpt=[],c=>c.HostConfig.MemorySwap=0,c=>c.HostConfig.PidsLimit=0,c=>c.HostConfig.Tmpfs={},c=>c.Mounts.push({Type:'bind',Source:'/Users',Destination:'/host',RW:true}),c=>c.Mounts[0].RW=true,c=>c.Config.Env=[]];
 for(const mutate of mutations){const c=valid();mutate(c);assert.ok(profileProblems(c,expected).length);}
});
test('qualification refuses refs and never calls a supplied candidate callback',()=>{
 let called=false;const result=qualifyClaim({}, {authorityRef:'main',sut:()=>{called=true;throw Error('candidate executed')}});
 assert.equal(called,false);assert.equal(result.verdict,'DIAGNOSTIC');assert.equal(result.offlineVerdict,'DIAGNOSTIC');
 assert.ok(result.reasons.some(r=>r.code==='ISOLATION-NOT-IN-FORCE'));
});
test('failed cleanup reservations survive reconciliation',async()=>{
 const {reconcile}=await import('../lib.mjs');const ledger={reservations:[{container:'gone',cleanupFailed:true,pid:null}]};
 assert.deepEqual(reconcile(ledger,[]),[]);assert.equal(ledger.reservations.length,1);
});
test('a separate clone in a shared writable root is still refused',async()=>{
 const {evaluatorCloneProblems}=await import('../claim.mjs');
 const source={commonDir:()=>'/source/.git'},evaluator={commonDir:()=>'/private/tmp/evaluator/.git',gitDir:()=>'/private/tmp/evaluator/.git'};
 assert.ok(evaluatorCloneProblems('/private/tmp/evaluator',source,evaluator,'/private/tmp/evaluator/runs/a').length);
 assert.ok(evaluatorCloneProblems('/Users/sam/.tx2-evaluator/repo',source,{...evaluator,gitDir:()=>'/source/worktrees/g03'},'/Users/sam/.tx2-evaluator/repo/runs/a').length);
});
// [EXP-G03] Why: a parallel Docker-list snapshot can omit a just-created box after its creator exits, before proof starts.
// Rejected: testing only cleanupFailed, which is set too late to protect that interval.
test('box reservations survive stale Docker snapshots before the kill proof starts',async()=>{
 const {reconcile}=await import('../lib.mjs');const entry={container:'tx2-g03-new-build',cleanupRequired:true,pid:999999,memBytes:67108864},ledger={reservations:[entry]};
 assert.deepEqual(reconcile(ledger,[]),[]);assert.deepEqual(ledger.reservations,[entry]);
 assert.deepEqual(reconcile(ledger,[{name:entry.container,running:false}]),[]);assert.deepEqual(ledger.reservations,[entry]);
});
