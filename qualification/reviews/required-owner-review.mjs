// @ts-nocheck -- [EXP-CHECKJS] option bags inferred from defaults omit optional fields. Binding errors remain checked by lab/bin/checkjs.mjs.
/** Independent actual stopped-owner admission review; never changes canonical owners. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { openContext, locked, snapshot } from '../devloop/state.mjs';
import { enqueue, grantNext, reservations } from '../devloop/scheduler.mjs';
import { hashFile, readJson, processIdentity } from '../devloop/io.mjs';

const root=path.resolve(import.meta.dirname,'../..'),directory=path.join(root,'.artifacts/required-owner-independent',randomUUID());
await fs.mkdir(directory,{recursive:true});
const canonicalFile=path.join(root,'.devloop/state.json'),beforeCanonical=await readJson(canonicalFile);
const auxiliary=structuredClone(beforeCanonical.owners['aux-postgres-compiler-tests']);
assert.equal(auxiliary.status,'released');
assert.equal(auxiliary.containerId,'544b3d4ec8392c69ddc234168ff6621614f8cfd254e59ce14c638a0c8b5f3818');
const policy={format:'triplex-devloop-policy/1',maximumHeavyTrials:3,memoryPoolBytes:2*1024**3,cpuPoolUnits:3,maximumLogBytesPerAttempt:8192,lanes:{'qlever-native':'qlever'},promotion:{}};
const context=await openContext(root,{stateDirectory:path.relative(root,path.join(directory,'state')),testPolicy:policy});
const runner=path.join(directory,'must-not-run.mjs'),marker=path.join(directory,'forbidden-child-marker');
await fs.writeFile(runner,`import{writeFileSync}from'node:fs';writeFileSync(${JSON.stringify(marker)},'unexpected child');\n`,{flag:'wx'});
const makeJob=async(id,ownerId)=>({format:'triplex-devloop-job/1',id,kind:'fixture',queryPath:'qlever-native',backend:'qlever',author:'qlever-independent-reviewer',problemId:'stale-active-owner-admission',logicalTaskId:'required-owner-freshness',hypothesis:'Fresh actual stopped Docker or mismatched host birth identity prevents attempt creation and durably retains UNKNOWN reservation',goals:[6,7],dependsOn:[],requiredOwners:[ownerId],inspiration:[{reference:'qualification/devloop/scheduler.mjs',mechanism:'Fresh private identity inspection precedes grant creation',adaptation:'Copy only historical ownership into isolated component state; inspect actual stopped auxiliary without starting or stopping any service.'}],command:{argv:[process.execPath,runner],cwd:'.',env:{}},resources:{heavy:false,memoryBytes:128*1024**2,cpuUnits:1,diskBytes:1024**2,timeoutMilliseconds:1000,maximumLogBytes:8192},inputs:await Promise.all([[path.relative(root,runner),'runner'],['qualification/devloop/scheduler.mjs','source']].map(async([file,role])=>({path:file,role,sha256:await hashFile(path.join(root,file))}))),evidence:{checks:[],requiredCheckKeys:[]},retention:{scratch:'retain-forensic'}});

await locked(context,state=>{state.owners[auxiliary.id]={...auxiliary,status:'active'};});
await enqueue(context,await makeJob('actual-stopped-auxiliary',auxiliary.id));
const reservedBefore=reservations(await snapshot(context));
await assert.rejects(grantNext(context,{onlyJob:'actual-stopped-auxiliary',executor:'independent-stopped-owner-review'}),{code:'OWNER_STALE'});
let state=await snapshot(context);
assert.equal(state.owners[auxiliary.id].status,'unknown');
assert.deepEqual(state.owners[auxiliary.id].resources,auxiliary.resources);
assert.deepEqual(reservations(state),reservedBefore);
assert.equal(state.jobs['actual-stopped-auxiliary'].attempts.length,0);
await assert.rejects(fs.stat(path.join(context.directory,'jobs/actual-stopped-auxiliary/attempts')),{code:'ENOENT'});
await assert.rejects(fs.stat(marker),{code:'ENOENT'});
assert.match(state.owners[auxiliary.id].lastRequiredOwnerFailure.message,/stopped|running/i);

// A live numeric PID with a different recorded birth must not satisfy the Mac
// resident proof. No unrelated process is signalled or assigned an identity.
const actualBirth=await processIdentity(process.pid),pidOwnerId='component-own-pid';
await locked(context,state=>{state.owners[pidOwnerId]={id:pidOwnerId,kind:'process',status:'active',pid:process.pid,identity:'intentionally-wrong-birth',resources:{memoryBytes:128*1024**2,cpuUnits:0,diskBytes:0}};});
await enqueue(context,await makeJob('own-pid-wrong-birth',pidOwnerId));
await assert.rejects(grantNext(context,{onlyJob:'own-pid-wrong-birth',executor:'independent-pid-birth-review'}),{code:'OWNER_STALE'});
state=await snapshot(context);
assert.equal(state.owners[pidOwnerId].status,'unknown');
assert.equal(state.jobs['own-pid-wrong-birth'].attempts.length,0);
assert.equal(await processIdentity(process.pid),actualBirth);
await assert.rejects(fs.stat(marker),{code:'ENOENT'});
const afterCanonical=await readJson(canonicalFile);
for(const id of ['foundation-qlever','foundation-xtdb','aux-postgres-compiler-tests']){
  // Another admitted canonical recovery may update Q readiness concurrently.
  // This review compares immutable identities and does not claim quiescent state.
  assert.equal(afterCanonical.owners[id].identity,beforeCanonical.owners[id].identity);
  assert.deepEqual(afterCanonical.owners[id].resources,beforeCanonical.owners[id].resources);
}
const receipt={format:'triplex-independent-required-owner-review/1',reviewer:'qlever-agent',author:'duckdb-agent',status:'PASS_COMPONENT_ONLY_ACTUAL_STOPPED_DOCKER',checks:['Actual stopped owned auxiliary refuses grant','UNKNOWN state is durable and exact reservation retained','No attempt directory or child is created','Actual live own PID with wrong birth refuses grant','Canonical foundation identities and resource reservations unchanged'],auxiliary:{id:auxiliary.id,containerId:auxiliary.containerId,canonicalStatus:auxiliary.status},sourceHashes:Object.fromEntries(await Promise.all(['qualification/devloop/scheduler.mjs','qualification/devloop/state.mjs','qualification/devloop/io.mjs','qualification/reviews/required-owner-review.mjs'].map(async file=>[file,await hashFile(path.join(root,file))]))),limits:['Isolated explicitly component-only state cannot qualify or promote an engine.','No service was started, stopped or restarted by this review.','No engine performance, health endpoint, write durability or complete TOCTOU elimination claim.']};
const output=path.join(directory,'review.json');await fs.writeFile(output,JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({output,status:receipt.status,checks:receipt.checks.length}));
