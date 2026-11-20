import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { W0, sha256 } from "../../../../bench/lib/w0-world.ts";
import { generateTrace, traceDigest } from "../../../../bench/lib/trace.ts";
import { buildTraceCommand } from "../../../../bench/lib/commands.ts";
import { ids } from "../../../../bench/lib/world.ts";
import { seed, valid } from "../fixture.ts";
import { millis, openStore } from "../store.ts";
import { JoinedAccount } from "./account.ts";
import { rawDeep } from "./deep.ts";
import { BulkQueue } from "./bulk.ts";
import { Settlement } from "./settlement.ts";
import { Reference } from "./check.ts";
import { authoredSeed, expectedPolicy } from "./deep-reference.ts";
import { measure } from "./measure.ts";

const out = process.argv[2]!,
  seconds = Number(process.argv[3] ?? 45),
  n = 128;
assert(out && Number.isInteger(seconds) && seconds > 0 && seconds <= 180);
// [DX-ACT1] Why: keep the published tape seed and draw an exact time prefix for this fixture rung. Rejected: a custom seed or a sped-up burst to fit the local lease.
const tapeSeed = "ns-v2";
const events = generateTrace({ seed: tapeSeed, subjects: n, durationS: 5910 }).filter(
  (event) => event.atMs < seconds * 1000,
);
const tape = traceDigest(events),
  business = (offset: number) =>
    new Date(millis(valid) + Math.max(0, Math.floor(offset))).toISOString().replace("Z", "000Z");
const observed = [];
for (const loaded of [false, true]) {
  const source = await openStore("lazy-interference-" + randomUUID(), "act2-deep"),
    a = new JoinedAccount(source);
  const fixture = await seed(source, n),
    queue = new BulkQueue(0.6),
    ref = new Reference();
  await a.install(fixture.roster, valid);
  const first = await a.publish("initial", W0.R1.doc, valid, "owed"),
    worker = await Settlement.open(a, queue);
  await worker.recorder.record(1);
  const reads: { p: number; time: string; subject: number; ms: number; hash: string }[] = [];
  const writes: {
    index: number;
    command: string;
    p: number;
    tx: string;
    ms: number;
    replayed: boolean;
  }[] = [];
  const originals = new Map();
  const result = await measure(async () => {
    const start = performance.now() + 100,
      ending = start + seconds * 1000;
    let writer = Promise.resolve();
    const order = <T>(go: () => Promise<T>) => {
      const actual = writer.then(go);
      writer = actual.then(() => {});
      void writer.catch(() => {});
      return actual;
    };
    const traffic = (async () => {
      for (const [index, ev] of events.entries()) {
        const offered = start + ev.atMs;
        await sleep(Math.max(0, offered - performance.now()));
        void order(() =>
          queue.live(async () => {
            const original = originals.get(ev.seq);
            if (ev.resend) {
              assert(original);
              const r = await a.saveDeep(
                original.cmd.commandId,
                ev.subject,
                original.cmd.operations,
                original.time,
              );
              assert.deepEqual(r, original.receipt);
              writes.push({
                index,
                command: r.commandId,
                p: r.position,
                tx: r.txId,
                ms: performance.now() - offered,
                replayed: true,
              });
              return;
            }
            const time = business(ev.atMs),
              p = await source.head(),
              raw = await rawDeep(source, ev.subject, { tx: p, validTime: time });
            const stamp = raw.find(
              (r) => r.entityId === ids.placement(ev.subject) && r.attribute === ":placement/stamp",
            );
            const address = raw.find(
              (r) => r.entityId === ids.worker(ev.subject) && r.attribute === ":worker/address",
            );
            assert(stamp && address);
            const cmd = buildTraceCommand({
              runTag: "frozen",
              event: ev,
              scheduledAbsMs: millis(time),
              state: {
                stamp: Number(stamp.value.value),
                stampId: stamp.id,
                stampValidFrom: stamp.validFrom,
                address: String(address.value.value),
                addressId: address.id,
                addressValidFrom: address.validFrom,
              },
            });
            assert.equal(cmd.added.length, ev.facts);
            const r = await a.saveDeep(cmd.commandId, ev.subject, cmd.operations, time);
            if (ev.ackLoss)
              assert.deepEqual(
                await a.saveDeep(cmd.commandId, ev.subject, cmd.operations, time),
                r,
              );
            originals.set(ev.seq, { cmd, time, receipt: r });
            writes.push({
              index,
              command: r.commandId,
              p: r.position,
              tx: r.txId,
              ms: performance.now() - offered,
              replayed: ev.ackLoss,
            });
          }),
        ).catch(() => {});
      }
      await writer;
    })();
    const reader = a.reader();
    const readers = Promise.all(
      Array.from({ length: 64 }, (_, id) =>
        (async () => {
          await sleep(Math.max(0, start - performance.now()));
          for (let i = 0; performance.now() < ending; i++) {
            const t = performance.now(),
              seen = await source.head(),
              ordinal = i * 64 + id;
            const p =
              ordinal % 20 === 0
                ? first.position
                : ordinal % 5 === 0
                  ? Math.max(first.position, seen - 1)
                  : seen;
            const subject = (ordinal * 37) % n,
              time = business(t - start);
            const r = await reader.readAt(fixture.roster[subject]!, {
              position: p,
              validTime: time,
            });
            assert.deepEqual(r.basis, { tx: p, validTime: time });
            reads.push({ p, time, subject, ms: performance.now() - t, hash: sha256(r.json) });
          }
        })(),
      ),
    );
    const published = (async () => {
      if (!loaded) return null;
      const offset = Math.floor((seconds * 1000) / 3),
        when = start + offset;
      await sleep(Math.max(0, when - performance.now()));
      const offer = performance.now(),
        doc = structuredClone(W0.R2.doc);
      Object.assign(doc.rules.find((x) => x.id === "I9S2")!, { params: { businessDays: 5 } });
      // [DX-ACT1] Why: ingress is offered into exactly the same live queue as the fixed saves. Rejected: starting the clock only after waiting for the writer to catch up.
      const tx = await order(() =>
        queue.live(() => a.publish("observed-release", doc, business(offset), "owed")),
      );
      return {
        tx,
        doc,
        from: business(offset),
        offerToReturnMs: performance.now() - offer,
        terminal: await worker.settle(2, offer),
      };
    })();
    const [, , result] = await Promise.all([traffic, readers, published]);
    return result;
  });
  assert.equal(writes.length, events.length);
  for (const r of reads) {
    const doc =
      result && r.p >= result.tx.position && r.time >= result.from ? result.doc : W0.R1.doc;
    const [expected] = JSON.parse(
      await ref.oracle.call("check", {
        document: doc,
        old: null,
        basis: { tx: r.p, validTime: r.time },
        worlds: [
          expectedPolicy(r.subject, authoredSeed(r.subject, fixture.seedPosition(r.subject))),
        ],
        fold: false,
      }),
    );
    assert.equal(r.hash, sha256(expected.json));
  }
  const p99 = (a: number[]) => a.toSorted((l, r) => l - r)[Math.ceil(a.length * 0.99) - 1]!;
  const summary = {
    scope: source.scope,
    source: fixture.sourceHash,
    roster: fixture.rosterHash,
    loaded,
    tape,
    tapeSeed,
    subjects: n,
    seconds,
    readers: 64,
    readCount: reads.length,
    writeCount: writes.length,
    saveP99: p99(writes.filter((r) => !events[r.index]!.resend).map((r) => r.ms)),
    readP99: p99(reads.map((r) => r.ms)),
    publish: result
      ? {
          position: result.tx.position,
          tx: result.tx.txId,
          offerToReturnMs: result.offerToReturnMs,
          terminal: result.terminal,
        }
      : null,
  };
  observed.push(summary);
  writeFileSync(
    join(out, (loaded ? "loaded" : "control") + "-interference.json"),
    JSON.stringify({ summary, reads, writes }) + "\n",
    { flag: "wx" },
  );
  ref.oracle.close();
  await worker.close();
  await source.close();
}
assert(observed.length === 2 && observed[0]!.tape === observed[1]!.tape);
writeFileSync(
  join(out, "interference.json"),
  JSON.stringify({
    observed,
    saveRatio: observed[1]!.saveP99 / observed[0]!.saveP99,
    readRatio: observed[1]!.readP99 / observed[0]!.readP99,
  }) + "\n",
  { flag: "wx" },
);
