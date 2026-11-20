import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { W0, canonical, sha256, triplexValue } from "../../../bench/lib/w0-world.ts";
import { DomainOracle } from "../../../bench/lib/w0-gates.ts";
import { activation, fact, millis, openStore } from "./store.ts";
import { LazyReader, rosterRoot, captureDemand } from "./read.ts";
const id = randomUUID(),
  s = await openStore("lazy-read-" + id),
  oracle = new DomainOracle();
const v = W0.POPULATION_VALID_TIME,
  early = "2026-11-04T11:59:59.999999Z",
  future = "2026-11-06T12:00:00.000000Z",
  subject = "pl:one";
const adds = [
  { e: subject, a: "payRateCents", v: 1500 },
  { e: subject, a: "location", v: "loc:a" },
  { e: "loc:a", a: "jurisdiction", v: "jur:a" },
  { e: "jur:a", a: "stateMinWageCents", v: 1650 },
  { e: "loc:a", a: "localMinWageCents", v: 1700 },
];
const acts: { release: string; from: string; tx: number }[] = [];
const known: { e: string; a: string; v: any; tx: number; dead?: number; from?: number }[] = [];
const results: { p: number; at: string; who: string; hash: string; route: string }[] = [];
const reader = new LazyReader(
  s,
  "w0",
  2 << 20,
  undefined,
  process.env.DX_LAZY_READ_PATH === "shared-cut" ? "shared-cut" : "legacy",
);
async function check(p: number, at: string, who = subject) {
  const b = { tx: p, validTime: at };
  const world = {
    subject: who,
    facts:
      who === subject
        ? known
            .filter(
              (f) => f.tx <= p && (!f.dead || f.dead > p) && (!f.from || f.from <= millis(at)),
            )
            .map(({ e, a, v, tx }) => ({ e, a, v, tx }))
        : [],
  };
  const reference = await oracle.call("reconcile", {
    world,
    activations: acts.filter((x) => x.tx <= p),
    basis: b,
  });
  const got = await reader.readAt(who, { position: p, validTime: at });
  assert.equal(got.json, reference);
  results.push({ p, at, who, hash: sha256(reference), route: got.route });
  return got;
}
try {
  await check(0, v);
  const seed = await s.input(
    "seed",
    { kind: "source", at: early },
    adds.map((f) => ({
      op: "assert",
      entityId: f.e,
      attribute: f.a,
      value: triplexValue(f.a, f.v),
      validFrom: 0,
    })),
  );
  known.push(...adds.map((a) => ({ ...a, tx: seed.position })));
  const first = await activation(s, "first", W0.R1, early);
  acts.push({ release: W0.R1.hash, from: early, tx: first.position });
  await check(first.position, early);
  await check(first.position, v);
  const a2 = await activation(s, "future", W0.R2, v, future);
  acts.push({ release: W0.R2.hash, from: future, tx: a2.position });
  for (const at of [early, v, "2026-11-06T11:59:59.999999Z", future]) await check(a2.position, at);
  const tie = await activation(s, "same-from", W0.R3, v, future);
  acts.push({ release: W0.R3.hash, from: future, tx: tie.position });
  await check(tie.position, future);
  const follower = new LazyReader(s, "w0", 0);
  follower.attach(await captureDemand(s, subject, tie.position, future));
  const same = await follower.readAt(subject, { position: tie.position, validTime: future });
  assert.equal(same.route, "pinned-replica");
  assert.equal(same.json, (await check(tie.position, future)).json);
  const correction = await s.input("correction", { kind: "source", at: v }, [
    { op: "retract", id: seed.changes[0].tripleId },
    {
      op: "assert",
      entityId: subject,
      attribute: "payRateCents",
      value: triplexValue("payRateCents", 1550),
      validFrom: millis(early),
    },
  ]);
  known[0]!.dead = correction.position;
  known.push({ ...adds[0]!, v: 1550, tx: correction.position, from: millis(early) });
  await check(tie.position, early);
  const fallback = await follower.readAt(subject, {
    position: correction.position,
    validTime: early,
  });
  assert.equal(fallback.route, "authoritative-source");
  assert.equal(fallback.json, (await check(correction.position, early)).json);
  const old = await reader.readAt(subject, { recordedAt: tie.instant, validTime: early });
  assert.equal(old.json, (await check(tie.position, early)).json);
  const back = await activation(s, "backdated", W0.R2, v, early);
  acts.push({ release: W0.R2.hash, from: early, tx: back.position });
  await check(back.position, v);
  const again = await check(back.position, v);
  assert.equal(again.route, "exact-cache");
  await check(back.position, v, "pl:empty");
  const cold = await openStore(s.scope);
  try {
    assert.equal(
      (await new LazyReader(cold, "w0", 2 << 20, () => v).readAt(subject)).json,
      again.json,
    );
  } finally {
    await cold.close();
  }
  const ssn = await s.input("field", { kind: "source", at: v }, [
    {
      op: "assert",
      entityId: subject,
      attribute: "ssn",
      value: triplexValue("ssn", "000000000"),
      validFrom: 0,
    },
  ]);
  known.push({ e: subject, a: "ssn", v: "000000000", tx: ssn.position });
  const missed = new LazyReader(s, "w0", 1024 * 1024);
  const after = await missed.readAt(subject, { position: ssn.position, validTime: v }, async () => {
    await s.input("erase", { kind: "erase", at: v, subject, attribute: "ssn" });
    known.at(-1)!.v = { erasedAt: v };
  });
  assert.equal(after.json, (await check(ssn.position, v)).json);
  assert(!after.json.includes("000000000"));
  assert.equal(
    (await missed.readAt(subject, { position: ssn.position, validTime: v })).json,
    after.json,
  );
  const listed = await s.input("listing", { kind: "source", at: v }, [
    fact(rosterRoot(0), "lazy/members", [subject]),
    fact(rosterRoot(1), "lazy/members", ["pl:empty"]),
  ]);
  const list = await reader.list({ position: listed.position, validTime: v });
  assert(list.next && list.values.length === 1);
  assert.equal(list.values[0]!.json, (await check(listed.position, v)).json);
  const bad = await s.input("invalid-world", { kind: "source", at: v }, [
    {
      op: "assert",
      entityId: subject,
      attribute: "payRateCents",
      value: triplexValue("payRateCents", 99),
      validFrom: 0,
    },
  ]);
  known.push({ e: subject, a: "payRateCents", v: 99, tx: bad.position });
  const failure = await check(bad.position, v);
  assert.equal(JSON.parse(failure.json).error, "W0.E_CARDINALITY");
  const second = await reader.list({}, list.next);
  assert.equal(second.values[0]!.json, (await check(listed.position, v, "pl:empty")).json);
  await assert.rejects(reader.list({ position: bad.position, validTime: v }, list.next));
  writeFileSync(
    join(process.argv[2]!, "reads.json"),
    canonical({ id, scope: s.scope, results, source: await s.head() }) + "\n",
    { flag: "wx" },
  );
} finally {
  oracle.close();
  await s.close();
}
