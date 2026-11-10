// [DX-N1] Why: check CPU deltas against real owned work before trusting used-core numbers. Rejected: synthetic parser-only samples.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {NativeCpuSampler} from '../../../bench/lib/native-cpu.ts';
const child=spawn(process.execPath,['-e','setTimeout(()=>{},10000); const end=Date.now()+2000; while(Date.now()<end){}'],{stdio:'ignore'});
try {
 const sampler=new NativeCpuSampler({probe:child.pid});
 await sampler.sample();
 await new Promise(r=>setTimeout(r,1100));
 const row=(await sampler.sample()).probe;
 assert.ok(row.cpuPercent>10 && row.cpuPercent<200,JSON.stringify(row));
 assert.ok(row.memBytes>0);
 console.log(JSON.stringify({diagnostic:true,row}));
} finally {child.kill();await new Promise(r=>child.once('exit',r));}
