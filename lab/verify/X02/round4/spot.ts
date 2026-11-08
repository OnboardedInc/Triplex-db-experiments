// [CX-VX02-4] Why: separate supported leaf/suffix forms from engine syntax errors before expanding the corpus.
// Rejected: executing mutation candidates directly or assuming Unicode maps to ASCII engine keywords.
import {writeFileSync} from 'node:fs';
import {Effect,Exit,Cause} from 'effect';
import {DatabaseScope} from './target/packages/core/dist/runtime/index.js';
import {TypeExpr} from './target/packages/core/dist/config/index.js';
import {makeXtdbClient,makeXtdbNativeQueries} from './target/packages/xtdb/src/index.ts';
import {readOnlyNativeSql as guard} from './target/packages/xtdb/src/native/ReadOnlySql.ts';
import {readOnlyNativeSql as prior} from './round3-ReadOnlySql.ts';
if(process.env.DOCKER_HOST!=='unix:///Users/sam/.colima/triplex2/docker.sock')throw Error('private endpoint');
const client=makeXtdbClient('postgres://xtdb:xtdb@127.0.0.1:5470/xtdb',{maxConnections:1});
const native=makeXtdbNativeQueries(client,DatabaseScope.test('cx-vx02-r4-spot'));
const contract={name:'cx-vx02-r4/spot',parameters:TypeExpr.struct({}),row:TypeExpr.struct({v:TypeExpr.required(TypeExpr.text)})};
const queries=[
 ['suffix-order','SELECT 1 AS k) ORDER BY 1'],
 ['suffix-limit','SELECT 1) LIMIT 1'],
 ['suffix-offset','SELECT 1) OFFSET 0 ROWS'],
 ['suffix-fetch','SELECT 1) FETCH FIRST 1 ROW ONLY'],
 ['group-set-suffix','SELECT 1 UNION ALL SELECT 2) ORDER BY 1 LIMIT 1'],
].map(([name,x])=>({name,sql:`SELECT 'x' AS v WHERE 1 = ANY ((${x})`}));
for(const [name,operand] of [
 ['backtick-open','SELECT 1 AS `(`'],['backtick-close','SELECT 1 AS `)`'],
 ['backtick-union','SELECT 1 AS `UNION`'],['backtick-safe','SELECT 1 AS `harmless`'],
 ['nested-comment','SELECT /* a /* b */ c */ 1'],
 ['unicode-string',"SELECT 1 WHERE 'Σ 雪 😀'='Σ 雪 😀'"],
 ['keyword-nonreserved','SELECT 1 AS union'],
] as const)queries.push({name,sql:`SELECT 'x' AS v WHERE 1 = ANY (${operand})`});
for(const [name,q] of [['long-s','ſOME'],['kelvin','ANK'],['mixed','aNy']] as const)queries.push({name,sql:`SELECT 'x' AS v WHERE 1 = ${q} (SELECT 1)`});
for(const [name,gap] of [['nbsp','\u00a0'],['vt','\v'],['ff','\f'],['bom','\ufeff'],['ls','\u2028'],['narrow','\u202f']] as const)queries.push({name,sql:`SELECT 'x' AS v WHERE 1 = ANY${gap}(SELECT 1)`});
const check=(f:any,s:string)=>{try{f(s);return{accepted:true}}catch(e){return{accepted:false,error:String(e)}}};
const report:any={at:new Date().toISOString(),controls:[]};
try{for(const q of queries){const r:any={...q,guard:check(guard,q.sql),prior:check(prior,q.sql)};
const e=await Effect.runPromiseExit(native.selectSql(contract,{},()=>q.sql,{timeoutMs:15000}));r.exit=String(e);r.defect=Exit.isFailure(e)&&Cause.hasDies(e.cause);if(Exit.isSuccess(e))r.rows=e.value.rows;
try{r.rawRows=await client.query(q.sql,[],undefined,{timeoutMs:15000,parameterSyntax:'postgresql'});}catch(e){r.rawError=String(e)}
report.controls.push(r);console.log(JSON.stringify(r));}}finally{await client.close()}
writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
