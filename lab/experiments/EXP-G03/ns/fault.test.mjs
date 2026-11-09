// [EXP-G03-R6] Why: deterministic trusted models plant the exact durability defect without executing a candidate on the Mac. Rejected: fake Docker success presented as VM proof; these results are DIAGNOSTIC only.
import fs from 'node:fs';import path from 'node:path';
import {test} from 'node:test';import assert from 'node:assert/strict';import {createHash,randomUUID} from 'node:crypto';import {PassThrough} from 'node:stream';
import {FaultInjector,FAULT_POINTS} from '../../../bin/ns-fault.mjs';import {ControlInput,hookedPage} from '../../../bench/ns-driver/fault.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex'),digest=v=>hash(Buffer.from(JSON.stringify(v)));
const binding={runId:randomUUID(),sourceCommit:'a'.repeat(40),evaluatorCommit:'b'.repeat(40),sourceSha256:'c'.repeat(64),inputsSha256:'d'.repeat(64),slot:'OFFLINE-SYNTHETIC'};
const target={role:'consumer',name:'synthetic-consumer',id:'1'.repeat(64),volume:'same-consumer-state',endpoint:{host:'synthetic',port:9103}};
function fixture({split=false,point='after-effect',role='consumer',points=FAULT_POINTS,change={},decide=()=>true}={}){
 const objects=new Map(),calls=[],expected=[[1,'subject',7]];let generation=1,checkpoint=point==='after-checkpoint'?1:0,effects=(point==='after-checkpoint'||split&&point==='after-effect')?[...expected]:[],t=100,before=0;
 const transport={
  async pause(c){calls.push('pause');return {id:c.target.id,paused:true}},
  async snapshot(c){calls.push(c.phase);return Buffer.from(JSON.stringify({schema:'ns-dr/1',binding,attempt:c.attempt,targetId:c.target.id,volume:c.target.volume,phase:c.phase,checkpoint,effects,rowCount:effects.length,frontier:Math.max(0,...effects.map(e=>e[0])),walBytes:32,walBase64:Buffer.alloc(32).toString('base64'),walSha256:hash(Buffer.alloc(32)),observedAtNs:String(t++)}))},
  async kill(c){calls.push('kill');return {id:c.target.id,removed:c.target.name,signal:'SIGKILL',cgroupGone:true,attempt:c.attempt,observedAtNs:String(t++)}},
  async restart(c){calls.push('restart');return {...c.target,name:'synthetic-'+(++generation),id:String(generation).padStart(64,'0')}},
  async recover(){calls.push('recover');if(checkpoint===before)effects.push(...expected.slice(before));checkpoint=expected.length;return {checkpoint,retries:1,expectedReplaySha256:digest(expected),actualReplaySha256:digest(effects),caseResults:[{duplicates:effects.length-1,gaps:Math.max(0,1-effects.length),equal:digest(expected)===digest(effects)}]}},...change};
 const f=new FaultInjector({binding,target:{...target,role},transport,points,obligation:role==='consumer'?'NS.P3':'C2',pageBounds:()=>({before,after:expected.length}),decide,retain:async bytes=>{const h=hash(bytes);objects.set(h,Buffer.from(bytes));if(process.env.G03_FAULT_EVIDENCE){fs.mkdirSync(process.env.G03_FAULT_EVIDENCE,{recursive:true});const file=path.join(process.env.G03_FAULT_EVIDENCE,h+'.json');if(!fs.existsSync(file))fs.writeFileSync(file,bytes,{flag:'wx'})}return h}});
 const message=()=>({schema:'ns-control/1',binding,event:{event:'at-point',role,point,page:0,cursor:{after:checkpoint},nonce:randomUUID()}});
 return {f,transport,objects,calls,message,prepare(nextPoint){point=nextPoint??point;before=expected.length;expected.push([before+1,'subject',7]);checkpoint=point==='after-checkpoint'?expected.length:before;if(point==='after-checkpoint'||split&&point==='after-effect')effects.push(expected.at(-1))},detail:()=>JSON.parse(objects.get(f.witnesses.at(-1).eventsSha256))};
}
for(const point of FAULT_POINTS)for(const split of [false,true])test(`${split?'split':'atomic'} ${point}: DR snapshot, proven kill, same-volume restart and byte replay`,async()=>{
 const h=fixture({point,split});await h.f.handshake(h.message());assert.deepEqual(h.calls,['pause','paused','kill','restart','recover','recovered']);const d=h.detail();assert.equal(d.target.role,'consumer');assert.equal(d.target.volume,target.volume);assert.equal(d.qualification,false);assert.equal(d.replay.equal,!(split&&point==='after-effect'));assert.equal(d.postRecoveryCaseResults[0].duplicates,split&&point==='after-effect'?1:0);assert.equal(h.f.witnesses.length,1);assert.equal(h.f.witnesses[0].injectedAt,100);assert.equal(h.f.witnesses[0].eventsSha256,hash(h.objects.get(h.f.witnesses[0].eventsSha256)));
});
test('three distinct witnesses per point in one attempt, never a declared repetition count',async()=>{
 const h=fixture({point:'before-effect'});let first=true;for(const point of FAULT_POINTS)for(let rep=1;rep<=3;rep++){if(!first)h.prepare(point);first=false;await h.f.handshake(h.message());assert.equal(h.f.witnesses.at(-1).rep,rep)}
 const result=h.f.finish({requireInjections:true});assert.equal(result.qualification,false);assert.deepEqual(result.counts,{'before-effect':3,'after-effect':3,'after-checkpoint':3});assert.equal(result.witnesses.length,9);assert.equal(new Set(result.witnesses.map(w=>w.eventsSha256)).size,9);if(process.env.G03_FAULT_EVIDENCE)fs.writeFileSync(path.join(process.env.G03_FAULT_EVIDENCE,'nine-injections.json'),JSON.stringify({binding,...result},null,2),{flag:'wx'});
});
test('main run uses all three identical hook reports and receives releases without injection data',async()=>{
 const h=fixture({decide:()=>false});for(const p of FAULT_POINTS){const m=h.message();m.event.point=p;const r=await h.f.handshake(m);assert.deepEqual(Object.keys(r),['schema','runId','nonce','restart']);assert.equal(r.restart,false)}assert.equal(h.f.finish().handshakes,3);assert.deepEqual(h.calls,[]);
});
test('ignored hook never exercises fault',()=>{assert.throws(()=>fixture().f.finish(),/FAULT-NOT-EXERCISED/)});
test('short repetition inventory refused',async()=>{const h=fixture();await h.f.handshake(h.message());assert.throws(()=>h.f.finish({requireInjections:true}),/FAULT-NOT-EXERCISED/)});
for(const [name,change,code]of [
 ['no cgroup proof',{kill:async c=>({id:c.target.id,removed:c.target.name,signal:'SIGKILL',attempt:c.attempt})},'ISOLATION-NOT-IN-FORCE'],
 ['wrong killed ID',{kill:async c=>({id:'f'.repeat(64),removed:c.target.name,signal:'SIGKILL',attempt:c.attempt,cgroupGone:true})},'ISOLATION-NOT-IN-FORCE'],
 ['stale proof',{kill:async c=>({id:c.target.id,removed:c.target.name,signal:'SIGKILL',attempt:'previous',cgroupGone:true})},'ISOLATION-NOT-IN-FORCE'],
 ['no pause proof',{pause:async c=>({id:c.target.id,paused:false})},'ISOLATION-NOT-IN-FORCE'],
 ['fresh volume',{restart:async c=>({...c.target,id:'2'.repeat(64),volume:'fresh'})},'CRASH-TARGET-MISMATCH'],
 ['same container',{restart:async c=>c.target},'CRASH-TARGET-MISMATCH'],
 ['broker restart on consumer path',{restart:async c=>({...c.target,id:'2'.repeat(64),role:'broker'})},'CRASH-TARGET-MISMATCH'],
 ['old snapshot',{snapshot:async()=>Buffer.from('{}')},'FAULT-SNAPSHOT-INVALID'],
 ['no replay comparison',{recover:async()=>null},'FAULT-RECOVERY-MISSING'],
 ])test(`${name} refuses witness and restart cannot follow missing kill proof`,async()=>{const h=fixture({change});await assert.rejects(h.f.handshake(h.message()),new RegExp(code));assert.equal(h.f.witnesses.length,0);assert.throws(()=>h.f.finish(),/FAULT-NOT-EXERCISED/);if(name.includes('proof')||name==='wrong killed ID')assert.ok(!h.calls.includes('restart'))});
for(const [label,mutate]of [ ['foreign source',m=>m.binding={...binding,sourceSha256:'f'.repeat(64)}],['foreign slot',m=>m.binding={...binding,slot:'other'}],['foreign inputs',m=>m.binding={...binding,inputsSha256:'f'.repeat(64)}],['wrong target role',m=>m.event.role='broker'],['invented point',m=>m.event.point='pretend'],['no hook',m=>m.event={} ]])test(label+' refused',async()=>{const h=fixture(),m=h.message();mutate(m);await assert.rejects(h.f.handshake(m),/FAULT-NOT-EXERCISED/);assert.deepEqual(h.calls,[])});
test('reused hook nonce refused',async()=>{const h=fixture({decide:()=>false}),m=h.message();await h.f.handshake(m);await assert.rejects(h.f.handshake(m),/FAULT-NOT-EXERCISED/)});
test('consumer target cannot be the broker',()=>{assert.throws(()=>new FaultInjector({binding,target:{...target,role:'broker'},retain:()=>{}}),/CRASH-TARGET-MISMATCH/)});
test('C2 broker reuses controller with separately pinned point inventory and broker target',async()=>{const points=['C2-registered-fixture-point'];const h=fixture({role:'broker',points,point:points[0]});await h.f.handshake(h.message());assert.equal(h.detail().target.role,'broker');assert.equal(h.f.witnesses[0].obligation,'C2')});
test('driver ignored-hook result refused',async()=>{await assert.rejects(hookedPage({call:async()=>({}),events:{binding},control:{},relay(){}}),/FAULT-NOT-EXERCISED/)});
test('driver holds consumer at every hook until private release and never forwards restart bit',async()=>{
 const called=[],events={binding};let resolve;
 await hookedPage({events,control:{next:()=>new Promise(r=>resolve=r)},relay:(_,event)=>{assert.equal(called.length,FAULT_POINTS.indexOf(event.point)+1);resolve({schema:'ns-release/1',runId:binding.runId,nonce:event.nonce,restart:false})},call:async(role,method,params)=>{called.push(params);return called.length<=3?{hook:{event:'at-point',role,point:FAULT_POINTS[called.length-1],page:0,cursor:{after:0}}}:{done:true}}});
 assert.deepEqual(called.slice(1),FAULT_POINTS.map(point=>({action:'release',data:{page:0,point}})));
});
test('one reported hook cannot substitute for all mandatory points',async()=>{
 let resolve;await assert.rejects(hookedPage({events:{binding},control:{next:()=>new Promise(r=>resolve=r)},relay:(_,event)=>resolve({schema:'ns-release/1',runId:binding.runId,nonce:event.nonce,restart:false}),call:async(role,method,p)=>p.action==='step'?{hook:{event:'at-point',role,point:'before-effect',page:0,cursor:{after:0}}}:{done:true}}),/FAULT-NOT-EXERCISED/);
});
test('private input waits, binds exactly one line, caps and rejects unsolicited release',async()=>{const input=new PassThrough(),c=new ControlInput(input),p=c.next(100);input.write('{"nonce":"n"}\n');assert.deepEqual(await p,{nonce:'n'});input.write('{}\n');await assert.rejects(c.next(100),/UNSOLICITED/);input.end()});
test('private control times out when evaluator does not release',async()=>{const input=new PassThrough(),c=new ControlInput(input);await assert.rejects(c.next(5),/FAULT-NOT-EXERCISED/);input.end()});

for(const [name,mutate]of [['previous attempt',d=>d.attempt='old'],['other source',d=>d.binding={...d.binding,sourceSha256:'f'.repeat(64)}],['other volume',d=>d.volume='other'],['other phase',d=>d.phase='old'],['other target',d=>d.targetId='f'.repeat(64)],['row count',d=>d.rowCount=999],['WAL bytes',d=>d.walBase64=''],['WAL hash',d=>d.walSha256='f'.repeat(64)],['checkpoint contradiction',d=>d.checkpoint=999]])test('snapshot refuses '+name,async()=>{const h=fixture(),snap=h.transport.snapshot;h.transport.snapshot=async c=>{const d=JSON.parse(await snap(c));mutate(d);return Buffer.from(JSON.stringify(d))};await assert.rejects(h.f.handshake(h.message()),/FAULT-SNAPSHOT-INVALID|FAULT-POINT-DR-CONTRADICTION/);assert.ok(!h.calls.includes('kill'));assert.equal(h.f.witnesses.length,0)});
test('minimum three repetitions cannot be lowered at finish',async()=>{const h=fixture({decide:()=>false});await h.f.handshake(h.message());assert.throws(()=>h.f.finish({requireInjections:true,reps:0}),/FAULT-NOT-EXERCISED/)});
test('driver restarts through same complete hook path on evaluator-provided endpoint',async()=>{
 let resolve,attempt=0,point=0;const endpoints=[],messages=[],events={binding};
 await hookedPage({events,control:{next:()=>new Promise(r=>resolve=r)},relay:(_,event)=>{const restart=attempt===1&&point===1;resolve({schema:'ns-release/1',runId:binding.runId,nonce:event.nonce,restart,...(restart?{endpoint:{host:'new',port:1}}:{})})},call:async(role,method,p,observe,endpoint)=>{endpoints.push(endpoint);messages.push(p);if(p.action==='step'){attempt++;point=0}else point++;return point<3?{hook:{event:'at-point',role,point:FAULT_POINTS[point],page:0,cursor:{after:0}}}:{done:true}}});
 assert.equal(attempt,2);assert.ok(endpoints.slice(2).every(e=>e.host==='new'));assert.ok(messages.every(m=>!Object.hasOwn(m.data,'restart')));
});
// [EXP-G03-R6] Why: exercise trusted observer SQL/WAL serialization against actual fixture bytes; no candidate/provider is loaded. Rejected: assuming a synthetic object proves the snapshot script can parse a real SQLite file.
for(const point of FAULT_POINTS)test('trusted observer snapshot encodes real SQLite fixture '+point,async()=>{
 const {snapshotScript}=await import('../../../bin/ns-fault-box.mjs'),{spawnSync}=await import('node:child_process'),os=await import('node:os');const dir=fs.mkdtempSync(path.join(os.tmpdir(),'g03-observer-')),store=path.join(dir,'store.db');
 try{
  const context={attempt:randomUUID(),binding,target,phase:'paused'};
  const sql="CREATE TABLE marker(id INTEGER PRIMARY KEY,lsn INTEGER);INSERT INTO marker VALUES(1,0);CREATE TABLE entries(position INTEGER,subject TEXT,value INTEGER);";
  const fixture=`import sqlite3\nw=sqlite3.connect(${JSON.stringify(store)},isolation_level=None)\nw.execute('PRAGMA journal_mode=WAL');w.execute('PRAGMA synchronous=FULL');w.execute('PRAGMA wal_autocheckpoint=0');w.executescript(${JSON.stringify(sql)})\nw.execute('BEGIN IMMEDIATE')\n`+(point==='before-effect'?'':"w.execute(\"INSERT INTO entries VALUES(1,'subject',7)\")\n")+(point==='after-checkpoint'?"w.execute('UPDATE marker SET lsn=1');w.execute('COMMIT')\n":'')+snapshotScript(context,store);
  const r=spawnSync('python3',['-I','-c',fixture],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);const d=JSON.parse(r.stdout);assert.equal(d.checkpoint,point==='after-checkpoint'?1:0);assert.equal(d.rowCount,point==='after-checkpoint'?1:0);assert.equal(d.walSha256,hash(Buffer.from(d.walBase64,'base64')));assert.equal(d.walBytes,Buffer.from(d.walBase64,'base64').length);assert.equal(d.attempt,context.attempt);assert.equal(d.volume,target.volume);assert.equal(d.walStructure.class,'structural-only; checksum and sync provenance require O-OBS');assert.ok(d.walStructure.frames>0);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
