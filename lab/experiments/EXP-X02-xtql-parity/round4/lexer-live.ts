// [EXP-X02-R4] Why: compare every generated lexer/suffix case with XTDB and
// require typed pre-dispatch refusals via a recording provider for unsafe text.
// Rejected: sending mutations or known-hazard predicates to the resident.
import {writeFileSync,appendFileSync,readFileSync} from "node:fs";
import {Cause,Effect,Exit} from "effect";
import {lexicalQueryCorpus,lexicalUnsafeCorpus,lexicalRefusedCorpus} from "../../../../packages/xtdb/test/query-expression-corpus.ts";
import {DatabaseScope} from "../../../../packages/core/dist/runtime/index.js";
import {TypeExpr} from "../../../../packages/core/dist/config/index.js";
import {makeXtdbClient,makeXtdbNativeQueries} from "../../../../packages/xtdb/src/index.ts";
if(process.env.DOCKER_HOST!=="unix:///Users/sam/.colima/triplex2/docker.sock")throw Error("private endpoint required");
const out=process.argv[2];writeFileSync(out+".jsonl","",{flag:"wx"});
const inputs=JSON.parse(readFileSync(new URL("./reviewer-cases.json",import.meta.url),"utf8"));
const client=makeXtdbClient("postgres://xtdb:xtdb@127.0.0.1:5470/xtdb",{maxConnections:1});
const native=makeXtdbNativeQueries(client,DatabaseScope.test("r4-lexer"));
const contract={name:"r4/lexer",parameters:TypeExpr.struct({}),row:TypeExpr.struct({v:TypeExpr.required(TypeExpr.text)})};
const report:any={at:new Date().toISOString(),safe:[],unsafe:[],spot:[]};
const save=(kind:string,r:any)=>{report[kind].push(r);appendFileSync(out+".jsonl",JSON.stringify({kind,...r})+"\n");};
const safe=[...lexicalQueryCorpus().map(c=>({...c,origin:"generated"})),...inputs.safe.map(c=>({...c,origin:"reviewer"}))];
try {
 for(const [i,c] of safe.entries()){
  const e=await Effect.runPromiseExit(native.selectSql(contract,{},()=>c.sql,{timeoutMs:15000}));
  let rawRows:any,rawError:any;try{rawRows=await client.query(c.sql,[],undefined,{timeoutMs:15000,parameterSyntax:"postgresql"});}catch(error){rawError=String(error);}
  const rows=Exit.isSuccess(e)?e.value.rows:undefined;
  const pass=Exit.isSuccess(e)&&!rawError&&JSON.stringify(rows)===JSON.stringify(rawRows);
  save("safe",{...c,rows,rawRows,rawError,exit:String(e),pass});
  if((i+1)%100===0)console.log("safe progress",i+1,"/",safe.length);
 }
 // [EXP-X02-R4] Why: retain engine-invalid spot controls separately from supported queries.
 // Rejected: treating unsupported Unicode whitespace/keyword lookalikes as availability findings.
 for(const c of inputs.spot){
  const e=await Effect.runPromiseExit(native.selectSql(contract,{},()=>c.sql,{timeoutMs:15000}));
  let rawRows:any,rawError:any;try{rawRows=await client.query(c.sql,[],undefined,{timeoutMs:15000,parameterSyntax:"postgresql"});}catch(error){rawError=String(error);}
  const pass=rawError?Exit.isFailure(e)&&!Cause.hasDies(e.cause):Exit.isSuccess(e)&&JSON.stringify(e.value.rows)===JSON.stringify(rawRows);
  save("spot",{name:c.name,sql:c.sql,rawRows,rawError,exit:String(e),pass});
 }
}finally{await client.close();}
const unsafe=[
 ...lexicalUnsafeCorpus().map(sql=>({origin:"generated-unsafe",sql})),
 ...lexicalRefusedCorpus().map(sql=>({origin:"generated-refusal",sql})),
 ...inputs.unsafe.map(c=>({...c,origin:"reviewer-"+c.origin})),
 // Original query-shaped boundary follow-up, kept verbatim.
 ...["WITH a$tag$ AS (SELECT 1) SELECT 'x' AS v WHERE 1 = ANY/**/(ARRAY[1,2]) AND EXISTS(SELECT 1 AS z$tag$b)",
     "WITH `a$tag$` AS (SELECT 1) SELECT 'x' AS v WHERE 1 = ANY/**/(ARRAY[1,2]) AND EXISTS(SELECT 1 AS `$tag$b`)"].map(sql=>({origin:"reviewer-followup",sql})),
];
for(const c of unsafe){
 const calls:string[]=[];const mock:any={query:async(s:string)=>{calls.push(s);return s.includes("tx_meta")?[{position:"0"}]:[{v:"x"}]},close:async()=>{}};
 const e=await Effect.runPromiseExit(makeXtdbNativeQueries(mock,DatabaseScope.test("r4-preflight")).selectSql(contract,{},()=>c.sql));
 const answerDispatched=calls.some(s=>s.includes(c.sql));
 const pass=Exit.isFailure(e)&&!Cause.hasDies(e.cause)&&!answerDispatched;
 save("unsafe",{...c,exit:String(e),answerDispatched,pass});
}
writeFileSync(out,JSON.stringify(report,null,2)+"\n",{flag:"wx"});
const failures=[...report.safe,...report.unsafe,...report.spot].filter(r=>!r.pass);
console.log(JSON.stringify({safe:report.safe.length,unsafe:report.unsafe.length,spot:report.spot.length,failures:failures.length}));
if(failures.length)process.exitCode=1;
