// @ts-nocheck -- [CX-A01-040] Why: integration adds this runtime protocol or command fixture to checkJs; dynamic JSON/message fields lack static record types. Binding errors remain checked by lab/bin/checkjs.mjs. Rejected: excluding current executable code.
export { generateTrace, traceDigest } from "../lib/trace.ts";
export { auditP3, lagSample, distribution } from "./p3.mjs";
// [EXP-NSR] Why: all offers and closed loops live on the trusted side of RPC; candidate code can only return bytes. Rejected: candidate provider imports or worker callbacks in the driver.
import fs from "node:fs";
import path from "node:path";
import { canonicalAnswer, readEvidence } from "./answer.mjs";
import { monitorEventLoopDelay } from "node:perf_hooks";
import { rpc } from "./rpc.mjs";
import { now } from "./clock.mjs";
import { Events } from "./events.mjs";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export function readerLevel(events, startNs, endNs, level = 256, relay) {
  const start = BigInt(startNs),
    end = BigInt(endNs),
    second = 1000000000n;
  if (end - start < second) throw Error("READER-WINDOW-TOO-SHORT");
  const buckets = Array.from({ length: Number((end - start) / second) }, () => new Set());
  for (const e of events) {
    const t = BigInt(e.atNs);
    if (t >= start && t < start + BigInt(buckets.length) * second)
      buckets[Number((t - start) / second)].add(e.loop);
  }
  const qualified = buckets.filter((x) => x.size >= level).length;
  if (qualified / buckets.length < 0.99) throw Error("READER-LEVEL-MISMATCH");
  if (
    !relay ||
    relay.length !== buckets.length ||
    relay.some((x) => !Number.isFinite(x) || Math.abs(x - level) > level * 0.1)
  )
    throw Error("RELAY-CONCURRENCY-MISMATCH");
  return { level, seconds: buckets.length, qualified };
}
export async function runNS(c) {
  // [EXP-NSR-R3] Why: the trusted execution path must not bypass its artifact/permission guard. Rejected: source-tree runs silently standing in for guarded driver evidence.
  if (!globalThis[Symbol.for("ns-driver-runtime/1")] || !process.permission)
    throw Error("NSR driver requires guarded artifact launch");
  if (!c.offline) throw Error("NSR requires evaluator/observer integration for qualification");
  if (
    !Number.isSafeInteger(c.readers ?? 256) ||
    (c.readers ?? 256) < 0 ||
    (c.readers ?? 256) > 1024
  )
    throw Error("Invalid readers");
  const sampleEvery = c.answerSampleEvery ?? 16;
  if (!Number.isSafeInteger(sampleEvery) || sampleEvery < 1 || sampleEvery > 10000)
    throw Error("Invalid answer sampling interval");
  const events = new Events(c.output, fs.readFileSync(c.keyFile), c.binding);
  events.write("driver-runtime", {
    artifactFormat: "ns-driver-bundle/2",
    bundleSha256: globalThis[Symbol.for("ns-driver-runtime/1")].bundleSha256,
    permissionModel: true,
    childPermission: process.permission.has("child"),
    workerPermission: process.permission.has("worker"),
  });
  const call = (role, method, params, observe) =>
    rpc(c.endpoints[role], c.binding.runId, method, params, c.timeoutMs ?? 10000, observe);
  events.write("answer-policy", {
    encoding: "answer-canonical/1",
    sampling: {
      schema: "answer-sampling/1",
      every: sampleEvery,
      firstPerLoop: true,
      nonLoopReads: "all",
    },
  });
  async function captureRead(method, input, loop, sequence) {
    const request = JSON.parse(canonicalAnswer(input));
    const sentAtNs = now();
    let wire;
    const answer = await call("readers", method, { request }, (raw) => {
      wire = raw;
    });
    return {
      rpcMethod: method,
      sentAtNs,
      receivedAtNs: now(),
      ...readEvidence(request, answer, wire, { loop, sequence, every: sampleEvery }),
    };
  }
  let stopping = false,
    failed;
  const completions = new Map(),
    answers = [],
    accounting = [];
  const meter = monitorEventLoopDelay({ resolution: 10 });
  meter.enable();
  const pending = [];
  const readiness = [];
  const readySignals = Array.from(
    { length: c.readers ?? 256 },
    () => new Promise((resolve, reject) => readiness.push({ resolve, reject })),
  );
  const allReady = Promise.all(readySignals);
  allReady.catch(() => {});
  let result;
  const loops = Array.from({ length: c.readers ?? 256 }, (_, loop) =>
    (async () => {
      let sequence = 0;
      while (!stopping) {
        const request = c.readRequests[loop % c.readRequests.length];
        const observed = await captureRead("read", request, loop, sequence++);
        const atNs = observed.receivedAtNs;
        completions.set(`${BigInt(atNs) / 1000000000n}/${loop}`, { loop, atNs });
        events.write("read", observed);
        readiness[loop].resolve();
        await sleep(0);
      }
    })().catch((e) => {
      failed = e;
      readiness[loop].reject(e);
      stopping = true;
    }),
  );
  try {
    await allReady;
    await call("consumer", "consumerControl", { action: "start", data: null });
    const start = process.hrtime.bigint();
    async function executeOffer(offer, scheduled) {
      const sentAtNs = now();
      let responseBytes;
      const response = await call("broker", "commit", { command: offer.command }, (raw) => {
        responseBytes = raw;
      });
      accounting.push(response);
      events.write("offer", {
        command: offer.command,
        scheduledAtNs: String(scheduled),
        sentAtNs,
        ackAtNs: now(),
        response,
        responseBytes: responseBytes.toString("utf8"),
      });
      if (response.receipt) {
        const request = { subject: offer.command.subject, basis: response.receipt.position };
        const observed = await captureRead("pull", request);
        events.write("ryow", observed);
        answers.push(observed.answer);
      }
    }
    // [EXP-NSR] Why: send on the frozen schedule even while an earlier commit waits. Rejected: awaiting ACK before offering the next command (closed-loop writes).
    let prior = -1;
    for (const offer of c.trace) {
      if (!Number.isFinite(offer.atMs) || offer.atMs < 0 || offer.atMs < prior)
        throw Error("Invalid offer schedule");
      prior = offer.atMs;
      const scheduled = start + BigInt(Math.round(offer.atMs * 1e6));
      const wait = Number(scheduled - process.hrtime.bigint()) / 1e6;
      if (wait > 0) await sleep(wait);
      if (failed) throw failed;
      const task = executeOffer(offer, scheduled);
      task.catch((e) => {
        failed = e;
      });
      pending.push(task);
    }
    await Promise.all(pending);
    const consumed = await call("consumer", "consumerControl", { action: "step", data: null });
    events.write("consumer-cross-check", consumed);
    if (consumed.hook) controlEvent(events, consumed.hook);
    for (const request of c.pulls ?? []) {
      const observed = await captureRead("pull", request);
      events.write("p4", observed);
      answers.push(observed.answer);
    }
    if (c.sweep) {
      const seen = new Set();
      for (const subject of c.sweep.subjects) {
        if (seen.has(subject)) throw Error("Duplicate sweep subject");
        seen.add(subject);
        const request = { subject, basis: c.sweep.basis, release: c.sweep.release };
        const observed = await captureRead("pull", request);
        events.write("sweep", observed);
      }
    }
    const consumer = await call("consumer", "consumerControl", { action: "stop", data: null });
    events.write("consumer-cross-check", consumer);
    events.write("hiccup", { maxNs: String(meter.max), p99Ns: String(meter.percentile(99)) });
    if (failed) throw failed;
    result = {
      status: "DIAGNOSTIC",
      accounting,
      answers,
      consumer,
      completions: [...completions.values()],
    };
  } finally {
    stopping = true;
    await Promise.allSettled(pending);
    await Promise.all(loops);
    meter.disable();
    events.write("end", { error: failed?.message ?? null });
    const seal = events.seal();
    fs.writeFileSync(path.join(c.output, "seal.json"), JSON.stringify(seal) + "\n", { flag: "wx" });
  }
  if (failed) throw failed;
  return result;
}
export function controlEvent(events, event, output = process.stdout) {
  events.write("control", event);
  output.write(JSON.stringify({ schema: "ns-control/1", binding: events.binding, event }) + "\n");
}
if (process.argv[1] && path.resolve(process.argv[1]) === import.meta.filename) {
  runNS(JSON.parse(fs.readFileSync(process.argv[2], "utf8")))
    .then((r) => process.stdout.write(JSON.stringify(r) + "\n"))
    .catch((e) => {
      console.error(e);
      process.exitCode = 1;
    });
}
