// [CX-VP2Q-4-R10] Why: seal actual readbacks before archiving bulky owned evidence and publishing a verifiable manifest.
// Rejected: moving state without a byte inventory or converting a child's exit status directly into a verdict.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {spawnSync,execFileSync} from 'node:child_process';
const base='/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VP2Q-4/round10',root=process.cwd(),started=Date.now();
const sha=b=>createHash('sha256').update(b).digest('hex'),self=sha(fs.readFileSync(import.meta.filename));
const sealFile='lab/verify/P2Q/scripts/round10-seal.mjs',sealHash=sha(fs.readFileSync(sealFile));
const ownerFiles=fs.readdirSync('/Users/sam/projects/triplex-db-2/lab/locks/heavy').map(n=>`/Users/sam/projects/triplex-db-2/lab/locks/heavy/${n}/owner.json`).filter(f=>fs.existsSync(f)&&JSON.parse(fs.readFileSync(f)).pid===process.ppid&&JSON.parse(fs.readFileSync(f)).label==='CX-VP2Q-4-R10-seal');assert.equal(ownerFiles.length,1);const ownerFile=ownerFiles[0],owner=fs.readFileSync(ownerFile);
const child=spawnSync('node',[sealFile],{env:{...process.env,R10_HEAVY_PID:String(process.ppid)},stdio:'inherit'});assert.equal(child.status,0);
const summaryFile=path.join(base,'SUMMARY.json'),summary=JSON.parse(fs.readFileSync(summaryFile));assert(summary.started>=started&&summary.finished>=summary.started);assert.equal(summary.selfSha256,sealHash);assert.equal(summary.verdict,'FIX-FIRST');assert.equal(summary.fullByteComparisons,104);assert(summary.counterexamples.laundered.required>summary.counterexamples.laundered.observed);assert.deepEqual(summary.counterexamples.laundered.value,{rows:[]});assert.equal(summary.counterexamples.laundered.gateCalls,0);assert.equal(summary.counterexamples.laundered.maskCalls,0);
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):e.isFile()?[path.join(d,e.name)]:[]);
const migrations=[];
for(const name of ['state-round10','scratch-round10']){
 const original=path.join(root,'lab/verify/P2Q',name),destination=path.join(base,name);assert(!fs.lstatSync(original).isSymbolicLink());assert(!fs.existsSync(destination));
 const inventory=walk(original).map(file=>({file:path.relative(original,file),sha256:sha(fs.readFileSync(file)),bytes:fs.statSync(file).size}));
 fs.renameSync(original,destination);fs.symlinkSync(destination,original,'dir');
 for(const item of inventory){assert.equal(sha(fs.readFileSync(path.join(destination,item.file))),item.sha256);assert.equal(sha(fs.readFileSync(path.join(original,item.file))),item.sha256);}
 migrations.push({original,destination,inventory});
}
const processLines=execFileSync('ps',['-axo','pid,ppid,command'],{encoding:'utf8'}).split('\n');
const fixtures=processLines.filter(line=>line.includes(root)&&(line.includes('packages/qlever/test/fixtures/lock-holder.ts')||line.includes('lab/verify/P2Q/scripts/lock-holder.ts')));assert.deepEqual(fixtures,[]);
assert.equal(sha(fs.readFileSync(import.meta.filename)),self);assert.equal(sha(fs.readFileSync(sealFile)),sealHash);assert.equal(sha(fs.readFileSync(ownerFile)),sha(owner));
const finish={started,finished:Date.now(),selfSha256:self,sealSha256:sealHash,summarySha256:sha(fs.readFileSync(summaryFile)),heavySlot:{file:ownerFile,owner:JSON.parse(owner),sha256:sha(owner)},migrations,fixtures,engineLifecycle:'none',processCleanup:'none',q91:'No timing acceptance',head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()};
fs.writeFileSync(path.join(base,'FINISH.json'),JSON.stringify(finish,null,2)+'\n',{flag:'wx'});
const manifest=walk(base).filter(f=>!f.endsWith('/SHA256SUMS')).sort().map(file=>({file:path.relative(base,file),bytes:fs.statSync(file).size,sha256:sha(fs.readFileSync(file))}));
const sums=manifest.map(r=>`${r.sha256}  ${r.file}`).join('\n')+'\n';fs.writeFileSync(path.join(base,'SHA256SUMS'),sums,{flag:'wx'});
const repo='lab/verify/P2Q/evidence-round10';fs.mkdirSync(repo,{recursive:true});fs.writeFileSync(path.join(repo,'SHA256SUMS'),sums,{flag:'wx'});
const index=`# Round-10 evidence\n\nDurable root: \`${base}/\`. [SHA256SUMS](SHA256SUMS) binds ${manifest.length} files, ${manifest.reduce((n,r)=>n+r.bytes,0)} bytes. Paths are relative to that root.\n\n- SUMMARY.json: independent content/source/slot readback, 104 full-byte comparisons, future refusals, real log retirement witnesses and counterexamples.\n- FINISH.json: fresh seal, exact source/runner/slot binding and byte-checked migration of owned ignored state and scratch copies.\n- UUID directories: immutable command/result/case/receipt attempts, including the initial invalid-scope fixture failure.\n- scratch-round10/: exact original and mutated source/tests/configs; dependency symlinks retain their original targets.\n- state-round10/: actual owned fixture states and log bytes; original receipt paths are preserved by symlinks in the worktree.\n\nRaw outputs and bulky state stay outside git. Expected mutation rejections and counterexample tests are not product acceptance. QLever timing is DIAGNOSTIC. No engine lifecycle, main merge, push or publication.\n`;
fs.writeFileSync(path.join(repo,'INDEX.md'),index,{flag:'wx'});
assert(fs.statSync(path.join(repo,'SHA256SUMS')).size<1000000);console.log(JSON.stringify({files:manifest.length,bytes:manifest.reduce((n,r)=>n+r.bytes,0),manifestSha256:sha(Buffer.from(sums)),summarySha256:finish.summarySha256}));
