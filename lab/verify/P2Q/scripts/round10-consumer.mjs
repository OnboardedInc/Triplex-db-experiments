// [CX-VP2Q-4-R10] Why: retain a fresh compiler-checked consumer witness for the symbol counterexample.
// Rejected: treating transpilation as type acceptance.
import fs from 'node:fs';import {spawnSync} from 'node:child_process';import {randomUUID} from 'node:crypto';
const durable=`/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VP2Q-4/round10/${randomUUID()}`;fs.mkdirSync(durable,{recursive:true});console.log(JSON.stringify({durable}));
const result=spawnSync('node',['lab/verify/P2Q/scripts/round10-gate.mjs','symbol-consumer','1','0','1','node_modules/.bin/vitest','run','--config','lab/verify/P2Q/vitest.config.ts','lab/verify/P2Q/tests/round10-public-type.test.ts'],{env:{...process.env,R10_EVIDENCE:durable,R10_HEAVY_LABEL:'CX-VP2Q-4-R10-consumer',R10_HEAVY_PID:String(process.ppid),R10_SCRATCH:'lab/verify/P2Q/scratch-round10/native-symbol-retry'},stdio:'inherit'});process.exitCode=result.status??1;
