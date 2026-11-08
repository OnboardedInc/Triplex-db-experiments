// [CX-VX02-5] Why: preserve exact prior query inputs, separate exits and new output names against committed 7b11af0.
// Rejected: adopting builder outputs or rewriting old mismatches into passing expectations.
import{spawnSync}from'node:child_process';import{openSync,writeFileSync,closeSync}from'node:fs';import path from'node:path';
const dir=import.meta.dirname;const outcomes=[];
for(const[tool,output]of [['offline-source','offline-source'],['delta-offline','delta-offline'],['probe-source','source-hazards'],['probe-sums','source-sums'],['delta-sums','delta-sums'],['delta-live','delta-live'],['subquery-regression','subquery-regression'],['spot','spot'],['check-offline','check-offline'],['boundary-confirmation','boundary-confirmation'],['grammar-review','grammar-review']]){
 const fd=openSync(path.join(dir,tool+'.log'),'wx');const args=['--import','tsx',path.join(dir,tool+'.ts'),path.join(dir,output+'.json')];const at=new Date().toISOString();
 const r=spawnSync(process.execPath,args,{cwd:path.join(dir,'target'),stdio:['ignore',fd,fd],env:{...process.env,DOCKER_HOST:'unix:///Users/sam/.colima/triplex2/docker.sock'}});closeSync(fd);
 outcomes.push({tool,args,at,endedAt:new Date().toISOString(),status:r.status,signal:r.signal,error:r.error?.message});writeFileSync(path.join(dir,'regression-exec-outcomes.json'),JSON.stringify(outcomes,null,2)+'\n');console.log(tool,r.status);
}
if(outcomes.some(x=>x.status!==0))process.exitCode=1;
