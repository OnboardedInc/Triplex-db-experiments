import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
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
  const { epoch, source, receiver, inputs, a, worker } = await setup(130);
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
      t = await a.observe();
    const before = await source.currentPosition();
    const interrupted = new Notices(
      {
        ...source,
        transact: async () => {
          throw Error("before activation");
        },
      },
      "account",
      inputs,
    );
    await assert.rejects(interrupted.append(t, broad), /before activation/);
    assert.equal(await source.currentPosition(), before);
    const lost = new Notices(
      {
        ...source,
        transact: async (...args) => {
          const result = await source.transact(...args);
          assert(result.ok);
          throw Error("lost durable source reply");
        },
      },
      "account",
      inputs,
    );
    await assert.rejects(lost.append(t, broad), /lost durable source reply/);
    const { receipt } = await append(broad);
    assert(receipt.position > before);
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
      if (process.env.NOTIFY_NATIVE === "1") {
        for (const action of ["effect-before-ack", "finish"]) {
          const nonce = randomUUID(),
            scope = "notify-" + epoch;
          const receipt = JSON.parse(
            execFileSync(
              process.execPath,
              [
                "--experimental-strip-types",
                fileURLToPath(new URL("./restart.ts", import.meta.url)),
              ],
              {
                input: JSON.stringify({ nonce, scope, subject, erased: erased.position, action }),
                encoding: "utf8",
                timeout: 120000,
              },
            ),
          );
          assert(
            receipt.scope === scope &&
              receipt.nonce === nonce &&
              receipt.action === action &&
              receipt.position >= erased.position &&
              receipt.receiver > 0,
          );
        }
      } else {
        await assert.rejects(
          restarted.drain({
            afterReceive: async () => {
              throw Error("lost receiver acknowledgement");
            },
          }),
          /lost receiver acknowledgement/,
        );
        await restarted.drain();
      }
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
      const oldHead = await fresh.currentPosition(),
        oldSink = await freshSink.currentPosition();
      await restarted.drain();
      assert.equal(await fresh.currentPosition(), oldHead);
      assert.equal(await freshSink.currentPosition(), oldSink);
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
    let resume!: () => void, stuck!: () => void;
    const stalled = new Promise<void>((r) => (resume = r)),
      entered = new Promise<void>((r) => (stuck = r));
    quiet.worker = new Dispatcher(quiet.a, busy.sink);
    const quietDrain = quiet.worker.drain.bind(quiet.worker);
    let finished!: () => void;
    const quietComplete = new Promise<void>((r) => (finished = r));
    quiet.worker.drain = async (opts) => {
      await entered;
      const result = await quietDrain(opts);
      finished();
      return result;
    };
    const drain = drainAccounts([
      {
        worker: busy.worker,
        afterReceive: async () => {
          stuck();
          await stalled;
        },
      },
      { worker: quiet.worker },
    ]);
    try {
      await Promise.race([
        quietComplete,
        drain.then(() => {
          throw Error("Quiet account failed to finish");
        }),
      ]);
      assert((await quiet.worker.effects()).length > 0);
      const cur = await quiet.a.db.get<{ pending: string | null; event: number }>(
        "cursor",
        await quiet.a.db.head(),
      );
      assert(cur.value.pending === null && cur.value.event === 2);
      assert(
        (await busy.a.db.get<{ pending: string }>("cursor", await busy.a.db.head())).value.pending,
      );
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
