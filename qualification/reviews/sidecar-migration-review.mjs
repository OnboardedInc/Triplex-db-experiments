// @ts-nocheck -- [EXP-CHECKJS] option bags inferred from defaults omit optional fields. Binding errors remain checked by lab/bin/checkjs.mjs.
/** Independent v2 publication/tamper review, with real owned crash injection.
 * All mutations below are confined to new explicit component contexts.
 */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { atomicJson, hashFile, readJson } from '../devloop/io.mjs';
import { openContext, loadJobManifest, readState } from '../devloop/state.mjs';
import { enqueue, grantNext, reservations } from '../devloop/scheduler.mjs';
import { executeNext } from '../devloop/executor.mjs';
import { verifyAttempt } from '../devloop/evidence.mjs';
import { migrateState } from '../devloop/migration.mjs';

const root=path.resolve(import.meta.dirname,'../..'),directory=path.join(root,'.artifacts/sidecar-migration-independent',randomUUID());
await fs.mkdir(directory,{recursive:true});
const policy={format:'triplex-devloop-policy/1',maximumHeavyTrials:3,memoryPoolBytes:512*1024**2,cpuPoolUnits:2,sampleMilliseconds:40,terminationGraceMilliseconds:200,maximumLogBytesPerAttempt:8192,lanes:{'qlever-native':'qlever'},promotion:{}};
const checks=[];
async function setup(name){
  const d=path.join(directory,name);await fs.mkdir(d);
  const context=await openContext(root,{stateDirectory:path.relative(root,path.join(d,'state')),testPolicy:policy});
  const runner=path.join(d,'child.mjs'),oracle=path.join(d,'expected.json');
  await fs.writeFile(runner,`import{writeFileSync}from'node:fs';import{join}from'node:path';writeFileSync(join(process.env.TRIPLEX_RUN_ARTIFACTS,'answer.json'),JSON.stringify({value:7})+'\\n');\n`,{flag:'wx'});
  await fs.writeFile(oracle,JSON.stringify({value:7})+'\n',{flag:'wx'});
  const manifest={format:'triplex-devloop-job/1',id:'sample',kind:'fixture',queryPath:'qlever-native',backend:'qlever',author:'qlever-independent-reviewer',problemId:'state-sidecar-publication',logicalTaskId:'independent-state-sidecar-review',hypothesis:'Sidecar identities preserve exact history and refuse tampered inputs before children; a real pre-rename crash leaves v1 authoritative',goals:[6,7],dependsOn:[],inspiration:[{reference:'qualification/devloop/migration.mjs',mechanism:'Hashed immutable envelope sidecars keep the mutable state bounded',adaptation:'Independent actual source/result/path/header/crash fixtures with a retained unqualified orphan'}],command:{argv:[process.execPath,runner],cwd:'.',env:{}},resources:{heavy:false,memoryBytes:384*1024**2,cpuUnits:1,diskBytes:1024**2,timeoutMilliseconds:5000,maximumLogBytes:8192},inputs:await Promise.all([[path.relative(root,runner),'runner'],[path.relative(root,oracle),'oracle'],['qualification/devloop/state.mjs','source']].map(async([file,role])=>({path:file,role,sha256:await hashFile(path.join(root,file))}))),evidence:{checks:[{key:'exact-answer',expectedInput:path.relative(root,oracle),actual:'artifacts/answer.json'}],requiredCheckKeys:['exact-answer']}};
  await enqueue(context,manifest);return{context,manifest,runner,oracle,d};
}
async function legacy(context,orphan=false){
  const state=await readState(context),job=state.jobs.sample;
  job.manifest=await loadJobManifest(context,job);delete job.manifestRef;
  if(orphan){job.status='cleanup_unknown';job.attempts.at(-1).status='cleanup_unknown';delete job.attempts.at(-1).terminalSha256;delete job.firstOutcome;}
  state.format='triplex-devloop-state/1';await atomicJson(path.join(context.directory,'state.json'),state);
  return{state,sha256:await hashFile(path.join(context.directory,'state.json'))};
}

const normal=await setup('published-history'),result=await executeNext(normal.context,{executor:'independent-sidecar-control'});
assert.equal(result.status,'completed_verified_bytes');
const oldTerminal=await verifyAttempt(normal.context,'sample','0001'),old=await legacy(normal.context);
const migration=await migrateState(normal.context);assert.equal(migration.status,'MIGRATED_V2');
assert.equal((await verifyAttempt(normal.context,'sample','0001')).terminalSha256,oldTerminal.terminalSha256);
assert.deepEqual(await loadJobManifest(normal.context,(await readState(normal.context)).jobs.sample),normal.manifest);
assert.equal(await hashFile(path.join(root,migration.legacy.path)),old.sha256);
checks.push('Actual completed result and terminal anchor remain readable after migration; full manifest and legacy hash match');
await fs.writeFile(path.join(root,result.directory,'artifacts/answer.json'),JSON.stringify({value:8})+'\n');
await assert.rejects(verifyAttempt(normal.context,'sample','0001'),{code:'OUTPUT_CHANGED'});
checks.push('Changed retained result bytes are rejected after sidecar hydration');

for(const kind of ['bytes','missing','symlink','escape','header','joint-envelope-header']){
  const c=await setup('reject-'+kind),state=await readState(c.context),job=state.jobs.sample,file=path.join(root,job.manifestRef.path);
  if(kind==='bytes')await fs.appendFile(file,'\n');
  if(kind==='missing')await fs.rename(file,file+'.retained-original');
  if(kind==='symlink'){await fs.rename(file,file+'.retained-original');await fs.symlink(file+'.retained-original',file);}
  if(kind==='escape')job.manifestRef.path='../unowned.json';
  if(kind==='header')job.manifest.resources.memoryBytes=1;
  if(kind==='joint-envelope-header'){
    const e=await readJson(file);e.manifest.hypothesis='joint forged hypothesis';job.manifest.hypothesis=e.manifest.hypothesis;
    await atomicJson(file,e);job.manifestRef.bytes=(await fs.stat(file)).size;job.manifestRef.sha256=await hashFile(file);
  }
  if(['escape','header','joint-envelope-header'].includes(kind))await atomicJson(path.join(c.context.directory,'state.json'),state);
  await assert.rejects(grantNext(c.context,{onlyJob:'sample',executor:'independent-tamper-review'}),error=>['SIDECAR_CHANGED','ENOENT','SYMLINK','PATH','MANIFEST_CHANGED'].includes(error.code));
  assert.equal((await readState(c.context)).jobs.sample.attempts.length,0);
  await assert.rejects(fs.stat(path.join(c.context.directory,'jobs/sample/attempts')),{code:'ENOENT'});
  checks.push('Pre-child admission rejects '+kind+' tampering');
}
const changedSource=await setup('changed-source');await fs.appendFile(changedSource.runner,'// changed after enqueue\n');
await assert.rejects(grantNext(changedSource.context),{code:'INPUT_CHANGED'});
assert.equal((await readState(changedSource.context)).jobs.sample.attempts.length,0);
checks.push('Full source pins are hydrated and rechecked before a new grant');

const crashed=await setup('actual-pre-rename-crash');await executeNext(crashed.context,{executor:'independent-crash-control'});
const before=await legacy(crashed.context,true),held=reservations(before.state);
const code=`import{openContext}from'./qualification/devloop/state.mjs';import{migrateState}from'./qualification/devloop/migration.mjs';const c=await openContext(${JSON.stringify(root)},{stateDirectory:${JSON.stringify(path.relative(root,crashed.context.directory))},testPolicy:${JSON.stringify(policy)}});await migrateState(c,{beforePublish:()=>process.kill(process.pid,'SIGKILL')});`;
const child=spawn(process.execPath,['--max-old-space-size=256','--input-type=module','-e',code],{cwd:root,stdio:['ignore','pipe','pipe']});
let stderr='';child.stderr.on('data',chunk=>{stderr+=chunk;});const[exit,signal]=await once(child,'exit');
assert.equal(exit,null,stderr);assert.equal(signal,'SIGKILL');assert.equal(await hashFile(path.join(crashed.context.directory,'state.json')),before.sha256);
const staged=(await fs.readdir(crashed.context.directory)).filter(file=>/^state\.json\..*\.tmp$/.test(file));assert.equal(staged.length,1);
assert.equal((await readJson(path.join(crashed.context.directory,staged[0]))).format,'triplex-devloop-state/2');
checks.push('Actual owned child SIGKILL after fsync and before rename leaves exact v1 state authoritative');
await migrateState(crashed.context);const recovered=await readState(crashed.context);
assert.equal(recovered.jobs.sample.status,'cleanup_unknown');assert.equal(recovered.jobs.sample.firstOutcome,undefined);
assert.equal(recovered.jobs.sample.attempts[0].terminalSha256,undefined);assert.deepEqual(reservations(recovered),held);
await assert.rejects(verifyAttempt(crashed.context,'sample','0001'),{code:'TERMINAL_CHANGED'});
checks.push('Retry preserves UNKNOWN reservation and refuses orphan raw terminal without retroactive PASS adoption');

const canonical=await openContext(root);
await verifyAttempt(canonical,'qlever-native-packet-v3','0001');
await assert.rejects(verifyAttempt(canonical,'qlever-native-packet-v4','0001'),{code:'TERMINAL_CHANGED'});
checks.push('Actual canonical historical published receipt reads and unpublished v4 terminal refuses qualification');
const receipt={format:'triplex-independent-sidecar-migration-review/1',reviewer:'qlever-agent',author:'duckdb-agent',status:'PASS_COMPONENT_AND_READONLY_CANONICAL_INTEGRITY',checks,sourceHashes:Object.fromEntries(await Promise.all(['io','state','migration','scheduler','executor','evidence','compare'].map(async name=>{const file='qualification/devloop/'+name+'.mjs';return[file,await hashFile(path.join(root,file))];}))),reviewSourceSha256:await hashFile(import.meta.filename),limits:['All mutation and actual crash injection used new explicit component contexts.','Canonical operations only read and verify existing receipts; no canonical job was captured, run, reconciled or promoted.','The real105-job legacy/sidecar equivalence audit is in thin-state-legacy-independent.json.','No engine health, writer fault, native semantics or performance acceptance is claimed by these controller checks.']};
const output=path.join(directory,'review.json');await fs.writeFile(output,JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({output,status:receipt.status,checks:checks.length}));
