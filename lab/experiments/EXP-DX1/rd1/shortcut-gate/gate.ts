// [DX-RD2] Mac live gate for TX2_PINNED_SHORTCUT: seed through this branch's gateway, let AGE1's own code age it, then
// save through each writer in turn (per-subject ordered, a recovered resend, a valid-time correction, the general
// writer, an import frame, grouped saves, append retirement, the covering owner head and the fold that follows it, and
// a removal on request), and finally compare a reader with the short-cut off against one with it on: every pinned
// route, every logical position, both time axes, every subject. Times are not measured here.
// Rejected: comparing against a model of the rows (the reference is the gateway's own as-of answer).
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { DatomicClient, orderedSaveIdentity } from "../../../../../packages/datomic/dist/index.js";
import { fieldValue } from "../../../../bench/lib/deep-world.ts";
import { ids, SEED_VALID_FROM } from "../../../../bench/lib/world.ts";
import { command } from "../../w1/group/workload.ts";
import { sha } from "../../w1/field/schedule.ts";
import { scaleAccount, scaleOwner } from "../../prep1/ceiling-seed.ts";

const [out, url, readerOff, readerOn, readerLookup] = process.argv.slice(2);
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
// The PREP1 aged-live seed: account membership on each root, three fields on each subject's first task.
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

const tasks = Array.from({ length: 10 }, (_, a) => Array.from({ length: people }, (_, i) => scaleOwner(a, i))).flat();
const roots = Array.from({ length: 10 }, (_, a) => [...Array.from({ length: people }, (_, i) => i), 257, 99_999]
  .map((i) => "acct/" + scaleAccount(a) + "/" + ids.placement(i))).flat();
const everyone = [...tasks, ...roots, "acct/loader/terminal"];
const editedByAge = new Set<string>(aged.owners.map((o: { account: number; person: number }) => scaleOwner(o.account, o.person)));
const untouched = tasks.filter((t) => !editedByAge.has(t));
const agedOwner = [...editedByAge];

let phase = 0;
const writes: { phase: string; label: string; owner: string; position: number }[] = [];
async function enter(label: string, env: string[]) {
  writeFileSync(join(out!, `phase-${phase}.env`), env.join("\n") + "\n");
  await waitFor(`phase-${phase}.ready`, 300);
  phase++;
  client = new DatomicClient(url!, 35_000);
  const opened = await client.create(scope, "lean", true, 35_000);
  assert(!opened.created && opened.db === db);
  return label;
}
const headOf = async () => Number((await client.request<any>("GET", "/v1/db/" + db + "/write-options")).position);
const currentRows = async (entities: string[]) =>
  (await client.rows(db, { entityIds: entities, basis: { recordedPosition: await headOf(), validAt: SEED_VALID_FROM + 1 } })) as any[];
// One save replacing (or adding) one field of one subject through whichever writer the running gateway uses.
async function save(label: string, owner: string, attribute: string, value: string, o: { ordered?: boolean; publish?: boolean; writeClass?: string; facts?: { e: string; a: string; v: ReturnType<typeof str> }[] } = {}) {
  const facts = o.facts ?? [{ e: owner, a: attribute, v: str(value) }];
  const owners = [...new Set(facts.map((f) => f.e))];
  const before = await currentRows(owners);
  const old = before.filter((r) => facts.some((f) => f.e === r.entity_id && f.a === r.attribute));
  const id = `rd2-${label}-${nonce}-${owner.replaceAll("/", "_")}-${value}`;
  const identity = o.ordered ? orderedSaveIdentity() : undefined;
  const input: any = command(id, facts, old, o.publish ?? true, false, identity);
  if (o.ordered) {
    input.sourceK = Math.max(await headOf(), ...before.map((r) => r.recorded_position));
    input.groupAccount = owner.split("/")[1];
    input.writeClass = "live";
  } else if (o.writeClass) input.writeClass = o.writeClass;
  const ack: any = await client.transact(db, input);
  const position = Number(ack.position.v);
  for (const e of owners) writes.push({ phase: label, label: id, owner: e, position });
  return { input, ack, position };
}
const ordered = ["TX2_SUBJECT_SAVE=1", "TX2_SUBJECT_NUMERIC_OWNER=1", "TX2_SUBJECT_ORDERED_IDS=1", "TX2_PREDECESSOR_LOOKUP=1",
  "TX2_INT1_WRITE_READBACK=1", "TX2_GROUP_STAGE_CLOCK=1", "TX2_GROUP_FAST_REPLY=1"];

// 1. Per-subject ordered writer, a recovered resend, a valid-time correction.
await enter("ordered", ordered);
const first = await save("ordered", agedOwner[0]!, ":task/field-0", "rd2-ordered-a", { ordered: true });
await save("ordered", untouched[0]!, ":task/field-0", "rd2-ordered-b", { ordered: true });
// Recovery of a save whose reply was lost: the resend is refused as already committed and nothing is written.
const headBeforeResend = await headOf();
await assert.rejects(client.transact(db, first.input), (e: any) => e.code === "OperationDuplicate");
assert.equal(await headOf(), headBeforeResend, "a resend must not write again");
await save("valid-time", untouched[1]!, ":task/field-1", "rd2-valid-from-seed", { ordered: true, publish: false });
// 2. General writer and an import frame across two subjects.
await enter("general", ["TX2_SUBJECT_SAVE=0", "TX2_PREDECESSOR_LOOKUP=1"]);
await save("general", agedOwner[1]!, ":task/field-1", "rd2-general-a");
await save("import", untouched[2]!, "", "", { writeClass: "import", facts: [
  { e: untouched[2]!, a: ":task/field-2", v: str("rd2-import-a") }, { e: untouched[3]!, a: ":task/field-2", v: str("rd2-import-b") }] });
// 3. Grouped saves: concurrent saves on distinct people.
await enter("grouped", ["TX2_GROUP_COMMIT=1", "TX2_GROUP_STAGE_CLOCK=1", "TX2_GROUP_FAST_REPLY=1", "TX2_GROUP_REUSE_PREPARED=1",
  "TX2_LIVE_PRIORITY=1", "TX2_GROUP_MAX_MEMBERS=32", "TX2_SMALL_ROWS=1", "TX2_SAVE_LEDGER=1"]);
await Promise.all([agedOwner[2]!, untouched[5]!, untouched[6]!, untouched[7]!].map((o, i) => save("grouped", o, ":task/field-0", "rd2-grouped-" + i)));
// 4. Append retirement.
await enter("append-retirement", [...ordered, "TX2_SUBJECT_APPEND_RETIREMENT=1"]);
await save("append-retirement", agedOwner[3]!, ":task/field-0", "rd2-append-a", { ordered: true });
await save("append-retirement", untouched[8]!, ":task/field-1", "rd2-append-b", { ordered: true });
// 5. Covering owner head, then add-only saves on covered subjects, each folded first.
await enter("owner-head", [...ordered, "TX2_SUBJECT_OWNER_HEAD=1"]);
await save("owner-head", agedOwner[4]!, ":task/field-0", "rd2-cover-a", { ordered: true });
await save("owner-head", untouched[9]!, ":task/field-0", "rd2-cover-b", { ordered: true });
await save("owner-head", untouched[9]!, ":task/field-1", "rd2-cover-c", { ordered: true });
// An add-only save on a covered subject goes to the reference writer, which folds the subject first (storage.clj
// fold-touched!); a database with roots refuses writers started without the option (OwnerLayoutRequired).
await save("fold-then-add", untouched[9]!, ":task/field-3", "rd2-after-fold", { ordered: true });
await save("fold-then-add", agedOwner[4]!, ":task/field-3", "rd2-after-fold-aged", { ordered: true });
// 6. Removal on request. AGE1's code at its load pin refuses to save into a scope with declared protection
// (TRIPLEX_ERASURE_FRONTIER), and protection must be declared before a scope's first save, so the removal runs in a
// second scope of the same database server, seeded and edited through this gateway: seed, pin, an ordered save, a
// protected value, its removal on request, and one more save.
await save("ordered-tail", untouched[10]!, ":task/field-0", "rd2-tail", { ordered: true });
const head = await headOf();
const scope2 = JSON.stringify(["triplex-scope-v1", "test", "test", "rd2-removal-" + nonce, 0]);
const init2 = await client.create(scope2, "lean", true, 35_000);
assert(init2.created);
const db2 = init2.db;
await client.declareProtection(db2, [":task/field-9"], false);
const subjects2 = Array.from({ length: 12 }, (_, i) => scaleOwner(0, i));
const head2Of = async () => Number((await client.request<any>("GET", "/v1/db/" + db2 + "/write-options")).position);
const save2 = async (label: string, owner: string, attribute: string, value: string) => {
  const before = (await client.rows(db2, { entityIds: [owner], basis: { recordedPosition: await head2Of(), validAt: SEED_VALID_FROM + 1 } })) as any[];
  const old = before.filter((r) => r.attribute === attribute);
  const identity = orderedSaveIdentity();
  const input: any = command(`rd2-${label}-${nonce}-${owner}`, [{ e: owner, a: attribute, v: str(value) }], old, true, false, identity);
  input.sourceK = Math.max(await head2Of(), ...before.map((r) => r.recorded_position));
  input.groupAccount = owner.split("/")[1];
  input.writeClass = "live";
  return Number(((await client.transact(db2, input)) as any).position.v);
};
for (const [i, o] of subjects2.entries()) for (const j of [0, 1]) await save2("seed2-" + j, o, ":task/field-" + j, fieldValue(i, 0, j, 0).value);
await save2("protected", subjects2[3]!, ":task/field-9", "rd2-protected-value");
await save2("protected", subjects2[4]!, ":task/field-9", "rd2-protected-other");
const pin2 = await head2Of();
await save2("after-pin", subjects2[5]!, ":task/field-0", "rd2-after-pin");
const erased: any = await client.erase(db2, "rd2-erase-" + nonce, [{ entityId: subjects2[3]!, attribute: ":task/field-9" }]);
await save2("after-erase", subjects2[6]!, ":task/field-1", "rd2-after-erase");
const head2 = await head2Of();
client.close();
writeFileSync(join(out!, "compare"), "go\n");
await waitFor("compare-ready", 300);

// Comparison: both options off (the reference) against each option set, on every pinned route.
const off = new DatomicClient(readerOff!, 35_000), on = new DatomicClient(readerOn!, 35_000), lookup = new DatomicClient(readerLookup!, 35_000);
const readers = { on, lookup } as const;
for (const c of [off, on, lookup]) for (const sc of [scope, scope2]) await c.create(sc, "lean", true, 35_000);
const opts = async (c: DatomicClient) => { const o = (await c.request<any>("GET", "/v1/db/" + db + "/write-options")).options; return [o.pinnedShortcut, o.pinnedCutLookup]; };
assert.deepEqual([await opts(off), await opts(on), await opts(lookup)], [[false, false], [true, true], [false, true]]);
const canon = (x: unknown) => JSON.stringify(x, (_k, v) => (Array.isArray(v) && v.length && typeof v[0] === "object" && v[0] && "id" in v[0]
  ? [...v].sort((p: any, q: any) => (p.id < q.id ? -1 : p.id > q.id ? 1 : 0)) : v));
const differences: unknown[] = [];
let compared = 0, rows = 0;
const check = async (route: string, call: (c: DatomicClient) => Promise<unknown>, where: unknown) => {
  const reference = canon(await call(off));
  for (const [name, c] of Object.entries(readers)) {
    compared++;
    if (canon(await call(c)) !== reference) differences.push({ route, reader: name, where });
  }
};
const chunks = (xs: string[], n: number) => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));
const validTimes = [1, SEED_VALID_FROM + 1];
async function compareScope(label: string, sc: string, d: string, subjects: string[], tasksOf: string[], top: number) {
  const read = (basis: object, entities: string[]) => (c: DatomicClient) =>
    c.request<any>("POST", "/v1/db/" + d + "/read", { entityIds: entities, basis }).then((r) => { rows += r.rows.length; return r.rows; });
  // Record time by logical position: every position from 1 to the head, every subject, two valid times.
  for (let p = 1; p <= top; p++)
    for (const validAt of validTimes)
      for (const part of chunks(subjects, 400)) await check(label + "/read", read({ recordedPosition: p, validAt }, part), { p, validAt });
  // Record time by clock: every distinct record clock of any subject's row.
  const history: any[] = await off.request<any>("POST", "/v1/db/" + d + "/read", { entityIds: subjects, history: true }).then((r) => r.rows);
  const clocks = [...new Set(history.map((r) => Number(r.recorded_at?.v ?? r.recorded_at)))].filter(Number.isFinite).sort((a, b) => a - b);
  for (const at of clocks)
    for (const validAt of validTimes)
      for (const part of chunks(subjects, 400)) await check(label + "/read-at", read({ recordedAt: at, validAt }, part), { at, validAt });
  // Historical worlds (reach), batches of 16, at every fifth position.
  const reachPositions = Array.from({ length: Math.ceil(top / 5) }, (_, i) => i * 5 + 1).filter((p) => p <= top);
  for (const p of reachPositions)
    for (const part of chunks(tasksOf, 16))
      await check(label + "/reach", (c) => c.readHistoricalWorlds(sc, part, { recordedPosition: p, validAt: SEED_VALID_FROM + 1 } as any).then((w: any) => w?.worlds ?? null), { p });
  return { positions: top, clocks: clocks.length, reachPositions: reachPositions.length };
}
const aged1 = await compareScope("aged", scope, db, everyone, tasks, head);
const removal = await compareScope("removal", scope2, db2, subjects2, subjects2, head2);
const stats = async (c: DatomicClient) => (await c.request<any>("GET", "/v2/admin/scan-stats")).pinnedShortcut;
const result: Record<string, any> = { gate: "pinned-shortcut", seedCut, agedSaves: aged.saves, head, writes, aged: aged1,
  removal: { ...removal, pin: pin2, head: head2, erased: !!erased }, compared, rows,
  differences: differences.slice(0, 20), differenceCount: differences.length,
  off: await stats(off), on: await stats(on), lookup: await stats(lookup) };
// The launcher's ladder module, in its toy size, against the off and on readers: it must refuse a mismatched option,
// check the seed cut's values on every read and report the short-cut's counters.
const { pinnedLadder } = await import("../pinned-ladder.ts");
const ladders: Record<string, unknown> = {};
for (const [label, reader] of [["off", readerOff!], ["on", readerOn!]] as const) {
  const dir = join(out!, "ladder-" + label);
  mkdirSync(dir);
  const seed: any = { scope: { db, cut: seedCut }, image: { people } };
  ladders[label] = await pinnedLadder(dir, reader, seed, head, label === "on", true);
}
await assert.rejects(pinnedLadder(join(out!, "ladder-refused"), readerOff!, { scope: { db, cut: seedCut }, image: { people } } as any, head, true, true));
Object.assign(result, { ladders });
writeFileSync(join(out!, "result.json"), JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify({ ...result, writes: writes.length, ladders: undefined }));
off.close(); on.close(); lookup.close();
writeFileSync(join(out!, "finished"), "ok\n");
assert.equal(differences.length, 0, "an option changed a pinned answer");
assert(result.on.currentAnswers > 0 && result.on.asOfAnswers > 0, "the gate must exercise both answers");
assert.equal(result.off.currentAnswers, 0);
