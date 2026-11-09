// [EXP-G03-R5] Why: stage each NS role separately and export bytes only after proven removal. Rejected: a monolithic Mac bench, shared writable state or acceptance from self-reported metrics.
import fs from 'node:fs';import path from 'node:path';import {spawnSync} from 'node:child_process';import {randomBytes,createHmac} from 'node:crypto';import {isDeepStrictEqual} from 'node:util';
import {docker,dockerArgs,inspect,sha256} from './lib.mjs';import {canonicalAnswer} from '../bench/ns-driver/answer.mjs';
import {FaultInjector} from './ns-fault.mjs';
import {boxedFaultTransport,snapshotScript} from './ns-fault-box.mjs';
import {sameClock,layoutProblems,checkNsPreflight,VM_DURABILITY} from './ns-policy.mjs';
export function seedRpcScript(endpoint,runId,population){
return `const net=require('net');const s=net.connect(${JSON.stringify(endpoint)},()=>s.end(JSON.stringify({schema:'ns-sut/1',runId:${JSON.stringify(runId)},id:'seed',method:'commit',params:{command:{kind:'seed',population:${population}}}})+String.fromCharCode(10)));let b='';s.on('data',x=>b+=x);s.on('end',()=>{const v=JSON.parse(b);if(!v.ok||v.result.seeded!==${population})process.exit(2);console.log(b)});s.on('error',()=>process.exit(2));`;
}
export function verifyHr(files,key,binding){
 const seal=JSON.parse(files.get('events/seal.json')),chunks=[...files.keys()].filter(n=>/^events\/\d{8}\.json$/.test(n)).sort();let head='0'.repeat(64),events=[];
 if(!chunks.length||chunks.length!==seal.chunks||JSON.stringify(seal.binding)!==JSON.stringify(binding))throw Error('driver seal binding/count');
 for(let i=0;i<chunks.length;i++){const row=JSON.parse(files.get(chunks[i])),{hmac,...body}=row;
  if(row.schema!=='ns-hr/1'||row.sequence!==i||row.previous!==head||JSON.stringify(row.binding)!==JSON.stringify(binding)||createHmac('sha256',key).update(JSON.stringify(body)).digest('hex')!==hmac)throw Error('driver chunk content/binding');head=hmac;events.push(...row.events);}
 if(head!==seal.head||events.filter(e=>e.kind==='end').length!==1||events.at(-1).kind!=='end'||events.at(-1).data.error!==null)throw Error('driver end/seal');
 return events;
}
// [EXP-G03-R7a] Why: the observer's final readbacks, clock domain and measured periods are one authenticated record at the end of the same HMAC chain; seal.json is only a copy and must equal it exactly, so any post-capture edit to a consumed field fails here. Rejected: trusting seal.final/periodNs because seal.head matches the poll chain (F1: HMAC covered the polls only).
const SEAL_KEYS=['chunks','domain','final','head','periodNs','runId','schema'];
// [EXP-G03-R7c] Why: initialization is tracked apart from the domain value, and every record's domain must itself be the boot/zero-offset clock object, so null can never stand for "not yet seen" (F4: a null first domain skipped the constancy check and was dropped from the result). Rejected: using null as the uninitialized sentinel; checking only that consecutive non-null domains are equal.
const clockDomainOk=d=>d!==null&&typeof d==='object'&&!Array.isArray(d)&&Object.keys(d).sort().join()==='bootId,offsets,primitive'&&typeof d.bootId==='string'&&/^[0-9a-f-]{36}$/.test(d.bootId)&&d.primitive==='CLOCK_MONOTONIC'&&isDeepStrictEqual(d.offsets,{monotonic:['0','0'],boottime:['0','0']});
const storeShape=v=>v&&typeof v==='object'&&Number.isSafeInteger(v.marker)&&Array.isArray(v.subjects)&&Array.isArray(v.entries)&&Object.keys(v).sort().join()==='entries,marker,subjects';
export function verifyObserver(files,key,runId){
 const seal=JSON.parse(files.get('seal.json')),lines=files.get('polls.ndjson').toString().trim().split('\n');let head='0'.repeat(64),seq=0,last=null,domain,domainSeen=false;const polls=[];
 for(const line of lines){
  if(last)throw Error('observer records after final');
  const row=JSON.parse(line);if(Object.keys(row).sort().join()!=='hmac,raw')throw Error('observer row shape');const body=JSON.parse(row.raw);
  if(body.schema!=='ns-observer/1'||body.runId!==runId||body.sequence!==seq++||body.previous!==head||createHmac('sha256',key).update(row.raw).digest('hex')!==row.hmac)throw Error('observer content/binding');
  if(!clockDomainOk(body.domain))throw Error('observer domain invalid');
  if(domainSeen&&!isDeepStrictEqual(body.domain,domain))throw Error('observer domain changed');domain=body.domain;domainSeen=true;head=row.hmac;
  if('final'in body||'periodNs'in body)last=body;else polls.push(...body.polls);
 }
 if(!last||seq<2)throw Error('observer final record missing');
 if(last.polls.length||!storeShape(last.final.source)||!storeShape(last.final.consumer)||Object.keys(last.final).sort().join()!=='consumer,source'||!Array.isArray(last.periodNs)||last.periodNs.some(n=>!Number.isSafeInteger(n)||n<0))throw Error('observer final record shape');
 if(Object.keys(seal).sort().join()!==SEAL_KEYS.join()||seal.schema!=='ns-observer-seal/1'||seal.runId!==runId||seal.chunks!==seq||seal.head!==head||!isDeepStrictEqual(seal.final,last.final)||!isDeepStrictEqual(seal.periodNs,last.periodNs)||!isDeepStrictEqual(seal.domain,domain))throw Error('observer seal');
 // The returned seal is rebuilt from authenticated values only.
 return {seal:{...seal,final:last.final,periodNs:last.periodNs,domain},polls};
}
// [EXP-G03-R7a] Why: the exit status and fault-stream outcome come from the coordinator's own exec, not from the driver's events; replay refuses before reading any event when the driver did not exit 0 or the hook stream did not finish. Rejected: trusting a clean end event (F2: a throw after the last handshake still sealed error:null).
// [EXP-G03-R7c] Why: a rejected control session (failed hook/handshake, malformed or truncated JSON, timeout, output cap, a refused DR contradiction) is also a coordinator-owned failed terminal; it carries the cause and digests of the partial streams, and has no exit status. Rejected: letting the rejection skip terminal construction, stop and export (F3).
export function trustedTerminal({runId,exec,faultError=null,controlError=null}){
 const terminal={schema:'ns-terminal/1',runId,source:'coordinator-exec',driverExit:exec.status,faultFinish:faultError?{ok:false,error:String(faultError.message??faultError)}:{ok:true}};
 if(controlError){const out=Buffer.from(exec.stdout??''),err=Buffer.from(exec.stderr??'');terminal.controlFailure={ok:false,error:String(controlError.message??controlError),partial:{stdoutBytes:out.length,stdoutSha256:sha256(out),stderrBytes:err.length,stderrSha256:sha256(err)}}}
 return terminal;
}
export function requireCleanTerminal(terminal,binding){
 if(!terminal||terminal.schema!=='ns-terminal/1'||terminal.source!=='coordinator-exec'||terminal.runId!==binding?.runId)throw Error('DRIVER-TERMINAL-MISSING');
 if('controlFailure'in terminal)throw Error('DRIVER-CONTROL-FAILURE '+(terminal.controlFailure?.error??'unreported'));
 if(terminal.driverExit!==0)throw Error('DRIVER-EXIT-NONZERO status='+terminal.driverExit);
 if(terminal.faultFinish?.ok!==true)throw Error('DRIVER-HOOK-FAILURE '+(terminal.faultFinish?.error??'unreported'));
 return terminal;
}
// [EXP-G03-R5] Why: ACK completion order is not offer order in an open-loop driver. Rejected: positional zipping (rejects correct concurrent replies) or ignoring duplicate/missing IDs.
export function matchOffers(offers,trace){
 if(offers.length!==trace.length||new Set(trace.map(o=>o.command.id)).size!==trace.length)throw Error('offer coverage');
 const byId=new Map(offers.map(o=>[o.command.id,o]));if(byId.size!==trace.length)throw Error('duplicate offer identity');
 return trace.map((expected,i)=>{const o=byId.get(expected.command.id);if(!o||JSON.stringify(o.command)!==JSON.stringify(expected.command)||o.response.commandId!==expected.command.id||o.response.status!=='committed'||o.response.receipt.position!==String(i+1))throw Error('offer bytes/receipt');return o});
}
export function checkSmoke(events,observer,trace,population,binding,terminal){
 requireCleanTerminal(terminal,binding);
 const offers=matchOffers(events.filter(e=>e.kind==='offer').map(e=>e.data),trace);
 if(events.filter(e=>e.kind==='driver-runtime').length!==1||events.some(e=>e.kind==='driver-runtime'&&(!e.data.permissionModel||e.data.childPermission||e.data.workerPermission||e.data.bundleSha256!==binding.driverBundleSha256)))throw Error('driver permissions');
 const reads=events.filter(e=>['read','ryow','p4','sweep'].includes(e.kind));if(!reads.length)throw Error('no read observations');
 for(const {data:d}of reads){const r=d.request;let value=0;for(let i=0;i<Math.min(Number(r.basis),trace.length);i++)if(trace[i].command.subject===r.subject)value=trace[i].command.value;const expectedAnswer={subject:r.subject,value,basis:r.basis};if(sha256(Buffer.from(canonicalAnswer(expectedAnswer)))!==d.answerSha256)throw Error('named-cut read content');}
 const expected=new Map(Array.from({length:population},(_,i)=>['subject-'+i,0]));for(const o of trace)expected.set(o.command.subject,o.command.value);
 const actual=observer.seal.final;if(actual.source.marker!==trace.length||actual.consumer.marker!==trace.length||actual.source.subjects.length!==population)throw Error('observer frontier/population');
 if(JSON.stringify(actual.source.subjects)!==JSON.stringify([...expected].sort(([a],[b])=>a<b?-1:1)))throw Error('source final content');
 const entries=trace.map((o,i)=>[i+1,o.command.subject,o.command.value]);if(JSON.stringify(actual.source.entries)!==JSON.stringify(entries)||JSON.stringify(actual.consumer.entries)!==JSON.stringify(entries))throw Error('consumer effects content');
 sameClock([...events.map(e=>e.domain),observer.seal.domain].map(d=>({...d,timeNs:'not-domain'})));
 if(events.some(e=>e.kind==='offer'&&BigInt(e.data.ackAtNs)<BigInt(e.data.sentAtNs)))throw Error('negative timing');
 return {status:'DIAGNOSTIC',qualification:false,runId:binding.runId,offers:offers.length,observedSource:actual.source.marker,observedConsumer:actual.consumer.marker,durabilityClass:VM_DURABILITY};
}
const filesOf=walk=>new Map(walk.modules.map(m=>[m.path,Buffer.from(m.base64,'base64')]));
export async function runBoxedNS(box,{instance,bundleFiles,observerFiles,sourceCommit,generatorSeed,slotIdentity='in-memory-smoke',observe=true,population=16,trace,readers=4,placement,observerImage,blocked=[],canary,isolations=true,faults}){
 if(!/^[a-f0-9]{64}$/.test(generatorSeed??'')||!/^[a-f0-9]{40}$/.test(sourceCommit)||!Array.isArray(trace)||!trace.length)throw Error('NS source/trace identity missing');
 const runId=randomBytes(16).toString('hex'),key=randomBytes(32),stages=[],volumes={},roles=[],names=[];
 const stage=(step,detail)=>{const row={step,detail,at:new Date().toISOString()};stages.push(row);fs.appendFileSync(path.join(box.workDir,'ns-'+runId+'-stages.ndjson'),JSON.stringify(row)+'\n',{flag:'a',mode:0o600})};stage(1,{sourceCommit,runId,diagnostic:true});
 // [EXP-G03-R5] Why: Docker copies /work ownership to a fresh named volume before mounting it at /state or /out. Rejected: root-owned empty mountpoints that deny uid 10001.
 const alloc=(key,suffix=key)=>{const volume=box.volume('ns-'+runId.slice(0,6)+'-'+suffix);box.seed(volume,new Map());return volumes[key]=volume};
 const seed=(volume,files)=>box.seed(volume,new Map(Object.entries(files).map(([n,b])=>[n,{mode:'100644',bytes:Buffer.isBuffer(b)?b:Buffer.from(JSON.stringify(b))}])));
 const network=box.prefix+'ns-'+runId.slice(0,6);box.engine('network',['--name',network]);box.resources.push(['network',network]);volumes.network=network;
 for(const k of ['broker','consumer','output','observer','trace','key','bundle','observerCode','control'])alloc(k);
 box.seed(volumes.bundle,bundleFiles);seed(volumes.key,{'key':key});
 // Q103a: neither trace nor seed is ever copied into candidate input files or the candidate instance volume.
 const inputPreimage={trace,population,readers,generatorSeed};fs.writeFileSync(path.join(box.workDir,'ns-'+runId+'-inputs.json'),JSON.stringify(inputPreimage),{flag:'wx',mode:0o600});
 const driverManifest=JSON.parse(bundleFiles.get('manifest.json').bytes);
 const binding={runId,sourceCommit,evaluatorCommit:sourceCommit,sourceSha256:sha256(Buffer.from(JSON.stringify(instance.walk.entries))),driverBundleSha256:driverManifest.bundleSha256,inputsSha256:sha256(Buffer.from(JSON.stringify(inputPreimage))),slot:slotIdentity,durabilityClass:VM_DURABILITY};
 stage(2,{instance:instance.volume,listing:instance.walk.entries});stage(3,{network,observerImage});stage(4,{volumes});
 const ports={broker:9101,readers:9102,consumer:9103};
 for(const role of ['broker','readers','consumer']){
  const input=box.volume('ns-in-'+role+'-'+runId.slice(0,6));const config={runId,provider:'/work/provider.mjs',host:'0.0.0.0',port:ports[role],...(role!=='readers'?{storeFile:'/state/'+(role==='broker'?'broker.db':'consumer.db')}:{})};
  // Endpoints are resolved after broker creation; the candidate config contains no trace, schedule or RNG seed.
  if(role!=='broker')config.broker={host:roles[0].ip,port:ports.broker};seed(input,{'config.json':config});
  const service=box.service('ns-'+role+'-'+runId.slice(0,6),{role,instance:instance.volume,inputs:input,state:volumes[role],network,argv:['node','/work/ns-sut.mjs','--role',role,'--config','/in/config.json'],...(placement?{placement:placement[role]}:{})});
  const ip=inspect(service.name).NetworkSettings.Networks[network].IPAddress;roles.push({...service,ip,spec:{role,instance:instance.volume,inputs:input,state:volumes[role],network,argv:['node','/work/ns-sut.mjs','--role',role,'--config','/in/config.json'],...(placement?{placement:placement[role]}:{})}});names.push(service.name);
 }
 const endpoints=Object.fromEntries(roles.map(r=>[r.role,{host:r.ip,port:ports[r.role]}]));
 const config={offline:true,runtimeParent:'/tmp/nsr',binding,keyFile:'/key/key',output:'/out/events',endpoints,trace,generatorSeed,readers,readRequests:[{subject:'subject-0',basis:'0'}],pulls:[{subject:'subject-0',basis:String(trace.length)}]};seed(volumes.trace,{'config.json':config});
 const drv=box.driver('ns-driver-'+runId.slice(0,6),{bundle:volumes.bundle,inputs:volumes.trace,key:volumes.key,output:volumes.output,network,...(placement?{placement:placement.driver}:{})});roles.push(drv);
 const observerConfig=Buffer.from(JSON.stringify({runId,active:observe}));observerFiles=new Map(observerFiles);observerFiles.set('config.json',{bytes:observerConfig,mode:'100644'});observerFiles.set('key',{bytes:key,mode:'100644'});box.seed(volumes.observerCode,observerFiles);
 const obs=box.create('ns-observer-'+runId.slice(0,6),{image:observerImage,argv:['python3','/observer/observer.py'],mounts:[{name:volumes.observerCode,target:'/observer',rw:false},{name:volumes.broker,target:'/source',rw:false},{name:volumes.consumer,target:'/consumer',rw:false},{name:volumes.observer,target:'/out',rw:true},{name:volumes.control,target:'/control',rw:false}],network:'none',memory:placement?.observer.memory??268435456,cpuset:'5',extra:['--cgroupns','host','-v','/sys/fs/cgroup:/sys/fs/cgroup:ro'],trusted:true});docker(['start',obs]);roles.push({role:'observer',name:obs});
 stage(5,{roles:roles.map(r=>({role:r.role,name:r.name}))});
 function helper(suffix,argv,{mounts=[],net=network,image=box.config.imageId}={}){const n=box.create(suffix+'-'+randomBytes(3).toString('hex'),{argv,mounts,network:net,image,memory:67108864,cpuset:'5'});const r=box.start(n);box.remove(n);if(r.status!==0)throw Error('ISOLATION-NOT-IN-FORCE: helper '+suffix+' '+r.stderr);return r.stdout;}
 const readiness=`const net=require('net');(async()=>{for(const p of ${JSON.stringify(Object.values(endpoints))}){let ok=false;for(let i=0;i<100;i++){ok=await new Promise(r=>{const s=net.connect(p,()=>{s.destroy();r(true)});s.setTimeout(200,()=>{s.destroy();r(false)});s.on('error',()=>r(false))});if(ok)break;await new Promise(r=>setTimeout(r,50))}if(!ok)throw Error('role not ready')}console.log('ready')})().catch(e=>{console.error(e);process.exit(2)})`;helper('ready',['node','-e',readiness]);
 const ping=box.volume('ns-ping-'+runId.slice(0,6)),pair=[];
 for(const side of ['server','client'])pair.push(box.create('ping-'+side+'-'+runId.slice(0,6),{image:observerImage,argv:['python3','/opt/probes/probe.py','V4',side],mounts:[{name:ping,target:'/work',rw:true}],env:['PROBE_ATTEMPT='+runId],network:'none',memory:67108864,cpuset:'5'}));
 const pingRaw=await Promise.all(pair.map(n=>box.startAsync(n)));for(const n of pair)box.remove(n);
 const pingValues=pingRaw.map(r=>JSON.parse(r.stdout));if(pingValues.some(r=>r.attempt!==runId))throw Error('stale clock ping');
 const packet=pingValues.find(r=>r.data.samples).data.samples;if(packet.length!==2000||packet.some(p=>p.peer<p.start||p.peer>p.end))throw Error('clock ping bound');
 const pingP99Ns=[...packet].map(p=>p.rtt).sort((a,b)=>a-b)[1979];
 const facts=roles.map(r=>box.clock(r.name));sameClock(facts);
 const driverListeners=JSON.parse(box.exec(drv.name,['node','-e',"const fs=require('fs');const rows=['/proc/net/tcp','/proc/net/tcp6'].flatMap(p=>fs.readFileSync(p,'utf8').trim().split('\\n').slice(1)).map(l=>l.trim().split(/\\s+/)).filter(r=>r[3]==='0A'&&!r[1].startsWith('0B00007F:')&&!r[1].startsWith('0100007F:'));console.log(JSON.stringify(rows))"]));
 if(driverListeners.length)throw Error('ISOLATION-NOT-IN-FORCE: driver listening');
 const driverIp=inspect(drv.name).NetworkSettings.Networks[network].IPAddress;
 blocked=[...blocked,...[9101,9102,9103,9229].map(port=>({host:driverIp,port}))];
 const inspections=roles.map(r=>({...r,inspect:inspect(r.name)}));const problems=layoutProblems(inspections,volumes);if(problems.length)throw Error('ISOLATION-NOT-IN-FORCE: '+problems.join(','));
 const tests=[];
 if(isolations){
  for(const role of roles.filter(r=>['broker','readers','consumer'].includes(r.role))){
   const denied=['/out/events','/driver-in/config.json','/key/key','/driver/driver.mjs','/observer','/source/broker.db','/consumer/consumer.db','/lab/oracles','/work/lab/oracles','/work/lab/bench/lib/trace.ts'];
   const isolation=`const fs=require('fs'),cp=require('child_process'),net=require('net');const denied=${JSON.stringify(denied)};for(const p of denied){try{fs.readFileSync(p);throw Error('readable '+p)}catch(e){if(!['ENOENT','EACCES','EISDIR'].includes(e.code))throw e;if(e.code==='EISDIR')throw Error('mounted '+p)}}if(cp.spawnSync('sh',['-c','command -v python3']).status===0)throw Error('python present');(async()=>{try{await require('dns').promises.resolve4('example.com');throw Error('public DNS')}catch(e){if(e.message==='public DNS')throw e}const positive=await new Promise(r=>{const s=net.connect(${JSON.stringify(endpoints.broker)},()=>{s.destroy();r(true)});s.setTimeout(500,()=>{s.destroy();r(false)});s.on('error',()=>r(false))});if(!positive)throw Error('positive broker route missing');const checks=[];for(const p of ${JSON.stringify(blocked)}){const yes=await new Promise(r=>{const s=net.connect(p,()=>{s.destroy();r(true)});s.setTimeout(200,()=>{s.destroy();r(false)});s.on('error',()=>r(false))});checks.push({...p,reachable:yes});if(yes)throw Error('reachable forbidden peer')}console.log(JSON.stringify({runId:${JSON.stringify(runId)},role:${JSON.stringify(role.role)},denied,positive:true,publicDns:false,blocked:checks}))})().catch(e=>{console.error(e);process.exit(2)})`;
   tests.push(checkNsPreflight(JSON.parse(box.exec(role.name,['node','-e',isolation])),{runId,role:role.role,denied,blocked}));
  }
 }
 stage(6,{facts,tests,pingP99Ns,pingRaw:pingValues,inspectDigests:inspections.map(r=>[r.role,box.put(Buffer.from(JSON.stringify(r.inspect)))])});
 // Seeding is an evaluator-controlled RPC, separate from (and not readable as) the frozen driver trace.
 const rpcScript=seedRpcScript(endpoints.broker,runId,population);
 helper('seed',['node','-e',rpcScript]);
 const fingerprint=JSON.parse(helper('seed-readback',['python3','-c',"import sqlite3,json; c=sqlite3.connect('file:/source/broker.db?mode=ro',uri=True); print(json.dumps(c.execute('SELECT subject,value FROM subjects ORDER BY subject').fetchall()))"],{mounts:[{name:volumes.broker,target:'/source',rw:false}],net:'none',image:observerImage}));
 const expected=Array.from({length:population},(_,i)=>['subject-'+i,0]).sort(([a],[b])=>a<b?-1:1);if(JSON.stringify(fingerprint)!==JSON.stringify(expected))throw Error('SEED-MISMATCH');stage(7,{fingerprint:sha256(Buffer.from(JSON.stringify(fingerprint))),population});
 stage(8,{grade:'DIAGNOSTIC',acceptance:false});stage(9,{warmupMs:0,acceptanceWindow:false,readers});
 // [EXP-G03-R6] Why: identical hook traffic exists in all runs; the schedule stays solely in the evaluator closure. Rejected: crash configuration in /in or accepting only a candidate hook label.
 let consumer=roles.find(r=>r.role==='consumer');
 const targetOf=r=>({role:r.role,name:r.name,id:inspect(r.name).Id,volume:volumes.consumer,endpoint:{host:r.ip,port:ports.consumer}});
 const transport=boxedFaultTransport(box,{target:targetOf(consumer),
  stamp:()=>box.exec(obs,['python3','-c','import time; print(time.monotonic_ns())']).toString().trim(),
  snapshot:context=>box.exec(obs,['python3','-c',snapshotScript(context,'/consumer/consumer.db')]),
  restart:async()=>{const service=box.service('ns-consumer-resume-'+randomBytes(4).toString('hex'),consumer.spec);const ip=inspect(service.name).NetworkSettings.Networks[network].IPAddress;
   names.splice(names.indexOf(consumer.name),1,service.name);consumer={...consumer,...service,ip};const index=roles.findIndex(r=>r.role==='consumer');roles[index]=consumer;
   helper('resume-ready',['node','-e',`const net=require('net');(async()=>{for(let i=0;i<100;i++){const ok=await new Promise(r=>{const s=net.connect(${JSON.stringify({host:ip,port:ports.consumer})},()=>{s.destroy();r(true)});s.on('error',()=>r(false));s.setTimeout(200,()=>{s.destroy();r(false)})});if(ok)return;await new Promise(r=>setTimeout(r,50))}throw Error('resume not ready')})().catch(()=>process.exit(2))`]);
   return targetOf(consumer);},
  recover:async context=>{
   if(!faults?.recover)throw Error('FAULT-RECOVERY-NORMALIZER-MISSING');
   return faults.recover({box,observer:obs,consumer,context});
  }
 });
 const injector=new FaultInjector({binding,target:targetOf(consumer),transport,caseIds:faults?.caseIds,pageBounds:faults?.pageBounds,decide:faults?.decide??(()=>false),retain:async bytes=>box.put(bytes)});
 // [EXP-G03-R7c] Why: a rejected execControl (failed onControl/handshake, malformed or truncated JSON, timeout, output cap, FAULT-POINT-DR-CONTRADICTION) must take the same safe stop, teardown, export and capture hashing as a nonzero exit, with a coordinator-owned failed terminal. Rejected: awaiting outside any catch (F3: the rejection skipped terminal, observer stop, export and digests, and box.close() then deleted the volumes).
 let result,controlError=null;
 try{result=await box.execControl(drv.name,drv.launchArgv,row=>injector.handshake(row),{timeout:90000})}
 catch(e){controlError=e;const p=e?.partial??{};result={status:null,stdout:p.stdout??Buffer.alloc(0),stderr:p.stderr??Buffer.alloc(0)}}
 // [EXP-G03-R7a] Why: a nonzero driver exit or failed fault stream must still stop and export every retained byte, then refuse before replay. Rejected: throwing here (loses failed-attempt evidence) or recording the exit and continuing (F2).
 // [EXP-G03-R7c] Why: if the stop, teardown or export cannot be proven, the run's volumes are the only copy of the evidence; they leave box.resources so close() cannot delete them, and the gap is written down. Rejected: letting close() remove volumes after a failed export, or omitting the gap from the record.
 // [EXP-G03-R7d] Why: the retention guard now starts before the terminal is built and logged, and stage 10 is inside it (F5): a persistence failure at that edge also leaves the run's volumes detached from box.resources before the caller's close(), keeps the original control cause in the thrown message, and records the persistence gap. Rejected: a guard that begins after stage 10 (an EIO there let close() delete the only copy of the evidence).
 const forensicVolumes=new Set(Object.values(volumes).filter(v=>v!==network));
 let candidateLogs={},output,observed,stateExports,rawDir,capture,exported=false,terminal=null,persistenceError=null,faultSummary=null,faultError=null;
 const owned=n=>box.resources.some(([kind,r])=>kind==='container'&&r===n);
 try{
  try{faultSummary=injector.finish({requireInjections:faults?.requireInjections??false})}catch(e){faultError=e}
  try{terminal=trustedTerminal({runId,exec:result,faultError,controlError});stage(10,{driverExit:result.status,terminal,faultSummary})}catch(e){persistenceError=e;throw e}
  // A rejected control session may leave the driver alive in its container (killing the docker exec client does not stop it): remove it, with kill proof, before the observer is sealed.
  if(controlError&&owned(drv.name))box.remove(drv.name);
  // Stop the observer via a private evaluator-only control volume, never candidate RPC.
  helper('stop-observer',['node','-e',"require('fs').writeFileSync('/control/stop','stop')"],{mounts:[{name:volumes.control,target:'/control',rw:true}],net:'none'});
  for(let i=0;i<100&&inspect(obs).State.Running;i++)await new Promise(r=>setTimeout(r,20));if(inspect(obs).State.Running||inspect(obs).State.ExitCode!==0)throw Error('observer seal failed');stage(11,{sealed:true});
  candidateLogs=Object.fromEntries(names.filter(n=>!controlError||owned(n)).map(n=>[n,docker(['logs',n],{allowFail:true})]));for(const name of names)if(!controlError||owned(name))box.remove(name);if(!controlError)box.remove(drv.name);box.remove(obs);stage(12,{candidateCgroupsGone:true});
  output=filesOf(box.walk(volumes.output,['events/']));observed=filesOf(box.walk(volumes.observer,['seal.json','polls.ndjson','ready.json']));
  stateExports={source:box.walk(volumes.broker,['broker.db','broker.db-wal','broker.db-shm']),consumer:box.walk(volumes.consumer,['consumer.db','consumer.db-wal','consumer.db-shm'])};
  const exportSets=[['driver',output],['observer',observed],['source',filesOf(stateExports.source)],['consumer',filesOf(stateExports.consumer)],...(controlError?[['control',new Map([['stdout',result.stdout],['stderr',result.stderr]])]]:[])];
  // [EXP-G03-R5] Why: semantic refusal must retain the exact raw bytes and key for independent replay. Rejected: judging in memory before saving failed-attempt evidence.
  rawDir=path.join(box.workDir,'raw-'+runId);fs.mkdirSync(rawDir,{mode:0o700});
  fs.writeFileSync(path.join(rawDir,'key'),key,{flag:'wx',mode:0o600});fs.writeFileSync(path.join(rawDir,'binding.json'),JSON.stringify(binding),{flag:'wx',mode:0o600});
  for(const [kind,files]of exportSets){
   for(const [relative,bytes]of files){if(relative.split('/').some(p=>!p||p==='.'||p==='..')||relative.startsWith('/'))throw Error('unsafe walker export path');const destination=path.join(rawDir,kind,relative);fs.mkdirSync(path.dirname(destination),{recursive:true,mode:0o700});fs.writeFileSync(destination,bytes,{flag:'wx',mode:0o600})}
  }
  // [EXP-G03-R7a] Why: digests taken at capture, before any verification, let a later CR-NS ingestion detect any change to the exported bytes. Rejected: re-deriving them from files after replay.
  capture={};for(const [kind,files]of exportSets)for(const [relative,bytes]of files)capture[kind+'/'+relative]=sha256(bytes);
  fs.writeFileSync(path.join(rawDir,'terminal.json'),JSON.stringify({terminal,capture}),{flag:'wx',mode:0o600});exported=true;
 }catch(caught){
  let e=caught;
  if(!exported){
   const kept=box.resources.filter(([kind,n])=>kind==='volume'&&forensicVolumes.has(n)).map(([,n])=>n);
   box.resources=box.resources.filter(([kind,n])=>!(kind==='volume'&&forensicVolumes.has(n)));
   box.retained=[...(box.retained??[]),...kept.map(name=>({kind:'volume',name,runId}))];
   // The original failure stays first in the message when the persistence write is what failed; the persistence error is the cause.
   const original=controlError?'DRIVER-CONTROL-FAILURE '+String(controlError.message??controlError):result.status!==0?'DRIVER-EXIT-NONZERO status='+result.status:faultError?'DRIVER-HOOK-FAILURE '+String(faultError.message??faultError):null;
   if(persistenceError&&original)e=Object.assign(Error(original+'; TERMINAL-PERSISTENCE-GAP '+String(persistenceError.message??persistenceError),{cause:persistenceError}),{code:persistenceError.code});
   const gap={schema:'ns-retained/1',runId,binding,reason:String(caught?.message??caught),export:'NOT-PROVEN-SAFE',partialRawDir:rawDir??null,volumes:kept,terminal,persistenceGap:persistenceError?String(persistenceError.message??persistenceError):null,originalCause:original,qualification:false};
   // The volumes are already detached; a failure to write the gap record must not replace the error or undo the retention.
   try{fs.writeFileSync(path.join(box.workDir,'ns-'+runId+'-retained.json'),JSON.stringify(gap),{flag:'wx',mode:0o600});stage(14,{retainedVolumes:kept,reason:gap.reason})}catch(g){Object.assign(e,{gapWriteError:String(g?.message??g)})}
   Object.assign(e,{retained:kept,terminal});
  }
  Object.assign(e,{candidateLogs,runId});throw e;
 }
 try{
  requireCleanTerminal(terminal,binding);
  const events=verifyHr(output,key,binding),observer=verifyObserver(observed,key,runId),semantic=checkSmoke(events,observer,trace,population,binding,terminal);stage(13,{rawExportOnly:true,CRNSAdmission:false,captureSha256:sha256(Buffer.from(JSON.stringify(capture)))});
  return {semantic,terminal,capture,faultSummary,rawDir,candidateLogs,stateExports:{source:stateExports.source.entries,consumer:stateExports.consumer.entries},keyBase64:key.toString('base64'),binding,stages,events,observer,output:[...output].map(([p,b])=>[p,b.toString()]),observerOutput:[...observed].map(([p,b])=>[p,b.toString()]),driverStdout:result.stdout.toString(),driverStderr:result.stderr.toString(),records:box.records};
 }catch(e){Object.assign(e,{rawDir,capture,terminal,candidateLogs,runId});throw e}
}
