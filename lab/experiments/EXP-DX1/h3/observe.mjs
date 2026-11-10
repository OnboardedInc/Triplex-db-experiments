import fs from 'node:fs';
import {spawn} from 'node:child_process';
// [DX-H3] Why: raw scan intervals and client CPU must survive driver failure. Rejected: final-report-only telemetry.
const out='runs/DX-H3-vm';
const child=spawn('node',['--experimental-strip-types','lab/bench/driver.ts',...process.argv.slice(2)],{stdio:'inherit'});
let active=true;
async function sample() {
  const row={at:new Date().toISOString(),peers:{}};
  for(const [role,url] of [['w',process.env.DATOMIC_URL],['r',process.env.DATOMIC_READ_URLS]]) {
    try {const r=await fetch(url+'/v2/admin/scan-stats',{signal:AbortSignal.timeout(5000)});row.peers[role]={status:r.status,body:await r.text()};}
    catch(e){row.peers[role]={error:String(e)};}
  }
  fs.appendFileSync(out+'/scan-stats.jsonl',JSON.stringify(row)+'\n');
}
const poll=(async()=>{while(active){await sample();await new Promise(r=>setTimeout(r,5000));}})();
for(const sig of ['SIGTERM','SIGINT']) process.on(sig,()=>child.kill(sig));
child.on('exit',async(code,signal)=>{active=false;await poll;await sample();process.exitCode=code??1;});
