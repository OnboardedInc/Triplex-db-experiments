import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { performance } from "node:perf_hooks";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { Effect, Layer } from "effect";
import {policy,freezeRule,loadRule,judge,gradePoint,digest} from "./rule.mjs";
import {noiseSession} from "./window.mjs";
import { wireProxy } from "../live2/wire.mjs";
const root = path.resolve(import.meta.dirname, "../../../.."),
  base = "/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-RT01/live2/baseline";
const out = "/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-RT01/live4/g6-attempt1";
assert.ok(!fs.existsSync(out));
fs.mkdirSync(out, { recursive: true });
const sha = (b) => createHash("sha256").update(b).digest("hex"),
  hash = (p) => sha(fs.readFileSync(p));
const ownerPath = "/Users/sam/projects/triplex-db-2/lab/locks/xtdb-s1/owner.json";
const owner = JSON.parse(fs.readFileSync(ownerPath));
assert.equal(owner.holder, "CX-RT01");
assert.equal(owner.slot, "s1");
const baseline = JSON.parse(fs.readFileSync(path.join(base, "identity.json")));
assert.ok(baseline.phases.every((p) => p.exit === 0));
const g2 = JSON.parse(
  fs.readFileSync(
    "/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-RT01/live4/g2-attempt1/execution.json",
  ),
);
assert.equal(g2.live.exit, 0);
assert.equal(g2.sourceUnchanged, true);
for (const [p, h] of Object.entries(g2.after))
  if (p.startsWith("packages/")) assert.equal(hash(path.join(root, p)), h, p);
for (const [p, h] of Object.entries(baseline.files)) assert.equal(hash(path.join(base, p)), h, p);
for (const [p, h] of Object.entries(g2.build)) assert.equal(hash(path.join(root, p)), h, p);
const sourcePaths = execFileSync(
  "git",
  [
    "ls-files",
    "-co",
    "--exclude-standard",
    "packages/core",
    "packages/xtdb",
    "packages/testkit",
    "pnpm-lock.yaml",
  ],
  { cwd: root, encoding: "utf8" },
)
  .trim()
  .split("\n");
const snapshot = () => Object.fromEntries(sourcePaths.map((p) => [p, hash(path.join(root, p))]));
const before = snapshot(),
  runnerHashes = Object.fromEntries(
    ["g6.mjs", "rule.mjs", "window.mjs", "M01-SOURCES.json", "m01/paired.ts", "m01/single-analysis.ts", "m01/noise.ts", "m01/noise.json", "m01/hist.ts", "m01/rng.ts", "../live2/wire.mjs"].map((p) => [p, hash(path.join(import.meta.dirname, p))]),
  );
const statements = {};
let stage = "setup",
  activity = null;
const event = (e) => {
  const value = { at: new Date().toISOString(), stage, activity, ...e };
  fs.appendFileSync(path.join(out, "events.jsonl"), JSON.stringify(value) + "\n");
};
const wire = await wireProxy(owner.endpoint, (e) => {
  const key = sha(e.sql);
  statements[key] = e.sql;
  const { sql, ...rest } = e;
  event({ ...rest, sqlSha256: key });
});
const load = async (dir, p) => import(pathToFileURL(path.join(dir, p)).href);
const modules = {};
for (const [arm, dir] of [
  ["A", base],
  ["B", root],
])
  modules[arm] = {
    core: await load(dir, "packages/core/dist/index.js"),
    internal: await load(dir, "packages/core/dist/internal.js"),
    storage: await load(dir, "packages/xtdb/dist/XtdbStorageAdapter.js"),
    client: await load(dir, "packages/xtdb/dist/XtdbClient.js"),
  };
const q = (xs, p) =>
  [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.ceil(xs.length * p) - 1)];
const stats = (xs) => ({ n: xs.length, p50: q(xs, 0.5), p99: q(xs, 0.99) });
const runtimes = [];
let commitsDone=0,previousDisk=null;
const totalPlannedCommits=4*policy.aaRounds*2*policy.samplesPerArm+8*2*policy.samplesPerArm+4*2*10000;
let forecastBytesPerCommit=8*1024**3/totalPlannedCommits;
function diskBudget() {
  const freeBytes=Number(execFileSync("df",["-k",out],{encoding:"utf8"}).trim().split("\n").at(-1).trim().split(/\s+/)[3])*1024;
  if(previousDisk && commitsDone>previousDisk.commitsDone)
    forecastBytesPerCommit=Math.max(forecastBytesPerCommit,(previousDisk.freeBytes-freeBytes)/(commitsDone-previousDisk.commitsDone));
  const remainingForecastBytes=Math.ceil((totalPlannedCommits-commitsDone)*forecastBytesPerCommit);
  event({kind:"disk-budget",freeBytes,commitsDone,totalPlannedCommits,forecastBytesPerCommit,remainingForecastBytes});
  previousDisk={freeBytes,commitsDone};
  // [EXP-RT01] Why: shared-host growth can invalidate the initial estimate; stop before consuming the 5 GiB guard. Rejected: waiting until all history is written or attributing host-wide df deltas solely to this engine.
  assert.ok(freeBytes>5*1024**3+remainingForecastBytes,"disk no longer covers remaining forecast above guard");
}
async function runtime(arm, encoding, size, label) {
  const m = modules[arm],
    scope = `rt01-g6-live4:${label}:${encoding}:${size}:${arm}`;
  const inner = m.client.makeXtdbClient(wire.url, {
    maxConnections: 1,
    transactionTimeoutMs: 30000,
  });
  const calls = { queries: 0, submits: 0, submittedStatements: 0 };
  const client = {
    ...inner,
    query: async (...args) => {
      calls.queries++;
      return inner.query(...args);
    },
    submit: async (stmts) => {
      calls.submits++;
      calls.submittedStatements += stmts.length;
      return inner.submit(stmts);
    },
  };
  const adapter = m.storage.makeXtdbStorageAdapter(client, scope, {
    commitEncoding: encoding,
    maxRetries: 0,
  });
  const layer = m.internal.TriplesLive.pipe(
    Layer.provide(
      Layer.mergeAll(
        Layer.succeed(m.internal.StorageAdapter, adapter),
        Layer.succeed(m.internal.QueryExecutor, {}),
        m.internal.DeterministicTripleStoreRuntimeLive({
          now: 100000,
          idSeed: "rt01-g6-identical-inputs",
        }),
      ),
    ),
  );
  const triples = await Effect.runPromise(
    Effect.gen(function* () {
      return yield* m.core.Triples;
    }).pipe(Effect.provide(layer)),
  );
  const rt = { arm, encoding, size, scope, client, inner, triples, calls, position: 0, last: null };
  runtimes.push(rt);
  return rt;
}
const operations = (size) =>
  Array.from({ length: size }, (_, i) => ({
    op: "assert",
    entityId: "bench",
    attribute: `:bench/${i}`,
    value: { type: "string", value: "value" },
  }));
async function commit(rt, measure = false) {
  if(commitsDone%500===0)diskBudget();
  const start = performance.now(),
    w = wire.snapshot(),
    c = { ...rt.calls };
  const receipt = await Effect.runPromise(rt.triples.transact(operations(rt.size)));
  const ms = performance.now() - start,
    end = wire.snapshot();
  rt.position++;
  commitsDone++;
  rt.last = receipt;
  assert.equal(receipt.position, rt.position);
  assert.equal(receipt.triples.length, rt.size);
  assert.ok(
    receipt.triples.every(
      (t) =>
        t.entityId === "bench" &&
        t.value.type === "string" &&
        t.value.value === "value" &&
        (rt.arm !== "B" || t.recordedAt === receipt.instant),
    ),
  );
  const sample = {
    arm: rt.arm,
    encoding: rt.encoding,
    size: rt.size,
    scope: rt.scope,
    position: receipt.position,
    instant: receipt.instant,
    txId: receipt.txId,
    inputSha256: sha(JSON.stringify(operations(rt.size))),
    ms,
    wireExecutions: end.executions - w.executions,
    wireReadyCycles: end.ready - w.ready,
    queries: rt.calls.queries - c.queries,
    submits: rt.calls.submits - c.submits,
    submittedStatements: rt.calls.submittedStatements - c.submittedStatements,
  };
  assert.ok(sample.wireExecutions > 0 && sample.wireReadyCycles > 0);
  if (measure) event({ kind: "sample", ...sample });
  else if (rt.position % 500 === 0) console.log(stage, rt.scope, rt.position);
  return sample;
}
async function counts(rt) {
  const [rows] = await rt.client.query(
    "SELECT COUNT(*) AS n, COUNT(DISTINCT recorded_position) AS positions FROM tx_assertions FOR ALL VALID_TIME WHERE scope_key = ?",
    [rt.scope],
  );
  const meta = await rt.client.query(
    "SELECT position, stamp FROM tx_meta FOR ALL VALID_TIME WHERE scope_key = ?",
    [rt.scope],
  );
  assert.equal(meta.length, rt.position ? 1 : 0);
  if (rt.position) assert.equal(Number(meta[0].position), rt.position);
  assert.equal(Number(rows.positions), rt.position);
  const observed = {
    scope: rt.scope,
    logicalCommits: rt.position,
    assertionRows: Number(rows.n),
    distinctRecordedPositions: Number(rows.positions),
    metadata: meta,
  };
  if (rt.last) {
    const ids = rt.last.triples.map((t) => t.id),
      physical = await rt.client.query(
        `SELECT id, entity_id, attribute, value_type, value_string, recorded_at, recorded_position FROM tx_assertions FOR ALL VALID_TIME WHERE scope_key = ? AND id IN (${ids.map(() => "?").join(",")})`,
        [rt.scope, ...ids],
      );
    assert.equal(physical.length, rt.size);
    for (const t of rt.last.triples) {
      const r = physical.find((r) => r.id === t.id);
      assert.ok(r);
      assert.equal(r.entity_id, t.entityId);
      assert.equal(r.attribute, t.attribute);
      assert.equal(r.value_type, "string");
      assert.equal(r.value_string, "value");
      assert.equal(Number(r.recorded_position), rt.last.position);
      assert.equal(Number(r.recorded_at), rt.last.instant);
    }
    observed.readbackSha256 = sha(JSON.stringify(physical));
    event({ kind: "readback", scope: rt.scope, receipt: rt.last, physical });
  }
  event({ kind: "history-count", ...observed });
  return observed;
}
async function block(rt, n, label) {
  activity = label;
  const before = await counts(rt),
    samples = [];
  for (let i = 0; i < n; i++) samples.push(await commit(rt, true));
  const after = await counts(rt);
  return {
    label,
    arm: rt.arm,
    scope: rt.scope,
    before,
    after,
    samples,
    serviceMs: stats(samples.map((s) => s.ms)),
  };
}
async function scan(rt) {
  activity = `scan:${rt.scope}`;
  const stamp = rt.arm === "B" ? Math.round(rt.last.instant * 1000) : 0;
  const emitted = modules.B.storage.compactGuards(rt.scope, rt.position, "probe", [], [], stamp)[0];
  const predicate = emitted.sql.slice(7).replace(/, '[^']+'$/, "");
  const queries = {
    position: {
      sql: "SELECT COALESCE(MAX(position), 0) AS p FROM tx_meta FOR ALL VALID_TIME WHERE scope_key = ?",
      params: [rt.scope],
    },
    stamp: {
      sql: "SELECT COALESCE(MAX(stamp), 0) AS s FROM tx_meta FOR ALL VALID_TIME WHERE scope_key = ?",
      params: [rt.scope],
    },
    marker: {
      sql: "SELECT COALESCE((SELECT stamp FROM tx_meta FOR ALL VALID_TIME WHERE _id = $1 AND scope_key = $1 AND position = $2), 0) AS s",
      params: [rt.scope, rt.position],
      parameterSyntax: "postgresql",
    },
    both: {
      sql: `SELECT (${predicate}) AS allowed`,
      params: emitted.params,
      parameterSyntax: "postgresql",
    },
  };
  const samples = { position: [], stamp: [], marker: [], both: [] };
  for (let i = 0; i < 30; i++)
    for (const name of i % 2
      ? ["both", "marker", "stamp", "position"]
      : ["position", "stamp", "marker", "both"]) {
      const request = queries[name],
        start = performance.now();
      const rows = await rt.client.query(request.sql, request.params, undefined, {
        parameterSyntax: request.parameterSyntax,
      });
      samples[name].push(performance.now() - start);
      assert.equal(rows.length, 1);
      if (name === "position") assert.equal(Number(rows[0].p), rt.position);
      else if (name === "both") assert.equal(Number(rows[0].allowed), 1);
      else assert.equal(Number(rows[0].s), stamp);
    }
  // [EXP-RT01] Why: retain native plans/scan counters for the old captured predicate and the new emitted predicate. Rejected: presenting the offline SQLite N/2N model as XTDB execution evidence.
  const dictionary = JSON.parse(
    fs.readFileSync(
      "/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-RT01/live2/g6-attempt1/statements.json",
      "utf8",
    ),
  );
  const oldSql = Object.values(dictionary).find(
    (sql) => sql.startsWith("ASSERT ") && sql.includes("MAX(stamp)"),
  );
  assert.ok(oldSql);
  const oldPredicate = oldSql.slice(7).replace(/, '[^']+'$/, "");
  const baselineGuard=modules.A.storage.compactGuards(rt.scope,rt.position,"probe",[],[])[0];
  const baselinePredicate=baselineGuard.sql.slice(7).replace(/, '[^']+'$/, "");
  const nativePlans = {};
  for (const [version, sql, params, parameterSyntax] of [
    ["preRT01", `SELECT (${baselinePredicate}) AS allowed`,baselineGuard.params,"postgresql"],
    [
      "before",
      `SELECT (${oldPredicate}) AS allowed`,
      [rt.scope, rt.position, rt.scope, stamp],
      undefined,
    ],
    ["after", queries.both.sql, queries.both.params, "postgresql"],
  ]) {
    nativePlans[version] = {
      sql,
      params,
      explain: await rt.client.query("EXPLAIN " + sql, params, undefined, { parameterSyntax }),
      analyze: await rt.client.query("EXPLAIN ANALYZE " + sql, params, undefined, {
        parameterSyntax,
      }),
    };
    assert.ok(nativePlans[version].explain.length > 0 && nativePlans[version].analyze.length > 0);
  }
  return {
    scope: rt.scope,
    source: "tx_meta FOR ALL VALID_TIME",
    includesClientAwaitTokenRoundTrip: true,
    position: stats(samples.position),
    wideStamp: stats(samples.stamp),
    markerStamp: stats(samples.marker),
    fullNewGuard: stats(samples.both),
    samples,
    nativePlans,
    markerMinusWideStampP50Ms: q(samples.marker, 0.5) - q(samples.stamp, 0.5),
  };
}

let failure = null;
const calibration = [],
  points = [];
let rule, noise;
const engine=JSON.parse(execFileSync("docker",["inspect",owner.container],{encoding:"utf8"}))[0];
const identity={startedAt:new Date().toISOString(),attempt:path.basename(out),engineId:engine.Id,owner,sourceSha256:digest(before),buildSha256:digest(g2.build),baselineSha256:hash(path.join(base,"identity.json")),inputsSha256:digest([operations(10),operations(5)]),runnerHashes};
try {
  stage = "wire-sanity";
  const probe = modules.A.client.makeXtdbClient(wire.url, { maxConnections: 1 });
  try {
    const w = wire.snapshot(),
      rows = await probe.query("SELECT 17 AS n");
    assert.equal(Number(rows[0].n), 17);
    const d = wire.snapshot();
    assert.ok(d.executions > w.executions && d.ready > w.ready);
  } finally {
    await probe.close();
  }
  noise=await noiseSession(engine,out);
  // [EXP-RT01] Why: four independent A/A pairs provide per-metric spread and three same-arm sequential ratios for Q100k before any B sample. Rejected: regrading the earlier FAILED receipt or bootstrapping dependent commands.
  for (const encoding of ["a0","compact"]) for(const size of [10,5]) {
    const rounds=[];
    for(let round=0;round<policy.aaRounds;round++) {
      stage=`AA:${encoding}:${size}:${round}`;
      const left=await runtime("A",encoding,size,`cal-${round}-left`),right=await runtime("A",encoding,size,`cal-${round}-right`);
      const id=`aa-${encoding}-${size}-${round}`;
      const observed=await noise.round(id,async () => {
        const blocks=[];
        for(let i=0;i<4;i++)blocks.push(await block(i%2?right:left,policy.blockSize,`${stage}:${i}`));
        return blocks;
      });
      const blocks=observed.value;
      rounds.push({id,binding:identity,blocks,left:blocks.filter(b=>b.scope===left.scope).flatMap(b=>b.samples.map(s=>s.ms)),right:blocks.filter(b=>b.scope===right.scope).flatMap(b=>b.samples.map(s=>s.ms)),noise:observed.noise});
      await left.inner.close();await right.inner.close();
    }
    calibration.push({encoding,size,regime:noise.regime,rounds});
  }
  const frozen=freezeRule(path.join(out,"AA-RULE-BEFORE-B.json"),calibration,identity);
  rule=frozen.rule;const ruleHash=frozen.sha256;
  event({kind:"rule-frozen",sha256:ruleHash,contexts:rule.contexts,timingEligible:rule.timingEligible});
  // [EXP-RT01] Why: live4 explicitly continues non-GREEN windows as unjudged observations. Rejected: promoting missing or excluded A/A variance to a judged band.
  event({kind:"preflight-grades-recorded",timingEligible:rule.timingEligible});
  for (const history of [0, 10000])
    for (const encoding of ["a0", "compact"])
      for (const size of [10, 5]) {
        loadRule(path.join(out,"AA-RULE-BEFORE-B.json"),ruleHash,identity);
        stage = `AB:${history}:${encoding}:${size}`;
        console.log(stage);
        const a = await runtime("A", encoding, size, `h${history}`),
          b = await runtime("B", encoding, size, `h${history}`);
        if (history) {
          assert.ok(
            Number(
              execFileSync("df", ["-k", out], { encoding: "utf8" })
                .trim()
                .split("\n")
                .at(-1)
                .trim()
                .split(/\s+/)[3],
            ) *
              1024 >
              10 * 1024 ** 3,
            "history disk forecast",
          );
          for (const rt of [a, b]) {
            activity = `preload:${rt.scope}`;
            for (let i = 0; i < history; i++) {
              if(i%500===0) assert.ok(Number(execFileSync("df",["-k",out],{encoding:"utf8"}).trim().split("\n").at(-1).trim().split(/\s+/)[3])*1024>5*1024**3,"host disk floor during preload");
              await commit(rt);
            }
            await counts(rt);
          }
        }
        const observed=await noise.round(`ab-${history}-${encoding}-${size}`,async () => {
          const blocks=[];
          for(let i=0;i<4;i++)blocks.push(await block(i%2?b:a,policy.blockSize,`${stage}:${i}`));
          return blocks;
        });
        const blocks=observed.value;
        const av = stats(
            blocks.filter((x) => x.arm === "A").flatMap((x) => x.samples.map((s) => s.ms)),
          ),
          bv = stats(
            blocks.filter((x) => x.arm === "B").flatMap((x) => x.samples.map((s) => s.ms)),
          );
        const window=gradePoint(rule,encoding,size,observed.noise);
        const verdict=judge(rule,{encoding,size,A:blocks.filter(b=>b.arm==="A").flatMap(b=>b.samples.map(s=>s.ms)),B:blocks.filter(b=>b.arm==="B").flatMap(b=>b.samples.map(s=>s.ms)),window});
        const tolerance=Object.fromEntries(Object.entries(rule.contexts.find(c=>c.encoding===encoding&&c.size===size).metrics).map(([m,v])=>[m,v.band]));
        const scans = { A: await scan(a), B: await scan(b) };
        const point = {
          history,
          encoding,
          size,
          blocks,
          A: av,
          B: bv,
          tolerance,
          verdict,
          window,
          noise:observed.noise,
          ratios: { p50: bv.p50 / av.p50, p99: bv.p99 / av.p99 },
          scans,
          ruleSha256: ruleHash,
        };
        points.push(point);
        fs.writeFileSync(
          path.join(out, `point-${history}-${encoding}-${size}.json`),
          JSON.stringify(point, null, 2) + "\n",
        );
        assert.notEqual(verdict.result,"FAIL",`G6 judged regression ${stage}: ${JSON.stringify(verdict.metrics)}`);
        assert.ok(["WITHIN_BAND","UNJUDGED"].includes(verdict.result),`unexpected G6 result ${verdict.result}`);
        event({kind:"point-complete",history,encoding,size,result:verdict.result,windowGrade:window.windowGrade});
        await a.inner.close();
        await b.inner.close();
      }
} catch (error) {
  failure = { stage, activity, error: String(error), stack: error.stack };
  event({ kind: "first-failure", ...failure });
  console.error(failure.error);
} finally {
  for (const rt of runtimes) await rt.inner.close();
  if(noise)await noise.close();
  await wire.close();
  const after = snapshot();
  fs.writeFileSync(path.join(out, "statements.json"), JSON.stringify(statements, null, 2) + "\n");
  fs.writeFileSync(
    path.join(out, "execution.json"),
    JSON.stringify(
      {
        owner,
        baselineCommit: baseline.commit,
        before,
        after,
        sourceUnchanged: JSON.stringify(before) === JSON.stringify(after),
        runnerHashes,
        runnerUnchanged: Object.entries(runnerHashes).every(
          ([p, h]) => hash(path.join(import.meta.dirname, p)) === h,
        ),
        calibration,
        points,
        failure,
        timingOutcome:failure ? (failure.error.includes("TIMING_INVALID") ? "TIMING_INVALID" : "FAIL") : points.some(p=>p.verdict.result==="UNJUDGED") ? "UNJUDGED" : "WITHIN_BAND",
        startedFromG2Build: g2.build,
      },
      null,
      2,
    ) + "\n",
  );
  assert.ok(Object.entries(runnerHashes).every(([p,h])=>hash(path.join(import.meta.dirname,p))===h),"runner source changed");
  if (JSON.stringify(before) !== JSON.stringify(after))
    throw Error("source changed during benchmark");
}
if (failure) process.exitCode = 1;
else if(points.some(p=>p.verdict.result==="UNJUDGED"))process.exitCode=3;
