import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {makeRule,freezeRule,loadRule,judge,gradePoint,config,digest,calibrate} from "./rule.mjs";

const identity={attempt:"synthetic-only",engineId:"synthetic-engine",sourceSha256:"source",buildSha256:"build",baselineSha256:"baseline",inputsSha256:"inputs",startedAt:"2026-01-01T00:00:00Z"};
function noise(id) {
  const signals=Object.fromEntries(config.rules.map((r) => [r.signal,r.excludeOutside ? 1 : 0]));
  const offset=id.startsWith("point")?2000:1;
  return {id,window:{fromMs:Date.parse(identity.startedAt)+offset,toMs:Date.parse(identity.startedAt)+offset+1},signals,partitioned:true,arms:{},neighbors:[],missing:[]};
}
const xs=(n=1000,scale=1) => Array.from({length:n},(_,i) => scale*(10+i%20));
function contexts() {return ["a0","compact"].flatMap((encoding) => [10,5].map((size) => ({encoding,size,regime:"quota",rounds:[1,1.01,0.99,1.02].map((s,i) => {
  const id=`${encoding}-${size}-${i}`;return {id,binding:identity,left:xs(),right:xs(1000,s),noise:noise(id)};
})})));}
const rule=() => makeRule(contexts(),identity,"2026-01-01T00:00:01Z");
const window={timingEligible:true,windowGrade:{grade:"GREEN"}};
test("four A/A rounds, sample sd and three sequential ratios; both metrics",() => {
  const r=rule();assert.equal(r.timingEligible,true);
  for(const c of r.contexts){assert.equal(c.window.logRatios.length,3);for(const m of Object.values(c.metrics)){assert.equal(m.rounds,4);assert.ok(m.s_d>0);assert.ok(m.band>m.s_d);}}
});
test("fewer than four observations do not manufacture sequential GREEN",() => {
  const c=contexts()[0];c.rounds.pop();assert.throws(()=>calibrate(c,identity.engineId));
});
test("a single near-equal A/A pair cannot produce a band",() => {
  const c=contexts()[0];c.rounds=c.rounds.slice(0,1);assert.throws(()=>calibrate(c,identity.engineId));
});
test("p99 below 1000 is unjudged even when the second-highest sample rises",() => {
  const r=rule(),A=xs(150),B=xs(150);B[0]=100;B[1]=100;
  const v=judge(r,{encoding:"compact",size:5,A,B,window});assert.equal(v.metrics.p99.result,"UNJUDGED_SAMPLE_FLOOR");assert.equal(v.result,"INCONCLUSIVE");
});
test("p50 needs at least 150 samples",() => {const v=judge(rule(),{encoding:"a0",size:10,A:xs(149),B:xs(149),window});assert.equal(v.metrics.p50.result,"UNJUDGED_SAMPLE_FLOOR");});
test("1000-sample p99 regression counted, preserving exact denominator",() => {
  const A=xs(),B=xs();for(let i=0;i<20;i++)B[i]=1000;
  const v=judge(rule(),{encoding:"compact",size:5,A,B,window});assert.equal(v.metrics.p99.result,"REGRESSION");assert.equal(v.metrics.p99.nB,1000);assert.equal(v.result,"FAIL");
});
test("equal distributions within band; not a blanket PASS",() => {assert.equal(judge(rule(),{encoding:"a0",size:10,A:xs(),B:xs(),window}).result,"WITHIN_BAND");});
test("persistent A/A bias contributes to the frozen prediction band",() => {
  const c=contexts()[0];for(const r of c.rounds)r.right=xs(1000,1.2);
  assert.ok(calibrate(c,identity.engineId).metrics.p50.band>=0.19999999);
});
test("hard failure remains RED even below a third exclusions",() => {
  const c=contexts();c[0].rounds[0].noise.signals["host.pressureLevelMax"]=4;
  const r=makeRule(c,identity);assert.equal(r.timingEligible,false);assert.equal(r.contexts[0].window.windowGrade.grade,"RED");
});
test("missing active signal cannot clear the window",() => {
  const c=contexts();for(const r of c[0].rounds)r.noise.signals["calib.hostDrift"]=null;
  assert.equal(makeRule(c,identity).timingEligible,false);
});
test("shared unpartitioned VM remains AMBER, timing INVALID",() => {
  const c=contexts();for(const r of c[0].rounds)r.noise.partitioned=false;
  const r=makeRule(c,identity);assert.equal(r.contexts[0].window.windowGrade.grade,"AMBER");
  assert.equal(judge(r,{encoding:"a0",size:10,A:xs(),B:xs(1000,10),window}).result,"UNJUDGED");
});
test("point noise hard failure cannot reuse GREEN preflight",() => {
  const r=rule(),n=noise("point");n.signals["arms.oomKillDelta"]=1;
  const w=gradePoint(r,"a0",10,n);assert.equal(w.timingEligible,false);
  assert.equal(judge(r,{encoding:"a0",size:10,A:xs(),B:xs(),window:w}).result,"UNJUDGED");
});
test("unknown point signals unjudged",() => {const n=noise("point");n.signals["vm.psi.cpuSomeShare"]=null;assert.equal(gradePoint(rule(),"a0",10,n).timingEligible,false);});
test("point cannot substitute stale pre-rule noise",() => {assert.throws(()=>gradePoint(rule(),"a0",10,noise("old-control")));});
test("wrong source/engine/attempt calibration rejected",() => {const c=contexts();c[0].rounds[0].binding={...identity,engineId:"other"};assert.throws(()=>makeRule(c,identity));});
test("stale and future calibration refused",() => {const c=contexts();c[0].rounds[0].noise.window.fromMs=0;assert.throws(()=>makeRule(c,identity));});
test("freeze exclusive before B, exact source binding and byte edits refused",() => {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"rt01-rule-")),file=path.join(dir,"rule.json");
  try {const frozen=freezeRule(file,contexts(),identity);assert.deepEqual(loadRule(file,frozen.sha256,identity),frozen.rule);
    assert.throws(()=>freezeRule(file,contexts(),identity));assert.throws(()=>loadRule(file,frozen.sha256,{...identity,attempt:"other"}));
    const bytes=fs.readFileSync(file);fs.appendFileSync(file," ");assert.throws(()=>loadRule(file,frozen.sha256,identity));
    fs.writeFileSync(file,bytes);const edited=JSON.parse(bytes);edited.contexts[0].metrics.p50.band=100;
    fs.writeFileSync(file,JSON.stringify(edited));assert.throws(()=>loadRule(file,digest(fs.readFileSync(file)),identity));
  } finally {fs.rmSync(dir,{recursive:true});}
});

test("one non-GREEN context cannot suppress another GREEN context",()=>{
  const c=contexts();for(const r of c[0].rounds)r.noise.partitioned=false;
  const rule=makeRule(c,identity);assert.equal(rule.timingEligible,false);
  assert.equal(judge(rule,{encoding:"compact",size:5,A:xs(),B:xs(1000,10),window}).result,"FAIL");
});
test("non-GREEN point keeps quantiles/denominators with explicitly unjudged bars",()=>{
  const r=rule();const v=judge(r,{encoding:"a0",size:10,A:xs(),B:xs(1000,10),window:{timingEligible:false,windowGrade:{grade:"AMBER"}}});
  assert.equal(v.result,"UNJUDGED");assert.equal(v.A.n,1000);assert.equal(v.B.n,1000);
  assert.equal(v.metrics.p99.result,"UNJUDGED_WINDOW");assert.equal(v.metrics.p99.ratio,10);
});
