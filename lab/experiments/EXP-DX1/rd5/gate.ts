// [DX-RD5] Mac gate for the uncached pinned read: seed a deep toy (SCALE1's own subject shape, `deepOwnFacts`, two
// accounts) through the writer, age it with saves of field 0, then compare the tuned reader as merged (8081) with the
// same reader plus the read prefetch and Datomic's read-ahead off (8082) and plus the prefetch alone (8083): pinned
// reads of every subject at many positions, with and without the field pattern, history reads and historical worlds,
// part of it while saves run. Then hand the probe its subjects (probe.clj counts the loads). Times are not results.
// Rejected: comparing against a model of the rows (the reference is the merged reader's own answer).
import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { DatomicClient } from "../../../../packages/datomic/dist/index.js";
import { deepOwnFacts, fieldValue } from "../../../bench/lib/deep-world.ts";
import { ids, SEED_VALID_FROM } from "../../../bench/lib/world.ts";
import { command } from "../w1/group/workload.ts";
import { scaleAccount } from "../prep1/ceiling-seed.ts";

const [out, writer, readerRef, readerBoth, readerPrefetch] = process.argv.slice(2);
const accounts = Number(process.env.RD5_ACCOUNTS ?? 2);
const people = Number(process.env.RD5_SUBJECTS ?? 1000);
const agingSaves = Number(process.env.RD5_AGING ?? 240);
const waitFor = async (file: string, seconds: number) => {
  for (let i = 0; i < seconds * 4 && !existsSync(join(out!, file)); i++) await sleep(250);
  assert(existsSync(join(out!, file)), "timed out waiting for " + file);
};
await waitFor("ready", 300);
const nonce = crypto.randomUUID();
const name = "dx-rd5-uncached-" + nonce;
const scope = JSON.stringify(["triplex-scope-v1", "test", "test", name, 0]);
const client = new DatomicClient(writer!, 60_000);
const init = await client.create(scope, "lean", true, 60_000);
assert(init.created && init.strictRecordClocks);
const db = init.db;
const prefix = (a: number) => "acct/" + scaleAccount(a) + "/";
const owner = (a: number, i: number) => prefix(a) + ids.i9(i);
type F = ReturnType<typeof deepOwnFacts>[number];
const account = (a: number, f: F): F => ({
  e: prefix(a) + f.e, a: f.a, v: f.v.type === "ref" ? { type: "ref", value: prefix(a) + f.v.value } : f.v,
});
const t0 = Date.now();
let facts = 0;
// The loader's frames (load1/source.ts `frames`, width 2,000): whole subjects in order, up to 2,000 facts per command,
// so entity numbers are handed out per frame as on the 1 billion database. Four commands in flight.
const frames: F[][] = [];
for (let a = 0; a < accounts; a++) {
  let rows: F[] = [];
  for (let i = 0; i < people; i++) {
    const world = deepOwnFacts(i).map((f) => account(a, f));
    if (rows.length && rows.length + world.length > 2000) { frames.push(rows); rows = []; }
    rows.push(...world);
  }
  if (rows.length) frames.push(rows);
}
const jobs = frames.map((rows, k) => () => transact(command(`rd5-seed-${nonce}-${k}`, rows)));
let next = 0, resent = 0;
// A commit whose outcome is unknown (the gateway's own deadline on a busy Mac) is resent with the same command; a
// duplicate answer means the first one committed.
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
await Promise.all(Array.from({ length: 4 }, async () => {
  while (next < jobs.length) {
    const ack: any = await jobs[next++]!();
    assert(ack === undefined || Number(ack.position.v) > 0);
  }
}));
facts = frames.reduce((n, f) => n + f.length, 0);
const headOf = async (c: DatomicClient) => Number((await c.request<any>("GET", "/v1/db/" + db + "/write-options")).position);
const seedCut = await headOf(client);
console.error(new Date().toISOString(), "seeded", accounts * people, "subjects in", frames.length, "frames,", facts, "facts in", Date.now() - t0, "ms; head", seedCut, "resent", resent);
const validAt = SEED_VALID_FROM + 1;
// Aging: saves replacing field 0 (and, every third save, field 1) of random subjects through the general writer.
let saved = 0;
const saveOne = async (c: DatomicClient, k: number) => {
  const a = Math.floor(Math.random() * accounts), i = Math.floor(Math.random() * people), e = owner(a, i);
  const head = await headOf(c);
  const before = (await c.rows(db, { entityIds: [e], basis: { recordedPosition: head, validAt } })) as any[];
  const attrs = k % 3 === 0 ? [":task/field-0", ":task/field-1"] : [":task/field-0"];
  const old = before.filter((r) => attrs.includes(r.attribute));
  const change = attrs.map((attr) => ({ e, a: attr, v: { type: "string" as const, value: fieldValue(i, 0, Number(attr.slice(-1)), k + 1).value } }));
  const ack: any = await c.transact(db, command(`rd5-age-${nonce}-${k}`, change, old) as any);
  saved++;
  return { e, value: change[0]!.v.value, position: Number(ack?.position?.v) };
};
for (let k = 0; k < agingSaves; k++) await saveOne(client, k);
const agedHead = await headOf(client);
const subjects = Array.from({ length: accounts }, (_, a) => Array.from({ length: people }, (_, i) => owner(a, i))).flat();
writeFileSync(join(out!, "seed.json"), JSON.stringify({ db, name, seedCut, agedHead, subjects: subjects.length, facts }) + "\n");
await waitFor("compare-ready", 900);

// Comparison.
const ref = new DatomicClient(readerRef!, 60_000), both = new DatomicClient(readerBoth!, 60_000), pre = new DatomicClient(readerPrefetch!, 60_000);
for (const c of [ref, both, pre]) await c.create(scope, "lean", true, 60_000);
const options = async (c: DatomicClient) => (await c.request<any>("GET", "/v1/db/" + db + "/write-options")).options;
const [o0, o1, o2] = [await options(ref), await options(both), await options(pre)];
assert.deepEqual([o0.pinnedShortcut, o0.pinnedCutLookup, o0.readPrefetch ?? false, o0.readAheadPool ?? null], [true, true, false, null]);
assert.deepEqual([o1.pinnedShortcut, o1.pinnedCutLookup, o1.readPrefetch, o1.readAheadPool], [true, true, true, "0"]);
assert.deepEqual([o2.pinnedShortcut, o2.pinnedCutLookup, o2.readPrefetch, o2.readAheadPool ?? null], [true, true, true, null]);
const canon = (x: unknown) => JSON.stringify(x, (_k, v) => (Array.isArray(v) && v.length && typeof v[0] === "object" && v[0] && "id" in v[0]
  ? [...v].sort((p: any, q: any) => (p.id < q.id ? -1 : p.id > q.id ? 1 : 0)) : v));
const differences: unknown[] = [];
let compared = 0, rows = 0;
const check = async (route: string, call: (c: DatomicClient) => Promise<unknown>, where: unknown) => {
  const reference = canon(await call(ref));
  for (const [label, c] of [["both", both], ["prefetch", pre]] as const) {
    compared++;
    if (canon(await call(c)) !== reference) differences.push({ route, reader: label, where });
  }
};
const chunks = <T,>(xs: T[], n: number) => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));
const read = (basis: object, entities: string[], extra: object = {}) => (c: DatomicClient) =>
  c.request<any>("POST", "/v1/db/" + db + "/read", { entityIds: entities, basis, ...extra }).then((r) => { rows += r.rows.length; return r.rows; });
const shuffled = [...subjects].sort(() => Math.random() - 0.5);
// [DX-INT4] RD5_POOL: comparisons in flight (default 4); more makes reads wait for the treatment readers' permits, which
// is what the waiting-read bound acts on.
const width = Number(process.env.RD5_POOL ?? 4);
const pool = async <T,>(items: T[], n: number, f: (x: T) => Promise<void>) => {
  let k = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (k < items.length) await f(items[k++]!); }));
};
// 1. Field 0 by pattern (the ladder's read), batches of eight in random order, at 40 positions from the seed cut to
// the aged head and at 8 positions inside the seed (subjects not yet written answer empty on both readers).
const positions = [...new Set([
  ...Array.from({ length: 8 }, (_, k) => Math.max(1, Math.floor((seedCut * (k + 1)) / 9))),
  ...Array.from({ length: 40 }, (_, k) => seedCut + Math.floor(((agedHead - seedCut) * k) / 39))])];
const tasks1 = positions.flatMap((p) => chunks(shuffled, 8).map((part) => ({ p, part })));
await pool(tasks1, width, ({ p, part }) => check("field0", read({ recordedPosition: p, validAt }, part, { pattern: { attribute: ":task/field-0" } }), { p }));
console.error(new Date().toISOString(), "field-0 compared", compared);
// 2. Whole subjects (no pattern) at 6 positions, both valid times.
const tasks2 = positions.filter((_, k) => k % 8 === 7).flatMap((p) => [1, validAt].flatMap((v) => chunks(shuffled, 8).map((part) => ({ p, v, part }))));
await pool(tasks2, width, ({ p, v, part }) => check("whole", read({ recordedPosition: p, validAt: v }, part), { p, v }));
// 3. History reads of the aged subjects, and historical worlds for 64 subjects at 6 positions.
await pool(chunks(shuffled.slice(0, 400), 8), 4, (part) => check("history", read({ recordedPosition: agedHead }, part, { history: true }), {}));
for (const p of positions.filter((_, k) => k % 8 === 3))
  for (const part of chunks(shuffled.slice(0, 64), 16))
    await check("reach", (c) => c.readHistoricalWorlds(scope, part, { recordedPosition: p, validAt } as any).then((w: any) => w?.worlds ?? null), { p });
console.error(new Date().toISOString(), "before live phase compared", compared);
// 4. While saves run: pinned field reads at fixed positions up to the aged head, and near the moving head.
let running = true;
// [DX-INT4] Pair (b): with RD5_AT_LEAST=1, after each live save both treatment readers are asked for the saved subject's
// field 0 at least at the save's receipt (an unpinned read); the answer must echo the receipt and hold the saved value.
const atLeast = { reads: 0, early: 0, wrongEcho: 0, examples: [] as unknown[] };
const saver = (async () => {
  let k = agingSaves;
  while (running) {
    const r = await saveOne(client, k++);
    if (process.env.RD5_AT_LEAST !== "1") continue;
    for (const [label, c] of [["both", both], ["prefetch", pre]] as const) {
      const answer = await c.request<any>("POST", "/v1/db/" + db + "/read",
        { entityIds: [r.e], pattern: { attribute: ":task/field-0" }, atLeastPosition: r.position, basisWaitMs: 2000 });
      atLeast.reads++;
      // A /read row carries its value as value_string, which the lean layout answers as {t, v}.
      const values = answer.rows.map((x: any) => (x.value_string && typeof x.value_string === "object" ? x.value_string.v : x.value_string));
      if (answer.atLeast !== r.position) atLeast.wrongEcho++;
      if (values.length !== 1 || values[0] !== r.value) {
        atLeast.early++;
        if (atLeast.examples.length < 5) atLeast.examples.push({ reader: label, receipt: r.position, want: r.value, got: values });
      }
    }
  }
})();
const live = shuffled.slice(0, 800);
await pool(chunks(live, 8), width, async (part) => {
  await check("live-fixed", read({ recordedPosition: agedHead, validAt }, part, { pattern: { attribute: ":task/field-0" } }), {});
  const p = await headOf(ref);
  await check("live-near-head", read({ recordedPosition: p - 1, validAt }, part, { pattern: { attribute: ":task/field-0" } }), { p });
});
running = false;
await saver;
const finalHead = await headOf(client);
// 5. The server arm's own read window (rd1/pinned-ladder.ts pinnedWindow) at the seed cut, every value checked against
// the seed's: one reader, then the same with odd seats on a second reader (DX_RD5_SECOND_READER). Needs the window's
// ten accounts (RD5_ACCOUNTS=10).
let windows: unknown = "skipped: fewer than ten accounts";
if (accounts === 10) {
  const { pinnedWindow } = await import("../rd1/pinned-ladder.ts");
  const seed = { scope: { db, cut: seedCut, name }, image: { people } } as any;
  const run = async (second?: string) => pinnedWindow(readerRef!, seed, "random-seed-cut",
    { start: Date.now() + 500, seconds: 10, startHead: agedHead, candidates: [] }, { seats: 32, batch: 8, ...(second ? { secondRead: second } : {}) });
  const one = await run(), two: any = await run(readerPrefetch!);
  for (const w of [one, two] as any[]) assert(w.wrong === 0 && w.errors === 0 && w.read.count > 0, "the read window failed: " + JSON.stringify(w));
  assert(two.readers.first.exchanges > 0 && two.readers.second.exchanges > 0, "the second reader took no seats");
  windows = { one, two };
}
const stats = async (c: DatomicClient) => (await c.request<any>("GET", "/v2/admin/scan-stats"));
const s0 = await stats(ref), s1 = await stats(both), s2 = await stats(pre);
const threads = async (c: DatomicClient) => c.request<any>("GET", "/v2/admin/threads").catch(() => null);
const [t1, t2] = [await threads(both), await threads(pre)];
const pair = { atLeast: process.env.RD5_AT_LEAST === "1" ? { ...atLeast, gateway: { both: s1.atLeast ?? null, prefetch: s2.atLeast ?? null } } : null,
  treatmentEnv: process.env.RD5_TREATMENT_ENV ?? "",
  bound: { both: t1 && { readWaitLimit: t1.readWaitLimit, readsRefusedBusy: t1.readsRefusedBusy, readsAdmitted: t1.readsAdmitted },
    prefetch: t2 && { readWaitLimit: t2.readWaitLimit, readsRefusedBusy: t2.readsRefusedBusy, readsAdmitted: t2.readsAdmitted } },
  sdkBusyRetries: { both: both.readBusyRetries, prefetch: pre.readBusyRetries }, pool: width };
const result = { gate: "rd5-uncached-read", seedCut, agedHead, finalHead, accounts, people, facts, agingSaves: saved, windows, pair,
  positions: positions.length, compared, rows, differenceCount: differences.length, differences: differences.slice(0, 20),
  shortcut: { ref: s0.pinnedShortcut, both: s1.pinnedShortcut, prefetch: s2.pinnedShortcut },
  prefetch: { ref: s0.readPrefetch, both: s1.readPrefetch, prefetch: s2.readPrefetch } };
writeFileSync(join(out!, "compare.json"), JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify(result));
for (const c of [ref, both, pre, client]) c.close();
// The probe's subjects and pin: near the aged head, as the random windows read.
writeFileSync(join(out!, "probe-request.json"), JSON.stringify({
  uriTemplate: "unused", db, pin: finalHead - 5, validAt, attribute: ":task/field-0", subjects,
  single: Number(process.env.RD5_SINGLE ?? 600), exchanges: Number(process.env.RD5_EXCHANGES ?? 150),
  threads: 16, seconds: Number(process.env.RD5_SECONDS ?? 20), layout: true, seed: 7, pgUrl: "" }) + "\n");
writeFileSync(join(out!, "compare-done"), "ok\n");
assert.equal(differences.length, 0, "an option changed a pinned answer");
if (process.env.RD5_AT_LEAST === "1") assert(atLeast.reads > 0 && atLeast.early === 0 && atLeast.wrongEcho === 0, "an at-least read answered before its receipt");
assert(s1.readPrefetch.batches > 0 && s2.readPrefetch.batches > 0, "the prefetch must have run");
assert.equal(s0.readPrefetch.batches, 0);
