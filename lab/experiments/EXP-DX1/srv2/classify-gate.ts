// [DX-SRV2] Mac gate for the card's per-read classification (v01/card-reader.ts classifyReads, rd1/pinned-ladder.ts
// pinnedWindow with sampledReads, v01/pinned-fields.ts exchange tags), on the shortcut gate's container (seed, AGE1's
// aging, then each phase restarts the gateway on 8080 with the tuned reader's switches and the read profile written to
// /out/reader-trace). Forces both cases: a cold subject right after a restart (cache empty: must be "not in memory")
// and the same read repeated (must be "in memory"); then the card's random-line read at the seed cut with every
// exchange sampled, classified from the trace; then the paired proof that sampling changes neither a read nor the
// store: the same reads with and without the profile header give identical rows, and the head position and a digest
// of every subject's full history are the same before and after the sampled reads. Counts are results; times diagnostic.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { DatomicClient } from "../../../../packages/datomic/dist/index.js";
import { fieldValue } from "../../../bench/lib/deep-world.ts";
import { ids, SEED_VALID_FROM } from "../../../bench/lib/world.ts";
import { command } from "../w1/group/workload.ts";
import { sha } from "../w1/field/schedule.ts";
import { scaleAccount, scaleOwner } from "../prep1/ceiling-seed.ts";
import { classifyReads, traceExchanges } from "../v01/card-reader.ts";
import { exchangeTags, profiledExchange } from "../v01/pinned-fields.ts";
import { pinnedWindow } from "../rd1/pinned-ladder.ts";

const [out, url] = process.argv.slice(2);
const waitFor = async (file: string, seconds: number) => {
  for (let i = 0; i < seconds * 4 && !existsSync(join(out!, file)); i++) await sleep(250);
  assert(existsSync(join(out!, file)), "timed out waiting for " + file);
};
await waitFor("ready", 300);
const nonce = crypto.randomUUID(), name = "dx-scale-decision-" + nonce + "-0";
const scope = JSON.stringify(["triplex-scope-v1", "test", "test", name, 0]);
const people = 50;
let client = new DatomicClient(url!, 35_000);
const init = await client.create(scope, "lean", true, 35_000);
assert(init.created);
const db = init.db;
const str = (value: string) => ({ type: "string" as const, value });
const write = async (id: string, facts: { e: string; a: string; v: ReturnType<typeof str> }[]) =>
  Number(((await client.transact(db, command(id, facts) as any)) as any).position.v);
for (let a = 0; a < 10; a++) {
  const key = scaleAccount(a);
  await write("seed-roots-" + a, [...Array.from({ length: people }, (_, i) => i), 257, 99_999].flatMap((i) => [
    { e: "acct/" + key + "/" + ids.placement(i), a: ":subject/account", v: str(key) },
    { e: "acct/" + key + "/" + ids.placement(i), a: ":subject/member", v: str(String(i)) }]));
  for (let start = 0; start < people; start += 10) {
    const facts = [];
    for (let i = start; i < start + 10; i++) for (let j = 0; j < 3; j++) facts.push({ e: scaleOwner(a, i), a: ":task/field-" + j, v: str(fieldValue(i, 0, j, 0).value) });
    await write("seed-fields-" + a + "-" + start, facts);
  }
}
const seedCut = await write("load1/" + sha([name, "toy-loader-seal", 2000]) + "/1", [{ e: "acct/loader/terminal", a: ":loader/done", v: str("yes") }]);
writeFileSync(join(out!, "seed.json"), JSON.stringify({ db, name, seedCut }) + "\n");
client.close();
await waitFor("aged.json", 900);
const tasks = Array.from({ length: 10 }, (_, a) => Array.from({ length: people }, (_, i) => ({ a, i, e: scaleOwner(a, i) }))).flat();
const readerEnv = ["TX2_PINNED_SHORTCUT=1", "TX2_PINNED_CUT_LOOKUP=1", "TX2_READ_FILTER_EARLY=1", "TX2_READ_PROFILE=1",
  "TRIPLEX_TRACE_DIR=/out/reader-trace", "TRIPLEX_TRACE_PROCESS=gw-r"];
const trace = join(out!, "reader-trace", "gw-r.jsonl");
let phase = 0;
async function restart() {  // a new gateway process: its object cache is empty
  client?.close();
  writeFileSync(join(out!, `phase-${phase}.env`), readerEnv.join("\n") + "\n");
  await waitFor(`phase-${phase}.ready`, 300);
  phase++;
  client = new DatomicClient(url!, 35_000);
  assert(!(await client.create(scope, "lean", true, 35_000)).created);
}
const fieldAt = (e: string, position: number) => () => client.rows(db, { entityIds: [e], pattern: { attribute: ":task/field-0" },
  basis: { recordedPosition: position, validAt: SEED_VALID_FROM } }) as Promise<any[]>;
const flushed = async () => { await sleep(2500); assert(existsSync(trace), "the reader wrote no trace"); };

// 1. Forced cases, three times: restart, one read (cold), the same read again (warm), classified from the trace.
const forced: { cold: number; warm: number; coldStorage: number; warmStorage: number }[] = [];
for (let k = 0; k < 3; k++) {
  await restart();
  const t = tasks[(7919 * (k + 1)) % tasks.length]!, reads: [string, number][] = [];
  for (const which of ["cold", "warm"]) {
    const started = performance.now(), rows = await profiledExchange(client, fieldAt(t.e, seedCut));
    assert.equal(rows[0]?.value_string, fieldValue(t.i, 0, 0, 0).value);
    reads.push([exchangeTags.get(rows)!, performance.now() - started]);
  }
  await flushed();
  const { found } = traceExchanges(trace, 0, new Set(reads.map(([id]) => id)));
  const cold = classifyReads([reads[0]!], found, 1, 1), warm = classifyReads([reads[1]!], found, 1, 1);
  forced.push({ cold: cold.notInMemory.reads, warm: warm.inMemory.reads, coldStorage: found.get(reads[0]![0])!.storage, warmStorage: found.get(reads[1]![0])!.storage });
}

// 2. The card's random-line read (pinnedWindow, random subjects at the seed cut, batches of 8, every exchange sampled),
// on a cold reader, then the same window again on the warm reader.
await restart();
const historyDigest = async () => createHash("sha256").update(JSON.stringify(await client.rows(db, { entityIds: tasks.map((t) => t.e), history: true }))).digest("hex");
const headOf = async () => Number((await client.request<any>("GET", "/v1/db/" + db + "/write-options")).position);
const before = { head: await headOf(), history: await historyDigest() };
const seed: any = { scope: { db, cut: seedCut }, image: { people } };
const windows = [];
for (const label of ["first", "repeat"]) {
  const offset = existsSync(trace) ? readFileSync(trace).length : 0, sampledReads: [string, number][] = [];
  const step = await pinnedWindow(url!, seed, "random-seed-cut", { start: Date.now() + 200, seconds: 8, startHead: seedCut, candidates: [] },
    { seats: 4, batch: 8, profileEvery: 1, sampledReads });
  await flushed();
  const { found } = traceExchanges(trace, offset, new Set(sampledReads.map(([id]) => id)));
  const c = classifyReads(sampledReads, found, step.read.count, 1);
  windows.push({ label, reads: step.read.count, wrong: step.wrong, errors: step.errors, exchanges: step.exchanges, sampled: c.sampledReads,
    unmatched: c.unmatched, inMemory: { reads: c.inMemory.reads, p99Ms: c.inMemory.read.p99Ms, storagePerSubject: c.inMemory.storageReadsPerSubject },
    notInMemory: { reads: c.notInMemory.reads, p99Ms: c.notInMemory.read.p99Ms, storagePerSubject: c.notInMemory.storageReadsPerSubject } });
}
// 3. Paired: every task subject at three pins, with and without the profile header: identical rows.
const canon = (x: any[]) => JSON.stringify([...x].sort((p, q) => (p.id < q.id ? -1 : p.id > q.id ? 1 : 0)));
let paired = 0, pairedDifferences = 0;
for (const p of [seedCut, Math.floor((seedCut + before.head) / 2), before.head])
  for (const t of tasks) {
    const read = () => client.rows(db, { entityIds: [t.e], basis: { recordedPosition: p, validAt: SEED_VALID_FROM + 1 } }) as Promise<any[]>;
    const [plain, profiled] = [await read(), await profiledExchange(client, read)];
    paired++; if (canon(plain) !== canon(profiled)) pairedDifferences++;
  }
const after = { head: await headOf(), history: await historyDigest() };
client.close();
const result = { gate: "srv2-classify", seedCut, forced, windows, paired, pairedDifferences, store: { before, after, unchanged: before.head === after.head && before.history === after.history } };
writeFileSync(join(out!, "result.json"), JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify(result));
writeFileSync(join(out!, "compare"), "owner-head=0\n");
await waitFor("compare-ready", 300);
writeFileSync(join(out!, "finished"), "ok\n");
assert(forced.every((f) => f.cold === 1 && f.coldStorage > 0 && f.warm === 1 && f.warmStorage === 0), "a forced case was classed wrongly");
assert(windows.every((w) => w.wrong === 0 && w.errors === 0 && w.unmatched === 0 && w.sampled === w.reads), "the sampled window lost reads or read wrong values");
assert(windows[0]!.notInMemory.reads > 0, "the cold window found nothing outside memory");
assert(pairedDifferences === 0 && result.store.unchanged, "sampling changed a read or the store");
