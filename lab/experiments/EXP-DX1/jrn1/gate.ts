// [DX-JRN1] Mac live gate for the bounded journal routes and the field-history page, on a loader-aged toy.
// The container (container.sh) runs PostgreSQL, a transactor and this branch's gateway. This driver seeds a SCALE1-shaped
// toy through the gateway (as PREP1's aged-live gate); AGE1's own native single and grouped renders at its load pin then
// age it (the bulk loader's path, every save with a non-canonical position row), followed by a run of position entries
// that yield no journal; a fresh gateway reopens it. Then every check below compares the bounded answer with the old one.
// Costs are counted in index entries examined (the gateway's own counters), never in time; times are diagnostic.
import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { Effect } from "effect";
import {
  DatomicClient,
  acceptLoaderPositionRows,
  makeDatomicStorageAdapter,
} from "../../../../packages/datomic/src/index.ts";
import { fieldValue } from "../../../bench/lib/deep-world.ts";
import { ids } from "../../../bench/lib/world.ts";
import { command } from "../w1/group/workload.ts";
import { sha } from "../w1/field/schedule.ts";
import { scaleAccount, scaleOwner } from "../prep1/ceiling-seed.ts";

const [out, url, argsText] = process.argv.slice(2);
assert(out && url && argsText, "usage: gate.ts OUT URL 'people perAccount singles saves group run'");
const [people, perAccount, singles, saves, group, run] = argsText.split(" ").map(Number) as number[];
const waitFor = async (file: string, seconds: number) => {
  for (let i = 0; i < seconds * 4 && !existsSync(join(out, file)); i++) await sleep(250);
  assert(existsSync(join(out, file)), "timed out waiting for " + file);
};
writeFileSync(join(out, "age-args"), [people, perAccount, singles, saves, group, run].join(" ") + "\n");
await waitFor("ready", 300);
const nonce = crypto.randomUUID();
const name = "dx-scale-decision-" + nonce + "-0";
const scope = JSON.stringify(["triplex-scope-v1", "test", "test", name, 0]);
let client = new DatomicClient(url, 35_000);
const init = await client.create(scope, "lean", true, 35_000);
assert(init.created && init.strictRecordClocks);
const db = init.db;
const str = (value: string) => ({ type: "string" as const, value });
const write = async (id: string, facts: { e: string; a: string; v: ReturnType<typeof str> }[]) => {
  const ack = (await client.transact(db, command(id, facts) as never)) as { operationId: string; position: { v: string } };
  assert.equal(ack.operationId, id);
  return Number(ack.position.v);
};
// The SCALE1-shaped seed of PREP1's aged-live gate: account roots, three fields on each subject's first task, a loader terminal.
for (let a = 0; a < 10; a++) {
  const key = scaleAccount(a);
  const roots = [...Array.from({ length: people! }, (_, i) => i), 257, 99_999].flatMap((i) => [
    { e: "acct/" + key + "/" + ids.placement(i), a: ":subject/account", v: str(key) },
    { e: "acct/" + key + "/" + ids.placement(i), a: ":subject/member", v: str(String(i)) },
  ]);
  await write("seed-roots-" + a, roots);
  for (let start = 0; start < people!; start += 10) {
    const facts = [];
    for (let i = start; i < start + 10; i++)
      for (let j = 0; j < 3; j++)
        facts.push({ e: scaleOwner(a, i), a: ":task/field-" + j, v: str(fieldValue(i, 0, j, 0).value) });
    await write("seed-fields-" + a + "-" + start, facts);
  }
}
const seedCut = await write("load1/" + sha([name, "toy-loader-seal", 2000]) + "/1", [
  { e: "acct/loader/terminal", a: ":loader/done", v: str("yes") },
]);
writeFileSync(join(out, "seed.json"), JSON.stringify({ db, name, seedCut }) + "\n");
client.close();
await waitFor("aged-done", 900);

const aged = JSON.parse(readFileSync(join(out, "aged.json"), "utf8"));
assert.equal(aged.seedHead, seedCut);
const agedHead: number = aged.agedHead;
const runHead: number = aged.head;
assert.equal(agedHead, seedCut + saves!);
assert.equal(runHead, agedHead + run!);
client = new DatomicClient(url, 35_000);
const opened = await client.create(scope, "lean", true, 35_000);
assert(!opened.created && opened.db === db);
// One canonical save after the run, so a reader that starts before the run must cross it to reach a journal.
const lastSave = await write("jrn1-after-run-" + nonce, [{ e: "acct/loader/after-run", a: ":loader/done", v: str("after") }]);
assert.equal(lastSave, runHead + 1);
const head = lastSave;

type Wire = [string, number, string[]];
type Page = {
  head: number;
  transactions: Wire[];
  clockEnds: [number, number][];
  examined?: number;
  next?: number;
  stopped?: string;
  declined?: string;
};
const post = <T>(route: string, body: unknown) => client.request<T>("POST", `/v2/db/${db}/${route}`, body);
const stats = async () =>
  ((await client.request<{ journalExamined?: Record<string, { calls: number; entries: number; max: number }> }>(
    "GET",
    "/v2/admin/scan-stats",
  )).journalExamined ?? {}) as Record<string, { calls: number; entries: number; max: number }>;
const resetStats = () => client.request("POST", "/v2/admin/scan-stats/reset", {});
/** The old route's own count of index entries realized for one request (the request runs alone). */
const oldCost = async (route: string, body: Record<string, unknown>) => {
  await resetStats();
  const started = performance.now();
  const answer = await post<Page & { positions?: unknown }>(route, body);
  const ms = performance.now() - started;
  const s = await stats();
  const key = route === "transactions" ? "transactions" : "entity-transactions";
  assert.equal(s[key]?.calls, 1);
  return { answer, examined: s[key]!.entries, diagnosticMs: Math.round(ms * 10) / 10 };
};

const results: Record<string, unknown> = { seedCut, agedHead, runHead, head, saves, singles, group, run };
const sig = (p: Page) => p.transactions.map(([t, pos, rows], i) => JSON.stringify([t, pos, rows, p.clockEnds[i]]));

// 1. Feed exactness: the whole feed through the old route and through bounded pages, at several bounds and limits.
const oldFeed = async (basis?: unknown, after = 0, limit = 1000) => {
  const all: string[] = [];
  for (let cursor = after; ; ) {
    const page = await post<Page>("transactions", { after: cursor, limit, ...(basis ? { basis } : {}) });
    assert(!page.declined, "declined " + page.declined);
    all.push(...sig(page));
    if (!page.transactions.length) break;
    cursor = page.transactions.at(-1)![1];
  }
  return all;
};
const boundedFeed = async (entries: number, limit: number, basis?: unknown, after = 0) => {
  const all: string[] = [];
  let pages = 0, maxExamined = 0;
  for (let cursor = after; ; ) {
    const page = await post<Page>("transactions", {
      after: cursor, limit, bounded: true, examineEntries: entries, ...(basis ? { basis } : {}),
    });
    pages++;
    assert(!page.declined && page.stopped && page.next !== undefined, "bounded page without a cursor");
    assert(page.examined! <= entries, "examined " + page.examined + " > " + entries);
    assert(page.next! >= cursor, "cursor moved backwards");
    maxExamined = Math.max(maxExamined, page.examined!);
    all.push(...sig(page));
    if (page.stopped === "end" && page.next === cursor) break;
    if (page.stopped === "end" && !page.transactions.length) break;
    cursor = page.next!;
  }
  return { all, pages, maxExamined };
};
const reference = await oldFeed();
const positions = reference.map((s) => JSON.parse(s)[1] as number);
assert(positions.every((p, i) => i === 0 || p > positions[i - 1]!), "old feed out of order");
assert.equal(positions.at(-1), head);
assert(!positions.some((p) => p > agedHead && p <= runHead), "a run entry yielded a journal");
const feedCases: unknown[] = [];
for (const [entries, limit] of [[1, 1000], [5, 7], [64, 1], [64, 1000], [4096, 1000]] as const) {
  const b = await boundedFeed(entries, limit);
  assert.deepEqual(b.all, reference, `bounded feed differs (entries ${entries}, limit ${limit})`);
  feedCases.push({ entries, limit, journals: b.all.length, pages: b.pages, maxExamined: b.maxExamined });
}
results.feed = { journals: reference.length, firstPosition: positions[0], lastPosition: positions.at(-1), cases: feedCases };

// 2. Pinned pages (an explicit recorded cut) give the same journals, from several starting points.
const pinnedCases: unknown[] = [];
for (const cut of [seedCut, seedCut + Math.floor(saves! / 3), agedHead, agedHead + Math.floor(run! / 2), head]) {
  const basis = { recordedPosition: cut };
  for (const after of [0, Math.max(0, seedCut - 3), Math.max(0, cut - 2)]) {
    const old = await oldFeed(basis, after, 50);
    const b = await boundedFeed(3, 50, basis, after);
    assert.deepEqual(b.all, old, `pinned page differs (cut ${cut}, after ${after})`);
    pinnedCases.push({ cut, after, journals: old.length, boundedPages: b.pages });
  }
}
results.pinned = pinnedCases;

// 3. Cost: a page that starts below the run's head walks the whole run on the old route; a bounded page examines at most
//    its bound, whatever the run's length. Two run lengths from one toy: starting at the aged head and three quarters in.
const costs: unknown[] = [];
for (const after of [agedHead, agedHead + Math.floor((3 * run!) / 4)]) {
  const runAhead = runHead - after;
  const old = await oldCost("transactions", { after, limit: 100 });
  assert.equal(old.answer.transactions.length, 1, "old page should find only the save after the run");
  await resetStats();
  const first = await post<Page>("transactions", { after, limit: 100, bounded: true, examineEntries: 256 });
  const follow = await boundedFeed(256, 100, undefined, after);
  assert.deepEqual(follow.all, sig(old.answer));
  costs.push({
    after, runAhead, oldExamined: old.examined, oldDiagnosticMs: old.diagnosticMs,
    boundedFirstPage: { examined: first.examined, stopped: first.stopped, next: first.next, journals: first.transactions.length },
    boundedPagesToCross: follow.pages, boundedMaxExamined: follow.maxExamined,
  });
  assert(old.examined >= runAhead, `old route examined ${old.examined} < run ${runAhead}`);
  assert(first.examined! <= 256 && follow.maxExamined <= 256);
}
// The page the console asked for on the 1 billion copy: after = head - 20 from below the run, limit 20 (old: walks the run).
results.cost = costs;
// A pinned page whose cut is below the run: the old route walks every later entry inside Datomic's as-of filter (not
// visible to its counter, so only its diagnostic time is shown); the bounded page stops at the cut's physical commit.
{
  const basis = { recordedPosition: seedCut };
  const old = await oldCost("transactions", { after: seedCut - 3, limit: 100, basis });
  const b = await post<Page>("transactions", { after: seedCut - 3, limit: 100, basis, bounded: true });
  assert.deepEqual(sig(b), sig(old.answer));
  results.pinnedBelowRun = { oldVisibleExamined: old.examined, oldDiagnosticMs: old.diagnosticMs, boundedExamined: b.examined, stopped: b.stopped };
  assert(b.examined! <= 4, "bounded pinned page examined past its cut");
}

// 4. Entity journals: the old lean walk (every transaction) against bounded pages followed by nextBefore.
type Positions = { positions: [string, number][]; examined?: number; stopped?: string; nextBefore?: number; declined?: string };
const counts: [string, number][] = aged.saveCounts;
const heavyOwner = counts[0]![0];
const quietOwner = scaleOwner(3, people! - 1);
const entityCases: unknown[] = [];
const validAt = Date.now() + 86_400_000;
for (const entity of [heavyOwner, counts.at(-1)![0], quietOwner, "acct/loader/after-run", "acct/loader/terminal"]) {
  for (const cut of [head, agedHead, seedCut + Math.floor(saves! / 2)]) {
    const basis = { recordedPosition: cut, validAt };
    const old = await oldCost("entity-transactions", { entityId: entity, limit: 1001, basis });
    assert(!old.answer.declined, "entity journal declined");
    const oldPositions = (old.answer as unknown as Positions).positions;
    for (const [entries, limit] of [[1, 1001], [7, 3], [4096, 1001]] as const) {
      const got: [string, number][] = [];
      let before: number | undefined, pages = 0, maxExamined = 0;
      for (;;) {
        const page = await post<Positions>("entity-transactions", {
          entityId: entity, limit, basis, bounded: true, examineEntries: entries,
          ...(before === undefined ? {} : { beforePosition: before }),
        });
        pages++;
        assert(page.stopped && page.examined! <= entries);
        maxExamined = Math.max(maxExamined, page.examined!);
        got.push(...page.positions);
        if (page.stopped === "end") break;
        before = page.stopped === "limit" ? page.positions.at(-1)![1] : page.nextBefore!;
      }
      assert.deepEqual(got, oldPositions, `entity journal differs (${entity}, cut ${cut}, entries ${entries}, limit ${limit})`);
      if (entries === 4096 && limit === 1001)
        entityCases.push({ entity, cut, transactions: got.length, oldExamined: old.examined, pages, boundedMaxExamined: maxExamined });
    }
    // The newest 20 in one bounded request (default bound): the walk stops once it has 20 or on its bound, never later,
    // and what it returns is the start of the old answer (old: every transaction, always).
    const newest = await post<Positions>("entity-transactions", { entityId: entity, limit: 20, basis, bounded: true });
    assert.deepEqual(newest.positions, oldPositions.slice(0, newest.positions.length));
    assert(newest.positions.length === Math.min(20, oldPositions.length) || newest.stopped === "entries" || newest.stopped === "time");
    if (cut === head)
      entityCases.push({ entity, cut, newest20: { found: newest.positions.length, of: Math.min(20, oldPositions.length),
        examined: newest.examined, stopped: newest.stopped, nextBefore: newest.nextBefore ?? null } });
  }
}
results.entityTransactions = entityCases;

// 5. Field history: the page route against the unbounded history read filtered to the attribute, newest first.
type Row = Awaited<ReturnType<DatomicClient["rows"]>>[number];
const newestFirst = (a: Row, b: Row) =>
  b.recorded_position - a.recorded_position || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0);
const historyCases: unknown[] = [];
for (const entity of [heavyOwner, quietOwner]) {
  for (const basis of [undefined, { recordedPosition: seedCut + Math.floor(saves! / 2), validAt }]) {
    const all = await client.rows(db, { pattern: { entityId: entity }, history: true, ...(basis ? { basis } : {}) });
    for (const attribute of [":task/field-0", ":task/field-1", ":task/field-2", ":task/absent"]) {
      const expected = all.filter((r) => r.attribute === attribute).sort(newestFirst);
      for (const limit of [1, 7, 10_000]) {
        const got: Row[] = [];
        let before: { position: number; id: string } | null = null, pages = 0;
        do {
          const page = await client.historyPage(db, { entityId: entity, attribute, limit, before, ...(basis ? { basis } : {}) });
          assert(page.rows.length <= limit);
          got.push(...page.rows);
          before = page.next;
          pages++;
        } while (before);
        assert.deepEqual(got, expected, `history page differs (${entity}, ${attribute}, limit ${limit})`);
        if (limit === 7) historyCases.push({ entity, attribute, pinned: !!basis, entityRows: all.length, fieldRows: expected.length, pages });
      }
    }
  }
}
results.history = historyCases;

// 6. The SDK: the adapter's feed and entity journal with boundedJournalPages give the same answers as without it.
acceptLoaderPositionRows(true);
const plain = makeDatomicStorageAdapter(client, scope, { layout: "lean" });
const bounded = makeDatomicStorageAdapter(client, scope, { layout: "lean", boundedJournalPages: true });
const sdkFeed = async (adapter: typeof plain, after: number, limit: number) =>
  JSON.stringify(await Effect.runPromise(adapter.getTransactionsAfter!(after, limit)));
const sdkCases: unknown[] = [];
for (const [after, limit] of [[0, 1000], [seedCut - 1, 100], [agedHead - 5, 100], [agedHead, 1], [agedHead + 3, 1000], [head, 10]] as const) {
  await resetStats();
  const a = await sdkFeed(plain, after, limit);
  const oldStats = (await stats())["transactions"];
  await resetStats();
  const b = await sdkFeed(bounded, after, limit);
  const s = (await stats())["transactions-bounded"];
  assert.equal(b, a, `SDK feed differs (after ${after}, limit ${limit})`);
  sdkCases.push({ after, limit, transactions: JSON.parse(a).length, oldExamined: oldStats?.entries ?? 0, boundedRequests: s?.calls ?? 0, boundedMaxExamined: s?.max ?? 0 });
}
for (const entity of [heavyOwner, quietOwner]) {
  const basis = { recordedPosition: head, validAt };
  const a = JSON.stringify(await Effect.runPromise(plain.getTransactionPositionsByEntity!(entity, 50, basis)));
  const b = JSON.stringify(await Effect.runPromise(bounded.getTransactionPositionsByEntity!(entity, 50, basis)));
  assert.equal(b, a, `SDK entity journal differs (${entity})`);
  sdkCases.push({ entity, positions: JSON.parse(a).length });
}
results.sdk = sdkCases;

// 7. The server probe itself, on this toy (so the published command is known to run): sealed head = the aged head.
{
  const { execFileSync } = await import("node:child_process");
  const probe = execFileSync(process.execPath, ["--import", "tsx", new URL("probe.ts", import.meta.url).pathname, url, db,
    String(agedHead), quietOwner, heavyOwner, "--far", String(seedCut), "--entity-pages", "5", "--feed-pages", "3"], { encoding: "utf8" });
  writeFileSync(join(out, "probe.jsonl"), probe);
  const lines = probe.trim().split("\n").map((l) => JSON.parse(l));
  assert(lines.at(-1).probe === "summary" && lines.filter((l) => l.probe === "field-history-page").every((l) => l.rows <= 40));
  results.probe = lines;
}
writeFileSync(join(out, "result.json"), JSON.stringify(results, null, 2) + "\n");
console.log(JSON.stringify(results, null, 2));
client.close();
writeFileSync(join(out, "finished"), "ok\n");
console.log("DX-JRN1 GATE PASS");
