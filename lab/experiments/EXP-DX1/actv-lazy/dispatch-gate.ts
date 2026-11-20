import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { writeFileSync } from "node:fs";
import { W0, canonical, sha256, triplexValue } from "../../../bench/lib/w0-world.ts";
import { DomainOracle } from "../../../bench/lib/w0-gates.ts";
import { parseOutbox } from "../../../bench/lib/w0-outbox-state.ts";
import { Dispatcher, Receiver } from "./dispatch.ts";
import { itemRoot, pendingRoot, progress, propose, admitLive } from "./decision.ts";
import { activation, fact, openStore } from "./store.ts";
import { LazyReader, rosterRoot, rosterSeal } from "./read.ts";

const dir = process.argv[2]!,
  id = randomUUID(),
  scope = "lazy-dispatch-" + id,
  at = W0.POPULATION_VALID_TIME,
  one = "pl:a",
  two = "pl:b";
let store = await openStore(scope),
  consumer = new Dispatcher(store, "w0", 1);
const oracle = new DomainOracle(),
  known: { e: string; a: string; v: any; tx: number }[] = [],
  sources: { p: number; release: string; people: string[] }[] = [],
  events: any[] = [];
const identities = [one, two];
let state: any = { items: [], pending: [], subjects: [] },
  receiver: any = { effects: [], projection: [] };
const before = new Map<string, W0.Delivery[]>();
function assertFact(e: string, a: string, v: any) {
  return { op: "assert", entityId: e, attribute: a, value: triplexValue(a, v), validFrom: 0 };
}
const pack = (d: any) => ({ ...d, seq: Number(d.seq), payload: JSON.parse(d.payload) });
async function reopen() {
  consumer.close();
  await store.close();
  store = await openStore(scope);
  consumer = new Dispatcher(store, "w0", 1);
}
try {
  const facts = [
    [one, "location", "loc:a"],
    [one, "payRateCents", 1600],
    [two, "location", "loc:a"],
    [two, "payRateCents", 1675],
    [two, "bgcStatus", "clear"],
    ["loc:a", "jurisdiction", "jur:a"],
    ["jur:a", "stateMinWageCents", 1650],
    ["loc:a", "localMinWageCents", 1700],
  ] as const;
  const seed = await store.input("people", { kind: "baseline", at }, [
    ...facts.map((a) => assertFact(...(a as [string, string, any]))),
    fact(rosterRoot(0), "lazy/members", identities),
    fact("members/seal", "lazy/roster-seal", rosterSeal(identities)),
  ]);
  for (const [e, a, v] of facts) known.push({ e, a, v, tx: seed.position });
  for (const [k, r] of [W0.R1, W0.R2, W0.R3, W0.R2, W0.R1, W0.R2].entries()) {
    const tx = await activation(store, "release-" + k, r, at);
    sources.push({ p: tx.position, release: r.name, people: identities });
  }
  const held = await propose(store, "w0", one);
  assert.equal((await admitLive(store, "w0", held)).status, "deferred");
  let lostCommand = "";
  await assert.rejects(
    consumer.step(async (when, cmd) => {
      if (when === "before-commit") {
        lostCommand = cmd;
        throw Error("interrupted before commit");
      }
    }),
    /interrupted/,
  );
  assert.equal(await store.lookup(lostCommand), null);
  await reopen();
  await assert.rejects(
    consumer.step(async (when, cmd) => {
      if (when === "after-commit") {
        assert.equal(cmd, lostCommand);
        throw Error("lost acknowledgement");
      }
    }),
    /lost acknowledgement/,
  );
  const original = await store.lookup(lostCommand);
  assert(original);
  await reopen();
  assert.deepEqual(await store.lookup(lostCommand), original);
  const contender = new Dispatcher(store, "w0", 1),
    go = Promise.withResolvers<void>();
  let arrived = 0;
  const barrier = async (z: string) => {
    if (z === "before-commit") {
      if (++arrived === 2) go.resolve();
      await go.promise;
    }
  };
  try {
    const [a, b] = await Promise.all([consumer.step(barrier), contender.step(barrier)]);
    assert(a && b && a.receipt.txId === b.receipt.txId);
    assert(a.changedSubjects.length > 0);
  } finally {
    contender.close();
  }
  await consumer.drain((r) =>
    events.push({
      id: r.id,
      p: r.event,
      subjects: r.subjects,
      examined: r.examined,
      reason: r.reason,
      complete: r.complete,
    }),
  );
  assert(
    !events.some((r) => (r.p === sources[2]!.p || r.p === sources[3]!.p) && r.subjects.length),
  );
  for (const e of sources) {
    const records = [];
    for (const person of e.people) {
      const world = {
          subject: person,
          facts: known.filter((x) => x.e === person || !x.e.startsWith("pl:")),
        },
        b = { tx: e.p, validTime: at };
      const x = JSON.parse(await oracle.call("evaluate", { world, release: e.release, basis: b }));
      records.push({ subject: person, basis: b, release: x.release, workItems: x.workItems });
    }
    state = JSON.parse(await oracle.call("publish", { state, evaluations: records })).state;
  }
  const p = await store.head();
  for (const person of identities) {
    const items = (await store.rows([itemRoot(person)], p))
      .flatMap((r) => parseOutbox(r.value.value))
      .map(pack)
      .sort((a, b) => a.id.localeCompare(b.id));
    assert.deepEqual(
      items,
      state.items.filter((i: any) => i.subject === person),
    );
    const pending = (await store.rows([pendingRoot(person)], p))
      .map((r) => ({ position: r.position, id: r.id, d: parseOutbox(r.value.value) }))
      .sort((a, b) => a.position - b.position || a.d.id.localeCompare(b.d.id));
    assert.deepEqual(
      pending.map((o) => pack(o.d)),
      state.pending.filter((i: any) => i.subject === person),
    );
    before.set(
      person,
      pending.map((o) => o.d),
    );
  }
  const wages = before.get(one)!.filter((d) => d.kind === "notify.pay-below-minimum");
  assert.deepEqual(
    wages.map((d) => [Number(d.seq), JSON.parse(d.payload).floorCents]),
    [
      [1, 1650],
      [2, 1700],
      [3, 1650],
      [4, 1700],
    ],
  );
  assert.deepEqual(
    before.get(two)!.map((d) => Number(d.seq)),
    [1, 2],
  );
  const rxFile = join(dir, "recipient.sqlite");
  let rx = new Receiver(rxFile, scope, seed.txId);
  try {
    const firstDelivery = before.get(one)![0]!;
    const cross = (await store.rows([pendingRoot(one)], p)).find(
      (row) => parseOutbox(row.value.value).id !== firstDelivery.id,
    )!;
    assert(cross);
    await assert.rejects(rx.send(store, one, cross.id), /Earlier unacknowledged/);
    const later = (await store.rows([pendingRoot(one)], p)).find(
      (r) => parseOutbox(r.value.value).seq === 2n,
    )!;
    await assert.rejects(rx.send(store, one, later.id), /Earlier unacknowledged/);
    for (const stage of ["before-receive", "after-receive", "after-ack"]) {
      await assert.rejects(
        rx.send(store, one, undefined, (step) => {
          if (step === stage) throw Error(stage);
        }),
        new RegExp(stage),
      );
      rx.close();
      rx = new Receiver(rxFile, scope, seed.txId);
      await reopen();
    }
    await rx.drain(store);
    const actual = rx.effects();
    for (const person of identities)
      assert.deepEqual(
        actual.filter((d) => d.subject === person).map(pack),
        before.get(person)!.map(pack),
      );
    for (const d of actual) {
      const o = JSON.parse(
        await oracle.call("receive", { state: receiver, deliveries: [pack(d), pack(d)] }),
      );
      assert.deepEqual(o.applied.effects, [pack(d)]);
      receiver = o.state;
    }
    assert.equal(await rx.drain(store), 0);
    assert.equal((await store.rows(identities.map(pendingRoot), await store.head())).length, 0);
    writeFileSync(
      join(dir, "dispatcher.json"),
      canonical({
        id,
        scope,
        seed: seed.txId,
        original: original.txId,
        events,
        effects: actual.map(pack),
        receiver,
        legacyGuards: state.subjects,
        runtimeGuards: [],
        queryPlans: consumer.queryPlans,
      }) + "\n",
      { flag: "wx" },
    );
  } finally {
    rx.close();
  }
} finally {
  consumer.close();
  oracle.close();
  await store.close();
}
