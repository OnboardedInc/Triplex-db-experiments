import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { spawnSync, execFileSync } from 'node:child_process';
import { test } from 'node:test';
const here=path.dirname(fileURLToPath(import.meta.url));
const meta=JSON.parse(fs.readFileSync(path.join(here,'source.json')));
const root=path.join(here,'scratch');
const source=fs.readFileSync(path.join(root,'lab/bin/gate.mjs'),'utf8');
const baseline=rev=>execFileSync('git',['show',`${rev}:lab/bin/gate.mjs`],{cwd:root,encoding:'utf8'});
// [CX-VA01-0313-R2] Why: derive hostile inherited keys from both real parents so an omitted key cannot hide behind a fixed sample. Rejected: testing only the three named Datomic flags.
test('every parent environment cleanup key survives the merge, and explicit overrides follow cleanup',()=>{
 const slice=s=>s.slice(s.indexOf('const LIVE_FLAGS'),s.indexOf('\nclass Run'));
 const keys=new Set();
 for (const rev of ['6b8d218','9a7996e']) {
  const text=slice(baseline(rev));
  const lists=vm.runInNewContext(`${text}\n[...LIVE_FLAGS,...ENGINE_ENV]`,{process:{env:{}}});
  for(const key of lists)keys.add(key);
 }
 const env=Object.fromEntries([...keys].map(k=>[k,'hostile']));
 Object.assign(env,{KEEP:'retained',QLEVER_SOURCE_PLAN:'hostile',XTDB_SOURCE_PLAN:'hostile'});
 const clean=vm.runInNewContext(`${slice(source)}\ncleanEnv`,{process:{env}});
 assert.deepEqual(Object.keys(clean()).sort(),['KEEP','XTDB_SOURCE_PLAN']);
 // [CX-VA01-0313-R2] Why: this unused XTDB key was retained by both parents; only the actual QLever planner prefix is cleaned. Rejected: inventing a new cleanup requirement while reviewing preservation.
 for(const rev of ['6b8d218','9a7996e']) {
  const parentClean=vm.runInNewContext(`${slice(baseline(rev))}\ncleanEnv`,{process:{env}});
  assert.equal(clean().XTDB_SOURCE_PLAN,parentClean().XTDB_SOURCE_PLAN);
 }
 for(const key of keys)assert.equal(clean({[key]:'explicit'})[key],'explicit');
});
test('all supported dry-run gate/lane combinations retain their independent lane policy',()=>{
 for(const gate of ['G0','G1','G2','G4','NS','GS','OBL'])for(const lane of ['xtdb','qlever','datomic','invalid']){
  const allowed=['xtdb','qlever'].includes(lane)||(lane==='datomic'&&['G0','G1','GS'].includes(gate));
  const r=spawnSync(process.execPath,['lab/bin/gate.mjs',gate,'--lane',lane,'--dry-run'],{cwd:root,encoding:'utf8',env:{...process.env,TX2_CONFIG_DIR:root}});
  assert.equal(r.status,allowed?0:1,`${gate}/${lane}: ${r.stderr}`);
  if(allowed){const data=JSON.parse(r.stdout);assert.equal(data.dryRun,true);assert.equal(data.lane,lane);assert.equal(data.gate,gate);assert.equal(data.executes,gate!=='OBL');}
 }
});
test('store compatibility accepts the exact owned prefix and refuses alternate stores or unknown commands',()=>{
 const shim=path.join(root,'lab/experiments/EXP-A01-acceptance-contract/bin/pnpm');
 for(const [prefix,expected] of [['--config.store-dir=/Users/sam/projects/triplex-db-2/.pnpm-store',0],['--config.store-dir=/tmp/other-store',1]]){
  const r=spawnSync(process.execPath,[shim,prefix,'--version'],{cwd:root,encoding:'utf8'});
  assert.equal(r.status,expected);
  if(!expected)assert.equal(r.stdout.trim(),'10.11.0');else assert.match(r.stderr,/Unexpected store/);
 }
 const r=spawnSync(process.execPath,[shim,'--config.store-dir=/Users/sam/projects/triplex-db-2/.pnpm-store','made-up-command'],{cwd:root,encoding:'utf8'});
 assert.equal(r.status,1);assert.match(r.stderr,/Unexpected command/);
});
