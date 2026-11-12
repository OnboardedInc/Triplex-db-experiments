// [DX-R2] Why: the requested live arm has 256 readers (8 workers with 32 readers each). Rejected: reusing the 64-reader R1 arm as target evidence.
import fs from "node:fs";
import { AsyncLocalStorage } from "node:async_hooks";
import { OpenLoopScheduler } from "./scheduler.ts";
import { offerLiveWrite, finishLiveWrite } from "./w0-outbox.ts";
import path from "node:path";
import { StringDecoder } from "node:string_decoder";
import { sha256 } from "./w0-world.ts";
import { Worker } from "node:worker_threads";
import { generateTrace } from "./trace.ts";
import { applyW0Trace, percentile } from "./w0-traffic.ts";
import { pullAt, type RecentReads, type Replica } from "../../../packages/datomic/dist/index.js";
import { Rng, seedOf } from "./rng.ts";
import { W0 } from "./w0-world.ts";
import type { CompositionHandle } from "./composition.ts";
const pause = () => new Promise<void>((resolve) => setTimeout(resolve, 5));
const now = () => performance.timeOrigin + performance.now();
// [DX-S5] Why: measure a declared engine capacity cap without dropping/reordering frozen commands or changing their valid times.
// Rejected: reducing the frozen burst silently or measuring service latency while hiding its offer queue.
export function capacitySchedule<T extends { atMs: number }>(events: readonly T[], maxRate = 0) {
  if (!Number.isFinite(maxRate) || maxRate < 0) throw Error("invalid capacity rate");
  let previous = -Infinity;
  return events.map((event) => {
    const atMs = maxRate ? Math.max(event.atMs, previous + 1000 / maxRate) : event.atMs;
    previous = atMs;
    return { event, atMs };
  });
}
// [DX-S5] Why: keep 256 requests outstanding without running all their synchronous graph decodes before the next I/O turn.
// Rejected: 256 independent setImmediate callbacks in one phase (artificially starves trace RPCs and feed responses).
export function localReadTurns(batch = 1) {
  if (!Number.isInteger(batch) || batch < 1 || batch > 32) throw Error("invalid local read batch");
  const waiting: (() => void)[] = [];
  let scheduled = false;
  const dispatch = () => {
    scheduled = false;
    for (const resolve of waiting.splice(0, batch)) resolve();
    if (waiting.length) {
      scheduled = true;
      setImmediate(dispatch);
    }
  };
  return () =>
    new Promise<void>((resolve) => {
      waiting.push(resolve);
      if (!scheduled) {
        scheduled = true;
        setImmediate(dispatch);
      }
    });
}
export async function startW0Live(o: {
  comp: CompositionHandle;
  composition: string;
  lane: string;
  scope: string;
  N: number;
  dir: string;
  id: string;
  seed: string;
  offsetS: number;
  warmupMs?: number;
  replica?: Replica;
  currentReads?: RecentReads;
  commandNamespace?: string;
  readersDisabled?: boolean;
  writerInFlight?: number;
  writeActivity?: (pending: boolean) => void;
  maxWriteRate?: number;
}) {
  const warmupMs = o.warmupMs ?? 0;
  if (!Number.isSafeInteger(warmupMs) || warmupMs < 0 || warmupMs > 60000)
    throw Error("invalid live warmup");
  const reads: { started: number; ms: number }[] = [],
    commits: any[] = [],
    writes: any[] = [];
  const log = fs.openSync(path.join(o.dir, o.id + "-traffic.ndjson"), "wx");
  let rawBuffer = "";
  const flushRaw = () => {
    if (rawBuffer) {
      fs.writeSync(log, rawBuffer);
      rawBuffer = "";
    }
  };
  // [DX-S5] Why: batch raw NDJSON transport rather than performing one synchronous VM/host write per local read.
  // Rejected: sampling telemetry or allowing instrumentation I/O to dominate the runtime's event loop.
  const appendRaw = (line: string) => {
    rawBuffer += line;
    if (rawBuffer.length >= 65536) flushRaw();
  };
  let failed: unknown,
    stopped = false,
    start = 0,
    end = Infinity;
  const workers: Worker[] = [];
  const done: Promise<void>[] = [];
  let localReaders: Promise<void>[] = [];
  const observeRead = (m: { started: number; ms: number; [key: string]: unknown }) => {
    reads.push(m);
    appendRaw(JSON.stringify({ kind: "read", ...m }) + "\n");
  };
  try {
    if (o.replica) {
      // [DX-S5] Why: scoped immutable snapshots preserve each current cut without copying unrelated outbox overlays.
      // Rejected: full-map snapshots per applied cut (profiles G/F exceeded 100 s while native engines were mostly idle).
      const readTurn = localReadTurns();
      localReaders = Array.from({ length: 256 }, (_, reader) =>
        (async () => {
          const rng = new Rng(seedOf(o.seed + ":local:" + reader));
          while (!stopped && !failed) {
            const started = now();
            await readTurn();
            // [DX-S5] Why: drain reads already offered before stop so their full latency remains in the window.
            // Rejected: censoring the final 256 pending reads when the activation ends.
            const subject = W0.placementId(rng.int(o.N));
            let rows: readonly import("./w0-world.ts").WorldRow[], position: number;
            if (o.currentReads) {
              position = o.replica!.position;
              if (o.currentReads.position !== position)
                throw Error("current read index watermark mismatch");
              const answer = await pullAt(
                o.currentReads,
                subject,
                { recordedPosition: position, validAt: o.replica!.validAt },
                async () => {
                  throw Error("unexpected current-read fallback");
                },
              );
              if (answer.route !== "replica") throw Error("current read escaped replica");
              rows = answer.value.rows;
            } else {
              const snapshot = o.replica!.snapshotSubject(subject);
              position = snapshot.position;
              rows = snapshot.world(subject);
            }
            if (!rows.length || rows.some((row) => row.position > position))
              throw Error("invalid local read cut/content");
            observeRead({
              started,
              ms: now() - started,
              position,
              validAt: o.replica!.validAt,
              subject,
              rows: rows.length,
            });
          }
        })().catch((e) => {
          failed ??= e;
        }),
      );
    } else if (!o.readersDisabled)
      await Promise.all(
        Array.from({ length: 8 }, async (_, worker) => {
          const w = new Worker(new URL("./w0-replica-live-worker.ts", import.meta.url), {
            workerData: {
              ...o,
              comp: undefined,
              replica: undefined,
              currentReads: undefined,
              worker,
            },
          });
          workers.push(w);
          done.push(
            new Promise<void>((resolve) =>
              w.on("exit", (code) => {
                if (code !== 0) failed ??= Error("live reader worker exited " + code);
                resolve();
              }),
            ),
          );
          await new Promise<void>((resolve, reject) => {
            w.on("error", (e) => {
              failed = e;
              reject(e);
            });
            w.on("message", (m) => {
              if (m.type === "ready") resolve();
              if (m.type === "failure") {
                appendRaw(
                  JSON.stringify({ kind: "failure", worker, at: now(), error: m.error }) + "\n",
                );
                failed = Error(m.error);
                reject(failed);
              }
              if (m.type === "read") {
                reads.push(m);
                appendRaw(JSON.stringify({ kind: "read", ...m }) + "\n");
              }
            });
          });
        }),
      );
  } catch (e) {
    await Promise.all(workers.map((w) => w.terminate()));
    flushRaw();
    fs.closeSync(log);
    throw e;
  }
  start = now();
  // [DX-H2] Why: use the frozen generator unchanged; arm prefixes prevent baseline retries becoming sweep no-ops.
  // Rejected: changing the event sequence or reusing command IDs across arms.
  const events = generateTrace({ seed: o.seed, subjects: o.N, durationS: o.offsetS + 900 })
    .filter((e) => e.atMs >= o.offsetS * 1000)
    .map((e) => ({ ...e, atMs: e.atMs - o.offsetS * 1000 }));
  const scheduledContext = new AsyncLocalStorage<number>();
  const namespaced: CompositionHandle = {
    ...o.comp,
    transactionByCommand: (id) =>
      o.comp.transactionByCommand(
        (o.commandNamespace ? o.commandNamespace + ":" : "") + o.id + ":" + id,
      ),
    transact: async (operations, meta: any) => {
      const begun = now();
      const result = await o.comp.transact(operations, {
        ...meta,
        commandId:
          (o.commandNamespace ? o.commandNamespace + ":" : "") + o.id + ":" + meta.commandId,
      });
      const row = {
        kind: "commit",
        started: begun,
        scheduled: scheduledContext.getStore() ?? 0,
        ms: now() - begun,
        ok: result.ok,
      };
      commits.push(row);
      appendRaw(JSON.stringify(row) + "\n");
      return result;
    },
  };
  const offered: any[] = [];
  const schedule = capacitySchedule(events, o.maxWriteRate);
  const measurementStart = start + warmupMs;
  const writerInFlight = o.writerInFlight ?? 1;
  if (!Number.isInteger(writerInFlight) || writerInFlight < 1 || writerInFlight > 32)
    throw Error("invalid writer window");
  // [DX-S5] Why: the north-star scheduler preserves each subject's order while overlapping independent trace commands.
  // Rejected: global ACK serialization (thread isolation alone still queued 30 seconds at 1k with only 12% writer ELU).
  const scheduler = new OpenLoopScheduler(
    schedule.map(({ event, atMs }) => ({ key: event.subject, scheduledAt: start + atMs, event })),
    {
      maxInFlight: writerInFlight,
      deadlineMs: Number.MAX_SAFE_INTEGER,
      now,
      onOffer: ({ event, scheduledAt }) => {
        offered.push({ ...event, offeredAtMs: scheduledAt - start });
        offerLiveWrite();
        o.writeActivity?.(true);
      },
      exec: async ({ event, scheduledAt }) => {
        try {
          const result = await scheduledContext.run(scheduledAt, () =>
            applyW0Trace(namespaced, { ...event, atMs: event.atMs + o.offsetS * 1000 }),
          );
          const row = {
            kind: "write",
            event,
            ack: now(),
            scheduled: scheduledAt,
            duplicate: result.duplicate,
            position: result.receipt.position,
          };
          writes.push(row);
          appendRaw(JSON.stringify(row) + "\n");
        } catch (error) {
          failed ??= error;
        }
      },
      onDone: (result) => {
        if (result.expired) failed ??= Error("trace offer expired");
        finishLiveWrite();
        o.writeActivity?.(false);
      },
    },
  );
  scheduler.start();
  // [DX-H6] Why: compare warm gateway/reader windows with the same fixed generator offset in both arms.
  // Rejected: cold first-prefix p99 as the denominator (sweep1000b baseline was 1.116 s).
  while (now() < measurementStart && !failed) await pause();
  return {
    check: () => {
      if (failed) throw failed;
    },
    stop: async () => {
      end = now();
      // [DX-S5] Why: flush every event due before the stop boundary even after a delayed timer, without admitting future offers.
      // Rejected: silently dropping the final due prefix or censoring its slow acknowledgements.
      scheduler.setUntil(end);
      scheduler.start();
      scheduler.stop();
      const pendingAtStop = scheduler.pending;
      stopped = true;
      workers.forEach((w) => w.postMessage("stop"));
      while (scheduler.pending) await pause();
      await Promise.all([...done, ...localReaders]);
      flushRaw();
      fs.closeSync(log);
      if (failed) throw failed;
      const summary = (samples: { started: number; ms: number }[]) => {
        const ms = samples
          .filter((r) => r.started >= measurementStart && r.started < end)
          .map((r) => r.ms);
        return {
          count: ms.length,
          p50: ms.length ? percentile(ms, 0.5) : null,
          p99: ms.length ? percentile(ms, 0.99) : null,
        };
      };
      const observedOffers = offered.filter(
        (e) => start + e.offeredAtMs >= measurementStart && start + e.offeredAtMs < end,
      );
      const observedWrites = writes.filter(
        (w) => w.scheduled >= measurementStart && w.scheduled < end,
      );
      return {
        writerInFlight,
        maxWriteRate: o.maxWriteRate ?? 0,
        writerMaxInFlightSeen: scheduler.maxInFlightSeen,
        pendingAtStop,
        readers: 256,
        readerMode: o.currentReads
          ? "replica-current-position-pullAt-fixed-valid-time"
          : o.replica
            ? "replica-current-subject-snapshot-fixed-valid-time"
            : "gateway",
        warmupMs,
        generatorStartedAtMs: start,
        startedAtMs: measurementStart,
        endedAtMs: end,
        windowMs: end - measurementStart,
        read: summary(reads),
        commitService: summary(commits.map((c) => ({ ...c, started: c.scheduled }))),
        commit: summary(writes.map((w) => ({ started: w.scheduled, ms: w.ack - w.scheduled }))),
        offered: observedOffers.length,
        acknowledged: observedWrites.length,
        duplicates: observedWrites.filter((w) => w.duplicate).length,
        lostAckOffers: observedOffers.filter((e) => e.ackLoss).length,
        corrections: observedOffers.filter((e) => e.correction).length,
        offeredTraceSha256: sha256(JSON.stringify(observedOffers)),
        generatorTraceSha256: sha256(JSON.stringify(schedule)),
        seed: o.seed,
        commandNamespace: o.commandNamespace,
        offsetS: o.offsetS,
        failures: 0,
        raw: path.join(o.dir, o.id + "-traffic.ndjson"),
        scheduledToAck: summary(
          writes.map((w) => ({ started: w.scheduled, ms: w.ack - w.scheduled })),
        ),
      };
    },
  };
}

// [DX-H2] Why: compare the same frozen offer-time prefix and include slow ACKs beyond its end.
// Rejected: comparing a 60-second baseline with a longer sweep containing a different burst segment.
export function matchW0Live(baseline: any, sweep: any) {
  if (
    baseline.seed !== sweep.seed ||
    baseline.offsetS !== sweep.offsetS ||
    (baseline.warmupMs ?? 0) !== (sweep.warmupMs ?? 0) ||
    !baseline.generatorTraceSha256 ||
    baseline.generatorTraceSha256 !== sweep.generatorTraceSha256
  )
    throw Error("live traffic generator binding mismatch");
  const ms = Math.min(baseline.windowMs, sweep.windowMs);
  // [DX-S5] Why: matching hundreds of thousands of raw local reads must not retain six whole parsed logs beside the 100k world.
  // Rejected: readFileSync/split/map per metric (avoidable post-window heap and cgroup peak).
  const summarize = (arm: any) => {
    const samples: Record<string, number[]> = { read: [], commit: [], commitService: [] };
    for (const row of rawLiveRecords(arm.raw)) {
      const kind =
        row.kind === "write" ? "commit" : row.kind === "commit" ? "commitService" : row.kind;
      if (!(kind in samples)) continue;
      const at = kind === "read" ? row.started : row.scheduled;
      if (at >= arm.startedAtMs && at < arm.startedAtMs + ms)
        samples[kind].push(kind === "commit" ? row.ack - row.scheduled : row.ms);
    }
    return Object.fromEntries(
      Object.entries(samples).map(([kind, values]) => [
        kind,
        {
          count: values.length,
          p50: values.length ? percentile(values, 0.5) : null,
          p99: values.length ? percentile(values, 0.99) : null,
        },
      ]),
    );
  };
  const before = summarize(baseline),
    during = summarize(sweep);
  const result: any = {
    matchedWindowMs: ms,
    fullSweepCovered: baseline.windowMs >= sweep.windowMs,
    classification: "DIAGNOSTIC",
    reason: "Sequential windows on an evolving store; no clone/A-A calibration",
  };
  for (const kind of ["read", "commit", "commitService"] as const) {
    const b = before[kind],
      s = during[kind];
    result[kind] = {
      baseline: b,
      sweep: s,
      p99Ratio: b.count && s.count && b.p99! > 0 ? s.p99! / b.p99! : null,
    };
  }
  return result;
}

// [DX-S5] Why: preserve complete UTF-8 records while reading a bounded chunk, including the final record without a newline.
// Rejected: decoding arbitrary byte chunks independently or ignoring malformed/truncated JSON.
export function* rawLiveRecords(file: string): Generator<any> {
  const fd = fs.openSync(file, "r"),
    chunk = Buffer.alloc(65536),
    decoder = new StringDecoder("utf8");
  let pending = "",
    length: number;
  try {
    while ((length = fs.readSync(fd, chunk, 0, chunk.length, null))) {
      pending += decoder.write(chunk.subarray(0, length));
      let from = 0,
        end: number;
      while ((end = pending.indexOf("\n", from)) >= 0) {
        const line = pending.slice(from, end);
        if (line) yield JSON.parse(line);
        from = end + 1;
      }
      pending = pending.slice(from);
    }
    pending += decoder.end();
    if (pending) yield JSON.parse(pending);
  } finally {
    fs.closeSync(fd);
  }
}

// [DX-S5] Why: admission needs actual finite latency samples and complete ACK coverage, not NaN comparisons on an empty window.
// Rejected: allowing null/null > 5 to evaluate false and silently admit a missing baseline.
export function assertBaselineHeadroom(summary: any) {
  const ratio = summary?.commit?.p99 / summary?.commitService?.p99;
  if (
    summary?.readers !== 256 ||
    !(summary?.read?.count >= 256) ||
    !(summary?.commitService?.count > 0) ||
    !(summary?.commitService?.p99 > 0) ||
    !(summary?.offered > 0) ||
    summary.offered !== summary.acknowledged ||
    summary.failures !== 0 ||
    !(summary.windowMs >= 1000) ||
    !Number.isFinite(ratio) ||
    ratio > 5 ||
    !Number.isSafeInteger(summary.pendingAtStop) ||
    summary.pendingAtStop < 0 ||
    summary.pendingAtStop > 32
  )
    throw Error("baseline queue is not bounded or samples are incomplete: activation refused");
}
