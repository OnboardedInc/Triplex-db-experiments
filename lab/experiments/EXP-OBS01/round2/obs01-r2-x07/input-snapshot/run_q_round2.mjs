// [EXP-OBS01] Why: repeat the failed QLever clock/cancel path with fresh source-bound collection.
// Rejected: replacing an old failed bundle's clock records or changing its anchors.
import fs from 'node:fs';import path from 'node:path';import {spawnSync} from 'node:child_process';import {randomBytes} from 'node:crypto';import {inspect} from '../bin/lib.mjs';
const repo=path.resolve(import.meta.dirname,'../..'),id=process.argv[2]??'obs01-r2-q01',dir=path.join(repo,'lab/experiments/EXP-OBS01/round2',id);fs.mkdirSync(dir,{recursive:true});
const slot=['--lane','qlever','--slot','s3','--holder','CX-OBS01-R2'];
const key=path.join(repo,'runs/OBS01',id+'.key');fs.writeFileSync(key,randomBytes(32),{flag:'wx',mode:0o600});
function call(args,label,command=process.execPath){const r=spawnSync(command,args,{cwd:repo,encoding:'utf8',timeout:60000,env:{...process.env,TX2_CONFIG_DIR:path.join(repo,'runs/OBS01/r2-config')}});fs.writeFileSync(path.join(dir,label+'.log'),(r.stdout??'')+(r.stderr??''));if(r.status!==0)throw new Error(label+' '+r.status);}
const mutation={protocol:'OBS-NO-MUTATION',window:{offsetMs:5000,durationMs:4000},requiredTags:['read-control']};
const abort={protocol:'OBS-PREABORT',window:{offsetMs:5000,durationMs:800},requestId:'preaborted-never-issued',targetQuery:'SELECT ?s WHERE { ?s <urn:never-issued> ?v }',controls:{'read-control':'SELECT ?n WHERE { ?s <urn:obs01:p> ?n } LIMIT 1'},backgroundQueries:['SELECT * WHERE { ?s ?p ?o } LIMIT 1']};
const policies={'Q1-metrics':mutation,'Q3-events':abort,'T2-wire':{protocols:[mutation,abort]}};
const policy=path.join(dir,'policies.json');fs.writeFileSync(policy,JSON.stringify(policies,null,2)+'\n');
call(['lab/bin/engine.mjs','up',...slot,'--cpuset-cpus','2','--observation-sources'],'engine-up');
try{
 call(['lab/bin/engine.mjs','observer-up',...slot,'--image','python@sha256:e48f59cdba69a3cbd9ed2cf0f348d90d45a8d350d98134cf1070bc106ee9ed90','--observer-cpus','5','--run-id',id,'--receipt-id',id,'--key-id',id+'-key','--key-file',key,'--max-bundle-bytes','268435456','--enable-probes','--protocol-spec',policy],'observer-up');
 try{call(['-I','-B','lab/observer/probe_q_round2.py',id,dir],'driver','python3');}
 finally{call(['lab/bin/engine.mjs','observer-down',...slot],'observer-down');}
 call(['lab/bin/engine.mjs','observer-retain','--run-id',id,'--holder','CX-OBS01-R2'],'retain');
}finally{if(inspect('tx2-obs-qlever-s3'))call(['lab/bin/engine.mjs','observer-down',...slot],'emergency-observer-down');call(['lab/bin/engine.mjs','down',...slot,'--note','OBS01 QLever R2 source retained for archive'],'engine-down');}
console.log(JSON.stringify({id,dir}));
