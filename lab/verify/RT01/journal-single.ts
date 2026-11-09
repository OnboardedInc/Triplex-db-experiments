// [CX-VRT01] Why: reproduce own-instant journal content in one ordinary command, without nested callbacks. Rejected: treating nested-ordinal behavior as the only counterexample.
import { Effect } from 'effect';
import { writeFileSync } from 'node:fs';
import { EntityId,Triples,string } from '../../../packages/core/dist/index.js';
import { makeA0RecordTimeSuite } from '../../../packages/testkit/dist/index.js';
import { makeXtdbStorageAdapter } from '../../../packages/xtdb/src/XtdbStorageAdapter.js';
import { makeRecordTimeClient } from '../../../packages/xtdb/test/fixtures/record-time-client.js';
const scope='journal-single';const adapter=makeXtdbStorageAdapter(makeRecordTimeClient(),scope);
const suite=makeA0RecordTimeSuite(adapter,{} as any,scope,{loseNextAck:()=>{}});
const operations=[{op:'assert',entityId:EntityId.make('single'),attribute:':value',value:string('one')},{op:'retract-pattern',pattern:{entityId:EntityId.make('single')}}] as const;
const data=await Effect.runPromise(Effect.gen(function*(){
 suite.clock.set(1000);const t=yield* Triples;const r=yield* t.transact(operations);const rows=yield* adapter.query({entityType:'_Transaction'});const hydrated=yield* t.transaction(r.txId);return {r,rows,hydrated};
}).pipe(Effect.provide(suite.layer)));
const b='lab/verify/RT01/';
writeFileSync(b+'journal-single-observed.json',JSON.stringify(data,null,2)+'\n');
writeFileSync(b+'journal-single.case.json',JSON.stringify({format:'triplex-db-2/o-replay-case/1',caseId:'CX-VRT01/journal-single',defaultScope:scope,adapter:{recordTime:'decided',clockDriven:true,schemaVersion:1},commands:[{clock:1000,operations:[{...operations[0],ref:'one'},operations[1]]}],receipts:[{command:0,outcome:'committed',txId:data.r.txId,position:data.r.position,instant:data.r.instant,stagedAt:data.r.stagedAt,assertionIds:[data.r.triples[0]!.id,null]}],queries:[{id:'journal',kind:'journalFacts'}]},null,2)+'\n');
console.log(JSON.stringify(data.rows.filter(r=>r.attribute===':_tx/change').map(r=>JSON.parse(r.value_json!)),null,2));
