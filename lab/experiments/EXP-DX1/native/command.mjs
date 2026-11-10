// [DX-N1] Why: bound the entire owned client group, including vitest workers. Rejected: signalling only pnpm.
import {spawn,execFileSync} from 'node:child_process';
if(process.platform==='darwin')execFileSync('/usr/sbin/taskpolicy',['-B','-p',String(process.pid)]);
const child=spawn(process.argv[2],process.argv.slice(3),{stdio:'inherit',detached:true});
let stopping=false,timer;
function stop(){if(stopping)return;stopping=true;try{process.kill(-child.pid,'SIGTERM')}catch{};timer=setTimeout(()=>{try{process.kill(-child.pid,'SIGKILL')}catch{}},2000);}
process.on('SIGTERM',stop);process.on('SIGINT',stop);
child.on('error',e=>{console.error(e);process.exitCode=127;});
child.on('exit',code=>{if(timer)clearTimeout(timer);if(stopping){try{process.kill(-child.pid,'SIGKILL')}catch{}}process.exitCode=stopping?124:code??1;});
