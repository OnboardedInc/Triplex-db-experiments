// @ts-nocheck -- [EXP-XN1] Why: diagnostic wire records and observation bags are populated at runtime. Rejected: product types for this standalone spike.
// [EXP-XN1] Why: one returned document set is one subject pull, even for 95 documents.
// Rejected: counting documents as pulls (would inflate the P4 comparison 95-fold).
import fs from 'node:fs';
import {Wire,text} from './wire.mjs';
import {url,dir,save,measured,stats,binding} from './common.mjs';
const [action,phase,kindArg,clientsArg]=process.argv.slice(2);
const inline=kindArg==='e',kind=inline?'d':kindArg;
const small=i=>`s${String(i).padStart(6,'0')}`;
const large=i=>`l${String(i).padStart(6,'0')}`;
export const doc=(id,n)=>(id+'|').padEnd(n,'x');
if(action==='seed'){
 const c=await Wire.connect(url);const start=Date.now();
 try{for(const [n,size,batch,id] of [[100000,1500,250,small],[2000,135000,10,large]]){
  for(let b=0;b<n;b+=batch){const ps=[];const rows=Array.from({length:Math.min(batch,n-b)},(_,k)=>{const i=b+k;ps.push(text(id(i)),text(doc(id(i),size)));return `($${k*2+1},$${k*2+2})`});
   await c.batch([{sql:'BEGIN READ WRITE'},{sql:`INSERT INTO xn_ent (_id,doc) VALUES ${rows.join(',')}`,params:ps},{sql:'COMMIT SYNC'}]);
   if(b%10000===0)console.log('seed',n,b);
  }
 }
 const count=await c.query('SELECT COUNT(*) AS n FROM xn_ent');
 const token=await c.query('SHOW SNAPSHOT_TOKEN'),clock=await c.query('SELECT CURRENT_TIMESTAMP AS clock'),tx=await c.query('SHOW LATEST_SUBMITTED_TX');
 save('seed',{start:new Date(start).toISOString(),elapsedMs:Date.now()-start,count,token,clock,tx,binding:binding(),stats:stats()});console.log({count,token,clock,tx});
 }finally{c.close()}
}else if(action==='read'){
 const clients=Number(clientsArg),n=5000;
 const seed=JSON.parse(fs.readFileSync(`${dir}/seed.json`));
 const cs=await Promise.all(Array.from({length:clients},()=>Wire.connect(url)));
 const width=kind==='b'?95:1;
 let sql=`SELECT doc FROM xn_ent WHERE _id ${width===1?'= $1':`IN (${Array.from({length:95},(_,i)=>`$${i+1}`).join(',')})`}`;
 const token=Object.values(seed.token[0])[0],clock=seed.clock[0].clock;
 const begin=`BEGIN READ ONLY WITH (SNAPSHOT_TOKEN = '${token}', CLOCK_TIME = TIMESTAMP '${clock}')`;
 if(inline)sql=`SETTING SNAPSHOT_TOKEN = '${token}', CLOCK_TIME = TIMESTAMP '${clock}' ${sql}`;
 function params(i){return Array.from({length:width},(_,k)=>text(kind==='c'?large((i*17)%2000):small((i*97+k)%100000)));}
 async function one(c,i){
  // [EXP-XN1] Why: pin each pull independently; inline mode matches R16 1.2, transaction mode follows X05.
  // Rejected: holding one transaction for the whole run (hides per-pull pinning cost).
  const rows=kind==='d'&&!inline?(await c.batch([{sql:begin},{name:'pull',prepared:true,params:params(i)},{sql:'COMMIT'}]))[1].rows:await c.execute('pull',params(i));
  const expected=new Set(params(i).map(p=>doc(p.value,kind==='c'?135000:1500)));
  if(rows.length!==width||rows.some(r=>!expected.delete(r.doc))||expected.size)throw Error('document bytes mismatch');
 }
 try{await Promise.all(cs.map(async(c,j)=>{await c.prepare('pull',sql,Array(width).fill(25));for(let i=0;i<100;i++)await one(c,i+j*100)}));
 await measured(`read-${phase}-${kind}-${clients}`,async()=>{const samples=[];await Promise.all(cs.map(async(c,j)=>{for(let i=j;i<n;i+=clients){const t=performance.now();await one(c,i);samples.push({i,ms:performance.now()-t});if(samples.length%1000===0)console.log('read-progress',phase,kind,clients,samples.length)}}));return {kind,pinMode:kind==='d'?(inline?'query-setting':'read-transaction'):null,clients,n,sql,pinned:kind==='d'?{token,clock}:null,warmupPerConnection:100,latency:(await import('./common.mjs')).summary(samples.map(r=>r.ms)),samples}});
 }finally{for(const c of cs)c.close()}
}else throw Error('action');
