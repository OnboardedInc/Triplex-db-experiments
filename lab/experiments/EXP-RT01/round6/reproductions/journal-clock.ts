// [CX-VRT01-R3] Why: a position-pinned journal has no valid-time parameter that can change its rows. Rejected: inferring journal stability from ordinary entity queries.
import {Effect} from 'effect';
import {writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {Triples,EntityId,string} from '../../../../../packages/core/dist/index.js';
import {makeA0RecordTimeSuite} from '../../../../../packages/testkit/dist/index.js';
import {makeXtdbStorageAdapter} from '../../../../../packages/xtdb/src/XtdbStorageAdapter.js';
import {makeXtdbQueryExecutor} from '../../../../../packages/xtdb/src/XtdbQueryExecutor.js';
import {sqlTransport} from '../../../../../packages/xtdb/test/fixtures/journal-sql-transport.js';
const out=process.argv[2];assert.ok(out);
const digest=()=>createHash('sha256').update(readFileSync('packages/xtdb/test/fixtures/journal-sql-transport.ts')).digest('hex');const transportSource=digest();
for(const commitEncoding of ['a0','compact'] as const){
const transport=sqlTransport();const scope='journal-clock-review';const adapter=makeXtdbStorageAdapter(transport.client,scope,{commitEncoding});
const suite=makeA0RecordTimeSuite(adapter,makeXtdbQueryExecutor(transport.client,scope),scope,{loseNextAck:()=>{}});
const result=await Effect.runPromise(Effect.gen(function*(){
 const t=yield* Triples;suite.clock.set(1000);const receipt=yield* t.transact([{op:'assert',entityId:EntityId.make('subject'),attribute:':value',value:string('value')}],{commandId:'journal-command'});
 const request={snapshotPosition:receipt.position};const before=yield* t.transactionsForEntity(EntityId.make('subject'),request);
 suite.clock.set(900);const after=yield* t.transactionsForEntity(EntityId.make('subject'),request);
 const behind={transaction:yield* t.transaction(receipt.txId),feed:yield* t.transactions(),command:yield* t.transactionByCommand('journal-command')};
 suite.clock.set(1000);const restored=yield* t.transactionsForEntity(EntityId.make('subject'),request);
 suite.clock.set(5000);const future=yield* t.transact([{op:'assert',entityId:EntityId.make('subject'),attribute:':value',value:string('future-staged')}]);
 const ahead=yield* t.transactionsForEntity(EntityId.make('subject'),{snapshotPosition:future.position,limit:1});
 suite.clock.set(800);const aheadBehind=yield* t.transactionsForEntity(EntityId.make('subject'),{snapshotPosition:future.position,limit:1});
 const continuation=yield* t.transactionsForEntity(EntityId.make('subject'),{snapshotPosition:future.position,beforePosition:ahead.nextBeforePosition,limit:1});
 const original=yield* t.transactionsForEntity(EntityId.make('subject'),request);
 return{receipt,request,before,after,restored,behind,ahead,aheadBehind,continuation,original,future,allTransactions:yield* t.transactions(),transportSource};
}).pipe(Effect.provide(suite.layer)));
assert.equal(digest(),transportSource);assert.equal(result.before.transactions.length,1);assert.deepEqual(result.after,result.before);assert.deepEqual(result.restored,result.before);assert.deepEqual(result.original,result.before);
assert.deepEqual(result.aheadBehind,result.ahead);assert.equal(result.ahead.transactions[0].txId,result.future.txId);
assert.deepEqual(result.continuation.transactions,result.before.transactions);
assert.deepEqual(result.behind.transaction,result.before.transactions[0]);assert.deepEqual(result.behind.command,result.behind.transaction);assert.deepEqual(result.behind.feed.transactions,result.before.transactions);
writeFileSync(out+commitEncoding+'-observed.json',JSON.stringify(result,null,2)+'\n');writeFileSync(out+commitEncoding+'-sql.json',JSON.stringify(transport.calls,null,2)+'\n');console.log(JSON.stringify(result,null,2));

}
