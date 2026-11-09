# Round 11 live handoff — commands, not executed

North star: exact reusable seeds supporting P1–P5, under lab/SCOPE.md, lab/NORTH-STAR.md and lab/TARGETS.md. Run from the K01 checkout after integration/build/source pinning, only when the orchestrator schedules the rerun after EXP-P2X2 releases the slot. Round 10 and its first failure remain immutable; this is a new attempt. These commands do not qualify the implementation until their actual output is reviewed. Node >=22 with TypeScript stripping, built core/XTDB packages and the lab dependencies are prerequisites. Keep all first failures. Use a new run directory; never overwrite an earlier manifest. The probe writes only to the holder's disposable s1 and destroys that slot before seeding. No resident changes are needed. If admission refuses, stop and wait for the orchestrator; do not park lane D yourself.

```sh
set -e
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
run="runs/xtdb-seed/k01-r11-$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$run"
node -e 'const s=require("node:fs").statfsSync(".");if(s.bavail*s.bsize<5*1024**3)process.exit(1)'
node lab/bin/engine.mjs up --lane xtdb --slot s1 --holder CX-K01-R11-live --exp EXP-K01 --fresh > "$run/engine.env"
. "$run/engine.env"
```

First validate the actual engine's native discriminator and raw numeric transport. The casts below are pinned-source SQL types (`src/test/clojure/xtdb/sql/expr_test.clj`). The source expectation table is in WIRE-TYPES-round11.md. NULLability is `[:? :kind ...]` (serde/types.clj:279-284); mixed columns are EDN sets with unspecified order (:286-288). If this image does not expose the expected catalog or cast/storage type, the probe refuses; investigate rather than substituting a guessed type. Read/submit deadlines are 60 s. Writes go through the adapter client only to scratch tables; G0 reads go through the production native reader. Capture the catalog and typed bytes for independent inspection.

```sh
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
node lab/bin/engine.mjs down --lane xtdb --slot s1 --holder CX-K01-R11-live --remove-volume
node lab/bin/engine.mjs up --lane xtdb --slot s1 --holder CX-K01-R11-live --exp EXP-K01 --fresh > "$run/seed.env"
. "$run/seed.env"
```

Then run the exact production two-start path. Select `--subjects 500` for the small diagnostic, or replace that pair with `--rung 10k` for the 10k scale arm in a separate fresh run. Do not infer scale acceptance from the 500-subject result. The manifest pins D/Dprime before finish-block; golden invokes two ordinary clone starts, fresh D and layout equality on each, and publishes only afterward.

```sh
node lab/bin/heavy.mjs --label CX-K01-R11-seed -- node lab/bench/xtdb-seed.ts --subjects 500 --seed ns-v2 --seed-batch-facts 400 --out "$run/seed" > "$run/seed.log" 2>&1
node lab/bin/heavy.mjs --label CX-K01-R11-two-start -- node lab/bin/engine.mjs golden --lane xtdb --slot s1 --holder CX-K01-R11-live --manifest "$run/seed/manifest.json" > "$run/golden.log" 2>&1
node lab/bin/heavy.mjs --label CX-K01-R11-clone -- node lab/bin/engine.mjs clone --lane xtdb --slot s1 --holder CX-K01-R11-live --golden-record "$run/seed/golden.json" > "$run/clone.env" 2> "$run/clone.log"
node lab/bin/engine.mjs down --lane xtdb --slot s1 --holder CX-K01-R11-live --remove-volume
# Keep the published golden with its reported owned volume name/size and Q93b record.
# Do not remove it before the scheduled E1/reference comparison.
```

Run cleanup even if a preceding command fails, after reading its first-failure log. If golden creation failed after allocating a volume but before publishing golden.json, its log prints the owned golden name; use `engine.mjs golden-rm --volume THAT_EXACT_NAME`. Never guess a volume name or remove an earlier invocation's golden. Record actual durations, image/config/source hashes, wire observations, D/Dprime/L, and cleanup outcomes. Retain a successfully published golden, named with its size and qualification record under Q93b; remove an unpublished golden only if it belongs to this attempt. Name and size any intentionally retained volume. These smoke probes and the two-start commands do not cover every native value representation or run E1/P5 measurement. The orchestrator must schedule the remaining native-kind probes and fresh-seed Dprime comparison before acceptance; a successful numeric smoke probe alone is insufficient.
