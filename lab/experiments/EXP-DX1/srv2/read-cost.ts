// [DX-SRV2] Mac toy for the two pinned read options (TX2_PINNED_CUT_LOOKUP, TX2_PINNED_SHORTCUT) at a pin far behind
// the head. The plan (srv1/SESSION-PLAN.md A.1) says a pinned read at an old pin, with the options off, looks the pin up
// among the grouped-save positions on Datomic's past view, and proving it absent walks every grouped-save position
// written after the pin. This toy makes that walk long: it seeds the shortcut gate's population (rd1/shortcut-gate),
// lets AGE1's code age it, then saves through the grouped writer for a fixed time, one save per group commit, so tens of
// thousands of grouped-save positions lie after the seed cut. Then four readers of the same database (both options
// off; both on; the cut lookup alone; the tuned reader) read the same subjects at the seed cut and near the head.
// Costs are Mac diagnostics; the counts (grouped positions after the pin, wrong values, differences) are results.
// Rejected: writing synthetic position datoms (not what the product writes) and reusing the full shortcut gate (its
// comparison reads every position from 1 to the head, which tens of thousands of saves make far too long).
import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { DatomicClient } from "../../../../packages/datomic/dist/index.js";
import { fieldValue } from "../../../bench/lib/deep-world.ts";
import { Histogram } from "../../../bench/lib/hist.ts";
import { ids, SEED_VALID_FROM } from "../../../bench/lib/world.ts";
import { command } from "../w1/group/workload.ts";
import { sha } from "../w1/field/schedule.ts";
import { scaleAccount, scaleOwner } from "../prep1/ceiling-seed.ts";

const [out, url, readerOff, readerOn, readerLookup, readerTuned] = process.argv.slice(2);
const saveSeconds = Number(process.env.SRV2_COST_SAVE_SECONDS ?? "240"), seats = Number(process.env.SRV2_COST_SAVE_SEATS ?? "2");
const probeReads = Number(process.env.SRV2_COST_PROBE_READS ?? "300"), loadSeconds = Number(process.env.SRV2_COST_LOAD_SECONDS ?? "20");
assert(saveSeconds >= 10 && saveSeconds <= 900 && seats >= 1 && seats <= 16 && probeReads >= 20 && loadSeconds >= 5);
const waitFor = async (file: string, seconds: number) => {
  for (let i = 0; i < seconds * 4 && !existsSync(join(out!, file)); i++) await sleep(250);
  assert(existsSync(join(out!, file)), "timed out waiting for " + file);
};
await waitFor("ready", 300);
const nonce = crypto.randomUUID();
const name = "dx-scale-decision-" + nonce + "-0";
const scope = JSON.stringify(["triplex-scope-v1", "test", "test", name, 0]);
const people = 50;
let client = new DatomicClient(url!, 35_000);
const init = await client.create(scope, "lean", true, 35_000);
assert(init.created && init.strictRecordClocks);
const db = init.db;
const str = (value: string) => ({ type: "string" as const, value });
const write = async (id: string, facts: { e: string; a: string; v: ReturnType<typeof str> }[]) => {
  const ack: any = await client.transact(db, command(id, facts) as any);
  assert.equal(ack.operationId, id);
  return Number(ack.position.v);
};
// The shortcut gate's seed: account membership on each root, three fields on each subject's first task.
for (let a = 0; a < 10; a++) {
  const key = scaleAccount(a);
  const roots = [...Array.from({ length: people }, (_, i) => i), 257, 99_999].flatMap((i) => [
    { e: "acct/" + key + "/" + ids.placement(i), a: ":subject/account", v: str(key) },
    { e: "acct/" + key + "/" + ids.placement(i), a: ":subject/member", v: str(String(i)) }]);
  await write("seed-roots-" + a, roots);
  for (let start = 0; start < people; start += 10) {
    const facts = [];
    for (let i = start; i < start + 10; i++)
      for (let j = 0; j < 3; j++) facts.push({ e: scaleOwner(a, i), a: ":task/field-" + j, v: str(fieldValue(i, 0, j, 0).value) });
    await write("seed-fields-" + a + "-" + start, facts);
  }
}
const seedCut = await write("load1/" + sha([name, "toy-loader-seal", 2000]) + "/1", [{ e: "acct/loader/terminal", a: ":loader/done", v: str("yes") }]);
writeFileSync(join(out!, "seed.json"), JSON.stringify({ db, name, seedCut }) + "\n");
client.close();
await waitFor("aged.json", 900);
const aged = JSON.parse(readFileSync(join(out!, "aged.json"), "utf8"));
assert.equal(aged.seedHead, seedCut);
const tasks = Array.from({ length: 10 }, (_, a) => Array.from({ length: people }, (_, i) => ({ a, i, e: scaleOwner(a, i) }))).flat();

// Grouped saves for saveSeconds: each seat owns its own subjects, one save per group commit when seats = 1.
writeFileSync(join(out!, "phase-0.env"), ["TX2_GROUP_COMMIT=1", "TX2_GROUP_STAGE_CLOCK=1", "TX2_GROUP_FAST_REPLY=1", "TX2_GROUP_REUSE_PREPARED=1",
  "TX2_LIVE_PRIORITY=1", "TX2_GROUP_MAX_MEMBERS=32", "TX2_SMALL_ROWS=1", "TX2_SAVE_LEDGER=1"].join("\n") + "\n");
await waitFor("phase-0.ready", 300);
client = new DatomicClient(url!, 35_000);
assert(!(await client.create(scope, "lean", true, 35_000)).created);
const headOf = async () => Number((await client.request<any>("GET", "/v1/db/" + db + "/write-options")).position);
const startHead = await headOf();
let saves = 0, head = startHead;
const savesEnd = Date.now() + saveSeconds * 1000;
await Promise.all(Array.from({ length: seats }, async (_, seat) => {
  const mine = tasks.filter((_, k) => k % seats === seat);
  for (let n = 0; Date.now() < savesEnd; n++) {
    const t = mine[n % mine.length]!, attribute = ":task/field-1";
    const old = ((await client.rows(db, { entityIds: [t.e], basis: { recordedPosition: head, validAt: SEED_VALID_FROM + 1 } })) as any[])
      .filter((r) => r.attribute === attribute);
    const id = `srv2-cost-${nonce}-${seat}-${n}`;
    const ack: any = await client.transact(db, command(id, [{ e: t.e, a: attribute, v: str("cost-" + n) }], old, true) as any);
    head = Math.max(head, Number(ack.position.v));
    saves++;
  }
}));
const endHead = await headOf();
client.close();
writeFileSync(join(out!, "compare"), "owner-head=0\n");
await waitFor("compare-ready", 300);

const readers = { off: readerOff!, on: readerOn!, lookup: readerLookup!, tuned: readerTuned! };
const clients = Object.fromEntries(Object.entries(readers).map(([k, u]) => [k, new DatomicClient(u, 35_000)])) as Record<keyof typeof readers, DatomicClient>;
for (const c of Object.values(clients)) await c.create(scope, "lean", true, 35_000);
const opts = async (c: DatomicClient) => { const o = (await c.request<any>("GET", "/v1/db/" + db + "/write-options")).options; return [o.pinnedShortcut, o.pinnedCutLookup]; };
assert.deepEqual([await opts(clients.off), await opts(clients.on), await opts(clients.lookup), await opts(clients.tuned)],
  [[false, false], [true, true], [false, true], [true, true]]);
const stats = async (c: DatomicClient) => (await c.request<any>("GET", "/v2/admin/scan-stats")).pinnedShortcut;
const field = (c: DatomicClient, e: string, position: number) =>
  c.rows(db, { entityIds: [e], pattern: { attribute: ":task/field-0" }, basis: { recordedPosition: position, validAt: SEED_VALID_FROM + 1 } }) as Promise<any[]>;

// Exactness: every task subject at five pins, field 0 in batches of 8 and whole rows in batches of 100, each reader
// against the reader with both options off.
const canon = (x: any[]) => JSON.stringify([...x].sort((p, q) => (p.id < q.id ? -1 : p.id > q.id ? 1 : 0)));
const pins = [...new Set([seedCut, seedCut + 1, Math.floor((seedCut + endHead) / 2), endHead - 1, endHead])];
let compared = 0;
const differences: unknown[] = [];
for (const p of pins) {
  for (let k = 0; k < tasks.length; k += 8) {
    const entities = tasks.slice(k, k + 8).map((t) => t.e), basis = { recordedPosition: p, validAt: SEED_VALID_FROM + 1 };
    const ref = canon(await clients.off.rows(db, { entityIds: entities, pattern: { attribute: ":task/field-0" }, basis }) as any[]);
    for (const name of ["on", "lookup", "tuned"] as const) {
      compared++;
      if (canon(await clients[name].rows(db, { entityIds: entities, pattern: { attribute: ":task/field-0" }, basis }) as any[]) !== ref)
        differences.push({ p, reader: name, entities: entities.length, shape: "field" });
    }
  }
  for (let k = 0; k < tasks.length; k += 100) {
    const entities = tasks.slice(k, k + 100).map((t) => t.e), basis = { recordedPosition: p, validAt: SEED_VALID_FROM + 1 };
    const ref = canon(await clients.off.rows(db, { entityIds: entities, basis }) as any[]);
    for (const name of ["on", "lookup", "tuned"] as const) {
      compared++;
      if (canon(await clients[name].rows(db, { entityIds: entities, basis }) as any[]) !== ref) differences.push({ p, reader: name, shape: "rows" });
    }
  }
}

// Cost: one seat, probeReads single-subject field reads at the seed cut (each value checked against the seed's), then
// the same near the head (checked against the off reader), then loadSeconds at 16 seats at the seed cut.
const pick = (n: number) => tasks[(7919 * (n + 1)) % tasks.length]!;
async function probe(name: keyof typeof readers, position: "seed" | "head") {
  const c = clients[name], h = new Histogram(), at = position === "seed" ? seedCut : endHead - 1;
  let wrong = 0;
  const before = await stats(c);
  for (let n = 0; n < probeReads; n++) {
    const t = pick(n), started = performance.now();
    const rows = await field(c, t.e, at);
    h.recordMs(performance.now() - started);
    const want = position === "seed" ? fieldValue(t.i, 0, 0, 0).value : (await field(clients.off, t.e, at))[0]?.value_string;
    if (rows.length !== 1 || rows[0].value_string !== want) wrong++;
  }
  const after = await stats(c);
  return { reader: name, pin: position, position: at, behindHead: endHead - at, reads: h.count, wrong, latency: h.summary(),
    currentAnswers: after.currentAnswers - before.currentAnswers, asOfAnswers: after.asOfAnswers - before.asOfAnswers };
}
async function load(name: keyof typeof readers) {
  const c = clients[name], h = new Histogram(), end = performance.now() + loadSeconds * 1000;
  let wrong = 0, errors = 0;
  await Promise.all(Array.from({ length: 16 }, async (_, seat) => {
    for (let n = seat; performance.now() < end; n += 16) {
      const t = pick(n), started = performance.now();
      try {
        const rows = await field(c, t.e, seedCut);
        if (performance.now() <= end) h.recordMs(performance.now() - started);
        if (rows.length !== 1 || rows[0].value_string !== fieldValue(t.i, 0, 0, 0).value) wrong++;
      } catch { errors++; }
    }
  }));
  return { reader: name, seats: 16, seconds: loadSeconds, readsPerSecond: Number((h.count / loadSeconds).toFixed(1)), wrong, errors, latency: h.summary() };
}
// Warm each reader's cache with one pass, so the probes measure the lookup, not first loads.
for (const name of Object.keys(readers) as (keyof typeof readers)[]) for (let n = 0; n < tasks.length; n++) await field(clients[name], pick(n).e, seedCut);
const probes = [];
for (const position of ["seed", "head"] as const) for (const name of ["off", "lookup", "on", "tuned"] as const) probes.push(await probe(name, position));
const loads = [];
for (const name of ["off", "lookup", "on", "tuned"] as const) loads.push(await load(name));
const result = { toy: "srv2-read-cost", seedCut, agedHead: aged.head ?? null, startHead, endHead, groupedSaves: saves, saveSeats: seats,
  positionsAfterPin: endHead - seedCut, pins, compared, differenceCount: differences.length, differences: differences.slice(0, 20), probes, loads,
  stats: Object.fromEntries(await Promise.all(Object.entries(clients).map(async ([k, c]) => [k, await stats(c)]))) };
writeFileSync(join(out!, "result.json"), JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify({ ...result, probes: probes.map((p) => [p.reader, p.pin, p.latency.p50Ms, p.latency.p99Ms, p.wrong, p.currentAnswers]),
  loads: loads.map((l) => [l.reader, l.readsPerSecond, l.latency.p99Ms, l.wrong, l.errors]) }));
for (const c of Object.values(clients)) c.close();
writeFileSync(join(out!, "finished"), "ok\n");
assert.equal(differences.length, 0, "an option changed a pinned answer");
assert(probes.every((p) => p.wrong === 0) && loads.every((l) => l.wrong === 0 && l.errors === 0), "a wrong value or a read error");
