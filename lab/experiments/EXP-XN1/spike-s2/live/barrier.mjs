// [XN-S2-LIVE] Why: after a process restart, wait for a fresh writer source position before warming reader sockets. Rejected: a ready SELECT 1 as proof that the follower has replayed fixture rows.
import {Wire,text} from './wire.mjs';
import {url,readUrl,save} from './common.mjs';
const w=await Wire.connect(url),r=await Wire.connect(readUrl),id='barrier-'+Date.now();
try{
 await w.batch([{sql:'BEGIN READ WRITE'},{sql:'INSERT INTO xn_barrier (_id,v) VALUES ($1,$2)',params:[text(id),text(id)]},{sql:'COMMIT SYNC'}]);
 const token=(await w.query('SHOW LATEST_SUBMITTED_TX'))[0].await_token;
 const result=await r.batch([{sql:`BEGIN READ ONLY WITH (AWAIT_TOKEN='${token}')`},{sql:'SELECT v FROM xn_barrier WHERE _id=$1',params:[text(id)]},{sql:"SELECT doc FROM xn_ent WHERE _id='s000000'"},{sql:'COMMIT'}]);
 if(result[1].rows[0]?.v!==id||result[2].rows[0]?.doc!==('s000000|').padEnd(1500,'x'))throw Error('barrier content failed');
 save(id,{token,rows:result[1].rows,seedBytes:result[2].rows[0].doc.length});
}finally{w.close();r.close()}
