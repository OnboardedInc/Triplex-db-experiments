// [XN-S2-LIVE] Why: measure await+snapshot query service after obtaining fresh writer tokens, and verify changing values at two exact bases. Rejected: treating a token's mere acceptance as content correctness.
import {Wire,text} from './wire.mjs';
import {url,readUrl,save,summary,measured} from './common.mjs';
const w=await Wire.connect(url),r=await Wire.connect(readUrl),scope='wait-'+Date.now();
try{await measured('wait-mechanism',async()=>{const samples=[];let prior;
 for(let i=0;i<500;i++){
  await w.batch([{sql:'BEGIN READ WRITE'},{sql:'INSERT INTO xn_wait (_id,value) VALUES ($1,$2)',params:[text(scope),text(String(i))]},{sql:'COMMIT SYNC'}]);const ack=performance.now();
  const token=(await w.query('SHOW LATEST_SUBMITTED_TX'))[0].await_token,snapshot=Object.values((await w.query('SHOW SNAPSHOT_TOKEN'))[0])[0],clock=(await w.query('SELECT CURRENT_TIMESTAMP AS clock'))[0].clock,t=performance.now();
  const rows=(await r.batch([{sql:`BEGIN READ ONLY WITH (AWAIT_TOKEN='${token}', SNAPSHOT_TOKEN='${snapshot}', CLOCK_TIME=TIMESTAMP '${clock}')`},{sql:'SELECT value FROM xn_wait WHERE _id=$1',params:[text(scope)]},{sql:'COMMIT'}]))[1].rows;
  if(rows.length!==1||rows[0].value!==String(i))throw Error('fresh wait content mismatch');
  samples.push({i,awaitAndPullMs:performance.now()-t,ackToObservedMs:performance.now()-ack,token,snapshot,clock});
  if(prior&&i%50===0){const past=await r.query(`SETTING SNAPSHOT_TOKEN='${prior.snapshot}', CLOCK_TIME=TIMESTAMP '${prior.clock}' SELECT value FROM xn_wait WHERE _id=$1`,[text(scope)]);if(past.length!==1||past[0].value!==String(i-1))throw Error('exact past value mismatch')}
  prior={snapshot,clock};
 }
 return {n:samples.length,latency:summary(samples.map(x=>x.awaitAndPullMs)),ackToObserved:summary(samples.map(x=>x.ackToObservedMs)),samples};});}finally{w.close();r.close()}
