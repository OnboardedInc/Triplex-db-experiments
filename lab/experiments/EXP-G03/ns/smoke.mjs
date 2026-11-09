// [EXP-G03-R5] Why: one source-bound VM smoke retains every first failure and tears down only owned resources. Rejected: accepting offline runs or parking shared residents to fit a smoke.
import fs from 'node:fs';import path from 'node:path';import net from 'node:net';import {execFileSync,spawnSync} from 'node:child_process';import {randomBytes,createHmac} from 'node:crypto';
import {BoxExecutor} from '../../../bin/box.mjs';import {runBoxedNS} from '../../../bin/ns-run.mjs';import {docker,inspect,sha256,parseArgs,REPO} from '../../../bin/lib.mjs';import {buildDriver} from '../../../bench/ns-driver/build.mjs';import {buildCandidate} from './build.mjs';
const {options:o}=parseArgs(process.argv.slice(2));if(!o.out)throw Error('--out required');
const out=path.resolve(o.out);fs.mkdirSync(out,{recursive:true});if(fs.readdirSync(out).length)throw Error('new attempt needs empty output');
const source=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();if(execFileSync('git',['status','--porcelain','--untracked-files=no'],{encoding:'utf8'}).trim())throw Error('commit source first');
const disk=fs.statfsSync(REPO);if(disk.bavail*disk.bsize<5*1024**3)throw Error('disk <5 GiB');
// [EXP-G03-R7a] Why: rule 10 forbids `docker context use colima` (the context no longer exists); the lab VM is reached only through DOCKER_HOST. Rejected: keeping the step and tolerating its failure.
const holder='CX-G03-R5',run=randomBytes(8).toString('hex'),store=`tx2-g03-${run}-store`,events=[],attempts=[];let entered=false,box,cleanupError;
const engine=(action,args=[])=>{const r=spawnSync(process.execPath,['lab/bin/engine.mjs','box',action,'--run',run,'--holder',holder,'--controller-pid',String(process.pid),...args],{encoding:'utf8',timeout:180000});if(r.status!==0)throw Error(r.stderr||r.stdout);return JSON.parse(r.stdout)};
const base={imageId:'sha256:302cbcd48d5b68ca49d020204c08814fac74c451fb51e13a62b908f368423575',buildInputsSha256:'60fc3d78913757014366477ba46259ee71e61d89039676a45986160f4cb02334',store,storeListingSha256:sha256(Buffer.from('[]')),walkMemoryBytes:536870912};
const observerImage='sha256:3344768f0ab951cb8053083a57e2a923d062dfeb21ac4392171fcf17f9cd11ac';
const canary=net.createServer(s=>s.end('mac-canary'));await new Promise(r=>canary.listen(0,'127.0.0.1',r));
const put=b=>{const h=sha256(b);fs.writeFileSync(path.join(out,h),b);return h};
const placement=Object.fromEntries(['broker','readers','consumer','driver','observer'].map((role,i)=>[role,{memory:134217728,cpuset:role==='broker'?'2':role==='readers'?'4':role==='consumer'?'3':'5'}]));
try{
 const bundleDir=path.join(out,'driver-bundle');const manifest=buildDriver(bundleDir);const bundleFiles=new Map(fs.readdirSync(bundleDir).map(n=>[n,{mode:'100644',bytes:fs.readFileSync(path.join(bundleDir,n))}]));
 const instanceFiles=new Map(buildCandidate(path.join(out,'candidate-bundle')));
 engine('volume',['--name',store]);entered=true;
 box=new BoxExecutor({config:base,workDir:out,holder,put});const volume=box.volume('ns-instance');box.seed(volume,instanceFiles);const instance={volume,walk:box.walk(volume,['ns-sut.mjs','provider.mjs'])};
 const otherNet=box.prefix+'other-arm';box.engine('network',['--name',otherNet]);box.resources.push(['network',otherNet]);
 const other=box.create('other-arm',{argv:['node','-e',"require('net').createServer(s=>s.end('other-arm')).listen(9345,'0.0.0.0')"],network:otherNet,memory:67108864});docker(['start',other]);const otherIp=inspect(other).NetworkSettings.Networks[otherNet].IPAddress;
 box.exec(other,['node','-e',"const s=require('net').connect({host:'127.0.0.1',port:9345});let b='';s.on('data',x=>b+=x);s.on('end',()=>{if(b!=='other-arm')process.exit(2)});s.on('error',()=>process.exit(2));"]);
 const blocked=[{host:otherIp,port:9345},{host:'192.168.5.2',port:canary.address().port},{host:'192.168.5.1',port:canary.address().port},{host:'1.1.1.1',port:443}];
 for(const name of ['tx2-xtdb-dev','tx2-qlever-dev']){const c=inspect(name);if(c)for(const n of Object.values(c.NetworkSettings.Networks))if(n.IPAddress)blocked.push({host:n.IPAddress,port:name.includes('xtdb')?5432:7019})}
 const seed=randomBytes(32),trace=Array.from({length:1000},(_,i)=>({atMs:i*5,command:{id:'offer-'+i,sequence:i,subject:'subject-'+(i%16),value:createHmac('sha256',seed).update(String(i)).digest().readUInt32BE(0)}}));
 const rounds=o.rounds==='1'?[true]:[false,true,true,false];
 for(let i=0;i<rounds.length;i++){
  const prefix=path.join(out,'round-'+i);const result=await runBoxedNS(box,{instance,bundleFiles,observerFiles:new Map([['observer.py',{mode:'100644',bytes:fs.readFileSync(path.join(import.meta.dirname,'observer.py'))}]]),sourceCommit:source,generatorSeed:seed.toString('hex'),observe:rounds[i],trace,population:16,readers:4,placement,observerImage,blocked,canary:canary.address().port});
  fs.writeFileSync(prefix+'.json',JSON.stringify(result),{flag:'wx',mode:0o600});attempts.push(result);
  events.push({round:i,observer:rounds[i],result:result.semantic});
  // Per-run volumes are not reused across rounds, including frozen inputs and output chunks.
  for(const [kind,name]of [...box.resources].reverse())if(![volume,otherNet,other].includes(name)){if(kind==='container')box.remove(name);else{box.engine('remove-'+kind,['--name',name]);box.resources=box.resources.filter(([,n])=>n!==name)}}
 }
 const p99=r=>{const a=r.events.filter(e=>e.kind==='offer').map(e=>Number(BigInt(e.data.ackAtNs)-BigInt(e.data.sentAtNs))).sort((a,b)=>a-b);if(a.length!==1000)throw Error('p99 needs 1000 offers');return a[989]};
 const latencies=attempts.map(p99);const overhead=attempts.length===4?((latencies[1]+latencies[2])/(latencies[0]+latencies[3])-1):null;
 const periods=attempts.map(r=>{const a=[...r.observer.seal.periodNs].sort((a,b)=>a-b);return {p50Ns:a[Math.ceil(a.length*.5)-1],p99Ns:a[Math.ceil(a.length*.99)-1]}});
 const summary={status:'DIAGNOSTIC',qualification:false,source,driverManifest:manifest,layout:'P-TINY diagnostic caps, not proposed acceptance nsLayout',writerOfferAckP99Ns:latencies,observerOverhead:overhead,observerPeriods:periods,smoke:overhead!==null&&overhead<=.05?'OBSERVED':'NOT-ESTABLISHED',events};
 fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify(summary,null,2));if(summary.smoke!=='OBSERVED')process.exitCode=2;
}catch(e){events.push({error:String(e)});if(box){const logs=Object.fromEntries(box.resources.filter(([kind])=>kind==='container').map(([,n])=>{const r=spawnSync('docker',['-H','unix:///Users/sam/.colima/triplex2/docker.sock','logs',n],{encoding:'utf8',maxBuffer:2097152});return [n,{stdout:r.stdout,stderr:r.stderr,status:r.status}]}));fs.writeFileSync(path.join(out,'failure-container-logs.json'),JSON.stringify(logs,null,2))}process.exitCode=2}
finally{
 try{box?.close();if(entered)engine('remove-volume',['--name',store])}catch(e){cleanupError=String(e);process.exitCode=2}
 canary.close();
 if(entered){for(const [cmd,args,name]of [['colima',['ssh','-p','triplex2','--','sudo','fstrim','-av'],'trim']]){const r=spawnSync(cmd,args,{encoding:'utf8',timeout:180000});fs.writeFileSync(path.join(out,name+'.json'),JSON.stringify({status:r.status,stdout:r.stdout,stderr:r.stderr}));if(r.status!==0)process.exitCode=2}}
 fs.writeFileSync(path.join(out,'terminal.json'),JSON.stringify({source,events,cleanupError,remaining:box?.resources,status:'DIAGNOSTIC',qualification:false},null,2));console.log(JSON.stringify({events,cleanupError,remaining:box?.resources}));
}
