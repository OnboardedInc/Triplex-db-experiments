// [XN-S2-LIVE] Why: validate the retained fixture afresh after an interrupted preparation or a rejected postflight. Rejected: trusting a prior history.json boolean without checking this database.
import fs from 'node:fs';
import {Wire,text} from './wire.mjs';
import {url,save} from './common.mjs';
const old=JSON.parse(fs.readFileSync('/driver/history.json'));
const c=await Wire.connect(url);
try{
 const head=await c.query('SELECT pos FROM xn_head WHERE _id=$1',[text(`${old.scope}-s0`)]);
 const claims=await c.query('SELECT COUNT(*) AS n FROM xn_claim WHERE _id LIKE $1',[text(`${old.scope}-%`)]);
 const docs=await c.query('SELECT COUNT(*) AS n FROM xn_ent WHERE _id LIKE $1',[text(`${old.scope}-%`)]);
 const rows=await c.query('SELECT _id,doc FROM xn_ent WHERE _id IN ($1,$2,$3)',[0,1,2].map(i=>text(`${old.scope}-19999-${i}`)));
 const sizes=[3000,200,4000];const expected=new Map(sizes.map((n,i)=>[`${old.scope}-19999-${i}`,'w'.repeat(n)]));
 const content=Number(head[0]?.pos)===20000&&Number(claims[0]?.n)===20001&&Number(docs[0]?.n)===60000&&rows.length===3&&rows.every(r=>r.doc===expected.get(r._id)&&expected.delete(r._id))&&expected.size===0;
 save('history-recheck-'+process.argv[2],{at:new Date().toISOString(),scope:old.scope,head,claims,docs,lastRows:rows.map(r=>({id:r._id,bytes:r.doc.length})),content});
 if(!content)throw Error('retained history fixture mismatch');
}finally{c.close()}
