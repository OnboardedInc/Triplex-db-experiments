import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { W0, canonical, sha256 } from "../../../../bench/lib/w0-world.ts";
import { ids } from "../../../../bench/lib/world.ts";
import { integer, string } from "../../../../bench/lib/deep-world.ts";
import { liveArrivals } from "../../scale1/deep-live.ts";
import { openStore, millis } from "../store.ts";
import { seed, valid } from "../fixture.ts";
import { JoinedAccount } from "./account.ts";
import { BulkQueue } from "./bulk.ts";
import { Settlement } from "./settlement.ts";
import { Reference, toWire } from "./check.ts";
import { authoredSeed, expectedPolicy } from "./deep-reference.ts";
import { rawDeep, replaceDeep } from "./deep.ts";
import { measure } from "./measure.ts";

type Fixture = Awaited<ReturnType<typeof seed>>;
type Read = { subject: number; p: number; elapsed: number; digest: string };
type Write = { subject: number; offered: number; ack: number; p: number; tx: string };
const p99 = (ms: number[]) => {
  assert(ms.length);
  return ms.toSorted((l, r) => l - r)[Math.ceil(ms.length * 0.99) - 1]!;
};
const policy = (f: Fixture, i: number) => expectedPolicy(i, authoredSeed(i, f.seedPosition(i)));
const save = (out: string, key: string, value: unknown) =>
  writeFileSync(join(out, key + ".json"), JSON.stringify(value, null, 2) + "\n", { flag: "wx" });

async function traffic(
  account: JoinedAccount,
  f: Fixture,
  queue: BulkQueue,
  rate: number,
  start: number,
  seconds: number,
  tag: string,
  readers: number,
) {
  let tail = Promise.resolve(),
    failed: unknown;
  const scheduled: number[] = [],
    reads: Read[] = [],
    writes: Write[] = [];
  liveArrivals(0, rate, 60, (at) => {
    if (at < seconds) scheduled.push(start + at * 1000);
  });
  const reader = account.reader(),
    s = account.s;
  const write = async () => {
    for (const [i, offered] of scheduled.entries()) {
      await sleep(Math.max(0, offered - performance.now()));
      const subject = (i * 37) % 100 < 95 ? (i * 17) % Math.min(f.n, 200) : (i * 2377) % f.n;
      tail = tail
        .then(() =>
          queue.live(async () => {
            if (failed) return;
            const p = await s.head(),
              raw = await rawDeep(s, subject, { tx: p, validTime: valid });
            const id = ids.placement(subject);
            const stamp = raw.find((r) => r.entityId === id && r.attribute === ":placement/stamp");
            assert(stamp);
            const ops = replaceDeep(
              raw,
              [
                { e: id, a: ":placement/stamp", v: integer(Number(stamp.value.value) + 1) },
                {
                  e: ids.worker(subject),
                  a: ":worker/address",
                  v: string("trial-" + tag + "-" + i),
                },
              ],
              millis(valid),
            );
            const r = await account.saveDeep(tag + "-" + i, subject, ops, valid);
            writes.push({
              subject,
              offered: offered - start,
              ack: performance.now() - start,
              p: r.position,
              tx: r.txId,
            });
          }),
        )
        .catch((e) => {
          failed = e;
        });
    }
    await tail;
    if (failed) throw failed;
    assert.equal(writes.length, scheduled.length);
  };
  const read = async (worker: number) => {
    await sleep(Math.max(0, start - performance.now()));
    for (let i = 0; performance.now() < start + seconds * 1000; i++) {
      if (failed) return;
      const subject = (i * 2377 + worker * 47) % f.n,
        started = performance.now(),
        p = await s.head();
      const value = await reader.readAt(f.roster[subject]!, { position: p, validTime: valid });
      assert.deepEqual(value.basis, { tx: p, validTime: valid });
      reads.push({ subject, p, elapsed: performance.now() - started, digest: sha256(value.json) });
    }
  };
  await Promise.all([write(), ...Array.from({ length: readers }, (_, i) => read(i))]);
  return {
    reads,
    writes,
    saveP99: p99(writes.map((r) => r.ack - r.offered)),
    readP99: p99(reads.map((r) => r.elapsed)),
  };
}

async function verifyReads(
  f: Fixture,
  ref: Reference,
  samples: Read[],
  cut: number,
  before: W0.ReleaseDoc,
  after: W0.ReleaseDoc,
) {
  const by = new Map<number, Read[]>();
  for (const r of samples) {
    const rows = by.get(r.p) ?? [];
    rows.push(r);
    by.set(r.p, rows);
  }
  for (const [p, rows] of by) {
    for (let i = 0; i < rows.length; i += 32) {
      const page = rows.slice(i, i + 32);
      const expected = JSON.parse(
        await ref.oracle.call("check", {
          document: p < cut ? before : after,
          old: null,
          basis: { tx: p, validTime: valid },
          worlds: page.map((x) => policy(f, x.subject)),
          fold: false,
        }),
      );
      assert.deepEqual(
        expected.map((x: any) => sha256(x.json)),
        page.map((x) => x.digest),
      );
    }
  }
}

export async function settlementPrices(out: string, n: number, seconds = 60, readerCount = 4) {
  const suffix = randomUUID(),
    source = await openStore("lazy-settlement-price-" + suffix, "act2-deep"),
    neighbour = await openStore("lazy-settlement-quiet-" + suffix, "act2-deep");
  const a = new JoinedAccount(source),
    quiet = new JoinedAccount(neighbour),
    ref = new Reference(),
    services: number[] = [],
    queue = new BulkQueue(0.6, (ms) => services.push(ms));
  const f = await seed(source, n),
    nearby = await seed(neighbour, 64);
  const settle = await Settlement.open(a, queue);
  const result = [];
  let previous: W0.ReleaseDoc | null = null;
  try {
    await a.install(f.roster, valid);
    await quiet.install(nearby.roster, valid);
    await quiet.publish("quiet-first", W0.R1.doc, valid, "owed");
    for (const [i, rate] of [3.5, 23.5].entries()) {
      const base = await a.publish("baseline-" + i, W0.R1.doc, valid, "owed");
      const seq = (await a.notices.observe()).value.sequence;
      await settle.recorder.record(seq);
      await ref.check(
        a,
        f.roster,
        (j) => policy(f, j),
        W0.R1.doc,
        { tx: base.position, validTime: valid },
        previous,
        seq,
        true,
        false,
      );
      const { control, loaded, offer, visible, after, terminal, published, doc } = await measure(
        async () => {
          const start = performance.now() + 100;
          const control = await Promise.all([
            traffic(a, f, queue, rate, start, seconds, "main-base-" + i, readerCount),
            traffic(quiet, nearby, queue, 3.5, start, seconds, "quiet-base-" + i, 1),
          ]);
          const charged = performance.now() + 100;
          const also = Promise.all([
            traffic(a, f, queue, rate, charged, seconds, "main-work-" + i, readerCount),
            traffic(quiet, nearby, queue, 3.5, charged, seconds, "quiet-work-" + i, 1),
          ]);
          await sleep(Math.max(0, charged - performance.now()));
          const offer = performance.now(),
            doc = structuredClone(W0.R2.doc);
          Object.assign(doc.rules.find((x) => x.id === "I9S2")!, {
            params: { businessDays: 5 + i },
          });
          const published = await queue.live(() => a.publish("trial-" + i, doc, valid, "owed"));
          const visible = performance.now(),
            after = services.length;
          const [terminal, loaded] = await Promise.all([settle.settle(seq + 1, offer), also]);
          return { control, loaded, offer, visible, after, terminal, published, doc };
        },
      );
      assert.equal(terminal.values.state.status, "stored");
      const proof = await ref.check(
        a,
        f.roster,
        (j) => policy(f, j),
        doc,
        { tx: published.position, validTime: valid },
        W0.R1.doc,
        seq + 1,
        true,
        false,
      );
      const archive = await settle.archive.stored(seq + 1);
      const archived = new Map(archive.output.map((row) => [row.subject, row]));
      assert.equal(archived.size, archive.output.length);
      assert.equal(archive.frontier.changes, proof.changes);
      const packet = (await settle.recorder.packets(terminal.notices.state.at)).flatMap((p) =>
        p.deliveries.map(toWire),
      );
      assert.deepEqual(packet, ref.owed);
      for (let offset = 0; offset < f.n; offset += 32) {
        const ids = f.roster.slice(offset, offset + 32);
        const p = { tx: published.position, validTime: valid };
        const expected = JSON.parse(
          await ref.oracle.call("check", {
            document: doc,
            old: W0.R1.doc,
            basis: p,
            worlds: ids.map((_, j) => policy(f, offset + j)),
            fold: false,
          }),
        );
        assert.deepEqual(
          ids.flatMap((id) => (archived.has(id) ? [archived.get(id)!] : [])),
          expected
            .filter((x: any) => x.rows.length)
            .map((x: any) => ({
              subject: x.subject,
              json: x.json,
              changes: x.rows.map(([key, , value]: any) => [key, value]),
            })),
        );
      }
      await verifyReads(f, ref, control[0].reads, Infinity, W0.R1.doc, doc);
      await verifyReads(f, ref, loaded[0].reads, published.position, W0.R1.doc, doc);
      for (const data of [control[1], loaded[1]])
        await verifyReads(nearby, ref, data.reads, Infinity, W0.R1.doc, W0.R1.doc);
      const pairs = [0, 1].map((index) => ({
        save: loaded[index]!.saveP99 / control[index]!.saveP99,
        read: loaded[index]!.readP99 / control[index]!.readP99,
      }));
      const row = {
        rate,
        offer,
        visible,
        sequence: seq + 1,
        cut: published.position,
        tx: published.txId,
        terminal,
        proof,
        pairs,
        control,
        loaded,
        bulkService: services.slice(after),
        receiverOffline: true,
      };
      result.push(row);
      save(out, "settlement-" + i, row);
      previous = doc;
    }
    save(out, "settlement-price", {
      n,
      facts: f.facts,
      source: f.sourceHash,
      roster: f.rosterHash,
      scope: source.scope,
      neighbour: neighbour.scope,
      seconds,
      readerCount,
      result: result.map((r) => ({
        rate: r.rate,
        cut: r.cut,
        markerMs: r.visible - r.offer,
        valuesMs: r.terminal.values.ms,
        noticeMs: r.terminal.notices.ms,
        proof: r.proof,
        p99Ratios: r.pairs,
      })),
    });
  } finally {
    ref.oracle.close();
    await settle.close();
    await source.close();
    await neighbour.close();
  }
}

if (import.meta.filename === process.argv[1]) {
  const [out, n, seconds, readers] = process.argv.slice(2);
  assert(out && [64, 1000, 10000, 100000].includes(Number(n)));
  await settlementPrices(out, Number(n), Number(seconds ?? 60), Number(readers ?? 4));
}
