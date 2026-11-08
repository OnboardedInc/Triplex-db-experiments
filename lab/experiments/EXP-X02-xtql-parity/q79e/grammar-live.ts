// [EXP-X02-Q79e] Why: use XTDB's answer for every generated query, including empty ALL results.
// Rejected: equating envelope acceptance or wrapper exit zero with SQL semantics.
import { writeFileSync, appendFileSync } from "node:fs";
import assert from "node:assert/strict";
import { Cause, Effect, Exit } from "effect";
import { queryExpressionCorpus } from "../../../../packages/xtdb/test/query-expression-corpus.ts";
import { DatabaseScope } from "../../../../packages/core/dist/runtime/index.js";
import { TypeExpr } from "../../../../packages/core/dist/config/index.js";
import { makeXtdbClient, makeXtdbNativeQueries } from "../../../../packages/xtdb/src/index.ts";
if(process.env.DOCKER_HOST!=="unix:///Users/sam/.colima/triplex2/docker.sock")throw Error("private endpoint required");
const out=process.argv[2];
writeFileSync(out+".jsonl","",{flag:"wx"});
const client=makeXtdbClient("postgres://xtdb:xtdb@127.0.0.1:5470/xtdb",{maxConnections:1});
const native=makeXtdbNativeQueries(client,DatabaseScope.test("q79e-grammar"));
const contract={name:"q79e/grammar",parameters:TypeExpr.struct({}),row:TypeExpr.struct({v:TypeExpr.required(TypeExpr.text)})};
const report:any={at:new Date().toISOString(),controls:[],unsafe:[],reviewer:[]};
const run=async(sql:string,metadata:any)=>{
 const exit=await Effect.runPromiseExit(native.selectSql(contract,{},()=>sql,{timeoutMs:15000}));
 let rawRows:any,rawError:any;try{rawRows=await client.query(sql,[],undefined,{timeoutMs:15000,parameterSyntax:"postgresql"});}catch(e){rawError=String(e);}
 const rows=Exit.isSuccess(exit)?exit.value.rows:undefined;
 const pass=Exit.isSuccess(exit)&&!rawError&&JSON.stringify(rows)===JSON.stringify(rawRows);
 const r={...metadata,sql,rows,rawRows,rawError,exit:String(exit),pass};
 appendFileSync(out+".jsonl",JSON.stringify(r)+"\n");return r;
};
try {
 for(const entry of queryExpressionCorpus()){
  report.controls.push(await run(entry.sql,entry));
  // [EXP-X02-Q79e] Why: put an unsafe comparison in a new set arm of every grammar form.
  // Rejected: executing known hazardous array predicates directly on the shared engine.
  const sql=entry.sql.slice(0,-1)+" UNION SELECT 1 WHERE 1 = SOME/**/ ARRAY[1,2])";
  const e=await Effect.runPromiseExit(native.selectSql(contract,{},()=>sql,{timeoutMs:15000}));
  const pass=Exit.isFailure(e)&&!Cause.hasDies(e.cause)&&String(e.cause).includes("non-subquery operand");
  const r={formIndex:entry.formIndex,depth:entry.depth,comments:entry.comments,quantifier:entry.quantifier,sql,exit:String(e),pass};
  report.unsafe.push(r);appendFileSync(out+".jsonl",JSON.stringify(r)+"\n");
  if(report.controls.length%100===0) console.log("completed",report.controls.length,"safe and unsafe controls");
 }
 for(const q of ["ANY","SOME","ALL"])for(const gap of ["/**/"," /* subquery */ "]){
  const r=await run(`SELECT 'x' AS v WHERE 1 = ${q}${gap}((SELECT 1) UNION ALL SELECT 2)`,{q,gap});
  assert.deepEqual(r.rawRows,q==="ALL"?[]:[{v:"x"}]);report.reviewer.push(r);
 }
} finally {await client.close();}
writeFileSync(out,JSON.stringify(report,null,2)+"\n",{flag:"wx"});
console.log(JSON.stringify({safe:report.controls.length,unsafe:report.unsafe.length,reviewer:report.reviewer.length,failures:[...report.controls,...report.unsafe,...report.reviewer].filter(r=>!r.pass).length}));
if([...report.controls,...report.unsafe,...report.reviewer].some(r=>!r.pass))process.exitCode=1;
