import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
// [DX-H3] Why: the local Node image has no Python; exact offline oracle bytes can run on the host after measurement.
// Rejected: installing Python, translating the independent oracle or manufacturing an oracle verdict.
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const [mode,dir,...args]=process.argv.slice(2);
fs.mkdirSync(dir,{recursive:true});
if(mode==='client') {
 const [flag,cli,input,outflag,output]=args;
 if(flag!=='-I'||outflag!=='-o')throw Error('unexpected oracle invocation');
 const id=crypto.randomUUID(), bytes=fs.readFileSync(input), sha256=hash(bytes);
 fs.writeFileSync(path.join(dir,id+'.case'),bytes);
 const req={id,sha256,cli};
 fs.writeFileSync(path.join(dir,id+'.request.tmp'),JSON.stringify(req));
 fs.renameSync(path.join(dir,id+'.request.tmp'),path.join(dir,id+'.request'));
 const deadline=Date.now()+900000;
 const sleep=new Int32Array(new SharedArrayBuffer(4));
 const response=path.join(dir,id+'.response');
 while(!fs.existsSync(response)) {if(Date.now()>deadline)throw Error('oracle host bridge timeout');Atomics.wait(sleep,0,0,50);}
 const r=JSON.parse(fs.readFileSync(response,'utf8'));
 if(r.id!==id||r.sha256!==sha256)throw Error('oracle bridge response binding mismatch');
 if(r.outputSha256) {const out=fs.readFileSync(path.join(dir,id+'.output'));if(hash(out)!==r.outputSha256)throw Error('oracle output changed');fs.writeFileSync(output,out);}
 process.stderr.write(r.stderr??'');process.exit(r.code);
} else if(mode==='server') {
 const done=new Set();
 setInterval(()=>{
   for(const file of fs.readdirSync(dir).filter(f=>f.endsWith('.request'))) {
     if(done.has(file))continue;done.add(file);
     const r=JSON.parse(fs.readFileSync(path.join(dir,file),'utf8'));
     const input=path.join(dir,r.id+'.case'),output=path.join(dir,r.id+'.output');
     if(hash(fs.readFileSync(input))!==r.sha256)throw Error('oracle input changed');
     const result=spawnSync('python3',['-I',r.cli,input,'-o',output],{encoding:'utf8',timeout:900000,maxBuffer:64<<20});
     const receipt={id:r.id,sha256:r.sha256,code:result.status??1,stderr:result.stderr??String(result.error??''),outputSha256:fs.existsSync(output)?hash(fs.readFileSync(output)):null};
     fs.writeFileSync(path.join(dir,r.id+'.response.tmp'),JSON.stringify(receipt));
     fs.renameSync(path.join(dir,r.id+'.response.tmp'),path.join(dir,r.id+'.response'));
   }
 },100);
} else throw Error('client|server required');
