// [EXP-OBS01] Why: source-bound A/A diagnostic arms isolate host sampling, transport, DEBUG and spans.
// Rejected: interpreting a single warmed microtrace as an NS workload or production overhead guarantee.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
const repo=path.resolve(import.meta.dirname,'../..'),lane=process.argv[2]??'xtdb',base=path.join(repo,'lab/experiments/EXP-OBS01/round2',lane==='qlever'?'overhead-qlever':'overhead');fs.mkdirSync(base,{recursive:true});
const holder='CX-OBS01-AA',slot=['--lane',lane,'--slot','s3','--holder',holder];
function call(args,file,command=process.execPath){const result=spawnSync(command,args,{cwd:repo,encoding:'utf8',env:{...process.env,TX2_CONFIG_DIR:path.join(repo,'runs/OBS01/r2-config')}});fs.writeFileSync(file,(result.stdout??'')+(result.stderr??''));if(result.status!==0)throw new Error(file+' '+result.status);}
const arms=lane==='qlever'?[['baseline-before','none',null,21073],['query-log','logs','Q3-events',21073],['baseline-after','none',null,21073]]:[['baseline-before','none',null,19473],['host','none','H1-memory-current',19473],['proxy','none','T1-wire',16473],['debug','logs','X6-log',19473],['spans','spans','X7-spans',19473],['baseline-after','none',null,19473]];
for(const [arm,features,streams,port] of arms){
 const dir=path.join(base,arm);fs.mkdirSync(dir,{recursive:true});const id='obs01-r2-aa-'+lane+'-'+arm;let observed=false;
 call(['lab/bin/engine.mjs','up',...slot,'--cpuset-cpus','2','--observation-sources','--observation-features',features,'--diagnostic-direct'],path.join(dir,'engine-up.log'));
 try{
  if(streams){const key=path.join(repo,'runs/OBS01',id+'.key');fs.writeFileSync(key,randomBytes(32),{flag:'wx',mode:0o600});call(['lab/bin/engine.mjs','observer-up',...slot,'--image','python@sha256:e48f59cdba69a3cbd9ed2cf0f348d90d45a8d350d98134cf1070bc106ee9ed90','--observer-cpus','5','--observer-streams',streams,'--run-id',id,'--receipt-id',id,'--key-id',id+'-key','--key-file',key,'--max-bundle-bytes','268435456'],path.join(dir,'observer-up.log'));observed=true;}
  call(['-I','-B',lane==='qlever'?'lab/observer/measure_q_writes.py':'lab/observer/measure_writes.py',String(port),path.join(dir,'samples.json')],path.join(dir,'driver.log'),'python3');
 }finally{
  if(observed)call(['lab/bin/engine.mjs','observer-down',...slot],path.join(dir,'observer-down.log'));
  call(['lab/bin/engine.mjs','down',...slot,'--note','OBS01 P9 A/A diagnostic; retain for archive'],path.join(dir,'engine-down.log'));
 }
}
const rows=Object.fromEntries(fs.readdirSync(base).map(arm=>[arm,JSON.parse(fs.readFileSync(path.join(base,arm,'samples.json'),'utf8'))]));
const baseline=(rows['baseline-before'].p99+rows['baseline-after'].p99)/2;
const summary=Object.fromEntries(Object.entries(rows).map(([arm,s])=>[arm,{p50:s.p50,p99:s.p99,ratioToBracketedBaseline:s.p99/baseline}]));
fs.writeFileSync(path.join(base,'summary.json'),JSON.stringify({scope:'native single-row diagnostic only; shared residents remain unpinned',summary},null,2)+'\n');console.log(JSON.stringify(summary));
