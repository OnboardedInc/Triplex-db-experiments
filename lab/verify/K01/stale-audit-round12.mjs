// [EXP-K01-VK01-R12] Why: try the actual retained stale manifests against current refusal boundaries without opening an endpoint. Rejected: treating a documentation instruction to regenerate as an executed refusal.
import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {assertSeedInputsCurrent} from '../../bench/lib/bulk.ts';
import {admitG0} from '../../bench/lib/g0.ts';
import {expectedN01} from '../../bench/lib/g0-xtdb.ts';
const out='lab/verify/K01/evidence/review-round12/stale-refusals.json';
if(fs.existsSync(out))throw Error('preserve prior receipt');
const inventory=JSON.parse(fs.readFileSync('lab/verify/K01/evidence/review-round12/source-and-stale-inventory.json','utf8'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const results=[];
for(const item of inventory.xtdbRecords){
 const bytes=fs.readFileSync(item.path);assert.equal(sha(bytes),item.sha256);const m=JSON.parse(bytes);
 let sourceRefusal,expectationRefusal,expected,admissionRefusal;
 try{assertSeedInputsCurrent(m,process.cwd());}catch(e){sourceRefusal=e.message;}
 try{expected=expectedN01(m);}catch(e){expectationRefusal=e.message;}
 let reads=0;try{await admitG0({count(){reads++;throw Error("no engine");}},m.g0,expected);}catch(e){admissionRefusal=e.message;}
 assert.equal(reads,0);assert.match(admissionRefusal,/pin binding differs/);
 assert.match(sourceRefusal,/stale seed generator/);
 assert.equal(sha(fs.readFileSync(item.path)),item.sha256);
 results.push({...item,sourceRefusal,expectationRefusal,expected,admissionRefusal,reads,g0PinPresent:!!m.g0,admitted:false});
}
assert.equal(results.length,3);
fs.writeFileSync(out,JSON.stringify({at:new Date().toISOString(),sourceSha256:sha(fs.readFileSync(import.meta.filename)),results},null,2)+'\n');
process.stdout.write('3 actual historical manifests refused by source-hash and actual admission checks. No engine reads.\n');
