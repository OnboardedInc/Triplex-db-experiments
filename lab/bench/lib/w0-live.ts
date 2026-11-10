import fs from "node:fs";
import path from "node:path";
import { sha256 } from "./w0-world.ts";
import { Worker } from "node:worker_threads";
import { generateTrace } from "./trace.ts";
import { applyW0Trace, percentile } from "./w0-traffic.ts";
import type { CompositionHandle } from "./composition.ts";
const pause = () => new Promise<void>((resolve) => setTimeout(resolve, 5));
const now = () => performance.timeOrigin + performance.now();
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
}) {
  const reads: { started: number; ms: number }[] = [],
    commits: any[] = [],
    writes: any[] = [];
  const log = fs.openSync(path.join(o.dir, o.id + "-traffic.ndjson"), "wx");
  let failed: unknown,
    stopped = false,
    start = 0,
    end = Infinity,
    serial = Promise.resolve();
  const workers: Worker[] = [];
  const done: Promise<void>[] = [];
  try {
    await Promise.all(
      Array.from({ length: 8 }, async (_, worker) => {
        const w = new Worker(new URL("./w0-live-worker.ts", import.meta.url), {
          workerData: { ...o, comp: undefined, worker },
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
              fs.writeSync(
                log,
                JSON.stringify({ kind: "failure", worker, at: now(), error: m.error }) + "\n",
              );
              failed = Error(m.error);
              reject(failed);
            }
            if (m.type === "read") {
              reads.push(m);
              fs.writeSync(log, JSON.stringify({ kind: "read", ...m }) + "\n");
            }
          });
        });
      }),
    );
  } catch (e) {
    await Promise.all(workers.map((w) => w.terminate()));
    fs.closeSync(log);
    throw e;
  }
  start = now();
  // [DX-H2] Why: use the frozen generator unchanged; arm prefixes prevent baseline retries becoming sweep no-ops.
  // Rejected: changing the event sequence or reusing command IDs across arms.
  const events = generateTrace({ seed: o.seed, subjects: o.N, durationS: o.offsetS + 900 })
    .filter((e) => e.atMs >= o.offsetS * 1000)
    .map((e) => ({ ...e, atMs: e.atMs - o.offsetS * 1000 }));
  let activeScheduled = 0;
  const namespaced: CompositionHandle = {
    ...o.comp,
    transactionByCommand: (id) => o.comp.transactionByCommand(o.id + ":" + id),
    transact: async (operations, meta: any) => {
      const begun = now();
      const result = await o.comp.transact(operations, {
        ...meta,
        commandId: o.id + ":" + meta.commandId,
      });
      const row = {
        kind: "commit",
        started: begun,
        scheduled: activeScheduled,
        ms: now() - begun,
        ok: result.ok,
      };
      commits.push(row);
      fs.writeSync(log, JSON.stringify(row) + "\n");
      return result;
    },
  };
  const offered: any[] = [];
  const writer = (async () => {
    for (const event of events) {
      while (!stopped && !failed && now() < start + event.atMs) await pause();
      if (stopped || failed) break;
      offered.push(event);
      serial = serial
        .then(async () => {
          activeScheduled = start + event.atMs;
          const result = await applyW0Trace(namespaced, {
            ...event,
            atMs: event.atMs + o.offsetS * 1000,
          });
          const row = {
            kind: "write",
            event,
            ack: now(),
            scheduled: start + event.atMs,
            duplicate: result.duplicate,
            position: result.receipt.position,
          };
          writes.push(row);
          fs.writeSync(log, JSON.stringify(row) + "\n");
        })
        .catch((e) => {
          failed ??= e;
        });
    }
    await serial;
  })();
  return {
    check: () => {
      if (failed) throw failed;
    },
    stop: async () => {
      end = now();
      stopped = true;
      workers.forEach((w) => w.postMessage("stop"));
      await writer;
      await Promise.all(done);
      fs.closeSync(log);
      if (failed) throw failed;
      const summary = (samples: { started: number; ms: number }[]) => {
        const ms = samples.filter((r) => r.started >= start && r.started < end).map((r) => r.ms);
        return {
          count: ms.length,
          p50: ms.length ? percentile(ms, 0.5) : null,
          p99: ms.length ? percentile(ms, 0.99) : null,
        };
      };
      return {
        readers: 64,
        startedAtMs: start,
        endedAtMs: end,
        windowMs: end - start,
        read: summary(reads),
        commitService: summary(commits.map((c) => ({ ...c, started: c.scheduled }))),
        commit: summary(writes.map((w) => ({ started: w.scheduled, ms: w.ack - w.scheduled }))),
        offered: offered.length,
        acknowledged: writes.length,
        duplicates: writes.filter((w) => w.duplicate).length,
        lostAckOffers: offered.filter((e) => e.ackLoss).length,
        corrections: offered.filter((e) => e.correction).length,
        offeredTraceSha256: sha256(JSON.stringify(offered)),
        generatorTraceSha256: sha256(JSON.stringify(events)),
        seed: o.seed,
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
    !baseline.generatorTraceSha256 ||
    baseline.generatorTraceSha256 !== sweep.generatorTraceSha256
  )
    throw Error("live traffic generator binding mismatch");
  const ms = Math.min(baseline.windowMs, sweep.windowMs);
  const summary = (arm: any, kind: "read" | "commit" | "commitService") => {
    const samples = fs
      .readFileSync(arm.raw, "utf8")
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line))
      .filter(
        (r) =>
          r.kind === (kind === "commit" ? "write" : kind === "commitService" ? "commit" : "read") &&
          (kind !== "read" ? r.scheduled : r.started) >= arm.startedAtMs &&
          (kind !== "read" ? r.scheduled : r.started) < arm.startedAtMs + ms,
      )
      .map((r) => (kind === "commit" ? r.ack - r.scheduled : r.ms));
    return {
      count: samples.length,
      p50: samples.length ? percentile(samples, 0.5) : null,
      p99: samples.length ? percentile(samples, 0.99) : null,
    };
  };
  const result: any = {
    matchedWindowMs: ms,
    fullSweepCovered: baseline.windowMs >= sweep.windowMs,
    classification: "DIAGNOSTIC",
    reason: "Sequential windows on an evolving store; no clone/A-A calibration",
  };
  for (const kind of ["read", "commit", "commitService"] as const) {
    const b = summary(baseline, kind),
      s = summary(sweep, kind);
    result[kind] = {
      baseline: b,
      sweep: s,
      p99Ratio: b.count && s.count && b.p99! > 0 ? s.p99! / b.p99! : null,
    };
  }
  return result;
}
