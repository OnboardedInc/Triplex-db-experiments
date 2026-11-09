import fs from "node:fs";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { sd, mean, t975 } from "./m01/paired.ts";
import { analyseSingleWindow } from "./m01/single-analysis.ts";
import config from "./m01/noise.json" with { type: "json" };

export const policy = Object.freeze({ version: "rt01-q104a/2", aaRounds: 4, samplesPerArm: 1000,
  blockSize: 500, safety: 1.5, level: 0.95, timingGrade: "GREEN",
  band: "exp(abs(mean(d)) + t975(k-1)*1.5*s_d*sqrt(1+1/k))-1; d=ln(q_right/q_left)",
  p99: "n>=1000 per arm; no small-n point-quantile judgement and no per-command bootstrap",
  grade: "M01 single-q100k; four same-arm/equal-phase observations give three adjacent ratios",
  nonGreen: "UNJUDGED timing bars; record observed metrics and window grade, continue to the next point; never PASS or FAIL",
  comparison: "strict B/A > 1+band is regression; equality is within band; first failure stops; no retries" });
export const digest = (value) => createHash("sha256").update(typeof value === "string" || Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest("hex");
export function quantile(xs, q) {
  assert.ok(xs.length && xs.every((x) => Number.isFinite(x) && x > 0));
  return [...xs].sort((a,b) => a-b)[Math.ceil(xs.length*q)-1];
}
export function stats(xs) { return {n:xs.length,p50:quantile(xs,0.5),p99:quantile(xs,0.99)}; }
export function calibrate(context, armId) {
  assert.ok(context.rounds.length >= policy.aaRounds);
  assert.equal(new Set(context.rounds.map((r) => r.id)).size,context.rounds.length);
  for (const r of context.rounds) {
    assert.equal(r.noise.id,r.id);
    for(const arm of ["left","right"]) {
      assert.ok(r[arm].length >= policy.samplesPerArm);
      stats(r[arm]);
    }
  }
  const window = analyseSingleWindow({armId,preflight:true,regime:context.regime,config,
    rounds:context.rounds.map((r) => ({id:r.id,armId,burstPhase:`rt01-${context.encoding}-${context.size}-fresh-closed-loop`,
      p50Ms:quantile(r.left,0.5),noise:r.noise}))});
  const metrics = {};
  for (const [metric,q] of [["p50",0.5],["p99",0.99]]) {
    const observed_d=context.rounds.map((r)=>Math.log(quantile(r.right,q)/quantile(r.left,q)));
    const diagnostic={observed_d,observed_s_d:sd(observed_d),observedRounds:observed_d.length,note:"all observed A/A rounds, diagnostic only; excluded rounds never create a judged band"};
    const d = context.rounds.filter((r) => !window.exclusions[r.id]).map((r) => Math.log(quantile(r.right,q)/quantile(r.left,q)));
    if(d.length < 3) { metrics[metric]={d,s_d:null,band:null,diagnostic,why:"fewer than 3 usable A/A rounds"}; continue; }
    const s_d=sd(d), bias=mean(d), radius=t975(d.length-1)*policy.safety*s_d*Math.sqrt(1+1/d.length);
    // [EXP-RT01] Why: estimate spread from independent A/A rounds with M01's sample sd, preflight safety and small-sample t bound. Rejected: treating a single near-equal pair or a standard error of the mean as future-window noise.
    metrics[metric]={d,s_d,meanLog:bias,rounds:d.length,predictionRadius:radius,band:Math.expm1(Math.abs(bias)+radius),diagnostic};
  }
  return {encoding:context.encoding,size:context.size,window,metrics};
}
export function makeRule(calibration,identity,writtenAt=new Date().toISOString()) {
  assert.ok(identity.attempt && identity.engineId && identity.sourceSha256 && identity.buildSha256 && identity.baselineSha256 && identity.inputsSha256);
  assert.equal(new Set(calibration.map((c) => `${c.encoding}:${c.size}`)).size,4);
  assert.deepEqual(calibration.map((c) => `${c.encoding}:${c.size}`).sort(),["a0:10","a0:5","compact:10","compact:5"]);
  for(const c of calibration) for(const r of c.rounds) {
    assert.deepEqual(r.binding,identity,"calibration source/slot/attempt binding differs");
    assert.ok(r.noise.window.fromMs>=Date.parse(identity.startedAt) && r.noise.window.toMs<=Date.parse(writtenAt),"stale or future calibration");
  }
  const contexts=calibration.map((c) => calibrate(c,identity.engineId));
  return {schema:policy.version,writtenAt,policy,identity,identitySha256:digest(identity),noiseConfigSha256:digest(config),contexts,
    timingEligible:contexts.every((c) => c.window.timingEligible && Object.values(c.metrics).every((m) => m.band!==null)),calibration};
}
export function freezeRule(file,calibration,identity) {
  const rule=makeRule(calibration,identity);
  fs.writeFileSync(file,JSON.stringify(rule,null,2)+"\n",{flag:"wx"});
  const sha256=digest(fs.readFileSync(file));
  fs.writeFileSync(file+".sha256",sha256+"\n",{flag:"wx"});
  return {rule,sha256};
}
export function loadRule(file,expectedHash,identity) {
  const bytes=fs.readFileSync(file); assert.equal(digest(bytes),expectedHash,"frozen rule bytes changed");
  const rule=JSON.parse(bytes);
  assert.equal(rule.identitySha256,digest(identity),"rule belongs to another source/slot/attempt/input");
  assert.deepEqual(rule,makeRule(rule.calibration,identity,rule.writtenAt),"rule statistics or grading changed");
  return rule;
}
export function judge(rule,{encoding,size,A,B,window}) {
  assert.equal(rule.schema,policy.version);
  const context=rule.contexts.find((c) => c.encoding===encoding && c.size===size);
  assert.ok(context);
  const a=stats(A),b=stats(B),metrics={};
  // [EXP-RT01] Why: the live4 dispatch requires every non-GREEN point to remain unjudged and continue; another context's grade cannot invalidate a GREEN context. Rejected: stopping before B or labeling noisy observations as a timing PASS/FAIL.
  if(!context.window.timingEligible || !window.timingEligible || Object.values(context.metrics).some((m)=>m.band===null))
    return {result:"UNJUDGED",A:a,B:b,windowGrade:window.windowGrade,
      metrics:Object.fromEntries(["p50","p99"].map(m=>[m,{ratio:b[m]/a[m],band:context.metrics[m].band,nA:a.n,nB:b.n,result:"UNJUDGED_WINDOW"}]))};
  for(const metric of ["p50","p99"]) {
    const floor=metric==="p50" ? 150 : policy.samplesPerArm;
    metrics[metric]={ratio:b[metric]/a[metric],band:context.metrics[metric].band,nA:a.n,nB:b.n,
      result:Math.min(a.n,b.n)<floor ? "UNJUDGED_SAMPLE_FLOOR" : b[metric]/a[metric]>1+context.metrics[metric].band ? "REGRESSION" : "WITHIN_BAND"};
  }
  return {result:Object.values(metrics).some((m) => m.result==="REGRESSION") ? "FAIL" : Object.values(metrics).some((m) => m.result!=="WITHIN_BAND") ? "INCONCLUSIVE" : "WITHIN_BAND",A:a,B:b,metrics,windowGrade:window.windowGrade};
}

export function gradePoint(rule,encoding,size,noise) {
  const c=rule.calibration.find((c) => c.encoding===encoding && c.size===size);
  assert.ok(c); assert.ok(!c.rounds.some((r) => r.id===noise.id));
  assert.ok(noise.window.fromMs>=Date.parse(rule.writtenAt) && noise.window.toMs<=Date.now(),"point noise is stale or future");
  // [EXP-RT01] Why: retain frozen same-arm A/A drift and the complete hard-rule history while checking this point's signals. Rejected: using candidate latency to grade noise, or silently clearing an earlier hard failure.
  return analyseSingleWindow({armId:rule.identity.engineId,preflight:true,regime:c.regime,config,
    rounds:[...c.rounds.map((r) => ({id:r.id,p50Ms:quantile(r.left,0.5),noise:r.noise})),{id:noise.id,p50Ms:null,noise}]
      .map((r) => ({...r,armId:rule.identity.engineId,burstPhase:`rt01-${encoding}-${size}-fresh-closed-loop`}))});
}

export {config,analyseSingleWindow};
