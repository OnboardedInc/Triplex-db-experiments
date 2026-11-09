import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
// [CX-VFD01-R2] Why: bind the narrow verdict to measured content and explicitly retain incomplete package work.
// Rejected: treating a nonzero harness exit, clock label, or old builder receipt as a successful gate.
const local=import.meta.dirname;
const {base,subject}=JSON.parse(fs.readFileSync(local+'/subject.json'));
const read=(p)=>JSON.parse(fs.readFileSync(p));
const sha=(b)=>createHash('sha256').update(b).digest('hex');
const source=read(base+'/source.json');
assert.equal(source.head,'b60cce1e5acd3f9bf3a3ae4f697271867692eac2');
for(const [p,h] of Object.entries(source.files)){
  assert.equal(sha(fs.readFileSync(subject+'/'+p)),h,p);
  assert.equal(sha(execFileSync('git',['show',source.head+':'+p])),h,p);
}
const baseline=read(local+'/baseline.json');assert.equal(baseline.success,true);assert.equal(baseline.numPassedTests,13);assert.equal(baseline.numFailedTests,0);
const probes=read(base+'/probes.json');assert.equal(probes.sourceUnchanged,true);
assert.equal(probes.atomic.filter(r=>r.exit===77).length,25);
for(const mode of ['two-connections','checkpoint-first-split','checkpoint-deferred'])assert.ok(probes.atomic.some(r=>r.mode===mode&&r.exit===77&&r.rejected));
for(const mode of ['atomic','checkpoint-first-atomic'])assert.equal(probes.atomic.filter(r=>r.mode===mode&&r.rejected).length,0);
const cross=read(base+'/cross-process.json');
const trueLag=Number(BigInt(cross.completed.hostNs)-BigInt(cross.published.hostNs))/1e6;
assert.equal(cross.commonHostClockLagMs,trueLag);assert.ok(trueLag>350);assert.ok(cross.reportedLagMs<250);assert.ok(cross.reportedLagMs>=0);
const tarRoot='/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-FD01/round2-pack/triplex-pack-rhW0cq/tarballs';
const peers=[];
for(const f of fs.readdirSync(tarRoot).filter(f=>f.endsWith('.tgz'))){
  const bytes=execFileSync('tar',['-xOf',tarRoot+'/'+f,'package/package.json']);const p=JSON.parse(bytes);
  peers.push({name:p.name,version:p.version,effectPeer:p.peerDependencies.effect,tarball:tarRoot+'/'+f,tarballSha256:sha(fs.readFileSync(tarRoot+'/'+f)),manifestSha256:sha(bytes)});
  assert.equal(p.peerDependencies.effect,'4.0.3');
}
assert.equal(peers.length,13);
const original='/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-FD01/round2-pack/triplex-pack-rhW0cq/npm-cache/_logs/2026-11-09T05_39_09_616Z-debug-0.log';
assert.equal(read(path.dirname(path.dirname(path.dirname(original)))+'/consumer/package.json').dependencies.effect,'4.0.3');
assert.equal(read(base+'/package-probe/missing/package.json').dependencies.effect,'4.0.3');
const log=fs.readFileSync(original,'utf8');assert.match(log,/effect cache-miss/);assert.match(log,/effect@undefined/);
assert.match(fs.readFileSync(base+'/package-probe/missing-effect.log','utf8'),/effect@undefined/);
assert.match(fs.readFileSync(base+'/package-probe/pack-ulidx.log','utf8'),/simple-git-hooks/);
const root=path.resolve(local,'../../../..');
assert.equal(execFileSync('git',['diff','fd8f670c','--name-only','--','lab/acceptance'],{cwd:root,encoding:'utf8'}).trim(),'');
fs.mkdirSync(base+'/review',{recursive:true});
for(const f of fs.readdirSync(local).filter(f=>/\.(mjs|json|log)$/.test(f)))fs.copyFileSync(local+'/'+f,base+'/review/'+f);
fs.copyFileSync(local+'/../VERIFY-round2.md',base+'/review/VERIFY-round2.md');
fs.copyFileSync(original,base+'/review/builder-package-debug.log');
fs.writeFileSync(base+'/review/peer-manifests.json',JSON.stringify(peers,null,2));
const receipt={review:'CX-VFD01-round2',reviewedHead:source.head,generatedAt:new Date().toISOString(),base,engines:false,slot:null,
  verdict:'FIX-FIRST',baseline:{passed:13,failed:0,start:baseline.startTime},atomicStops:25,lockRefusals:1,
  clock:{reportedLagMs:cross.reportedLagMs,commonHostClockLagMs:trueLag},
  peers:{tarballs:13,effectVersion:'4.0.3',consumerVersion:'4.0.3',missingMetadataReproduced:true,successfulInstallVerified:false},
  sourceUnchanged:true,acceptanceUnchanged:true,
  limitations:['Source observer not integrated','Cross-process clocks share a label but not an origin','Offline strict install positive control stopped at reviewer npm prepare failure; corrected runner unexecuted after disk limit','Start-time guard added after runs; final clock wrapper admission below disk threshold is disclosed in report']};
fs.writeFileSync(base+'/review/receipt.json',JSON.stringify(receipt,null,2));
const walk=(d)=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(d+'/'+e.name):e.isFile()?[d+'/'+e.name]:[]);
fs.writeFileSync(local+'/SHA256SUMS-round2',walk(base).sort().map(p=>sha(fs.readFileSync(p))+'  '+path.relative(base,p)).join('\n')+'\n');
fs.writeFileSync(local+'/receipt.json',JSON.stringify(receipt,null,2));
console.log(JSON.stringify(receipt,null,2));
