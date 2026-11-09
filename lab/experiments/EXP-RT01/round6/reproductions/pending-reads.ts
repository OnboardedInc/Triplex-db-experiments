import { recordCatalog } from "../../../../../packages/xtdb/test/fixtures/record-catalog.js";
// [CX-VRT01-R2] Why: enumerate concrete public/read SPI entry points and exercise their basis and error boundaries with an open, read-only transaction context. Rejected: assuming a shared helper proves every caller uses it.
import {Effect} from 'effect';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {Triples,EntityId,BasisNotAvailable,ReadError} from '../../../../../packages/core/dist/index.js';
import {TypeExpr} from '../../../../../packages/core/dist/config/index.js';
import {DatabaseScope} from '../../../../../packages/core/dist/runtime/index.js';
import {makeA0RecordTimeSuite} from '../../../../../packages/testkit/dist/index.js';
import {makeXtdbStorageAdapter} from '../../../../../packages/xtdb/src/XtdbStorageAdapter.js';
import {makeQleverStorageAdapter} from '../../../../../packages/qlever/src/QleverStorageAdapter.js';
import {makeXtdbQueryExecutor} from '../../../../../packages/xtdb/src/XtdbQueryExecutor.js';
import {makeQleverQueryExecutor} from '../../../../../packages/qlever/src/QleverQueryExecutor.js';
import {makeXtdbNativeQueries} from '../../../../../packages/xtdb/src/native/NativeQueries.js';
import {makeQleverNativeQueries} from '../../../../../packages/qlever/src/native/NativeQueries.js';
import {makeXtdbTemporalQueries} from '../../../../../packages/xtdb/src/TemporalQueries.js';
import {makeQleverTemporalQueries} from '../../../../../packages/qlever/src/TemporalQueries.js';
import {makeXtdbMaintainedQueries} from '../../../../../packages/xtdb/src/MaintainedQueries.js';
import {resolveXtdbOperation} from '../../../../../packages/xtdb/src/Operations.js';
import {resolveQleverOperation} from '../../../../../packages/qlever/src/Operations.js';
import {integerOrderKey} from '../../../../../packages/qlever/src/rdf.js';
const out=(process.env.RT01_R3_OUT+'/pending'),save=(n:string,v:unknown)=>writeFileSync(out+'/'+n,JSON.stringify(v,null,2)+'\n');
const scope=DatabaseScope.test('review-r2-matrix');
const contract={name:'review-r2/matrix',parameters:TypeExpr.any,row:TypeExpr.any};
const q=(empty:boolean)=>({find:['?v'],where:[[empty?'missing':'subject',':value','?v']]});
const wrapped=(empty:boolean)=>({inner:q(empty),limit:10});
type Route={id:string;kind:'T'|'TP'|'snapshot'|'none'|'compile'|'publish';run:(c:any,b:any,empty:boolean)=>any};
const base:Route[]=[
 {id:'Triples.entity',kind:'T',run:(c,b,e)=>c.t.entity(EntityId.make(e?'missing':'subject'),b)},
 {id:'Triples.entities',kind:'T',run:(c,b,e)=>c.t.entities(e?[]:[EntityId.make('subject')],b)},
 {id:'Triples.entityPage',kind:'T',run:(c,b,e)=>c.t.entityPage({entityType:e?'Missing':'Subject',basis:b})},
 {id:'Triples.match',kind:'T',run:(c,b,e)=>c.t.match(e?{}:{entityId:EntityId.make('subject')},b)},
 {id:'Triples.dependencyState',kind:'T',run:(c,b,e)=>c.t.dependencyState(e?[]:[':value'],b)},
 {id:'Triples.queryAll',kind:'T',run:(c,b,e)=>c.t.queryAll(q(e),{basis:b})},
 {id:'Triples.queryAll+echo',kind:'T',run:(c,b,e)=>c.t.queryAll(q(e),{basis:b,includeBasis:true})},
 {id:'Triples.query',kind:'T',run:(c,b,e)=>c.t.query(q(e),{basis:b})},
 {id:'Triples.queryPage',kind:'T',run:(c,b,e)=>c.t.queryPage(wrapped(e),{basis:b})},
 {id:'Triples.transactionsForEntity',kind:'snapshot',run:(c,b,e)=>c.t.transactionsForEntity(EntityId.make(e?'missing':'subject'),{snapshotPosition:b.recordedPosition})},
 {id:'Storage.getByEntity',kind:'TP',run:(c,b,e)=>c.adapter.getByEntity(e?'missing':'subject',b)},
 {id:'Storage.getByEntities',kind:'TP',run:(c,b,e)=>c.adapter.getByEntities(e?[]:['subject'],b)},
 {id:'Storage.query',kind:'TP',run:(c,b,e)=>c.adapter.query(e?{}:{entityId:EntityId.make('subject')},b)},
 {id:'Storage.dependencyState',kind:'TP',run:(c,b,e)=>c.adapter.dependencyState(e?[]:[':value'],b)},
 {id:'QueryExecutor.execute',kind:'TP',run:(c,b,e)=>c.executor.execute(q(e),false,b)},
 {id:'QueryExecutor.executePage',kind:'TP',run:(c,b,e)=>c.executor.executePage(wrapped(e),false,b)},
 {id:'Temporal.queryIntervals',kind:'TP',run:(c,b,e)=>c.temporal.queryIntervals(q(e),{from:0,to:1001,...b})},
 {id:'Native.select',kind:'TP',run:(c,b,e)=>c.native.select(contract,{ids:e?[]:['subject']},()=>c.lane==='xtdb'?'(rel [] [v])':'SELECT ?v WHERE {}',{basis:b})},
 {id:'Triples.get',kind:'none',run:c=>c.t.get('row-one')},
 {id:'Triples.history',kind:'none',run:c=>c.t.history(EntityId.make('subject'))},
 {id:'Triples.transaction',kind:'none',run:c=>c.t.transaction('_tx/one')},
 {id:'Triples.transactionByCommand',kind:'none',run:c=>c.t.transactionByCommand('command-one')},
 {id:'Triples.transactions',kind:'none',run:c=>c.t.transactions()},
 {id:'Triples.currentPosition',kind:'none',run:c=>c.t.currentPosition()},
 {id:'Storage.getById',kind:'none',run:c=>c.adapter.getById('row-one')},
 {id:'Storage.history',kind:'none',run:c=>c.adapter.history('subject')},
 {id:'Storage.currentCut',kind:'none',run:c=>c.adapter.currentCut()},
 {id:'Storage.currentCommitPosition',kind:'none',run:c=>c.adapter.currentCommitPosition()},
 {id:'Operations.resolve',kind:'none',run:c=>c.lane==='xtdb'?resolveXtdbOperation(c.client,scope,'operation-one'):resolveQleverOperation(c.client,scope,'operation-one')},
 {id:'Triples.explain',kind:'compile',run:c=>c.t.explain({find:['?v'],where:[['?e',':value','?v']],limit:-1})},
 {id:'Triples.explainPage',kind:'compile',run:c=>c.t.explainPage({inner:q(false),limit:-1})},
 {id:'QueryExecutor.explain',kind:'compile',run:c=>c.executor.explain({find:['?v'],where:[['?e',':value','?v']],limit:-1})},
 {id:'QueryExecutor.explainPage',kind:'compile',run:c=>c.executor.explainPage({inner:q(false),limit:-1})}
];
function entries(lane:string):Route[]{return [...base,...(lane==='xtdb'?[
 {id:'Native.selectSql',kind:'TP',run:(c:any,b:any,e:boolean)=>c.native.selectSql(contract,{ids:e?[]:['subject']},()=> 'SELECT 1 AS v',{basis:b})},
 {id:'Native.selectWithReachability',kind:'TP',run:(c:any,b:any,e:boolean)=>c.native.selectWithReachability(contract,{},e?[]:[{name:'deps',edges:()=>'(rel [] [source target])',seeds:()=>['subject']}],()=>'(rel [] [v])',{basis:b})},
 {id:'Native.selectSqlWithReachability',kind:'TP',run:(c:any,b:any,e:boolean)=>c.native.selectSqlWithReachability(contract,{},e?[]:[{name:'deps',edges:()=>"SELECT 'subject' AS source, 'target' AS target",seeds:()=>['subject']}],()=> 'SELECT 1 AS v',{basis:b})},
 {id:'Maintained.query',kind:'TP',run:(c:any,b:any,e:boolean)=>c.maintained.query(q(e),b)},
 {id:'Maintained.publish',kind:'publish',run:(c:any,b:any,e:boolean)=>c.maintained.publish(q(e),b)}
]:[{id:'Native.selectWithRelations',kind:'TP',run:(c:any,b:any,e:boolean)=>c.native.selectWithRelations(contract,{},e?[]:[{name:'deps',edges:()=> 'SELECT ?source ?target WHERE {}',seeds:()=>['subject']}],()=> 'SELECT ?v WHERE {}',{basis:b})}])] as Route[];}
const catalog:any[]=[];const observations:any[]=[];const scenarios:any[]=[];
for(const lane of ['xtdb','qlever']){
 const routes=entries(lane);catalog.push({lane,routes:routes.map(({id,kind})=>({id,kind}))});
 for(const route of routes){
  if(['none','compile'].includes(route.kind)){for(const mode of route.kind==='compile'?['invalid']:['sentinel-basis','sentinel-read'])scenarios.push({lane,route,mode,head:1,empty:false});continue;}
  for(const head of [0,1])for(const empty of [true,false]){
   for(const axis of route.kind==='T'?['recordedAt']:route.kind==='snapshot'?['recordedPosition']:['recordedAt','recordedPosition']){
    scenarios.push({lane,route,mode:'near',axis,head,empty});
    if(axis==='recordedAt')scenarios.push({lane,route,mode:'far',axis,head,empty});
   }
  }
  if(route.kind!=='snapshot')scenarios.push({lane,route,mode:'sentinel-basis',axis:'recordedAt',head:1,empty:false});
  if(route.kind==='snapshot')scenarios.push({lane,route,mode:'sentinel-index',axis:'recordedAt',head:1,empty:false});
 }
}
scenarios.splice(0,scenarios.length,...scenarios.filter(s=>s.mode==='near'&&s.axis==='recordedAt'&&s.head===1).map(s=>({...s,mode:'pending-near'})));
async function execute(s:any){
 const clock=s.head?1000:0,target=s.axis==='recordedPosition'?s.head+1:s.mode==='far'?Date.now()+60000:clock+0.001;
 const basis={validAt:1000,[s.axis??'recordedAt']:target};
 let armed=false,cuts=0,answers=0,writes=0;
 const sentinel=s.mode==='sentinel-read'?new ReadError({message:'review-r2/read-refusal'}):new BasisNotAvailable({axis:'recordedAt',required:target,observed:clock,waitedMs:2000,surface:'review-transport',message:'review-r2/basis-refusal'});
 const client:any={query:async(sql:string)=>{
   if(sql.includes("information_schema")) return recordCatalog();
   const isCut=sql.includes('FROM tx_meta')||sql.includes('(from :tx_meta')||sql.startsWith('SELECT ?position');
   if(armed){if(isCut)cuts++;else answers++;}
   if(armed&&((s.mode==='sentinel-index'&&!isCut)||(s.mode.startsWith('sentinel')&&s.mode!=='sentinel-index')))throw sentinel;
   if(isCut)return s.head?(s.lane==='xtdb'?[{position:s.head,stamp:1000000}]:[{position:{value:String(s.head)},stamp:{value:integerOrderKey('1000000')}}]):[];
   return [];
 },submit:async()=>{if(armed){writes++;throw new Error('Read attempted a write');}return {};},update:async()=>{if(armed){writes++;throw new Error('Read attempted an update');}},command:async()=>{},cancel:async()=>{},close:async()=>{}};
 const adapter=s.lane==='xtdb'?makeXtdbStorageAdapter(client,scope):makeQleverStorageAdapter(client,scope);
 const executor=s.lane==='xtdb'?makeXtdbQueryExecutor(client,scope):makeQleverQueryExecutor(client,scope,{sourceView:adapter.sourceView});
 const native=s.lane==='xtdb'?makeXtdbNativeQueries(client,scope):makeQleverNativeQueries(client,scope);
 const temporal=s.lane==='xtdb'?makeXtdbTemporalQueries(client,scope):makeQleverTemporalQueries(client,scope);
 const maintained=s.lane==='xtdb'?makeXtdbMaintainedQueries(client,scope):undefined;
 const suite=makeA0RecordTimeSuite(adapter,executor,scope,{loseNextAck:()=>{}});
 const result=await Effect.runPromise(Effect.gen(function*(){
  const t=yield* Triples;
  const c={t,adapter,executor,native,temporal,maintained,client,lane:s.lane};
  if(!catalog.find(r=>r.lane===s.lane).objects){
   const shapes=Object.fromEntries(Object.entries(c).filter(([k])=>!['lane','client'].includes(k)).filter(([,v])=>v).map(([k,v])=>[k,Object.keys(v as object).sort()]));
   catalog.find(r=>r.lane===s.lane).objects=shapes;
   const coreKnown=['assert','assertBatch','retract','retractByPattern','transact','get','entity','entities','entityPage','match','history','transaction','transactionByCommand','transactions','transactionsForEntity','currentPosition','dependencyState','query','queryPage','queryAll','explain','explainPage'].sort();
   assert.deepEqual(Object.keys(t).sort(),coreKnown);
   assert.deepEqual(Object.keys(executor).sort(),['execute','executePage','explain','explainPage']);
   assert.deepEqual(Object.keys(native).sort(),entries(s.lane).filter(r=>r.id.startsWith('Native.')).map(r=>r.id.slice(7)).sort());
  }
  armed=true;const start=performance.now();
  const observed=yield* adapter.withTransaction(s.route.run(c,basis,s.empty),{replaySafe:false}).pipe(Effect.match({onSuccess:(value:any)=>({success:value}),onFailure:(error:any)=>({tag:error._tag,axis:error.axis,required:error.required,observed:error.observed,waitedMs:error.waitedMs,sameObject:error===sentinel,causeTag:error.cause?._tag,message:error.message})}));
  return {observed,elapsedMs:performance.now()-start};
 }).pipe(Effect.provide(suite.layer)));
 const observed:any=result.observed;
 const unsupported=s.lane==='qlever'&&['Triples.queryAll','QueryExecutor.execute','QueryExecutor.executePage'].includes(s.route.id);
 const expected=unsupported?{tag:'DatalogValidationError'}:s.mode==='invalid'?{tag:'DatalogValidationError'}:s.mode==='sentinel-read'?{tag:'ReadError'}:{tag:'BasisNotAvailable',axis:s.mode.startsWith('sentinel')?'recordedAt':s.axis};
 const tagMatches=observed.tag===expected.tag&&(!expected.axis||observed.axis===expected.axis);
 const metadataMatches=!unsupported&&(s.mode==='pending-near'||s.mode==='far')?observed.required===target&&observed.observed===(s.axis==='recordedPosition'?s.head:clock):true;
 const deadlineMatches=s.mode==='pending-near'&&!unsupported?result.elapsedMs>=1900:s.mode==='far'?result.elapsedMs<1500:true;
 const identityMatches=s.mode.startsWith('sentinel')?observed.sameObject===true:true;
 const noPrematureAnswer=s.mode==='pending-near'||s.mode==='far'?answers===0&&writes===0:true;
 observations.push({lane:s.lane,route:s.route.id,kind:s.route.kind,mode:s.mode,scopeHead:s.head,emptyInput:s.empty,basis,expected,...result,cuts,answers,writes,checks:{tagMatches,metadataMatches,deadlineMatches,identityMatches,noPrematureAnswer},matches:tagMatches&&metadataMatches&&deadlineMatches&&identityMatches&&noPrematureAnswer});
}
let index=0;await Promise.all(Array.from({length:32},async()=>{while(index<scenarios.length){const s=scenarios[index++];try{await execute(s);}catch(e){observations.push({lane:s.lane,route:s.route.id,mode:s.mode,harnessFailure:String(e),matches:false});}}}));
observations.sort((a,b)=>JSON.stringify([a.lane,a.route,a.mode,a.scopeHead,a.emptyInput]).localeCompare(JSON.stringify([b.lane,b.route,b.mode,b.scopeHead,b.emptyInput])));
save('catalog.json',catalog);save('observations.json',observations);save('summary.json',{scenarios:scenarios.length,observations:observations.length,matches:observations.filter(r=>r.matches).length,mismatches:observations.filter(r=>!r.matches)});
console.log(JSON.stringify({scenarios:scenarios.length,matches:observations.filter(r=>r.matches).length,mismatches:observations.filter(r=>!r.matches).map(r=>({lane:r.lane,route:r.route,mode:r.mode,observed:r.observed,error:r.harnessFailure}))},null,2));
