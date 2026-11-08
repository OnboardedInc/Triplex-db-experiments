// [CX-VX02-3] Why: isolate a supported compound query from engine-invalid WITH and old modifier restrictions.
// Rejected: declaring the exploratory batch's expectation mismatches to be fifteen product defects.
import { writeFileSync } from 'node:fs';
import { Cause, Effect, Exit } from 'effect';
import { readOnlyNativeSql as baseline } from './baseline-ReadOnlySql.ts';
import { readOnlyNativeSql as round2 } from './round2-ReadOnlySql.ts';
import { readOnlyNativeSql as target } from './target/packages/xtdb/src/native/ReadOnlySql.ts';
import { DatabaseScope } from './target/packages/core/dist/runtime/index.js';
import { TypeExpr } from './target/packages/core/dist/config/index.js';
import { makeXtdbClient, makeXtdbNativeQueries } from './target/packages/xtdb/src/index.ts';
if(process.env.DOCKER_HOST!=='unix:///Users/sam/.colima/triplex2/docker.sock')throw Error('private endpoint required');
const client=makeXtdbClient('postgres://xtdb:xtdb@127.0.0.1:5470/xtdb',{maxConnections:1});
const native=makeXtdbNativeQueries(client,DatabaseScope.test('cx-vx02-r3-union'));
const contract={name:'cx-vx02-r3/union',parameters:TypeExpr.struct({}),row:TypeExpr.struct({v:TypeExpr.required(TypeExpr.text)})};
const report:any={at:new Date().toISOString(),baseline:'bf1ad4d',round2:'6cd68dc',target:'200d669',controls:[]};
const check=(f:any,sql:string)=>{try{f(sql);return{accepted:true}}catch(error){return{accepted:false,error:String(error)}}};
try{for(const q of ['ANY','SOME','ALL'])for(const gap of ['/**/',' /* subquery */ ']){
 const sql=`SELECT 'x' AS v WHERE 1 = ${q}${gap}((SELECT 1) UNION ALL SELECT 2)`;
 const r:any={q,gap,sql,baseline:check(baseline,sql),round2:check(round2,sql),target:check(target,sql)};
 const e=await Effect.runPromiseExit(native.selectSql(contract,{},()=>sql,{timeoutMs:15000}));
 r.exit=String(e);r.defect=Exit.isFailure(e)&&Cause.hasDies(e.cause);
 if(Exit.isSuccess(e))r.rows=e.value.rows;
 try{r.rawRows=await client.query(sql,[],undefined,{timeoutMs:15000,parameterSyntax:'postgresql'});}catch(error){r.rawError=String(error);}
 r.expectedRawRows=q==='ALL'?[]:[{v:'x'}];
 r.confirmedRegression=r.baseline.accepted&&!r.target.accepted&&Exit.isFailure(e)&&!r.defect&&JSON.stringify(r.rawRows)===JSON.stringify(r.expectedRawRows);
 report.controls.push(r);console.log(JSON.stringify(r));
}}finally{await client.close();}
writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
if(!report.controls.every((r:any)=>r.confirmedRegression))process.exitCode=1;
