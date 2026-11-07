import assert from 'node:assert/strict';
import test from 'node:test';
import { buildRow } from '../src/public-backend.mjs';
import { ownExecuteResult } from '../src/query-result-boundary.mjs';

test('public ownership keeps adjacent int64 values and fractional bounds exact', () => {
  for (const value of ['-9223372036854775808','9007199254740992','9007199254740993','9223372036854775807']) {
    const row = buildRow({entityId:'e',attribute:':i',value:{type:'integer',value},validFrom:1.25,validTo:2.75},'tx',10.125,'id',1);
    assert.equal(row.value_type,'integer'); assert.equal(row.value_string,value);
    assert.equal(row.value_number,null); assert.equal(row.valid_from,1.25); assert.equal(row.valid_to,2.75);
    assert.deepEqual(ownExecuteResult({results:[{'?i':{type:'integer',value}}]},'duckdb').results,[{'?i':{type:'integer',value}}]);
  }
});

test('public integer boundary refuses unsafe Number, noncanonical text and overflow before a write', () => {
  for (const value of [9007199254740993,'01','-0','9223372036854775808','-9223372036854775809']) {
    assert.throws(()=>buildRow({entityId:'e',attribute:':i',value:{type:'integer',value}},'tx',1,'id',1),/canonical signed int64/);
    assert.throws(()=>ownExecuteResult({results:[{'?i':{type:'integer',value}}]},'duckdb'),/Unexpected public query scalar/);
  }
});
