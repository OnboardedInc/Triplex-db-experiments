import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
const root = "/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-RT01";
const out = path.join(root,"live3-run");
const hash = (p) => createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const manifestPath = path.join(import.meta.dirname,"DURABLE-SHA256SUMS");
for(const line of fs.readFileSync(manifestPath,"utf8").trim().split("\n")) {
  const [h,p] = line.split("  "); assert.equal(hash(path.join(root,p)),h,p);
}
assert.equal(hash(path.join(import.meta.dirname,"seal.mjs")),hash(path.join(out,"seal.mjs")));
const g6 = JSON.parse(fs.readFileSync(path.join(root,"round6/g6-attempt1/execution.json")));
for(const [p,h] of Object.entries(g6.runnerHashes))
  assert.equal(hash(path.resolve(import.meta.dirname,"../round6",p)),h,p);
for(const point of g6.points) for(const arm of ["A","B"]) {
  const s = point.scans[arm];
  const blocks = point.blocks.filter((b) => b.arm === arm);
  const stamp = arm === "B" ? Number(blocks.at(-1).after.metadata[0].stamp) : 0;
  for(const version of ["before","after"])
    assert.deepEqual(s.nativePlans[version].params,version === "before" ? [s.scope,150,s.scope,stamp] : [s.scope,150,stamp]);
}
// [EXP-RT01] Why: bind derived native counters to the exact scope/cut/stamp and executed helpers after sealing. Rejected: trusting nonempty plan output or a current helper that differs from the preserved executed preimage.
const verification = {at:new Date().toISOString(),result:"EVIDENCE_VERIFIED_NOT_G6_PASS",nativePlanBindings:16,
  g6RunnerHashes:g6.runnerHashes,executedSealSha256:hash(path.join(out,"seal.mjs")),
  initialManifestSha256:hash(manifestPath),unchangedGateResult:"G6_FAIL_FRESH_COMPACT_5_P99"};
assert.ok(!fs.existsSync(path.join(out,"VERIFICATION.json")));
fs.writeFileSync(path.join(out,"VERIFICATION.json"),JSON.stringify(verification,null,2)+"\n");
fs.copyFileSync(import.meta.filename,path.join(out,"verify.mjs"));
const files = [];
function walk(dir) { for(const e of fs.readdirSync(dir,{withFileTypes:true})) {const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else if(e.isFile())files.push({path:path.relative(root,p),bytes:fs.statSync(p).size,sha256:hash(p)});}}
walk(path.join(root,"round6"));walk(out);
const manifest = files.sort((a,b)=>a.path.localeCompare(b.path)).map((f)=>`${f.sha256}  ${f.path}\n`).join("");
fs.writeFileSync(manifestPath,manifest);
fs.writeFileSync(path.join(import.meta.dirname,"DURABLE-INDEX.json"),JSON.stringify({root,files:files.length,
  bytes:files.reduce((n,f)=>n+f.bytes,0),includesImmutableRound6:true,
  manifestSha256:createHash("sha256").update(manifest).digest("hex")},null,2)+"\n");
fs.copyFileSync(path.join(out,"VERIFICATION.json"),path.join(import.meta.dirname,"VERIFICATION.json"));
for(const f of files)assert.equal(hash(path.join(root,f.path)),f.sha256,f.path);
console.log(JSON.stringify(verification));
