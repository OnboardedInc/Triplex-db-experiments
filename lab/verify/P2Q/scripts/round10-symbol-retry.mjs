// [CX-VP2Q-4-R10] Why: bind the native-symbol scratch counterexample and actual unchanged guards to a fresh slot.
// Rejected: accepting an old scratch result without its exact mutated inputs.
import fs from 'node:fs';import {spawnSync} from 'node:child_process';import {randomUUID} from 'node:crypto';
const durable=`/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VP2Q-4/round10/${randomUUID()}`;fs.mkdirSync(durable,{recursive:true});console.log(JSON.stringify({durable}));
const s=spawnSync('node',['lab/verify/P2Q/scripts/round10-symbol-scratch-retry.mjs'],{stdio:'inherit'});if(s.status!==0)process.exit(s.status??1);
const scratch='lab/verify/P2Q/scratch-round10/native-symbol-retry';
const result=spawnSync('node',['lab/verify/P2Q/scripts/round10-gate.mjs','native-symbol','4','0','11','node_modules/.bin/vitest','run','--config',`${scratch}/lab/verify/P2Q/vitest.config.ts`,`${scratch}/lab/verify/P2Q/tests/round8-policy.test.ts`,`${scratch}/lab/verify/P2Q/tests/round9-construction.test.ts`,`${scratch}/lab/verify/P2Q/tests/round10-native-symbol.test.ts`,'-t','inventory requires|every executable|round9 actual public surfaces|round10 real native symbol'],{env:{...process.env,R10_EVIDENCE:durable,R10_HEAVY_LABEL:'CX-VP2Q-4-R10-symbol-retry',R10_HEAVY_PID:String(process.ppid),R10_SCRATCH:scratch},stdio:'inherit'});process.exitCode=result.status??1;
