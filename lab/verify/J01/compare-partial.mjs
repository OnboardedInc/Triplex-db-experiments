// [CX-VJ01] Why: retain equality results for the completed read frontier despite the later wrong-tag harness assertion. Rejected: declaring the entire failed attempt accepted.
import fs from 'node:fs';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
const file='lab/verify/J01/live-xtdb.json',bytes=fs.readFileSync(file),d=JSON.parse(bytes);assert.ok(d.endedAt);
const norm=(v,a)=>JSON.stringify(v).split(JSON.stringify(a.scope).slice(1,-1)).join('<scope>');
const keys=Object.keys(d.arms[0].reads).filter(k=>Object.hasOwn(d.arms[1].reads,k));
const out={input:file,sha256:createHash('sha256').update(bytes).digest('hex'),retainedFailures:d.failures,comparison:'Saved JSON snapshots; first harness emitted -0 as JSON 0. In-memory exact sign assertions passed separately. This is not a raw-bit proof.',surfaces:keys.map(k=>({surface:k,equal:norm(d.arms[0].reads[k],d.arms[0])===norm(d.arms[1].reads[k],d.arms[1])}))};
fs.writeFileSync('lab/verify/J01/partial-comparison.json',JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out,null,2));
