// [CX-VRT01] Why: exercise the public batch shortcut and every core basis-taking surface. Rejected: inferring all routes from the low-level entity path.
import { Effect } from 'effect';
import { writeFileSync } from 'node:fs';
import { Triples,EntityId } from '../../../../../packages/core/dist/index.js';
import { makeA0RecordTimeSuite } from '../../../../../packages/testkit/dist/index.js';
import { makeXtdbStorageAdapter } from '../../../../../packages/xtdb/src/XtdbStorageAdapter.js';
import { makeQleverStorageAdapter } from '../../../../../packages/qlever/src/QleverStorageAdapter.js';
import { makeXtdbQueryExecutor } from '../../../../../packages/xtdb/src/XtdbQueryExecutor.js';
import { makeQleverQueryExecutor } from '../../../../../packages/qlever/src/QleverQueryExecutor.js';
import { integerOrderKey } from '../../../../../packages/qlever/src/rdf.js';
const results:any[]=[];
for(const lane of ['xtdb','qlever']){
 let queries=0;
 const client:any={query:async(q:string)=>{queries++;if(!q.includes('tx_meta')&&!q.startsWith('SELECT ?position'))throw new Error('Unexpected answer query');return lane==='xtdb'?[{position:1,stamp:1000000}]:[{position:{value:'1'},stamp:{value:integerOrderKey('1000000')}}];},submit:async()=>{},update:async()=>{throw new Error('no writes');},command:async()=>{},cancel:async()=>{},close:async()=>{}};
 const adapter=lane==='xtdb'?makeXtdbStorageAdapter(client,'public'):makeQleverStorageAdapter(client,'public');
 const executor=lane==='xtdb'?makeXtdbQueryExecutor(client,'public'):makeQleverQueryExecutor(client,'public');
 const suite=makeA0RecordTimeSuite(adapter,executor,'public',{loseNextAck:()=>{}});
 const program=Effect.gen(function*(){
  const t=yield* Triples;
  const basis={validAt:1000,recordedAt:Date.now()+60000};
  const q={find:['?e'],where:[['?e',':value','?v']]};
  for(const [name,read] of [
   ['empty-entities',()=>t.entities([],basis)],['entities',()=>t.entities([EntityId.make('subject')],basis)],['entity',()=>t.entity(EntityId.make('subject'),basis)],['entity-page',()=>t.entityPage({entityType:'Subject',basis})],['match',()=>t.match({},basis)],['dependency-empty',()=>t.dependencyState([],basis)],['query-all',()=>t.queryAll(q as any,{basis})],['query-all-echo',()=>t.queryAll(q as any,{basis,includeBasis:true})],['query',()=>t.query(q as any,{basis})],['query-page',()=>t.queryPage({inner:q,limit:10} as any,{basis})]
  ] as const){
   const before=queries,start=performance.now();
   const observed=yield* read().pipe(Effect.match({onSuccess:(value:any)=>({success:value}),onFailure:(e:any)=>({tag:e._tag,axis:e.axis,message:e.message})}));
   results.push({lane,route:name,basis,queries:queries-before,elapsed:performance.now()-start,observed});
  }
 });
 await Effect.runPromise(program.pipe(Effect.provide(suite.layer)));
}
writeFileSync('lab/experiments/EXP-RT01/round2/evidence/public-routes.json',JSON.stringify(results,null,2)+'\n');
console.log(JSON.stringify(results,null,2));
