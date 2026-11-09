import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
// [EXP-DA01] Why: verify every retained byte after all producers close, then include the validation observation in a second stable index. Rejected: reporting file counts without checking hashes or indexing the active generation log.
const dir=import.meta.dirname;
const generate=()=>execFileSync(process.execPath,[path.join(dir,'manifest.mjs')],{encoding:'utf8'});
const verify=()=>{const index=JSON.parse(fs.readFileSync(path.join(dir,'FILES.json')));assert(index.files.length>0);for(const f of index.files){assert(!path.isAbsolute(f.path)&&!f.path.split('/').includes('..'));const bytes=fs.readFileSync(path.join(dir,f.path));assert.equal(bytes.length,f.bytes);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),f.sha256);}return index;};
generate();const first=verify();fs.writeFileSync(path.join(dir,'manifest-validation.json'),JSON.stringify({at:new Date().toISOString(),verifiedFilesBeforeValidation:first.files.length,verifiedBytesBeforeValidation:first.files.reduce((n,f)=>n+f.bytes,0),hashMismatches:0,missingFiles:0},null,2)+'\n');generate();const final=verify();assert.equal(final.files.length,first.files.length+1);console.log(JSON.stringify({validated:true,files:final.files.length,bytes:final.files.reduce((n,f)=>n+f.bytes,0)}));
