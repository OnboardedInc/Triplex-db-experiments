// [DX-S4] Why: measure actual nested row arrays in one document per domain entity. Rejected: a JSON string column (would hide nested index costs and change query access).
import fs from 'node:fs';
import readline from 'node:readline';
import crypto from 'node:crypto';
import {Wire} from './wire.mjs';
const groups=new Map();let rows=0;
for await(const line of readline.createInterface({input:fs.createReadStream('/input/rows.jsonl')})){
 const r=JSON.parse(line);if(!groups.has(r[2]))groups.set(r[2],[]);groups.get(r[2]).push(r);rows++;
}
const wire=await Wire.connect(`postgres://xtdb@${process.env.S4_PREFIX}-xtdb:5432/xtdb`);
try{
 const entries=[...groups.entries()];let loaded=0;const prepared=new Set();
 for(let offset=0;offset<entries.length;offset+=128){
  const batch=entries.slice(offset,offset+128),name=`entities_${batch.length}`;
  if(!prepared.has(name)){
   await wire.prepare(name,`INSERT INTO facts (_id, fact_rows) VALUES ${batch.map((_,i)=>`($${2*i+1},$${2*i+2})`).join(',')}`,batch.flatMap(()=>[25,114]));prepared.add(name);
  }
  await wire.query('BEGIN READ WRITE');
  await wire.execute(name,batch.flatMap(([id,rs])=>[{type:25,value:id},{type:114,value:JSON.stringify(rs)}]));
  await wire.query('COMMIT SYNC');loaded+=batch.length;
  if(loaded%8192===0)console.log(JSON.stringify({event:'progress',entities:loaded}));
 }
 const actual=await wire.query('SELECT _id, fact_rows AS payload FROM facts');
 if(actual.length!==groups.size)throw Error('entity readback cardinality');
 let checked=0;
 for(const doc of actual){
  const expected=groups.get(doc._id),got=JSON.parse(doc.payload);
  if(!expected||got.length!==expected.length)throw Error('entity membership/count');
  for(let i=0;i<got.length;i++)for(let k=0;k<17;k++)if(got[i][k]!==expected[i][k])throw Error(`nested readback ${doc._id} ${i} ${k}`);
  checked+=got.length;groups.delete(doc._id);
 }
 if(groups.size||checked!==rows||rows!==442410)throw Error('nested assertion cardinality');
 console.log(JSON.stringify({event:'content-match',layout:'entity-nested-arrays',entities:actual.length,rows:checked,inputSha256:crypto.createHash('sha256').update(fs.readFileSync('/input/rows.jsonl')).digest('hex')}));
}finally{wire.close()}
