// [DX-B7] Why: bind feed delivery to each independently offered commit ACK. Rejected: completion-paced writes or unbound lag samples.
import fs from "node:fs";
import assert from "node:assert/strict";
import { Effect } from "effect";
import { buildTraceCommand } from "../../../bench/lib/commands.ts";
const sleep = (ms) => new Promise((r) => setTimeout(r, Math.max(0, ms)));
const summary = (a) => {
  const s = [...a].sort((x, y) => x - y);
  return { n: s.length, p50: s[Math.floor(s.length * 0.5)], p99: s[Math.floor(s.length * 0.99)] };
};
export function remember(states, rows) {
  for (const t of rows) {
    if (t.attribute === ":placement/stamp") {
      const i = Number(t.entityId.slice(3));
      states.set(i, {
        ...states.get(i),
        stamp: Number(t.value.value),
        stampId: t.id,
        stampValidFrom: t.validFrom,
      });
    }
    if (t.attribute === ":worker/address") {
      const i = Number(t.entityId.slice(3));
      states.set(i, {
        ...states.get(i),
        address: t.value.value,
        addressId: t.id,
        addressValidFrom: t.validFrom,
      });
    }
  }
}
export async function mixed({ w, feed, scope, states, workers, once, initialPosition, newest, readCpu }) {
  let seed = 0x19870219,
    seq = 0,
    cursor = initialPosition,
    stop = false,
    failure;
  const random = () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return (seed >>> 0) / 4294967296;
  };
  const deliveries = new Map(),
    pending = new Map(),
    phases = {};
  const feedPolls = [];
  let lastFeedPoll;
  feed.client.onRequest = (sample) => {
    lastFeedPoll = feedPolls.push(sample) - 1;
  };
  const consumer = (async () => {
    while (!stop) {
      const page = await Effect.runPromise(feed.adapter.getTransactionsAfter(cursor, 1000, 1000));
      assert.ok(page, "feed decline");
      for (const tx of page) {
        assert.ok(!deliveries.has(tx.txId), "duplicate feed transaction");
        const row = tx.triples.find((t) => t.attribute === ":_tx/position");
        assert.ok(row);
        const p = Number(row.value.value);
        assert.ok(p > cursor, "feed order");
        cursor = p;
        deliveries.set(tx.txId, { at: performance.now(), position: p, pollId: lastFeedPoll });
      }
    }
  })();
  consumer.catch((e) => {
    failure = e;
  });
  const diagnostics = new Map(), acknowledged = new Set([initialPosition]);
  w.client.onCommit = (sample) => {
    for (const txId of sample.transactionIds) diagnostics.set(txId, sample);
  };
  const { db } = await w.client.create(scope, "lean");
  let subjectSequence = 0;
  async function commit(offeredAt) {
    const n = seq++,
      subject = subjectSequence++ % 400,
      p = random(),
      facts =
        p < 0.6
          ? 5 + Math.floor(random() * 6)
          : p < 0.9
            ? 11 + Math.floor(random() * 15)
            : 26 + Math.floor(random() * 25);
    const previous = pending.get(subject) ?? Promise.resolve();
    const done = (async () => {
      await previous;
      const started = performance.now();
      const command = buildTraceCommand({
        runTag: scope,
        event: { subject, seq: n, facts, kind: "person", stream: "background", correction: false },
        state: states.get(subject),
        scheduledAbsMs: Date.now(),
      });
      const receipt = await w.runtime.runPromise(
        w.triples.transact(command.operations, {
          commandId: command.commandId,
          preconditions: command.preconditions,
        }),
      );
      const ack = performance.now();
      // [DX-B8] Why: every moving pull atomically samples the latest acknowledged receipt position.
      // Rejected: per-cut worker messages (a queued message can leave readers pinned to an older cut).
      const head = new BigInt64Array(newest), position = BigInt(receipt.position);
      let priorHead = Atomics.load(head, 0);
      while (position > priorHead) {
        const observed = Atomics.compareExchange(head, 0, priorHead, position);
        if (observed === priorHead) break;
        priorHead = observed;
      }
      acknowledged.add(receipt.position);
      remember(states, receipt.triples);
      const diagnostic = diagnostics.get(receipt.txId);
      assert.ok(diagnostic, "receipt-bound writer diagnostic");
      return {
        gatewayRequests: diagnostic.attempts.flatMap((attempt) => attempt.requests),
        httpCalls: diagnostic.httpCalls,
        clockReplays: diagnostic.clockReplays,
        txId: receipt.txId,
        position: receipt.position,
        offeredAt,
        started,
        ack,
        commitMs: ack - started,
      };
    })();
    pending.set(subject, done);
    return done;
  }
  try {
    for (const [name, rate, readers] of [
      ["backToBack", 0, 0],
      ["quietPoisson", 15, 0],
      ["readPoisson", 15, 256],
    ]) {
      seed = 0x19870219;
      subjectSequence = 0;
      // [DX-B7] Why: compare the same 400-subject writer with its exact precondition rows present in both arms.
      // Rejected: a cold baseline with extra snapshot RPCs against a warmed loaded arm.
      for (let subject = 0; subject < 400; subject++) {
        const state = states.get(subject);
        assert.ok(state);
        for (const id of [state.stampId, state.addressId].filter(Boolean)) {
          assert.ok(await Effect.runPromise(w.adapter.getById(id)));
          assert.ok(w.client.rowCache.has(`${db}\0${id}`));
        }
      }
      const writerCacheBefore = {
        bytes: w.client.rowCache.bytes,
        entries: w.client.rowCache.size,
        evictions: w.client.rowCache.evictions,
      };
      const eluStart = performance.eventLoopUtilization(), driverCpuStart = process.cpuUsage(), gatewayCpuStart = readCpu?.();
      const startedAt = new Date().toISOString();
      const duration = Number(process.env.B8_MIXED_DURATION_MS || 30000),
        start = performance.now(),
        jobs = [],
        readerDone = readers ? workers.map(once) : [];
      if (readers)
        workers.forEach((worker, i) =>
          worker.postMessage({
            mode: "random",
            movingBasis: true,
            readers: Math.floor(readers / workers.length) + (i < readers % workers.length ? 1 : 0),
            durationMs: duration,
          }),
        );
      let due = start,
        arrivalSeed = 0x19870219;
      const schedule = [];
      while (true) {
        arrivalSeed ^= arrivalSeed << 13;
        arrivalSeed ^= arrivalSeed >>> 17;
        arrivalSeed ^= arrivalSeed << 5;
        due += rate === 1 ? 1000 : (-Math.log(1 - (arrivalSeed >>> 0) / 4294967296) * 1000) / rate;
        if (due > start + duration) break;
        schedule.push(due);
      }
      if (rate === 0) {
        while (performance.now() < start + duration) jobs.push(Promise.resolve(await commit(performance.now())));
      }
      for (const due of schedule) {
        await sleep(due - performance.now());
        if (failure) throw failure;
        const job = commit(due);
        job.catch((e) => {
          failure ??= e;
        });
        jobs.push(job);
      }
      await sleep(start + duration - performance.now());
      const rows = await Promise.all(jobs),
        readerSamples = await Promise.all(readerDone);
      if (failure) throw failure;
      for (const sample of readerSamples) {
        let seen = 0;
        for (const [position,count] of Object.entries(sample.basisCounts)) {
          assert.ok(acknowledged.has(Number(position)), "every observed read cut names an ACK from this run");
          seen += count;
        }
        assert.equal(seen, sample.times.length, "every moving pull has a bound receipt cut");
      }
      const deadline = performance.now() + 5000;
      while (rows.some((r) => !deliveries.has(r.txId)) && performance.now() < deadline) {
        if (failure) throw failure;
        await sleep(5);
      }
      for (const row of rows) {
        const d = deliveries.get(row.txId);
        assert.ok(d, `missing delivery ${row.txId}`);
        assert.equal(d.position, row.position);
        row.feedPollId = d.pollId;
        row.delivered = d.at;
        row.feedLagMs = d.at - row.ack;
      }
      phases[name] = {
        startedAt, finishedAt: new Date().toISOString(),
        driverCpu: process.cpuUsage(driverCpuStart),
        readGatewayCpuSeconds: readCpu ? (readCpu()-gatewayCpuStart)/1e6 : undefined,
        basisPolicy: "atomic newest acknowledged receipt position per pull",
        driverMainUtilisation: performance.eventLoopUtilization(eluStart).utilization,
        writerCacheBefore,
        httpCalls: summary(rows.map((r) => r.httpCalls)),
        commit: summary(rows.map((r) => r.commitMs)),
        offeredLatency: summary(rows.map((r) => r.ack - r.offeredAt)),
        feedLag: summary(rows.map((r) => r.feedLagMs)),
        rows,
        readers: readerSamples.length
          ? {
              latency: summary(readerSamples.flatMap((s) => s.times)),
              pullsPerSecond:
                readerSamples.reduce((n, s) => n + s.times.length, 0) / (duration / 1000),
              workerUtilisation: readerSamples.map((s) => s.workerUtilisation),
              samples: readerSamples,
            }
          : undefined,
      };
      fs.writeFileSync(
        (process.env.B8_DRIVER_OUTPUT || "/driver") + "/mixed.json",
        JSON.stringify({ diagnostic: true, scope, phases, feedPolls }),
      );
      console.log(
        name,
        JSON.stringify({
          ...phases[name],
          rows: undefined,
          readers: phases[name].readers
            ? { ...phases[name].readers, samples: undefined }
            : undefined,
        }),
      );
    }
  } finally {
    stop = true;
    await consumer;
    await feed.runtime.dispose();
    feed.client.close();
  }
}
