import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
const dir = path.resolve(process.argv[2]),
  campaign = randomUUID(),
  sums = [],
  stores = new Set(),
  volumes = new Set(),
  requests = new Set(),
  digest = (v) => createHash("sha256").update(JSON.stringify(v)).digest("hex");
assert(process.platform === "darwin" && process.env.DELTA_MEASURE_LOCK && process.env.DOCKER_HOST);
fs.mkdirSync(dir);
fs.writeFileSync(
  path.join(dir, "campaign.json"),
  JSON.stringify({ campaign, order: ["off", "on", "on", "off"] }) + "\n",
  { flag: "wx" },
);
let expected, source;
for (const [i, index] of ["off", "on", "on", "off"].entries()) {
  const arm = path.join(dir, "arm-" + i),
    stat = fs.statfsSync(dir);
  assert(stat.bavail * stat.bsize >= 5 * 2 ** 30);
  // [DX-ACT2] Why: the PostgreSQL WAL counter covers the whole cluster. Boot a separate storage volume for each arm and include completed native indexing at both boundaries. Rejected: charging another database's asynchronous index job to whichever arm is active.
  execFileSync(
    process.execPath,
    ["lab/bin/engine.mjs", "delta", "--holder", "DX-ACT2", "--run", "price", "--out", arm],
    {
      stdio: "inherit",
      env: { ...process.env, DELTA_PRICE_ARM: index, DELTA_PRICE_CAMPAIGN: campaign },
    },
  );
  const file = (n) => JSON.parse(fs.readFileSync(path.join(arm, n + ".json"), "utf8")),
    a = file("attempt"),
    native = file("native"),
    cleanup = file("cleanup"),
    r = file("price"),
    daily = file("daily-" + Number(index === "on")),
    x = r.summaries[0];
  assert(
    a.nonce === native.nonce &&
      r.nonce === a.nonce &&
      r.identity === a.identity &&
      cleanup.nonce === a.nonce &&
      cleanup.roles === 3 &&
      cleanup.volumesRemoved === 1,
  );
  assert.deepEqual(r.sources, a.sources);
  assert(
    r.campaign === campaign &&
      r.isolated === index &&
      r.summaries.length === 1 &&
      x.indexed === (index === "on"),
  );
  assert.deepEqual(x, daily.summary);
  assert.equal(daily.attempt, a.nonce);
  assert(!stores.has(native.roles.pg) && !requests.has(a.nonce));
  stores.add(native.roles.pg);
  requests.add(a.nonce);
  const arr = daily.samples.map((s) => [s.seq, s.facts, s.writes]);
  if (expected) assert.deepEqual(arr, expected);
  else expected = arr;
  assert(x.receipts === 500 && x.duplicates === 10 && x.facts === 6549 && x.checkedPeople === 62);
  if (source) assert.deepEqual(a.sources, source);
  else source = a.sources;
  assert(
    r.barriers.length === 2 &&
      r.physicalCuts.length === 1 &&
      r.barriers[0].position < r.barriers[1].position,
  );
  for (const [j, job] of r.barriers.entries()) {
    assert(
      job.scope === a.scope + "-price-" + Number(index === "on") &&
        job.job.phase === ["seed", "saves"][j] &&
        job.job.completed,
    );
    assert(
      BigInt(job.before) <= BigInt(job.job.requestedT) &&
        BigInt(job.after) >= BigInt(job.job.requestedT),
    );
    assert(!volumes.has(job.job.job));
    volumes.add(job.job.job);
  }
  const { before, after, afterCommits } = r.physicalCuts[0];
  assert(after[1] >= afterCommits[1] && afterCommits[1] > before[1]);
  assert.equal(x.walBytesPerFact, (after[1] - before[1]) / x.facts);
  assert.equal(x.dbBytesPerFact, (after[0] - before[0]) / x.facts);
  sums.push({
    i,
    index,
    attempt: a.nonce,
    native: digest(native),
    storage: native.roles.pg,
    source: a.source,
    trace: x.trace,
    wal: x.walBytesPerFact,
    db: x.dbBytesPerFact,
    bytes: x.requestBytesPerFact,
    ms: x.msPerFact,
    p50: x.p50,
    p99: x.p99,
    synchronousWal: (afterCommits[1] - before[1]) / x.facts,
    requests: arr.length,
    facts: x.facts,
    proof: digest(r),
  });
}
assert(
  stores.size === 4 && sums.every((s) => s.trace === sums[0].trace && s.source === sums[0].source),
);
const mean = (v, k) => sums.filter((x) => x.index === v).reduce((n, x) => n + x[k], 0) / 2,
  comparison = Object.fromEntries(
    ["wal", "db", "bytes", "ms"].map((k) => [
      k,
      {
        off: mean("off", k),
        on: mean("on", k),
        changePercent: 100 * (mean("on", k) / mean("off", k) - 1),
      },
    ]),
  );
fs.writeFileSync(
  path.join(dir, "physical-price.json"),
  JSON.stringify({ campaign, sums, comparison, inputs: digest(source) }) + "\n",
  { flag: "wx" },
);
console.log(JSON.stringify(comparison));
