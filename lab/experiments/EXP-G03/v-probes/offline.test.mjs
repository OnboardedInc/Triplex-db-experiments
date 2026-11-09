// [EXP-G03] Why: adversarial synthetic observations exercise refusal rules offline. Rejected: substituting fixture numbers for VM measurements.
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import http from 'node:http';import net from 'node:net';import {spawn} from 'node:child_process';import {once} from 'node:events';import {createHmac} from 'node:crypto';import {judge,quantile} from './check.mjs';
const binding={attempt:'fresh-nonce',sourceCommit:'a'.repeat(40),imageId:'sha256:'+'b'.repeat(64),volume:'private-volume',slot:{containerId:'exact-engine'}};
const wrap=data=>({attempt:binding.attempt,binding,data});
const domain={bootId:'vm-boot',timeNs:123,primitive:'CLOCK_MONOTONIC'};
function fixture(id){
 if(id==='V1')return ['idle','busy'].map(load=>wrap({load,rowsPerCommit:10,synchronous:2,fdatasync:Array(500).fill(100),sqliteCommit:Array(500).fill(200),mountinfo:'1 2 0:1 / /work rw - ext4 /dev/vda rw,relatime',device:'0:1',writeCache:{'0:1':'write back'},workload:{engineCores:1.9,counts:Array(256).fill(10),errors:[]},durabilityClass:'guest-flush-host-fsync; host-power-loss-UNQUALIFIED'}));
 if(id==='V2')return [wrap({final:1,observations:['before-sync','after-sync'].map(stage=>({stage,values:Array(100).fill(0)})),writer:{data:{committed:1}}})];
 if(id==='V3')return [wrap({commits:12000,rounds:Array.from({length:12},(_,i)=>({active:[false,true,true,false][i%4],samples:Array(1000).fill(i%4===1||i%4===2?104:100),checkpoint:[0,0,0],checkpointNs:100}))}),wrap({pollCost:Array(1000).fill(10),requestedPeriodNs:250000})];
 if(id==='V4')return [wrap({domain,count:2000}),wrap({domain,samples:Array.from({length:2000},()=>({rtt:40000,start:100000,peer:120000,end:140000}))})];
 if(id==='V5')return [wrap({bytes:binding.attempt,events:[{wd:2,mask:2},{wd:2,mask:8}],expectedWd:2}),wrap({bytes:binding.attempt})];
 if(id==='V6')return ['plain','capture'].map(mode=>wrap({mode,counts:Array(256).fill(10),errors:[],elapsedNs:'30000000000',engineCores:1.9,relayCores:.5,captureVerified:mode==='capture'}));
 return [wrap({role:'broker',synthetic:true,memoryPeak:1000})];
}
for(const id of ['V1','V2','V3','V4','V5','V6']){
 test(`${id}: complete synthetic fixture is diagnostic OBSERVED`,()=>{const r=judge(id,fixture(id),binding);assert.equal(r.status,'OBSERVED');assert.equal(r.qualification,false)});
 test(`${id}: stale attempt refused`,()=>{const xs=fixture(id);xs[0].attempt='old';assert.equal(judge(id,xs,binding).status,'NOT-ESTABLISHED')});
 test(`${id}: wrong source or slot refused`,()=>{const xs=fixture(id);xs[0].binding={...binding,sourceCommit:'other',slot:{containerId:'other'}};assert.equal(judge(id,xs,binding).status,'NOT-ESTABLISHED')});
 test(`${id}: absent evidence refused`,()=>assert.equal(judge(id,[],binding).status,'NOT-ESTABLISHED'));
}
const bad=(id,change)=>{const xs=fixture(id);change(xs.map(x=>x.data));assert.equal(judge(id,xs,binding).status,'NOT-ESTABLISHED')};
test('V1: tmpfs refused',()=>bad('V1',d=>d[0].mountinfo=d[0].mountinfo.replace('ext4','tmpfs')));
test('V1: nobarrier refused',()=>bad('V1',d=>d[0].mountinfo+=',nobarrier'));
test('V1: NORMAL refused',()=>bad('V1',d=>d[0].synchronous=1));
test('V1: missing busy refused',()=>assert.equal(judge('V1',fixture('V1').slice(0,1),binding).status,'NOT-ESTABLISHED'));
test('V2: visibility before sync refused',()=>bad('V2',d=>d[0].observations[0].values[5]=1));
test('V2: visibility while sync blocked on return refused',()=>bad('V2',d=>d[0].observations[1].values[99]=1));
test('V2: no final publication refused',()=>bad('V2',d=>d[0].final=0));
test('V3: 5 percent is refused',()=>bad('V3',d=>d[0].rounds[1].samples.fill(110)));
test('V3: checkpoint busy refused',()=>bad('V3',d=>d[0].rounds[0].checkpoint[0]=1));
test('V3: missing observer refused',()=>assert.equal(judge('V3',fixture('V3').slice(0,1),binding).status,'NOT-ESTABLISHED'));
test('V4: namespace mismatch refused',()=>bad('V4',d=>d[0].domain={...domain,timeNs:456}));
test('V4: peer clock outside ping refused',()=>bad('V4',d=>d[1].samples[0].peer=999999));
test('V4: slow pipe refused',()=>bad('V4',d=>d[1].samples.forEach(s=>{s.rtt=60000;s.end=160000})));
test('V5: unrelated inode event refused',()=>bad('V5',d=>d[0].expectedWd=3));
test('V5: old file bytes refused',()=>bad('V5',d=>d[0].bytes='old'));
test('V6: missing reader refused',()=>bad('V6',d=>d[0].counts.pop()));
test('V6: engine not saturated refused',()=>bad('V6',d=>d[0].engineCores=.2));
test('V6: relay saturated refused',()=>bad('V6',d=>d[1].relayCores=1));
test('V6: capture penalty refused',()=>bad('V6',d=>d[1].elapsedNs='40000000000'));
test('V6: unverified capture refused',()=>bad('V6',d=>d[1].captureVerified=false));
test('V7: synthetic role memory never establishes actual layout',()=>assert.equal(judge('V7',fixture('V7'),binding).status,'NOT-ESTABLISHED'));
test('quantile: invalid values refused',()=>{for(const xs of [[],[-1],[NaN],[Infinity]])assert.throws(()=>quantile(xs,.99))});
test('capturing relay preserves bytes and dense authenticated chain',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'g03-relay-')),key='ab'.repeat(32),attempt='offline-relay';let child;
 const upstream=http.createServer((req,res)=>{req.resume();req.on('end',()=>res.end('exact-answer'))});await new Promise(r=>upstream.listen(0,'127.0.0.1',r));
 const socket=net.createServer();await new Promise(r=>socket.listen(0,'127.0.0.1',r));const port=socket.address().port;await new Promise(r=>socket.close(r));
 try{
 child=spawn(process.execPath,[path.join(import.meta.dirname,'relay.mjs'),'capture'],{env:{...process.env,PROBE_ROOT:root,PROBE_PORT:String(port),PROBE_UPSTREAM:`127.0.0.1:${upstream.address().port}`,PROBE_CAPTURE_KEY:key,PROBE_ATTEMPT:attempt},stdio:['ignore','pipe','pipe']});
 const exited=once(child,'exit');const end=Date.now()+10000;while(!fs.existsSync(path.join(root,'relay-ready'))){if(Date.now()>end)throw Error('relay readiness timeout');await new Promise(r=>setTimeout(r,10))}
 const result=await fetch(`http://127.0.0.1:${port}`,{method:'POST',body:'exact-request',headers:{Connection:'close'}});assert.equal(await result.text(),'exact-answer');fs.writeFileSync(path.join(root,'stop'),attempt);assert.equal((await exited)[0],0);
 let prev='0'.repeat(64),seq=0,up='',down='';for(const line of fs.readFileSync(path.join(root,'capture.ndjson'),'utf8').trim().split('\n')){const {record,hmac}=JSON.parse(line);assert.equal(record.attempt,attempt);assert.equal(record.seq,seq++);assert.equal(record.prev,prev);assert.equal(hmac,createHmac('sha256',Buffer.from(key,'hex')).update(JSON.stringify(record)).digest('hex'));prev=hmac;const bytes=Buffer.from(record.base64,'base64').toString();if(record.direction==='up')up+=bytes;else down+=bytes;}assert.match(up,/exact-request/);assert.match(down,/exact-answer/);assert.ok(seq>=2);
 }finally{child?.kill();await new Promise(r=>upstream.close(r));fs.rmSync(root,{recursive:true,force:true})}
});

test('V6: absent CPU bytes refused',()=>bad('V6',d=>{delete d[0].engineCores}));
test('V1: different device cache refused',()=>bad('V1',d=>d[0].device='9:9'));
