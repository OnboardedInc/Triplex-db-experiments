// [CX-VX02-2] Why: vary SQL token boundaries and nested quantified predicates on the shared engine.
// Rejected: lexer-only success as evidence for engine semantics; retain raw bypass controls separately.
import { writeFileSync, appendFileSync } from 'node:fs';
import { Cause, Effect, Exit } from 'effect';
import { DatabaseScope } from './target/packages/core/dist/runtime/index.js';
import { TypeExpr } from './target/packages/core/dist/config/index.js';
import { makeXtdbClient, makeXtdbNativeQueries } from './target/packages/xtdb/src/index.ts';
import { readOnlyNativeSql } from './target/packages/xtdb/src/native/ReadOnlySql.ts';
if(process.env.DOCKER_HOST!=='unix:///Users/sam/.colima/triplex2/docker.sock')throw Error('private endpoint required');
const out=process.argv[2];const report:any={at:new Date().toISOString(),controls:[]};
writeFileSync(out+'.jsonl',JSON.stringify({at:report.at})+'\n',{flag:'wx'});
const client=makeXtdbClient('postgres://xtdb:xtdb@127.0.0.1:5470/xtdb',{maxConnections:1});
const native=makeXtdbNativeQueries(client,DatabaseScope.test('cx-vx02-r2-token-variations'));
const contract={name:'cx-vx02-r2/tokens',parameters:TypeExpr.struct({}),row:TypeExpr.struct({v:TypeExpr.required(TypeExpr.text)})};
const queries:any[]=[];
const select=(where:string)=>`SELECT 'x' AS v FROM (VALUES (1)) t (k) WHERE ${where}`;
for(const quantifier of ['ANY','SOME','ALL'])for(const gap of [' /*before*/ ','\t\n',' --line\r\n'])
 queries.push({name:`array-${quantifier}-${JSON.stringify(gap)}`,sql:select(`k <>${gap}${quantifier}${gap}( /*operand*/ ARRAY[2])`),expected:'typed-refusal'});
queries.push(
 {name:'parenthesized-any-operand',sql:select('k = (ANY/**/(ARRAY[1,2]))'),expected:'typed-refusal',raw:true},
 {name:'parenthesized-some-operand',sql:select('k = ((SOME ARRAY[1,2]))'),expected:'typed-refusal',raw:true},
 {name:'nested-unsafe-inner',sql:select('k = ANY (SELECT j FROM (VALUES (1)) u(j) WHERE j = SOME /*inner*/ ARRAY[1,2])'),expected:'typed-refusal'},
 {name:'nested-unsafe-outer',sql:select('(k = ANY /*outer*/ (ARRAY[1,2])) OR EXISTS(SELECT 1 WHERE 1 = ALL /*inner*/ (ARRAY[1]))'),expected:'typed-refusal'},
 {name:'nested-supported',sql:select('k = ANY /*outer*/ (SELECT j FROM (VALUES (1)) u(j) WHERE j = ALL /*inner*/ (VALUES (1)))'),expected:'x'},
 {name:'subquery-comments',sql:select('k = ANY /*a*/ ( /*b*/ SELECT 1)'),expected:'x'},
 {name:'subquery-parens',sql:select('k = ANY ((SELECT 1))'),expected:'x',raw:true},
 {name:'subquery-with',sql:select('k = ANY (WITH q AS (SELECT 1 AS j) SELECT j FROM q)'),expected:'x'},
 {name:'select-all',sql:'SELECT ALL \'x\' AS v',expected:'x'},
 {name:'union-all',sql:"SELECT 'x' AS v UNION ALL SELECT 'y' AS v",expected:'xy'},
 {name:'aggregate-all',sql:"SELECT CAST(COUNT(ALL k) AS TEXT) AS v FROM (VALUES(1))t(k)",expected:'1'},
 {name:'quoted-words',sql:"SELECT 'k = ANY/**/ ARRAY[1]' AS v",expected:'k = ANY/**/ ARRAY[1]'},
 {name:'operator-string-before-all',sql:"SELECT '=' AS \"ALL\"",expected:'other-shape',lexicalOnly:true},
);
try{for(const q of queries){
 const start=performance.now();let accepted=true,envelopeError:any;try{readOnlyNativeSql(q.sql);}catch(e){accepted=false;envelopeError=String(e);}
 const record:any={...q,accepted,envelopeError};
 if(!q.lexicalOnly){
 const run=()=>native.selectSql(contract,{},()=>q.sql,{timeoutMs:15000});
 const exit=await Effect.runPromiseExit(run()); record.exit=String(exit);
 if(Exit.isSuccess(exit))record.rows=exit.value.rows;else{record.isDefect=Cause.hasDies(exit.cause); record.error=String(exit.cause);}
 record.pass=q.expected==='typed-refusal'?Exit.isFailure(exit)&&!Cause.hasDies(exit.cause)&&String(exit.cause).includes('non-subquery operand'):Exit.isSuccess(exit)&&JSON.stringify(exit.value.rows.map((r:any)=>r.v).sort())===JSON.stringify(q.expected==='xy'?['x','y']:[q.expected]);
 if(q.raw){try{record.rawRows=await client.query(q.sql,[],undefined,{timeoutMs:15000,parameterSyntax:'postgresql'});}catch(e){record.rawError=String(e);}}
 }else record.pass=accepted;
 record.elapsedMs=Math.round(performance.now()-start);report.controls.push(record);appendFileSync(out+'.jsonl',JSON.stringify(record)+'\n');console.log(record.pass?'PASS':'FAIL',q.name,JSON.stringify(record));
}}finally{await client.close();}
writeFileSync(out,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
