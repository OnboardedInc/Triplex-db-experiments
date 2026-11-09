// @ts-nocheck -- [EXP-CHECKJS-R2] runtime-populated records, option bags, or branch-specific union members. Binding errors remain checked by lab/bin/checkjs.mjs.
import assert from'node:assert/strict';import test from'node:test';
import{requiredOutcomeEvidence}from'./required-evidence.mjs';
test('unexpected Success retains the full same public receipt; Failure keeps safe typed violations',()=>{
  const result=Object.freeze({txId:'actual-tx',position:4,instant:1002.75,triples:[{id:'actual-id',value:{type:'integer',value:'9007199254740993'}}],retracted:1});
  const success=requiredOutcomeEvidence({_tag:'Success',success:result},()=>assert.fail('No error encoder on Success'));
  assert.equal(success.publicTransactionResult,result);assert.deepEqual(success,{tag:'Success',publicTransactionResult:result});
  const failure={_tag:'ConstraintViolationError',violations:[{code:'required',subject:'capacity:e00000000'}]},safe={name:'ConstraintViolationError',messageSha256:'a'.repeat(64)};
  assert.deepEqual(requiredOutcomeEvidence({_tag:'Failure',failure},actual=>{assert.equal(actual,failure);return safe;}),{tag:'Failure',error:safe,violations:failure.violations});
});
