// [EXP-OBS01] Why: retain actual pinned CLI exits, plus delegation/protocol-negative contexts.
// Rejected: treating the helper process's exit zero as a semantic PASS.
import fs from 'node:fs';import path from 'node:path';import {spawnSync} from 'node:child_process';import {createHash} from 'node:crypto';
const round=process.env.OBS01_ROUND??'3';if(!['3','4','5'].includes(round))throw new Error('unknown report round');
const screenId=process.env.OBS01_SCREEN_ID??'final';if(!/^[a-z0-9_-]+$/.test(screenId))throw new Error('unsafe screen id');
const repo=path.resolve(import.meta.dirname,'../..'),base=path.join(repo,'lab/experiments/EXP-OBS01/round'+round),contract=path.join(repo,'lab/experiments/EXP-OBS01/round3/contract.json');
const protocols=Object.keys(JSON.parse(fs.readFileSync(contract,'utf8')).obsProtocols).map(p=>p.replace('OBS-',''));
const pins=JSON.parse(fs.readFileSync(path.join(repo,'lab/experiments/EXP-OBS01/round3/pins.json'),'utf8'));
const digest=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
if(digest(contract)!==pins.contractFileSha256||digest(path.join(repo,'runs/OBS01/r3-oracle/observe.py'))!==pins.oracleSha256)throw new Error('screening pin mismatch');
const rows=[];
for(const p of protocols){
 const attempt=round!=='3'?process.argv[2]?.split(',').filter(a=>/^[a-z0-9_-]+$/.test(a)&&fs.existsSync(path.join(base,a,p,'context.json'))).at(-1):(p==='CANCEL'?'a07':(['ERASURE-SCAN','ACK-ORDER'].includes(p)?'a04':'a03'));if(round!=='3'&&!process.argv[2])throw new Error('round 4 requires explicit attempts');
 if(!attempt)continue;
 const dir=path.join(base,attempt,p);if(round!=='3'&&!fs.existsSync(path.join(dir,'context.json')))continue;
 const ctx=JSON.parse(fs.readFileSync(path.join(dir,'context.json'),'utf8'));
 const destination=path.join(dir,'cli-'+screenId);fs.mkdirSync(destination);const id=ctx.runId;
 for(const mode of ['selected','undelegated','mismatched-protocol']){
  const context=structuredClone(ctx);
  if(mode==='undelegated'){const c=JSON.parse(fs.readFileSync(contract,'utf8'));context.obligation=c.obligations.find(o=>!o.oracles.includes('O-OBS')).id;}
  if(mode==='mismatched-protocol')context.protocol=p==='WORK'?'OBS-CANCEL':'OBS-WORK';
  const file=path.join(destination,mode+'.context.json');fs.writeFileSync(file,JSON.stringify(context,null,2)+'\n',{flag:'wx'});
  const r=spawnSync('python3',['-I','-B','runs/OBS01/r3-oracle/observe.py','check','OBS-'+p,path.join(dir,'evidence.json'),'--contract',contract,'--context',file,'--bundle',`/Users/sam/projects/triplex-db-2/runs/engines/observers/${id}/output/bundle`,'--key-file',path.join(repo,'runs/OBS01',id+'.key')],{cwd:repo,encoding:'utf8',timeout:60000});
  fs.writeFileSync(path.join(destination,mode+'.stdout.json'),r.stdout??'',{flag:'wx'});fs.writeFileSync(path.join(destination,mode+'.stderr.txt'),r.stderr??'',{flag:'wx'});
  const verdict=JSON.parse(r.stdout);if(r.error||r.signal||r.status!==({PASS:0,FAIL:1,REFUSED:2}[verdict.verdict]))throw new Error('CLI exit/verdict mismatch');
  if(mode!=='selected'&&(r.status!==2||verdict.verdict!=='REFUSED'||!verdict.reasons[0].startsWith('CONTEXT-CONTRADICTION:')))throw new Error('guard negative not refused: '+p+'/'+mode);
  rows.push({protocol:'OBS-'+p,attempt,runId:id,mode,exit:r.status,...verdict});
 }
}
fs.writeFileSync(path.join(base,'cli-results-'+screenId+'.json'),JSON.stringify(rows,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(rows.filter(r=>r.mode==='selected')));
