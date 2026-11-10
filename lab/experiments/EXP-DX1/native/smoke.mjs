// [DX-N1] Why: prove a real SDK commit and frozen-basis pull before timing. Rejected: health-only success.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Effect, Layer, ManagedRuntime } from 'effect';
import { Triples } from '../../../../packages/core/dist/index.js';
import { Runtime, StorageAdapter, QueryExecutor, DatabaseScope, Capabilities } from '../../../../packages/core/dist/runtime/index.js';
import { DatomicClient, makeDatomicStorageAdapter, makeDatomicQueryExecutor } from '../../../../packages/datomic/dist/index.js';
const client = new DatomicClient(process.env.DATOMIC_URL, 30000);
const scope = DatabaseScope.test(`DX-N1-${randomUUID()}`);
const runtime = ManagedRuntime.make(Runtime.define({name:'DX-N1', storage:Layer.succeed(StorageAdapter, makeDatomicStorageAdapter(client,scope,{layout:'lean'})), queries:Layer.succeed(QueryExecutor,makeDatomicQueryExecutor(client,scope))}).layer({scope,capabilities:Capabilities.none}));
try {
 const triples = await runtime.runPromise(Triples);
 const receipt = await runtime.runPromise(triples.transact([{op:'assert',entityId:'s1',attribute:':native/value',value:{type:'string',value:'native-roundtrip'},validFrom:0}],{commandId:randomUUID()}));
 const observed = await runtime.runPromise(triples.reach('s1',{validAt:Date.now(),recordedAt:receipt.instant}));
 const rows=observed.triples;
 assert.equal(rows.length,1); assert.deepEqual(rows[0].value,{type:'string',value:'native-roundtrip'});
 console.log(JSON.stringify({diagnostic:true,receipt,rows}));
} finally {await runtime.dispose();await client.delete(scope);client.close();}
