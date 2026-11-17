// @ts-nocheck -- [DX-T1-14] Why: validate heterogeneous diagnostic records at ingestion. Rejected: treating missing counters as zero; checkjs still checks bindings.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { records, percentile, alignClockRecord } from "./report.mjs";
import { verdictMs } from "./instrument.mjs";
import { verifiedRawManifest } from "./pack-oracle.mjs";
import { nativeCounterSummary } from "./native-counters.mjs";
const sha = (x) => createHash("sha256").update(x).digest("hex");
const stats = (xs) => ({ n: xs.length, p50: percentile(xs, .5), p99: percentile(xs, .99), total: xs.reduce((a,b)=>a+b,0) });
const number = (n) => Number.isFinite(n) ? n.toFixed(3) : "unknown";

// [DX-T1-14] Why: native counters join through the acknowledged database/t and request trace, independently of epoch clock steps.
// Rejected: nearest-time joins, duplicate native events, or calling absent serial-point observations cache hits.
export function nativeByCommit(manifest, writes, gateways, native) {
  const transactions = new Map(), requests = new Map();
  for (const r of [...gateways, ...native])
    if (r.run !== manifest.tag || r.source !== manifest.source || r.slot !== manifest.slot)
      throw Error("Foreign scale counter");
  for (const r of native) {
    const s = r.nativeStats;
    if (!/^[0-9a-f]{64}$/.test(r.databaseHash ?? "") || !/^\d+$/.test(r.datomicT ?? "") ||
        ![s?.msec,s?.["apply-msec"]].every(x=>Number.isFinite(x)&&x>=0) || s["apply-msec"]>s.msec+.5)
      throw Error("Invalid native scale counter");
    const key = r.databaseHash+":"+r.datomicT;
    if (transactions.has(key)) throw Error("Duplicate native scale counter");
    transactions.set(key,r);
  }
  for (const r of gateways) {
    if (!r.attributes?.datomicT) continue;
    if (requests.has(r.traceId)) throw Error("Multiple transact results for one diagnostic commit");
    requests.set(r.traceId,r);
  }
  return writes.map(w=>{
    const g=requests.get(w.traceId), n=g && transactions.get(g.attributes.databaseHash+":"+g.attributes.datomicT);
    return {write:w,gateway:g,native:n};
  });
}

export async function readScaleRun(directory) {
  const inputs=[];
  const json=name=>{const b=fs.readFileSync(path.join(directory,name));inputs.push({path:name,sha256:sha(b),bytes:b.length});return JSON.parse(b);};
  const manifest=json("trace-run.json"), bench=json("driver/ns-report.json"), anatomy=json("commit-anatomy.json"), summary=json("trace-summary.json");
  if (manifest.tag!==path.basename(directory) || manifest.slot!==manifest.tag || bench.status!=="DONE" ||
      bench.config.profile!=="smoke" || !bench.config.zeroReaders || ![10000,100000].includes(bench.config.rungSubjects) ||
      !bench.seed?.complete || bench.seed.seededSubjects!==bench.config.rungSubjects || !bench.seed.assertionsMatchClosedForm ||
      summary.tag!==manifest.tag || summary.source!==manifest.source || anatomy.source!==manifest.source)
    throw Error("Incomplete/foreign diagnostic reading");
  // [DX-T1-14] Why: source/slot labels alone cannot certify the raw bytes or retained terminal report.
  // Rejected: accept an old filename after the run's compressed trace or ACK records changed.
  const sealed=await verifiedRawManifest(directory);
  inputs.push({path:"verified raw and terminal metadata manifest",sha256:sha(sealed)});
  const writeText=fs.readFileSync(path.join(directory,"driver/ns-writes.jsonl"),"utf8"), writes=writeText.trim().split("\n").filter(Boolean).map(JSON.parse);
  const primary=writes.filter(w=>w.stream==="background"&&!w.resend);
  const native=[],gateways=[],linux=[],host=[],counterRows=[];
  const bound=async(name,accept,into)=>{
    const file=path.join(directory,"trace/raw",name);
    if (!fs.existsSync(file)) return;
    for await (const r of records(file)) if(accept(r)) into.push(r);
  };
  await bound("tx.jfr.jsonl.gz",r=>r.nativeType==="triplex.NativeTransaction",native);
  await bound("gw-w.jsonl.gz",r=>r.type==="request"&&r.kind==="commit"&&r.attributes?.datomicT,gateways);
  await bound("system-linux.jsonl.gz",()=>true,linux);
  await bound("system-darwin.jsonl.gz",()=>true,host);
  await bound("tx.jsonl.gz",r=>["metrics","index-adoption","native-counter-state"].includes(r.type),counterRows);
  nativeCounterSummary(manifest,counterRows);
  const reference=summary.clockAlignment?.reference;
  const timedCounters=counterRows.map(r=>alignClockRecord(r,reference));
  const joined=nativeByCommit(manifest,primary,gateways,native);
  const phaseRows=(bench.phases??[]).map(p=>{
    const rows=joined.filter(x=>x.write.scheduledAt>=p.start && x.write.scheduledAt<p.end);
    const committed=rows.filter(x=>x.write.outcome==="committed"&&!x.write.expired), samples=committed.flatMap(x=>x.native?[x.native.nativeStats]:[]);
    const reads=samples.flatMap(s=>s["io-stats"]?.reads?[s["io-stats"].reads]:[]);
    // [DX-T1-14] Why: Datomic elides zero-valued tiers in a present reads map; an absent entire map remains unobserved.
    // Rejected: averaging SQL reads only over cold commits, which overstates the population-wide cold-read rate.
    const column=k=>stats(reads.map(r=>r[k]??0).filter(Number.isFinite));
    const callbacks=timedCounters.filter(r=>r.type==="metrics"&&r.at>=p.start&&r.at<p.end&&r.counters?.objectCache?.requests>0);
    const cacheRequests=callbacks.reduce((n,r)=>n+r.counters.objectCache.requests,0),cacheHits=callbacks.reduce((n,r)=>n+r.counters.objectCache.hits,0);
    const adoptions=timedCounters.filter(r=>r.type==="index-adoption"&&r.start<p.end&&r.end>=p.start);
    const after=committed.filter(x=>adoptions.some(a=>a.databaseHash===x.gateway?.attributes?.databaseHash&&x.write.scheduledAt>=a.end&&x.write.scheduledAt<a.end+2000));
    return {name:p.name,readers:p.readers,offered:rows.length,committed:committed.length,expired:rows.filter(x=>x.write.expired).length,
      ackMs:stats(committed.map(x=>verdictMs(x.write))),finishMs:stats(committed.map(x=>x.write.latencyMs)),
      nativeObserved:samples.length,readCounterCommits:reads.length,coldCommits:reads.filter(r=>(r.sql??0)>0).length,
      storageTierReads:{objectCache:column("ocache"),sql:column("sql"),sqlMs:column("sql-ms"),aevt:column("aevt"),avet:column("avet"),eavt:column("eavt")},
      datoms:stats(samples.map(s=>s["datom-count"]).filter(Number.isFinite)),nativeProcessMs:stats(samples.map(s=>s.msec)),applyMs:stats(samples.map(s=>s["apply-msec"])),anatomy:anatomy.phases[p.name]??null,
      objectCache:{callbacks:callbacks.length,requests:cacheRequests||null,hits:cacheRequests?cacheHits:null,hitRate:cacheRequests?cacheHits/cacheRequests:null,scope:"callback intervals ending in this phase; process-wide, not exclusive per-request"},
      adoptions:adoptions.map(a=>({databaseHash:a.databaseHash,start:a.start,end:a.end,durationMs:a.end-a.start,completed:a.completed})),afterAdoption2s:{ackMs:stats(after.map(x=>verdictMs(x.write))),coldCommits:after.filter(x=>(x.native?.nativeStats?.["io-stats"]?.reads?.sql??0)>0).length}};
  });
  const memory={};
  for(const row of linux) {
    if(row.run!==manifest.tag||row.source!==manifest.source||row.slot!==manifest.slot)throw Error("Foreign resource row");
    for(const [group,c] of Object.entries(row.cgroups??{})) {
      const role=group.replace(manifest.tag+"-","");
      const value=Number(c["memory.current"]), events=Object.fromEntries((c["memory.events"]??"").trim().split("\n").filter(Boolean).map(s=>{const[k,v]=s.split(/\s+/);return[k,Number(v)];}));
      memory[role]??={sampledPeakBytes:null,samples:0,oom:null,oomKill:null};
      if(Number.isFinite(value)&&value>0){memory[role].sampledPeakBytes=Math.max(memory[role].sampledPeakBytes??0,value);memory[role].samples++;}
      if(Number.isFinite(events.oom))memory[role].oom=Math.max(memory[role].oom??0,events.oom);
      if(Number.isFinite(events.oom_kill))memory[role].oomKill=Math.max(memory[role].oomKill??0,events.oom_kill);
    }
  }
  for(const name of ["containers.json","driver-container.json"]) {
    const file=path.join(directory,name);if(!fs.existsSync(file))continue;
    for(const c of json(name)) {const role=c.Name.replace(/^\//,"").replace(manifest.tag+"-","");if(memory[role])memory[role].limitBytes=c.HostConfig.Memory;}
  }
  const driverFile=path.join(directory,"driver-container.json"),driverId=fs.existsSync(driverFile)?json("driver-container.json")[0].Id:null;
  for(const name of fs.readdirSync(directory).filter(x=>/^scale-memory-\d+\.json$/.test(x))){
    const r=json(name);
    if(r.schema!=="triplex.memory-reading/1"||r.run!==manifest.tag||r.slot!==manifest.slot||r.source!==manifest.source||r.driverContainerId!==driverId||
       !Number.isFinite(r.at)||r.at<manifest.startedAt-1000||r.clock?.bootId!==reference?.bootId)throw Error("Foreign/stale kernel memory reading");
    for(const [role,m] of Object.entries(r.memory??{})){
      if(!memory[role]||!Number.isSafeInteger(m.peakBytes)||m.peakBytes<0||m.limitBytes!==memory[role].limitBytes)throw Error("Kernel memory role/limit mismatch");
      memory[role].kernelPeakBytes=Math.max(memory[role].kernelPeakBytes??0,m.peakBytes);
      memory[role].kernelPeakObservations=(memory[role].kernelPeakObservations??0)+1;
    }
  }
  const caches=json("NATIVE-COUNTERS.json"), scanFile=path.join(directory,"driver/scan-stats.jsonl"),gatewayCaches={};
  if(fs.existsSync(scanFile))for(const line of fs.readFileSync(scanFile,"utf8").trim().split("\n")){
    const r=JSON.parse(line);for(const [role,p] of Object.entries(r.peers??{}))if(p.status===200){const c=JSON.parse(p.body);gatewayCaches[role]={observedAt:r.at,...c};}
  }
  const storageFile=path.join(directory,"scale-storage.jsonl"),storage=fs.existsSync(storageFile)?fs.readFileSync(storageFile,"utf8").trim().split("\n").filter(Boolean).map(JSON.parse):[];
  // [DX-T1-14] Why: PostgreSQL epochs need the contemporaneous guest boot-clock anchor, especially after a clock step.
  // Rejected: align a Mac epoch or an ambiguous stepped timestamp to a transaction by proximity.
  const guestEpoch=t=>{
    const anchors=linux.filter(r=>r.clock?.domain==="linux-monotonic"&&Math.abs(r.at-t)<1500);
    if(!reference||!anchors.length||anchors.some(r=>r.clock.bootId!==reference.bootId)||Math.max(...anchors.map(r=>r.clock.offsetMs))-Math.min(...anchors.map(r=>r.clock.offsetMs))>2)return null;
    const a=anchors.sort((a,b)=>Math.abs(a.at-t)-Math.abs(b.at-t))[0];return t-a.clock.offsetMs+reference.offsetMs;
  };
  const storageTimed=storage.map(r=>({...r,writerAt:guestEpoch(r.at)})).filter(r=>r.writerAt!==null);
  const timedGateways=gateways.map(r=>alignClockRecord(r,reference));
  for(const p of phaseRows){
    const phase=bench.phases.find(x=>x.name===p.name),samples=storageTimed.filter(r=>r.writerAt>=phase.start&&r.writerAt<=phase.end),first=samples[0],last=samples.at(-1);
    const count=first&&last?new Set(timedGateways.filter(g=>g.end>first.writerAt&&g.end<=last.writerAt).map(g=>g.attributes.databaseHash+":"+g.attributes.datomicT)).size:0;
    const commits=first&&last?last.database.xact_commit-first.database.xact_commit:null;
    p.postgres={samples:samples.length,windowMs:first&&last?last.writerAt-first.writerAt:null,commits,acknowledgedNativeTransactions:count,aggregateCommitsPerTransaction:count&&commits!==null?commits/count:null,scope:"collector window; includes administrative samplers, heartbeat and indexing; not isolated transaction or WAL-sync count"};
  }
  const swaps=host.flatMap(r=>{const m=/used\s*=\s*([\d.]+)M/.exec(r.swap??"");return m?[Number(m[1])/1024]:[];});
  const guestAvailable=linux.flatMap(r=>{const m=/^MemAvailable:\s+(\d+) kB/m.exec(r.vm?.["/proc/meminfo"]??"");return m?[Number(m[1])*1024]:[];});
  const transactionFile=path.join(directory,"transaction-shape.json");
  const sourceBuild=json("source-build-hashes.json");
  const measuredCode=Object.entries(sourceBuild).filter(([name])=>/^(?:packages\/(?:core|datomic|host)\/|lab\/bench\/|lab\/experiments\/EXP-DX1\/(?:stack|h3|h4)\/)/.test(name));
  return {schema:"triplex.scale-reading/1",classification:"busy host; diagnostic, no verdict",tag:manifest.tag,source:manifest.source,level:manifest.level,subjects:bench.config.rungSubjects,
    measuredCodeSha256:sha(JSON.stringify(measuredCode)),
    inputs,seed:bench.seed,writer:bench.writer,phases:phaseRows,memory,guestAvailableBytes:{samples:guestAvailable.length,min:guestAvailable.length?Math.min(...guestAvailable):null},nativeCounters:caches,gatewayCaches,replica:bench.replica,readerDiagnostics:bench.readerFinalDiagnostics,writerDiagnostics:bench.writerSourceDiagnostics,expectedStateCache:bench.expectedStateCache,
    host:{swapGiB:stats(swaps),otherCpuPercent:stats(host.map(r=>r.otherCpu).filter(Number.isFinite)),cpuDefinition:"legacy ps process-lifetime percentage gauge; no host/guest per-request alignment"},
    storage,transactionShape:fs.existsSync(transactionFile)?json("transaction-shape.json"):null,
    nativeCoverage:{committed:joined.filter(x=>x.write.outcome==="committed"&&!x.write.expired).length,observed:joined.filter(x=>x.native).length},
    limitations:["No verdict on a busy host or sparse diagnostic pools", "Postgres sample transaction deltas include administrative samplers, heartbeat and indexing; no exact per-Datomic-transaction WAL attribution", "Cache callbacks include setup; missing counters remain unknown", "Memory includes one-second sampled peaks and separately labelled kernel peaks only through the last bound live observation"]};
}

export function scaleMarkdown(runs) {
  const lines=["Diagnostic population comparison on a busy host. Quantiles do not add; native counters join by database/t, never nearest time.","", "| Subjects / trace | seed facts / seconds / facts/s | commits offered / completed / expired | swap GiB p50 / Mac CPU gauge p50 |", "| --- | --- | --- | --- |"];
  for(const r of runs)lines.push(`| ${r.subjects} / ${r.level} | ${r.seed.assertions}/${number(r.seed.wallS)}/${number(r.seed.factsPerS)} | ${r.writer.offered}/${r.writer.completed}/${r.writer.expired} | ${number(r.host.swapGiB.p50)}/${number(r.host.otherCpuPercent.p50)} |`);
  lines.push("","| Subjects / phase | offered / committed / expired | busy-host ACK p50 / p99 ms | native n / SQL-cold commits | serial SQL reads total / mean | apply p50 / p99 ms | peer p50 / p99 ms |","| --- | --- | --- | --- | --- | --- | --- |");
  for(const r of runs)for(const p of r.phases) {const sql=p.storageTierReads.sql;lines.push(`| ${r.subjects} / ${p.name} | ${p.offered}/${p.committed}/${p.expired} | ${number(p.ackMs.p50)}/${number(p.ackMs.p99)} | ${p.nativeObserved}/${p.coldCommits} | ${sql.n?sql.total:"unknown"}/${sql.n?number(sql.total/sql.n):"unknown"} | ${number(p.applyMs.p50)}/${number(p.applyMs.p99)} | ${number(p.anatomy?.peerWaitMs.p50)}/${number(p.anatomy?.peerWaitMs.p99)} |`);}
  lines.push("",...runs[0].limitations.map(x=>"- "+x),"");return lines.join("\n");
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  const [output,...directories]=process.argv.slice(2);if(!output||directories.length!==2)throw Error("scale-reading.mjs NEW_OUTPUT_DIR RUN_100K RUN_10K");
  const runs=[];for(const directory of directories)runs.push(await readScaleRun(path.resolve(directory)));
  if(runs[0].subjects!==100000||runs[1].subjects!==10000||runs[0].level!==runs[1].level||runs[0].measuredCodeSha256!==runs[1].measuredCodeSha256)throw Error("Unmatched population/collector/measured-code comparison");
  fs.mkdirSync(output,{recursive:false});fs.writeFileSync(path.join(output,"SCALE.json"),JSON.stringify({createdAt:Date.now(),programSha256:sha(fs.readFileSync(new URL(import.meta.url))),runs},null,2)+"\n",{flag:"wx"});
  fs.writeFileSync(path.join(output,"SCALE.md"),scaleMarkdown(runs),{flag:"wx"});
}
