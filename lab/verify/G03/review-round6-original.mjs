// [CX-VG03-56] Why: probe exact reviewed modules with trusted offline data. Rejected: modifying the runner or presenting stubs as VM observations.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHmac,createHash} from 'node:crypto';
import {verifyObserver,verifyHr,checkSmoke} from '../../bin/ns-run.mjs';
import {canonicalAnswer,readEvidence} from '../../bench/ns-driver/answer.mjs';
import {hookedPage} from '../../bench/ns-driver/fault.mjs';
import {FaultInjector,FAULT_POINTS} from '../../bin/ns-fault.mjs';
import {BOX_ENV,profileProblems} from '../../bin/box.mjs';
import {layoutProblems} from '../../bin/ns-policy.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const results=[];
const record=(name,data)=>results.push({name,...data});
const key=Buffer.alloc(32,7),binding={runId:'CX-VG03-56-offline',sourceCommit:'a'.repeat(40),evaluatorCommit:'b'.repeat(40),sourceSha256:'c'.repeat(64),inputsSha256:'d'.repeat(64),driverBundleSha256:'e'.repeat(64),slot:'OFFLINE-SYNTHETIC'};

// [CX-VG03-56] Why: the final durable readback is consumed by checkSmoke but is outside the authenticated poll stream. Rejected: changing signed bytes or supplying a new key.
const raw=JSON.stringify({schema:'ns-observer/1',runId:binding.runId,sequence:0,previous:'0'.repeat(64),polls:[]});
const hmac=createHmac('sha256',key).update(raw).digest('hex');
const seal={schema:'ns-observer-seal/1',runId:binding.runId,chunks:1,head:hmac,final:{consumer:{marker:0,entries:[]}},periodNs:[500000]};
const observer=new Map([['polls.ndjson',Buffer.from(JSON.stringify({raw,hmac})+'\n')],['seal.json',Buffer.from(JSON.stringify(seal))]]);
verifyObserver(observer,key,binding.runId);
seal.final.consumer={marker:123,entries:[[123,'fabricated-final-effect',999]]};seal.periodNs=[1];
observer.set('seal.json',Buffer.from(JSON.stringify(seal)));
assert.deepEqual(verifyObserver(observer,key,binding.runId).seal.final.consumer,seal.final.consumer);
record('F1 modified final DR and period accepted',{reproduced:true,pollBytesUnchanged:true,keyUnchanged:true,acceptedFinal:seal.final,acceptedPeriods:seal.periodNs});
const domain={bootId:'7a064e31-8ca0-47a5-926f-d2de8d786302',primitive:'CLOCK_MONOTONIC',offsets:{monotonic:['0','0'],boottime:['0','0']}};
const trace=[{command:{id:'one',subject:'subject-0',value:7}}];
const diagnosticEvents=[{kind:'driver-runtime',data:{permissionModel:true,bundleSha256:binding.driverBundleSha256}},{kind:'offer',data:{command:trace[0].command,response:{commandId:'one',status:'committed',receipt:{position:'1'}},sentAtNs:'10',ackAtNs:'20'}},{kind:'ryow',data:{request:{subject:'subject-0',basis:'1'},answerSha256:hash(Buffer.from(canonicalAnswer({subject:'subject-0',value:7,basis:'1'})))}},{kind:'end',data:{error:null}}].map(e=>({...e,domain}));
seal.domain=domain;seal.final={source:{marker:1,subjects:[['subject-0',7]],entries:[[1,'subject-0',7]]},consumer:{marker:0,entries:[]}};
observer.set('seal.json',Buffer.from(JSON.stringify(seal)));
assert.throws(()=>checkSmoke(diagnosticEvents,verifyObserver(observer,key,binding.runId),trace,1,binding),/frontier/);
seal.final.consumer={marker:1,entries:[[1,'subject-0',7]]};observer.set('seal.json',Buffer.from(JSON.stringify(seal)));
assert.equal(checkSmoke(diagnosticEvents,verifyObserver(observer,key,binding.runId),trace,1,binding).status,'DIAGNOSTIC');
record('F1 failed consumer becomes accepted fixture consistency',{reproduced:true,onlyFinalReadbackChanged:true,qualification:false});

// [CX-VG03-56] Why: mutate a signed event to contrast the unauthenticated final readback with the actual HR integrity control. Rejected: equating whitespace with changed measurement content.
const body={schema:'ns-hr/1',binding,sequence:0,previous:'0'.repeat(64),events:[{kind:'end',data:{error:null}}]};
const hrmac=createHmac('sha256',key).update(JSON.stringify(body)).digest('hex');
const hr=new Map([['events/00000000.json',Buffer.from(JSON.stringify({...body,hmac:hrmac}))],['events/seal.json',Buffer.from(JSON.stringify({binding,chunks:1,head:hrmac}))]]);
assert.equal(verifyHr(hr,key,binding).length,1);
hr.set('events/00000000.json',Buffer.from(JSON.stringify({...body,events:[{kind:'end',data:{error:'changed'}}],hmac:hrmac})));
assert.throws(()=>verifyHr(hr,key,binding),/content\/binding/);
record('HR semantic mutation',{refused:true});

// [CX-VG03-56] Why: evaluate exact driver source with trusted dependency stubs to isolate its exception-to-seal path. Rejected: launching candidate/provider code on the host or treating the stub as live isolation evidence.
const rows=[];let savedSeal,pendingControl,hookIndex=0,handshakes=0;
const driverPath=new URL('../../bench/ns-driver/driver.mjs',import.meta.url);
const source=fs.readFileSync(driverPath,'utf8');
const mainInjector=new FaultInjector({binding,target:{role:'consumer',name:'offline-main',id:'1'.repeat(64),volume:'offline-state'},retain:async b=>hash(b)});
const fakeProcess={permission:{has:()=>false},hrtime:process.hrtime,argv:[],stdin:{},stdout:{write(line){const message=JSON.parse(line);handshakes++;mainInjector.handshake(message).then(pendingControl)}}};
const context=vm.createContext({process:fakeProcess,Buffer,console,setTimeout,clearTimeout});
vm.runInContext("globalThis[Symbol.for('ns-driver-runtime/1')]={bundleSha256:'"+binding.driverBundleSha256+"'}",context);
const exportsByModule={
 '../lib/trace.ts':{generateTrace(){},traceDigest(){}},
 './p3.mjs':{auditP3(){},lagSample(){},distribution(){}},
 'node:fs':{default:{readFileSync:()=>key,writeFileSync:(p,b)=>savedSeal=JSON.parse(b)}},
 'node:path':{default:{join:(...p)=>p.join('/'),resolve:p=>p}},
 './answer.mjs':{canonicalAnswer,readEvidence},
 'node:perf_hooks':{monitorEventLoopDelay:()=>({enable(){},disable(){},max:0,percentile:()=>0})},
 './rpc.mjs':{rpc:async(endpoint,run,method,params,timeout,observe)=>{
  if(method==='commit'){const response={commandId:params.command.id,status:'committed',receipt:{position:'1'}};observe?.(Buffer.from(JSON.stringify(response)));return response}
  if(method==='pull'){const answer={subject:params.request.subject,value:7,basis:params.request.basis};observe?.(Buffer.from(JSON.stringify(answer)));return answer}
  if(params.action==='start')return {};if(params.action==='step')hookIndex=0;else hookIndex++;if(hookIndex===3)throw Error('OFFLINE-PLANTED-HOOK-FAILURE');return {hook:{event:'at-point',role:'consumer',point:FAULT_POINTS[hookIndex],page:0,cursor:{after:0}}}
 }},
 './clock.mjs':{now:()=>String(process.hrtime.bigint())},
 './fault.mjs':{ControlInput:class {next(){return new Promise(resolve=>pendingControl=resolve)}close(){}},hookedPage},
 './events.mjs':{Events:class {constructor(dir,k,b){this.binding=b}write(kind,data){rows.push({kind,data,domain})}seal(){return {rows}}}},
};
const driver=new vm.SourceTextModule(source,{context,identifier:driverPath.href});
await driver.link(async spec=>{const values=exportsByModule[spec];assert.ok(values,'unexpected dependency '+spec);return new vm.SyntheticModule(Object.keys(values),function(){for(const [k,v]of Object.entries(values))this.setExport(k,v)},{context})});
await driver.evaluate();
await assert.rejects(driver.namespace.runNS({offline:true,readers:0,output:'offline',keyFile:'offline',binding,trace:trace.map(o=>({...o,atMs:0})),endpoints:{consumer:{},broker:{},readers:{}}}),/OFFLINE-PLANTED-HOOK-FAILURE/);
assert.equal(rows.at(-1).kind,'end');assert.equal(rows.at(-1).data.error,null);assert.ok(savedSeal);
assert.equal(handshakes,3);assert.equal(mainInjector.finish().handshakes,3);
assert.equal(checkSmoke(rows,verifyObserver(observer,key,binding.runId),trace,1,binding).status,'DIAGNOSTIC');
record('F2 hook exception seals clean end',{reproduced:true,end:rows.at(-1),handshakesAcceptedByRealInjector:handshakes,actualDriverRowsPassCheckSmoke:true,sourceSha256:hash(source),stubbedDependencies:true,realHookedPage:true,coordinatorExitGuard:'manual inspection: ns-run.mjs:115-131 records result.status but never rejects it'});

const target={role:'consumer',name:'offline-consumer',id:'1'.repeat(64),volume:'offline-state'};
for(const [name,kill]of [['missing proof',{}],['wrong target',{id:'2'.repeat(64),removed:target.name,signal:'SIGKILL',cgroupGone:true}]]){
 let lifecycle=[];
 const injector=new FaultInjector({binding,target,caseIds:Object.fromEntries(FAULT_POINTS.map(p=>[p,'case-'+p])),decide:()=>true,pageBounds:()=>({before:0,after:1}),retain:async b=>hash(b),transport:{pause:async()=>{lifecycle.push('pause');return {id:target.id,paused:true}},snapshot:async c=>Buffer.from(JSON.stringify({schema:'ns-dr/1',binding,attempt:c.attempt,phase:c.phase,targetId:target.id,volume:target.volume,checkpoint:0,effects:[],rowCount:0,frontier:0,walBytes:0,walBase64:'',walSha256:hash(Buffer.alloc(0)),observedAtNs:'100'})),kill:async c=>{lifecycle.push('kill');return {...kill,attempt:c.attempt,observedAtNs:'101'}},restart:async()=>{lifecycle.push('restart');return target}}});
 await assert.rejects(injector.handshake({schema:'ns-control/1',binding,event:{event:'at-point',role:'consumer',point:'before-effect',page:0,cursor:{after:0},nonce:name}}),/kill proof/);
 assert.equal(injector.witnesses.length,0);assert.ok(!lifecycle.includes('restart'));record(name,{refused:true,witnesses:0});
}
assert.throws(()=>new FaultInjector({binding,target:{...target,role:'broker'},retain:async b=>hash(b)}),/CRASH-TARGET-MISMATCH/);
record('NS.P3 broker target',{refused:true});
const expected={image:'sha256:offline',network:'arm',memory:134217728,pids:256,mounts:[],env:[]};
const inspect={Image:expected.image,Config:{User:'10001:10001',Hostname:'tx2-box',Env:BOX_ENV},Mounts:[],HostConfig:{Privileged:false,ReadonlyRootfs:true,PidMode:'',IpcMode:'private',NetworkMode:'arm',CapDrop:['ALL'],CapAdd:[],SecurityOpt:['no-new-privileges=true'],Devices:[],Memory:expected.memory,MemorySwap:expected.memory,PidsLimit:256,OomScoreAdj:500,NanoCpus:1e9,Tmpfs:{'/tmp':'rw,nosuid,nodev,size=1g,mode=1777'},RestartPolicy:{Name:'no'},LogConfig:{Config:{'max-size':'1m','max-file':'1'}}}};
assert.deepEqual(profileProblems(inspect,expected),[]);inspect.HostConfig.CapAdd=['SYS_ADMIN'];assert.ok(profileProblems(inspect,expected).includes('privileges'));
record('added capability',{refused:true});
const volumes={network:'arm',broker:'broker-state',consumer:'consumer-state',output:'driver-output',observer:'observer-output',trace:'frozen-trace',key:'run-key',bundle:'driver-bundle'};
for(const foreign of ['driver-output','consumer-state','frozen-trace','run-key']){
 const roles=['broker','readers','consumer','driver','observer'].map(role=>({role,inspect:{Mounts:role==='broker'?[{Name:foreign,RW:false}]:[],NetworkSettings:{Networks:{[role==='observer'?'none':'arm']:{}}}}}));
 assert.ok(layoutProblems(roles,volumes).includes('broker: foreign private volume'));record('foreign mount '+foreign,{refused:true});
}
console.log(JSON.stringify({review:'CX-VG03-56',sourceCommit:'95b0593cbea843217d03bd7cbe943519fd2e1346',scope:'trusted offline reproductions; no engine or qualification',results},null,2));
