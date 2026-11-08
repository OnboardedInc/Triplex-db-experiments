// [CX-VX02-4] Why: test lexical disagreement using only a recording mock for unsafe inputs.
// Rejected: submitting mutation statements or known-hazard arrays to the shared engine.
import {writeFileSync} from 'node:fs';
import {Effect,Exit,Cause} from 'effect';
import {DatabaseScope} from './target/packages/core/dist/runtime/index.js';
import {TypeExpr} from './target/packages/core/dist/config/index.js';
import {makeXtdbNativeQueries} from './target/packages/xtdb/src/index.ts';
import {readOnlyNativeSql as guard} from './target/packages/xtdb/src/native/ReadOnlySql.ts';
const inputs=[
 ['backtick-nested-array',"SELECT 'x' AS v, 0 AS `a$tag$` WHERE 1 = ANY/**/(ARRAY[1,2]) AND EXISTS(SELECT 1 AS `$tag$b`)"],
 ['identifier-nested-array',"SELECT 'x' AS v, 0 AS a$tag$ WHERE 1 = ANY/**/(ARRAY[1,2]) AND EXISTS(SELECT 1 AS z$tag$b)"],
 ['backtick-mutation',"SELECT 1 AS `a$tag$`; DELETE FROM tx_assertions; SELECT 2 AS `$tag$b`"],
 ['identifier-mutation',"SELECT 1 AS a$tag$; DELETE FROM tx_assertions; SELECT 2 AS z$tag$b"],
];
const contract={name:'cx-vx02-r4/offline',parameters:TypeExpr.struct({}),row:TypeExpr.struct({v:TypeExpr.required(TypeExpr.text)})};
const report:any={at:new Date().toISOString(),controls:[]};
for(const [name,sql]of inputs){
 const calls:any[]=[];const client:any={query:async(query:string)=>{calls.push(query);return query.includes('tx_meta')?[{position:'0'}]:[{v:'x'}]},close:async()=>{},submit:async()=>{throw Error('submit forbidden')}};
 let accepted=true,error;try{guard(sql)}catch(e){accepted=false;error=String(e)}
 const exit=await Effect.runPromiseExit(makeXtdbNativeQueries(client,DatabaseScope.test('cx-vx02-r4-offline')).selectSql(contract,{},()=>sql));
 report.controls.push({name,sql,accepted,error,exit:String(exit),defect:Exit.isFailure(exit)&&Cause.hasDies(exit.cause),calls,answerDispatched:calls.some(x=>x.includes(sql))});
}
writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report,null,2));
