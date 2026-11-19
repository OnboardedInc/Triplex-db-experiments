import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { W0 } from "../../../bench/lib/w0-world.ts";
import { generateTrace, type TraceEvent } from "../../../bench/lib/trace.ts";
import { openComposition } from "../../../bench/lib/composition.ts";
import { percentile } from "../../../bench/lib/w0-traffic.ts";
import { Account } from "./account.ts";
import { hash, Objects } from "./store.ts";
import { emptyAudit, event, query, type Scheduled } from "./bench-rung.ts";
import { seedFacts } from "./model.ts";
import { CurrentDecisions, AccountWriter, writerPipeline, type Admission } from "./service.ts";
import { Window } from "./v3.ts";
import { measured } from "./measure-lock.ts";

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
) {
  assert(total >= 3 && total % 3 === 0 && arms.length > 0);
  const admissions = arms.map(() => new AccountWriter());
  const samples: Trial[] = [],
    workers = Array(64).fill(0) as number[],
    reads = new Map<number, Map<string, Point>>(),
    saves = arms.map(() => ({ offered: 0, done: 0, burst: 0, maxQueued: 0, during: 0 })),
    readLat: number[] = [],
    windows: any[] = [];
  const releases = [W0.R2, W0.R3, W0.R1],
    labels = ["broad", "narrow", "rollback"];
  function capture(d: Point) {
    const rows = reads.get(d.seq) ?? new Map<string, Point>(),
      old = rows.get(d.id);
    if (old)
      assert(
        old.digest === d.digest && old.release === d.release && old.releaseSeq === d.releaseSeq,
      );
    else rows.set(d.id, d);
    reads.set(d.seq, rows);
  }
  let failure: unknown;
  for (let group = 0; group < total; group += Math.min(total, 75)) {
    await measured(async () => {
      const start = performance.now(),
        before = saves.map((x) => x.done);
      let stop = false,
        active = 0,
        outstanding = 0,
        publishing = false;
      const tails = arms.map(() => Promise.resolve());
      function submit(arm: TrafficArm, index: number, burst: boolean) {
        const stats = saves[index]!,
          ordinal = stats.offered++;
        if (burst) stats.burst++;
        outstanding++;
        stats.maxQueued = Math.max(stats.maxQueued, stats.offered - stats.done);
        tails[index] = tails[index]!.then(async () => {
          if (failure) return;
          active++;
          try {
            await admissions[index]!.submit("save", () =>
              arm.write(ordinal, (n, x) => timeline.add(n, x)),
            );
            stats.done++;
            if (publishing) stats.during++;
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
          submit(arm, j, isBurst);
          if (isBurst) surge++;
          else regular++;
        }
      });
      const loops = workers.map(async (_, i) => {
        while (!stop && !failure) {
          const id = ids[(i * 103 + workers[i]! * 191) % ids.length]!,
            at = performance.now();
          try {
            const d = await reader.read(id);
            capture({
              id,
              seq: d.seq,
              p: d.position,
              releaseSeq: d.releaseSeq,
              release: d.output.release,
              digest: hash(JSON.parse(W0.outputJson(d.output))),
            });
            readLat.push(performance.now() - at);
            workers[i]!++;
          } catch (e) {
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
        for (let i = group; i < Math.min(total, group + 75); i++) {
          if (failure) throw failure;
          const name = "load-" + i,
            k = i % 3,
            at = performance.now(),
            inflight = active,
            queued = outstanding,
            pos = pipeline.length;
          publishing = true;
          // [DX-ACT2] Why: decode the offered document after the clock starts; the only preexisting data is the ordinary parameter index. Rejected: staging or certifying the next release before Publish.
          let accountQueue = 0;
          const offered = W0.compileRelease(JSON.parse(JSON.stringify(releases[k]!.doc))),
            r = await admissions[0]!.submit("release", (wait) => {
              accountQueue = wait;
              return a.seal(name, offered);
            }),
            ack = performance.now();
          publishing = false;
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
      } finally {
        publishing = false;
        stop = true;
        await Promise.all(writes);
        await Promise.all(loops);
        await Promise.all(tails);
      }
      if (failure) throw failure;
      assert(saves.every((s, j) => s.done > before[j]! && s.offered === s.done));
      windows.push({
        from: group,
        count: samples.length - group,
        elapsed: performance.now() - start,
        saves: saves.map((v, i) => v.done - before[i]!),
      });
    });
  }
  for (const [seq, rows] of reads) {
    await timeline.through(seq);
    const expected = await query(timeline.oracle, "answers", { seq, subjects: [...rows.keys()] });
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
    distinctReads: [...reads.values()].reduce((n, m) => n + m.size, 0),
    windows,
    saves,
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
        facts: w.facts.map((f): W0.Fact => ({
          ...f,
          e: f.e.replace(w.subject, subject),
          v: typeof f.v === "string" ? f.v.replace(w.subject, subject) : f.v,
        })),
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
      201,
      dir,
      { scope, account: "target", source: bind, identity: attempt.identity, nonce: attempt.nonce },
    );
  } finally {
    oo.close();
    await Promise.all([source.close(), read.close()]);
  }
}
