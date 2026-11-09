// @ts-nocheck -- [EXP-CHECKJS] runtime coercion (Buffer JSON), dynamic collections, or validated inputs without static narrowing. Binding errors remain checked by lab/bin/checkjs.mjs.
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
