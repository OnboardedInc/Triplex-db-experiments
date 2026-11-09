// [CX-VQNODELAY-R5] Why: bind exact retained bytes and stable source before committing the scoped verdict.
// Rejected: committing bulky raw directories or treating checksum equality as engine acceptance.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const own='lab/verify/QNODELAY/round5',durable='/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VQNODELAY/round5';
const disk=fs.statfsSync(process.cwd());assert(disk.bavail*disk.bsize>=5*1024**3,'disk below admission floor');
const startedAt=new Date().toISOString(),sha=b=>createHash('sha256').update(b).digest('hex'),entries=[],skippedSymlinks=[];
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isSymbolicLink()){skippedSymlinks.push(p);continue;}if(e.isDirectory())walk(p);else if(e.isFile())entries.push({path:p,sha256:sha(fs.readFileSync(p))});}}
walk(durable);entries.sort((a,b)=>a.path.localeCompare(b.path));const known=new Map(entries.map(e=>[e.path,e.sha256]));
const result=JSON.parse(fs.readFileSync(path.join(durable,'attempt2/result.json')));
assert.equal(result.candidate,'9b1a9a59ad223fd0fb3e8ff0de4d0d15fed4dafc');
for(const s of result.sources)assert.equal(known.get(path.join(durable,'attempt1/source',s.path)),s.sha256,s.path);
assert(!fs.existsSync(path.join(durable,'attempt1/source/qualification/reviews/qa-planted-direct.mjs')));
const manifest=entries.map(e=>`${e.sha256}  ${e.path}`).join('\n')+'\n';
fs.writeFileSync(`${own}/DURABLE-SHA256SUMS`,manifest,{flag:'wx'});
const seal={classification:'retained-byte and source-identity manifest; no semantic or performance PASS',startedAt,endedAt:new Date().toISOString(),head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),candidate:result.candidate,durableFiles:entries.length,sourcePreimagesVerified:result.sources.length,skippedSymlinks,manifestSha256:sha(manifest),builderManifestPreviouslyVerified:result.checks.builderManifestFiles};
fs.writeFileSync(`${own}/seal-result.json`,JSON.stringify(seal,null,2)+'\n',{flag:'wx'});
const local=fs.readdirSync(own).filter(n=>n!=='SHA256SUMS'&&fs.statSync(path.join(own,n)).isFile()).sort().map(n=>`${sha(fs.readFileSync(path.join(own,n)))}  ${n}`);
local.push(`${sha(fs.readFileSync('lab/verify/QNODELAY/VERIFY-round5.md'))}  ../VERIFY-round5.md`);
fs.writeFileSync(`${own}/SHA256SUMS`,local.join('\n')+'\n',{flag:'wx'});
console.log(JSON.stringify(seal,null,2));
