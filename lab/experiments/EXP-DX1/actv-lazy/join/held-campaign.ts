import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { Worker } from "node:worker_threads";
import { DatomicClient } from "../../../../../packages/datomic/dist/index.js";
import { W0, canonical, sha256 } from "../../../../bench/lib/w0-world.ts";
import { DomainOraclePool } from "../../../../bench/lib/w0-gates.ts";
import { Histogram } from "../../../../bench/lib/hist.ts";
import { SEED_VALID_FROM } from "../../../../bench/lib/world.ts";
import {
  accounts,
  field,
  keyFor,
  root,
  sha,
  task,
  writeTape,
  type Density,
  type Write,
} from "../../scale1/decision/plan.ts";
import { now, readCell } from "../../scale1/decision/observer.ts";
import { play, type PublishInterleave, type Save } from "../../scale1/decision/writes.ts";
import { creditModeSelection } from "../../prep1/rolling-credits.ts";
import { checkAdoptedPeer, type AdoptedSeed } from "../../v01/adopt.ts";
import { jsonFile, preload, type Peer } from "../../v01/adopted.ts";
import { openStore, type HeldSource } from "../store.ts";
import type { Pin } from "../read.ts";
import { JoinedAccount } from "./account.ts";
import { toWire } from "./check.ts";
import { authoredSeed, authoredWrite, expectedPolicy } from "./deep-reference.ts";
import { HeldLedger } from "./held-ledger.ts";
import { Settlement } from "./settlement.ts";
import { BulkQueue } from "./bulk.ts";

const validTime = W0.POPULATION_VALID_TIME;
export const rates = [3.5, 23.5, 39.4] as const;
type Rate = (typeof rates)[number];
const creditModes = ["barrier6", "rolling6"] as const;
type Mode = (typeof creditModes)[number];
export const total = (r: Rate) => (r === 3.5 ? r : r === 23.5 ? 235 : 394);
const wait = async (at: number) => {
  while (now() < at) await sleep(Math.ceil(at - now()));
};
const pct = (xs: number[], p: number) =>
  xs.length ? xs.toSorted((a, b) => a - b)[Math.ceil(xs.length * p) - 1] : null;
const p99 = (xs: number[]) => pct(xs, 0.99);
const ratio = (value: number | null | undefined, baseline: number | null | undefined) =>
  value != null && baseline && baseline > 0 ? value / baseline : null;

export function heldTape(people: Density, rate: Rate, seconds: number) {
  const by = Math.round((total(rate) - rate) * seconds),
    own = Math.round(rate * seconds);
  return accounts
    .flatMap((a): Write[] => {
      const count = a ? Math.floor((by + 9 - a) / 9) : own;
      if (!count) return [];
      const rows: Write[] = [];
      for (let block = 0; rows.length < count; block++) {
        const cell = a ? 394 : rate;
        const batch = writeTape(people, cell, block).filter((x) => x.account === a);
        for (const [j, x] of batch.entries()) {
          const ordinal = rows.length;
          const jitter =
            (x.ms * batch.length) /
              (a ? 90_000 : rate === 3.5 ? 150_000 : rate === 23.5 ? 300_000 : 60_000) -
            j;
          assert(jitter >= -1e-8 && jitter <= 1);
          rows.push({
            ...x,
            ordinal,
            ms: ((ordinal + Math.max(0, jitter)) * seconds * 1000) / count,
            version: ["held", rate, a, ordinal].join("/"),
          });
          if (rows.length === count) break;
        }
      }
      return rows;
    })
    .sort((a, b) => a.ms - b.ms);
}

type Seen = {
  subject: string;
  route: string;
  json: string;
  basis: { tx: number; validTime: string };
};
type Read = { started: number; ended: number; result: Seen };
async function readerPeer(
  peer: Peer,
  scope: string,
  descriptor: Pick<HeldSource, "account" | "prefix" | "people" | "cut" | "seal">,
) {
  const worker = new Worker(new URL("./held-reader.ts", import.meta.url), {
    workerData: { scope, held: descriptor },
    env: { ...process.env, DATOMIC_URL: peer.read, DATOMIC_READ_URLS: peer.read },
  });
  const ready = new Promise<void>((resolve, reject) => {
    worker.once("message", (m) =>
      m === "ready" ? resolve() : reject(Error("Unexpected reader boot")),
    );
    worker.once("error", reject);
    worker.once("exit", (code) => reject(Error("Reader exited before startup: " + code)));
  });
  let next = 0;
  const requests = new Map<number, { resolve: (r: Read) => void; reject: (e: Error) => void }>();
  worker.on("message", (m) => {
    if (m === "ready") return;
    const request = requests.get(m.n);
    assert(request, "Unexpected held read response");
    requests.delete(m.n);
    if (m.error) request.reject(Error(m.error));
    else request.resolve(m);
  });
  const fail = (e: Error) => {
    for (const pending of requests.values()) pending.reject(e);
    requests.clear();
  };
  worker.on("error", fail);
  worker.on("exit", (code) => fail(Error("Held read worker exited: " + code)));
  await ready;
  return {
    read: (subject: string, pin: Pin) =>
      new Promise<Read>((resolve, reject) => {
        const n = next++;
        requests.set(n, { resolve, reject });
        worker.postMessage({ n, subject, pin });
      }),
    close: () => worker.terminate(),
  };
}

const samples = (n: number, turn: number) => [
  ...new Set([0, n - 1, Math.floor(n / 2), (turn * 7919 + 47) % n]),
];
type Release = {
  offer: number;
  received: number;
  durableAt: number;
  durabilityClock: "native-ack" | "readback";
  position: number;
  seq: number;
  tx: string;
  doc: W0.ReleaseDoc;
};
type PairSample = {
  mode: Mode;
  rate: Rate;
  load: number;
  publish: boolean;
  first: number[];
  within1000: number;
  within100000: number;
  missedDeadlines: number;
  writes: ReturnType<typeof writeSummary>;
  reads: ReturnType<Histogram["summary"]>;
  readOffered: number;
  readMissing: number;
  savesOnly?: number | null;
};
type History = Map<number, { position: number; version: string; width: number }[]>;
async function seedPositions(client: DatomicClient, seed: AdoptedSeed) {
  const detected: number[] = [];
  const width = 128;
  for (let start = 0; start < seed.image.people; start += 4 * width) {
    const windows = await Promise.all(
      Array.from({ length: 4 }, async (_, lane) => {
        const first = start + lane * width;
        const count = Math.min(width, seed.image.people - first);
        if (count <= 0) return [];
        const ids = Array.from({ length: count }, (_, i) => root(0, first + i));
        const rows = await client.rows(seed.scope.db, {
          entityIds: ids,
          pattern: { attribute: ":subject/member" },
          basis: { recordedPosition: seed.scope.cut, validAt: SEED_VALID_FROM },
        });
        assert.equal(rows.length, ids.length);
        const byRoot = new Map(rows.map((r) => [r.entity_id, r]));
        return ids.map((id, i) => {
          const row = byRoot.get(id);
          assert(
            row && row.attribute === ":subject/member" && row.value_string === String(first + i),
          );
          assert(
            row.valid_from === SEED_VALID_FROM &&
              row.recorded_position > 1 &&
              row.recorded_position <= seed.scope.cut,
          );
          return row.recorded_position;
        });
      }),
    );
    detected.push(...windows.flat());
  }
  assert(detected.every((p, i) => i === 0 || p >= detected[i - 1]!));
  return detected;
}

function expected(i: number, at: number, edits: History, positions: number[]) {
  // [DX-ACT1] Why: SCALE1 packs one person's original facts atomically. Trace provenance uses their witnessed loader position.
  // Rejected: giving every authored fact position one, which produces the right tasks but different durable notice versions.
  let rows = authoredSeed(i, positions[i]!);
  for (const e of edits.get(i) ?? []) {
    if (e.position > at) break;
    rows = authoredWrite(
      rows,
      Array.from({ length: e.width }, (_, n) => ({
        e: task(0, i).split("/").at(-1)!,
        a: field(n),
        v: { type: "string", value: sha([e.version, n]).slice(0, 57) },
      })),
      e.position,
      0,
    );
  }
  return expectedPolicy(i, rows);
}
function writeSummary(rows: Save[], start: number, end: number) {
  const summarize = (side: Save[]) => {
    const done = side.filter((x) => x.status === "acked" || x.status === "recovered");
    const count = done.filter((x) => x.end! < end && x.status === "acked").length;
    return {
      offered: side.length,
      acknowledgements: count,
      storedPerSecond: (count * 1000) / (end - start),
      pendingAfterOneSecond: side.filter((x) =>
        x.dispatched === undefined
          ? (x.end ?? Infinity) > end + 1000
          : (x.end ?? Infinity) > end + 1000 || x.status === "uncertain",
      ).length,
      p99Ms: p99(done.map((x) => x.end! - x.due)),
      deadlineExpirations: side.filter((x) => x.status === "expired-before-dispatch").length,
      refused: side.filter((x) => x.status === "refused").length,
    };
  };
  return {
    all: summarize(rows),
    account: summarize(rows.filter((r) => !r.account)),
    neighbours: summarize(rows.filter((r) => r.account > 0)),
  };
}

export async function runHeld(
  out: string,
  source: string,
  peer: Peer,
  seed: AdoptedSeed,
  diagnostic = false,
) {
  const start = now(),
    input = path.join(out, "held-input.json");
  const writer = new DatomicClient(peer.write, 35000),
    reader = new DatomicClient(peer.read, 35000);
  const releases: Release[] = [],
    history: History = new Map();
  const oracles = new DomainOraclePool(
    new URL("./oracle.py", import.meta.url).pathname,
    diagnostic ? 1 : 4,
  );
  let store: Awaited<ReturnType<typeof openStore>> | undefined;
  let connected: Awaited<ReturnType<typeof readerPeer>> | undefined;
  let worker: Settlement | undefined;
  try {
    const verified = await checkAdoptedPeer(reader, seed, seed.scope.cut);
    assert.deepEqual(verified, await checkAdoptedPeer(writer, seed, seed.scope.cut));
    const options = await writer.request<{
      attempt: string;
      database: string;
      position: number;
      gatewaySourceHash: string;
      commitFunctionInstalled: boolean;
      strictRecordClocks: boolean;
      rowsVersion: number;
      subjectNumericOwner: boolean;
      subjectOrderedIds: boolean;
      subjectSave: boolean;
      subjectFunction: string;
      options: { groupCommit: boolean };
      subjectPrefetch: boolean;
    }>("GET", "/v1/db/" + seed.scope.db + "/write-options");
    assert.deepEqual(
      [options.database, options.position, options.gatewaySourceHash],
      [seed.scope.db, seed.scope.cut, peer.gatewaySource],
    );
    assert(
      options.commitFunctionInstalled && options.strictRecordClocks && options.rowsVersion === 3,
    );
    const ordered =
      options.subjectSave === true && options.subjectNumericOwner && options.subjectOrderedIds;
    if (!diagnostic) {
      assert.equal(options.attempt, peer.attempt);
      assert(ordered && !options.options.groupCommit && !options.subjectPrefetch);
      assert.match(options.subjectFunction, /^:triplex\.subject\/v-[a-f0-9]{24}$/);
    }
    const { cut, name, db } = seed.scope,
      people = seed.image.people;
    const positions = await seedPositions(reader, seed);
    const account = keyFor(0);
    const descriptor = {
      account,
      prefix: "acct/" + account + "/",
      people,
      cut,
      seal: sha256(
        canonical([
          seed.pin,
          seed.proof.sourceSeal,
          name,
          db,
          account,
          people,
          cut,
          verified.terminal,
        ]),
      ),
    };
    jsonFile(input, {
      source,
      peer: {
        slot: peer.slot,
        attempt: peer.attempt,
        gatewaySource: peer.gatewaySource,
        java: peer.java,
      },
      verified,
      descriptor,
      positions,
      options,
      diagnostic,
      rates,
      at: start,
      creditModes,
    });
    // Enrolment's census transactions are checked by JoinedAccount before setting this frontier.
    let ledger: HeldLedger | undefined;
    store = await openStore(name, "act2-deep", "write", {
      ...descriptor,
      verifyThrough: (p) => {
        assert(ledger);
        return ledger.verifyThrough(p);
      },
      committed: (r) => ledger?.joined(r),
    });
    const s = store,
      a = new JoinedAccount(s);
    const meta = await a.installHeld(validTime),
      prepared = now(),
      installed = await s.head();
    const activeLedger = (ledger = new HeldLedger(
      reader,
      db,
      installed,
      ordered ? options.subjectFunction : undefined,
    ));
    connected = await readerPeer(peer, name, descriptor);
    const demand = connected;
    // [DX-ACT1] Why: keep early ACK clocks and pinned bytes from the connected SDK reader, then check them independently.
    // Rejected: timing a process launch or selecting a favourable probe after observing its response.
    const offer = async (doc: W0.ReleaseDoc, id: string, offered: number) => {
      const published = await a.publish(id, doc, validTime, "owed");
      const received = now(),
        ack = s.counters.lastReceipt;
      assert(
        ack &&
          ack.position === published.position &&
          ack.txId === published.txId &&
          ack.commandId === "joined:" + id,
      );
      const durableAt = performance.timeOrigin + ack.time;
      assert(offered <= durableAt && durableAt <= received);
      const marker = await a.receipt(
        (await a.notices.observe()).value.sequence,
        published.position,
      );
      assert.deepEqual(
        [marker.event.at, marker.event.value.request, marker.marker.cut],
        [published.position, id, published.position - 1],
      );
      assert.deepEqual(marker.marker.document, doc);
      assert.equal(a.stats.worlds, 0);
      const r = {
        offer: offered,
        received,
        durableAt,
        durabilityClock: ack.clock,
        position: published.position,
        tx: published.txId,
        seq: marker.marker.seq,
        doc,
      };
      releases.push(r);
      return r;
    };
    async function verifyRead(probe: Read, r: Release, i: number) {
      assert.equal(probe.result.subject, W0.placementId(i));
      const b = probe.result.basis;
      assert(b.tx >= r.position && b.validTime === validTime);
      const effective = releases.findLast((x) => x.position <= b.tx);
      assert(effective && effective.position === r.position);
      const text = await oracles.children[0]!.call("check", {
        document: r.doc,
        old: null,
        basis: b,
        worlds: [expected(i, b.tx, history, positions)],
        fold: false,
      });
      assert.equal(probe.result.json, JSON.parse(text)[0].json);
    }
    const initialAt = now();
    const initial = await offer(W0.R1.doc, peer.attempt + ":baseline", initialAt);
    const initialRead = await demand.read(W0.placementId(people - 1), { validTime });
    await verifyRead(initialRead, initial, people - 1);
    worker = await Settlement.open(a, new BulkQueue(1));
    jsonFile(path.join(out, "held-initial.json"), {
      source,
      attempt: peer.attempt,
      installed,
      initial,
      firstCorrectMs: initialRead.ended - initialAt,
      initialRead,
    });
    const settlement = await worker.settle(initial.seq, initialAt - performance.timeOrigin);
    const [stored, packets] = await Promise.all([
      worker.archive.stored(initial.seq),
      worker.recorder.packets(settlement.notices.position),
    ]);
    assert.equal(stored.frontier.status, "stored");
    const archive = new Map(stored.output.map((x) => [x.subject, x]));
    assert.equal(stored.output.length, archive.size, "Duplicate settled subject");
    const notices = packets.flatMap((p) => p.deliveries.map(toWire));
    let changes = 0,
      entries = 0;
    for (let i = 0; i < people; i += 32 * oracles.children.length) {
      await Promise.all(
        oracles.children.map(async (oracle, workerIndex) => {
          const first = i + workerIndex * 32;
          if (first >= people) return;
          const worlds = Array.from({ length: Math.min(32, people - first) }, (_, j) =>
            expected(first + j, initial.position, history, positions),
          );
          const b = { tx: initial.position, validTime };
          const text = await oracle.call("check", {
            document: initial.doc,
            old: null,
            basis: b,
            worlds,
            fold: true,
          });
          return JSON.parse(text) as {
            subject: string;
            json: string;
            rows: [string, string | null, string | null][];
            deliveries: unknown[];
          }[];
        }),
      ).then((parts) => {
        for (const p of parts)
          for (const row of p ?? []) {
            const saved = archive.get(row.subject);
            if (row.rows.length) {
              assert.deepEqual(saved, {
                subject: row.subject,
                json: row.json,
                changes: row.rows.map(([k, , v]) => [k, v]),
              });
              archive.delete(row.subject);
            } else assert(!saved);
            changes += row.rows.length;
            assert.deepEqual(
              notices.slice(entries, entries + row.deliveries.length),
              row.deliveries,
            );
            entries += row.deliveries.length;
          }
      });
    }
    assert.deepEqual(
      [archive.size, changes, entries],
      [0, settlement.values.state.changes, notices.length],
    );
    const archived = await worker.archive
      .reader()
      .readAt(W0.placementId(people - 1), { position: initial.position, validTime });
    const derived = await demand.read(W0.placementId(people - 1), {
      position: initial.position,
      validTime,
    });
    assert.equal(archived.route, "receipt-archive");
    assert.equal(archived.json, derived.result.json);
    await activeLedger.verifyThrough(await s.head());
    jsonFile(path.join(out, "held-setup.json"), {
      preparedMs: prepared - start,
      installed,
      meta,
      initial,
      coldFirstMs: initialRead.ended - initialAt,
      valuesDurableMs: settlement.values.ms,
      noticesDurableMs: settlement.notices.ms,
      settlement,
      checkedChanges: changes,
      checkedEntries: entries,
    });
    await worker.close();
    worker = undefined;
    const windows: PairSample[] = [];
    for (const rate of diagnostic ? ([3.5, 23.5] as const) : rates) {
      const seconds = diagnostic ? 8 : 100;
      const tape = heldTape(people as Density, rate, seconds);
      const order = rate === 23.5 ? [...creditModes].reverse() : creditModes;
      for (const mode of order)
        for (const publish of [false, true]) {
          const from = await s.head();
          const senders = await preload(writer, seed, from, tape);
          const begins = now() + 400,
            ends = begins + seconds * 1000;
          const gate: PublishInterleave = {
            paused: false,
            committed: (save) => {
              activeLedger.saved(save);
              if (!save.account) {
                const e = byAccount.get(save.ordinal)!;
                assert.equal(e.subject, save.subject);
                const edits = history.get(save.subject) ?? [];
                edits.push({ position: save.receipt!.p, width: e.width, version: e.version });
                history.set(save.subject, edits);
              }
            },
          };
          const byAccount = new Map(tape.filter((x) => x.account === 0).map((x) => [x.ordinal, x]));
          const first: number[] = [],
            deadline: unknown[] = [],
            native: {
              r: Release;
              ingress: number;
              waiting: number[];
              pausedAt: number;
              drained: number;
            }[] = [];
          let within1000 = 0,
            within100000 = 0,
            missedDeadlines = 0,
            done = false;
          const ticking = (async () => {
            while (!done) {
              await sleep(50);
              if (!gate.paused) await activeLedger.verifyThrough(activeLedger.pending(), true);
            }
          })();
          void ticking.catch(() => {});
          const writes = play(
            senders,
            tape,
            begins,
            peer.attempt + "/" + mode + "/" + rate + "/" + publish,
            false,
            ordered,
            creditModeSelection(mode),
            gate,
          );
          const message = {
            kind: "begin" as const,
            key: "held",
            repeat: 0,
            people: people as Density,
            cell: total(rate) === 394 ? (394 as const) : (235 as const),
            start: begins,
            scopes: [seed.scope],
            withReaders: true,
          };
          const pinReads = Promise.all([
            readCell(reader, 0, message, diagnostic),
            readCell(reader, 1, message, diagnostic),
          ]);
          const publication = (async () => {
            if (!publish) return;
            for (let j = 0; j < (diagnostic ? 2 : 20); j++) {
              const offered = begins + j * (diagnostic ? 3000 : 5000);
              await wait(offered);
              const ingress = now(),
                doc = releases.at(-1)!.doc.name === "R2" ? W0.R3.doc : W0.R2.doc;
              const members = samples(people, j);
              const cutoff = (async () => {
                await wait(offered + 1000);
                const attempted = now();
                const reads = await Promise.all(
                  members.map((i) => demand.read(W0.placementId(i), { validTime })),
                );
                return { attempted, reads };
              })();
              const waiting = gate.waiting!();
              gate.paused = true;
              const pausedAt = now();
              let r: Release;
              try {
                await gate.drain!();
                const drained = now();
                r = await offer(doc, peer.attempt + ":" + mode + ":" + rate + ":" + j, offered);
                native.push({ r, ingress, waiting, pausedAt, drained });
              } finally {
                gate.paused = false;
                gate.resume!();
              }
              const firstSubject = members.at(-1)!;
              const probe = await demand.read(W0.placementId(firstSubject), { validTime });
              await verifyRead(probe, r, firstSubject);
              first.push(probe.ended - offered);
              const d = await cutoff;
              const timely =
                d.attempted <= offered + 1025 && d.reads.every((x) => x.started <= offered + 1025);
              if (!timely) missedDeadlines++;
              let all = true;
              for (const [index, read] of d.reads.entries()) {
                const effective = releases.findLast((x) => x.position <= read.result.basis.tx);
                assert(effective);
                await verifyRead(read, effective, members[index]!);
                if (effective.position !== r.position) all = false;
              }
              deadline.push({
                ...d,
                timely,
                all,
                scheduled: offered + 1000,
                probe,
                active: r.position,
              });
              within1000 += Number(timely && all && probe.ended <= offered + 1000);
              within100000 += Number(
                probe.ended <= offered + 100000 && r.received <= offered + 100000,
              );
            }
          })();
          let result, sides;
          try {
            [result, sides] = await Promise.all([writes, pinReads, publication]);
          } finally {
            done = true;
            await ticking;
          }
          const terminal = await s.head();
          await activeLedger.verifyThrough(terminal);
          assert.equal(result.unresolved.size, 0, "Uncertain writer or foreign cut");
          const reads = new Histogram();
          for (const side of sides) reads.merge(Histogram.fromJSON(side.latency));
          const readOffered = sides.reduce((n, r) => n + r.planned, 0);
          const evidence = {
            mode,
            rate,
            load: total(rate),
            publish,
            first,
            within1000,
            within100000,
            missedDeadlines,
            durabilityP50Ms: pct(
              native.map((x) => x.r.durableAt - x.r.offer),
              0.5,
            ),
            durabilityP99Ms: p99(native.map((x) => x.r.durableAt - x.r.offer)),
            gateHoldP99Ms: p99(native.map((x) => x.r.received - x.pausedAt)),
            activeWaitP99Ms: p99(native.map((x) => x.drained - x.pausedAt)),
            writes: writeSummary(result.rows, begins, ends),
            reads: reads.summary(),
            readOffered,
            readMissing: readOffered - reads.count,
          };
          windows.push(evidence);
          jsonFile(path.join(out, "held-" + mode + "-" + rate + "-" + Number(publish) + ".json"), {
            source,
            attempt: peer.attempt,
            seal: descriptor.seal,
            from,
            terminal,
            begins,
            ends,
            tape,
            saves: result.rows,
            read: sides,
            native,
            deadline,
            evidence,
          });
        }
    }
    const report = windows.map((r) => {
      const quiet = windows.find((x) => x.mode === r.mode && x.rate === 3.5 && !x.publish)!;
      const control = windows.find((x) => x.mode === r.mode && x.rate === r.rate && !x.publish)!;
      return {
        ...r,
        firstP50Ms: pct(r.first, 0.5),
        firstP99Ms: p99(r.first),
        againstQuiet: {
          read: ratio(r.reads.p99Ms, quiet.reads.p99Ms),
          commit: ratio(r.writes.account.p99Ms, quiet.writes.account.p99Ms),
        },
        againstMatchedControl: {
          read: ratio(r.reads.p99Ms, control.reads.p99Ms),
          commit: ratio(r.writes.account.p99Ms, control.writes.account.p99Ms),
        },
      };
    });
    // [DX-ACT1] Why: reopening with empty memory verifies both historical and current pins from the same durable source.
    // Rejected: passing a previously memoized string back to the verifier.
    await connected.close();
    connected = await readerPeer(peer, name, descriptor);
    const final = releases.at(-1)!;
    const reopen = await Promise.all(
      [initial, final].map((r) =>
        connected!.read(W0.placementId(people - 1), { position: r.position, validTime }),
      ),
    );
    await verifyRead(reopen[0]!, initial, people - 1);
    await verifyRead(reopen[1]!, final, people - 1);
    jsonFile(path.join(out, "held-reopened.json"), {
      source,
      attempt: peer.attempt,
      seal: descriptor.seal,
      reopen,
    });
    jsonFile(path.join(out, "held-observations.json"), {
      source,
      slot: peer.slot,
      attempt: peer.attempt,
      seal: descriptor.seal,
      diagnostic,
      people,
      physicalScope: db,
      checkedChanges: changes,
      checkedEntries: entries,
      settlement: { valuesMs: settlement.values.ms, noticesMs: settlement.notices.ms },
      windows: report,
      durationMs: now() - start,
    });
  } finally {
    await worker?.close();
    await connected?.close();
    await store?.close();
    oracles.close();
    writer.close();
    reader.close();
  }
}

export function seedToy(out: string, nonce: string, endpoint: string, source: string) {
  execFileSync(
    process.execPath,
    [
      "--no-warnings",
      "--experimental-transform-types",
      "lab/experiments/EXP-DX1/age1/scale1-fixture.mjs",
      process.cwd(),
      out,
      nonce,
      endpoint,
      process.cwd(),
      source,
    ],
    { stdio: "inherit", timeout: 120_000 },
  );
}
