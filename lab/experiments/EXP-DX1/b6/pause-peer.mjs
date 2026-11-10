// [DX-B6-5] Why: stop only the owned read peer briefly while commits continue through the write peer.
// Rejected: pausing the transactor (would test write stalls instead of peer lag).
import { execFileSync } from 'node:child_process';
const prefix=process.argv[2];
if(!/^tx2-dxb6-[a-z0-9-]+$/.test(prefix))throw Error('wrong owner prefix');
const docker=(signal)=>execFileSync('docker',['--host','unix:///Users/sam/.colima/triplex2/docker.sock','kill','--signal',signal,`${prefix}-gw-r`],{stdio:'ignore'});
let stopping=false, pauses=0;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
process.once('SIGTERM',()=>{stopping=true;try{docker('CONT')}catch{};console.log(JSON.stringify({pauses}));process.exit(0)});
while(!stopping){await sleep(100+Math.random()*200);docker('STOP');pauses++;try{await sleep(30)}finally{docker('CONT')}}
