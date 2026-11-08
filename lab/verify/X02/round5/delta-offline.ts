// [CX-VX02-2] Why: independently vary Q79 boundaries through real source entry points.
// Rejected: repeating only the builder's tests or checking error-name substrings.
import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { Cause, Effect, Exit } from 'effect';
import { integer } from './target/packages/core/dist/index.js';
import { compileXtdb } from './target/packages/xtdb/src/query/compiler.ts';
import { makeXtdbQueryExecutor } from './target/packages/xtdb/src/XtdbQueryExecutor.ts';
import { evaluateXtdbNativeWorkload as evaluate } from './target/packages/qualification/src/native/xtdb-workloads.ts';
import { loadQualificationBackend, qualificationQueryPath, qualificationBackendName } from './target/packages/qualification/src/index.ts';
const report: any = {at:new Date().toISOString(), overflow:[], exact:[], defaults:[]};
const MAX=2n**63n-1n, MIN=-(2n**63n);
for(const language of ['xtql','xtdb-sql'] as const) for(const [name,physical,reserved] of [
 ['positive',MAX,-1n], ['negative',MIN,1n], ['opposite-extremes',MIN,MAX], ['max-boundary',MAX,0n], ['min-boundary',MIN,0n],
] as const){
 const select=()=>Effect.succeed({rows:[{ledger:'physical',total:integer(physical)},{ledger:'reservation',total:integer(reserved)}],basis:{recordedPosition:1},trace:{language}});
 const run=()=>evaluate({select,selectSql:select} as any,{id:'07'},{id:name,cut:{known_at:'1',valid_at:'0'},parameters:{sku:{value:'S'}}},new Map(),[],language);
 const exit=await Effect.runPromiseExit(run()); const overflow=physical-reserved<MIN||physical-reserved>MAX;
 let recovered=false;
 if(overflow){ assert(Exit.isFailure(exit)&&!Cause.hasDies(exit.cause)); assert(String(exit.cause).includes('NativeIntegerOverflowError'));
 recovered=await Effect.runPromise(run().pipe(Effect.catchTag('NativeIntegerOverflowError' as never,()=>Effect.succeed(true))))===true; assert(recovered);
 } else {assert(Exit.isSuccess(exit)); assert.deepEqual(exit.value[0][2],integer(physical-reserved));}
 report.overflow.push({language,name,overflow,recovered,exit:String(exit),pass:true});
}
const values=['1000000000000000004',String(MAX),String(MIN),String(2n**63n),String(2n**63n+1n),String(MIN-1n)];
for(const value of values) for(const op of ['+','-','*','/','%'] as const){
 let literal:any;
 try{literal=integer(value);}catch(error){report.exact.push({value,op,inputRejected:String(error),pass:true}); continue;}
 const base:any={find:['?r'],where:[['e',':i','?i']],compute:[[op,literal,integer('1'),'?r']]};
 const variants:any={constant:base,stored:{...base,compute:[[op,'?i',integer('1'),'?r']]},
 predicate:{...base,where:[...base.where,['>=','?r',integer('0')]]},
 aggregate:{...base,find:['?total'],aggregate:[['sum','?r','?total']]},
 chained:{...base,find:['?next'],compute:[...base.compute,['+','?r',integer('1'),'?next']]},
 wrapped:{inner:base,limit:1}};
 for(const [variant,query] of Object.entries(variants)){
  let error:any; try{compileXtdb(query as any,'review',{integerVariables:['?i']});}catch(e){error=e;}
  assert.equal(error?._tag,'DatalogValidationError',`${op}/${value}/${variant}`);
  assert.match(String(error),/Exact integer computation is not qualified/);
  report.exact.push({value,op,variant,error:String(error),pass:true});
 }
 // Exercise automatic domain discovery and the typed public executor, not only compileXtdb hints.
 const calls:any[]=[]; const client:any={query:async(sql:any)=>{calls.push(sql);return[{value_type:'integer'}]},close:async()=>{}};
 const executor=makeXtdbQueryExecutor(client,'review');
 const run=()=>executor.execute(variants.stored,false,{recordedPosition:1,validAt:1});
 const exit=await Effect.runPromiseExit(run()); assert(Exit.isFailure(exit)&&!Cause.hasDies(exit.cause));
 const recovered=await Effect.runPromise(run().pipe(Effect.catchTag('DatalogValidationError',()=>Effect.succeed('handled'))));assert.equal(recovered,'handled');
 report.exact.push({value,op,variant:'executor',exit:String(exit),recovered,calls,pass:true});
}
// All tasks use the switch-absent route through both direct invocation and loader's built export.
delete process.env.TRIPLEX_XTDB_NATIVE_LANGUAGE; delete process.env.TRIPLEX_BACKEND;
process.env.TRIPLEX_QUERY_PATH='xtdb-native';
const backend=await loadQualificationBackend(); assert.equal(backend.nativeLanguage,undefined);
const packet=JSON.parse(readFileSync('qualification/workloads/temporal-workloads.json','utf8'));
for(const mode of ['direct-omitted','direct-undefined','loader'] as const) for(const workload of packet.workloads) for(const entry of workload.cases){
 const calls:any[]=[];
 const make=(method:string)=>(contract:any,input:any,...rest:any[])=>{
  const build=rest[method==='selectSqlWithReachability'?1:0];const options=rest[method==='selectSqlWithReachability'?2:1];let n=0;
  const ctx={basis:{},bind:()=>`$${++n}`,attribute:()=>`$${++n}`,identifier:(s:string)=>s,facts:()=>'(SELECT * FROM FACTS)',recordedFacts:()=>'(SELECT * FROM RECORDED)',history:()=> 'HISTORY',relation:()=>'(SELECT source,target FROM WORKING)'};
  const name=String(contract.name).split('/').slice(2).join('/');calls.push({method,name,text:build(ctx,input),basis:options?.basis});
  let rows:any[]=[];
  if(name==='purchase-times') rows=[{purchase:entry.parameters?.purchase_ids?.[0]?.value,at:'5'}];
  if(name==='claim-coordinate') rows=[{coverage:'c',at:'5'}];
  if(name==='account-balance'||name==='net-revenue') rows=[{total:'0'}];
  if(name==='workflow-start') rows=[{deadline:'5',feed:'f'}];
  if(name==='first-completion') rows=[{first:null}];
  if(name==='source-watermark') rows=[{through:null}];
  if(name==='uptime-interval-union') rows=[{duration:0}];
  if(name==='prediction-label-cut') rows=[{customer:'c',at:'5',known:'0',label:true}];
  if(name==='accepted-events'||name.startsWith('bounded-dag')) rows=[{count:'0'}];
  return Effect.succeed({rows,basis:{recordedPosition:7},trace:{language:method==='select'?'xtql':'xtdb-sql',steps:[]}});
 };
 const session:any={select:make('select'),selectSql:make('selectSql'),selectSqlWithReachability:make('selectSqlWithReachability')};
 const args:any=[session,workload,entry,new Map([[0,0]]),[]];
 const program=mode==='loader'?backend.nativeWorkload!.evaluate(...args):mode==='direct-undefined'?evaluate(...args,undefined):evaluate(...args);
 const exit=await Effect.runPromiseExit(program);assert(Exit.isSuccess(exit),`${mode}/${workload.id}/${entry.id}: ${String(exit)}`);assert(calls.length);
 for(const call of calls) assert.equal(call.method==='select',call.name==='state-at');
 if(entry.operation==='reachability_closure') assert(calls.some(c=>c.method==='selectSqlWithReachability'));
 report.defaults.push({mode,id:workload.id,entry:entry.id,calls,pass:true});
}
delete process.env.TRIPLEX_QUERY_PATH;
assert.equal(qualificationQueryPath(),'xtdb-datalog');assert.equal(qualificationBackendName(),'xtdb');
const ordinary=await loadQualificationBackend();assert.equal(ordinary.queryPath,'xtdb-datalog');assert.equal(ordinary.nativeWorkload,undefined);
report.ordinaryDefault={queryPath:ordinary.queryPath,nativeWorkload:'undefined',pass:true};
writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({overflow:report.overflow.length,exact:report.exact.length,defaults:report.defaults.length,pass:true}));
