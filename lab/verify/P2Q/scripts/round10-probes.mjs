// [CX-VP2Q-4-R10] Why: keep mutation expectations separate from product gates and bind them to the same current source.
// Rejected: interpreting an expected test failure as acceptance of a product behavior.
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
const durable=`/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VP2Q-4/round10/${randomUUID()}`;
fs.mkdirSync(durable,{recursive:true});
const env={...process.env,R10_EVIDENCE:durable,R10_HEAVY_LABEL:'CX-VP2Q-4-R10-probes',R10_HEAVY_PID:String(process.ppid)};
console.log(JSON.stringify({durable}));
function gate(name,p,f,t,cmd,extra={}){const result=spawnSync('node',['lab/verify/P2Q/scripts/round10-gate.mjs',name,String(p),String(f),String(t),...cmd],{env:{...env,...extra},stdio:'inherit'});console.log(JSON.stringify({name,status:result.status}));}
gate('construction',20,0,20,['node_modules/.bin/vitest','run','--config','lab/verify/P2Q/vitest.config.ts','lab/verify/P2Q/tests/round10-construction.test.ts','lab/verify/P2Q/tests/round10-types.test.ts']);
const scratch=spawnSync('node',['lab/verify/P2Q/scripts/round10-scratch.mjs'],{env,stdio:'inherit'});if(scratch.status!==0)throw Error('scratch setup failed');
for(const kind of ['baseline','direct','inherited','merged']){
 const base=`lab/verify/P2Q/scratch-round10/${kind}`;
 gate(`inventory-${kind}`,2,kind==='baseline'?0:1,kind==='baseline'?5:6,['node_modules/.bin/vitest','run','--config',`${base}/lab/verify/P2Q/vitest.config.ts`,`${base}/lab/verify/P2Q/tests/round8-policy.test.ts`,...(kind==='baseline'?[]:[`${base}/lab/verify/P2Q/tests/round10-added-read.test.ts`]),'-t','inventory requires|every executable|round10 independent'],{R10_SCRATCH:base,...(kind==='baseline'?{}:{R10_FAILURE_PATTERN:'AssertionError: expected.*to deeply equal.*round8-policy.test.ts'})});
}
