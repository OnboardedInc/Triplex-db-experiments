import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
// [EXP-DA01] Why: a public testkit export needs the required repository package check with owned artifacts and cache. Rejected: claiming a build proves tarball consumption.
const dir=import.meta.dirname;
const fd=fs.openSync(path.join(dir,'pack-check.log'),'wx');
const args=['--config.store-dir=/Users/sam/projects/triplex-db-2/.pnpm-store','pack:check'];
const startedAt=new Date().toISOString();
let result;
try {result=spawnSync('/opt/homebrew/bin/pnpm',args,{env:{...process.env,PATH:path.join(process.cwd(),'lab/experiments/EXP-DA00-datomic-bringup/tools')+':'+process.env.PATH,TRIPLEX_PACK_ARTIFACT_ROOT:path.join(dir,'pack-check')},stdio:['ignore',fd,fd]});}
finally{fs.closeSync(fd);}
fs.writeFileSync(path.join(dir,'pack-check.json'),JSON.stringify({command:'/opt/homebrew/bin/pnpm',args,startedAt,endedAt:new Date().toISOString(),status:result.status,signal:result.signal,artifactRoot:path.join(dir,'pack-check')},null,2)+'\n',{flag:'wx'});
process.exitCode=result.status??1;
