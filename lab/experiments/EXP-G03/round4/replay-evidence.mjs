// [EXP-G03] Why: retain and re-judge real fixture output after removing its temporary protected clone.
// Rejected: a success receipt whose referenced objects disappear during cleanup.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {sha256} from '../../../bin/lib.mjs';import {caseResultVerdict} from '../../../bin/claim.mjs';
for(const kind of ['claim','integrity']){
const bundle=JSON.parse(fs.readFileSync(path.join(process.argv[2]??import.meta.dirname,kind+'-positive.json'))),r=bundle.result;
const bytes=new Map(Object.entries(bundle.objects).map(([h,b])=>[h,Buffer.from(b,'base64')]));
for(const [h,b]of bytes)assert.equal(sha256(b),h);
const store={get:h=>bytes.has(h)?{ok:true,bytes:bytes.get(h)}:{ok:false}};
assert.equal(r.run.core.verdict,'QUALIFIED');assert.equal(r.verdict,'DIAGNOSTIC');assert.equal(r.offlineVerdict,'DIAGNOSTIC');
assert.deepEqual(r.reasons.map(x=>x.code),['GATE-NOT-RUN','RUN-NOT-ON-GATE']);assert.equal(r.run.cases.length,64);
for(const c of r.run.cases){const rec=JSON.parse(store.get(c.recordSha256).bytes);assert.equal(rec.schema,'case-result/2');assert.equal(caseResultVerdict(rec,store),'PASS');assert.equal(c.configApplied,false)}
assert.deepEqual(r.run.isolation.resourcesRemaining,[]);
const proofs=r.run.isolation.records.filter(x=>x.removed);assert.ok(proofs.length>0);assert.ok(proofs.every(p=>p.cgroupGone===true));
console.log(JSON.stringify({kind,objects:bytes.size,cases:r.run.cases.length,killProofs:proofs.length,offlineVerdict:r.offlineVerdict,evaluatorCommit:bundle.request.evaluatorCommit,authorityCommit:bundle.request.authority}));

}
