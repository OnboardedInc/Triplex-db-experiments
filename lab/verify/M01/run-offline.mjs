// [CX-VM01R] Why: the same memory composition exercises both resolved shutdown/feed paths without an engine. Rejected: live engines for an offline-only review.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const here=import.meta.dirname;
const attempt=process.argv[2]??'2';
const result=[];
for(const role of ['main','reviewed']){
 const root=path.join(here,'runtime',role);
 const env={...process.env,NODE_OPTIONS:'--experimental-strip-types',TX2_CONFIG_DIR:root,TX2_MEMORY_SERVICE_MS:'1'};
 delete env.TX2_SLOTS_FILE;delete env.TX2_ENGINE_CONTAINER;
 if(role==='main'){
  const t=spawnSync(process.execPath,['--test','lab/bench/test/bench.test.ts','lab/bin/test/lab.test.mjs'],{cwd:root,env,encoding:'utf8',timeout:30000});
  fs.writeFileSync(path.join(here,'main-tests.tap'),(t.stdout??'')+(t.stderr??''));assert.equal(t.status,0,t.stderr);
 }
 const dry=[];
 for(const gate of ['G0','G1','G2','G4','NS','GS','OBL'])for(const lane of ['xtdb','qlever','datomic']){
  const args=['lab/bin/gate.mjs',gate,'--lane',lane,'--dry-run'];
  const r=spawnSync(process.execPath,args,{cwd:root,env,encoding:'utf8'});
  dry.push({args,code:r.status,stdout:r.stdout,stderr:r.stderr});
  const supported=lane!=='datomic'||['G0','G1','GS'].includes(gate);
  assert.equal(r.status,supported?0:1,`${role} ${args} ${r.stderr}`);
  if(supported)assert.equal(JSON.parse(r.stdout).dryRun,true);else assert.match(r.stderr,/USAGE/);
 }
 fs.writeFileSync(path.join(here,`${role}-dry-runs.json`),JSON.stringify(dry,null,2)+'\n');
 for(const profile of ['baseline','readers']){
  const dir=path.join(root,'runs',`${profile}-${attempt}`);fs.mkdirSync(dir,{recursive:true});
  const args=['lab/bench/driver.ts','--lane','xtdb','--rung','10k','--subjects','21','--composition','memory','--seed','vm01r-offline','--output',path.join(dir,'report.json'),'--level-s','0.05','--burst-multiplier','1','--max-readers','1','--reader-threads','1','--history-sample','1','--probe10-per-s','0','--oracle-subjects','1','--oracle-max-reads','1',...(profile==='baseline'?['--zero-readers','--match-duration-s','5']:[])];
  const r=spawnSync(process.execPath,args,{cwd:root,env,encoding:'utf8',timeout:90000,maxBuffer:5*1024*1024});
  fs.writeFileSync(path.join(here,`${role}-${profile}-${attempt}.stdout.log`),r.stdout??'');
  fs.writeFileSync(path.join(here,`${role}-${profile}-${attempt}.stderr.log`),r.stderr??'');
  const report=fs.existsSync(path.join(dir,'report.json'))?JSON.parse(fs.readFileSync(path.join(dir,'report.json'),'utf8')):null;
  result.push({role,profile,args,code:r.status,signal:r.signal,error:r.error?.message,status:report?.status});
  fs.writeFileSync(path.join(here,`driver-attempts-${attempt}.json`),JSON.stringify(result,null,2)+'\n');
  assert.equal(r.status,0,`${role}/${profile} ${r.stderr}`);assert.equal(report.status,'DONE');assert.equal(report.pair,undefined);
 }
}
