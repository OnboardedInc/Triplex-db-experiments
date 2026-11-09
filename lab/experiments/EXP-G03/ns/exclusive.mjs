// [EXP-G03-R5] Why: conditional 1k execution must face the real registered-slot and full-role pool limits. Rejected: lowering caps, parking a shared resident, or calling a failed admission a run.
import fs from 'node:fs';import path from 'node:path';import net from 'node:net';import {spawnSync,execFileSync} from 'node:child_process';import {randomBytes,createHmac} from 'node:crypto';
import {BoxExecutor} from '../../../bin/box.mjs';import {runBoxedNS} from '../../../bin/ns-run.mjs';import {NS_LAYOUT} from '../../../bin/ns-policy.mjs';import {docker,inspect,sha256,parseArgs,REPO} from '../../../bin/lib.mjs';import {buildDriver} from '../../../bench/ns-driver/build.mjs';import {buildCandidate} from './build.mjs';
const {options:o}=parseArgs(process.argv.slice(2));if(!o.out)throw Error('--out required');const out=path.resolve(o.out);fs.mkdirSync(out,{recursive:true});if(fs.readdirSync(out).length)throw Error('new output required');
const source=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();if(execFileSync('git',['status','--porcelain','--untracked-files=no'],{encoding:'utf8'}).trim())throw Error('commit source first');
const holder='CX-G03-R5-exclusive',run=randomBytes(8).toString('hex'),store=`tx2-g03-${run}-store`,stages=[];let slot,admitted=false,box,createdStore=false,entered=false;
const command=(args,file,timeout=180000)=>{const r=spawnSync(args[0],args.slice(1),{encoding:'utf8',timeout,maxBuffer:4194304});fs.writeFileSync(path.join(out,file),JSON.stringify({args,status:r.status,stdout:r.stdout,stderr:r.stderr,error:String(r.error??'')},null,2));if(r.status!==0||r.error)throw Error(file+' refused');return r.stdout};
const engine=(action,args=[])=>JSON.parse(command([process.execPath,'lab/bin/engine.mjs','box',action,'--run',run,'--holder',holder,'--controller-pid',String(process.pid),...args],'box-'+action+'-'+randomBytes(3).toString('hex')+'.json'));
const canary=net.createServer(s=>s.end('canary'));await new Promise(r=>canary.listen(0,'127.0.0.1',r));
try{
 const stat=fs.statfsSync(REPO);stages.push({hostFreeBytes:stat.bavail*stat.bsize,required:10*1024**3});if(stat.bavail*stat.bsize<=10*1024**3)throw Error('host disk not above 10 GiB');
 const status=command([process.execPath,'lab/bin/engine.mjs','status'],'status-before.json');if(/reservation tx2-(?:xtdb|qlever|datomic)-s[123]\b/.test(status))throw Error('exclusive held; stop without waiting');
 slot=['s1','s2','s3'].find(s=>!inspect('tx2-qlever-'+s)&&!docker(['volume','inspect','tx2-qlever-'+s+'-data'],{allowFail:true}));if(!slot)throw Error('no unused QLever slot; no takeover');
 command([process.execPath,'lab/bin/engine.mjs','up','--lane','qlever','--slot',slot,'--holder',holder,'--exp','EXP-G03-R5-1k','--cpuset-cpus','0,1'],'slot-up.json');admitted=true;entered=true;
 engine('volume',['--name',store]);createdStore=true;
 box=new BoxExecutor({config:{imageId:'sha256:302cbcd48d5b68ca49d020204c08814fac74c451fb51e13a62b908f368423575',buildInputsSha256:'60fc3d78913757014366477ba46259ee71e61d89039676a45986160f4cb02334',store,storeListingSha256:sha256(Buffer.from('[]')),walkMemoryBytes:536870912},workDir:out,holder,put:b=>{const h=sha256(b);fs.writeFileSync(path.join(out,h),b);return h}});
 const registered=box.engine('slot',['--lane','qlever','--slot',slot]);stages.push({registeredSlot:{id:registered.container.Id,image:registered.container.Image,configSha256:registered.container.Config.Labels['tx2.config-sha256']},requiredRoleCaps:NS_LAYOUT,acceptance:false});
 const bundleDir=path.join(out,'driver-bundle');buildDriver(bundleDir);const bundleFiles=new Map(fs.readdirSync(bundleDir).map(n=>[n,{bytes:fs.readFileSync(path.join(bundleDir,n)),mode:'100644'}]));
 const volume=box.volume('ns-instance');box.seed(volume,new Map(buildCandidate(path.join(out,'candidate-bundle'))));const instance={volume,walk:box.walk(volume,['ns-sut.mjs','provider.mjs'])};
 const seed=randomBytes(32),trace=Array.from({length:1000},(_,i)=>({atMs:i*5,command:{id:'offer-'+i,sequence:i,subject:'subject-'+i,value:createHmac('sha256',seed).update(String(i)).digest().readUInt32BE(0)}}));
 const result=await runBoxedNS(box,{instance,bundleFiles,observerFiles:new Map([['observer.py',{bytes:fs.readFileSync(path.join(import.meta.dirname,'observer.py')),mode:'100644'}]]),sourceCommit:source,trace,generatorSeed:seed.toString('hex'),slotIdentity:{lane:'qlever',slot,containerId:registered.container.Id,image:registered.container.Image,configSha256:registered.container.Config.Labels['tx2.config-sha256']},population:1000,readers:256,observerImage:'sha256:3344768f0ab951cb8053083a57e2a923d062dfeb21ac4392171fcf17f9cd11ac',blocked:[{host:'192.168.5.2',port:canary.address().port},{host:'1.1.1.1',port:443}]});
 // This fixture is an admission integration control, not a production QLever replica provider.
 fs.writeFileSync(path.join(out,'diagnostic.json'),JSON.stringify(result));stages.push({diagnosticFixture:true,productionLaneProvider:false});
}catch(e){stages.push({refusal:String(e)});process.exitCode=2}
finally{
 try{box?.close();if(createdStore)engine('remove-volume',['--name',store])}catch(e){stages.push({cleanupError:String(e)});process.exitCode=2}
 if(admitted)try{command([process.execPath,'lab/bin/engine.mjs','down','--lane','qlever','--slot',slot,'--holder',holder,'--remove-volume'],'slot-down.json')}catch(e){stages.push({cleanupError:String(e)});process.exitCode=2}
 if(entered){for(const [args,file]of [[['colima','ssh','-p','triplex2','--','sudo','fstrim','-av'],'trim.json'],[['docker','context','use','colima'],'context.json']])try{command(args,file)}catch(e){stages.push({cleanupError:String(e)});process.exitCode=2}}
 canary.close();fs.writeFileSync(path.join(out,'receipt.json'),JSON.stringify({source,stages,remaining:box?.resources,records:box?.records,status:'DIAGNOSTIC',qualification:false},null,2));console.log(JSON.stringify(stages));
}
