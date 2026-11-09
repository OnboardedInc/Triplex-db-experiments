// [EXP-K01-live3] Why: retain actual COUNT wire bytes before deleting either owned volume, even after the first gate failure. Rejected: adopting post-failure observations as a retry or a G0 PASS.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
const root=process.cwd(), mode=process.argv[2], out=process.argv[3];
const {bounded,fields}=await import(pathToFileURL(path.join(root,'lab/bench/lib/g0.ts')).href);
const {DatabaseScope}=await import(pathToFileURL(path.join(root,'packages/core/dist/runtime/index.js')).href);
const owner=JSON.parse(fs.readFileSync(process.env.TRIPLEX_LAB_SLOT_OWNER,'utf8'));
if(owner.holder!=='CX-K01-R12-live'||owner.container!=='tx2-xtdb-s1')throw Error('count capture ownership differs');
const postgres=createRequire(path.join(root,'packages/xtdb/package.json'))('postgres');
const sql=postgres(process.env.XTDB_URL,{max:1,prepare:false,connect_timeout:10,onnotice:()=>{}});
const result={diagnosticOnly:true,complete:false,mode,endpoint:process.env.XTDB_URL,holder:owner.holder,at:new Date().toISOString(),reads:[]};
const scope=mode==='probe'?'wire':DatabaseScope.test('ns-xtdb-dev500-seed-ns-v2-0604cd31');
const tables=mode==='probe'?['int_narrow','int_wide','float_narrow','float_wide','mixed_int','mixed_float'].map(x=>'tx_wire_'+x):Object.keys(fields);
const read=async(query,params)=>bounded(async signal=>{
 const pending=sql.unsafe(query,params).raw();
 // [EXP-K01-live3] Why: cancellation is best effort after a refusing deadline; it never converts failure to a successful observation. Rejected: swallowing the query error or substituting an empty count.
 const cancel=()=>{void Promise.resolve(pending.cancel()).catch(()=>{});};
 signal.addEventListener('abort',cancel,{once:true});
 try {const rows=await pending;signal.throwIfAborted();return {columns:rows.columns.map(c=>({name:c.name,oid:c.type})),rows:rows.map(r=>r.map(v=>v===null?null:Buffer.from(v).toString('hex')))};}finally{signal.removeEventListener('abort',cancel);}
},60000);
try{
 for(const table of tables){
  const query=`SELECT COUNT(*) AS n FROM ${table} FOR ALL VALID_TIME WHERE scope_key = $1`;
  const frame=await read(query,[scope]);
  if(frame.rows.length!==1||frame.rows[0].length!==1||frame.rows[0][0]===null)throw Error('incomplete COUNT frame');
  const text=Buffer.from(frame.rows[0][0],'hex').toString('utf8');
  if(!/^[0-9]+$/.test(text))throw Error('invalid COUNT text');
  result.reads.push({table,query,scope,frame,countText:text});
  fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n');
 }
 if(mode==='seed'){
  result.journalGroups=await read('SELECT entity_type, COUNT(*) AS n FROM tx_assertions FOR ALL VALID_TIME WHERE scope_key = $1 GROUP BY entity_type ORDER BY entity_type',[scope]);
  result.scopePositions=await read('SELECT scope_key,position FROM tx_meta FOR ALL VALID_TIME ORDER BY scope_key',[]);
 }
 result.complete=true;
}catch(error){result.error=String(error.stack||error);process.exitCode=1;}
finally{fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n');await bounded(()=>sql.end({timeout:5}),30000);}
