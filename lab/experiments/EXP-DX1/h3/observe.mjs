import fs from 'node:fs';
import {spawn} from 'node:child_process';
// [DX-H3] Why: raw scan intervals and client CPU must survive driver failure. Rejected: final-report-only telemetry.
const out='runs/DX-H3-vm';
// [DX-R3] Why: direct observe invocations and the H4 wrapper must agree on which current index serves reads.
// Rejected: ignoring DX_READ_PATH in the child process while the surrounding run claims replica.
const args=process.argv.slice(2);
if(!args.includes('--read-path')) args.push('--read-path',process.env.DX_READ_PATH??'gateway');
const debug=process.env.TRIPLEX_TRACE_DEBUG==='1'?['--inspect=0.0.0.0:8508']:[];
const child=spawn('node',[...debug,'--experimental-strip-types','lab/bench/driver.ts',...args],{stdio:'inherit'});
let active=true;
const system = process.env.TRIPLEX_TRACE_SYSTEM === '1' || (process.env.TRIPLEX_TRACE_LEVEL && process.env.TRIPLEX_TRACE_LEVEL !== 'off')
  ? spawn('node',['lab/trace/system-sampler.mjs','/driver/trace/raw'],{stdio:'inherit'}) : null;
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
child.on('exit',async(code,signal)=>{active=false;system?.kill('SIGTERM');await poll;await sample();process.exitCode=code??1;});
