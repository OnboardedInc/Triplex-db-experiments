// [CX-VX02-2] Why: distinguish a conservative pre-existing refusal from newly lost supported queries.
// Rejected: calling every engine syntax error a guard failure or inferring semantics from the lexer.
import { writeFileSync } from 'node:fs';
import { Cause, Effect, Exit } from 'effect';
import { readOnlyNativeSql as baseline } from './baseline-ReadOnlySql.ts';
import { readOnlyNativeSql as target } from './target/packages/xtdb/src/native/ReadOnlySql.ts';
import { DatabaseScope } from './target/packages/core/dist/runtime/index.js';
import { TypeExpr } from './target/packages/core/dist/config/index.js';
import { makeXtdbClient, makeXtdbNativeQueries } from './target/packages/xtdb/src/index.ts';
if(process.env.DOCKER_HOST!=='unix:///Users/sam/.colima/triplex2/docker.sock')throw Error('private endpoint required');
const client=makeXtdbClient('postgres://xtdb:xtdb@127.0.0.1:5470/xtdb',{maxConnections:1});
const native=makeXtdbNativeQueries(client,DatabaseScope.test('cx-vx02-r2-subqueries'));
const contract={name:'cx-vx02-r2/subqueries',parameters:TypeExpr.struct({}),row:TypeExpr.struct({v:TypeExpr.required(TypeExpr.text)})};
const report:any={at:new Date().toISOString(),baseline:'bf1ad4d',target:'200d669',controls:[]};
try{for(const quantifier of ['ANY','SOME','ALL'])for(const gap of ['/**/',' /* subquery */ ']){
 const sql=`SELECT 'x' AS v WHERE 1 = ${quantifier}${gap}((SELECT 1))`;
 const check=(fn:any)=>{try{fn(sql);return{accepted:true}}catch(error){return{accepted:false,error:String(error)}}};
 const old=check(baseline),now=check(target);
 const record:any={quantifier,gap,sql,baseline:old,target:now};
 const exit=await Effect.runPromiseExit(native.selectSql(contract,{},()=>sql,{timeoutMs:15000}));
 record.publicExit=String(exit);record.isDefect=Exit.isFailure(exit)&&Cause.hasDies(exit.cause);
 try{record.rawRows=await client.query(sql,[],undefined,{timeoutMs:15000,parameterSyntax:'postgresql'});}catch(error){record.rawError=String(error);}
 record.confirmedRegression=old.accepted&&!now.accepted&&JSON.stringify(record.rawRows)===JSON.stringify([{v:'x'}])&&Exit.isFailure(exit)&&!record.isDefect;
 report.controls.push(record);console.log(JSON.stringify(record));
}}finally{await client.close();}
writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
