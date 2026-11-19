import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { memoryComposition } from "../../../bench/lib/memory.ts";
import { W0, canonical } from "../../../bench/lib/w0-world.ts";
import { Dispatcher, drainAccounts } from "./dispatcher.ts";
import { Notices, type Request, type Cut } from "./journal.ts";
import { Fixture } from "./fixture.ts";
import { Documents, hash } from "./store.ts";
import { verify, type Offered } from "./verify.ts";

const v = W0.POPULATION_VALID_TIME,
  first = "2026-11-01T00:00:00.000000Z";
export const release = (id: string, r: Request["release"]): Request => ({
  id,
  kind: "activation",
  selection: { kind: "census" },
  release: r,
  from: first,
  validTime: v,
});
const open = async (scope: string) =>
  process.env.NOTIFY_NATIVE === "1"
    ? (await import("../../../bench/lib/composition.ts")).openComposition("reach", "datomic", scope)
    : memoryComposition("datomic", scope);
async function setup(n: number) {
  const epoch = randomUUID(),
    scope = "notify-" + epoch,
    source = await open(scope),
    receiver = await open(scope + "-sink");
  const inputs = new Fixture(source),
    a = new Notices(source, "account", inputs),
    sink = new Documents(receiver, "sink");
  await inputs.seed(n);
  await a.create(epoch, v);
  return { epoch, source, receiver, inputs, a, sink, worker: new Dispatcher(a, sink) };
}
test("owed batches survive two releases, a newer save, erasure, lost ACKs and restart", async () => {
  const { epoch, source, receiver, inputs, a, sink, worker } = await setup(130);
  const events: Offered[] = [];
  try {
    const append = async (req: Request) => {
      const t = await a.observe(),
        receipt = await a.append(t, req);
      events.push({ req, receipt });
      return { t, receipt };
    };
    const initial = await append(release("initial", "R1"));
    await worker.drain();
    const broad = release("broad", "R2"),
      { t, receipt } = await append(broad);
    assert.deepEqual(await a.append(t, broad), receipt);
    await assert.rejects(a.append(t, { ...broad, release: "R3" }), /mismatch/);
    await assert.rejects(a.append(initial.t, release("stale", "R2")), /precondition/);
    assert(await worker.turn());
    const subject = W0.placementId(0);
    const edit = await inputs.edit(
      subject,
      { payRateCents: 1500 },
      { position: await a.db.head(), validTime: v },
    );
    const save: Request = {
      ...broad,
      id: "live-pay",
      kind: "reconcile",
      selection: { kind: "subjects", ids: [subject] },
    };
    events.push({
      req: save,
      receipt: await a.append(await a.observe(), save, edit.ops, edit.checks),
    });
    await append(release("rollback", "R1"));
    const erasure = { ...save, id: "erase", release: "R1", kind: "erase" } as const;
    const change = await inputs.edit(
      subject,
      { ssn: { erasedAt: v } },
      { position: await a.db.head(), validTime: v },
    );
    const erased = await a.erase(await a.observe(), erasure, change.ops, change.checks);
    events.push({ req: erasure, receipt: erased });
    const fresh = await open("notify-" + epoch),
      freshSink = await open("notify-" + epoch + "-sink");
    try {
      const pinned = new Fixture(fresh);
      const protectedInput = {
        identity: pinned.identity,
        roster: (c: Cut) => pinned.roster(c),
        worlds: (ids: string[], c: Cut) => {
          assert(
            !(ids.includes(subject) && c.position < erased.position),
            "Attempt to reopen erased input",
          );
          return pinned.worlds(ids, c);
        },
      };
      const restarted = new Dispatcher(
        new Notices(fresh, "account", protectedInput),
        new Documents(freshSink, "sink"),
      );
      await assert.rejects(
        restarted.drain({
          afterReceive: async () => {
            throw Error("lost receiver acknowledgement");
          },
        }),
        /lost receiver acknowledgement/,
      );
      await restarted.drain();
      const proof = await verify(
        restarted,
        await inputs.roster({ position: erased.position, validTime: v }),
        events,
        (s, c) => inputs.worlds(s, c),
      );
      assert(proof.eventCounts[1]! > 0 && proof.eventCounts[2] === 1);
      const pay = (await restarted.effects()).filter(
        (d) => d.subject === subject && d.rule === "MINWAGE",
      );
      assert.deepEqual(
        pay.map((d) => d.seq),
        [1n, 2n, 3n, 4n],
      );
      assert.deepEqual(
        pay.map((d) => JSON.parse(d.payload).floorCents),
        [1650, 1700, 1700, 1650],
      );
      assert(
        !canonical(
          (await a.db.get("erase-proof:" + hash(subject) + ":1", erased.position)).value,
        ).includes("000000000"),
      );
      assert.equal((await restarted.drain()).deliveries, restarted.metrics.deliveries);
    } finally {
      await fresh.close();
      await freshSink.close();
    }
  } finally {
    await source.close();
    await receiver.close();
  }
});
test("a busy account stalled after delivery lets a quiet account finish", async () => {
  const busy = await setup(129),
    quiet = await setup(3);
  try {
    for (const t of [busy, quiet]) await t.a.append(await t.a.observe(), release("open", "R1"));
    let resume!: () => void, quietFinished!: () => void;
    const stalled = new Promise<void>((r) => (resume = r)),
      done = new Promise<void>((r) => (quietFinished = r));
    const drain = drainAccounts([
      { worker: busy.worker, afterReceive: () => stalled },
      { worker: quiet.worker, afterReceive: async () => quietFinished() },
    ]);
    await done;
    try {
      assert((await quiet.worker.effects()).length > 0);
      assert((await busy.a.observe()).value.sequence === 1);
    } finally {
      resume();
    }
    assert((await drain).every((r) => r.status === "fulfilled"));
  } finally {
    for (const t of [busy, quiet]) {
      await t.source.close();
      await t.receiver.close();
    }
  }
});
