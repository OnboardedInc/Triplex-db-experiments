import { spawn } from 'node:child_process';
// [DX-M1] Why: retain one heavy grant across remaining trials while each child takes its own measurement lease. Rejected: a new heavy-slot race after every five-minute run.
const deadline=Date.parse(process.argv[2]);
if(!Number.isFinite(deadline)||deadline<=Date.now())throw Error('future ISO deadline required');
let child,stopping=false;
function stop(){stopping=true;child?.kill('SIGTERM');}
const timer=setTimeout(stop,deadline-Date.now());
process.on('SIGTERM',stop);process.on('SIGINT',stop);
const late=Date.now()>deadline-12*60000;
const trials=late?[['Z','txz1','Z'],['P','1']]:[['S','2b'],['P','1'],['Z','txz1','Z']];
console.log(new Date().toISOString(),'BUDGET ORDER',JSON.stringify(trials));
try {
 for(const args of trials) {
  if(stopping)break;
  // [DX-M1] Why: preserve time for the transactor collector question if admission consumes the budget. Rejected: spending the last window only repeating an existing transactor control.
  if(args[0]==='P'&&Date.now()>deadline-(late?6:11)*60000){console.log(new Date().toISOString(),'SKIP P: reserve final window for transactor ZGC');continue;}
  console.log(new Date().toISOString(),'TRIAL',args.join(' '));
  const rc=await new Promise(resolve=>{child=spawn('bash',['lab/experiments/EXP-DX1/m1/collectors.sh',...args],{stdio:'inherit',env:{...process.env,M1_ADMISSION_DEADLINE_EPOCH:String(Math.floor((deadline-6*60000)/1000))}});child.on('exit',(code,signal)=>resolve(code??(signal?143:1)));child.on('error',()=>resolve(127));});
  child=undefined;console.log(new Date().toISOString(),'TRIAL EXIT',args.join(' '),rc);
 }
} finally {clearTimeout(timer);process.exitCode=stopping?143:0;}
