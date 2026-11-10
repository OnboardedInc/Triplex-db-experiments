// [XN-S2-LIVE] Why: keep a source-bound S1 command stream active throughout every Q2 pull window. Rejected: reporting a read-only maximum as concurrent-with-writes throughput.
import {parentPort,workerData} from 'node:worker_threads';
import {Wire,text} from './wire.mjs';
import {command} from './commit-lib.mjs';
import {url,sleep,summary} from './common.mjs';
const scope='q2-'+Date.now(),cs=await Promise.all(Array.from({length:16},()=>Wire.connect(url))),positions=Array(200).fill(0);
await cs[0].batch([{sql:'BEGIN READ WRITE'},{sql:'INSERT INTO xn_claim (_id) VALUES ($1)',params:[text(scope+'-seed')]},{sql:'COMMIT SYNC'}]);
for(let i=0;i<200;i++)await cs[0].batch([{sql:'BEGIN READ WRITE'},{sql:'INSERT INTO xn_head (_id,pos) VALUES ($1,0)',params:[text(`${scope}-s${i}`)]},{sql:'COMMIT SYNC'}]);
let stopped=false;parentPort.on('message',m=>{if(m==='stop')stopped=true;else if(m==='go')run().catch(e=>{throw e})});parentPort.postMessage('ready');
async function run(){
 let seed=914511,at=0,i=0;const rng=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return(seed+.5)/4294967296};
 const start=performance.now(),free=[...cs],wait=[],chains=Array.from({length:200},()=>Promise.resolve()),jobs=[],samples=[],errors=[];
 while(!stopped){at+=-Math.log(rng())*1000/workerData.rate;const sub=Math.floor(rng()*200);await sleep(Math.max(0,start+at-performance.now()));if(stopped)break;const index=i++,scheduled=at;
 const job=chains[sub].then(async()=>{const c=free.length?free.pop():await new Promise(r=>wait.push(r));try{const before=c.writes;const result=await c.batch(command(`${scope}-${index}`,`${scope}-s${sub}`,positions[sub]));if(c.writes-before!==1||!result.at(-1).commands.some(s=>s.startsWith('COMMIT')))throw Error('missing commit');positions[sub]++;samples.push({i:index,ms:performance.now()-start-scheduled})}catch(e){errors.push({i:index,message:e.message})}finally{const r=wait.shift();r?r(c):free.push(c)}});chains[sub]=job;jobs.push(job);
 }
 await Promise.all(jobs);
 const claims=await cs[0].query('SELECT COUNT(*) AS n FROM xn_claim WHERE _id LIKE $1',[text(scope+'-%')]);
 const docs=await cs[0].query('SELECT COUNT(*) AS n FROM xn_ent WHERE _id LIKE $1',[text(scope+'-%')]);
 if(errors.length||samples.length!==i||Number(claims[0].n)!==i+1||Number(docs[0].n)!==i*3)throw Error('background writer content failure');
 parentPort.postMessage({scope,rate:workerData.rate,offered:i,acknowledged:samples.length,elapsedMs:performance.now()-start,latency:summary(samples.map(s=>s.ms)),errors,samples,claims,docs});for(const c of cs)c.close();
}
