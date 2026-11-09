import { readLatencyRun } from "../../lab/receipts/parse.ts";
import { latencyReceipt } from "../../lab/receipts/latency.mjs";
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile,writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadJobManifest, openContext, readState } from '../devloop/state.mjs';
import { verifyAttempt } from '../devloop/evidence.mjs';

// Recompute the documented point fixture independently of the producer model.
// Failed experiments may have correct retained answers: preserve their actual
// outcome/read errors/liveness instead of turning a rehash into acceptance.
// Inspiration/rationale: wiki/problems/load-liveness.md and the frozen seed spec.
const root=resolve(import.meta.dirname,'../..'),reference=process.argv[2],output=process.argv[3];
assert(reference&&output&&resolve(root,output).startsWith(root+'/qualification/reviews/'));
const [id,attempt]=reference.split('/'),context=await openContext(root),checked=await verifyAttempt(context,id,attempt),state=await readState(context),manifest=await loadJobManifest(context,state.jobs[id]);
const directory=resolve(root,'.devloop/jobs',id,'attempts',attempt),argv=manifest.command.argv,arg=key=>argv[argv.indexOf(key)+1],hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const canonical=value=>JSON.stringify(value,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.keys(item).sort().map(key=>[key,item[key]])):item);
const data=async path=>{assert(resolve(root,path).startsWith(root+'/'));const pin=manifest.inputs.find(pin=>pin.path===path);assert(pin);const bytes=await readFile(resolve(root,path));assert.equal(hash(bytes),pin.sha256,'Pinned independent data changed');return JSON.parse(bytes);};
const spec=await data(arg('--spec')),bundle=await data(arg('--fixture')),catalog=await data(arg('--oracle')),instance=Number(arg('--instance')),seed=bundle.instances.find(seed=>seed.index===instance);assert(seed);
const baseline=Math.ceil(spec.entities*spec.factsPerEntity/500);assert.equal(seed.baselinePosition,baseline);
const eventFile=resolve(directory,manifest.evidence.events),timingRun=manifest.queryPath.startsWith('qlever')?readLatencyRun(eventFile,{lane:manifest.queryPath,encoding:'ndjson',expectedWriter:'triplex-public-load-event/1'}).unwrap():null;
const raw=timingRun?null:await readFile(eventFile),events=timingRun?timingRun.records:raw.toString().trim().split('\n').map(JSON.parse),reads=events.filter(event=>event.type==='read'),writes=events.filter(event=>event.type==='write');
let bodies=0,currentHotAfterWrite=0,earlyFinish=0;const phases=[];
for(const event of reads){
  assert(Number.isFinite(event.startedMs)&&Number.isFinite(event.finishedMs));if(event.finishedMs<event.startedMs)earlyFinish++;
  if(event.ok!==true){if(event.expectedOverload===true)assert(manifest.profile.clients>=512&&manifest.profile.overloadPolicy==='bounded-explicit-rejection'&&String(event.error).includes('BOUNDED_DISPATCH_REJECTION'));continue;}
  const probe=event.probe,index=probe<10?probe:spec.probeEntities===11?10:10+Math.floor(((probe-10)*(spec.entities-11))/(spec.probeEntities-11));
  assert(Number.isSafeInteger(probe)&&probe>=0&&probe<spec.probeEntities);
  const position=Number(event.knownPosition),version=position-baseline;assert(Number.isSafeInteger(position)&&version>=0&&version<=spec.maximumWriterCommands);
  const expectedName=`${spec.id}:name:${index}:v${event.taskClass==='point-history'||index>=10?0:version}`,expectedRows=[[expectedName]],paramsSha256=hash(canonical({entity:`${spec.id}:entity:${index}`})),basis={scope:seed.scope,knownPosition:String(position),validAt:spec.validAt,...(event.taskClass==='point-history'?{recordedAt:seed.recordedAt}:{})};
  assert(['point-current','point-history'].includes(event.taskClass));assert.equal(event.paramsSha256,paramsSha256);assert.equal(canonical(event.basis),canonical(basis));assert.equal(event.resultSha256,hash(event.resultJson));assert.equal(canonical(JSON.parse(event.resultJson)),canonical(expectedRows));
  const oracle=catalog.entries[event.oracleKey];assert(oracle);assert.equal(oracle.expectedSha256,hash(canonical(expectedRows)));assert.equal(oracle.paramsSha256,paramsSha256);assert.equal(canonical(oracle.basis),canonical(basis));
  bodies++;if(event.taskClass==='point-current'&&index<10&&version>0)currentHotAfterWrite++;
}
for(const event of writes){
  if(event.reconciled!==true){phases.push({commandId:event.commandId,reconciled:false,error:event.error});continue;}
  assert(event.offeredMs<=event.ackMs&&event.ackMs<=event.visibleMs);
  if(event.writeStartedMs!==undefined)assert(event.offeredMs<=event.writeStartedMs&&event.writeStartedMs<=event.ackMs);
  if(event.visibilityProbeStartedMs!==undefined)assert(event.ackMs<=event.visibilityProbeStartedMs&&event.visibilityProbeStartedMs<=event.visibleMs);
  phases.push({commandId:event.commandId,offeredMs:event.offeredMs,writeStartedMs:event.writeStartedMs??null,ackMs:event.ackMs,visibilityProbeStartedMs:event.visibilityProbeStartedMs??null,visibleMs:event.visibleMs,sdkCallMs:event.writeStartedMs===undefined?null:event.ackMs-event.writeStartedMs,preSdkQueueMs:event.writeStartedMs===undefined?null:event.writeStartedMs-event.offeredMs,visibilityProbeMs:event.visibilityProbeStartedMs===undefined?null:event.visibleMs-event.visibilityProbeStartedMs,ackInsideWindow:event.ackMs<=manifest.profile.endMilliseconds,visibleInsideWindow:event.visibleMs<=manifest.profile.endMilliseconds,reconciled:true});
}
const receipt=latencyReceipt({qleverConnectionMode:timingRun?.transportMode??null,format:'triplex-independent-load-observation-rehash/1',at:new Date().toISOString(),reviewer:'duckdb-independent-verifier',reference,terminalStatus:checked.terminal.status,terminalSha256:checked.terminalSha256,rawEventsSha256:timingRun?.source.sha256??hash(raw),profile:manifest.profile,reads:{offered:reads.length,correctBodiesRecomputed:bodies,errors:reads.filter(event=>event.ok!==true&&!event.expectedOverload).length,declaredStressRejections:reads.filter(event=>event.ok!==true&&event.expectedOverload===true).length,completedInsideWindow:reads.filter(event=>event.ok===true&&event.finishedMs<=manifest.profile.endMilliseconds).length,currentHotReadsAfterCorrection:currentHotAfterWrite,finishBeforeOffer:earlyFinish},writes:phases,writerInsideWindow:{offered:writes.length,visible:phases.filter(event=>event.visibleInsideWindow).length,reconciled:phases.filter(event=>event.reconciled).length},scope:'Retained bytes, independent recipe/result/cut recomputation and declared end-to-end timestamps; no experiment status upgrade',limitations:['Failed process or read errors remain failures even when successful answers rehash correctly','This does not establish calibrated writer rate, performance gain or production latency SLA','Engine commit/index/transport phases are not independently timestamped']});
const start=manifest.profile.startMilliseconds,end=manifest.profile.endMilliseconds,seconds=(end-start)/1000;
const percentile=(values,fraction)=>[...values].sort((a,b)=>a-b)[Math.max(0,Math.ceil(values.length*fraction)-1)]??null;
receipt.timedMetrics={population:'Offers inside the fixed window; goodput requires completion inside, latency retains successful bounded-drain calls',fixedSeconds:seconds,classes:Object.fromEntries(manifest.profile.requiredClasses.map(task=>{const population=reads.filter(event=>event.taskClass===task&&event.startedMs>=start&&event.startedMs<end),success=population.filter(event=>event.ok===true),inside=success.filter(event=>event.finishedMs<=end),latencies=success.map(event=>event.finishedMs-event.startedMs);return[task,{offered:population.length,correctThroughDrain:success.length,completedInsideWindow:inside.length,goodput:inside.length/seconds,p50Ms:percentile(latencies,.5),p95Ms:percentile(latencies,.95),p99Ms:percentile(latencies,.99)}];}))};
await writeFile(resolve(root,output),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({output,reference,terminal:receipt.terminalStatus,reads:receipt.reads,writerInsideWindow:receipt.writerInsideWindow}));
