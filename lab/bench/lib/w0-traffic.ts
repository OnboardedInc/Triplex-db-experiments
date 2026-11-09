import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { generateTrace, traceDigest, type TraceEvent } from "./trace.ts";
import { mapW0Trace } from "./w0-trace.ts";
import { Controller, CONTROLLER, runW0Sweep, subjectList } from "./sweep.ts";
import { W0, V_W0, canonical, worldOf, sha256 } from "./w0-world.ts";
import { Rng, seedOf } from "./rng.ts";
import type { CompositionHandle } from "./composition.ts";
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, Math.max(0, ms)));
const yieldLoop = () => new Promise<void>((r) => setImmediate(r));
export function percentile(samples: readonly number[], q: number) {
  if (!samples.length || samples.some((n) => !Number.isFinite(n) || n < 0))
    throw new Error("missing/invalid latency samples");
  return [...samples].sort((a, b) => a - b)[Math.max(0, Math.ceil(samples.length * q) - 1)]!;
}
export function ratioSummary(rounds: readonly any[], seed: string) {
  const rng = new Rng(seedOf(seed));
  const groups: any = {};
  for (const kind of ["steady", "burst"]) {
    const data = rounds.filter((r) => !r.aa && r.kind === kind);
    if (!data.length) {
      groups[kind] = { status: "INCONCLUSIVE", reason: "no rounds" };
      continue;
    }
    groups[kind] = {};
    for (const metric of ["read", "commit"]) {
      if (data.some((r) => r.sweep[metric].p99 === null || r.baseline[metric].p99 === null)) {
        groups[kind][metric] = {
          status: "INCONCLUSIVE",
          reason: "no commands/reads offered in matched window",
        };
        continue;
      }
      const ratios = data.map((r) => r.sweep[metric].p99 / r.baseline[metric].p99);
      if (ratios.some((r) => !Number.isFinite(r) || r <= 0))
        throw new Error("invalid paired ratio");
      const boot: number[] = [];
      for (let i = 0; i < 2000; i++) {
        let sum = 0;
        for (let k = 0; k < data.length; k++) sum += Math.log(ratios[rng.int(data.length)]!);
        boot.push(Math.exp(sum / data.length));
      }
      const ci = [percentile(boot, 0.025), percentile(boot, 0.975)],
        commands = data.reduce(
          (n, r) => n + Math.min(r.sweep.commit.count, r.baseline.commit.count),
          0,
        );
      const eligible =
        data.length >= 8 &&
        data.every(
          (r) =>
            r.sweep.windowValid &&
            r.baseline.windowValid &&
            (kind !== "burst" || r.sweep.trace.durationS >= 60),
        ) &&
        (metric === "read" || (kind === "burst" && commands >= 25000));
      groups[kind][metric] = {
        ratios,
        geometricMean: Math.exp(ratios.reduce((n, r) => n + Math.log(r), 0) / ratios.length),
        ci95: ci,
        commands,
        rounds: data.length,
        status: !eligible
          ? "INCONCLUSIVE"
          : ci[1] <= 1.5
            ? "HOLDS"
            : ci[0] > 1.5
              ? "FAIL"
              : "INCONCLUSIVE",
      };
    }
  }
  return {
    classification: "DIAGNOSTIC",
    acceptance: false,
    groups,
    wall: {
      maxMs: Math.max(...rounds.filter((r) => !r.aa).map((r) => r.sweep.sweepWallMs)),
      barMs: 100000,
    },
    aa: rounds
      .filter((r) => r.aa)
      .map((r) => ({
        readRatio: r.sweep.read.p99 / r.baseline.read.p99,
        commitRatio: r.sweep.commit.p99 / r.baseline.commit.p99,
      })),
  };
}
export async function applyW0Trace(comp: CompositionHandle, event: TraceEvent) {
  const mapped = mapW0Trace(event),
    old = await comp.transactionByCommand(mapped.commandId);
  if (!old.ok) throw new Error(old.tag);
  if (old.value) return { duplicate: true, receipt: old.value };
  const scalar = mapped.rows.filter(
    ([e, a]) => e === W0.placementId(event.subject) && !["answers", "decisions"].includes(a),
  );
  const basis = { position: await comp.currentPosition(), validAt: V_W0 + Math.floor(event.atMs) };
  const root = W0.placementId(event.subject);
  // [DX-H2] Why: select the exact scalar preconditions through the public adapter; graph reads are unrelated to this write.
  // Rejected: changing the frozen commands or dropping retirements to make the queue drain.
  const current =
    scalar.length === 0
      ? []
      : comp.w0Attributes
        ? await comp.w0Attributes(
            root,
            scalar.map(([, a]) => a),
            basis,
          )
        : (await comp.sweepPage([root], basis)).rows;
  const retire = current.filter((r) =>
    scalar.some(([e, a]) => e === r.entityId && a === r.attribute),
  );
  const result = await comp.transact(
    [...retire.map((r) => ({ op: "retract", id: r.id })), ...mapped.operations],
    {
      commandId: mapped.commandId,
      actor: event.kind,
      preconditions: retire.map((r) => ({ _tag: "TripleLive", id: r.id })),
    },
  );
  if (!result.ok) throw new Error(result.tag);
  // [EXP-P5-R2] Why: resolve an intentionally lost ACK through the command claim, never resubmit an unproven success. Rejected: counting the initial response as a lost-ACK resolution.
  if (event.ackLoss) {
    const recovered = await comp.transactionByCommand(mapped.commandId);
    if (!recovered.ok || recovered.value?.position !== result.value.position)
      throw new Error("lost ACK not resolved");
  }
  return {
    duplicate: false,
    receipt: result.value,
    operations: [...retire.map((r) => ({ op: "retract", id: r.id })), ...mapped.operations],
  };
}
interface ArmOptions {
  comp: CompositionHandle;
  scope: string;
  N: number;
  dir: string;
  id: string;
  seed: string;
  durationS: number;
  traceOffsetS: number;
  workers: number;
  controllerOn: boolean;
  sweep: boolean;
  release: string;
  baseline?: { read: number; commit: number };
}
export async function trafficArm(o: ArmOptions) {
  const events = generateTrace({
    seed: o.seed,
    subjects: o.N,
    durationS: o.traceOffsetS + o.durationS,
  })
    .filter(
      (e) => e.atMs >= o.traceOffsetS * 1000 && e.atMs < (o.traceOffsetS + o.durationS) * 1000,
    )
    .map((e) => ({ ...e, atMs: e.atMs - o.traceOffsetS * 1000 }));
  const reads: number[] = [],
    commits: number[] = [],
    queues: number[] = [],
    snapshots: any[] = [],
    writes: any[] = [];
  const hot = new Map<number, number>();
  const raw = fs.openSync(path.join(o.dir, o.id + "-reads.ndjson"), "wx"),
    writeLog = fs.openSync(path.join(o.dir, o.id + "-writes.ndjson"), "wx");
  const rng = new Rng(seedOf(o.seed + ":readers")),
    controller = new Controller(o.workers, o.controllerOn),
    controllerWindows: any[] = [];
  const activationValidAt = V_W0 + Math.floor(o.traceOffsetS * 1000);
  const warm = generateTrace({ seed: o.seed + ":warmup", subjects: o.N, durationS: 122 }).filter(
    (e) => e.atMs >= 120000 && !e.resend,
  );
  for (const event of warm.slice(0, 64)) {
    await applyW0Trace(o.comp, { ...event, seq: event.seq + 1000000, atMs: o.traceOffsetS * 1000 });
    hot.set(event.subject, performance.now());
  }
  const activation = await o.comp.transact(
    [
      {
        op: "assert",
        entityId: "p5:tenant",
        attribute: "p5/activation",
        value: { type: "string", value: o.release },
        validFrom: activationValidAt,
      },
    ],
    { commandId: o.id + ":activation" },
  );
  if (!activation.ok) throw new Error(activation.tag);
  const basis = { position: activation.value.position, validAt: activationValidAt },
    activations = [
      {
        tx: basis.position,
        from: W0.POPULATION_VALID_TIME,
        release: W0.RELEASES_BY_NAME.get(o.release)!.hash,
      },
    ];
  const start = performance.now(),
    deadline = start + o.durationS * 1000;
  let stopped = false,
    failed: any,
    writerBusy = false,
    writerQueued = 0,
    traceIndex = 0,
    readSeq = 0,
    splits = 0,
    splitMisses = 0,
    duplicates = 0,
    lostAck = 0,
    writerDone = false;
  const offers: Map<number, Promise<void>> = new Map();
  let serial = Promise.resolve();
  const submit = (event: TraceEvent, scheduled: number) => {
    writerQueued++;
    const p = serial.then(async () => {
      writerBusy = true;
      const begun = performance.now();
      queues.push(Math.max(0, begun - scheduled));
      try {
        const result = await applyW0Trace(o.comp, {
          ...event,
          atMs: event.atMs + o.traceOffsetS * 1000,
        });
        const ack = performance.now();
        if (result.duplicate) duplicates++;
        else {
          hot.set(event.subject, ack);
          snapshots.push({ position: result.receipt.position, atMs: ack - start });
        }
        if (event.ackLoss) lostAck++;
        commits.push(ack - scheduled);
        const record = { event, scheduledAtMs: scheduled - start, ackAtMs: ack - start, ...result };
        writes.push(record);
        fs.writeSync(writeLog, JSON.stringify(record) + "\n");
      } finally {
        writerBusy = false;
        writerQueued--;
      }
    });
    serial = p;
    offers.set(event.seq, p);
    return p;
  };
  // Open-loop timers enqueue at their absolute offer time, even while prior subject work waits.
  const writer = (async () => {
    for (const event of events) {
      await sleep(start + event.atMs - performance.now());
      if (failed) break;
      traceIndex++;
      void submit(event, start + event.atMs).catch((e) => {
        failed = e;
      });
    }
    await serial;
    writerDone = true;
  })();
  const readers = Array.from({ length: 64 }, (_, reader) =>
    (async () => {
      while (!stopped && performance.now() < deadline && !failed) {
        const hotSubjects = [...hot]
          .filter(([, at]) => performance.now() - at <= 60000)
          .map(([s]) => s);
        const selectedSplit =
          rng.int(10) === 0
            ? events
                .slice(traceIndex)
                .find((e) => !e.resend && e.atMs >= performance.now() - start + 10)
            : undefined;
        const subject =
          selectedSplit?.subject ??
          (hotSubjects.length && rng.int(100) < 60
            ? hotSubjects[rng.int(hotSubjects.length)]!
            : rng.int(o.N));
        const useHot = hotSubjects.includes(subject),
          root = W0.placementId(subject);
        const head = await o.comp.currentPosition(),
          draw = rng.int(100),
          position =
            draw < 80
              ? head
              : draw < 95 && snapshots.length
                ? snapshots[rng.int(snapshots.length)]!.position
                : 1 + rng.int(Math.max(1, basis.position));
        const readBasis = {
          position,
          validAt: activationValidAt + Math.max(0, Math.floor(performance.now() - start)),
        };
        const readStart = performance.now(),
          seq = readSeq++;
        let splitPosition: number | undefined;
        const doSplit = selectedSplit !== undefined;
        const between = doSplit
          ? async () => {
              // Join the next already-offered trace command to this subject; never invent an overlay write.
              const candidate = selectedSplit;
              if (candidate && candidate.atMs <= o.durationS * 1000) {
                while (!offers.has(candidate.seq) && !writerDone && !failed) await sleep(1);
                await offers.get(candidate.seq);
                const r = await o.comp.transactionByCommand("p5:trace:" + candidate.seq);
                if (r.ok && r.value) {
                  if (r.value.position <= readBasis.position)
                    throw new Error("split did not straddle its cut");
                  splitPosition = r.value.position;
                  splits++;
                }
              } else splitMisses++;
            }
          : undefined;
        const answer = await o.comp.sweepPage([root], readBasis, between);
        const ended = performance.now();
        reads.push(ended - readStart);
        if (answer.position < readBasis.position) throw new Error("live reader future basis");
        fs.writeSync(
          raw,
          JSON.stringify({
            seq,
            reader,
            subject,
            basis: readBasis,
            observedPosition: answer.position,
            hot: useHot,
            split: splitPosition ?? null,
            startedAtMs: readStart - start,
            latencyMs: ended - readStart,
            digest: sha256(canonical(worldOf(root, answer.rows))),
          }) + "\n",
        );
        await yieldLoop();
      }
    })().catch((e) => {
      failed = e;
    }),
  );
  let lastReads = 0,
    lastCommits = 0,
    lastQueue = 0;
  const timer = setInterval(() => {
    try {
      const r = reads.slice(lastReads),
        c = commits.slice(lastCommits),
        q = queues.slice(lastQueue);
      lastReads = reads.length;
      lastCommits = commits.length;
      lastQueue = queues.length;
      if (controller.limit === 0 && performance.now() - start >= controller.holdUntil)
        controller.limit = 1;
      if (!o.baseline || !r.length || !c.length) return;
      const observation = {
        queueMs: q.length ? Math.min(...q) : 0,
        baselineP99: o.baseline.read,
        readRatio: percentile(r, 0.99) / o.baseline.read,
        commitRatio: percentile(c, 0.99) / o.baseline.commit,
      };
      const limit = controller.update(observation, performance.now() - start);
      controllerWindows.push({ atMs: performance.now() - start, ...observation, limit });
    } catch (e) {
      failed = e;
    }
  }, CONTROLLER.intervalMs);
  let sweep: any = null,
    sweepWallMs = 0;
  try {
    if (o.sweep) {
      const captured = performance.now();
      sweep = await runW0Sweep({
        comp: o.comp,
        composition: "memory",
        lane: "xtdb",
        scope: o.scope,
        subjects: subjectList(o.N),
        basis,
        sweepId: o.id,
        cursor: path.join(o.dir, o.id + "-cursor.json"),
        workers: o.workers,
        activations,
        controller,
        beforePublish: async () => {
          while (writerBusy || writerQueued > 0 || controller.limit === 0) {
            if (failed) throw failed;
            await sleep(1);
          }
        },
        onPage: async (records) => {
          await o.comp.publishOutbox(records.map((r) => r.record));
        },
      });
      sweepWallMs = performance.now() - captured;
    }
    await sleep(deadline - performance.now());
    await writer;
    stopped = true;
    await Promise.all(readers);
    if (failed) throw failed;
    if (!reads.length || !commits.length) throw new Error("traffic arm produced no live samples");
    return {
      id: o.id,
      basis,
      windowValid: !o.sweep || sweepWallMs <= o.durationS * 1000,
      warmupCommands: Math.min(64, warm.length),
      read: { count: reads.length, p50: percentile(reads, 0.5), p99: percentile(reads, 0.99) },
      commit: {
        count: commits.length,
        p50: percentile(commits, 0.5),
        p99: percentile(commits, 0.99),
      },
      trace: {
        sha256: traceDigest(events),
        offered: events.length,
        committed: writes.length,
        duplicates,
        lostAck,
        offsetS: o.traceOffsetS,
        durationS: o.durationS,
      },
      splits,
      splitMisses,
      readers: 64,
      sweepWallMs,
      sweepComplete: sweep?.complete ?? null,
      controller: { constants: CONTROLLER, enabled: o.controllerOn, windows: controllerWindows },
      rawReads: path.join(o.dir, o.id + "-reads.ndjson"),
      rawWrites: path.join(o.dir, o.id + "-writes.ndjson"),
    };
  } finally {
    stopped = true;
    clearInterval(timer);
    await writer.catch(() => {});
    await Promise.all(readers);
    fs.closeSync(raw);
    fs.closeSync(writeLog);
  }
}

/** Matched phase diagnostic: identical offer-time window in each arm, including slow ACKs after its end. */
export function matchSweepWindow(sweeping: any, baseline: any, aa: boolean) {
  const ms = aa ? sweeping.trace.durationS * 1000 : sweeping.sweepWallMs;
  const summarize = (file: string, kind: "read" | "commit") => {
    const rows = fs
      .readFileSync(file, "utf8")
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line));
    const samples = rows
      .filter((r) => (kind === "read" ? r.startedAtMs : r.scheduledAtMs) <= ms)
      .map((r) => (kind === "read" ? r.latencyMs : r.ackAtMs - r.scheduledAtMs));
    return {
      count: samples.length,
      p50: samples.length ? percentile(samples, 0.5) : null,
      p99: samples.length ? percentile(samples, 0.99) : null,
    };
  };
  for (const arm of [sweeping, baseline]) {
    arm.fullWindow = { read: arm.read, commit: arm.commit };
    arm.matchedWindowMs = ms;
    arm.read = summarize(arm.rawReads, "read");
    arm.commit = summarize(arm.rawWrites, "commit");
    arm.windowValid = arm.windowValid && ms <= arm.trace.durationS * 1000;
  }
}
