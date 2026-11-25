// [DX-INT4] Pair (c) of the afternoon merge: the ID list route (XQ3) and the read prefetch (RD5) on ONE read gateway,
// one permit each (TX2_INDEX_QUERY_PERMITS=1, TX2_READ_PERMITS=1), while 64 pinned readers run. The verdict: no request
// is refused other than by its own stated bound (the ID list's one-request-per-account rule or its permit wait, both
// 503 "IndexBusy"; pinned reads have no bound here, so none may be refused), every pinned answer equals the reference
// answer read once before the load, and every ID list equals the IDs this driver wrote. Times are diagnostic.
//   node --no-warnings --experimental-transform-types lab/experiments/EXP-DX1/int4/pair-c.ts OUT WRITE_URL READ_URL
// Rejected: going through the SDK for the counted requests (it retries ReadBusy and IndexBusy, hiding the statuses).
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { DatomicClient } from "../../../../packages/datomic/dist/index.js";
import { deepOwnFacts, fieldValue } from "../../../bench/lib/deep-world.ts";
import { ids, SEED_VALID_FROM } from "../../../bench/lib/world.ts";
import { command } from "../w1/group/workload.ts";
import { scaleAccount } from "../prep1/ceiling-seed.ts";

const [out, writer, reader] = process.argv.slice(2);
assert(out && writer && reader, "usage: pair-c.ts OUT WRITE_URL READ_URL");
const accounts = 2, people = Number(process.env.PAIRC_SUBJECTS ?? 200), seconds = Number(process.env.PAIRC_SECONDS ?? 60);
const seats = Number(process.env.PAIRC_SEATS ?? 64);
const nonce = crypto.randomUUID();
const scope = JSON.stringify(["triplex-scope-v1", "test", "test", "dx-int4-pair-c-" + nonce, 0]);
const client = new DatomicClient(writer, 60_000);
const init = await client.create(scope, "lean", true, 60_000);
const db = init.db;
const prefix = (a: number) => "acct/" + scaleAccount(a) + "/";
type F = ReturnType<typeof deepOwnFacts>[number];
const account = (a: number, f: F): F => ({
  e: prefix(a) + f.e, a: f.a, v: f.v.type === "ref" ? { type: "ref", value: prefix(a) + f.v.value } : f.v,
});
// Seed as the loader does (rd5/gate.ts): whole subjects in frames of up to 2,000 facts, four commands in flight.
const frames: F[][] = [];
const entities = Array.from({ length: accounts }, () => new Set<string>());
for (let a = 0; a < accounts; a++) {
  let rows: F[] = [];
  for (let i = 0; i < people; i++) {
    const world = deepOwnFacts(i).map((f) => account(a, f));
    for (const f of world) entities[a]!.add(f.e);
    if (rows.length && rows.length + world.length > 2000) { frames.push(rows); rows = []; }
    rows.push(...world);
  }
  if (rows.length) frames.push(rows);
}
// A commit whose outcome is unknown (the gateway's own deadline on a busy Mac) is resent with the same command; a
// duplicate answer means the first one committed (as rd5/gate.ts seeds).
let resent = 0;
const transact = async (input: unknown) => {
  for (let attempt = 0; ; attempt++) {
    try { return await client.transact(db, input as any); }
    catch (e: any) {
      if (e?.code === "OperationDuplicate" && attempt > 0) return undefined;
      if (e?.code !== "OutcomeUnknown" || attempt >= 4) throw e;
      resent++;
    }
  }
};
let next = 0;
await Promise.all(Array.from({ length: 4 }, async () => {
  while (next < frames.length) { const k = next++; await transact(command(`pairc-seed-${nonce}-${k}`, frames[k]!)); }
}));
const headOf = async (c: DatomicClient) => Number((await c.request<any>("GET", "/v1/db/" + db + "/write-options")).position);
const seedCut = await headOf(client);
const validAt = SEED_VALID_FROM + 1;
const owners = Array.from({ length: accounts }, (_, a) => Array.from({ length: people }, (_, i) => prefix(a) + ids.i9(i))).flat();
const post = async (url: string, route: string, body: unknown) => {
  const r = await fetch(`${url}${route}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const text = await r.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch { /* kept as text */ }
  return { status: r.status, json, text };
};
const canon = (rows: any[]) => JSON.stringify(rows.map((r) => [r.id, r.entity_id, r.attribute, r.value_string, r.recorded_position]).sort());
// The reference: every owner's field 0 at the seed cut, read once from the WRITE gateway (no prefetch, no load).
const reference = new Map<string, string>();
for (let k = 0; k < owners.length; k += 50) {
  const part = owners.slice(k, k + 50);
  const r = await post(writer, `/v1/db/${db}/read`, { entityIds: part, basis: { recordedPosition: seedCut, validAt }, pattern: { attribute: ":task/field-0" } });
  assert.equal(r.status, 200, r.text);
  for (const e of part) reference.set(e, canon(r.json.rows.filter((x: any) => x.entity_id === e)));
}
// Wait until the read gateway holds the seed cut.
for (let i = 0; i < 400; i++) { if (await headOf(new DatomicClient(reader, 5000)).catch(() => 0) >= seedCut) break; await sleep(100); }
const subjectsOf = (a: number) => Array.from({ length: people }, (_, i) => prefix(a) + ids.placement(i)).sort();
const idsOf = (a: number) => [...entities[a]!].sort();
const statuses = { reads: {} as Record<string, number>, steady: {} as Record<string, number>, burst: {} as Record<string, number> };
const bump = (m: Record<string, number>, k: string) => (m[k] = (m[k] ?? 0) + 1);
const wrong: unknown[] = [];
let reads = 0, rowsRead = 0, saves = 0, steadyLists = 0, burstCounts = 0;
const ends = Date.now() + seconds * 1000;
// Saves move the head (field 0 of random owners, sequentially), so a list at the head and a pinned list differ in position.
const saver = (async () => {
  for (let k = 0; Date.now() < ends; k++) {
    const e = owners[Math.floor(Math.random() * owners.length)]!, i = Number(e.slice(-8));
    const head = await headOf(client);
    const before = (await client.rows(db, { entityIds: [e], basis: { recordedPosition: head, validAt } })) as any[];
    const old = before.filter((r) => r.attribute === ":task/field-0");
    await transact(command(`pairc-save-${nonce}-${k}`, [{ e, a: ":task/field-0", v: { type: "string", value: fieldValue(i, 0, 0, k + 1).value } }], old));
    saves++;
    await sleep(100);
  }
})();
// 64 pinned readers: eight random owners each, field 0 at the seed cut, each answer compared with the reference.
const readers = Array.from({ length: seats }, async () => {
  while (Date.now() < ends) {
    const part = Array.from({ length: 8 }, () => owners[Math.floor(Math.random() * owners.length)]!);
    const r = await post(reader, `/v1/db/${db}/read`, { entityIds: [...new Set(part)], basis: { recordedPosition: seedCut, validAt }, pattern: { attribute: ":task/field-0" } });
    bump(statuses.reads, String(r.status) + (r.json?.code ? " " + r.json.code : ""));
    reads++;
    if (r.status !== 200) continue;
    rowsRead += r.json.rows.length;
    for (const e of new Set(part)) if (canon(r.json.rows.filter((x: any) => x.entity_id === e)) !== reference.get(e)) wrong.push({ e, at: seedCut });
  }
});
// A pass over an ID list: every page of one request, statuses counted; an IndexBusy page is retried after its retryAfterMs.
const pages = async (body: any, tally: Record<string, number>) => {
  const got: string[] = [];
  let cursor: string | null = null, position: number | null = null;
  for (let n = 0; n < 10_000; n++) {
    const r = await post(reader, `/v2/db/${db}/ids`, cursor ? { account: body.account, prefix: body.prefix, ...(body.shape ? { shape: body.shape } : {}), limit: body.limit, cursor } : body);
    bump(tally, String(r.status) + (r.json?.code ? " " + r.json.code : ""));
    if (r.status === 503 && r.json?.code === "IndexBusy") { await sleep(r.json.retryAfterMs ?? 25); continue; }
    if (r.status !== 200) return { failed: r.text, ids: got, position };
    position ??= r.json.position;
    assert.equal(r.json.position, position);
    got.push(...r.json.ids);
    cursor = r.json.next;
    if (!cursor) return { ids: got, position };
  }
  throw Error("unbounded ID list");
};
const listMismatches: unknown[] = [];
// The steady lister: account 1's subjects, alternately at the head and pinned at the seed cut; every fifth pass every ID.
const steady = (async () => {
  for (let j = 0; Date.now() < ends; j++) {
    const basis = j % 2 ? { basis: { recordedPosition: seedCut } } : {};
    const whole = j % 5 === 4;
    const body = whole ? { account: scaleAccount(0), prefix: "", limit: 500, ...basis } : { account: scaleAccount(0), prefix: "pl:", shape: "pl:{8 digits}", limit: 50, ...basis };
    const r = await pages(body, statuses.steady);
    steadyLists++;
    const want = whole ? idsOf(0) : subjectsOf(0);
    if (r.failed !== undefined || JSON.stringify(r.ids) !== JSON.stringify(want)) listMismatches.push({ j, whole, basis, failed: r.failed, got: r.ids.length, want: want.length });
  }
})();
// Bursts: three counts of account 2 at once every 3 s; one runs, the others are refused IndexBusy (one request per account).
const bursts = (async () => {
  while (Date.now() < ends) {
    const rs = await Promise.all([0, 1, 2].map(() => post(reader, `/v2/db/${db}/ids`, { account: scaleAccount(1), prefix: "", result: "count", bounds: { entries: 1_000_000, ms: 1000 } })));
    for (const r of rs) {
      bump(statuses.burst, String(r.status) + (r.json?.code ? " " + r.json.code : ""));
      burstCounts++;
      if (r.status === 200 && (r.json.count !== idsOf(1).length || r.json.next)) listMismatches.push({ burst: true, count: r.json.count, want: idsOf(1).length, next: r.json.next });
    }
    await sleep(3000);
  }
})();
await Promise.all([saver, ...readers, steady, bursts]);
const stats = await fetch(reader + "/v2/admin/scan-stats").then((r) => r.json()) as any;
const threads = await fetch(reader + "/v2/admin/threads").then((r) => r.json()).catch(() => null) as any;
const okRead = (k: string) => k === "200";
const okList = (k: string) => k === "200" || k === "503 IndexBusy";
const refusedOutsideBound = [...Object.keys(statuses.reads).filter((k) => !okRead(k)), ...Object.keys(statuses.steady).filter((k) => !okList(k)),
  ...Object.keys(statuses.burst).filter((k) => !okList(k))];
const summary = {
  gate: "int4-pair-c", db, seedCut, resent, finalHead: await headOf(client), accounts, people, seats, seconds, saves, reads, rowsRead,
  wrong: wrong.length, statuses, steadyLists, burstCounts, listMismatches: listMismatches.length, refusedOutsideBound,
  readPrefetch: stats.readPrefetch, readPermits: threads?.readPermits ?? null, readWaitLimit: threads?.readWaitLimit ?? null,
  passed: reads > 0 && wrong.length === 0 && refusedOutsideBound.length === 0 && listMismatches.length === 0 && steadyLists > 0 &&
    (statuses.burst["200"] ?? 0) > 0 && (statuses.burst["503 IndexBusy"] ?? 0) > 0 && stats.readPrefetch?.prefetch === true &&
    stats.readPrefetch.batches > 0 && stats.readPrefetch.failures === 0 && threads?.readPermits === 1,
};
writeFileSync(join(out, "pair-c.json"), JSON.stringify({ summary, wrong: wrong.slice(0, 20), listMismatches: listMismatches.slice(0, 20) }, null, 2) + "\n");
console.log("INT4_PAIR_C " + JSON.stringify(summary));
client.close();
process.exit(summary.passed ? 0 : 1);
