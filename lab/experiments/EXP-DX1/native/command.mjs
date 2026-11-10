// [DX-N1] Why: bound the entire owned client group, including vitest workers. Rejected: signalling only pnpm.
import {spawn,execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
if(process.platform==='darwin')execFileSync('/usr/sbin/taskpolicy',['-B','-p',String(process.pid)]);
const child=spawn(process.argv[2],process.argv.slice(3),{stdio:'inherit',detached:true});
const nativeDir=process.env.TX2_NATIVE_RUN_DIR||process.env.DX_N1_OUTPUT;
if(process.platform==='darwin'&&nativeDir?.startsWith('/Users/sam/Claude/Projects/triplex-db-2/native/runs/')){
 const record=()=>{try{
  const identity=execFileSync('ps',['-p',String(child.pid),'-o','lstart=,command='],{encoding:'utf8'}).trim();
  fs.writeFileSync(path.join(nativeDir,'client.pid.json'),JSON.stringify({pid:child.pid,identity,wrapperPid:process.pid,policy:'taskpolicy -B; disk default; throughput tier 0; latency tier 0; no clamp'}));
  fs.writeFileSync(path.join(nativeDir,'client-policy.txt'),execFileSync('ps',['-p',String(child.pid),'-o','pid,ppid,stat,ni,flags,command'],{encoding:'utf8'}));
 }catch{}};
 record();
}
let stopping=false,timer;
function stop(){if(stopping)return;stopping=true;try{process.kill(-child.pid,'SIGTERM')}catch{};timer=setTimeout(()=>{try{process.kill(-child.pid,'SIGKILL')}catch{}},2000);}
process.on('SIGTERM',stop);process.on('SIGINT',stop);
child.on('error',e=>{console.error(e);process.exitCode=127;});
child.on('exit',code=>{if(timer)clearTimeout(timer);if(stopping){try{process.kill(-child.pid,'SIGKILL')}catch{}}process.exitCode=stopping?124:code??1;});
