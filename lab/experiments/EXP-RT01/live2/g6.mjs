import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { performance } from "node:perf_hooks";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { Effect, Layer } from "effect";
import { wireProxy } from "./wire.mjs";
const root = path.resolve(import.meta.dirname, "../../../.."),
  base = "/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-RT01/live2/baseline";
const out = "/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-RT01/live2/g6-attempt1";
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
    "/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-RT01/live2/g2-attempt1/execution.json",
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
    ["g6.mjs", "wire.mjs"].map((p) => [p, hash(path.join(import.meta.dirname, p))]),
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
async function runtime(arm, encoding, size, label) {
  const m = modules[arm],
    scope = `rt01-g6:${label}:${encoding}:${size}:${arm}`;
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
  const start = performance.now(),
    w = wire.snapshot(),
    c = { ...rt.calls };
  const receipt = await Effect.runPromise(rt.triples.transact(operations(rt.size)));
  const ms = performance.now() - start,
    end = wire.snapshot();
  rt.position++;
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
  const samples = { position: [], stamp: [], both: [] };
  for (let i = 0; i < 30; i++)
    for (const name of i % 2 ? ["both", "stamp", "position"] : ["position", "stamp", "both"]) {
      const projection =
        name === "position"
          ? "COALESCE(MAX(position), 0) AS p"
          : name === "stamp"
            ? "COALESCE(MAX(stamp), 0) AS s"
            : "COALESCE(MAX(position), 0) AS p, COALESCE(MAX(stamp), 0) AS s";
      const start = performance.now(),
        rows = await rt.client.query(
          `SELECT ${projection} FROM tx_meta FOR ALL VALID_TIME WHERE scope_key = ?`,
          [rt.scope],
        );
      samples[name].push(performance.now() - start);
      assert.equal(rows.length, 1);
      if (name !== "stamp") assert.equal(Number(rows[0].p), rt.position);
      if (name !== "position")
        assert.equal(Number(rows[0].s), rt.arm === "B" ? Math.round(rt.last.instant * 1000) : 0);
    }
  return {
    scope: rt.scope,
    source: "tx_meta FOR ALL VALID_TIME",
    includesClientAwaitTokenRoundTrip: true,
    position: stats(samples.position),
    stamp: stats(samples.stamp),
    both: stats(samples.both),
    samples,
    incrementP50Ms: q(samples.both, 0.5) - q(samples.position, 0.5),
  };
}
let failure = null;
const calibration = [],
  points = [];
let rule;
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
  // [EXP-RT01] Why: calibrate matched pre-RT01 controls before any B runtime exists; freeze the measured noise rule on disk before B. Rejected: choosing a tolerance after seeing B latencies.
  for (const encoding of ["a0", "compact"])
    for (const size of [10, 5]) {
      stage = `AA:${encoding}:${size}`;
      const left = await runtime("A", encoding, size, "cal-left"),
        right = await runtime("A", encoding, size, "cal-right"),
        blocks = [];
      for (let i = 0; i < 4; i++)
        blocks.push(await block(i % 2 ? right : left, 75, `${stage}:${i}`));
      const l = stats(
          blocks.filter((b) => b.scope === left.scope).flatMap((b) => b.samples.map((s) => s.ms)),
        ),
        r = stats(
          blocks.filter((b) => b.scope === right.scope).flatMap((b) => b.samples.map((s) => s.ms)),
        );
      const tolerance = Object.fromEntries(
        ["p50", "p99"].map((k) => [k, Math.max(l[k] / r[k], r[k] / l[k]) - 1]),
      );
      calibration.push({ encoding, size, blocks, left: l, right: r, tolerance });
      await left.inner.close();
      await right.inner.close();
    }
  rule = {
    schema: "rt01-aa-rule/1",
    writtenAt: new Date().toISOString(),
    rule: "For each encoding and fact count, B/A pooled 150-sample service p50 and p99 must each be <= 1 + max(Aleft/Aright, Aright/Aleft)-1 from the corresponding pre-B 150/150 A/A controls. Equality passes. First exceeded metric or correctness/transport failure stops all later points; no retries.",
    units: "milliseconds",
    samplesPerArmPerPoint: 150,
    blocks:
      "ABAB, 75 commits/block; A and B have separate scopes with matched starting history and advance together",
    inputs: operations(10),
    fiveFactInputs: operations(5),
    history:
      "10,000 actual public ten- or five-fact commits per arm on that point's scope, one commit per engine transaction; no synthetic rows or huge literal VALUES preload",
    watermarkClock: 100000,
    baselineCommit: baseline.commit,
    baselineIdentitySha256: hash(path.join(base, "identity.json")),
    owner,
    engine: JSON.parse(execFileSync("docker", ["inspect", owner.container], { encoding: "utf8" })),
    sourceBefore: before,
    build: g2.build,
    runnerHashes,
    calibration,
  };
  fs.writeFileSync(path.join(out, "AA-RULE-BEFORE-B.json"), JSON.stringify(rule, null, 2) + "\n", {
    flag: "wx",
  });
  const ruleHash = hash(path.join(out, "AA-RULE-BEFORE-B.json"));
  event({ kind: "rule-frozen", sha256: ruleHash });
  for (const history of [0, 10000])
    for (const encoding of ["a0", "compact"])
      for (const size of [10, 5]) {
        assert.equal(hash(path.join(out, "AA-RULE-BEFORE-B.json")), ruleHash);
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
            for (let i = 0; i < history; i++) await commit(rt);
            await counts(rt);
          }
        }
        const blocks = [];
        for (let i = 0; i < 4; i++) blocks.push(await block(i % 2 ? b : a, 75, `${stage}:${i}`));
        const av = stats(
            blocks.filter((x) => x.arm === "A").flatMap((x) => x.samples.map((s) => s.ms)),
          ),
          bv = stats(
            blocks.filter((x) => x.arm === "B").flatMap((x) => x.samples.map((s) => s.ms)),
          );
        const tolerance = calibration.find(
          (c) => c.encoding === encoding && c.size === size,
        ).tolerance;
        const scans = { A: await scan(a), B: await scan(b) };
        const point = {
          history,
          encoding,
          size,
          blocks,
          A: av,
          B: bv,
          tolerance,
          ratios: { p50: bv.p50 / av.p50, p99: bv.p99 / av.p99 },
          scans,
          ruleSha256: ruleHash,
        };
        points.push(point);
        fs.writeFileSync(
          path.join(out, `point-${history}-${encoding}-${size}.json`),
          JSON.stringify(point, null, 2) + "\n",
        );
        for (const metric of ["p50", "p99"])
          assert.ok(
            point.ratios[metric] <= 1 + tolerance[metric],
            `G6 regression ${stage} ${metric}: ratio ${point.ratios[metric]} > ${1 + tolerance[metric]}`,
          );
        await a.inner.close();
        await b.inner.close();
      }
} catch (error) {
  failure = { stage, activity, error: String(error), stack: error.stack };
  event({ kind: "first-failure", ...failure });
  console.error(failure.error);
} finally {
  for (const rt of runtimes) await rt.inner.close();
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
        startedFromG2Build: g2.build,
      },
      null,
      2,
    ) + "\n",
  );
  if (JSON.stringify(before) !== JSON.stringify(after))
    throw Error("source changed during benchmark");
}
if (failure) process.exitCode = 1;
