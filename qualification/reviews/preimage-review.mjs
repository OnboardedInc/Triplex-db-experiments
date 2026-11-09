// @ts-nocheck -- [EXP-CHECKJS] option bags inferred from defaults omit optional fields. Binding errors remain checked by lab/bin/checkjs.mjs.
/** Independent active review of source preservation, not an engine trial. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { hashFile, readJson, atomicJson } from '../devloop/io.mjs';
import { openContext, readState, sidecarReference } from '../devloop/state.mjs';
import { preserveInputPreimages, verifyInputPreimages } from '../devloop/preimages.mjs';
import { enqueue } from '../devloop/scheduler.mjs';
import { executeNext } from '../devloop/executor.mjs';
import { verifyAttempt } from '../devloop/evidence.mjs';
const root=path.resolve(import.meta.dirname,'../..'),directory=path.join(root,'.artifacts/preimage-independent',randomUUID());await fs.mkdir(directory,{recursive:true});
const policy={format:'triplex-devloop-policy/1',maximumHeavyTrials:3,memoryPoolBytes:512*1024**2,cpuPoolUnits:2,sampleMilliseconds:40,terminationGraceMilliseconds:200,maximumLogBytesPerAttempt:8192,lanes:{'qlever-native':'qlever'},promotion:{}};
const checks=[];
async function setup(name){const d=path.join(directory,name);await fs.mkdir(d);return{d,context:await openContext(root,{stateDirectory:path.relative(root,path.join(d,'state')),testPolicy:policy})};}
const pin=async(file,role)=>({path:path.relative(root,file),role,sha256:await hashFile(file)});
const a=await setup('old-bytes');
const source=path.join(a.d,'source.ts'),same=path.join(a.d,'same.ts'),dep=path.join(a.d,'dependency.txt'),credential=path.join(a.d,'access-token');
await fs.writeFile(source,'export const value = 1;\n');await fs.copyFile(source,same);await fs.writeFile(dep,'dependency bytes\n');await fs.writeFile(credential,'synthetic review credential\n');
const inputs=[await pin(source,'source'),await pin(source,'source'),await pin(same,'native-query'),await pin(dep,'dependency'),await pin(dep,'build'),await pin(credential,'credential-file')];
const ref=await preserveInputPreimages(a.context,inputs,path.relative(root,path.join(a.d,'index.json')));
const index=await readJson(path.join(root,ref.path));assert.equal(index.inputs.length,2);assert.deepEqual(index.omittedRoles,{'dependency':1,'build':1,'credential-file':1});assert.equal(index.inputs[0].object.path,index.inputs[1].object.path);
const object=path.join(root,index.inputs[0].object.path),objectStat=await fs.stat(object);assert.equal(objectStat.nlink,1);assert.notEqual(objectStat.ino,(await fs.stat(source)).ino);
await fs.writeFile(source,'export const value = 2;\n');assert.equal(await fs.readFile(object,'utf8'),'export const value = 1;\n');await verifyInputPreimages(a.context,ref,{inputs});
checks.push('Old source bytes survive working edits in independent inodes; content and duplicate declarations deduplicate; dependency/build/credential roles stay omitted');
const omitted=structuredClone(index);omitted.inputs.pop();const omittedPath=path.join(a.d,'omitted.json');await atomicJson(omittedPath,omitted,{exclusive:true});
await assert.rejects(verifyInputPreimages(a.context,await sidecarReference(a.context,path.relative(root,omittedPath)),{inputs}),{code:'PREIMAGE_COVERAGE'});checks.push('Self-consistent index omission fails exact expected-input coverage');
const escaped=structuredClone(index);escaped.inputs[0].object.path='../unowned-object';const escapedPath=path.join(a.d,'escaped.json');await atomicJson(escapedPath,escaped,{exclusive:true});await assert.rejects(verifyInputPreimages(a.context,await sidecarReference(a.context,path.relative(root,escapedPath))),{code:'PREIMAGE_PATH'});checks.push('A substituted content-object path is rejected before any outside read');
for(const kind of ['changed','missing','symlink']){
 const c=await setup(kind),file=path.join(c.d,'input.ts');await fs.writeFile(file,'const '+kind+' = true;\n');const p=await pin(file,'source'),reference=await preserveInputPreimages(c.context,[p],path.relative(root,path.join(c.d,'index.json'))),i=await readJson(path.join(root,reference.path)),target=path.join(root,i.inputs[0].object.path);
 if(kind==='changed'){await fs.chmod(target,0o600);await fs.writeFile(target,'corrupted\n');}
 else{await fs.rename(target,target+'.retained-original');if(kind==='symlink')await fs.symlink(target+'.retained-original',target);}
 await assert.rejects(verifyInputPreimages(c.context,reference,{inputs:[p]}),error=>['PREIMAGE_CHANGED','ENOENT','SYMLINK'].includes(error.code));checks.push('Retained '+kind+' object refuses verification');
}
await assert.rejects(preserveInputPreimages(a.context,[await pin(credential,'source')],path.relative(root,path.join(a.d,'forbidden-secret.json'))),{code:'PREIMAGE_SECRET'});
const cache=path.join(a.d,'.cache');await fs.mkdir(cache);const cached=path.join(cache,'file.ts');await fs.writeFile(cached,'cache\n');await assert.rejects(preserveInputPreimages(a.context,[await pin(cached,'source')],path.relative(root,path.join(a.d,'forbidden-cache.json'))),{code:'PREIMAGE_CACHE'});checks.push('Credential and dependency-cache paths cannot be relabeled into source preservation');

const live=await setup('actual-invocation'),runner=path.join(live.d,'child.mjs'),oracle=path.join(live.d,'expected.json');
await fs.writeFile(runner,`import{writeFileSync}from'node:fs';import{join}from'node:path';writeFileSync(join(process.env.TRIPLEX_RUN_ARTIFACTS,'answer.json'),'{}\\n');\n`);await fs.writeFile(oracle,'{}\n');
const manifest={format:'triplex-devloop-job/1',id:'sample',kind:'fixture',queryPath:'qlever-native',backend:'qlever',author:'qlever-independent-reviewer',logicalTaskId:'source-preimage-integrated-path',problemId:'retained-source-authority',hypothesis:'Real invocation preserves declared source and controller bytes while exact result checks retain their existing authority',goals:[6,7],dependsOn:[],inspiration:[{reference:'qualification/devloop/preimages.mjs',mechanism:'Immutable content-addressed independent source copies',adaptation:'Independently inspect the actual invocation index and post-edit old-byte readability'}],command:{argv:[process.execPath,runner],cwd:'.',env:{}},resources:{heavy:false,memoryBytes:384*1024**2,cpuUnits:1,diskBytes:1024**2,timeoutMilliseconds:5000,maximumLogBytes:8192},inputs:[await pin(runner,'runner'),await pin(oracle,'oracle'),await pin(path.join(root,'qualification/devloop/io.mjs'),'source')],evidence:{checks:[{key:'answer',expectedInput:path.relative(root,oracle),actual:'artifacts/answer.json'}],requiredCheckKeys:['answer']}};
await enqueue(live.context,manifest);const result=await executeNext(live.context,{executor:'independent-preimage-component'});assert.equal(result.status,'completed_verified_bytes');
let verified=await verifyAttempt(live.context,'sample','0001');assert.equal(verified.sourcePreimages.invocation.status,'DECLARED_PREIMAGE_BYTES_UNCHANGED');
const inputRecord=await readJson(path.join(root,result.directory,'inputs.json')),invocation=await readJson(path.join(root,inputRecord.sourcePreimages.path));
assert.ok(invocation.inputs.some(entry=>entry.role==='controller'&&entry.path==='qualification/devloop/preimages.mjs'));
assert.ok(result.outputs.some(output=>output.path==='source-preimages.json'));
const state=await readState(live.context);await verifyInputPreimages(live.context,state.jobs.sample.sourcePreimages,{inputs:manifest.inputs});await verifyInputPreimages(live.context,inputRecord.sourcePreimages,{inputs:[...inputRecord.pins,...inputRecord.controllerPins]});
await fs.appendFile(runner,'// after completed invocation\n');verified=await verifyAttempt(live.context,'sample','0001');assert.equal(verified.sourcePreimages.invocation.status,'DECLARED_PREIMAGE_BYTES_UNCHANGED');checks.push('Real invocation preserves exact declared and automatic controller coverage; old result/source integrity remains readable after working-source edits');
const canonical=await openContext(root),historical=await verifyAttempt(canonical,'qlever-native-packet-v3','0001');assert.equal(historical.sourcePreimages.invocation,null);assert.equal(historical.sourcePreimages.historicalScope,'HISTORICAL_HASH_COMMAND_TRACE_RECORDS_PARTIAL_SOURCE_RECONSTRUCTION');checks.push('Historical receipt remains explicitly partial; no source preimages are retrofilled');
const receipt={format:'triplex-independent-input-preimage-review/1',reviewer:'qlever-agent',author:'duckdb-agent',status:'PASS_ACTIVE_COMPONENT_REVIEW',checks,sourceHashes:Object.fromEntries(await Promise.all(['preimages','state','scheduler','executor','evidence'].map(async name=>{const file='qualification/devloop/'+name+'.mjs';return[file,await hashFile(path.join(root,file))];}))),reviewSourceSha256:await hashFile(import.meta.filename),limits:['No canonical job captured or executed and no engine touched.','This proves selected declared source-byte retention and integrity, not complete dependency/build reconstruction or backend acceptance.']};const output=path.join(directory,'review.json');await fs.writeFile(output,JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({output,status:receipt.status,checks:checks.length}));
