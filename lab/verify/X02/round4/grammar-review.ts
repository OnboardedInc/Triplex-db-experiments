// [CX-VX02-4] Why: independently compare engine answers, separate malformed engine syntax, and record pre-dispatch refusals.
// Rejected: counting the author's corpus as independent generation or sending mutations/known-hazard operands to the engine.
import {writeFileSync,appendFileSync,readFileSync} from 'node:fs';
import {Effect,Exit,Cause} from 'effect';
import {DatabaseScope} from './target/packages/core/dist/runtime/index.js';
import {TypeExpr} from './target/packages/core/dist/config/index.js';
import {makeXtdbClient,makeXtdbNativeQueries} from './target/packages/xtdb/src/index.ts';
import {readOnlyNativeSql as guard} from './target/packages/xtdb/src/native/ReadOnlySql.ts';
import {readOnlyNativeSql as prior} from './round3-ReadOnlySql.ts';
import {queryExpressionCorpus} from './target/packages/xtdb/test/query-expression-corpus.ts';
if(process.env.DOCKER_HOST!=='unix:///Users/sam/.colima/triplex2/docker.sock')throw Error('private endpoint required');
const out=process.argv[2];
const contract={name:'cx-vx02-r4/grammar',parameters:TypeExpr.struct({}),row:TypeExpr.struct({v:TypeExpr.required(TypeExpr.text)})};
const client=makeXtdbClient('postgres://xtdb:xtdb@127.0.0.1:5470/xtdb',{maxConnections:1});
const native=makeXtdbNativeQueries(client,DatabaseScope.test('cx-vx02-r4-grammar'));
const report:any={at:new Date().toISOString(),target:'416d84e',safe:[],unsafe:[]};
writeFileSync(out+'.jsonl',JSON.stringify({at:report.at})+'\n',{flag:'wx'});
const write=(kind:string,r:any)=>{report[kind].push(r);appendFileSync(out+'.jsonl',JSON.stringify({kind,...r})+'\n')};
const check=(fn:any,sql:string)=>{try{fn(sql);return{accepted:true}}catch(e){return{accepted:false,error:String(e)}}};
const safe:any[]=queryExpressionCorpus().map(x=>({...x,origin:'author-generator',name:`author-${x.formIndex}-${x.depth}-${x.comments}-${x.quantifier}`}));
for(const file of ['../round3/union-regression.json','../round3/subquery-regression.json'])for(const [i,r]of JSON.parse(readFileSync(new URL(file,import.meta.url),'utf8')).controls.entries())safe.push({name:`previous-${file}-${i}`,sql:r.sql,origin:'reviewer-previous'});
const gaps=[' ','/**/',' /*雪 ( */ -- 😀 )\r\n ','\t\r\n'];
const wrap=(s:string,n:number,g:string)=>{for(let i=0;i<n;i++)s=`(${g}${s}${g})`;return s};
for(const [opIndex,op] of ['UNION','INTERSECT','EXCEPT'].entries())for(const q of ['ANY','SOME','ALL'])for(const depth of [1,4,9])for(const [gIndex,gap]of gaps.entries()){
 const inner=`${wrap('select 1',2,gap)}${gap}${op.toLowerCase()}${gap}DiStInCt${gap}${wrap(`values${gap}(1)`,1,gap)}${gap}UNION${gap}ALL${gap}SELECT${gap}2`;
 safe.push({origin:'independent',name:`mixed-distinct-${opIndex}-${q}-${depth}-${gIndex}`,sql:`SELECT 'x' AS v WHERE 1 = ${q.toLowerCase()}${gap}${wrap(inner,depth,gap)}`});
}
for(const q of ['ANY','SOME','ALL'])for(const [name,inner]of [
 ['backtick-union','SELECT 1 AS `UNION`'],['backtick-intersect','SELECT 1 AS `INTERSECT`'],['backtick-except','SELECT 1 AS `EXCEPT`'],
 ['backtick-open','SELECT 1 AS `(`'],['backtick-unicode','SELECT 1 AS `雪😀`'],['backtick-escaped','SELECT 1 AS `a``UNION``b`'],
 ['dollar-identifier','SELECT 1 AS a$UNION'],['double-quoted',`SELECT 1 AS "UNION(😀)"`],
 ['quoted-literal',"SELECT 1 WHERE 'ANY /* ) */ ARRAY[1]; DELETE' = 'ANY /* ) */ ARRAY[1]; DELETE'"],
 ['dollar-literal',"SELECT 1 WHERE $a$UNION ) /* INSERT$a$ = $a$UNION ) /* INSERT$a$"],
 ['escaped-string',"SELECT 1 WHERE E'a\\'b)UNION' = E'a\\'b)UNION'"],
 ['double-escaped',`SELECT 1 AS "a""UNION""b"`],
 ['nested-block','SELECT /* a /* b */ c */ 1'],
 ['suffix-order','(SELECT 1) ORDER BY 1'],['suffix-limit','(SELECT 1) LIMIT 1'],
 ['suffix-offset','(SELECT 1) OFFSET 0 ROWS'],['suffix-fetch','(SELECT 1) FETCH FIRST 1 ROW ONLY'],
 ['suffix-set','((SELECT 1) UNION ALL SELECT 2) ORDER BY 1 LIMIT 1'],
]as const)safe.push({origin:'independent',name:`leaf-${q}-${name}`,sql:`SELECT 'x' AS v WHERE 1 = ${q}/**/(${inner})`});
for(const [name,sql]of [
 ['safe-dollar-id',"SELECT 'x' AS v, 0 AS a$tag$ WHERE 1 = ANY/**/(SELECT 1) AND EXISTS(SELECT 1 AS z$tag$b)"],
 ['safe-dollar-backtick',"SELECT 'x' AS v, 0 AS `a$tag$` WHERE 1 = ANY/**/(SELECT 1) AND EXISTS(SELECT 1 AS `$tag$b`)"],
 ['safe-three-statements',"SELECT 1 AS a$tag$; SELECT 2; SELECT 3 AS z$tag$b"],
]as const)safe.push({origin:'boundary-control',name,sql});
try{
 for(const [i,c]of safe.entries()){
  const r:any={...c,guard:check(guard,c.sql),prior:check(prior,c.sql)};
  const e=await Effect.runPromiseExit(native.selectSql(contract,{},()=>c.sql,{timeoutMs:15000}));
  r.exit=Exit.isSuccess(e)?'Success':String(e);r.defect=Exit.isFailure(e)&&Cause.hasDies(e.cause);
  if(Exit.isSuccess(e))r.rows=e.value.rows;
  try{r.rawRows=await client.query(c.sql,[],undefined,{timeoutMs:15000,parameterSyntax:'postgresql'});}catch(e){r.rawError=String(e)}
  r.engineSupported=Array.isArray(r.rawRows);
  r.match=r.engineSupported&&Exit.isSuccess(e)&&JSON.stringify(r.rows)===JSON.stringify(r.rawRows.map((x:any)=>({v:x.v})));
  write('safe',r);if(i%100===0)console.log('safe progress',i,'/',safe.length);
 }
}finally{await client.close()}
const unsafe:any[]=[];
for(const c of queryExpressionCorpus())unsafe.push({origin:'author-mutation-rerun',name:`nested-${c.formIndex}-${c.depth}-${c.comments}-${c.quantifier}`,sql:c.sql.slice(0,-1)+' UNION SELECT 1 WHERE 1 = SOME/**/ ARRAY[1,2])'});
for(const q of ['ANY','SOME','ALL'])for(const op of ['=','<>','!=','<','<=','>','>='])for(const gap of gaps)for(const body of ['ARRAY[1,2]','((ARRAY[1,2]))','SELECT 1 UNION (ARRAY[2])','SELECT 1 UNION','()'])unsafe.push({origin:'independent',name:`invalid-${q}-${op}-${JSON.stringify(gap)}-${body}`,sql:`SELECT 'x' AS v WHERE 1 ${op}${gap}${q}${gap}(${body})`});
for(const q of ['ANY','SOME','ALL'])for(const gap of gaps)for(const inner of [
 'SELECT 1 WHERE 1 = ANY/**/ ARRAY[1,2]',
 'SELECT 1 EXCEPT DISTINCT SELECT 1 WHERE 1 <> SOME (ARRAY[1])',
 '(SELECT 1 WHERE 1 >= ALL ((ARRAY[1]))) UNION ALL (VALUES (2))',
 'WITH q AS (SELECT 1 WHERE 1 = SOME ARRAY[1]) SELECT 1',
])unsafe.push({origin:'independent',name:`unsafe-inner-${q}-${JSON.stringify(gap)}-${inner}`,sql:`SELECT 'x' AS v WHERE 1 = ${q}${gap}${wrap(inner,7,gap)}`});
for(const keyword of ['INSERT INTO tx_assertions RECORDS {_id:1}','UPDATE tx_assertions SET value_string=1','DELETE FROM tx_assertions','ERASE FROM tx_assertions','DROP TABLE tx_assertions','SET AWAIT_TOKEN = \'x\''])for(const gap of gaps)for(const context of ['direct','semicolon','cte']){
 const mutation=keyword.split(' ').join(gap);
 unsafe.push({origin:'mutation',name:`mutation-${context}-${JSON.stringify(gap)}-${keyword}`,sql:context==='direct'?mutation:context==='semicolon'?`SELECT 'x' AS v; ${mutation}`:`WITH q AS (${mutation}) SELECT 'x' AS v`});
}
for(const [name,sql]of [
 ['dollar-id-array',"SELECT 'x' AS v, 0 AS a$tag$ WHERE 1 = ANY/**/(ARRAY[1,2]) AND EXISTS(SELECT 1 AS z$tag$b)"],
 ['backtick-dollar-array',"SELECT 'x' AS v, 0 AS `a$tag$` WHERE 1 = ANY/**/(ARRAY[1,2]) AND EXISTS(SELECT 1 AS `$tag$b`)"],
 ['dollar-id-delete',"SELECT 1 AS a$tag$; DELETE FROM tx_assertions; SELECT 2 AS z$tag$b"],
 ['backtick-dollar-delete',"SELECT 1 AS `a$tag$`; DELETE FROM tx_assertions; SELECT 2 AS `$tag$b`"],
]as const)unsafe.push({origin:'boundary-unsafe',name,sql});
for(const c of unsafe){
 const calls:string[]=[];const mock:any={query:async(s:string)=>{calls.push(s);return s.includes('tx_meta')?[{position:'0'}]:[{v:'x'}]},close:async()=>{},submit:async()=>{throw Error('submit forbidden')}};
 const e=await Effect.runPromiseExit(makeXtdbNativeQueries(mock,DatabaseScope.test('cx-vx02-r4-mock')).selectSql(contract,{},()=>c.sql));
 const r:any={...c,guard:check(guard,c.sql),prior:check(prior,c.sql),exit:Exit.isSuccess(e)?'Success':String(e),defect:Exit.isFailure(e)&&Cause.hasDies(e.cause),answerDispatched:calls.some(s=>s.includes(c.sql))};
 r.pass=!r.guard.accepted&&Exit.isFailure(e)&&!r.defect&&!r.answerDispatched;write('unsafe',r);
}
report.endedAt=new Date().toISOString();writeFileSync(out,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({safe:report.safe.length,matches:report.safe.filter((x:any)=>x.match).length,unsafe:report.unsafe.length,refused:report.unsafe.filter((x:any)=>x.pass).length}));
if(report.unsafe.some((x:any)=>!x.pass)||report.safe.some((x:any)=>x.engineSupported&&!x.match&&x.origin!=='boundary-control'))process.exitCode=1;
