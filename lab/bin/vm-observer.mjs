// [EXP-OBS01-R6] Why: evaluator provisioning, keys, mounts and lifecycle stay behind engine.mjs.
// Rejected: candidate-started observers or candidate-writable evidence volumes.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {witnessUp,witnessStop} from './sync-witness.mjs';
import {REPO,ENGINE_DIR,admission,atomicJson,defaultHolder,docker,inspect,listTx2Containers,reconcile,sha256,vmDisk,withPool,fail,sleep} from './lib.mjs';
const SRC=path.join(REPO,'lab/observer');
const files=['collector.py','capture.py','vm_normalizer.py','vm_watch.py','vm_fixture.py','vm_syncwitness.bt'];
const safe=value=>typeof value==='string'&&/^[a-zA-Z0-9_-]{1,80}$/.test(value);
export function vmAvailable(config,{minimumGiB=10}={}){
 const disk=fs.statfsSync(REPO),running=listTx2Containers().filter(c=>c.running);
 const busy=running.filter(c=>/g03|nsr|p-tiny/i.test(c.name)||/CX-G03/i.test(inspect(c.name)?.Config.Labels?.['tx2.holder']??''));
 return {available:disk.bavail*disk.bsize>minimumGiB*1024**3&&!busy.length,freeBytes:disk.bavail*disk.bsize,busy:busy.map(c=>c.name)};
}
export function pinImage(image){if(!/^sha256:[a-f0-9]{64}$/.test(image??'')&&!/@sha256:[a-f0-9]{64}$/.test(image??''))fail('REFUSED','immutable observer image required');const doc=JSON.parse(docker(['image','inspect',image]))[0];return doc.Id;}
export function harden(name,holder,image,cpu,extra=[],argv=[]){return ['create','--name',name,'--label','tx2.managed-by=lab/bin/engine.mjs','--label',`tx2.holder=${holder}`,'--read-only','--network','none','--cap-drop','ALL','--security-opt','no-new-privileges','--pids-limit','64','--memory','268435456','--memory-swap','268435456','--cpus','1','--cpuset-cpus',String(cpu),'--tmpfs','/tmp:rw,nosuid,nodev,size=128m',...extra,image,...argv];}
export async function reserve(config,name,holder,cpu,keyFingerprint=null){await withPool(async ledger=>{
 const running=listTx2Containers({all:true});reconcile(ledger,running);
 if(ledger.reservations.some(r=>r.container===name)||inspect(name))fail('REFUSED','name already owned');
 const verdict=admission({config,reservations:ledger.reservations,running,request:{container:name,memBytes:268435456,diskForecastBytes:128*1024**2},diskUsedBytes:vmDisk(config).usedBytes});
 if(!verdict.ok)fail('REFUSED',verdict.reasons.join('; '));
 if(keyFingerprint){ledger.vmObserverKeys??={};if(ledger.vmObserverKeys[keyFingerprint])fail('REFUSED','VM observer requires a fresh evaluator key per run');ledger.vmObserverKeys[keyFingerprint]=name;}
 ledger.reservations.push({container:name,holder,memBytes:268435456,cpus:1,cpusetCpus:String(cpu),diskForecastBytes:128*1024**2,state:'starting',pid:process.pid});
 });}
export async function remove(name,holder){const c=inspect(name);if(c){if(c.Config.Labels?.['tx2.holder']!==holder)fail('REFUSED','foreign container');if(c.State.Running)docker(['kill','--signal','KILL',name]);docker(['rm',name]);}
 await withPool(async ledger=>{if(inspect(name))fail('REFUSED','container survived cleanup');ledger.reservations=ledger.reservations.filter(r=>r.container!==name);});}
export async function waitFile(file,container,ms=30000){const until=Date.now()+ms;while(!fs.existsSync(file)){if(Date.now()>until||!inspect(container)?.State.Running)throw Error('timeout/exit waiting for '+file);await sleep(20);}}
function prepareCode(dir){fs.mkdirSync(dir,{recursive:true});const pins={};for(const file of files){const raw=fs.readFileSync(path.join(SRC,file));fs.writeFileSync(path.join(dir,file),raw,{flag:'wx'});pins[file]=sha256(raw);}return pins;}
function configFor(spec,sutDoc,image,code,cpu){const parser=sha256(fs.readFileSync(path.join(code,'vm_normalizer.py')));return {runId:spec.runId,receiptId:spec.runId,keyId:spec.runId,case:spec,maxUncertaintyMs:1,maxBundleBytes:512*1024**2,
 collector:{containerId:'evaluator-provisioned-'+spec.runId,sourceSha256:sha256(JSON.stringify(files.map(f=>sha256(fs.readFileSync(path.join(code,f)))))),imageDigest:image,cgroupPath:'host-cgroup-tree',cpuset:String(cpu)},
 sut:{lane:'qlever',slot:'ns-run',engineContainerId:sutDoc.Id,engineImageDigest:sutDoc.Image,engineConfigSha256:sha256(JSON.stringify({Config:sutDoc.Config,HostConfig:sutDoc.HostConfig,Mounts:sutDoc.Mounts})),enginePids:[]},
 streams:[{streamId:'vm-publication',kind:'DR/any/H6',sourceId:'H6',endpoint:'private-source-volumes',method:'scan',cadenceMs:.25,normalizerFile:'vm_normalizer.py',normalizer:{id:'obs01-vm-sql01-fd01',version:'1',sha256:parser}}]};}
export async function vmObserverCommand(config,command,options){
 if(command==='observer-vm-status'){console.log(JSON.stringify(vmAvailable(config)));return;}
 if(command==='observer-vm-probe')return probe(config,options);
 const holder=defaultHolder(options),run=options['run-id'];if(!safe(run))fail('USAGE','safe --run-id required');
 const dir=path.join(ENGINE_DIR,'vm-observers',run),name='tx2-obs-vm-'+run;
 if(command==='observer-vm-cleanup'){
  const saved=JSON.parse(fs.readFileSync(path.join(dir,'controller.json')));if(saved.holder!==holder)fail('REFUSED','foreign observer');
  const observed=JSON.parse(fs.readFileSync(path.join(dir,'output/observed-config.json')));
  const prior=inspect(name);if(prior){atomicJson(path.join(dir,'cleanup-inspect.json'),prior);fs.writeFileSync(path.join(dir,'cleanup-logs.txt'),docker(['logs',name],{allowFail:true})??'');}
  await remove(name,holder);
  const proofFile=path.resolve(options.out??path.join(dir,'cgroup-gone.json'));
  await proveGone(config,holder,saved.image,path.join(dir,'code'),observed.collector.containerId,observed.collector.cgroupPath,proofFile);
  console.log(JSON.stringify({removed:name,proofFile,claim:'cleanup proof only'}));return;
 }
 if(command==='observer-vm-stop'){
  const saved=JSON.parse(fs.readFileSync(path.join(dir,'controller.json')));if(saved.holder!==holder)fail('REFUSED','foreign observer');
  fs.writeFileSync(path.join(dir,'control/stop'),'stop',{flag:'wx'});
  if(saved.witness)await witnessStop(config,holder,saved,dir,options);
  for(let i=0;i<600&&inspect(name)?.State.Running;i++)await sleep(100);
  const end=inspect(name);atomicJson(path.join(dir,'exit.json'),end);
  if(!end||end.State.Running||end.State.ExitCode!==0)fail('REFUSED','observer did not seal; retain failed evidence before cleanup');
  const replay=spawnSync('python3',['-B','-E','-s',path.join(SRC,'vm_verify.py'),dir,path.join(REPO,'lab/acceptance/oracle/observe.py'),end.Id],{encoding:'utf8',timeout:120000,maxBuffer:8*1024**2});
  atomicJson(path.join(dir,'verified.json'),{status:replay.status,stdout:replay.stdout,stderr:replay.stderr});
  if(replay.status!==0)fail('REFUSED','O-OBS normalizer re-execution failed; retain observer evidence');
  await remove(name,holder);console.log(JSON.stringify({dir,sealed:fs.existsSync(path.join(dir,'output/bundle/seal.json'))}));return;
 }
 if(command!=='observer-vm-up')fail('USAGE','unknown VM observer command');
 const spec=JSON.parse(fs.readFileSync(options.spec)),image=pinImage(options.image),cpu=Number(options['observer-cpus']??5);
 if(spec.runId!==run||!Number.isInteger(cpu)||cpu<0||cpu>=config.vm.cpus||!Array.isArray(spec.sources)||!spec.sources.length)fail('REFUSED','run/source/CPU binding');
 const mounts=[],ids=[];spec.clockPids={};
 for(const source of spec.sources){if(!safe(source.id)||!['sql01','fd01'].includes(source.profile)||(!/^[a-zA-Z0-9_-][a-zA-Z0-9_.-]{0,80}$/.test(source.file??'')||source.file.includes('..')))fail('REFUSED','source profile/path');
  const c=inspect(source.container);if(!c?.State.Running||c.Id!==source.engineContainerId||c.Config.Labels?.['tx2.holder']!==holder)fail('REFUSED','source container identity/holder');
  const volume=c.Mounts.find(m=>m.Name===source.volume);if(!volume)fail('REFUSED','source volume not bound');
  source.path='/sources/'+source.id+'/'+source.file;mounts.push('-v',source.volume+':/sources/'+source.id+':ro');ids.push(c.Id);spec.clockPids[source.id]=c.State.Pid;
 }
 spec.cgroups=ids;
 // [EXP-OBS01-R9] Why: a witnessed run binds the trusted sync-witness container, its volume and the writers' cgroup ids into the case.
 // Rejected: letting the observer discover the witness itself (the controller inspects and profile-checks it, Q108a).
 const witnessSpec=spec.witness?await witnessUp(config,holder,spec,mounts):null;
 const key=fs.readFileSync(options['key-file']);if(key.length!==32)fail('REFUSED','evaluator key must be 32 bytes');
 await reserve(config,name,holder,cpu,sha256(key));
 try{fs.mkdirSync(dir,{recursive:true});const code=path.join(dir,'code'),pins=prepareCode(code);fs.mkdirSync(path.join(dir,'control'));fs.mkdirSync(path.join(dir,'output'));
  fs.writeFileSync(path.join(dir,'external.key'),key,{flag:'wx',mode:0o600});
  const plan=configFor(spec,inspect(spec.sources[0].container),image,code,cpu);atomicJson(path.join(dir,'config.json'),plan);atomicJson(path.join(dir,'controller.json'),{holder,name,pins,image,ids,witness:witnessSpec?{container:witnessSpec.container,volume:witnessSpec.volume}:null});
  docker(harden(name,holder,image,cpu,['--pid','host','--cgroupns','host','-v','/sys/fs/cgroup:/sys/fs/cgroup:ro',...mounts,'-v',code+':/code:ro','-v',path.join(dir,'config.json')+':/config.json:ro','-v',path.join(dir,'external.key')+':/key:ro','-v',path.join(dir,'control')+':/control','-v',path.join(dir,'output')+':/out'],['python3','-B','/code/vm_watch.py','--config','/config.json','--key','/key','--output','/out/bundle','--control','/control']));
  docker(['start',name]);await waitFile(path.join(dir,'control/ready'),name);console.log(JSON.stringify({dir,name,pins,config:plan}));
 }catch(error){await remove(name,holder);throw error;}
}

async function probe(config,options){
 const out=path.resolve(options.out??''),holder=defaultHolder(options),check=vmAvailable(config);
 fs.mkdirSync(out,{recursive:false});atomicJson(path.join(out,'preflight.json'),check);
 if(!check.available){atomicJson(path.join(out,'RESULT.json'),{status:'NOT-RUN',reason:'G03 busy or free disk <=10 GiB',check});return;}
 const image=pinImage(options.image),nonce=randomBytes(6).toString('hex'),code=path.join(out,'code');const pins=prepareCode(code);const rounds=[];const remaining=[];let failure;
 try{
  for(const [index,observed] of [false,true,true,false].entries()){
   const run='obs6-'+nonce+'-'+index,name='tx2-obs6-writer-'+run,volume=name+'-data',dir=path.join(out,String(index));fs.mkdirSync(dir);const control=path.join(dir,'writer');fs.mkdirSync(control);
   if(!vmAvailable(config).available)throw Error('G03 began VM work or disk fell below 10 GiB; stop');
   let obs,madeVolume=false,reserved=false;
   try{
    await reserve(config,name,holder,4);reserved=true;if(docker(['volume','inspect',volume],{allowFail:true}))throw Error('fixture volume already exists; no takeover');docker(['volume','create','--label',`tx2.holder=${holder}`,'--label',`tx2.run=${run}`,volume]);const created=JSON.parse(docker(['volume','inspect',volume]))[0];if(created.Labels?.['tx2.holder']!==holder||created.Labels?.['tx2.run']!==run)throw Error('volume ownership mismatch');madeVolume=true;remaining.push(volume);
    docker(harden(name,holder,image,4,['--cgroupns','host','-v',volume+':/data','-v',code+':/code:ro','-v',control+':/control'],['python3','-B','/code/vm_fixture.py','--path','/data/broker.db','--control','/control','--samples',String(options.samples??500)]));docker(['start',name]);await waitFile(path.join(control,'ready'),name);
    const writer=inspect(name);atomicJson(path.join(dir,'writer-inspect.json'),writer);
    const initial=JSON.parse(docker(['exec',name,'python3','-c',"import json,pathlib; p='/sys/fs/cgroup'+pathlib.Path('/proc/self/cgroup').read_text().strip().split('::',1)[1]; print(json.dumps({'path':p,'events':pathlib.Path(p+'/cgroup.events').read_text()}))"]));
    if(!initial.path.includes(writer.Id))throw Error('writer cgroup binding not visible');atomicJson(path.join(dir,'writer-cgroup-seen.json'),initial);
    if(observed){
     const spec={runId:run,durationSeconds:120,sources:[{id:'broker',profile:'sql01',file:'broker.db',container:name,engineContainerId:writer.Id,volume}]};
     const specFile=path.join(dir,'spec.json'),key=path.join(dir,'key');atomicJson(specFile,spec);fs.writeFileSync(key,randomBytes(32),{mode:0o600});
     obs=run;await vmObserverCommand(config,'observer-vm-up',{'run-id':run,holder,image,spec:specFile,'key-file':key,'observer-cpus':5});obs=run;await sleep(100);
    }
    fs.writeFileSync(path.join(control,'go'),'go');await waitFile(path.join(control,'samples.json'),name,120000);
    const samples=JSON.parse(fs.readFileSync(path.join(control,'samples.json')));if(samples.count!==Number(options.samples??500)||samples.rowsPerCommit!==10||samples.samplesNs.length!==samples.count||samples.samplesNs.some(x=>!Number.isSafeInteger(x)||x<=0))throw Error('incomplete writer samples');
    const sorted=[...samples.samplesNs].sort((a,b)=>a-b),p99=sorted[Math.ceil(sorted.length*.99)-1];rounds.push({index,observed,p99,samples:samples.samplesNs,writerId:writer.Id});
    await remove(name,holder);
    await proveGone(config,holder,image,code,writer.Id,initial.path,path.join(dir,'writer-gone.json'));
    if(obs){await sleep(1500);const observerContainer=inspect('tx2-obs-vm-'+obs);const observedConfig=JSON.parse(fs.readFileSync(path.join(ENGINE_DIR,'vm-observers',obs,'output/observed-config.json')));
     await vmObserverCommand(config,'observer-vm-stop',{'run-id':obs,holder});
     await proveGone(config,holder,image,code,observerContainer.Id,observedConfig.collector.cgroupPath,path.join(dir,'observer-gone.json'));
     const source=path.join(ENGINE_DIR,'vm-observers',obs);fs.cpSync(source,path.join(dir,'observer'),{recursive:true});
     const normalized=JSON.parse(fs.readFileSync(path.join(source,'output/bundle/normalized/sources/vm-publication.json')));if(!normalized.gone.some(g=>g.containerId===writer.Id))throw Error('writer cgroup-gone not proven');
    }
   }finally{if(obs){const source=path.join(ENGINE_DIR,'vm-observers',obs);if(fs.existsSync(source)&&!fs.existsSync(path.join(dir,'observer')))fs.cpSync(source,path.join(dir,'observer'),{recursive:true});}
    if(reserved)await remove(name,holder);if(obs&&inspect('tx2-obs-vm-'+obs)){try{await vmObserverCommand(config,'observer-vm-cleanup',{'run-id':obs,holder,out:path.join(dir,'observer-gone.json')});}catch(error){failure??='observer cleanup proof failed: '+error;}failure??='observer cleanup before seal';}
    if(madeVolume&&docker(['volume','inspect',volume],{allowFail:true})){docker(['volume','rm',volume]);remaining.splice(remaining.indexOf(volume),1);}}
  }
 }catch(error){failure=String(error);}
 finally{
  for(const [argv,file] of [[['colima','ssh','-p','triplex2','--','sudo','fstrim','-av'],'fstrim.json'],[['docker','context','use','colima'],'context.json']]){const process=spawnSync(argv[0],argv.slice(1),{encoding:'utf8'});atomicJson(path.join(out,file),{status:process.status,stdout:process.stdout,stderr:process.stderr});if(process.status!==0)failure??='cleanup command failed';}
  const ratios=rounds.length===4?[rounds[1].p99/rounds[0].p99,rounds[2].p99/rounds[3].p99]:[];
  const status=failure||remaining.length?'REFUSED':ratios.some(r=>r>1.05)?'FAIL':'PASS';
  atomicJson(path.join(out,'RESULT.json'),{status,ratios,rounds,failure,remaining,pins,image,claim:'broker-shaped VM observer overhead only; no NS acceptance or host power-loss durability'});
  console.log(JSON.stringify({out,status,ratios,failure}));if(status!=='PASS')process.exitCode=2;
 }
}

async function proveGone(config,holder,image,code,targetId,priorPath,file){
 const nonce=randomBytes(16).toString('hex'),name='tx2-obs6-proof-'+nonce;
 if(!priorPath.includes(targetId))throw Error('cgroup proof lacks earlier bound path');
 await reserve(config,name,holder,5);
 try{
  const program="import json,pathlib,sys;sys.path.insert(0,'/code');from vm_watch import gone_probe;p='/sys/fs/cgroup'+pathlib.Path('/proc/self/cgroup').read_text().strip().split('::',1)[1];v=gone_probe('/sys/fs/cgroup',sys.argv[1],p,{'path':sys.argv[2]});v['nonce']=sys.argv[3];print(json.dumps(v))";
  docker(harden(name,holder,image,5,['--cgroupns','host','-v','/sys/fs/cgroup:/sys/fs/cgroup:ro','-v',code+':/code:ro'],['python3','-B','-c',program,targetId,priorPath,nonce]));
  const raw=docker(['start','-a',name]);const end=inspect(name),proof=JSON.parse(raw);
  if(end.State.ExitCode!==0||proof.event!=='cgroup-gone'||proof.containerId!==targetId||proof.path!==priorPath||proof.nonce!==nonce||!proof.selfVisible)throw Error('cgroup proof refused');
  atomicJson(file,{proof,helperId:end.Id,helperImage:end.Image,rawSha256:sha256(raw),claim:'trusted VM readback; no Mac timing claim'});
 }finally{await remove(name,holder);}
}
