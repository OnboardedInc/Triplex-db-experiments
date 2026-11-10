// [XN-S2-LIVE] Why: distinguish simple-query service from extended-protocol prepare and worker warmup before any new timing claim. Rejected: attributing an untimed timeout to writer latency.
import {Wire,text} from './wire.mjs';
import {readUrl,save} from './common.mjs';
const c=await Wire.connect(readUrl),events=[];
const note=(stage,x)=>{const e={stage,at:new Date().toISOString(),...x};events.push(e);console.log(JSON.stringify(e));};
try{
 note('connected',{});
 const simple=await c.query('SELECT doc FROM xn_ent WHERE _id=$1',[text('s000000')]);
 if(simple.length!==1||simple[0].doc!==('s000000|').padEnd(1500,'x'))throw Error('simple bytes');note('simple',{});
 await c.prepare('probe','SELECT doc FROM xn_ent WHERE _id=$1',[25]);note('prepared',{});
 for(let i=0;i<100;i++){
  const id='s'+String(i).padStart(6,'0');const rows=await c.execute('probe',[text(id)]);
  if(rows.length!==1||rows[0].doc!==(id+'|').padEnd(1500,'x'))throw Error('prepared bytes');
  if(i%25===0)note('warm',{i});
 }
 note('complete',{});save('read-probe-'+Date.now(),{events});
}finally{c.close()}
