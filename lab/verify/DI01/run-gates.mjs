// [CX-VDI01] Why: one serial owned build/test pipeline binds each gate to committed HEAD. Rejected: concurrent pack builds deleting files while tests execute.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync,execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root=process.env.CX_VDI01_RUN??'/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VDI01/r2';
fs.mkdirSync(root,{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex');
const head=()=>execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const start=head(),records=[];
function run(label,cmd,args,env={}){
 const free=fs.statfsSync('.'); if(free.bavail*free.bsize<5*1024**3)throw Error('host disk below 5 GiB');
 const log=path.join(root,label+'.log'),fd=fs.openSync(log,'wx'),at=new Date().toISOString();
 const result=spawnSync(cmd,args,{stdio:['ignore',fd,fd],env:{...process.env,...env}});fs.closeSync(fd);
 records.push({label,cmd,args,started:at,finished:new Date().toISOString(),exit:result.status,error:result.error?.message,log,sha256:hash(fs.readFileSync(log)),head:start});
 fs.writeFileSync(path.join(root,'gate-steps.json'),JSON.stringify(records,null,2));console.log(label,result.status);
 if(result.status!==0)console.log('retained failure:',log);
 assertHead();return result.status;
}
function assertHead(){if(head()!==start)throw Error('HEAD moved');}
// Pack's fresh consumer remains offline; seed registry cache bytes only, never an installed consumer.
const bin=path.join(root,'bin');fs.mkdirSync(bin,{recursive:true});const npm=execFileSync('which',['npm'],{encoding:'utf8'}).trim();fs.symlinkSync(path.resolve('lab/experiments/EXP-PACK/npm-offline.mjs'),path.join(bin,'npm'));
run('pack','node',['lab/bin/check-packages.mjs'],{PATH:bin+':'+process.env.PATH,CX_VPACK_NPM:npm,CX_VPACK_CACHE:'/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VA01-040/npm-cache',TRIPLEX_PACK_ARTIFACT_ROOT:path.join(root,'pack'),npm_config_offline:'true'});
run('root-pack','pnpm',['--config.store-dir=/Users/sam/projects/triplex-db-2/.pnpm-store','pack:check'],{PATH:bin+':'+process.env.PATH,CX_VPACK_NPM:npm,CX_VPACK_CACHE:'/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VA01-040/npm-cache',TRIPLEX_PACK_ARTIFACT_ROOT:path.join(root,'root-pack'),npm_config_offline:'true',npm_config_store_dir:'/Users/sam/projects/triplex-db-2/.pnpm-store'});
if(run('build-w0','pnpm',['--config.store-dir=/Users/sam/projects/triplex-db-2/.pnpm-store','--filter','@triplex-build/w0','build'])!==0)process.exit(1);
run('fd01','pnpm',['--config.store-dir=/Users/sam/projects/triplex-db-2/.pnpm-store','--filter','@triplex-build/triplex-host','exec','vitest','run','test/feed/feed.test.ts']);
run('di01-unit','node',['--import','tsx','--test',...fs.readdirSync('lab/bench').filter(f=>/^di01.*\.test\.ts$/.test(f)&&f!=='di01-oracle.test.ts').map(f=>'lab/bench/'+f),'lab/verify/DI01/oracle-control.test.ts'],{DI01_GS_EVIDENCE:path.join(root,'GS06')});
run('reviewer-runtime','node',['--import','tsx','--test','lab/verify/DI01/runtime.test.ts'],{CX_VDI01_RUNTIME:path.join(root,'runtime')});
const bind=path.join(root,'fresh');if(run('create-binding','node',['--import','tsx','lab/bench/lib/di01-evidence.ts','--create-binding',bind])!==0)process.exit(1);
run('cases','node',['--import','tsx','lab/bench/di01.ts','cases',path.join(bind,'cases')],{DI01_BINDING:path.join(bind,'binding.json')});
run('crash','node',['--import','tsx','lab/bench/di01-crash.ts',path.join(bind,'crash')],{DI01_BINDING:path.join(bind,'binding.json')});
if(run('commands','node',['--import','tsx','lab/verify/DI01/commands.ts',path.join(root,'commands.jsonl')])===0)run('feed-binding','python3',['-B','lab/verify/DI01/feed-binding.py',path.join(root,'commands.jsonl'),path.join(root,'feed-binding.json')]);
assertHead();
