// [EXP-G03-R7c] Why: drive the exact committed runBoxedNS and the exact Box.execControl bytes (vm-loaded, real FaultInjector) against a trusted Box model so rejected-control failure ordering is tested without a VM slot. Rejected: a pure unit test of trustedTerminal (never reaches the coordinator's await) and editing the runner to inject failures.
// Usage: node --experimental-vm-modules round7c-harness.mjs <mode> <emptyWorkDir>. Prints one JSON observation; every assertion lives in round7c.test.mjs.
import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';import {createHash} from 'node:crypto';import {EventEmitter} from 'node:events';import {PassThrough} from 'node:stream';
import {FaultInjector,FAULT_POINTS} from '../../../bin/ns-fault.mjs';
import {sameClock,layoutProblems,checkNsPreflight,VM_DURABILITY,servicePlan,driverPlan} from '../../../bin/ns-policy.mjs';
import {canonicalAnswer} from '../../../bench/ns-driver/answer.mjs';
const sha256=b=>createHash('sha256').update(b).digest('hex');
const [mode,workDir]=process.argv.slice(2);if(!mode||!workDir||fs.readdirSync(workDir).length)throw Error('mode and an empty work directory required');
const source=fs.readFileSync(new URL('../../../bin/ns-run.mjs',import.meta.url),'utf8'),boxSource=fs.readFileSync(new URL('../../../bin/box.mjs',import.meta.url),'utf8');
const hookStream={stream:'hook',options:{timeout:2000}},faultsOn={decide:()=>true,caseIds:Object.fromEntries(FAULT_POINTS.map(p=>[p,'offline-'+p])),pageBounds:()=>({before:0,after:1}),requireInjections:true};
// Each mode names the failure under test: a rejected control session (stream/options reach the exact Box.execControl) or a resolved exec result (status), optionally with a failing walker or observer removal (export not provable).
const MODES={
 'nonzero':{status:7,hooks:true},'null-exit':{status:null,hooks:true},'finish-failure':{status:0,hooks:false},
 'reject-hook':{...hookStream,faults:faultsOn},
 'control-timeout':{stream:'partial',partial:'{"schema":"ns-control/1","partial-line-without-newline',options:{timeout:60}},
 'control-truncated':{stream:'partial',partial:'{"schema":"ns-control/1","binding":',closeSelf:true,options:{timeout:2000}},
 'control-json':{stream:'partial',partial:'not json at all\n',options:{timeout:2000}},
 'control-cap':{stream:'partial',partial:'x'.repeat(400),options:{timeout:2000,max:64}},
 'retain-walk-failure':{...hookStream,faults:faultsOn,walkFails:true},
 'retain-remove-failure':{status:7,hooks:true,removeFails:true},
};
const containers=new Map(),volumes=new Map(),operations=[];let nextId=1,driverConfig;
const domain={bootId:'7a064e31-8ca0-47a5-926f-d2de8d786302',primitive:'CLOCK_MONOTONIC',offsets:{monotonic:['0','0'],boottime:['0','0']},timeNs:'offline-model'};
const M=MODES[mode];if(!M)throw Error('unknown mode '+mode);const control=M.stream?M:null;
const box={prefix:'offline-',workDir,resources:[],records:[],config:{imageId:'sha256:'+'f'.repeat(64)},
 engine(action){operations.push('engine:'+action)},
 volume(suffix){const name=this.prefix+suffix;volumes.set(name,new Map());this.resources.push(['volume',name]);return name},
 seed(name,files){for(const [file,value]of files)volumes.get(name).set(file,value.bytes)},
 create(suffix,spec){const name=this.prefix+suffix;containers.set(name,{Id:String(nextId++).padStart(64,'0'),Mounts:spec.mounts?.map(m=>({Type:'volume',Name:m.name,Destination:m.target,RW:m.rw}))??[],NetworkSettings:{Networks:{[spec.network??'none']:{IPAddress:'10.0.0.'+nextId}}},State:{Running:false,ExitCode:0},spec});this.resources.push(['container',name]);return name},
 service(suffix,spec){const name=this.create(suffix,servicePlan(spec));return {name,role:spec.role}},
 driver(suffix,spec){const plan=driverPlan(spec),name=this.create(suffix,plan);driverConfig=JSON.parse(volumes.get(spec.inputs).get('config.json'));return {name,role:'driver',launchArgv:plan.argv}},
 start(name){operations.push('start:'+name);if(name.includes('stop-observer'))for(const [n,c]of containers)if(n.includes('ns-observer-'))c.State.Running=false;return {status:0,stdout:Buffer.from(name.includes('seed-readback')?JSON.stringify([['subject-0',0]]):'ready'),stderr:Buffer.alloc(0)}},
 async startAsync(name){const spec=containers.get(name).spec,run=spec.env.find(e=>e.startsWith('PROBE_ATTEMPT=')).split('=')[1];return {stdout:Buffer.from(JSON.stringify({attempt:run,data:{samples:Array.from({length:2000},()=>({start:1,peer:2,end:3,rtt:2}))}}))}},
 remove(name){operations.push('remove:'+name);if(M.removeFails&&name.includes('ns-observer-'))throw Error('kill proof mismatch (model)');containers.delete(name);this.resources=this.resources.filter(([,n])=>n!==name)},
 clock(){return domain},exec(){return Buffer.from('[]')},put(bytes){return sha256(bytes)},
 async execControl(name,argv,onControl){
  operations.push('execControl');const binding=driverConfig.binding;
  if(control){
   const spawn=()=>{const child=new EventEmitter();child.stdout=new PassThrough();child.stderr=new PassThrough();child.stdin=new PassThrough();child.kill=()=>{operations.push('exec-client-kill');setImmediate(()=>child.emit('close',null));return true};
    setImmediate(()=>{
     if(control.stream==='hook')child.stdout.write(JSON.stringify({schema:'ns-control/1',binding,event:{event:'at-point',role:'consumer',point:'before-effect',page:0,cursor:{after:0},nonce:'offline-reject-hook'}})+'\n');
     else child.stdout.write(control.partial);
     child.stderr.write('model-stderr-partial');
     if(control.closeSelf)setImmediate(()=>child.emit('close',0));
    });return child};
   const valuesBySpec={'node:fs':{default:fs},'node:path':{default:path},'node:child_process':{spawn,spawnSync(){}},'node:crypto':await import('node:crypto'),'./ns-policy.mjs':await import('../../../bin/ns-policy.mjs'),'./box-policy.mjs':await import('../../../bin/box-policy.mjs'),'./lib.mjs':{docker(){},dockerArgs:a=>a,inspect:n=>containers.get(n),REPO:workDir,sha256}};
   const ctx=vm.createContext({Buffer,console,setTimeout,clearTimeout});const m=new vm.SourceTextModule(boxSource,{context:ctx,identifier:'committed-box.mjs'});
   await m.link(async spec=>{const values=valuesBySpec[spec];if(!values)throw Error('unexpected box import '+spec);return new vm.SyntheticModule(Object.keys(values),function(){for(const [k,v]of Object.entries(values))this.setExport(k,v)},{context:ctx})});await m.evaluate();
   return m.namespace.BoxExecutor.prototype.execControl.call(this,name,argv,onControl,control.options);
  }
  if(M.hooks)for(const point of ['before-effect','after-effect','after-checkpoint'])await onControl({schema:'ns-control/1',binding,event:{event:'at-point',role:'consumer',point,page:0,cursor:{after:0},nonce:'offline-'+point}});
  return {status:M.status,stdout:Buffer.alloc(0),stderr:Buffer.from('offline-model')};
 },
 walk(volume){operations.push('walk:'+volume);if(M.walkFails&&volume.endsWith('-observer'))throw Error('walker failed (model)');let files;
  if(volume.endsWith('-output'))files=[['events/00000000.json',Buffer.from('INVALID-HR-MUST-NOT-BE-PARSED')],['events/seal.json',Buffer.from('INVALID-HR-SEAL')]];
  else if(volume.endsWith('-observer'))files=[['polls.ndjson',Buffer.from('INVALID-OBSERVER')],['seal.json',Buffer.from('INVALID-OBSERVER-SEAL')]];
  else files=[['store.db',Buffer.from('offline raw state '+volume)]];
  return {entries:[],modules:files.map(([p,b])=>({path:p,base64:b.toString('base64')}))};
 },
 // The model's close() deletes every volume still in resources, as the real BoxExecutor.close() does through the engine.
 close(){for(const [kind,name]of [...this.resources].reverse()){operations.push('close-remove:'+kind+':'+name);if(kind==='volume')volumes.delete(name);else containers.delete(name)}this.resources=[]},
};
const ctx=vm.createContext({Buffer,console,setTimeout,clearTimeout});
const deps={'node:fs':{default:fs},'node:path':{default:path},'node:child_process':{spawnSync(){}},'node:crypto':await import('node:crypto'),'node:util':await import('node:util'),
 './lib.mjs':{docker(args){operations.push('docker:'+args[0]);if(args[0]==='start')containers.get(args[1]).State.Running=true;return Buffer.alloc(0)},dockerArgs:a=>a,inspect:n=>containers.get(n),sha256},
 '../bench/ns-driver/answer.mjs':{canonicalAnswer},'./ns-fault.mjs':{FaultInjector},
 './ns-fault-box.mjs':{boxedFaultTransport:()=>({pause:async c=>({id:c.target.id,paused:true}),snapshot:async c=>Buffer.from(JSON.stringify({schema:'ns-dr/1',binding:c.binding,attempt:c.attempt,targetId:c.target.id,volume:c.target.volume,phase:c.phase,checkpoint:1,effects:[],rowCount:0,frontier:0,walBytes:0,walBase64:'',walSha256:sha256(Buffer.alloc(0)),observedAtNs:'100'})),kill:async()=>{throw Error('must not kill after contradictory DR')}}),snapshotScript(){}},
 './ns-policy.mjs':{sameClock,layoutProblems,checkNsPreflight,VM_DURABILITY}};
const module=new vm.SourceTextModule(source,{context:ctx,identifier:'committed-ns-run.mjs'});
await module.link(async spec=>{const values=deps[spec];if(!values)throw Error('unexpected ns-run import '+spec);return new vm.SyntheticModule(Object.keys(values),function(){for(const [name,value]of Object.entries(values))this.setExport(name,value)},{context:ctx})});await module.evaluate();
let result,error;
try{result=await module.namespace.runBoxedNS(box,{instance:{volume:'offline-instance',walk:{entries:[]}},bundleFiles:new Map([['manifest.json',{bytes:Buffer.from(JSON.stringify({bundleSha256:'e'.repeat(64)}))}]]),observerFiles:new Map(),sourceCommit:'a'.repeat(40),generatorSeed:'b'.repeat(64),slotIdentity:'OFFLINE-MODEL',population:1,trace:[{atMs:0,command:{id:'one',subject:'subject-0',value:7}}],readers:0,observerImage:'sha256:'+'c'.repeat(64),isolations:false,...(M.faults?{faults:M.faults}:{})})}catch(e){error=e}
const retainedNames=(error?.retained??[]);
box.close();
const stageFile=fs.readdirSync(workDir).find(n=>n.endsWith('-stages.ndjson'));
console.log(JSON.stringify({mode,returned:result!==undefined,error:error?String(error.message):null,errorKeys:error?Object.keys(error).sort():[],retainedOnError:retainedNames,rawDirOnError:error?.rawDir??null,terminalOnError:error?.terminal??null,boxRetained:box.retained??[],volumesAfterClose:[...volumes.keys()],operations,stages:fs.readFileSync(path.join(workDir,stageFile),'utf8').trim().split('\n').map(JSON.parse),files:fs.readdirSync(workDir)}));
