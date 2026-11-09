import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {execFileSync} from "node:child_process";
const root=path.resolve(import.meta.dirname,"../../../..");
const durable="/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-RT01";
const raw=path.join(durable,"live4");
const read=p=>JSON.parse(fs.readFileSync(path.join(raw,p)));
const hash=p=>createHash("sha256").update(fs.readFileSync(p)).digest("hex");
assert.ok(!fs.existsSync(path.join(raw,"RESULT.json")));
const controller=read("live-attempt1/execution.json"),admission=read("admission1/decision.json");
assert.equal(controller.acquired,true);assert.equal(controller.ownedDuringAttempt,true);assert.equal(controller.ownerExistedBefore,false);
assert.equal(controller.failure,"G6 first failure");
assert.deepEqual(controller.phases.map(p=>[p.name,p.exit]),[["admission",0],["g2",0],["g6",1],["engine-end",0],["engine-log",0],["engine-down",0],["cleanup",0]]);
assert.equal(admission.reason,null);assert.equal(admission.up.exit,0);assert.ok(admission.freeBytes>13*1024**3);
const owner=read("owner-start.json"),engine=read("engine-start.json")[0],end=read("live-attempt1/engine-end.stdout")[0];
assert.equal(owner.holder,"CX-RT01");assert.equal(owner.slot,"s1");assert.equal(owner.container,engine.Name.slice(1));
assert.equal(engine.Id,end.Id);assert.equal(engine.Image,end.Image);
assert.equal(engine.Config.Labels["tx2.holder"],owner.holder);assert.equal(engine.HostConfig.Memory,3758096384);assert.equal(engine.HostConfig.NanoCpus,2000000000);
const prep=read("prep1/RESULT.json");
assert.equal(prep.tests,19);assert.equal(prep.exit,0);assert.deepEqual(prep.before,prep.after);
assert.equal(hash(path.join(raw,"prep1/tests.stdout")),prep.stdoutSha256);
assert.match(fs.readFileSync(path.join(raw,"prep1/tests.stdout"),"utf8"),/# pass 19\n/);
for(const [p,h]of Object.entries(prep.after))assert.equal(hash(path.join(root,"lab/experiments/EXP-RT01/round7",p)),h,p);
const g2=read("g2-attempt1/execution.json"),outcomes=read("g2-attempt1/outcomes.json");
assert.equal(g2.live.exit,0);assert.equal(g2.sourceUnchanged,true);assert.deepEqual(g2.before,g2.after);
assert.equal(g2.phases.length,6);assert.ok(g2.phases.every(p=>p.exit===0));
assert.equal(outcomes.diagnostic,false);assert.equal(outcomes.failure,null);assert.deepEqual(outcomes.failures,[]);
assert.equal(outcomes.grantsAcceptance,true);assert.deepEqual(outcomes.owner,owner);
for(const [p,h]of Object.entries(g2.after))assert.equal(hash(path.join(root,p)),h,p);
for(const [p,h]of Object.entries(g2.build))assert.equal(hash(path.join(root,p)),h,p);
const events=fs.readFileSync(path.join(raw,"g2-attempt1/progress.jsonl"),"utf8").trim().split("\n").map(JSON.parse);
const count=k=>events.filter(e=>e.kind===k).length;
assert.equal(count("case-pass"),197);assert.equal(count("route-pass"),42);assert.equal(count("schedule-pass"),2);assert.equal(count("determinism-pass"),1);
assert.equal(count("first-failure"),0);assert.equal(count("query-error"),0);assert.equal(count("diagnostic-failure"),0);
for(const encoding of ["a0","compact"]) {
  const r=read(`g2-attempt1/routes-${encoding}.json`);
  assert.equal(Object.keys(r.before).length,21);
  assert.deepEqual(Object.keys(r.before),Object.keys(r.after));
  for(const name of Object.keys(r.before)) {
    const before=structuredClone(r.before[name]),after=structuredClone(r.after[name]);
    if(name==="entityPage"||name==="queryAll-echo") {
      const key=name==="entityPage"?"snapshot":"basis";
      assert.equal(before[key].recordedPosition,r.first.position);assert.equal(after[key].recordedPosition,r.second.position);
      before[key].recordedPosition=after[key].recordedPosition;
    }
    assert.deepEqual(before,after,`${encoding}/${name}`);
    if(name!=="dependency")assert.ok(JSON.stringify(before).includes("before"));
  }
}
const fixtures=read("g2-attempt1/determinism.json");
assert.equal(fixtures.length,3);assert.deepEqual(fixtures[0],fixtures[1]);assert.deepEqual(fixtures[1],fixtures[2]);
const g6=read("g6-attempt1/execution.json");
assert.equal(g6.sourceUnchanged,true);assert.equal(g6.runnerUnchanged,true);assert.deepEqual(g6.before,g6.after);
assert.deepEqual(g6.startedFromG2Build,g2.build);assert.deepEqual(g6.owner,owner);
for(const [p,h]of Object.entries(g6.runnerHashes))assert.equal(hash(path.resolve(root,"lab/experiments/EXP-RT01/round7",p)),h,p);
assert.equal(g6.calibration.length,0);assert.equal(g6.points.length,0);
assert.equal(g6.failure.stage,"AA:a0:10:0");assert.equal(g6.failure.error,"Error: spawn EPERM");
assert.match(g6.failure.stack,/hostSample/);assert.match(g6.failure.stack,/noise\.ts:194:15/);
const trace=fs.readFileSync(path.join(raw,"g6-attempt1/events.jsonl"),"utf8").trim().split("\n").map(JSON.parse);
assert.equal(trace.filter(e=>e.kind==="sample").length,0);
assert.equal(trace.filter(e=>e.kind==="first-failure").length,1);
assert.ok(!trace.some(e=>e.kind==="rule-frozen"||e.kind==="history-count"||e.stage.startsWith("AB:")));
assert.ok(!fs.existsSync(path.join(raw,"g6-attempt1/AA-RULE-BEFORE-B.json")));
assert.equal(execFileSync("git",["diff","37ae44a9","--","packages","pnpm-lock.yaml"],{cwd:root,encoding:"utf8"}),"");
const cleanup=read("cleanup.json");assert.deepEqual(cleanup.original,owner);
for(const k of ["ownerAbsent","poolReservationAbsent","poolRetainedVolumeAbsent","containerAbsent","volumeAbsent"])assert.equal(cleanup[k],true,k);
for(const p of cleanup.phases)for(const stream of ["stdout","stderr"])assert.equal(hash(path.join(raw,`${p.name}.${stream}`)),p[`${stream}Sha256`]);
assert.ok(cleanup.phases.slice(0,2).every(p=>p.exit===0));
assert.match(fs.readFileSync(path.join(raw,"container-absent.stderr"),"utf8"),/no such object: tx2-xtdb-s1/i);
assert.match(fs.readFileSync(path.join(raw,"volume-absent.stderr"),"utf8"),/no such volume/i);
assert.match(fs.readFileSync(path.join(raw,"fstrim.stdout"),"utf8"),/344342528 bytes/);
const check=read("counter-check1/RESULT.json");
assert.equal(check.sourceSha256,hash(path.join(raw,"counter-check1/counter-check.mjs")));
assert.ok(Number.isFinite(check.host.pressureLevel)&&Number.isFinite(check.host.pageouts));
assert.equal(check.recoveryAdmission,"NOT_RERUN_DISK_FORECAST");assert.ok(check.freeBytes<check.requiredBytesExclusive);
assert.equal(check.configuredContext,"colima");assert.equal(check.ownerAbsent,true);
const pool=JSON.parse(fs.readFileSync(path.join(raw,"counter-check1/pool.json")));
assert.ok(!pool.reservations.some(r=>r.container===owner.container));assert.ok(!pool.retainedVolumes.some(r=>r.volume===owner.volume));
const oldResult=path.join(durable,"live3-run/RESULT.json");
assert.equal(hash(oldResult),"77e3700733780f96ab9b4b07840e6f82536107559a87184e506f98216dbdcbff");
assert.equal(JSON.parse(fs.readFileSync(oldResult)).G6.result,"FAIL");
// [EXP-RT01] Why: a recorder/program failure before samples is unjudged timing, not a failed measured bar; keep raw exit/FAIL labels and prove the distinction from content. Rejected: treating exit 1 as a performance regression or inventing an A/A rule from absent data.
const result={schema:"rt01-live4/1",sealedAt:new Date().toISOString(),sourceHead:g2.head,productSource:"37ae44a9a1fa4a8ef153c5118ee9aed03be86a8b",
  G2:{result:"PASS",casePasses:197,routes:42,schedules:2,fixtures:3},
  G6:{result:"SETUP_BLOCKED_TIMING_UNJUDGED",windowGrade:"UNGRADED_NO_COMPLETED_CALIBRATION",measuredPoints:0,aaRounds:0,samples:0,ruleWritten:false,judgedBarFailures:0,
    failure:g6.failure,rawProgramTimingOutcome:g6.timingOutcome,rawProgramExit:1,reason:"read-only top spawn denied by sandbox before first sample; not a computed M01 grade or judged bar failure"},
  admissionFreeBytes:admission.freeBytes,engine:{id:engine.Id,image:engine.Image,configSha256:engine.Config.Labels["tx2.config-sha256"],memoryBytes:engine.HostConfig.Memory,nanoCpus:engine.HostConfig.NanoCpus},
  policyTests:19,preparationSourceHashes:prep.after,G6RunnerHashes:g6.runnerHashes,build:g2.build,
  cleanup:{ownedResourcesAbsent:true,configuredContext:check.configuredContext,trimVerified:true},
  recovery:{attempted:false,reason:check.recoveryAdmission,freeBytes:check.freeBytes,requiredBytesExclusive:check.requiredBytesExclusive,counterPermissionCheck:"read-only hostSample works with approved exec_command require_escalated"},
  priorLive3:"FAIL_UNCHANGED",limits:"No A/A rule or timing point, no B sample, no 10k seed, no no-regression qualification; non-GREEN continuation only unit-tested."};
fs.writeFileSync(path.join(raw,"RESULT.json"),JSON.stringify(result,null,2)+"\n");
fs.copyFileSync(import.meta.filename,path.join(raw,"seal-source.mjs"));
const files=[];
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else if(e.isFile())files.push({path:path.relative(raw,p),bytes:fs.statSync(p).size,sha256:hash(p)});}}
walk(raw);
const manifest=files.sort((a,b)=>a.path.localeCompare(b.path)).map(f=>`${f.sha256}  ${f.path}\n`).join("");
fs.writeFileSync(path.join(import.meta.dirname,"DURABLE-SHA256SUMS"),manifest);
fs.writeFileSync(path.join(import.meta.dirname,"DURABLE-INDEX.json"),JSON.stringify({root:raw,files:files.length,bytes:files.reduce((n,f)=>n+f.bytes,0),manifestSha256:createHash("sha256").update(manifest).digest("hex")},null,2)+"\n");
fs.copyFileSync(path.join(raw,"RESULT.json"),path.join(import.meta.dirname,"RESULT.json"));
for(const f of files)assert.equal(hash(path.join(raw,f.path)),f.sha256,f.path);
console.log(JSON.stringify({G2:result.G2,G6:result.G6.result,recovery:result.recovery.reason,files:files.length}));
