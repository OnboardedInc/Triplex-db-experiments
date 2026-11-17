// @ts-nocheck -- [DX-T1-14] Why: validate heterogeneous diagnostic records at ingestion. Rejected: treating missing counters as zero; checkjs still checks bindings.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { records, percentile } from "./report.mjs";
import { verdictMs } from "./instrument.mjs";
import { verifiedRawManifest } from "./pack-oracle.mjs";
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
  const native=[],gateways=[],linux=[],host=[];
  const bound=async(name,accept,into)=>{
    const file=path.join(directory,"trace/raw",name);
    if (!fs.existsSync(file)) return;
    for await (const r of records(file)) if(accept(r)) into.push(r);
  };
  await bound("tx.jfr.jsonl.gz",r=>r.nativeType==="triplex.NativeTransaction",native);
  await bound("gw-w.jsonl.gz",r=>r.type==="request"&&r.kind==="commit"&&r.attributes?.datomicT,gateways);
  await bound("system-linux.jsonl.gz",()=>true,linux);
  await bound("system-darwin.jsonl.gz",()=>true,host);
  const joined=nativeByCommit(manifest,primary,gateways,native);
  const phaseRows=(bench.phases??[]).map(p=>{
    const rows=joined.filter(x=>x.write.scheduledAt>=p.start && x.write.scheduledAt<p.end);
    const committed=rows.filter(x=>x.write.outcome==="committed"&&!x.write.expired), samples=committed.flatMap(x=>x.native?[x.native.nativeStats]:[]);
    const reads=samples.flatMap(s=>s["io-stats"]?.reads?[s["io-stats"].reads]:[]);
    // [DX-T1-14] Why: Datomic elides zero-valued tiers in a present reads map; an absent entire map remains unobserved.
    // Rejected: averaging SQL reads only over cold commits, which overstates the population-wide cold-read rate.
    const column=k=>stats(reads.map(r=>r[k]??0).filter(Number.isFinite));
    return {name:p.name,readers:p.readers,offered:rows.length,committed:committed.length,expired:rows.filter(x=>x.write.expired).length,
      ackMs:stats(committed.map(x=>verdictMs(x.write))),finishMs:stats(committed.map(x=>x.write.latencyMs)),
      nativeObserved:samples.length,readCounterCommits:reads.length,coldCommits:reads.filter(r=>(r.sql??0)>0).length,
      storageTierReads:{objectCache:column("ocache"),sql:column("sql"),sqlMs:column("sql-ms"),aevt:column("aevt"),avet:column("avet"),eavt:column("eavt")},
      datoms:stats(samples.map(s=>s["datom-count"]).filter(Number.isFinite)),nativeProcessMs:stats(samples.map(s=>s.msec)),applyMs:stats(samples.map(s=>s["apply-msec"])),anatomy:anatomy.phases[p.name]??null};
  });
  const memory={};
  for(const row of linux) {
    if(row.run!==manifest.tag||row.source!==manifest.source||row.slot!==manifest.slot)throw Error("Foreign resource row");
    for(const [role,c] of Object.entries(row.cgroups??{})) {
      const value=Number(c["memory.current"]), events=Object.fromEntries((c["memory.events"]??"").trim().split("\n").filter(Boolean).map(s=>{const[k,v]=s.split(/\s+/);return[k,Number(v)];}));
      memory[role]??={sampledPeakBytes:0,oom:0,oomKill:0};
      if(Number.isFinite(value))memory[role].sampledPeakBytes=Math.max(memory[role].sampledPeakBytes,value);
      memory[role].oom=Math.max(memory[role].oom,events.oom??0);memory[role].oomKill=Math.max(memory[role].oomKill,events.oom_kill??0);
    }
  }
  for(const name of ["containers.json","driver-container.json"]) {
    const file=path.join(directory,name);if(!fs.existsSync(file))continue;
    for(const c of json(name)) {const role=c.Name.replace(/^\//,"").replace(manifest.tag+"-","");if(memory[role])memory[role].limitBytes=c.HostConfig.Memory;}
  }
  const caches=json("NATIVE-COUNTERS.json"), scanFile=path.join(directory,"driver/scan-stats.jsonl"),gatewayCaches={};
  if(fs.existsSync(scanFile))for(const line of fs.readFileSync(scanFile,"utf8").trim().split("\n")){
    const r=JSON.parse(line);for(const [role,p] of Object.entries(r.peers??{}))if(p.status===200){const c=JSON.parse(p.body);gatewayCaches[role]={observedAt:r.at,...c};}
  }
  const storageFile=path.join(directory,"scale-storage.jsonl"),storage=fs.existsSync(storageFile)?fs.readFileSync(storageFile,"utf8").trim().split("\n").filter(Boolean).map(JSON.parse):[];
  const swaps=host.flatMap(r=>{const m=/used\s*=\s*([\d.]+)M/.exec(r.swap??"");return m?[Number(m[1])/1024]:[];});
  const transactionFile=path.join(directory,"transaction-shape.json");
  return {schema:"triplex.scale-reading/1",classification:"busy host; diagnostic, no verdict",tag:manifest.tag,source:manifest.source,level:manifest.level,subjects:bench.config.rungSubjects,
    inputs,seed:bench.seed,writer:bench.writer,phases:phaseRows,memory,nativeCounters:caches,gatewayCaches,replica:bench.replica,readerDiagnostics:bench.readerFinalDiagnostics,
    host:{swapGiB:stats(swaps),otherCpuPercent:stats(host.map(r=>r.otherCpu).filter(Number.isFinite)),cpuDefinition:"legacy ps process-lifetime percentage gauge; no host/guest per-request alignment"},
    storage,transactionShape:fs.existsSync(transactionFile)?json("transaction-shape.json"):null,
    nativeCoverage:{committed:joined.filter(x=>x.write.outcome==="committed"&&!x.write.expired).length,observed:joined.filter(x=>x.native).length},
    limitations:["No verdict on a busy host or sparse diagnostic pools", "Postgres sample transaction deltas include administrative samplers, heartbeat and indexing; no exact per-Datomic-transaction WAL attribution", "Cache callbacks include setup; missing counters remain unknown", "Memory peaks are one-second sampled, not kernel high-water marks"]};
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
  if(runs[0].subjects!==100000||runs[1].subjects!==10000||runs[0].level!==runs[1].level)throw Error("Unmatched population/collector comparison");
  fs.mkdirSync(output,{recursive:false});fs.writeFileSync(path.join(output,"SCALE.json"),JSON.stringify({createdAt:Date.now(),programSha256:sha(fs.readFileSync(new URL(import.meta.url))),runs},null,2)+"\n",{flag:"wx"});
  fs.writeFileSync(path.join(output,"SCALE.md"),scaleMarkdown(runs),{flag:"wx"});
}
