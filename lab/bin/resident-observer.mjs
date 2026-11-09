// [EXP-OBS01] Why: admit observer-only resident probes without acquiring or reconfiguring a resident.
// Rejected: treating a resident as an exclusive slot or publishing new ports on its container.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {ENGINE_DIR,REPO,POOL_FILE,admission,atomicJson,defaultHolder,docker,dockerArgs,fail,cpusetOverlap,inspect,listTx2Containers,readJson,reconcile,sha256,vmDisk,withPool} from './lib.mjs';
export async function residentObserver(config,info,opts){
 if(info.mode!=='resident'||info.lane!=='xtdb')fail('REFUSED','resident native diagnostic profile currently requires XTDB dev');
 const engine=inspect(info.container);if(!engine?.State.Running)fail('REFUSED','resident is not running');
 const id=opts['run-id'];if(!/^[A-Za-z0-9_-]{1,80}$/.test(id??''))fail('USAGE','safe run id required');
 if(!/@sha256:[a-f0-9]{64}$/.test(opts.image??''))fail('USAGE','digest-pinned Python image required');
 const key=fs.realpathSync(opts['key-file']);if(fs.readFileSync(key).length!==32)fail('USAGE','32 byte evaluator key required');
 const dir=path.join(ENGINE_DIR,'observers',id),name='tx2-obs-resident-'+id;
 if(fs.existsSync(dir)||inspect(name))fail('REFUSED','run id already exists');
 const holder=defaultHolder(opts),memBytes=128*1024*1024,diskForecastBytes=64*1024*1024;
 await withPool(async ledger=>{
  const running=listTx2Containers({all:true});reconcile(ledger,running);
  for(const c of running)if(c.running&&inspect(c.name)?.HostConfig.CpusetCpus&&cpusetOverlap(inspect(c.name).HostConfig.CpusetCpus,'5',config.vm.cpus).length)fail('REFUSED','resident observer CPU overlaps pinned '+c.name);
  for(const r of ledger.reservations)if(r.cpusetCpus&&cpusetOverlap(r.cpusetCpus,'5',config.vm.cpus).length)fail('REFUSED','resident observer CPU already reserved');
  const verdict=admission({config,reservations:ledger.reservations,running,request:{container:name,memBytes,diskForecastBytes},diskUsedBytes:vmDisk(config).usedBytes});
  if(!verdict.ok)fail('REFUSED',verdict.reasons.join('; '));
  const registry=path.join(ENGINE_DIR,'observers/key-fingerprints.json'),keys=readJson(registry,{}),fingerprint=sha256(fs.readFileSync(key));
  if(keys[fingerprint]||Object.values(keys).some(k=>k.keyId===id+'-key'))fail('REFUSED','fresh evaluator key and key-id required');
  keys[fingerprint]={runId:id,keyId:id+'-key'};atomicJson(registry,keys);
  ledger.reservations.push({container:name,holder,role:'resident-observer',state:'starting',pid:process.pid,memBytes,diskForecastBytes,cpus:1,cpusetCpus:'5'});
 });
 try{
  fs.mkdirSync(dir,{mode:0o700});const code=path.join(dir,'code');fs.mkdirSync(code);fs.mkdirSync(path.join(dir,'output'));
  const spec=JSON.parse(fs.readFileSync(opts.spec,'utf8'));if(!spec.resident||!Array.isArray(spec.sources))fail('USAGE','resident case/source specification required');
  if(!/^obs01r3_[a-z0-9_]+$/.test(spec.relation)||!Number.isSafeInteger(spec.population?.n)||spec.population.n<1||spec.population.n>64||spec.population.width!==1)fail('REFUSED','resident probes require an owned relation and tiny width-1 population');
  if(spec.sources.some(([sid,kind])=>!/^[-A-Za-z0-9_]+$/.test(sid)||!/^[-A-Za-z0-9]+\/(xtdb|any)\/[A-Za-z0-9_.]+$/.test(kind)))fail('REFUSED','unsafe stream metadata');
  atomicJson(path.join(dir,'case.json'),spec);
  for(const file of fs.readdirSync(path.join(REPO,'lab/observer')).filter(n=>n.endsWith('.py')))fs.copyFileSync(path.join(REPO,'lab/observer',file),path.join(code,file));
  for(const file of ['engine.mjs','resident-observer.mjs','lib.mjs'])fs.copyFileSync(path.join(REPO,'lab/bin',file),path.join(code,file));
  const streams=spec.sources.map(([sid,kind])=>{
   const sourceId=kind.split('/').at(-1),normalizerFile=sid+'.normalize.py';
   const result=spawnSync('python3',['-I','-B',path.join(code,'compile_protocol.py'),path.join(dir,'case.json'),sourceId,path.join(code,normalizerFile)],{encoding:'utf8'});
   if(result.status!==0)fail('REFUSED','parser compile: '+result.stderr);
   return {streamId:sid,sourceId,kind,endpoint:'resident:'+engine.Id,method:'capture',reader:'resident',cadenceMs:100,normalizerFile,normalizer:{id:'obs01-resident-protocol',version:'3',sha256:sha256(fs.readFileSync(path.join(code,normalizerFile)))}};
  });
  const cg='/sys/fs/cgroup'+(engine.Id.includes('/')?'':`/docker/${engine.Id}`);
  const plan={runId:id,receiptId:id,keyId:id+'-key',case:spec,maxUncertaintyMs:100,maxBundleBytes:diskForecastBytes,streams,
   collector:{imageDigest:opts.image,sourceSha256:sha256(fs.readFileSync(path.join(code,'resident_collect.py'))),configSha256:'pending',containerId:name,cgroupPath:cg,cpuset:'5',isolation:'unqualified overlap with unpinned residents'},
   sut:{lane:info.lane,engineContainerId:engine.Id,engineImageDigest:engine.Image,engineConfigSha256:engine.Config.Labels['tx2.config-sha256'],enginePids:[]}};
  atomicJson(path.join(dir,'config.json'),plan);atomicJson(path.join(dir,'resident-before.json'),engine);
  docker(['run','--name',name,'--label','tx2.managed-by=lab/bin/engine.mjs','--label',`tx2.holder=${holder}`,'--label','tx2.role=observer',
   '--network',`container:${engine.Id}`,'--pid',`container:${engine.Id}`,'--cgroupns','host','--read-only','--cap-drop','ALL','--cap-add','DAC_READ_SEARCH','--security-opt','no-new-privileges',
   '--memory',String(memBytes),'--memory-swap',String(memBytes),'--cpus','1','--cpuset-cpus','5',
   '-v',`${info.volume}:/engine:ro`,'-v','/sys/fs/cgroup:/sys/fs/cgroup:ro','-v',`${code}:/collector:ro`,'-v',`${dir}/config.json:/config.json:ro`,'-v',`${key}:/run/key:ro`,'-v',`${dir}/output:/obs`,
   '--entrypoint','python3',opts.image,'-I','-B','/collector/resident_collect.py']);
  const root=path.join(dir,'output/bundle'),envelope=readJson(path.join(root,'bundle.json')),index=readJson(path.join(root,'index.json'));
  const witnesses=envelope.streams.map(s=>{const chunks=index[s.streamId],last=chunks.at(-1),h=readJson(path.join(root,last.header));return {runId:id,streamId:s.streamId,seq:chunks.length-1,headSha256:last.headerSha256,tMono:h.tEndMono};});
  // This host witness is emitted by engine tooling, outside every observer mount.
  const witnessFile=fs.openSync(path.join(ENGINE_DIR,'observers/witness.jsonl'),'a');
  try{for(const w of witnesses)fs.writeSync(witnessFile,JSON.stringify(w)+'\n');fs.fsyncSync(witnessFile);}finally{fs.closeSync(witnessFile);}
  atomicJson(path.join(dir,'retention.json'),{runId:id,receiptId:id,keyId:id+'-key',engine:info.lane,bundleSha256:sha256(fs.readFileSync(path.join(root,'bundle.json'))),bridgeSha256:sha256(fs.readFileSync(path.join(root,'clock/bridge.jsonl'))),clockMaxUncertaintyMs:envelope.clock.maxUncertaintyMs,streams:envelope.streams.map(s=>({...s,normalizerPath:path.join(code,s.normalizerFile),chunks:index[s.streamId]})),witnessHeads:witnesses});
  console.log(JSON.stringify({retained:dir,sealed:fs.existsSync(path.join(root,'seal.json')),clockScope:'VM-local process bracket; not NS clock qualification'}));
 }finally{
  try{
   if(inspect(name)){const logs=spawnSync('docker',dockerArgs(['logs',name]),{encoding:'utf8',maxBuffer:8*1024*1024});fs.writeFileSync(path.join(dir,'container-stdout.txt'),logs.stdout??'');fs.writeFileSync(path.join(dir,'container-stderr.txt'),logs.stderr??'');const current=inspect(name);atomicJson(path.join(dir,'container-final.json'),current);if(current.State.Running)docker(['stop','-t','5',name]);docker(['rm',name]);}
   if(fs.existsSync(dir)){
    atomicJson(path.join(dir,'resident-after.json'),inspect(info.container));
    atomicJson(path.join(dir,'stopped.json'),{observer:name,absent:!inspect(name),holder,residentId:engine.Id});
   }
  }finally{
   const remaining=inspect(name);
   await withPool(async ledger=>{
    if(!remaining)ledger.reservations=ledger.reservations.filter(r=>r.container!==name);
    else {const r=ledger.reservations.find(r=>r.container===name);if(r)r.state='cleanup-failed';}
   });
  }
 }
}
