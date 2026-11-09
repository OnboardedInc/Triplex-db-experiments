// [CX-VP2Q-11] Why: rerun every matrix and real source mutation with fresh source/slot-bound receipts.
// Rejected: adopting builder output or interpreting expected-negative failures as product acceptance.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';
import { randomUUID, createHash } from 'node:crypto';
const root=process.cwd(), base=`/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VP2Q-11/round11/${randomUUID()}`;
fs.mkdirSync(base,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex');
const env={...process.env,R10_EVIDENCE:base,R10_HEAVY_LABEL:'CX-VP2Q-11-R11',R10_HEAVY_PID:String(process.ppid)};
delete env.V_P2Q_LIVE;delete env.QLEVER_INTEGRATION;delete env.QLEVER_COMMIT_PATH;
console.log(JSON.stringify({base,head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()}));
const results=[];
function gate(name,p,f,t,command,extra={}){
 const result=spawnSync('node',['lab/verify/P2Q/scripts/round11-gate.mjs',name,String(p),String(f),String(t),...command],{env:{...env,...extra},stdio:'inherit'});
 results.push({name,status:result.status});
 console.log(JSON.stringify({completed:name,status:result.status}));
}
const scratch=path.join(base,'native-scratch');
const made=spawnSync('node',['lab/experiments/EXP-P2Q-qlever-log-broker/scratch-round10.mjs',scratch],{stdio:'inherit'});
if(made.status!==0)throw Error('scratch generator failed');
for(const variant of ['foreign','symbol'])fs.copyFileSync('lab/verify/P2Q/tests/round8-policy.test.ts',`${scratch}/${variant}/lab/verify/P2Q/tests/round8-policy.test.ts`);
for(const variant of ['hidden','string']){
 const dest=`${scratch}/${variant}`;fs.cpSync(`${scratch}/symbol`,dest,{recursive:true,verbatimSymlinks:true});
 const file=`${dest}/packages/qlever/src/native/NativeQueries.ts`;
 let s=fs.readFileSync(file,'utf8');
 if(variant==='hidden')s=s.replace('return readConstructor.dispatch(\n    {','return readConstructor.dispatch(\n    Object.defineProperty({').replace('    },\n    (...args: Parameters<typeof run>)','    }, round10NativeSymbol, {enumerable:false}),\n    (...args: Parameters<typeof run>)');
 else s=s.replace('export const round10NativeSymbol: unique symbol = Symbol("round10NativeRead");','export const round10NativeSymbol = "round10NativeRead" as const;');
 fs.writeFileSync(file,s);
 const test=`${dest}/lab/verify/P2Q/tests/round10-native-probe.test.ts`;
 if(variant==='string')fs.writeFileSync(test,fs.readFileSync(test,'utf8').replace("filter(p=>p.name.includes('round10NativeSymbol'))","filter(p=>p.name.includes('round10Native'))"));
}
const inventory=path.join(base,'inventory-scratch');fs.mkdirSync(inventory);
const field='readonly round10Read: (basis?: { readonly recordedPosition: number; readonly validAt: number }) => Effect.Effect<readonly Triple[], ReadError>;';
for(const kind of ['baseline','direct','inherited','merged']){
 const dest=path.join(inventory,kind);fs.mkdirSync(dest);
 for(const file of ['packages/core/src','packages/qlever/src','packages/core/package.json','packages/qlever/package.json','package.json','vitest.workspace-aliases.ts','lab/verify/P2Q/vitest.config.ts','lab/verify/P2Q/tests/harness.ts','lab/verify/P2Q/tests/round8-policy.test.ts']){
  fs.mkdirSync(path.dirname(path.join(dest,file)),{recursive:true});fs.cpSync(path.join(root,file),path.join(dest,file),{recursive:true});
 }
 fs.symlinkSync(`${root}/node_modules`,`${dest}/node_modules`,'dir');for(const pkg of ['core','qlever'])fs.symlinkSync(`${root}/packages/${pkg}/node_modules`,`${dest}/packages/${pkg}/node_modules`,'dir');
 if(kind!=='baseline'){
  const c=`${dest}/packages/core/src/store/Triples.ts`,i=`${dest}/packages/core/src/store/TriplesLive.ts`;
  let s=fs.readFileSync(c,'utf8');
  if(kind==='direct')s=s.replace('export interface TriplesService {',`export interface TriplesService {${field}`);
  if(kind==='inherited')s=s.replace('export interface TriplesService {',`export interface Round11Reads {${field}}\nexport interface TriplesService extends Round11Reads {`);
  if(kind==='merged')s+=`\nexport interface TriplesService {${field}}\n`;
  fs.writeFileSync(c,s);
  const before=fs.readFileSync(i,'utf8'),after=before.replace('    assert: assert_,','    round10Read: (_basis?: { readonly recordedPosition: number; readonly validAt: number }) => Effect.succeed([]),\n    assert: assert_,');if(before===after)throw Error('missing mutation anchor');fs.writeFileSync(i,after);
  let probe=fs.readFileSync('lab/verify/P2Q/scripts/round10-added-read.test.ts','utf8');
  probe=probe.replace('import path from "node:path";','import path from "node:path";\nimport {DatabaseScope} from "@triplex-build/triplex/runtime";').replace('const scope = `round10-scratch:${randomUUID()}`','const scope = DatabaseScope.test(`round10-scratch:${randomUUID()}`)');
  fs.writeFileSync(`${dest}/lab/verify/P2Q/tests/round10-added-read.test.ts`,probe);
 }
}
// Retain complete authored preimages once; every individual gate also checks the live hashes before/after.
const files=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','packages/core/src','packages/core/test','packages/qlever/src','packages/qlever/test','lab/verify/P2Q/tests','lab/verify/P2Q/scripts','lab/verify/P2Q/types','lab/verify/P2Q/vitest.config.ts','lab/bin','vitest.workspace-aliases.ts','pnpm-lock.yaml','package.json','tsconfig.base.json','tsconfig.node.json'],{encoding:'utf8'}).trim().split('\n');
for(const name of fs.readdirSync('lab/verify/P2Q').filter(n=>/^tsconfig.*json$/.test(n)))files.push(`lab/verify/P2Q/${name}`);
const manifest=[];for(const file of [...new Set(files)]){const dest=`${base}/preimages/${file}`;fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(file,dest);manifest.push({file,sha256:sha(fs.readFileSync(file))});}
fs.writeFileSync(`${base}/source-preimages.json`,JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
const v=['node_modules/.bin/vitest','run','--config','lab/verify/P2Q/vitest.config.ts'];const t=names=>names.map(n=>`lab/verify/P2Q/tests/${n}.test.ts`);
gate('earlier-offline',802,0,816,[...v,...t(['round4','round5','round5-delta','round6','round6-codes','round7-q89c','round7-q89c-empty','round7-basis'])]);
gate('new-offline',37,0,43,[...v,...t(['round8-basis','round8-pin-page-corrected','round8-policy','round8-history','round9-construction','round10-construction'])]);
gate('foundation',46,0,46,[...v,...t(['check1-durability','check1-lock-process','check2-ack','check3-routing','check3-outage-scale','check3-probe-load','check4-feed','check5-q31c','check6-a0-guard','q55c-native','round3','round7-audit'])],{V_P2Q_SEEDS:'60'});
gate('package',224,0,250,['node_modules/.bin/vitest','run','--root','packages/qlever','--maxWorkers','1','--no-file-parallelism']);
gate('core',28,0,28,['node_modules/.bin/vitest','run','--root','packages/core','test/runtime/read-basis.test.ts','test/kv/layers/KvTriples.store.test.ts','test/kv/layers/KvTriples.query.test.ts','--maxWorkers','1','--no-file-parallelism']);
gate('core-tsc','compiler',0,0,['node_modules/.bin/tsc','--noEmit','-p','packages/core/tsconfig.json']);
gate('qlever-source-tsc','compiler',0,0,['node_modules/.bin/tsc','--noEmit','-p','lab/verify/P2Q/tsconfig.round10.json']);
gate('earlier-live',54,0,54,[...v,...t(['round4','round7-basis','live/live'])],{V_P2Q_LIVE:'1',QLEVER_URL:'http://127.0.0.1:7070'});
gate('new-live',7,0,14,[...v,...t(['round8-basis','round8-pin-page-corrected','round8-history']),'-t','round8 live'],{V_P2Q_LIVE:'1',QLEVER_URL:'http://127.0.0.1:7070'});
gate('catalog-negative',121,1,122,['node','node_modules/vitest/vitest.mjs','run','--config','lab/verify/P2Q/scripts/round7-guard.config.ts'],{R10_FAILURE_PATTERN:'UND_ERR_QA_ADDED_TRANSPORT'});
gate('independent-extension',7,0,7,[...v,...t(['round11-types','round11-surface'])]);
for(const variant of ['foreign','symbol','hidden','string']){
 const dest=`${scratch}/${variant}`,isString=variant==='string';
 gate(`native-${variant}`,variant==='foreign'?3:isString?2:4,variant==='foreign'?1:0,isString?6:11,
 ['node_modules/.bin/vitest','run','--config',`${dest}/lab/verify/P2Q/vitest.config.ts`,`${dest}/lab/verify/P2Q/tests/round10-native-probe.test.ts`,`${dest}/lab/verify/P2Q/tests/round9-construction.test.ts`,...(isString?[]:[`${dest}/lab/verify/P2Q/tests/round8-policy.test.ts`]),'-t','round10 real native symbol|round9 actual public surfaces|inventory requires|every executable'],
 {P2Q_VARIANT:variant==='foreign'?'foreign':'symbol',R10_SCRATCH:dest,...(variant==='foreign'?{R10_FAILURE_PATTERN:'unconstructed read: Symbol\\(round10NativeRead\\)'}:{})});
}
for(const kind of ['baseline','direct','inherited','merged']){
 const dest=`${inventory}/${kind}`;
 gate(`inventory-${kind}`,2,kind==='baseline'?0:1,kind==='baseline'?5:6,
 ['node_modules/.bin/vitest','run','--config',`${dest}/lab/verify/P2Q/vitest.config.ts`,`${dest}/lab/verify/P2Q/tests/round8-policy.test.ts`,...(kind==='baseline'?[]:[`${dest}/lab/verify/P2Q/tests/round10-added-read.test.ts`]),'-t','inventory requires|every executable|round10 independent'],
 {R10_SCRATCH:dest,...(kind==='baseline'?{}:{R10_FAILURE_PATTERN:'AssertionError: expected.*to deeply equal'})});
}
fs.writeFileSync(`${base}/controller-finished.json`,JSON.stringify({finished:Date.now(),base,results},null,2)+'\n',{flag:'wx'});
process.exitCode=results.every(r=>r.status===0)?0:1;
