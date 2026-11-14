import fs from 'node:fs';
import {spawn} from 'node:child_process';
// [DX-H3] Why: raw scan intervals and client CPU must survive driver failure. Rejected: final-report-only telemetry.
const out='runs/DX-H3-vm';
// [DX-R3] Why: direct observe invocations and the H4 wrapper must agree on which current index serves reads.
// Rejected: ignoring DX_READ_PATH in the child process while the surrounding run claims replica.
const args=process.argv.slice(2);
if(!args.includes('--read-path')) args.push('--read-path',process.env.DX_READ_PATH??'gateway');
const debug=process.env.TRIPLEX_TRACE_DEBUG==='1'?['--inspect=0.0.0.0:8508']:[];
// [DX-T1-4] Why: an opt-in sampled writer stack identifies work spanning a late scheduler timer.
// Rejected: attributing every unobserved stall to GC or enabling profiler cost in summary.
const profile=process.env.TRIPLEX_TRACE_CPU_PROFILE==='1'?['--cpu-prof','--cpu-prof-dir=/driver/trace/raw','--cpu-prof-interval=1000']:[];
// [DX-T1-5] Why: native package and differential gates share the owned smoke lease before its timed workload.
// Rejected: a second ad hoc Docker lifecycle, or inferring exactness from mocked clock tests.
if (['1','clock'].includes(process.env.DX_NATIVE_GATES ?? '')) {
  const gates = [
    ['node_modules/.bin/vitest','run','--config','lab/experiments/EXP-DX1/b5/vitest.config.ts','--testTimeout','900000',
      ...(process.env.DX_NATIVE_GATES === '1' ? ['packages/datomic/test/layout-differential.test.ts','packages/datomic/test/concurrent-commits.test.ts'] : []),'packages/datomic/test/clock-order.test.ts'],
    ['node','--experimental-strip-types','lab/experiments/EXP-DX1/r3/differential.ts'],
  ];
  for (const command of gates) {
    const rc = await new Promise(resolve => {
      const gate = spawn(command[0],command.slice(1),{stdio:'inherit',env:{...process.env,DATOMIC_INTEGRATION:'1',
        DATOMIC_GATEWAY_URL:process.env.DATOMIC_URL,DX_B5_SCENARIOS:'300',DX_CLOCK_EVIDENCE_DIR:'/driver/native-gates'}});
      gate.on('exit',code=>resolve(code??1));gate.on('error',()=>resolve(127));
      for(const sig of ['SIGTERM','SIGINT'])process.once(sig,()=>gate.kill(sig));
    });
    if (rc !== 0) process.exit(Number(rc));
  }
}
const child=spawn('node',[...debug,...profile,'--experimental-strip-types','lab/bench/driver.ts',...args],{stdio:'inherit'});
let active=true;
const system = process.env.TRIPLEX_TRACE_SYSTEM === '1' || (process.env.TRIPLEX_TRACE_LEVEL && process.env.TRIPLEX_TRACE_LEVEL !== 'off')
  ? spawn('node',['lab/trace/system-sampler.mjs','/driver/trace/raw'],{stdio:'inherit'}) : null;
async function sample() {
  const row={at:new Date().toISOString(),peers:/** @type {Record<string, unknown>} */ ({})};
  // [DX-T1-2] Why: tuple roles stay strings even when a diagnostic URL is absent. Rejected: skipping missing URLs (changes recorded errors).
  for(const [role,url] of /** @type {Array<[string, string | undefined]>} */ ([['w',process.env.DATOMIC_URL],['r',process.env.DATOMIC_READ_URLS]])) {
    try {const r=await fetch(url+'/v2/admin/scan-stats',{signal:AbortSignal.timeout(5000)});row.peers[role]={status:r.status,body:await r.text()};}
    catch(e){row.peers[role]={error:String(e)};}
  }
  fs.appendFileSync(out+'/scan-stats.jsonl',JSON.stringify(row)+'\n');
}
const poll=(async()=>{while(active){await sample();await new Promise(r=>setTimeout(r,5000));}})();
for(const sig of /** @type {NodeJS.Signals[]} */ (['SIGTERM','SIGINT'])) process.on(sig,()=>child.kill(sig));
child.on('exit',async(code,signal)=>{active=false;system?.kill('SIGTERM');await poll;await sample();process.exitCode=code??1;});
