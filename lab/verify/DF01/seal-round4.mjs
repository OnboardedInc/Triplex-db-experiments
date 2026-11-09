import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

// [CX-VDF01-R4] Why: retain an initial indexing race without overwriting its evidence or changing any tested bytes.
// Rejected: relabeling mismatched checksums as passing, or rerunning semantic tests whose sources/results did not change.
const review=import.meta.dirname,root=path.resolve(review,'../../..'),round=path.join(review,'round4');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const manifest=fs.readFileSync(path.join(round,'SHA256SUMS'),'utf8');
fs.writeFileSync(path.join(round,'SHA256SUMS-initial'),manifest,{flag:'wx'});
const mismatch=manifest.trim().split('\n').flatMap(line=>{
 const expected=line.slice(0,64),file=line.slice(66),actual=sha(fs.readFileSync(path.join(root,file)));
 return expected===actual?[]:[{file,expected,actual}];
});
assert.deepEqual(mismatch.map(m=>m.file).sort(),['lab/verify/DF01/index-round4.mjs','lab/verify/DF01/round4/index.log']);
const initial=fs.readFileSync(path.join(review,'index-round4.mjs'),'utf8').replace("&&!file.endsWith('/index.log')",'');
assert.equal(sha(initial),mismatch.find(m=>m.file.endsWith('/index-round4.mjs')).expected);
fs.writeFileSync(path.join(round,'index-initial.mjs'),initial,{flag:'wx'});
fs.writeFileSync(path.join(round,'checksum-initial.json'),JSON.stringify({kind:'initial-manifest-failure',mismatches:mismatch,testedSourceOrOutputMismatch:false,initialIndexerSha256:sha(initial)},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({mismatches:mismatch,testedSourceOrOutputMismatch:false}));
