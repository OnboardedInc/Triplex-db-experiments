// [EXP-RQ01-QA2] Why: execute original/repair guard modes within one admitted heavy job and retain exits.
// Rejected: executing expected-failure probes outside the lab wrapper.
import {spawnSync} from 'node:child_process';
for(const mode of ['original','repair']){
 const r=spawnSync('node',['lab/verify/RQ01/round2/guard.mjs',mode],{stdio:'inherit'});
 if(r.status!==0)process.exit(r.status??1);
}
