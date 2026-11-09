// [CX-VP2Q-4-R10] Why: rerun all retained matrices in one actual heavy reservation with separate immutable receipts.
// Rejected: adopting builder or earlier-round results (neither is this source/attempt).
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
const durable = `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VP2Q-4/round10/${randomUUID()}`;
fs.mkdirSync(durable, { recursive: true });
const env = {...process.env, R10_EVIDENCE: durable, R10_HEAVY_LABEL:'CX-VP2Q-4-R10-matrices', R10_HEAVY_PID:String(process.ppid)};
const v=['node_modules/.bin/vitest','run','--config','lab/verify/P2Q/vitest.config.ts'];
const t=names=>names.map(n=>`lab/verify/P2Q/tests/${n}.test.ts`);
const tasks=[
 ['earlier-offline',802,0,816,[...v,...t(['round4','round5','round5-delta','round6','round6-codes','round7-q89c','round7-q89c-empty','round7-basis'])]],
 ['new-offline',17,0,23,[...v,...t(['round8-basis','round8-pin-page-corrected','round8-policy','round8-history','round9-construction'])]],
 ['foundation',46,0,46,[...v,...t(['check1-durability','check1-lock-process','check2-ack','check3-routing','check3-outage-scale','check3-probe-load','check4-feed','check5-q31c','check6-a0-guard','q55c-native','round3','round7-audit'])],{V_P2Q_SEEDS:'60'}],
 ['package',224,0,250,['node_modules/.bin/vitest','run','--root','packages/qlever','--maxWorkers','1','--no-file-parallelism']],
 ['core',28,0,28,['node_modules/.bin/vitest','run','--root','packages/core','test/runtime/read-basis.test.ts','test/kv/layers/KvTriples.store.test.ts','test/kv/layers/KvTriples.query.test.ts','--maxWorkers','1','--no-file-parallelism']],
 ['core-tsc','compiler',0,0,['node_modules/.bin/tsc','--noEmit','-p','packages/core/tsconfig.json']],
 ['qlever-source-tsc','compiler',0,0,['node_modules/.bin/tsc','--noEmit','-p','lab/verify/P2Q/scripts/round9-source-typecheck.json']],
 ['earlier-live',54,0,54,[...v,...t(['round4','round7-basis','live/live'])],{V_P2Q_LIVE:'1',QLEVER_URL:'http://127.0.0.1:7070'}],
 ['new-live',7,0,14,[...v,...t(['round8-basis','round8-pin-page-corrected','round8-history']),'-t','round8 live'],{V_P2Q_LIVE:'1',QLEVER_URL:'http://127.0.0.1:7070'}],
 ['catalog-negative',121,1,122,['node','node_modules/vitest/vitest.mjs','run','--config','lab/verify/P2Q/scripts/round7-guard.config.ts'],{R10_FAILURE_PATTERN:'UND_ERR_QA_ADDED_TRANSPORT'}],
];
console.log(JSON.stringify({durable, head:spawnSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).stdout.trim(),pid:process.pid}));
for(const [name,passed,failed,total,command,extra={}] of tasks){
 const free=fs.statfsSync('.');if(free.bavail*free.bsize<5*1024**3)throw Error('below admission floor');
 const result=spawnSync('node',['lab/verify/P2Q/scripts/round10-gate.mjs',name,String(passed),String(failed),String(total),...command],{env:{...env,...extra},stdio:'inherit'});
 console.log(JSON.stringify({completed:name,status:result.status}));
}
fs.writeFileSync(`${durable}/controller-finished.json`,JSON.stringify({finished:Date.now(),durable})+'\n',{flag:'wx'});
