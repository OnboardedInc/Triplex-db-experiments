import assert from 'node:assert/strict';
import test from 'node:test';
import {assertEntryBinding}from'./entry.mjs';
import {readFile}from'node:fs/promises';
import {openContext,readState,loadJobManifest}from'../../../../../qualification/devloop/state.mjs';
import {ROOT,pin}from'../../../../../.runtime/experiments/xtdb-identity-handoff-v1/loop-v2/common.mjs';
const descriptor={path:'owned/tiny-v3/worker.mjs',sha256:'a'.repeat(64),bytes:100,generation:'configured-tiny-codec-entry-v3'};
const input=()=>({descriptor,sourceGeneration:descriptor.generation,command:{argv:['node','--max-old-space-size=768',descriptor.path]},inputs:[{...descriptor,role:'runner'}],actualModule:{...descriptor},actualArgv:{...descriptor}});
test('one exact descriptor binds command source actual module argv and generation',()=>assert.doesNotThrow(()=>assertEntryBinding(input())));
test('old entry and generation cannot satisfy a new worker declaration',()=>{
  const command=input();command.command.argv[2]='owned/tiny-v1/worker.mjs';assert.throws(()=>assertEntryBinding(command));
  const generation=input();generation.sourceGeneration='old';assert.throws(()=>assertEntryBinding(generation));
});
test('missing wrong-role or changed worker pin refuses',()=>{
  for(const rows of [[],[{...descriptor,role:'source'}],[{...descriptor,role:'runner',sha256:'b'.repeat(64)}]])assert.throws(()=>assertEntryBinding({...input(),inputs:rows}));
});
test('actual imported module argv bytes and size must independently match',()=>{
  for(const field of ['actualModule','actualArgv'])for(const patch of [{path:'old.mjs'},{sha256:'b'.repeat(64)},{bytes:101}])assert.throws(()=>assertEntryBinding({...input(),[field]:{...descriptor,...patch}}));
});
test('an actual canonical thin header has no inputs; authenticated sidecar hydration binds the real runner',async()=>{
  const grant=JSON.parse(await readFile(process.env.TRIPLEX_RESOURCE_ADMISSION));
  const context=await openContext(ROOT),state=await readState(context),job=state.jobs[grant.jobId];assert(job);
  assert.equal(Object.hasOwn(job.manifest,'inputs'),false);
  const full=await loadJobManifest(context,job);assert.equal(full.id,grant.jobId);assert(Array.isArray(full.inputs)&&full.inputs.length>0);
  const real=await pin(ROOT,full.command.argv[2]),descriptor={...real,generation:'actual-thin-header-control'};
  const bound={descriptor,sourceGeneration:descriptor.generation,command:full.command,actualModule:real,actualArgv:real};
  assert.throws(()=>assertEntryBinding({...bound,inputs:job.manifest.inputs}),/AUTHENTICATED_FULL_MANIFEST/);
  assert.doesNotThrow(()=>assertEntryBinding({...bound,inputs:full.inputs}));
});
