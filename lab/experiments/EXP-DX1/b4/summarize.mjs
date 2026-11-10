import fs from "node:fs";
import path from "node:path";
const dir=process.argv[2],r=JSON.parse(fs.readFileSync(path.join(dir,"ns-report.json"),"utf8"));
// [DX-B4-T4] Why: retain every driver verdict and denominator beside diagnostic numbers.
// Rejected: reporting successful bars alone or inferring acceptance from process exit.
const lines=["# T4 diagnostic tables","",`Status: ${r.status}. Source: ${dir}/ns-report.json`,""];
const json=(label,x)=>lines.push(`## ${label}`,"","```json",JSON.stringify(x ?? {status:"NOT-AVAILABLE",reason:"driver interrupted before final analysis"},null,2),"```","");
const fmt=x=>x===null||x===undefined?"—":typeof x==="number"?Number(x.toFixed(3)):String(x);
const table=(header,rows)=>lines.push(`| ${header.join(" | ")} |`,`| ${header.map(()=>"---").join(" | ")} |`,...rows.map(row=>`| ${row.map(fmt).join(" | ")} |`),"");
if(!r.priorities)lines.push("Final driver analysis did not run. All bars, correctness totals, O-REPLAY and scheduled-offer latency histograms are unavailable; missing values are not zero or passing.", "");
const log=fs.readFileSync(path.join(dir,"driver.log"),"utf8"),pending={};
for(const match of log.matchAll(/phase (\S+):.*?writer pending (\d+)/g))pending[match[1]]=Number(match[2]);
lines.push("## Phases","", "Read/commit/lag values below are milliseconds. The queue is sampled at phase start; histogram windows exclude settling.","");
table(["Phase","Readers","Trace s","Pending","Read p50 / p99","Goodput/s","Commit p50 / p99","Feed lag p50 / p99","Read errors / violations"],r.phases.map(p=>[p.name,p.readers,p.traceStartS,pending[p.name],`${fmt(p.stats?.read.p50Ms)} / ${fmt(p.stats?.read.p99Ms)}`,p.stats?.goodputPerS,`${fmt(p.stats?.writer.commit.p50Ms)} / ${fmt(p.stats?.writer.commit.p99Ms)}`,`${fmt(p.stats?.feedLag.p50Ms)} / ${fmt(p.stats?.feedLag.p99Ms)}`,`${fmt(p.stats?.errors)} / ${fmt(p.stats?.violations)}`]));
for(const group of ["bandsAll","bandsSteady","bandsBurst","bandsAtL256"]) {
 lines.push(`## P2 ${group}`,"");table(["Facts","Count","p50 ms","p99 ms"],Object.entries(r.priorities?.P2?.[group]??{"5-10":{},"11-25":{},"26-50":{}}).map(([band,h])=>[band,h.count,h.p50Ms,h.p99Ms]));
}
json("P2 accounting and correctness",{accounting:r.priorities?.P2?.accounting,duplicates:r.priorities?.P2?.duplicates,lostAck:r.priorities?.P2?.lostAck,readYourOwnWrite:r.priorities?.P2?.readYourOwnWrite,progress:r.priorities?.P2?.progress});
json("P3 complete counters",r.priorities?.P3);
json("P4 numbers",r.priorities?.P4?{...r.priorities.P4,bars:undefined}:null);
json("P5 numbers",r.priorities?.P5?{...r.priorities.P5,bars:undefined}:null);
if(!r.priorities)lines.push("No driver bars were emitted: final analysis did not run. No PASS/MISS verdicts are available.", "");
lines.push("## Every driver bar","","These are the driver's local verdicts. A failing/invalid run is not qualified by isolated true rows.","");
table(["Priority / bar","Observed","Target","Driver pass","Note"],Object.entries(r.priorities??{}).flatMap(([priority,p])=>(p.bars??[]).map(b=>[`${priority}: ${b.id}`,JSON.stringify(b.value)?.replaceAll("|","\\|"),b.bar,b.pass===null?"unknown":b.pass?"true":"false",(b.note??"").replaceAll("|","\\|")])));
json("Complete correctness, oracle and invalid reasons",{writer:r.writer??null,correctness:r.correctness??null,oracle:r.oracle??null,client:r.client??null,feedFailure:r.feedFailure??null,invalidReasons:r.invalidReasons??null,maintenance:r.maintenance??null});
if(fs.existsSync(path.join(dir,"http-main.jsonl"))) {
 const observations=fs.readFileSync(path.join(dir,"http-main.jsonl"),"utf8").trim().split("\n").filter(Boolean).map(JSON.parse).filter(s=>s.atMs>=r.traceStartAbsMs);
 const percentile=(xs,p)=>xs.length?xs.sort((a,b)=>a-b)[Math.min(xs.length-1,Math.floor(xs.length*p))]:null;
 lines.push("## Actual main-thread HTTP timing headers","","Successful requests only; observations cover writer, feed and auxiliary main-thread clients. Worker reads are excluded. Missing gateway headers remain missing.","");
 table(["Route","Count","Wall p50 / p99 ms","Gateway p50 / p99 ms","d/transact p50 / p99 ms"],[...new Set(observations.map(s=>s.route))].sort().map(route=>{
  const rows=observations.filter(s=>s.route===route); const pair=(field,scale=1)=>{const values=rows.map(s=>s[field]).filter(v=>typeof v==="number"&&Number.isFinite(v)).map(v=>v/scale);return `${fmt(percentile(values,0.5))} / ${fmt(percentile(values,0.99))}`;};
  return [route,rows.length,pair("wallMs"),pair("gatewayMicros",1000),pair("transactMicros",1000)];
 }));
}
console.log(lines.join("\n"));
