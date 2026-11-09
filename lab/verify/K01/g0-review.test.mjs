// [EXP-K01-VK01-R6] Why: exercise actual G0 content changes and publication sequencing independently of source-pattern assertions. Rejected: reviving deleted process gates or treating mocked engine activity as live qualification.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { test, after } from 'node:test';
import { admitG0, readG0, fields } from '../../bench/lib/g0.ts';
const root = path.resolve(import.meta.dirname, '../../..');
const out = path.resolve(process.env.TX2_K01_REVIEW_OUT ?? path.join(import.meta.dirname, 'evidence/review-round7/reviewer'));
const scratch = path.join(import.meta.dirname, 'tmp/g0-review-round8');
fs.mkdirSync(scratch, { recursive: true });
const observations = [];
const expected = { scope: 'fixture-seed', position: 2, world: 'N01', counts: { tx_assertions: 2, tx_claims: 2, tx_attempts: 2, tx_meta: 1 } };
function fixture() {
  const tables = {
    tx_assertions: [0,1].map(i => ({ entity_id:'subject-'+i, attribute:'memberKey', value_type:'string', value_string:'key-'+i, value_number:null, value_boolean:null, value_datetime:null, value_json:null, valid_from:100, valid_to:null, recorded_position:i+1, retracted_position:null, entity_type:'member', schema_version:1, value_identity:JSON.stringify({type:'string',value:'key-'+i}), id:'random-'+i, recorded_at:1000+i })),
    tx_claims: [{ command_id:'seed-1', position:1 },{ command_id:'seed-2', position:2 }],
    tx_attempts: [{ position:1 },{ position:2 }], tx_meta:[{ scope_key:expected.scope, position:2 }],
  };
  // [EXP-K01-R8] Why: the old fixture omitted stored metadata and auxiliary tables. Rejected: testing the new full schema with incomplete pin inputs.
  for(const [table,cols] of Object.entries(fields)){
    tables[table] ??= [];
    for(const row of tables[table])for(const col of cols)if(!Object.hasOwn(row,col))row[col]=null;
  }
  const calls = [];
  const reader = { endpoint:'measured-fixture-endpoint', async scopes(signal) { calls.push(['scopes',signal.aborted]); return tables.tx_meta; }, async count(table,scope,signal) { calls.push(['count',table,scope,signal.aborted]); return tables[table].length; }, async *scan(table,scope,signal) { calls.push(['scan',table,scope,signal.aborted]); yield* tables[table]; } };
  return { tables, reader, calls };
}
after(() => { fs.mkdirSync(out, { recursive: true }); fs.writeFileSync(path.join(out,'g0-review-cases.json'),JSON.stringify(observations,null,2)+'\n'); fs.rmSync(scratch,{recursive:true,force:true}); });
for (const variant of ['row','retraction','valid-time','count','claim','attempt-position','duplicate-substitution','missing-column','value-identity']) test(`independent changed clone refuses: ${variant}`, async () => {
  const f=fixture(), pin=await readG0(f.reader,expected), before=structuredClone(f.tables);
  if(variant==='row')f.tables.tx_assertions[0].value_string='different';
  if(variant==='retraction')f.tables.tx_assertions[0].retracted_position=2;
  if(variant==='valid-time')f.tables.tx_assertions[0].valid_to=150;
  if(variant==='count')f.tables.tx_assertions.pop();
  if(variant==='claim')f.tables.tx_claims[0].command_id='other-command';
  if(variant==='attempt-position')f.tables.tx_attempts[0].position=2;
  if(variant==='duplicate-substitution')f.tables.tx_assertions[1]=structuredClone(f.tables.tx_assertions[0]);
  if(variant==='missing-column')delete f.tables.tx_assertions[0].value_type;
  if(variant==='value-identity')f.tables.tx_assertions[0].value_identity='{"type":"string","value":"different"}';
  let result,error;try{result=await admitG0(f.reader,pin,expected,undefined,200);}catch(e){error=e.message;}
  observations.push({kind:'changed-clone',variant,pin,before,after:f.tables,result,error,calls:f.calls, ...(variant==='value-identity'?{constraintWitness:{inferenceOnly:true,basis:{recordedPosition:2,validAt:101},rule:{entityType:'member',attribute:'memberKey',kind:'Unique'},prospectiveAssertion:{entity_id:'subject-new',value_type:'string',value_string:'key-0',value_identity:JSON.stringify({type:'string',value:'key-0'})},explanation:'ConstraintValidation groups existing and overlay rows by stored value_identity. A new key-0 conflicts before corruption and fails to join the changed existing identity afterwards.'}}:{})});
  assert.ok(error,'changed logical content must be refused by the only granting gate');
});
test('unchanged full stored content reordered still reads anew and admits',async()=>{
  const f=fixture(),pin=await readG0(f.reader,expected);f.calls.length=0;f.tables.tx_assertions.reverse();
  const result=await admitG0(f.reader,pin,expected);assert.equal(result.status,'PASS');assert.equal(result.endpoint,f.reader.endpoint);assert.equal(f.calls.filter(x=>x[0]==='scan').length,Object.keys(fields).length);observations.push({kind:'positive',result,calls:f.calls});
});
for(const kind of ['scopes','count','scan'])test(`G0 deadline covers hung ${kind}`,async()=>{
 const f=fixture(),pin=await readG0(f.reader,expected);let signal;
 if(kind==='scopes')f.reader.scopes=async s=>{signal=s;return new Promise(()=>{});};
 if(kind==='count')f.reader.count=async(_t,_scope,s)=>{signal=s;return new Promise(()=>{});};
 if(kind==='scan')f.reader.scan=async function*(_t,_scope,s){signal=s;await new Promise(()=>{});};
 const start=Date.now();await assert.rejects(admitG0(f.reader,pin,expected,undefined,25),/deadline/);assert.equal(signal.aborted,true);observations.push({kind:'deadline',reader:kind,elapsedMs:Date.now()-start,aborted:signal.aborted});
});
for(const table of Object.keys(fields))test(`independent count cannot stand in for a partial ${table} scan`,async()=>{
 const f=fixture();if(!f.tables[table].length)f.tables[table].push(Object.fromEntries(fields[table].map(c=>[c,null])));const counts=Object.fromEntries(Object.entries(f.tables).map(([t,rows])=>[t,rows.length]));const pin=await readG0(f.reader,expected);f.reader.count=async t=>counts[t];f.tables[table].pop();await assert.rejects(admitG0(f.reader,pin,expected,undefined,200));
});
const engine=fs.readFileSync(path.join(root,'lab/bin/engine.mjs'),'utf8');
const a=engine.indexOf('async function golden(config, info, opts)'),b=engine.indexOf('async function clone(config, info, opts)',a);
assert.ok(a>=0&&b>a);const goldenSource=engine.slice(a,b);
for(const variant of ['matching','first-D-differs','second-D-differs','second-L-differs','second-T-differs','recipe-fails'])test(`golden publishes only after two content and layout starts: ${variant}`,async()=>{
 const dir=fs.mkdtempSync(path.join(scratch,'golden-')),f=fixture(),pin=await readG0(f.reader,expected);
 const manifestFile=path.join(dir,'manifest.json'),file=path.join(dir,'golden.json');fs.writeFileSync(manifestFile,JSON.stringify({g0:pin,result:{complete:true},seedInputs:{}}));
 let start=0;const events=[];const info={endpoint:f.reader.endpoint,container:'fixture',volume:'fixture-source',slot:'fixture'};const layout={L:'layout-1',T:9};
 const context={fs,path,REPO:dir,requireSlot:()=>{},readJson:p=>JSON.parse(fs.readFileSync(p,'utf8')),inspect:()=>({Image:'image'}),effectiveConfig:()=>({effective:{}}),systemConfig:x=>x,sha256:()=> 'system',goldenKey:()=>({key:'key',key8:'12345678',inputs:{}}),hostDisk:()=>({freeBytes:10*1024**3}),diskFloorVerdict:()=>({ok:true}),volumeBytes:()=>1,sha256File:()=> 'manifest-hash',now:()=>new Date().toISOString(),
  docker:args=>{events.push(['docker',...args]);return '';},spawnSync:()=>{events.push(['recipe']);return{status:variant==='recipe-fails'?1:0};},stopSlot:async()=>{events.push(['stop',start]);return{stop:{status:1,stderr:'missing Log4j lines'}};},helper:()=> 'source@@copydestination',listingScript:()=> '',parseListing:()=>({treeSha256:'matching-tree'}),
  copyToSlot:async()=>{start=1;events.push(['start',start]);},up:async()=>{start++;events.push(['start',start]);},healthXtdb:async()=>{events.push(['health',start]);},quietXtdb:async(_endpoint,want)=>{events.push(['layout',start,want]);const current={...layout,L:variant==='second-L-differs'&&start===2?'layout-2':layout.L,T:variant==='second-T-differs'&&start===2?10:layout.T};if(want&&(current.L!==want.L||current.T!==want.T))throw Error('layout/T refusal');return current;},
  checkXtdb:async(endpoint,_m,p)=>{events.push(['G0',start,endpoint]);if(variant==='first-D-differs'&&start===1||variant==='second-D-differs'&&start===2)f.tables.tx_assertions[0].value_string='changed';return admitG0(f.reader,p,expected,undefined,200);},fail:(_c,m)=>{throw Error(m);},process:{stderr:{write:()=>{}}},
 };
 const golden=vm.runInNewContext(goldenSource+';golden',context);let error;try{await golden({},info,{manifest:manifestFile});}catch(e){error=e.message;}
 const published=fs.existsSync(file);observations.push({kind:'publication',variant,published,error,events,record:published?JSON.parse(fs.readFileSync(file)):undefined});
 assert.equal(published,variant==='matching');if(variant==='matching'){assert.equal(error,undefined);assert.deepEqual(events.filter(e=>e[0]==='G0').map(e=>e[1]),[1,2]);assert.equal(JSON.parse(fs.readFileSync(file)).g0.D,pin.D);}else assert.ok(error);
});
