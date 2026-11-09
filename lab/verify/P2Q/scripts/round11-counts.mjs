// [CX-VP2Q-11] Why: repeat unchanged inventory mutations after correcting only the controller's expected positive-case count.
// Rejected: rewriting the first rejected receipts or changing the intended inventory failure.
import {spawnSync} from 'node:child_process';
const base=process.argv[2];let failed=false;
for(const kind of ['direct','inherited','merged']){
 const dest=`${base}/inventory-scratch/${kind}`;
 const result=spawnSync('node',['lab/verify/P2Q/scripts/round11-gate.mjs',`inventory-${kind}-count-retry`,'2','1','6','node_modules/.bin/vitest','run','--config',`${dest}/lab/verify/P2Q/vitest.config.ts`,`${dest}/lab/verify/P2Q/tests/round8-policy.test.ts`,`${dest}/lab/verify/P2Q/tests/round10-added-read.test.ts`,'-t','inventory requires|every executable|round10 independent'],{env:{...process.env,R10_EVIDENCE:base,R10_HEAVY_LABEL:'CX-VP2Q-11-R11-counts',R10_HEAVY_PID:String(process.ppid),R10_SCRATCH:dest,R10_FAILURE_PATTERN:'AssertionError: expected.*to deeply equal',R10_PURPOSE:'controller expected three positives; exact selected set is two positives and one intentional inventory failure; unchanged assertion source'},stdio:'inherit'});
 if(result.status!==0)failed=true;
}
process.exitCode=failed?1:0;
