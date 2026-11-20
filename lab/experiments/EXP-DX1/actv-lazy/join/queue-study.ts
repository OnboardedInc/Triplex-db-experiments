import assert from "node:assert/strict";
import { gzipSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { monitorEventLoopDelay } from "node:perf_hooks";
import { W0, canonical, sha256, type WorldRow } from "../../../../bench/lib/w0-world.ts";
import { ids, type Fact } from "../../../../bench/lib/world.ts";
import { integer } from "../../../../bench/lib/deep-world.ts";
import { measureW0Http } from "../../../../bench/lib/w0-http.ts";
import type { Tail } from "../../notify1/journal.ts";
import { makeDeepTrace } from "../../../../bench/lib/deep-trace.ts";
import { liveEdits } from "../../scale1/deep-live.ts";
import { scoreClock, type Offered, type RawDecision } from "../../actv-delta/audit-clock.ts";
import { measured } from "../../actv-delta/measure-lock.ts";
import { waitsUntil } from "../../actv-delta/audit-offers.ts";
import { seed, valid } from "../fixture.ts";
import { millis, openStore, type Store } from "../store.ts";
import { AccountAdmission, type AdmissionPolicy, type PublishObservation } from "./admission.ts";
import { liveGateway, run as gate } from "./admission-gate.ts";
import { JoinedAccount } from "./account.ts";
import { authoredSeed, authoredWrite, expectedPolicy } from "./deep-reference.ts";
import { Reference } from "./check.ts";

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
type Sample = RawDecision & { learned: number };
type Receipt = { commandId: string; position: number; txId: string; changes: any[] };
const paths = ["public", "independent-route"] as const;
const save = (file: string, value: unknown) =>
  writeFileSync(file, JSON.stringify(value) + "\n", { flag: "wx" });
const ms = () => performance.now();
const finite = (xs: readonly number[]) => {
  const ordered = [...xs].sort((a, b) => a - b);
  assert(ordered.every(Number.isFinite));
  return ordered.length
    ? {
        n: ordered.length,
        p50: ordered[Math.ceil(ordered.length * 0.5) - 1],
        p99: ordered[Math.ceil(ordered.length * 0.99) - 1],
        max: ordered.at(-1),
      }
    : { n: 0, p50: null, p99: null, max: null };
};

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
  private readonly events;
  private next = 0;
  private readonly fieldAt = millis(valid);
  private readonly fixture: Awaited<ReturnType<typeof seed>>;
  constructor(fixture: Awaited<ReturnType<typeof seed>>, tape: string) {
    this.fixture = fixture;
    this.events = makeDeepTrace(tape, fixture.n, 14000).events.filter((e) => !e.resend);
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
    const fixture = await seed(store, n);
    await new JoinedAccount(store).install(fixture.roster, valid, true);
    return { store, fixture, tape: new SourceTape(fixture, tape) };
  } catch (e) {
    await store.close();
    throw e;
  }
}

async function block(
  folder: string,
  attempt: Identity,
  target: Target,
  neighbors: readonly Target[],
  policy: AdmissionPolicy,
  rate: number,
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
      saves = [target, ...neighbors].map((t, i) => ({
        t,
        index: i,
        writer: i ? new JoinedAccount(t.store, new AccountAdmission(policy)) : account,
        receipts: [] as {
          command: string;
          started: number;
          served: number;
          scheduled: number;
          position: number;
          txId: string;
          intent: string;
        }[],
      })),
      errors: string[] = [],
      raw: Sample[] = [],
      offers: Entry[] = [];
    let pressure: unknown;
    await measured(async () => {
      const startCpu = await cpu(attempt),
        delay = monitorEventLoopDelay({ resolution: 20 }),
        spacing = 250,
        opened = ms() + 500,
        first = opened + 2000,
        duration = first - opened + (count - 1) * spacing + 1200,
        schedule = Array.from({ length: count }, (_, i) => ({
          order: i,
          id: `study-${cycle}-${i}`,
          scheduled: first + i * spacing,
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
      delay.enable();
      let running = true;
      const capture = async (
        route: number,
        person: number,
        phase: RawDecision["phase"],
        offer?: number,
      ) => {
        const invoked = ms(),
          position = await readers[route]!.head(),
          learned = ms(),
          id = fixture.roster[person]!;
        const r = await routes[route]!.readAt(id, { position, validTime: valid });
        assert.equal(r.basis.tx, position);
        raw.push({
          phase,
          route: paths[route]!,
          offer,
          id,
          invoked,
          learned,
          returned: ms(),
          position,
          seq: position,
          raw: r.json,
        });
      };
      const keep = (e: unknown) => {
        errors.push(String(e));
      };
      const background = Array.from({ length: 64 }, (_, i) =>
        (async () => {
          let next = i;
          while (running) {
            await capture(i % 2, next % (fixture.n - count), "traffic");
            next += 67;
          }
        })().catch(keep),
      );
      const senders = saves.map(async ({ t, index, writer, receipts }) => {
        const hz = index ? 1.6 : rate;
        const pending = [];
        for (let k = 0; hz && (k * 1000) / hz < duration; k++) {
          const scheduled = opened + (k * 1000) / hz;
          await waitsUntil(scheduled);
          const edit = t.tape.fields(),
            command = `study-save-${cycle}-${index}-${k}`,
            started = ms();
          pending.push(
            writer
              .saveDeep(command, edit.person, { fields: edit.fields, from: edit.from }, valid)
              .then((r: Receipt) => {
                t.tape.committed(edit.person, edit.fields, r);
                receipts.push({
                  command,
                  started,
                  served: ms(),
                  scheduled,
                  position: r.position,
                  txId: r.txId,
                  intent: sha256(canonical(edit)),
                });
              })
              .catch(keep),
          );
        }
        await Promise.all(pending);
      });
      const pending: Promise<unknown>[] = [];
      try {
        for (const x of schedule) {
          await waitsUntil(x.scheduled);
          const ingress = ms(),
            doc = structuredClone((x.order % 2 ? W0.R3 : W0.R2).doc),
            tweak = doc.rules.find((rule) => rule.id === "PAYCHG")!;
          Object.assign(tweak.params, { thresholdCents: 1000 + cycle * 1000 + x.order });
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
          pending.push(
            waitsUntil(x.scheduled + 1000)
              .then(() => Promise.all(paths.map((_, i) => capture(i, person, "deadline", x.order))))
              .catch(keep),
          );
          pending.push(
            measureW0Http(() =>
              account.publish(x.id, doc, valid, "owed", undefined, { observation: o.observation }),
            )
              .then(async ({ value: r, nativeFrames, samples }) => {
                const write = o.observation.attempts.at(-1);
                assert(write && r.changes.length === 4);
                o.requests = samples.filter((sample) => String(sample.path).endsWith("/transact"));
                o.frames = nativeFrames;
                o.receiptClock = write.nativeAck === undefined ? "readback" : "native-ack";
                o.ack = {
                  at: write.nativeAck ?? ms(),
                  position: r.position,
                  seq: r.position,
                  txId: r.txId,
                };
                o.owed = { at: o.ack.at, position: r.position };
                await Promise.all(paths.map((_, i) => capture(i, person, "first", x.order)));
              })
              .catch((e) => {
                o.error = String(e);
              }),
          );
        }
        await Promise.all(pending);
      } finally {
        running = false;
        delay.disable();
        const stopCpu = await cpu(attempt);
        pressure = {
          start: startCpu,
          stop: stopCpu,
          nodeEventLoopP99Ms: delay.percentile(99) / 1e6,
        };
        await Promise.all([...background, ...senders]);
      }
    });
    const compressed = gzipSync(raw.map((x) => JSON.stringify(x) + "\n").join(""));
    writeFileSync(join(folder, "reads.ndjson.gz"), compressed, { flag: "wx" });
    save(join(folder, "observed.json"), {
      attempt,
      scope: store.scope,
      pressure,
      offers,
      errors,
      saves: saves.map(({ receipts }) => receipts),
      raw: sha256(compressed),
    });
    assert.equal(errors.length, 0, errors[0]);
    assert.equal(offers.length, count);
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
    const clock = scoreClock(offers, raw, paths, "record"),
      clocks = clock.offers.map((o) => o.done).filter((n): n is number => n !== null),
      firsts = clock.offers.flatMap((o) => (o.firstReadMs === null ? [] : [o.firstReadMs])),
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
            queueBehindSaves: obs.turn.waitingForSavesMs,
            queueBehindPublishes: obs.turn.waitingForPublishesMs,
            headAndPlan: a.prepared - a.started,
            submissionAndNative: o.ack.at - a.prepared,
            nativeTimings: o.requests?.[0]?.timeline,
            fenceMs: 0,
            graceMs: 0,
            readerHead: reply ? reply.learned - reply.invoked : null,
            readerAfterHead: reply ? reply.returned - reply.learned : null,
            conflicts: obs.attempts.filter((x) => x.conflict).length,
          },
        ];
      });
    const result = {
      attempt,
      scope: store.scope,
      policy,
      rate,
      count,
      pressure,
      missed: clock.misses,
      stale: clock.stale,
      record: finite(clocks),
      first: finite(firsts),
      observations: raw.length,
      components,
      receiptChecks,
      raw: sha256(compressed),
      schedule: clock.offers,
    };
    save(join(folder, "verified.json"), result);
    return result;
  } finally {
    await Promise.all(readers.map((r) => r.close()));
  }
}

export async function run(dir: string, attempt: Identity) {
  await gate(dir, attempt);
  const n = Number(process.env.DELTA_JOINED_PEOPLE ?? 10000),
    count = Number(process.env.DELTA_JOINED_OFFERS ?? 100);
  assert([1000, 10000].includes(n) && [4, 100].includes(count));
  const scope = "lazy-study-" + attempt.nonce,
    target = await setup(scope, n, attempt.nonce, "joined-target"),
    neighbors: Target[] = [],
    ref = new Reference();
  try {
    for (const i of [1, 2])
      neighbors.push(
        await setup(scope + "-neighbor-" + i, 96, attempt.nonce, "joined-neighbor-" + i),
      );
    const windows: Awaited<ReturnType<typeof block>>[] = [];
    for (const rate of [3.5, 23.5, 39.4])
      for (const policy of ["fifo", "priority", "priority", "fifo"] as const) {
        const i = windows.length;
        console.log(JSON.stringify({ cell: i, rate, policy, offers: count }));
        windows.push(
          await block(
            join(dir, "cell-" + i),
            attempt,
            target,
            neighbors,
            policy,
            rate,
            count,
            i,
            ref,
          ),
        );
      }
    const pooled = [3.5, 23.5, 39.4].flatMap((rate) =>
      (["fifo", "priority"] as const).map((policy) => {
        const group = windows.filter((w) => w.policy === policy && w.rate === rate);
        assert.equal(group.length, 2);
        const offers = group.flatMap((w) => w.schedule);
        assert.equal(offers.length, count * 2);
        return {
          rate,
          policy,
          offers: offers.length,
          record: finite(offers.flatMap((o) => (o.done === null ? [] : [o.done]))),
          first: finite(offers.flatMap((o) => (o.firstReadMs === null ? [] : [o.firstReadMs]))),
          missed: offers.filter((o) => o.missed).length,
          stale: group.reduce((n, w) => n + w.stale, 0),
          pressure: group.map((w) => w.pressure),
        };
      }),
    );
    save(join(dir, "queue-study.json"), {
      pooled,
      attempt,
      n,
      population: target.fixture.facts,
      matchedOffersPerCell: count,
      cells: windows,
    });
  } finally {
    ref.oracle.close();
    await Promise.all([target, ...neighbors].map((t) => t.store.close()));
  }
}
