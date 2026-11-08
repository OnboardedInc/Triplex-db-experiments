// [EXP-G03] Why: make the first window a source-pinned executable command, with no resident parking or admission polling.
// Rejected: ad-hoc environment exports and a retry loop that hides the first refusal.
import fs from 'node:fs';import path from 'node:path';import net from 'node:net';import {spawnSync} from 'node:child_process';
import {BoxExecutor} from '../../../bin/box.mjs';import {authorityPolicy,bindStore,pairLayout} from '../../../bin/box-policy.mjs';
import {gitSource,evaluatorIntegrity} from '../../../bin/claim.mjs';import {REPO,sha256,docker,inspect,parseArgs} from '../../../bin/lib.mjs';
const {options:o}=parseArgs(process.argv.slice(2));const authority=o.authority,evaluator=o['evaluator-commit'],holder=o.holder??'CX-G03-window',lane=o.lane??'xtdb',slot=o.slot??'s3';
if(![authority,evaluator].every(s=>/^[0-9a-f]{40}$/.test(s??''))||!o['store-receipt']||!o['source-repo'])throw Error('requires --authority SHA --evaluator-commit SHA --source-repo DIR --store-receipt FILE');
const integrity=evaluatorIntegrity({rev:evaluator});if(integrity.problems.length)throw Error(integrity.problems.join('; '));
const source=gitSource(path.resolve(o['source-repo'])),policy=authorityPolicy(source,authority),stamp=Date.now(),dir=path.join(REPO,'runs/g03-window',String(stamp));fs.mkdirSync(dir,{recursive:true});
const config=path.join(dir,'authority-config');fs.mkdirSync(config);fs.writeFileSync(path.join(config,'lab-config-placeholder'),'pinned files only');
const safe=p=>typeof p==='string'&&!p.startsWith('/')&&!p.split('/').some(x=>x==='..'||!x);
const files=['lab/config/slots.json',...policy.slots.lanes[lane].configSource];
for(const p of files){if(!safe(p))throw Error('unsafe authority config path');const b=source.blob(authority,p);if(!b)throw Error('missing authority config '+p);const target=path.join(config,p);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,b,{mode:0o444});}
const results=[];let admitted=false,box;const volume=`tx2-${lane}-${slot}-data`;
if(docker(['volume','inspect',volume],{allowFail:true}))throw Error('slot has retained data; choose an unused slot or get orchestrator retention decision');
function engine(command){return spawnSync(process.execPath,['lab/bin/engine.mjs',command,'--lane',lane,'--slot',slot,'--holder',holder,'--authority',authority,'--authority-repo',source.repo,...(command==='down'?['--remove-volume']:[])],{encoding:'utf8',timeout:180000,env:{...process.env,TX2_CONFIG_DIR:config}})}
const canary=net.createServer();await new Promise(r=>canary.listen(0,'127.0.0.1',r));
try{
 const up=engine('up');results.push({stage:'admission',code:up.status,stdout:up.stdout,stderr:up.stderr});if(up.status!==0)throw Error('slot not admitted; no retry');admitted=true;
 const c=inspect(`tx2-${lane}-${slot}`);if(c.Image!==policy.contract.imagePins[lane]?.imageId)throw Error('slot image differs from authority pin');
 const comp={source:{engine:lane,slot,imageDigest:c.Image,configSha256:c.Config.Labels['tx2.config-sha256']}};
 const objects=path.join(dir,'objects');fs.mkdirSync(objects);const put=b=>{const h=sha256(b);fs.writeFileSync(path.join(objects,h),b);return h};
 box=new BoxExecutor({config:bindStore(policy,JSON.parse(fs.readFileSync(o['store-receipt']))),authority:{commit:authority,repo:source.repo},workDir:dir,holder,put});box.attestStore();
 const arm=box.arm(comp,canary.address().port),instance={volume:box.volume('fixture')};box.seed(instance.volume,new Map([['package.json',{mode:'100644',bytes:Buffer.from('{}')}]]));
 const port=policy.slots.lanes[lane].containerPort;const script=`const s=require('node:net').connect({host:'engine',port:${port}},()=>{console.log('{}');s.end()});s.setTimeout(2000,()=>process.exit(2));s.on('error',()=>process.exit(2));`;
 const answer=box.case(instance,Buffer.from('{}'),'normal',['node','-e',script],arm.network,arm.env);if(answer.exit!==0)throw Error('slot TCP case failed');results.push({stage:'slot-canary',status:'PASS',stdout:answer.stdout.toString()});
 if(o['pair-slots'])results.push({stage:'layout-only',layout:pairLayout(policy,o['pair-slots'].split(',')),measured:false});
}catch(e){results.push({stage:'error',error:String(e)});process.exitCode=2}
finally{if(box)try{box.close()}catch(e){results.push({stage:'cleanup',error:String(e)});process.exitCode=2}if(admitted){const down=engine('down');results.push({stage:'slot-down',code:down.status,stdout:down.stdout,stderr:down.stderr});if(down.status!==0)process.exitCode=2}canary.close();const receipt={diagnostic:true,authority,evaluator,policyHashes:policy.hashes,results,records:box?.records,remaining:box?.resources,rawDir:dir};fs.writeFileSync(path.join(dir,'receipt.json'),JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt,null,2));}
