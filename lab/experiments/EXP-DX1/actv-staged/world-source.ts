import assert from "node:assert/strict";
import { W0, reachableRows, triplexValue, worldOf } from "../../../bench/lib/w0-world.ts";
import { type Pair, type Release, type Source, type SourceCut } from "./account.ts";
import { validMillis, type Op, type Store } from "./storage.ts";

const catalog = "stg-roster",
  shard = (id: string) => "stg-members-" + Math.floor(Number(id.slice(4)) / 256);
export const member = (id: string): Op => ({
  op: "assert",
  entityId: shard(id),
  attribute: "member",
  value: { type: "string", value: id },
  validFrom: 0,
});
export const field = (e: string, a: string, value: any, validFrom = 0, validTo?: number): Op => ({
  op: "assert",
  entityId: e,
  attribute: a,
  value: triplexValue(a, value),
  validFrom,
  ...(validTo === undefined ? {} : { validTo }),
});
export class WorldSource implements Source {
  readonly store: Store;
  constructor(store: Store) {
    this.store = store;
  }
  async rows(ids: string[], cut: SourceCut) {
    const basis = { position: cut.position, validAt: validMillis(cut.validTime) };
    if (!ids.length) return [];
    const r = await this.store.sweepPage(ids, basis);
    assert.deepEqual(r.reportedBasis, basis);
    return r.rows;
  }
  async roster(cut: SourceCut) {
    const names = (await this.rows([catalog], cut)).map((r) => {
      assert(r.attribute === "shard" && r.value.type === "string");
      return String(r.value.value);
    });
    const ids: string[] = [];
    for (let n = 0; n < names.length; n += 32)
      for (const r of await this.rows(names.slice(n, n + 32), cut)) {
        const id = String(r.value.value);
        assert(r.attribute === "member" && r.entityId === shard(id));
        ids.push(id);
      }
    return ids.sort();
  }
  async contains(id: string, cut: SourceCut) {
    return (await this.rows([shard(id)], cut)).some(
      (r) => r.attribute === "member" && r.value.value === id,
    );
  }
  async worlds(ids: string[], cut: SourceCut) {
    const rows = await this.rows(ids, cut);
    const index = new Map<string, (typeof rows)[number][]>();
    for (const row of rows) {
      if (!index.has(row.entityId)) index.set(row.entityId, []);
      index.get(row.entityId)!.push(row);
    }
    return ids.map((id) => worldOf(id, reachableRows([id], rows, index)));
  }
  async affected(pairs: Pair[], cut: SourceCut, releases: Release[]) {
    const ids = await this.roster(cut);
    if (pairs.some(([e]) => e === catalog || e.startsWith("stg-members-"))) return ids;
    const direct = pairs.every(([e]) => /^pl:s\d{8}(\/|$)/.test(e));
    const selected = direct
      ? [...new Set(pairs.map(([e]) => e.split("/")[0]!))].filter((s) => ids.includes(s)).sort()
      : ids;
    const affected = new Set<string>();
    for (let at = 0; at < selected.length; at += 32) {
      const worlds = await this.worlds(selected.slice(at, at + 32), cut);
      for (const name of new Set(releases)) {
        const r = W0.affectedSubjects(W0[name], worlds, pairs, {
          tx: cut.position,
          validTime: cut.validTime,
        });
        if ("error" in r) throw Error(r.error);
        for (const id of r.affected) affected.add(id);
      }
    }
    return [...affected].sort();
  }
}

// [DX-STG1] Why: a real two-hop jurisdiction with up to 1,953 members tests both positive and absent read pairs. Rejected: labelling independent per-person wage fields as shared fan-out.
export async function seedWorlds(store: Store, count: number) {
  assert((await store.currentPosition()) === 0);
  const wageGroup = Math.min(count, 1953);
  let batch: Op[] = [],
    part = 0;
  async function flush() {
    if (!batch.length) return;
    const raw = batch;
    batch = [];
    const r = await store.transact(raw, {
      commandId: "stg-seed-" + part++,
      actor: "staged-fixture",
    });
    assert(r.ok && r.value.triples.length === raw.length, "Seed assertion mismatch");
  }
  for (let j = 0; j < 2; j++) batch.push(field("jur:j00" + j, "stateMinWageCents", 1650));
  for (let j = 0; j < 4; j++) {
    const loc = "loc:l" + j;
    batch.push(field(loc, "jurisdiction", "jur:j00" + Math.floor(j / 2)));
    if (j % 2 === 0) batch.push(field(loc, "localMinWageCents", 1700));
  }
  for (let i = 0; i < count; i++) {
    const s = W0.placementId(i),
      d = s + "/dec:1";
    if (i % 256 === 0)
      batch.push({
        op: "assert",
        entityId: catalog,
        attribute: "shard",
        value: { type: "string", value: shard(s) },
        validFrom: 0,
      });
    batch.push(
      member(s),
      field(s, "location", "loc:l" + ((i < wageGroup ? 0 : 2) + (i % 2))),
      field(s, "payRateCents", [1600, 1650, 1750][i % 3]),
      field(s, "startDate", "2026-11-02"),
      field(s, "weeklyMinutes", 2500),
      field(s, "bgcStatus", "clear"),
      field(s, "everifyStatus", "pending"),
      field(s, "section1AttestedAt", "2026-11-01T09:00:00.000000Z"),
      field(s, "decisions", d),
      field(d, "target", "i9.section2"),
      field(d, "verdict", "approve"),
      field(d, "author", "person"),
    );
    if (batch.length >= 900) await flush();
  }
  await flush();
  return { count, wageGroup, batches: part };
}
