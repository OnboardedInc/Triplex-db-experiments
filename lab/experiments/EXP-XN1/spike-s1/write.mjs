// @ts-nocheck -- [EXP-XN1] Why: diagnostic wire records and observation bags are populated at runtime. Rejected: product types for this standalone spike.
// [EXP-XN1] Why: guards, three payload rows, head and claim share one atomic pipelined write.
// Rejected: a lone INSERT proxy (omits the requested command's conflict and idempotency work).
import fs from 'node:fs';
import {Wire,text,int} from './wire.mjs';
import {url,save,measured,summary,sleep} from './common.mjs';
import {Worker} from 'node:worker_threads';
const [mode,shape='two',phase='fresh',arg='1000',readArg='0']=process.argv.slice(2);
const scope=`${mode}-${shape}-${phase}-${Date.now()}`;
const p=(sql,params=[])=>({sql,params});
const payload=[3000,200,4000].map(n=>'w'.repeat(n));
function command(id,subj,expected,docPrefix=id){
 const guards=shape==='one'?[p("ASSERT NOT EXISTS (SELECT 1 FROM xn_claim WHERE _id=$1) AND (SELECT pos FROM xn_head WHERE _id=$2) = $3, 'guard'",[text(id),text(subj),int(expected)])]:[
 p("ASSERT NOT EXISTS (SELECT 1 FROM xn_claim WHERE _id=$1), 'duplicate-command'",[text(id)]),
 p("ASSERT (SELECT pos FROM xn_head WHERE _id=$1) = $2, 'stale-position'",[text(subj),int(expected)])];
 const params=[];const rows=payload.map((d,i)=>{params.push(text(`${docPrefix}-${i}`),text(d));return `($${i*2+1},$${i*2+2})`});
 return [p('BEGIN READ WRITE'),...guards,p(`INSERT INTO xn_ent (_id,doc) VALUES ${rows.join(',')}`,params),p('INSERT INTO xn_head (_id,pos) VALUES ($1,$2)',[text(subj),int(expected+1)]),p('INSERT INTO xn_claim (_id) VALUES ($1)',[text(id)]),p('COMMIT SYNC')];
}
const cs=await Promise.all(Array.from({length:mode==='open'?16:1},()=>Wire.connect(url)));
async function init(n){await cs[0].batch([p('BEGIN READ WRITE'),p('INSERT INTO xn_claim (_id) VALUES ($1)',[text(`${scope}-seedclaim`)]),p('COMMIT SYNC')]);for(let i=0;i<n;i++)await cs[0].batch([p('BEGIN READ WRITE'),p('INSERT INTO xn_head (_id,pos) VALUES ($1,0)',[text(`${scope}-s${i}`)]),p('COMMIT SYNC')]);}
async function commit(c,id,subj,expected,docPrefix=id){const w=c.writes;const result=await c.batch(command(id,subj,expected,docPrefix));if(c.writes-w!==1||!result.at(-1).commands.some(s=>s.startsWith('COMMIT')))throw Error('missing COMMIT response');}
let workers=[];
try{
 if(!(mode==='closed'&&phase==='aged'))await init(mode==='open'?200:1);
 if(mode==='correct'){
  const subj=`${scope}-s0`,id=`${scope}-ok`;await commit(cs[0],id,subj,0);
  const original=await cs[0].query('SELECT _id,doc FROM xn_ent WHERE _id IN ($1,$2,$3)',[0,1,2].map(i=>text(`${id}-${i}`)));
  const originalContent=original.length===3&&original.every(r=>r.doc===payload[Number(r._id.at(-1))]);
  if(!originalContent)throw Error('successful command payload mismatch');
  const out=[];
  for(const [label,cmd,expected] of [['duplicate',id,1],['stale',`${scope}-stale`,0]]){
   const docPrefix=`${scope}-${label}-attempt`;
   let error=null;try{await commit(cs[0],cmd,subj,expected,docPrefix)}catch(e){error={code:e.code,message:e.message};await cs[0].query('ROLLBACK')}
   const rows=await cs[0].query('SELECT _id,doc FROM xn_ent WHERE _id IN ($1,$2,$3)',[0,1,2].map(i=>text(`${docPrefix}-${i}`)));
   const head=await cs[0].query('SELECT pos FROM xn_head WHERE _id=$1',[text(subj)]);
   const claim=await cs[0].query('SELECT _id FROM xn_claim WHERE _id=$1',[text(cmd)]);
   const expectedMarker=shape==='one'?'guard':label==='duplicate'?'duplicate-command':'stale-position';
   const content=Boolean(error?.code==='P0004'&&error.message===expectedMarker)&&Number(head[0]?.pos)===1&&rows.length===0&&rows.every(r=>r.doc===payload[Number(r._id.at(-1))])&&claim.length===(label==='duplicate'?1:0);
   out.push({label,docPrefix,expectedMarker,error,head,claim,rows:rows.map(r=>({id:r._id,bytes:r.doc.length})),content});if(!content)throw Error('atomic guard check failed');
  }save(`correct-${shape}${phase==='fresh'?'':'-'+phase}`,{scope,originalContent,original:original.map(r=>({id:r._id,bytes:r.doc.length})),out});console.log(out);
 }else if(mode==='closed'){
  const subj=phase==='aged'?`${JSON.parse(fs.readFileSync('/Users/sam/Claude/Projects/triplex-db-2/evidence/XN-S1/history.json')).scope}-s0`:`${scope}-s0`;
  const base=Number((await cs[0].query('SELECT pos FROM xn_head WHERE _id=$1',[text(subj)]))[0].pos);
  for(let i=0;i<200;i++)await commit(cs[0],`${scope}-warm${i}`,subj,base+i);
  await measured(`closed-${shape}-${phase}`,async()=>{const samples=[];const n=Number(arg);for(let i=0;i<n;i++){const t=performance.now();await commit(cs[0],`${scope}-${i}`,subj,base+i+200);samples.push({i,ms:performance.now()-t})}return {scope,shape,n,warmup:200,latency:summary(samples.map(s=>s.ms)),samples}});
 }else if(mode==='history'){
  const start=Date.now();let i=0;
  // [EXP-XN1] Why: build 20k genuine durable versions on the measured subject's head.
  // Rejected: unrelated subjects or one bulk transaction (does not age this head).
  for(;i<20000;i++){await commit(cs[0],`${scope}-${i}`,`${scope}-s0`,i);if(i%1000===0)console.log('history',i)}
  const head=await cs[0].query('SELECT pos FROM xn_head WHERE _id=$1',[text(`${scope}-s0`)]);
  const claims=await cs[0].query('SELECT COUNT(*) AS n FROM xn_claim WHERE _id LIKE $1',[text(`${scope}-%`)]);
  const docs=await cs[0].query('SELECT COUNT(*) AS n FROM xn_ent WHERE _id LIKE $1',[text(`${scope}-%`)]);
  const content=Number(head[0]?.pos)===20000&&Number(claims[0]?.n)===20001&&Number(docs[0]?.n)===60000;
  save('history',{scope,n:i,elapsedMs:Date.now()-start,head,claims,docs,content});if(!content)throw Error('history postflight counts mismatch');
 }else if(mode==='open'){
  const rate=Number(arg),readerCount=Number(readArg),positions=Array(200).fill(0);
  // Warm all writer sockets and the indexer with successful commands outside the timed window.
  for(let i=0;i<200;i++){const s=i%200;await commit(cs[i%16],`${scope}-warm${i}`,`${scope}-s${s}`,positions[s]++);}
  for(let w=0;w<(readerCount?4:0);w++){
   const worker=new Worker(new URL('./reader-worker.mjs',import.meta.url));workers.push(worker);
   await new Promise((resolve,reject)=>{worker.once('message',resolve);worker.once('error',reject)});
  }
  await measured(`open-${shape}-${phase}-${rate}-r${readerCount}`,async()=>{
   const samples=[],errors=[];let seed=914511;
   const rng=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return (seed+.5)/4294967296};
   const arrivals=[];let at=0;while((at+=-Math.log(rng())*1000/rate)<60000)arrivals.push({at,subject:Math.floor(rng()*200)});
   const chains=Array.from({length:200},()=>Promise.resolve());const free=[...cs],wait=[];
   const acquire=()=>free.length?Promise.resolve(free.pop()):new Promise(r=>wait.push(r));
   const release=c=>{const r=wait.shift();r?r(c):free.push(c)};
   const start=performance.now();for(const w of workers)w.postMessage('go');const jobs=[];
   for(let i=0;i<arrivals.length;i++){
    const a=arrivals[i];await sleep(Math.max(0,start+a.at-performance.now()));
    const job=chains[a.subject].then(async()=>{const c=await acquire();try{await commit(c,`${scope}-${i}`,`${scope}-s${a.subject}`,positions[a.subject]);positions[a.subject]++;samples.push({i,subject:a.subject,scheduledMs:a.at,ms:performance.now()-start-a.at})}catch(e){errors.push({i,code:e.code,message:e.message})}finally{release(c)}});
    chains[a.subject]=job;jobs.push(job);
   }
   await sleep(Math.max(0,start+60000-performance.now()));await Promise.all(jobs);
   const readerResults=await Promise.all(workers.map(w=>new Promise((resolve,reject)=>{w.once('message',resolve);w.once('error',reject);w.postMessage('stop')})));
   return {scope,shape,rate,n:samples.length,offered:arrivals.length,warmup:200,readerCount,readerResults,errors,latency:summary(samples.map(s=>s.ms)),samples};
  });
 }else throw Error('mode');
}finally{for(const w of workers)await w.terminate();for(const c of cs)c.close()}
