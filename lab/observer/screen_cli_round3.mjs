// [EXP-OBS01] Why: retain actual pinned CLI exits, plus delegation/protocol-negative contexts.
// Rejected: treating the helper process's exit zero as a semantic PASS.
import fs from 'node:fs';import path from 'node:path';import {spawnSync} from 'node:child_process';
const repo=path.resolve(import.meta.dirname,'../..'),base=path.join(repo,'lab/experiments/EXP-OBS01/round3');
const protocols=Object.keys(JSON.parse(fs.readFileSync(path.join(base,'contract.json'),'utf8')).obsProtocols).map(p=>p.replace('OBS-',''));
const rows=[];
for(const p of protocols){
 const attempt=p==='CANCEL'?'a07':(['ERASURE-SCAN','ACK-ORDER'].includes(p)?'a04':'a03'),dir=path.join(base,attempt,p),ctx=JSON.parse(fs.readFileSync(path.join(dir,'context.json'),'utf8'));
 const destination=path.join(dir,'cli-final');fs.mkdirSync(destination);const id=ctx.runId;
 for(const mode of ['selected','undelegated','mismatched-protocol']){
  const context=structuredClone(ctx);
  if(mode==='undelegated'){const c=JSON.parse(fs.readFileSync(path.join(base,'contract.json'),'utf8'));context.obligation=c.obligations.find(o=>!o.oracles.includes('O-OBS')).id;}
  if(mode==='mismatched-protocol')context.protocol=p==='WORK'?'OBS-CANCEL':'OBS-WORK';
  const file=path.join(destination,mode+'.context.json');fs.writeFileSync(file,JSON.stringify(context,null,2)+'\n',{flag:'wx'});
  const r=spawnSync('python3',['-I','-B','runs/OBS01/r3-oracle/observe.py','check','OBS-'+p,path.join(dir,'evidence.json'),'--contract',path.join(base,'contract.json'),'--context',file,'--bundle',`/Users/sam/projects/triplex-db-2/runs/engines/observers/${id}/output/bundle`,'--key-file',path.join(repo,'runs/OBS01',id+'.key')],{cwd:repo,encoding:'utf8',timeout:60000});
  fs.writeFileSync(path.join(destination,mode+'.stdout.json'),r.stdout??'',{flag:'wx'});fs.writeFileSync(path.join(destination,mode+'.stderr.txt'),r.stderr??'',{flag:'wx'});
  const verdict=JSON.parse(r.stdout);if(mode!=='selected'&&(r.status!==2||verdict.verdict!=='REFUSED'||!verdict.reasons[0].startsWith('CONTEXT-CONTRADICTION:')))throw new Error('guard negative not refused: '+p+'/'+mode);
  rows.push({protocol:'OBS-'+p,attempt,runId:id,mode,exit:r.status,...verdict});
 }
}
fs.writeFileSync(path.join(base,'cli-results-final.json'),JSON.stringify(rows,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(rows.filter(r=>r.mode==='selected')));
