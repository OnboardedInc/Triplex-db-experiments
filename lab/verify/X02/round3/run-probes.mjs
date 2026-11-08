// [CX-VX02-3] Why: rerun every prior delta probe with separate retained exits and original inputs.
// Rejected: wrapper exit zero as semantic acceptance or reusing author outputs.
import { spawnSync } from 'node:child_process';
import { openSync, writeFileSync } from 'node:fs';
import path from 'node:path';
const dir=import.meta.dirname;
const outcomes=[];
for(const [tool,output] of [['offline-source','offline-source'],['delta-offline','delta-offline'],['probe-source','source-hazards'],['probe-sums','source-sums'],['delta-sums','delta-sums'],['delta-live','delta-live'],['subquery-regression','subquery-regression'],['variations','variations']]){
 const fd=openSync(path.join(dir,tool+'.log'),'wx');
 const args=['--import','tsx',path.join(dir,tool+'.ts'),path.join(dir,output+'.json')];
 const startedAt=new Date().toISOString();
 const result=spawnSync(process.execPath,args,{stdio:['ignore',fd,fd],env:{...process.env,DOCKER_HOST:'unix:///Users/sam/.colima/triplex2/docker.sock'}});
 outcomes.push({tool,args,startedAt,endedAt:new Date().toISOString(),status:result.status,signal:result.signal,error:result.error?.message});
 writeFileSync(path.join(dir,'exec-outcomes.json'),JSON.stringify(outcomes,null,2)+'\n');
 console.log(tool,result.status,result.error?.message??'');
}
if(outcomes.some(x=>x.status!==0))process.exitCode=1;
