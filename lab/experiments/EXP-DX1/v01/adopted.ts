import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { DatomicClient } from "../../../../packages/datomic/dist/index.js";
import { fieldValue } from "../../../bench/lib/deep-world.ts";
import { Histogram } from "../../../bench/lib/hist.ts";
import { SEED_VALID_FROM } from "../../../bench/lib/world.ts";
import { decodeFeed, now, type Feed } from "../scale1/decision/observer.ts";
import { accounts, field, root, task, writeTape, type Density, type Write } from "../scale1/decision/plan.ts";
import { play, resolveUncertain, type Row, type Sender } from "../scale1/decision/writes.ts";
import { checkAdoptedPeer, hex, openScaleSeal, type AdoptedSeed } from "./adopt.ts";
import { ladder, phaseSeconds, selectedWriter, type Writer } from "./profile.ts";

export type Peer = { write: string; read: string; slot: string; attempt: string; gatewaySource: string; java: unknown };
export const jsonFile = (file: string, data: unknown) =>
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n", { flag: "wx", flush: true, mode: 0o600 });

const feeder = async (client: DatomicClient, db: string, from: number, deadline: number, getEnd: () => number | undefined) => {
  const rows: Feed[] = [];
  let position = from;
  while (getEnd() === undefined || position < getEnd()!) {
    assert(now() < deadline, "Journal did not reach the terminal cut");
    const { transactions } = await client.request<{ transactions: Parameters<typeof decodeFeed>[1][] }>(
      "POST", "/v2/db/" + db + "/transactions", { after: position, limit: 100, waitMs: 250 });
    const at = now();
    for (const tx of transactions) {
      assert.equal(tx[1], ++position);
      rows.push(decodeFeed(db, tx, at));
    }
    if (!transactions.length) await sleep(25);
  }
  assert.equal(position, getEnd());
  return rows;
};

export function matchedTape(people: number, seconds: number) {
  const original = writeTape(people as Density, "alone", 0);
  return Array.from({ length: Math.ceil(seconds / 90) }, (_, block) =>
    original.map((e) => ({ ...e, ms: e.ms + 90_000 * block, version: block + "/" + e.version })))
    .flat().filter((e) => e.ms < seconds * 1000);
}

async function preload(client: DatomicClient, seed: AdoptedSeed, head: number, tape: Write[]) {
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

async function currentPull(client: DatomicClient, seed: AdoptedSeed, head: number, toy: boolean) {
  const h = new Histogram();
  let unavailable = 0;
  const basis = { recordedPosition: head, validAt: SEED_VALID_FROM };
  for (let i = 0; i < (toy ? 10 : 1000); i++) {
    const a = i % accounts.length, person = seed.image.people - 1 - Math.floor(i / accounts.length);
    const id = root(a, person);
    const start = now();
    const found = await client.readDemandWorld(seed.key, id, basis, false);
    if (!found) { unavailable++; continue; }
    const elapsed = now() - start;
    const member = found.triples.filter((r) => r.entityId === id && r.attribute === ":subject/member");
    assert.equal(member.length, 1);
    assert.deepEqual(member[0]!.value, { type: "string", value: String(person) });
    h.recordMs(elapsed);
  }
  return { unavailable, observed: h.summary() };
}

export async function adoptedArm(out: string, source: string, peer: Peer, seed: AdoptedSeed, writer: Writer,
  loaded: boolean, toy: boolean, startHead = seed.scope.cut) {
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
    process.env.TRIPLEX_DATOMIC_FAST_PATHS = selected.TRIPLEX_DATOMIC_FAST_PATHS;
    const options = await writerClient.request<any>("GET", "/v1/db/" + seed.scope.db + "/write-options");
    assert.deepEqual([options.attempt, options.database, options.position, options.gatewaySourceHash],
      [peer.attempt, seed.scope.db, startHead, peer.gatewaySource]);
    assert(options.commitFunctionInstalled && options.strictRecordClocks && options.rowsVersion === 3);
    assert.match(options.commitFunction, /^:triplex\.write\/v-[a-f0-9]{24}$/);
    assert.equal(options.subjectSave === true, writer === "subject");
    if (writer === "subject") assert.match(options.subjectFunction, /^:triplex\.subject\/v-[a-f0-9]{24}$/);
    assert.deepEqual([options.options.predecessorLookup, options.options.smallRows, options.options.ledger,
      options.options.packedJournal, options.options.groupCommit, options.options.reusePrepared,
      options.options.fastReply, options.options.livePriority, options.options.fieldCoalesce,
      options.options.stageClock, options.options.queueClock, options.options.maxMembers],
    [true, true, true, false, writer === "grouped", writer === "grouped", true, true, false, true, false, 32]);
    const tape = matchedTape(seed.image.people, toy ? 8 : phaseSeconds * ladder.length);
    const senders = await preload(writerClient, seed, startHead, tape);
    const start = now() + 1200;
    const interval = (toy ? 8 : phaseSeconds * ladder.length) * 1000;
    feeding = feeder(journal, seed.scope.db, startHead, start + interval + 120_000, () => terminal);
    void feeding.catch(() => {});
    const [writes, phases] = await Promise.all([
      play(senders, tape, start, peer.attempt),
      readWindows(reader, seed, start, loaded, toy),
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
      assert.deepEqual([actual.id, actual.tx, actual.clock, actual.digest], [row.id, r.tx, r.clock, r.digest]);
      saveHistogram.recordMs(row.end! - row.due);
    }
    for (const row of saves.filter((_, i) => i === 0 || i === saves.length - 1 || i % 100 === 0)) {
      const op = await writerClient.operation(seed.scope.db, row.id), r = row.receipt!;
      assert.deepEqual([op.status, op.operationId, Number(op.position?.v), op.t?.v, op.recordedAt?.v],
        ["committed", row.id, r.p, r.t, r.clock]);
      assert.equal(await writerClient.claim(seed.scope.db, row.id, r.p), r.tx);
    }
    const pulls = loaded ? await currentPull(reader, seed, terminal, toy) : undefined;
    const evidence = path.join(out, "operations.json");
    jsonFile(evidence, { writes: writes.rows, journal: feed, tape });
    const result = { source, fixture: toy, slot: peer.slot, attempt: peer.attempt, startedAt: begin, endedAt: now(), start,
      loaded, firstCut: startHead, terminal, seed: adopted, tapeSha256: hex(JSON.stringify(tape)),
      observationsSha256: hex(fs.readFileSync(evidence)), settings: { ...selected, observed: options, java: peer.java },
      p1: phases, p2: { offered: tape.length, receipts: saves.length, latency: saveHistogram.summary() },
      p3: { entries: feed.length }, p4: pulls };
    jsonFile(path.join(out, "arm.json"), result);
    return result;
  } finally {
    writerClient.close(); reader.close(); journal.close();
  }
}

export async function adoptedToy(out: string, source: string, peer: Peer, writer: Writer) {
  assert(!process.env.DX_THIN_MEASURE);
  for (const loaded of [false, true]) {
    const folder = path.join(out, loaded ? "loaded" : "zero");
    fs.mkdirSync(folder);
    const nonce = randomUUID();
    const stdout = execFileSync(process.execPath, ["--no-warnings", "--experimental-transform-types",
      "lab/experiments/EXP-DX1/age1/scale1-fixture.mjs", process.cwd(), folder, nonce, peer.write, process.cwd(), source],
    { encoding: "utf8", timeout: 120000, env: process.env });
    fs.writeFileSync(path.join(folder, "loader.log"), stdout, { flag: "wx" });
    const seal = path.join(folder, "fixture.json");
    await adoptedArm(folder, source, peer, openScaleSeal(seal, hex(fs.readFileSync(seal)), true), writer, loaded, true);
  }
}
