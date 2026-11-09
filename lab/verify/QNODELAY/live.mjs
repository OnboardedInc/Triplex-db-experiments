// [CX-VQNODELAY] Why: nonce-bound small sequential SELECTs count real client connections on the resident.
// Rejected: interpreting a shared delta-only timing as P1/P4 qualification or changing the engine.
import net from 'node:net';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { makeQleverClient } from '../../../packages/qlever/src/QleverClient.ts';
import { inspect, listTx2Containers, loadSlots, slotInfo, readOwner } from '../../bin/lib.mjs';
import { delay, start, finish, sha, fds } from './common.mjs';
const output=process.argv[2];
if (!output || fs.existsSync(output)) throw Error('new durable attempt directory required');
assert.equal(process.env.DOCKER_HOST,'unix:///Users/sam/.colima/triplex2/docker.sock');
const slot=slotInfo(loadSlots(),'qlever','dev');
assert.equal(slot.endpoint,'http://127.0.0.1:7070');
const identity=()=>{
  const c=inspect(slot.container);
  assert(c?.State.Running && c.Config.Labels?.['tx2.managed-by']==='lab/bin/engine.mjs');
  return {container:c.Id,startedAt:c.State.StartedAt,image:c.Image,config:c.Config.Labels['tx2.config-sha256'],owner:readOwner(slot),endpoint:slot.endpoint,coRunning:listTx2Containers()};
};
const report={...start(['lab/verify/QNODELAY/live.mjs','lab/bin/lib.mjs','lab/config/slots.json']),classification:'DIAGNOSTIC Q91a; small sequential read-only probes, no load qualification',before:identity(),baseTriples:null,deltaTriples:null,touchedBlockDelta:null,samples:[],cells:[],descriptors:[],connections:[]};
fs.mkdirSync(output,{recursive:true});
fs.writeFileSync(path.join(output,'start.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
const connect=net.Socket.prototype.connect;
const tracked=new Map();
let activeCell;
net.Socket.prototype.connect=function(...args){
  const socket=connect.apply(this,args);
  this.once('connect',()=>{
    if(this.remotePort!==7070)return;
    const r={id:report.connections.length+1,cell:activeCell,localPort:this.localPort,remotePort:this.remotePort,openedAt:new Date().toISOString(),closedAt:null};
    tracked.set(this,r);report.connections.push(r);
    this.once('close',()=>r.closedAt=new Date().toISOString());
  });
  return socket;
};
const stats=xs=>{const a=[...xs].sort((a,b)=>a-b);return{n:a.length,p50:a[Math.ceil(a.length*.5)-1],p99:a[Math.ceil(a.length*.99)-1],stalls:a.filter(x=>x>=35).length};};
try {
  for(const [round,mode] of ['keep-alive','per-request','per-request','keep-alive','per-request'].entries()) {
    const client=makeQleverClient(slot.endpoint,{connectionMode:mode});
    try {
      for(const size of (round===4?[16]:[16,2048])) {
        const cell=`${round}/${mode}/${size}`, n=round===4?1024:64;
        activeCell=cell;
        const times=[], countBefore=report.connections.length;
        for(let i=-4;i<n;i++) {
          const nonce=`${report.id}/${cell}/${i}`,payload='v'.repeat(size);
          const sparql=`SELECT ?nonce ?payload WHERE { BIND(${JSON.stringify(nonce)} AS ?nonce) BIND(${JSON.stringify(payload)} AS ?payload) }`;
          const t=performance.now();
          const rows=await client.query(sparql,{queryId:`vq-${nonce}`,timeoutMs:10000});
          const ms=performance.now()-t;
          const expected=[{nonce:{type:'literal',value:nonce},payload:{type:'literal',value:payload}}];
          assert.deepEqual(rows,expected);
          report.samples.push({cell,mode,size,i,warmup:i<0,ms,nonce,decodedBindingBytes:JSON.stringify(rows),sha256:sha(JSON.stringify(rows))});
          if(i>=0)times.push(ms);
          if(round===4 && (i+1)%128===0) {await delay(5);report.descriptors.push({cell,n:i+1,...fds(),openTargetSockets:[...tracked.values()].filter(r=>!r.closedAt).length});}
        }
        await delay(100);
        const created=report.connections.length-countBefore;
        if(mode==='per-request')assert.equal(created,n+4);
        report.cells.push({cell,mode,size,...stats(times),created,openCreated:report.connections.slice(countBefore).filter(r=>!r.closedAt).length});
      }
    } finally {await client.close();}
  }
  report.after=identity();
  assert.equal(report.before.container,report.after.container);
  assert.equal(report.before.startedAt,report.after.startedAt);
  await delay(1000);
  report.openAtEnd=report.connections.filter(r=>!r.closedAt);
  assert(report.openAtEnd.every(r=>r.cell.includes('keep-alive')));
  const ds=report.descriptors;
  assert(ds.every(d=>d.numericDescriptors<=ds[0].numericDescriptors+2));
  report.comparison=Object.fromEntries(['keep-alive','per-request'].map(mode=>[mode,stats(report.samples.filter(s=>!s.warmup&&!s.cell.startsWith('4/')&&s.mode===mode).map(s=>s.ms))]));
  report.completedCollection=true;
} catch(e) {report.completedCollection=false;report.error=String(e);process.exitCode=1;}
finally {
  net.Socket.prototype.connect=connect;
  finish(path.join(output,'result.json'),report);
  const summary={...report,samples:undefined,connections:undefined,raw:path.join(output,'result.json'),rawSha256:sha(fs.readFileSync(path.join(output,'result.json'))),connectionCount:report.connections.length};
  fs.writeFileSync('lab/verify/QNODELAY/live-summary.json',JSON.stringify(summary,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify(summary,null,2));
}
