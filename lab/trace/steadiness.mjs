// @ts-nocheck -- [DX-T1-12] Why: validate sealed historical native counter shapes before arithmetic; unknown is never zero.
import fs from "node:fs";
import path from "node:path";
import {createHash} from "node:crypto";
import {execFileSync} from "node:child_process";
import {gunzipSync,createGunzip} from "node:zlib";
import {createInterface} from "node:readline";
import {Readable} from "node:stream";
import {pathToFileURL} from "node:url";
import {verdictMs} from "./instrument.mjs";
const sha=x=>createHash("sha256").update(x).digest("hex");
export function diskCounters(text) {
  if(typeof text!=="string") return null;
  return Object.fromEntries(text.trim().split("\n").map(l=>l.trim().split(/\s+/)).filter(x=>/^vd[ab]$/.test(x[2])).map(x=>[`${x[0]}:${x[1]}`,{
    name:x[2],writes:Number(x[7]),writeBytes:Number(x[9])*512,writeMs:Number(x[10]),reads:Number(x[3]),readMs:Number(x[6]),
    weightedMs:Number(x[13]),flushes:x.length>=20?Number(x[18]):null,flushMs:x.length>=20?Number(x[19]):null}]));
}
export function ioCounters(text) {
  if(typeof text!=="string") return null;
  return Object.fromEntries(text.trim().split("\n").filter(Boolean).map(l=>{
    const [dev,...values]=l.split(/\s+/);return [dev,Object.fromEntries(values.map(s=>{const [k,v]=s.split("=");return[k,Number(v)];}))];
  }));
}
export function counterDelta(a,b) { return Number.isFinite(a)&&Number.isFinite(b)&&b>=a?b-a:null; }
export function mergeLateEpisodes(rows) {
  const result=[];
  if(rows.some(q=>!Number.isFinite(q.start)||!Number.isFinite(q.end)||q.end<q.start)) throw Error("Invalid scheduler interval");
  for(const q of [...rows].sort((a,b)=>a.start-b.start)) {
    const prior=result.at(-1);
    if(prior && q.start<=prior.end) {prior.end=Math.max(prior.end,q.end);prior.traceIds.push(q.traceId);prior.maximumSingleWaitMs=Math.max(prior.maximumSingleWaitMs,q.end-q.start);}
    else result.push({start:q.start,end:q.end,traceIds:[q.traceId],maximumSingleWaitMs:q.end-q.start});
  }
  return result.map(e=>({...e,ms:e.end-e.start,traceIds:[...new Set(e.traceIds)]})).filter(e=>e.ms>100);
}
export async function analyseSteadiness(base,tag) {
  if(!/^tx2-dxt1-[a-z0-9-]+$/.test(tag)) throw Error("Foreign run");
  const root=path.join(base,tag),anchorPath=`lab/experiments/EXP-DX1/t1/runs/${tag}/SHA256SUMS`;
  const seal=execFileSync("git",["show",`HEAD:${anchorPath}`],{encoding:"utf8",maxBuffer:8<<20});
  const hashes=new Map(seal.trim().split("\n").map(l=>[l.slice(66),l.slice(0,64)])),inputs=[];
  const bytes=name=>{const b=fs.readFileSync(path.join(root,name));if(hashes.get(name)!==sha(b))throw Error("Historical input checksum differs: "+name);inputs.push({path:name,sha256:sha(b),bytes:b.length});return b;};
  const manifest=JSON.parse(bytes("trace-run.json")),bench=JSON.parse(bytes("driver/ns-report.json"));
  if(manifest.tag!==tag || manifest.slot!==tag || bytes("head.txt").toString().trim()!==manifest.source || bench.status!=="DONE")throw Error("Historical source/slot/terminal binding differs");
  const lines=name=>{const b=bytes(name);return(name.endsWith(".gz")?gunzipSync(b):b).toString("utf8").trim().split("\n").filter(Boolean).map(JSON.parse);};
  const linux=lines("trace/raw/system-linux.jsonl.gz"),host=lines("trace/raw/system-darwin.jsonl.gz"),writes=lines("driver/ns-writes.jsonl");
  for(const r of [...linux,...host]) if(r.run!==tag||r.slot!==tag||r.source!==manifest.source) throw Error("Unbound resource row");
  const writerFiles=fs.readdirSync(path.join(root,"trace/raw")).filter(n=>/^node-\d+-0\.jsonl\.gz$/.test(n));
  if(writerFiles.length!==1)throw Error("Writer clock absent or ambiguous; refusing an arbitrary process");
  const writerFile=writerFiles[0];
  const writerBytes=bytes("trace/raw/"+writerFile);
  const stream=Readable.from(writerBytes).pipe(createGunzip()),reader=createInterface({input:stream,crlfDelay:Infinity});
  let clock;
  try{for await(const line of reader){const r=JSON.parse(line);if(r.clock?.domain==="linux-monotonic"){if(r.run!==tag||r.slot!==tag||r.source!==manifest.source||r.thread!==0)throw Error("Unbound writer clock");clock=r.clock;break;}}}finally{reader.close();stream.destroy();}
  if(!clock)throw Error("Writer boot clock absent");
  for(const r of linux) {if(r.clock?.domain!=="linux-monotonic"||r.clock.bootId!==clock.bootId||!Number.isFinite(r.clock.offsetMs))throw Error("Guest boot/clock differs");r.monoAt=r.at-r.clock.offsetMs+clock.offsetMs;}
  linux.sort((a,b)=>a.monoAt-b.monoAt);
  const steps=linux.slice(1).flatMap((b,i)=>{const a=linux[i],delta=b.clock.offsetMs-a.clock.offsetMs;return Math.abs(delta)>5?[{from:a.monoAt,to:b.monoAt,stepMs:delta}]:[];});
  const swaps=host.map(r=>{const m=/^Swapouts:\s+(\d+)/m.exec(r.memory??"");return m?Number(m[1]):null;});
  const swapOutPages=swaps.every(Number.isFinite)?counterDelta(swaps[0],swaps.at(-1)):null;
  const intervals=(from,to)=> {
    const a=linux.findLast(r=>r.monoAt<=from-5000),b=linux.find(r=>r.monoAt>=to);
    if(!a||!b)return {status:"uncovered guest interval"};
    const old=diskCounters(a.vm?.["/proc/diskstats"]),next=diskCounters(b.vm?.["/proc/diskstats"]),elapsedMs=b.monoAt-a.monoAt;
    const devices=Object.entries(next??{}).map(([dev,n])=>{
      const prior=old?.[dev];if(!prior)return {dev,status:"missing initial device"};
      const roleBytes={};let accounted=0,all=true;
      for(const [role,group] of Object.entries(b.cgroups??{})) {
        const start=ioCounters(a.cgroups?.[role]?.["io.stat"]),end=ioCounters(group["io.stat"]);
        const delta=counterDelta(start?.[dev]?.wbytes,end?.[dev]?.wbytes);roleBytes[role.replace(tag+"-","")]=delta;
        if(delta===null)all=false;else accounted+=delta;
      }
      const written=counterDelta(prior.writeBytes,n.writeBytes),flushes=counterDelta(prior.flushes,n.flushes),flushMs=counterDelta(prior.flushMs,n.flushMs),weighted=counterDelta(prior.weightedMs,n.weightedMs);
      return {dev,name:n.name,elapsedMs,writeBytes:written,roleWriteBytes:roleBytes,
        otherGuestWriteBytes:all&&written!==null&&written>=accounted?written-accounted:null,
        accountingStatus:!all||written===null?"some counters unavailable":written<accounted?"device/cgroup accounting differs; no residual inferred":"observed residual, not identified writers",
        flushes,flushMs,meanFlushMs:flushes>0&&flushMs!==null?flushMs/flushes:null,
        averageQueue:weighted===null?null:weighted/elapsedMs};
    });
    return {status:"coarse guest counters: preceding five seconds plus request; not per-statement causal proof",fromOffsetS:(a.monoAt-bench.traceStartAbsMs)/1000,toOffsetS:(b.monoAt-bench.traceStartAbsMs)/1000,devices,
      clockStepIntervals:steps.filter(s=>s.from<to&&s.to>from),macWindow:"unqualified: no Mac-to-guest monotonic bridge"};
  };
  const primary=writes.filter(w=>w.stream==="background"&&!w.resend&&!w.expired&&w.outcome==="committed");
  const slow=primary.filter(w=>verdictMs(w)>100).map(w=>({traceId:w.traceId,seq:w.seq,offsetS:w.offsetMs/1000,ackMs:verdictMs(w),finishMs:w.latencyMs,...intervals(w.scheduledAt,w.ackPublishedAt)}));
  const late=primary.flatMap(w=>(w.queue??[]).filter(q=>q.cause==="scheduler-late").map(q=>{
    if(q.start<w.scheduledAt-.001 || q.end>w.startedAt+.001) throw Error("Scheduler interval escapes its command");
    return {...q,traceId:w.traceId};
  }));
  const episodes=mergeLateEpisodes(late).map(e=>({...e,...intervals(e.start,e.end)}));
  return {tag,source:manifest.source,inputs,sealSha256:sha(seal),historical:true,eligibleForNewVerdict:false,
    primary:primary.length,over100:slow.length,slow,schedulerEpisodes:episodes,guestClockSteps:steps,
    macWholeArm:{samples:host.length,swapOutPages,rule:"whole-arm context only; no phase/request alignment, page size retained in native vm_stat"},
    limitations:["default traces have no exact per-statement WAL wait identity", "one-second counter deltas cannot identify subsecond causal order", "host process I/O identities and a precise host/guest clock bridge were not recorded", "guest clock steps do not affect ACK durations anchored to Linux boot time"]};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  const [base,out,...tags]=process.argv.slice(2);if(!base||!out||!tags.length)throw Error("steadiness.mjs EVIDENCE_BASE NEW.json TAG...");
  const programSha256=sha(fs.readFileSync(new URL(import.meta.url))),computationSource=execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim();
  const runs=[];for(const tag of tags)runs.push(await analyseSteadiness(base,tag));
  if(programSha256!==sha(fs.readFileSync(new URL(import.meta.url))) || computationSource!==execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim())throw Error("Historical analysis source changed during attempt");
  fs.writeFileSync(out,JSON.stringify({schema:"triplex.steadiness/1",programSha256,computationSource,createdAt:Date.now(),runs},null,2)+"\n",{flag:"wx"});
  console.log(JSON.stringify(runs.map(r=>({tag:r.tag,over100:r.over100,schedulerEpisodes:r.schedulerEpisodes.length,clockSteps:r.guestClockSteps.length,macSwapOutPages:r.macWholeArm.swapOutPages}))));
}
