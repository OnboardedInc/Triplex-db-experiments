// [CX-XRUN] Why: a complete clean-slot log read binds every exercised scope to persisted guards. Rejected: P9 sampling (can omit scopes and records).
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
const root=process.cwd(), dir=path.dirname(import.meta.filename);
const lib=await import(path.join(root,'lab/bin/lib.mjs'));
const {default:postgres}=await import(path.join(root,'packages/xtdb/node_modules/postgres/src/index.js'));
const [receiptPath,launchPath]=process.argv.slice(2);
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const receipt=JSON.parse(fs.readFileSync(receiptPath)), launch=JSON.parse(fs.readFileSync(launchPath));
const reportPath=path.join(receipt.rawDir,'g1-report.json'), report=JSON.parse(fs.readFileSync(reportPath));
const config=lib.loadSlots(), info=lib.slotInfo(config,'xtdb','s1');
const before={owner:lib.readOwner(info),ownerSha256:hash(info.ownerFile),container:lib.inspect(info.container)};
if(before.owner.holder!=='CX-XRUN'||before.ownerSha256!==receipt.engine.ownerSha256||before.container.Id!==receipt.engine.containerId) throw new Error('owner/container mismatch before collection');
const scopes=[...new Set([report.suite?.scope,...report.executions.map(x=>x.scope)].filter(Boolean))];
const sql=postgres(receipt.engine.endpoint,{max:1,prepare:false,onnotice:()=>{}});
const records=[];
try {
  // The volume started empty and has one holder; scan every tx, without sampling, size limits or a time filter.
  const txs=await sql.unsafe('SELECT _id, system_time, committed, error FROM xt.txs ORDER BY _id');
  for(const tx of txs){
    const id=String(tx._id);
    if(!/^\d+$/.test(id))throw new Error('invalid transaction id');
    const rows=await sql.unsafe(`SELECT msg_id, tx_ops FROM xt.source_log_msgs WHERE msg_id BETWEEN ${id} AND ${id}`);
    if(rows.length!==1)throw new Error(`missing source record ${id}`);
    records.push({tx,source:rows[0]});
  }
} finally {await sql.end();}
const rawPath=path.join(dir,'J01-compact-source-log.json');
fs.writeFileSync(rawPath,JSON.stringify(records,null,2)+'\n',{flag:'wx'});
const mode=launch.env.TRIPLEX_COMMIT_ENCODING;
const perScope=scopes.map(scope=>{
  const name=JSON.parse(scope)[3], hex=Buffer.from(name).toString('hex');
  const matched=records.filter(r=>String(r.source.tx_ops).includes(name)||String(r.source.tx_ops).includes(hex));
  const a0=matched.filter(r=>String(r.source.tx_ops).includes("'triplex-assertion-identity-conflict'"));
  const compact=matched.filter(r=>String(r.source.tx_ops).includes("'triplex-identity-conflict'"));
  // No matched record is explicit lack of source-log write evidence, never an encoding success.
  const status=matched.length===0?'NO-SCOPED-WRITE-OBSERVED':compact.length>0&&a0.length===0&&mode==='compact'?'COMPACT-OBSERVED':'UNQUALIFIED';
  return {scope,name,recordIds:matched.map(r=>r.source.msg_id),a0GuardRecordIds:a0.map(r=>r.source.msg_id),compactGuardRecordIds:compact.map(r=>r.source.msg_id),status};
});
const after={ownerSha256:hash(info.ownerFile),container:lib.inspect(info.container),residentSet:lib.listTx2Containers(),volume:info.volume,volumeBytes:lib.volumeBytes(config,info.volume)};
const stable=before.ownerSha256===after.ownerSha256&&before.container.Id===after.container.Id&&before.container.State.StartedAt===after.container.State.StartedAt&&before.container.Config.Labels['tx2.config-sha256']===after.container.Config.Labels['tx2.config-sha256'];
const complete=records.length>0&&perScope.every(s=>s.status==='COMPACT-OBSERVED');
const output={receipt:{path:receiptPath,sha256:hash(receiptPath)},launch:{path:launchPath,sha256:hash(launchPath)},report:{path:reportPath,sha256:hash(reportPath)},raw:{path:rawPath,sha256:hash(rawPath)},collectorSha256:hash(import.meta.filename),mode,before,after,stable,complete,records:records.length,perScope};
fs.writeFileSync(path.join(dir,'J01-compact-mode.json'),JSON.stringify(output,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({stable,complete,records:records.length,scopes:perScope.length,statuses:perScope.reduce((o,s)=>(o[s.status]=(o[s.status]??0)+1,o),{})}));
if(!stable||!complete)process.exitCode=1;
