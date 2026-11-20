import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { W0 } from "../../../bench/lib/w0-world.ts";
import { generateTrace, type TraceEvent } from "../../../bench/lib/trace.ts";
import { openComposition } from "../../../bench/lib/composition.ts";
import { percentile } from "../../../bench/lib/w0-traffic.ts";
import { Account } from "./account.ts";
import { hash, Objects } from "./store.ts";
import { emptyAudit, event, query, type Scheduled } from "./bench-rung.ts";
import { CurrentDecisions, writerPipeline, type Admission } from "./service.ts";
import { Window } from "./v3.ts";
import { OrderedSaves } from "./save-queue.ts";
import { measured } from "./measure-lock.ts";
import { READER_SECONDS, RECORD_EVERY } from "../scale1/bounded-readers.ts";

type Evidence = { scope: string; account: string; nonce: string; source: string; identity: string };
type Recorded = {
  p: number;
  doc?: W0.ReleaseDoc;
  tx?: number;
  subject?: string;
  edits?: Scheduled["edits"];
  worldAfter?: W0.World;
};
export class Timeline {
  private readonly items = new Map<number, Recorded>();
  private last = 0;
  private position: number;
  private doc: W0.ReleaseDoc = W0.R1.doc;
  private basis: W0.Basis;
  readonly oracle: ReturnType<typeof emptyAudit>;
  readonly cuts = new Map<number, number>();
  readonly acknowledgements: { at: number; position: number }[] = [];
  readonly releaseHashes = new Map<number, string>([[0, W0.R1.hash]]);
  private serial: Promise<void> = Promise.resolve();
  constructor(oracle: ReturnType<typeof emptyAudit>, b: W0.Basis, p: number) {
    this.oracle = oracle;
    this.basis = b;
    this.position = p;
    this.cuts.set(0, p);
  }
  async add(seq: number, item: Recorded) {
    assert(seq > this.last && !this.items.has(seq));
    this.items.set(seq, item);
    this.acknowledgements.push({ at: performance.now(), position: item.p });
    this.serial = this.serial.then(async () => {
      for (;;) {
        const n = this.last + 1,
          x = this.items.get(n);
        if (!x) break;
        assert(x.p > this.position);
        const tx = x.tx ?? this.basis.tx + 1;
        assert(tx > this.basis.tx);
        this.doc = x.doc ?? this.doc;
        this.basis = { ...this.basis, tx };
        await event(this.oracle, {
          seq: n,
          basis: this.basis,
          doc: this.doc,
          ...(x.subject
            ? {
                subject: x.subject,
                edits: x.edits ?? [],
                ...(x.worldAfter ? { worldAfter: x.worldAfter } : {}),
              }
            : {}),
        });
        if (x.doc) this.releaseHashes.set(n, W0.compileRelease(x.doc).hash);
        this.last = n;
        this.position = x.p;
        this.cuts.set(n, x.p);
        this.items.delete(n);
      }
    });
    await this.serial;
  }
  async through(n: number) {
    const end = performance.now() + 30000;
    while (this.last < n) {
      await this.serial;
      if (this.last >= n) break;
      assert(performance.now() < end, "missing committed input in independent timeline");
      await delay(1);
    }
  }
}
export type TrafficArm = {
  name: string;
  write: (ordinal: number, seen: (seq: number, item: Recorded) => Promise<void>) => Promise<void>;
};
type Point = {
  id: string;
  seq: number;
  p: number;
  releaseSeq: number;
  release: string;
  digest: string;
};
type ReadTiming = {
  start: number;
  releaseSeq: number;
  position: number;
  point?: Point;
  ordinal?: number;
};
type Trial = {
  order: number;
  label: string;
  seq: number;
  position: number;
  p: number;
  id: string;
  digest: string;
  A: number;
  ack: number;
  read: number;
  queue: number;
  accountQueue: number;
  sourceDebtMs: number;
  nativeQueue: number;
  native: number;
  inFlight: number;
  queued: number;
};
export async function loadedOffers(
  a: Account,
  reader: CurrentDecisions,
  ids: string[],
  timeline: Timeline,
  arms: TrafficArm[],
  pipeline: Admission[],
  total: number,
  dir: string,
  binding: Evidence,
  bounded = false,
) {
  assert(total >= 3 && total % 3 === 0 && arms.length > 0);

  const readTimes: ReadTiming[] = [],
    releaseTimes: { start: number; ack: number; seq: number }[] = [];
  const samples: Trial[] = [],
    workers = Array(64).fill(0) as number[],
    reads = new Map<number, Map<string, Point>>(),
    saves = arms.map(() => ({ offered: 0, done: 0, burst: 0, maxQueued: 0, during: 0 })),
    writeLat = arms.map(() => [] as number[]),
    readLat: number[] = [],
    windows: any[] = [];
  const releases = [W0.R2, W0.R3, W0.R1],
    labels = ["broad", "narrow", "rollback"];
  const evidenceFile = path.join(dir, "bounded-reads.ndjson");
  const maximumWindow = READER_SECONDS * 1000;
  let readStartedAt = 0;
  if (bounded) fs.writeFileSync(evidenceFile, "", { flag: "wx" });
  function capture(d: Point) {
    const rows = reads.get(d.seq) ?? new Map<string, Point>(),
      old = rows.get(d.id);
    if (old && !bounded)
      assert(
        old.digest === d.digest && old.release === d.release && old.releaseSeq === d.releaseSeq,
      );
    else if (!old) rows.set(d.id, d);
    reads.set(d.seq, rows);
  }
  let failure: unknown;
  const groupSize = bounded ? total : Math.min(total, 75);
  for (let group = 0; group < total; group += groupSize) {
    await measured(async () => {
      const start = performance.now(),
        before = saves.map((x) => x.done);
      readStartedAt = start;
      const readDeadline = bounded ? start + maximumWindow : Infinity;
      const releaseIntervals: { start: number; end: number }[] = [],
        saveIntervals = arms.map(() => [] as { start: number; end: number }[]);
      let started = 0,
        onNext: (() => void) | undefined;
      let stop = false,
        active = 0,
        outstanding = 0;
      const ingress = new OrderedSaves();
      function submit(arm: TrafficArm, index: number, burst: boolean, offered: number) {
        const stats = saves[index]!,
          ordinal = stats.offered++;
        if (burst) stats.burst++;
        outstanding++;
        stats.maxQueued = Math.max(stats.maxQueued, stats.offered - stats.done);
        void ingress.submit(arm.name, async () => {
          if (failure) return;
          active++;
          const saveStart = performance.now();
          if (index === 0) {
            started++;
            onNext?.();
            onNext = undefined;
          }
          try {
            await arm.write(ordinal, (n, x) => timeline.add(n, x));
            stats.done++;
            writeLat[index]!.push(performance.now() - offered);
            saveIntervals[index]!.push({ start: saveStart, end: performance.now() });
          } catch (e) {
            failure = e;
          } finally {
            active--;
            outstanding--;
          }
        });
      }
      const writes = arms.map(async (arm, j) => {
        let regular = 0,
          surge = 0;
        while (!stop) {
          const steady = regular * 625,
            burst = 1000 + Math.floor(surge / 55) * 30000 + ((surge % 55) * 1000) / 55;
          const isBurst = burst <= steady,
            due = Math.min(steady, burst),
            left = start + due - performance.now();
          if (left > 0) {
            await delay(Math.min(20, left));
            continue;
          }
          submit(arm, j, isBurst, start + due);
          if (isBurst) surge++;
          else regular++;
        }
      });
      const loops = workers.map(async (_, i) => {
        while (!stop && !failure && performance.now() < readDeadline) {
          const id = ids[(i * 103 + workers[i]! * 191) % ids.length]!,
            at = performance.now();
          if (at >= readDeadline) break;
          try {
            const d = await reader.read(id);
            const point = {
              id,
              seq: d.seq,
              p: d.position,
              releaseSeq: d.releaseSeq,
              release: d.output.release,
              digest: hash(JSON.parse(W0.outputJson(d.output))),
            };
            readTimes.push({
              start: at,
              releaseSeq: d.releaseSeq,
              position: d.position,
              ...(bounded ? { point, ordinal: readTimes.length + 1 } : {}),
            });
            capture(point);
            readLat.push(performance.now() - at);
            workers[i]!++;
          } catch (e) {
            if (bounded)
              fs.appendFileSync(
                evidenceFile,
                JSON.stringify({
                  binding,
                  outcome: "error",
                  worker: i,
                  id,
                  invokedMs: at - start,
                  message: String(e),
                }) + "\n",
              );
            failure = e;
          }
        }
      });
      try {
        while (
          !failure &&
          (workers.some((n) => !n) ||
            saves.some((x, i) => x.done === before[i]) ||
            performance.now() - start < 2100)
        )
          await delay(5);
        if (total <= 6) {
          const next = started + 1;
          await new Promise<void>((ok) => {
            onNext = ok;
          });
          assert(started >= next);
        }
        const cadence = performance.now();
        // [DX-SCALE1] Why: spread the existing release count through one fixed observation window and stop background reads on its deadline. Rejected: giving each release another reader window.
        const cadenceMs = bounded ? (readDeadline - cadence) / total : 1000;
        assert(cadenceMs > 0);
        for (let i = group; i < Math.min(total, group + groupSize); i++) {
          if (failure) throw failure;
          const wait = cadence + (i - group) * cadenceMs - performance.now();
          if (wait > 0) await delay(wait);
          const name = "load-" + i,
            k = i % 3,
            at = performance.now(),
            inflight = active,
            queued = outstanding,
            pos = pipeline.length;
          // [DX-ACT2] Why: decode the offered document after the clock starts; the only preexisting data is the ordinary parameter index. Rejected: staging or certifying the next release before Publish.
          const accountQueue = 0;
          const offered = W0.compileRelease(JSON.parse(JSON.stringify(releases[k]!.doc))),
            r = await a.seal(name, offered),
            ack = performance.now();
          releaseIntervals.push({ start: at, end: ack });
          releaseTimes.push({ start: at, ack, seq: r.seq });
          assert(!r.retry, "new offer was already published");
          const register = timeline.add(r.seq, { p: r.position, doc: offered.doc }),
            id = ids[(i * 397 + 17) % ids.length]!,
            d = await reader.read(id),
            read = performance.now();
          await register;
          await timeline.through(d.seq);
          assert(
            d.position >= r.position && d.releaseSeq === r.seq && d.output.release === offered.hash,
          );
          const digest = hash(JSON.parse(W0.outputJson(d.output)));
          assert.deepEqual(
            await query(timeline.oracle, "answers", { seq: d.seq, subjects: [id] }),
            [[id, digest]],
          );
          const end = performance.now(),
            native = pipeline
              .slice(pos)
              .filter(
                (v) =>
                  v.command === a.db.entity("cmd:fence:" + name) ||
                  v.command === a.db.entity("cmd:event:" + name),
              );
          assert(
            native.filter((x) => x.ok).length === 2 && native.every((x) => x.ok),
            "release retried after admission",
          );
          samples.push({
            order: i,
            label: labels[k]!,
            seq: r.seq,
            position: r.position,
            p: d.position,
            id,
            digest,
            A: end - at,
            ack: ack - at,
            read: read - ack,
            queue: accountQueue + native.reduce((n, x) => n + x.queuedForSaveMs, 0),
            accountQueue,
            sourceDebtMs: r.sourceDebtMs,
            nativeQueue: native.reduce((n, x) => n + x.queuedForSaveMs, 0),
            native: native.reduce((n, x) => n + x.serviceMs, 0),
            inFlight: inflight,
            queued,
          });
          fs.appendFileSync(
            path.join(dir, "offers.ndjson"),
            JSON.stringify({ nonce: binding.nonce, ...samples.at(-1) }) + "\n",
          );
          if ((i + 1) % 25 === 0)
            console.log("loaded offers", i + 1, "complete", Math.round(samples.at(-1)!.A), "ms");
        }
        if (bounded && performance.now() < readDeadline)
          await delay(Math.ceil(readDeadline - performance.now()));
      } finally {
        stop = true;
        await Promise.all(writes);
        await Promise.all(loops);
        await ingress.drain();
      }
      if (failure) throw failure;
      for (const [i, xs] of saveIntervals.entries())
        saves[i]!.during += xs.filter((x) =>
          releaseIntervals.some((r) => x.start < r.end && r.start < x.end),
        ).length;
      assert(saves.every((s, j) => s.done > before[j]! && s.offered === s.done));
      windows.push({
        from: group,
        count: samples.length - group,
        elapsed: performance.now() - start,
        saves: saves.map((v, i) => v.done - before[i]!),
      });
    });
  }
  const model = new Map<number, Map<string, string>>();
  for (const [seq, rows] of reads) {
    await timeline.through(seq);
    const expected = await query(timeline.oracle, "answers", { seq, subjects: [...rows.keys()] });
    if (bounded) {
      model.set(seq, new Map(expected));
      continue;
    }
    assert.deepEqual(
      expected,
      [...rows.values()].map((x) => [x.id, x.digest]),
    );
    for (const x of rows.values()) {
      assert(timeline.cuts.get(seq)! <= x.p && (timeline.cuts.get(seq + 1) ?? Infinity) > x.p);
      assert.equal(timeline.releaseHashes.get(x.releaseSeq), x.release);
    }
  }
  assert(
    samples.length === total &&
      workers.every((n) => n > 0) &&
      saves.every((s) => s.burst >= 55 && s.during > 0 && s.offered === s.done),
  );
  let acknowledged = 0,
    deadline = 0,
    lastPosition = 0,
    releaseIndex = 0,
    deadlineIndex = 0,
    receiptIndex = 0,
    lateReads = 0,
    mismatches = 0,
    retained = 0;
  const lateOffers = new Set<number>(),
    receipts = timeline.acknowledgements;
  for (const read of readTimes.sort((a, b) => a.start - b.start)) {
    while (releaseIndex < releaseTimes.length && releaseTimes[releaseIndex]!.ack <= read.start)
      acknowledged = releaseTimes[releaseIndex++]!.seq;
    while (
      deadlineIndex < releaseTimes.length &&
      releaseTimes[deadlineIndex]!.start + 1000 <= read.start
    )
      deadline = releaseTimes[deadlineIndex++]!.seq;
    while (receiptIndex < receipts.length && receipts[receiptIndex]!.at <= read.start)
      lastPosition = Math.max(lastPosition, receipts[receiptIndex++]!.position);
    const current = read.releaseSeq >= acknowledged && read.position >= lastPosition;
    if (bounded) {
      const point = read.point!;
      const want = model.get(point.seq)?.get(point.id),
        invokedMs = read.start - readStartedAt;
      const match =
        current &&
        want === point.digest &&
        timeline.cuts.get(point.seq)! <= point.p &&
        (timeline.cuts.get(point.seq + 1) ?? Infinity) > point.p &&
        timeline.releaseHashes.get(point.releaseSeq) === point.release &&
        invokedMs >= 0 &&
        invokedMs < maximumWindow;
      if (!match) mismatches++;
      if (!match || read.ordinal! % RECORD_EVERY === 0) {
        const entry = {
          binding,
          ordinal: read.ordinal,
          invokedMs,
          ...point,
          outcome: match ? "match" : "mismatch",
          ...(!match ? { want, acknowledged, lastPosition } : {}),
        };
        fs.appendFileSync(evidenceFile, JSON.stringify(entry) + "\n");
        retained++;
      }
    } else {
      assert(current, "current read went behind an acknowledgement visible before invocation");
    }
    if (read.releaseSeq < deadline) {
      lateReads++;
      lateOffers.add(deadline);
    }
  }
  assert.equal(mismatches, 0, "independent DELTA reader mismatches");
  assert(readTimes.length === readLat.length && releaseTimes.length === total);
  const summary = (arr: Trial[]) => ({
    count: arr.length,
    p50: percentile(
      arr.map((x) => x.A),
      0.5,
    ),
    p99: percentile(
      arr.map((x) => x.A),
      0.99,
    ),
    max: Math.max(...arr.map((x) => x.A)),
    queueP99: percentile(
      arr.map((x) => x.queue),
      0.99,
    ),
    overOneSecond: arr.filter((x) => x.A >= 1000).length,
  });
  const result = {
    binding,
    people: ids.length,
    workers,
    readP99: percentile(readLat, 0.99),
    checked: readLat.length,
    ...(bounded
      ? {
          readEvidence: {
            durationMs: maximumWindow,
            sampleEvery: RECORD_EVERY,
            retained,
            sha256: createHash("sha256").update(fs.readFileSync(evidenceFile)).digest("hex"),
          },
        }
      : {}),
    afterAckStale: 0,
    afterOneSecondStale: lateReads,
    affectedDeadlines: [...lateOffers],
    distinctReads: [...reads.values()].reduce((n, m) => n + m.size, 0),
    windows,
    saves: saves.map((s, i) => ({
      ...s,
      account: arms[i]!.name,
      ackP50: percentile(writeLat[i]!, 0.5),
      ackP99: percentile(writeLat[i]!, 0.99),
      ackMax: Math.max(...writeLat[i]!),
    })),
    all: summary(samples),
    byRelease: Object.fromEntries(
      labels.map((l) => [l, summary(samples.filter((x) => x.label === l))]),
    ),
    offers: samples,
  };
  fs.writeFileSync(path.join(dir, "loaded.json"), JSON.stringify(result) + "\n", { flag: "wx" });
  return result;
}
export async function run(dir: string, attempt: any) {
  const n = 10000,
    scope = attempt.scope + "-loaded",
    source = await openComposition("reach", "datomic", scope),
    read = await openComposition("reach", "datomic", scope),
    pipe = writerPipeline(source),
    oo = emptyAudit(),
    bind = hash([attempt.nonce, attempt.sources, scope]),
    keys = path.join(dir, "fixture-keys"),
    a = new Account(new Objects(pipe.comp, "target"), bind, keys),
    reader = new Account(new Objects(read, "target"), bind, keys),
    neighbor = new Account(new Objects(pipe.comp, "neighbor"), bind, keys);
  try {
    const rung = W0.rung(n),
      raw = [...W0.population(rung)].map((p) => p.world),
      ids = raw.map((w) => w.subject),
      basis = { ...W0.populationBasis(rung), validTime: "2026-11-04T13:00:00.000000Z" };
    const independent = await query(oo, "population", { n });
    assert.equal(independent.census, hash(ids));
    assert.equal(
      independent.facts,
      raw.reduce((sum, w) => sum + w.facts.length, 0),
    );
    const r = await a.bootstrap(ids, raw, basis);
    await event(oo, { seq: 0, basis, doc: W0.R1.doc });
    const neighbors = raw.slice(0, 96).map((w, i) => {
      const subject = W0.placementId(n + i);
      return {
        subject,
        facts: w.facts.map(
          (f): W0.Fact => ({
            ...f,
            e: f.e.replace(w.subject, subject),
            v: typeof f.v === "string" ? f.v.replace(w.subject, subject) : f.v,
          }),
        ),
      };
    });
    await neighbor.bootstrap(
      neighbors.map((w) => w.subject),
      neighbors,
      basis,
    );
    const timeline = new Timeline(oo, basis, r.position),
      arms: TrafficArm[] = [];
    for (const [j, who] of [a, neighbor].entries()) {
      const w = await Window.open(pipe.comp, who, "loaded"),
        trace = generateTrace({
          seed: "DX-H2-frozen-v1",
          subjects: j ? 96 : n,
          durationS: 3000,
        }).filter((e) => !e.resend);
      arms.push({
        name: who.db.account,
        write: async (i, record) => {
          const src = trace[i]!;
          const e: TraceEvent = j ? { ...src, subject: src.subject + n } : src,
            got = await w.apply(e);
          assert(!got.retry);
          if (!j) {
            const k = "claim:" + hash(w.position + ":p5:trace:" + e.seq),
              claim = await who.db.get<{ seq: number }>(k, got.position);
            await record(claim.value.seq, {
              p: got.position,
              subject: W0.placementId(e.subject),
              edits: got.edits,
            });
          }
        },
      });
    }
    await loadedOffers(
      a,
      new CurrentDecisions(reader),
      ids,
      timeline,
      arms,
      pipe.samples,
      300,
      dir,
      { scope, account: "target", source: bind, identity: attempt.identity, nonce: attempt.nonce },
    );
  } finally {
    oo.close();
    await Promise.all([source.close(), read.close()]);
  }
}
