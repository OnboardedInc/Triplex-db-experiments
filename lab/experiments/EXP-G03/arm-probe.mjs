// [EXP-G03] Why: exercise registration, relay and per-run network checks only after slot admission.
// Rejected: pointing a qualification arm at a shared resident to avoid the pool.
import fs from 'node:fs';import path from 'node:path';import net from 'node:net';import {spawnSync} from 'node:child_process';
import {BoxExecutor} from '../../bin/box.mjs';import {REPO,sha256,inspect,docker} from '../../bin/lib.mjs';
const stamp=Date.now(),dir=path.join(REPO,'runs/g03-arm',String(stamp));fs.mkdirSync(dir,{recursive:true});const results=[];let admitted=false,box;
const holder='CX-G03',slot='s3';const hadVolume=Boolean(docker(['volume','inspect','tx2-xtdb-s3-data'],{allowFail:true}));const canary=net.createServer();await new Promise(r=>canary.listen(0,'127.0.0.1',r));
function command(cmd){return spawnSync(process.execPath,['lab/bin/engine.mjs',cmd,'--lane','xtdb','--slot',slot,'--holder',holder,...(cmd==='down'&&!hadVolume?['--remove-volume']:[])],{encoding:'utf8',timeout:180000});}
try{
 const up=command('up');results.push({id:'exclusive-slot',code:up.status,stdout:up.stdout,stderr:up.stderr});
 if(up.status===0){admitted=true;const c=inspect('tx2-xtdb-'+slot),source={engine:'xtdb',slot,imageDigest:c.Image,configSha256:c.Config.Labels['tx2.config-sha256']};
 const config=JSON.parse(fs.readFileSync('lab/experiments/EXP-G03/box.json'));box=new BoxExecutor({config,workDir:dir,holder,put:b=>sha256(b)});box.attestStore();const arm=box.arm({source},canary.address().port);results.push({id:'relay-preflight',status:'PASS',arm});}
} catch(e){results.push({id:'arm',status:'FAIL',error:String(e)})}
finally{if(box)try{box.close()}catch(e){results.push({id:'cleanup',status:'FAIL',error:String(e)})}if(admitted){const down=command('down');results.push({id:'slot-cleanup',code:down.status,stdout:down.stdout,stderr:down.stderr})}canary.close();fs.writeFileSync(`lab/experiments/EXP-G03/arm-probe-${stamp}.json`,JSON.stringify({stamp,results,records:box?.records,remaining:box?.resources},null,2)+'\n');}
