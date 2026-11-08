// [EXP-G03] Why: record actual isolation observations before a qualification build.
// Rejected: interpreting documented Docker flags as measured containment.
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { spawnSync } from 'node:child_process';
import { docker, dockerArgs, inspect, REPO } from '../../bin/lib.mjs';
import { HARDEN, BOX_ENV } from '../../bin/box.mjs';
const dir = path.join(REPO, 'lab/experiments/EXP-G03');
const base = JSON.parse(fs.readFileSync(path.join(dir, 'base.json')));
const run = `probe-${Date.now()}`, holder = 'CX-G03', prefix = `tx2-g03-${run}-`, resources = [], results = [];
function engine(action, extra = []) {
 const r=spawnSync(process.execPath,['lab/bin/engine.mjs','box',action,'--run',run,'--holder',holder,...extra],{encoding:'utf8',timeout:180000});
 if(r.status!==0)throw Error(r.stderr||r.error||r.stdout);return JSON.parse(r.stdout);
}
function create(suffix, argv, network='none', extra=[], memory=67108864) {
 const name=prefix+suffix, request=path.join(dir,`probe-request-${suffix}.json`);
 fs.writeFileSync(request,JSON.stringify({memory,args:[...HARDEN,'--cpus','0.25','--pids-limit','64','--network',network,...BOX_ENV.flatMap(e=>['--env',e]),...extra,base.Id,...argv]}));
 engine('create',['--name',name,'--request',request]);resources.push(['container',name]);return name;
}
function remove(name) { engine('remove',['--name',name]);resources.splice(resources.findIndex(([,n])=>n===name),1); }
async function probe(id, fn) {try{results.push({id,status:'PASS',observation:await fn()});}catch(e){results.push({id,status:'BLOCKED_OR_FAIL',error:String(e)});}fs.writeFileSync(path.join(dir,`probes-${run}.json`),JSON.stringify({run,at:new Date().toISOString(),base:base.Id,results},null,2)+'\n');}
const canary=net.createServer();await new Promise(resolve=>canary.listen(0,'127.0.0.1',resolve));
try {
 await probe('P1',()=>{
 const network=prefix+'net';engine('network',['--name',network]);resources.push(['network',network]);
 const server=create('server',['node','-e',"require('node:net').createServer(s=>s.end('ok')).listen(8080,'0.0.0.0')"],network);docker(['start',server]);
 const ip=Object.values(inspect(server).NetworkSettings.Networks)[0].IPAddress;
 const script=`const net=require('node:net');function connect(host,port){return new Promise(r=>{let done=false;const s=net.connect({host,port});const end=v=>{if(done)return;done=true;s.destroy();r(v)};s.setTimeout(1500,()=>end(false));s.on('error',()=>end(false));s.on('connect',()=>end(true))})};(async()=>{const positive=await connect(${JSON.stringify(ip)},8080);const mac=await connect('192.168.5.2',${canary.address().port});const vm=await connect('192.168.5.1',${canary.address().port});console.log(JSON.stringify({positive,mac,vm}));process.exit(positive&&!mac&&!vm?0:2)})()`;
 const client=create('client',['node','-e',script],network);const out=docker(['start','-a',client]);const code=inspect(client).State.ExitCode;remove(client);remove(server);if(code!==0)throw Error(out);return JSON.parse(out);
 });
 await probe('P2',()=>{throw Error('NOT RUN: Q86g H2 VM egress changes await Sam; no VM network settings changed');});
 await probe('P3',()=>{
 const script="require('node:child_process').spawn(process.execPath,['-e',\"setInterval(()=>require('node:fs').appendFileSync('/tmp/heartbeat','x'),50)\"],{detached:true,stdio:'ignore'}).unref();setInterval(()=>{},1000)";
 const runner=create('heartbeat',['node','-e',script],'none',[],134217728);docker(['start',runner]);const id=inspect(runner).Id;let top='';for(let i=0;i<30;i++){top=docker(['top',runner,'-eo','pid,ppid,sid,comm']);if(top.split('\n').length>=3)break;Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,100);}if(top.split('\n').length<3)throw Error('detached helper never observed: '+top);remove(runner);
 const proof=create('cgroup',['node','-e',`const fs=require('node:fs');function walk(p){for(const d of fs.readdirSync(p,{withFileTypes:true})){if(!d.isDirectory())continue;if(d.name.includes('${id}'))throw Error('surviving cgroup');walk(p+'/'+d.name)}}walk('/sys/fs/cgroup');console.log('gone')`],'none',['--cgroupns','host','-v','/sys/fs/cgroup:/sys/fs/cgroup:ro']);
 const out=docker(['start','-a',proof]);const code=inspect(proof).State.ExitCode;remove(proof);if(code!==0)throw Error(out);return {driver:docker(['info','--format','{{.CgroupDriver}}/{{.CgroupVersion}}']),top,cgroupGone:out==='gone',note:'detached child uses setsid via Node detached spawn; heartbeat namespace removed, no post-removal heartbeat volume retained'};
 });
 for(const id of ['P4','P5','P6','P7'])await probe(id,()=>{throw Error('PENDING: Linux image/store preparation and two admitted build instances required');});
} finally {
 canary.close();for(const [kind,name]of resources.reverse())try{engine(kind==='container'?'remove':`remove-${kind}`,['--name',name]);}catch(e){results.push({id:'cleanup',status:'FAIL',name,error:String(e)});}
 fs.writeFileSync(path.join(dir,`probes-${run}.json`),JSON.stringify({run,at:new Date().toISOString(),base:base.Id,results},null,2)+'\n');
}
