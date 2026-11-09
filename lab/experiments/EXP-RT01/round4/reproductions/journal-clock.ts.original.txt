// [CX-VRT01-R3] Why: a position-pinned journal has no valid-time parameter that can change its rows. Rejected: inferring journal stability from ordinary entity queries.
import {Effect} from 'effect';
import {writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {Triples,EntityId,string} from '../../../../packages/core/dist/index.js';
import {makeA0RecordTimeSuite} from '../../../../packages/testkit/dist/index.js';
import {makeXtdbStorageAdapter} from '../../../../packages/xtdb/src/XtdbStorageAdapter.js';
import {makeXtdbQueryExecutor} from '../../../../packages/xtdb/src/XtdbQueryExecutor.js';
import {sqlTransport} from './sql-transport.js';
const out=process.argv[2]??'lab/verify/RT01/round3/journal-clock/attempt2/';
const digest=()=>createHash('sha256').update(readFileSync('lab/verify/RT01/round3/sql-transport.ts')).digest('hex');const transportSource=digest();
for(const commitEncoding of ['a0','compact'] as const){
const transport=sqlTransport();const scope='journal-clock-review';const adapter=makeXtdbStorageAdapter(transport.client,scope,{commitEncoding});
const suite=makeA0RecordTimeSuite(adapter,makeXtdbQueryExecutor(transport.client,scope),scope,{loseNextAck:()=>{}});
const result=await Effect.runPromise(Effect.gen(function*(){
 const t=yield* Triples;suite.clock.set(1000);const receipt=yield* t.transact([{op:'assert',entityId:EntityId.make('subject'),attribute:':value',value:string('value')}]);
 const request={snapshotPosition:receipt.position};const before=yield* t.transactionsForEntity(EntityId.make('subject'),request);
 suite.clock.set(900);const after=yield* t.transactionsForEntity(EntityId.make('subject'),request);
 suite.clock.set(1000);const restored=yield* t.transactionsForEntity(EntityId.make('subject'),request);
 return{receipt,request,before,after,restored,allTransactions:yield* t.transactions(),transportSource};
}).pipe(Effect.provide(suite.layer)));
assert.equal(digest(),transportSource);assert.equal(result.before.transactions.length,1);assert.equal(result.after.transactions.length,0);assert.deepEqual(result.restored,result.before);
writeFileSync(out+commitEncoding+'-observed.json',JSON.stringify(result,null,2)+'\n');writeFileSync(out+commitEncoding+'-sql.json',JSON.stringify(transport.calls,null,2)+'\n');console.log(JSON.stringify(result,null,2));

}
