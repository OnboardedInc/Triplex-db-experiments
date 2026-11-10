// [DX-B6] Why: terminate the complete owned child process group before removing its engines.
// Rejected: killing only the wrapper (orphan test clients can race the next stack on reused ports).
import {spawn} from 'node:child_process';
const [seconds,...args]=process.argv.slice(2);
const child=spawn(args[0],args.slice(1),{stdio:'inherit',detached:true});
let stopped=false;
function stop(){if(stopped)return;stopped=true;try{process.kill(-child.pid,'SIGTERM')}catch{};setTimeout(()=>{try{process.kill(-child.pid,'SIGKILL')}catch{}},2000).unref()}
process.once('SIGTERM',stop);process.once('SIGINT',stop);
const timer=setTimeout(stop,Number(seconds)*1000);
child.on('exit',(code,signal)=>{clearTimeout(timer);process.exit(stopped?124:code??(signal?1:0))});
