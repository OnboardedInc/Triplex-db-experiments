import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createGunzip } from "node:zlib";
import { createHash } from "node:crypto";
import { createInterface } from "node:readline";
import { hash } from "../ha1/common.ts";

const [dir, archive] = process.argv.slice(2);
assert(dir && archive);
const read = (name: string) => fs.readFileSync(path.join(dir, name));
const json = (name: string) => JSON.parse(read(name).toString("utf8"));
// [DX-LOAD3] Why: bind the archive, JFR originals, and replayed offer tapes to one attempt.
// Rejected: attributing a published percentile without the corresponding request and transaction events.
const attempt = json("attempt.json");
const transferBytes = fs.readFileSync(path.join(archive, "TRANSFER.json"));
const transfer = JSON.parse(transferBytes.toString("utf8"));
assert.equal(transfer.item, 13);
assert.equal(transfer.attempt, 1);
assert.equal(transfer.source, attempt.source.git);
assert.equal(transfer.slot, attempt.slot);
for (const [file, expected] of [
  ["control/request.json", transfer.requestSha256],
  ["control/terminal.json", transfer.terminalSha256],
  ["raw.tar.zst", transfer.raw.sha256],
]) {
  const digest = createHash("sha256");
  for await (const chunk of fs.createReadStream(path.join(archive, file))) digest.update(chunk);
  assert.equal(digest.digest("hex"), expected);
}
const recovered = JSON.parse(
  fs.readFileSync(path.join(archive!, "recovered/reconciled.json"), "utf8"),
);
assert.equal(recovered.transferSha256, hash(transferBytes));
assert.equal(recovered.rawSha256, transfer.raw.sha256);
assert.equal(recovered.publishedSha256, hash(read("observations.json")));
assert.equal(recovered.source, attempt.source.git);
assert.equal(recovered.slot, attempt.slot);
const observed = json("observations.json");
assert.equal(attempt.mode, "load-tail");
assert.deepEqual(
  [observed.nonce, observed.source, observed.slot],
  [attempt.nonce, attempt.source, attempt.slot],
);
assert.deepEqual(json("cleanup.json"), { nonce: attempt.nonce, containers: 0, networks: 0 });

function bind(r: any) {
  assert.deepEqual([r.run, r.source, r.slot], [attempt.nonce, attempt.source.git, attempt.slot]);
}
async function* rows(name: string) {
  const input = fs.createReadStream(path.join(dir!, name + ".gz")).pipe(createGunzip());
  for await (const line of createInterface({ input, crlfDelay: Infinity })) {
    const r = JSON.parse(line);
    bind(r);
    yield r;
  }
}
const boot = new Map<string, string>();
const writerPark = (r: any) =>
  r.name === "jdk.ThreadPark" &&
  r.threadName?.startsWith("writer-") &&
  r.stack?.some((s: string) =>
    /datomic\.(log\$write_tail_descriptor|update\$writer\$log_block)/.test(s),
  );
async function getRecording(process: string) {
  const marker = json(process + ".jfr-complete.jsonl");
  bind(marker);
  assert(marker.process === process && marker.clock?.bootId);
  const digest = createHash("sha256");
  for await (const chunk of fs
    .createReadStream(path.join(dir!, process + ".jfr.gz"))
    .pipe(createGunzip()))
    digest.update(chunk);
  assert.equal(marker.fileSha256, digest.digest("hex"));
  boot.set(process, marker.clock.bootId);
  const events = [];
  let n = 0;
  for await (const r of rows(process + ".jfr.jsonl")) {
    n++;
    if (
      r.name === "datomic.tx/process" ||
      r.name === "transactor.triplex-function" ||
      r.name === "jdk.GCPhasePause" ||
      writerPark(r)
    )
      events.push(mono(r));
  }
  assert.equal(n, marker.events);
  return events;
}
function mono(r: any) {
  assert.equal(r.clock.bootId, boot.get(r.process));
  assert(r.clock.crossProcessQualified !== false && Number.isFinite(r.clock.offsetMs));
  return { ...r, start: r.start - r.clock.offsetMs, end: r.end - r.clock.offsetMs };
}
const [tx, gw] = await Promise.all([getRecording("tx"), getRecording("gw-write")]);
assert.equal(boot.get("tx"), boot.get("gw-write"), "Transit clocks differ");
const nativeLog = [];
for await (const r of rows("tx.jsonl")) nativeLog.push(r);
const indices = nativeLog.filter((e) => e.type === "index-adoption").map(mono);
const gateway = new Map<string, any>();
for await (const r of rows("gw-write.jsonl")) {
  const op = r?.attributes?.operationId;
  if (!op || r.attributes.status !== 200) continue;
  assert(!gateway.has(op), "Ambiguous successful operation trace");
  const m = mono(r);
  const prep = r.spans.find((s: any) => s.name === "commit.prepare-and-validate");
  const wait = r.spans.find((s: any) => s.name.startsWith("peer.transact-await"));
  assert(prep && wait && !r.truncated);
  gateway.set(op, {
    ...m,
    prep: mono({ ...prep, process: r.process, clock: r.clock }),
    wait: mono({ ...wait, process: r.process, clock: r.clock }),
  });
}
const processEvents = new Map(
  tx
    .filter((r) => r.name === "datomic.tx/process" && r.databaseHash)
    .map((r) => [r.databaseHash + "/" + r.datomicT, r]),
);
const functions = new Map(
  tx.filter((r) => r.name === "transactor.triplex-function").map((r) => [r.traceId, r]),
);
const logParks = tx.filter(writerPark);
const pauses = [...tx, ...gw].filter((r) => r.name === "jdk.GCPhasePause");
const intersects = (a: { start: number; end: number }, b: { start: number; end: number }) =>
  a.start <= b.end && a.end >= b.start;
const clipped = (a: { start: number; end: number }, b: { start: number; end: number }) =>
  Math.max(0, Math.min(a.end, b.end) - Math.max(a.start, b.start));
const q = (xs: number[], f: number) =>
  [...xs].sort((a, b) => a - b)[Math.ceil(f * xs.length) - 1] ?? null;
const stats = (xs: number[]) => ({
  n: xs.length,
  p50: q(xs, 0.5),
  p99: q(xs, 0.99),
  max: q(xs, 1),
});

function analyze(arm: any) {
  const tape = read(arm.arm + ".offers.json");
  const reconciliation = recovered.arms.find((r: any) => r.arm === arm.arm);
  assert.equal(reconciliation.tapeSha256, hash(tape));
  assert.equal(reconciliation.scope, arm.scope);
  assert.deepEqual(reconciliation.neighbors, arm.neighbors);
  const raw = JSON.parse(tape.toString("utf8"));
  assert.deepEqual(
    [raw.nonce, raw.source, raw.slot, raw.scope],
    [attempt.nonce, attempt.source.git, attempt.slot, arm.scope],
  );
  assert.equal(raw.duration, arm.duration);
  const offset = (samples: any[]) => {
    assert(samples.length === 12);
    for (const s of samples)
      assert(
        s.bootId === boot.get("tx") &&
          s.run === raw.nonce &&
          s.recv >= s.send &&
          Number.isFinite(s.monoMs),
      );
    const lo = Math.max(...samples.map((s) => s.monoMs - s.recv)),
      hi = Math.min(...samples.map((s) => s.monoMs - s.send));
    assert(lo <= hi, "Client clock sample intersection empty");
    return { lo, hi };
  };
  const pre = offset(raw.clockBefore),
    post = offset(raw.clockAfter);
  const bounds = { lo: Math.min(pre.lo, post.lo), hi: Math.max(pre.hi, post.hi) };
  const asInterval = (v: number) => ({
    start: raw.start + v + bounds.lo,
    end: raw.start + v + bounds.hi,
  });
  const db = hash(raw.expectedDb);
  const match = (op: any) => {
    const trace = gateway.get(op.op);
    if (!trace) return undefined;
    assert.equal(trace.attributes.databaseHash, db);
    assert.equal(trace.attributes.datomicT, op.t);
    const tx = processEvents.get(db + "/" + op.t);
    return { op, trace, tx, fn: functions.get(trace.traceId) };
  };
  const commands = new Map<string, any>(raw.native.map((n: any) => [n.command, n]));
  const bulk = raw.ordered.map((r: any) => {
    const op = commands.get(r.command);
    assert.equal(op.position, r.position);
    assert(op.group === 1 && op.grant.bulk && !op.grant["runnable-live"]);
    const j = match(op);
    assert(j?.tx && op.serialHold, "A bulk operation is missing its native event or gateway hold");
    const hold = op.serialHold;
    const envelope = { start: j.tx.start - j.tx.nativeStats.msec, end: j.tx.start };
    assert(j.tx.nativeStats.msec >= j.tx.nativeStats["apply-msec"] && intersects(envelope, hold));
    const writer = "writer-" + raw.expectedDb + "-";
    const parks = logParks
      .filter((p) => p.threadName?.startsWith(writer) && intersects(p, envelope))
      .map((p) => ({ start: p.start, end: p.end, ms: clipped(p, envelope) }));
    const serial = hold.end - hold.start;
    const queue = op.queueUs / 1000;
    const apply = j.tx.nativeStats["apply-msec"];
    const gateway = j.trace.end - j.trace.start;
    const prep = j.trace.prep.end - j.trace.prep.start;
    const http = op.end - op.submit;
    const stages = {
      sdkBeforeHttp: op.submit - raw.start - r.offer,
      transportAndHttpClient: http - gateway,
      gatewayPrepare: prep,
      gatewayOther: gateway - prep - serial - queue,
      readyQueue: queue,
      dispatchToNative: envelope.start - hold.start,
      nativeApply: apply,
      nativeOther: j.tx.nativeStats.msec - apply,
      nativeToPeer: hold.end - envelope.end,
      sdkReceiptAndCursor: raw.start + r.ack - op.end,
    };
    assert(Object.values(stages).every(Number.isFinite));
    assert(Math.abs(Object.values(stages).reduce((a, b) => a + b, 0) - (r.ack - r.offer)) < 0.001);
    return { ...j, hold, envelope, parks, facts: r.facts, stages, wall: r.ack - r.offer };
  });
  const quiet = raw.samples.filter(
    (s: any) => s.actor === "quiet" && s.kind === "save" && s.outcome === "verified",
  );
  assert.equal(quiet.length, arm.neighbors.quiet.save.ok);
  assert(quiet.length >= 500);
  const top = quiet
    .sort((a: any, b: any) => b.end - b.due - (a.end - a.due))
    .slice(0, 12)
    .map((s: any) => {
      const offered = asInterval(s.offered);
      const op = commands.get("save/quiet/" + s.seq);
      assert.equal(op.position, s.seen.position);
      const own = match(op);
      const response = { start: offered.start, end: asInterval(s.end).end };
      const around = (b: any) => ({
        position: b.op.position,
        t: b.op.t,
        facts: b.facts,
        serialMs: b.hold.end - b.hold.start,
        prepMs: b.trace.prep.end - b.trace.prep.start,
        nativeMs: b.tx.nativeStats.msec,
        applyMs: b.tx.nativeStats["apply-msec"],
        residualDuringSaveMs: clipped(response, b.hold),
        logParkMs: b.parks.reduce((n: number, p: any) => n + p.ms, 0),
        nativeToPeerMs: b.hold.end - b.envelope.end,
        possibleAtOffer: [
          intersects(b.trace.prep, offered) && "gateway-prepare",
          b.fn && intersects(b.fn, offered) && "native-function",
          b.parks.some((p: any) => intersects(p, offered)) && "log-path-park",
          intersects({ start: b.envelope.end, end: b.hold.end }, offered) &&
            "native-end-to-peer-return",
          intersects(b.envelope, offered) && "native-envelope",
          intersects(b.hold, offered) && "serial-hold",
        ].filter(Boolean),
      });
      return {
        seq: s.seq,
        ms: s.end - s.due,
        offerSlipMs: s.offered - s.due,
        clientBeforeNativeMs: op.submit - raw.start - s.offered,
        clientAfterNativeMs: s.end - (op.end - raw.start),
        precedingNative: own?.tx
          ? [
              ...new Set(
                Array.from(commands.values())
                  .filter((p) => BigInt(p.t) < BigInt(op.t) && BigInt(p.t) >= BigInt(op.t) - 35n)
                  .map((p) => match(p)?.tx)
                  .filter(Boolean),
              ),
            ]
              .filter((p: any) =>
                intersects({ start: p.start - p.nativeStats.msec, end: p.start }, response),
              )
              .map((p: any) => ({
                t: p.datomicT,
                ms: p.nativeStats.msec,
                applyMs: p.nativeStats["apply-msec"],
              }))
          : [],
        quietGatewayPrepMs: own ? own.trace.prep.end - own.trace.prep.start : null,
        quietGatewayWaitMs: own ? own.trace.wait.end - own.trace.wait.start : null,
        queueBeforeDispatchMs: op.queueUs == null ? null : op.queueUs / 1000,
        quietNativeMs: own?.tx?.nativeStats.msec ?? null,
        quietGroup: op.group ?? null,
        bulkAtOffer: bulk
          .filter((b: any) => intersects(b.trace.prep, offered) || intersects(b.hold, offered))
          .map(around),
        bulkDuringSave: bulk.filter((b: any) => intersects(b.hold, response)).map(around),
        gcDuringSave: pauses
          .filter((p) => intersects(response, p))
          .map((p) => ({ role: p.process, ms: clipped(response, p) })),
        indexAdoptionDuringSave: indices
          .filter((p) => intersects(response, p))
          .map((p) => ({ ms: clipped(response, p), t: p.indexBasisAfter })),
      };
    });
  const during = { start: asInterval(0).start, end: asInterval(raw.duration).end };
  const duringArm = <T extends { start: number; end: number }>(r: T) => intersects(during, r);
  return {
    arm: arm.arm,
    quiet: arm.neighbors.quiet,
    fps: arm.fps,
    clockBoundsMs: bounds,
    bulkFacts: stats(bulk.map((r: any) => r.facts)),
    bulkSerialMs: stats(bulk.map((r: any) => r.hold.end - r.hold.start)),
    frameWall: stats(bulk.map((r) => r.wall)),
    stageMs: Object.fromEntries(
      Object.keys(bulk[0]?.stages ?? {}).map((name) => {
        const xs = bulk.map((r) => r.stages[name as keyof typeof r.stages]);
        return [
          name,
          {
            ...stats(xs),
            mean: xs.reduce((a, b) => a + b, 0) / xs.length,
            negatives: xs.filter((n) => n < 0).length,
          },
        ];
      }),
    ),
    bulkPrepMs: stats(bulk.map((r: any) => r.trace.prep.end - r.trace.prep.start)),
    bulkApplyMs: stats(bulk.map((r: any) => r.tx.nativeStats["apply-msec"])),
    bulkNativeMs: stats(bulk.map((r: any) => r.tx.nativeStats.msec)),
    bulkLogParkMs: stats(bulk.map((r: any) => r.parks.reduce((n: number, p: any) => n + p.ms, 0))),
    bulkNativeToPeerMs: stats(bulk.map((r: any) => r.hold.end - r.tx.start)),
    gc: pauses.filter(duringArm).map((p) => ({ role: p.process, ms: p.jfrDurationMs })),
    adoptions: indices
      .filter(duringArm)
      .map((r) => ({ t: r.indexBasisAfter, ms: r.end - r.start })),
    top,
  };
}
console.log(
  JSON.stringify(
    {
      nonce: attempt.nonce,
      source: attempt.source,
      slot: attempt.slot,
      indexHook: nativeLog
        .filter((e) => e.type === "native-counter-state")
        .map((e) => e.counters.indexAdoptions),
      metrics: nativeLog
        .filter((e) => e.type === "metrics")
        .map((e) => ({
          at: e.at,
          job: e.counters.indexJobMsec,
          memory: e.counters.memoryIndexMB,
          log: e.metrics.LogWriteMsec,
        })),
      arms: observed.result.map(analyze),
    },
    null,
    2,
  ),
);
