// @ts-nocheck -- [EXP-XN1] Why: diagnostic wire records and observation bags are populated at runtime. Rejected: product types for this standalone spike.
// [EXP-XN1] Why: isolate contention readers from the writer event loop, using at most four workers.
// Rejected: sixteen worker threads (exceeds the host-generator limit).
import {parentPort,workerData} from 'node:worker_threads';
import {Wire,text} from './wire.mjs';
import {readUrl as url} from './common.mjs';
const cs=await Promise.all(Array.from({length:workerData?.clients??4},()=>Wire.connect(url)));
let stopped=false;
async function read(c,i){const id=`s${String(i%100000).padStart(6,'0')}`;const rows=await c.execute('pull',[text(id)]);if(rows.length!==1||rows[0].doc!==(id+'|').padEnd(1500,'x'))throw Error('reader bytes mismatch')}
await Promise.all(cs.map(async c=>{await c.prepare('pull','SELECT doc FROM xn_ent WHERE _id=$1',[25]);for(let i=0;i<100;i++)await read(c,i)}));
parentPort.postMessage('ready');
parentPort.on('message',async m=>{if(m==='stop'){stopped=true;return}if(m==='go'){
 let n=0;const start=performance.now();await Promise.all(cs.map(async(c,j)=>{let i=j;while(!stopped){await read(c,i);i+=cs.length;n++}}));
 parentPort.postMessage({n,clients:cs.length,elapsedMs:performance.now()-start});for(const c of cs)c.close();
}});
