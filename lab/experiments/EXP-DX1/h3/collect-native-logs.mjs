import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
// [DX-H3] Why: preserve actual peer/transactor files after measurement, before owned cleanup.
// Rejected: interrupting timed phases for JVM diagnostics or inferring activity from CPU alone.
const prefix=process.argv[2];
if(!/^tx2-dxh3-[a-z0-9-]+$/.test(prefix??''))throw Error('owned prefix required');
const root=path.join('/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H3',prefix);
const until=Date.now()+3600000;
while(Date.now()<until){
 const log=fs.existsSync(path.join(root,'driver.log'))?fs.readFileSync(path.join(root,'driver.log'),'utf8'):'';
 if(log.includes('wind down:')||log.includes('fatal:'))break;
 await new Promise(r=>setTimeout(r,1000));
}
const snapshot=path.join(root,'native-logs',String(Date.now()));fs.mkdirSync(snapshot,{recursive:true});
const expected=JSON.parse(fs.readFileSync(path.join(root,'stack.json'),'utf8'));
const env={...process.env,DOCKER_HOST:'unix:///Users/sam/.colima/triplex2/docker.sock'};
const rows=[];
for(const role of ['tx','gw-w','gw-r']){
 const name=prefix+'-'+role;const row={name,capturedAt:new Date().toISOString(),copied:false};
 try{
  const got=JSON.parse(execFileSync('docker',['inspect',name],{env,encoding:'utf8',timeout:10000}))[0];
  if(got.Id!==expected.containers.find(c=>c.name===name)?.id)throw Error('container identity changed');
  row.id=got.Id;fs.mkdirSync(path.join(snapshot,role));
  execFileSync('docker',['cp',name+':/opt/datomic/log/.',path.join(snapshot,role)],{env,timeout:30000,stdio:'pipe'});row.copied=true;
 }catch(e){row.error=String(e.message).slice(0,1000);}
 rows.push(row);
}
fs.writeFileSync(path.join(snapshot,'collection.json'),JSON.stringify({kind:'post-phase log observation; not a semantic verdict',rows},null,2)+'\n');
console.log(snapshot);
