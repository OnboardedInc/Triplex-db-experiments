// [DX-INT1] Mac toy gate: the owner head (TX2_SUBJECT_OWNER_HEAD=1) on people AGE1's own loader code edited.
// Seed through this branch's gateway, age with AGE1 at its load pin (container.sh), then run the same saves on a copy
// with today's writer and on the original with the owner head, and compare every product read route at every position.
// Rejected: a synthetic aged person (it cannot show what AGE1 left in the database) or one arm without a legacy twin.
import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { setTimeout as sleep } from "node:timers/promises";
import { DatomicClient, orderedSaveIdentity } from "../../../../../packages/datomic/dist/index.js";
import { fieldValue } from "../../../../bench/lib/deep-world.ts";
import { ids, SEED_VALID_FROM } from "../../../../bench/lib/world.ts";
import { command } from "../group/workload.ts";
import { sha } from "../field/schedule.ts";
import { scaleAccount, scaleOwner } from "../../prep1/ceiling-seed.ts";

const [out, url] = process.argv.slice(2);
const waitFor = async (file, seconds) => {
  for (let i = 0; i < seconds * 4 && !existsSync(join(out, file)); i++) await sleep(250);
  assert(existsSync(join(out, file)), "timed out waiting for " + file);
};
const signal = (file) => writeFileSync(join(out, file), "ok\n");
const str = (value) => ({ type: "string", value });
const field = (k) => ":task/field-" + k;

// 1. Seed: the aged-live gate's SCALE1-shaped toy (prep1/aged-live/gate.mjs), ten accounts of 50 people, three fields.
await waitFor("ready", 300);
const nonce = crypto.randomUUID();
const name = "dx-scale-decision-" + nonce + "-0";
const scope = JSON.stringify(["triplex-scope-v1", "test", "test", name, 0]);
const people = 50;
let client = new DatomicClient(url, 35_000);
const init = await client.create(scope, "lean", true, 35_000);
assert(init.created && init.strictRecordClocks);
const db = init.db;
const write = async (id, facts) => {
  const ack = await client.transact(db, command(id, facts));
  assert.equal(ack.operationId, id);
  return Number(ack.position.v);
};
for (let a = 0; a < 10; a++) {
  const key = scaleAccount(a);
  await write("seed-roots-" + a, [...Array.from({ length: people }, (_, i) => i), 257, 99_999].flatMap((i) => [
    { e: "acct/" + key + "/" + ids.placement(i), a: ":subject/account", v: str(key) },
    { e: "acct/" + key + "/" + ids.placement(i), a: ":subject/member", v: str(String(i)) }]));
  for (let start = 0; start < people; start += 10) {
    const facts = [];
    for (let i = start; i < start + 10; i++)
      for (let j = 0; j < 3; j++) facts.push({ e: scaleOwner(a, i), a: field(j), v: str(fieldValue(i, 0, j, 0).value) });
    await write("seed-fields-" + a + "-" + start, facts);
  }
}
const seedCut = await write("load1/" + sha([name, "toy-loader-seal", 2000]) + "/1",
  [{ e: "acct/loader/terminal", a: ":loader/done", v: str("yes") }]);
writeFileSync(join(out, "seed.json"), JSON.stringify({ db, name, seedCut }) + "\n");
client.close();

// 2. AGE1 ages the seed in the container (300 saves of its tape over 70 adopted people).
await waitFor("legacy-ready", 900);
const aged = JSON.parse(readFileSync(join(out, "aged.json"), "utf8"));
const agedHead = seedCut + aged.saves;
const validAt = SEED_VALID_FROM;

const open = async (ownerHead) => {
  const c = new DatomicClient(url, 35_000);
  const opened = await c.create(scope, "lean", true, 35_000);
  assert(!opened.created && opened.db === db);
  const options = await c.request("GET", "/v1/db/" + db + "/write-options");
  assert(options.subjectSave && options.subjectOrderedIds && options.subjectNumericOwner);
  assert.equal(Boolean(options.subjectOwnerHead), ownerHead);
  return { c, options };
};
const currentRows = (c, owner, at) => c.rows(db, { entityIds: [owner], basis: { recordedPosition: at, validAt } });

// Owners: four AGE1-edited people (a field row after the seed cut) and two people AGE1 never adopted.
let { c: legacy, options: legacyOptions } = await open(false);
assert.equal(legacyOptions.position, agedHead);
const groupOf = async (owner) => {
  const rows = await currentRows(legacy, owner, agedHead);
  assert.equal(rows.length, 3, owner);
  return rows.some((r) => r.recorded_position > seedCut) ? "loader" : "seed";
};
const loaderOwners = [];
for (const { account, person } of aged.owners) {
  const owner = scaleOwner(account, person);
  if (loaderOwners.length < 4 && !loaderOwners.some((o) => o.split("/")[1] === owner.split("/")[1]) && await groupOf(owner) === "loader")
    loaderOwners.push(owner);
}
const adopted = new Set(aged.owners.map(({ account, person }) => scaleOwner(account, person)));
const seedOwners = [scaleOwner(0, 1), scaleOwner(1, 2)];
assert(seedOwners.every((o) => !adopted.has(o)));
for (const o of seedOwners) assert.equal(await groupOf(o), "seed");
assert.equal(loaderOwners.length, 4);
const owners = [...loaderOwners, ...seedOwners];

// Ten saves per person, interleaved across people. With the owner head: replacements migrate and fill the root; an
// add-only save on a person with a root folds first and goes to today's writer; the fifth distinct field folds at four.
const steps = [["replace", 0], ["replace", 1], ["add", 3], ["add", 4], ["replace", 0], ["replace", 1], ["replace", 2],
  ["replace", 3], ["replace", 4], ["replace", 0]];
const coveringExpected = [true, true, false, false, true, true, true, true, true, true];
const foldExpected = [false, false, true, false, false, false, false, false, true, false];
const plan = [];
const runSaves = async (c, arm) => {
  const acks = [];
  let head = agedHead, n = 0;
  for (const [s, [kind, k]] of steps.entries())
    for (const owner of owners) {
      const old = kind === "replace" ? (await currentRows(c, owner, head)).filter((r) => r.attribute === field(k)) : [];
      assert.equal(old.length, kind === "replace" ? 1 : 0, owner + " " + field(k));
      const id = "aged-owner-head-" + nonce + "-" + s + "-" + owners.indexOf(owner);
      const token = arm === "legacy" ? orderedSaveIdentity().token : plan[n].token;
      const input = command(id, [{ e: owner, a: field(k), v: str("s" + s + "-" + kind + "-" + k + "-🧭") }], old, true, false,
        orderedSaveIdentity(token));
      input.sourceK = Math.max(head, ...old.map((r) => r.recorded_position));
      input.groupAccount = owner.split("/")[1];
      input.writeClass = "live";
      const wire = JSON.stringify(input);
      if (arm === "legacy") plan.push({ token, old: JSON.stringify(old), wire });
      else assert.deepEqual([JSON.stringify(old), wire], [plan[n].old, plan[n].wire], "the predecessor read or input differs at save " + n);
      const ack = await c.transact(db, input);
      const position = Number(ack.position.v);
      assert.equal(position, head + 1);
      head = position;
      acks.push({ n, step: s, kind, field: k, owner, group: loaderOwners.includes(owner) ? "loader" : "seed", position,
        t: Number(ack.t?.v ?? ack.t), recordedAt: ack.recordedAt?.v, subjectSave: ack.subjectSave ?? null,
        ownerHeadBytes: ack.subjectOwnerHeadBytes ?? null, orderedIds: Boolean(ack.subjectOrderedIds),
        writePath: ack.writePath?.function ?? null });
      n++;
    }
  return { acks, head };
};

// Every product read route, for every chosen person, at every position from before the seed cut to the end.
const reads = async (c, head) => {
  const req = async (route, body) => (await c.request("POST", "/v1/db/" + db + "/" + route, body)).rows;
  const reach = async (owner, basis) => {
    const body = await c.request("POST", "/v2/db/" + db + "/reach", { root: owner, basis, full: true });
    const { t, basisT, ...rest } = body;
    return rest;
  };
  const result = {};
  const positions = Array.from({ length: head - seedCut + 2 }, (_, i) => seedCut - 1 + i);
  for (const owner of owners) {
    const history = await c.rows(db, { entityIds: [owner], history: true });
    const rowIds = [...new Set(history.map((r) => r.id))].sort();
    const r = { current: await req("read", { entityIds: [owner], basis: { validAt } }),
      history: await req("read", { entityIds: [owner], history: true }), pinned: {}, byId: {}, reach: await reach(owner, { validAt }),
      reachPinned: {} };
    for (const p of positions) r.pinned[p] = await req("read", { entityIds: [owner], basis: { validAt, recordedPosition: p } });
    for (const p of positions.filter((p) => p >= agedHead - 1 || p === seedCut || (p - seedCut) % 25 === 0))
      r.reachPinned[p] = await reach(owner, { validAt, recordedPosition: p });
    for (const id of rowIds) r.byId[id] = [await req("read", { id, basis: { validAt } }), await req("read", { id, history: true })];
    result[owner] = r;
  }
  const feed = await c.request("POST", "/v2/db/" + db + "/transactions", { after: seedCut, limit: 1000 });
  result.feed = feed.transactions;
  assert.equal(result.feed.length, head - seedCut);
  return { result, positions: positions.length,
    counts: Object.fromEntries(owners.map((o) => [o, { current: result[o].current.length, history: result[o].history.length,
      byId: Object.keys(result[o].byId).length }])) };
};
const firstDifference = (a, b, at = "") => {
  if (isDeepStrictEqual(a, b)) return null;
  if (a && b && typeof a === "object" && typeof b === "object")
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      const d = firstDifference(a[k], b[k], at + "/" + k);
      if (d) return d;
    }
  return { at, legacy: JSON.stringify(a)?.slice(0, 400), covered: JSON.stringify(b)?.slice(0, 400) };
};

// 3. Legacy arm on the copy: today's per-person writer.
const legacyRun = await runSaves(legacy, "legacy");
assert(legacyRun.acks.every((a) => a.ownerHeadBytes === null));
const legacyReads = await reads(legacy, legacyRun.head);
writeFileSync(join(out, "reads-legacy.json"), JSON.stringify(legacyReads.result));
legacy.close();
signal("legacy-done");

// 4. Covered arm on the original: the same saves with the owner head.
await waitFor("covered-ready", 300);
const { c: covered, options: coveredOptions } = await open(true);
assert.equal(coveredOptions.position, agedHead);
const coveredRun = await runSaves(covered, "covered");
assert.equal(coveredRun.head, legacyRun.head);
const coveredReads = await reads(covered, coveredRun.head);
writeFileSync(join(out, "reads-covered.json"), JSON.stringify(coveredReads.result));
const difference = firstDifference(legacyReads.result, coveredReads.result);
assert.equal(difference, null, "a read route differs: " + JSON.stringify(difference));
covered.close();
signal("covered-done");

// 5. Folds and roots, read natively in the container after the covered arm (owner_census.clj).
await waitFor("fence-ready", 300);
const census = JSON.parse(readFileSync(join(out, "owner-census.json"), "utf8"));
const perSave = coveredRun.acks.map((a, i) => {
  const l = legacyRun.acks[i];
  assert.deepEqual([a.position, a.recordedAt, a.owner, a.step], [l.position, l.recordedAt, l.owner, l.step], "save " + i);
  const covering = a.ownerHeadBytes !== null;
  assert.equal(covering, coveringExpected[a.step], `covering at save ${i} (${a.kind} ${a.field} ${a.owner})`);
  if (covering) assert(a.ownerHeadBytes > 0 && /^:triplex\.owner\/v-[a-f0-9]{24}$/.test(a.subjectSave ?? ""), JSON.stringify(a));
  const previous = i === 0 ? -Infinity : coveredRun.acks[i - 1].t;
  const folds = census.folds.filter((f) => f.t > previous && f.t < a.t);
  assert(folds.every((f) => f.owner === a.owner), "a fold of another person before save " + i);
  const fold = folds.length === 1;
  assert.equal(folds.length, foldExpected[a.step] ? 1 : 0, `fold before save ${i} (${a.kind} ${a.field} ${a.owner})`);
  return { ...a, fold, legacySubjectSave: l.subjectSave };
});
assert.equal(census.folds.length, 2 * owners.length);
// After the last save every person holds a root of two texts (the fold at four, then one more replacement).
assert.deepEqual(census.roots.map((r) => [r.owner, r.texts]).sort(), owners.map((o) => [o, 2]).sort());

// 6. Admission: a gateway without the option reads the covered database exactly and refuses to write it.
const { c: plain, options: plainOptions } = await open(false);
assert.equal(plainOptions.position, coveredRun.head);
const plainReads = await reads(plain, coveredRun.head);
assert.equal(firstDifference(legacyReads.result, plainReads.result), null, "reads without the option differ");
const refusals = [];
for (const owner of [loaderOwners[0], seedOwners[0]]) {
  const old = (await currentRows(plain, owner, coveredRun.head)).filter((r) => r.attribute === field(0));
  const input = command("aged-owner-head-fenced-" + nonce + "-" + refusals.length, [{ e: owner, a: field(0), v: str("fenced") }], old,
    true, false, orderedSaveIdentity());
  input.sourceK = coveredRun.head;
  input.groupAccount = owner.split("/")[1];
  input.writeClass = "live";
  let refused;
  try { await plain.transact(db, input); } catch (error) { refused = String(error?.code ?? "") + " " + String(error?.message ?? error); }
  assert.match(refused ?? "accepted", /OwnerLayoutRequired/);
  refusals.push({ owner, refused: refused.slice(0, 200) });
}
const after = await plain.request("GET", "/v1/db/" + db + "/write-options");
assert.equal(after.position, coveredRun.head);
plain.close();

const byGroup = (group) => perSave.filter((a) => a.group === group);
const result = { gate: "aged-owner-head", seedCut, agedHead, agedSaves: aged.saves, head: coveredRun.head,
  owners: { loader: loaderOwners, seed: seedOwners }, saves: perSave.length,
  covering: { loader: byGroup("loader").filter((a) => a.ownerHeadBytes).length, seed: byGroup("seed").filter((a) => a.ownerHeadBytes).length },
  folds: { loader: byGroup("loader").filter((a) => a.fold).length, seed: byGroup("seed").filter((a) => a.fold).length },
  ownerHeadBytes: [Math.min(...perSave.filter((a) => a.ownerHeadBytes).map((a) => a.ownerHeadBytes)),
    Math.max(...perSave.filter((a) => a.ownerHeadBytes).map((a) => a.ownerHeadBytes))],
  legacyFunctions: [...new Set(legacyRun.acks.map((a) => a.subjectSave ?? a.writePath))],
  coveredFunctions: [...new Set(perSave.map((a) => a.subjectSave ?? a.writePath))],
  readRoutes: { positions: legacyReads.positions, perOwner: legacyReads.counts, feed: legacyReads.result.feed.length,
    equal: ["legacy = owner head", "legacy = gateway without the option on the owner-head database"] },
  roots: census.roots, refusals, perSave };
writeFileSync(join(out, "result.json"), JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify({ ...result, perSave: undefined }));
signal("finished");
