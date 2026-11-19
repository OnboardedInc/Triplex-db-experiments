import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";
import { openComposition } from "../../../bench/lib/composition.ts";
import { W0, canonical, sha256 } from "../../../bench/lib/w0-world.ts";
import { Documents, hash, unpack } from "./store.ts";
import { Fixture } from "./fixture.ts";
import { Notices, type Tail } from "./journal.ts";
import { Dispatcher } from "./dispatcher.ts";
import { recipient } from "./worker.ts";
import { wireDelivery, type Offered } from "./verify.ts";

const attempt = path.resolve(process.argv[2]!),
  get = (s: string) => JSON.parse(fs.readFileSync(path.join(attempt, s), "utf8"));
const report = get("result.json"),
  r = report.dispatch,
  b = get("binding.json");
const owner = fs.readFileSync(process.env.TRIPLEX_LAB_SLOT_OWNER!);
assert(
  sha256(owner) === b.owner &&
    report.source === b.source &&
    report.slot === b.slot &&
    report.nonce === b.nonce &&
    r.epoch === b.nonce + "-dispatch",
);
const source = await openComposition("reach", "datomic", r.scope),
  rx = await recipient(r.receiver, r.receiver.startsWith("act1-") ? attempt : undefined);
try {
  const db = new Documents(source, "account"),
    sink = new Documents(rx, "effects"),
    a = new Notices(source, "account", new Fixture(source)),
    d = new Dispatcher(a, sink);
  const tail = (await a.observe()).value;
  assert.equal(tail.epoch, r.epoch);
  const raw = get("dispatch-raw.json"),
    events = raw.history as Offered[],
    ids = await a.inputs.roster({
      position: events[0]!.receipt.position,
      validTime: events[0]!.req.validTime,
    });
  assert(
    ids.length === report.n && hash(ids) === tail.census.members && events.length === tail.sequence,
  );
  const observations: unknown[] = [];
  for (const [i, offered] of events.entries()) {
    const event = await a.event(i + 1, offered.receipt.position);
    const tx = await source.transactionByCommand(db.command("event-command:" + offered.req.id));
    assert(tx.ok && tx.value.position === event.at && tx.value.txId === offered.receipt.txId);
    assert(
      event.value.request === offered.req.id &&
        event.value.next === offered.req.release &&
        event.value.validTime === offered.req.validTime,
    );
    observations.push({ position: event.at, txId: tx.value.txId, recipe: event.value });
  }
  const effects = (await d.effects()).map(wireDelivery);
  assert.equal(hash(effects), r.proof.orderedEffectSha256);
  assert.equal(effects.length, r.proof.effects);
  const sourceAt = await db.head(),
    sinkAt = await sink.head(),
    origin = hash([db.prefix, tail.epoch]),
    ledgers = [];
  for (let i = 0; i < ids.length; i += 64) {
    const group = ids.slice(i, i + 64),
      states = await db.rows<string>(
        group.map((s) => "ledger:" + s),
        sourceAt,
      ),
      targets = await sink.rows<string>(
        group.map((s) => "receiver:" + origin + ":" + s),
        sinkAt,
      );
    for (const subject of group) {
      const prev = states.get("ledger:" + subject),
        receiver = targets.get("receiver:" + origin + ":" + subject);
      ledgers.push([
        subject,
        prev ? unpack(prev.value) : [],
        receiver ? unpack(receiver.value) : W0.EMPTY_RECEIVER,
      ]);
    }
  }
  const captures = {
    binding: b,
    originalScope: r.scope,
    originalReceiver: r.receiver,
    events: observations,
    effects,
    ledgers,
  };
  const bytes = gzipSync(canonical(captures));
  fs.writeFileSync(path.join(attempt, "observed.json.gz"), bytes, { flag: "wx" });
  const out = {
    scope: r.scope,
    source: report.source,
    nonce: b.nonce,
    subjects: ids.length,
    events: events.length,
    orderedEffects: effects.length,
    orderedEffectSha256: hash(effects),
    archiveSha256: sha256(bytes),
    bytes: bytes.length,
  };
  fs.writeFileSync(path.join(attempt, "archive.json"), JSON.stringify(out) + "\n", { flag: "wx" });
  assert(fs.readFileSync(process.env.TRIPLEX_LAB_SLOT_OWNER!).equals(owner));
  console.log(out);
} finally {
  await rx.close();
  await source.close();
}
