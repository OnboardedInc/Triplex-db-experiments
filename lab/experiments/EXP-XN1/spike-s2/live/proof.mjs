// [XN-S2-LIVE] Why: prove cross-node byte visibility, restart catch-up and exact old/current values before load. Rejected: treating two listening ports as a real replicated topology.
import fs from 'node:fs';
import {Wire,text} from './wire.mjs';
import {url,readUrl,save,dir} from './common.mjs';
import {s3} from './s3.mjs';
const action=process.argv[2],w=await Wire.connect(url);
const write=async(id,value)=>{await w.batch([{sql:'BEGIN READ WRITE'},{sql:'INSERT INTO xn_probe (_id,value) VALUES ($1,$2)',params:[text(id),text(value)]},{sql:'COMMIT SYNC'}]);const token=Object.values((await w.query('SHOW AWAIT_TOKEN'))[0])[0];const snapshot=Object.values((await w.query('SHOW SNAPSHOT_TOKEN'))[0])[0];const clock=(await w.query('SELECT CURRENT_TIMESTAMP AS clock'))[0].clock;return {id,value,token,snapshot,clock}};
const pull=async(r,p,pin=false)=>{
 const begin=`BEGIN READ ONLY WITH (AWAIT_TOKEN='${p.token}'${pin?`, SNAPSHOT_TOKEN='${p.snapshot}', CLOCK_TIME=TIMESTAMP '${p.clock}'`:''})`;
 const rows=(await r.batch([{sql:begin},{sql:'SELECT value FROM xn_probe WHERE _id=$1',params:[text(p.id)]},{sql:'COMMIT'}]))[1].rows;
 if(rows.length!==1||rows[0].value!==p.value)throw Error('probe value mismatch '+JSON.stringify({p,rows}));return rows;
};
try{
 if(action==='before'){
  const p=await write('probe-'+Date.now(),'before');const r=await Wire.connect(readUrl);try{const rows=await pull(r,p,true);save('topology-before',{p,rows});}finally{r.close()}
  const res=await fetch('http://tx2-xns2-write:8080/system/finish-block',{method:'POST',signal:AbortSignal.timeout(60000)});const body=await res.text();if(!res.ok)throw Error('finish block '+body);
  const bucket=JSON.parse(fs.readFileSync(new URL('./credentials.json',import.meta.url))).bucket;
  const listing=await s3('GET',`/${bucket}`);if(listing.status!==200||!listing.body.includes('<Key>'))throw Error('no remote objects after block');save('remote-storage',{status:res.status,body,listing});
 }else if(action==='stopped'){
  const old=JSON.parse(fs.readFileSync(`${dir}/topology-before.json`)).p;const p=await write(old.id,'while-reader-stopped');save('topology-stopped',{old,p});
 }else if(action==='restarted'){
  const {old,p}=JSON.parse(fs.readFileSync(`${dir}/topology-stopped.json`));const r=await Wire.connect(readUrl);try{save('topology-restarted',{current:await pull(r,p),past:await pull(r,old,true),old,p});}finally{r.close()}
 }else if(action==='await-seed'){
  const marker=await write('seed-ready-'+Date.now(),'ready');const token=marker.token;const r=await Wire.connect(readUrl);try{await r.batch([{sql:`BEGIN READ ONLY WITH (AWAIT_TOKEN='${token}')`},{sql:'SELECT COUNT(*) AS n FROM xn_ent'},{sql:'COMMIT'}]);save('seed-await',{token});}finally{r.close()}
 }else throw Error('unknown proof action');
}finally{w.close()}
