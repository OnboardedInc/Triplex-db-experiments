// [EXP-G03-R6] Why: only this evaluator-owned state machine decides injection and retains witnesses. Rejected: candidate-reported crash success or a driver-visible crash schedule (Q103b).
import {createHash,randomUUID} from 'node:crypto';
export const FAULT_POINTS=Object.freeze(['before-effect','after-effect','after-checkpoint']);
const hash=b=>createHash('sha256').update(b).digest('hex');
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const refuse=code=>{throw Error(code)};
const id=s=>typeof s==='string'&&/^[0-9a-f]{64}$/.test(s);
export function targetOk(t,role){return t?.role===role&&id(t.id)&&typeof t.name==='string'&&!!t.name&&typeof t.volume==='string'&&!!t.volume;}
export class FaultInjector {
 constructor({binding,target,obligation='NS.P3',caseId='NS-P3-CRASH',mode='normal',transport,decide=()=>false,retain,points=FAULT_POINTS,pageBounds,clock=()=>process.hrtime.bigint()}){
  if(!binding?.runId||!id(binding.sourceSha256)||!id(binding.inputsSha256)||!binding.slot||!/^[a-f0-9]{40}$/.test(binding.sourceCommit??'')||!/^[a-f0-9]{40}$/.test(binding.evaluatorCommit??''))refuse('FAULT-BINDING-MISSING');
  const role=obligation==='NS.P3'?'consumer':obligation==='C2'?'broker':null;
  if(!role||!targetOk(target,role)||!retain)refuse('CRASH-TARGET-MISMATCH');
  if(!Array.isArray(points)||!points.length||new Set(points).size!==points.length||points.some(p=>typeof p!=='string'||!p))refuse('FAULT-POINTS-MISSING');
  if(role==='consumer'&&!equal(points,FAULT_POINTS))refuse('CRASH-TARGET-MISMATCH');
  this.points=[...points];this.pageBounds=pageBounds;this.binding=structuredClone(binding);this.target=structuredClone(target);this.role=role;this.transport=transport;this.decide=decide;this.retain=retain;this.clock=clock;this.obligation=obligation;this.caseId=caseId;this.mode=mode;this.seen=new Set();this.witnesses=[];this.counts=Object.fromEntries(this.points.map(p=>[p,0]));this.busy=false;this.failed=false;this.handshakes=0;
 }
 async handshake(message){
  if(this.busy||this.failed)refuse('FAULT-SESSION-NOT-READY');this.busy=true;
  try{return await this.perform(message)}catch(e){this.failed=true;const bytes=Buffer.from(JSON.stringify({schema:'ns-fault-refusal/1',binding:this.binding,target:this.target,error:String(e.message),qualification:false}));if(await this.retain(bytes)!==hash(bytes))throw Error('FAULT-RETAIN-MISMATCH');throw e}finally{this.busy=false}
 }
 async perform({schema,binding,event}){
  if(schema!=='ns-control/1'||!equal(binding,this.binding)||event?.event!=='at-point'||!this.points.includes(event.point)||event.role!==this.role||typeof event.nonce!=='string'||!event.nonce||event.nonce.length>128||this.seen.has(event.nonce)||!Number.isSafeInteger(event.page)||event.page<0||!event.cursor)refuse('FAULT-NOT-EXERCISED');
  this.seen.add(event.nonce);this.handshakes++;
  const inject=await this.decide(structuredClone(event));
  if(typeof inject!=='boolean')refuse('FAULT-DECISION-INVALID');
  if(!inject)return {schema:'ns-release/1',runId:binding.runId,nonce:event.nonce,restart:false};
  const target=structuredClone(this.target),attempt=randomUUID(),started=this.clock();
  const context={binding:this.binding,target,attempt,hook:event};
  const paused=await this.transport.pause(context);
  if(paused?.id!==target.id||paused.paused!==true)refuse('ISOLATION-NOT-IN-FORCE: pause proof');
  const snapshot=async phase=>{
   const bytes=await this.transport.snapshot({...context,phase});
   if(!Buffer.isBuffer(bytes)||bytes.length>16*1024*1024)refuse('FAULT-SNAPSHOT-INVALID');
   const d=JSON.parse(bytes);
   if(d.schema!=='ns-dr/1'||d.attempt!==attempt||d.phase!==phase||!equal(d.binding,this.binding)||d.targetId!==target.id||d.volume!==target.volume||!Number.isSafeInteger(d.checkpoint)||d.checkpoint<0||!Array.isArray(d.effects)||typeof d.observedAtNs!=='string'||!/^\d+$/.test(d.observedAtNs)||!Number.isSafeInteger(d.walBytes)||d.walBytes<0||typeof d.walBase64!=='string'||Buffer.from(d.walBase64,'base64').length!==d.walBytes||hash(Buffer.from(d.walBase64,'base64'))!==d.walSha256||!Number.isSafeInteger(d.frontier)||d.frontier<0||!Number.isSafeInteger(d.rowCount)||d.rowCount!==d.effects.length)refuse('FAULT-SNAPSHOT-INVALID');
   const digest=hash(bytes);if(await this.retain(bytes)!==digest)refuse('FAULT-RETAIN-MISMATCH');return {sha256:digest,observation:d};
  };
  const before=await snapshot('paused');
  const bounds=await this.pageBounds?.(event);
  if(!bounds||!Number.isSafeInteger(bounds.before)||!Number.isSafeInteger(bounds.after)||bounds.before>bounds.after)refuse('FAULT-PAGE-BOUNDARY-MISSING');
  const checkpoint=before.observation.checkpoint;
  if(this.role==='consumer'&&checkpoint!==(event.point==='after-checkpoint'?bounds.after:bounds.before))refuse('FAULT-POINT-DR-CONTRADICTION');
  const kill=await this.transport.kill(context);
  if(kill?.id!==target.id||kill.removed!==target.name||kill.signal!=='SIGKILL'||kill.cgroupGone!==true||kill.attempt!==attempt||!/^\d+$/.test(kill.observedAtNs??'')||BigInt(kill.observedAtNs)<BigInt(before.observation.observedAtNs))refuse('ISOLATION-NOT-IN-FORCE: kill proof');
  // [EXP-G03-R6] Why: recreating only after the proof prevents simultaneous consumers of one checkpoint. Rejected: trusting exit code or restarting on a clean volume (hides replay defects).
  const restarted=await this.transport.restart(context);
  if(!targetOk(restarted,this.role)||restarted.id===target.id||restarted.volume!==target.volume)refuse('CRASH-TARGET-MISMATCH');
  this.target=structuredClone(restarted);
  const recovery=await this.transport.recover({...context,restarted});
  const after=await snapshot('recovered');
  if(BigInt(after.observation.observedAtNs)<BigInt(kill.observedAtNs))refuse('FAULT-CLOCK-INVALID');
  if(!recovery||!id(recovery.expectedReplaySha256)||!id(recovery.actualReplaySha256)||!Array.isArray(recovery.caseResults)||!Number.isSafeInteger(recovery.retries)||recovery.retries<1||recovery.checkpoint!==after.observation.checkpoint||recovery.actualReplaySha256!==hash(Buffer.from(JSON.stringify(after.observation.effects))))refuse('FAULT-RECOVERY-MISSING');
  const transitionEvents=[{transition:this.role+'-paused',t:before.observation.observedAtNs,durableEvidenceObject:before.sha256},{transition:'cgroup-gone',t:kill.observedAtNs,proof:kill},{transition:'recovered',t:after.observation.observedAtNs,durableEvidenceObject:after.sha256,restarted}];
  const detail={schema:'ns-fault-events/1',binding:this.binding,attempt,target,hook:event,transitionEvents,callerOutcome:'connection-lost',retries:recovery.retries,postRecoveryCaseResults:recovery.caseResults,replay:{expectedSha256:recovery.expectedReplaySha256,actualSha256:recovery.actualReplaySha256,equal:recovery.expectedReplaySha256===recovery.actualReplaySha256},qualification:false};
  const raw=Buffer.from(JSON.stringify(detail)),eventsSha256=hash(raw);if(await this.retain(raw)!==eventsSha256)refuse('FAULT-RETAIN-MISMATCH');
  const witness={schema:'fault-witness/1',obligation:this.obligation,case:this.caseId,mode:this.mode,rep:++this.counts[event.point],faultPointId:event.point,injectedAt:Number(before.observation.observedAtNs),lastWitnessedTransition:'recovered',eventsSha256};
  if(!Number.isSafeInteger(witness.injectedAt)||this.clock()<started)refuse('FAULT-CLOCK-INVALID');
  const wraw=Buffer.from(JSON.stringify(witness));if(await this.retain(wraw)!==hash(wraw))refuse('FAULT-RETAIN-MISMATCH');this.witnesses.push(witness);
  return {schema:'ns-release/1',runId:binding.runId,nonce:event.nonce,restart:true,endpoint:restarted.endpoint};
 }
 finish({requireInjections=false,reps=3}={}){
  if(!Number.isSafeInteger(reps)||reps<3||this.failed||this.busy||!this.handshakes||requireInjections&&this.points.some(p=>this.counts[p]<reps))refuse('FAULT-NOT-EXERCISED');
  return {status:'DIAGNOSTIC',qualification:false,handshakes:this.handshakes,counts:{...this.counts},witnesses:[...this.witnesses]};
 }
}
