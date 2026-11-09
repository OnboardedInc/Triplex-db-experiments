// [CX-VDI01-R2] Why: fresh serial builds/gates on a committed merged tree avoid concurrent dist replacement. Rejected: accepting builder exits or reusing round-1 gate receipts.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync,execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root='/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VDI01/round2-review';
const sha=b=>createHash('sha256').update(b).digest('hex');
const head=()=>execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),initial=head();
const files=['lab/bench/lib/di01-refs.ts','lab/bench/di01-refusal.test.ts','packages/host/src/feed/DependencyIndex.ts','packages/host/src/feed/ConsumerStore.ts','packages/host/src/feed/index.ts','lab/verify/DI01/runtime.test.ts','lab/verify/DI01/round2/run.mjs','lab/verify/DI01/round2/probes.test.ts','lab/verify/DI01/round2/oracle-control.test.ts'];
const hashes=()=>Object.fromEntries(files.map(f=>[f,sha(fs.readFileSync(f))]));const before=hashes();
fs.mkdirSync(path.join(root,'source'),{recursive:true});for(const f of files)fs.writeFileSync(path.join(root,'source',sha(fs.readFileSync(f))),fs.readFileSync(f));
fs.writeFileSync(path.join(root,'binding.json'),JSON.stringify({head:initial,files:before,slot:null,offline:true},null,2));const records=[];
function run(label,cmd,args,env={}){
 const disk=fs.statfsSync('.');if(disk.bavail*disk.bsize<5*1024**3)throw Error('host disk below 5 GiB');
 const log=path.join(root,label+'.log'),fd=fs.openSync(log,'wx'),started=new Date().toISOString();
 const r=spawnSync(cmd,args,{stdio:['ignore',fd,fd],env:{...process.env,...env}});fs.closeSync(fd);
 records.push({label,cmd,args,started,finished:new Date().toISOString(),head:initial,exit:r.status,error:r.error?.message,log,sha256:sha(fs.readFileSync(log))});fs.writeFileSync(path.join(root,'steps.json'),JSON.stringify(records,null,2));
 if(head()!==initial||JSON.stringify(hashes())!==JSON.stringify(before))throw Error('source/head moved');console.log(label,r.status);return r.status;
}
run('contract-verify','python3',['-I','lab/acceptance/build_contract.py','--verify']);
const bin=path.join(root,'bin');fs.mkdirSync(bin,{recursive:true});fs.symlinkSync(path.resolve('lab/experiments/EXP-PACK/npm-offline.mjs'),path.join(bin,'npm'));
const npm=execFileSync('which',['npm'],{encoding:'utf8'}).trim();
run('pack','node',['lab/bin/check-packages.mjs'],{PATH:bin+':'+process.env.PATH,CX_VPACK_NPM:npm,CX_VPACK_CACHE:'/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VA01-040/npm-cache',TRIPLEX_PACK_ARTIFACT_ROOT:path.join(root,'pack'),npm_config_offline:'true'});
run('di01-suite','node',['--import','tsx','--test',...fs.readdirSync('lab/bench').filter(f=>/^di01.*\.test\.ts$/.test(f)&&f!=='di01-oracle.test.ts').map(f=>'lab/bench/'+f),'lab/verify/DI01/round2/oracle-control.test.ts'],{DI01_GS_EVIDENCE:path.join(root,'GS06')});
run('original-gap','node',['--import','tsx','--test','--test-name-pattern=GAP:','lab/verify/DI01/runtime.test.ts'],{CX_VDI01_RUNTIME:path.join(root,'old-gap')});
run('reviewer-probes','node',['--import','tsx','--test','lab/verify/DI01/round2/probes.test.ts'],{CX_VDI01_R2:path.join(root,'probes')});
