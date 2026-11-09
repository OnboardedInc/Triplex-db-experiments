// @ts-nocheck -- [EXP-XN1] Why: diagnostic wire records and observation bags are populated at runtime. Rejected: product types for this standalone spike.
// [EXP-XN1] Why: force a block cut, then observe real compaction and 60s idle before the second pass.
// Rejected: sleeping alone (does not prove the live block was flushed).
import {Wire,text} from './wire.mjs';
import {url,docker,cpu,save,sleep} from './common.mjs';
const c=await Wire.connect(url),start=Date.now(),samples=[];
const files=()=>docker('exec','tx2-xtdb-s1','find','/var/lib/xtdb/buffers','-name','b*.binpb');
const before=files();
const finish=docker('exec','tx2-xtdb-s1','wget','-qO-','--post-data=','http://127.0.0.1:8080/system/finish-block');
let prev=cpu(),quiet=0;
try{
 while(Date.now()-start<15*60*1000){await sleep(5000);const cur=cpu(),cores=(cur-prev)/5e6;prev=cur;
 const metrics=docker('exec','tx2-xtdb-s1','wget','-qO-','http://127.0.0.1:8080/metrics');
 const jobs=metrics.split('\n').filter(l=>/^compactor_jobs_available(?:\{|\s)/.test(l));
 const idle=cores<.05&&jobs.length>0&&jobs.every(l=>Number(l.trim().split(/\s+/).at(-1))===0);
 quiet=idle?quiet+5:0;samples.push({at:new Date().toISOString(),cores,jobs,quiet});console.log('settle',cores,jobs,quiet);if(quiet>=60)break;
 }
 const checkpoint=docker('exec','tx2-xtdb-s1','wget','-qO-','--post-data=','http://127.0.0.1:8080/system/finish-block');
 await sleep(5000);
 // [EXP-XN1] Why: 2.2.0's cached live snapshot refreshes at a write (R30 section 2.2).
 // Rejected: assuming finish-block alone makes subsequent reads use the compacted catalog.
 await c.batch([{sql:'BEGIN READ WRITE'},{sql:'INSERT INTO xn_basis_marker (_id,v) VALUES ($1,$2)',params:[text('post-flush'),text('refresh')]},{sql:'COMMIT SYNC'}]);
 const after=files(),tries=await c.query("SELECT * FROM xt.trie_stats WHERE table_name = 'xn_ent'"),live=await c.query('SELECT * FROM xt.live_tables');
 save('settle',{elapsedMs:Date.now()-start,reached:quiet>=60,criterion:'<0.05 cores and compactor jobs available=0, every 5s for 60s',before,finish,checkpoint,after,tries,live,samples});
 if(quiet<60)throw Error('not idle');
}finally{c.close()}
