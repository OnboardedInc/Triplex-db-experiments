// @ts-nocheck -- [DX-T1-12] Why: decode passive Mac admission counters at a checked boundary; keep failures as unknown, never as zero.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
const median = xs => [...xs].sort((a,b) => a-b)[Math.floor(xs.length / 2)] ?? null;
const native = (command, args) => execFileSync(command, args, {encoding:"utf8", timeout:5000});
export function evaluateHostGate(samples, context) {
  const issues = [];
  if (samples.length < 60 || samples.at(-1).monoMs - samples[0].monoMs < 59000) issues.push("fewer than 60 one-second passive samples");
  if (samples.some(s => s.error)) issues.push("native counter unavailable");
  const finite = key => samples.every(s => Number.isFinite(s[key]));
  for (const key of ["swapBytes","otherCpu","freeInactiveBytes","compressions","swapouts","pressure","load1"]) if (!finite(key)) issues.push("missing " + key);
  if (samples.some(s => s.pressure !== 1)) issues.push("memory pressure not normal");
  if (samples.some(s => s.freeInactiveBytes < 2 * 1024**3)) issues.push("free plus inactive below 2 GiB");
  if (samples.some(s => s.swapBytes > 5 * 1024**3) || samples.at(-1)?.swapBytes > samples[0]?.swapBytes) issues.push("swap above 5 GiB or rising");
  for (let i=1;i<samples.length;i++) {
    const a=samples[i-1],b=samples[i], seconds=(b.monoMs-a.monoMs)/1000;
    if (b.swapouts !== a.swapouts) issues.push("swap-outs during admission");
    if ((b.compressions-a.compressions)/seconds >= 100) issues.push("at least 100 compressions/s");
  }
  if (median(samples.map(s=>s.otherCpu)) > 50 || samples.some(s=>s.load1 > 10)) issues.push("host CPU/load above strict limit");
  if (samples.some(s=>s.busyApps?.length || s.audioCpu >=5 || s.maintenanceCpu >=5)) issues.push("forbidden busy application or host maintenance");
  if (context.diskFreeBytes < 20 * 1024**3) issues.push("less than 20 GiB verdict disk floor");
  if (!context.acPower || !context.lowPowerOff || !context.thermalNormal) issues.push("power or thermal state unqualified");
  if (!context.clockLogObserved || context.recentGuestClockSteps !== 0) issues.push("recent guest clock step or clock log unavailable");
  return { schema:"triplex.host-gate/1", eligible:issues.length===0, issues:[...new Set(issues)],
    samples:samples.length, swapGiB:median(samples.map(s=>s.swapBytes/1024**3)), macCpuMedian:median(samples.map(s=>s.otherCpu)),
    context, storageSyncGate:"Not actively probed: Sam's later no-sentinel ruling supersedes the analysis's write-and-sync sentinel requirement",
    note:"Passive admission only, not a latency or oracle PASS. No requests, warmers, process demotion or app shutdown." };
}
export async function collectHostGate(count=60) {
  if (os.platform() !== "darwin") throw Error("Strict host admission requires the Mac host");
  const samples=[];
  for (let i=0;i<count;i++) {
    const s={at:Date.now(),monoMs:performance.now()};
    try {
      const vm=native("/usr/bin/vm_stat",[]), page=Number(/page size of (\d+)/.exec(vm)?.[1]);
      const counter = name => Number(new RegExp("^"+name+":\\s+(\\d+)","m").exec(vm)?.[1]);
      s.freeInactiveBytes=(counter("Pages free")+counter("Pages inactive"))*page;
      s.compressions=counter("Compressions"); s.swapouts=counter("Swapouts");
      s.swapBytes=Number(/used = ([\d.]+)M/.exec(native("/usr/sbin/sysctl",["vm.swapusage"]))?.[1])*1024**2;
      s.pressure=Number(native("/usr/sbin/sysctl",["-n","kern.memorystatus_vm_pressure_level"]).trim());
      s.load1=Number(native("/usr/sbin/sysctl",["-n","vm.loadavg"]).replace(/[{}]/g,"").trim().split(/\s+/)[0]);
      s.otherCpu=0;s.audioCpu=0;s.maintenanceCpu=0;s.busyApps=[];
      for(const line of native("/bin/ps",["-A","-o","pcpu=,comm="]).trim().split("\n")) {
        const match=/^\s*([\d.]+)\s+(.+)$/.exec(line); if(!match) continue;
        const cpu=Number(match[1]),name=path.basename(match[2]);
        if(!/Virtualization|limactl|^ssh$/.test(name)) s.otherCpu+=cpu;
        if(/Google Chrome|Slack|^Paste$|^Codex$|Granola|zoom\.us|Wispr Flow/.test(name)) s.busyApps.push(name);
        if(/coreaudiod/.test(name)) s.audioCpu+=cpu;
        if(/mdworker|backupd|softwareupdated/.test(name)) s.maintenanceCpu+=cpu;
      }
    } catch(e) {s.error=String(e.message);}
    samples.push(s);
    if(i+1<count) await new Promise(r=>setTimeout(r,Math.max(1,1000-(performance.now()-s.monoMs))));
  }
  const context={diskFreeBytes:Number(fs.statfsSync(process.cwd()).bavail)*Number(fs.statfsSync(process.cwd()).bsize)};
  try {
    context.acPower=/AC Power/.test(native("/usr/bin/pmset",["-g","batt"]));
    context.lowPowerOff=/lowpowermode\s+0/.test(native("/usr/bin/pmset",["-g","custom"]));
    const thermal=native("/usr/bin/pmset",["-g","therm"]);
    context.thermalNormal=thermal.split("\n").filter(l=>!/\bNo .*warning/i.test(l)).every(l=>!/(thermal|performance).*warning/i.test(l)) &&
      [...thermal.matchAll(/CPU_(?:Speed|Scheduler)_Limit\s*=\s*(\d+)/g)].every(m=>Number(m[1])===100);
    const logPath=["triplex2","colima-triplex2"].map(n=>path.join(os.homedir(),".colima/_lima",n,"ha.stderr.log")).find(p=>fs.existsSync(p));
    if(!logPath) throw Error("Triplex2 guest clock log unavailable");
    const log=fs.readFileSync(logPath,"utf8");
    context.clockLogObserved=true;
    context.recentGuestClockSteps=log.split("\n").filter(l=>l.includes("guest clock adjusted")).filter(l=> {
      const m=/"time":"([^"]+)"/.exec(l); return !m || Date.parse(m[1])>=Date.now()-600000;
    }).length;
  } catch(e) { context.error=String(e.message); }
  return {...evaluateHostGate(samples,context), samplesRaw:samples};
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const result=await collectHostGate(); const text=JSON.stringify(result,null,2)+"\n";
  if(process.argv[2]) fs.writeFileSync(process.argv[2],text,{flag:"wx"});else process.stdout.write(text);
  process.exitCode=result.eligible?0:1;
}
