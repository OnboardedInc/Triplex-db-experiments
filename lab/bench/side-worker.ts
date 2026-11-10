import { parentPort as port, workerData as cfg } from 'node:worker_threads';
import { performance } from 'node:perf_hooks';
import path from 'node:path';
import { FeedConsumer, openHostFeedClock, openPublicationReader } from './lib/feed.ts';
import { openComposition } from './lib/composition.ts';
import { ids } from './lib/world.ts';
import { observe } from './lib/observe.ts';
const now = () => performance.timeOrigin + performance.now();
const commits = new Map();
const reader = cfg.publication ? openPublicationReader(path.join(cfg.dir,'publication.db')) : null;
const open = () => openComposition(cfg.composition,cfg.lane,cfg.scope);
// [DX-H4] Why: feed decoding, fsync and verification must not queue writer offers.
// Rejected: disabling these checks or subtracting their CPU time from writer latency.
const feed = new FeedConsumer({...cfg, now, commitOf:p=>commits.get(p), open,
  ...(reader ? {measurement:{clock:openHostFeedClock(),records:reader}} : {}),
  log:line=>port!.postMessage({type:'log',line})});
const aux = await open();
let elu = performance.eventLoopUtilization();
const timer = setInterval(()=>{
 const next=performance.eventLoopUtilization();
 port!.postMessage({type:'progress',checkpoint:feed.checkpoint,elu:performance.eventLoopUtilization(next,elu).utilization,t:now()});
 elu=next;
},1000);
function snapshot() {
 return {checkpoint:feed.checkpoint,counts:feed.counts,firstSeen:feed.firstSeen,lags:feed.lags,
  crashes:feed.crashReport(),duplicates:feed.visibleDuplicateEffects()};
}
port!.on('message',async m=>{
 try {
  if(m.type==='ack') {commits.set(m.position,m.info);feed.ackArrived(m.position);}
  if(m.type==='target') feed.lifeMaxTarget=m.target;
  if(m.type==='stop') feed.stop();
  if(m.type==='replay') {
   const handle=await open();
   try {port!.postMessage({type:'reply',id:m.id,value:await feed.replayCheck(handle,m.from)});}
   finally {await handle.close();}
  }
  if(m.type==='ryow') {
   const {subject,receipt,basis,start}=m;
   const t=performance.now();
   let row;
   try {
    const pr=await aux.pull(ids.placement(subject),basis);const o=observe(pr);
    row=[-1,subject,basis.recordedAt,basis.validAt,start,now()-start,o.stamp,o.facts,o.digest,o.bytes,pr.depth,pr.roundTrips,null,0,receipt.position,0,-1,0,pr.route,pr.language,pr.waitedMs];
   } catch(error:any) {row=[-1,subject,basis.recordedAt,basis.validAt,start,now()-start,-1,0,'',0,0,0,String(error?._tag??'Error'),0,receipt.position,0,-1,0,'error','',0];}
   port!.postMessage({type:'reply',id:m.id,value:row});
  }
 } catch(e) {port!.postMessage({type:'reply',id:m.id,error:String(e)});}
});
port!.postMessage({type:'ready'});
try {await feed.run();port!.postMessage({type:'done',snapshot:snapshot()});}
catch(e) {port!.postMessage({type:'done',snapshot:snapshot(),error:String(e)});}
finally {clearInterval(timer);}
