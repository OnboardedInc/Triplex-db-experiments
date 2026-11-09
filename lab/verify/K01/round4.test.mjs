// [EXP-K01-R4] Why: pin maintenance classification to stopped bytes. Rejected: accepting source-head shape without the log interval.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { verifyMaintenanceTail } from '../../bin/xtdb-log.mjs';
import { frame, maintenanceFixture } from './tail-fixtures.mjs';
test('Q83e maintenance tail qualifies distinct F/M/T',()=>{ const f=maintenanceFixture(); assert.equal(verifyMaintenanceTail(f.bytes,f.frontiers).ok,true); });
test('Q83e application transaction refuses even with unchanged observed T',()=>{const f=maintenanceFixture(true);assert.throws(()=>verifyMaintenanceTail(f.bytes,f.frontiers),/non-maintenance Tx/);});
import fs from 'node:fs';
import path from 'node:path';
import { runObserved } from './observation-context.mjs';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import { cloneCertificateHash } from '../../bench/lib/clone.ts';
import { seedPathOf } from '../../bench/lib/bulk.ts';
const root = path.resolve(import.meta.dirname, '../../..');
const tempRoot = path.join(import.meta.dirname, 'tmp/round4');
fs.mkdirSync(tempRoot,{recursive:true});
for (const variation of ['truncated','trailer','beyond-M','wrong-M','epoch','unknown','application-legacy','anchor-tx']) {
 test(`Q83e refuses ${variation} stopped bytes`,()=>{
  const f=maintenanceFixture(); let bytes=Buffer.from(f.bytes), frontiers={...f.frontiers};
  if(variation==='truncated')bytes=bytes.subarray(0,-1);
  if(variation==='trailer')bytes[bytes.length-1]^=1;
  if(variation==='beyond-M')frontiers.M=frontiers.F;
  if(variation==='wrong-M')frontiers.M++;
  if(variation==='epoch')frontiers.M+=2**48;
  if(variation==='unknown')bytes[26+13]=4;
  if(variation==='application-legacy')bytes=Buffer.concat([bytes.subarray(0,26),frame(frontiers.M,[255,0,0])]);
  if(variation==='anchor-tx')bytes[14]=50;
  assert.throws(()=>verifyMaintenanceTail(bytes,frontiers));
 });
}
test('Q83e permits F=M with a complete cut anchor and no post-cut messages',()=>{
 const bytes=frame(100,[3,10,2,16,0]); const p=verifyMaintenanceTail(bytes,{F:100,M:100,T:99});assert.equal(p.maintenanceMessages,0);
});
test('Q83e validates every intervening message rather than only the last',()=>{
 const cut=frame(100,[3,10,2,16,0]), tx=frame(126,[3,50,0]), last=frame(150,[3,18,0]);
 assert.throws(()=>verifyMaintenanceTail(Buffer.concat([cut,tx,last]),{F:100,M:150,T:99}),/non-maintenance Tx/);
});
test('current certificate changes revoke driver admission after a prior PASS',()=>{
 const dir=fs.mkdtempSync(path.join(tempRoot,'binding-')); const mf=path.join(dir,'manifest.json'),of=path.join(dir,'owner.json');
 try {
 fs.writeFileSync(mf,'{}'); const sha=createHash('sha256').update('{}').digest('hex');
 const base={kind:'clone',containerId:'container',startedAt:'start',key:'key',goldenVolume:'golden',goldenRecord:'golden.json',manifestSha256:sha,copy:{creationId:'copy-A',treeSha256:'a'.repeat(64),c1:{pass:true,expected:'a'.repeat(64),observed:'a'.repeat(64)}},readiness:{verdict:'PASS',verifiedContainerId:'container',verifiedStartedAt:'start'}};
 base.readiness.certificateSha256=cloneCertificateHash(base);
 for(const variation of ['clean','golden','pass','expected','observed','copy-id','tree','start']){
  const c=structuredClone(base);
  if(variation==='golden')c.goldenVolume='other'; if(variation==='pass')c.copy.c1.pass=false;
  if(variation==='expected')c.copy.c1.expected='other'; if(variation==='observed')c.copy.c1.observed='other';
  if(variation==='copy-id')c.copy.creationId='copy-B'; if(variation==='tree')c.copy.treeSha256='other'; if(variation==='start')c.startedAt='later';
  fs.writeFileSync(of,JSON.stringify({volumeContent:c}));
  const read=()=>seedPathOf({format:'tx2-xtdb-seed/1',lane:'xtdb',scope:'fixture'},mf,of);
  if(variation==='clean')assert.equal(read().seededBy,'clone');else assert.throws(read,/Q74d/);
 }
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
const child = (program, args, env) => new Promise((resolve,reject)=>{
 const p=spawn(process.execPath,['--input-type=module','-e',program,...args],{cwd:root,env:{...process.env,...env},stdio:['ignore','pipe','pipe']});let text='';p.stderr.on('data',b=>text+=b);p.on('error',reject);p.on('close',code=>code===0?resolve():reject(new Error(text||`child exit ${code}`)));
});
for(const order of ['A-then-B','B-then-A']){
 test(`real cross-process owner lock preserves newer ERROR (${order})`,async()=>{
  const dir=fs.mkdtempSync(path.join(tempRoot,'lock-'));const info={lane:'fixture',slot:'s1',lockDir:path.join(dir,'slot'),ownerFile:path.join(dir,'slot/owner.json')};fs.mkdirSync(info.lockDir);fs.writeFileSync(info.ownerFile,JSON.stringify({holder:'fixture',volumeContent:{readiness:{verdict:'PENDING',attemptId:'A'}}}));
  const module=pathToFileURL(path.join(root,'lab/bin/owner-state.mjs')).href;
  const program=`import fs from 'node:fs';import {updateOwner} from ${JSON.stringify(module)};const info=JSON.parse(process.argv[1]), role=process.argv[2], order=process.argv[3], signal=info.lockDir+'.signal';const wait=async()=>{for(let n=0;!fs.existsSync(signal);n++){if(n>1000)throw Error('signal timeout');await new Promise(r=>setTimeout(r,5));}};if(order==='A-then-B'){if(role==='A')await updateOwner(info,o=>{fs.writeFileSync(signal,'1');Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,100);o.volumeContent.readiness={verdict:'PASS',attemptId:'A'};return o;});else{await wait();await updateOwner(info,o=>{o.volumeContent.readiness={verdict:'ERROR',attemptId:'B'};return o;});}}else{if(role==='B'){await updateOwner(info,o=>{o.volumeContent.readiness={verdict:'ERROR',attemptId:'B'};return o;});fs.writeFileSync(signal,'1');}else{await wait();try{await updateOwner(info,o=>{if(o.volumeContent.readiness.attemptId!=='A')throw Error('superseded');o.volumeContent.readiness={verdict:'PASS',attemptId:'A'};return o;});throw Error('older publication succeeded');}catch(e){if(e.message!=='superseded')throw e;}}}`;
  try{await Promise.all(['A','B'].map(role=>child(program,[JSON.stringify(info),role,order],{TX2_LOCKS_DIR:path.join(dir,'shared')})));assert.deepEqual(JSON.parse(fs.readFileSync(info.ownerFile)).volumeContent.readiness,{verdict:'ERROR',attemptId:'B'});}finally{fs.rmSync(dir,{recursive:true,force:true});}
 });
}
import { stripTypeScriptTypes } from 'node:module';
import { canonical } from '../../bench/lib/clone.ts';
import { stopVerdict } from '../../bin/engine.mjs';
const checker=fs.readFileSync(path.join(root,'lab/bench/clone-check.ts'),'utf8');
const engine=fs.readFileSync(path.join(root,'lab/bin/engine.mjs'),'utf8');
function section(s,a,b){const p=s.indexOf(a),q=s.indexOf(b,p+a.length);assert.ok(p>=0&&q>p);return s.slice(p,q);}
for(const variation of ['clean','inspect-signal','inspect-error','logs-signal','logs-error','empty','invalid','changed']){
 test(`startup acquisition binds completed current reads (${variation})`,async()=>{
  let inspections=0;
  const expected={frontiers:{F:180,M:200,T:100},gauges:{latestProcessedMsgId:200,latestCompletedTxId:100},trie:{sha256:'trie'},listing:['00']};
  const {startCheck}=runObserved(stripTypeScriptTypes(section(checker,'async function startCheck','// ---------------------------------------------------------------- fingerprint'))+';({startCheck})',{
   Number,canonical,container:'fixture',DOCKER_HOST:'offline',sleep:async()=>{},healthz:()=>({status:200}),
   gauges:async()=>({jobsAvailable:0,lagMsgId:0,latestCompletedTxId:100,latestProcessedMsgId:200,latestSubmittedMsgId:200}),liveRows:async()=>({total:0}),tries:async()=>expected.trie,blockListing:()=>expected.listing,
   spawnSync:(_cmd,args)=>{const kind=args.includes('inspect')?'inspect':'logs';if(kind==='inspect')inspections++;let stdout=kind==='inspect'?'2000-01-01T00:00:00Z':'resuming after 200';if(kind==='inspect'&&variation==='empty')stdout='';if(kind==='inspect'&&variation==='invalid')stdout='invalid';if(kind==='inspect'&&variation==='changed'&&inspections>1)stdout='2000-01-02T00:00:00Z';return{status:0,stdout,stderr:'',signal:variation===kind+'-signal'?'SIGTERM':null,error:variation===kind+'-error'?new Error('spawn proof failed'):undefined};},
  });
  const r=await startCheck(expected);assert.equal(r.ok,variation==='clean');
  if(variation.endsWith('error'))assert.ok(Object.values(r.proofReads).some(r=>r.error==='spawn proof failed'));
 });
}
for(const variation of ['clean','signal','error','inspect-missing','identity-changed']){
 test(`stop acquisition rejects incomplete current evidence (${variation})`,async()=>{
  let n=0; const stopOwner={holder:'fixture'};
  const {stopSlot}=runObserved(section(engine,'async function stopSlot(config, info, opts)','/**\n * Golden')+';({stopSlot})',{
   Date,randomUUID,updateOwner:async(_info,action)=>action(stopOwner),readOwner:()=>({holder:'fixture'}),requireHeldXtdbSlot:()=>{},inspect:()=>{
    if(++n===2&&variation==='inspect-missing')return null;
    return{Id:n===2&&variation==='identity-changed'?'other':'container',Config:{Labels:{'tx2.managed-by':'lab/bin/engine.mjs'}},State:{Running:n===1,ExitCode:143,OOMKilled:false,StartedAt:'2000-01-01T00:00:00Z',FinishedAt:'2000-01-01T00:00:01Z'}};
   },docker:()=>'',dockerArgs:a=>a,spawnSync:()=>({status:0,signal:variation==='signal'?'SIGTERM':null,error:variation==='error'?new Error('log read failed'):undefined,stdout:'Stopping node...\nNode stopped.\n',stderr:''}),stopVerdict,
   withPool:async f=>f({reservations:[]}),appendEvent:()=>{},now:()=>'',process:{stdout:{write:()=>{}}},fail:(_c,m)=>{throw new Error(m);},
  });
  if(['inspect-missing','identity-changed'].includes(variation))await assert.rejects(stopSlot({}, {container:'fixture'},{print:false}));
  else{const r=await stopSlot({}, {container:'fixture'},{print:false});assert.equal(r.verdict.ok,variation==='clean');if(variation==='error')assert.equal(r.logRead.error,'log read failed');}
 });
}
for(const valid of [true,false]){
 test(`runner cleanup uses only its exact current creation receipt (${valid})`,async()=>{
  const src=fs.readFileSync(path.join(root,'lab/experiments/EXP-K01-seed-clone/round2-live.mjs'),'utf8'), files=new Map(), commands=[];
  let error;
  try{await runObserved(`(async()=>{${src.slice(src.indexOf('const root ='))}\n})()`,{
   Date,Math,path,POOL_FILE:()=>'/fixture/pool.json',readJson:()=>({}),process:{cwd:()=>root,env:{TX2_K01_ATTEMPT:'fixture'},execPath:'node',stderr:{write:()=>{}}},
   fs:{mkdirSync:()=>{},statfsSync:()=>({bavail:30,bsize:1024**3}),writeFileSync:(f,v)=>files.set(f,v),existsSync:f=>files.has(f),copyFileSync:()=>{},readFileSync:f=>f==='lab/config/slots.json'?JSON.stringify({slots:{xtdb:{s1:{javaOpts:'-Dlog4j2.shutdownHookEnabled=false'}}}}):files.get(f)},
   spawnSync:(_cmd,args)=>{const cmd=args[1];commands.push(args);const holder=args[args.indexOf('--holder')+1];if(cmd==='up')files.set('/fixture/xtdb-s1/owner.json',JSON.stringify({holder}));if(cmd==='down')files.delete('/fixture/xtdb-s1/owner.json');if(cmd==='golden'){const file=args[args.indexOf('--creation-receipt')+1],invocation=args[args.indexOf('--invocation')+1];files.set(file,JSON.stringify({format:'tx2-golden-creation/1',invocation:valid?invocation:'older',creationId:'creation-token',volume:'tx2-golden-xtdb-12345678'}));return{status:1,stdout:'',stderr:'golden failed after creation'};}return{status:0,stdout:JSON.stringify({verdict:{ok:true,stoppedLine:null}}),stderr:''};},
  });}catch(e){error=e.message;}
  assert.match(error,/golden failed after creation/);
  const removals=commands.filter(a=>a[1]==='golden-rm');assert.equal(removals.length,valid?1:0);
  if(valid){assert.ok(removals[0].includes('--creation-id'));assert.ok(removals[0].includes('creation-token'));}
 });
}
for(const variation of ['clean','tail','frontier','gauge','reference']){
 test(`loading a golden rechecks persisted stopped bytes (${variation})`,()=>{
  const f=maintenanceFixture(),offline={ok:true,sourceTailBase64:f.bytes.toString('base64'),maintenance:verifyMaintenanceTail(f.bytes,f.frontiers)};
  const record={settle:{qualified:true,frontiers:{...f.frontiers},after:{cutIndex:0,blocks:[{block_idx:'00',latest_processed_msg_id:f.frontiers.F,tx_id:f.frontiers.T}],frontiers:{...f.frontiers},gauges:{latestProcessedMsgId:f.frontiers.M,latestSubmittedMsgId:f.frontiers.M,latestCompletedTxId:f.frontiers.T}}},offline:structuredClone(offline),referenceOffline:structuredClone(offline),format:'golden',keyInputs:{seedInputs:{},engine:{}},key:'key'};
  if(variation==='tail')record.offline.sourceTailBase64=maintenanceFixture(true).bytes.toString('base64');
  if(variation==='frontier')record.settle.after.frontiers.M++;
  if(variation==='gauge')record.settle.after.gauges.latestProcessedMsgId++;
  if(variation==='reference')record.referenceOffline.maintenance.frontiers.M++;
  let dockerRead=false;
  const {loadGolden}=runObserved(section(engine,'function loadGolden(file)','/**\n * Clone')+';({loadGolden})',{
   path,Buffer,readJson:()=>record,canonicalJson:canonical,verifyMaintenanceTail,GOLDEN_RECORD_FORMAT:'golden',goldenKey:()=>({key:'key'}),
   docker:()=>{dockerRead=true;throw Error('reached-volume-inspection');},fail:(_c,m)=>{throw Error(m);},
  });
  assert.throws(()=>loadGolden('fixture.json'));assert.equal(dockerRead,variation==='clean');
 });
}
