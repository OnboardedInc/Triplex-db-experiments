import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {oracleTimeouts} from '../../../bench/lib/oracle-budget.mjs';
// [DX-H3] Why: the local Node image has no Python; exact offline oracle bytes can run on the host after measurement.
// Rejected: installing Python, translating the independent oracle or manufacturing an oracle verdict.
// [DX-T1-15] Why: the 100k oracle's 1.4-GiB result must cross the bridge without a whole-file client buffer.
// Rejected: shrinking the oracle case or treating the host process exit as a successful comparison.
function fileHash(file) {
 const fd=fs.openSync(file,'r'), digest=crypto.createHash('sha256'), chunk=Buffer.allocUnsafe(1024**2);
 try {
   for(let n; (n=fs.readSync(fd,chunk,0,chunk.length,null))>0;) digest.update(chunk.subarray(0,n));
   return digest.digest('hex');
 } finally {fs.closeSync(fd);}
}
const [mode,dir,...args]=process.argv.slice(2);
fs.mkdirSync(dir,{recursive:true});
if(mode==='client') {
 const [flag,cli,input,outflag,output]=args;
 if(flag!=='-I'||outflag!=='-o')throw Error('unexpected oracle invocation');
 const id=crypto.randomUUID(), sha256=fileHash(input);
 fs.copyFileSync(input,path.join(dir,id+'.case'),fs.constants.COPYFILE_EXCL);
 const req={id,sha256,cli};
 fs.writeFileSync(path.join(dir,id+'.request.tmp'),JSON.stringify(req));
 fs.renameSync(path.join(dir,id+'.request.tmp'),path.join(dir,id+'.request'));
 const deadline=Date.now()+oracleTimeouts(fs.statSync(input).size).bridgeMs;
 const sleep=new Int32Array(new SharedArrayBuffer(4));
 const response=path.join(dir,id+'.response');
 while(!fs.existsSync(response)) {if(Date.now()>deadline)throw Error('oracle host bridge timeout');Atomics.wait(sleep,0,0,50);}
 const r=JSON.parse(fs.readFileSync(response,'utf8'));
 if(r.id!==id||r.sha256!==sha256)throw Error('oracle bridge response binding mismatch');
 if(r.outputSha256) {
   const staged=output+'.'+id+'.partial';
   try {
     fs.copyFileSync(path.join(dir,id+'.output'),staged,fs.constants.COPYFILE_EXCL);
     if(fileHash(staged)!==r.outputSha256)throw Error('oracle output changed in transfer');
     fs.renameSync(staged,output);
   } finally {fs.rmSync(staged,{force:true});}
 }
 process.stderr.write(r.stderr??'');process.exit(r.code);
} else if(mode==='server') {
 const done=new Set();
 setInterval(()=>{
   for(const file of fs.readdirSync(dir).filter(f=>f.endsWith('.request'))) {
     if(done.has(file))continue;done.add(file);
     const r=JSON.parse(fs.readFileSync(path.join(dir,file),'utf8'));
     const input=path.join(dir,r.id+'.case'),output=path.join(dir,r.id+'.output');
     if(fileHash(input)!==r.sha256)throw Error('oracle input changed');
     const result=spawnSync('python3',['-B','-I',r.cli,input,'-o',output],{
       encoding:'utf8',timeout:oracleTimeouts(fs.statSync(input).size).runMs,maxBuffer:64<<20,
     });
     const stderr=[result.error?.message,result.stderr].filter(Boolean).join('\n');
     const receipt={id:r.id,sha256:r.sha256,code:result.status??1,stderr,outputSha256:fs.existsSync(output)?fileHash(output):null};
     fs.writeFileSync(path.join(dir,r.id+'.response.tmp'),JSON.stringify(receipt));
     fs.renameSync(path.join(dir,r.id+'.response.tmp'),path.join(dir,r.id+'.response'));
   }
 },100);
} else throw Error('client|server required');
