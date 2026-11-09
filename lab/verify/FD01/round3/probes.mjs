import './disk-guard.mjs';
import {base,subject} from './hook.mjs';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {spawn,spawnSync} from 'node:child_process';
import {createInterface} from 'node:readline';
import {once} from 'node:events';
import {Worker} from 'node:worker_threads';
import {pathToFileURL,fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const host=await import('@triplex-build/triplex-host/feed');
const core=await import('@triplex-build/triplex/feed');
const kit=await import('@triplex-build/triplex-testkit/feed');
const result={head:'731e10e4075715c65c10f2ce720de2d3dcee9b1a',base,engines:false,slot:null,checks:[],atomic:[],consumers:[]};
const source=JSON.parse(fs.readFileSync(base+'/source.json'));
const checkSources=()=>{for(const [f,h]of Object.entries(source.files))assert.equal(createHash('sha256').update(fs.readFileSync(subject+'/'+f)).digest('hex'),h,f);};
checkSources();
const rejected=(name,fn,pattern)=>{let error;try{fn();}catch(e){error=String(e);}assert.match(error,pattern);result.checks.push({name,rejected:true,error});};
const key={source:'generic/source',stream:'s',epoch:'1',position:'1'};
const clock=host.openHostFeedClock();
const participant=fileURLToPath(new URL('./participant.mjs',import.meta.url));
const children=[];
const start=async(role)=>{const p=spawn(process.execPath,[participant,role,base+'/publication.db'],{stdio:['pipe','pipe','pipe']});children.push(p);let stderr='';p.stderr.on('data',b=>stderr+=b);const lines=createInterface({input:p.stdout});const ready=await Promise.race([once(lines,'line'),once(p,'exit').then(([code])=>{throw Error('Participant failed '+code+': '+stderr);})]);assert.equal(ready[0],'ready');return{p,lines};};
const sample=async({p,lines})=>{const next=once(lines,'line');p.stdin.write('sample\n');return JSON.parse((await next)[0]);};
try{
  const producer=await start('producer');
  await new Promise(r=>setTimeout(r,250));
  const consumer=await start('consumer');
  const published=await sample(producer);
  await new Promise(r=>setTimeout(r,400));
  const known=await sample(consumer);
  const reader=host.openPublicationReader(base+'/publication.db');
  const record=host.readProducerPublication(reader,key);
  assert.deepEqual(record,published.publication);
  const lag=core.publicationLagMs(published.publication,known.known,record);
  assert.ok(lag>=350);assert.equal(lag,Number(BigInt(known.known.atNs)-BigInt(record.atNs))/1e6);
  result.crossProcess={published,known,lagMs:lag,legacyRelativeLagMs:known.relativeMs-published.relativeMs};
  const reboot=await start('reboot');
  const rebooted=await sample(reboot);
  assert.equal(rebooted.known.domain.host,known.known.domain.host);
  assert.notEqual(rebooted.known.domain.boot,known.known.domain.boot);
  assert.deepEqual(rebooted.publication,record);
  rejected('same host/new simulated boot versus original record',()=>core.publicationLagMs(record,rebooted.known,record),/clock origin/);
  result.reboot=rebooted;
  const worker=new Worker(new URL('./participant.mjs',import.meta.url),{workerData:{role:'worker',clock}});
  const workerResult=(await once(worker,'message'))[0];await once(worker,'exit');
  assert.match(workerResult.clonedClockError,/Unbound feed clock/);
  const workerLag=core.publicationLagMs(record,workerResult.known,record);assert.ok(workerLag>=350);
  result.worker={...workerResult,lagMs:workerLag};
  rejected('forged plain clock with real origin fields',()=>host.captureFeedInstant({domain:clock.domain},key),/Unbound feed clock/);
  rejected('forged origin on observation',()=>core.publicationLagMs(record,{...known.known,domain:{...known.known.domain,boot:'f'.repeat(64)}},record),/clock origin/);
  const ack=host.captureFeedInstant(clock,key);
  rejected('ACK capture has valid origin but differs from publication record',()=>core.publicationLagMs({...record,atNs:ack.atNs},ack,record),/producer record/);
  rejected('producer record belongs to another position',()=>core.publicationLagMs(record,known.known,{...record,position:'2'}),/producer record/);
  rejected('publicationId replaced with ACK identity',()=>core.publicationLagMs({...record,publicationId:'ACK'},ack,record),/producer record/);
  rejected('unbound fabricated producer reader',()=>host.readProducerPublication({get:()=>record,close:()=>{}},key),/Unbound producer/);
  reader.close();
}finally{for(const p of children)p.stdin.end();await Promise.all(children.map(p=>p.exitCode===null?once(p,'exit'):Promise.resolve()));}
// [CX-VFD01-R3] Why: retain the exact 300 ms arithmetic control independently of real elapsed samples.
// Rejected: treating a 249/250/251 scalar bar test as an end-to-end latency qualification.
const fixture={...key,domain:clock.domain,atNs:'100000000',publicationId:'fixture-pub',recordId:'fixture-digest'};
const fixtureKnown={...key,domain:clock.domain,atNs:'400000000'};
assert.equal(core.publicationLagMs(fixture,fixtureKnown,fixture),300);
const page={entries:[{kind:'commit',stream:'s',epoch:'1',offset:'1',transactions:[{positions:['1']}]}],cursor:{source:key.source,token:'1'}};
assert.deepEqual(kit.auditFeedLag([page],[fixture],[{...fixtureKnown,lagMs:300}],[fixture]),[300]);
for(const lagMs of [1,200,260])rejected('wrong '+lagMs+'ms claim for fixed 300ms interval',()=>kit.auditFeedLag([page],[fixture],[{...fixtureKnown,lagMs}],[fixture]),/Lag differs/);
const {feedLagWithinBar}=await import(pathToFileURL(subject+'/lab/bench/lib/feed-lag.ts'));
assert.deepEqual([249,250,251].map(feedLagWithinBar),[true,true,false]);result.boundary={input:[249,250,251],actual:[249,250,251].map(feedLagWithinBar)};
const before={effects:[],affected:[],checkpoint:null};
const after={effects:[{epoch:'1',position:'1',subject:'subject'}],affected:[{epoch:'1',position:'1',subject:'subject'}],checkpoint:{source:'generic/source',token:'1'}};
for(const mode of ['atomic','checkpoint-first-atomic','two-connections','checkpoint-first-split','checkpoint-deferred'])for(const point of ['after-commit','before-commit','before-effect','after-effect','after-checkpoint']){
  const file=base+'/atomic-'+mode+'-'+point+'.db';
  const child=spawnSync(process.execPath,[fileURLToPath(new URL('./atomic-child.mjs',import.meta.url)),file,mode,point],{encoding:'utf8'});assert.equal(child.status,77,child.stderr);
  const {DatabaseSync}=await import('node:sqlite');const db=new DatabaseSync(file);const cp=db.prepare('SELECT * FROM checkpoints').get();
  const snapshot={effects:db.prepare('SELECT * FROM effects').all(),affected:db.prepare('SELECT * FROM affected').all(),checkpoint:cp?{...cp}:null};db.close();
  let error;try{kit.auditConsumerAtomicity(snapshot,{before,after},point);}catch(e){error=String(e);}
  if(mode==='atomic'||mode==='checkpoint-first-atomic')assert.equal(error,undefined);
  result.atomic.push({mode,point,exit:child.status,snapshot,error});
}
for(const mode of ['two-connections','checkpoint-first-split','checkpoint-deferred'])assert.ok(result.atomic.some(r=>r.mode===mode&&r.error));
const {FeedConsumer}=await import(pathToFileURL(subject+'/lab/bench/lib/feed.ts'));
for(const mode of ['ACK-observation','different-position','forged-clock','correct-skewed-now','producer-called-at-ACK']){
  const dir=base+'/consumer-'+mode;fs.mkdirSync(dir);
  const sourceId=JSON.stringify({route:'A0-control',dir,epoch:'1'});const k={source:sourceId,stream:sourceId,epoch:'0',position:'1'};
  const writer=host.openPublicationWriter(dir+'/publications.db',sourceId,sourceId,clock);
  const pub=writer.publish(k,mode==='producer-called-at-ACK'?'ACK-rather-than-source-publication':'native-pub-1');
  const wrong=writer.publish({...k,position:'2'},'native-pub-2');
  const ack=host.captureFeedInstant(clock,k);
  const records=host.openPublicationReader(dir+'/publications.db');let c;
  const h={feedPage:async()=>{c.stop();return{next:1,transactions:[{position:1,txId:'tx1',changes:[{op:'assert',tripleId:'a1',entityId:'pl:00000000',attribute:':a',validFrom:0}]}]};},close:async()=>{}};
  c=new FeedConsumer({dir,epoch:'1',startAfter:0,now:()=>1,
    measurement:{clock:mode==='forged-clock'?{domain:clock.domain}:clock,records},
    publicationOf:mode==='ACK-observation'?()=>({...pub,atNs:ack.atNs}):mode==='different-position'?()=>wrong:undefined,
    commitOf:()=>({instant:399,ackAt:200,subject:0,subjects:[0],stamp:399000,correction:false,correctionValidFrom:null}),open:async()=>h,log:()=>{},crashes:[]});
  let error;try{await c.run();}catch(e){error=String(e);}
  const bad=['ACK-observation','different-position','forged-clock'].includes(mode);assert.equal(c.checkpoint,bad?0:1);assert.equal(c.lags.length,bad?0:1);assert.equal(!!error,bad);
  result.consumers.push({mode,error,checkpoint:c.checkpoint,lags:c.lags,publicationId:pub.publicationId});c.close();records.close();writer.close();
}
checkSources();result.sourceUnchanged=true;
fs.writeFileSync(base+'/probes.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
