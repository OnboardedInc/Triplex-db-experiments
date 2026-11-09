import './disk-guard.mjs';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createInterface } from 'node:readline';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
// [CX-VFD01-R2] Why: performance.now has a different origin in each consumer/source process.
// Rejected: assuming identical clock labels establish a shared numerical origin.
if(process.argv[2]==='child') {
  const sample=()=>JSON.stringify({atMonoMs:performance.now(),originMs:performance.timeOrigin,hostNs:String(process.hrtime.bigint())})+'\n';
  process.stdout.write(sample());
  createInterface({input:process.stdin}).on('line',()=>process.stdout.write(sample()));
} else {
  const {base}=await import('./hook.mjs');
  const {publicationLagMs}=await import('@triplex-build/triplex/feed');
  const start=async()=>{
    const p=spawn(process.execPath,[fileURLToPath(import.meta.url),'child'],{stdio:['pipe','pipe','inherit']});
    const lines=createInterface({input:p.stdout}); await once(lines,'line');
    return {p,lines};
  };
  const sample=async({p,lines})=>{const next=once(lines,'line');p.stdin.write('sample\n');return JSON.parse((await next)[0]);};
  const source=await start();
  await new Promise(r=>setTimeout(r,250));
  const consumer=await start();
  const published=await sample(source);
  await new Promise(r=>setTimeout(r,400));
  const completed=await sample(consumer);
  source.p.stdin.end();consumer.p.stdin.end();
  const key={source:'generic/source',stream:'s',epoch:'1',position:'1',clock:'host-monotonic'};
  const reported=publicationLagMs({...key,atMonoMs:published.atMonoMs},{...key,atMonoMs:completed.atMonoMs});
  const hostLagMs=Number(BigInt(completed.hostNs)-BigInt(published.hostNs))/1e6;
  const result={published,completed,reportedLagMs:reported,commonHostClockLagMs:hostLagMs,reportedUnderBar:reported<=250,trueUnderBar:hostLagMs<=250,
    note:'Two real local Node processes; no wall-clock adjustment or engine. Relative performance clocks share a label but not an origin.'};
  assert.ok(hostLagMs>350);assert.ok(reported<250);assert.ok(reported>=0);
  fs.writeFileSync(base+'/cross-process.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}
