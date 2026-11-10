import fs from "node:fs";
import path from "node:path";
// [DX-B4-T3] Why: phase-boundary cumulative counters need subtraction, including partially completed scans.
// Rejected: assigning a start-of-phase snapshot to the phase that has not run yet.
const dir=process.argv[2];
const snapshots=fs.readFileSync(path.join(dir,"scan-stats.jsonl"),"utf8").trim().split("\n").map(JSON.parse);
const flat=(obj,prefix="",out={})=>{for(const [k,v] of Object.entries(obj)) {const key=prefix?`${prefix} / ${k}`:k;if(typeof v==="number")out[key]=v;else if(v&&typeof v==="object")flat(v,key,out);}return out;};
let previous={}, previousPhase="setup";
const lines=["# Scan statistics by interval","","Each row is a delta of cumulative native counters between phase-boundary snapshots. Route admin calls include observation. `datoms` counts fact-identity enumeration; subsequent entity API work is additional. Unfinished scans still contribute enumeration counts. Maxima are cumulative witnesses, never subtracted.",""];
for(const snapshot of snapshots) {
 const label=snapshot.phase.includes("phase ")?snapshot.phase.split("phase ")[1].split(":")[0]:snapshot.phase;
 lines.push(`## ${previousPhase} → ${label}`,"","| Peer | Counter | Count |","|---|---|---:|");
 for(const {port,stats} of snapshot.stats) {
  const grouped={...stats,routes:{}};
  for(const [route,count] of Object.entries(stats.routes??{})) {
   const key=route.replace(/\/operation\/[^/]+$/, "/operation/{id}"); grouped.routes[key]=(grouped.routes[key]??0)+count;
  }
  const fields=flat(grouped);
  for(const [key,value] of Object.entries(fields).sort()) {
   const baseline=previous[port]?.[key]??0;
   const amount=key.endsWith("maxDatoms")?value:value-baseline;
   if(amount)lines.push(`| ${port} | ${key.replaceAll("|","\\|")} | ${amount} |`);
  }
  previous[port]=fields;
 }
 lines.push("");previousPhase=label;
}
console.log(lines.join("\n"));
