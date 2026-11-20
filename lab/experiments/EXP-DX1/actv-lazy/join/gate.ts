import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { W0, canonical, triplexValue, sha256 } from "../../../../bench/lib/w0-world.ts";
import { Documents } from "../../notify1/store.ts";
import { activation, openStore, fact } from "../store.ts";
import { rosterRoot, rosterSeal } from "../read.ts";
import { propose } from "../decision.ts";
import { JoinedAccount, type Edit } from "./account.ts";
import { Reference } from "./check.ts";
import { valid } from "../fixture.ts";
const dir = process.argv[2]!,
  scope = "lazy-join-" + randomUUID(),
  target = "lazy-sink-" + randomUUID(),
  ids = Array.from({ length: 8 }, (_, i) => W0.placementId(i)),
  ref = new Reference();
let s = await openStore(scope),
  a = new JoinedAccount(s);
const sink = await openStore(target);
const facts = new Map<string, W0.Fact[]>(),
  notes: any[] = [];
function apply(e: string, attr: string, values: W0.Fact["v"][], tx: number) {
  facts.set(
    canonical([e, attr]),
    values.map((v) => ({ e, a: attr, v, tx })),
  );
}
function world(i: number): W0.World {
  const subject = ids[i]!,
    pending = [subject],
    visited = new Set<string>(),
    out: W0.Fact[] = [];
  for (const e of pending) {
    if (visited.has(e)) continue;
    visited.add(e);
    for (const list of facts.values())
      for (const f of list)
        if (f.e === e) {
          out.push(f);
          if (
            ["location", "jurisdiction", "documents", "decisions", "answers", "next"].includes(f.a)
          )
            pending.push(String(f.v));
        }
  }
  return { subject, facts: out };
}
const reopen = async () => {
  await s.close();
  s = await openStore(scope);
  a = new JoinedAccount(s);
};
let active: W0.ReleaseDoc | null = null;
async function check(t: any, at: string, doc: W0.ReleaseDoc | undefined, shared = false) {
  const n = doc ? (await a.notices.observe()).value.sequence : undefined;
  const proof = await ref.check(
    a,
    ids,
    world,
    doc ?? active!,
    { tx: t.position, validTime: at },
    active,
    n,
    true,
    true,
    shared,
  );
  if (shared)
    assert(
      proof.coverage &&
        proof.coverage.affected.length >= 2 &&
        proof.coverage.complement.includes(ids[0]!),
    );
  notes.push(proof);
  if (doc) active = doc;
}
async function runSave(id: string, e: Edit, at = valid, editor = a, shared = false) {
  const r = await editor.save(id, e, at);
  apply(e.e, e.a, e.values, r.position);
  await check(r, at, undefined, shared);
  return r;
}
function kill(msg: object) {
  const r = spawnSync(
    process.execPath,
    ["--experimental-strip-types", new URL("./child.ts", import.meta.url).pathname],
    { input: JSON.stringify({ scope, sink: target, ...msg }), encoding: "utf8", timeout: 90000 },
  );
  assert.equal(r.signal, "SIGKILL", r.stderr);
}
try {
  const tuples: [string, string, any][] = [
    ["jur:x", "stateMinWageCents", 1650],
    ["loc:x", "jurisdiction", "jur:x"],
    ["loc:x", "localMinWageCents", 1700],
  ];
  for (let i = 1; i < ids.length; i++) {
    const id = ids[i]!;
    tuples.push(
      [id, "location", "loc:x"],
      [id, "bgcStatus", "clear"],
      [id, "payRateCents", i % 2 ? 1600 : 1700],
      [id, "baselinePayRateCents", 1500],
      [id, "weeklyMinutes", 2300 + i * 50],
    );
  }
  const doc = ids[2] + "/doc:d";
  tuples.push(
    [ids[2]!, "documents", doc],
    [doc, "docType", "ead"],
    [doc, "expiresOn", "2026-11-04"],
    [ids[3]!, "everifyStatus", "tnc"],
    [ids[3]!, "everifyStatusAt", valid],
  );
  const first = await s.input("facts", { kind: "baseline", at: valid }, [
    fact(rosterRoot(0), "lazy/members", ids),
    fact("members/seal", "lazy/roster-seal", rosterSeal(ids)),
    ...tuples.map(([e, a, v]) => ({
      op: "assert",
      entityId: e,
      attribute: a,
      value: triplexValue(a, v),
      validFrom: 0,
    })),
  ]);
  for (const [e, at, v] of tuples) apply(e, at, [v], first.position);
  await a.install(ids, valid);
  await assert.rejects(s.input("old-entry", { kind: "source", at: valid }), /joined source/);
  await assert.rejects(
    a.save("protected", { e: ids[1]!, a: "ssn", values: ["000000000"] }, valid),
    /retention/,
  );
  let r = await a.publish("R1", W0.R1.doc, valid, "envelopes");
  await check(r, valid, W0.R1.doc);
  const firstCut = r.position,
    oldAnswer = await a.reader().readAt(ids[1]!, { position: firstCut, validTime: valid }),
    held = await propose(s, "w0", ids[1]!);
  const custom = structuredClone(W0.R2.doc);
  const rule = custom.rules.find((x) => x.id === "EVSTAT")!;
  (rule.params as { tncBusinessDays: number }).tncBusinessDays = 11 + Math.floor(Math.random() * 7);
  assert(!W0.RELEASES_BY_HASH.has(W0.compileRelease(custom).hash));
  kill({ stop: "before", id: "novel", doc: custom, at: valid, storage: "stored" });
  assert.equal(await s.lookup("joined:novel"), null);
  kill({ stop: "after", id: "novel", doc: custom, at: valid, storage: "stored" });
  const original = await s.lookup("joined:novel");
  assert(original);
  await reopen();
  r = await a.publish("novel", custom, valid, "stored");
  assert.deepEqual(r, original);
  await check(r, valid, custom);
  assert.equal(
    (await a.reader().readAt(ids[1]!, { position: firstCut, validTime: valid })).json,
    oldAnswer.json,
  );
  assert.equal(await a.admit(held), "stale");
  await assert.rejects(a.publish("novel", W0.R2.doc, valid, "stored"), /different input/);
  const display = await runSave("minutes", { e: ids[1]!, a: "weeklyMinutes", values: [3000] });
  assert(!display.changes.some((v: any) => v.entityId.startsWith(a.db.prefix)));
  const pay = await runSave("equal-pay", { e: ids[1]!, a: "payRateCents", values: [1700] });
  assert(pay.changes.some((v: any) => v.entityId.startsWith(a.db.prefix + "join-index:")));
  await runSave("back", { e: ids[1]!, a: "payRateCents", values: [1550] });
  const digest = sha256(canonical((await a.notices.observe()).value));
  assert(digest.length === 64);
  await runSave(
    "local-before",
    { e: "loc:x", a: "localMinWageCents", values: [1810] },
    valid,
    a,
    true,
  );
  let raced = false;
  const contender = await openStore(scope);
  try {
    r = await a.publish("R1-return", W0.R1.doc, valid, "owed", async () => {
      if (!raced) {
        raced = true;
        await runSave(
          "state-floor",
          {
            e: "jur:x",
            a: "stateMinWageCents",
            values: [2050],
            from: "2026-11-01T00:00:00.000000Z",
          },
          valid,
          new JoinedAccount(contender),
          true,
        );
      }
    });
  } finally {
    await contender.close();
  }
  assert(raced && r.changes.length === 4);
  await check(r, valid, W0.R1.doc);
  const stale = await propose(s, "w0", ids[1]!);
  assert.equal(
    await a.admit(stale, async () => {
      const z = await a.publish("R2-again", W0.R2.doc, valid, "owed");
      await check(z, valid, W0.R2.doc);
    }),
    "stale",
  );
  await runSave(
    "local-after",
    { e: "loc:x", a: "localMinWageCents", values: [2250] },
    valid,
    a,
    true,
  );
  assert.equal(await a.admit(await propose(s, "w0", ids[1]!)), "covered");
  const priorValue = (
    await s.rows(["jur:x"], await s.head(), "2026-10-30T00:00:00.000000Z")
  ).filter((x) => x.attribute === "stateMinWageCents");
  assert.deepEqual(
    priorValue.map((x) => x.value.value),
    ["1650"],
  );
  const later = "2026-11-05T01:00:00.000000Z",
    due = "2026-11-05T00:00:00.000000Z";
  await runSave("deadline:" + sha256(due), { e: ids[4]!, a: "weeklyMinutes", values: [2800] });
  await a.advance(later);
  const overdue = await s.lookup("joined:deadline/" + sha256(due));
  assert(overdue);
  await check(overdue, due, undefined);
  const authored = structuredClone(W0.R3.doc);
  const writing = a.publish("R3", authored, later, "envelopes");
  Object.assign(authored.rules.find((r) => r.id === "OT")!, { params: { thresholdMinutes: 1 } });
  const r3 = await writing;
  await check(r3, later, W0.R3.doc);
  kill({ stop: "receiver" });
  await reopen();
  const sender = a.dispatcher(new Documents(sink.comp, "sink"));
  await sender.drain();
  const received = await ref.receiver(a, sender);
  const cnt = (await sender.effects()).length;
  await sender.drain();
  assert.equal((await sender.effects()).length, cnt);
  const before = await s.head();
  await assert.rejects(a.save("bad-type", { e: ids[1]!, a: "weeklyMinutes", values: [-1] }, later));
  assert.equal(await s.head(), before);
  // [DX-ACT1] Why: a native write outside the joined source cannot certify unchanged postings. Rejected: accepting a current account marker without checking its intervening source prefix.
  const raw = await s.comp.transact(
    [
      {
        op: "assert",
        entityId: "jur:x",
        attribute: "stateMinWageCents",
        value: triplexValue("stateMinWageCents", 1900),
        validFrom: 0,
      },
    ],
    { commandId: "outside-source", actor: "other-source" },
  );
  assert(raw.ok);
  await assert.rejects(a.publish("unproved", W0.R2.doc, later, "owed"), /Unclassified/);
  writeFileSync(
    join(dir, "joined-gate.json"),
    JSON.stringify(
      {
        scope,
        target,
        epoch: first.txId,
        unseen: W0.compileRelease(custom).hash,
        firstCut,
        lostAck: original.txId,
        stops: 3,
        expected: notes,
        received,
        checkedAt: before,
      },
      null,
      2,
    ) + "\n",
    { flag: "wx" },
  );
} finally {
  ref.oracle.close();
  await s.close();
  await sink.close();
}
