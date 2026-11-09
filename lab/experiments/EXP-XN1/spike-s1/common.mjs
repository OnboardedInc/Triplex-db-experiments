// @ts-nocheck -- [EXP-XN1] Why: diagnostic wire records and observation bags are populated at runtime. Rejected: product types for this standalone spike.
// [EXP-XN1] Why: keep this diagnostic wholly outside Triplex and retain raw observations.
// Rejected: importing the adapter (would measure adapter overhead rather than the engine floor).
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
export const dir='/Users/sam/Claude/Projects/triplex-db-2/evidence/XN-S1';
export const url='postgres://xtdb:xtdb@127.0.0.1:5471/xtdb';
export const save=(name,x)=>fs.writeFileSync(`${dir}/${name}.json`,JSON.stringify(x,null,2)+'\n',{flag:'wx'});
export const docker=(...a)=>execFileSync('docker',['-H','unix:///Users/sam/.colima/triplex2/docker.sock',...a],{encoding:'utf8',maxBuffer:16*1024*1024});
export const cpu=()=>Number(docker('exec','tx2-xtdb-s1','cat','/sys/fs/cgroup/cpu.stat').match(/usage_usec (\d+)/)[1]);
export const stats=()=>docker('stats','--no-stream');
export const sleep=ms=>new Promise(r=>setTimeout(r,ms));
export function summary(a){a=[...a].sort((x,y)=>x-y); const q=p=>a[Math.ceil(p*a.length)-1];return {n:a.length,p50:q(.5),p90:q(.9),p99:q(.99),max:a.at(-1)};}
export function binding(){const c=JSON.parse(docker('inspect','tx2-xtdb-s1'))[0];if(c.Config.Labels['tx2.holder']!=='XN-S1'||c.HostConfig.CpusetCpus!=='4,5')throw Error('wrong owner/pin');return {id:c.Id,image:c.Image,started:c.State.StartedAt,labels:c.Config.Labels,hostConfig:c.HostConfig,mounts:c.Mounts};}
export async function measured(name,fn){
 const lock='/Users/sam/Claude/Projects/triplex-db-2/locks/measure';
 while(true){try{fs.mkdirSync(lock);break;}catch(e){if(e.code!=='EEXIST')throw e;await sleep(5000);}}
 console.log('measurement-lock-acquired',name,new Date().toISOString());
 const release=()=>{try{fs.rmdirSync(lock);}catch{}};
 const terminate=()=>{release();process.exit(143)};
 process.once('SIGTERM',terminate);process.once('SIGINT',terminate);process.once('exit',release);
 const deadline=setTimeout(terminate,14*60*1000);
 try{
  if(fs.statfsSync(dir).bavail*fs.statfsSync(dir).bsize<5*1024**3)throw Error('disk floor');
  const before={at:new Date().toISOString(),binding:binding(),stats:stats()};
  save(`${name}-before`,before);console.log('measurement-starting',name);
  const c0=cpu(),p0=process.cpuUsage(),t0=performance.now();
  const result=await fn();console.log('measurement-work-finished',name);
  const elapsedMs=performance.now()-t0,hostCpu=process.cpuUsage(p0),c1=cpu();
  const after={at:new Date().toISOString(),stats:stats(),binding:binding()};
  if(before.binding.id!==after.binding.id)throw Error('container changed');
  const out={name,before,after,elapsedMs,engineCpuBeforeUsec:c0,engineCpuAfterUsec:c1,engineCpuSeconds:(c1-c0)/1e6,hostCpuSeconds:(hostCpu.user+hostCpu.system)/1e6,...result};
  save(name,out); console.log(name,JSON.stringify({latency:out.latency,engineCpuSeconds:out.engineCpuSeconds,hostCpuSeconds:out.hostCpuSeconds,opsPerEngineCpuSecond:out.n/out.engineCpuSeconds}));return out;
 }finally{clearTimeout(deadline);process.removeListener('SIGTERM',terminate);process.removeListener('SIGINT',terminate);process.removeListener('exit',release);release();}
}
