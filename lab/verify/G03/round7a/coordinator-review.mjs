// [CX-VG03-56-R7A] Why: execute exact coordinator bytes against a trusted Box model to test failure ordering without a VM slot. Rejected: editing the reviewed runner or treating model containers as kernel observations.
import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {FaultInjector,FAULT_POINTS} from '../../../bin/ns-fault.mjs';
import {sameClock,layoutProblems,checkNsPreflight,VM_DURABILITY,servicePlan,driverPlan} from '../../../bin/ns-policy.mjs';
import {canonicalAnswer} from '../../../bench/ns-driver/answer.mjs';
import {EventEmitter} from 'node:events';import {PassThrough} from 'node:stream';
const sha256=b=>createHash('sha256').update(b).digest('hex');
const source=fs.readFileSync(new URL('../../../bin/ns-run.mjs',import.meta.url),'utf8');
const results=[];
for(const mode of ['nonzero','null-exit','finish-failure','stream-failure']){
 const workDir=path.join(import.meta.dirname,'coordinator-fixtures',mode);fs.mkdirSync(workDir,{recursive:true});assert.equal(fs.readdirSync(workDir).length,0,'fresh attempt required');
 const containers=new Map(),volumes=new Map(),operations=[];let nextId=1,driverConfig;
 const domain={bootId:'7a064e31-8ca0-47a5-926f-d2de8d786302',primitive:'CLOCK_MONOTONIC',offsets:{monotonic:['0','0'],boottime:['0','0']},timeNs:'offline-model'};
 const box={prefix:'offline-',workDir,resources:[],records:[],config:{imageId:'sha256:'+'f'.repeat(64)},
  engine(action,args){operations.push('engine:'+action)},
  volume(suffix){const name=this.prefix+suffix;volumes.set(name,new Map());this.resources.push(['volume',name]);return name},
  seed(name,files){for(const [file,value]of files)volumes.get(name).set(file,value.bytes)},
  create(suffix,spec){const name=this.prefix+suffix;containers.set(name,{Id:String(nextId++).padStart(64,'0'),Mounts:spec.mounts?.map(m=>({Type:'volume',Name:m.name,Destination:m.target,RW:m.rw}))??[],NetworkSettings:{Networks:{[spec.network??'none']:{IPAddress:'10.0.0.'+nextId}}},State:{Running:false,ExitCode:0},spec});this.resources.push(['container',name]);return name},
  service(suffix,spec){const name=this.create(suffix,servicePlan(spec));return {name,role:spec.role}},
  driver(suffix,spec){const plan=driverPlan(spec),name=this.create(suffix,plan);driverConfig=JSON.parse(volumes.get(spec.inputs).get('config.json'));return {name,role:'driver',launchArgv:plan.argv}},
  start(name){operations.push('start:'+name);if(name.includes('stop-observer'))for(const [n,c]of containers)if(n.includes('ns-observer-'))c.State.Running=false;return {status:0,stdout:Buffer.from(name.includes('seed-readback')?JSON.stringify([['subject-0',0]]):'ready'),stderr:Buffer.alloc(0)}},
  async startAsync(name){const spec=containers.get(name).spec,run=spec.env.find(e=>e.startsWith('PROBE_ATTEMPT=')).split('=')[1];return {stdout:Buffer.from(JSON.stringify({attempt:run,data:{samples:Array.from({length:2000},()=>({start:1,peer:2,end:3,rtt:2}))}}))}},
  remove(name){operations.push('remove:'+name);containers.delete(name);this.resources=this.resources.filter(([,n])=>n!==name)},
  clock(){return domain},exec(){return Buffer.from('[]')},put(bytes){return sha256(bytes)},
  async execControl(name,argv,onControl){
   operations.push('execControl');const binding=driverConfig.binding;
   if(mode==='stream-failure'){
    // [CX-VG03-56-R7A] Why: use the exact Box.execControl implementation as well as the real injector rejection. Rejected: assuming a synthetic thrown callback faithfully models its pipe/close behavior.
    const spawn=()=>{const child=new EventEmitter();child.stdout=new PassThrough();child.stderr=new PassThrough();child.stdin=new PassThrough();child.kill=()=>{setImmediate(()=>child.emit('close',null));return true};setImmediate(()=>child.stdout.write(JSON.stringify({schema:'ns-control/1',binding,event:{event:'at-point',role:'consumer',point:'before-effect',page:0,cursor:{after:0},nonce:'offline-stream-failure'}})+'\n'));return child};
    const valuesBySpec={
     'node:fs':{default:fs},'node:path':{default:path},'node:child_process':{spawn,spawnSync(){}},'node:crypto':await import('node:crypto'),
     './ns-policy.mjs':await import('../../../bin/ns-policy.mjs'),'./box-policy.mjs':await import('../../../bin/box-policy.mjs'),
     './lib.mjs':{docker(){},dockerArgs:a=>a,inspect:n=>containers.get(n),REPO:workDir,sha256},
    };
    const boxSource=fs.readFileSync(new URL('../../../bin/box.mjs',import.meta.url),'utf8'),boxContext=vm.createContext({Buffer,console,setTimeout,clearTimeout});
    const boxModule=new vm.SourceTextModule(boxSource,{context:boxContext,identifier:'reviewed-box.mjs'});
    await boxModule.link(async spec=>{const values=valuesBySpec[spec];assert.ok(values,spec);return new vm.SyntheticModule(Object.keys(values),function(){for(const [k,v]of Object.entries(values))this.setExport(k,v)},{context:boxContext})});await boxModule.evaluate();
    return boxModule.namespace.BoxExecutor.prototype.execControl.call(this,name,argv,onControl,{timeout:1000});
   }
   if(mode!=='finish-failure')for(const point of ['before-effect','after-effect','after-checkpoint'])await onControl({schema:'ns-control/1',binding,event:{event:'at-point',role:'consumer',point,page:0,cursor:{after:0},nonce:'offline-'+point}});
   return {status:mode==='nonzero'?7:mode==='null-exit'?null:0,stdout:Buffer.alloc(0),stderr:Buffer.from('offline-model')};
  },
  walk(volume){operations.push('walk:'+volume);let files;
   if(volume.endsWith('-output'))files=[['events/00000000.json',Buffer.from('INVALID-HR-MUST-NOT-BE-PARSED')],['events/seal.json',Buffer.from('INVALID-HR-SEAL')]];
   else if(volume.endsWith('-observer'))files=[['polls.ndjson',Buffer.from('INVALID-OBSERVER')],['seal.json',Buffer.from('INVALID-OBSERVER-SEAL')]];
   else files=[['store.db',Buffer.from('offline raw state')]];
   return {entries:[],modules:files.map(([p,b])=>({path:p,base64:b.toString('base64')}))};
  },
 };
 const context=vm.createContext({Buffer,console,setTimeout,clearTimeout});
 const deps={
  'node:fs':{default:fs},'node:path':{default:path},'node:child_process':{spawnSync(){}},
  'node:crypto':await import('node:crypto'),'node:util':await import('node:util'),
  './lib.mjs':{docker(args){operations.push('docker:'+args[0]);if(args[0]==='start')containers.get(args[1]).State.Running=true;return Buffer.alloc(0)},dockerArgs:a=>a,inspect:n=>containers.get(n),sha256},
  '../bench/ns-driver/answer.mjs':{canonicalAnswer},'./ns-fault.mjs':{FaultInjector},
  './ns-fault-box.mjs':{boxedFaultTransport:()=>({
   pause:async c=>({id:c.target.id,paused:true}),
   snapshot:async c=>Buffer.from(JSON.stringify({schema:'ns-dr/1',binding:c.binding,attempt:c.attempt,targetId:c.target.id,volume:c.target.volume,phase:c.phase,checkpoint:1,effects:[],rowCount:0,frontier:0,walBytes:0,walBase64:'',walSha256:sha256(Buffer.alloc(0)),observedAtNs:'100'})),
   kill:async()=>{throw Error('must not kill after contradictory DR')},
  }),snapshotScript(){}},
  './ns-policy.mjs':{sameClock,layoutProblems,checkNsPreflight,VM_DURABILITY},
 };
 const module=new vm.SourceTextModule(source,{context,identifier:'reviewed-ns-run.mjs'});
 await module.link(async spec=>{const values=deps[spec];assert.ok(values,spec);return new vm.SyntheticModule(Object.keys(values),function(){for(const [name,value]of Object.entries(values))this.setExport(name,value)},{context})});await module.evaluate();
 let error;try{await module.namespace.runBoxedNS(box,{instance:{volume:'offline-instance',walk:{entries:[]}},bundleFiles:new Map([['manifest.json',{bytes:Buffer.from(JSON.stringify({bundleSha256:'e'.repeat(64)}))}]]),observerFiles:new Map(),sourceCommit:'a'.repeat(40),generatorSeed:'b'.repeat(64),slotIdentity:'OFFLINE-MODEL',population:1,trace:[{atMs:0,command:{id:'one',subject:'subject-0',value:7}}],readers:0,observerImage:'sha256:'+'c'.repeat(64),isolations:false,...(mode==='stream-failure'?{faults:{decide:()=>true,caseIds:Object.fromEntries(FAULT_POINTS.map(p=>[p,'offline-'+p])),pageBounds:()=>({before:0,after:1}),requireInjections:true}}:{})})}catch(e){error=e}
 assert.ok(error,'must refuse');
 const raws=fs.readdirSync(workDir).filter(n=>n.startsWith('raw-'));
 const stages=fs.readFileSync(path.join(workDir,fs.readdirSync(workDir).find(n=>n.endsWith('-stages.ndjson'))),'utf8').trim().split('\n').map(JSON.parse);
 if(mode==='stream-failure'){
  assert.match(error.message,/FAULT-POINT-DR-CONTRADICTION/);assert.equal(raws.length,0);assert.ok(!operations.some(s=>s.startsWith('walk:')));assert.equal(stages.at(-1).step,9);
  results.push({mode,error:error.message,rawExportExists:false,lastStage:9,finishReached:false,realBoxExecControl:true,realFaultInjector:true,validDriverHook:'before-effect',pausedCheckpoint:1,expectedCheckpoint:0,qualification:false});
 }else{
  assert.match(error.message,mode==='finish-failure'?/DRIVER-HOOK-FAILURE/:/DRIVER-EXIT-NONZERO/);assert.equal(raws.length,1);
  const root=path.join(workDir,raws[0]),record=JSON.parse(fs.readFileSync(path.join(root,'terminal.json')));
  for(const [name,digest]of Object.entries(record.capture))assert.equal(sha256(fs.readFileSync(path.join(root,name))),digest);
  assert.equal(record.terminal.source,'coordinator-exec');assert.equal(record.terminal.runId,driverConfig.binding.runId);
  assert.equal(record.terminal.driverExit,mode==='nonzero'?7:mode==='null-exit'?null:0);assert.equal(record.terminal.faultFinish.ok,mode!=='finish-failure');
  assert.equal(stages.at(-1).step,12);assert.equal(Object.keys(record.capture).length,6);
  results.push({mode,error:error.message,capturedFiles:6,captureDigestsMatch:true,terminal:record.terminal,invalidHrNotParsed:true,lastStage:12,qualification:false});
 }
}
console.log(JSON.stringify({review:'CX-VG03-56-R7A',sourceCommit:'ef1a9216',sourceSha256:sha256(source),scope:'exact coordinator source; trusted Box/transport model; no Docker or candidate execution',results},null,2));
