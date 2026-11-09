import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {pathToFileURL} from "node:url";
const root=path.resolve(import.meta.dirname,"../../../..");
const durable="/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-RT01";
const hash=(b)=>createHash("sha256").update(b).digest("hex");
const pins=new Map(fs.readFileSync(path.join(root,"lab/experiments/EXP-RT01/live3-run/DURABLE-SHA256SUMS"),"utf8").trim().split("\n").map(l=>{const[h,p]=l.split("  ");return[p,h];}));
const evidence={};
function retained(p) {const b=fs.readFileSync(path.join(durable,p));assert.equal(hash(b),pins.get(p),p);evidence[p]=pins.get(p);return JSON.parse(b);}
const point=retained("round6/g6-attempt1/point-0-compact-5.json");
const execution=retained("round6/g6-attempt1/execution.json");
const dictionary=retained("round6/g6-attempt1/statements.json");
const bytes=fs.readFileSync(path.join(durable,"round6/g6-attempt1/events.jsonl"));
assert.equal(hash(bytes),pins.get("round6/g6-attempt1/events.jsonl"));evidence["round6/g6-attempt1/events.jsonl"]=hash(bytes);
const events=bytes.toString().trim().split("\n").map(JSON.parse);
assert.equal(execution.failure.stage,"AB:0:compact:5");
const base=path.join(durable,"live2/baseline");
const identity=JSON.parse(fs.readFileSync(path.join(base,"identity.json")));
const modulePaths=["packages/xtdb/dist/XtdbStorageAdapter.js","packages/xtdb/dist/XtdbClient.js"];
for(const p of modulePaths)assert.equal(hash(fs.readFileSync(path.join(base,p))),identity.files[p]);
const before=await import(pathToFileURL(path.join(base,modulePaths[0])).href);
const after=await import(pathToFileURL(path.join(root,modulePaths[0])).href);
assert.equal(hash(fs.readFileSync(path.join(root,modulePaths[0]))),execution.startedFromG2Build[modulePaths[0]]);
const guards={before:before.compactGuards("diagnostic-scope",150,"diagnostic-op",[],["a","b","c","d","e"]),
  after:after.compactGuards("diagnostic-scope",150,"diagnostic-op",[],["a","b","c","d","e"],100000001)};
// [EXP-RT01] Why: baseline and current modules have distinct XtdbTextArray constructors; compare the emitted parameter payloads. Rejected: prototype identity as a SQL/parameter equivalence test.
assert.deepEqual(JSON.parse(JSON.stringify(guards.before[1])),JSON.parse(JSON.stringify(guards.after[1])));assert.equal(guards.before.length,2);assert.equal(guards.after.length,2);
assert.ok(!guards.before[0].sql.includes("stamp"));assert.ok(guards.after[0].sql.includes("_id = $1 AND scope_key = $1 AND position = $2"));
const arms={};
for(const [arm,index] of [["A",0],["B",1]]) {
  const activity=`AB:0:compact:5:${index}`;
  const wire=events.filter(e=>e.stage==="AB:0:compact:5" && e.activity===activity && (e.kind==="wire-complete"||e.kind==="sample"));
  const second=wire.findIndex(e=>e.kind==="sample"&&e.position===2);
  const first=wire.findIndex(e=>e.kind==="sample"&&e.position===1);
  assert.ok(second>first && first>=0);
  const emitted=wire.slice(first+1,second).filter(e=>e.kind==="wire-complete").map(e=>({sql:dictionary[e.sqlSha256],sha256:e.sqlSha256,ms:e.ms}));
  assert.equal(emitted.length,12);
  const guard=guards[arm==="A"?"before":"after"];
  for(const g of guard)assert.ok(emitted.some(s=>s.sql===g.sql),"wire binds exact generated compact guard");
  const blocks=point.blocks.filter(b=>b.arm===arm),samples=blocks.flatMap(b=>b.samples);
  assert.equal(samples.length,150);assert.ok(samples.every(s=>s.submittedStatements===5));
  const plans=point.scans[arm].nativePlans;
  assert.ok(plans.before.sql.includes("MAX(stamp)"));assert.ok(plans.after.sql.includes("_id = $1"));
  assert.deepEqual(plans.before.params.slice(0,2),[point.scans[arm].scope,150]);
  const observed=(version)=>plans[version].analyze.filter(r=>r.op==="scan").map(r=>({op:r.op,outputRows:Number(r.row_count),...r.attributes}));
  assert.equal(observed("before").length,2);assert.equal(observed("after").length,2);
  const decomposed=[];
  for(const blockIndex of arm==="A"?[0,2]:[1,3]) {
    let pending=[],seenFirst=false;
    for(const e of events.filter(e=>e.stage==="AB:0:compact:5" && e.activity===`AB:0:compact:5:${blockIndex}`)) {
      if(e.kind==="wire-complete")pending.push(e);
      if(e.kind==="sample") {
        if(seenFirst) {
          assert.equal(pending.length,12);
          const wireMs=pending.reduce((n,w)=>n+w.ms,0);
          decomposed.push({position:e.position,serviceMs:e.ms,wireMs,outsideWireMs:e.ms-wireMs,
            guardWireMs:pending.filter(w=>dictionary[w.sqlSha256].startsWith("ASSERT (SELECT COALESCE(MAX(position)" )).reduce((n,w)=>n+w.ms,0),
            commitSyncWireMs:pending.find(w=>dictionary[w.sqlSha256]==="COMMIT SYNC").ms});
        }
        seenFirst=true;pending=[];
      }
    }
  }
  assert.equal(decomposed.length,148);
  const tailSample=samples.find(s=>s.ms===point[arm].p99);
  assert.ok(tailSample);
  const tail=decomposed.find(s=>s.position===tailSample.position)??{position:tailSample.position,unavailable:"first commit of block includes untimed count probes; not decomposed"};
  arms[arm]={scope:blocks[0].scope,latency:point[arm],warmEmittedWire:emitted,statementCount:5,
    scopeRows:blocks.map(b=>[b.before.assertionRows,b.after.assertionRows]),wideRT01Guard:observed("before"),markerRT01Guard:observed("after"),
    diagnosticNativePlans:plans,tailSampleDecomposition:tail,decomposedWarmCommits:decomposed,
    scanClientP50Ms:{position:point.scans[arm].position.p50,wideStamp:point.scans[arm].wideStamp.p50,marker:point.scans[arm].markerStamp.p50,newGuard:point.scans[arm].fullNewGuard.p50}};
}
// [EXP-RT01] Why: compare actual pre-RT01/current emission and retained native operators, naming the missing baseline plan. Rejected: relabeling the old RT01 MAX(stamp) SELECT as the pre-RT01 position-only guard or inferring a p99 cause from one probe.
const result={schema:"rt01-compact-diagnosis/1",at:new Date().toISOString(),kind:"offline analysis of immutable live3 failure; no new engine execution",
  evidence,baselineCommit:identity.commit,baselineIdentitySha256:hash(fs.readFileSync(path.join(base,"identity.json"))),guards,arms,
  failedReceiptPreserved:execution.failure,
  findings:["Both builds: two compact guards, five submitted statements, twelve warm wire cycles; second identity guard byte-identical for matched inputs.",
    "Pre-RT01 first guard reads MAX(position) only; RT01 adds exact prior marker stamp comparison inside that ASSERT, one parameter, a scalar subquery and a second tx_meta scan branch.",
    "Retained before plans are OLD RT01 wide-stamp SELECT predicates, not pre-RT01 native plans. Current marker branch reads one page versus four for wide aggregate; unchanged position branch remains broad.",
    "Full pre-RT01 position-only EXPLAIN was not captured. Its matching position branch can be inspected in the retained SELECT plans, but this is a subplan comparison, not a newly executed baseline plan.",
    "The remaining extra stamp branch is real work; input and statement/round-trip count did not grow on warm compact commits. Its standalone cost and the receipt/journal/schema differences are candidates, not causal proof of the p99 +39.32%.",
    "The original failed rule/receipt stays failed. Four-round GREEN grading and >=1000 samples are future evidence, not retrospective acceptance."]};
console.log(JSON.stringify(result,null,2));
