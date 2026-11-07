/** Source-only independent event oracle. No SDK/backend import or execution. */
import assert from 'node:assert/strict';

export const WINDOW = Object.freeze({from:10.125,to:30.5,inside:20.25});
const assertion = (id,attribute,value) => ({id,entityId:'metadata:e0',attribute,value,
  entityType:'MetadataProbe',validFrom:WINDOW.from,validTo:WINDOW.to,createdBy:'metadata-fixture',schemaVersion:1});
export const EVENTS = Object.freeze([
  {position:1,recordedAt:1000.25,txId:'logical-tx1',assert:[assertion('label-a',':metadata/label',{type:'string',value:'A'}),assertion('present-a',':metadata/present',{type:'boolean',value:true})],retract:[]},
  {position:2,recordedAt:1001.25,txId:'logical-tx2',assert:[assertion('label-b',':metadata/label',{type:'string',value:'B'})],retract:['label-a']},
  {position:3,recordedAt:1002.25,txId:'logical-tx3',assert:[assertion('present-false',':metadata/present',{type:'boolean',value:false})],retract:['present-a']},
  {position:4,recordedAt:1003.25,txId:'logical-tx4',assert:[assertion('present-b',':metadata/present',{type:'boolean',value:true})],retract:['present-false']},
]);
export const SAME_TIME_EVENTS = Object.freeze([
  {position:1,recordedAt:2000.25,txId:'same-time-tx1',assert:[assertion('same-a',':metadata/label',{type:'string',value:'A'})],retract:[]},
  {position:2,recordedAt:2000.25,txId:'same-time-tx2',assert:[assertion('same-b',':metadata/label',{type:'string',value:'B'})],retract:['same-a']},
]);

/** Recorded positions are oracle coordinates, NEVER extra public TemporalBasis input. */
export function lifetime(events) {
  const rows=new Map(); let previous=0;
  for(const event of events) {
    assert.equal(event.position,++previous);
    for(const id of event.retract) {
      const row=rows.get(id); assert(row && row.retirement===null);
      row.retirement={recordedAt:event.recordedAt,position:event.position,txId:event.txId};
    }
    for(const input of event.assert) {
      assert(!rows.has(input.id)); rows.set(input.id,{...input,assertion:{recordedAt:event.recordedAt,position:event.position,txId:event.txId},retirement:null});
    }
  }
  return [...rows.values()];
}

/** New product-helper target, not a harness transformation of an actual answer. */
export function expectedSnapshot(events,{capturedUpperP,recordedAt,validAt,mode='live-at-valid'}) {
  assert(Number.isSafeInteger(capturedUpperP)&&capturedUpperP>=0);
  assert(Number.isFinite(validAt)&&validAt>=0);
  assert(recordedAt===undefined || Number.isFinite(recordedAt)&&recordedAt>=0);
  assert(['live-at-valid','known-at-valid'].includes(mode));
  const known = coordinate => coordinate.position<=capturedUpperP && (recordedAt===undefined || coordinate.recordedAt<=recordedAt);
  return lifetime(events).filter(row=>known(row.assertion) && row.validFrom<=validAt && validAt<row.validTo)
    .filter(row=>mode==='known-at-valid' || row.retirement===null || !known(row.retirement))
    .map(row=>({id:row.id,entityId:row.entityId,attribute:row.attribute,value:row.value,entityType:row.entityType,
      validFrom:row.validFrom,validTo:row.validTo,createdBy:row.createdBy,schemaVersion:row.schemaVersion,
      recordedAt:row.assertion.recordedAt,txId:row.assertion.txId,
      knownRetirement:row.retirement!==null && known(row.retirement)
        ? {recordedAt:row.retirement.recordedAt,txId:row.retirement.txId} : null}));
}

export const CASES = Object.freeze([
  {id:'before-creation',capturedUpperP:4,recordedAt:999.25,validAt:20.25},
  {id:'original-R-after-all-writes',capturedUpperP:4,recordedAt:1000.25,validAt:20.25},
  {id:'corrected-R',capturedUpperP:4,recordedAt:1001.25,validAt:20.25},
  {id:'presence-off-R',capturedUpperP:4,recordedAt:1002.25,validAt:20.25},
  {id:'latest-no-invented-R',capturedUpperP:4,validAt:20.25},
  {id:'inclusive-valid-start',capturedUpperP:4,recordedAt:1000.25,validAt:10.125},
  {id:'exclusive-valid-end',capturedUpperP:4,recordedAt:1000.25,validAt:30.5},
  {id:'history-before-retirement',capturedUpperP:4,recordedAt:1000.25,validAt:20.25,mode:'known-at-valid'},
  {id:'history-at-retirement',capturedUpperP:4,recordedAt:1001.25,validAt:20.25,mode:'known-at-valid'},
  {id:'history-latest-retains-all-lineage',capturedUpperP:4,validAt:20.25,mode:'known-at-valid'},
]);
