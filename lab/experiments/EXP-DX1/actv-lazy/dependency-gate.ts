import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { writeFileSync } from "node:fs";
import { W0, canonical, sha256, triplexValue } from "../../../bench/lib/w0-world.ts";
import { DomainOracle } from "../../../bench/lib/w0-gates.ts";
import { activation, fact, openStore } from "./store.ts";
import { rosterRoot, rosterSeal } from "./read.ts";
import { Dispatcher, Receiver } from "./dispatch.ts";
import { itemRoot } from "./decision.ts";
import { valid } from "./fixture.ts";
const base = process.argv[2]!,
  scope = "lazy-edges-" + randomUUID(),
  s = await openStore(scope),
  other = await openStore(scope);
const oracle = new DomainOracle(),
  ids = ["pl:a", "pl:b", "pl:c"],
  out = new Map<number, any[]>();
let d = new Dispatcher(s, "w0", 1),
  rx: Receiver | undefined;
const native = (e: string, a: string, v: string | number) => ({
  op: "assert",
  entityId: e,
  attribute: a,
  value: triplexValue(a, v),
  validFrom: 0,
});
const wire = (x: any) => ({ ...x, seq: Number(x.seq), payload: JSON.parse(x.payload) });
const event = (r: any) => {
  const changes = out.get(r.event) ?? [];
  changes.push(...r.deliveries.map(wire));
  out.set(r.event, changes);
};
try {
  const seed = await s.input("enroll", { kind: "baseline", at: valid }, [
    fact(rosterRoot(0), "lazy/members", ids),
    fact("members/seal", "lazy/roster-seal", rosterSeal(ids)),
    native("pl:a", "location", "loc:a"),
    native("pl:a", "payRateCents", 1600),
    native("pl:a", "bgcStatus", "clear"),
    native("pl:b", "location", "loc:b"),
    native("pl:b", "payRateCents", 1700),
    native("pl:b", "bgcStatus", "clear"),
    native("loc:a", "jurisdiction", "jur:j"),
    native("loc:b", "jurisdiction", "jur:j"),
    native("jur:j", "stateMinWageCents", 1650),
    native("loc:b", "localMinWageCents", 1750),
  ]);
  rx = new Receiver(join(base, "edge-receiver.sqlite"), scope, seed.txId);
  const r1 = await activation(s, "r1", W0.R1, valid);
  await d.drain(event);
  const r2 = await activation(s, "r2", W0.R2, valid);
  const initial = (e: string, a: string) =>
    seed.changes.find((v: any) => v.entityId === e && v.attribute === a)!.tripleId;
  const ret = (id: string) => ({ op: "retract", id });
  let moved = 0;
  const page = await d.step(async (when) => {
    if (when === "before-commit" && !moved) {
      moved = (
        await other.input("move-while-held", { kind: "source", at: valid }, [
          ret(initial("pl:a", "location")),
          native("pl:a", "location", "loc:b"),
          native("loc:a", "localMinWageCents", 1800),
        ])
      ).position;
    }
  });
  assert(
    page && moved > r2.position && page.event === r2.position && page.receipt.position > moved,
  );
  event(page);
  d.close();
  d = new Dispatcher(s, "w0", 1);
  await d.drain(event);
  const equal = await s.input("reach-equality", { kind: "source", at: valid }, [
    ret(initial("pl:a", "payRateCents")),
    native("pl:a", "payRateCents", 1750),
  ]);
  const twoHop = await s.input("raise-state", { kind: "source", at: valid }, [
    ret(initial("jur:j", "stateMinWageCents")),
    native("jur:j", "stateMinWageCents", 1850),
  ]);
  await d.drain(event);
  const facts = new Map<string, any>(),
    receipts = [];
  let cursor = 0,
    release = "R1";
  let expected: any = { subjects: [], items: [], pending: [] };
  while (cursor < twoHop.position) {
    const page = await s.comp.feedPage(cursor, 8);
    assert(page.transactions.length);
    for (const t of page.transactions) {
      if (t.position > twoHop.position) break;
      assert.equal(t.position, ++cursor);
      if (t.actor !== "lazy/input") continue;
      for (const c of t.changes) {
        if (c.entityId.startsWith("lazy/") || c.entityId.startsWith("members/")) continue;
        if (c.op === "retract") facts.delete(c.tripleId);
        else
          facts.set(c.tripleId, {
            e: c.entityId,
            a: c.attribute,
            v: c.value.type === "integer" ? Number(c.value.value) : c.value.value,
            tx: t.position,
          });
      }
      if (t.position < r1.position) continue;
      if (t.position === r2.position) release = "R2";
      const evaluations = [];
      for (const subject of ids) {
        const all = [...facts.values()],
          loc = all.find((x) => x.e === subject && x.a === "location")?.v;
        const jur = all.find((x) => x.e === loc && x.a === "jurisdiction")?.v;
        const answer = JSON.parse(
          await oracle.call("evaluate", {
            world: { subject, facts: all.filter((x) => [subject, loc, jur].includes(x.e)) },
            release,
            basis: { tx: t.position, validTime: valid },
          }),
        );
        evaluations.push({
          subject,
          release: answer.release,
          workItems: answer.workItems,
          basis: answer.basis,
        });
      }
      const res = JSON.parse(await oracle.call("publish", { state: expected, evaluations }));
      assert.deepEqual(out.get(t.position), res.deliveries);
      expected = res.state;
      receipts.push(t.txId);
    }
  }
  const actual = (await s.rows(ids.map(itemRoot), await s.head()))
    .flatMap((r) => JSON.parse(r.value.value).map(wire))
    .sort((a, b) => a.id.localeCompare(b.id));
  assert.deepEqual(actual, expected.items);
  const count = await rx.drain(s);
  assert.equal(count, expected.pending.length);
  for (const id of ids)
    assert.deepEqual(
      rx
        .effects()
        .filter((x) => x.subject === id)
        .map(wire),
      expected.pending.filter((x: any) => x.subject === id),
    );
  assert.deepEqual(out.get(equal.position), []);
  assert.equal(out.get(twoHop.position)?.length, 2);
  writeFileSync(
    join(base, "edges.json"),
    canonical({
      scope,
      receipts,
      move: moved,
      equality: equal.position,
      twoHop: twoHop.position,
      changed: out.get(twoHop.position)?.length,
      delivered: count,
      hash: sha256(canonical(actual)),
    }) + "\n",
    { flag: "wx" },
  );
} finally {
  rx?.close();
  d.close();
  oracle.close();
  await other.close();
  await s.close();
}
