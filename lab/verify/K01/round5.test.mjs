// [EXP-K01-R5] Why: audit every admitted byte and lifecycle boundary beyond the reported cases. Rejected: fixing only the eight examples (leaves the same acceptance pattern in adjacent paths).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { runObserved } from './observation-context.mjs';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { verifyMaintenanceTail } from '../../bin/xtdb-log.mjs';
import { updateOwner, ownerStateLock } from '../../bin/owner-state.mjs';
import { parseListing } from '../../bin/engine.mjs';
import { maintenanceFixture, frame } from './tail-fixtures.mjs';
import { seedPathOf } from '../../bench/lib/bulk.ts';
const root = path.resolve(import.meta.dirname, '../../..');
const engine = fs.readFileSync(path.join(root,'lab/bin/engine.mjs'),'utf8');
const bytes = (n, b) => [n*8+2,b.length,...b];
const source = (n, b) => [3,...bytes(n,b)];
const validTrie = [...bytes(1,[116]),...bytes(2,[107]),24,1,...bytes(4,[...bytes(1,[8,1,16,2]),16,1]),40,1];
for(const [name,payload] of [
 ['nested-good',source(2,bytes(1,validTrie))],
 ['metadata-bad-tag',source(2,bytes(1,bytes(4,[0])))],
 ['temporal-bad-tag',source(2,bytes(1,bytes(4,bytes(1,[0]))))],
 ['temporal-wrong-wire',source(2,bytes(1,bytes(4,bytes(1,bytes(1,[])))))],
 ['utf8',source(2,bytes(1,bytes(1,[255])))],
 ['enum',source(2,bytes(1,[40,4]))],
 ['duplicate-cut',source(1,[16,0,16,0])],
 ['unknown-trie',source(2,bytes(1,[56,0]))],
 ['unknown-temporal',source(2,bytes(1,bytes(4,bytes(1,[56,0]))))],
 ['wrong-trie-wire',source(2,[8,0])],
 ['out-of-range-int32',source(2,[16,255,255,255,255,15])],
])test(`recursive codec content (${name})`,()=>{
 const fixture=maintenanceFixture(); const tail=Buffer.concat([fixture.bytes.subarray(0,26),frame(fixture.frontiers.M,payload)]);
 if(name==='nested-good')assert.equal(verifyMaintenanceTail(tail,fixture.frontiers,0).ok,true);
 else assert.throws(()=>verifyMaintenanceTail(tail,fixture.frontiers,0));
});
test('cut body binds the intended checkpoint index',()=>{
 const f=maintenanceFixture();assert.equal(verifyMaintenanceTail(f.bytes,f.frontiers,0).frames[0].cutIndex,0);
 assert.throws(()=>verifyMaintenanceTail(f.bytes,f.frontiers,1),/cut index differs/);
});
for(const variant of ['duplicates','bad-size','bad-mode','bad-owner','missing-hash','duplicate-hash'])test(`C1 exact tree preimage refuses ${variant}`,()=>{
 const h='a'.repeat(64);let stat='./file|1|644|1000|1000',sha=`${h}  ./file`;
 if(variant==='duplicates')stat+='\n'+stat;
 if(variant==='bad-size')stat='./file|NaN|644|1000|1000';
 if(variant==='bad-mode')stat='./file|1|999|1000|1000';
 if(variant==='bad-owner')stat='./file|1|644||1000';
 if(variant==='missing-hash')sha='';if(variant==='duplicate-hash')sha+='\n'+sha;
 assert.throws(()=>parseListing(`@@stat\n${stat}\n@@sha\n${sha}\n@@end`));
});
function section(start,end){const a=engine.indexOf(start),b=engine.indexOf(end,a+start.length);assert.ok(a>=0&&b>a);return engine.slice(a,b);}
const scratch=()=>{const p=path.join(import.meta.dirname,'tmp/round5');fs.mkdirSync(p,{recursive:true});const dir=fs.mkdtempSync(path.join(p,'lifecycle-'));const info={lane:'fixture',slot:'s1',container:'fixture',volume:'fixture-volume',lockDir:path.join(dir,'slot'),ownerFile:path.join(dir,'slot/owner.json')};fs.mkdirSync(info.lockDir);return{dir,info};};
for(const variant of ['same','new-generation','new-operation','new-holder'])test(`conditional release preserves replacement owner (${variant})`,async()=>{
 const {dir,info}=scratch(),expected={generation:'A',holder:'holder',createdAt:'old',lifecycle:{state:'REMOVING',token:'down-A'}};
 const current=structuredClone(expected);if(variant==='new-generation')current.generation='B';if(variant==='new-operation')current.lifecycle.token='down-B';if(variant==='new-holder')current.holder='other';fs.writeFileSync(info.ownerFile,JSON.stringify(current));
 const context={fs,ownerStateLock,readOwner:()=>JSON.parse(fs.readFileSync(info.ownerFile)),appendEvent:()=>{},fail:(_c,m)=>{throw Error(m);}};
 const release=runObserved(section('async function releaseSlot(info, expectedOwner)','/**\n * hooks.prepareVolume')+';releaseSlot',context);
 try{if(variant==='same'){await release(info,expected);assert.equal(fs.existsSync(info.ownerFile),false);}else{await assert.rejects(release(info,expected),/generation changed/);assert.deepEqual(JSON.parse(fs.readFileSync(info.ownerFile)),current);}}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
for(const failure of ['remove','absence-read','pool'])test(`failed teardown retains revoked receipts (${failure})`,async()=>{
 const {dir,info}=scratch();fs.writeFileSync(path.join(dir,'manifest.json'),'{}');fs.writeFileSync(info.ownerFile,JSON.stringify({holder:'holder',generation:'A',volumeContent:{kind:'clone',readiness:{verdict:'PASS',attemptId:'old'}}}));let removed=false;
 const context={fs,randomUUID,updateOwner,readOwner:()=>JSON.parse(fs.readFileSync(info.ownerFile)),defaultHolder:()=> 'holder',now:()=>new Date().toISOString(),inspect:()=>({Config:{Labels:{'tx2.managed-by':true}},State:{Running:true}}),docker:a=>{if(a[0]==='rm'){if(failure==='remove')throw Error('remove failed');removed=true;}if(a[0]==='ps'&&failure==='absence-read')throw Error('absence read failed');return '';},withPool:async()=>{throw Error('pool failed');},releaseSlot:()=>{throw Error('released invalid teardown');},fail:(_c,m)=>{throw Error(m);}};
 const down=runObserved(section('async function down(config, info, opts)','/**\n * [EXP-X05] Start the slot')+';down',context);
 try{await assert.rejects(down({lanes:{xtdb:{}}},info,{}));const owner=JSON.parse(fs.readFileSync(info.ownerFile));assert.equal(owner.lifecycle.state,'REMOVING');assert.equal(owner.volumeContent.readiness.verdict,'STALE');assert.equal(owner.volumeContent.verificationHistory[0].verdict,'PASS');assert.equal(removed,failure!=='remove');assert.throws(()=>seedPathOf({format:'tx2-xtdb-seed/1',lane:'xtdb'},path.join(dir,'manifest.json'),info.ownerFile),/lifecycle revoked/);}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
const { diskFloorVerdict } = await import('../../bin/engine.mjs');
for (const [name,freeBytes,copyBytes] of [['infinite',Infinity,0],['negative-copy',100,-1],['missing',undefined,1],['unsafe',Number.MAX_SAFE_INTEGER+1,0]])test(`resource observation refuses ${name}`,()=>{
 assert.equal(diskFloorVerdict({freeBytes,copyBytes,floorBytes:0}).ok,false);
});
for(const variation of ['clean','changed','missing'])test(`golden receipt cannot survive volume generation replacement (${variation})`,()=>{
 const f=maintenanceFixture(),offline={ok:true,sourceTailBase64:f.bytes.toString('base64'),maintenance:verifyMaintenanceTail(f.bytes,f.frontiers,0)};
 const record={format:'golden',key:'key',keyInputs:{seedInputs:{},engine:{}},volume:'golden',creation:{creationId:'old'},manifest:{path:'manifest',sha256:'manifest-hash'},settle:{qualified:true,frontiers:f.frontiers,after:{frontiers:f.frontiers,cutIndex:0,blocks:[{block_idx:'00',tx_id:f.frontiers.T,latest_processed_msg_id:f.frontiers.F}],gauges:{latestCompletedTxId:f.frontiers.T,latestProcessedMsgId:f.frontiers.M,latestSubmittedMsgId:f.frontiers.M}}},offline,referenceOffline:offline};
 if(variation==='missing')delete record.creation;
 const load=runObserved(section('function loadGolden(file)','/**\n * Clone')+';loadGolden',{
  path,Buffer,readJson:()=>record,canonicalJson:JSON.stringify,verifyMaintenanceTail,GOLDEN_RECORD_FORMAT:'golden',goldenKey:()=>({key:'key'}),REPO:root,fs:{existsSync:()=>true},sha256File:()=> 'manifest-hash',docker:()=>JSON.stringify([{Labels:{'tx2.creation-id':variation==='changed'?'new':'old','tx2.seed-key':'key'}}]),fail:(_c,m)=>{throw Error(m);},
 });
 if(variation==='clean')assert.equal(load('golden.json').record.volume,'golden');else assert.throws(()=>load('golden.json'),/generation/);
});
for(const variation of ['clean','failed','superseded'])test(`restart lifecycle clears only its own successful operation (${variation})`,async()=>{
 const {dir,info}=scratch(),initial={holder:'holder',generation:'A',createdAt:'old',lifecycle:{state:'STOPPED',token:'stop'},volumeContent:{kind:'clone',readiness:{verdict:'PASS'}}};fs.writeFileSync(info.ownerFile,JSON.stringify(initial));let running=false;
 const read=()=>JSON.parse(fs.readFileSync(info.ownerFile));
 const context={fs,randomUUID,updateOwner,defaultHolder:()=> 'holder',acquireSlot:async()=>({owner:read(),created:false}),effectiveConfig:()=>({sha256:'config',effective:{}}),inspect:()=>({Config:{Labels:{'tx2.config-sha256':'config'}},State:{Running:running}}),assertSingleWriter:()=>{},withPool:async action=>action({reservations:[]}),listTx2Containers:()=>[],reconcile:()=>{},vmDisk:()=>({usedBytes:0}),admission:()=>({ok:true,external:[]}),appendEvent:()=>{},now:()=>new Date().toISOString(),docker:()=>{running=true;return '';},waitReady:async()=>{
  assert.equal(read().lifecycle.state,'STARTING');assert.equal(read().volumeContent.readiness.verdict,'STALE');
  if(variation==='failed')throw Error('readiness failed');
  if(variation==='superseded')await updateOwner(info,o=>{o.lifecycle={state:'REMOVING',token:'new'};return o;});
  return{why:'ready'};
 },fmtBytes:()=>'',exportsFor:()=>'',process:{stdout:{write:()=>{}},stderr:{write:()=>{}}},fail:(_c,m)=>{throw Error(m);}};
 const up=runObserved(section('async function up(config, info, opts, hooks = {})','async function down(config, info, opts)')+';up',context);
 try{if(variation==='clean')await up({},info,{});else await assert.rejects(up({},info,{}));const owner=read();assert.equal(owner.lifecycle.state,variation==='clean'?'RUNNING':variation==='failed'?'STARTING':'REMOVING');assert.equal(owner.volumeContent.readiness.verdict,'STALE');}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
for(const variation of ['clean','exit','signal','error'])test(`engine readiness ignores partial successful HTTP text (${variation})`,()=>{
 const healthz=runObserved(section('export function healthz(container, route','/**\n * Host-side readiness').replace('export function','function')+';healthz',{
  dockerArgs:a=>a,spawnSync:()=>({status:variation==='exit'?1:0,signal:variation==='signal'?'SIGTERM':null,error:variation==='error'?Error('failed'):undefined,stdout:'started',stderr:'HTTP/1.1 200 OK'}),
 });
 assert.equal(healthz('fixture','/healthz/started').status,variation==='clean'?200:null);
});
