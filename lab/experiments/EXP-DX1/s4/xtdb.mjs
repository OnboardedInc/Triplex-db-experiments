// [DX-S4] Why: load exactly one document per canonical row through native SQL, without product changes. Rejected: speed comparisons using a different write path.
import fs from 'node:fs';
import readline from 'node:readline';
import crypto from 'node:crypto';
import {Wire} from './wire.mjs';
const fields=JSON.parse(fs.readFileSync('/input/summary.json')).fields;
const wire=await Wire.connect(`postgres://xtdb@${process.env.S4_PREFIX}-xtdb:5432/xtdb`);
// [DX-S4] Why: reuse one parameterized plan instead of retaining hundreds of literal INSERT plans (batch1 exhausted heap at 80k rows). Rejected: increasing heap to hide unbounded plan cardinality.
const oids=[25,20,25,25,25,25,25,701,20,701,25,701,701,701,25,25,20,25];
let batch=[],count=0;
const prepared=new Set();
async function flush(){
 if(!batch.length)return;
 const name=`load_${batch.length}`;
 if(!prepared.has(name)){
  const values=batch.map((r,i)=>`(${oids.map((_,j)=>`$${i*oids.length+j+1}`).join(',')})`).join(',');
  await wire.prepare(name,`INSERT INTO facts (_id,${fields.join(',')}) VALUES ${values}`,batch.flatMap(()=>oids));
  prepared.add(name);
 }
 const params=batch.flatMap(r=>[r[1],Number(r[0]),...r.slice(1)].map((value,i)=>({type:oids[i],value})));
 await wire.query('BEGIN READ WRITE');
 await wire.execute(name,params);
 await wire.query('COMMIT SYNC');
 count+=batch.length;batch=[];
 if(count%8192===0)console.log(JSON.stringify({event:'progress',count}));
}
try {
 for await(const line of readline.createInterface({input:fs.createReadStream('/input/rows.jsonl')})){
  batch.push(JSON.parse(line));if(batch.length>=128)await flush();
 }
 await flush();
 console.log(JSON.stringify({event:'loaded',count,rows:await wire.query('SELECT COUNT(*) AS n FROM facts')}));
 const expected=[];
 for await(const line of readline.createInterface({input:fs.createReadStream('/input/rows.jsonl')}))expected.push(JSON.parse(line));
 const rows=await wire.query(`SELECT ${fields.join(',')} FROM facts ORDER BY recorded_position,entity_id,id`);
 if(rows.length!==expected.length)throw Error('readback cardinality');
 for(let i=0;i<rows.length;i++)for(let k=0;k<fields.length;k++){
  let want=expected[i][k],got=rows[i][fields[k]]??null;
  if(k===0)want=Number(want);
  if(typeof want==='number')got=got===null?null:Number(got);
  if(typeof want==='boolean')got=got==='t'||got==='true';
  if(want!==got)throw Error(`readback mismatch ${i} ${fields[k]} ${JSON.stringify({want,got})}`);
 }
 console.log(JSON.stringify({event:'content-match',rows:rows.length,inputSha256:crypto.createHash('sha256').update(fs.readFileSync('/input/rows.jsonl')).digest('hex')}));
} finally {wire.close()}
