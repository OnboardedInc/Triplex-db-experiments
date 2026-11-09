// [EXP-DX1] Why: wait for the measurement lock before consuming a shared heavy token.
// Rejected: holding a scarce heavy slot while waiting for another timed window.
import fs from "node:fs";
import { spawn } from "node:child_process";
const [label, script] = process.argv.slice(2);
if (!label || !script) throw Error("usage: measure.mjs LABEL SCRIPT");
const lock = "/Users/sam/Claude/Projects/triplex-db-2/locks/measure";
const started = Date.now();
let announced = 0;
for (;;) {
  try { fs.mkdirSync(lock); break; }
  catch (e) {
    if (e.code !== "EEXIST") throw e;
    if (Date.now() - started > 30 * 60_000) throw Error("Measurement lock wait exceeded 30 minutes");
    if (Date.now() - announced > 30_000) { process.stderr.write(`[DX-B1] waiting for measurement lock (${Math.floor((Date.now()-started)/1000)}s)\n`); announced = Date.now(); }
    await new Promise(r => setTimeout(r, 5000));
  }
}
let held = true;
const release = () => { if (held) { fs.rmdirSync(lock); held = false; } };
process.once("exit", release);
const child = spawn(process.execPath,["lab/bin/heavy.mjs","--label",label,"--",process.execPath,script],{stdio:"inherit",env:{...process.env,DX1_MEASUREMENT_LOCK_HELD:"1"}});
for (const signal of ["SIGINT","SIGTERM"]) process.on(signal,()=>child.kill(signal));
const timer = setTimeout(()=>child.kill("SIGTERM"),14*60_000);
const code = await new Promise((resolve,reject)=>{child.once("close",code=>resolve(code??130));child.once("error",reject);});
clearTimeout(timer);release();process.exitCode=code;
