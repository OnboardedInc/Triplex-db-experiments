// [EXP-G03] Why: one attempt, no admission polling and no resident takeover. Rejected: retrying until the pool is free (would miss the commanded stop condition).
import fs from 'node:fs';import path from 'node:path';import {spawnSync,execFileSync} from 'node:child_process';import {randomBytes} from 'node:crypto';
import {docker,inspect,sha256,parseArgs,REPO} from '../../../bin/lib.mjs';
const {options:o}=parseArgs(process.argv.slice(2));if(!o.out)throw Error('--out durable empty directory required');
const out=path.resolve(o.out);fs.mkdirSync(out,{recursive:true});if(fs.readdirSync(out).length)throw Error('nonempty window directory');
const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),holder='CX-G03-V',run='vp'+randomBytes(6).toString('hex'),events=[];let admitted=false,entered=false;
function command(args,filename,timeout=240000){const r=spawnSync(args[0],args.slice(1),{encoding:'utf8',timeout,maxBuffer:8*1024*1024});fs.writeFileSync(path.join(out,filename),JSON.stringify({args,status:r.status,stdout:r.stdout,stderr:r.stderr,error:String(r.error??'')},null,2));if(r.status!==0||r.error)throw Error(filename+' failed');return r.stdout}
function status(filename){const s=command([process.execPath,'lab/bin/engine.mjs','status'],filename);if(/reservation tx2-(?:xtdb|qlever|datomic)-s[123]\b/.test(s))throw Error('exclusive reservation held: STOP, no waiting');return s}
const engine=(action,extra=[])=>command([process.execPath,'lab/bin/engine.mjs',action,'--lane','qlever','--slot','s1','--holder',holder,...extra],`slot-${action}.json`);
try{
 if(execFileSync('git',['status','--porcelain','--untracked-files=no'],{encoding:'utf8'}).trim())throw Error('tracked source must be committed');
 const disk=fs.statfsSync(REPO);if(disk.bavail*disk.bsize<5*1024**3)throw Error('host free below 5 GiB');
 status('status-before.json');if(inspect('tx2-datomic-dev'))throw Error('D resident is running; orchestrator must park it first (keep volume)');
 entered=true;
 const base='node:22.23.2-bookworm-slim@sha256:48e4b67d85f87bd551df43704e24d252f56cc5f8e9718841aace50f19948f0f9';
 const image=JSON.parse(command([process.execPath,'lab/bin/engine.mjs','box','prepare-v-probes','--run',run,'--name',`tx2-g03-${run}-build`,'--holder',holder,'--controller-pid',String(process.pid),'--base',base],'image-build.json',600000));fs.writeFileSync(path.join(out,'image.json'),JSON.stringify(image));
 const execute=id=>{const dir=path.join(out,id);const r=spawnSync(process.execPath,['lab/experiments/EXP-G03/v-probes/run.mjs','--out',dir,'--image',path.join(out,'image.json'),'--probe',id,'--query','lab/experiments/EXP-G03/v-probes/query.rq','--source-commit',commit],{encoding:'utf8',timeout:300000,maxBuffer:8*1024*1024});fs.writeFileSync(path.join(out,id+'-terminal.json'),JSON.stringify({status:r.status,stdout:r.stdout,stderr:r.stderr,error:String(r.error??'')}));events.push({id,status:r.status});if(r.error||!fs.existsSync(path.join(dir,'receipt.json')))throw Error(id+' failed before receipt');const receipt=JSON.parse(fs.readFileSync(path.join(dir,'receipt.json')));if(receipt.cleanupError||receipt.remaining?.length)throw Error(id+' cleanup incomplete');};
 for(const id of ['V2','V3','V4','V5','V7']){status('status-before-'+id+'.json');execute(id)}
 status('status-before-slot.json');if(docker(['volume','inspect','tx2-qlever-s1-data'],{allowFail:true}))throw Error('slot volume already exists; no takeover or deletion');
 engine('up',['--cpuset-cpus','0,1','--exp','EXP-G03-V']);admitted=true;
 const slot=inspect('tx2-qlever-s1'),ip=Object.values(slot.NetworkSettings.Networks).map(n=>n.IPAddress).find(Boolean);
 const {BoxExecutor}=await import('../../../bin/box.mjs');let box;const store=`tx2-g03-${run}-seed-store`;
 command([process.execPath,'lab/bin/engine.mjs','box','volume','--run',run,'--name',store,'--holder',holder],'seed-store.json');
 try{
  box=new BoxExecutor({config:{...image,store,storeListingSha256:sha256(Buffer.from('[]'))},workDir:out,holder,put:b=>{const h=sha256(b);fs.writeFileSync(path.join(out,h),b);return h}});
  const script=`(async()=>{const update='INSERT DATA { '+Array.from({length:1000},(_,i)=>Array.from({length:10},(_,j)=>'<urn:g03:probe:'+i+'> <urn:g03:probe:value> '+(i*10+j)+' .').join(' ')).join(' ')+' }';const r=await fetch('http://${ip}:7019',{method:'POST',headers:{'Content-Type':'application/sparql-update'},body:update});const raw=await r.text();if(!r.ok)throw Error(raw);console.log(raw)})().catch(e=>{console.error(e);process.exit(2)})`;
  const name=box.create('seed',{argv:['node','-e',script],network:'bridge',memory:134217728});const seeded=box.start(name);fs.writeFileSync(path.join(out,'seed.stdout'),seeded.stdout);if(seeded.status)throw Error('seed failed '+seeded.stderr);
 }finally{box?.close();command([process.execPath,'lab/bin/engine.mjs','box','remove-volume','--run',run,'--name',store,'--holder',holder],'seed-store-remove.json')}
 for(const id of ['V1','V6'])execute(id);
}catch(e){events.push({error:String(e)});process.exitCode=2}
finally{
 if(admitted)try{engine('down',['--remove-volume'])}catch(e){events.push({cleanupError:String(e)});process.exitCode=2}
 // D was already parked and is owned by the orchestrator: restoration is deliberately a no-op here.
 if(entered){for(const [args,file] of [[['colima','ssh','-p','triplex2','--','sudo','fstrim','-av'],'fstrim.json'],[['docker','context','use','colima'],'context.json']])try{command(args,file)}catch(e){events.push({cleanupError:String(e)});process.exitCode=2}}
 fs.writeFileSync(path.join(out,'window.json'),JSON.stringify({commit,events,parkedByThisAttempt:[],restoredByThisAttempt:[],qualification:false},null,2));console.log(JSON.stringify(events));
}
