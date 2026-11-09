import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {spawnSync,execFileSync} from "node:child_process";
const root=path.resolve(import.meta.dirname,"../../../..");
const attempt=process.argv[2]??"offline2";
assert.match(attempt,/^offline[1-9][0-9]*$/);
const out="/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-RT01/round7/"+attempt;
assert.ok(!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});
const hash=p=>createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const sourceFiles=fs.readdirSync(import.meta.dirname,{recursive:true}).filter(p=>fs.statSync(path.join(import.meta.dirname,p)).isFile());
const snapshot=()=>Object.fromEntries(sourceFiles.sort().map(p=>[p,hash(path.join(import.meta.dirname,p))]));
const before=snapshot();
const provenance=JSON.parse(fs.readFileSync(path.join(import.meta.dirname,"M01-SOURCES.json")));
for(const p of provenance.sources) {
  assert.equal(hash(path.join(import.meta.dirname,p.copy)),p.sha256);
  const original=execFileSync("git",["show",provenance.commit+":"+p.path],{cwd:root});
  assert.deepEqual(original,fs.readFileSync(path.join(import.meta.dirname,p.copy)));
}
const phases=[];
const run=(name,args)=>{
  const started=new Date().toISOString();
  const r=spawnSync(process.execPath,args,{cwd:root,encoding:"utf8",timeout:120000,maxBuffer:32*1024**2});
  for(const stream of ["stdout","stderr"])fs.writeFileSync(path.join(out,name+"."+stream),r[stream]??"");
  phases.push({name,args,started,ended:new Date().toISOString(),exit:r.status,error:r.error?.message??null,
    stdoutSha256:hash(path.join(out,name+".stdout")),stderrSha256:hash(path.join(out,name+".stderr"))});
  assert.equal(r.status,0,name+": "+r.stderr);
  return r.stdout;
};
run("tests",["--experimental-strip-types","--test",path.join(import.meta.dirname,"rule.test.mjs")]);
const diagnosis=JSON.parse(run("diagnosis",[path.join(import.meta.dirname,"diagnose.mjs")]));
assert.equal(diagnosis.arms.A.statementCount,5);assert.equal(diagnosis.arms.B.statementCount,5);
for(const name of sourceFiles.filter(p=>p.endsWith(".mjs")))run("syntax-"+name.replaceAll("/","-"),["--check",path.join(import.meta.dirname,name)]);
const after=snapshot();assert.deepEqual(after,before);
const r={schema:"rt01-round7-offline/1",at:new Date().toISOString(),head:execFileSync("git",["rev-parse","HEAD"],{cwd:root,encoding:"utf8"}).trim(),before,after,
  phases,tests:17,result:"OFFLINE_RULE_TESTS_PASS_LIVE_NOT_RUN",diagnosisEvidence:diagnosis.evidence,
  oldLiveReceipt:"FAILED_UNCHANGED",productEdits:false,scope:"rule statistics, bound retained compact emission/native-plan analysis and syntax only; no engine/probe/G2/G6 run"};
fs.writeFileSync(path.join(out,"RESULT.json"),JSON.stringify(r,null,2)+"\n");
fs.mkdirSync(path.join(out,"sources"));
for(const p of sourceFiles) {const target=path.join(out,"sources",p);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(import.meta.dirname,p),target);}
console.log(JSON.stringify({result:r.result,tests:r.tests,phases:phases.length,out}));
