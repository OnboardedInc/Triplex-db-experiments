// [EXP-OBS01] Why: collect one fresh resident bundle per protocol and retain exact evaluator inputs.
// Rejected: reusing old bundles, changing dev residents, or silently substituting an undelegated obligation.
import fs from 'node:fs';import path from 'node:path';import {inspect} from '../bin/lib.mjs';import {randomBytes} from 'node:crypto';import {spawnSync,execFileSync} from 'node:child_process';
const round=process.env.OBS01_ROUND??'3';if(!['3','4','5'].includes(round))throw new Error('unknown report round');
const repo=path.resolve(import.meta.dirname,'../..'),base=path.join(repo,'lab/experiments/EXP-OBS01/round'+round),attempt=process.argv[2]??'a01';
if(!/^[a-z0-9_-]+$/.test(attempt))throw new Error('unsafe attempt');
const rows=[
 ['CANCEL','G6.cancel.observed-drain',[['T1-wire','TO/xtdb/T1']]],
 ['PREABORT','G6.cancel.preaborted-no-work',[['T1-wire','TO/xtdb/T1']]],
 ['CONNECTIONS','G6.ownership.bounded-connections',[['H4-sockets','HO/any/H4']]],
 ['SCRATCH','G6.cleanup.scratch-zero',[['X4-native','EI-query/xtdb/X4']]],
 ['NO-MUTATION','G3.recursion.read-only-frontier',[['X1-metrics','EI-metric/xtdb/X1.node.tx.latestCompletedTxId'],['T1-wire','TO/xtdb/T1']]],
 ['RESOURCE','S.capacity.admitted',[['H1-resource','HO/any/H1']]],
 ['AVAILABILITY','G6.resource.memory-failure-contained',[['HR-probes','HR/any/HR'],['H8-process','HO/any/H8']]],
 ['SCALE-COUNT','S.population.year-one',[['X4-native','EI-query/xtdb/X4']]],
 ['WORK','G8.reuse.positive-witness',[['X8-profile','EI-query/xtdb/X8']]],
 ['MAINTENANCE','G8.maintenance.bounded-boundaries',[['X1-metrics','EI-metric/xtdb/X1.node.tx.latestCompletedTxId']]],
 ['ERASURE-SCAN','G9.erasure.protected-copies',[['H6-files','HO/any/H6']]],
 ['WATERMARK','G8.composition.watermark-routing',[['T1-wire','TO/xtdb/T1']]],
 ['ACK-ORDER','G7.composition.ack-and-routed-ryow',[['H6-files','DR/any/H6'],['HR-probes','HR/any/HR']]],
 ['FAULT-TRANSITIONS','G7.commit.protocol-transitions',[['X4-native','EI-query/xtdb/X4']]]
];
fs.mkdirSync(base,{recursive:true});const selected=process.argv[3];
for(const [protocol,obligation,sources] of rows){
 if(selected&&!selected.split(',').includes(protocol))continue;
 const id=`obs01-r${round}-${attempt}-${protocol.toLowerCase()}`,dir=path.join(base,attempt,protocol);fs.mkdirSync(dir,{recursive:true});
 const key=path.join(repo,'runs/OBS01',id+'.key');fs.writeFileSync(key,randomBytes(32),{flag:'wx',mode:0o600});
 if(round==='5'){sources.push(['R5-context','HO/any/H8']);const extra={AVAILABILITY:[['X1-metrics','EI-metric/xtdb/X1.node.tx.latestCompletedTxId'],['X2-health','EI-query/xtdb/X2']],WORK:[['X3-tables','EI-table/xtdb/X3'],['H1-io','HO/any/H1'],['H3-files','HO/any/H3']],MAINTENANCE:[['X3-tables','EI-table/xtdb/X3']],WATERMARK:[['H8-process','HO/any/H8']], 'ACK-ORDER':[['X3-tables','EI-table/xtdb/X3']]};sources.push(...(extra[protocol]??[]));}
 const spec={resident:true,protocol:'OBS-'+protocol,runId:id,obligation,sources,relation:'obs01r'+round+'_'+attempt.replaceAll('-','_')+'_'+protocol.toLowerCase().replaceAll('-','_'),
  round:Number(round),nativePositionProfile:round==='5'?'xtdb-system-time-join/1':null,faultExpectedPayload:1,
  population:{generator:'configured-entities-v1',n:8,width:1},requestId:'cancel-r3',reuseQueryId:'reuse-r3',expectedError:'E-CANCELLED',
  pools:[{label:'resident-pgwire',port:5432,max:100000}],forecast:{memory:3221225472,disk:20000000000},envelope:{memory:3221225472,disk:20000000000,owners:[]},
  operation:'native-projection',comparisonOperation:'native-full-scan',threshold:protocol==='WORK'?'T-REUSE-AVOIDED':'NS-P3-LAG-P99-MS',kind:'compaction',
  variant:'engine-source',operationId:id,sourceOfTruth:'xtdb-dev',readId:id+'-read',servingIndex:'xtdb-current',scope:id,mappingGeneration:1,queriedAttributes:['n'],
  tErasurePublished:null,scanInventory:[],missingSource:'Resident profile has no enabled trace/log or composition-specific publication, route, fault or physical-erasure witness. No resident restart/rebuild is authorized.'};
 // The envelope must bind the actual running resident ID, read-only inspection through existing tooling.
 const engine=inspect('tx2-xtdb-dev');spec.envelope.owners=[engine.Id];
 const specFile=path.join(dir,'case.json');fs.writeFileSync(specFile,JSON.stringify(spec,null,2)+'\n');
 const r=spawnSync(process.execPath,['lab/bin/engine.mjs','observer-resident','--lane','xtdb','--slot','dev','--holder','CX-OBS01-R'+round,'--run-id',id,'--key-file',key,'--spec',specFile,'--image','python@sha256:e48f59cdba69a3cbd9ed2cf0f348d90d45a8d350d98134cf1070bc106ee9ed90'],{cwd:repo,encoding:'utf8',timeout:90000});
 fs.writeFileSync(path.join(dir,'collection.log'),(r.stdout??'')+(r.stderr??''));
 fs.writeFileSync(path.join(dir,'collection-status.json'),JSON.stringify({exit:r.status,signal:r.signal,error:r.error?.message})+'\n');
 if(r.status!==0){console.log(JSON.stringify({protocol,collection:'failed',attempt}));continue;}
 const check=spawnSync('python3',['-I','-B','lab/observer/check_round3.py',id,dir,key],{cwd:repo,encoding:'utf8',timeout:90000});
 fs.writeFileSync(path.join(dir,'screen.log'),(check.stdout??'')+(check.stderr??''));console.log(JSON.stringify({protocol,screenExit:check.status,summary:check.stdout?.trim()}));
}
