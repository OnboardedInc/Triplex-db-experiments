import fs from 'node:fs';
import crypto from 'node:crypto';
import { DatomicClient } from '../../../packages/datomic/dist/index.js';
// [EXP-DA01] Why: retain actual transactor datom counts and readback/cleanup per owned scope. Rejected: estimates from emitted tx-data.
const output = process.argv[2] ?? 'datoms.json';
if (!/^[a-z0-9-]+\.json$/.test(output)) throw new Error('Expected a receipt filename');
const client = new DatomicClient('http://127.0.0.1:8470');
const result = { at: new Date().toISOString(), scriptSha256: crypto.createHash('sha256').update(fs.readFileSync(import.meta.filename)).digest('hex'), health: await client.health(), imageId: JSON.parse(fs.readFileSync(new URL('../../config/slots.json', import.meta.url))).lanes.datomic.imageId, measurements: [] };
try {
  for (const n of [5, 10, 50]) {
    const scope = JSON.stringify(['triplex-scope-v1','test','da01',`datoms-${n}-${crypto.randomUUID()}`,0]);
    const created = await client.create(scope);
    const receipt = { facts: n, scope, created };
    result.measurements.push(receipt);
    try {
      const rows = Array.from({length:n}, (_,i) => ({id:`fact-${i}`,entity_id:'subject',attribute:':value',value_type:'string',value_string:String(i),value_number:null,value_boolean:null,value_datetime:null,value_json:null,recorded_at:1.5,recorded_position:1,valid_from:1.5,valid_to:null,created_by:null,retracted_at:null,retracted_position:null,retract_tx_id:null,entity_type:null,schema_version:1,tx_id:'tx-1'}));
      receipt.commit = await client.transact(created.db,{sourceK:0,position:1,operationId:crypto.randomUUID(),attemptId:crypto.randomUUID(),rows,newIds:rows.map(r=>r.id),claims:[]});
      const readback = await client.rows(created.db,{pattern:{entityId:'subject'}});
      receipt.readback = { count:readback.length,exact:readback.length===n && readback.every(r=>rows.some(w=>w.id===r.id && w.value_string===r.value_string && r.recorded_at===1.5)) };
      if (!receipt.readback.exact) throw new Error('Readback differs');
    } finally { receipt.deleted = await client.delete(scope); }
  }
} finally { client.close(); fs.writeFileSync(new URL('./receipts/continued/'+output,import.meta.url),JSON.stringify(result,null,2)+'\n',{flag:'wx'}); }
