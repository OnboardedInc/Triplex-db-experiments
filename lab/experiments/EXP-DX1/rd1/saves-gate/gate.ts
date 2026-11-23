// [DX-RD3] Mac gate for the pinned arm with saves (rd1/pinned-ladder.ts pinnedWindow beside the card's production
// cells; v01/study-server.ts DX_RD3_PINNED_SAVES=1 on the server). It reuses the production aged toy's seed and aging
// (v01/production-aged-toy.ts, PREP1's aged-live container with AGE1's code at its load pin) on a gateway with both
// pinned options, three read permits and the early filter. Cells, each a shape S production cell with the card's
// predecessor check, sender, journal and identity checks and read-back: (1) saves alone; (2) saves with the three pin
// kinds side by side (old seed cut, near the head, the tape's own positions); (3) saves with the seed-cut and tape pins
// fed planted wrong values, which must be counted as wrong. Timings are diagnostic only.
import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { DatomicClient } from "../../../../../packages/datomic/dist/index.js";
import { fieldCount, fieldValue, taskSerial } from "../../../../bench/lib/deep-world.ts";
import { ids } from "../../../../bench/lib/world.ts";
import { command } from "../../w1/group/workload.ts";
import { sha } from "../../w1/field/schedule.ts";
import { slotAttribute, type Shape } from "../../w1/field/production.ts";
import { scaleAccount } from "../../prep1/ceiling-seed.ts";
import { task } from "../../scale1/decision/plan.ts";
import { play, resolveUncertain, type Sender } from "../../scale1/decision/writes.ts";
import { now, type Scope } from "../../scale1/decision/observer.ts";
import { checkSavedIdentity, feeder } from "../../v01/adopted.ts";
import { writerAdmission } from "../../v01/server-workload.ts";
import { productionCellMetrics, productionNeighbours, productionPredecessors, productionReadback,
  sortTape, type AgedCut, type ProductionWrite } from "../../v01/production-card.ts";
import { pinnedWindow, tapeCandidates, type PinKind } from "../pinned-ladder.ts";
import type { AdoptedSeed } from "../../v01/adopt.ts";

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
const cellTape = (label: string) => sortTape(productionNeighbours("S", 235, Array(9).fill(60), 30, label, foldFor()));
const scope: Scope = { name, db, cut: agedHead, seedCut, accounts: Array.from({ length: 10 }, (_, i) => i) };
const seed = { scope: { db, cut: seedCut }, image: { people } } as unknown as AdoptedSeed;
const subjectFunction = options.subjectFunction as string;
// A planted wrong value: the first row's value changed, as a reader that returned a stale or foreign row would.
const plant = (rows: any[]) => {
  const i = rows.findIndex((r) => /^:task\/field-\d+$/.test(r.attribute));
  return i < 0 ? rows : rows.map((r, j) => j === i ? { ...r, value_string: "planted-" + r.value_string } : r);
};
let head = agedHead;
const cells = [];
for (const label of ["S-alone", "S-pins", "S-planted"] as const) {
  const tape = cellTape("rd3-" + label) as ProductionWrite[];
  const subjects = tape.map((e) => ({ account: e.account, person: e.person }));
  const pre = await productionPredecessors(reader, db, head, seedCut, subjects, { cut, head: agedHead });
  const senders: Sender[] = scope.accounts.map(() => ({ client, scope: { ...scope, cut: head }, rows: new Map() }));
  for (const [e, rows] of pre.fields) senders[tape.find((x) => x.owner === e)!.account]!.rows.set(e, rows);
  const start = now() + 1000, seconds = 30, startHead = head;
  let terminal: number | undefined;
  const feeding = feeder(journal, db, head, start + seconds * 1000 + 120_000, () => terminal, true);
  const window = { start, seconds: label === "S-planted" ? 10 : 25, startHead, candidates: tapeCandidates(tape, start, senders) };
  const kinds: PinKind[] = label === "S-alone" ? [] : label === "S-pins" ? ["seed-cut", "near-head", "tape"] : ["seed-cut", "tape"];
  const [writes, ...steps] = await Promise.all([
    play(senders, tape, start, nonce + "-" + label, false, true, writerAdmission("rolling6")),
    ...kinds.map((kind) => pinnedWindow(url!, seed, kind, window, { seats: 8, distance: 5, plant: label === "S-planted" ? plant : undefined })),
  ]);
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
    [e, senders[tape.find((x) => x.owner === e)!.account]!.rows.get(e)!])));
  const metrics = productionCellMetrics(writes.rows, start, seconds);
  assert(saves.length === tape.length, `${label}: ${saves.length} of ${tape.length} offers durable`);
  for (const step of steps) {
    assert(step.read.count > 0 && step.errors === 0, `${label} ${step.pin}: no reads or errors ${JSON.stringify(step.failures)}`);
    if (label === "S-planted") assert(step.wrong > 0 && step.wrong >= step.read.count, `${label} ${step.pin}: a planted wrong value was not caught`);
    else assert.equal(step.wrong, 0, `${label} ${step.pin}: wrong values`);
    if (step.pin === "tape") assert(step.tape!.checkedRows > 0 && step.tape!.subjects > 0 && step.meanBatch === 1);
    else if (label === "S-pins") assert(step.meanBatch > 1, `${label} ${step.pin}: batches did not form`);
  }
  if (label === "S-pins") {
    const share = (s: any) => s.shortcut.current / Math.max(1, s.shortcut.current + s.shortcut.asOf);
    assert(steps.every((s) => s.shortcut.current + s.shortcut.asOf > 0), "the short-cut counters did not move");
    console.log("[DX-RD3-gate] short-cut share " + JSON.stringify(steps.map((s) => [s.pin, share(s)])));
  }
  cells.push({ label, offered: tape.length, acked: saves.length, predecessors: pre.counts, readback,
    saves: { stored: metrics.stored, commitLatency: metrics.commitLatency }, steps });
  head = terminal;
}
const result = { gate: "rd3-pinned-saves", seedCut, agedHead, agingSaves: aged.saves, finalHead: head, timings: "diagnostic",
  plantedCaught: true, cells };
writeFileSync(join(out!, "result.json"), JSON.stringify(result, null, 2) + "\n");
console.log("RD3_SAVES_GATE " + JSON.stringify(result));
client.close(); reader.close(); journal.close();
writeFileSync(join(out!, "finished"), "ok\n");
