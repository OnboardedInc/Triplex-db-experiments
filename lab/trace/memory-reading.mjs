// @ts-nocheck -- [DX-T1-14] Why: read native kernel high-water counters, with unknown on absence. Rejected: call a one-second sampled current value a kernel peak.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
const read=p=>{try{return fs.readFileSync(p,"utf8").trim();}catch{return null;}};
const run=process.env.TRIPLEX_TRACE_RUN,source=process.env.TRIPLEX_TRACE_SOURCE,slot=process.env.TRIPLEX_TRACE_SLOT;
if(!/^tx2-dxt1-[a-z0-9-]+$/.test(run??"")||slot!==run||!/^[0-9a-f]{40}$/.test(source??""))throw Error("Missing diagnostic identity");
const groups=Object.fromEntries((process.env.TX2_ENGINE_CGROUPS??"").split(",").filter(Boolean).map(x=>{const at=x.indexOf("=");return[x.slice(0,at).replace(run+"-",""),x.slice(at+1)];}));
const own=read("/proc/self/cgroup")?.split("\n").find(x=>x.startsWith("0::"))?.slice(3);
if(!own||Object.keys(groups).length!==4)throw Error("Missing exact driver/engine cgroups");
groups.driver=path.join("/sys/fs/cgroup",own);
const memory={};
for(const [role,group] of Object.entries(groups)){
  if(!/^(pg|tx|gw-w|gw-r|driver)$/.test(role)||!group.startsWith("/sys/fs/cgroup/"))throw Error("Foreign memory group");
  const counter=name=>{const s=read(path.join(group,name));return s!==null&&/^\d+$/.test(s)?Number(s):null;};
  memory[role]={group,currentBytes:counter("memory.current"),peakBytes:counter("memory.peak"),limitBytes:counter("memory.max"),events:read(path.join(group,"memory.events"))};
}
const before=Number(process.hrtime.bigint())/1e6,at=Date.now(),after=Number(process.hrtime.bigint())/1e6;
console.log(JSON.stringify({schema:"triplex.memory-reading/1",run,source,slot,at,
  programSha256:createHash("sha256").update(fs.readFileSync(new URL(import.meta.url))).digest("hex"),
  clock:{domain:"linux-monotonic",bootId:read("/proc/sys/kernel/random/boot_id"),offsetMs:at-(before+after)/2,uncertaintyMs:.5+(after-before)/2},
  memory,meminfo:read("/proc/meminfo"),scope:"kernel peaks up to this observation; no application request or engine-thread execution"}));
