// [CX-VP2Q-11] Why: retain the first sandbox-denied attempt and rerun the unchanged process cases with inspection available.
// Rejected: skipping process assertions or relabeling the original failed receipt.
import {spawnSync} from 'node:child_process';
const [base,kind]=process.argv.slice(2);
const env={...process.env,R10_EVIDENCE:base,R10_HEAVY_LABEL:'CX-VP2Q-11-R11-retry',R10_HEAVY_PID:String(process.ppid),R10_PURPOSE:kind==='foundation'?'rerun after sandbox denied pgrep process inspection':'correct only expected count metadata; retain first receipt'};
let name,p,f,t,command;
const v=['node_modules/.bin/vitest','run','--config','lab/verify/P2Q/vitest.config.ts'];
if(kind==='foundation'){
 name='foundation-inspection-retry';p=46;f=0;t=46;
 command=[...v,...['check1-durability','check1-lock-process','check2-ack','check3-routing','check3-outage-scale','check3-probe-load','check4-feed','check5-q31c','check6-a0-guard','q55c-native','round3','round7-audit'].map(n=>`lab/verify/P2Q/tests/${n}.test.ts`)];env.V_P2Q_SEEDS='60';
}else if(kind==='independent'){
 name='independent-extension-fixture-retry';p=7;f=0;t=7;command=[...v,'lab/verify/P2Q/tests/round11-types.test.ts','lab/verify/P2Q/tests/round11-surface.test.ts'];env.R10_PURPOSE='fix own shadowing fixture via defineProperties; add cross-service private-provenance controls; retain original failure';
}else if(kind==='package'){
 name='package-inspection-retry';p=224;f=0;t=250;command=['node_modules/.bin/vitest','run','--root','packages/qlever','--maxWorkers','1','--no-file-parallelism'];
}else if(['direct','inherited','merged'].includes(kind)){
 name=`inventory-${kind}-count-retry`;p=2;f=1;t=6;const dest=`${base}/inventory-scratch/${kind}`;
 command=['node_modules/.bin/vitest','run','--config',`${dest}/lab/verify/P2Q/vitest.config.ts`,`${dest}/lab/verify/P2Q/tests/round8-policy.test.ts`,`${dest}/lab/verify/P2Q/tests/round10-added-read.test.ts`,'-t','inventory requires|every executable|round10 independent'];
 env.R10_SCRATCH=dest;env.R10_FAILURE_PATTERN='AssertionError: expected.*to deeply equal';
}else throw Error('unsupported retry');
const result=spawnSync('node',['lab/verify/P2Q/scripts/round11-gate.mjs',name,String(p),String(f),String(t),...command],{env,stdio:'inherit'});process.exitCode=result.status??1;
