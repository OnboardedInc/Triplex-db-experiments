import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
// [DX-M2] Why: verify timeout cleanup when a direct child exits before its stubborn descendant.
// Rejected: checking only the wrapper's exit code (can leave a live test client behind).
const runner = fileURLToPath(new URL('./run-owned.mjs', import.meta.url));
async function launch(code, onOutput = () => {}) {
  const p = spawn(process.execPath, [runner, process.execPath, '-e', code], { stdio: ['ignore', 'pipe', 'inherit'] });
  p.stdout.on('data', b => onOutput(p, b.toString()));
  return await new Promise((resolve, reject) => { p.once('error', reject); p.once('exit', (code, signal) => resolve({code, signal})); });
}
assert.equal((await launch('process.exit(23)')).code, 23);
let ids;
const outcome = await launch(`
const {spawn}=require('node:child_process');
const p=spawn(process.execPath,['-e','process.on("SIGTERM",()=>{});console.log("ready");setInterval(()=>{},1000)'],{stdio:['ignore','pipe','inherit']});
p.stdout.once('data',()=>console.log(JSON.stringify({child:process.pid,grandchild:p.pid})));
setInterval(()=>{},1000);
`, (wrapper, text) => {
  ids = JSON.parse(text);
  wrapper.kill('SIGTERM');
});
assert.equal(outcome.code, 124);
assert.ok(ids);
const alive = pid => { try { process.kill(pid, 0); return true; } catch (e) { if (e.code === 'ESRCH') return false; throw e; } };
for (let i=0; i<20 && (alive(ids.child) || alive(ids.grandchild)); i++) await new Promise(r=>setTimeout(r,100));
assert.equal(alive(ids.child), false);
assert.equal(alive(ids.grandchild), false);
console.log(JSON.stringify({ propagatedExit:23, stoppedExit:outcome.code, childGone:true, grandchildGone:true }));
