import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { gunzipSync } from "node:zlib";
import { percentile, replayLive, type Offer, type OfferTape } from "./live-evidence.ts";

const archive = process.argv[2];
assert(archive);
const bytes = (file: string) => readFileSync(path.join(archive, file));
const sha = (input: Buffer) => createHash("sha256").update(input).digest("hex");
const transfer = JSON.parse(bytes("TRANSFER.json").toString());
assert.equal(transfer.item, "ha1-micro");
for (const side of ["raw", "summary"]) {
  const packed = bytes(side + ".tar.zst");
  assert.equal(packed.length, transfer[side].bytes);
  assert.equal(sha(packed), transfer[side].sha256);
}
type Member = { sha256: string; bytes: number };
const members = (side: "raw" | "summary") => {
  const index = bytes(side === "raw" ? "raw/raw-members.json" : "summary/members.json");
  assert.equal(sha(index), transfer[side + "Members"]);
  return JSON.parse(index.toString()) as Record<string, Member>;
};
const index = { raw: members("raw"), summary: members("summary") };
const read = (side: keyof typeof index, file: string) => {
  const entry = index[side][file];
  const payload = bytes(side + "/" + file);
  assert(entry && entry.bytes === payload.length && entry.sha256 === sha(payload), file);
  return payload;
};
const json = (file: string) => JSON.parse(read("summary", file).toString());
const records = (input: Buffer) =>
  input
    .toString()
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
const collectionBytes = bytes("summary/collector.json");
const collected = JSON.parse(collectionBytes.toString());
assert.equal(transfer.producer, collected.source);
assert.equal(transfer.serviceStates["bm1n20-ha1-micro.service"].Result, "success");
const run = "run/load-micro-" + collected.nonce + "/";
const attempt = json(run + "attempt.json");
const result = json(run + "observations.json");
assert.equal(sha(read("summary", run + "observations.json")), collected.observationsSha256);
assert.deepEqual(
  [attempt.nonce, attempt.slot, attempt.source.git],
  [collected.nonce, collected.slot, collected.source],
);
assert.deepEqual(
  [result.nonce, result.slot, result.source],
  [attempt.nonce, attempt.slot, attempt.source],
);
assert.deepEqual(json(run + "cleanup.json"), { nonce: attempt.nonce, containers: 0, networks: 0 });
const events = records(read("raw", run + "events.jsonl"));
assert(events.every((event) => event.nonce === attempt.nonce));
const metrics = records(gunzipSync(read("raw", run + "tx.gz")));
assert(
  metrics.every(
    (event) =>
      event.run === attempt.nonce &&
      event.slot === attempt.slot &&
      event.source === attempt.source.git &&
      event.process === "tx",
  ),
);
const clock = metrics[0].clock;
assert(clock.bootId && clock.domain === "linux-monotonic");
assert(metrics.every((event) => event.clock.bootId === clock.bootId));

type Interval = { start: number; end: number };
function pauses(role: "writeGateway" | "transactor", name: string) {
  const declaration = collected.jvms[role];
  const buffer = read("raw", run + declaration.file);
  assert.equal(sha(buffer), declaration.sha256);
  assert.equal(
    events.find((event) => event.type === "role" && event.data.role === name).data.id,
    declaration.container,
  );
  const log = gunzipSync(buffer).toString();
  assert(log.includes("Using G1") && declaration.jvmActiveProcessors === 2);
  // [DX-HA1] Why: join each completed stop once; start messages and concurrent cycles are separate events.
  // Rejected: treating a concurrent GC cycle as an application stop.
  return log.split("\n").flatMap((line) => {
    const match = /^\[([^\]]+)\].*GC\(\d+\) Pause .* (\d+(?:\.\d+)?)ms$/.exec(line);
    if (!match) return [];
    const end = Date.parse(match[1]!) - clock.offsetMs;
    const start = end - Number(match[2]);
    assert(Number.isFinite(start) && start <= end);
    return [{ start, end }];
  });
}
const gatewayPauses = pauses("writeGateway", "write");
const txPauses = pauses("transactor", "active");

// [DX-HA1] Why: intersect per-request stages at both edges of the clock bridge and preserve ambiguous time.
// Rejected: subtracting independently ranked stage p99s or assigning every coincident pause to the request.
function intersection(a: Interval, b: Interval) {
  return Math.max(0, Math.min(a.end, b.end) - Math.max(a.start, b.start));
}
function overlap(events: Interval[], outer: Interval, inner: Interval, resolution = 0) {
  const candidates = events.filter(
    (e) => e.end >= outer.start - resolution && e.start <= outer.end + resolution,
  );
  return {
    inner: candidates.reduce(
      (total, e) =>
        total + intersection(inner, { start: e.start + resolution, end: e.end - resolution }),
      0,
    ),
    outer: candidates.reduce(
      (total, e) =>
        total + intersection(outer, { start: e.start - resolution, end: e.end + resolution }),
      0,
    ),
    count: candidates.length,
  };
}
const describe = (values: number[]) => ({
  n: values.length,
  p50: percentile(values, 0.5),
  p99: percentile(values, 0.99),
  max: percentile(values, 1),
  sum: values.reduce((a, b) => a + b, 0),
});
type Native = OfferTape["native"][number] & {
  submit: number;
  end: number;
  t: string;
  toEntryMs?: number;
  group: number;
  peerTimings: {
    payloadPrepared: number;
    completed: number;
    responsePrepared: number;
    submitted?: number;
  };
};
type Clock = { bootId: string; run: string; monoMs: number; send: number; recv: number };
const arms = result.result.map((arm: any) => {
  const tape = json(run + arm.arm + ".offers.json") as OfferTape & {
    expectedDb: string;
    clockBefore: Clock[];
    clockAfter: Clock[];
    native: Native[];
  };
  replayLive(tape, attempt, { framesWithoutService: 0, ...arm });
  assert.equal(arm.scope, tape.scope);
  assert(tape.samples.every((offer) => offer.outcome === "verified"));
  const clocks = [...tape.clockBefore, ...tape.clockAfter];
  assert(clocks.every((c) => c.bootId === clock.bootId && c.run === tape.nonce));
  const lo = Math.max(...clocks.map((c) => c.monoMs - c.recv));
  const hi = Math.min(...clocks.map((c) => c.monoMs - c.send));
  assert(lo <= hi && hi - lo < 2);
  const midpoint = (lo + hi) / 2;
  const toMono = (v: number) => tape.start + v + midpoint;
  const whole = { start: toMono(0), end: toMono(tape.duration) };
  const byCommand = new Map(tape.native.map((n) => [n.command, n]));
  assert.equal(byCommand.size, tape.native.length);
  const bulk = tape.ordered.map(({ service, command }) => {
    const op = byCommand.get(command)!;
    const hold = op.serialHold!;
    assert(op.grant?.bulk && !op.grant["runnable-live"] && service?.ms === hold.end - hold.start);
    return { ...hold, ms: service.ms };
  });
  // The shared transactor runs old databases' indexing too. Include its whole processor,
  // with no unsupported assumption that an opaque native database hash is the gateway name.
  const indexed = metrics
    .filter((m) => m.type === "index-adoption" && m.completed)
    .map((m) => ({
      start: m.start - m.clock.offsetMs,
      end: m.end - m.clock.offsetMs,
    }));
  const sample = (offer: Offer) => {
    const outer = { start: tape.start + offer.offered + lo, end: tape.start + offer.end + hi };
    const inner = { start: tape.start + offer.offered + hi, end: tape.start + offer.end + lo };
    const gatewayGc = overlap(gatewayPauses, outer, inner, 1);
    const n = offer.kind === "save" ? byCommand.get("save/quiet/" + offer.seq) : undefined;
    if (n) assert.equal(n.position, offer.seen?.position);
    const queue = n?.queueUs === undefined ? 0 : n.queueUs / 1000;
    const prep = (n?.peerTimings.payloadPrepared ?? 0) / 1000;
    const gatewayTime = (n?.peerTimings.responsePrepared ?? 0) / 1000;
    // Grouped responses omit the dispatch timestamp. Request/response brackets bound the enqueue.
    // The scheduler arrives just after payloadPrepared. A conservative 0.2-ms submit handoff is used only for the overlap estimate.
    const arrivalLo = n ? (n.serialHold ? n.serialHold.start - queue : n.submit + lo + prep) : 0;
    const arrivalHi = n
      ? n.serialHold
        ? arrivalLo
        : Math.max(arrivalLo, n.end + hi - gatewayTime + prep + 0.2)
      : 0;
    const bulkWait = n
      ? overlap(
          bulk,
          { start: arrivalLo, end: arrivalHi + queue },
          { start: arrivalHi, end: arrivalLo + queue },
        )
      : { inner: 0, outer: 0, count: 0 };
    bulkWait.outer = Math.min(queue, bulkWait.outer);
    const peer = n ? { start: arrivalLo, end: n.end + hi } : outer;
    const txGc = overlap(txPauses, peer, peer, 1);
    const index = overlap(indexed, peer, peer);
    const http = n ? n.end - n.submit : null;
    return {
      seq: offer.seq,
      elapsed: offer.end - offer.due,
      offerSlip: offer.offered - offer.due,
      sdkBeforeHttp: n ? n.submit - tape.start - offer.offered : null,
      http,
      sdkAfterHttp: n ? tape.start + offer.end - n.end : null,
      gatewayTime: n ? gatewayTime : null,
      prep: n ? prep : null,
      queue: n ? queue : null,
      outsideGatewayHttp: http === null ? null : http - gatewayTime,
      gatewayAfterPrepAndQueue: n ? gatewayTime - queue - prep : null,
      serialHold: n?.serialHold ? n.serialHold.end - n.serialHold.start : null,
      group: n?.group ?? null,
      nativeEntry: n?.toEntryMs ?? null,
      bulkWait,
      gatewayGc,
      txGc,
      index,
    };
  };
  const measure = (kind: Offer["kind"]) => {
    const samples = tape.samples
      .filter((o) => o.kind === kind && o.actor === "quiet")
      .sort((a, b) => b.end - b.due - (a.end - a.due));
    assert.equal(samples.length, 540);
    const top = samples.slice(0, 12).map(sample);
    assert.equal(top[5]!.elapsed, arm.neighbors.quiet[kind].p99Ms);
    return { p99: top[5], top };
  };
  const cpu = events.find((event) => event.type === "load-arm" && event.data.arm === arm.arm).data;
  assert.equal(cpu.scope, tape.scope);
  const counter = (s: string, key: string) =>
    Number(new RegExp("^" + key + " (\\d+)$", "m").exec(s)?.[1]);
  const cpuSeconds = Object.fromEntries(
    ["write", "active", "pg"].map((role) => {
      const delta = (key: string) => {
        const diff = counter(cpu.cpuAfter[role], key) - counter(cpu.cpuBefore[role], key);
        assert(Number.isFinite(diff) && diff >= 0);
        return diff;
      };
      return [role, { cpu: delta("usage_usec") / 1e6, throttled: delta("throttled_usec") / 1e6 }];
    }),
  );
  return {
    arm: arm.arm,
    queryableFps: arm.queryableFacts / (tape.duration / 1000),
    clockWidth: hi - lo,
    cpuSeconds,
    bulkHold: describe(bulk.map((r) => r.ms)),
    bulkOccupancy: bulk.reduce((s, r) => s + intersection(r, whole), 0) / tape.duration,
    indexAdoptions: describe(
      indexed.filter((r) => intersection(r, whole)).map((r) => r.end - r.start),
    ),
    gatewayPauses: describe(
      gatewayPauses.filter((r) => intersection(r, whole)).map((r) => r.end - r.start),
    ),
    txPauses: describe(txPauses.filter((r) => intersection(r, whole)).map((r) => r.end - r.start)),
    storageIntervals: metrics
      .filter(
        (m) =>
          m.type === "metrics" &&
          intersection({ start: m.at - clock.offsetMs - 60000, end: m.at - clock.offsetMs }, whole),
      )
      .map((m) => ({
        end: m.at,
        store: m.metrics.StoragePutMsec,
        log: m.metrics.LogWriteMsec,
        apply: m.metrics.TransactionApplyMsec,
      })),
    save: measure("save"),
    read: measure("read"),
  };
});
console.log(
  JSON.stringify(
    {
      source: attempt.source.git,
      nonce: attempt.nonce,
      slot: attempt.slot,
      transferSha256: sha(bytes("TRANSFER.json")),
      collectorSha256: sha(collectionBytes),
      arms,
    },
    null,
    2,
  ),
);
