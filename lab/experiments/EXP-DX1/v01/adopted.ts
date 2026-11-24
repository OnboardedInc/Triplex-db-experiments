import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { setTimeout as sleep } from "node:timers/promises";
import { DatomicClient, orderedSaveIdentity } from "../../../../packages/datomic/dist/index.js";
import { fieldValue } from "../../../bench/lib/deep-world.ts";
import { Histogram } from "../../../bench/lib/hist.ts";
import { SEED_VALID_FROM } from "../../../bench/lib/world.ts";
import { decodeFeed, now, readCell, type Begin, type Feed } from "../scale1/decision/observer.ts";
import { accounts, activeSubjects, cellSeconds, field, root, serialApplyTape, task, writeTape, type Density, type SerialApplyRate, type Write } from "../scale1/decision/plan.ts";
import { play, resolveUncertain, type Row, type Save, type Sender } from "../scale1/decision/writes.ts";
import { checkAdoptedPeer, hex, openScaleSeal, type AdoptedSeed } from "./adopt.ts";
import { ladder, phaseSeconds, selectedWriter, type Writer } from "./profile.ts";
import { pinnedFields } from "./pinned-fields.ts";
import { cellPath, writerAdmission, ratedTape, serverCells, serverCellSeconds, type CreditMode, type ServerCell, type WindowSeconds } from "./server-workload.ts";

import { checkRealisticField, ownerFields, thinSweep, toyRealSeed, withOwners } from "./realistic.ts";
import { realisticSubject, realisticTape } from "./realistic-plan.ts";
import { subject as realSubject } from "../real1/population.ts";
import { defaultCreditMode } from "../jvm1/launch.mjs";
import { collectCell, type physicalTelemetry } from "./cell-telemetry.ts";
import { migratedReadRate, recentlyOffered, sampleMigratedReads } from "../w1/migrated-reads.ts";
import { cardTapeReport, fullCellTape, isProduction, parseCardTape, productionCellMetrics, productionNeighbours, productionPredecessors,
  productionReadback, sortTape, tapeEdge, tapeShape, type AgedCut, type ProductionWrite } from "./production-card.ts";
import { gatewayTimes, randomLine, randomLineLoads, type P1Reader, type ReaderRecords } from "./card-reader.ts";

export type Residency = Record<string, { rssBytes: number; threads: number }>;
export type Peer = { write: string; read: string; slot: string; attempt: string; gatewaySource: string; java: unknown;
  telemetry?: ReturnType<typeof physicalTelemetry>; windowSeconds?: WindowSeconds; creditMode?: CreditMode; serialApply?: boolean; realisticToySlot?: string;
  // [DX-INT1] On the 1 billion copy: AGE1's admitted cut, so the production predecessors check AGE1's own rows exactly.
  aged?: { cut: AgedCut; head: number };
  // [DX-CARD2] The tuned reader's P1 ladder: client batches and the random-subject line (v01/card-reader.ts).
  p1?: P1Reader;
  empty?: Residency; residency?: () => Residency | Promise<Residency> };
export type QuietCell = "alone" | 235;
export type RetirementStudy = { rate: SerialApplyRate; append: boolean; seconds: 120 | 300; agedHead?: number };

// [DX-INT1] Why: on the 1 billion copy the pair must say whether the owner head behaves the same on people the aging
// loader edited (AGE1 row IDs, revisions at the loader's positions) as on people it never touched. Each tape person is
// put in one group from the predecessor rows the window read at its first cut: "loader" when any of them was written
// after the seed cut and at or before the aged head, "earlier-window" when none was but one was written by this run's
// previous window, and "seed" when all of them are the seed's own rows.
// Rejected: grouping by AGE1's ledger formula (it would restate the loader's plan, not what the database holds).
export type OwnerGroup = "loader" | "earlier-window" | "seed";
export function ownerGroups(senders: Sender[], seedCut: number, agedHead: number) {
  assert(Number.isSafeInteger(agedHead) && agedHead >= seedCut);
  const groups = new Map<string, OwnerGroup>();
  for (const sender of senders) for (const [owner, rows] of sender.rows)
    groups.set(owner, rows.some((r) => r.recorded_position > seedCut && r.recorded_position <= agedHead) ? "loader"
      : rows.some((r) => r.recorded_position > agedHead) ? "earlier-window" : "seed");
  return groups;
}
// [DX-RD3] Why: the pinned arm with saves runs its read ladder in the same window as a card cell's saves, on the same
// stack, and pins some reads at positions the cell's own saves have just written (each checked against the sender's
// record of what the save wrote). Rejected: a second save runner (the card's admission, journal, identity and
// read-back checks must judge these saves too).
export type Alongside = { label?: string; run: (window: { start: number; seconds: number; startHead: number;
  tape: readonly Write[]; senders: readonly Sender[]; production: boolean }) => Promise<unknown> };
export type ReadStudy = { rate: 50 | 235; batch: number; sample: boolean; counters?: () => unknown };
type ReadSamples = (Parameters<Parameters<DatomicClient["withReadProfile"]>[0]>[0] & { sdkDone?: number })[];
const sampledRead = async <A>(client: DatomicClient, samples: ReadSamples, send: () => Promise<A>) => {
  const own: ReadSamples = [];
  try { return await client.withReadProfile((row) => own.push(row), send); }
  finally {
    const sdkDone = now();
    for (const row of own) samples.push({ ...row, sdkDone });
  }
};
export const jsonFile = (file: string, data: unknown) =>
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n", { flag: "wx", flush: true, mode: 0o600 });

export const feeder = async (client: DatomicClient, db: string, from: number, deadline: number, getEnd: () => number | undefined, ordered: boolean) => {
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

const ownerHeadPair = process.env.DX_W1_PAIR_OPTION === "owner-head";
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
  // [DX-INT1] Why: a production commit over 256 assertions carries the general identity and goes to the general writer.
  // Rejected: skipping the identity check for it (its journal row must still match its receipt, checked above).
  if (save.generalIdentity) {
    assert(save.orderedToken === undefined && save.assertions! > 256 && !save.stage?.subjectSave && !save.stage?.subjectOrderedIds);
    return;
  }
  assert(save.orderedToken);
  const block = orderedSaveIdentity(save.orderedToken);
  // [DX-INT1] Why: confirm the ordered identities in the native journal from a separate read peer.
  // Rejected: reporting an ordered save solely from configured flags or from its own acknowledgment.
  // A production commit has one journal change per fact and per retired value (a first write retires nothing).
  const facts = save.facts ?? save.width, retired = save.retired ?? save.width;
  assert.equal(row.tx, block.transactionId);
  assert.deepEqual(row.journalIds,
    Array.from({ length: 4 + facts + retired }, (_, i) => block.assertionId(facts + i)));
  if (save.saveKey !== undefined) {
    // The per-subject writer takes only commits of one to three facts that each replace a current value; every other
    // production commit takes the general writer with its ordered identity, and both must be exact.
    if (save.status === "acked") {
      const subjectPath = facts <= 3 && retired === facts;
      assert.equal(Boolean(save.stage?.subjectSave), subjectPath, `${save.id}: writer path differs from the per-subject rule`);
      if (subjectPath) assert.equal(save.stage?.subjectSave, subjectFunction);
    }
    return;
  }
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

async function quietReads(client: DatomicClient, seed: AdoptedSeed, start: number, cell: Begin["cell"], toy: boolean,
  windowSeconds?: WindowSeconds, isolation = false) {
  const message: Begin = { kind: "begin", key: "p6-" + cell, repeat: 0, people: seed.image.people as Density,
    cell, start, scopes: [seed.scope], withReaders: true, ...(isolation ? { isolation } : {}),
    // [DX-V01] Why: observe both halves on the same pinned read tape. Rejected: placing all quiet reads in the cold half.
    // [DX-CARD2] Cells of other lengths than 90 s read over the cell as the 300 s cells do: from 15 s to 15 s before the end.
    readerWindow: windowSeconds !== undefined && windowSeconds !== 90 ? { from: 15000, duration: (windowSeconds - 30) * 1000 } : undefined };
  const sides = await Promise.all([readCell(client, 0, message, toy), readCell(client, 1, message, toy)]);
  const h = new Histogram();
  for (const side of sides) h.merge(Histogram.fromJSON(side.latency));
  return { read: h.summary(), planned: sides.reduce((sum, r) => sum + r.planned, 0),
    errors: sides.flatMap((r) => r.samples).filter((s) => s.error).length,
    wrong: sides.flatMap((r) => r.samples).filter((s) => s.error?.startsWith("AssertionError")).length };
}

// [DX-THIN1] Why: the held Publish, removal and fair-import runners preload through their writer, as before the card merge.
// Rejected: changing those runners' call sites to pass the realistic card's separate reader.
export const preload = (client: DatomicClient, seed: AdoptedSeed, head: number, tape: Write[]) =>
  preloadFrom(client, client, seed, head, tape);

async function preloadFrom(client: DatomicClient, reader: DatomicClient, seed: AdoptedSeed, head: number, tape: Write[]) {
  const senders: Sender[] = [];
  for (const a of seed.realistic?.accounts.map(a => a.id) ?? accounts) {
    const fields = ownerFields(seed.realistic?.accounts[a]);
    const entities = [...new Set(tape.filter((x) => x.account === a).map((x) => x.owner ?? task(a, x.subject)))];
    const rows = new Map<string, Row[]>();
    for (let i = 0; i < entities.length; i += 64) {
      const batch = entities.slice(i, i + 64);
      const found = await reader.rows(seed.scope.db, {
        entityIds: batch, basis: { recordedPosition: head, validAt: SEED_VALID_FROM },
      });
      for (const entity of batch) rows.set(entity, fields.map((attribute) => {
        const value = found.filter((x) => x.entity_id === entity && x.attribute === attribute);
        assert.equal(value.length, 1);
        assert(value[0]!.id && value[0]!.recorded_position <= head && Number.isFinite(value[0]!.recorded_at));
        return value[0]!;
      }));
    }
    senders.push({ client, scope: { ...seed.scope, cut: head }, rows });
  }
  return senders;
}

async function readWindows(client: DatomicClient, seed: AdoptedSeed, start: number, loaded: boolean, toy: boolean,
  study?: ReadStudy, samples: ReadSamples = [], p1?: P1Reader, read?: string, line: { random?: RandomLine } = {}) {
  assert(!(study && p1), "The read study keeps its own batching");
  const intervals = toy ? [1, 4] : ladder;
  const duration = toy ? 4 : study ? 30 : phaseSeconds;
  const phases = [];
  const requested = { recordedPosition: seed.realistic?.proof.cut ?? seed.scope.cut, validAt: SEED_VALID_FROM };
  for (const [i, seats] of intervals.entries()) {
    await sleep(Math.max(0, start + i * duration * 1000 - now()));
    const end = start + (i + 1) * duration * 1000;
    const delay = new Histogram();
    const cpu = study && process.cpuUsage(), elu = study && performance.eventLoopUtilization();
    const begin = study?.counters?.();
    const seen = study && new Uint8Array(Math.ceil(seed.image.people * accounts.length / 8));
    const perSeat = study && new Uint32Array(seats);
    let errors = 0, unique = 0, exchanges = 0, groupTotal = 0, peakQueued = 0, peakSockets = 0, index = 0;
    const mix = { deep: 0, thin: 0, small: 0 };
    // [DX-THIN1] Why: without a read study this sends one exact client.rows call per read, as the card does.
    // Rejected: a second read path for the scorecard's unbatched ladder.
    // [DX-CARD2] With the tuned reader the card's ladder sends queued reads together, up to p1.batch per exchange.
    const send = pinnedFields(client, seed.scope.db, field(0), requested, study?.batch ?? p1?.batch ?? 1, (send, size) => {
      if (!study) {
        if (p1) { exchanges++; groupTotal += size; }
        return send();
      }
      groupTotal += size;
      return ++exchanges % 128 === 0 && study.sample ? sampledRead(client, samples, send) : send();
    });
    const poll = study && setInterval(() => {
      peakQueued = Math.max(peakQueued, Object.values(client.agent.requests).reduce((n, xs) => n + (xs?.length ?? 0), 0));
      peakSockets = Math.max(peakSockets, Object.values(client.agent.sockets).reduce((n, xs) => n + (xs?.length ?? 0), 0));
    }, 250);
    const startedAt = now();
    await Promise.all(Array.from({ length: loaded ? seats : 0 }, async (_, seat) => {
      let n = seat;
      while (now() < end) {
        const subject = (7919 * ++n) % seed.image.people, a = seat % accounts.length;
        const entity = task(a, subject);
        const issued = now();
        try {
          if (seed.realistic) {
            assert(!study, "The read study uses the SCALE1 deep tape");
            const target = realisticSubject(seed.realistic, index++);
            await checkRealisticField(client, seed, target.account, target.person);
            if (now() <= end) { delay.recordMs(now() - issued); mix[target.account.kind]++; }
            continue;
          }
          const result = await send(entity);
          assert.equal(result.length, 1);
          assert.deepEqual([result[0]!.entity_id, result[0]!.attribute, result[0]!.value_string],
            [entity, field(0), fieldValue(subject, 0, 0, 0).value]);
          assert(result[0]!.recorded_position <= requested.recordedPosition);
          const checked = now();
          if (checked <= end) {
            delay.recordMs(checked - issued);
            if (seen && perSeat) {
              perSeat[seat] = perSeat[seat]! + 1;
              const key = a * seed.image.people + subject, bit = 1 << (key % 8), index = Math.floor(key / 8);
              if ((seen[index]! & bit) === 0) { seen[index] = seen[index]! | bit; unique++; }
            }
          }
        } catch { errors++; }
      }
    }));
    if (poll) clearInterval(poll);
    phases.push({ seats: loaded ? seats : 0, goodput: delay.count / duration, errors, read: delay.summary(), mix: seed.realistic ? mix : undefined,
      ...(p1 ? { batch: { size: p1.batch, exchanges, meanBatch: exchanges ? groupTotal / exchanges : 0 } } : {}),
      diagnostic: study ? { startedAt, deadline: end, drainedAt: now(), unique, perSeat: Array.from(perSeat || []), exchanges,
        groupTotal, peakQueued, peakSockets, cpu: process.cpuUsage(cpu || undefined),
        eventLoop: performance.eventLoopUtilization(elu || undefined), gateway: { begin, end: study.counters?.() } } : undefined });
  }
  if (p1?.random && loaded) line.random = await randomSubjects(read!, seed, start + intervals.length * duration * 1000, duration, p1);
  return phases;
}

// [DX-CARD2] The random-subject line after the re-read ladder: 256 seats for one step, each read a random subject of
// the whole population at the seed cut, checked against the seed's value (rd1/pinned-ladder.ts pinnedWindow, the
// measured random windows' own read), then the reader's io-stats for the sampled exchanges and its metrics minutes.
export type RandomLine = Awaited<ReturnType<typeof randomSubjects>>;
async function randomSubjects(read: string, seed: AdoptedSeed, start: number, seconds: number, p1: P1Reader) {
  assert(p1.random && !seed.realistic, "The random-subject line reads the SCALE1 deep population");
  const { pinnedWindow, readerRecords } = await import("../rd1/pinned-ladder.ts");
  const trace = p1.random.trace, offset = trace && fs.existsSync(trace) ? fs.statSync(trace).size : 0;
  const step = await pinnedWindow(read, seed, randomLine.pin, { start, seconds, startHead: seed.scope.cut, candidates: [] },
    { seats: p1.random.seats, batch: p1.batch, profileEvery: p1.random.profileEvery });
  let reader: ReaderRecords | { error: string } | undefined;
  if (trace && fs.existsSync(trace)) {
    // The reader buffers its trace; wait before taking this line's sampled exchanges and metrics minutes.
    await sleep(3000);
    try { reader = readerRecords(trace, offset, start, start + seconds * 1000, step.profiled?.ids ?? []); }
    catch (error) { reader = { error: String(error) }; }
  }
  return { ...step, reader, loads: reader && !("error" in reader) ? randomLineLoads(reader, step.goodput, step.meanBatch) ?? null : null };
}

async function realisticBackground(client: DatomicClient, seed: AdoptedSeed, start: number, seconds: number, toy: boolean) {
  const rate = toy ? 10 : 64;
  const mix = { deep: 0, thin: 0, small: 0 };
  let errors = 0;
  await Promise.all(Array.from({ length: 4 }, async (_, seat) => {
    for (let i = seat; i < seconds * rate; i += 4) {
      const due = start + i * 1000 / rate;
      while (now() < due) await sleep(Math.ceil(due - now()));
      if (now() >= start + seconds * 1000) { errors++; continue; }
      const { account, person } = realisticSubject(seed.realistic!, i);
      await checkRealisticField(client, seed, account, person);
      mix[account.kind]++;
    }
  }));
  return { mix, errors };
}

async function currentPull(client: DatomicClient, seed: AdoptedSeed, head: number, toy: boolean, cold = false, samples?: ReadSamples, every = 16) {
  const h = new Histogram();
  const byKind = { deep: new Histogram(), thin: new Histogram(), small: new Histogram() };
  let unavailable = 0;
  const basis = { recordedPosition: head, validAt: SEED_VALID_FROM };
  // [DX-V01] Why: one full mix cycle exercises every account kind even on the Mac.
  // Rejected: ten toy pulls, which reach only deep subjects.
  const probes = toy ? (seed.realistic ? 20 : 10) : cold ? 200 : 1000;
  for (let i = 0; i < probes; i++) {
    const a = i % accounts.length, person = seed.image.people - (cold ? 2 : 1) - Math.floor(i / accounts.length);
    const mixed = seed.realistic && realisticSubject(seed.realistic, i);
    const selected = mixed ? mixed.person : person;
    const id = mixed ? realSubject(mixed.account, selected) : root(a, person);
    const start = now();
    const pull = () => client.readDemandWorld(seed.key, id, basis, false);
    const found = await (samples && i % every === 0 ? sampledRead(client, samples, pull) : pull());
    if (!found) { unavailable++; continue; }
    const elapsed = now() - start;
    const member = found.triples.filter((r) => r.entityId === id && r.attribute === ":subject/member");
    assert.equal(member.length, 1);
    assert.deepEqual(member[0]!.value, { type: "string", value: String(selected) });
    if (cold) {
      const owner = task(a, person);
      const expected = found.triples.filter((r) => r.entityId === owner && r.attribute === field(0));
      // AGE1 may have changed this field since the loader. Verify the original cut on the first read.
      assert.equal(expected.length, 1);
      assert.deepEqual(expected[0]!.value, fieldValue(person, 0, 0, 0));
    }
    h.recordMs(elapsed);
    if (mixed) byKind[mixed.account.kind].recordMs(elapsed);
  }
  return { unavailable, observed: h.summary(), byKind: seed.realistic ? {
    deep: byKind.deep.summary(), thin: byKind.thin.summary(), small: byKind.small.summary(),
  } : undefined };
}

export async function adoptedArm(out: string, source: string, peer: Peer, seed: AdoptedSeed, writer: Writer,
  loaded: boolean, toy: boolean, startHead = seed.scope.cut, quietCell?: QuietCell | ServerCell, comparison = false,
  study?: ReadStudy, retirement?: RetirementStudy, alongside?: Alongside) {
  const begin = now();
  const writerClient = new DatomicClient(peer.write, 35000);
  const reader = new DatomicClient(peer.read, 35000);
  const journal = new DatomicClient(peer.read, 35000);
  let terminal: number | undefined;
  let feeding: ReturnType<typeof feeder> | undefined;
  const abort = new AbortController();
  let telemetry: ReturnType<typeof collectCell> | undefined;
  try {
    const adopted = await checkAdoptedPeer(study ? writerClient : reader, seed, startHead);
    const writerOpened = study || peer.write === peer.read ? adopted : await checkAdoptedPeer(writerClient, seed, startHead);
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
    assert.equal(options.subjectSave === true, writer === "per-person-ordered");
    if (writer === "per-person-ordered") {
      assert.match(options.subjectFunction, /^:triplex\.subject\/v-[a-f0-9]{24}$/);
      assert(options.subjectOrderedIds && options.subjectNumericOwner && !options.subjectPrefetch);
    }
    // [DX-S1] The default-off writer options the arm was given are the ones its writer runs (run.ts passes them).
    assert.deepEqual([Boolean(options.subjectWide), Boolean(options.options?.generalPrefetch), Boolean(options.options?.subjectHints)],
      [process.env.TX2_SUBJECT_WIDE === "1", process.env.TX2_GENERAL_PREFETCH === "1", process.env.TX2_SUBJECT_HINTS === "1"]);
    assert.deepEqual([Boolean(options.subjectNarrowRevision), Boolean(options.subjectReusePredecessor)],
      [Boolean(peer.serialApply), Boolean(peer.serialApply)]);
    if (retirement) {
      assert(writer === "per-person-ordered" && !toy && loaded && quietCell === undefined);
      // [Opus W1] Why: DX_W1_PAIR_OPTION=owner-head pairs the covering owner root against today's writer instead.
      assert.equal(Boolean(ownerHeadPair ? options.subjectOwnerHead : options.subjectAppendRetirement), retirement.append);
    }
    assert.deepEqual([options.options.predecessorLookup, options.options.smallRows, options.options.ledger,
      options.options.packedJournal, options.options.groupCommit, options.options.reusePrepared,
      options.options.fastReply, options.options.livePriority, options.options.fieldCoalesce,
      options.options.stageClock, options.options.queueClock, options.options.maxMembers],
    [true, writer === "grouped", writer === "grouped", false, writer === "grouped", writer === "grouped", true, writer === "grouped", false, true, false, 32]);
    // [DX-THIN1] Why: the read and retirement studies keep their SCALE1 tapes; every other arm is the card's own.
    // Rejected: running a study on the realistic seed or a rated cell, which neither study was gated on.
    assert(!(study || retirement) || (!seed.realistic && !comparison && typeof quietCell !== "object"));
    const thin = seed.realistic && loaded && !comparison && quietCell === undefined && peer.residency
      ? await thinSweep(reader, seed, peer.residency) : undefined;
    const p7 = !retirement && !study && !seed.realistic && quietCell === undefined && !comparison && writer !== "grouped" && peer.empty && peer.residency ? {
      empty: peer.empty, restored: await peer.residency(), people: seed.image.people * accounts.length,
      cold: await currentPull(reader, seed, seed.scope.cut, toy, true),
    } : undefined;
    const rated = typeof quietCell === "object" ? quietCell : undefined;
    const windowSeconds = peer.windowSeconds ?? serverCellSeconds;
    // [DX-CARD2] The random-subject line adds one ladder step to the P1-P4 pair, in both arms, so their tapes still match.
    const randomStep = peer.p1?.random && quietCell === undefined && !study && !retirement ? (toy ? 4 : phaseSeconds) : 0;
    const seconds = retirement?.seconds ?? (toy ? 8 + randomStep : study ? 30 * ladder.length : rated ? windowSeconds
      : quietCell === undefined ? phaseSeconds * ladder.length + randomStep : cellSeconds("alone"));
    // [DX-INT1] The production-shaped tape replaces the neighbour saves of the loaded cells (DX_V01_TAPE).
    const cardTape = parseCardTape(process.env.DX_V01_TAPE), shape = tapeShape(cardTape), edge = tapeEdge(cardTape);
    const productionCell = shape !== undefined && !retirement && !study && !comparison &&
      ((rated !== undefined && rated.loaded) || (toy && quietCell === 235));
    // [DX-RD3] A window repeated on one stack takes a label, so its saves write new values instead of the same ones.
    const relabel = <T extends Write>(t: T[]): T[] => alongside?.label ? t.map((e) => ({ ...e, version: alongside.label + "/" + e.version })) : t;
    const production = productionCell ? relabel((() => {
      if (rated) return fullCellTape(shape!, rated, windowSeconds, edge);
      const quiet = quietTape(seed.image.people, 235, true).filter((e) => e.account === 0);
      // The toy folds each tape subject onto one of its few people per account, in order of first appearance.
      const folded = new Map<string, number>(), perAccount = new Map<number, number>();
      const fold = toy ? (account: number, person: number) => {
        const key = account + "/" + person;
        if (!folded.has(key)) {
          const n = perAccount.get(account) ?? 0;
          folded.set(key, n % seed.image.people);
          perAccount.set(account, n + 1);
        }
        return folded.get(key)!;
      } : undefined;
      const neighbours = productionNeighbours(shape!, 235, Array(9).fill(12), seconds, "p6-235", fold, edge);
      return sortTape([...quiet, ...neighbours]);
    })()) : undefined;
    const tape = production ? production : relabel(retirement ? serialApplyTape(seed.image.people as Density, retirement.rate, seconds)
      : study ? [0, 1].flatMap((block) => writeTape(seed.image.people as Density, study.rate, block)
        .map((entry) => ({ ...entry, ms: entry.ms + 90_000 * block, version: `rd1/${study.rate}/${entry.version}` })))
        .filter((entry) => entry.ms < seconds * 1000 && (!toy || entry.ordinal % 20 === 0))
      : seed.realistic ? withOwners(seed.realistic, realisticTape(seed.realistic,
        rated ? cellPath(rated) : quietCell === undefined ? "prelude" : "p6-" + quietCell, seconds,
        rated ? (rated.loaded ? rated.rate - 3.5 : 0) : quietCell === undefined ? 4.6 : quietCell === 235 ? 30 : 0))
      : rated ? ratedTape(seed.image.people, rated, windowSeconds) : quietCell === undefined
      ? matchedTape(seed.image.people, seconds) : quietTape(seed.image.people, quietCell as QuietCell, toy));
    if (retirement) assert.equal(tape.length, retirement.rate * seconds);
    const senders = await preloadFrom(writerClient, rated ? reader : writerClient, seed, startHead,
      production ? tape.filter((e) => !isProduction(e)) : tape);
    // [DX-INT1] Production subjects: every task-0 field, checked as production-card.ts productionPredecessors says.
    const predecessors = production ? await productionPredecessors(rated ? reader : writerClient, seed.scope.db, startHead,
      seed.scope.cut, (production.filter(isProduction) as ProductionWrite[]).map((e) => ({ account: e.account, person: e.person })),
      peer.aged) : undefined;
    const accountOf = new Map((production ?? []).filter(isProduction).map((e) => [e.owner, e.account]));
    if (predecessors) for (const [entity, rows] of predecessors.fields) senders[accountOf.get(entity)!]!.rows.set(entity, rows);
    const tapeReport = production ? cardTapeReport(production, seconds) : undefined;
    if (tapeReport) jsonFile(path.join(out, "tape-report.json"), tapeReport);
    const groups = retirement ? ownerGroups(senders, seed.scope.cut, retirement.agedHead ?? seed.scope.cut) : undefined;
    const tapeGroups = groups && Object.fromEntries(tape.map((e) => [e.account + "/" + e.subject,
      groups.get((e as Write & { owner?: string }).owner ?? task(e.account, e.subject))!]));
    if (tapeGroups) assert(Object.values(tapeGroups).every((g) => g !== undefined));
    const before = retirement ? process.hrtime.bigint() : undefined;
    const wall = now();
    const after = retirement ? process.hrtime.bigint() : undefined;
    const start = wall + 1200;
    const serialAnchor = retirement ? { wall, before: String(before), after: String(after) } : undefined;
    const interval = seconds * 1000;
    if (rated && peer.telemetry) {
      telemetry = collectCell(peer.telemetry, { source, slot: peer.slot, attempt: peer.attempt, database: seed.scope.db,
        firstCut: startHead, cell: rated, start, end: start + interval }, abort.signal);
      void telemetry.catch(() => {});
    }
    feeding = feeder(journal, seed.scope.db, startHead, start + interval + 120_000, () => terminal, writer === "per-person-ordered");
    void feeding.catch(() => {});
    const quiet = retirement?.seconds === 300 ? quietReads(reader, seed, start, 394, false, undefined, true)
      : quietCell === undefined ? Promise.resolve(undefined) : quietReads(reader, seed, start, rated ? "alone" : quietCell as QuietCell, toy, rated ? windowSeconds : undefined);
    const mode = peer.creditMode ?? defaultCreditMode;
    // [DX-THIN1] Why: the read and retirement studies always applied the selected credits, including on the Mac toy.
    // Rejected: letting the card's toy shortcut change what those studies exercised.
    const selection = study || retirement || !toy || quietCell !== undefined || mode !== defaultCreditMode ? writerAdmission(mode) : undefined;
    const credits = selection?.credits ?? 0;
    const background = seed.realistic && quietCell !== undefined && loaded
      ? realisticBackground(reader, seed, start, seconds, toy) : undefined;
    const samples: ReadSamples = [];
    // [Opus W1] Why: the owner-head pair times reads of people this tape has just saved, in both arms, on a separate
    // reader client at a low fixed rate, outside the save path's clock.
    const migratedReader = retirement ? new DatomicClient(peer.read, 35000) : undefined;
    const ownerOf = (e: Write) => (e as Write & { owner?: string }).owner ?? task(e.account, e.subject);
    const migratedLoaded = migratedReader ? sampleMigratedReads(migratedReader, seed.scope.db, { phase: "loaded",
      start: start + 2000, seconds: seconds - 2, firstCut: startHead, validAt: SEED_VALID_FROM,
      candidates: (at) => recentlyOffered(tape, start, at, 1000, ownerOf) }) : undefined;
    void migratedLoaded?.catch(() => {}); // awaited after the window; never an unhandled rejection mid-window
    const line: { random?: RandomLine } = {};
    const [writes, phases, quietRead, mixedReads, alongsideResult] = await Promise.all([
      play(senders, tape, start, peer.attempt, false, writer === "per-person-ordered", selection),
      !retirement && quietCell === undefined && !comparison ? readWindows(reader, seed, start, loaded, toy, study, samples,
        peer.p1, peer.read, line) : [], quiet, background,
      alongside?.run({ start, seconds, startHead, tape, senders, production: production !== undefined }),
    ]);
    await resolveUncertain(senders, writes.unresolved);
    const head = await writerClient.begin(seed.scope.db);
    terminal = head.position;
    await writerClient.release(seed.scope.db, head.handle);
    const feed = await feeding;
    const saves = writes.rows.filter((r) => r.receipt);
    let migratedReads;
    if (migratedReader) {
      const loadedReads = await migratedLoaded!;
      const savedPeople = [...new Set(saves.map((r) => ownerOf(r as unknown as Write)))].reverse();
      const settled = await sampleMigratedReads(migratedReader, seed.scope.db, { phase: "settled", start: now() + 1000,
        seconds: 30, firstCut: startHead, validAt: SEED_VALID_FROM, candidates: () => savedPeople });
      migratedReader.close();
      migratedReads = { ratePerSecond: migratedReadRate, client: "separate reader client on the read gateway",
        loaded: loadedReads, settled };
    }
    const byPosition = new Map(feed.map((r) => [r.position, r]));
    assert.equal(feed.length, saves.length);
    const saveHistogram = new Histogram();
    for (const row of saves) {
      const r = row.receipt!, actual = byPosition.get(r.p);
      assert(actual);
      checkSavedIdentity(row, actual, writer, options.subjectOwnerHeadFunction ?? options.subjectFunction);
      if (retirement && row.status === "acked")
        assert.equal(Boolean(ownerHeadPair ? row.stage?.subjectOwnerHeadBytes : row.stage?.subjectAppendRetirement), retirement.append);

      saveHistogram.recordMs(row.end! - row.due);
    }
    for (const row of saves.filter((_, i) => i === 0 || i === saves.length - 1 || i % 100 === 0)) {
      const op = await writerClient.operation(seed.scope.db, row.id), r = row.receipt!;
      assert.deepEqual([op.status, op.operationId, Number(op.position?.v), op.t?.v, op.recordedAt?.v],
        ["committed", row.id, r.p, r.t, r.clock]);
      assert.equal(await writerClient.claim(seed.scope.db, row.id, r.p), r.tx);
    }
    // [DX-INT1] Every field of every production subject, read back at the terminal cut, equals the acknowledged writes.
    const productionResult = production && predecessors && tapeReport ? {
      tape: process.env.DX_V01_TAPE, shape, tapeReportSha256: hex(fs.readFileSync(path.join(out, "tape-report.json"))),
      predecessors: predecessors.counts,
      readback: await productionReadback(reader, seed.scope.db, terminal!, new Map([...predecessors.fields.keys()].map((e) =>
        [e, senders[accountOf.get(e)!]!.rows.get(e)!]))),
      metrics: productionCellMetrics(writes.rows, start, seconds),
    } : undefined;
    const pullArm = !retirement && loaded && !comparison && writer !== "grouped" && quietCell === undefined;
    // [DX-CARD2] P4 starts only after the reader's backlog from the ladder's 1,024-seat step has drained (on the cards
    // of 2026-11-23 the first pull waited 25 s behind abandoned reads), and with the tuned reader every pull carries a
    // read-profile header, so the reader records each pull's gateway time, not only those over 50 ms.
    const drain = pullArm && !study ? await drainReader(reader, seed, toy) : undefined;
    const pullWire: ReadSamples = [];
    const traceOffset = peer.p1?.random?.trace && fs.existsSync(peer.p1.random.trace) ? fs.statSync(peer.p1.random.trace).size : 0;
    const pulls = pullArm
      ? await currentPull(reader, seed, terminal, toy, false, study?.sample ? samples : peer.p1 ? pullWire : undefined, study ? 16 : 1) : undefined;
    let pullGateway: ReturnType<typeof gatewayTimes> | { error: string } | undefined;
    if (pulls && peer.p1?.random?.trace && fs.existsSync(peer.p1.random.trace)) {
      await sleep(3000);
      try { pullGateway = gatewayTimes(peer.p1.random.trace, traceOffset, pullWire.map((w) => w.id)); }
      catch (error) { pullGateway = { error: String(error) }; }
    }
    const p4Extra = { p4Drain: drain, p4Gateway: peer.p1 ? pullGateway ?? null : undefined, p4Wire: peer.p1 ? wireSummary(pullWire) : undefined };
    if (study) jsonFile(path.join(out, "read-wire.json"), { source, slot: peer.slot, attempt: peer.attempt,
      clock: { bootId: process.platform === "linux" ? fs.readFileSync("/proc/sys/kernel/random/boot_id", "utf8").trim() : null,
        offsetMs: now() - Number(process.hrtime.bigint()) / 1e6 }, samples });
    let p6;
    if (quietRead) {
      const quietCommits = new Histogram(), delivered = new Histogram();
      for (const row of saves.filter((s) => s.account === 0)) {
        quietCommits.recordMs(row.end! - row.due);
        const event = byPosition.get(row.receipt!.p)!;
        if (row.dispatched !== undefined && event.seen >= row.dispatched) delivered.recordMs(event.seen - row.dispatched);
      }
      p6 = { quietCell, durationSeconds: seconds, quietOffers: tape.filter((e) => e.account === 0).length,
        mixedReads, totalOffers: tape.length, totalReceipts: saves.length, read: quietRead,
        acknowledgedInWindow: saves.filter((s) => s.status === "acked" && s.end! < start + interval).length,
        expired: writes.rows.filter((s) => s.status === "expired-before-dispatch").length,
        commit: quietCommits.summary(), feed: delivered.summary() };
    }
    let telemetrySha256: string | undefined;
    if (telemetry) {
      const name = path.join(out, "telemetry.json");
      jsonFile(name, await telemetry);
      telemetrySha256 = hex(fs.readFileSync(name));
    }
    const evidence = path.join(out, "operations.json");
    const p1Random = line.random === undefined ? {} : { p1Random: line.random };
    jsonFile(evidence, { writes: writes.rows, journal: feed, tape, fairCredits: credits, selection, p1: phases, ...p1Random, p4: pulls, ...p4Extra, p6, p7, thin,
      ...(tapeGroups ? { ownerGroups: tapeGroups } : {}) });
    const result = { source, writer, telemetrySha256, fixture: toy, slot: peer.slot, attempt: peer.attempt, startedAt: begin, endedAt: now(), start,
      loaded, retirement, migratedReads, serialAnchor, ownerGroupPeople: tapeGroups && Object.fromEntries(
        (["loader", "earlier-window", "seed"] as const).map((g) => [g, Object.values(tapeGroups).filter((x) => x === g).length])), firstCut: startHead, terminal, seed: { ...adopted, realistic: seed.realisticBinding }, tapeSha256: hex(JSON.stringify(tape)),
      observationsSha256: hex(fs.readFileSync(evidence)), settings: { ...selected, observed: options, java: peer.java, creditMode: mode, selection, fairCredits: credits,
        ...(peer.p1 ? { p1Reader: { batch: peer.p1.batch, randomSeats: peer.p1.random?.seats ?? null, profileEvery: peer.p1.random?.profileEvery ?? null } } : {}) },
      study: study && { rate: study.rate, batch: study.batch, savesByLevel: phases.map((phase, i) => {
        const bucket = writes.rows.filter((row) => row.due >= start + i * 30_000 && row.due < start + (i + 1) * 30_000);
        const latency = new Histogram();
        for (const row of bucket) if (row.receipt) latency.recordMs(row.end! - row.due);
        return { seats: phase.seats, offered: bucket.length, received: latency.count, latency: latency.summary() };
      }) },
      p1: phases, ...p1Random, p2: { offered: tape.length, receipts: saves.length, latency: saveHistogram.summary() },
      p3: { entries: feed.length }, p4: pulls, ...p4Extra, p6, p7, thin, ...(productionResult ? { production: productionResult } : {}),
      ...(alongside ? { alongside: { label: alongside.label, result: alongsideResult } } : {}) };
    // [DX-RD1] Why: require the complete toy tape and exact read results before publishing a read-study arm.
    // Rejected: declaring success when an empty journal agrees with an empty acknowledged set.
    if (toy && study) {
      assert(result.p2.offered > 0);
      assert.deepEqual([result.p2.receipts, result.p3.entries], [result.p2.offered, result.p2.offered]);
      assert(result.p1.every((phase) => phase.errors === 0 && phase.read.count > 0));
      assert.deepEqual([pulls?.observed.count, pulls?.unavailable], [10, 0]);
    }
    jsonFile(path.join(out, "arm.json"), result);
    return result;
  } finally {
    abort.abort();
    await telemetry?.catch(() => {});
    writerClient.close(); reader.close(); journal.close();
  }
}

// [DX-CARD2] The reader's backlog has drained when five probes in a row (one pinned field read at the seed cut each,
// checked against the seed's value) return within 25 ms; the drain gives up after 120 s and says so.
async function drainReader(client: DatomicClient, seed: AdoptedSeed, toy: boolean) {
  const began = now(), limit = toy ? 10_000 : 120_000, probes = new Histogram();
  const basis = { recordedPosition: seed.realistic?.proof.cut ?? seed.scope.cut, validAt: SEED_VALID_FROM };
  let run = 0, n = 0, errors = 0;
  while (run < 5 && now() - began < limit) {
    const subject = n++ % seed.image.people, entity = seed.realistic ? undefined : task(0, subject);
    const at = now();
    try {
      if (entity) {
        const rows = await client.rows(seed.scope.db, { entityIds: [entity], pattern: { attribute: field(0) }, basis });
        assert(rows.length === 1 && rows[0]!.value_string === fieldValue(subject, 0, 0, 0).value);
      } else await client.begin(seed.scope.db).then((h) => client.release(seed.scope.db, h.handle));
      const ms = now() - at;
      probes.recordMs(ms);
      run = ms <= 25 ? run + 1 : 0;
    } catch { errors++; run = 0; await sleep(100); }
  }
  return { drained: run >= 5, elapsedMs: Number((now() - began).toFixed(1)), probes: probes.summary(), errors };
}

function wireSummary(samples: ReadSamples) {
  if (!samples.length) return null;
  const total = new Histogram();
  for (const s of samples) if (Number.isFinite(s.parsed) && Number.isFinite(s.issue)) total.recordMs(s.parsed - s.issue);
  return { sampled: samples.length, clientMs: total.summary() };
}

export async function quietPair(out: string, source: string, peer: Peer, seed: AdoptedSeed, writer: Writer,
  toy: boolean, startHead: number, deadline = Date.now() + 30 * 60_000) {
  const cells = toy ? ["alone", 235] as const : serverCells;
  for (const cell of cells) {
    const rated = typeof cell === "object";
    const minimum = rated ? ((peer.windowSeconds ?? serverCellSeconds) + 30) * 1000 : 120000;
    assert(Date.now() + minimum < deadline, "Insufficient time for another matched quiet-account window");
    const folder = path.join(out, rated ? cellPath(cell) : "p6-" + cell);
    fs.mkdirSync(folder);
    const r = await adoptedArm(folder, source, peer, seed, writer, rated ? cell.loaded : cell === 235, toy, startHead, cell);
    startHead = r.terminal;
  }
  return startHead;
}

export async function adoptedToy(out: string, source: string, peer: Peer, writer: Writer, comparison = false, readStudy = false) {
  assert(!process.env.DX_THIN_MEASURE);
  assert(!(comparison && readStudy));
  if (!comparison && !readStudy) peer.empty = await peer.residency?.();
  for (const loaded of readStudy ? [false, true] : writer === "grouped" || comparison ? [true] : [false, true]) {
    const folder = path.join(out, readStudy ? (loaded ? "batch" : "single") : (loaded ? "loaded" : "zero"));
    fs.mkdirSync(folder);
    const nonce = randomUUID();
    if (peer.realisticToySlot) {
      const seed = await toyRealSeed(path.join(folder, "realistic-seed"), nonce, peer.realisticToySlot, source, peer.write);
      const arm = await adoptedArm(folder, source, peer, seed, writer, loaded, true, seed.realistic!.proof.cut, undefined, comparison);
      if (loaded) {
        const cut = await quietPair(out, source, peer, seed, writer, true, arm.terminal);
        if (!comparison) {
          const { runImport } = await import("./import-arm.ts");
          await recordMixedIds(out, source, peer, seed, writer, runImport(out, source, peer, seed, writer, true, cut), true);
        }
      }
      continue;
    }
    const stdout = execFileSync(process.execPath, ["--no-warnings", "--experimental-transform-types",
      "lab/experiments/EXP-DX1/age1/scale1-fixture.mjs", process.cwd(), folder, nonce, peer.write, process.cwd(), source],
    { encoding: "utf8", timeout: 120000, env: process.env });
    fs.writeFileSync(path.join(folder, "loader.log"), stdout, { flag: "wx" });
    const seal = path.join(folder, "fixture.json");
    const seed = openScaleSeal(seal, hex(fs.readFileSync(seal)), true);
    const arm = await adoptedArm(folder, source, peer, seed, writer, readStudy || loaded, true, seed.scope.cut, undefined, comparison,
      readStudy ? { rate: 50, batch: loaded ? 8 : 1, sample: false } : undefined);
    if (loaded && !readStudy) {
      const cut = await quietPair(out, source, peer, seed, writer, true, arm.terminal);
      if (comparison) continue;
      const { runImport } = await import("./import-arm.ts");
      const after = writer === "per-person-ordered" ? runImport(out, source, peer, seed, writer, true, cut) : cut;
      await recordMixedIds(out, source, peer, seed, writer, after, true);
    }
  }
}


export async function recordMixedIds(out: string, source: string, peer: Peer, seed: AdoptedSeed, writer: Writer, start: number, toy = false) {
  if (seed.realistic) {
    const { checkMixedIds } = await import("./mixed-ids.ts");
    jsonFile(path.join(out, "mixed-ids.json"), await checkMixedIds(source, peer, seed, writer, start, seed.image.people - 1));
    return;
  }
  const touched = new Set(accounts.slice(toy ? -1 : -2).flatMap(a => activeSubjects(seed.image.people as Density)[a]!));
  if (!toy) for (const cell of serverCells.filter(c => c.loaded)) {
    for (const offer of ratedTape(seed.image.people, cell, peer.windowSeconds)) if (offer.account >= 8) touched.add(offer.subject);
  }
  let person = seed.image.people - 1;
  while (touched.has(person)) person--;
  assert(person >= 0);
  const { checkMixedIds } = await import("./mixed-ids.ts");
  jsonFile(path.join(out, "mixed-ids.json"), await checkMixedIds(source, peer, seed, writer, start, person));
}
