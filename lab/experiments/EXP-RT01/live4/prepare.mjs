import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {spawnSync,execFileSync} from "node:child_process";
const root=path.resolve(import.meta.dirname,"../../../..");
const out="/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-RT01/live4/prep1";
assert.ok(!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});
const hash=p=>createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const files=fs.readdirSync(path.join(root,"lab/experiments/EXP-RT01/round7"),{recursive:true}).filter(p=>/\.(mjs|ts|json)$/.test(p)&&!p.endsWith("RESULT.json")&&!p.startsWith("DURABLE-"));
const snapshot=()=>Object.fromEntries(files.map(p=>[p,hash(path.join(root,"lab/experiments/EXP-RT01/round7",p))]));
const before=snapshot(),started=new Date().toISOString();
const free=Number(execFileSync("df",["-k",root],{encoding:"utf8"}).trim().split("\n").at(-1).trim().split(/\s+/)[3])*1024;
assert.ok(free>5*1024**3);
const r=spawnSync(process.execPath,["--experimental-strip-types","--test","lab/experiments/EXP-RT01/round7/rule.test.mjs"],{cwd:root,encoding:"utf8",timeout:120000});
for(const stream of ["stdout","stderr"])fs.writeFileSync(path.join(out,"tests."+stream),r[stream]??"");
const after=snapshot();assert.deepEqual(before,after);assert.equal(r.status,0,r.stderr);
assert.match(r.stdout,/# tests 19\n/);assert.match(r.stdout,/# pass 19\n/);
for(const p of files){const target=path.join(out,"sources",p);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(root,"lab/experiments/EXP-RT01/round7",p),target);}
// [EXP-RT01] Why: prove the dispatch's continuation policy before any observation can affect the frozen live rule. Rejected: changing grading after seeing B or reusing the old FAIL receipt.
const result={started,ended:new Date().toISOString(),head:execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim(),tests:19,exit:r.status,freeBytes:free,before,after,stdoutSha256:hash(path.join(out,"tests.stdout")),stderrSha256:hash(path.join(out,"tests.stderr")),scope:"offline continuation-rule tests only"};
fs.copyFileSync(import.meta.filename,path.join(out,"prepare.mjs"));
fs.writeFileSync(path.join(out,"RESULT.json"),JSON.stringify(result,null,2)+"\n");
console.log(JSON.stringify({tests:result.tests,exit:result.exit,out}));
