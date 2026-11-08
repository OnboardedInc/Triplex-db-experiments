// [CX-VX02-3] Why: compare safe operand variants with real-engine rows and require nested unsafe refusals.
// Rejected: assuming SELECT always returns x or executing known-hazard arrays directly on the shared resident.
import { writeFileSync, appendFileSync } from 'node:fs';
import { Cause, Effect, Exit } from 'effect';
import { DatabaseScope } from './target/packages/core/dist/runtime/index.js';
import { TypeExpr } from './target/packages/core/dist/config/index.js';
import { makeXtdbClient, makeXtdbNativeQueries } from './target/packages/xtdb/src/index.ts';
import { readOnlyNativeSql as guard } from './target/packages/xtdb/src/native/ReadOnlySql.ts';
import { readOnlyNativeSql as baseline } from './baseline-ReadOnlySql.ts';
if(process.env.DOCKER_HOST!=='unix:///Users/sam/.colima/triplex2/docker.sock')throw Error('private endpoint required');
const out=process.argv[2];
const client=makeXtdbClient('postgres://xtdb:xtdb@127.0.0.1:5470/xtdb',{maxConnections:1});
const native=makeXtdbNativeQueries(client,DatabaseScope.test('cx-vx02-r3-variations'));
const contract={name:'cx-vx02-r3/variations',parameters:TypeExpr.struct({}),row:TypeExpr.struct({v:TypeExpr.required(TypeExpr.text)})};
const checks:any[]=[];
const wrap=(s:string,n:number)=>{for(let i=0;i<n;i++)s=`( /* open (${i}) */ ${s} -- close )\r\n)`;return s;};
for(const q of ['ANY','SOME','ALL']){
 for(const depth of [1,2,4,8,16]) checks.push({name:`safe-${q}-depth-${depth}`,sql:`SELECT 'x' AS v WHERE 1 = ${q}/**/${wrap('SELECT 1',depth)}`,kind:'safe'});
 for(const [name,inner] of [
  ['union-flat','SELECT 1 UNION ALL SELECT 2'],
  ['union-left-parens','(SELECT 1) UNION ALL SELECT 2'],
  ['union-both-parens','(SELECT 1) UNION ALL (SELECT 2)'],
  ['union-deep-left','((SELECT 1)) UNION ALL SELECT 2'],
  ['union-left-comments','( /* lhs */ SELECT 1) /* set */ UNION/**/ALL (SELECT 2)'],
  ['values','VALUES (1)'],
  ['with','WITH q AS (SELECT 1 AS j) SELECT j FROM q'],
  ['literal-parens',"SELECT 1 WHERE '(' = '(' AND ')' = ')'"],
  ['safe-nested','SELECT 1 WHERE 1 = SOME ((SELECT 1))'],
 ] as const) checks.push({name:`safe-${q}-${name}`,sql:`SELECT 'x' AS v WHERE 1 = ${q}${wrap(inner,3)}`,kind:'safe'});
 for(const [name,inner] of [
  ['bare','ARRAY[1,2]'], ['wrapped',wrap('ARRAY[1,2]',4)],
  ['inner-bare',wrap('SELECT 1 WHERE 1 = SOME/**/ ARRAY[1,2]',4)],
  ['inner-wrapped',wrap('SELECT 1 WHERE 1 = ALL /* x */ ((ARRAY[1,2]))',4)],
  ['union-inner-unsafe',wrap('SELECT 1 UNION ALL SELECT 1 WHERE 1 = ANY/**/(ARRAY[1,2])',4)],
 ] as const) checks.push({name:`unsafe-${q}-${name}`,sql:`SELECT 'x' AS v WHERE 1 = ${q}/**/${inner}`,kind:'unsafe'});
}
const report:any={at:new Date().toISOString(),target:'200d669',controls:[]};
writeFileSync(out+'.jsonl',JSON.stringify({at:report.at})+'\n',{flag:'wx'});
const check=(f:any,sql:string)=>{try{f(sql);return{accepted:true}}catch(error){return{accepted:false,error:String(error)}}};
try{for(const c of checks){
 const r:any={...c,baseline:check(baseline,c.sql),guard:check(guard,c.sql)};
 const e=await Effect.runPromiseExit(native.selectSql(contract,{},()=>c.sql,{timeoutMs:15000}));
 r.exit=String(e);r.defect=Exit.isFailure(e)&&Cause.hasDies(e.cause);
 if(Exit.isSuccess(e))r.rows=e.value.rows;
 if(c.kind==='safe'){
  try{r.rawRows=await client.query(c.sql,[],undefined,{timeoutMs:15000,parameterSyntax:'postgresql'});}catch(error){r.rawError=String(error);}
  r.engineSupported=Array.isArray(r.rawRows);
  r.pass=r.engineSupported&&r.guard.accepted&&Exit.isSuccess(e)&&JSON.stringify(r.rows)===JSON.stringify(r.rawRows);
 }else r.pass=!r.guard.accepted&&Exit.isFailure(e)&&!r.defect&&String(e.cause).includes('non-subquery operand');
 report.controls.push(r);appendFileSync(out+'.jsonl',JSON.stringify(r)+'\n');console.log(r.pass?'PASS':'FAIL',r.name,JSON.stringify(r));
}}finally{await client.close();}
writeFileSync(out,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
if(report.controls.some((r:any)=>!r.pass))process.exitCode=1;
