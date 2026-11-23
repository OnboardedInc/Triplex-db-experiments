// [DX-INT1] Mac toy for the card's production-shaped cells on a loader-aged database. PREP1's aged-live container
// (PostgreSQL, a transactor and this branch's write gateway; AGE1's own code at its load pin ages the toy) holds the
// database; this driver seeds every task-0 field of 50 subjects per account, then runs the card's own production cell
// code: the predecessor check over every field the tape writes (AGE1's rows checked against its replay tape, a tampered
// row refused), the card's sender (rolling 6, ordered identity, general identity above 256 assertions), the journal and
// identity checks, the read-back of every written field, and the card's metrics. Shape R, then shape S over the rows R
// left, then two wide commits on the general identity. Timings are diagnostic only.
import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { DatomicClient } from "../../../../packages/datomic/dist/index.js";
import { fieldCount, fieldValue, taskSerial } from "../../../bench/lib/deep-world.ts";
import { ids } from "../../../bench/lib/world.ts";
import { command } from "../w1/group/workload.ts";
import { sha } from "../w1/field/schedule.ts";
import { slotAttribute, type Shape } from "../w1/field/production.ts";
import { scaleAccount } from "../prep1/ceiling-seed.ts";
import { task } from "../scale1/decision/plan.ts";
import { play, resolveUncertain, type Sender } from "../scale1/decision/writes.ts";
import { now, type Scope } from "../scale1/decision/observer.ts";
import { checkSavedIdentity, feeder } from "./adopted.ts";
import { writerAdmission } from "./server-workload.ts";
import { cardTapeReport, isProduction, productionCellMetrics, productionNeighbours, productionPredecessors, productionReadback,
  sortTape, type AgedCut, type ProductionWrite } from "./production-card.ts";

const [out, url] = process.argv.slice(2);
const waitFor = async (file: string, seconds: number) => {
  for (let i = 0; i < seconds * 4 && !existsSync(join(out!, file)); i++) await sleep(250);
  assert(existsSync(join(out!, file)), "timed out waiting for " + file);
};
await waitFor("ready", 300);
const nonce = crypto.randomUUID();
const name = "dx-scale-decision-" + nonce + "-0";
const scopeKey = JSON.stringify(["triplex-scope-v1", "test", "test", name, 0]);
const people = 50;
let client = new DatomicClient(url!, 35_000);
const init = await client.create(scopeKey, "lean", true, 35_000);
assert(init.created && init.strictRecordClocks);
const db = init.db;
const str = (value: string) => ({ type: "string" as const, value });
const write = async (id: string, facts: { e: string; a: string; v: ReturnType<typeof str> }[]) => {
  const ack = await client.transact(db, command(id, facts));
  assert.equal(ack.operationId, id);
  return Number(ack.position.v);
};
const owner = (a: number, i: number) => "acct/" + scaleAccount(a) + "/" + ids.placement(i);
for (let a = 0; a < 10; a++) {
  const key = scaleAccount(a);
  await write("seed-roots-" + a, [...Array.from({ length: people }, (_, i) => i), 257, 99_999].flatMap((i) => [
    { e: owner(a, i), a: ":subject/account", v: str(key) }, { e: owner(a, i), a: ":subject/member", v: str(String(i)) }]));
  for (let start = 0; start < people; start += 10) {
    const facts = [];
    for (let i = start; i < start + 10; i++)
      for (let f = 0; f < fieldCount(taskSerial(i, 0)); f++)
        facts.push({ e: task(a, i), a: slotAttribute(f), v: str(fieldValue(i, 0, f, 0).value) });
    await write("seed-fields-" + a + "-" + start, facts);
  }
}
const seedCut = await write("load1/" + sha([name, "toy-loader-seal", 2000]) + "/1", [{ e: "acct/loader/terminal", a: ":loader/done", v: str("yes") }]);
writeFileSync(join(out!, "seed.json"), JSON.stringify({ db, name, seedCut }) + "\n");
client.close();

await waitFor("aged-done", 900);
const aged = JSON.parse(readFileSync(join(out!, "aged.json"), "utf8"));
assert.equal(aged.seedHead, seedCut);
const agedHead = seedCut + aged.saves;
client = new DatomicClient(url!, 35_000);
const reader = new DatomicClient(url!, 35_000), journal = new DatomicClient(url!, 35_000);
const opened = await client.create(scopeKey, "lean", true, 35_000);
assert(!opened.created && opened.db === db);
const options = await client.request<any>("GET", "/v1/db/" + db + "/write-options");
assert.equal(options.position, agedHead);
assert(options.subjectSave && options.subjectOrderedIds && options.subjectNumericOwner);
const cut: AgedCut = { bundleSha256: "0".repeat(64), seedCut, physicalT: 1, records: 1, nativeId: "toy", active: aged.active,
  people, tapeSaves: aged.saves, lastOperation: aged.lastOperation, lastTransaction: aged.lastTransaction, lastRecordedAt: aged.lastRecordedAt };

// The production tape's subjects folded onto the toy's 50 per account, AGE1's edited subjects first (its active sample at
// floor(j × 48 / 5) and its probe, 48), so both shapes write over AGE1's rows.
const edited = [0, 9, 19, 28, 38, 48];
const order = [...edited, ...Array.from({ length: people }, (_, i) => i).filter((i) => !edited.includes(i))];
const foldFor = () => {
  const folded = new Map<string, number>(), count = new Map<number, number>();
  return (account: number, person: number) => {
    const key = account + "/" + person;
    if (!folded.has(key)) { const n = count.get(account) ?? 0; folded.set(key, order[n % people]!); count.set(account, n + 1); }
    return folded.get(key)!;
  };
};
const cellTape = (shape: Shape, label: string) => sortTape(productionNeighbours(shape, 235, Array(9).fill(60), 30, label, foldFor()));
// Two saves over 256 assertions for one subject: 130 facts replacing every seeded field and creating the rest, twice.
const wideTape = (label: string): ProductionWrite[] => [0, 1].map((n) => ({ account: 3, ordinal: n, subject: 0, person: 0,
  ms: 500 + n * 2000, width: 130, version: `${label}/3/${n}`, owner: task(3, 0),
  slots: Array.from({ length: 130 }, (_, i) => i), saveKey: "3/" + (100_000 + n), rows: 96, gap: n ? 2 : 60 }));

const scope: Scope = { name, db, cut: agedHead, seedCut, accounts: Array.from({ length: 10 }, (_, i) => i) };
const subjectFunction = options.subjectFunction as string;
let head = agedHead;
const cells = [];
for (const [label, tape, seconds] of [["R-aged-toy", cellTape("R", "R-aged-toy"), 30], ["S-aged-toy", cellTape("S", "S-aged-toy"), 30],
  ["S-wide-aged-toy", wideTape("S-wide-aged-toy"), 5]] as const) {
  const subjects = (tape as ProductionWrite[]).map((e) => ({ account: e.account, person: e.person }));
  const pre = await productionPredecessors(reader, db, head, seedCut, subjects, { cut, head: agedHead });
  if (label === "R-aged-toy") {
    assert(pre.counts.agedRows > 0, "no AGE1 row among the predecessors");
    const tampered = new Proxy(reader, { get: (t, k) => {
      const f = (t as any)[k];
      if (k === "rows") return async (...args: any[]) => (await f.apply(t, args)).map((r: any) =>
        r.recorded_position > seedCut && r.recorded_position <= agedHead ? { ...r, value_string: "0" + r.value_string.slice(1) } : r);
      return typeof f === "function" ? f.bind(t) : f;
    } });
    await assert.rejects(productionPredecessors(tampered as DatomicClient, db, head, seedCut, subjects, { cut, head: agedHead }));
    // A row beyond the seeded fields would make a first write a replacement: refused too.
    const extra = new Proxy(reader, { get: (t, k) => {
      const f = (t as any)[k];
      if (k === "rows") return async (...args: any[]) => { const rows = await f.apply(t, args);
        return rows.length ? [...rows, { ...rows[0], attribute: ":task/field-95", id: "extra" }] : rows; };
      return typeof f === "function" ? f.bind(t) : f;
    } });
    await assert.rejects(productionPredecessors(extra as DatomicClient, db, head, seedCut, subjects, { cut, head: agedHead }));
  }
  const senders: Sender[] = scope.accounts.map(() => ({ client, scope: { ...scope, cut: head }, rows: new Map() }));
  for (const [e, rows] of pre.fields) senders[Number((tape as ProductionWrite[]).find((x) => x.owner === e)!.account)]!.rows.set(e, rows);
  const start = now() + 1000;
  let terminal: number | undefined;
  const feeding = feeder(journal, db, head, start + seconds * 1000 + 120_000, () => terminal, true);
  const writes = await play(senders, tape as ProductionWrite[], start, nonce + "-" + label, false, true, writerAdmission("rolling6"));
  await resolveUncertain(senders, writes.unresolved);
  const at = await client.begin(db);
  terminal = at.position;
  await client.release(db, at.handle);
  const feed = await feeding;
  const saves = writes.rows.filter((r) => r.receipt);
  assert.equal(feed.length, saves.length);
  const byPosition = new Map(feed.map((r) => [r.position, r]));
  for (const row of saves) checkSavedIdentity(row, byPosition.get(row.receipt!.p)!, "per-person-ordered", subjectFunction);
  const readback = await productionReadback(reader, db, terminal, new Map([...pre.fields.keys()].map((e) =>
    [e, senders[Number((tape as ProductionWrite[]).find((x) => x.owner === e)!.account)]!.rows.get(e)!])));
  const metrics = productionCellMetrics(writes.rows, start, seconds);
  const report = label.startsWith("S-wide") ? undefined : cardTapeReport(tape as ProductionWrite[], seconds);
  cells.push({ label, offered: tape.length, acked: saves.length, statuses: Object.fromEntries([...new Set(writes.rows.map((r) => r.status))]
    .map((s) => [s, writes.rows.filter((r) => r.status === s).length])), predecessors: pre.counts, readback, metrics,
    report: report && { shape: report.shape, commits: report.neighbours.commits, rows: report.neighbours.rows, factsPerCommit: report.neighbours.factsPerCommit } });
  assert(saves.length === tape.length, `${label}: ${saves.length} of ${tape.length} offers durable`);
  if (label.startsWith("S-wide")) assert(writes.rows.every((r) => r.generalIdentity && !r.stage?.subjectSave));
  head = terminal;
}
const result = { gate: "card-production-aged-toy", seedCut, agedHead, agingSaves: aged.saves, finalHead: head, tamperedAgedRowRefused: true,
  extraFieldRefused: true, timings: "diagnostic", cells };
writeFileSync(join(out!, "result.json"), JSON.stringify(result, null, 2) + "\n");
console.log("CARD_PRODUCTION_AGED_TOY " + JSON.stringify(result));
for (const c of cells) assert(c.metrics.writerPath.subject.commits > 0 || c.label.startsWith("S-wide"), `${c.label}: no commit took the per-subject writer`);
client.close(); reader.close(); journal.close();
writeFileSync(join(out!, "finished"), "ok\n");
