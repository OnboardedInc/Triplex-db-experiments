// @ts-nocheck -- [EXP-CHECKJS-R2] mutable records inferred from their initial values; unannotated local values; unannotated dynamic parameters; initially empty collections. Binding errors remain checked by lab/bin/checkjs.mjs.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
// [EXP-DA01] Why: the pool refused an extra selftest JVM alongside the resident; use the authorized restart window and always restore service. Rejected: unreserved Docker exec or touching another lane.
const dir=import.meta.dirname, attempt=process.argv[2]??'1';
const results=[];
function run(action,suffix=action){
  const log=path.join(dir,`${suffix}-${attempt}.log`),fd=fs.openSync(log,'wx');
  const args=['lab/bin/engine.mjs',action,'--lane','datomic','--slot','dev','--holder','EXP-DA01','--exp','EXP-DA01'];
  const start=new Date().toISOString();
  try{const result=spawnSync(process.execPath,args,{env:{...process.env,TX2_CONFIG_DIR:process.cwd()},stdio:['ignore',fd,fd]});results.push({action,args,start,end:new Date().toISOString(),status:result.status,log});return result.status;}finally{fs.closeSync(fd);}
}
let status=1;
try{if(run('down')!==0)throw new Error('Datomic down failed');status=run('selftest','selftest-window');}
finally{
  const restored=run('up');
  fs.writeFileSync(path.join(dir,`deploy-${attempt}.json`),JSON.stringify({results,restored:restored===0},null,2)+'\n',{flag:'wx'});
  if(restored!==0)throw new Error('Resident restoration failed; inspect up log');
}
console.log(JSON.stringify(results));process.exitCode=status??1;
