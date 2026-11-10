// [DX-S4] Why: verify every native _row against the independent canonical input after indexing. Rejected: accepting index-builder exit or a triple count as payload equivalence.
import fs from 'node:fs';import readline from 'node:readline';import crypto from 'node:crypto';
const fields=JSON.parse(fs.readFileSync('/input/summary.json')).fields,numeric=new Set(['value_number','value_boolean','value_datetime','recorded_at','recorded_position','valid_from','valid_to','schema_version']);
const expected=new Map();for await(const l of readline.createInterface({input:fs.createReadStream('/input/rows.jsonl')})){const r=JSON.parse(l);expected.set(r[1],r)}
if(expected.size!==442410)throw Error('canonical cardinality');let count=0;
for(let offset=0;;offset+=10000){
 const query=`SELECT ?raw WHERE { GRAPH <urn:triplex:scope:c3RvcmFnZS1zcGlrZQ> { ?s <urn:triplex:field:_row> ?raw } } ORDER BY ?s LIMIT 10000 OFFSET ${offset}`;
 const res=await fetch(`http://${process.env.S4_PREFIX}-qlever:7019/`,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded','accept':'application/sparql-results+json'},body:new URLSearchParams({query,action:'sparql_json_export'})});
 if(!res.ok)throw Error(`SPARQL ${res.status}: ${await res.text()}`);const data=await res.json(),bindings=data.results.bindings;
 for(const b of bindings){
  const row=JSON.parse(b.raw.value),want=expected.get(row.id);if(!want)throw Error('extra/duplicate assertion');
  const actual=fields.map((k,i)=>i===0?String(Number(row[k])).padStart(16,'0'):row[k]===null?null:numeric.has(k)?Number(row[k]):row[k]);
  if(actual.some((v,i)=>!Object.is(v,want[i])))throw Error(`native RDF payload ${row.id}`);
  expected.delete(row.id);count++;
 }
 console.log(JSON.stringify({event:'readback-progress',count}));if(bindings.length<10000)break;
}
if(count!==442410||expected.size)throw Error('missing assertions');
console.log(JSON.stringify({event:'content-match',layout:'qlever-a0',rows:count,inputSha256:crypto.createHash('sha256').update(fs.readFileSync('/input/rows.jsonl')).digest('hex')}));
