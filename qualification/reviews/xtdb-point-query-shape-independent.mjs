// @ts-nocheck -- [EXP-CHECKJS] runtime coercion (Buffer JSON), dynamic collections, or validated inputs without static narrowing. Binding errors remain checked by lab/bin/checkjs.mjs.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile,writeFile } from 'node:fs/promises';
import { resolve,relative } from 'node:path';
import { openContext } from '../devloop/state.mjs';
import { verifyAttempt } from '../devloop/evidence.mjs';

// Inspect actual retained wire text/binds, independently of a plan-cache claim.
// Inspiration: pinned native Sources/NativeQueries and the load raw trace contract.
const root=resolve(import.meta.dirname,'../..'),reference=process.argv[2],output=process.argv[3];
assert(reference&&output&&resolve(root,output).startsWith(root+'/qualification/reviews/'));
const [job,attempt]=reference.split('/');await verifyAttempt(await openContext(root),job,attempt);
const directory=resolve(root,'.devloop/jobs',job,'attempts',attempt),snapshot=JSON.parse(await readFile(resolve(directory,'inputs.json'),'utf8'));
assert.equal(snapshot.queryPath,'xtdb-native');
const canonical=value=>JSON.stringify(value,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.keys(item).sort().map(key=>[key,item[key]])):item);
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const bytes=await readFile(resolve(directory,'artifacts/queries.jsonl')),queries=bytes.toString().trim().split('\n').filter(Boolean).map(JSON.parse),events=(await readFile(resolve(directory,'artifacts/events.jsonl'),'utf8')).trim().split('\n').map(JSON.parse),reads=events.filter(event=>event.type==='read'&&event.ok===true);
const shapes=[];
for(const query of queries){
  assert.equal(query.queryKey,hash(canonical({language:query.language,query:query.query,mappingId:query.mappingId,contractId:query.contractId})));
  const uses=reads.filter(event=>event.queryKey===query.queryKey),tasks=[...new Set(uses.map(event=>event.taskClass))];assert.equal(tasks.length,1);
  const historical=tasks[0]==='point-history',entityIndex=historical?4:3;
  const scopes=new Set(),positions=new Set(),entities=new Set();
  for(const event of uses){const params=event.nativeParameters;assert.equal(params.length,historical?6:5);assert.equal(params[0],event.basis.scope);assert.equal(String(params[1]),event.knownPosition);assert.equal(params[historical?3:2],event.basis.validAt);if(historical)assert.equal(params[2],event.basis.recordedAt);assert.equal(hash(canonical({entity:params[entityIndex]})),event.paramsSha256);assert.equal(params[entityIndex+1],':load/name');assert(!query.query.includes(params[0])&&!query.query.includes(params[entityIndex]),'Scope/target must remain bound values');scopes.add(params[0]);positions.add(params[1]);entities.add(params[entityIndex]);}
  shapes.push({queryKey:query.queryKey,textSha256:hash(query.query),language:query.language,taskClass:tasks[0],calls:uses.length,parameterCount:historical?6:5,distinctScopes:scopes.size,positions:[...positions],distinctTargetEntities:entities.size,scopePositionValidRecordedEntityAttributeAreBinds:true});
}
assert.equal(shapes.reduce((sum,shape)=>sum+shape.calls,0),reads.length);
const source=[];
for(const path of ['packages/xtdb/src/native/Sources.ts','packages/xtdb/src/native/NativeQueries.ts','packages/xtdb/src/XtdbClient.ts']){const pin=snapshot.pins.find(pin=>pin.path===path);assert(pin);const current=hash(await readFile(resolve(root,path)));assert.equal(current,pin.sha256);source.push({path,asRunSha256:pin.sha256,currentMatches:true});}
const receipt={format:'triplex-independent-native-query-shape/1',at:new Date().toISOString(),reviewer:'duckdb-independent-verifier',reference,rawQueries:{path:relative(root,resolve(directory,'artifacts/queries.jsonl')),sha256:hash(bytes)},successfulReads:reads.length,shapes,source,clientPrepare:false,conclusion:'Actual point-load query text is stable per current/history shape; scope, target and temporal values travel as bound parameters. Text churn per entity/cut is not observed.',limits:['prepare:false disables the configured named prepared-statement path; server-side logical/physical plan reuse is not measured','Stable text does not rule out per-request parsing/planning','No compilation, index, engine scheduling or transport phase timing attribution is inferred']};
await writeFile(resolve(root,output),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({output,reads:reads.length,shapes}));
