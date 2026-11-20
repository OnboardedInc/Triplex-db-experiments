import assert from "node:assert/strict";
import { gzipSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { monitorEventLoopDelay } from "node:perf_hooks";
import { setTimeout as sleep } from "node:timers/promises";
import { W0, canonical, sha256, type WorldRow } from "../../../../bench/lib/w0-world.ts";
import { ids, type Fact } from "../../../../bench/lib/world.ts";
import { integer } from "../../../../bench/lib/deep-world.ts";
import { measureW0Http } from "../../../../bench/lib/w0-http.ts";
import type { Tail } from "../../notify1/journal.ts";
import { DEEP_RATE, makeDeepTrace, type DeepEvent } from "../../../../bench/lib/deep-trace.ts";
import { liveArrivals, liveEdits } from "../../scale1/deep-live.ts";
import { scoreClock, type Offered, type RawDecision } from "../../actv-delta/audit-clock.ts";
import { seed, valid } from "../fixture.ts";
import { millis, openStore, type Store } from "../store.ts";
import { AccountAdmission, type AdmissionPolicy, type PublishObservation } from "./admission.ts";
import { liveGateway, run as gate } from "./admission-gate.ts";
import { JoinedAccount } from "./account.ts";
import { authoredSeed, authoredWrite, expectedPolicy } from "./deep-reference.ts";
import { Reference } from "./check.ts";
import { measure } from "./measure.ts";
import {
  distribution,
  PublishSlot,
  releaseStages,
  saveTimes,
  screenSaves,
} from "./queue-study-math.ts";

type Identity = { source: string; nonce: string; identity: string };
type Seen = { cut: number; rows: WorldRow[] };
type Entry = Offered & {
  policy: AdmissionPolicy;
  rate: number;
  observation: PublishObservation;
  requests?: Record<string, unknown>[];
  frames?: Record<string, unknown>[];
  receiptClock?: "native-ack" | "readback";
};
type Sample = RawDecision & { learned: number; releaseAvailable: number };
type Receipt = { commandId: string; position: number; txId: string; changes: any[] };
type SaveReceipt = {
  command: string;
  scheduled: number;
  started: number;
  entered: number;
  ack: number;
  observed: number;
  position: number;
  txId: string;
  intent: string;
};
const paths = ["public", "independent-route"] as const;
const seats = 64;
const settleMs = 5000;
const screenMs = 30000;
const save = (file: string, value: unknown) =>
  writeFileSync(file, JSON.stringify(value) + "\n", { flag: "wx" });
const ms = () => performance.now();
async function waitsUntil(at: number) {
  while (ms() < at) await sleep(Math.max(1, at - ms()));
}

async function cpu(attempt: Identity) {
  assert(process.send);
  const id = randomUUID();
  return new Promise<{
    at: number;
    vm: string;
    host: { cpus: number; load: number[] };
    exclusive: boolean;
  }>((ok, fail) => {
    const receive = (m: any) => {
      if (m?.id !== id) return;
      clearTimeout(timer);
      process.off("message", receive);
      if (m.error) fail(Error(m.error));
      else {
        assert(m.cpu.exclusive && m.cpu.vm.includes("some avg10="));
        ok(m.cpu);
      }
    };
    const timer = setTimeout(() => {
      process.off("message", receive);
      fail(Error("CPU pressure was not observed by the slot manager"));
    }, 15000);
    process.on("message", receive);
    process.send!({ id, type: "cpu", nonce: attempt.nonce });
  });
}

// [DX-ACT2] Why: allocate one immutable input tape and verify reads from the authored seed and native save order. Rejected: giving the oracle the production reader's projected World.
class SourceTape {
  private readonly histories = new Map<number, Seen[]>();
  private events: DeepEvent[] = [];
  private next = 0;
  private readonly fieldAt = millis(valid);
  private readonly fixture: Awaited<ReturnType<typeof seed>>;
  private readonly tape: string;
  constructor(fixture: Awaited<ReturnType<typeof seed>>, tape: string) {
    this.fixture = fixture;
    this.tape = tape;
  }
  reserve(count: number) {
    const need = this.next + count;
    if (need <= this.events.length) return;
    const duration = Math.ceil((1.35 * Math.max(need, this.events.length * 1.5)) / DEEP_RATE);
    const events = makeDeepTrace(this.tape, this.fixture.n, duration).events.filter(
      (e) => !e.resend,
    );
    assert(events.length >= need);
    if (this.next) assert.deepEqual(events[this.next - 1], this.events[this.next - 1]);
    this.events = events;
  }
  keepLatest() {
    for (const [id, history] of this.histories) this.histories.set(id, [history.at(-1)!]);
  }
  fields() {
    const event = this.events[this.next++];
    assert(event, "insufficient authored save commands");
    const fields = [
      { e: ids.placement(event.subject), a: ":placement/stamp", v: integer(this.next) },
      ...liveEdits(event.subject, event.seq, event.kind, event.deep),
    ];
    return { person: event.subject, fields, from: this.fieldAt };
  }
  rows(person: number, cut: number) {
    return (
      this.histories.get(person)?.findLast((x) => x.cut <= cut)?.rows ??
      authoredSeed(person, this.fixture.seedPosition(person))
    );
  }
  committed(person: number, fields: readonly Fact[], receipt: Receipt) {
    const at = receipt.position;
    const relevant = new Set(fields.map((f) => f.e + "\n" + f.a));
    const observed = receipt.changes.filter(
      (c: any) =>
        c.op === "assert" &&
        c.validFrom === this.fieldAt &&
        relevant.has(c.entityId + "\n" + c.attribute),
    );
    assert.deepEqual(
      observed.map((c: any) => canonical([c.entityId, c.attribute, c.value])).sort(),
      fields.map((f) => canonical([f.e, f.a, f.v])).sort(),
    );
    const list = this.histories.get(person) ?? [];
    assert(at > (list.at(-1)?.cut ?? 0));
    list.push({
      cut: at,
      rows: authoredWrite(this.rows(person, at - 1), fields, at, this.fieldAt),
    });
    this.histories.set(person, list);
  }
}

type Target = { store: Store; fixture: Awaited<ReturnType<typeof seed>>; tape: SourceTape };
async function setup(scope: string, n: number, nonce: string, tape: string): Promise<Target> {
  const store = await openStore(scope, "act2-deep");
  try {
    await liveGateway(scope, nonce);
    const fixture = await seed(store, n, "default", 2000);
    const account = new JoinedAccount(store);
    await account.install(fixture.roster, valid, true);
    await account.publish("initial-r1", W0.R1.doc, valid, "owed");
    return { store, fixture, tape: new SourceTape(fixture, tape) };
  } catch (e) {
    await store.close();
    throw e;
  }
}

function arrivalOffsets(cycle: number, writer: number, rate: number, span: number) {
  if (writer)
    return Array.from(
      { length: Math.ceil((span * rate) / 1000) },
      (_, i) => ((i + (writer === 1 ? 0.23 : 0.71)) * 1000) / rate,
    ).filter((at) => at < span);
  const offsets: number[] = [];
  liveArrivals(cycle, rate, 60 * Math.ceil(span / 60000), (at) => {
    if (at * 1000 < span) offsets.push(at * 1000);
  });
  return offsets;
}

type Cpu = Awaited<ReturnType<typeof cpu>>;

async function block(
  folder: string,
  attempt: Identity,
  target: Target,
  neighbors: readonly Target[],
  policy: AdmissionPolicy,
  rate: number,
  spacing: number,
  count: number,
  cycle: number,
  ref: Reference,
) {
  mkdirSync(folder);
  const { store, fixture, tape } = target,
    account = new JoinedAccount(store, new AccountAdmission(policy));
  const baseline = await account.publish("study-baseline-" + cycle, W0.R1.doc, valid, "owed");
  const readers = await Promise.all(paths.map(() => openStore(store.scope, "act2-deep", "read")));
  try {
    const routes = readers.map((s) => new JoinedAccount(s).reader()),
      // [DX-ACT2] Why: leave time for the capacity screen and its CPU samples while writes continue. Rejected: restarting the traffic between the screen and the first release offer.
      span = settleMs + screenMs + 30000 + spacing * count,
      saves = [target, ...neighbors].map((t, index) => {
        const hz = index ? 1.6 : rate;
        const offsets = arrivalOffsets(cycle, index, hz, span);
        t.tape.reserve(offsets.length);
        return {
          t,
          index,
          hz,
          offsets,
          writer: index ? new JoinedAccount(t.store, new AccountAdmission(policy)) : account,
          receipts: [] as SaveReceipt[],
        };
      }),
      errors: string[] = [],
      raw: Sample[] = [],
      offers: Entry[] = [],
      readOffers: number[] = [];
    let opened = 0,
      stop = Infinity;
    let screen!: {
      interval: { start: number; end: number };
      observedAt: number;
      saves: ReturnType<typeof screenSaves>[];
      readerOffers: number;
      reason: string | null;
    };
    let treatment: { start: number; end: number } | undefined;
    let pressure!: {
      start: Cpu;
      baselineStop: Cpu;
      baselineLoopP99Ms: number;
      treatmentStart?: Cpu;
      treatmentStop?: Cpu;
      treatmentLoopP99Ms?: number;
    };
    const pending: Promise<unknown>[] = [];
    const keep = (e: unknown) => {
      errors.push(String(e));
    };
    // [DX-ACT2] Why: keep native save-only admission and every timed offer on one monotonic clock. Rejected: observing admission after resetting the live queue.
    await measure(async () => {
      const startCpu = await cpu(attempt),
        delay = monitorEventLoopDelay({ resolution: 20 });
      opened = ms() + 500;
      const interval = { start: opened + settleMs, end: opened + settleMs + screenMs };
      save(join(folder, "plan.json"), {
        attempt,
        scope: store.scope,
        baseline: baseline.position,
        policy,
        rate,
        spacing,
        count,
        opened,
        interval,
        seats,
        readsPerSeatSecond: 1,
        saves: saves.map((s) => ({
          scope: s.t.store.scope,
          hz: s.hz,
          offers: s.offsets.map((at) => opened + at),
        })),
      });
      delay.enable();
      const capture = async (
        route: number,
        person: number,
        phase: RawDecision["phase"],
        offer?: number,
      ) => {
        const invoked = ms(),
          id = fixture.roster[person]!;
        let learned: number | undefined, releaseAvailable: number | undefined;
        const r = await routes[route]!.readAt(id, { validTime: valid }, undefined, (stage) => {
          if (stage === "controls") learned = ms();
          if (stage === "erasure-before") releaseAvailable ??= ms();
        });
        assert(
          learned !== undefined &&
            releaseAvailable !== undefined &&
            Number.isSafeInteger(r.basis.tx),
        );
        raw.push({
          phase,
          route: paths[route]!,
          offer,
          id,
          invoked,
          learned,
          releaseAvailable,
          returned: ms(),
          position: r.basis.tx,
          seq: r.basis.tx,
          raw: r.json,
        });
      };
      // [DX-ACT2] Why: match the 64 SCALE1 seats at one read per seat-second. Rejected: driving an unlimited read queue that changes the save-only workload.
      const background = Array.from({ length: seats }, (_, seat) =>
        (async () => {
          for (let k = 0; ; k++) {
            const due = opened + (seat * 1000) / seats + k * 1000;
            if (due >= stop) return;
            await waitsUntil(due);
            if (due >= stop || ms() >= stop) return;
            if (ms() >= due + 1000) continue;
            readOffers.push(due);
            await capture(seat % 2, (seat + k * 67) % (fixture.n - count), "traffic");
          }
        })().catch(keep),
      );
      const senders = saves.map(async ({ t, index, writer, receipts, offsets }) => {
        const writes: Promise<void>[] = [];
        for (const [k, at] of offsets.entries()) {
          const scheduled = opened + at;
          if (scheduled >= stop) break;
          await waitsUntil(scheduled);
          if (scheduled >= stop) break;
          const edit = t.tape.fields(),
            command = `study-save-${cycle}-${index}-${k}`,
            started = ms(),
            observation: PublishObservation = { attempts: [] };
          writes.push(
            writer
              .saveDeep(
                command,
                edit.person,
                { fields: edit.fields, from: edit.from },
                valid,
                observation,
              )
              .then((r: Receipt) => {
                const mark = observation.attempts.at(-1);
                assert(observation.turn && mark?.nativeAck !== undefined);
                assert.equal(r.commandId, "joined:" + command);
                t.tape.committed(edit.person, edit.fields, r);
                receipts.push({
                  command,
                  started,
                  scheduled,
                  entered: observation.turn.entered,
                  ack: mark.nativeAck,
                  observed: ms(),
                  position: r.position,
                  txId: r.txId,
                  intent: sha256(canonical(edit)),
                });
              })
              .catch(keep),
          );
        }
        await Promise.all(writes);
      });
      pending.push(...senders);
      try {
        await waitsUntil(interval.end + 1000);
        const observedAt = ms();
        const grades = saves.map(({ offsets, receipts }) =>
          screenSaves(
            offsets.map((at) => opened + at),
            receipts,
            interval,
            observedAt,
          ),
        );
        const readerOffers = readOffers.filter(
          (at) => at >= interval.start && at < interval.end,
        ).length;
        screen = {
          interval,
          observedAt,
          saves: grades,
          readerOffers,
          reason:
            grades.find((grade) => grade.reason)?.reason ??
            (readerOffers < Math.floor(seats * (screenMs / 1000) * 0.99)
              ? "reader seats could not deliver the paced offers"
              : (errors[0] ?? null)),
        };
        if (screen.reason) stop = observedAt;
        pressure = {
          start: startCpu,
          baselineStop: await cpu(attempt),
          baselineLoopP99Ms: delay.percentile(99) / 1e6,
        };
        save(join(folder, "screen.json"), { attempt, scope: store.scope, ...screen, pressure });
        if (screen.reason) return;
        delay.reset();
        pressure.treatmentStart = await cpu(attempt);
        const first = ms() + 500;
        treatment = { start: first, end: first + spacing * count };
        stop = treatment.end + 1100;
        assert(stop < opened + span);
        const schedule = Array.from({ length: count }, (_, order) => ({
          order,
          id: `study-${cycle}-${order}`,
          scheduled: first + order * spacing,
        }));
        save(join(folder, "schedule.json"), {
          attempt,
          scope: store.scope,
          baseline: baseline.position,
          policy,
          rate,
          spacing,
          schedule,
        });
        const slot = new PublishSlot(),
          deadlines: Promise<unknown>[] = [];
        for (const x of schedule) {
          await waitsUntil(x.scheduled);
          const ingress = ms(),
            doc = structuredClone((x.order % 2 ? W0.R3 : W0.R2).doc),
            tweak = doc.rules.find((rule) => rule.id === "PAYCHG")!;
          Object.assign(tweak.params, { thresholdCents: 1001 + cycle * 1000 + x.order });
          const o: Entry = {
            ...x,
            ingress,
            mode: "record",
            policy,
            rate,
            doc,
            observation: { attempts: [] },
          };
          offers.push(o);
          const person = fixture.n - 1 - x.order;
          deadlines.push(
            waitsUntil(x.scheduled + 1000)
              .then(() => Promise.all(paths.map((_, i) => capture(i, person, "deadline", x.order))))
              .catch(keep),
          );
          const publication =
            ingress < x.scheduled + spacing
              ? slot.start(async () => {
                  const {
                    value: r,
                    nativeFrames,
                    samples,
                  } = await measureW0Http(() =>
                    account.publish(x.id, doc, valid, "owed", undefined, {
                      observation: o.observation,
                    }),
                  );
                  const write = o.observation.attempts.at(-1);
                  assert(write && r.changes.length === 4);
                  o.requests = samples.filter((sample) =>
                    String(sample.path).endsWith("/transact"),
                  );
                  o.frames = nativeFrames;
                  o.receiptClock = write.nativeAck === undefined ? "readback" : "native-ack";
                  o.ack = {
                    at: write.nativeAck ?? ms(),
                    position: r.position,
                    seq: r.position,
                    txId: r.txId,
                  };
                  o.owed = { at: o.ack.at, position: r.position };
                  assert(o.requests.length >= 1 && o.requests.at(-1)?.timeline);
                  return r;
                })
              : undefined;
          if (publication)
            pending.push(
              publication
                .then(() => Promise.all(paths.map((_, i) => capture(i, person, "first", x.order))))
                .catch((e) => {
                  o.error = String(e);
                }),
            );
          else
            o.error =
              ingress >= x.scheduled + spacing
                ? "scheduled slot elapsed before ingress"
                : "a Publish still owns the previous turn";
        }
        await Promise.all([waitsUntil(stop), ...deadlines, ...background]);
        pressure.treatmentStop = await cpu(attempt);
        pressure.treatmentLoopP99Ms = delay.percentile(99) / 1e6;
        save(join(folder, "deadline-checkpoint.json"), {
          attempt,
          scope: store.scope,
          scheduleCount: count,
          completedAt: ms(),
          offers,
          pressure,
          reads: raw.filter((r) => r.phase === "deadline"),
        });
      } finally {
        stop = Math.min(stop, ms());
        delay.disable();
        await Promise.all(background);
      }
    });
    // [DX-ACT2] Why: keep late receipts without changing the rated live window or its CPU observations. Rejected: using the time needed to drain as the offered-load duration.
    await Promise.all(pending);
    const compressed = gzipSync(raw.map((x) => JSON.stringify(x) + "\n").join(""));
    writeFileSync(join(folder, "reads.ndjson.gz"), compressed, { flag: "wx" });
    save(join(folder, "observed.json"), {
      attempt,
      scope: store.scope,
      pressure,
      offers,
      errors,
      screen,
      treatment,
      stop,
      saves: saves.map(({ receipts }) => receipts),
      readerOffers: readOffers,
      raw: sha256(compressed),
    });
    assert.equal(errors.length, 0, errors[0]);
    const stopSchedules = saves.map(({ offsets }) =>
      offsets.map((at) => opened + at).filter((at) => at < stop),
    );
    for (const [i, { receipts }] of saves.entries()) {
      assert.deepEqual(
        receipts.map((r) => r.scheduled),
        stopSchedules[i],
      );
      assert(receipts.every((r, j) => j === 0 || r.position > receipts[j - 1]!.position));
      assert.equal(new Set(receipts.map((r) => r.txId)).size, receipts.length);
      assert.deepEqual(
        screenSaves(stopSchedules[i]!, receipts, screen.interval, screen.observedAt),
        screen.saves[i],
      );
    }
    assert.equal(offers.length, screen.reason ? 0 : count);
    assert.equal(!!treatment, !screen.reason);
    const ordered = [{ p: baseline.position, doc: W0.R1.doc }],
      receiptChecks = [];
    for (const o of offers) {
      const observed = await store.lookup("joined:" + o.id);
      if (!o.ack) {
        assert.equal(observed, null);
        continue;
      }
      assert(observed && observed.txId === o.ack.txId && observed.position === o.ack.position);
      const tail = await account.db.get<Tail>("tail", observed.position),
        durable = await account.receipt(tail.value.sequence, observed.position);
      assert.equal(durable.event.at, o.ack.position);
      assert.equal(durable.marker.cut, o.ack.position - 1);
      assert.deepEqual(durable.marker.document, o.doc);
      assert.deepEqual(durable.marker.old, ordered.at(-1)!.doc);
      receiptChecks.push({
        id: o.id,
        cut: durable.marker.cut,
        tx: observed.txId,
        receipt: sha256(canonical(durable.marker)),
      });
      ordered.push({ p: o.ack.position, doc: o.doc });
    }
    const byCut = new Map<number, Map<string, string>>();
    for (const r of raw) {
      const group = byCut.get(r.position) ?? new Map<string, string>();
      if (group.has(r.id)) assert.equal(r.raw, group.get(r.id));
      group.set(r.id, r.raw);
      byCut.set(r.position, group);
    }
    for (const [cut, group] of byCut) {
      const doc = ordered.findLast((x) => x.p <= cut)?.doc;
      assert(doc);
      const people = [...group.keys()].map((key) => Number(key.slice(4)));
      for (let i = 0; i < people.length; i += 32) {
        const worlds = people
          .slice(i, i + 32)
          .map((person) => expectedPolicy(person, tape.rows(person, cut)));
        const expected = JSON.parse(
          await ref.oracle.call("check", {
            document: doc,
            old: null,
            basis: { tx: cut, validTime: valid },
            worlds,
            fold: false,
          }),
        );
        for (const answer of expected) assert.equal(group.get(answer.subject), answer.json);
        assert.equal(expected.length, worlds.length);
      }
    }
    const clock = offers.length ? scoreClock(offers, raw, paths, "record") : undefined,
      components = offers.flatMap((o) => {
        const obs = o.observation,
          a = obs.attempts.at(-1);
        if (!o.ack || !obs.turn || !a?.prepared) return [];
        const reply = raw
          .filter((r) => r.invoked >= o.ingress && r.position >= o.ack!.position)
          .sort((x, y) => x.returned - y.returned)[0];
        return [
          {
            order: o.order,
            stages: reply
              ? releaseStages(
                  o.scheduled,
                  obs.turn.entered,
                  o.ack.at,
                  reply.releaseAvailable,
                  reply.returned,
                )
              : undefined,
            queueBehindSaves: obs.turn.waitingForSavesMs,
            queueBehindPublishes: obs.turn.waitingForPublishesMs,
            headAndPlan: a.prepared - a.started,
            submissionAndNative: o.ack.at - a.prepared,
            nativeTimings: o.requests?.[0]?.timeline,
            fenceMs: 0,
            graceMs: 0,
            readerHead: reply ? reply.learned - reply.invoked : null,
            readerAfterHead: reply ? reply.returned - reply.learned : null,
            readerReleaseLookup: reply ? reply.releaseAvailable - reply.learned : null,
            readerAfterRelease: reply ? reply.returned - reply.releaseAvailable : null,
            conflicts: obs.attempts.filter((x) => x.conflict).length,
          },
        ];
      }),
      baselineSaves = saves.map(({ receipts }) => saveTimes(receipts, screen.interval)),
      publishSaves = treatment
        ? saves.map(({ receipts }) => saveTimes(receipts, treatment!))
        : null;
    for (const item of components) {
      const record = clock?.offers[item.order]?.done;
      if (record == null || !item.stages) continue;
      assert(Math.abs(record - Object.values(item.stages).reduce((a, b) => a + b)) < 1e-6);
    }
    const result = {
      attempt,
      scope: store.scope,
      policy,
      rate,
      spacing,
      count: offers.length,
      pressure,
      screen,
      treatment,
      missed: clock?.misses ?? null,
      stale: clock?.stale ?? null,
      observations: raw.length,
      baselineSaves: baselineSaves.map(distribution),
      publishSaves: publishSaves?.map(distribution) ?? null,
      treatmentReaderOffers: treatment
        ? readOffers.filter((at) => at >= treatment!.start && at < treatment!.end).length
        : null,
      components,
      receiptChecks,
      raw: sha256(compressed),
      schedule: clock?.offers ?? [],
    };
    save(join(folder, "verified.json"), result);
    for (const { t } of saves) t.tape.keepLatest();
    console.log(
      JSON.stringify({
        verifiedBlock: cycle,
        rate,
        policy,
        spacing,
        count: offers.length,
        missed: clock?.misses ?? null,
        dropped: screen.reason,
      }),
    );
    return { result, baselineSaves, publishSaves };
  } finally {
    await Promise.all(readers.map((r) => r.close()));
  }
}

export async function run(dir: string, attempt: Identity) {
  assert(process.env.DX_JOIN_TIMING_DIR, "Joined timing requires the lab measurement lock");
  await gate(dir, attempt);
  const n = 10000,
    count = 100,
    rates = [3.5, 23.5, 39.4],
    cadences = [5000, 1000],
    policies = ["fifo", "priority"] as const;
  const plan = rates.flatMap((rate, i) =>
    cadences.flatMap((spacing, j) =>
      Array.from({ length: 4 }, (_, k) => ({ rate, spacing, policy: policies[(i + j + k) % 2]! })),
    ),
  );
  save(join(dir, "campaign.json"), { attempt, n, count, seats, plan });
  const scope = "lazy-study-" + attempt.nonce,
    target = await setup(scope, n, attempt.nonce, "joined-target"),
    neighbors: Target[] = [],
    ref = new Reference();
  try {
    for (const i of [1, 2])
      neighbors.push(
        await setup(scope + "-neighbor-" + i, 96, attempt.nonce, "joined-neighbor-" + i),
      );
    type Window = Awaited<ReturnType<typeof block>>;
    const windows: { cycle: number; window: Window }[] = [];
    const dropped = new Map<number, number>();
    for (const [cycle, item] of plan.entries()) {
      if (dropped.has(item.rate)) continue;
      console.log(JSON.stringify({ cycle, ...item, plannedOffers: count }));
      const { policy, rate, spacing } = item;
      const window = await block(
        join(dir, "cell-" + cycle),
        attempt,
        target,
        neighbors,
        policy,
        rate,
        spacing,
        count,
        cycle,
        ref,
      );
      windows.push({ cycle, window });
      // [DX-ACT2] Why: all four cells at a rate have the same save-only admission requirement. Rejected: measuring another cadence on a rate the baseline cannot sustain.
      if (window.result.screen.reason) dropped.set(rate, cycle);
    }
    const pooled = rates.flatMap((rate) =>
      cadences.flatMap((spacing) =>
        policies.map((policy) => {
          const group = windows.filter(
            ({ window: { result: r } }) =>
              r.rate === rate && r.spacing === spacing && r.policy === policy,
          );
          const offers = group.flatMap(({ window }) => window.result.schedule);
          const coordinates = { rate, spacing, policy, blocks: group.map((b) => b.cycle) };
          if (offers.length !== 2 * count) {
            assert(dropped.has(rate));
            return {
              ...coordinates,
              status: "save-only dropped",
              screenBlock: dropped.get(rate),
              offers: offers.length,
              plannedOffers: 2 * count,
            };
          }
          const completed = offers.flatMap((o) => (o.done === null ? [] : [o.done]));
          const firsts = offers.flatMap((o) => (o.firstReadMs === null ? [] : [o.firstReadMs]));
          const components = group.flatMap(({ window }) => window.result.components);
          const staged = components.flatMap((item) => (item.stages ? [item.stages] : []));
          const stages = Object.fromEntries(
            (["toFront", "transaction", "learn", "firstRead"] as const).map((key) => [
              key,
              distribution(staged.map((stage) => stage[key])),
            ]),
          );
          return {
            ...coordinates,
            status: "measured",
            offers: offers.length,
            completeRecord: distribution(completed),
            completeFirst: distribution(firsts),
            scheduledRecordP99:
              completed.toSorted((a, b) => a - b)[Math.ceil(offers.length * 0.99) - 1] ?? null,
            scheduledFirstP99:
              firsts.toSorted((a, b) => a - b)[Math.ceil(offers.length * 0.99) - 1] ?? null,
            missed: offers.filter((o) => o.missed).length,
            unrecorded: offers.filter((o) => o.lastOwedMs === null).length,
            stages,
            targetSaves: {
              baseline: distribution(group.flatMap(({ window }) => window.baselineSaves[0]!)),
              publish: distribution(group.flatMap(({ window }) => window.publishSaves![0]!)),
            },
            pressure: group.map(({ window }) => window.result.pressure),
          };
        }),
      ),
    );
    save(join(dir, "queue-study.json"), {
      pooled,
      attempt,
      n,
      population: target.fixture.facts,
      plan,
      offersPerBlock: count,
      blocks: windows.map(({ cycle, window }) => ({ cycle, ...window.result })),
    });
  } finally {
    ref.oracle.close();
    await Promise.all([target, ...neighbors].map((t) => t.store.close()));
  }
}
