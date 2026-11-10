// @ts-nocheck -- standalone diagnostic bags.
// [XN-S2-LIVE] Why: outer host owns the lock; the VM client reads immutable bound cgroups directly. Rejected: Docker subprocesses or host port forwarding inside timed pulls.
import fs from 'node:fs';
export const dir=process.env.OUT??'/driver';
export const url=process.env.WRITE_URL??'postgres://xtdb:xtdb@tx2-xns2-write:5432/xtdb';
export const readUrl=process.env.READ_URL??url;
export const save=(name,x)=>fs.writeFileSync(`${dir}/${name}.json`,JSON.stringify(x,null,2)+'\n',{flag:'wx'});
export const sleep=ms=>new Promise(r=>setTimeout(r,ms));
export function summary(a){a=[...a].sort((x,y)=>x-y);const q=p=>a[Math.ceil(p*a.length)-1];return {n:a.length,p50:q(.5),p90:q(.9),p99:q(.99),max:a.at(-1)}}
export function stats(){const paths=JSON.parse(process.env.CGROUPS??'{}');return Object.fromEntries(Object.entries(paths).map(([name,p])=>[name,{cpuUsec:Number(fs.readFileSync(`${p}/cpu.stat`,'utf8').match(/usage_usec (\d+)/)[1]),memoryCurrent:Number(fs.readFileSync(`${p}/memory.current`,'utf8')),memoryPeak:Number(fs.readFileSync(`${p}/memory.peak`,'utf8'))}]))}
export const binding=()=>JSON.parse(fs.readFileSync('/driver/binding.json','utf8'));
export async function measured(name,fn){
 const before={at:new Date().toISOString(),stats:stats()},p0=process.cpuUsage(),t0=performance.now();
 console.log('start',name,before.at);
 const result=await fn();const elapsedMs=performance.now()-t0,pc=process.cpuUsage(p0),after={at:new Date().toISOString(),stats:stats()};
 const cpuSeconds=Object.fromEntries(Object.keys(before.stats).map(k=>[k,(after.stats[k].cpuUsec-before.stats[k].cpuUsec)/1e6]));
 const engineCpuSeconds=Object.values(cpuSeconds).reduce((a,b)=>a+b,0);
 const out={name,binding:binding(),keepAwake:process.env.KEEP_AWAKE==='1',before,after,elapsedMs,cpuSeconds,engineCpuSeconds,hostCpuSeconds:(pc.user+pc.system)/1e6,...result};
 save(name,out);console.log('done',name,JSON.stringify({n:out.n,latency:out.latency,cpuSeconds,elapsedMs,opsPerEngineCpuSecond:out.n/engineCpuSeconds}));return out;
}
