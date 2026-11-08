// [CX-VX02-4] Why: prove identifier syntax through the real provider with an exact row contract, then test unsafe variants on a mock.
// Rejected: treating extra-column schema failures as grammar findings or running mutation/array hazards on the resident.
import {writeFileSync}from'node:fs';import{Effect,Exit,Cause}from'effect';
import{DatabaseScope}from'./target/packages/core/dist/runtime/index.js';import{TypeExpr}from'./target/packages/core/dist/config/index.js';
import{makeXtdbClient,makeXtdbNativeQueries}from'./target/packages/xtdb/src/index.ts';
import{readOnlyNativeSql as guard}from'./target/packages/xtdb/src/native/ReadOnlySql.ts';
if(process.env.DOCKER_HOST!=='unix:///Users/sam/.colima/triplex2/docker.sock')throw Error('private endpoint');
const contract={name:'cx-vx02-r4/boundary-confirm',parameters:TypeExpr.struct({}),row:TypeExpr.struct({v:TypeExpr.required(TypeExpr.text)})};
const client=makeXtdbClient('postgres://xtdb:xtdb@127.0.0.1:5470/xtdb',{maxConnections:1});
const native=makeXtdbNativeQueries(client,DatabaseScope.test('cx-vx02-r4-boundary-confirm'));
const report:any={at:new Date().toISOString(),safe:[],unsafe:[]};
try{for(const [name,left,right]of [['regular','a$tag$','z$tag$b'],['backtick','`a$tag$`','`$tag$b`']]){
 const safe=`WITH ${left} AS (SELECT 1) SELECT 'x' AS v WHERE 1 = ANY/**/(SELECT 1) AND EXISTS(SELECT 1 AS ${right})`;
 const e=await Effect.runPromiseExit(native.selectSql(contract,{},()=>safe,{timeoutMs:15000}));
 const raw=await client.query(safe,[],undefined,{timeoutMs:15000,parameterSyntax:'postgresql'});
 report.safe.push({name,sql:safe,exit:String(e),rawRows:raw,pass:Exit.isSuccess(e)&&JSON.stringify(e.value.rows)===JSON.stringify(raw)});
 const unsafe=safe.replace('ANY/**/(SELECT 1)','ANY/**/(ARRAY[1,2])');
 const calls:string[]=[];const mock:any={query:async(s:string)=>{calls.push(s);return s.includes('tx_meta')?[{position:'0'}]:[{v:'x'}]},close:async()=>{},submit:async()=>{throw Error('submit forbidden')}};
 let accepted=true,error;try{guard(unsafe)}catch(e){accepted=false;error=String(e)}
 const m=await Effect.runPromiseExit(makeXtdbNativeQueries(mock,DatabaseScope.test('cx-vx02-r4-confirm-mock')).selectSql(contract,{},()=>unsafe));
 report.unsafe.push({name,sql:unsafe,accepted,error,exit:String(m),defect:Exit.isFailure(m)&&Cause.hasDies(m.cause),answerDispatched:calls.some(s=>s.includes(unsafe))});
}}finally{await client.close()}
writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report,null,2));
if(report.safe.some((x:any)=>!x.pass))process.exitCode=1;
