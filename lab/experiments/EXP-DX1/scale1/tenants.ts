import { FieldSaveWriter, type PeakAlignment } from "./deep-live.ts";
import { MembershipProof } from "./tenant-proof.ts";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import { deepOwnFacts, deepPopulation, string } from "../../../bench/lib/deep-world.ts";
import { DeepWriter } from "../../../bench/lib/deep-command.ts";
import type { DeepEvent } from "../../../bench/lib/deep-trace.ts";
import type { SubjectState } from "../../../bench/lib/commands.ts";
import type { Receipt, CompositionHandle } from "../../../bench/lib/composition.ts";
import { ids, subjectOf, type Fact } from "../../../bench/lib/world.ts";
import { smallPeople } from "./small-plan.ts";
export type TenantStudy = "interference" | "small" | "million" | "smoke";
export type Topology = "pooled" | "separate";
export type TenantSpec = {
  study: TenantStudy;
  topology: Topology;
  physical: number;
  live?: PeakAlignment;
  campaign?: "frozen" | "field";
};
export type Account = { index: number; key: string; first: number; people: number };
export type TenantEvent = DeepEvent & { tenant: number; localSubject: number; localSeq: number };
export const keyFor = (i: number) => "account-" + String(i + 1).padStart(3, "0");
export const tenantRowsId = "deep-tenant-membership/1";
const catalog = "tenant:catalog",
  accountRoot = (a: Account) => "tenant:directory:" + a.key,
  shard = (a: Account, n: number) => "tenant:roster:" + a.key + ":" + Math.floor(n / 256);
export function tenantAccounts(spec: TenantSpec): Account[] {
  if (spec.campaign) {
    assert(spec.topology === "pooled" && spec.study !== "small" && !spec.live);
  }
  const total = spec.study === "small" ? 100 : spec.study === "smoke" && !spec.campaign ? 2 : 10;
  assert(
    Number.isInteger(spec.physical) &&
      spec.physical >= 0 &&
      spec.physical < total &&
      (spec.topology !== "pooled" || spec.physical === 0),
  );
  let first = 0;
  return Array.from({ length: total }, (_, i) => {
    const people =
      spec.study === "small"
        ? smallPeople(i)
        : spec.study === "million"
          ? 100000
          : spec.study === "smoke"
            ? 4
            : 10000;
    const a = { index: i, key: keyFor(i), first: spec.topology === "pooled" ? first : 0, people };
    first += people;
    return a;
  }).filter((a) => spec.topology === "pooled" || a.index === spec.physical);
}
export function accountOfSubject(accounts: readonly Account[], s: number): Account {
  let lo = 0,
    hi = accounts.length - 1;
  while (lo < hi) {
    const m = Math.ceil((lo + hi) / 2);
    if (accounts[m]!.first <= s) lo = m;
    else hi = m - 1;
  }
  const a = accounts[lo]!;
  assert(
    Number.isInteger(s) && s >= a.first && s < a.first + a.people,
    "Subject outside the physical account roster",
  );
  return a;
}
function move(e: string, delta: number) {
  if (!delta) return e;
  const s = subjectOf(e);
  if (s === null) return e;
  return e.replace(
    /^([a-z0-9]+:)\d{8}/,
    (_, prefix: string) => prefix + String(s + delta).padStart(8, "0"),
  );
}
function mapped(f: Fact, by: number): Fact {
  return {
    e: move(f.e, by),
    a: f.a,
    v: f.v.type === "ref" ? { ...f.v, value: move(String(f.v.value), by) } : f.v,
  };
}
// [DX-SCALE1] Why: explicit subject tenant keys and an atomic, paged membership index serve cross-account counts at the same physical cut. Rejected: inferring tenancy only from a subject-number range, or claiming a count from planned seed totals.
export function tenantRows(a: Account, local: number): Fact[] {
  assert(local >= 0 && local < a.people);
  const subject = a.first + local;
  const rows = deepOwnFacts(local).map((f) => mapped(f, a.first));
  rows.push(
    { e: ids.placement(subject), a: ":subject/account", v: string(a.key) },
    { e: shard(a, local), a: ":tenant/member", v: string(ids.placement(subject)) },
  );
  if (local % 256 === 0)
    rows.push({ e: accountRoot(a), a: ":tenant/shard", v: string(shard(a, local)) });
  if (local === 0) rows.push({ e: catalog, a: ":tenant/account", v: string(a.key) });
  return rows;
}
export const tenantFacts = (accounts: readonly Account[]) =>
  accounts.reduce(
    (sum, a) => sum + deepPopulation(a.people).facts + 2 * a.people + Math.ceil(a.people / 256) + 1,
    0,
  );
export const tenantPinKey = (s: TenantSpec) => [s.study, s.topology, s.physical].join("/");
export function tenantPopulationHash(spec: TenantSpec) {
  const h = createHash("sha256");
  for (const a of tenantAccounts(spec))
    for (let i = 0; i < a.people; i++) h.update(JSON.stringify(tenantRows(a, i)) + "\n");
  return h.digest("hex");
}
export function tenantSeedPin(spec: TenantSpec) {
  const p = JSON.parse(fs.readFileSync(new URL("./tenant-seeds.json", import.meta.url), "utf8"))[
    tenantPinKey(spec)
  ];
  assert.match(p, /^[a-f0-9]{64}$/);
  return p as string;
}
export class TenantWriters {
  private readonly active: Set<number>;
  private readonly writers = new Map<number, Pick<DeepWriter, "build" | "bind">>();
  constructor(
    privateAccounts: readonly Account[],
    events: readonly TenantEvent[],
    fieldSaves = false,
  ) {
    this.accounts = privateAccounts;
    this.active = new Set(events.map((e) => e.subject));
    for (const a of this.accounts)
      this.writers.set(
        a.index,
        new (fieldSaves ? FieldSaveWriter : DeepWriter)(
          new Set(events.filter((e) => e.tenant === a.index).map((e) => e.localSubject)),
        ),
      );
  }
  private readonly accounts: readonly Account[];
  bind(r: Receipt) {
    const groups = new Map<number, Receipt["triples"][number][]>();
    for (const t of r.triples) {
      const s = subjectOf(t.entityId);
      if (s === null || !this.active.has(s)) continue;
      const a = accountOfSubject(this.accounts, s);
      const list = groups.get(a.index) ?? [];
      list.push({
        ...t,
        entityId: move(t.entityId, -a.first),
        value:
          t.value.type === "ref" ? { ...t.value, value: move(t.value.value, -a.first) } : t.value,
      });
      groups.set(a.index, list);
    }
    for (const [i, triples] of groups) this.writers.get(i)!.bind({ ...r, triples });
  }
  build(run: string, e: TenantEvent, state: SubjectState, at: number) {
    const account = accountOfSubject(this.accounts, e.subject);
    assert(account.index === e.tenant && e.localSubject === e.subject - account.first);
    const x = this.writers
      .get(account.index)!
      .build(
        run + ":" + account.key,
        { ...e, subject: e.localSubject, seq: e.localSeq },
        state,
        at,
      );
    const operations = x.operations.map((op) =>
      op.op !== "assert"
        ? op
        : {
            ...op,
            entityId: move(op.entityId, account.first),
            value:
              op.value.type === "ref"
                ? { ...op.value, value: move(op.value.value, account.first) }
                : op.value,
          },
    );
    return {
      ...x,
      operations,
      added: x.added.map((f) => mapped(f, account.first)),
      removed: x.removed.map((f) => mapped(f, account.first)),
    };
  }
}
type Position = { position: number; validAt: number };
// [DX-SCALE1] Why: string directory links let one cut count actual membership in bounded pages. Rejected: pulling every business fact into memory to count people.
export async function tenantQueries(
  comp: CompositionHandle,
  accounts: readonly Account[],
  basis: Position,
) {
  const observed = new MembershipProof();
  let gatewayTrips = 0,
    lastTrips = 0;
  const read = async (roots: string[]) => {
    const r = await comp.sweepPage(roots, basis);
    assert.deepEqual(r.reportedBasis, basis);
    lastTrips = r.roundTrips;
    gatewayTrips += lastTrips;
    for (const row of r.rows) observed.add(row);
    return r.rows;
  };
  const directory = await read([catalog]);
  assert.deepEqual(
    directory
      .filter((f) => f.attribute === ":tenant/account")
      .map((f) => f.value.value)
      .sort(),
    accounts.map((a) => a.key).sort(),
  );
  const counts: Record<string, number> = {},
    h = createHash("sha256");
  let calls = 1;
  for (const a of accounts) {
    const links = (await read([accountRoot(a)]))
      .filter((f) => f.attribute === ":tenant/shard")
      .map((f) => f.value.value)
      .sort();
    calls++;
    assert.deepEqual(
      links,
      Array.from({ length: Math.ceil(a.people / 256) }, (_, i) => shard(a, i * 256)).sort(),
    );
    const seen = new Uint8Array(a.people);
    for (let n = 0; n < links.length; n += 8) {
      const page = await read(links.slice(n, n + 8));
      calls++;
      for (const f of page) {
        assert.equal(f.attribute, ":tenant/member");
        const s = subjectOf(f.value.value);
        assert(
          s !== null &&
            f.value.value === ids.placement(s) &&
            s >= a.first &&
            s < a.first + a.people &&
            f.entityId === shard(a, s - a.first) &&
            !seen[s - a.first],
        );
        seen[s - a.first] = 1;
      }
    }
    counts[a.key] = seen.reduce((sum, n) => sum + n, 0);
    assert.equal(counts[a.key], a.people);
    h.update(a.key);
    h.update(seen);
  }
  const witnesses = accounts.length > 1 ? [accounts[0]!, accounts[1]!] : [accounts[0]!];
  const roots = witnesses.map((a) => ids.placement(a.first)),
    world = await read(roots);
  calls++;
  const worlds = witnesses.map((a) => {
    const rows = world.filter((r) => subjectOf(r.entityId) === a.first);
    const key = rows.filter(
      (r) => r.entityId === ids.placement(a.first) && r.attribute === ":subject/account",
    );
    assert(key.length === 1 && key[0]!.value.value === a.key && rows.length > 75);
    return { account: a.key, subject: a.first, rows };
  });
  assert.equal(
    worlds.reduce((n, w) => n + w.rows.length, 0),
    world.length,
    "Unclaimed row in the pinned witness worlds",
  );
  return {
    basis,
    gatewayTrips,
    multiRootTrips: lastTrips,
    counts,
    total: Object.values(counts).reduce((n, v) => n + v, 0),
    membershipSha256: h.digest("hex"),
    receiptProjection: observed.value(),
    apiCalls: calls,
    crossAccountSingleRequest: roots.length === 2,
    worlds,
  };
}
export function tenantRung(spec: TenantSpec) {
  return (
    (spec.live ? "deep-live-" + spec.live + "-" : "tenant-") +
    spec.study +
    "-" +
    tenantAccounts(spec).reduce((s, a) => s + a.people, 0)
  );
}
export function tenantScope(spec: TenantSpec, nonce: string) {
  return (
    "ns-datomic-" + tenantRung(spec).replaceAll("-", "") + "-deep-" + nonce + "-s" + spec.physical
  );
}
export function campaignItem(item: number, topology?: Topology) {
  assert(Number.isInteger(item) && item >= 1 && item <= 5);
  if (item < 3) {
    assert(!topology);
    return { people: item === 1 ? 10000 : 100000, scopes: 1 };
  }
  topology ??= "pooled";
  assert(
    item >= 3 && ["pooled", "separate"].includes(topology) && (item !== 5 || topology === "pooled"),
  );
  const study: TenantStudy = item === 3 ? "interference" : item === 4 ? "small" : "million";
  const all = tenantAccounts({ study, topology: "pooled", physical: 0 }),
    scopes = topology === "pooled" ? 1 : all.length;
  return {
    people: all.reduce((n, a) => n + a.people, 0) / scopes,
    scopes,
    accounts: all.length,
    study,
    layout: topology,
    facts: tenantFacts(all),
  };
}
