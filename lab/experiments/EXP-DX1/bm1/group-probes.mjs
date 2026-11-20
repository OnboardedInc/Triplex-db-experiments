// [DX-BM1] Why: use the already verified ten-account W1 database between original measured arms and teardown.
// Rejected: pricing another seed or folding additional offers into the published W1 windows.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const [arm, output, budget] = process.argv.slice(2);
const repo = process.cwd();
const get = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const write = (name, object) =>
  fs.writeFileSync(path.join(output, name), JSON.stringify(object) + "\n", { flag: "wx" });
const hash = (x) => createHash("sha256").update(JSON.stringify(x)).digest("hex");
async function fileHash(file) {
  const digest = createHash("sha256");
  for await (const chunk of fs.createReadStream(file)) digest.update(chunk);
  return digest.digest("hex");
}
const load = (base, name) => import(pathToFileURL(path.join(base, name)).href);
const git = (base, ...args) => execFileSync("git", args, { cwd: base, encoding: "utf8" }).trim();
const binding = get(path.join(output, "bound-seed.json"));
assert.equal(git(repo, "rev-parse", "HEAD"), binding.source);
const original = get(path.join(arm, "raw.json"));
const identity = get(path.join(arm, "identity.json"));
assert.equal(identity.nonce, original.nonce);
assert.equal(identity.nonce, binding.nonce);
assert.equal(original.scope, binding.scope);
const { DatomicClient } = await load(repo, "packages/datomic/dist/index.js");
const { ids, SEED_VALID_FROM } = await load(repo, "lab/bench/lib/world.ts");
const { generateTrace } = await load(repo, "lab/bench/lib/trace.ts");
const { command } = await load(repo, "lab/experiments/EXP-DX1/w1/group/workload.ts");
const { accounts, tenantRows } = await load(repo, "lab/experiments/EXP-DX1/w1/group/population.ts");
const endpoint = (role) => {
  const ip = execFileSync(
    "docker",
    [
      "inspect",
      "--format",
      "{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}",
      binding.slot + "-" + role,
    ],
    { encoding: "utf8" },
  ).trim();
  assert.match(ip, /^[0-9.]+$/);
  return "http://" + ip + ":8080";
};
const url = endpoint("gw-w"),
  readerUrl = endpoint("gw-r"),
  db = binding.db;
assert.notEqual(url, readerUrl);
assert.equal(db, "s2-" + Buffer.from(binding.scope).toString("base64url"));
process.env.DATOMIC_URL = url;
process.env.DATOMIC_READ_URLS = readerUrl;
const writer = new DatomicClient(url, 35000),
  reader = new DatomicClient(readerUrl, 35000);
const deadline = performance.now() + Number(budget) * 1000 - 25000;
const latest = original.phases.at(-1).lastPosition;
const last = original.phases.at(-1).records.at(-1);
const phaseReceipts = [];
const q = (xs, p) =>
  xs.length ? [...xs].sort((a, b) => a - b)[Math.ceil(xs.length * p) - 1] : null;
const errorText = (e) => String(e).slice(0, 750);
const sourceKey = "bm1-night-" + binding.nonce;
const frozen = generateTrace({ seed: "ns-v2", subjects: 10000, durationS: 7200 }).filter(
  (r) => !r.resend && r.atMs >= 120000 && r.atMs < 180000,
);
const duration = 60000;
const seedCut = binding.seed.seedCut;
const importerSha = "8c5e905571318c5124cc6aa07979fa4567bdc7ed";
const importer = path.join("/var/tmp/triplex-bm1/night-n19", "probe-import-" + importerSha);
const aggregate = Array(10).fill(0);
const rates = (value) => aggregate.map(() => value);
const tape = (rate) =>
  rate
    .flatMap((r, account) =>
      Array.from({ length: Math.round(r * 60) }, (_, i) => ({
        account,
        local: (i * 7919 + account) % 10000,
        count: 8,
        at: ((i + account / 10) * 1000) / r,
      })),
    )
    .sort((a, b) => a.at - b.at);
const originalPulse = original.phases
  .filter((p) => ["alone", "nine"].includes(p.name))
  .map((p) => {
    const quiet = p.records.filter((x) => x.probe),
      physical = new Set(p.records.map((x) => x.t)).size;
    assert.equal(quiet.length, 600);
    assert.equal(physical, p.physical);
    assert.equal(
      p.quietMs.p99,
      q(
        quiet.map((r) => r.scheduled),
        0.99,
      ),
    );
    return {
      name: p.name,
      quietN: quiet.length,
      n: p.records.length,
      quietP99: p.quietMs.p99,
      byAccount: p.byAccount,
      logicalPerSecond: (1000 * p.count) / p.wall,
      nativePerSecond: (1000 * physical) / p.wall,
      receipts: p.records.filter((r) => r.pos > 0).length,
      sourceRowsSha256: hash(p.records),
    };
  });
write("queue-pulse.json", {
  binding,
  phases: originalPulse,
  ratio: originalPulse[1].quietP99 / originalPulse[0].quietP99,
});
let ImportRun, ImportLane, pace, snapshot, base;
async function importCode() {
  if (base) return;
  assert.equal(git(importer, "rev-parse", "HEAD"), importerSha);
  ({ ImportRun, ImportLane, pace } = await load(
    importer,
    "lab/experiments/EXP-DX1/import1/lane.ts",
  ));
  ({ snapshot } = await load(importer, "lab/experiments/EXP-DX1/import1/source.ts"));
  const { runtimeApi } = await load(repo, "lab/bench/lib/triplex.ts");
  const scopeName = binding.nonce + "-load";
  assert.equal(String(runtimeApi.DatabaseScope.test(scopeName)), binding.scope);
  const { openComposition } = await load(repo, "lab/bench/lib/composition.ts");
  const comp = await openComposition("reach", "datomic", scopeName);
  base = {
    ...comp,
    scopeName,
    mode: "snapshot",
    async write(ops, meta) {
      const reply = await comp.transact(ops, meta);
      if (!reply.ok) throw Error("Import write " + reply.tag);
      return reply.value;
    },
  };
}
async function phase(name, offers, bulkWidth, readAccounts) {
  if (performance.now() + 95000 > deadline) return false;
  const marker = path.join(output, name + ".jsonl"),
    fd = fs.openSync(marker, "wx");
  const record = (x) => fs.writeSync(fd, JSON.stringify(x) + "\n");
  const state = { writes: [], reads: [], bulk: [], errors: [] };
  let lane, ingest;
  if (bulkWidth !== null) {
    await importCode();
    lane = new ImportLane(0.5);
    if (bulkWidth) {
      const source = snapshot(
        "thin",
        125000,
        "acct/a0/" + sourceKey + "-" + name + "/",
        "generation-1",
      );
      ingest = await ImportRun.open(
        base,
        source,
        pace(bulkWidth, 0.5),
        path.join(output, name + ".sqlite"),
        lane,
      );
    }
  }
  const startedAt = new Date().toISOString(),
    t0 = performance.now(),
    scheduledEnd = t0 + duration;
  const delayTo = async (target) => {
    const wait = target - performance.now();
    if (wait > 0) await sleep(wait);
  };
  const remember = (kind, o) => {
    state[kind].push(o);
    record({ kind, ...o });
  };
  async function send(offer, i) {
    const { account, local, count, at } = offer,
      id = sourceKey + "-" + name + "-" + i,
      entity = ids.placement(accounts[account].first + local);
    const intended = t0 + at,
      enter = performance.now();
    const facts = Array.from({ length: count }, (_, j) => ({
      e: entity,
      a: ":save/field" + j,
      v: { type: "string", value: id + "-" + j },
    }));
    try {
      const input = command(id, facts);
      input.groupAccount = accounts[account].key;
      const submit = () => writer.transact(db, input);
      const result = lane ? await lane.live(submit) : await submit(),
        ack = performance.now();
      assert.equal(result.operationId, id);
      assert.ok(Number(result.position.v) > latest && Number(result.t.v) > 0);
      const tl = result.timeline;
      remember("writes", {
        id,
        account,
        entity,
        count,
        at,
        offeredMs: enter - t0,
        ackMs: ack - t0,
        latency: ack - intended,
        pos: Number(result.position.v),
        t: result.t.v,
        group: result.groupSize ?? 1,
        queued: result.submitToNativeEntryMs,
        gatewayQueue:
          (result.groupQueueMicros ??
            (tl.predecessorReady ?? tl.payloadPrepared) - tl.payloadPrepared) / 1000,
        native: tl.submitted === undefined ? null : (tl.completed - tl.submitted) / 1000,
      });
    } catch (e) {
      remember("errors", { id, at, account, error: errorText(e) });
    }
  }
  async function sendOffers() {
    const slots = accounts.map(() => Array.from({ length: 12 }, () => Promise.resolve())),
      ordinal = accounts.map(() => 0);
    for (const [i, o] of offers.entries()) {
      await delayTo(t0 + o.at);
      const n = ordinal[o.account]++ % 12;
      slots[o.account][n] = slots[o.account][n].then(() => send(o, i));
    }
    await Promise.all(slots.flat());
  }
  async function readPinned(account) {
    let i = 0;
    while (performance.now() < scheduledEnd) {
      const subject = (859 * i++ + 133) % 10000,
        entity = ids.placement(accounts[account].first + subject);
      const before = performance.now(),
        expected = tenantRows(accounts[account], subject)
          .filter((f) => f.e === entity)
          .map((f) => [f.a, f.v.value])
          .sort();
      const rows = await reader.rows(db, {
        entityIds: [entity],
        basis: { recordedPosition: seedCut, validAt: SEED_VALID_FROM },
        pattern: {},
      });
      const actual = rows.map((r) => [r.attribute, r.value_string]).sort();
      assert.deepEqual(actual, expected);
      remember("reads", {
        account,
        subject,
        cut: seedCut,
        answer: hash(actual),
        ms: performance.now() - before,
      });
      await delayTo(before + 50);
    }
  }
  async function bulk() {
    if (!ingest) return;
    while (performance.now() < scheduledEnd) {
      const startMs = performance.now() - t0,
        entry = await ingest.step();
      if (!entry) break;
      remember("bulk", { ...entry, startMs, ackMs: performance.now() - t0 });
    }
    if (state.bulk.length) {
      const end = state.bulk.at(-1),
        recovered = await ingest.importAt(end.first);
      assert.equal(recovered.position, end.position);
      assert.equal(recovered.digest, end.digest);
    }
  }
  try {
    await Promise.all([sendOffers(), bulk(), ...readAccounts.map(readPinned)]);
    const wall = performance.now() - t0;
    assert.equal(state.writes.length + state.errors.length, offers.length);
    assert.equal(new Set(state.writes.map((r) => r.pos)).size, state.writes.length);
    const byAccount = {};
    for (const a of accounts) {
      const rs = state.writes.filter((r) => r.account === a.index),
        reads = state.reads.filter((r) => r.account === a.index);
      if (!rs.length) continue;
      const witness = rs.at(-1),
        op = await writer.operation(db, witness.id);
      assert.equal(Number(op.position?.v), witness.pos);
      assert.equal(op.t?.v, witness.t);
      const rows = await reader.rows(db, {
        entityIds: [witness.entity],
        basis: { recordedPosition: witness.pos, validAt: SEED_VALID_FROM },
        pattern: {},
      });
      for (let j = 0; j < witness.count; j++)
        assert(
          rows.some(
            (r) => r.attribute === ":save/field" + j && r.value_string === witness.id + "-" + j,
          ),
        );
      byAccount[a.index] = {
        n: rs.length,
        commitP99: q(
          rs.map((r) => r.latency),
          0.99,
        ),
        readN: reads.length,
        readP99: q(
          reads.map((r) => r.ms),
          0.99,
        ),
      };
    }
    const bulkPositions = new Map(state.bulk.map((r) => [r.position, r]));
    const behind = state.writes.filter((r) => bulkPositions.has(r.pos - 1));
    const summary = {
      binding,
      db,
      phase: name,
      startedAt,
      endedAt: new Date().toISOString(),
      observationsSha256: await fileHash(marker),
      tapeSha256: hash(offers),
      scheduled: offers.length,
      ack: state.writes.length,
      errors: state.errors.length,
      wallMs: wall,
      durablePerSecond: (1000 * state.writes.length) / wall,
      byAccount,
      physicalTransactions: new Set(state.writes.map((r) => r.t)).size,
      bulkWidth,
      bulkFacts: state.bulk.reduce((s, r) => s + r.facts, 0),
      directlyAfterBulk: behind.length,
      directP99: q(
        behind.map((r) => r.latency),
        0.99,
      ),
      readPolicy: "fixed original seed cut",
    };
    summary.bulkFactsPerSecond = (summary.bulkFacts * 1000) / wall;
    phaseReceipts.push(summary);
    write(name + ".json", summary);
    return true;
  } finally {
    ingest?.close();
    fs.closeSync(fd);
  }
}
try {
  const opened = await writer.create(binding.scope, "lean", true, 35000);
  assert(!opened.created && opened.db === db && opened.strictRecordClocks);
  const check = await writer.operation(db, last.id);
  assert.equal(Number(check.position.v), last.pos);
  for (const [name, profile] of Object.entries({
    median: rates(3.5),
    average: rates(4.9),
    p99: rates(23.5),
    peak: [39.4, ...Array(9).fill(4.9)],
  })) {
    if (!(await phase("production-" + name, tape(profile), null, []))) break;
  }
  if (!binding.grouped) {
    const burst = frozen
      .flatMap((e) =>
        [8, 9].map((account) => ({
          account,
          local: e.subject,
          count: e.size ?? e.facts,
          at: e.atMs - 120000,
        })),
      )
      .sort((a, b) => a.at - b.at);
    assert(
      burst.length > 6000 &&
        burst.every((r) => Number.isSafeInteger(r.count) && r.count >= 5 && r.count <= 50),
    );
    for (const width of [0, 128, 2000, 0]) {
      const name =
        "load-v3-" +
        width +
        (phaseReceipts.some((r) => r.phase === "load-v3-0") && width === 0 ? "-after" : "");
      if (!(await phase(name, burst, width, [8, 9]))) break;
    }
    for (const [name, rate] of [
      ["average", 4.9],
      ["p99", 23.5],
    ]) {
      for (const width of [0, 128, 2000]) {
        if (
          !(await phase(
            "import-production-" + name + "-" + width,
            tape(rates(rate)),
            width,
            [8, 9],
          ))
        )
          break;
      }
    }
  }
  write("probe-summary.json", {
    binding,
    importerSha,
    phases: phaseReceipts.map((p) => p.phase),
    nativeDatabase: db,
  });
} finally {
  await base?.close();
  writer.close();
  reader.close();
}
