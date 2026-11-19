import assert from "node:assert/strict";
import { W0 } from "../../../bench/lib/w0-world.ts";
import { type Cut, type Inputs } from "./journal.ts";
import { type Check, type Op, type Store, pack, unpack } from "./store.ts";

const entity = (s: string) => "notice-fixture:" + s;
const index = (n: number) => "notice-directory:" + n;
const insert = (e: string, a: string, v: string): Extract<Op, { op: "assert" }> => ({
  op: "assert",
  entityId: e,
  attribute: a,
  value: { type: "string", value: v },
  validFrom: 0,
});
export function originalWorld(i: number): W0.World {
  const subject = W0.placementId(i),
    loc = "loc:floor" + (i % 10 === 0 ? "-local" : "-state"),
    jur = "jur:floor",
    d = subject + "/dec:approval";
  const facts: W0.Fact[] = [];
  const put = (e: string, a: string, v: W0.Fact["v"]) => facts.push({ e, a, v, tx: 0 });
  put(subject, "location", loc);
  put(loc, "jurisdiction", jur);
  put(jur, "stateMinWageCents", 1650);
  put(loc, "localMinWageCents", i % 10 === 0 ? 1700 : 1600);
  put(subject, "payRateCents", i % 3 === 0 ? 1600 : 1650);
  put(subject, "startDate", "2026-11-02");
  put(subject, "bgcStatus", "clear");
  put(subject, "section1AttestedAt", "2026-11-01T00:00:00.000000Z");
  put(subject, "ssn", "000000000");
  if (i !== 0) put(subject, "everifyStatus", "pending");
  put(subject, "decisions", d);
  put(d, "target", "i9.section2");
  put(d, "verdict", "approve");
  put(d, "author", "person");
  return { subject, facts };
}
export class Fixture implements Inputs {
  readonly identity = "notify-policy-fixture-v1";
  readonly store: Store;
  constructor(store: Store) {
    this.store = store;
  }
  async seed(n: number) {
    assert.equal(await this.store.currentPosition(), 0);
    const seedPositions: number[] = [];
    for (let begin = 0; begin < n; begin += 128) {
      const ids = Array.from({ length: Math.min(n - begin, 128) }, (_, i) =>
        W0.placementId(begin + i),
      );
      const ops = [
        insert(index(-1), "shard", index(begin)),
        insert(index(begin), "members", pack(ids)),
        ...ids.map((s, j) => insert(entity(s), "world", pack(originalWorld(begin + j)))),
      ];
      const saved = await this.store.transact(ops, {
        commandId: "notify-fixture-" + begin,
        actor: "notify-fixture",
      });
      assert(saved.ok && saved.value.triples.length === ops.length);
      const observed = new Map(saved.value.triples.map((x) => [x.entityId, x.value.value]));
      for (const op of ops) assert.equal(observed.get(op.entityId), op.value.value);
      seedPositions.push(saved.value.position);
    }
    return seedPositions;
  }
  async rows(ids: string[], position: number) {
    const basis = { position, validAt: 0 };
    if (!ids.length) return [];
    const r = await this.store.sweepPage(ids, basis);
    assert.deepEqual(r.reportedBasis, basis);
    return r.rows;
  }
  async roster(cut: Cut) {
    const shards = (await this.rows([index(-1)], cut.position)).map((r) => String(r.value.value)),
      ids: string[] = [];
    for (let i = 0; i < shards.length; i += 64)
      for (const r of await this.rows(shards.slice(i, i + 64), cut.position))
        ids.push(...unpack<string[]>(r.value.value));
    return ids.sort();
  }
  async worlds(ids: string[], cut: Cut) {
    const rows = await this.rows(ids.map(entity), cut.position);
    const map = new Map(rows.filter((r) => r.attribute === "world").map((r) => [r.entityId, r]));
    return ids.map((s) => {
      const row = map.get(entity(s));
      assert(row);
      const w = unpack<W0.World>(row.value.value);
      assert(w.subject === s);
      return { subject: s, facts: w.facts.map((f) => ({ ...f, tx: f.tx || row.position })) };
    });
  }
  async edit(s: string, changes: Record<string, W0.Fact["v"] | null>, cut: Cut) {
    const rows = await this.rows([entity(s)], cut.position),
      r = rows.find((r) => r.attribute === "world");
    assert(r);
    const stored = unpack<W0.World>(r.value.value);
    assert.equal(stored.subject, s);
    const world = {
      subject: s,
      facts: stored.facts.map((f) => ({ ...f, tx: f.tx || r.position })),
    };
    const facts = world!.facts.filter((f) => f.e !== s || !(f.a in changes));
    for (const [a, v] of Object.entries(changes)) if (v !== null) facts.push({ e: s, a, v, tx: 0 });
    return {
      ops: [
        { op: "retract", id: r.id },
        insert(entity(s), "world", pack({ subject: s, facts })),
      ] as Op[],
      checks: [{ _tag: "TripleLive", id: r.id }] as Check[],
    };
  }
}
