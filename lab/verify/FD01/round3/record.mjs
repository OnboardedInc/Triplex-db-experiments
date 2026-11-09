import './disk-guard.mjs';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
// [CX-VFD01-R3] Why: acceptance must follow actual specific outcomes and exact target bytes.
// Rejected: accepting a generic nonzero probe exit or treating the builder's G0 as reviewer execution.
const local=import.meta.dirname;
const {base,subject}=JSON.parse(fs.readFileSync(local+'/subject.json'));
const read=p=>JSON.parse(fs.readFileSync(p));
const sha=b=>createHash('sha256').update(b).digest('hex');
const source=read(base+'/source.json');assert.equal(source.head,'731e10e4075715c65c10f2ce720de2d3dcee9b1a');
for(const [p,h]of Object.entries(source.files)){
  assert.equal(sha(fs.readFileSync(subject+'/'+p)),h,p);
  assert.equal(sha(execFileSync('git',['show',source.head+':'+p])),h,p);
}
const baseline=read(base+'/baseline.json');assert.equal(baseline.steps.length,2);for(const s of baseline.steps)assert.equal(s.status,0);
const host=read(base+'/baseline-host.json');assert.equal(host.numPassedTests,14);assert.equal(host.numFailedTests,0);assert.equal(host.success,true);
assert.match(fs.readFileSync(base+'/baseline-bench.log','utf8'),/# tests 11\s+# suites 0\s+# pass 11\s+# fail 0/);
const crashes=read(base+'/baseline-crashes.json');assert.equal(crashes.length,900);
const counts={};for(const c of crashes){assert.equal(c.exit,77);counts[c.arm]=(counts[c.arm]??0)+1;}
assert.deepEqual(counts,{'keyed-atomic':500,'keyed-split':100,'unkeyed-split':300});
for(const c of crashes.filter(c=>c.arm==='keyed-split')){assert.equal(c.point,'after-commit');assert.equal(c.beforeReplay.checkpoint,null);assert.equal(c.beforeReplay.effects.length,2);assert.equal(c.beforeReplay.affected.length,2);}
const probes=read(base+'/probes.json');assert.equal(probes.sourceUnchanged,true);assert.equal(probes.atomic.length,25);
for(const mode of ['two-connections','checkpoint-first-split','checkpoint-deferred'])assert.ok(probes.atomic.some(r=>r.mode===mode&&r.error));
assert.equal(probes.crossProcess.lagMs,Number(BigInt(probes.crossProcess.known.known.atNs)-BigInt(probes.crossProcess.published.publication.atNs))/1e6);
assert.ok(probes.crossProcess.lagMs>=350);assert.ok(probes.worker.lagMs>=350);assert.match(probes.worker.clonedClockError,/Unbound feed clock/);
assert.equal(probes.checks.length,10);for(const c of probes.checks){assert.equal(c.rejected,true);assert.ok(c.error);}
assert.deepEqual(probes.boundary.actual,[true,true,false]);
for(const c of probes.consumers){const bad=['ACK-observation','different-position','forged-clock'].includes(c.mode);assert.equal(c.checkpoint,bad?0:1);assert.equal(c.lags.length,bad?0:1);}
const original=execFileSync('git',['show','0fcaa911:lab/verify/FD01/round2/cross-process.mjs']);
const unchanged=fs.readFileSync(local+'/cross-process.mjs');assert.equal(sha(unchanged),sha(original));
assert.equal(sha(fs.readFileSync(local+'/atomic-child.mjs')),sha(execFileSync('git',['show','0fcaa911:lab/verify/FD01/round2/atomic-child.mjs'])));
const errorLog=fs.readFileSync(local+'/unchanged-cross.log','utf8');assert.match(errorLog,/Error: Publication clock origin mismatch/);assert.match(errorLog,/at publicationLagMs .*\/subject\/packages\/core\/src\/feed\/index.ts/);assert.doesNotMatch(errorLog,/ERR_MODULE_NOT_FOUND|host-free-below/);
const root=path.resolve(local,'../../../..');assert.equal(execFileSync('git',['diff','0fcaa911','--name-only','--','lab/acceptance','packages','lab/bench','lab/bin','pnpm-lock.yaml'],{cwd:root,encoding:'utf8'}).trim(),'');
fs.mkdirSync(base+'/review',{recursive:true});
for(const f of fs.readdirSync(local).filter(f=>/\.(mjs|json|log)$/.test(f)&&!f.startsWith('record')&&f!=='manifest-check.json'))fs.copyFileSync(local+'/'+f,base+'/review/'+f);
fs.copyFileSync(local+'/record.mjs',base+'/review/record.mjs');
fs.copyFileSync(local+'/../VERIFY-round3.md',base+'/review/VERIFY-round3.md');
const receipt={review:'CX-VFD01-round3',reviewedHead:source.head,verdict:'ACCEPT-OFFLINE',generatedAt:new Date().toISOString(),base,engines:false,slot:null,
  baseline:{host:14,bench:11,crashObservations:900,crashArms:counts},independentAtomicStops:25,
  crossProcess:{boundLagMs:probes.crossProcess.lagMs,legacyRelativeLagMs:probes.crossProcess.legacyRelativeLagMs},workerLagMs:probes.worker.lagMs,
  unchangedR2Probe:{sha256:sha(unchanged),expectedExit:1,specificError:'Publication clock origin mismatch'},
  sourceUnchanged:true,acceptanceUnchanged:true,boundary:[true,true,false],
  scope:'Trusted producer must capture at native publication; no real source observer, machine reboot, live workload or package installation qualified.'};
fs.writeFileSync(base+'/review/receipt.json',JSON.stringify(receipt,null,2));
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(d+'/'+e.name):e.isFile()?[d+'/'+e.name]:[]);
fs.writeFileSync(local+'/SHA256SUMS-round3',walk(base).sort().map(p=>sha(fs.readFileSync(p))+'  '+path.relative(base,p)).join('\n')+'\n');
fs.writeFileSync(local+'/receipt.json',JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt,null,2));
