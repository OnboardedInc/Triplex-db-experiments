// [EXP-G03-R6] Why: every run relays the identical blocked-hook handshake; only private evaluator input authorizes continuation. Rejected: sending the candidate a crash flag or accepting a reported hook without waiting.
import {randomUUID} from 'node:crypto';
export class ControlInput {
 constructor(input=process.stdin){this.input=input;this.pending=null;this.bytes='';this.failure=null;input.on('data',b=>{this.bytes+=b;if(Buffer.byteLength(this.bytes)>65536)return this.fail(Error('FAULT-CONTROL-CAP'));let at;while((at=this.bytes.indexOf('\n'))>=0){const line=this.bytes.slice(0,at);this.bytes=this.bytes.slice(at+1);try{if(!this.pending)throw Error('FAULT-CONTROL-UNSOLICITED');const p=this.pending;this.pending=null;p.resolve(JSON.parse(line))}catch(e){this.fail(e)}}});input.on('end',()=>this.fail(Error('FAULT-CONTROL-CLOSED')));input.on('error',e=>this.fail(e));}
 close(){this.input.pause();this.input.unref?.();}
 fail(e){this.failure=e;if(this.pending){this.pending.reject(e);this.pending=null;}}
 next(timeoutMs){if(this.failure)return Promise.reject(this.failure);if(this.pending)return Promise.reject(Error('FAULT-CONTROL-CONCURRENT'));return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.pending=null;reject(Error('FAULT-NOT-EXERCISED'))},timeoutMs);this.pending={resolve:v=>{clearTimeout(timer);resolve(v)},reject:e=>{clearTimeout(timer);reject(e)}};});}
}
export async function hookedPage({call,events,control,relay,page=0,timeoutMs=10000,role='consumer',points=['before-effect','after-effect','after-checkpoint']}){
 const endpointByRole={};const invoke=(method,params)=>call(role,method,params,undefined,endpointByRole[role]);
 const method=role==='broker'?'brokerControl':'consumerControl';
 let nextPoint=0;let response=await invoke(method,{action:'step',data:{page}}),steps=0;
 while(response?.hook){
  if(++steps>1000)throw Error('FAULT-HOOK-CAP');
  const h=response.hook;if(h.event!=='at-point'||h.role!==role||h.point!==points[nextPoint]||h.page!==page||!h.cursor)throw Error('FAULT-NOT-EXERCISED');
  const event={...h,nonce:randomUUID()};const waiting=control.next(timeoutMs);relay(events,event);
  const release=await waiting;
  if(release.schema!=='ns-release/1'||release.runId!==events.binding.runId||release.nonce!==event.nonce||typeof release.restart!=='boolean')throw Error('FAULT-CONTROL-BINDING');
  // [EXP-G03-R6] Why: replacement endpoints are private evaluator input. Rejected: forwarding a schedule or kill decision to candidate RPC.
  if(release.restart){if(!release.endpoint)throw Error('FAULT-RESTART-ENDPOINT');endpointByRole[role]=release.endpoint;nextPoint=0;response=await invoke(method,{action:'step',data:{page}});}
  else {nextPoint++;response=await invoke(method,{action:'release',data:{page,point:h.point}});}
 }
 if(steps===0||nextPoint!==points.length)throw Error('FAULT-NOT-EXERCISED');
 return response;
}
