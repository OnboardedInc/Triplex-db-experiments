// [EXP-OBS01] Why: admit collection and its driver together; freeze evaluator parsers before any traffic.
// Rejected: keeping a sampler alive while its driver waits for heavy admission.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { inspect } from '../bin/lib.mjs';
import { randomBytes } from 'node:crypto';
const repo=path.resolve(import.meta.dirname,'../..');const id=process.argv[2] ?? 'obs01-r2-x01';
const destination=path.join(repo,'lab/experiments/EXP-OBS01/round2',id);fs.mkdirSync(destination,{recursive:true});
const key=path.join(repo,'runs/OBS01',id+'.key');fs.writeFileSync(key,randomBytes(32),{flag:'wx',mode:0o600});
const window={offsetMs:5000,durationMs:4000};
const mutation={protocol:'OBS-NO-MUTATION',window,requiredTags:['read-control']};
const abort={protocol:'OBS-PREABORT',window,requestId:'preaborted-never-issued',controlTags:['read-control']};
const policies={'X1-metrics':mutation,'T1-wire':{protocols:[mutation,abort]},'X6-log':abort,
  'X4-queries':{protocol:'OBS-SCRATCH',window,relation:'obs01_r2',unknownOutcomes:[]}};
const policy=path.join(destination,'policies.json');fs.writeFileSync(policy,JSON.stringify(policies,null,2)+'\n');
for(const file of fs.readdirSync(path.join(repo,'lab/observer'))){if(/\.(py|mjs|xml)$/.test(file)){const target=path.join(destination,'input-snapshot');fs.mkdirSync(target,{recursive:true});fs.copyFileSync(path.join(repo,'lab/observer',file),path.join(target,file));}}
function call(args,label,command=process.execPath){const result=spawnSync(command,args,{cwd:repo,encoding:'utf8',env:{...process.env,TX2_CONFIG_DIR:path.join(repo,'runs/OBS01/r2-config')}});fs.writeFileSync(path.join(destination,label+'.log'),(result.stdout??'')+(result.stderr??''));if(result.status!==0)throw new Error(label+' failed '+result.status);return result.stdout;}
const slot=['--lane','xtdb','--slot','s3','--holder','CX-OBS01-R2'];
call(['lab/bin/engine.mjs','up',...slot,'--exp','EXP-OBS01','--cpuset-cpus','2','--observation-sources'],'engine-up');
try {
const engine=inspect('tx2-xtdb-s3');
policies['H1-resources']={protocol:'OBS-RESOURCE',window,obligation:'G3.recursion.read-only-frontier',forecast:{memory:1610612736,disk:1073741824},envelope:{memory:1610612736,disk:1073741824,owners:[engine.Id]}};
policies['H4-all']={protocol:'OBS-CONNECTIONS',window:{offsetMs:100,durationMs:11000},pools:[{label:'readonly',port:5433,max:2}],closeOffsetMs:3000};
fs.writeFileSync(policy,JSON.stringify(policies,null,2)+'\n');
call(['lab/bin/engine.mjs','observer-up',...slot,'--image','python@sha256:e48f59cdba69a3cbd9ed2cf0f348d90d45a8d350d98134cf1070bc106ee9ed90','--observer-cpus','5','--run-id',id,'--receipt-id',id,'--key-id',id+'-key','--key-file',key,'--max-bundle-bytes','268435456','--enable-probes','--protocol-spec',policy],'up');
try {call(['-I','-B','lab/observer/probe_round2.py',id,destination,...(process.argv[3] ? [process.argv[3]] : [])],'driver','python3');}
finally {call(['lab/bin/engine.mjs','observer-down',...slot],'down');}
call(['lab/bin/engine.mjs','observer-retain','--run-id',id,'--holder','CX-OBS01-R2'],'retain');
} finally { call(['lab/bin/engine.mjs','down',...slot,'--note','OBS01 R2 completed attempt; preserve source for archive'],'engine-down'); }
console.log(JSON.stringify({id,destination}));
