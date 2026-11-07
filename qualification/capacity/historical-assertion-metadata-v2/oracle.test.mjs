/** Unexecuted pure controls; actual SDK/driver cases require a separate grant. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {EVENTS,SAME_TIME_EVENTS,CASES,lifetime,expectedSnapshot} from './oracle.mjs';
const ids=rows=>rows.map(row=>row.id);
test('five assertion versions and three retirements preserve full lifetime authority',()=>{
  const rows=lifetime(EVENTS); assert.equal(rows.length,5); assert.equal(rows.filter(row=>row.retirement).length,3);
  assert.deepEqual(rows.find(row=>row.id==='label-a').retirement,{recordedAt:1001.25,position:2,txId:'logical-tx2'});
});
test('old public R membership is preserved while only future metadata is absent from the NEW projection',()=>{
  const rows=expectedSnapshot(EVENTS,CASES.find(row=>row.id==='original-R-after-all-writes'));
  assert.deepEqual(ids(rows),['label-a','present-a']); assert(rows.every(row=>row.knownRetirement===null));
  assert.equal(lifetime(EVENTS)[0].retirement.recordedAt,1001.25);
});
test('known retirement equality is inclusive and retains original transaction lineage',()=>{
  const rows=expectedSnapshot(EVENTS,CASES.find(row=>row.id==='history-at-retirement'));
  assert.equal(rows.length,3); assert.deepEqual(rows[0].knownRetirement,{recordedAt:1001.25,txId:'logical-tx2'});
  assert.equal(rows[1].knownRetirement,null);
});
test('latest history and live projections remain different explicit result views',()=>{
  const history=expectedSnapshot(EVENTS,CASES.find(row=>row.id==='history-latest-retains-all-lineage'));
  assert.equal(history.length,5); assert.equal(history.filter(row=>row.knownRetirement).length,3);
  assert.deepEqual(ids(expectedSnapshot(EVENTS,CASES.find(row=>row.id==='latest-no-invented-R'))),['label-b','present-b']);
});
test('half-open valid time includes its start and excludes its end',()=>{
  assert.equal(expectedSnapshot(EVENTS,CASES.find(row=>row.id==='inclusive-valid-start')).length,2);
  assert.equal(expectedSnapshot(EVENTS,CASES.find(row=>row.id==='exclusive-valid-end')).length,0);
});
test('same recorded time still needs the legitimately captured upper position',()=>{
  const common={recordedAt:2000.25,validAt:20.25};
  const old=expectedSnapshot(SAME_TIME_EVENTS,{...common,capturedUpperP:1});
  assert.deepEqual(ids(old),['same-a']); assert.equal(old[0].knownRetirement,null);
  assert.deepEqual(ids(expectedSnapshot(SAME_TIME_EVENTS,{...common,capturedUpperP:2})),['same-b']);
});
test('fresh-client replay is independent of row mutations or earlier projections',()=>{
  const before=expectedSnapshot(EVENTS,CASES[1]); before[0].knownRetirement={recordedAt:0,txId:'not-authority'};
  assert.equal(expectedSnapshot(EVENTS,CASES[1])[0].knownRetirement,null);
  assert.equal(lifetime(EVENTS)[0].retirement.txId,'logical-tx2');
});

test('returned typed nested values and lifetime rows cannot mutate source authority or a fresh projection',()=>{
  assert(Object.isFrozen(EVENTS[0].assert[0].value));
  assert(Object.isFrozen(CASES[1]));
  assert.throws(()=>{ CASES[1].validAt=0; },TypeError);
  assert.throws(()=>{ EVENTS[0].assert[0].value.value='not-source'; },TypeError);
  const input=[{position:1,recordedAt:1000.25,txId:'nested-tx',assert:[{
    id:'nested-value',entityId:'metadata:nested',attribute:':metadata/json',
    value:{type:'json',value:{items:[{label:'original'}]}},entityType:'MetadataProbe',
    validFrom:10.125,validTo:30.5,createdBy:'metadata-fixture',schemaVersion:1,
  }],retract:[]}];
  const before=structuredClone(input),cut={capturedUpperP:1,recordedAt:1000.25,validAt:20.25};
  const first=expectedSnapshot(input,cut);first[0].value.value.items[0].label='caller-change';
  assert.deepEqual(input,before);
  assert.equal(expectedSnapshot(input,cut)[0].value.value.items[0].label,'original');
  const raw=lifetime(input);raw[0].value.value.items[0].label='raw-caller-change';
  assert.deepEqual(input,before);
  assert.equal(expectedSnapshot(input,cut)[0].value.value.items[0].label,'original');
});
test('null validTo remains open-ended while finite boundaries keep their half-open rule',()=>{
  const input=[{position:1,recordedAt:1000.25,txId:'open-tx',assert:[{
    id:'open',entityId:'metadata:open',attribute:':metadata/label',value:{type:'string',value:'open'},
    entityType:'MetadataProbe',validFrom:10.125,validTo:null,createdBy:'metadata-fixture',schemaVersion:1,
  }],retract:[]}];
  const cut={capturedUpperP:1,recordedAt:1000.25};
  assert.equal(expectedSnapshot(input,{...cut,validAt:10.124}).length,0);
  assert.equal(expectedSnapshot(input,{...cut,validAt:10.125}).length,1);
  assert.equal(expectedSnapshot(input,{...cut,validAt:1e12})[0].validTo,null);
  assert.equal(expectedSnapshot(EVENTS,CASES.find(row=>row.id==='exclusive-valid-end')).length,0);
});
