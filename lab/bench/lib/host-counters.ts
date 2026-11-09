import os from "node:os";
import fs from "node:fs";
import {execFile} from "node:child_process";

const probes = [["/usr/bin/vm_stat", []], ["/usr/bin/memory_pressure", ["-Q"]]] as const;
let previousCpu: {idle:number;total:number}|null=null;
export function parseVmCounters(text:string|null) {
  const field=(name:string)=>{const m=new RegExp(`^${name}:\\s+(\\d+)`,"m").exec(text??"");return m?Number(m[1]):null;};
  return {pageouts:field("Pageouts"),decompressions:field("Decompressions"),compressorPages:field("Pages occupied by compressor")};
}
export function memoryFreePercent(text:string|null):number|null {
  const m=/System-wide memory free percentage:\s*([\d.]+)%/.exec(text??"");
  return m&&Number(m[1])>=0&&Number(m[1])<=100?Number(m[1]):null;
}
async function probe(command:string,args:readonly string[]) {
  try {
    if(fs.statSync(command).mode&0o4000)return {command,args,stdout:null,error:"setuid probe refused"};
    return await new Promise<{command:string;args:readonly string[];stdout:string|null;error:string|null}>((resolve)=>{
      try {execFile(command,[...args],{timeout:15000,maxBuffer:8<<20},(e,out)=>resolve({command,args,stdout:e?null:String(out),error:e?String(e):null}));}
      catch(e){resolve({command,args,stdout:null,error:String(e)});}
    });
  } catch(e){return {command,args,stdout:null,error:String(e)};}
}
export async function collectHostCounters(includeCpu=true) {
  const t=Date.now(),load=os.loadavg(),hostFreeBytes=os.freemem();
  const times=os.cpus().map(c=>c.times);
  const cpuTimes=times.reduce((a,c)=>({idle:a.idle+c.idle,total:a.total+c.user+c.nice+c.sys+c.idle+c.irq}),{idle:0,total:0});
  const baseline=previousCpu;previousCpu=cpuTimes;
  const cpuIdlePct=includeCpu&&baseline&&cpuTimes.total>baseline.total&&cpuTimes.idle>=baseline.idle
    ?100*(cpuTimes.idle-baseline.idle)/(cpuTimes.total-baseline.total):null;
  const results=await Promise.all(probes.map(([command,args])=>probe(command,args)));
  // [EXP-RT01] Why: sandbox-tested non-setuid counters keep the recorder usable; unavailable pressure level stays missing under unchanged R22 rules. Rejected: top (setuid EPERM), blocked sysctl, or converting free percentage into a different OS pressure scale.
  return {t,loadAvg1:Number.isFinite(load[0])?load[0]:null,hostFreeBytes,
    pressureLevel:null,swapUsedBytes:null,...parseVmCounters(results[0].stdout),cpuIdlePct,
    memoryFreePct:memoryFreePercent(results[1].stdout),cpuTimes,cpuBaseline:baseline,
    counterSources:{loadAvg1:"node:os.loadavg",hostFreeBytes:"node:os.freemem",cpuIdlePct:"delta node:os.cpus times (first sample null)",
      pageouts:"/usr/bin/vm_stat",decompressions:"/usr/bin/vm_stat",compressorPages:"/usr/bin/vm_stat",memoryFreePct:"/usr/bin/memory_pressure -Q (diagnostic only)",
      pressureLevel:"unavailable: sysctl denied in sandbox; no proxy",swapUsedBytes:"unavailable: sysctl denied in sandbox"},probes:results};
}
