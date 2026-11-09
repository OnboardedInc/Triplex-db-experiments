set -e
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
run='runs/xtdb-seed/k01-r11-20261109T052411Z'
. "$run/engine.env"
node lab/bin/heavy.mjs --label CX-K01-R11-wire -- node --experimental-strip-types --input-type=module > "$run/wire.log" 2>&1 <<'JS'
import assert from 'node:assert/strict';
import { makeXtdbClient } from './packages/xtdb/dist/index.js';
import { openWire } from './lab/bench/lib/g0-wire.ts';
import { canonical } from './lab/bench/lib/g0-values.ts';
import { nativeUnionLegs } from './lab/bench/lib/g0-native.ts';
import { bounded } from './lab/bench/lib/g0.ts';
assert(process.env.XTDB_URL);
assert(process.env.TRIPLEX_LAB_SLOT_OWNER?.endsWith('/xtdb-s1/owner.json'));
const fs = await import('node:fs');
const owner = JSON.parse(fs.readFileSync(process.env.TRIPLEX_LAB_SLOT_OWNER,'utf8'));
assert.equal(owner.holder,'CX-K01-R11-live');
const c = makeXtdbClient(process.env.XTDB_URL,{maxConnections:1});
const w = await openWire(process.env.XTDB_URL);
const query = s => bounded(signal => c.query(s,[],undefined,{signal,timeoutMs:60000}),60000);
// [EXP-K01-R11] Why: serde/types.clj:97-109 renders native scalar keywords; PgType.kt:951-960 maps the SQL widths to OIDs. Rejected: treating a result-column OID as a per-row union-leg witness.
const cases = [
 ['int_narrow','INTEGER',':i32'], ['int_wide','BIGINT',':i64'],
 ['float_narrow','REAL',':f32'], ['float_wide','DOUBLE PRECISION',':f64'],
];
const observed = new Map();
try {
 for (const [suffix,cast,expected] of cases) {
  const table='tx_wire_'+suffix;
  await bounded(() => c.submit([{sql:`INSERT INTO ${table} (_id,scope_key,v) VALUES ('a','wire',CAST(1 AS ${cast}))`}]),60000);
  const n=await query(`SELECT COUNT(*) AS n FROM ${table}`);
  assert.equal(Number(n[0].n),1);
  const cat=await query(`SELECT column_name,xt_type FROM information_schema.columns WHERE table_name='${table}' AND table_schema='public' ORDER BY column_name`);
  assert.equal(cat.find(r=>r.column_name==='v')?.xt_type,expected);
  const rows=await bounded(signal=>w.scan(`SELECT v FROM ${table} WHERE scope_key = ?`,['wire'],signal),60000);
  assert.equal(rows.length,1);
  observed.set(suffix,canonical(rows[0].v));
  console.log({table,cat,canonical:canonical(rows)});
 }
 assert.notEqual(observed.get('int_narrow'),observed.get('int_wide'));
 assert.notEqual(observed.get('float_narrow'),observed.get('float_wide'));
 for (const [suffix,narrow,wide] of [['mixed_int','INTEGER','BIGINT'],['mixed_float','REAL','DOUBLE PRECISION']]) {
  const table='tx_wire_'+suffix;
  await bounded(()=>c.submit([{sql:`INSERT INTO ${table} (_id,scope_key,v) VALUES ('a','wire',CAST(1 AS ${narrow})),('b','wire',CAST(2 AS ${wide}))`}]),60000);
  assert.equal(Number((await query(`SELECT COUNT(*) AS n FROM ${table}`))[0].n),2);
  const cat=await query(`SELECT column_name,xt_type FROM information_schema.columns WHERE table_name='${table}' AND table_schema='public' ORDER BY column_name`);
  // [EXP-K01-R11] Why: serde/types.clj:286-288 renders Poly as an unordered EDN set, confirmed by live-round10. Rejected: /:union/ (Arrow input tag); assert the complete expected leg set instead.
  assert.deepEqual(nativeUnionLegs(cat.find(r=>r.column_name==='v')?.xt_type), suffix==='mixed_int' ? [':i32',':i64'] : [':f32',':f64']);
  await assert.rejects(()=>bounded(signal=>w.scan(`SELECT v FROM ${table} WHERE scope_key = ?`,['wire'],signal),60000),/ambiguous or inconsistent native type/);
  console.log({table,cat,refusedAmbiguousUnion:true});
 }
} finally { await bounded(()=>Promise.all([c.close(),w.close()]),30000); }
JS
