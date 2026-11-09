import { execFileSync } from 'node:child_process';
// [CX-VFD01-R2] Why: disk can fall below admission threshold while a heavy job waits in the shared queue.
// Rejected: checking only when the wrapper is launched, before its reservation is obtained.
const row=execFileSync('df',['-Pk','.'],{encoding:'utf8'}).trim().split('\n').at(-1).trim().split(/\s+/);
const freeBytes=Number(row[3])*1024;
if(freeBytes<5*1024**3){console.error(JSON.stringify({blocked:'host-free-below-5GiB',freeBytes}));process.exit(75);}
