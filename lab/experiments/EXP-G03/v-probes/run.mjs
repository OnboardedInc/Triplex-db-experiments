// [EXP-G03] Why: all workloads and helpers enter BoxExecutor; lifecycle admission/removal stays in engine.mjs. Rejected: host SQLite or direct docker run (different filesystem/clock/isolation).
import fs from 'node:fs';import path from 'node:path';import {spawn,spawnSync,execFileSync} from 'node:child_process';import {createInterface} from 'node:readline';import {randomBytes,createHmac,createHash} from 'node:crypto';
import {BoxExecutor} from '../../../bin/box.mjs';import {docker,dockerArgs,sha256,REPO,parseArgs,inspect} from '../../../bin/lib.mjs';import {judge} from './check.mjs';
async function fileHash(p){const h=createHash('sha256');for await(const b of fs.createReadStream(p))h.update(b);return h.digest('hex')}
const {options:o}=parseArgs(process.argv.slice(2));
if(!o.out||!o.image||!o.probe||!o['source-commit'])throw Error('--out DIR --image receipt.json --probe V1..V7 --source-commit FULLSHA required');
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();if(head!==o['source-commit']||!/^[a-f0-9]{40}$/.test(head))throw Error('source commit mismatch');
if(execFileSync('git',['status','--porcelain','--untracked-files=no'],{encoding:'utf8'}).trim())throw Error('dirty tracked source');
const out=path.resolve(o.out);fs.mkdirSync(out,{recursive:true});if(fs.readdirSync(out).length)throw Error('output directory must be empty');const attempt=randomBytes(16).toString('hex'),holder='CX-G03-V',image=JSON.parse(fs.readFileSync(o.image));
const binding={attempt,sourceCommit:head,imageId:image.imageId,buildInputsSha256:image.buildInputsSha256,probe:o.probe,querySha256:o.query?sha256(fs.readFileSync(o.query)):null};
const expectedInputs=sha256(Buffer.concat([Buffer.from(image.base??''),...['Dockerfile','sync-hook.c','probe.py','relay.mjs'].flatMap(p=>[Buffer.from(p),fs.readFileSync(path.join(import.meta.dirname,p))])]));if(expectedInputs!==image.buildInputsSha256)throw Error('image receipt does not match this probe source');
const observations=[];let box,cleanupError,failed;const put=b=>{const h=sha256(b);fs.writeFileSync(path.join(out,h),b);return h};
const engine=(action,args=[])=>{const r=spawnSync(process.execPath,['lab/bin/engine.mjs','box',action,'--run',attempt,'--holder',holder,'--controller-pid',String(process.pid),...args],{encoding:'utf8',timeout:180000});if(r.status!==0)throw Error(r.stderr||r.stdout);return JSON.parse(r.stdout)};
const store=`tx2-g03-${attempt}-store`;engine('volume',['--name',store]);
try{
 box=new BoxExecutor({config:{...image,store,storeListingSha256:sha256(Buffer.from('[]'))},workDir:out,holder,put});
 const volume=box.volume('data'), mounts=[{name:volume,target:'/work',rw:true}];binding.volume=volume;binding.boxRun=box.run;
 function create(suffix,op,args=[],spec={}){return box.create(suffix,{argv:['python3','/opt/probes/probe.py',op,...args],mounts,memory:134217728,env:[`PROBE_ATTEMPT=${attempt}`],...spec})}
 async function start(name){const filename=path.join(out,name+'.stdout'),errfile=filename+'.stderr';const fd=fs.openSync(filename,'wx'),err=fs.openSync(errfile,'wx');
  try{await new Promise((resolve,reject)=>{const p=spawn('docker',dockerArgs(['start','-a',name]),{stdio:['ignore',fd,err]});const t=setTimeout(()=>{p.kill();reject(Error('probe timeout; container cleanup required'))},180000);p.on('error',reject);p.on('close',code=>{clearTimeout(t);code===0&&inspect(name)?.State.ExitCode===0?resolve():reject(Error(`probe ${name} exit ${code}`))})});return JSON.parse(fs.readFileSync(filename));}finally{fs.closeSync(fd);fs.closeSync(err)}}
 function retain(raw){if(raw.attempt!==attempt)throw Error('stale probe output');const row={...raw,binding};observations.push(row);return row.data}
 function command(code){const n=box.create('control-'+randomBytes(3).toString('hex'),{argv:['node','-e',code],mounts,memory:67108864});const r=box.start(n);box.remove(n);if(r.status)throw Error('control failed '+r.stderr);return r.stdout.toString()}
 const touch=name=>command(`require('fs').writeFileSync('/work/${name}',${JSON.stringify(attempt)})`);
 if(['V1','V6'].includes(o.probe)){
  const slot=box.engine('slot',['--lane','qlever','--slot','s1']);binding.slot={containerId:slot.container.Id,image:slot.container.Image,configSha256:slot.container.Config.Labels['tx2.config-sha256']};
  if(!o.query)throw Error('explicit SELECT query file required');
  const upstream=Object.values(slot.container.NetworkSettings.Networks).map(n=>n.IPAddress).find(Boolean);if(!upstream)throw Error('no slot address');
  const query=fs.readFileSync(o.query,'utf8');
  async function load(mode){
   const net=box.prefix+'net-'+mode;box.engine('network',['--name',net]);box.resources.push(['network',net]);
   const relay=box.create('relay-'+mode,{argv:['node','/opt/probes/relay.mjs',mode],network:'bridge',mounts,cpuset:'5',memory:67108864,env:[`PROBE_ATTEMPT=${attempt}`,`PROBE_UPSTREAM=${upstream}:7019`,`PROBE_CAPTURE_KEY=${randomBytes(32).toString('hex')}`]});
   // Trusted relay is dual-homed just as box.arm's byte pipe; no candidate is present.
   box.engine('connect',['--name',relay,'--network',net]);const rp=start(relay);
   command("const fs=require('fs');let i=0;const t=setInterval(()=>{if(fs.existsSync('/work/relay-ready')){clearInterval(t);process.exit(0)}if(++i>3000)process.exit(2)},10)");
   const reader=box.create('reader-'+mode,{argv:['node','/opt/probes/relay.mjs','reader'],network:net,mounts,memory:805306368,pids:512,cpuset:'4',env:[`PROBE_ATTEMPT=${attempt}`,'PROBE_URL=http://engine:7019',`PROBE_QUERY=${query}`]});
   const cpu=name=>Number(docker(['exec',name,'cat','/sys/fs/cgroup/cpu.stat']).match(/usage_usec (\d+)/)[1]);
   const a=cpu(slot.info.container),b=cpu(relay),t=process.hrtime.bigint();const result=await start(reader),elapsed=Number(process.hrtime.bigint()-t)/1e9;
   const engineCores=(cpu(slot.info.container)-a)/1e6/elapsed,relayCores=(cpu(relay)-b)/1e6/elapsed;touch('stop');const relayResult=await rp;
   // Capture files remain raw evidence, exported through a trusted box before volume removal.
   let captureVerified=false;
   if(mode==='capture'){
    const exportName=box.create('export-capture',{argv:['node','-e',"require('fs').createReadStream('/work/capture.ndjson').pipe(process.stdout)"],mounts,memory:67108864});
    const file=path.join(out,'capture.ndjson'),fd=fs.openSync(file,'wx');try{const r=spawnSync('docker',dockerArgs(['start','-a',exportName]),{stdio:['ignore',fd,'pipe'],timeout:60000});if(r.status!==0)throw Error('capture export failed')}finally{fs.closeSync(fd)}
    const key=inspect(relay).Config.Env.find(e=>e.startsWith('PROBE_CAPTURE_KEY=')).slice(18);let prev='0'.repeat(64),seq=0;
    for await(const line of createInterface({input:fs.createReadStream(file),crlfDelay:Infinity})){const x=JSON.parse(line);if(x.record.attempt!==attempt||x.record.seq!==seq++||x.record.prev!==prev||x.hmac!==createHmac('sha256',Buffer.from(key,'hex')).update(JSON.stringify(x.record)).digest('hex'))throw Error('capture chain');prev=x.hmac;}
    captureVerified=seq>0&&seq===relayResult.data.seq&&prev===relayResult.data.head;
   }
   box.remove(reader);box.remove(relay);command("for(const p of ['stop','relay-ready','capture.ndjson','reader.json','plain.json','capture.json'])require('fs').rmSync('/work/'+p,{force:true})");
   return {raw:result,data:{...result.data,mode,engineCores,relayCores,captureVerified}};
  }
  if(o.probe==='V6'){for(const mode of ['plain','capture']){const r=await load(mode);retain({...r.raw,data:r.data})}}
  else {
   const idle=create('idle','V1',[],{cpuset:'2'});retain(await start(idle)).load='idle';box.remove(idle);
   // V1 busy includes the same 256 closed-loop load; sync samples run while it is in flight.
   const busy=load('plain');const busyVolume=box.volume('busy-data');binding.busyVolume=busyVolume;const name=create('busy','V1',[],{cpuset:'2',mounts:[{name:busyVolume,target:'/work',rw:true}]});const result=await start(name);box.remove(name);const row=retain(result);row.load='busy';row.workload=(await busy).data;
  }
 } else if(o.probe==='V2')retain(await start(create('v2','V2')));
 else if(['V3','V4','V5'].includes(o.probe)){
  const roles=o.probe==='V3'?['writer','observer']:o.probe==='V4'?['server','client']:['watcher','writer'];
  const names=roles.map((role,i)=>create(o.probe+'-'+role,o.probe==='V3'?o.probe+'-'+role:o.probe,o.probe==='V3'?[]:[role],{cpuset:i===0?'2':'5'}));
  for(const raw of await Promise.all(names.map(start)))retain(raw);
 } else if(o.probe==='V7'){
  const caps={broker:1073741824,consumer:536870912,reader:805306368,driver:1073741824,observer:268435456,relay:67108864},names=[];
  for(const [role,memory]of Object.entries(caps))names.push(create('memory-'+role,'V7',[role],{memory,cpuset:role==='broker'?'2':role==='consumer'?'3':role==='reader'?'4':'5'}));
  const pending=names.map(start);await new Promise(r=>setTimeout(r,10000));binding.layoutInspects=names.map(n=>inspect(n));touch('memory-release');for(const raw of await Promise.all(pending))retain(raw);
 } else throw Error('unknown probe');
}catch(e){failed=String(e);process.exitCode=2}
finally{
 try{if(box)box.close();engine('remove-volume',['--name',store])}catch(e){cleanupError=String(e);process.exitCode=2}
 const result=judge(o.probe,observations,binding);if(failed||cleanupError){result.status='NOT-ESTABLISHED';result.refusals.push(failed??cleanupError)}
 fs.writeFileSync(path.join(out,'observations.json'),JSON.stringify(observations,null,2));fs.writeFileSync(path.join(out,'receipt.json'),JSON.stringify({...result,failed,cleanupError,records:box?.records,remaining:box?.resources},null,2));
 for(const name of fs.readdirSync(out)){const p=path.join(out,name);if(fs.statSync(p).isFile())fs.appendFileSync(path.join(out,'SHA256SUMS.tmp'),`${await fileHash(p)}  ${name}\n`)}fs.renameSync(path.join(out,'SHA256SUMS.tmp'),path.join(out,'SHA256SUMS'));
 console.log(JSON.stringify(result));if(result.status!=='OBSERVED')process.exitCode=2;
}
