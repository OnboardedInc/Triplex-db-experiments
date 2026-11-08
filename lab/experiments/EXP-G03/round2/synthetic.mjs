// [EXP-G03] Why: run the real proof scripts on synthetic containers, with controlled failures and no engine slot.
// Rejected: allowing a test flag to weaken the production kill or network checks.
import fs from 'node:fs';import path from 'node:path';import net from 'node:net';import {spawnSync} from 'node:child_process';import assert from 'node:assert/strict';
import {BoxExecutor} from '../../../bin/box.mjs';import {cgroupProofScript,preflightScript,checkPreflight,authorityPolicy} from '../../../bin/box-policy.mjs';
import {gitSource} from '../../../bin/claim.mjs';import {REPO,sha256,docker,inspect} from '../../../bin/lib.mjs';
const stamp=Date.now(),run='r2-'+stamp,holder='CX-G03',store=`tx2-g03-${run}-empty-store`,dir=path.join(REPO,'runs/g03-r2',String(stamp));fs.mkdirSync(dir,{recursive:true});
const commit=gitSource(REPO).resolve('HEAD'),policy=authorityPolicy(gitSource(REPO),commit),source={commit,hashes:policy.hashes};
function engine(action,extra=[]){const r=spawnSync(process.execPath,['lab/bin/engine.mjs','box',action,'--run',run,'--holder',holder,'--authority',commit,'--authority-repo',REPO,...extra],{encoding:'utf8',timeout:180000});if(r.status!==0)throw Error(r.stderr||r.error||r.stdout);return JSON.parse(r.stdout)}
const results=[];let box;const canary=net.createServer();await new Promise(r=>canary.listen(0,'127.0.0.1',r));
const objects=path.join(dir,'objects');fs.mkdirSync(objects);const put=b=>{const h=sha256(b);fs.writeFileSync(path.join(objects,h),b);return h};
async function check(id,fn){try{await fn();results.push({id,status:'PASS'})}catch(e){results.push({id,status:'FAIL',error:String(e)})}}
try{
 engine('volume',['--name',store]);
 // An empty synthetic store is deliberately not the contract store and is never passed to qualifyClaim.
 box=new BoxExecutor({config:{...policy.box,store},authority:{commit,repo:REPO},workDir:dir,holder,put});
 const live=box.create('live',{argv:['sleep','infinity'],memory:67108864});docker(['start',live]);const liveId=inspect(live).Id;
 const reader=box.create('reader',{argv:['sleep','infinity'],memory:67108864,trusted:true,extra:['--cgroupns','host','-v','/sys/fs/cgroup:/sys/fs/cgroup:ro']});docker(['start',reader]);const readerId=inspect(reader).Id;
 await check('live-cgroup-is-rejected',()=>{assert.throws(()=>docker(['exec',reader,'node','-e',cgroupProofScript(liveId,readerId)]),/cgroup survives/)});
 box.remove(live);
 await check('absent-cgroup-with-visible-reader-is-accepted',()=>assert.equal(docker(['exec',reader,'node','-e',cgroupProofScript(liveId,readerId)]),'gone'));
 await check('invisible-reader-is-rejected',()=>assert.throws(()=>docker(['exec',reader,'node','-e',cgroupProofScript(liveId,'f'.repeat(64))]),/visibility not proven/));
 box.remove(reader);
 const network=box.prefix+'synthetic-arm';box.engine('network',['--name',network]);box.resources.push(['network',network]);
 const server=box.create('server',{network,argv:['node','-e',"require('node:net').createServer(s=>s.end('ok')).listen(8080,'0.0.0.0')"],memory:67108864,extra:['--network-alias','engine'],trusted:true});docker(['start',server]);
 const ip=inspect(server).NetworkSettings.Networks[network].IPAddress;
 async function preflight(id,targets,port,expectReject){await check(id,()=>{const n=box.create(id,{network,argv:['node','-e',preflightScript(targets,port)],memory:67108864,trusted:true});const r=box.start(n);fs.writeFileSync(path.join(dir,id+'.json'),r.stdout);box.remove(n);if(expectReject)assert.throws(()=>checkPreflight(r,targets),/ISOLATION-NOT-IN-FORCE/);else checkPreflight(r,targets);});}
 await preflight('isolated-positive',[['192.168.5.2',canary.address().port],['192.168.5.1',canary.address().port],['1.1.1.1',443]],8080,false);
 await preflight('reachable-forbidden-target',[[ip,8080]],8080,true);
 await preflight('positive-endpoint-missing',[['1.1.1.1',443]],8081,true);
} catch(e){results.push({id:'setup',status:'FAIL',error:String(e)})}
finally{if(box)try{box.close()}catch(e){results.push({id:'cleanup',status:'FAIL',error:String(e)})}try{engine('remove-volume',['--name',store])}catch(e){results.push({id:'store-cleanup',status:'FAIL',error:String(e)})}canary.close();fs.writeFileSync(`lab/experiments/EXP-G03/round2/synthetic-${stamp}.json`,JSON.stringify({source,stamp,diagnostic:true,results,records:box?.records,remaining:box?.resources,rawDir:dir},null,2)+'\n');process.exitCode=results.some(r=>r.status==='FAIL')?2:0;}
