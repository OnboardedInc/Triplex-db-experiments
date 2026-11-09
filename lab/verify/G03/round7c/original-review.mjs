// [CX-VG03-56-R7C] Why: rerun the byte-identical original F3 reproduction in a fresh relocated evidence directory. Rejected: editing its historical assertions to manufacture a current pass.
import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
const original=new URL('../round7a/coordinator-review.mjs',import.meta.url),bytes=fs.readFileSync(original),old=execFileSync('git',['show','c65f7a82:lab/verify/G03/round7a/coordinator-review.mjs']);assert.deepEqual(bytes,old);
const out=process.argv[2];assert.ok(out);fs.mkdirSync(out,{recursive:true});assert.equal(fs.readdirSync(out).length,0);
const context=vm.createContext({Buffer,URL,console,process,setTimeout,clearTimeout,setImmediate});
const m=new vm.SourceTextModule(bytes.toString(),{context,identifier:original.href,importModuleDynamically:spec=>import(spec.startsWith('node:')?spec:new URL(spec,original).href),initializeImportMeta:meta=>{meta.url=original.href;meta.dirname=path.resolve(out)}});
await m.link(async spec=>{const values=await import(spec.startsWith('node:')?spec:new URL(spec,original).href);return new vm.SyntheticModule(Object.keys(values),function(){for(const [k,v]of Object.entries(values))this.setExport(k,v)},{context})});
let error;try{await m.evaluate()}catch(e){error=e}assert.ok(error);assert.equal(error.code,'ERR_ASSERTION');assert.equal(error.actual,1);assert.equal(error.expected,0);
const p=path.join(out,'coordinator-fixtures/stream-failure'),raws=fs.readdirSync(p).filter(n=>n.startsWith('raw-'));assert.equal(raws.length,1);
const record=JSON.parse(fs.readFileSync(path.join(p,raws[0],'terminal.json')));assert.equal(record.terminal.controlFailure.ok,false);assert.match(record.terminal.controlFailure.error,/FAULT-POINT-DR-CONTRADICTION/);assert.equal(record.terminal.driverExit,null);
const sha=b=>createHash('sha256').update(b).digest('hex');for(const [n,h]of Object.entries(record.capture))assert.equal(sha(fs.readFileSync(path.join(p,raws[0],n))),h);
assert.equal(Object.keys(record.capture).length,8);
console.log(JSON.stringify({originalSha256:sha(bytes),originalByteIdentical:true,expectedOriginalAssertionFails:true,error:error.message,rawDir:path.join(p,raws[0]),capturedFiles:8,allDigestsMatch:true,scope:'exact original VM reproduction; trusted lifecycle model; no Docker',qualification:false},null,2));
