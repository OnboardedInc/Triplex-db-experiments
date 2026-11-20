import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
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
import { macDiagnostic, measure } from "./measure.ts";

type Fixture = Pick<
  Awaited<ReturnType<typeof seed>>,
  "id" | "n" | "facts" | "cut" | "seedPosition" | "roster" | "rosterHash" | "sourceHash"
>;
type ScopePreparation = Omit<Fixture, "seedPosition" | "roster"> & {
  scope: string;
  head: number;
  seal: string;
  generation: string;
  positions: number[];
  baseline: { position: number; tx: string };
};
type Preparation = {
  version: 1;
  rate: number;
  source: ScopePreparation;
  neighbour: ScopePreparation;
  noticeCursor: number;
  volume: string;
  slot: string;
  preparedBy: string;
};
type Read = { subject: number; p: number; started: number; elapsed: number; digest: string };
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
  liveArrivals(0, rate, Math.ceil(seconds / 60) * 60, (at) => {
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
      reads.push({
        subject,
        p,
        started: started - start,
        elapsed: performance.now() - started,
        digest: sha256(value.json),
      });
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

function activePercentiles(run: Awaited<ReturnType<typeof traffic>>, from: number, until: number) {
  const within = (t: number) => t >= from && t < until;
  const saves = run.writes.filter((x) => within(x.offered));
  const reads = run.reads.filter((x) => within(x.started));
  return {
    saveN: saves.length,
    readN: reads.length,
    saveP99: saves.length ? p99(saves.map((x) => x.ack - x.offered)) : null,
    readP99: reads.length ? p99(reads.map((x) => x.elapsed)) : null,
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

const ownedSlot = () => {
  const owner = readFileSync(process.env.TRIPLEX_LAB_SLOT_OWNER!);
  const slot = JSON.parse(owner.toString());
  assert(slot.holder === "DX-ACT1" && slot.mode === "exclusive");
  return { slot: slot.container as string, volume: slot.volume as string, owner: sha256(owner) };
};

function fixtureReadback(p: ScopePreparation): Fixture {
  const roster = Array.from({ length: p.n }, (_, i) => W0.placementId(i));
  assert.equal(sha256(canonical(roster)), p.rosterHash);
  assert(
    p.positions.length === p.n &&
      p.positions.every(
        (v, i) => Number.isSafeInteger(v) && v > 1 && v <= p.cut && v >= (p.positions[i - 1] ?? 0),
      ),
  );
  return { ...p, roster, seedPosition: (i) => p.positions[i]! };
}

async function snapshot(
  account: JoinedAccount,
  f: Fixture,
  baseline: Awaited<ReturnType<JoinedAccount["publish"]>>,
): Promise<ScopePreparation> {
  const s = account.s;
  assert.equal((await s.lookup("origin"))?.txId, f.id);
  const seal = await s.lookup("sealed-roster"),
    head = await s.head();
  assert(seal?.position === f.cut && head === baseline.position);
  return {
    scope: s.scope,
    id: f.id,
    n: f.n,
    facts: f.facts,
    cut: f.cut,
    rosterHash: f.rosterHash,
    sourceHash: f.sourceHash,
    positions: f.roster.map((_, i) => f.seedPosition(i)),
    head,
    seal: seal.txId,
    generation: (await s.controls(head)).generation,
    baseline: { position: baseline.position, tx: baseline.txId },
  };
}

async function reopening(account: JoinedAccount, p: ScopePreparation, command: string) {
  const s = account.s,
    fixture = fixtureReadback(p);
  assert.equal(s.scope, p.scope);
  assert.equal(await s.head(), p.head);
  assert.equal((await s.controls(p.head)).generation, p.generation);
  assert.equal((await s.lookup("origin"))?.txId, p.id);
  const seal = await s.lookup("sealed-roster");
  assert(seal?.position === p.cut && seal.txId === p.seal);
  assert(await account.db.row("join-meta", p.head));
  await account.install(fixture.roster, valid);
  const baseline = await s.lookup("joined:" + command);
  assert(baseline?.position === p.baseline.position && baseline.txId === p.baseline.tx);
  const receipt = await account.receipt(1, p.head);
  assert.equal(receipt.event.at, baseline.position);
  assert.equal(receipt.marker.census, p.rosterHash);
  assert.deepEqual(receipt.marker.document, W0.R1.doc);
  return fixture;
}

export async function settlementPrices(
  out: string,
  n: number,
  seconds = 60,
  readerCount = 4,
  phase?: { prepare: number } | { resume: Preparation; digest: string; shortDiagnostic?: true },
) {
  const prepared = phase && "resume" in phase ? phase.resume : undefined;
  const shortDiagnostic = phase && "shortDiagnostic" in phase && phase.shortDiagnostic;
  const prepareRate = phase && "prepare" in phase ? phase.prepare : undefined;
  const slot = phase ? ownedSlot() : undefined;
  if (prepared)
    assert(
      prepared.version === 1 &&
        prepared.source.n === n &&
        prepared.neighbour.n === 64 &&
        prepared.volume === slot?.volume &&
        prepared.slot === slot.slot &&
        prepared.preparedBy !== slot.owner,
    );
  const suffix = randomUUID(),
    source = await openStore(
      prepared?.source.scope ?? "lazy-settlement-price-" + suffix,
      "act2-deep",
    ),
    neighbour = await openStore(
      prepared?.neighbour.scope ?? "lazy-settlement-quiet-" + suffix,
      "act2-deep",
    );
  const a = new JoinedAccount(source),
    quiet = new JoinedAccount(neighbour),
    ref = new Reference(),
    services: number[] = [],
    queue = new BulkQueue(0.6, (ms) => services.push(ms));
  const settle = await Settlement.open(a, queue);
  const result = [];
  let previous: W0.ReleaseDoc | null = null;
  try {
    const f = prepared ? await reopening(a, prepared.source, "baseline-0") : await seed(source, n),
      nearby = prepared
        ? await reopening(quiet, prepared.neighbour, "quiet-first")
        : await seed(neighbour, 64);
    if (!prepared) {
      await a.install(f.roster, valid);
      await quiet.install(nearby.roster, valid);
      const quietBaseline = await quiet.publish("quiet-first", W0.R1.doc, valid, "owed");
      if (prepareRate !== undefined) {
        const base = await a.publish("baseline-0", W0.R1.doc, valid, "owed");
        const complete = await settle.recorder.record(1);
        assert(complete.current.event === 2 && complete.current.start === 0);
        // [DX-ACT1] Why: park only the enrolled baseline and its exact native cursors. Rejected: holding the lab's timing lease through seeding or preparing the release that will be offered later.
        save(out, "preparation", {
          version: 1,
          rate: prepareRate,
          source: await snapshot(a, f, base),
          neighbour: await snapshot(quiet, nearby, quietBaseline),
          noticeCursor: complete.at,
          slot: slot!.slot,
          volume: slot!.volume,
          preparedBy: slot!.owner,
        } satisfies Preparation);
        return;
      }
    }
    if (prepared) {
      assert.equal(await settle.recorder.archive.store.head(), prepared.noticeCursor);
      const found = await settle.recorder.record(1);
      assert(
        found.at === prepared.noticeCursor &&
          found.current.event === 2 &&
          found.current.start === 0,
      );
      save(out, "reopened", {
        preparation: phase && "digest" in phase ? phase.digest : null,
        source: prepared.source.baseline,
        neighbour: prepared.neighbour.baseline,
        notice: found.at,
      });
    }
    for (const [i, rate] of (prepared ? [prepared.rate] : [3.5, 23.5]).entries()) {
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
      const { control, loaded, offer, visible, after, terminal, published, doc, charged } =
        await measure(async () => {
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
          return { control, loaded, offer, visible, after, terminal, published, doc, charged };
        });
      if (prepared || seconds === 180) {
        if (n !== 64 && !shortDiagnostic)
          for (const x of [...control, ...loaded]) assert(x.writes.length >= 500);
        save(out, "observed-" + i, {
          scope: source.scope,
          rate,
          offer,
          visible,
          terminal,
          tx: published.txId,
          cut: published.position,
          control,
          loaded,
          document: doc,
        });
      }
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
      // [DX-ACT1] Why: match the intervals that actually contained unsettled work. Rejected: diluting a short burst of bulk traffic with idle time after the last durable page.
      const activeFrom = visible - charged;
      const activeUntil = Math.min(
        seconds * 1000,
        offer + Math.max(terminal.values.ms, terminal.notices.ms) - charged,
      );
      const active = [0, 1].map((index) => {
        const base = activePercentiles(control[index]!, activeFrom, activeUntil),
          work = activePercentiles(loaded[index]!, activeFrom, activeUntil);
        return {
          base,
          work,
          save: base.saveP99 && work.saveP99 ? work.saveP99 / base.saveP99 : null,
          read: base.readP99 && work.readP99 ? work.readP99 / base.readP99 : null,
        };
      });
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
        active,
        activeFrom,
        activeUntil,
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
      ...(macDiagnostic ? { timing: "diagnostic" } : {}),
      result: result.map((r) => ({
        rate: r.rate,
        cut: r.cut,
        markerMs: r.visible - r.offer,
        valuesMs: r.terminal.values.ms,
        noticeMs: r.terminal.notices.ms,
        valuesAfterReceiptMs: r.terminal.values.ms - (r.visible - r.offer),
        noticesAfterReceiptMs: r.terminal.notices.ms - (r.visible - r.offer),
        valuesClock: r.terminal.values.clock,
        noticeClock: r.terminal.notices.clock,
        proof: r.proof,
        p99Ratios: r.pairs,
        active: { from: r.activeFrom, until: r.activeUntil, ratios: r.active },
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
  const [out, n, seconds, readers, mode, arg] = process.argv.slice(2);
  assert(out && [64, 1000, 10000, 100000].includes(Number(n)));
  if (mode === "--prepare") {
    assert(arg === "3.5" || arg === "23.5");
    await settlementPrices(out, Number(n), 180, Number(readers), { prepare: Number(arg) });
  } else if (mode === "--resume" || mode === "--diagnostic-resume") {
    const shortDiagnostic = mode === "--diagnostic-resume";
    assert(!shortDiagnostic || macDiagnostic);
    assert(arg && Number(seconds) === (Number(n) === 64 ? 3 : shortDiagnostic ? 45 : 180));
    const bytes = readFileSync(arg),
      digest = sha256(bytes);
    assert.equal(digest, process.env.DX_JOIN_PREPARATION_SHA256);
    const witness: Preparation = JSON.parse(bytes.toString());
    assert(witness.rate === 3.5 || witness.rate === 23.5);
    assert.equal(witness.rate, Number(process.env.DX_JOIN_PREPARATION_RATE));
    await settlementPrices(out, Number(n), Number(seconds), Number(readers), {
      resume: witness,
      digest,
      ...(shortDiagnostic ? { shortDiagnostic } : {}),
    });
  } else {
    assert(mode === undefined);
    await settlementPrices(out, Number(n), Number(seconds ?? 60), Number(readers ?? 4));
  }
}
