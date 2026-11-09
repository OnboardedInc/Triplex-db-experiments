// [CX-VG03-7D] Why: exercise the exact pipe handler with independently chosen wire bytes and chunk boundaries. Rejected: a successful mock implementation standing in for Box.execControl.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {PassThrough} from 'node:stream';
import {createHash} from 'node:crypto';
import {trustedTerminal} from '../../../bin/ns-run.mjs';
const sourceUrl=new URL('../../../bin/box.mjs',import.meta.url),source=fs.readFileSync(sourceUrl,'utf8');
const sha=b=>createHash('sha256').update(b).digest('hex');
const observations=[];
async function run(name,chunks,{error=null,rows=[],stderr=Buffer.from([255,0,195]),tail=Buffer.alloc(0)}={}){
 const supplied=Buffer.concat(chunks),calls=[];let child;
 const spawn=()=>{
  child=new EventEmitter();child.stdout=new PassThrough();child.stderr=new PassThrough();child.stdin=new PassThrough();
  let closed=false;const close=()=>{if(!closed){closed=true;setImmediate(()=>child.emit('close',0))}};
  child.kill=()=>{close();return true};
  setImmediate(()=>{child.stderr.write(stderr);for(const b of chunks)child.stdout.write(b);close()});return child;
 };
 const ctx=vm.createContext({Buffer,setTimeout,clearTimeout});
 const module=new vm.SourceTextModule(source,{context:ctx});
 await module.link(async spec=>{
  const values=spec==='node:child_process'?{spawn,spawnSync(){throw Error('unexpected spawnSync')}}:spec==='./lib.mjs'?{docker(){throw Error('unexpected docker')},dockerArgs:a=>a,inspect(){},REPO:'OFFLINE',sha256:sha}:await import(spec.startsWith('node:')?spec:new URL(spec,sourceUrl).href);
  return new vm.SyntheticModule(Object.keys(values),function(){for(const [k,v]of Object.entries(values))this.setExport(k,v)},{context:ctx});
 });await module.evaluate();
 let got,failure;
 try{got=await module.namespace.BoxExecutor.prototype.execControl.call({resources:[['container','driver']]},'driver',[],async row=>{calls.push(JSON.parse(JSON.stringify(row)));return {ok:true}},{timeout:1000})}catch(e){failure=e;got=e.partial}
 assert.equal(failure?.message??null,error,name+' failure');assert.ok(got,name+' returns partial/result');
 assert.deepEqual(got.stdout,supplied,name+' exact stdout');assert.deepEqual(got.stderr,stderr,name+' exact stderr');
 assert.deepEqual(calls,rows,name+' dispatched envelopes');
 if(error){assert.deepEqual(got.pending,tail,name+' exact unframed tail');const terminal=trustedTerminal({runId:name,exec:got,controlError:failure});assert.equal(terminal.controlFailure.partial.stdoutSha256,sha(supplied));assert.equal(terminal.controlFailure.partial.stderrSha256,sha(stderr));assert.equal(terminal.controlFailure.partial.stdoutBytes,supplied.length)}
 observations.push({name,stdoutHex:supplied.toString('hex'),stderrHex:stderr.toString('hex'),stdoutSha256:sha(supplied),stderrSha256:sha(stderr),calls,error,exact:true});
}
for(const text of ['null','[]','[1]','7','true','false','"hello"'])await run('envelope-'+text,[Buffer.from(text+'\n')],{error:'FAULT-CONTROL-ENVELOPE'});
for(const text of ['{}','{"schema":"foreign"}','{"schema":null}','{"schema":7}'])await run('ignored-'+text,[Buffer.from(text+'\n')]);
const row={schema:'ns-control/1',binding:{runId:'independent'},message:'é€😀'},wire=Buffer.from(JSON.stringify(row)+'\n');
for(let split=1;split<wire.length;split++)await run('valid-split-'+split,[wire.subarray(0,split),wire.subarray(split)],{rows:[row]});
await run('one-byte-chunks',[...wire].map(b=>Buffer.from([b])),{rows:[row]});
await run('literal-replacement-character',[Buffer.from('{"schema":"foreign","message":"�"}\n')]);
for(const hex of ['ff0a','c0800a','eda0800a','f49080800a','e2820a','80c30a'])await run('invalid-utf8-'+hex,[Buffer.from(hex,'hex')],{error:'FAULT-CONTROL-JSON'});
const tail=Buffer.from('e282','hex');await run('raw-tail',[tail.subarray(0,1),tail.subarray(1)],{error:'FAULT-CONTROL-TRUNCATED',tail});
console.log(JSON.stringify({at:new Date().toISOString(),boxSha256:sha(Buffer.from(source)),scope:'exact committed Box.execControl; trusted PassThrough producer; no Docker',observations},null,2));
