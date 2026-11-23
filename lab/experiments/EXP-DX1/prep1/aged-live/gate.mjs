// [DX-PREP1] Mac live gate for the aged admission: seed through this branch's gateway, let AGE1's own code age it,
// then run the arm's aged checks and one ordered save against a fresh gateway on the aged database.
import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { DatomicClient, orderedSaveIdentity } from "../../../../../packages/datomic/dist/index.js";
import { decodeRowText } from "../../../../../packages/datomic/dist/rowText.js";
import { fieldValue } from "../../../../bench/lib/deep-world.ts";
import { ids } from "../../../../bench/lib/world.ts";
import { command } from "../../w1/group/workload.ts";
import { sha } from "../../w1/field/schedule.ts";
import { scaleAccount, scaleFields, scaleOwner, scalePredecessors } from "../ceiling-seed.ts";

const [out, url] = process.argv.slice(2);
const waitFor = async (file, seconds) => {
  for (let i = 0; i < seconds * 4 && !existsSync(join(out, file)); i++) await sleep(250);
  assert(existsSync(join(out, file)), "timed out waiting for " + file);
};
await waitFor("ready", 300);
const nonce = crypto.randomUUID();
const name = "dx-scale-decision-" + nonce + "-0";
const scope = JSON.stringify(["triplex-scope-v1", "test", "test", name, 0]);
const loaderSeal = "toy-loader-seal";
const people = 50;
let client = new DatomicClient(url, 35_000);
const init = await client.create(scope, "lean", true, 35_000);
assert(init.created && init.strictRecordClocks);
const db = init.db;
// A SCALE1-shaped toy seed: account membership on each root, three fields on each person's first task.
let n = 0;
const write = async (id, facts) => {
  const ack = await client.transact(db, command(id, facts));
  assert.equal(ack.operationId, id);
  return Number(ack.position.v);
};
const str = (value) => ({ type: "string", value });
for (let a = 0; a < 10; a++) {
  const key = scaleAccount(a);
  const roots = [...Array.from({ length: people }, (_, i) => i), 257, 99_999].flatMap((i) => [
    { e: "acct/" + key + "/" + ids.placement(i), a: ":subject/account", v: str(key) },
    { e: "acct/" + key + "/" + ids.placement(i), a: ":subject/member", v: str(String(i)) }]);
  await write("seed-roots-" + a, roots);
  for (let start = 0; start < people; start += 10) {
    const facts = [];
    for (let i = start; i < start + 10; i++)
      for (let j = 0; j < 3; j++)
        facts.push({ e: scaleOwner(a, i), a: ":task/field-" + j, v: str(fieldValue(i, 0, j, 0).value) });
    await write("seed-fields-" + a + "-" + start, facts);
  }
}
const loaderCommand = "load1/" + sha([name, loaderSeal, 2000]) + "/" + ++n;
const seedCut = await write(loaderCommand, [{ e: "acct/loader/terminal", a: ":loader/done", v: str("yes") }]);
writeFileSync(join(out, "seed.json"), JSON.stringify({ db, name, seedCut }) + "\n");
client.close();

await waitFor("aged-done", 900);

const aged = JSON.parse(readFileSync(join(out, "aged.json"), "utf8"));
assert.equal(aged.seedHead, seedCut);
const head = seedCut + aged.saves;
client = new DatomicClient(url, 35_000);
const opened = await client.create(scope, "lean", true, 35_000);
assert(!opened.created && opened.db === db);
const options = await client.request("GET", "/v1/db/" + db + "/write-options");
assert.equal(options.position, head);
assert(options.subjectSave && options.subjectOrderedIds && options.subjectNumericOwner);

// 1. The server refusal, reproduced on the genuine aged journal of the last save.
const last = await client.request("POST", "/v2/db/" + db + "/transactions", { after: head - 1, limit: 1 });
const [[lastTx, lastPosition, lastTexts]] = last.transactions;
assert.deepEqual([lastTx, lastPosition], [aged.lastTransaction, head]);
let reproduced = "";
try { lastTexts.map(decodeRowText); } catch (error) { reproduced = error.message; }
assert.equal(reproduced, "Journal position payload must be null");

// 2. The arm's aged admission on genuine rows, through the live reader.
const agedCut = { bundleSha256: "0".repeat(64), seedCut, physicalT: 1, records: 1, nativeId: "toy", active: aged.active,
  people, tapeSaves: aged.saves, lastOperation: aged.lastOperation, lastTransaction: aged.lastTransaction,
  lastRecordedAt: aged.lastRecordedAt };
const seed = { db, scope, head, loaderSeal, storage: "pg-data", aged: agedCut };
const targets = aged.owners.map(({ account, person }) => ({ account, person }));
const { fields, proof } = await scalePredecessors(client, seed, targets);
const editedRows = [...fields.values()].flat().filter((r) => r.recorded_position > seedCut).length;
assert(editedRows > 0 && proof.aged.rows === editedRows && proof.members === 40);

// 3. The same check refuses tampered rows and journals.
const tampered = (edit) => new Proxy(client, { get: (target, key) => {
  const f = target[key];
  if (key === "rows") return async (...args) => (await f.apply(target, args)).map(edit.row ?? ((r) => r));
  if (key === "request") return async (...args) => {
    const r = await f.apply(target, args);
    if (edit.journal && args[2]?.after === head - 1) r.transactions = r.transactions.map(([t, p, x]) => [t, p, edit.journal(x)]);
    return r;
  };
  return typeof f === "function" ? f.bind(target) : f;
} });
const refused = [];
for (const [label, edit] of Object.entries({
  value: { row: (r) => r.recorded_position > seedCut ? { ...r, value_string: "0" + r.value_string.slice(1) } : r },
  id: { row: (r) => r.recorded_position > seedCut ? { ...r, id: r.id.slice(0, -1) + (r.id.endsWith("1") ? "2" : "1") } : r },
  position: { row: (r) => r.recorded_position > seedCut ? { ...r, recorded_position: r.recorded_position - 1 } : r },
  "seed value": { row: (r) => r.recorded_position <= seedCut && scaleFields.includes(r.attribute) ? { ...r, value_string: "x" } : r },
  "journal payload": { journal: (x) => x.map((t) => t.replace(/"number",null,[0-9.E]+,/, '"number",null,1.0,')) },
  "journal command": { journal: (x) => x.map((t) => t.replace(aged.lastOperation, "age-save-0")) },
})) {
  await assert.rejects(scalePredecessors(tampered(edit), seed, targets));
  refused.push(label);
}
await assert.rejects(scalePredecessors(client, { ...seed, aged: { ...agedCut, lastRecordedAt: agedCut.lastRecordedAt + 1 } }, targets));
refused.push("handoff clock");

// 4. One ordered save on an AGE1-edited owner, exactly as the arm sends it.
const [owner, previous] = [...fields].find(([, rows]) => rows.some((r) => r.recorded_position > seedCut));
const old = previous.filter((r) => r.attribute === ":task/field-0");
const identity = orderedSaveIdentity();
const input = command("aged-live-save-" + nonce, [{ e: owner, a: ":task/field-0", v: str("after-aging") }], old, true, false, identity);
input.sourceK = Math.max(head, ...previous.map((r) => r.recorded_position));
input.groupAccount = owner.split("/")[1];
input.writeClass = "live";
const ack = await client.transact(db, input);
assert.equal(Number(ack.position.v), head + 1);
assert(ack.subjectOrderedIds, "the aged owner did not take the ordered writer");
const result = { gate: "aged-live", seedCut, head, saves: aged.saves, active: aged.active, reproduced,
  owners: fields.size, editedRows, journalSha: proof.aged.journalSha, refused,
  orderedSave: { owner, position: Number(ack.position.v), subjectOrderedIds: ack.subjectOrderedIds,
    writePath: ack.writePath, recordedAt: ack.recordedAt.v, lastAgedClock: aged.lastRecordedAt } };
writeFileSync(join(out, "result.json"), JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify(result));
client.close();
writeFileSync(join(out, "finished"), "ok\n");
