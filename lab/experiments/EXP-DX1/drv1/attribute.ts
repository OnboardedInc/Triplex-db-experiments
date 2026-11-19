// [DX-DRV1] Why: compare saved Mac and bare-metal tails at the same ACK clock and frozen offers.
// Rejected: attributing post-ACK work or labelling the socket residual as measured network time.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createReadStream, readFileSync } from "node:fs";
import path from "node:path";
import { committedRows } from "../../../bench/lib/verdict.ts";
import { validateCommandTrace, validateWriterBoundary } from "../../../trace/anatomy.mjs";
import { verdictMs } from "../../../trace/instrument.mjs";
import { alignClockRecord, attribute, percentile, records, traceChildren } from "../../../trace/report.mjs";

const json = (file: string) => JSON.parse(readFileSync(file, "utf8"));
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
const stats = (values: number[]) => ({
  n: values.length, over50: values.filter(value => value > 50).length,
  p50: percentile(values, .5), p99: percentile(values, .99), max: Math.max(...values), sumMs: sum(values),
});
const raw = (name: string) => `trace/raw/${name}.jsonl.gz`;

async function analyze(directory: string) {
  const files = ["head.txt", "driver/ns-report.json", "driver/ns-writes.jsonl", "trace-run.json", "trace-summary.json",
    ...["node-14-0", "node-14-3", "gw-w", "gw-r"].map(raw)];
  const seals = new Map(readFileSync(path.join(directory, "SHA256SUMS"), "utf8").trim().split("\n")
    .map(line => [line.slice(66), line.slice(0, 64)]));
  for (const name of files) {
    // head.txt is a sidecar on historical runs. The sealed run descriptor binds the source.
    if (name === "head.txt") continue;
    const hash = createHash("sha256");
    for await (const chunk of createReadStream(path.join(directory, name))) hash.update(chunk);
    assert.equal(hash.digest("hex"), seals.get(name), `seal mismatch: ${name}`);
  }
  const manifest = json(path.join(directory, "trace-run.json"));
  const report = json(path.join(directory, "driver/ns-report.json"));
  const refs = json(path.join(directory, "trace-summary.json")).clockAlignment.reference;
  assert.equal(manifest.tag, path.basename(directory));
  assert.equal(manifest.slot, manifest.tag);
  assert.equal(manifest.source, readFileSync(path.join(directory, "head.txt"), "utf8").trim());
  assert(report.status === "DONE" && report.config.zeroReaders && report.config.rungSubjects === 10_000);
  assert.equal(report.verdictPlan.offeredSeconds, 5910);
  const primary: any[] = [];
  for await (const row of records(path.join(directory, "driver/ns-writes.jsonl")))
    if (row.stream === "background" && !row.resend) primary.push(row);
  const good = committedRows(primary);
  assert.equal(primary.length, 38_826);
  assert.equal(good.length, primary.length);
  assert.equal(new Set(good.map(row => row.seq)).size, good.length);
  assert.equal(new Set(good.map(row => row.traceId)).size, good.length);
  const { firstBurstAtS, burstPeriodS, burstDurationS } = report.trace.params;
  const burst = (row: any) => Math.floor((row.offsetMs / 1000 - firstBurstAtS) / burstPeriodS);
  const withinBurst = (row: any) => row.offsetMs / 1000 - firstBurstAtS - burst(row) * burstPeriodS;
  assert(good.every(row => row.burst === (burst(row) >= 0 && withinBurst(row) < burstDurationS)));
  const bind = (row: any) => {
    assert.equal(row.run, manifest.tag);
    assert.equal(row.source, manifest.source);
    assert.equal(row.slot, manifest.slot);
    const aligned = alignClockRecord(row, refs);
    assert.notEqual(aligned.clockAlignmentQualified, false);
    return aligned;
  };
  const writer = new Map(good.map(row => [row.traceId, row]));
  const roots = new Map<string, any>(), gateways = new Map<string, any[]>();
  const gc: any[] = [], broadcasts: any[] = [], heap: any[] = [];
  for await (const row of records(path.join(directory, raw("node-14-0")))) {
    if (row.type === "request" && row.name === "driver.commit" && writer.has(row.traceId)) {
      const root = bind(row), w = writer.get(row.traceId);
      validateWriterBoundary(w, root);
      validateCommandTrace(w, [root]);
      assert.equal(root.clock.bootId, refs.bootId);
      assert.equal(root.attributes.ackPublishedAt, w.ackPublishedAt);
      assert.equal(root.attributes.position, w.position);
      assert.equal(root.attributes.seq, w.seq);
      assert(!roots.has(row.traceId));
      roots.set(row.traceId, root);
    }
    if (row.type === "event" && row.layer === "typescript-gc") gc.push(bind(row));
    if (row.type === "event" && row.name === "driver.reader-basis.broadcast") broadcasts.push(bind(row));
    if (row.type === "resource" && row.memory?.heapUsed !== undefined) heap.push(bind(row));
  }
  for (const name of ["gw-w", "gw-r"]) {
    for await (const row of records(path.join(directory, raw(name)))) {
      if (row.type !== "request" || !writer.has(row.traceId)) continue;
      const list = gateways.get(row.traceId) ?? [];
      list.push(bind(row));
      gateways.set(row.traceId, list);
    }
  }
  const slow = good.filter(row => verdictMs(row) > 50);
  const overlap = (interval: any, start: number, end: number) =>
    Math.max(0, Math.min(interval.end, end) - Math.max(interval.start, start));
  const partition = good.filter(row => roots.has(row.traceId)).map(row => {
    const root = roots.get(row.traceId);
    const calls = traceChildren(root, gateways.get(row.traceId) ?? []);
    const pauses = gc.filter(event => event.start < row.ackPublishedAt && event.end > row.scheduledAt);
    const { layers, steps } = attribute({ ...root, end: row.ackPublishedAt }, calls, pauses);
    const queue = (cause: string) => sum(row.queue.filter((q: any) => q.cause === cause)
      .map((q: any) => overlap(q, row.scheduledAt, row.ackPublishedAt)));
    const scheduler = queue("scheduler-late"), subject = queue("subject");
    const dispatch = queue("scheduler-dispatch"), slot = queue("slot");
    const node = layers.typescript + layers["typescript-gc"] + (layers["event-loop"] ?? 0);
    const socket = layers.network, gateway = layers.gateway + layers["gateway-gc"] + layers["gateway-queue"] + layers["peer-call"];
    const peer = layers["peer-wait"], unknown = layers.unknown, ack = verdictMs(row);
    assert(Math.abs(layers["driver-queue"] - (scheduler + subject + dispatch + slot)) <= .01);
    assert(Math.abs(ack - (scheduler + subject + dispatch + slot + node + socket + gateway + peer + unknown)) <= .01);
    return { ack, burst: row.burst ? burst(row) + 1 : 0, within: withinBurst(row), scheduler, subject, dispatch, slot,
      node, nodeGc: layers["typescript-gc"], socket, gateway, peer, unknown, calls: calls.length,
      socketQueueWrite: sum(steps.filter(([name]) => name.endsWith("/socket.queue-and-write")).map(([, ms]) => ms)),
      schedulerGc: sum(pauses.map(gc => overlap(gc, row.scheduledAt, row.offeredAt))),
      schedulerBroadcast: ack > 50 ? sum(broadcasts.filter(x => x.start < row.offeredAt && x.end > row.scheduledAt)
        .map(x => overlap(x, row.scheduledAt, row.offeredAt))) : 0 };
  });
  assert.equal(partition.filter(row => row.ack > 50).length, slow.length);
  const tail = partition.filter(row => row.ack > 50);
  const totals = (items: typeof tail) => ({
    n: items.length,
    ...Object.fromEntries((["ack", "scheduler", "subject", "dispatch", "slot", "node", "nodeGc", "socket", "gateway", "peer",
      "unknown", "socketQueueWrite", "schedulerGc", "schedulerBroadcast"] as const).map(key => [key, sum(items.map(row => row[key]))])),
    missingGateway: items.filter(row => !row.calls).length,
  });
  const scenario = (select: (row: typeof partition[number]) => number) => {
    // Every original >50 ms row is joined. Untouched fast-only rows bound the projected percentile
    // from above and zero bounds them from below. The count above 50 ms remains exact either way.
    const observed = partition.map(select);
    const untraced = good.filter(row => !roots.has(row.traceId)).map(row => verdictMs(row));
    const upper = stats([...observed, ...untraced]);
    return { ...upper, p99Lower: percentile([...observed, ...untraced.map(() => 0)], .99) };
  };
  const seconds = (at: number) => (at - report.traceStartAbsMs) / 1000;
  const inWindow = (at: number) => seconds(at) >= 0 && seconds(at) < 5910;
  const heapPeakMiB = (scope: any[]) => Math.max(...scope.map(row => row.memory.heapUsed)) / 2 ** 20;
  let longestObserverMs = 0, longestObserverWaitMs = 0;
  const linkedFallbacks = new Map<string, any>();
  for await (const row of records(path.join(directory, raw("node-14-3"))))
    if (row.type === "request" && row.name === "worker.gateway-observer.observe") linkedFallbacks.set(row.traceId, bind(row));
  const readRoots = new Map<string, any>();
  for await (const row of records(path.join(directory, raw("node-14-0")))) {
    if (row.type === "request" && row.name === "driver.ryow") {
      const owner = writer.get(row.attributes?.commitTraceId);
      if (!owner) continue;
      const read = bind(row);
      assert(read.start >= owner.ackPublishedAt);
      longestObserverMs = Math.max(longestObserverMs, read.end - read.start);
      readRoots.set(row.traceId, read);
    } else if (row.type === "request" && row.name === "worker.replica.fallback") {
      const rpc = row.spans.find((span: any) => span.name === "rpc.gateway-observer.observe"), fallback = linkedFallbacks.get(row.traceId);
      if (fallback && rpc?.id === fallback.parent) {
        bind(row);
        longestObserverWaitMs = Math.max(longestObserverWaitMs, fallback.start - rpc.start);
      }
    }
  }
  const all = stats(good.map(row => verdictMs(row)));
  assert.equal(all.p99, report.priorities.P2.allPrimary.p99Ms);
  const cohort = createHash("sha256").update(JSON.stringify(good.toSorted((a, b) => a.seq - b.seq)
    .map(row => [row.seq, Math.round(row.offsetMs * 1000), row.subject, row.facts, row.kind, row.ackLoss, row.correction]))).digest("hex");
  return { tag: manifest.tag, source: manifest.source, traceDigest: report.trace.digest, cohort, joined: partition.length, all,
    overall: totals(tail), steady: totals(tail.filter(row => !row.burst)), burst: totals(tail.filter(row => row.burst)),
    regions: [tail.filter(row => row.burst && row.within < 1), tail.filter(row => row.burst && row.within >= 1 && row.within < 59),
      tail.filter(row => row.burst && row.within >= 59)].map(totals),
    byBurst: Array.from({ length: 10 }, (_, i) => ({
      offered: good.filter(row => row.burst && burst(row) === i).length,
      ...totals(tail.filter(row => row.burst === i + 1)),
    })),
    counterfactual: {
      retainSocketAndSubject: scenario(row => row.socket + row.subject + row.gateway + row.peer + row.unknown),
      retainSubject: scenario(row => row.subject + row.gateway + row.peer + row.unknown),
      gatewayAndPeerOnly: scenario(row => row.gateway + row.peer),
      subjectOnly: scenario(row => row.subject),
    },
    writer: { peakInFlight: report.writer.maxInFlightSeen, burstElu: report.client.burstMainEluMean,
      peakProcessBytes: report.client.peakProcessBytes, heapMiB: [
        heapPeakMiB(heap.filter(row => seconds(row.at) > 0 && seconds(row.at) < 180)),
        heapPeakMiB(heap.filter(row => seconds(row.at) >= 5500 && inWindow(row.at))),
        heapPeakMiB(heap.filter(row => inWindow(row.at))),
      ], gcMs: sum(gc.filter(row => inWindow(row.start)).map(row => row.end - row.start)) },
    ryow: { queue: report.replica.receiptGateway.queue, captures: report.replica.receiptGateway.captures,
      pulls: report.priorities.P2.readYourOwnWrite.pulls, correct: report.priorities.P2.readYourOwnWrite.correct,
      longestObserverMs, longestObserverWaitMs, sampledReadRoots: readRoots.size } };
}

const dirs = process.argv.slice(2);
assert.equal(dirs.length, 2, "usage: node attribute.ts SERVER_ZERO MAC_ZERO");
const server = await analyze(dirs[0]!);
const mac = await analyze(dirs[1]!);
assert.equal(server.traceDigest, mac.traceDigest);
assert.equal(server.cohort, mac.cohort);
console.log(JSON.stringify({ server, mac }, null, 2));
