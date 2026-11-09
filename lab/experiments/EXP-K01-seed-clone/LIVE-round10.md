# Round 10 live handoff — commands, not executed

Run from the K01 checkout after integration/build/source pinning, during an admitted scale window. These commands do not qualify the implementation until their actual output is reviewed. Node >=22 with TypeScript stripping, built core/XTDB packages and the lab dependencies are prerequisites. Keep all first failures. Use a new run directory; never overwrite an earlier manifest. The probe writes only to the holder's disposable s1 and destroys that slot before seeding. No resident changes are needed. If admission refuses, stop and wait for the orchestrator; do not park lane D yourself.

```sh
set -e
export DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock
run="runs/xtdb-seed/k01-r10-$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$run"
node -e 'const s=require("node:fs").statfsSync(".");if(s.bavail*s.bsize<5*1024**3)process.exit(1)'
node lab/bin/engine.mjs up --lane xtdb --slot s1 --holder CX-K01-R10-live --exp EXP-K01 --fresh > "$run/engine.env"
. "$run/engine.env"
```

First validate the actual engine's native discriminator and raw numeric transport. The casts below are pinned-source SQL types (`src/test/clojure/xtdb/sql/expr_test.clj`). If this image does not expose the expected catalog or cast/storage type, the probe refuses; investigate rather than substituting a guessed type. Read/submit deadlines are 60 s. Writes go through the adapter client only to scratch tables; G0 reads go through the production native reader. Capture the catalog and typed bytes for independent inspection.

```sh
node lab/bin/heavy.mjs --label CX-K01-R10-wire -- node --experimental-strip-types --input-type=module > "$run/wire.log" 2>&1 <<'JS'
import assert from 'node:assert/strict';
import { makeXtdbClient } from './packages/xtdb/dist/index.js';
import { openWire } from './lab/bench/lib/g0-wire.ts';
import { canonical } from './lab/bench/lib/g0-values.ts';
import { bounded } from './lab/bench/lib/g0.ts';
assert(process.env.XTDB_URL);
assert(process.env.TRIPLEX_LAB_SLOT_OWNER?.endsWith('/xtdb-s1/owner.json'));
const fs = await import('node:fs');
const owner = JSON.parse(fs.readFileSync(process.env.TRIPLEX_LAB_SLOT_OWNER,'utf8'));
assert.equal(owner.holder,'CX-K01-R10-live');
const c = makeXtdbClient(process.env.XTDB_URL,{maxConnections:1});
const w = await openWire(process.env.XTDB_URL);
const query = s => bounded(signal => c.query(s,[],undefined,{signal,timeoutMs:60000}),60000);
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
  assert.match(cat.find(r=>r.column_name==='v')?.xt_type??'',/:union/);
  await assert.rejects(()=>bounded(signal=>w.scan(`SELECT v FROM ${table} WHERE scope_key = ?`,['wire'],signal),60000),/ambiguous or inconsistent native type/);
  console.log({table,cat,refusedAmbiguousUnion:true});
 }
} finally { await bounded(()=>Promise.all([c.close(),w.close()]),30000); }
JS
node lab/bin/engine.mjs down --lane xtdb --slot s1 --holder CX-K01-R10-live --remove-volume
node lab/bin/engine.mjs up --lane xtdb --slot s1 --holder CX-K01-R10-live --exp EXP-K01 --fresh > "$run/seed.env"
. "$run/seed.env"
```

Then run the exact production two-start path. Select `--subjects 500` for the small diagnostic, or replace that pair with `--rung 10k` for the 10k scale arm in a separate fresh run. Do not infer scale acceptance from the 500-subject result. The manifest pins D/Dprime before finish-block; golden invokes two ordinary clone starts, fresh D and layout equality on each, and publishes only afterward.

```sh
node lab/bin/heavy.mjs --label CX-K01-R10-seed -- node lab/bench/xtdb-seed.ts --subjects 500 --seed ns-v2 --seed-batch-facts 400 --out "$run/seed" > "$run/seed.log" 2>&1
node lab/bin/heavy.mjs --label CX-K01-R10-two-start -- node lab/bin/engine.mjs golden --lane xtdb --slot s1 --holder CX-K01-R10-live --manifest "$run/seed/manifest.json" > "$run/golden.log" 2>&1
node lab/bin/heavy.mjs --label CX-K01-R10-clone -- node lab/bin/engine.mjs clone --lane xtdb --slot s1 --holder CX-K01-R10-live --golden-record "$run/seed/golden.json" > "$run/clone.env" 2> "$run/clone.log"
node lab/bin/engine.mjs down --lane xtdb --slot s1 --holder CX-K01-R10-live --remove-volume
node lab/bin/engine.mjs golden-rm --golden-record "$run/seed/golden.json"
```

Run cleanup even if a preceding command fails, after reading its first-failure log. If golden creation failed after allocating a volume but before publishing golden.json, its log prints the owned golden name; use `engine.mjs golden-rm --volume THAT_EXACT_NAME`. Never guess a volume name or remove an earlier invocation's golden. Record actual durations, image/config/source hashes, wire observations, D/Dprime/L, and cleanup outcomes. Name and size any intentionally retained volume. This handoff is for native fidelity and two-start qualification; it does not run E1 or P5 measurement.
