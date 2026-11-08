// [EXP-G03] Why: execute fixtures in the real box, including failure and teardown paths.
// Rejected: mock Docker results as proof of isolation.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { BoxExecutor } from '../../bin/box.mjs';
import { REPO, sha256 } from '../../bin/lib.mjs';
const stamp=Date.now(), dir=path.join(REPO,'runs/g03-smoke',String(stamp));fs.mkdirSync(dir,{recursive:true});
const config={...JSON.parse(fs.readFileSync('lab/experiments/EXP-G03/box.json')),caseTimeoutMs:1500,stdoutMaxBytes:4096};
const objects=path.join(dir,'objects');fs.mkdirSync(objects);const put=b=>{b=Buffer.isBuffer(b)?b:Buffer.from(JSON.stringify(b));const h=sha256(b);fs.writeFileSync(path.join(objects,h),b);return h};
const results=[];let box;
async function check(id,fn){try{await fn();results.push({id,status:'PASS'})}catch(e){results.push({id,status:'FAIL',error:String(e)})}}
try {
 box=new BoxExecutor({config,workDir:dir,put,holder:'CX-G03'});
 await check('toolchain-store',()=>box.attestStore());
 const volume=box.volume('instance');box.seed(volume,new Map([['package.json',{mode:'100644',bytes:Buffer.from('{}')}]]));
 const instance={volume};
 await check('oracle-python-host-absent-readonly-input',()=>{
 const script="const fs=require('node:fs'),cp=require('node:child_process');if(fs.existsSync('/work/lab')||fs.existsSync('/Users')||cp.spawnSync('python3',['--version']).status===0)throw Error('oracle path present');let ro=false;try{fs.writeFileSync('/work/modified','x')}catch{ro=true}if(!ro)throw Error('work writable');console.log('{}')";
 assert.equal(box.case(instance,Buffer.from('{}'),'normal',['node','-e',script]).exit,0);
 });
 await check('survivor-rejected-and-cgroup-gone',()=>{
 assert.throws(()=>box.case(instance,Buffer.from('{}'),'normal',['node','-e',"require('node:child_process').spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{detached:true,stdio:'ignore'}).unref();console.log('{}')"]),/SURVIVOR/);
 });
 await check('output-cap-kills-container',()=>{
 assert.throws(()=>box.case(instance,Buffer.from('{}'),'normal',['node','-e',"process.stdout.write('x'.repeat(100000))"]));
 });
 await check('timeout-kills-container',()=>{
 assert.throws(()=>box.case(instance,Buffer.from('{}'),'normal',['node','-e',"setInterval(()=>{},1000)"]));
 });
 await check('pid-one-termination-fails-closed',()=>{
 assert.throws(()=>box.case(instance,Buffer.from('{}'),'normal',['node','-e',"process.kill(1,'SIGTERM');setTimeout(()=>console.log('{}'),500)"]));
 });
 await check('walker-rejects-outside-link',()=>{
 const build=box.create('link-fixture',{argv:['node','-e',"require('node:fs').symlinkSync('/etc/passwd','/work/link')"],mounts:[{name:volume,target:'/work',rw:true}],memory:134217728});
 assert.equal(box.start(build).status,0);box.remove(build);assert.throws(()=>box.walk(volume),/walker failed/);
 });
} catch(e){results.push({id:'setup',status:'FAIL',error:String(e)})}
finally {if(box)try{box.close()}catch(e){results.push({id:'cleanup',status:'FAIL',error:String(e)})}
 const report={stamp,config,results,records:box?.records,remaining:box?.resources,objects};fs.writeFileSync(`lab/experiments/EXP-G03/smoke-${stamp}.json`,JSON.stringify(report,null,2)+'\n');
 process.exitCode=results.some(r=>r.status==='FAIL')?2:0;
}
