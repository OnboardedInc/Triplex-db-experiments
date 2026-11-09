// [CX-VP2Q-4-R10] Why: validate actual guards and the native policy-bypass witness on one exact isolated source mutation.
// Rejected: modifying a guard to bless the added operation.
import fs from 'node:fs';import {spawnSync} from 'node:child_process';import {randomUUID} from 'node:crypto';
const durable=`/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VP2Q-4/round10/${randomUUID()}`;fs.mkdirSync(durable,{recursive:true});console.log(JSON.stringify({durable}));
const setup=spawnSync('node',['lab/verify/P2Q/scripts/round10-launder-scratch.mjs'],{stdio:'inherit'});if(setup.status!==0)process.exit(setup.status??1);
const scratch='lab/verify/P2Q/scratch-round10/native-launder';
const result=spawnSync('node',['lab/verify/P2Q/scripts/round10-gate.mjs','native-launder','8','0','11','node_modules/.bin/vitest','run','--config',`${scratch}/lab/verify/P2Q/vitest.config.ts`,`${scratch}/lab/verify/P2Q/tests/round8-policy.test.ts`,`${scratch}/lab/verify/P2Q/tests/round9-construction.test.ts`,`${scratch}/lab/verify/P2Q/tests/round10-native-launder.test.ts`,'-t','inventory requires|every executable|round9 |round10 native laundering'],{env:{...process.env,R10_EVIDENCE:durable,R10_HEAVY_LABEL:'CX-VP2Q-4-R10-launder',R10_HEAVY_PID:String(process.ppid),R10_SCRATCH:scratch},stdio:'inherit'});process.exitCode=result.status??1;
