
import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { Effect } from 'effect';
import { Triples, EntityId, string } from '@triplex-build/triplex';
import { Capabilities, DatabaseScope } from '@triplex-build/triplex/runtime';
import { makeDatomicRuntime, DatomicClient } from '@triplex-build/triplex-datomic';
const scope=DatabaseScope.test('da01-packed-consumer-'+crypto.randomUUID());
const client=new DatomicClient('http://127.0.0.1:8470');
const runtime=makeDatomicRuntime({url:'http://127.0.0.1:8470'});
const result={scope,health:await client.health()};
try { result.output=await Effect.runPromise(Effect.gen(function*(){
  const triples=yield* Triples;
  const fact=yield* triples.assert({entityId:EntityId.make('subject'),attribute:':value',value:string('saved')});
  const found=yield* triples.get(fact.id); assert.equal(found?.value.value,'saved');
  const query=yield* triples.query({find:['?e','?v'],where:[['?e',':value','?v']]});
  assert.deepEqual(query.results,[{'?e':'subject','?v':'saved'}]);
  return {factId:fact.id,results:query.results};
}).pipe(Effect.provide(runtime.layer({scope,capabilities:Capabilities.none})),Effect.scoped)); }
finally { result.deleted=await client.delete(scope);client.close();fs.writeFileSync('smoke-receipt.json',JSON.stringify(result,null,2)+'\n'); }
