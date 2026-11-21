import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { DatomicClient, orderedSaveIdentity } from "../../../../packages/datomic/dist/index.js";
import { fieldValue } from "../../../bench/lib/deep-world.ts";
import { Histogram } from "../../../bench/lib/hist.ts";
import { SEED_VALID_FROM } from "../../../bench/lib/world.ts";
import { decodeFeed, now, readCell, type Begin, type Feed } from "../scale1/decision/observer.ts";
import { accounts, cellSeconds, field, root, task, writeTape, type Density, type Write } from "../scale1/decision/plan.ts";
import { play, resolveUncertain, type Row, type Save, type Sender } from "../scale1/decision/writes.ts";
import { creditModeSelection } from "../prep1/rolling-credits.ts";
import { defaultCreditMode, type CreditMode } from "../jvm1/launch.mjs";
import { checkAdoptedPeer, hex, openScaleSeal, type AdoptedSeed } from "./adopt.ts";
import { ladder, phaseSeconds, selectedWriter, type Writer } from "./profile.ts";

export type Residency = Record<string, { rssBytes: number; threads: number }>;
export type Peer = { write: string; read: string; slot: string; attempt: string; gatewaySource: string; java: unknown;
  creditMode?: CreditMode; serialApply?: boolean;
  empty?: Residency; residency?: () => Residency | Promise<Residency> };
export type QuietCell = "alone" | 235;
export const jsonFile = (file: string, data: unknown) =>
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n", { flag: "wx", flush: true, mode: 0o600 });

const feeder = async (client: DatomicClient, db: string, from: number, deadline: number,
  getEnd: () => number | undefined, ordered: boolean) => {
  const rows: Feed[] = [];
  let position = from;
  while (getEnd() === undefined || position < getEnd()!) {
    assert(now() < deadline, "Journal did not reach the terminal cut");
    const { transactions } = await client.request<{ transactions: Parameters<typeof decodeFeed>[1][] }>(
      "POST", "/v2/db/" + db + "/transactions", { after: position, limit: 100, waitMs: 250 });
    const at = now();
    for (const tx of transactions) {
      assert.equal(tx[1], ++position);
      rows.push(decodeFeed(db, tx, at, ordered));
    }
    if (!transactions.length) await sleep(25);
  }
  assert.equal(position, getEnd());
  return rows;
};

export function checkSavedIdentity(save: Save, row: Feed, writer: Writer, subjectFunction?: string) {
  const receipt = save.receipt;
  assert(receipt && (save.status === "acked" || save.status === "recovered"));
  assert.equal(row.db, save.db);
  assert.deepEqual([row.id, row.tx, row.position, row.clock, row.digest],
    [save.id, receipt.tx, receipt.p, receipt.clock, receipt.digest]);
  if (writer === "grouped") {
    assert(save.orderedToken === undefined && !save.stage?.subjectOrderedIds);
    return;
  }
  assert(save.orderedToken);
  const block = orderedSaveIdentity(save.orderedToken);
  // [DX-INT1] Why: confirm the ordered identities in the native journal from a separate read peer.
  // Rejected: reporting an ordered save solely from configured flags or from its own acknowledgment.
  assert.equal(row.tx, block.transactionId);
  assert.deepEqual(row.journalIds,
    Array.from({ length: 4 + 2 * save.width }, (_, i) => block.assertionId(save.width + i)));
  if (save.status === "acked") {
    assert(subjectFunction);
    assert.equal(save.stage?.subjectSave, subjectFunction);
    assert.equal(save.stage?.subjectOrderedIds, true);
  }
}

export function matchedTape(people: number, seconds: number) {
  const original = writeTape(people as Density, "alone", 0);
  return Array.from({ length: Math.ceil(seconds / 90) }, (_, block) =>
    original.map((e) => ({ ...e, ms: e.ms + 90_000 * block, version: block + "/" + e.version })))
    .flat().filter((e) => e.ms < seconds * 1000);
}

export function quietTape(people: number, cell: QuietCell, toy: boolean) {
  const tape = writeTape(people as Density, cell, 0);
  return tape.filter((e) => !toy || (e.ms < 8000 && (e.account === 0 || e.ordinal % 20 === 0)))
    .map((e) => ({ ...e, version: "p6/" + e.version }));
}

async function quietReads(client: DatomicClient, seed: AdoptedSeed, start: number, cell: QuietCell, toy: boolean) {
  const message: Begin = { kind: "begin", key: "p6-" + cell, repeat: 0, people: seed.image.people as Density,
    cell, start, scopes: [seed.scope], withReaders: true };
  const sides = await Promise.all([readCell(client, 0, message, toy), readCell(client, 1, message, toy)]);
  const h = new Histogram();
  for (const side of sides) h.merge(Histogram.fromJSON(side.latency));
  return { read: h.summary(), planned: sides.reduce((sum, r) => sum + r.planned, 0),
    errors: sides.flatMap((r) => r.samples).filter((s) => s.error).length };
}

export async function preload(client: DatomicClient, seed: AdoptedSeed, head: number, tape: Write[]) {
  const senders: Sender[] = [];
  for (const a of accounts) {
    const entities = [...new Set(tape.filter((x) => x.account === a).map((x) => task(a, x.subject)))];
    const rows = new Map<string, Row[]>();
    for (let i = 0; i < entities.length; i += 64) {
      const batch = entities.slice(i, i + 64);
      const found = await client.rows(seed.scope.db, {
        entityIds: batch, basis: { recordedPosition: head, validAt: SEED_VALID_FROM },
      });
      for (const entity of batch) rows.set(entity, [0, 1, 2].map((n) => {
        const value = found.filter((x) => x.entity_id === entity && x.attribute === field(n));
        assert.equal(value.length, 1);
        assert(value[0]!.id && value[0]!.recorded_position <= head && Number.isFinite(value[0]!.recorded_at));
        return value[0]!;
      }));
    }
    senders.push({ client, scope: { ...seed.scope, cut: head }, rows });
  }
  return senders;
}

async function readWindows(client: DatomicClient, seed: AdoptedSeed, start: number, loaded: boolean, toy: boolean) {
  const intervals = toy ? [1, 4] : ladder;
  const duration = toy ? 4 : phaseSeconds;
  const phases = [];
  const requested = { recordedPosition: seed.scope.cut, validAt: SEED_VALID_FROM };
  for (const [i, seats] of intervals.entries()) {
    await sleep(Math.max(0, start + i * duration * 1000 - now()));
    const end = start + (i + 1) * duration * 1000;
    const delay = new Histogram();
    let errors = 0;
    await Promise.all(Array.from({ length: loaded ? seats : 0 }, async (_, seat) => {
      let n = seat;
      while (now() < end) {
        const subject = (7919 * ++n) % seed.image.people, a = seat % accounts.length;
        const entity = task(a, subject);
        const issued = now();
        try {
          const result = await client.rows(seed.scope.db, { entityIds: [entity], pattern: { attribute: field(0) }, basis: requested });
          assert.equal(result.length, 1);
          assert.deepEqual([result[0]!.entity_id, result[0]!.attribute, result[0]!.value_string],
            [entity, field(0), fieldValue(subject, 0, 0, 0).value]);
          assert(result[0]!.recorded_position <= requested.recordedPosition);
          if (now() <= end) delay.recordMs(now() - issued);
        } catch { errors++; }
      }
    }));
    phases.push({ seats: loaded ? seats : 0, goodput: delay.count / duration, errors, read: delay.summary() });
  }
  return phases;
}

async function currentPull(client: DatomicClient, seed: AdoptedSeed, head: number, toy: boolean, cold = false) {
  const h = new Histogram();
  let unavailable = 0;
  const basis = { recordedPosition: head, validAt: SEED_VALID_FROM };
  const probes = toy ? 10 : cold ? 200 : 1000;
  for (let i = 0; i < probes; i++) {
    const a = i % accounts.length, person = seed.image.people - (cold ? 2 : 1) - Math.floor(i / accounts.length);
    const id = root(a, person);
    const start = now();
    const found = await client.readDemandWorld(seed.key, id, basis, false);
    if (!found) { unavailable++; continue; }
    const elapsed = now() - start;
    const member = found.triples.filter((r) => r.entityId === id && r.attribute === ":subject/member");
    assert.equal(member.length, 1);
    assert.deepEqual(member[0]!.value, { type: "string", value: String(person) });
    if (cold) {
      const owner = task(a, person);
      const expected = found.triples.filter((r) => r.entityId === owner && r.attribute === field(0));
      // AGE1 may have changed this field since the loader. Verify the original cut on the first read.
      assert.equal(expected.length, 1);
      assert.deepEqual(expected[0]!.value, fieldValue(person, 0, 0, 0));
    }
    h.recordMs(elapsed);
  }
  return { unavailable, observed: h.summary() };
}

export async function adoptedArm(out: string, source: string, peer: Peer, seed: AdoptedSeed, writer: Writer,
  loaded: boolean, toy: boolean, startHead = seed.scope.cut, quietCell?: QuietCell) {
  const begin = now();
  const writerClient = new DatomicClient(peer.write, 35000);
  const reader = new DatomicClient(peer.read, 35000);
  const journal = new DatomicClient(peer.read, 35000);
  let terminal: number | undefined;
  let feeding: ReturnType<typeof feeder> | undefined;
  try {
    const adopted = await checkAdoptedPeer(reader, seed, startHead);
    const writerOpened = peer.write === peer.read ? adopted : await checkAdoptedPeer(writerClient, seed, startHead);
    assert.deepEqual(writerOpened, adopted);
    const selected = selectedWriter(writer);
    // [DX-V01] Why: the SDK selects its wire path while its module loads.
    // Rejected: setting the environment after the SDK import and reporting an unused option.
    assert.equal(process.env.TRIPLEX_DATOMIC_FAST_PATHS, selected.TRIPLEX_DATOMIC_FAST_PATHS);
    const options = await writerClient.request<any>("GET", "/v1/db/" + seed.scope.db + "/write-options");
    assert.deepEqual([options.attempt, options.database, options.position, options.gatewaySourceHash],
      [peer.attempt, seed.scope.db, startHead, peer.gatewaySource]);
    assert(options.commitFunctionInstalled && options.strictRecordClocks && options.rowsVersion === 3);
    assert.match(options.commitFunction, /^:triplex\.write\/v-[a-f0-9]{24}$/);
    assert.equal(options.subjectSave === true, writer === "subject");
    assert.deepEqual([Boolean(options.subjectNumericOwner), Boolean(options.subjectOrderedIds),
      Boolean(options.subjectPrefetch)], [writer === "subject", writer === "subject", false]);
    if (writer === "subject") assert.match(options.subjectFunction, /^:triplex\.subject\/v-[a-f0-9]{24}$/);
    assert.deepEqual([Boolean(options.subjectNarrowRevision), Boolean(options.subjectReusePredecessor)],
      [Boolean(peer.serialApply), Boolean(peer.serialApply)]);
    assert.deepEqual([options.options.predecessorLookup, options.options.smallRows, options.options.ledger,
      options.options.packedJournal, options.options.groupCommit, options.options.reusePrepared,
      options.options.fastReply, options.options.livePriority, options.options.fieldCoalesce,
      options.options.stageClock, options.options.queueClock, options.options.maxMembers],
    [true, writer === "grouped", writer === "grouped", false, writer === "grouped", writer === "grouped",
      true, writer === "grouped", false, true, false, 32]);
    const p7 = quietCell === undefined && peer.empty && peer.residency ? {
      empty: peer.empty, restored: await peer.residency(), people: seed.image.people * accounts.length,
      cold: await currentPull(reader, seed, seed.scope.cut, toy, true),
    } : undefined;
    const seconds = toy ? 8 : quietCell === undefined ? phaseSeconds * ladder.length : cellSeconds(quietCell);
    const tape = quietCell === undefined ? matchedTape(seed.image.people, seconds) : quietTape(seed.image.people, quietCell, toy);
    const senders = await preload(writerClient, seed, startHead, tape);
    const start = now() + 1200;
    const interval = seconds * 1000;
    feeding = feeder(journal, seed.scope.db, startHead, start + interval + 120_000,
      () => terminal, writer === "subject");
    void feeding.catch(() => {});
    const quiet = quietCell === undefined ? Promise.resolve(undefined) : quietReads(reader, seed, start, quietCell, toy);
    const creditMode = peer.creditMode ?? defaultCreditMode;
    const admission = creditModeSelection(creditMode);
    const [writes, phases, quietRead] = await Promise.all([
      play(senders, tape, start, peer.attempt, false, writer === "subject", admission),
      quietCell === undefined ? readWindows(reader, seed, start, loaded, toy) : [], quiet,
    ]);
    await resolveUncertain(senders, writes.unresolved);
    const head = await writerClient.begin(seed.scope.db);
    terminal = head.position;
    await writerClient.release(seed.scope.db, head.handle);
    const feed = await feeding;
    const saves = writes.rows.filter((r) => r.receipt);
    const byPosition = new Map(feed.map((r) => [r.position, r]));
    assert.equal(feed.length, saves.length);
    const saveHistogram = new Histogram();
    for (const row of saves) {
      const r = row.receipt!, actual = byPosition.get(r.p);
      assert(actual);
      checkSavedIdentity(row, actual, writer, options.subjectFunction);
      saveHistogram.recordMs(row.end! - row.due);
    }
    for (const row of saves.filter((_, i) => i === 0 || i === saves.length - 1 || i % 100 === 0)) {
      const op = await writerClient.operation(seed.scope.db, row.id), r = row.receipt!;
      assert.deepEqual([op.status, op.operationId, Number(op.position?.v), op.t?.v, op.recordedAt?.v],
        ["committed", row.id, r.p, r.t, r.clock]);
      assert.equal(await writerClient.claim(seed.scope.db, row.id, r.p), r.tx);
    }
    const pulls = loaded && quietCell === undefined ? await currentPull(reader, seed, terminal, toy) : undefined;
    let p6;
    if (quietRead) {
      const writes = new Histogram(), delivered = new Histogram();
      for (const row of saves.filter((s) => s.account === 0)) {
        writes.recordMs(row.end! - row.due);
        const event = byPosition.get(row.receipt!.p)!;
        if (row.dispatched !== undefined && event.seen >= row.dispatched) delivered.recordMs(event.seen - row.dispatched);
      }
      p6 = { quietCell, durationSeconds: seconds, quietOffers: tape.filter((e) => e.account === 0).length,
        totalOffers: tape.length, totalReceipts: saves.length, read: quietRead,
        commit: writes.summary(), feed: delivered.summary() };
    }
    const evidence = path.join(out, "operations.json");
    jsonFile(evidence, { writes: writes.rows, journal: feed, tape, p6, p7 });
    const result = { source, fixture: toy, slot: peer.slot, attempt: peer.attempt, startedAt: begin, endedAt: now(), start,
      loaded, firstCut: startHead, terminal, seed: adopted, tapeSha256: hex(JSON.stringify(tape)),
      observationsSha256: hex(fs.readFileSync(evidence)), settings: { ...selected, creditMode, observed: options, java: peer.java },
      p1: phases, p2: { offered: tape.length, receipts: saves.length, latency: saveHistogram.summary() },
      p3: { entries: feed.length }, p4: pulls, p6, p7 };
    // [DX-V01] Why: require the complete toy tape and exact read results before publishing the arm.
    // Rejected: declaring success when an empty journal agrees with an empty acknowledged set.
    if (toy) {
      assert(result.p2.offered > 0);
      assert.deepEqual([result.p2.receipts, result.p3.entries], [result.p2.offered, result.p2.offered]);
      if (quietCell === undefined) {
        assert.equal(result.p2.offered, 28);
        assert(result.p1.every((phase) => phase.errors === 0 && (phase.read.count > 0) === loaded));
        assert.deepEqual([p7?.cold.observed.count, p7?.cold.unavailable], [10, 0]);
        if (loaded) assert.deepEqual([pulls?.observed.count, pulls?.unavailable], [10, 0]);
      } else {
        assert(p6?.read && p6.quietOffers > 0 && p6.read.errors === 0);
        assert.equal(p6.read.read.count, p6.read.planned);
      }
    }
    jsonFile(path.join(out, "arm.json"), result);
    return result;
  } finally {
    writerClient.close(); reader.close(); journal.close();
  }
}

export async function quietPair(out: string, source: string, peer: Peer, seed: AdoptedSeed, writer: Writer,
  toy: boolean, startHead: number) {
  const deadline = Date.now() + 30 * 60_000;
  for (const cell of ["alone", 235] as const) {
    assert(Date.now() + 120000 < deadline);
    const folder = path.join(out, "p6-" + cell);
    fs.mkdirSync(folder);
    const r = await adoptedArm(folder, source, peer, seed, writer, cell === 235, toy, startHead, cell);
    startHead = r.terminal;
  }
}

export async function adoptedToy(out: string, source: string, peer: Peer, writer: Writer) {
  assert(!process.env.DX_THIN_MEASURE);
  peer.empty = await peer.residency?.();
  for (const loaded of [false, true]) {
    const folder = path.join(out, loaded ? "loaded" : "zero");
    fs.mkdirSync(folder);
    const nonce = randomUUID();
    const stdout = execFileSync(process.execPath, ["--no-warnings", "--experimental-transform-types",
      "lab/experiments/EXP-DX1/age1/scale1-fixture.mjs", process.cwd(), folder, nonce, peer.write, process.cwd(), source],
    { encoding: "utf8", timeout: 120000, env: process.env });
    fs.writeFileSync(path.join(folder, "loader.log"), stdout, { flag: "wx" });
    const seal = path.join(folder, "fixture.json");
    const seed = openScaleSeal(seal, hex(fs.readFileSync(seal)), true);
    const arm = await adoptedArm(folder, source, peer, seed, writer, loaded, true);
    if (loaded) await quietPair(out, source, peer, seed, writer, true, arm.terminal);
  }
}
