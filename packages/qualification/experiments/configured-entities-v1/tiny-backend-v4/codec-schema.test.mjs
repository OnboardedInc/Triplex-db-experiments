/** Pure metadata default/refusal/retained-row controls. No SDK or driver. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { assertAdapterCodecSchemaVersion } from './codec-schema.mjs';
const root = path.resolve(import.meta.dirname,'../../../../..');
test('explicit pinned Some1 passes without changing raw option or application version',()=>{
  const metadata=Object.freeze({_tag:'Some',value:1}), before=JSON.stringify(metadata);
  assertAdapterCodecSchemaVersion(metadata,1);assert.equal(JSON.stringify(metadata),before);
  const application={type:'number',value:2};assertAdapterCodecSchemaVersion(metadata,1);assert.equal(application.value,2);
});
test('missing malformed and wrong version values refuse without coercion',()=>{
  for(const value of [undefined,null,1,'1',[],{_tag:'None'},{_tag:'Some',value:'1'},{_tag:'Some',value:0},{_tag:'Some',value:2},{_tag:'Some',value:1.5},{_tag:'Some',value:NaN},{type:'integer',value:'1'}])
    assert.throws(()=>assertAdapterCodecSchemaVersion(value,1));
});
test('the expectation must be explicitly the pinned adapter default, never inferred from data',()=>{
  for(const expected of [undefined,null,0,2,'1']) assert.throws(()=>assertAdapterCodecSchemaVersion({_tag:'Some',value:1},expected));
});
test('all24 retained V1 public rows and ACKs expose the same independently reviewed Some1',()=>{
  const directory=path.join(root,'.devloop/jobs/configured-entity-xtdb-tiny-v1/attempts/0001/artifacts');
  const actual=JSON.parse(readFileSync(path.join(directory,'009-snapshot-sparse-seed-raw-before-assert.json')));
  const ack=JSON.parse(readFileSync(path.join(directory,'007-ack-sparse-seed-raw-before-assert.json'))).result;
  assert.equal(actual.rows.length,24);assert.equal(ack.triples.length,24);
  for(const row of actual.rows){const original=ack.triples.find(before=>before.id===row.id);assert(original);assert.deepEqual(row,original);assertAdapterCodecSchemaVersion(row.schemaVersion,1);}
  const owning=readFileSync(path.join(root,'packages/xtdb/src/XtdbStorageAdapter.ts'),'utf8');assert(owning.includes('schema_version: 1,'));
});
