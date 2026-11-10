// [DX-B6-5] Why: pause the actual owned Java peer, not an entrypoint shell, with the 30 ms timer inside the VM.
// Rejected: assuming container PID 1 is Java or counting Mac/Docker round-trip time as pause duration.
import {execFileSync} from 'node:child_process';
const prefix=process.argv[2];
if(!/^tx2-dxb6-[a-z0-9-]+$/.test(prefix))throw Error('wrong owner prefix');
const container=`${prefix}-gw-r`;
const docker=args=>execFileSync('docker',['--host','unix:///Users/sam/.colima/triplex2/docker.sock',...args],{encoding:'utf8'});
const ids=docker(['exec',container,'sh','-c','for f in /proc/[0-9]*/comm; do read n < "$f" || continue; if [ "$n" = java ]; then p=${f#/proc/}; echo "${p%/comm}"; fi; done']).trim().split(/\s+/);
if(ids.length!==1||!/^\d+$/.test(ids[0]))throw Error('expected exactly one owned Java peer');
const pid=ids[0];
console.log(JSON.stringify({pausedProcess:{container,pid:Number(pid),comm:'java'},pauseMs:30}));
let stopping=false,pauses=0;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
process.once('SIGTERM',()=>{stopping=true;try{docker(['exec',container,'kill','-CONT',pid])}catch{};console.log(JSON.stringify({pauses}));process.exit(0)});
while(!stopping){await sleep(100+Math.random()*200);docker(['exec',container,'sh','-c',`kill -STOP ${pid}; sleep 0.03; kill -CONT ${pid}`]);pauses++}
