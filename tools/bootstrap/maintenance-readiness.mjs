// @ts-nocheck -- [EXP-CHECKJS-R2] generated/optional runtime modules unavailable in standalone source checking; runtime-populated records, option bags, or branch-specific union members; dynamic collections, runtime Buffer-to-JSON coercion, or validated values without static narrowing. Binding errors remain checked by lab/bin/checkjs.mjs.
/** Clean-storage maintenance readiness, never a durability/scale qualification.
 * Mechanism: compare native committed-position/claim/history cardinalities at
 * the same quiescent source before and after an in-place APFS image compact.
 * Inspiration: retained restore-qlever.py read-OOM audit; this additionally
 * covers XTDB and the temporary PostgreSQL regression auxiliary. Data-file
 * hashes are checked separately before engines restart; no result is replayed.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const root=path.resolve(import.meta.dirname,'../..');
const args=process.argv.slice(2);
const option=(key)=>args[args.indexOf(key)+1];
const output=option('--output');
assert(output&&path.resolve(output).startsWith(root+path.sep));
const mode=option('--mode');
assert(['before','after'].includes(mode));
const wrapper=path.join(root,'tools/bootstrap/with-env.sh');
const state=JSON.parse(await readFile(path.join(root,'.devloop/state.json'),'utf8'));
// Protocol object key order is not semantic; keep array order from native ORDER BY.
const normalize=(x)=>typeof x==='bigint'?x.toString():Array.isArray(x)?x.map(normalize):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(key=>[key,normalize(x[key])])):x;
const digest=(x)=>createHash('sha256').update(JSON.stringify(normalize(x))).digest('hex');
const qtoken=(await readFile(path.join(root,'.runtime/engines/qlever-main/access-token'),'utf8')).trim();
async function qlever(){
  const statements=[
    'SELECT ?graph ?position WHERE { GRAPH ?graph { <urn:triplex:meta> <urn:triplex:field:position> ?position } } ORDER BY ?graph',
    'SELECT ?graph (COUNT(?claim) AS ?count) WHERE { GRAPH ?graph { ?claim <urn:triplex:field:command_id> ?command } } GROUP BY ?graph ORDER BY ?graph',
    'SELECT ?graph (COUNT(?assertion) AS ?count) WHERE { GRAPH ?graph { ?assertion <urn:triplex:field:attribute> ?attribute } } GROUP BY ?graph ORDER BY ?graph',
    'SELECT ?graph (COUNT(?assertion) AS ?count) WHERE { GRAPH ?graph { ?assertion <urn:triplex:field:attribute> ?attribute ; <urn:triplex:field:retracted_position> ?retired } } GROUP BY ?graph ORDER BY ?graph',
  ];
  const results=[];
  for(const query of statements){
    const response=await fetch('http://127.0.0.1:17019',{method:'POST',headers:{Authorization:`Bearer ${qtoken}`,'Content-Type':'application/sparql-query',Accept:'application/sparql-results+json'},body:query,signal:AbortSignal.timeout(15000)});
    assert(response.ok,`Q readiness HTTP ${response.status}`);
    const text=await response.text();assert(text.length<4*1024**2);
    const rows=JSON.parse(text).results.bindings;assert(rows.length<=10000);
    results.push({query,rows});
  }
  return results;
}
async function xtdb(){
  const require=createRequire(path.join(root,'packages/xtdb/package.json'));
  const postgres=require('postgres');
  const sql=postgres('postgresql://xtdb:xtdb@127.0.0.1:15442/xtdb',{max:1,prepare:false,connect_timeout:5,onnotice:()=>{}});
  const statements=[
    'SELECT scope_key, position FROM tx_meta FOR ALL VALID_TIME ORDER BY scope_key',
    'SELECT scope_key, COUNT(*) AS count FROM tx_claims FOR ALL VALID_TIME GROUP BY scope_key ORDER BY scope_key',
    'SELECT scope_key, COUNT(*) AS count FROM tx_assertions FOR ALL VALID_TIME GROUP BY scope_key ORDER BY scope_key',
    'SELECT scope_key, COUNT(*) AS count FROM tx_assertions FOR ALL VALID_TIME WHERE retracted_position IS NOT NULL GROUP BY scope_key ORDER BY scope_key',
  ];
  try{
    const results=[];
    for(const query of statements){const rows=normalize(await sql.unsafe(query));assert(rows.length<=10000);results.push({query,rows});}
    return results;
  }finally{await sql.end({timeout:1});}
}
function inspect(owner){
  const raw=JSON.parse(execFileSync(wrapper,['docker','inspect',owner.containerId],{encoding:'utf8',maxBuffer:1024**2}))[0];
  assert.equal(raw.Id,owner.containerId);assert.equal(raw.Image,owner.imageSha256);assert(raw.State.Running);
  return {containerId:raw.Id,imageSha256:raw.Image,after:raw.State};
}
const ownerId=mode==='after'?option('--owner'):undefined;
if(mode==='after')assert(['foundation-qlever','foundation-xtdb','aux-postgres-compiler-tests'].includes(ownerId));
let report;
if(mode==='before'){
  report={format:'triplex-clean-maintenance-native-basis/1',at:new Date().toISOString(),qlever:await qlever(),xtdb:await xtdb()};
  report.basisSha256={qlever:digest(report.qlever),xtdb:digest(report.xtdb)};
}else{
  const baselinePath=option('--baseline');assert(path.resolve(baselinePath).startsWith(root+path.sep));
  const baseline=JSON.parse(await readFile(baselinePath,'utf8'));
  const owner=state.owners[ownerId];assert(owner&&owner.status==='unknown');
  let observation;
  if(ownerId==='foundation-qlever')observation=await qlever();
  else if(ownerId==='foundation-xtdb')observation=await xtdb();
  else{
    const text=execFileSync(wrapper,['docker','exec',owner.containerId,'sh','-c','PGPASSWORD=$(cat /run/triplex/postgres-password) psql -h 127.0.0.1 -U triplex -d triplex -At -c "SELECT 1"'],{encoding:'utf8',maxBuffer:1024**2});
    assert.equal(text.trim(),'1');observation={authenticatedScalar:1};
  }
  if(ownerId!=='aux-postgres-compiler-tests')assert.equal(digest(observation),digest(baseline[ownerId==='foundation-qlever'?'qlever':'xtdb']));
  report={format:'triplex-clean-maintenance-readiness/1',at:new Date().toISOString(),...inspect(owner),baseline:path.relative(root,baselinePath),observation,status:'PASS_CLEAN_MAINTENANCE_READINESS_ONLY',limitations:['Native positions/claims/assertion/retraction cardinalities match; this is not a write-crash or power-loss proof.','Offline authoritative-byte hashes are retained in the separate same-image compact receipt.']};
}
await writeFile(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
if(mode==='after')await writeFile(path.join(path.dirname(output),'status.json'),JSON.stringify({readiness:true,basisMatched:true,ownerId},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,mode,ownerId,status:report.status??'CAPTURED'}));
