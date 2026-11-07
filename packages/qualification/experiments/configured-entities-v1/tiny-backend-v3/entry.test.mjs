import assert from 'node:assert/strict';
import test from 'node:test';
import {assertEntryBinding}from'./entry.mjs';
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
