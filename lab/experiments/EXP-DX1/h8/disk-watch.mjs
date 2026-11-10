import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
// [DX-H8] Why: active and retained volumes share the 12 GB cap; stop well before it, retaining abort evidence.
// Rejected: checking only a sealed volume after a long seed has already consumed its budget.
const prefix=process.argv[2];if(!/^tx2-dxh8-[a-z0-9-]+$/.test(prefix??''))throw Error('owned prefix required');
const root='/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H8/'+prefix;
const owner='/Users/sam/Claude/Projects/triplex-db-2/locks/measure/owner.json';
const owns=()=>{try{const o=JSON.parse(fs.readFileSync(owner));return o.id==='DX-H8'&&o.prefix===prefix;}catch{return false;}};
const docker=args=>execFileSync('docker',args,{encoding:'utf8',timeout:20000,env:{...process.env,DOCKER_HOST:'unix:///Users/sam/.colima/triplex2/docker.sock'}});
while(owns()){
 const volumes=docker(['volume','ls','--filter','name=tx2-dxh8-','--format','{{.Name}}']).trim().split('\n').filter(Boolean);
 if(volumes.some(v=>!/^tx2-dxh8-[a-z0-9-]+$/.test(v)))throw Error('unexpected volume name');
 const args=['run','--rm','--pull','never','--name',prefix+'-budget','--network','none'];
 volumes.forEach((v,i)=>args.push('-v',v+':/owned'+i+':ro'));
 const raw=volumes.length?docker([...args,'postgres:17-alpine','sh','-c','du -sk /owned*']):'';
 const bytes=raw.trim().split('\n').filter(Boolean).reduce((n,line)=>n+Number(line.split(/\s+/)[0])*1024,0);
 const hostFree=fs.statfsSync('.').bavail*fs.statfsSync('.').bsize;
 const sample={at:new Date().toISOString(),volumes,bytes,hostFree,raw};fs.appendFileSync(root+'/disk.ndjson',JSON.stringify(sample)+'\n');
 if(bytes>=11500000000||hostFree<5*1024**3){
  fs.writeFileSync(root+'/resource-abort.json',JSON.stringify({...sample,classification:'RESOURCE-ABORT-NOT-SEMANTIC-VERDICT'})+'\n');
  if(owns())try{docker(['stop','-t','2',prefix+'-driver']);}catch{}
  break;
 }
 await new Promise(r=>setTimeout(r,15000));
}
