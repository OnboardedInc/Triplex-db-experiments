import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {createInterface} from "node:readline";
import {execFileSync} from "node:child_process";
import {loadRule,judge,gradePoint,digest,analyseSingleWindow,config as noiseConfig} from "../round7/rule.mjs";
const root=path.resolve(import.meta.dirname,"../../../.."),raw="/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-RT01/live5";
const read=p=>JSON.parse(fs.readFileSync(path.join(raw,p)));
const hash=p=>createHash("sha256").update(fs.readFileSync(p)).digest("hex");
assert.ok(!fs.existsSync(path.join(raw,"RESULT.json")));
const ctl=read("live-attempt1/execution.json"),admit=read("admission1/decision.json"),owner=read("owner-start.json"),engine=read("engine-start.json")[0],end=read("live-attempt1/engine-end.stdout")[0];
assert.equal(ctl.acquired,true);assert.equal(ctl.ownerExistedBefore,false);assert.equal(admit.reason,null);assert.equal(admit.up.exit,0);assert.ok(admit.freeBytes>13*1024**3);
assert.equal(owner.holder,"CX-RT01");assert.equal(owner.slot,"s1");assert.equal(engine.Id,end.Id);assert.equal(engine.Image,end.Image);assert.equal(engine.Config.Labels["tx2.holder"],owner.holder);
for(const name of ["admission","g2","engine-end","engine-log","engine-down","cleanup"])assert.equal(ctl.phases.find(p=>p.name===name).exit,0,name);
const tests=fs.readFileSync(path.join(raw,"offline1/final-tests.stdout"),"utf8");assert.match(tests,/# tests 21\n/);assert.match(tests,/# pass 21\n/);assert.match(tests,/# fail 0\n/);
assert.equal(fs.readFileSync(path.join(raw,"offline1/types.stderr"),"utf8"),"");
const prep=read("offline1/SOURCE.json");
for(const [p,h]of Object.entries(prep.hashes)) {
  assert.equal(hash(path.join(raw,"offline1/source",p)),h);
  // [EXP-RT01] Why: bind executed helpers to copied bytes while allowing the post-run runbook to describe its outcome. Rejected: treating a historical command line as a source identity.
  if(p!=="lab/experiments/EXP-RT01/round7/RUNBOOK.md")assert.equal(hash(path.join(root,p)),h,p);
}
const probes=read("offline1/sandbox-probes.json").probes;assert.equal(probes.find(p=>p.command[0].endsWith("vm_stat")).exit,0);assert.equal(probes.find(p=>p.command[0].endsWith("memory_pressure")).exit,0);
for(const p of probes.filter(p=>p.command[0].endsWith("sysctl"))){assert.equal(p.exit,1);assert.match(p.stderr,/Operation not permitted/);}
for(const s of read("offline1/actual-host-samples.json").samples){assert.equal(s.pressureLevel,null);assert.equal(s.swapUsedBytes,null);assert.ok(s.pageouts!==null);for(const p of s.probes)assert.equal(p.error,null);assert.ok(s.counterSources);}
const g2=read("g2-attempt1/execution.json"),outcomes=read("g2-attempt1/outcomes.json");
assert.equal(g2.live.exit,0);assert.deepEqual(g2.before,g2.after);assert.equal(g2.sourceUnchanged,true);assert.ok(g2.phases.length===6&&g2.phases.every(p=>p.exit===0));
assert.equal(outcomes.failure,null);assert.deepEqual(outcomes.failures,[]);assert.equal(outcomes.diagnostic,false);assert.equal(outcomes.grantsAcceptance,true);assert.deepEqual(outcomes.owner,owner);
for(const [p,h]of Object.entries({...g2.after,...g2.build}))assert.equal(hash(path.join(root,p)),h,p);
const counts={};
for await(const line of createInterface({input:fs.createReadStream(path.join(raw,"g2-attempt1/progress.jsonl")),crlfDelay:Infinity})) {const e=JSON.parse(line);counts[e.kind]=(counts[e.kind]??0)+1;}
for(const [kind,n]of Object.entries({"case-pass":197,"route-pass":42,"schedule-pass":2,"determinism-pass":1}))assert.equal(counts[kind],n,kind);
for(const kind of ["first-failure","query-error","diagnostic-failure"])assert.equal(counts[kind]??0,0,kind);
for(const encoding of ["a0","compact"]) {
 const r=read(`g2-attempt1/routes-${encoding}.json`);assert.equal(Object.keys(r.before).length,21);assert.deepEqual(Object.keys(r.before),Object.keys(r.after));
 for(const name of Object.keys(r.before)) {const before=structuredClone(r.before[name]),after=structuredClone(r.after[name]);
  if(name==="entityPage"||name==="queryAll-echo"){const k=name==="entityPage"?"snapshot":"basis";assert.equal(before[k].recordedPosition,r.first.position);assert.equal(after[k].recordedPosition,r.second.position);before[k].recordedPosition=after[k].recordedPosition;}
  assert.deepEqual(before,after,`${encoding}/${name}`);if(name!=="dependency")assert.ok(JSON.stringify(before).includes("before"));
 }
}
const fixtures=read("g2-attempt1/determinism.json");assert.equal(fixtures.length,3);assert.deepEqual(fixtures[0],fixtures[1]);assert.deepEqual(fixtures[1],fixtures[2]);
const g6=read("g6-attempt1/execution.json");assert.deepEqual(g6.before,g6.after);assert.equal(g6.sourceUnchanged,true);assert.equal(g6.runnerUnchanged,true);assert.deepEqual(g6.owner,owner);assert.deepEqual(g6.startedFromG2Build,g2.build);
for(const [p,h]of Object.entries(g6.runnerHashes))assert.equal(hash(path.resolve(root,"lab/experiments/EXP-RT01/round7",p)),h,p);
let samples=0,firstFailure=[],frozen=null,firstB=null,lastBudget=null;const stages={};
for await(const line of createInterface({input:fs.createReadStream(path.join(raw,"g6-attempt1/events.jsonl")),crlfDelay:Infinity})) {
 const e=JSON.parse(line);
 if(e.kind==="sample"){samples++;stages[e.stage]=(stages[e.stage]??0)+1;if(e.arm==="B"&&!firstB){firstB=e;assert.ok(frozen,"B precedes frozen rule");assert.ok(e.at>=frozen.at);}}
 if(e.kind==="rule-frozen"){assert.equal(frozen,null);frozen=e;}
 if(e.kind==="first-failure")firstFailure.push(e);
 if(e.kind==="disk-budget")lastBudget=e;
}
let rule=null;
if(frozen){const f=path.join(raw,"g6-attempt1/AA-RULE-BEFORE-B.json"),r=JSON.parse(fs.readFileSync(f));assert.equal(fs.readFileSync(f+".sha256","utf8").trim(),frozen.sha256);rule=loadRule(f,frozen.sha256,r.identity);assert.deepEqual(rule.calibration,g6.calibration);assert.equal(rule.identity.engineId,engine.Id);assert.deepEqual(rule.identity.owner,owner);assert.equal(rule.identity.sourceSha256,digest(g6.before));assert.equal(rule.identity.buildSha256,digest(g2.build));}
for(const point of g6.points){assert.ok(rule);assert.equal(point.ruleSha256,frozen.sha256);const A=point.blocks.filter(b=>b.arm==="A").flatMap(b=>b.samples.map(s=>s.ms)),B=point.blocks.filter(b=>b.arm==="B").flatMap(b=>b.samples.map(s=>s.ms));
 assert.equal(A.length,1000);assert.equal(B.length,1000);assert.deepEqual(gradePoint(rule,point.encoding,point.size,point.noise),point.window);assert.deepEqual(judge(rule,{encoding:point.encoding,size:point.size,A,B,window:point.window}),point.verdict);
 assert.deepEqual(read(`g6-attempt1/point-${point.history}-${point.encoding}-${point.size}.json`),point);
 if(!point.window.timingEligible)assert.ok(Object.values(point.verdict.metrics).every(m=>m.result==="UNJUDGED_WINDOW"));
}
if(g6.failure){assert.equal(firstFailure.length,1);assert.equal(firstFailure[0].error,g6.failure.error);assert.equal(ctl.failure,"G6 first failure");assert.equal(ctl.phases.find(p=>p.name==="g6").exit,1);}
else {assert.equal(firstFailure.length,0);assert.equal(g6.points.length,8);assert.equal(g6.calibration.length,4);assert.equal(ctl.failure,null);assert.ok([0,3].includes(ctl.phases.find(p=>p.name==="g6").exit));}
assert.match(g6.failure.error,/disk no longer covers remaining forecast above guard/);assert.equal(samples,500);assert.equal(firstB,null);assert.equal(frozen,null);assert.equal(g6.points.length,0);assert.equal(g6.calibration.length,0);
assert.ok(!fs.existsSync(path.join(raw,"g6-attempt1/AA-RULE-BEFORE-B.json")));assert.ok(lastBudget.freeBytes>5*1024**3);assert.ok(lastBudget.freeBytes<=5*1024**3+lastBudget.remainingForecastBytes);
const partial=read("partial-window.json"),n=read(partial.noiseFile);assert.equal(n.engineId,engine.Id);assert.equal(partial.completeAARound,false);
assert.deepEqual(partial.window,analyseSingleWindow({armId:n.engineId,preflight:true,regime:n.regime,config:noiseConfig,rounds:[{id:n.id,armId:n.engineId,burstPhase:"rt01-a0-10-fresh-closed-loop",p50Ms:null,noise:n.noise}]}));assert.equal(partial.window.timingEligible,false);
assert.deepEqual(partial.counterSources,n.host.map(s=>s.counterSources));assert.equal(partial.hostProbeErrors.length,0);for(const s of n.host){assert.equal(s.pressureLevel,null);for(const p of s.probes)assert.equal(p.error,null);}
const cleanup=read("cleanup.json");assert.deepEqual(cleanup.original,owner);for(const k of ["ownerAbsent","poolReservationAbsent","poolRetainedVolumeAbsent","containerAbsent","volumeAbsent"])assert.equal(cleanup[k],true,k);
for(const p of cleanup.phases)for(const s of ["stdout","stderr"])assert.equal(hash(path.join(raw,`${p.name}.${s}`)),p[`${s}Sha256`]);assert.ok(cleanup.phases.slice(0,2).every(p=>p.exit===0));
const config=JSON.parse(fs.readFileSync(path.join(process.env.HOME,".docker/config.json")));assert.equal(config.currentContext,"colima");
assert.equal(execFileSync("git",["diff","37ae44a9","--","packages","pnpm-lock.yaml"],{cwd:root,encoding:"utf8"}),"");
assert.equal(hash("/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-RT01/live3-run/RESULT.json"),"77e3700733780f96ab9b4b07840e6f82536107559a87184e506f98216dbdcbff");
// [EXP-RT01] Why: adopt only exact current source/build/engine observations and recomputed verdicts; incomplete resource-stopped timing never becomes no-regression PASS. Rejected: exit-zero adoption or relabeling the earlier FAILED receipt.
const result={schema:"rt01-live5/1",sealedAt:new Date().toISOString(),sourceHead:g2.head,productSource:"37ae44a9a1fa4a8ef153c5118ee9aed03be86a8b",G2:{result:"PASS",casePasses:197,routes:42,schedules:2,fixtures:3},
 G6:{result:"RESOURCE_FORECAST_STOP_TIMING_UNJUDGED",rawTimingOutcome:g6.timingOutcome,failure:g6.failure,samples,stages,calibrationContexts:g6.calibration.length,ruleSha256:frozen?.sha256??null,firstBAt:firstB?.at??null,ruleAt:frozen?.at??null,judgedFailures:g6.points.filter(p=>p.verdict.result==="FAIL").length,lastBudget,partialWindow:partial,
 points:g6.points.map(p=>({history:p.history,encoding:p.encoding,size:p.size,A:p.A,B:p.B,ratios:p.ratios,result:p.verdict.result,windowGrade:p.window.windowGrade,metrics:p.verdict.metrics})),
 calibration:rule?.contexts.map(c=>({encoding:c.encoding,size:c.size,windowGrade:c.window.windowGrade,metrics:c.metrics}))??[],limits:"Non-GREEN bars are unjudged. No G6 acceptance or repair of earlier FAILED receipts."},
 admissionFreeBytes:admit.freeBytes,engine:{id:engine.Id,image:engine.Image,configSha256:engine.Config.Labels["tx2.config-sha256"],memoryBytes:engine.HostConfig.Memory,nanoCpus:engine.HostConfig.NanoCpus},policyTests:21,runnerHashes:g6.runnerHashes,build:g2.build,counterSources:read("offline1/actual-host-samples.json").samples[0].counterSources,cleanup:{ownedResourcesAbsent:true,configuredContext:config.currentContext,trimVerified:true},pins:read("offline1/pins.json")};
fs.writeFileSync(path.join(raw,"RESULT.json"),JSON.stringify(result,null,2)+"\n");fs.copyFileSync(import.meta.filename,path.join(raw,"seal-source.mjs"));
const files=[];
async function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())await walk(p);else if(e.isFile()){const h=createHash("sha256");for await(const chunk of fs.createReadStream(p))h.update(chunk);files.push({path:path.relative(raw,p),bytes:fs.statSync(p).size,sha256:h.digest("hex")});}}}
await walk(raw);files.sort((a,b)=>a.path.localeCompare(b.path));
const manifest=files.map(f=>`${f.sha256}  ${f.path}\n`).join("");fs.writeFileSync(path.join(import.meta.dirname,"DURABLE-SHA256SUMS"),manifest);fs.writeFileSync(path.join(import.meta.dirname,"DURABLE-INDEX.json"),JSON.stringify({root:raw,files:files.length,bytes:files.reduce((n,f)=>n+f.bytes,0),manifestSha256:digest(manifest)},null,2)+"\n");
fs.copyFileSync(path.join(raw,"RESULT.json"),path.join(import.meta.dirname,"RESULT.json"));
for(const f of files){const h=createHash("sha256");for await(const chunk of fs.createReadStream(path.join(raw,f.path)))h.update(chunk);assert.equal(h.digest("hex"),f.sha256,f.path);}
console.log(JSON.stringify({G2:result.G2,G6:result.G6.result,points:result.G6.points.length,samples,files:files.length}));
