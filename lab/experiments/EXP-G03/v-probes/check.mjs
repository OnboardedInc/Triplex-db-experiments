// [EXP-G03] Why: one diagnostic judge checks fresh, bound observations. Rejected: treating a tool exit code or synthetic memory floor as qualification.
export function quantile(xs,p){if(!xs.length||xs.some(x=>!Number.isFinite(x)||x<0))throw Error('invalid samples');return [...xs].sort((a,b)=>a-b)[Math.ceil(xs.length*p)-1]}
export function judge(id,observed,binding){
 const same=x=>JSON.stringify(x)===JSON.stringify(binding), bad=[];
 if(!observed.length||observed.some(x=>!same(x.binding)||x.attempt!==binding.attempt))bad.push('freshness/binding');
 const ds=observed.map(x=>x.data), metrics={};
 try {
 if(id==='V1'){
  for(const d of ds){if(d.rowsPerCommit!==10||d.synchronous!==2||d.fdatasync.length<500||d.sqliteCommit.length<500)bad.push('commit shape');
   const mount=d.mountinfo.split('\n').find(l=>l.split(' ')[4]==='/work');
   if(!mount?.includes(' - ext4 ')||mount.includes('nobarrier')||d.writeCache[d.device]!=='write back'||mount?.split(' ')[2]!==d.device)bad.push('flush path');
   if(d.load==='busy'&&(!Number.isFinite(d.workload?.engineCores)||d.workload.engineCores<1.8||d.workload.counts?.length!==256||d.workload.errors?.length))bad.push('engine not busy');
   metrics[d.load]={fdatasyncP50:quantile(d.fdatasync,.5),fdatasyncP99:quantile(d.fdatasync,.99),sqliteP50:quantile(d.sqliteCommit,.5),sqliteP99:quantile(d.sqliteCommit,.99),durabilityClass:d.durabilityClass};}
  if(ds.length!==2||!ds.some(d=>d.load==='idle')||!ds.some(d=>d.load==='busy'))bad.push('idle/busy pair');
 } else if(id==='V2'){
  const d=ds[0];if(ds.length!==1||d.final!==1||d.observations.length!==2||!d.observations.every((r,i)=>r.stage===['before-sync','after-sync'][i]&&r.values.length===100&&r.values.every(x=>x===0))||d.writer?.data?.committed!==1)bad.push('sync/visibility order');
 } else if(id==='V3'){
  const w=ds.find(d=>d.rounds),o=ds.find(d=>d.pollCost);
  if(!w||!o||w.commits!==12000||w.rounds.length!==12||o.requestedPeriodNs!==250000||o.pollCost.length<1000)throw Error('incomplete observer trial');
  const deltas=[];
  for(let i=0;i<12;i+=4){const rs=w.rounds.slice(i,i+4);if(rs.some((r,j)=>r.active!==[false,true,true,false][j]||r.samples.length!==1000||r.checkpoint[0]!==0))bad.push('ABBA/checkpoint');
   const baseline=(quantile(rs[0].samples,.99)+quantile(rs[3].samples,.99))/2, active=(quantile(rs[1].samples,.99)+quantile(rs[2].samples,.99))/2;deltas.push(active/baseline-1);}
  metrics.p99Changes=deltas;metrics.pollP99Ns=quantile(o.pollCost,.99);metrics.checkpointNs=w.rounds.map(r=>r.checkpointNs);
  if(deltas.some(x=>x>=.05))bad.push('observer overhead >=5%');
 } else if(id==='V4'){
  const a=ds.find(d=>d.samples),b=ds.find(d=>d.count);
  if(!a||!b||JSON.stringify(a.domain)!==JSON.stringify(b.domain)||a.samples.length!==2000||b.count!==2000)throw Error('clock domain/count');
  if(a.samples.some(s=>s.peer<s.start||s.peer>s.end||s.rtt!==s.end-s.start))bad.push('peer outside ping interval');
  metrics.rttP99Ns=quantile(a.samples.map(s=>s.rtt),.99);if(metrics.rttP99Ns>50000)bad.push('pipe RTT >50us');
 } else if(id==='V5'){
  const d=ds.find(d=>d.events);if(!d||ds.length!==2||ds.some(d=>d.bytes!==binding.attempt)||!d.events.some(e=>e.wd===d.expectedWd&&(e.mask&2))||!d.events.some(e=>e.wd===d.expectedWd&&(e.mask&8)))bad.push('inotify/nonce');
 } else if(id==='V6'){
  for(const d of ds){if(d.counts?.length!==256||d.counts.some(n=>n<1)||d.errors.length||!Number.isFinite(d.engineCores)||!Number.isFinite(d.relayCores)||d.engineCores<1.8||d.relayCores>=.8)bad.push('load/CPU saturation');}
  const plain=ds.find(d=>d.mode==='plain'),capture=ds.find(d=>d.mode==='capture');
  if(ds.length!==2||!plain||!capture||!capture.captureVerified)bad.push('capture verification');
  else{metrics.captureRateRatio=(capture.counts.reduce((a,b)=>a+b)/Number(capture.elapsedNs))/(plain.counts.reduce((a,b)=>a+b)/Number(plain.elapsedNs));if(metrics.captureRateRatio<.95)bad.push('capture throughput penalty >5%');}
 } else if(id==='V7'){
  bad.push('synthetic lower bound cannot establish actual NS layout memory');metrics.roles=ds;
 } else bad.push('unknown probe');
 }catch(e){bad.push(String(e));}
 return {format:'tx2-v-probe-receipt/1',id,binding,status:bad.length?'NOT-ESTABLISHED':'OBSERVED',metrics,refusals:bad,qualification:false};
}
