// [EXP-K01-VK01-R8] Why: test representations and fresh-seed equivalence independently of the codec and normalizer's own examples. Rejected: checking only hash helpers or trusting normalized fields because their names look generated.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { fields, readG0, readE1G0, admitG0, canonical } from '../../bench/lib/g0.ts';
import { wireRows } from '../../bench/lib/g0-wire.ts';
const out = process.env.TX2_K01_REP_OUT ?? '/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VK01/round8/attempt-1/representation';
const records = [];
const stableJson = value => JSON.stringify(value, (_k, v) => v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map(k => [k,v[k]])) : v);
const spec = (oid, text) => ({ wireSpec: true, oid, bytes: Buffer.from(text) });
const expected = { scope: 'independent-e1', position: 2, world: 'N01', counts: { tx_assertions: 10, tx_claims: 2, tx_attempts: 2, tx_meta: 1 } };
function fixture(tag, mode = 'decoded', edit = () => {}) {
  const tables = Object.fromEntries(Object.keys(fields).map(t => [t, []]));
  const complete = (table, values) => ({ ...Object.fromEntries(fields[table].map(c => [c,null])), ...values });
  const makeAssertion = (id, tx, clock, position, input) => complete('tx_assertions', {
    _id: JSON.stringify([expected.scope,id]), scope_key: expected.scope, id, tx_id: tx,
    recorded_at: clock, recorded_position: position, valid_from: input.valid_from ?? clock,
    ...input,
  });
  for (let i = 1; i <= 2; i++) {
    const clock = i * 1000 + (tag === 'a' ? 0 : 9000), tx = tag + '-transaction-' + i;
    const business = makeAssertion(tag + '-assertion-' + i, tx, clock, i, {
      entity_id: 'member-' + i, entity_type: 'member', attribute: ':member/time', schema_version: 1,
      value_type: 'datetime', value_datetime: 123456 + i, valid_from: 1000, valid_to: null, created_by: 'caller-actor',
    });
    edit(business, i);
    const value = business.value_type === 'json' ? { type:'json', value:JSON.parse(business.value_json) } : { type:business.value_type, value:business.value_datetime };
    business.value_identity = stableJson(value);
    tables.tx_assertions.push(business);
    const body = { op:'assert', tripleId:business.id, entityId:business.entity_id, entityType:business.entity_type, attribute:business.attribute, value, validFrom:business.valid_from, ...(business.valid_to === null ? {} : {validTo:business.valid_to}), recordedAt:clock, assertionTxId:tx };
    for (const [kind, metadataValue] of [['position',{type:'number',value:i}],['instant',{type:'datetime',value:clock}],['changedEntity',{type:'ref',value:business.entity_id}],['change',{type:'json',value:body}]]) {
      const id = tag + '-metadata-' + kind + '-' + i;
      tables.tx_assertions.push(makeAssertion(id, tx, clock, i, {
        entity_id:tx, entity_type:'_Transaction', attribute:':_tx/'+kind, schema_version:1,
        value_type:metadataValue.type,
        value_number:metadataValue.type==='number'?metadataValue.value:null,
        value_datetime:metadataValue.type==='datetime'?metadataValue.value:null,
        value_string:metadataValue.type==='ref'?metadataValue.value:null,
        value_json:metadataValue.type==='json'?JSON.stringify(metadataValue.value):null,
        value_identity:stableJson(metadataValue),
      }));
    }
    tables.tx_claims.push(complete('tx_claims', { _id:JSON.stringify([expected.scope,'command-'+i]), scope_key:expected.scope, command_id:'command-'+i, tx_id:tx, recorded_at:clock, position:i }));
    tables.tx_attempts.push(complete('tx_attempts', { _id:JSON.stringify([expected.scope,tag+'-operation-'+i]), scope_key:expected.scope, operation_id:tag+'-operation-'+i, attempt_id:tag+'-attempt-'+i, position:i }));
  }
  tables.tx_meta.push({ _id:expected.scope, scope_key:expected.scope, position:2 });
  const calls = [];
  const encodeRow = row => {
    const columns = [], values = [];
    for (const [name, v] of Object.entries(row)) {
      const cell = v?.wireSpec ? v : v===null ? null : typeof v==='number' ? spec(Object.is(v,-0)||!Number.isInteger(v)?701:20,Object.is(v,-0)?'-0':String(v)) : typeof v==='boolean' ? spec(16,v?'t':'f') : spec(25,String(v));
      columns.push({name,type:cell?.oid ?? 25}); values.push(cell?.bytes ?? null);
    }
    return wireRows(Object.assign([values],{columns}))[0];
  };
  const reader = { endpoint:'offline-'+mode+'-'+tag,
    async scopes(signal) { calls.push({kind:'scopes',aborted:signal.aborted}); return [{scope_key:expected.scope,position:expected.position}]; },
    async count(table,_scope,signal) { calls.push({kind:'count',table,aborted:signal.aborted}); return tables[table].length; },
    async *scan(table,_scope,signal) { calls.push({kind:'scan',table,aborted:signal.aborted}); for (const row of tables[table]) yield mode==='wire'?encodeRow(row):row; },
  };
  return {tables,reader,calls};
}
const nan = hex => Buffer.from(hex,'hex').readDoubleBE();
const pairs = [
  ['negative-zero',-0,0], ['integer-float',1n,1], ['large-integer',9007199254740992n,9007199254740993n],
  ['NaN-payload',nan('7ff8000000000001'),nan('7ff8000000000002')], ['NaN-sign',nan('fff8000000000001'),nan('7ff8000000000001')],
  ['float-next-bit',1,Buffer.from('3ff0000000000001','hex').readDoubleBE()], ['infinity-sign',Infinity,-Infinity],
  ['NFC-NFD','\u00e9','e\u0301'], ['UTF16-surrogate','\ud800','\ufffd'],
  ['timestamp-offset-text','2026-01-01T12:00:00+01:00','2026-01-01T11:00:00Z'],
  ['time-offset-text','12:00:00+01:00','11:00:00Z'], ['date-vs-text',new Date(0),'1970-01-01T00:00:00.000Z'],
  ['date-one-ms',new Date(0),new Date(1)], ['date-vs-number',new Date(0),0],
  ['binary-kind',Uint8Array.from([255]),Int8Array.from([-1])], ['binary-content',Buffer.from([1]),Buffer.from([2])],
  ['nested-zero',{k:[-0]},{k:[0]}], ['scalar-kind',false,0], ['null-kind',null,'null'],
];
for (const [name,a,b] of pairs) test('complete D separates observed representation: '+name,async()=>{
  const f=fixture('a'); f.tables.tx_assertions[0].stored_probe=a; const pin=await readG0(f.reader,expected);
  f.tables.tx_assertions[0].stored_probe=b; const current=await readG0(f.reader,expected);
  records.push({kind:'representation',mode:'decoded',name,before:canonical(a),after:canonical(b),pin,current});
  assert.notEqual(current.D,pin.D); await assert.rejects(admitG0(f.reader,pin,expected),/content mismatch/);
});
for (const [name,a,b] of [
  ['int2-int4',spec(21,'1'),spec(23,'1')], ['int4-int8',spec(23,'1'),spec(20,'1')],
  ['integer-float',spec(20,'1'),spec(701,'1')], ['float4-float8',spec(700,'1'),spec(701,'1')],
  ['negative-zero',spec(701,'-0'),spec(701,'0')], ['decimal-scale',spec(1700,'1.0'),spec(1700,'1.00')],
  ['decimal-sign-zero',spec(1700,'-0.00'),spec(1700,'0.00')], ['unicode-NFC-NFD',spec(25,'\u00e9'),spec(25,'e\u0301')],
  ['decimal-text-kind',spec(1700,'1.00'),spec(25,'1.00')], ['bytea-hex',spec(17,'\\x00'),spec(17,'\\x01')],
]) test('raw-frame D separates stored representation: '+name,async()=>{
  const f=fixture('a','wire'); f.tables.tx_assertions[0].stored_probe=a; const pin=await readG0(f.reader,expected);
  f.tables.tx_assertions[0].stored_probe=b; const current=await readG0(f.reader,expected);
  records.push({kind:'representation',mode:'wire',name,before:{oid:a.oid,hex:a.bytes.toString('hex')},after:{oid:b.oid,hex:b.bytes.toString('hex')},pin,current});
  assert.notEqual(current.D,pin.D); await assert.rejects(admitG0(f.reader,pin,expected),/content mismatch/);
});
for (const [oid,text] of [[700,'NaN'],[701,'NaN'],[1082,'2026-01-01'],[1083,'12:00:00'],[1114,'2026-01-01 12:00:00'],[1184,'2026-01-01 12:00:00+01'],[1266,'12:00:00+01'],[1186,'1 month'],[114,'{"x":1}'],[3802,'{"x":1}']]) test('unsupported native representation refuses, never approximates: '+oid,async()=>{
  const f=fixture('a','wire'); f.tables.tx_assertions[0].stored_probe=spec(oid,text);
  let error;try{await readG0(f.reader,expected);}catch(e){error=e.message;}
  records.push({kind:'unsupported-wire',oid,text,error});assert.match(error??'',/wire representation is not lossless/);
});
// [EXP-K01-VK01-R8] Why: the result OID describes a column, not its individual stored union legs. Rejected: assuming the server preserves per-row widths because Postgres.js returns raw bytes.
for (const variant of ['integer-width','float-width']) test('D must refuse a changed stored type hidden by XTDB column widening: '+variant,async()=>{
  const upstream='/Users/sam/projects/triplex-db-2/references/xtdb/core/src/main/kotlin/xtdb/';
  const pg=fs.readFileSync(upstream+'pgwire/PgType.kt','utf8');
  assert.match(pg,/pgTypes\.all \{ it in INTS \} -> Int8/);
  assert.match(pg,/pgTypes\.all \{ it in FLOATS \} -> Float8/);
  assert.match(fs.readFileSync(upstream+'arrow/FloatVector.kt','utf8'),/getDouble\(idx: Int\) = getFloat\(idx\)\.toDouble\(\)/);
  assert.match(fs.readFileSync(upstream+'arrow/IntVector.kt','utf8'),/getLong\(idx: Int\) = getInt\(idx\)\.toLong\(\)/);
  const f=fixture('a','wire');
  const sourceWidths=[64,64], cloneWidths=[32,64];
  const rows=variant==='integer-width'?f.tables.tx_attempts:(f.tables.tx_query_members=[1,2].map(i=>({ _id:'member-'+i,scope_key:expected.scope,generation:'g',ordinal:i,binding_0:null })));
  const column=variant==='integer-width'?'position':'binding_0';
  const values=variant==='integer-width'?[1,2]:[1.5,2.5];
  const serialize=widths=>{
    const oid=variant==='integer-width'?(widths.every(w=>w===32)?23:20):(widths.every(w=>w===32)?700:701);
    for(let i=0;i<rows.length;i++)rows[i][column]=spec(oid,String(values[i]));
  };
  serialize(sourceWidths);const pin=await readG0(f.reader,expected);
  serialize(cloneWidths);let result,error;try{result=await admitG0(f.reader,pin,expected);}catch(e){error=e.message;}
  records.push({kind:'upstream-column-widening',variant,sourceWidths,cloneWidths,values,column,pin,result,error,sourceInferenceOnly:true,explanation:'The model applies pinned PgType.unifyPgTypes and numeric vector widening, then executes actual wireRows and G0. No native engine request ran.'});
  assert.ok(error,'different stored union-leg widths must not receive full D PASS');
});
for (const mode of ['decoded','wire']) {
  test('fresh identical inputs match only Dprime: '+mode,async()=>{
    const a=fixture('a',mode),b=fixture('b',mode),pa=await readE1G0(a.reader,expected),pb=await readE1G0(b.reader,expected);
    records.push({kind:'e1-positive',mode,pa,pb,callsA:a.calls,callsB:b.calls});
    assert.notEqual(pa.D,pb.D);assert.equal(pa.Dprime,pb.Dprime);await assert.rejects(admitG0(b.reader,pa,expected));
    assert.equal((await admitG0(b.reader,pb,expected)).status,'PASS');
  });
  for (const variant of ['user-datetime','user-valid-from','user-valid-to','user-actor','user-JSON-lookalike']) test('Dprime preserves caller input: '+mode+'/'+variant,async()=>{
    const a=fixture('a',mode),b=fixture('b',mode,(r,i)=>{
      if(i!==1)return;
      if(variant==='user-datetime')r.value_datetime++;
      if(variant==='user-valid-from')r.valid_from++;
      if(variant==='user-valid-to')r.valid_to=99999;
      if(variant==='user-actor')r.created_by='other-caller';
      if(variant==='user-JSON-lookalike'){r.value_type='json';r.value_datetime=null;r.value_json='{"recordedAt":1000,"tripleId":"literal-user-id","value":{"time":"2026-01-01T12:00:00+01:00"}}';}
    });
    const pa=await readE1G0(a.reader,expected),pb=await readE1G0(b.reader,expected);
    records.push({kind:'e1-user-value',mode,variant,pa,pb});assert.notEqual(pa.Dprime,pb.Dprime);
  });
  test('Dprime retains a changed nested caller timestamp inside generated change JSON: '+mode,async()=>{
    const setup=(r)=>{r.value_type='json';r.value_datetime=null;r.value_json='{"recordedAt":1000,"value":{"recordedAt":2000}}';};
    const a=fixture('a',mode,setup),b=fixture('b',mode,r=>{setup(r);r.value_json=r.value_json.replace(':2000',':2001');});
    const pa=await readE1G0(a.reader,expected),pb=await readE1G0(b.reader,expected);
    records.push({kind:'nested-user-time',mode,pa,pb});assert.notEqual(pa.Dprime,pb.Dprime);
  });
  test('Dprime refuses or distinguishes an instant inconsistent with its assigning clock: '+mode,async()=>{
    const a=fixture('a',mode),b=fixture('b',mode);
    const instant=b.tables.tx_assertions.find(r=>r.attribute===':_tx/instant');
    instant.value_datetime=42;instant.value_identity=stableJson({type:'datetime',value:42});
    const pa=await readE1G0(a.reader,expected);let pb,error;try{pb=await readE1G0(b.reader,expected);}catch(e){error=e.message;}
    records.push({kind:'inconsistent-generated-instant',mode,pa,pb,error,recordedAt:instant.recorded_at,instant:instant.value_datetime});
    assert.ok(error||pb.Dprime!==pa.Dprime,'inconsistent generated timestamp must not be normalized into E1 equivalence');
  });
}
after(()=>{fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'cases.json'),JSON.stringify(records,null,2)+'\n');});
