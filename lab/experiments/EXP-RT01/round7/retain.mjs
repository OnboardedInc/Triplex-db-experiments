import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
const durable="/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-RT01";
const raw=path.join(durable,"round7");
const attempt=process.argv[2]??"offline4";
assert.match(attempt,/^offline[1-9][0-9]*$/);
const hash=p=>createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const execution=JSON.parse(fs.readFileSync(path.join(raw,attempt,"RESULT.json")));
assert.equal(execution.tests,17);assert.ok(execution.phases.every(p=>p.exit===0));
assert.deepEqual(execution.before,execution.after);
const testOutput=fs.readFileSync(path.join(raw,attempt,"tests.stdout"),"utf8");
assert.match(testOutput,/# tests 17\n/);assert.match(testOutput,/# pass 17\n/);assert.match(testOutput,/# fail 0\n/);
for(const [p,h] of Object.entries(execution.after))assert.equal(hash(path.join(import.meta.dirname,p)),h,p);
for(const p of execution.phases)for(const stream of ["stdout","stderr"])assert.equal(hash(path.join(raw,attempt,`${p.name}.${stream}`)),p[`${stream}Sha256`]);
const d=JSON.parse(fs.readFileSync(path.join(raw,attempt,"diagnosis.stdout")));
assert.equal(d.failedReceiptPreserved.stage,"AB:0:compact:5");
assert.equal(d.arms.A.decomposedWarmCommits.length,148);assert.equal(d.arms.B.decomposedWarmCommits.length,148);
for(const [p,h] of Object.entries(d.evidence))assert.equal(hash(path.join(durable,p)),h,p);
const old=JSON.parse(fs.readFileSync(path.join(durable,"live3-run/RESULT.json")));
assert.equal(old.G6.result,"FAIL");
const result={schema:"rt01-round7-closure/1",at:new Date().toISOString(),result:execution.result,
  offlineAttempt:attempt,tests:17,phases:execution.phases.length,sourceSnapshotSha256:createHash("sha256").update(JSON.stringify(execution.after)).digest("hex"),
  sourceHead:execution.head,diagnosisSha256:hash(path.join(raw,attempt,"diagnosis.stdout")),
  priorLiveResult:"FAIL_UNCHANGED",priorLiveResultSha256:hash(path.join(durable,"live3-run/RESULT.json")),
  liveRun:false,limits:"Prepared G6 controller/recorders not executed live. Historical native baseline guard plan absent; no causal performance fix claimed."};
assert.ok(!fs.existsSync(path.join(raw,"OFFLINE-RESULT.json")));
fs.writeFileSync(path.join(raw,"OFFLINE-RESULT.json"),JSON.stringify(result,null,2)+"\n");
fs.copyFileSync(import.meta.filename,path.join(raw,"retention-source.mjs"));
// [EXP-RT01] Why: seal only closed outputs, verify their content and exact source/evidence binding, and retain earlier failures. Rejected: exit-zero adoption, rewriting live3 FAIL or hiding offline1's diagnostic error.
const files=[];
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else if(e.isFile())files.push({path:path.relative(raw,p),bytes:fs.statSync(p).size,sha256:hash(p)});}}
walk(raw);
const manifest=files.sort((a,b)=>a.path.localeCompare(b.path)).map(f=>`${f.sha256}  ${f.path}\n`).join("");
fs.writeFileSync(path.join(import.meta.dirname,"DURABLE-SHA256SUMS"),manifest);
fs.writeFileSync(path.join(import.meta.dirname,"DURABLE-INDEX.json"),JSON.stringify({root:raw,files:files.length,bytes:files.reduce((n,f)=>n+f.bytes,0),manifestSha256:createHash("sha256").update(manifest).digest("hex")},null,2)+"\n");
fs.copyFileSync(path.join(raw,"OFFLINE-RESULT.json"),path.join(import.meta.dirname,"RESULT.json"));
for(const f of files)assert.equal(hash(path.join(raw,f.path)),f.sha256,f.path);
console.log(JSON.stringify(result));
